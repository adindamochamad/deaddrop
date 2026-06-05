import React from "react";
import { Composition } from "remotion";
import { HackathonDemo } from "./compositions/HackathonDemo";
import { SocialMedia } from "./compositions/SocialMedia";
import { BrollIntro } from "./compositions/BrollIntro";
import { BrollPipeline } from "./compositions/BrollPipeline";
import { BrollClosing } from "./compositions/BrollClosing";
import {
  DEMO_DURATION,
  SOCIAL_DURATION,
  BROLL_INTRO_DURATION,
  BROLL_PIPELINE_DURATION,
  BROLL_CLOSING_DURATION,
  FPS,
} from "./constants";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 3-minute hackathon submission video */}
      <Composition
        id="HackathonDemo"
        component={HackathonDemo}
        durationInFrames={DEMO_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ denganVoiceover: false }}
      />
      {/* 60-second social media cut (portrait) */}
      <Composition
        id="SocialMedia"
        component={SocialMedia}
        durationInFrames={SOCIAL_DURATION}
        fps={FPS}
        width={1080}
        height={1920}
      />

      {/* B-roll — splice with real screen recording */}
      <Composition
        id="BrollIntro"
        component={BrollIntro}
        durationInFrames={BROLL_INTRO_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="BrollPipeline"
        component={BrollPipeline}
        durationInFrames={BROLL_PIPELINE_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="BrollClosing"
        component={BrollClosing}
        durationInFrames={BROLL_CLOSING_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
