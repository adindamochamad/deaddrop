import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoY = interpolate(
    spring({ frame, fps, config: { damping: 200 } }),
    [0, 1], [60, 0]
  );
  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const tagFade = interpolate(frame, [20, 45], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: fadeIn }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{
          color: COLORS.blue,
          fontSize: 96,
          fontWeight: 900,
          letterSpacing: "-2px",
          transform: `translateY(${logoY}px)`,
        }}>
          DeadDrop
        </h1>
        <p style={{
          color: COLORS.muted,
          fontSize: 32,
          marginTop: 16,
          opacity: tagFade,
          fontStyle: "italic",
        }}>
          "Infrastructure dies. Your agent doesn't."
        </p>

        <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 48, opacity: tagFade }}>
          {["TrueFoundry AI Gateway", "MCP Gateway", "Guardrails"].map(label => (
            <div key={label} style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              padding: "10px 20px",
              color: COLORS.text,
              fontSize: 18,
            }}>
              {label}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
