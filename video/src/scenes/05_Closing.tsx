import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT, TEMA } from "../theme";
import { WordPop } from "../components";
import {
  BadgeHackathon,
  JudulGradient,
  KerangkaScene,
  LogoKecil,
  PanelKaca,
} from "../ui-kit";

export const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mulai = 78;

  const titleSpr = spring({ frame: frame - mulai, fps, config: { damping: 200, stiffness: 70 } });
  const titleY = interpolate(titleSpr, [0, 1], [50, 0]);
  const linksOp = interpolate(frame - (mulai + 90), [0, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [480, 530], [1, 0], { extrapolateLeft: "clamp" });

  return (
    <KerangkaScene indeksBab={5} tampilkanLegenda={false}>
      <AbsoluteFill style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
        fontFamily: FONT.sans,
      }}>
        <div style={{ textAlign: "center", zIndex: 3 }}>
          <div style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 24,
            transform: `translateY(${titleY}px)`,
          }}>
            <LogoKecil ukuran={72} />
          </div>

          <JudulGradient size={96} style={{ display: "block", lineHeight: 1 }}>
            DeadDrop
          </JudulGradient>

          <div style={{ marginTop: 18, fontSize: 24, minHeight: 32 }}>
            <WordPop
              text={`"Infrastructure dies. Your agent doesn't."`}
              startFrame={mulai + 35}
              wordsPerSecond={2.5}
              wordStyle={{ color: TEMA.text2, fontStyle: "italic" }}
            />
          </div>

          <div style={{
            display: "flex",
            gap: 24,
            justifyContent: "center",
            marginTop: 40,
            opacity: linksOp,
          }}>
            {[
              { label: "Live Demo", value: "deaddrop.adindamochamad.com", warna: TEMA.green },
              { label: "GitHub", value: "github.com/adindamochamad/deaddrop", warna: TEMA.accent2 },
            ].map((item) => (
              <PanelKaca key={item.label} borderAccent={`${item.warna}44`} style={{
                padding: "20px 32px",
                minWidth: 320,
                textAlign: "center",
              }}>
                <p style={{
                  color: TEMA.text3,
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  margin: 0,
                }}>
                  {item.label}
                </p>
                <p style={{
                  color: TEMA.text,
                  fontSize: 16,
                  marginTop: 10,
                  fontFamily: FONT.mono,
                }}>
                  {item.value}
                </p>
              </PanelKaca>
            ))}
          </div>

          <div style={{ marginTop: 36, opacity: linksOp }}>
            <BadgeHackathon />
          </div>

          <p style={{
            color: TEMA.text3,
            fontSize: 14,
            marginTop: 28,
            opacity: interpolate(frame - (mulai + 120), [0, 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}>
            #ResilientAgents · #TrueFoundry · #DeadDrop
          </p>
        </div>
      </AbsoluteFill>
    </KerangkaScene>
  );
};
