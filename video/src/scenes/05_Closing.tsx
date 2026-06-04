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

export const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpr = spring({ frame: frame - 5, fps, config: { damping: 200, stiffness: 60 } });
  const titleY   = interpolate(titleSpr, [0, 1], [60, 0]);
  const titleOp  = interpolate(frame, [5, 28], [0, 1], { extrapolateRight: "clamp" });

  const linksOp  = interpolate(frame, [100, 130], [0, 1], { extrapolateRight: "clamp" });
  const builtOp  = interpolate(frame, [135, 165], [0, 1], { extrapolateRight: "clamp" });
  const hashOp   = interpolate(frame, [168, 196], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut  = interpolate(frame, [400, 450], [1, 0], { extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{
      justifyContent: "center",
      alignItems: "center",
      background: COLORS.bg,
      opacity: fadeOut,
    }}>
      {/* Dot grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, #ffffff08 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }} />

      {/* Scanlines */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background:
          "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.05) 3px, rgba(0,0,0,0.05) 4px)",
      }} />

      <div style={{ textAlign: "center", zIndex: 1 }}>
        {/* Title */}
        <p style={{
          color: COLORS.blue,
          fontSize: 92,
          fontWeight: 900,
          letterSpacing: "-3px",
          lineHeight: 1,
          margin: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          transform: `translateY(${titleY}px)`,
          opacity: titleOp,
          textShadow: GLOW.blue,
        }}>
          DeadDrop
        </p>

        {/* Tagline word-by-word */}
        <div style={{ marginTop: 22, fontSize: 26, minHeight: 36 }}>
          <WordPop
            text={`"Because deployment shouldn't depend on luck."`}
            startFrame={35}
            wordsPerSecond={2.8}
            wordStyle={{ color: COLORS.muted, fontStyle: "italic" }}
          />
        </div>

        {/* Links */}
        <div style={{
          display: "flex",
          gap: 52,
          justifyContent: "center",
          marginTop: 52,
          opacity: linksOp,
        }}>
          {[
            { label: "GitHub",        value: "github.com/[USERNAME]/deaddrop" },
            { label: "TrueFoundry",   value: "deaddrop.truefoundry.cloud"     },
          ].map((item) => (
            <div key={item.label} style={{ textAlign: "center" }}>
              <p style={{
                color: COLORS.muted,
                fontSize: 12,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                margin: 0,
                fontFamily: "system-ui, sans-serif",
              }}>
                {item.label}
              </p>
              <p style={{
                color: COLORS.text,
                fontSize: 17,
                marginTop: 8,
                fontFamily: '"Courier New", monospace',
              }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Built with */}
        <p style={{
          color: COLORS.muted,
          fontSize: 17,
          marginTop: 40,
          opacity: builtOp,
          fontFamily: "system-ui, sans-serif",
        }}>
          Built with @TrueFoundry AI Gateway&nbsp;·&nbsp;AWS Bedrock
        </p>

        {/* Hashtags */}
        <p style={{
          color: "#252535",
          fontSize: 14,
          marginTop: 10,
          opacity: hashOp,
          fontFamily: "system-ui, sans-serif",
        }}>
          #ResilientAgents&nbsp;&nbsp;#TrueFoundry&nbsp;&nbsp;#DeadDrop
        </p>
      </div>
    </AbsoluteFill>
  );
};
