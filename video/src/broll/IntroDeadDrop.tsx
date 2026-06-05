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
import { BadgeHackathon, JudulGradient, LogoKecil } from "../ui-kit";
import { LatarBroll } from "./LatarBroll";

const EMPAT_LAPIS = [
  {
    no: 1,
    judul: "AI Gateway",
    sub: "Claude → Mistral → Llama · circuit breakers",
    warna: TEMA.accent2,
    ikon: "⚡",
  },
  {
    no: 2,
    judul: "State Machine",
    sub: "Checkpoints · resume after crash",
    warna: TEMA.blue,
    ikon: "◎",
  },
  {
    no: 3,
    judul: "MCP Gateway",
    sub: "Deploy · validate · notifier fallback",
    warna: TEMA.accent,
    ikon: "⚙",
  },
  {
    no: 4,
    judul: "Guardrails",
    sub: "Secrets · YAML · prod block",
    warna: TEMA.orange,
    ikon: "🛡",
  },
] as const;

export const IntroDeadDrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Header muncul bersamaan
  const headerOp = interpolate(frame, [0, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const headerY = interpolate(frame, [0, 22], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <LatarBroll>
      <AbsoluteFill
        style={{
          padding: "60px 100px 64px",
          fontFamily: FONT.sans,
          flexDirection: "column",
          justifyContent: "flex-start",
          gap: 0,
        }}
      >
        {/* Bagian header: logo + judul + tagline */}
        <div
          style={{
            textAlign: "center",
            opacity: headerOp,
            transform: `translateY(${headerY}px)`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <LogoKecil ukuran={56} />
          </div>

          <JudulGradient size={88} style={{ display: "block", lineHeight: 1.05 }}>
            DeadDrop
          </JudulGradient>

          <p
            style={{
              marginTop: 10,
              fontSize: 14,
              color: TEMA.text3,
              letterSpacing: "0.04em",
            }}
          >
            Resilient deploy agent · TrueFoundry × AWS Bedrock
          </p>
        </div>

        {/* Tagline word-pop */}
        <div
          style={{
            textAlign: "center",
            marginTop: 16,
            fontSize: 22,
            minHeight: 36,
            opacity: interpolate(frame, [15, 32], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <WordPop
            text={`"Infrastructure dies. Your agent doesn't."`}
            startFrame={35}
            wordsPerSecond={2.8}
            wordStyle={{ color: TEMA.text2, fontStyle: "italic" }}
          />
        </div>

        {/* Empat lapis — grid 2×2 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            maxWidth: 880,
            margin: "28px auto 0",
            width: "100%",
          }}
        >
          {EMPAT_LAPIS.map((lapis, i) => {
            const mulai = 65 + i * 20;
            const kemunculan = spring({
              frame: frame - mulai,
              fps,
              config: { damping: 180, stiffness: 110 },
            });
            const skala = interpolate(kemunculan, [0, 1], [0.88, 1]);
            const keopasitan = interpolate(frame - mulai, [0, 14], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            });

            return (
              <div
                key={lapis.judul}
                style={{
                  background: "rgba(17, 17, 19, 0.78)",
                  backdropFilter: "blur(14px)",
                  border: `1px solid ${lapis.warna}44`,
                  borderLeft: `3px solid ${lapis.warna}`,
                  borderRadius: 10,
                  padding: "16px 18px",
                  transform: `scale(${skala})`,
                  opacity: keopasitan,
                  boxShadow: `0 0 20px ${lapis.warna}18`,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ fontSize: 20, lineHeight: 1 }}>{lapis.ikon}</span>
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: lapis.warna,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                      }}
                    >
                      Layer {lapis.no}
                    </div>
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        color: TEMA.text,
                        marginTop: 3,
                      }}
                    >
                      {lapis.judul}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: TEMA.text3,
                        marginTop: 4,
                        lineHeight: 1.4,
                      }}
                    >
                      {lapis.sub}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Deskripsi singkat */}
        <p
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 14,
            color: TEMA.text2,
            maxWidth: 740,
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.55,
            opacity: interpolate(frame, [135, 158], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Deployment agent that survives rate limits, tool failures, and bad LLM
          output — with an{" "}
          <strong style={{ color: TEMA.text, fontWeight: 600 }}>audit trail</strong>{" "}
          for every recovery.
        </p>

        {/* Badge hackathon */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 22,
            opacity: interpolate(frame, [168, 190], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <BadgeHackathon />
        </div>
      </AbsoluteFill>
    </LatarBroll>
  );
};
