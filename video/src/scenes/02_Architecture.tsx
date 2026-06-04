import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../constants";

const LAYERS = [
  { label: "DeadDrop Agent", sub: "State Machine · Circuit Breaker · Checkpoints", color: COLORS.blue,   delay: 0  },
  { label: "AI Gateway",     sub: "Claude Sonnet → Mistral Large → Llama 3.1",     color: COLORS.green,  delay: 8  },
  { label: "MCP Gateway",    sub: "github_deploy · validator · notifier",           color: COLORS.orange, delay: 16 },
  { label: "Guardrails",     sub: "Redact secrets · Block prod · Validate YAML",    color: COLORS.red,    delay: 24 },
  { label: "AWS Bedrock",    sub: "Primary LLM provider",                           color: COLORS.muted,  delay: 32 },
];

export const ArchitectureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80, opacity: fadeIn }}>
      <div style={{ width: 860 }}>
        <h2 style={{ color: COLORS.muted, fontSize: 18, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 24, textAlign: "center" }}>
          Architecture
        </h2>
        {LAYERS.map(layer => {
          const slideIn = interpolate(frame - layer.delay, [0, 20], [-40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const opacity = interpolate(frame - layer.delay, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={layer.label} style={{
              background: COLORS.surface,
              border: `1px solid ${layer.color}44`,
              borderLeft: `4px solid ${layer.color}`,
              borderRadius: 8,
              padding: "14px 20px",
              marginBottom: 10,
              transform: `translateX(${slideIn}px)`,
              opacity,
            }}>
              <span style={{ color: layer.color, fontWeight: 700, fontSize: 18 }}>{layer.label}</span>
              <span style={{ color: COLORS.muted, fontSize: 15, marginLeft: 12 }}>{layer.sub}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
