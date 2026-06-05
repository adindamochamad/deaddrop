import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { LatarNeural } from "../ui-kit";

/**
 * Wrapper latar b-roll — neural bg, fade-in 18 frame, fade-out 24 frame.
 * Tanpa chapter overlay / progress bar (berbeda dari KerangkaScene).
 */
export const LatarBroll: React.FC<{
  children: React.ReactNode;
  fadeInFrames?: number;
  fadeOutFrames?: number;
}> = ({ children, fadeInFrames = 18, fadeOutFrames = 24 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const masuk = interpolate(frame, [0, fadeInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const keluar = interpolate(
    frame,
    [durationInFrames - fadeOutFrames, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ opacity: Math.min(masuk, keluar) }}>
      <LatarNeural intensitas={1} />
      <AbsoluteFill style={{ zIndex: 2 }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
