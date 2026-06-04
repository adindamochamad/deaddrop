export const FPS = 30;

// ── Submission video: 3 min × 30fps = 5400 frames ──────────────────────────
export const DEMO_DURATION = 5400;

// Scene timings (frames @ 30fps)
export const SCENES = {
  HOOK:         { start: 0,    duration: 450  },  // 0:00–0:15
  INTRO:        { start: 450,  duration: 450  },  // 0:15–0:30
  ARCHITECTURE: { start: 900,  duration: 900  },  // 0:30–1:00
  DEMO_NORMAL:  { start: 1800, duration: 600  },  // 1:00–1:20
  DEMO_FAIL1:   { start: 2400, duration: 600  },  // 1:20–1:40
  DEMO_FAIL2:   { start: 3000, duration: 600  },  // 1:40–2:00
  DEMO_DONE:    { start: 3600, duration: 450  },  // 2:00–2:15
  METRICS:      { start: 4050, duration: 900  },  // 2:15–2:45
  CLOSING:      { start: 4950, duration: 450  },  // 2:45–3:00
} as const;

// ── Social video: 60 sec × 30fps = 1800 frames ─────────────────────────────
export const SOCIAL_DURATION = 1800;

// ── Brand colors — dark neon/glow palette ──────────────────────────────────
export const COLORS = {
  bg:       "#050505",
  surface:  "#0a0a0a",
  border:   "#1a1a2e",
  text:     "#e2e8f0",
  muted:    "#4a5568",
  blue:     "#00d4ff",
  cyan:     "#00ffcc",
  purple:   "#a855f7",
  green:    "#39ff14",
  amber:    "#ffb700",
  red:      "#ff4444",
} as const;

// text-shadow / box-shadow glow presets
export const GLOW = {
  blue:   "0 0 8px #00d4ff, 0 0 20px #00d4ff55, 0 0 40px #00d4ff22",
  cyan:   "0 0 8px #00ffcc, 0 0 20px #00ffcc55",
  green:  "0 0 8px #39ff14, 0 0 20px #39ff1455",
  purple: "0 0 8px #a855f7, 0 0 20px #a855f755",
  amber:  "0 0 8px #ffb700, 0 0 20px #ffb70055",
  red:    "0 0 8px #ff4444, 0 0 20px #ff444455",
} as const;
