import React from "react";
import { Composition } from "remotion";
import { HackathonDemo } from "./compositions/HackathonDemo";
import { SocialMedia } from "./compositions/SocialMedia";
import { DEMO_DURATION, SOCIAL_DURATION, FPS } from "./constants";

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
    </>
  );
};
