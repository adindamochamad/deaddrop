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
import { LatarBroll } from "./LatarBroll";

/**
 * Empat stage pipeline dengan posisi x yang proporsional di 1760px konten.
 * NODE_X adalah pusat horizontal masing-masing node.
 */
const NODE_X = [220, 588, 956, 1324];
const NODE_LEBAR = 180;
/** y pusat lingkaran node di dalam container relatif */
const NODE_Y = 80;
/** total tinggi container node + detail card */
const TINGGI_CONTAINER = 340;

const TAHAP = [
  {
    id: "gateway",
    label: "AI Gateway",
    detail: "Claude Sonnet 4.6 → Mistral → Llama",
    sub: "Per-provider circuit breaker · auto fallback",
    warna: TEMA.accent2,
    mulaiFrame: 60,
  },
  {
    id: "state",
    label: "State Machine",
    detail: "PENDING → ANALYZING → DEPLOYING → DONE",
    sub: "MySQL checkpoint after every step",
    warna: TEMA.blue,
    mulaiFrame: 190,
  },
  {
    id: "mcp",
    label: "MCP Gateway",
    detail: "deploy · validator · notifier",
    sub: "Quarantine · timeout · graceful degradation",
    warna: TEMA.accent,
    mulaiFrame: 320,
  },
  {
    id: "guardrails",
    label: "Guardrails",
    detail: "Secrets · YAML · prod block",
    sub: "TrueFoundry + local validation layer",
    warna: TEMA.orange,
    mulaiFrame: 450,
  },
] as const;

const STATUS_MESIN = ["PENDING", "ANALYZING", "GENERATING", "VALIDATING", "DEPLOYING", "DONE"];

