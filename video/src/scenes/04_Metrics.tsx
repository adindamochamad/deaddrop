import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT, TEMA } from "../theme";
import { KerangkaScene, StripHero } from "../ui-kit";

const METRICS = [
  { label: "Jobs Done", value: 3, suffix: "", kelas: "green" as const, delay: 100 },
  { label: "Prov. Switches", value: 2, suffix: "", kelas: "orange" as const, delay: 115 },
  { label: "Tool Failures", value: 1, suffix: "", kelas: "orange" as const, delay: 130 },
  { label: "Guardrails", value: 1, suffix: "", kelas: "red" as const, delay: 145 },
  { label: "Recovery", value: 2.4, suffix: "s", kelas: "purple" as const, delay: 160 },
  { label: "Manual Steps", value: 0, suffix: "", kelas: "green" as const, delay: 175 },
] as const;

const WARNA_KELAS = {
  green: TEMA.green,
  orange: TEMA.orange,
  red: TEMA.red,
  purple: TEMA.purple,
  blue: TEMA.blue,
} as const;

const KartuMetrik: React.FC<typeof METRICS[number]> = ({
  label, value, suffix, kelas, delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const warna = WARNA_KELAS[kelas];

  const s = spring({ frame: frame - delay, fps, config: { damping: 160, stiffness: 110 } });
  const scale = interpolate(s, [0, 1], [0.88, 1]);
  const opacity = interpolate(frame - delay, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const countUp = interpolate(frame - (delay + 8), [0, 40], [0, value], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tampilan = suffix === "s" ? countUp.toFixed(1) : String(Math.round(countUp));
  const pop = frame - delay < 25 && frame - delay > 18;

  return (
    <div style={{
      background: "rgba(17, 17, 19, 0.72)",
      backdropFilter: "blur(14px)",
      border: `1px solid ${TEMA.border}`,
      borderRadius: 10,
      padding: "18px 16px",
      position: "relative",
      overflow: "hidden",
      transform: `scale(${scale})${pop ? " translateY(-2px)" : ""}`,
      opacity,
      boxShadow: pop ? `0 0 20px ${warna}33` : "none",
    }}>
      <div style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        background: warna,
        borderRadius: "10px 0 0 10px",
      }} />
      <div style={{
        fontSize: 9,
        color: TEMA.text3,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 8,
        paddingLeft: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: FONT.mono,
        fontSize: suffix === "s" ? 28 : 34,
        fontWeight: 800,
        color: warna,
        paddingLeft: 8,
        textShadow: value === 0 ? "0 0 14px rgba(255,255,255,0.4)" : `0 0 12px ${warna}66`,
      }}>
        {tampilan}{suffix}
      </div>
    </div>
  );
};

export const MetricsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const mulai = 88;

  return (
    <KerangkaScene indeksBab={5}>
      <AbsoluteFill style={{
        padding: "88px 100px 130px",
        fontFamily: FONT.sans,
      }}>
        <StripHero
          frameMulai={mulai}
          teks={
            <>
              <em style={{ fontStyle: "normal", color: TEMA.text, fontWeight: 600 }}>Bukti terukur</em>
              {" "}— angka yang sama seperti kartu metrics di dashboard live.
            </>
          }
        />

        <h2 style={{
          marginTop: 36,
          fontSize: 22,
          fontWeight: 500,
          textAlign: "center",
          color: TEMA.text2,
          opacity: interpolate(frame - (mulai + 25), [0, 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}>
          Tanpa DeadDrop: job{" "}
          <span style={{ color: TEMA.red, textDecoration: "line-through" }}>gagal</span>
          {" · "}
          Dengan DeadDrop: job{" "}
          <span style={{ color: TEMA.green, textShadow: `0 0 10px ${TEMA.green}88` }}>selesai ✓</span>
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginTop: 32,
        }}>
          {METRICS.map((m) => (
            <KartuMetrik key={m.label} {...m} />
          ))}
        </div>
      </AbsoluteFill>
    </KerangkaScene>
  );
};
