import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../constants";

const LAYERS = [
  {
    icon: "⬡",
    label: "DeadDrop Agent",
    sub:   "State Machine  ·  Circuit Breaker  ·  Checkpoints",
    color: COLORS.blue,
    delay: 20,
  },
  {
    icon: "⚡",
    label: "TrueFoundry AI Gateway",
    sub:   "Claude Sonnet 4.6  →  Mistral Large  →  Llama 3.1",
    color: COLORS.cyan,
    delay: 55,
  },
  {
    icon: "⚙",
    label: "TrueFoundry MCP Gateway",
    sub:   "github_deploy  ·  validator  ·  notifier  ·  graceful degradation",
    color: COLORS.purple,
    delay: 90,
  },
  {
    icon: "🛡",
    label: "Native Guardrails",
    sub:   "Redact secrets  ·  Block prod deploy  ·  Validate YAML",
    color: COLORS.amber,
    delay: 125,
  },
  {
    icon: "☁",
    label: "AWS Bedrock  +  Infrastructure",
    sub:   "Primary LLM provider  ·  GitHub  ·  Kubernetes",
    color: COLORS.muted,
    delay: 160,
  },
] as const;

export const ArchitectureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const titleOp = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 110px",
        background: COLORS.bg,
      }}
    >
      {/* Dot grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, #ffffff07 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }} />

      <div style={{ width: 880, zIndex: 1, opacity: titleOp }}>
        <p style={{
          color: COLORS.muted,
          fontSize: 12,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          textAlign: "center",
          marginBottom: 30,
          fontFamily: "system-ui, sans-serif",
        }}>
          Resilience Architecture
        </p>

        {LAYERS.map((layer) => {
          const progress = interpolate(frame - layer.delay, [0, 22], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const x = interpolate(progress, [0, 1], [-55, 0]);

          // Initial flash glow fades to resting glow
          const age = frame - layer.delay;
          const glow = age < 35
            ? interpolate(age, [0, 14, 35], [0, 1, 0.3])
            : 0.3;

          return (
            <div
              key={layer.label}
              style={{
                background: `${layer.color}08`,
                border: `1px solid ${layer.color}${hexAlpha(20 + glow * 70)}`,
                borderLeft: `3px solid ${layer.color}`,
                borderRadius: 8,
                padding: "15px 22px",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 18,
                transform: `translateX(${x}px)`,
                opacity: progress,
                boxShadow: `0 0 ${22 * glow}px ${layer.color}${hexAlpha(glow * 55)}`,
                transition: "box-shadow 0.1s",
              }}
            >
              <span style={{
                fontSize: 24,
                filter: `drop-shadow(0 0 5px ${layer.color})`,
                minWidth: 28,
                textAlign: "center",
              }}>
                {layer.icon}
              </span>
              <div>
                <span style={{
                  color: layer.color,
                  fontWeight: 700,
                  fontSize: 19,
                  fontFamily: "system-ui, sans-serif",
                  textShadow: `0 0 8px ${layer.color}88`,
                }}>
                  {layer.label}
                </span>
                <span style={{
                  color: COLORS.muted,
                  fontSize: 14,
                  marginLeft: 14,
                  fontFamily: "system-ui, sans-serif",
                }}>
                  {layer.sub}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

function hexAlpha(value: number): string {
  return Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, "0");
}
