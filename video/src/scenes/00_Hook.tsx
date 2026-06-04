import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, GLOW } from "../constants";
import { Typewriter, WordPop } from "../components";

// Terminal lines — each appears in sequence, typewriter-style
const LINES: { start: number; text: string; color: string }[] = [
  { start: 12,  text: "$ deploy-agent --env staging --service payment-service",        color: "#4a5568" },
  { start: 62,  text: "→ Initializing deployment agent...",                            color: COLORS.text },
  { start: 100, text: "→ Calling AWS Bedrock (Claude Sonnet 4.6)...",                 color: COLORS.blue },
  { start: 148, text: "→ Generating Kubernetes manifest...",                           color: COLORS.blue },
  { start: 192, text: "✗ ERROR: 429 Too Many Requests — provider rate limit exceeded", color: COLORS.red },
  { start: 246, text: "✗ FATAL: config generation failed after 3 retries",             color: COLORS.red },
  { start: 290, text: "⚠  Deployment STOPPED at 02:03 AM — manual rollback required", color: COLORS.amber },
];

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();

  const fadeIn   = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const qFade    = interpolate(frame, [320, 340], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
        background: COLORS.bg,
        opacity: fadeIn,
      }}
    >
      {/* Dot-grid background */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, #ffffff09 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }} />

      {/* Terminal window */}
      <div style={{
        background: COLORS.surface,
        borderTop: `2px solid ${COLORS.red}`,
        border: `1px solid #ff444433`,
        borderRadius: 12,
        padding: "28px 36px",
        width: 940,
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: 16,
        lineHeight: 1.8,
        boxShadow: `0 0 60px #ff444418, 0 0 120px #ff44440a`,
        zIndex: 1,
      }}>
        {/* Traffic lights */}
        <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
          {(["#ff5f57", "#febc2e", "#28c840"] as const).map((c, i) => (
            <div key={i} style={{ width: 13, height: 13, borderRadius: "50%", background: c }} />
          ))}
        </div>

        {LINES.map((line, i) => (
          <div
            key={i}
            style={{
              color: line.color,
              minHeight: 28,
              textShadow:
                line.color === COLORS.red   ? GLOW.red   :
                line.color === COLORS.blue  ? GLOW.blue  :
                line.color === COLORS.amber ? GLOW.amber : "none",
            }}
          >
            {frame >= line.start && (
              <Typewriter
                text={line.text}
                startFrame={line.start}
                charsPerSecond={42}
                showCursor={i === LINES.length - 1}
                style={{ color: line.color }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Word-pop question — VO line 1 */}
      <div style={{
        marginTop: 44,
        fontSize: 27,
        fontWeight: 600,
        textAlign: "center",
        opacity: qFade,
        zIndex: 1,
        letterSpacing: "-0.3px",
      }}>
        <WordPop
          text="What if your agent could survive this — on its own?"
          startFrame={342}
          wordsPerSecond={2.6}
          wordStyle={{ color: COLORS.muted }}
        />
      </div>
    </AbsoluteFill>
  );
};
