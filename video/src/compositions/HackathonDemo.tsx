import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { SCENES, DEMO_DURATION } from "../constants";
import { HookScene } from "../scenes/00_Hook";
import { IntroScene } from "../scenes/01_Intro";
import { ArchitectureScene } from "../scenes/02_Architecture";
import { LiveDashboardScene } from "../scenes/06_LiveDashboard";
import { PlatformProofScene } from "../scenes/07_PlatformProof";
import { MetricsScene } from "../scenes/04_Metrics";
import { ClosingScene } from "../scenes/05_Closing";
import { BarAlur } from "../ui-kit";

export type PropsHackathonDemo = {
  denganVoiceover?: boolean;
};

export const HackathonDemo: React.FC<PropsHackathonDemo> = ({ denganVoiceover = false }) => {
  return (
    <AbsoluteFill style={{ background: "#09090b" }}>
      {denganVoiceover && <Audio src={staticFile("voiceover.mp3")} volume={1} />}

      <Sequence from={SCENES.HOOK.start} durationInFrames={SCENES.HOOK.duration}>
        <HookScene />
      </Sequence>
      <Sequence from={SCENES.INTRO.start} durationInFrames={SCENES.INTRO.duration}>
        <IntroScene />
      </Sequence>
      <Sequence from={SCENES.ARCHITECTURE.start} durationInFrames={SCENES.ARCHITECTURE.duration}>
        <ArchitectureScene />
      </Sequence>
      <Sequence from={SCENES.PLATFORM_PROOF.start} durationInFrames={SCENES.PLATFORM_PROOF.duration}>
        <PlatformProofScene />
      </Sequence>
      <Sequence from={SCENES.LIVE_DEMO.start} durationInFrames={SCENES.LIVE_DEMO.duration}>
        <LiveDashboardScene />
      </Sequence>
      <Sequence from={SCENES.METRICS.start} durationInFrames={SCENES.METRICS.duration}>
        <MetricsScene />
      </Sequence>
      <Sequence from={SCENES.CLOSING.start} durationInFrames={SCENES.CLOSING.duration}>
        <ClosingScene />
      </Sequence>

      {/* Bar alur — seluruh video */}
      <Sequence from={0} durationInFrames={DEMO_DURATION}>
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <BarAlur />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
