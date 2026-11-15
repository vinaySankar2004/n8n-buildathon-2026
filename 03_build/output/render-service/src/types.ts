export type ChartDatum = { label: string; value: number };

export type Spec = {
  headline: string;
  script: string;
  chart: {
    // bar (default), line or pie; an editor can change it from the Slack thread.
    kind: "bar" | "line" | "pie";
    title: string;
    data: ChartDatum[];
    source_note: string;
    // "time" keeps the data in order (weekly counts); otherwise it is sorted largest first.
    order?: "time" | "value";
    // The label drawn in the accent colour; by default the largest value, or the latest week.
    highlight?: string | null;
  };
  // Optional big number shown under the headline, e.g. { value: "7.3×", label: "..." }.
  // When missing, the top chart value is used.
  callout?: { value: string; label: string };
  // The client's name, desk and accent colour from its NewsReels config.
  brand?: { name?: string; desk?: string; accent?: string | null };
  duration_s?: number;
};

export type StoryProps = {
  spec: Spec;
  audioSrc?: string | null;
  durationInSeconds?: number | null;
};

export const FPS = 30;
export const TAIL_SECONDS = 0.8;
