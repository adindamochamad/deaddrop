export const FPS = 30;

// ── Submission video: 3 min × 30fps = 5400 frames ──────────────────────────
export const DEMO_DURATION = 5400;

// Scene timings (in frames @ 30fps)
export const SCENES = {
  HOOK:         { start: 0,    duration: 450  },  // 0:00–0:15
  INTRO:        { start: 450,  duration: 450  },  // 0:15–0:30
  ARCHITECTURE: { start: 900,  duration: 900  },  // 0:30–1:00
  DEMO_NORMAL:  { start: 1800, duration: 600  },  // 1:00–1:20
  DEMO_FAIL1:   { start: 2400, duration: 600  },  // 1:20–1:40  rate limit → Mistral
  DEMO_FAIL2:   { start: 3000, duration: 600  },  // 1:40–2:00  tool timeout
  DEMO_DONE:    { start: 3600, duration: 450  },  // 2:00–2:15  job DONE
  METRICS:      { start: 4050, duration: 900  },  // 2:15–2:45
  CLOSING:      { start: 4950, duration: 450  },  // 2:45–3:00
} as const;

// ── Social video: 60 sec × 30fps = 1800 frames ─────────────────────────────
export const SOCIAL_DURATION = 1800;

// Brand colors (match dashboard)
export const COLORS = {
  bg:      "#0d1117",
  surface: "#161b22",
  border:  "#30363d",
  text:    "#e6edf3",
  muted:   "#8b949e",
  blue:    "#58a6ff",
  green:   "#3fb950",
  orange:  "#f0883e",
  red:     "#f85149",
};
