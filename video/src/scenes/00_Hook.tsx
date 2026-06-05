import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FONT, TEMA } from "../theme";
import { Typewriter, WordPop } from "../components";
import { KerangkaScene, PanelKaca } from "../ui-kit";

const LINES: { start: number; text: string; color: string }[] = [
  { start: 88,  text: "$ deploy-agent --env staging --service payment-service", color: TEMA.text3 },
  { start: 128, text: "→ Initializing deployment agent...", color: TEMA.text },
  { start: 158, text: "→ Calling AWS Bedrock (Claude Sonnet 4.6)...", color: TEMA.blue },
  { start: 198, text: "→ Generating Kubernetes manifest...", color: TEMA.blue },
  { start: 238, text: "✗ ERROR: 429 Too Many Requests — provider rate limit exceeded", color: TEMA.red },
  { start: 278, text: "✗ FATAL: config generation failed after 3 retries", color: TEMA.red },
  { start: 318, text: "⚠  Deployment STOPPED at 02:03 AM — manual rollback required", color: TEMA.orange },
];

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const qFade = interpolate(frame, [380, 400], [0, 1], { extrapolateRight: "clamp" });
  const terminalMasuk = interpolate(frame, [70, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <KerangkaScene indeksBab={0} tampilkanLegenda={false}>
      <AbsoluteFill style={{
        justifyContent: "center",
        alignItems: "center",
        padding: "100px 120px 140px",
        fontFamily: FONT.sans,
      }}>
        <PanelKaca borderAccent={TEMA.redBdr} style={{
          width: 1000,
          padding: "32px 40px",
          opacity: terminalMasuk,
          transform: `translateY(${interpolate(terminalMasuk, [0, 1], [24, 0])}px)`,
          borderTop: `2px solid ${TEMA.red}`,
          boxShadow: `0 0 48px ${TEMA.redBg}, ${TEMA.red}18 0 24px 80px`,
        }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
            ))}
            <span style={{
              marginLeft: 12,
              fontSize: 11,
              color: TEMA.text3,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}>
              production · 02:03 AM
            </span>
          </div>

          <div style={{ fontFamily: FONT.mono, fontSize: 15, lineHeight: 1.85 }}>
            {LINES.map((line, i) => (
              <div key={i} style={{ color: line.color, minHeight: 26 }}>
                {frame >= line.start && (
                  <Typewriter
                    text={line.text}
                    startFrame={line.start}
                    charsPerSecond={44}
                    showCursor={i === LINES.length - 1}
                    style={{ color: line.color }}
                  />
                )}
              </div>
            ))}
          </div>
        </PanelKaca>

        <div style={{
          marginTop: 40,
          fontSize: 26,
          fontWeight: 600,
          textAlign: "center",
          opacity: qFade,
          maxWidth: 820,
        }}>
          <WordPop
            text="What if your agent could survive this — without waking an engineer at 2 AM?"
            startFrame={402}
            wordsPerSecond={2.4}
            wordStyle={{ color: TEMA.text2 }}
          />
        </div>
      </AbsoluteFill>
    </KerangkaScene>
  );
};
