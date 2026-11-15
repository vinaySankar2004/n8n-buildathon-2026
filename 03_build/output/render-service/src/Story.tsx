import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/Inter";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { StoryProps } from "./types";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "700", "800"],
  subsets: ["latin"],
});

const C = {
  bg: "#0D131D",
  bgTop: "#142033",
  text: "#F4F6F9",
  muted: "#93A0B4",
  faint: "#2A3647",
  accent: "#F2B33D",
  bar: "#4FA3E0",
  barTop: "#F2B33D",
};

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const headlineSize = (text: string) =>
  text.length > 70 ? 66 : text.length > 48 ? 78 : 92;

const splitSentences = (script: string) =>
  script
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

const formatValue = (v: number) =>
  Number.isInteger(v) ? v.toLocaleString("en-CA") : v.toFixed(1);

type ChartProps = { data: { label: string; value: number }[]; accent: string; hiLabel?: string; start: number };

// A line across the weeks (or items), drawn left to right, with each value above its point.
const LineChart: React.FC<ChartProps & { max: number }> = ({ data, max, accent, hiLabel, start }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const W = 920, H = 460, padX = 46, top = 70, bottom = 80;
  const p = interpolate(frame, [start, start + 1.6 * fps], [0, 1], { ...clamp, easing: ease });
  const pts = data.map((d, i) => ({
    d,
    x: padX + (i * (W - 2 * padX)) / Math.max(data.length - 1, 1),
    y: top + (1 - d.value / max) * (H - top - bottom),
  }));
  const reveal = padX + p * (W - 2 * padX) + 1;
  return (
    <svg width={W} height={H} style={{ overflow: "visible" }}>
      <defs>
        <clipPath id="reveal"><rect x={0} y={0} width={reveal} height={H} /></clipPath>
      </defs>
      <line x1={padX} x2={W - padX} y1={H - bottom} y2={H - bottom} stroke={C.faint} strokeWidth={3} />
      <polyline points={pts.map((q) => `${q.x},${q.y}`).join(" ")} fill="none" stroke={C.bar} strokeWidth={9}
        strokeLinejoin="round" strokeLinecap="round" clipPath="url(#reveal)" />
      {pts.map((q) => {
        const on = q.x <= reveal;
        const hi = q.d.label === hiLabel;
        return (
          <g key={q.d.label} opacity={on ? 1 : 0}>
            <circle cx={q.x} cy={q.y} r={hi ? 17 : 12} fill={hi ? accent : C.bar} stroke={C.bg} strokeWidth={4} />
            <text x={q.x} y={q.y - 30} textAnchor="middle" fill={C.text} fontSize={36} fontWeight={700}>{formatValue(q.d.value)}</text>
            <text x={q.x} y={H - bottom + 46} textAnchor="middle" fill={hi ? C.text : C.muted} fontSize={27} fontWeight={hi ? 700 : 500}>{q.d.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

// A donut of each item's share, slices sweeping in, with a legend of labels and values.
const PieChart: React.FC<ChartProps> = ({ data, accent, hiLabel, start }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = data.reduce((n, d) => n + d.value, 0) || 1;
  const p = interpolate(frame, [start, start + 1.4 * fps], [0, 1], { ...clamp, easing: ease });
  const shades = [C.bar, "#7FC4F2", "#2E6FA8", "#A7B6C9", "#5B6E86", "#3B4A5E"];
  const R = 200, r = 118, cx = 210, cy = 215;
  const pt = (a: number, rad: number) => [cx + rad * Math.sin(a), cy - rad * Math.cos(a)];
  let acc = 0;
  let shade = 0;
  const slices = data.map((d) => {
    const a0 = (acc / total) * 2 * Math.PI * p;
    acc += d.value;
    const a1 = (acc / total) * 2 * Math.PI * p;
    const big = a1 - a0 > Math.PI ? 1 : 0;
    const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R), [x2, y2] = pt(a1, r), [x3, y3] = pt(a0, r);
    const color = d.label === hiLabel ? accent : shades[shade++ % shades.length];
    const path = a1 - a0 < 0.0001 ? "" : `M${x0} ${y0} A${R} ${R} 0 ${big} 1 ${x1} ${y1} L${x2} ${y2} A${r} ${r} 0 ${big} 0 ${x3} ${y3} Z`;
    return { d, color, path };
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
      <svg width={420} height={430}>
        {slices.map((sl) => (sl.path ? <path key={sl.d.label} d={sl.path} fill={sl.color} stroke={C.bg} strokeWidth={4} /> : null))}
      </svg>
      <div style={{ flex: 1 }}>
        {slices.map((sl, i) => (
          <div key={sl.d.label} style={{ display: "flex", alignItems: "center", marginBottom: 20, opacity: interpolate(frame, [start + i * 0.15 * fps, start + i * 0.15 * fps + 0.3 * fps], [0, 1], clamp) }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: sl.color, marginRight: 16, flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 28, fontWeight: sl.d.label === hiLabel ? 700 : 500, lineHeight: 1.15 }}>{sl.d.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, marginLeft: 12, fontVariantNumeric: "tabular-nums" }}>{formatValue(sl.d.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const Story: React.FC<StoryProps> = ({ spec, audioSrc }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const accent = spec.brand?.accent || C.accent;

  const kind = spec.chart.kind || "bar";
  const byTime = spec.chart.order === "time";
  const data = (byTime ? [...spec.chart.data] : [...spec.chart.data].sort((a, b) => b.value - a.value)).slice(byTime ? -6 : 0, byTime ? undefined : 6);
  const max = Math.max(...data.map((d) => d.value), 1);
  const hiLabel = spec.chart.highlight && data.some((d) => d.label === spec.chart.highlight)
    ? spec.chart.highlight
    : (byTime ? data[data.length - 1] : data[0])?.label;
  const callout = spec.callout ?? {
    value: formatValue(data[0]?.value ?? 0),
    label: data[0]?.label ?? "",
  };

  // Captions: each sentence gets time in proportion to its length.
  const sentences = splitSentences(spec.script);
  const captionStart = 0.3 * fps;
  const captionEnd = durationInFrames - 0.6 * fps;
  const totalChars = sentences.reduce((n, s) => n + s.length, 0) || 1;
  let cursor = captionStart;
  const timed = sentences.map((s) => {
    const len = ((captionEnd - captionStart) * s.length) / totalChars;
    const item = { text: s, from: cursor, to: cursor + len };
    cursor += len;
    return item;
  });
  const current = timed.find((t) => frame >= t.from && frame < t.to);

  const barsStart = 1.6 * fps;
  const stagger = 0.22 * fps;
  const grow = 0.9 * fps;

  return (
    <AbsoluteFill
      style={{
        fontFamily,
        color: C.text,
        background: `linear-gradient(180deg, ${C.bgTop} 0%, ${C.bg} 55%)`,
        padding: "96px 80px 72px",
      }}
    >
      {audioSrc ? <Audio src={audioSrc} /> : null}

      {/* Brand row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 30,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: C.muted,
          opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], clamp),
        }}
      >
        <span style={{ fontWeight: 800, color: C.text }}>{spec.brand?.name || "[Outlet]"}</span>
        <span style={{ fontWeight: 500 }}>{spec.brand?.desk || "City data desk"}</span>
      </div>
      <div
        style={{
          height: 4,
          marginTop: 24,
          background: accent,
          width: interpolate(frame, [0.1 * fps, 0.9 * fps], [0, 160], {
            ...clamp,
            easing: ease,
          }),
        }}
      />

      {/* Headline */}
      <div
        style={{
          marginTop: 64,
          fontSize: headlineSize(spec.headline),
          fontWeight: 800,
          lineHeight: 1.08,
          letterSpacing: -1.5,
          opacity: interpolate(frame, [0.2 * fps, 0.9 * fps], [0, 1], clamp),
          translate: interpolate(
            frame,
            [0.2 * fps, 0.9 * fps],
            ["0px 40px", "0px 0px"],
            { ...clamp, easing: ease },
          ),
        }}
      >
        {spec.headline}
      </div>

      {/* Callout */}
      <div
        style={{
          marginTop: 48,
          display: "flex",
          alignItems: "baseline",
          gap: 28,
          opacity: interpolate(frame, [0.9 * fps, 1.5 * fps], [0, 1], clamp),
        }}
      >
        <span
          style={{
            fontSize: 150,
            fontWeight: 800,
            color: accent,
            lineHeight: 1,
            letterSpacing: -4,
          }}
        >
          {callout.value}
        </span>
        <span
          style={{
            fontSize: 38,
            fontWeight: 500,
            color: C.muted,
            lineHeight: 1.25,
            maxWidth: 520,
          }}
        >
          {callout.label}
        </span>
      </div>

      {/* Chart */}
      <div style={{ marginTop: 72 }}>
        <div
          style={{
            fontSize: 34,
            fontWeight: 700,
            color: C.muted,
            marginBottom: 32,
            opacity: interpolate(frame, [1.3 * fps, 1.8 * fps], [0, 1], clamp),
          }}
        >
          {spec.chart.title}
        </div>
        {kind === "line" ? (
          <LineChart data={data} max={max} accent={accent} hiLabel={hiLabel} start={barsStart} />
        ) : kind === "pie" ? (
          <PieChart data={data} accent={accent} hiLabel={hiLabel} start={barsStart} />
        ) : (
          <>
          {data.map((d, i) => {
            const start = barsStart + i * stagger;
            const progress = interpolate(frame, [start, start + grow], [0, 1], {
              ...clamp,
              easing: ease,
            });
            return (
              <div
                key={d.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 26,
                  opacity: interpolate(frame, [start, start + 0.3 * fps], [0, 1], clamp),
                }}
              >
                <div
                  style={{
                    width: 390,
                    fontSize: 32,
                    fontWeight: 500,
                    lineHeight: 1.1,
                    paddingRight: 20,
                  }}
                >
                  {d.label}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 58,
                    background: C.faint,
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(d.value / max) * 100 * progress}%`,
                      background: d.label === hiLabel ? accent : C.bar,
                      borderRadius: 8,
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 110,
                    textAlign: "right",
                    fontSize: 40,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatValue(
                    Number.isInteger(d.value)
                      ? Math.round(d.value * progress)
                      : Math.round(d.value * progress * 10) / 10,
                  )}
                </div>
              </div>
            );
          })}
          </>
        )}
      </div>

      {/* Captions */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 150,
          minHeight: 190,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        {current ? (
          <div
            style={{
              background: "rgba(0, 0, 0, 0.55)",
              borderRadius: 16,
              padding: "22px 30px",
              fontSize: 46,
              fontWeight: 700,
              lineHeight: 1.25,
              textAlign: "center",
              opacity: interpolate(
                frame,
                [current.from, current.from + 0.2 * fps],
                [0, 1],
                clamp,
              ),
            }}
          >
            {current.text}
          </div>
        ) : null}
      </div>

      {/* Source */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 72,
          fontSize: 26,
          color: C.muted,
          opacity: interpolate(frame, [1 * fps, 1.6 * fps], [0, 1], clamp),
        }}
      >
        Source: {spec.chart.source_note}
      </div>
    </AbsoluteFill>
  );
};
