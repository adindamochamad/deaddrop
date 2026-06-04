import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../constants";

// ── Log line definitions ────────────────────────────────────────────────────

type Level = "info" | "warn" | "error" | "success" | "chaos";

interface Line {
  frame: number; // relative to sub-scene start
  level: Level;
  msg: string;
}

const COLOR: Record<Level, string> = {
  info:    "#4a5568",
  warn:    COLORS.amber,
  error:   COLORS.red,
  success: COLORS.green,
  chaos:   COLORS.purple,
};

const TAG: Record<Level, string> = {
  info:    "INFO   ",
  warn:    "WARN   ",
  error:   "ERROR  ",
  success: "OK     ",
  chaos:   "CHAOS  ",
};

// Sub-scene A — Normal deployment (frames 0–599)
const LINES_A: Line[] = [
  { frame: 15,  level: "info",    msg: "Job created: a1b2c3d4 — queued for processing" },
  { frame: 48,  level: "info",    msg: "Agent picked up job a1b2c3d4 (state=pending)" },
  { frame: 75,  level: "info",    msg: "→ ANALYZING" },
  { frame: 105, level: "info",    msg: "Calling LLM (analyze)..." },
  { frame: 155, level: "info",    msg: "🤖 Claude Sonnet responded (847ms, 312 tokens)" },
  { frame: 192, level: "info",    msg: "Analysis done (847ms) — checkpoint saved 💾" },
  { frame: 222, level: "info",    msg: "→ GENERATING" },
  { frame: 255, level: "info",    msg: "Calling LLM (generate manifest)..." },
  { frame: 310, level: "info",    msg: "🤖 Claude Sonnet responded (1204ms, 891 tokens)" },
  { frame: 350, level: "info",    msg: "Manifest generated (1204ms) — checkpoint saved 💾" },
  { frame: 378, level: "info",    msg: "→ VALIDATING" },
  { frame: 415, level: "success", msg: "Manifest is valid YAML ✓" },
  { frame: 440, level: "info",    msg: "→ DEPLOYING  →  Deploying to staging..." },
  { frame: 510, level: "success", msg: "Deployed commit abc1234 → staging (312ms) ✓" },
  { frame: 555, level: "success", msg: "✅ Job a1b2c3d4 — DONE" },
];

// Sub-scene B — Provider outage + fallback (frames 0–599 relative)
const LINES_B: Line[] = [
  { frame: 12,  level: "info",    msg: "Job created: e5f6g7h8 — queued" },
  { frame: 42,  level: "info",    msg: "→ ANALYZING" },
  { frame: 68,  level: "warn",    msg: "✗ Claude Sonnet provider UNAVAILABLE → switching" },
  { frame: 110, level: "warn",    msg: "⚡ Claude Sonnet circuit breaker OPEN — skipping" },
  { frame: 148, level: "info",    msg: "Trying Mistral Large..." },
  { frame: 205, level: "success", msg: "↩ Recovered via Mistral Large in 1102ms" },
  { frame: 248, level: "info",    msg: "Analysis done — checkpoint saved 💾" },
  { frame: 278, level: "info",    msg: "→ GENERATING" },
  { frame: 308, level: "warn",    msg: "⚡ Claude Sonnet circuit breaker OPEN — skipping" },
  { frame: 350, level: "info",    msg: "🤖 Mistral Large responded (989ms, 743 tokens)" },
  { frame: 390, level: "info",    msg: "Manifest generated — checkpoint saved 💾" },
  { frame: 415, level: "success", msg: "Manifest is valid YAML ✓" },
  { frame: 440, level: "info",    msg: "→ DEPLOYING  →  Deploying to staging..." },
  { frame: 490, level: "success", msg: "Deployed commit def5678 → staging ✓" },
  { frame: 528, level: "success", msg: "Resilience: 2 provider switches | recovered in 1.1s" },
  { frame: 565, level: "success", msg: "✅ Job e5f6g7h8 — DONE" },
];

// Sub-scene C — Full chaos: outage + quarantine + bad output (frames 0–599 relative)
const LINES_C: Line[] = [
  { frame: 10,  level: "info",    msg: "Job created: i9j0k1l2 — queued" },
  { frame: 35,  level: "chaos",   msg: "[CHAOS] Provider outage + quarantine + bad output ACTIVE" },
  { frame: 65,  level: "info",    msg: "→ ANALYZING" },
  { frame: 92,  level: "warn",    msg: "✗ Claude Sonnet provider UNAVAILABLE → switching" },
  { frame: 135, level: "success", msg: "↩ Recovered via Mistral Large (1058ms)" },
  { frame: 168, level: "info",    msg: "→ GENERATING" },
  { frame: 198, level: "warn",    msg: "⚡ Claude Sonnet circuit breaker OPEN — skipping" },
  { frame: 232, level: "chaos",   msg: "[Chaos] Injecting invalid YAML on manifest generation" },
  { frame: 268, level: "info",    msg: "→ VALIDATING" },
  { frame: 302, level: "warn",    msg: "Guardrail blocked: invalid YAML/JSON content" },
  { frame: 335, level: "warn",    msg: "↩ Rolling back to GENERATING (attempt 1/3)" },
  { frame: 365, level: "info",    msg: "→ GENERATING (retry)" },
  { frame: 408, level: "info",    msg: "🤖 Mistral Large — valid manifest generated ✓" },
  { frame: 442, level: "info",    msg: "→ DEPLOYING" },
  { frame: 468, level: "warn",    msg: "⚡ github_deploy quarantined → degrading to notifier" },
  { frame: 505, level: "success", msg: "Resilience: 2 switches | 1 tool failure | 1 guardrail block" },
  { frame: 548, level: "success", msg: "✅ Job i9j0k1l2 — DONE" },
];

