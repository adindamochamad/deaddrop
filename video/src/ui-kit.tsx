import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { ALUR_BAB, FONT, GRADIENT, SOMBR, TEMA } from "./theme";
import { SCENES } from "./constants";

const UKURAN_LAPISAN = [5, 7, 7, 4] as const;
const POSISI_X = [280, 720, 1160, 1600];

/** Latar jaringan neural 2D — mirip dashboard-bg Three.js */
export const LatarNeural: React.FC<{ intensitas?: number }> = ({ intensitas = 1 }) => {
  const frame = useCurrentFrame();

  const nodeDanGaris = useMemo(() => {
    const nodes: { x: number; y: number; lapisan: number }[] = [];
    UKURAN_LAPISAN.forEach((jumlah, idx) => {
      const x = POSISI_X[idx];
      for (let n = 0; n < jumlah; n++) {
        const y = 200 + ((n / (jumlah - 1 || 1)) * 680);
        nodes.push({ x, y, lapisan: idx });
      }
    });
    const garis: { x1: number; y1: number; x2: number; y2: number }[] = [];
    nodes.forEach((a, i) => {
      if (a.lapisan >= UKURAN_LAPISAN.length - 1) return;
      nodes.forEach((b, j) => {
        if (b.lapisan === a.lapisan + 1) {
          garis.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
        }
      });
    });
    return { nodes, garis };
  }, []);

  const denyut = 0.5 + Math.sin(frame * 0.08) * 0.25;
  const gelombang = (i: number) =>
    Math.max(0, Math.sin(frame * 0.12 + i * 0.7) * intensitas * denyut);

  return (
    <AbsoluteFill style={{ background: TEMA.bgNeural, overflow: "hidden" }}>
      <div style={{
        position: "absolute",
        inset: 0,
        background: GRADIENT.vignette,
        pointerEvents: "none",
      }} />
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0, opacity: 0.85 }}>
        {nodeDanGaris.garis.map((g, i) => {
          const aktif = gelombang(i % 12);
          return (
            <line
              key={`g-${i}`}
              x1={g.x1}
              y1={g.y1}
              x2={g.x2}
              y2={g.y2}
              stroke={TEMA.accent}
              strokeWidth={1 + aktif}
              strokeOpacity={0.08 + aktif * 0.35}
            />
          );
        })}
        {nodeDanGaris.nodes.map((n, i) => {
          const warna =
            n.lapisan === 0 ? "#71717a" :
            n.lapisan === UKURAN_LAPISAN.length - 1 ? TEMA.accent2 : TEMA.accent;
          const r = 4 + gelombang(i) * 5;
          return (
            <circle
              key={`n-${i}`}
              cx={n.x}
              cy={n.y}
              r={r}
              fill={warna}
              opacity={0.35 + gelombang(i) * 0.55}
              style={{ filter: `drop-shadow(0 0 ${8 + gelombang(i) * 12}px ${warna})` }}
            />
          );
        })}
      </svg>
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
        opacity: 0.5,
      }} />
    </AbsoluteFill>
  );
};

export const PanelKaca: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  borderAccent?: string;
}> = ({ children, style, borderAccent }) => (
  <div style={{
    background: "rgba(17, 17, 19, 0.72)",
    backdropFilter: "blur(14px)",
    border: `1px solid ${borderAccent ?? TEMA.border}`,
    borderRadius: 10,
    boxShadow: SOMBR.panel,
    ...style,
  }}>
    {children}
  </div>
);

export const JudulGradient: React.FC<{
  children: React.ReactNode;
  size?: number;
  style?: React.CSSProperties;
}> = ({ children, size = 48, style }) => (
  <span style={{
    fontFamily: FONT.mono,
    fontSize: size,
    fontWeight: 700,
    letterSpacing: "-0.04em",
    background: GRADIENT.judul,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    ...style,
  }}>
    {children}
  </span>
);

export const BadgeHackathon: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => (
  <div style={{
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: TEMA.text2,
    padding: "6px 14px",
    borderRadius: 20,
    border: "1px solid rgba(139, 92, 246, 0.35)",
    background: GRADIENT.badge,
    opacity,
    fontFamily: FONT.sans,
  }}>
    Resilient Agents · <span style={{ color: TEMA.accent2, fontWeight: 700 }}>TrueFoundry × Bedrock</span>
  </div>
);

export const StripHero: React.FC<{
  teks: React.ReactNode;
  frameMulai?: number;
}> = ({ teks, frameMulai = 0 }) => {
  const frame = useCurrentFrame();
  const masuk = interpolate(frame - frameMulai, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const y = interpolate(masuk, [0, 1], [16, 0]);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      padding: "14px 20px",
      borderRadius: 10,
      border: "1px solid rgba(139, 92, 246, 0.2)",
      background: GRADIENT.hero,
      opacity: masuk,
      transform: `translateY(${y}px)`,
      fontFamily: FONT.sans,
    }}>
      <p style={{ fontSize: 15, color: TEMA.text2, lineHeight: 1.5, margin: 0, maxWidth: 1100 }}>
        {teks}
      </p>
      <div style={{ display: "flex", gap: 6 }}>
        {["Gateway", "MCP", "Guardrails"].map((pill, i) => (
          <span key={pill} style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            padding: "4px 10px",
            borderRadius: 20,
            border: `1px solid ${i === 0 ? "rgba(34,211,238,0.35)" : TEMA.border}`,
            color: i === 0 ? TEMA.accent2 : TEMA.text3,
            background: i === 0 ? "rgba(34,211,238,0.08)" : "rgba(0,0,0,0.25)",
          }}>
            {pill}
          </span>
        ))}
      </div>
    </div>
  );
};

