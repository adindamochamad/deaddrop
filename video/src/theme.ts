/** Token visual — sinkron dengan api/dashboard.html (:root) */
export const TEMA = {
  bg: "#09090b",
  surface: "#111113",
  surface2: "#18181b",
  border: "#27272a",
  border2: "#3f3f46",
  text: "#fafafa",
  text2: "#a1a1aa",
  text3: "#71717a",

  green: "#22c55e",
  greenBg: "rgba(34,197,94,0.07)",
  greenBdr: "rgba(34,197,94,0.22)",

  red: "#ef4444",
  redBg: "rgba(239,68,68,0.07)",
  redBdr: "rgba(239,68,68,0.22)",

  orange: "#f97316",
  orangeBg: "rgba(249,115,22,0.07)",
  orangeBdr: "rgba(249,115,22,0.22)",

  blue: "#3b82f6",
  blueBg: "rgba(59,130,246,0.07)",
  blueBdr: "rgba(59,130,246,0.22)",

  purple: "#a855f7",
  purpleBg: "rgba(168,85,247,0.07)",
  purpleBdr: "rgba(168,85,247,0.22)",

  accent: "#8b5cf6",
  accent2: "#22d3ee",
  glow: "rgba(139, 92, 246, 0.35)",
  bgNeural: "#07060c",
} as const;

export const FONT = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', 'Courier New', monospace",
} as const;

export const GRADIENT = {
  judul: "linear-gradient(120deg, #fafafa 0%, #c4b5fd 45%, #67e8f9 100%)",
  hero: "linear-gradient(90deg, rgba(139,92,246,0.08) 0%, rgba(17,17,19,0.55) 40%, rgba(34,211,238,0.06) 100%)",
  badge: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(34,211,238,0.08))",
  vignette: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(139,92,246,0.12), transparent 65%)",
} as const;

export const SOMBR = {
  panel: "0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.45)",
  accent: `0 0 24px ${TEMA.glow}, 0 8px 32px rgba(0,0,0,0.5)`,
  hijau: "0 0 12px rgba(34,197,94,0.5), 0 0 28px rgba(34,197,94,0.25)",
} as const;

/** 6-act story arc for judges */
export const ALUR_BAB = [
  { no: 1, judul: "Problem", sub: "2 AM deploy failure", warna: TEMA.red },
  { no: 2, judul: "Solution", sub: "DeadDrop — your agent survives", warna: TEMA.accent },
  { no: 3, judul: "Architecture", sub: "Four resilience layers", warna: TEMA.accent2 },
  { no: 4, judul: "Platform proof", sub: "TrueFoundry + audit logs", warna: TEMA.blue },
  { no: 5, judul: "Live demo", sub: "A → B → Full Chaos", warna: TEMA.green },
  { no: 6, judul: "Evidence", sub: "Metrics & closing", warna: TEMA.purple },
] as const;
