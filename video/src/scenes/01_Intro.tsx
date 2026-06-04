import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, GLOW } from "../constants";
import { WordPop } from "../components";

const BADGES = [
  { label: "TrueFoundry AI Gateway", color: COLORS.blue   },
  { label: "MCP Gateway",            color: COLORS.cyan   },
  { label: "Native Guardrails",      color: COLORS.purple },
];

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgFade = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  const titleSpr = spring({ frame: frame - 8, fps, config: { damping: 180, stiffness: 70 } });
  const titleY   = interpolate(titleSpr, [0, 1], [80, 0]);
  const titleOp  = interpolate(frame, [8, 30], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: COLORS.bg,
        opacity: bgFade,
      }}
    >
      {/* Dot grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, #ffffff08 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }} />

      {/* Scanline overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background:
          "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)",
      }} />

      <div style={{ textAlign: "center", zIndex: 1 }}>
        {/* DeadDrop title */}
        <h1
          style={{
            color: COLORS.blue,
            fontSize: 112,
            fontWeight: 900,
            letterSpacing: "-4px",
            lineHeight: 1,
            margin: 0,
            fontFamily: "system-ui, -apple-system, sans-serif",
            transform: `translateY(${titleY}px)`,
            opacity: titleOp,
            textShadow: GLOW.blue,
          }}
        >
          DeadDrop
        </h1>

        {/* Tagline — word-by-word VO sync */}
        <div style={{ marginTop: 22, fontSize: 28, minHeight: 38 }}>
          <WordPop
            text={`"Infrastructure dies. Your agent doesn't."`}
            startFrame={42}
            wordsPerSecond={2.8}
            wordStyle={{ color: COLORS.muted, fontStyle: "italic" }}
          />
        </div>

        {/* Tech badges */}
        <div style={{
          display: "flex",
          gap: 16,
          justifyContent: "center",
          marginTop: 52,
        }}>
          {BADGES.map((badge, i) => {
            const p = interpolate(frame - (95 + i * 14), [0, 22], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const x = interpolate(p, [0, 1], [-28, 0]);
            return (
              <div
                key={badge.label}
                style={{
                  background: `${badge.color}10`,
                  border: `1px solid ${badge.color}55`,
                  borderRadius: 8,
                  padding: "10px 24px",
                  color: badge.color,
                  fontSize: 17,
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  opacity: p,
                  transform: `translateX(${x}px)`,
                  boxShadow: `0 0 14px ${badge.color}28`,
                }}
              >
                {badge.label}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