/** Pembuka bab — overlay 0–~2.5 detik di awal setiap scene */
export const PembukaBab: React.FC<{ indeksBab: number; durasi?: number }> = ({
  indeksBab,
  durasi = 78,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bab = ALUR_BAB[indeksBab];
  if (!bab) return null;

  const muncul = spring({
    frame: frame - 4,
    fps,
    config: { damping: 200, stiffness: 120 },
  });
  const opacity = interpolate(frame, [0, 8, durasi - 18, durasi], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(muncul, [0, 1], [0.92, 1]);

  if (frame > durasi) return null;

  return (
    <AbsoluteFill style={{
      justifyContent: "center",
      alignItems: "center",
      zIndex: 50,
      pointerEvents: "none",
      opacity,
    }}>
      <div style={{
        textAlign: "center",
        transform: `scale(${scale})`,
        fontFamily: FONT.sans,
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: bab.warna,
          marginBottom: 12,
        }}>
          Bab {bab.no} · {bab.judul}
        </div>
        <div style={{
          fontSize: 42,
          fontWeight: 700,
          color: TEMA.text,
          letterSpacing: "-0.02em",
        }}>
          {bab.sub}
        </div>
        <div style={{
          width: 80,
          height: 3,
          margin: "20px auto 0",
          borderRadius: 2,
          background: `linear-gradient(90deg, transparent, ${bab.warna}, transparent)`,
        }} />
      </div>
    </AbsoluteFill>
  );
};

/** Bar progres alur — seluruh durasi video */
export const BarAlur: React.FC = () => {
  const frame = useCurrentFrame();

  const indeksAktif =
    frame < SCENES.INTRO.start ? 0 :
    frame < SCENES.ARCHITECTURE.start ? 1 :
    frame < SCENES.PLATFORM_PROOF.start ? 2 :
    frame < SCENES.LIVE_DEMO.start ? 3 :
    frame < SCENES.METRICS.start ? 4 : 5;

  const progres = interpolate(
    frame,
    [0, SCENES.CLOSING.start + SCENES.CLOSING.duration],
    [0, 100],
    { extrapolateRight: "clamp" },
  );

  return (
    <div style={{
      position: "absolute",
      left: 48,
      right: 48,
      bottom: 28,
      zIndex: 40,
      fontFamily: FONT.sans,
      pointerEvents: "none",
    }}>
      <div style={{
        height: 2,
        background: TEMA.border,
        borderRadius: 1,
        marginBottom: 14,
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${progres}%`,
          background: `linear-gradient(90deg, ${TEMA.accent}, ${TEMA.accent2})`,
          boxShadow: `0 0 12px ${TEMA.glow}`,
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        {ALUR_BAB.map((bab, i) => {
          const aktif = i === indeksAktif;
          const selesai = i < indeksAktif;
          return (
            <div key={bab.no} style={{
              flex: 1,
              textAlign: "center",
              opacity: aktif ? 1 : selesai ? 0.55 : 0.28,
            }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: aktif ? bab.warna : TEMA.text3,
              }}>
                {bab.judul}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const LegendaNeural: React.FC = () => (
  <div style={{
    position: "absolute",
    left: 48,
    bottom: 72,
    display: "flex",
    gap: 14,
    padding: "8px 14px",
    borderRadius: 8,
    border: `1px solid ${TEMA.border}`,
    background: "rgba(9, 9, 11, 0.75)",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: TEMA.text3,
    fontFamily: FONT.sans,
    zIndex: 30,
  }}>
    {[
      { label: "Input", warna: "#71717a" },
      { label: "Hidden", warna: TEMA.accent },
      { label: "Output", warna: TEMA.accent2 },
    ].map((l) => (
      <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: l.warna,
          boxShadow: `0 0 8px ${l.warna}88`,
          display: "inline-block",
        }} />
        {l.label}
      </span>
    ))}
  </div>
);

export const FadeKeluarScene: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [durationInFrames - 22, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const LogoKecil: React.FC<{ ukuran?: number }> = ({ ukuran = 44 }) => (
  <div style={{
    width: ukuran,
    height: ukuran,
    padding: 5,
    borderRadius: 11,
    border: `1px solid ${TEMA.border2}`,
    background: "rgba(17, 17, 19, 0.85)",
    boxShadow: SOMBR.panel,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}>
    <Img src={staticFile("logo-header.png")} style={{ width: ukuran - 12, height: ukuran - 12 }} />
  </div>
);

export const KerangkaScene: React.FC<{
  children: React.ReactNode;
  indeksBab: number;
  tampilkanLegenda?: boolean;
}> = ({ children, indeksBab, tampilkanLegenda = true }) => (
  <FadeKeluarScene>
    <AbsoluteFill>
      <LatarNeural intensitas={indeksBab === 3 ? 1.2 : 0.9} />
      <AbsoluteFill style={{ zIndex: 2 }}>{children}</AbsoluteFill>
      {tampilkanLegenda && <LegendaNeural />}
      <PembukaBab indeksBab={indeksBab} />
    </AbsoluteFill>
  </FadeKeluarScene>
);
