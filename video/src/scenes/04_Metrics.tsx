import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";

const METRIC_DATA = [
  { label: "Jobs Completed",        value: "1",   color: COLORS.green  },
  { label: "Provider Switches",     value: "2",   color: COLORS.orange },
  { label: "Tool Failures Handled", value: "1",   color: COLORS.orange },
  { label: "Guardrails Blocked",    value: "3",   color: COLORS.red    },
  { label: "State Checkpoints Saved", value: "7", color: COLORS.blue   },
  { label: "Total Recovery Time",   value: "1.3s",color: COLORS.green  },
];

export const MetricsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80, opacity: fadeIn }}>
      <div style={{ textAlign: "center", width: "100%" }}>
        <h2 style={{ color: COLORS.text, fontSize: 32, marginBottom: 48 }}>
          Without DeadDrop: job fails &nbsp;|&nbsp;
          <span style={{ color: COLORS.green }}>With DeadDrop: job completes ✓</span>
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {METRIC_DATA.map((m, i) => {
            const s = spring({ frame: frame - i * 5, fps, config: { damping: 200 } });
            const scale = interpolate(s, [0, 1], [0.6, 1]);
            return (
              <div key={m.label} style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: "24px 20px",
                transform: `scale(${scale})`,
              }}>
                <div style={{ color: m.color, fontSize: 52, fontWeight: 900 }}>{m.value}</div>
                <div style={{ color: COLORS.muted, fontSize: 16, marginTop: 8 }}>{m.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
