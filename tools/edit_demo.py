#!/usr/bin/env python3
"""Cuts the demo video from Arman's takes in 04_demo/raw/.

Inputs in 04_demo/raw/: screen takes B01.mov to B10.mov (B02 is optional: the title card stands in),
one voice recording (any .m4a, .mp3 or .wav), and optionally cuts.json. Output:
04_demo/raw/newsreels-demo.mp4, 1920x1080, with the title and end cards from 05_submit/output/brand/,
captions from 04_demo/output/script.md, and the voice levelled to -16 LUFS.

  python3 tools/edit_demo.py --look    durations, the voice's beats, and a contact sheet per take
  python3 tools/edit_demo.py           builds the video
  python3 tools/edit_demo.py --merge   title card, intro.mov, arman.mov, end card (the final cut on Sunday)

cuts.json, all optional: {"voice": [[start, end], ...one per beat], "B05": [[from, to], ...parts to keep]}.
Times are seconds. A beat lasts as long as its narration; its kept parts are sped up (up to 4x) or held
on their last frame to fit.
"""
import json, os, re, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
RAW = Path(os.environ.get("DEMO_RAW") or ROOT / "04_demo/raw")
BUILD = RAW / "build"
BRAND = ROOT / "05_submit/output/brand"
SCRIPT = ROOT / "04_demo/output/script.md"
W, H, FPS = 1920, 1080, 30
LEAD, TAIL, END_HOLD = 0.4, 0.8, 3.0
PAPER = "0xF3EEE3"
BEATS = [f"B{i:02d}" for i in range(1, 11)]


def run(args, quiet=True):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"Failed: {' '.join(map(str, args[:8]))} ...\n{r.stderr[-1500:]}")
    return r


def duration(p):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)])
    return float(r.stdout.strip())


def lines_by_beat():
    rows = [l for l in SCRIPT.read_text().splitlines() if re.match(r"^\| B\d+ \|", l)]
    out = {}
    for row in rows:
        cells = [c.strip() for c in row.strip("|").split("|")]
        out[f"B{int(cells[0][1:]):02d}"] = cells[3]
    return out


def find(beat):
    for ext in (".mov", ".mp4", ".MOV", ".MP4"):
        p = RAW / f"{beat}{ext}"
        if p.exists():
            return p
    return None


def voice_file():
    found = [p for p in RAW.iterdir() if p.suffix.lower() in (".m4a", ".mp3", ".wav", ".aac") and p.parent == RAW]
    if len(found) != 1:
        sys.exit(f"Put exactly one voice recording in {RAW} (found {len(found)}).")
    return found[0]


def speech_ranges(voice):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(voice), "-af", "silencedetect=noise=-35dB:d=1.1", "-f", "null", "-"], capture_output=True, text=True)
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", r.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    total = duration(voice)
    edges, t = [], 0.0
    for s, e in zip(starts, ends + [total] * (len(starts) - len(ends))):
        if s - t > 0.3:
            edges.append([round(max(0, t - 0.15), 2), round(s + 0.15, 2)])
        t = e
    if total - t > 0.3:
        edges.append([round(max(0, t - 0.15), 2), round(total, 2)])
    return edges


def caption_chunks(text, max_words=9):
    words = text.split()
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= max_words or (len(cur) >= 4 and re.search(r"[.,:;?]$", w)):
            chunks.append(" ".join(cur))
            cur = []
    if cur:
        if chunks and len(cur) < 3:
            chunks[-1] += " " + " ".join(cur)
        else:
            chunks.append(" ".join(cur))
    return chunks


def caption_png(text, path):
    font = ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", 46, index=1)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    box = d.textbbox((0, 0), text, font=font)
    tw, th = box[2] - box[0], box[3] - box[1]
    x, y = (W - tw) // 2, H - 150
    d.rounded_rectangle((x - 28, y - 18, x + tw + 28, y + th + 26), radius=14, fill=(20, 20, 20, 215))
    d.text((x - box[0], y - box[1]), text, font=font, fill=(243, 238, 227, 255))
    img.save(path)


