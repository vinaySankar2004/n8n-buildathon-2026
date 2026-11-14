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

export const Story: React.FC<StoryProps> = ({ spec, audioSrc }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const data = [...spec.chart.data]
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const max = Math.max(...data.map((d) => d.value), 1);
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
        <span style={{ fontWeight: 800, color: C.text }}>[Outlet]</span>
        <span style={{ fontWeight: 500 }}>City data desk</span>
      </div>
      <div
        style={{
          height: 4,
          marginTop: 24,
          background: C.accent,
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
            color: C.accent,
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
                    background: i === 0 ? C.barTop : C.bar,
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
