import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { FONT, TEMA } from "../theme";
import { KerangkaScene, PanelKaca, StripHero } from "../ui-kit";

const LAYERS = [
  {
    no: "01",
    label: "DeadDrop Agent",
    sub: "State Machine · Circuit Breaker · Checkpoints",
    warna: TEMA.blue,
    delay: 95,
  },
  {
    no: "02",
    label: "TrueFoundry AI Gateway",
    sub: "Claude Sonnet 4.6 → Mistral Large → Llama 3.1",
    warna: TEMA.accent2,
    delay: 130,
  },
  {
    no: "03",
    label: "TrueFoundry MCP Gateway",
    sub: "github_deploy · validator · notifier · graceful degradation",
    warna: TEMA.accent,
    delay: 165,
  },
  {
    no: "04",
    label: "Native Guardrails",
    sub: "Redact secrets · Block prod deploy · Validate YAML",
    warna: TEMA.orange,
    delay: 200,
  },
  {
    no: "05",
    label: "AWS Bedrock + Infrastructure",
    sub: "Primary LLM · GitHub · Kubernetes",
    warna: TEMA.text3,
    delay: 235,
  },
] as const;

export const ArchitectureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mulai = 88;

  return (
    <KerangkaScene indeksBab={2}>
      <AbsoluteFill style={{
        padding: "88px 100px 130px",
        fontFamily: FONT.sans,
      }}>
        <StripHero
          frameMulai={mulai}
          teks={
            <>
              <em style={{ fontStyle: "normal", color: TEMA.text, fontWeight: 600 }}>Empat lapis pengaman</em>
              {" "}— dari gateway LLM sampai guardrail, semua terhubung seperti jaringan neural di dashboard.
            </>
          }
        />

        <div style={{
          marginTop: 36,
          display: "flex",
          gap: 48,
          alignItems: "stretch",
        }}>
          {/* Alur vertikal — panah antar lapis */}
          <div style={{
            width: 48,
            marginTop: 24,
            position: "relative",
            opacity: interpolate(frame - mulai, [20, 40], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}>
            {LAYERS.slice(0, -1).map((_, i) => {
              const y = 24 + i * 98;
              const panah = interpolate(frame - (mulai + 50 + i * 28), [0, 15], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div key={i} style={{
                  position: "absolute",
                  left: 18,
                  top: y + 72,
                  width: 3,
                  height: 36 * panah,
                  background: `linear-gradient(180deg, ${TEMA.accent}, ${TEMA.accent2})`,
                  borderRadius: 2,
                  boxShadow: `0 0 10px ${TEMA.glow}`,
                }} />
              );
            })}
          </div>

          <div style={{ flex: 1, maxWidth: 920 }}>
            {LAYERS.map((layer) => {
              const s = spring({
                frame: frame - layer.delay,
                fps,
                config: { damping: 200, stiffness: 100 },
              });
              const x = interpolate(s, [0, 1], [-40, 0]);
              const opacity = interpolate(frame - layer.delay, [0, 12], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              });

              return (
                <PanelKaca
                  key={layer.label}
                  borderAccent={`${layer.warna}44`}
                  style={{
                    marginBottom: 12,
                    padding: "16px 22px",
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    transform: `translateX(${x}px)`,
                    opacity,
                    borderLeft: `3px solid ${layer.warna}`,
                  }}
                >
                  <span style={{
                    fontFamily: FONT.mono,
                    fontSize: 13,
                    fontWeight: 700,
                    color: layer.warna,
                    minWidth: 28,
                  }}>
                    {layer.no}
                  </span>
                  <div>
                    <div style={{
                      color: layer.warna,
                      fontWeight: 700,
                      fontSize: 18,
                      textShadow: `0 0 12px ${layer.warna}55`,
                    }}>
                      {layer.label}
                    </div>
                    <div style={{ color: TEMA.text3, fontSize: 13, marginTop: 4 }}>
                      {layer.sub}
                    </div>
                  </div>
                </PanelKaca>
              );
            })}
          </div>

          {/* Diagram mini alur data */}
          <PanelKaca style={{
            width: 280,
            padding: 20,
            marginTop: 24,
            opacity: interpolate(frame - (mulai + 120), [0, 25], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}>
            <div style={{ fontSize: 10, color: TEMA.text3, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
              Alur job
            </div>
            {["ANALYZE", "GENERATE", "VALIDATE", "DEPLOY", "DONE"].map((step, i) => {
              const aktif = frame > mulai + 140 + i * 22;
              return (
                <div key={step} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                  opacity: aktif ? 1 : 0.35,
                }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: aktif ? TEMA.green : TEMA.border,
                    boxShadow: aktif ? `0 0 10px ${TEMA.green}` : "none",
                  }} />
                  <span style={{
                    fontFamily: FONT.mono,
                    fontSize: 12,
                    color: aktif ? TEMA.green : TEMA.text3,
                    fontWeight: aktif ? 700 : 400,
                  }}>
                    {step}
                  </span>
                </div>
              );
            })}
          </PanelKaca>
        </div>
      </AbsoluteFill>
    </KerangkaScene>
  );
};
