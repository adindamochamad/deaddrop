# DeadDrop — Video Script (3 Minutes)
## Format: Screen recording + Gamma.app slides + ElevenLabs voiceover

> **Before recording checklist:**
> - `curl https://deaddrop.adindamochamad.com/health` → status OK
> - Open dashboard in Chrome, full screen, zoom 110%
> - Have scenario buttons visible
> - Run Scenario A once as warmup (don't record this)
> - Clear all jobs, reset chaos before recording starts

---

## FULL VOICEOVER SCRIPT (copy-paste ke ElevenLabs)

*Gunakan voice: Rachel atau Adam (ElevenLabs) — pace: medium-slow, confident*
*Total kata: ~400 — cocok untuk 3 menit*

---

### [SEGMENT 1 — HOOK] 0:00–0:18
**SCREEN: Teks animasi / Gamma.app slide — gelap dengan error terminal**

> It's 2 AM. Your deployment deadline is in 30 minutes.
> The agent calls Claude on AWS Bedrock.
> Bedrock throttles. You get a 429 error. The agent crashes.
> Deployment stops. You wake up an engineer. Five hours lost.
>
> This is the single point of failure every LLM-powered pipeline has.
> And this is exactly the problem DeadDrop solves.

---

### [SEGMENT 2 — SOLUTION INTRO] 0:18–0:35
**SCREEN: Gamma slide — "DeadDrop" + logo + 4-layer diagram**

> DeadDrop is a deployment agent built around one idea:
> infrastructure failures are expected — not exceptions.
>
> It has four resilience layers working together.
> First: the TrueFoundry AI Gateway routes between three LLM providers automatically.
> Second: a State Machine with MySQL checkpoints so the agent resumes after a crash.
> Third: an MCP Gateway that monitors tool health and degrades gracefully.
> Fourth: Guardrails that catch bad LLM output before it reaches your infrastructure.

---

### [SEGMENT 3 — PLATFORM PROOF] 0:35–0:54
**SCREEN: Gamma slide — TrueFoundry setup + provider chain diagram**

> Here's the real infrastructure behind it.
> The AI Gateway runs on TrueFoundry — three providers on AWS Bedrock:
> Claude Sonnet 4.6 as primary, Mistral Large as fallback, Llama 3.1 as the last resort.
> Each provider has its own independent circuit breaker.
>
> Three MCP tools are live on the TrueFoundry gateway:
> a deploy tool, a validator, and a notifier — with scoped permissions and Bearer auth.
>
> Every LLM call goes through TrueFoundry Guardrails:
> secrets are redacted, prompt injection is blocked, and bad output triggers a rollback.
> Not just animation — every event writes an audit row in the database.

---

### [SEGMENT 4 — LIVE DEMO INTRO] 0:54–1:05
**SCREEN: Switch to live dashboard at deaddrop.adindamochamad.com**

> Let me show you this live.
> This is the DeadDrop dashboard — running at deaddrop.adindamochamad.com.
> We have three scenario buttons here. Each one injects real failures
> through the same code path production would hit.

---

### [SEGMENT 5 — DEMO: SCENARIO A] 1:05–1:22
**SCREEN: Click "A — Normal" button, watch job run**
> *(klik tombol A, biarkan job jalan sampai DONE)*

> I'll start with a clean run — Scenario A.
> Watch the job flow through each state: Pending, Analyzing, Generating, Validating, Deploying, Done.
> The live log shows every step. No failures, no intervention.
> This is the baseline — 100% clean run in about 10 seconds.

---

### [SEGMENT 6 — DEMO: SCENARIO B — RATE LIMIT] 1:22–1:45
**SCREEN: Click "B — Rate Limit" button, watch logs**
> *(klik tombol B, tunjukkan log "WARN: Claude 429", lalu "INFO: Switched to Mistral")*

> Now let's break it. Scenario B injects a 429 rate limit on Claude.
> Watch the log — Claude returns a 429, the circuit breaker opens immediately.
> The gateway automatically switches to Mistral Large — the agent never pauses.
> At the bottom you'll see: provider switches counter goes from zero to one.
> Recovery time: under 2 seconds. The job still finishes as Done.
> The engineer stays asleep.

---

### [SEGMENT 7 — DEMO: SCENARIO D — FULL CHAOS] 1:45–2:18
**SCREEN: Click "D — Full Chaos", watch cascading failures**
> *(klik D, tunjukkan WARNING + ERROR logs, guardrail block, tool fallback, akhirnya DONE)*

> This is the real test. Scenario D — Full Chaos.
> Three failures injected simultaneously: a provider outage, a quarantined deploy tool, and the LLM returning invalid YAML.
>
> Watch the log: first a provider switch from Claude to Mistral.
> Then the deploy tool is unavailable — the MCP Gateway degrades to the notifier tool automatically.
> Then the guardrail catches the bad YAML output — agent rolls back to Generating, regenerates.
>
> Three different failure modes. All handled independently. The job still finishes as Done.
>
> And at the bottom: the Resilience Chain summary.
> Two provider switches. One tool failure handled. One guardrail block.
> Recovered in 11 seconds.
>
> This isn't a simulation of resilience — this is the actual recovery path.

---

### [SEGMENT 8 — METRICS PROOF] 2:18–2:38
**SCREEN: Scroll ke bagian metrics cards di dashboard**

> The dashboard shows live aggregate metrics from all jobs.
> Provider switches — how many times the gateway rerouted.
> Tool failures handled — without those, this would be a FAILED job.
> Guardrails blocked — evidence of real catches, not decorative policy.
> Average recovery time — the SRE audit number that matters.
>
> Without DeadDrop: one 429 means a failed job and a woken engineer.
> With DeadDrop: the same 429 is a two-second reroute, logged in the audit trail.

---

### [SEGMENT 9 — CLOSING] 2:38–3:00
**SCREEN: Gamma slide — URL + GitHub + tagline**

> DeadDrop is live right now.
> Try the health check at deaddrop.adindamochamad.com/health.
> Run the Full Chaos scenario yourself — it resets cleanly every time.
> The source is on GitHub at github.com/adindamochamad/deaddrop.
>
> Infrastructure dies.
> Your agent doesn't.

---
---

## SCREEN RECORDING SHOT LIST
*(Gunakan OBS / QuickTime, 1920×1080, 30fps)*

| Waktu | Yang harus ada di layar | Aksi |
|-------|------------------------|------|
| 0:00–0:18 | Gamma.app slide — terminal error animasi | Biarkan slide jalan |
| 0:18–0:35 | Gamma.app slide — logo + 4 layers | Biarkan slide jalan |
| 0:35–0:54 | Gamma.app slide — TrueFoundry diagram | Biarkan slide jalan |
| 0:54–1:05 | Browser: dashboard.html (full screen) | Scroll ke atas, tunjukkan hero strip |
| 1:05–1:22 | Browser: klik tombol **A — Normal** | Tunggu DONE, tunjukkan log stream |
| 1:22–1:45 | Browser: klik tombol **B — Rate Limit** | Sorot log "WARN: 429", "Switched to Mistral", counter +1 |
| 1:45–2:18 | Browser: klik tombol **D — Full Chaos** | Sorot: WARNING merah, guardrail BLOCK, tool fallback, akhirnya "DONE" + resilience summary |
| 2:18–2:38 | Browser: scroll ke metrics cards | Zoom sedikit ke counter cards |
| 2:38–3:00 | Gamma.app slide — URL + tagline | Tunjukkan URL, akhiri dengan tagline |

---

## GAMMA.APP — PROMPT LENGKAP
*(Paste seluruh teks ini ke Gamma.app → "Create presentation" → pilih "Presentation" → paste)*

```
Create a 4-slide dark tech presentation for a hackathon demo video called "DeadDrop".

Theme: dark background (#07060c), accent colors purple (#8b5cf6) and cyan (#22d3ee), white text (#fafafa), monospace font for code, Inter for body text. Minimalist, no clipart, no stock icons beyond simple shapes.

---

Slide 1 — "The Problem" (shown 0:00–0:18)

Title: none (no title header)
Background: near-black (#07060c) with subtle purple radial glow center-left

Main content (center of slide, large):
Line 1 (small caps, gray, 14px): 2:00 AM — DEPLOYMENT DEADLINE IN 30 MINUTES
[visual gap]
Code block styled terminal (monospace, red text on dark gray bg, rounded corners):
  ERROR: ThrottlingException — Rate limit exceeded (429)
  Provider: aws-bedrock/claude-sonnet-4-6
  Agent process: CRASHED
  Deployment: STOPPED
  Recovery: MANUAL — 5 hours lost
[visual gap]
Bottom line (white, 28px, bold, centered):
  "This is the single point of failure every LLM pipeline has."

No footer. No logo yet.

---

Slide 2 — "The Solution" (shown 0:18–0:35)

Top-left corner: small white square logo placeholder labeled "DeadDrop" (16px)

Title (center, gradient purple→cyan, 52px, bold monospace): DeadDrop
Subtitle (center, italic gray, 18px): "Infrastructure dies. Your agent doesn't."

Below: 2×2 grid of cards (dark surface #111113, 1px purple border, 10px radius, padding 20px):
  Card 1 — purple left-border:
    ⚡ AI Gateway
    Claude → Mistral → Llama · circuit breakers
  Card 2 — blue left-border (#3b82f6):
    ◎ State Machine
    MySQL checkpoints · crash-safe resume
  Card 3 — cyan left-border:
    ⚙ MCP Gateway
    Tool health · graceful degradation
  Card 4 — orange left-border (#f97316):
    🛡 Guardrails
    Redact · validate · rollback

No footer.

---

Slide 3 — "Platform Proof" (shown 0:35–0:54)

Title (small, gray, uppercase, letterSpacing wide): BUILT ON TRUEFOUNDRY × AWS BEDROCK

Two columns layout:

LEFT COLUMN — "AI Gateway":
  Header (cyan, bold, 13px): TrueFoundry AI Gateway
  Content (monospace, 12px, white):
    ① Claude Sonnet 4.6   ← primary
       ↓ 429 or timeout?
    ② Mistral Large       ← fallback
       ↓ outage?
    ③ Llama 3.1 70B       ← last resort
  
  Below (gray, 11px): Each provider: independent circuit breaker
  Below (small tag, green bg): Every call → audit row in provider_log

RIGHT COLUMN — "MCP + Guardrails":
  Header (purple, bold, 13px): MCP Gateway — 3 tools live
  Content (monospace, 12px, white):
    • github_deploy  (Bearer auth)
    • validator      (YAML check)
    • notifier       (fallback target)

  Header below (orange, bold, 13px): TrueFoundry Guardrails
  Content (12px, white):
    • secrets-detection  → MUTATE
    • prompt-injection   → VALIDATE
    • pii-phi-detection  → MUTATE

Bottom strip across full width (dark purple bg, 1px purple border):
  "Not animation — every failure writes an audit row in MySQL"

---

Slide 4 — "Closing CTA" (shown 2:38–3:00)

Background: dark (#07060c) with strong cyan+purple radial glow center

Center layout, all items centered:
  [Logo placeholder square, 72px]
  
  Title (gradient purple→cyan, 72px, bold monospace): DeadDrop
  
  [gap]
  
  Label (gray, small caps, 11px, letter-spaced): LIVE DEMO
  URL (green #22c55e, monospace, 28px, bold, subtle green glow):
    deaddrop.adindamochamad.com
  
  Secondary URL (gray, monospace, 13px):
    /health  ·  github.com/adindamochamad/deaddrop
  
  [gap]
  
  Tag (purple border, rounded, 11px uppercase): Resilient Agents · TrueFoundry × AWS Bedrock
  
  [large gap]
  
  Final line (white, 32px, bold, centered):
    Infrastructure dies.
  Next line (gradient purple→cyan, 32px, bold):
    Your agent doesn't.
```

---

## GAMMA.APP SLIDE STRUCTURE
*(Buat di Gamma.app, export sebagai video atau pakai sebagai overlay)*

### Slide 1 — Hook (0:00–0:18)
**Background:** hitam gelap
**Layout:** teks besar di tengah
```
2:00 AM

[terminal error merah]
ERROR: Rate limit exceeded (429)
Agent crashed. Deployment stopped.

The single point of failure
every LLM pipeline has.
```

### Slide 2 — Solution (0:18–0:35)
**Background:** dark purple gradient
**Layout:** logo kiri + 4 boxes
```
DeadDrop
"Infrastructure dies. Your agent doesn't."

[Box 1] ⚡ AI Gateway — Claude → Mistral → Llama
[Box 2] ◎ State Machine — checkpoints + crash recovery
[Box 3] ⚙ MCP Gateway — tool health + graceful degradation
[Box 4] 🛡 Guardrails — redact · validate · rollback
```

### Slide 3 — Platform Proof (0:35–0:54)
**Background:** dark, dengan diagram alur
**Layout:** dua kolom
```
TrueFoundry AI Gateway        TrueFoundry MCP Gateway
Claude Sonnet 4.6 (primary)   github_deploy
  ↓ 429? circuit breaks        validator
Mistral Large (fallback)       notifier
  ↓ outage?
Llama 3.1 70B (last resort)   TrueFoundry Guardrails
                               secrets-detection (MUTATE)
Every call: audit row          prompt-injection (VALIDATE)
written to provider_log        pii-phi-detection (MUTATE)
```

### Slide 4 — Closing (2:38–3:00)
**Background:** dark, gradient biru-ungu
**Layout:** teks besar center
```
Try it live:
deaddrop.adindamochamad.com

Health check:
deaddrop.adindamochamad.com/health

github.com/adindamochamad/deaddrop

[baris besar]
Infrastructure dies.
Your agent doesn't.
```

---

## TIPS EDITING

1. **Transisi slide → browser:** gunakan crossfade 0.3 detik, jangan cut kasar
2. **Saat Full Chaos:** slow down recording sedikit atau zoom ke log panel agar WARN/ERROR terlihat jelas
3. **Sorot counter:** saat counter +1 muncul, beri visual cue (lingkaran merah kecil atau zoom 2 detik)
4. **Audio:** selesai voiceover ElevenLabs, export sebagai MP3, sync dengan video di DaVinci Resolve / CapCut / iMovie
5. **Durasi akhir:** target 2:55–3:00 tepat (tidak lebih, judges perhatikan ini)

---

## ELEVENLABS SEGMENT BREAKDOWN
*(Paste per-segment untuk kontrol timing lebih baik)*

| # | Segment | Durasi target | Kata kunci |
|---|---------|---------------|------------|
| 1 | Hook | 16 detik | "2 AM... 429... DeadDrop solves" |
| 2 | Solution | 17 detik | "four resilience layers" |
| 3 | Platform Proof | 19 detik | "TrueFoundry... circuit breaker... audit row" |
| 4 | Demo intro | 10 detik | "live... deaddrop.adindamochamad.com" |
| 5 | Demo A | 16 detik | "Scenario A... baseline" |
| 6 | Demo B | 22 detik | "429... Mistral... provider switches" |
| 7 | Demo D | 33 detik | "Full Chaos... three failures... still Done" |
| 8 | Metrics | 19 detik | "aggregate metrics... audit trail" |
| 9 | Closing | 22 detik | "Infrastructure dies. Your agent doesn't." |
| **Total** | | **174 detik ≈ 2:54** | |

> **Catatan ElevenLabs:** gunakan `<break time="1.2s" />` antara segment 3→4 (sebelum switch ke live demo), dan antara segment 7→8 (setelah "still finishes as Done"). Ini memberi ruang napas di momen kunci.

---

## PEXELS STOCK VIDEO — SEARCH TERMS & PILIHAN

*Semua gratis di [pexels.com/videos](https://www.pexels.com/videos/). Download format MP4 HD (1920×1080). Pakai sebagai background atau B-roll overlay dengan opacity 20–40% agar tidak mengganggu teks.*

---

### Segment 1 — Hook (0:00–0:18)
**Mood:** gelap, tegang, malam hari, kelelahan
**Durasi dibutuhkan:** 18 detik

| Priority | Search Term Pexels | Yang dicari |
|---|---|---|
| ⭐⭐⭐ | `developer coding night dark` | Engineer di depan laptop malam hari |
| ⭐⭐⭐ | `server room red light alert` | Lampu server berkedip merah |
| ⭐⭐ | `computer screen error terminal` | Terminal dengan teks error |
| ⭐⭐ | `tired programmer late night` | Orang kelelahan di depan komputer |
| ⭐ | `data center dark blinking` | Data center lampu berkedip |

**Rekomendasi pakai:** ambil 2 klip, potong masing-masing 8–9 detik, overlay di atas Gamma slide dengan `mix-blend-mode: overlay` di editor.

---

### Segment 2 — Solution (0:18–0:35)
**Mood:** modern, tech, bersih, hopeful
**Durasi dibutuhkan:** 17 detik

| Priority | Search Term Pexels | Yang dicari |
|---|---|---|
| ⭐⭐⭐ | `abstract network nodes glowing` | Node-node cahaya bergerak (cocok background) |
| ⭐⭐⭐ | `technology circuit board purple` | PCB dengan cahaya ungu |
| ⭐⭐ | `futuristic digital data flow` | Aliran data digital |
| ⭐⭐ | `cloud computing connection lines` | Garis koneksi cloud |
| ⭐ | `AI neural network visualization` | Visualisasi jaringan neural |

**Rekomendasi pakai:** 1 klip "network nodes" sebagai full-bg overlay opacity 25%, di balik Gamma slide.

---

### Segment 3 — Platform Proof (0:35–0:54)
**Mood:** profesional, enterprise, dashboard, data
**Durasi dibutuhkan:** 19 detik

| Priority | Search Term Pexels | Yang dicari |
|---|---|---|
| ⭐⭐⭐ | `server data center blue lights` | Server racks dengan cahaya biru |
| ⭐⭐⭐ | `analytics dashboard screen` | Layar dengan data/grafik |
| ⭐⭐ | `cloud infrastructure technology` | Visualisasi infrastruktur cloud |
| ⭐⭐ | `data security shield technology` | Visual keamanan data |
| ⭐ | `monitoring computer multiple screens` | Multi-monitor dengan data |

---

### Segment 5 & 6 — Demo A & B (1:05–1:45)
**Gunakan:** Screen recording langsung (tidak perlu stock video di sini)
**Optional overlay:** loop klip gelombang/pulse subtle di corner kanan atas saat demo berjalan

| Priority | Search Term Pexels | Yang dicari |
|---|---|---|
| ⭐⭐ | `loading progress bar technology` | Animasi loading/progress |
| ⭐ | `green light success checkmark` | Animasi sukses hijau |

---

### Segment 7 — Full Chaos (1:45–2:18)
**Mood:** kacau, merah, intensitas tinggi, lalu recovery
**Durasi dibutuhkan:** 33 detik — bagian paling krusial

| Priority | Search Term Pexels | Yang dicari |
|---|---|---|
| ⭐⭐⭐ | `red alarm warning system` | Alarm merah berkedip |
| ⭐⭐⭐ | `lightning storm dramatic` | Badai/petir dramatis |
| ⭐⭐⭐ | `system failure crash screen` | Layar error/crash |
| ⭐⭐ | `fire server burning abstract` | Api abstrak (latar) |
| ⭐⭐ | `recovery green pulse light` | Cahaya hijau recovery |
| ⭐ | `network disruption cyber attack` | Gangguan jaringan |

**Teknik pakai:** 
- Detik 1:45–2:05 (fase chaos): pakai klip "red alarm" atau "lightning" overlay opacity 15%, tint merah
- Detik 2:05–2:18 (recovery → DONE): crossfade ke klip "green pulse light", tint hijau
- Transisi dari merah ke hijau = visual story paling kuat di video

---

### Segment 8 — Metrics (2:18–2:38)
**Mood:** data, bukti, clean, professional
**Durasi dibutuhkan:** 20 detik

| Priority | Search Term Pexels | Yang dicari |
|---|---|---|
| ⭐⭐⭐ | `dashboard analytics data visualization` | Dashboard data analytics |
| ⭐⭐ | `business graph growing upward` | Grafik naik |
| ⭐⭐ | `number counter increment screen` | Angka bertambah di layar |
| ⭐ | `audit report document technology` | Dokumen audit/log |

---

### Segment 9 — Closing (2:38–3:00)
**Mood:** confident, brand, memorable, call to action
**Durasi dibutuhkan:** 22 detik

| Priority | Search Term Pexels | Yang dicari |
|---|---|---|
| ⭐⭐⭐ | `abstract purple cyan particles` | Partikel ungu-cyan bergerak |
| ⭐⭐⭐ | `technology galaxy stars dark` | Galaksi/bintang di latar gelap |
| ⭐⭐ | `glowing orb purple technology` | Bola cahaya ungu |
| ⭐⭐ | `futuristic space dark background` | Background futuristik |
| ⭐ | `digital sunrise horizon` | Sunrise digital (metafor recovery) |

---

## CARA COMBINE PEXELS + GAMMA + SCREEN RECORDING

### Di CapCut (paling mudah, gratis):
```
Track 1 (bottom): Stock video Pexels (full duration)
Track 2: Gamma slide export (video) — opacity 90%, overlay normal
Track 3: Screen recording (crop/pip untuk demo section)
Track 4 (top): ElevenLabs voiceover MP3
```

### Di DaVinci Resolve (lebih kontrol):
```
V1: Pexels background (opacity 30–40% via opacity node)
V2: Gamma slides (keyed atau full opacity)
V3: Screen recording (Picture-in-picture atau full screen)
A1: ElevenLabs voiceover
A2: Subtle ambient music (search "dark ambient technology" di Pixabay — gratis)
```

### Urutan kerja yang disarankan:
1. Download Pexels video (30 menit)
2. Buat 4 slide di Gamma.app dengan prompt di atas, export sebagai MP4 (5 menit)
3. Record screen demo (15 menit, rekam 3x, pilih yang terbaik)
4. Generate voiceover per-segment di ElevenLabs (15 menit)
5. Assemble di CapCut/DaVinci (30–45 menit)
6. Export 1920×1080 MP4, H.264, bitrate 8–12 Mbps

**Total waktu produksi: ±2 jam**
