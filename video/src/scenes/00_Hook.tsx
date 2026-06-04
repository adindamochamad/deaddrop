import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } from "remotion";
import { COLORS } from "../constants";

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const crashScale = spring({ frame: frame - 30, fps, config: { damping: 120 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80, opacity: fadeIn }}>
      {/* Terminal window */}
      <div style={{
        background: "#010409",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 32,
        width: 900,
        fontFamily: "monospace",
        fontSize: 18,
        transform: `scale(${crashScale})`,
      }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#f85149" }} />
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#f0883e" }} />
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#3fb950" }} />
        </div>
        <p style={{ color: COLORS.muted }}>$ deploy-agent --env production --service payment-service</p>
        <p style={{ color: COLORS.text, marginTop: 8 }}>→ Calling AWS Bedrock (Claude Sonnet)...</p>
        <p style={{ color: COLORS.red, marginTop: 8 }}>ERROR: 429 Too Many Requests — rate limit exceeded</p>
        <p style={{ color: COLORS.red }}>FATAL: config generation failed</p>
        <p style={{ color: COLORS.orange, marginTop: 8 }}>🚨 Deployment stopped at 2:03 AM</p>
        <p style={{ color: COLORS.muted, marginTop: 8 }}>Manual rollback required...</p>
      </div>

      <p style={{
        color: COLORS.muted,
        fontSize: 22,
        marginTop: 32,
        textAlign: "center",
      }}>
        "Rate limit hit. Config generation failed. 5 hours of engineer time lost."
      </p>
    </AbsoluteFill>
  );
};
