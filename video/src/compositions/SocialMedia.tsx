import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../constants";

export const SocialMedia: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.bg, fontFamily: "'JetBrains Mono', monospace" }}>
      {/* Hook 0-5s */}
      <Sequence from={0} durationInFrames={150}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 48, opacity }}>
          <p style={{ color: COLORS.amber, fontSize: 52, fontWeight: 700, textAlign: "center", lineHeight: 1.3 }}>
            Deployment agent kamu crash jam 2 pagi?
          </p>
        </AbsoluteFill>
      </Sequence>

      {/* Problem 5-20s */}
      <Sequence from={150} durationInFrames={450}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-start", padding: 48 }}>
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 32, width: "100%", fontFamily: "monospace" }}>
            <p style={{ color: COLORS.red, marginBottom: 12 }}>$ agent crashed — rate limit hit</p>
            <p style={{ color: COLORS.muted }}>ERROR: AWS Bedrock 429 Too Many Requests</p>
            <p style={{ color: COLORS.muted }}>FATAL: deployment pipeline stopped</p>
            <p style={{ color: COLORS.amber, marginTop: 12 }}>manual rollback required 😱</p>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Demo 20-45s */}
      <Sequence from={600} durationInFrames={750}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 48 }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: COLORS.blue, fontSize: 64, fontWeight: 900, marginBottom: 16 }}>DeadDrop</p>
            <p style={{ color: COLORS.green, fontSize: 32 }}>↩ Recovered in 0.8s</p>
            <p style={{ color: COLORS.muted, fontSize: 24, marginTop: 16 }}>Sonnet rate limited → switched to Mistral</p>
            <p style={{ color: COLORS.green, fontSize: 28, marginTop: 24 }}>Job: DONE ✓</p>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* CTA 55-60s */}
      <Sequence from={1650} durationInFrames={150}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 48 }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: COLORS.text, fontSize: 36, fontWeight: 700 }}>Built with @TrueFoundry AI Gateway</p>
            <p style={{ color: COLORS.muted, fontSize: 28, marginTop: 12 }}>#ResilientAgents #AWSBedrock</p>
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
