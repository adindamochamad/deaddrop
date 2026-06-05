import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  Easing,
} from "remotion";
import { FONT, GRADIENT, TEMA } from "../theme";
import {
  BadgeHackathon,
  JudulGradient,
  KerangkaScene,
  LogoKecil,
  PanelKaca,
  StripHero,
} from "../ui-kit";

type Level = "info" | "warn" | "success" | "error";

interface LogBaris {
  frame: number;
  level: Level;
  msg: string;
}

const KONTEN_MULAI = 88;

const LOG_NORMAL: LogBaris[] = [
  { frame: 20, level: "info", msg: "Job a1b2c3d4 created — pending" },
  { frame: 55, level: "info", msg: "→ ANALYZING · Calling Claude Sonnet 4.6" },
  { frame: 120, level: "success", msg: "Analysis complete (847ms) · checkpoint saved" },
  { frame: 160, level: "info", msg: "→ GENERATING manifest" },
  { frame: 230, level: "success", msg: "Manifest valid · → DEPLOYING staging" },
  { frame: 310, level: "success", msg: "✅ Job DONE — 0 switches · 0 failures" },
];

const LOG_RATE: LogBaris[] = [
  { frame: 20, level: "warn", msg: "⚠ Claude Sonnet rate limited (429)" },
  { frame: 65, level: "warn", msg: "Circuit breaker OPEN — switching provider" },
  { frame: 110, level: "info", msg: "↩ Fallback → Mistral Large" },
  { frame: 180, level: "success", msg: "Recovered in 1.1s · checkpoint saved" },
  { frame: 250, level: "info", msg: "→ GENERATING · → VALIDATING · → DEPLOYING" },
  { frame: 340, level: "success", msg: "✅ Job DONE — 1 provider switch" },
];

const LOG_CHAOS: LogBaris[] = [
  { frame: 10, level: "error", msg: "[CHAOS] Outage + quarantine + bad YAML injected" },
  { frame: 35, level: "warn", msg: "⏳ Claude Sonnet rate limited → switching provider" },
  { frame: 70, level: "warn", msg: "⚡ Claude circuit breaker OPEN — skipping" },
  { frame: 105, level: "warn", msg: "✗ Claude provider unavailable → switching" },
  { frame: 140, level: "success", msg: "↩ Recovered via Mistral Large in 1100ms" },
  { frame: 175, level: "warn", msg: "Guardrail blocked: invalid YAML — rolling back to GENERATING" },
  { frame: 220, level: "warn", msg: "⚡ github_deploy quarantined → degrading to notifier" },
  { frame: 280, level: "info", msg: "→ VALIDATING · → DEPLOYING (notifier path)" },
  { frame: 360, level: "success", msg: "Resilience chain: 2 provider switch(es) | 1 tool failure(s) | 1 guardrail block(s)" },
  { frame: 420, level: "success", msg: "✅ Job DONE — audit counters updated" },
];

const FASE = [
  {
    mulai: KONTEN_MULAI,
    akhir: KONTEN_MULAI + 700,
    skenario: "normal",
    label: "A — Normal",
    log: LOG_NORMAL,
    metrik: { done: 1, switches: 0, tools: 0, gr: 0, recovery: "—" },
    warna: TEMA.green,
  },
  {
    mulai: KONTEN_MULAI + 700,
    akhir: KONTEN_MULAI + 1400,
    skenario: "rate_limit",
    label: "B — Rate Limit",
    log: LOG_RATE,
    metrik: { done: 2, switches: 1, tools: 0, gr: 0, recovery: "1.1s" },
    warna: TEMA.orange,
  },
  {
    mulai: KONTEN_MULAI + 1400,
    akhir: 2190,
    skenario: "full_chaos",
    label: "D — Full Chaos",
    log: LOG_CHAOS,
    metrik: { done: 3, switches: 2, tools: 1, gr: 1, recovery: "2.4s" },
    warna: TEMA.red,
  },
] as const;

const KLIK_FRAME = [
  KONTEN_MULAI + 45,
  KONTEN_MULAI + 745,
  KONTEN_MULAI + 1445,
];

