import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../constants";

export const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [400, 450], [1, 0], { extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{
      justifyContent: "center",
      alignItems: "center",
      opacity: opacity * fadeOut,
      background: COLORS.bg,
    }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: COLORS.blue, fontSize: 72, fontWeight: 900 }}>DeadDrop</p>
        <p style={{ color: COLORS.muted, fontSize: 28, marginTop: 16, fontStyle: "italic" }}>
          "Because deployment shouldn't depend on luck."
        </p>

        <div style={{ marginTop: 48, display: "flex", gap: 32, justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: COLORS.muted, fontSize: 16 }}>GitHub</p>
            <p style={{ color: COLORS.text, fontSize: 20 }}>github.com/[YOUR_USERNAME]/deaddrop</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: COLORS.muted, fontSize: 16 }}>TrueFoundry Tenant</p>
            <p style={{ color: COLORS.text, fontSize: 20 }}>deaddrop.truefoundry.cloud</p>
          </div>
        </div>

        <p style={{ color: COLORS.muted, fontSize: 20, marginTop: 40 }}>
          Built with @TrueFoundry AI Gateway + AWS Bedrock
        </p>
        <p style={{ color: "#484f58", fontSize: 16, marginTop: 8 }}>
          #ResilientAgents
        </p>
      </div>
    </AbsoluteFill>
  );
};
