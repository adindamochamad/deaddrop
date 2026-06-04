import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS } from "../constants";

const METRICS = [
  { label: "Jobs Completed",        value: 1,   suffix: "",  color: COLORS.green,  delay: 5  },
  { label: "Provider Switches",     value: 2,   suffix: "",  color: COLORS.amber,  delay: 15 },
  { label: "Tool Failures Handled", value: 1,   suffix: "",  color: COLORS.amber,  delay: 25 },
  { label: "Guardrail Blocks",      value: 3,   suffix: "",  color: COLORS.red,    delay: 35 },
  { label: "Total Recovery Time",   value: 1.3, suffix: "s", color: COLORS.cyan,   delay: 45 },
  { label: "Manual Interventions",  value: 0,   suffix: "",  color: COLORS.muted,  delay: 55 },
] as const;

// ── MetricCard ─────────────────────────────────────────────────────────────

const MetricCard: React.FC<{
  label: string;
  value: number;
  suffix: string;
  color: string;
  delay: number;
}> = ({ label, value, suffix, color, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame: frame - delay, fps, config: { damping: 150, stiffness: 100 } });
  const scale   = interpolate(s, [0, 1], [0.5, 1]);
  const opacity = interpolate(frame - delay, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const countUp = interpolate(frame - (delay + 10), [0, 45], [0, value], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const display = suffix === "s" ? countUp.toFixed(1) : Math.round(countUp).toString();

  // Zero interventions: special white glow to celebrate
  const isZero = value === 0;

  return (
    <div style={{
      background: `${color}08`,
      border: `1px solid ${color}30`,
      borderRadius: 14,
      padding: "28px 18px",
      textAlign: "center",
      transform: `scale(${scale})`,
      opacity,
      boxShadow: `0 0 22px ${color}1a`,
    }}>
      <div style={{
        color: isZero ? "#ffffff" : color,
        fontSize: 62,
        fontWeight: 900,
        lineHeight: 1,
        letterSpacing: "-2px",
        fontFamily: "system-ui, sans-serif",
        textShadow: isZero
          ? "0 0 14px #fff, 0 0 30px #fff8"
          : `0 0 12px ${color}99, 0 0 28px ${color}44`,
      }}>
        {display}{suffix}
      </div>
      <div style={{
        color: COLORS.muted,
        fontSize: 13,
        marginTop: 10,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        fontFamily: "system-ui, sans-serif",
      }}>
        {label}
      </div>
    </div>
  );
};

// ── MetricsScene ───────────────────────────────────────────────────────────

export const MetricsScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{
      justifyContent: "center",
      alignItems: "center",
      padding: "58px 80px",
      background: COLORS.bg,
    }}>
      {/* Dot grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, #ffffff07 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }} />

      <div style={{ width: "100%", zIndex: 1, opacity: titleOp }}>
        <h2 style={{
          color: COLORS.text,
          fontSize: 25,
          fontWeight: 400,
          textAlign: "center",
          marginBottom: 46,
          letterSpacing: "-0.3px",
          fontFamily: "system-ui, sans-serif",
        }}>
          Without DeadDrop: job{" "}
          <span style={{ color: COLORS.red, textDecoration: "line-through", opacity: 0.85 }}>
            fails
          </span>
          {"   ·   "}
          With DeadDrop: job{" "}
          <span style={{
            color: COLORS.green,
            textShadow: `0 0 8px ${COLORS.green}88`,
          }}>
            completes ✓
          </span>
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 20,
        }}>
          {METRICS.map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