export const PipelineFourLayers: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const judulOpasitas = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });

  // Temukan stage yang paling akhir aktif (null sebelum frame pertama)
  const idxAktif = [...TAHAP]
    .map((t, i) => ({ i, aktif: frame >= t.mulaiFrame }))
    .filter((x) => x.aktif)
    .reduce((acc, x) => x.i, -1);

  return (
    <LatarBroll>
      <AbsoluteFill style={{ fontFamily: FONT.sans, padding: "68px 80px 60px", flexDirection: "column" }}>
        {/* Judul */}
        <div style={{ textAlign: "center", opacity: judulOpasitas, marginBottom: 40 }}>
          <p
            style={{
              fontSize: 12,
              color: TEMA.text3,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: 10,
              margin: "0 0 10px 0",
            }}
          >
            Resilience pipeline
          </p>
          <h2
            style={{
              margin: 0,
              fontSize: 34,
              fontWeight: 700,
              color: TEMA.text,
              letterSpacing: "-0.02em",
            }}
          >
            Gateway → State machine → MCP → Guardrails
          </h2>
        </div>

        {/*
         * Container relatif untuk node + panah.
         * SVG panah berada DALAM container yang sama sehingga koordinat y
         * sejajar dengan posisi node (tidak menggunakan koordinat frame absolut).
         */}
        <div style={{ position: "relative", height: TINGGI_CONTAINER, flexShrink: 0 }}>
          {/* Garis koneksi antar node — digambar di dalam container */}
          <svg
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: TINGGI_CONTAINER,
              pointerEvents: "none",
              overflow: "visible",
            }}
          >
            {TAHAP.slice(0, -1).map((_, i) => {
              const xMulai = NODE_X[i] + NODE_LEBAR / 2;
              const xAkhir = NODE_X[i + 1] - NODE_LEBAR / 2;
              const garisAktif = i < idxAktif;

              // Animasi partikel berjalan di atas garis yang aktif
              const progressPartikel = garisAktif
                ? interpolate(frame % 45, [0, 45], [0, 1], {
                    easing: Easing.inOut(Easing.cubic),
                  })
                : 0;

              return (
                <g key={`panah-${i}`}>
                  <line
                    x1={xMulai}
                    y1={NODE_Y}
                    x2={xAkhir}
                    y2={NODE_Y}
                    stroke={garisAktif ? TEMA.accent : TEMA.border}
                    strokeWidth={garisAktif ? 2.5 : 1}
                    strokeOpacity={garisAktif ? 0.85 : 0.25}
                  />
                  {/* Kepala panah */}
                  <polygon
                    points={`${xAkhir},${NODE_Y} ${xAkhir - 10},${NODE_Y - 5} ${xAkhir - 10},${NODE_Y + 5}`}
                    fill={garisAktif ? TEMA.accent : TEMA.border}
                    opacity={garisAktif ? 0.85 : 0.25}
                  />
                  {/* Partikel bergerak */}
                  {garisAktif && (
                    <circle
                      cx={xMulai + (xAkhir - xMulai) * progressPartikel}
                      cy={NODE_Y}
                      r={5}
                      fill={TEMA.accent2}
                      style={{ filter: `drop-shadow(0 0 8px ${TEMA.accent2})` }}
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Node untuk setiap tahap */}
          {TAHAP.map((tahap, i) => {
            const sudahAktif = frame >= tahap.mulaiFrame;
            const sedangSorot = i === idxAktif;
            const kemunculan = spring({
              frame: frame - tahap.mulaiFrame,
              fps,
              config: { damping: 200, stiffness: 100 },
            });
            const skala = interpolate(kemunculan, [0, 1], [0.88, sedangSorot ? 1.05 : 1]);
            const opasitas = interpolate(frame - tahap.mulaiFrame + 20, [0, 15], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={tahap.id}
                style={{
                  position: "absolute",
                  left: NODE_X[i] - NODE_LEBAR / 2,
                  top: 0,
                  width: NODE_LEBAR,
                  textAlign: "center",
                  transform: `scale(${skala})`,
                  transformOrigin: "top center",
                  opacity: opasitas,
                }}
              >
                {/* Lingkaran node */}
                <div
                  style={{
                    width: 64,
                    height: 64,
                    margin: "0 auto 12px",
                    borderRadius: "50%",
                    border: `2px solid ${sedangSorot ? tahap.warna : TEMA.border}`,
                    background: sedangSorot
                      ? `${tahap.warna}1a`
                      : "rgba(17,17,19,0.85)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: FONT.mono,
                    fontSize: 20,
                    fontWeight: 800,
                    color: sedangSorot ? tahap.warna : TEMA.text3,
                    boxShadow: sedangSorot
                      ? `0 0 28px ${tahap.warna}55`
                      : "none",
                  }}
                >
                  {i + 1}
                </div>

                {/* Label */}
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: sedangSorot ? TEMA.text : TEMA.text2,
                    lineHeight: 1.3,
                  }}
                >
                  {tahap.label}
                </div>

                {/* Detail card — muncul setelah stage aktif */}
                {sudahAktif && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 10px",
                      borderRadius: 8,
                      background: "rgba(9,9,11,0.88)",
                      border: `1px solid ${tahap.warna}44`,
                      fontSize: 10,
                      color: TEMA.text2,
                      lineHeight: 1.5,
                      opacity: interpolate(frame - tahap.mulaiFrame, [8, 22], [0, 1], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      }),
                    }}
                  >
                    <div style={{ color: tahap.warna, fontWeight: 600, marginBottom: 5 }}>
                      {tahap.detail}
                    </div>
                    <div>{tahap.sub}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* State-machine strip — muncul saat state machine aktif */}
        <div
          style={{
            marginTop: 32,
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 8,
            opacity: interpolate(frame, [190, 215], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {STATUS_MESIN.map((st, i) => {
            const nyala = idxAktif >= 1 && frame > 190 + i * 16;
            return (
              <span
                key={st}
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 10,
                  fontWeight: nyala ? 700 : 400,
                  color: nyala ? TEMA.green : TEMA.text3,
                  padding: "4px 9px",
                  borderRadius: 4,
                  border: `1px solid ${nyala ? TEMA.greenBdr : TEMA.border}`,
                  background: nyala ? TEMA.greenBg : "transparent",
                  transition: "all 0.2s",
                }}
              >
                {st}
              </span>
            );
          })}
        </div>

        {/* Label bawah — catatan singkat */}
        <p
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 12,
            color: TEMA.text3,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            opacity: interpolate(frame, [460, 485], [0, 0.7], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Every layer recovers independently · zero single point of failure
        </p>
      </AbsoluteFill>
    </LatarBroll>
  );
};
