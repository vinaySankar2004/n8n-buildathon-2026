import { CalculateMetadataFunction, Composition } from "remotion";
import { Story } from "./Story";
import { FPS, StoryProps, TAIL_SECONDS } from "./types";

const calculateMetadata: CalculateMetadataFunction<StoryProps> = ({ props }) => {
  const seconds = props.durationInSeconds ?? props.spec.duration_s ?? 20;
  return { durationInFrames: Math.ceil((seconds + TAIL_SECONDS) * FPS) };
};

const sample: StoryProps = {
  spec: {
    headline: "Flooding reports are up more than seven times this week",
    script:
      "Vancouver residents filed 215 street flooding reports this week. That is more than seven times the usual 30. Mount Pleasant was hit hardest with 33 reports, then Downtown and Grandview-Woodland.",
    chart: {
      kind: "bar",
      title: "Flooding reports by neighbourhood, last 7 days",
      data: [
        { label: "Mount Pleasant", value: 33 },
        { label: "Downtown", value: 23 },
        { label: "Grandview-Woodland", value: 20 },
        { label: "Fairview", value: 16 },
        { label: "Renfrew-Collingwood", value: 15 },
        { label: "Kitsilano", value: 12 },
      ],
      source_note: "City of Vancouver open data, 3-1-1 service requests",
    },
    callout: { value: "7.3×", label: "215 reports this week against an average of 29.6" },
    duration_s: 20,
  },
  audioSrc: null,
  durationInSeconds: null,
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Story"
      component={Story}
      durationInFrames={20 * FPS}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={sample}
      calculateMetadata={calculateMetadata}
    />
  );
};