def look():
    BUILD.mkdir(parents=True, exist_ok=True)
    for b in BEATS:
        p = find(b)
        if not p:
            print(f"{b}: no take" + (" (the title card stands in)" if b == "B02" else ""))
            continue
        d = duration(p)
        grid = BUILD / f"grid-{b}.png"
        run(["ffmpeg", "-y", "-v", "error", "-i", str(p), "-vf", "fps=1/2,scale=384:-2,tile=5x6", "-frames:v", "1", str(grid)])
        print(f"{b}: {d:.1f} s, contact sheet {grid} (one frame every 2 s, left to right)")
    v = voice_file()
    rs = speech_ranges(v)
    print(f"voice {v.name}: {duration(v):.1f} s, {len(rs)} spoken parts: {rs}")


def build():
    BUILD.mkdir(parents=True, exist_ok=True)
    cuts = json.loads((RAW / "cuts.json").read_text()) if (RAW / "cuts.json").exists() else {}
    voice = voice_file()
    vr = cuts.get("voice") or speech_ranges(voice)
    if len(vr) != len(BEATS):
        sys.exit(f"The voice has {len(vr)} spoken parts, not {len(BEATS)}: {vr}\nList one [start, end] per beat under \"voice\" in cuts.json.")
    text = lines_by_beat()
    parts, audio = [], []
    for i, b in enumerate(BEATS):
        a, e = vr[i]
        talk = e - a
        dur = LEAD + talk + TAIL
        out = BUILD / f"{b}.mp4"
        caps = caption_chunks(text.get(b, ""))
        words = [len(c.split()) for c in caps]
        cap_inputs, cap_filters, t0 = [], [], LEAD
        for k, c in enumerate(caps):
            png = BUILD / f"cap-{b}-{k}.png"
            caption_png(c, png)
            t1 = t0 + talk * words[k] / max(1, sum(words))
            cap_inputs += ["-i", str(png)]
            cap_filters.append((k + 1, t0, t1))
            t0 = t1
        fit = f"scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color={PAPER},setsar=1,fps={FPS}"
        clip = find(b)
        end_card = b == BEATS[-1]
        if clip is None or b == "B02" and "B02" not in cuts:
            src = ["-loop", "1", "-t", f"{dur:.3f}", "-i", str(BRAND / "title-card.png")] if b == "B02" else None
            if src is None:
                sys.exit(f"No take for {b} in {RAW}.")
            graph = f"[0:v]{fit},trim=duration={dur:.3f}[v0]"
        else:
            keep = cuts.get(b) or [[0.5, max(0.6, duration(clip) - 0.5)]]
            shown = dur * (0.55 if end_card else 1.0)
            src = ["-i", str(clip)]
            segs = "".join(f"[0:v]trim={s}:{t},setpts=PTS-STARTPTS[s{j}];" for j, (s, t) in enumerate(keep))
            joined = "".join(f"[s{j}]" for j in range(len(keep))) + f"concat=n={len(keep)}:v=1:a=0[j];"
            length = sum(t - s for s, t in keep)
            speed = min(4.0, max(1.0, length / shown))
            body = f"[j]setpts=PTS/{speed:.4f},{fit},tpad=stop_mode=clone:stop_duration={shown:.3f},trim=duration={shown:.3f}"
            if end_card:
                # The last beat shows its take for the first part, then the end card, held after the voice ends.
                hold = dur - shown + END_HOLD
                src += ["-loop", "1", "-t", f"{hold:.3f}", "-i", str(BRAND / "end-card.png")]
                graph = segs + joined + body + f"[vclip];[1:v]{fit},trim=duration={hold:.3f}[ec];[vclip][ec]concat=n=2:v=1:a=0[v0]"
            else:
                graph = segs + joined + body + "[v0]"
        # Captions on top, each shown during its share of the narration. Caption images follow the
        # take (and the end card) in the input list.
        first_cap = 2 if (end_card and clip is not None) else 1
        last = "v0"
        for n, (k, s, t) in enumerate(cap_filters):
            graph += f";[{last}][{first_cap + n}:v]overlay=enable='between(t,{s:.2f},{t:.2f})'[c{n}]"
            last = f"c{n}"
        run(["ffmpeg", "-y", "-v", "error", *src, *cap_inputs, "-filter_complex", graph, "-map", f"[{last}]",
             "-c:v", "libx264", "-crf", "18", "-preset", "fast", "-pix_fmt", "yuv420p", "-r", str(FPS), str(out)])
        parts.append(out)
        total = dur + (END_HOLD if end_card else 0)
        audio.append(f"[0:a]atrim={a}:{e},asetpts=PTS-STARTPTS,adelay={int(LEAD * 1000)}:all=1,apad,atrim=0:{total:.3f}[a{i}]")
        print(f"{b}: {total:.1f} s")
    (BUILD / "parts.txt").write_text("".join(f"file '{p}'\n" for p in parts))
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(BUILD / "parts.txt"), "-c", "copy", str(BUILD / "video.mp4")])
    graph = ";".join(audio) + ";" + "".join(f"[a{i}]" for i in range(len(BEATS))) + f"concat=n={len(BEATS)}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]"
    final = RAW / "newsreels-demo.mp4"
    run(["ffmpeg", "-y", "-v", "error", "-i", str(voice), "-i", str(BUILD / "video.mp4"), "-filter_complex", graph,
         "-map", "1:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", str(final)])
    print(f"{final}: {duration(final):.1f} s")