// ── Sub-component: streaming log ───────────────────────────────────────────

const LogLines: React.FC<{ lines: Line[]; baseFrame: number }> = ({
  lines,
  baseFrame,
}) => {
  const frame = useCurrentFrame();
  const rel = frame - baseFrame;

  const visible = lines.filter((l) => rel >= l.frame).slice(-13);

  return (
    <div style={{
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: 15,
      lineHeight: "1.72",
    }}>
      {visible.map((line, i) => {
        const age = rel - line.frame;
        const opacity = Math.min(1, age / 4);
        const c = COLOR[line.level];
        const flashGlow = age < 10 ? `0 0 8px ${c}` : "none";

        return (
          <div key={`${line.frame}-${i}`} style={{ opacity, display: "flex", gap: 0 }}>
            <span style={{ color: "#2a3245", minWidth: 52, fontSize: 12 }}>
              {(line.frame / 30).toFixed(1)}s{"  "}
            </span>
            <span style={{ color: c, minWidth: 80, fontSize: 12, textShadow: flashGlow }}>
              {TAG[line.level]}
            </span>
            <span style={{
              color:
                line.level === "success" ? COLORS.green  :
                line.level === "chaos"   ? COLORS.purple :
                line.level === "warn"    ? COLORS.amber  :
                line.level === "error"   ? COLORS.red    :
                COLORS.text,
              textShadow: age < 10 ? flashGlow : "none",
            }}>
              {line.msg}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ── DONE state display ─────────────────────────────────────────────────────

const DoneDisplay: React.FC = () => {
  const frame = useCurrentFrame();
  const fade  = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, 28], [0.78, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      textAlign: "center",
      padding: "50px 20px",
      opacity: fade,
      transform: `scale(${scale})`,
    }}>
      <div style={{
        fontSize: 88,
        color: COLORS.green,
        textShadow: `0 0 20px ${COLORS.green}, 0 0 50px ${COLORS.green}66`,
        lineHeight: 1,
        marginBottom: 20,
      }}>
        ✓
      </div>
      <div style={{
        color: COLORS.green,
        fontSize: 38,
        fontWeight: 900,
        letterSpacing: "-1px",
        fontFamily: "system-ui, sans-serif",
        textShadow: `0 0 12px ${COLORS.green}88`,
      }}>
        All Jobs: DONE
      </div>
      <div style={{
        color: COLORS.muted,
        fontSize: 20,
        marginTop: 14,
        fontFamily: "system-ui, sans-serif",
      }}>
        3 simultaneous failures&nbsp;&nbsp;·&nbsp;&nbsp;0 manual interventions
      </div>
    </div>
  );
};

// ── Main DemoScene ─────────────────────────────────────────────────────────

// Frame ranges within DemoScene (sequence starts at SCENES.DEMO_NORMAL.start)
// Frame 0–599    → Sub-scene A (normal)
// Frame 600–1199 → Sub-scene B (provider outage)
// Frame 1200–1799→ Sub-scene C (full chaos)
// Frame 1800–2249→ DONE state

export const DemoScene: React.FC = () => {
  const frame = useCurrentFrame();

  const subScene =
    frame < 600  ? "A"    :
    frame < 1200 ? "B"    :
    frame < 1800 ? "C"    : "DONE";

  const META: Record<string, { label: string; color: string; desc: string }> = {
    A:    { label: "Normal Deployment",            color: COLORS.green,  desc: "All providers healthy — no chaos" },
    B:    { label: "Provider Outage → Fallback",   color: COLORS.amber,  desc: "Claude Sonnet down · Mistral takes over automatically" },
    C:    { label: "Full Chaos Mode",              color: COLORS.red,    desc: "Outage + tool quarantine + bad YAML output — all at once" },
    DONE: { label: "All Jobs Complete",            color: COLORS.green,  desc: "3 failures · 0 manual intervention" },
  };

  const meta = META[subScene];

  // Subtle label pulse
  const pulse = 0.82 + Math.sin(frame * 0.09) * 0.18;

  return (
    <AbsoluteFill style={{ background: COLORS.bg, padding: "36px 48px", flexDirection: "column" }}>
      {/* Dot grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, #ffffff06 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }} />

      {/* Sub-scene label bar */}
      <div style={{
        borderLeft: `3px solid ${meta.color}`,
        paddingLeft: 18,
        marginBottom: 22,
        opacity: pulse,
        zIndex: 1,
        flexShrink: 0,
      }}>
        <div style={{
          color: meta.color,
          fontSize: 22,
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
          textShadow: `0 0 8px ${meta.color}88`,
        }}>
          {meta.label}
        </div>
        <div style={{
          color: COLORS.muted,
          fontSize: 14,
          marginTop: 4,
          fontFamily: "system-ui, sans-serif",
        }}>
          {meta.desc}
        </div>
      </div>

      {/* Terminal pane */}
      <div style={{
        background: COLORS.surface,
        border: `1px solid ${meta.color}28`,
        borderRadius: 10,
        padding: "22px 28px",
        flex: 1,
        overflow: "hidden",
        boxShadow: `0 0 24px ${meta.color}0e`,
        zIndex: 1,
      }}>
        {subScene === "A"    && <LogLines lines={LINES_A} baseFrame={0}    />}
        {subScene === "B"    && <LogLines lines={LINES_B} baseFrame={600}  />}
        {subScene === "C"    && <LogLines lines={LINES_C} baseFrame={1200} />}
        {subScene === "DONE" && <DoneDisplay />}
      </div>
    </AbsoluteFill>
  );
};
