import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { FONT, GRADIENT, TEMA } from "../theme";
import { WordPop } from "../components";
import { BadgeHackathon, JudulGradient, LogoKecil, PanelKaca } from "../ui-kit";
import { LatarBroll } from "./LatarBroll";

export const ClosingCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo + judul masuk dengan spring
  const logoSpr = spring({
    frame: frame - 8,
    fps,
    config: { damping: 200, stiffness: 80 },
  });
  const skalaLogo = interpolate(logoSpr, [0, 1], [0.82, 1]);

  // URL panel masuk sedikit terlambat
  const urlSpr = spring({
    frame: frame - 110,
    fps,
    config: { damping: 180, stiffness: 90 },
  });
  const skalaUrl = interpolate(urlSpr, [0, 1], [0.9, 1]);

  // Pulsa kecil pada URL card
  const pulsaUrl = 1 + Math.sin(frame * 0.12) * 0.015;

  return (
    <LatarBroll fadeOutFrames={30}>
      <AbsoluteFill
        style={{
          fontFamily: FONT.sans,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
          textAlign: "center",
        }}
      >
        {/* Blok atas: logo + judul + tagline */}
        <div
          style={{
            transform: `scale(${skalaLogo})`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <LogoKecil ukuran={76} />

          <div style={{ marginTop: 20 }}>
            <JudulGradient size={100} style={{ display: "block", lineHeight: 1.02 }}>
              DeadDrop
            </JudulGradient>
          </div>

          <div
            style={{
              marginTop: 20,
              fontSize: 26,
              minHeight: 40,
              opacity: interpolate(frame, [12, 28], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            <WordPop
              text={`"Infrastructure dies. Your agent doesn't."`}
              startFrame={40}
              wordsPerSecond={2.4}
              wordStyle={{ color: TEMA.text2, fontStyle: "italic" }}
            />
          </div>
        </div>

        {/* URL hero CTA */}
        <div
          style={{
            marginTop: 44,
            transform: `scale(${skalaUrl * pulsaUrl})`,
            opacity: interpolate(frame, [108, 132], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            }),
          }}
        >
          <PanelKaca
            borderAccent={TEMA.greenBdr}
            style={{
              padding: "24px 44px",
              background: GRADIENT.hero,
              boxShadow: `0 0 40px rgba(34,197,94,0.18)`,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: TEMA.text3,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              Live demo
            </p>
            <p
              style={{
                margin: "10px 0 0",
                fontFamily: FONT.mono,
                fontSize: 28,
                fontWeight: 700,
                color: TEMA.green,
                textShadow: `0 0 20px ${TEMA.green}66`,
              }}
            >
              deaddrop.adindamochamad.com
            </p>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 12,
                color: TEMA.text3,
              }}
            >
              Health check:{" "}
              <span style={{ color: TEMA.accent2, fontFamily: FONT.mono }}>
                /health
              </span>
            </p>
          </PanelKaca>
        </div>

        {/* GitHub link */}
        <div
          style={{
            marginTop: 24,
            opacity: interpolate(frame, [190, 215], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 10,
              color: TEMA.text3,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            GitHub
          </p>
          <p
            style={{
              marginTop: 6,
              fontFamily: FONT.mono,
              fontSize: 14,
              color: TEMA.text2,
            }}
          >
            github.com/adindamochamad/deaddrop
          </p>
        </div>

        {/* Badge hackathon */}
        <div
          style={{
            marginTop: 28,
            opacity: interpolate(frame, [265, 290], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <BadgeHackathon />
        </div>

        {/* Hashtag */}
        <p
          style={{
            marginTop: 20,
            fontSize: 13,
            color: TEMA.text3,
            opacity: interpolate(frame, [330, 355], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          #ResilientAgents · #TrueFoundry · #DeadDrop
        </p>

        {/* Flash merek final */}
        <p
          style={{
            marginTop: 28,
            fontSize: 20,
            fontWeight: 700,
            background: GRADIENT.judul,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            opacity: interpolate(frame, [420, 445], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          DeadDrop
        </p>
      </AbsoluteFill>
    </LatarBroll>
  );
};
