import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { SCENES } from "../constants";
import { HookScene } from "../scenes/00_Hook";
import { IntroScene } from "../scenes/01_Intro";
import { ArchitectureScene } from "../scenes/02_Architecture";
import { DemoScene } from "../scenes/03_Demo";
import { MetricsScene } from "../scenes/04_Metrics";
import { ClosingScene } from "../scenes/05_Closing";

export const HackathonDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#0d1117" }}>
      <Sequence from={SCENES.HOOK.start} durationInFrames={SCENES.HOOK.duration}>
        <HookScene />
      </Sequence>
      <Sequence from={SCENES.INTRO.start} durationInFrames={SCENES.INTRO.duration}>
        <IntroScene />
      </Sequence>
      <Sequence from={SCENES.ARCHITECTURE.start} durationInFrames={SCENES.ARCHITECTURE.duration}>
        <ArchitectureScene />
      </Sequence>
      <Sequence from={SCENES.DEMO_NORMAL.start} durationInFrames={
        SCENES.DEMO_FAIL2.start + SCENES.DEMO_FAIL2.duration - SCENES.DEMO_NORMAL.start
      }>
        <DemoScene />
      </Sequence>
      <Sequence from={SCENES.METRICS.start} durationInFrames={SCENES.METRICS.duration}>
        <MetricsScene />
      </Sequence>
      <Sequence from={SCENES.CLOSING.start} durationInFrames={SCENES.CLOSING.duration}>
        <ClosingScene />
      </Sequence>
    </AbsoluteFill>
  );
};