def spoken_span(path):
    """First and last moment of speech in a clip, so silence at either end can be trimmed."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-vn", "-af", "silencedetect=noise=-42dB:d=0.6", "-f", "null", "-"], capture_output=True, text=True)
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", r.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    total = duration(path)
    first = ends[0] if starts and starts[0] < 0.2 and ends else 0.0
    last = starts[-1] if starts and (len(ends) < len(starts) or ends[-1] >= total - 0.2) else total
    return max(0.0, first - 0.4), min(total, last + 0.7)


def merge(intro_name="intro", main_name="arman", limit=179.0):
    """Title card, the spoken intro, the main walkthrough, end card. Each voice levelled to -16 LUFS.
    If the whole runs over the limit, the walkthrough is sped up slightly (at most 8 percent)."""
    find_one = lambda stem: next((RAW / f"{stem}{e}" for e in (".mov", ".mp4", ".MOV", ".MP4") if (RAW / f"{stem}{e}").exists()), None)
    intro, main = find_one(intro_name), find_one(main_name)
    if not intro or not main:
        sys.exit(f"Need {intro_name}.mov and {main_name}.mov in {RAW}.")
    T1, T4 = 2.5, 4.0
    a, b = spoken_span(intro)
    main_len = duration(main)
    speed = max(1.0, min(1.08, (T1 + (b - a) + main_len + T4) / limit))
    fit = f"scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=0x141414,setsar=1,fps={FPS},format=yuv420p"
    voice = "aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000"
    graph = (
        f"[0:v]{fit}[v0];[1:v]{fit}[v1];[2:v]setpts=PTS/{speed:.4f},{fit}[v2];[3:v]{fit}[v3];"
        f"[1:a]{voice},afade=t=in:d=0.2[a1];[2:a]atempo={speed:.4f},{voice}[a2];"
        f"[4:a]aformat=sample_fmts=fltp:channel_layouts=stereo[s0];[5:a]aformat=sample_fmts=fltp:channel_layouts=stereo[s3];"
        "[v0][s0][v1][a1][v2][a2][v3][s3]concat=n=4:v=1:a=1[v][a]"
    )
    final = RAW / "newsreels-demo.mp4"
    run(["ffmpeg", "-y", "-v", "error",
         "-loop", "1", "-t", str(T1), "-i", str(BRAND / "title-card.png"),
         "-ss", f"{a:.2f}", "-to", f"{b:.2f}", "-i", str(intro),
         "-i", str(main),
         "-loop", "1", "-t", str(T4), "-i", str(BRAND / "end-card.png"),
         "-f", "lavfi", "-t", str(T1), "-i", "anullsrc=r=48000:cl=stereo",
         "-f", "lavfi", "-t", str(T4), "-i", "anullsrc=r=48000:cl=stereo",
         "-filter_complex", graph, "-map", "[v]", "-map", "[a]",
         "-c:v", "libx264", "-crf", "20", "-preset", "fast", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(final)])
    print(f"intro {a:.1f} to {b:.1f} s, main {main_len:.1f} s at {speed:.3f}x; {final}: {duration(final):.1f} s")


if __name__ == "__main__":
    if "--merge" in sys.argv:
        merge()
    elif "--look" in sys.argv:
        look()
    else:
        build()