const SKENARIO_KARTU = [
  { id: "normal", name: "A — Normal", desc: "Clean run", warna: TEMA.green, icon: "▶" },
  { id: "rate_limit", name: "B — Rate Limit", desc: "429 → Mistral", warna: TEMA.red, icon: "⏳" },
  { id: "slow", name: "B2 — Slow", desc: "Timeout switch", warna: TEMA.orange, icon: "⌛" },
  { id: "tool", name: "C — Tool", desc: "Notifier fallback", warna: TEMA.orange, icon: "🔧" },
  { id: "full_chaos", name: "D — Chaos", desc: "Cascading failures", warna: TEMA.red, icon: "💥" },
  { id: "reset", name: "Reset", desc: "Clear state", warna: TEMA.text3, icon: "↺" },
];

const Kursor: React.FC<{ x: number; y: number; klik: boolean }> = ({ x, y, klik }) => (
  <div style={{
    position: "absolute",
    left: x,
    top: y,
    width: 24,
    height: 24,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.95)",
    background: klik ? "rgba(139,92,246,0.55)" : "rgba(255,255,255,0.12)",
    boxShadow: klik ? `0 0 22px ${TEMA.glow}` : "0 0 6px rgba(0,0,0,0.4)",
    transform: klik ? "scale(0.88)" : "scale(1)",
    zIndex: 100,
  }} />
);

const warnaLevel = (level: Level) =>
  level === "success" ? TEMA.green :
  level === "warn" ? TEMA.orange :
  level === "error" ? TEMA.red : TEMA.text3;

