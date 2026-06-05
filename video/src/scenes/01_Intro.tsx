import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { FONT, TEMA } from "../theme";
import { WordPop } from "../components";
import {
  BadgeHackathon,
  JudulGradient,
  KerangkaScene,
  LogoKecil,
  StripHero,
} from "../ui-kit";

const BADGES = [
  { label: "TrueFoundry AI Gateway", warna: TEMA.blue },
  { label: "MCP Gateway", warna: TEMA.accent2 },
  { label: "Native Guardrails", warna: TEMA.purple },
];

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const kontenMulai = 82;
  const logoSpr = spring({ frame: frame - kontenMulai, fps, config: { damping: 180, stiffness: 90 } });
  const judulY = interpolate(logoSpr, [0, 1], [40, 0]);

  return (
    <KerangkaScene indeksBab={1}>
      <AbsoluteFill style={{
        padding: "88px 100px 130px",
        fontFamily: FONT.sans,
        justifyContent: "center",
      }}>
        <div style={{
          opacity: interpolate(frame - kontenMulai, [0, 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <LogoKecil ukuran={52} />
              <div>
                <JudulGradient size={36}>DeadDrop</JudulGradient>
                <p style={{ color: TEMA.text3, fontSize: 13, marginTop: 4 }}>
                  Infrastructure dies. Your agent doesn&apos;t.
                </p>
              </div>
            </div>
            <BadgeHackathon />
          </div>

          <StripHero
            frameMulai={kontenMulai + 10}
            teks={
              <>
                <em style={{ fontStyle: "normal", color: TEMA.text, fontWeight: 600 }}>
                  Agent deploy resilient
                </em>
                {" "}— state machine, circuit breaker, checkpoint, dan guardrails dalam satu pipeline yang bisa diaudit juri hackathon.
              </>
            }
          />

          <div style={{
            marginTop: 48,
            textAlign: "center",
            transform: `translateY(${judulY}px)`,
          }}>
            <JudulGradient size={88} style={{ display: "block", lineHeight: 1.05 }}>
              DeadDrop
            </JudulGradient>

            <div style={{ marginTop: 20, fontSize: 24, minHeight: 36 }}>
              <WordPop
                text={`"Infrastructure dies. Your agent doesn't."`}
                startFrame={kontenMulai + 55}
                wordsPerSecond={2.6}
                wordStyle={{ color: TEMA.text2, fontStyle: "italic" }}
              />
            </div>

            <div style={{
              display: "flex",
              gap: 14,
              justifyContent: "center",
              marginTop: 44,
              flexWrap: "wrap",
            }}>
              {BADGES.map((b, i) => {
                const p = interpolate(frame - (kontenMulai + 95 + i * 12), [0, 20], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.out(Easing.cubic),
                });
                return (
                  <div key={b.label} style={{
                    background: `${b.warna}10`,
                    border: `1px solid ${b.warna}44`,
                    borderRadius: 8,
                    padding: "11px 22px",
                    color: b.warna,
                    fontSize: 15,
                    fontWeight: 600,
                    opacity: p,
                    transform: `translateY(${interpolate(p, [0, 1], [12, 0])}px)`,
                    boxShadow: `0 0 16px ${b.warna}22`,
                  }}>
                    {b.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </KerangkaScene>
  );
};
