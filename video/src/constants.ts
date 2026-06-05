import { TEMA } from "./theme";

export const FPS = 30;

// Submission video: 3 min = 5400 frames @ 30fps
export const DEMO_DURATION = 5400;

export const SCENES = {
  HOOK:           { start: 0,    duration: 540  },  // 0:00–0:18  Problem
  INTRO:          { start: 540,  duration: 420  },  // 0:18–0:32  Solution
  ARCHITECTURE:   { start: 960,  duration: 660  },  // 0:32–0:54  Four layers
  PLATFORM_PROOF: { start: 1620, duration: 450  },  // 0:54–1:09  TrueFoundry / audit trail
  LIVE_DEMO:      { start: 2070, duration: 2190 },  // 1:09–2:07  Live dashboard (peak chaos ~1:55)
  METRICS:        { start: 4260, duration: 600  },  // 2:07–2:27  Proof counters
  CLOSING:        { start: 4860, duration: 540  },  // 2:27–3:00  CTA
} as const;

export const SOCIAL_DURATION = 1800;

/** B-roll clips for splicing with real screen recording */
export const BROLL_INTRO_DURATION = 600;     // 20s — DeadDrop intro + 4 layers
export const BROLL_PIPELINE_DURATION = 660;  // 22s — Gateway → SM → MCP → Guardrails
export const BROLL_CLOSING_DURATION = 660;   // 22s — Tagline + URL + DeadDrop

/** Alias kompatibel — nilai = dashboard :root */
export const COLORS = {
  bg:       TEMA.bg,
  surface:  TEMA.surface,
  surface2: TEMA.surface2,
  border:   TEMA.border,
  text:     TEMA.text,
  muted:    TEMA.text3,
  text2:    TEMA.text2,
  blue:     TEMA.blue,
  cyan:     TEMA.accent2,
  purple:   TEMA.purple,
  accent:   TEMA.accent,
  green:    TEMA.green,
  amber:    TEMA.orange,
  red:      TEMA.red,
} as const;

export const GLOW = {
  blue:   "0 0 12px #3b82f680, 0 0 32px #3b82f630",
  cyan:   "0 0 12px #22d3ee80",
  green:  "0 0 12px #22c55e80, 0 0 28px #22c55e40",
  purple: "0 0 12px #a855f780",
  amber:  "0 0 12px #f9731680",
  red:    "0 0 12px #ef444480",
} as const;
