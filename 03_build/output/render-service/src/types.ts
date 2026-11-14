export type ChartDatum = { label: string; value: number };

export type Spec = {
  headline: string;
  script: string;
  chart: {
    kind: "bar";
    title: string;
    data: ChartDatum[];
    source_note: string;
  };
  // Optional big number shown under the headline, e.g. { value: "7.3×", label: "..." }.
  // When missing, the top chart value is used.
  callout?: { value: string; label: string };
  duration_s?: number;
};

export type StoryProps = {
  spec: Spec;
  audioSrc?: string | null;
  durationInSeconds?: number | null;
};

export const FPS = 30;
export const TAIL_SECONDS = 0.8;