export const LiveDashboardScene: React.FC = () => {
  const frame = useCurrentFrame();

  const faseAktif = FASE.find((f) => frame >= f.mulai && frame < f.akhir) ?? FASE[2];
  const frameRel = frame - faseAktif.mulai;

  const idxKlik = frame < FASE[1].mulai ? 0 : frame < FASE[2].mulai ? 1 : 2;
  const frameKlik = KLIK_FRAME[idxKlik];
  const sedangKlik = frame >= frameKlik && frame < frameKlik + 10;

  const targetKursor = [
    { x: 420, y: 780 },
    { x: 580, y: 780 },
    { x: 900, y: 780 },
  ][idxKlik];

  const kursorX = interpolate(
    frame,
    [frameKlik - 28, frameKlik],
    [targetKursor.x - 100, targetKursor.x],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );
  const kursorY = interpolate(
    frame,
    [frameKlik - 28, frameKlik],
    [targetKursor.y + 60, targetKursor.y],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );

  const logVisible = faseAktif.log.filter((l) => frameRel >= l.frame).slice(-7);
  const kontenOp = interpolate(frame, [KONTEN_MULAI, KONTEN_MULAI + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const metrikItems = [
    { label: "Jobs Done", val: faseAktif.metrik.done, kelas: TEMA.green },
    { label: "Prov. Switches", val: faseAktif.metrik.switches, kelas: TEMA.orange },
    { label: "Tool Failures", val: faseAktif.metrik.tools, kelas: TEMA.orange },
    { label: "Guardrails", val: faseAktif.metrik.gr, kelas: TEMA.red },
    { label: "Recovery", val: faseAktif.metrik.recovery, kelas: TEMA.purple, teks: true },
  ];

  return (
    <KerangkaScene indeksBab={4}>
      <AbsoluteFill style={{
        padding: "72px 80px 120px",
        fontFamily: FONT.sans,
        opacity: kontenOp,
      }}>
        {/* Header — mirip dashboard */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: 18,
          borderBottom: `1px solid ${TEMA.border}`,
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <LogoKecil />
            <div>
              <JudulGradient size={22}>DeadDrop</JudulGradient>
              <p style={{ color: TEMA.text3, fontSize: 12, marginTop: 2 }}>
                Infrastructure dies. Your agent doesn&apos;t.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <BadgeHackathon />
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: TEMA.greenBg,
              border: `1px solid ${TEMA.greenBdr}`,
              color: TEMA.green,
              borderRadius: 20,
              padding: "4px 12px",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: TEMA.green,
                boxShadow: `0 0 8px ${TEMA.green}`,
              }} />
              Live
            </div>
          </div>
        </div>

        <StripHero
          frameMulai={KONTEN_MULAI + 5}
          teks={
            <>
              Klik skenario di bawah — log <em style={{ fontStyle: "normal", color: TEMA.text, fontWeight: 600 }}>Agent Live Log</em> dan metrics berubah seperti demo live.
            </>
          }
        />

        {/* Metrics grid — 5 kolom seperti dashboard */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 10,
          marginTop: 16,
        }}>
          {metrikItems.map((m) => (
            <div key={m.label} style={{
              background: "rgba(17, 17, 19, 0.72)",
              backdropFilter: "blur(14px)",
              border: `1px solid ${TEMA.border}`,
              borderRadius: 10,
              padding: "12px 14px",
              borderLeft: `3px solid ${m.kelas}`,
            }}>
              <div style={{ fontSize: 9, color: TEMA.text3, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {m.label}
              </div>
              <div style={{
                fontFamily: FONT.mono,
                fontSize: m.teks ? 20 : 28,
                fontWeight: 800,
                color: m.kelas,
                marginTop: 6,
              }}>
                {m.val}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 12, marginTop: 14, flex: 1 }}>
          <PanelKaca borderAccent={
            faseAktif.skenario === "full_chaos" && frameRel > 150
              ? TEMA.redBdr
              : sedangKlik ? "rgba(139,92,246,0.4)" : TEMA.border
          } style={{
            padding: 16,
            minHeight: 280,
            boxShadow:
              faseAktif.skenario === "full_chaos" && frameRel > 150
                ? `0 0 40px ${TEMA.red}33`
                : sedangKlik ? `0 0 32px ${TEMA.glow}` : undefined,
          }}>
            <div style={{ fontSize: 10, color: TEMA.text3, letterSpacing: "0.1em", marginBottom: 12 }}>
              AGENT LIVE LOG · SSE
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 11, lineHeight: 1.75 }}>
              {logVisible.map((l, i) => (
                <div key={`${l.frame}-${i}`} style={{
                  opacity: Math.min(1, (frameRel - l.frame) / 8),
                  color: warnaLevel(l.level),
                }}>
                  <span style={{ color: TEMA.text3, marginRight: 8 }}>
                    {l.level.toUpperCase().padEnd(7)}
                  </span>
                  {l.msg}
                </div>
              ))}
            </div>
          </PanelKaca>

          <PanelKaca style={{ padding: 14, fontSize: 11, color: TEMA.text3 }}>
            <div style={{ color: TEMA.text, fontWeight: 600, marginBottom: 10 }}>Neural trace</div>
            <div style={{ color: TEMA.accent }}>◎ Input → Hidden → Output</div>
            <div style={{ marginTop: 14, color: TEMA.accent2 }}>TrueFoundry AI Gateway</div>
            <div style={{ marginTop: 6 }}>MCP · Guardrails</div>
          </PanelKaca>
        </div>

        {/* Scenario cards — sc-card style */}
        <PanelKaca style={{ marginTop: 14, padding: "14px 16px" }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
            fontSize: 11,
            color: TEMA.text3,
          }}>
            <span style={{ color: TEMA.text, fontWeight: 600 }}>Demo Scenarios</span>
            <span>Resilient Agents Hackathon</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
            {SKENARIO_KARTU.map((sc) => {
              const highlight = sc.id === faseAktif.skenario;
              const pulse = highlight ? 0.85 + Math.sin(frame * 0.18) * 0.15 : 1;
              return (
                <div key={sc.id} style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  padding: "10px 10px",
                  borderRadius: 8,
                  border: `1px solid ${highlight ? sc.warna : TEMA.border}`,
                  background: highlight ? `${sc.warna}12` : TEMA.surface2,
                  opacity: pulse,
                  boxShadow: highlight ? `0 0 18px ${sc.warna}35` : "none",
                }}>
                  <span style={{ fontSize: 14 }}>{sc.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: highlight ? sc.warna : TEMA.text }}>
                    {sc.name}
                  </span>
                  <span style={{ fontSize: 9, color: TEMA.text3 }}>{sc.desc}</span>
                </div>
              );
            })}
          </div>
        </PanelKaca>

        <div style={{
          position: "absolute",
          top: 100,
          right: 100,
          padding: "8px 16px",
          borderRadius: 8,
          background: "rgba(9,9,11,0.85)",
          border: `1px solid ${TEMA.accent2}44`,
          color: TEMA.accent2,
          fontSize: 13,
          fontWeight: 700,
          zIndex: 20,
        }}>
          Running: {faseAktif.label}
        </div>

        <Kursor x={kursorX} y={kursorY} klik={sedangKlik} />
      </AbsoluteFill>
    </KerangkaScene>
  );
};
