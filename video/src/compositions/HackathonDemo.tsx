import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { SCENES } from "../constants";
import { HookScene }         from "../scenes/00_Hook";
import { IntroScene }        from "../scenes/01_Intro";
import { ArchitectureScene } from "../scenes/02_Architecture";
import { DemoScene }         from "../scenes/03_Demo";
import { MetricsScene }      from "../scenes/04_Metrics";
import { ClosingScene }      from "../scenes/05_Closing";

// DemoScene covers DEMO_NORMAL → DEMO_FAIL1 → DEMO_FAIL2 → DEMO_DONE in one sequence
const DEMO_TOTAL =
  SCENES.DEMO_DONE.start + SCENES.DEMO_DONE.duration - SCENES.DEMO_NORMAL.start;

export const HackathonDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#050505" }}>
      <Sequence from={SCENES.HOOK.start}         durationInFrames={SCENES.HOOK.duration}>
        <HookScene />
      </Sequence>

      <Sequence from={SCENES.INTRO.start}        durationInFrames={SCENES.INTRO.duration}>
        <IntroScene />
      </Sequence>

      <Sequence from={SCENES.ARCHITECTURE.start} durationInFrames={SCENES.ARCHITECTURE.duration}>
        <ArchitectureScene />
      </Sequence>

      {/* Single sequence covers all demo sub-scenes including DONE state */}
      <Sequence from={SCENES.DEMO_NORMAL.start}  durationInFrames={DEMO_TOTAL}>
        <DemoScene />
      </Sequence>

      <Sequence from={SCENES.METRICS.start}      durationInFrames={SCENES.METRICS.duration}>
        <MetricsScene />
      </Sequence>

      <Sequence from={SCENES.CLOSING.start}      durationInFrames={SCENES.CLOSING.duration}>
        <ClosingScene />
      </Sequence>
    </AbsoluteFill>
  );
};
