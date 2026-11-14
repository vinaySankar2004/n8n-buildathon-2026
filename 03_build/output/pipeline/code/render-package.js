// "Package video": keep the run, drop the audio, add the video link.
const input = $("Input").first().json;
const r = $input.first().json;
if (!r.video_url) return [{ json: { ok: false, step: "Render", reason: `The render service answered without a video_url: ${JSON.stringify(r).slice(0, 200)}` } }];
const { audio_base64, ...rest } = input;
return [{ json: { ...rest, ok: true, video_url: r.video_url, video_seconds: r.duration_s, render_seconds: r.render_seconds } }];
