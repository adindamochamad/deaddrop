# DeadDrop — Master Project Context
> Dokumen ini adalah "bible" project untuk Cursor AI. Baca seluruhnya sebelum menulis satu baris kode.

---

## 1. EXECUTIVE SUMMARY

**Nama Project:** DeadDrop  
**Tagline:** *"Infrastructure dies. Your agent doesn't."*  
**Hackathon:** Resilient Agents Online Hackathon — TrueFoundry × AWS Bedrock  
**Deadline Submit:** 7 Juni 2026, 23:59 PT  
**Submit URL:** https://www.builderbase.com/v2/event/resilient-agents-online-hackathon  
**Discord:** https://discord.gg/7dHQAsQq66 | Channel: `june-1-2026-resilient-agents-online-hackathon`

**One-liner untuk juri:**
> DeadDrop adalah deployment orchestration agent yang tetap menyelesaikan tugasnya meski provider LLM mati, rate limit hit, atau tool timeout — menggunakan TrueFoundry AI Gateway, MCP Gateway, dan Guardrails sebagai fondasi resiliensi production-grade.

---

## 2. PROBLEM STATEMENT

### Target User
**Backend engineer atau DevOps di startup/scaleup** yang:
- Punya pipeline deployment yang bergantung pada LLM (generate configs, validate manifests, summarize diff)
- Sering kena rate limit saat jam sibuk (deploy biasanya bersamaan)
- Tidak punya DBA atau infra engineer dedicated — satu orang handle semuanya
- Tidak bisa afford downtime saat deploy: kalau agent gagal, deployment berhenti

### Pain Point Konkret
```
Skenario nyata:
- Engineer trigger deployment jam 2 pagi (release deadline)
- Agent memanggil AWS Bedrock untuk validate config
- Bedrock throttling karena high traffic
- Agent crash → deployment gagal → engineer bangun jam 3 untuk manual rollback
- Total kerugian: 5 jam engineer time + downtime service
```

### Solusi DeadDrop
Agent yang tidak pernah crash karena infra failure:
1. **Provider down?** → Fallback ke provider lain via AI Gateway
2. **Rate limit hit?** → Exponential backoff + queue + retry otomatis
3. **Tool timeout?** → MCP Gateway quarantine tool, pakai alternatif
4. **Bad LLM output?** → Guardrails catch + reject + retry dengan prompt yang berbeda
5. **Partial failure?** → State preservation, resume dari checkpoint terakhir

---

## 3. TECHNICAL ARCHITECTURE

### Stack Utama
```
┌─────────────────────────────────────────────────────┐
│                    DeadDrop Agent                    │
├─────────────────────────────────────────────────────┤
│  Orchestration Layer (Python)                       │
│  - Task queue dengan priority                       │
│  - State machine per deployment job                 │
│  - Checkpoint manager (MySQL)                       │
├─────────────────────────────────────────────────────┤
│  TrueFoundry AI Gateway                             │
│  - Route: Claude Sonnet → Mistral → Llama fallback  │
│  - Rate limit handling + retry config               │
│  - Observability: latency, token usage, error rate  │
├─────────────────────────────────────────────────────┤
│  TrueFoundry MCP Gateway                            │
│  - Tool: github_deploy (push config ke repo)        │
│  - Tool: validator (syntax check manifest)          │
│  - Tool: notifier (Slack/webhook alert)             │
│  - Scoped permissions per tool                      │
│  - Audit trail semua tool calls                     │
├─────────────────────────────────────────────────────┤
│  TrueFoundry Guardrails                             │
│  - Block: deployment ke production tanpa approval   │
│  - Redact: API keys, secrets dari LLM input/output  │
│  - Validate: YAML/JSON syntax sebelum tool execute  │
│  - Inspect: tool results sebelum agent lanjut       │
├─────────────────────────────────────────────────────┤
│  AWS Bedrock (via AI Gateway)                       │
│  - Primary: Claude Sonnet (config generation)       │
│  - Fallback 1: Mistral Large (jika Sonnet throttle) │
│  - Fallback 2: Llama 3.1 70B (jika semua throttle)  │
└─────────────────────────────────────────────────────┘
```

### State Machine Per Job
```
PENDING → ANALYZING → GENERATING → VALIDATING → DEPLOYING → DONE
              ↓              ↓             ↓            ↓
           RETRY          RETRY         RETRY        ROLLBACK
              ↓              ↓             ↓            ↓
           FAILED         FAILED        FAILED       FAILED
```

Setiap state disimpan di MySQL dengan timestamp. Kalau agent restart/crash, ia resume dari state terakhir — bukan dari awal.

### Resilience Mechanisms (Critical untuk Judging)

#### 1. Multi-Provider Fallback (AI Gateway)
```python
# Config di TrueFoundry AI Gateway
fallback_chain = [
    {"provider": "aws-bedrock", "model": "claude-sonnet-4-6", "priority": 1},
    {"provider": "aws-bedrock", "model": "mistral-large-2407", "priority": 2},
    {"provider": "aws-bedrock", "model": "meta-llama-3-1-70b", "priority": 3},
]
# AI Gateway handles retry + fallback transparently
```

#### 2. Exponential Backoff + Circuit Breaker
```python
# Bukan pakai library berat — implementasi sendiri agar terlihat di demo
class CircuitBreaker:
    states = ["CLOSED", "OPEN", "HALF_OPEN"]
    # CLOSED: normal operation
    # OPEN: too many failures, reject immediately
    # HALF_OPEN: test satu request, kalau OK → CLOSED
```

#### 3. State Checkpoint (MySQL)
```sql
CREATE TABLE deployment_jobs (
    id VARCHAR(36) PRIMARY KEY,
    status ENUM('pending','analyzing','generating','validating','deploying','done','failed'),
    checkpoint_data JSON,  -- semua context yang dibutuhkan untuk resume
    last_error TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### 4. MCP Tool Health Check
```python
# Sebelum setiap tool call, MCP Gateway verify tool availability
# Kalau tool unavailable, agent otomatis cari alternatif atau skip
# Semua tercatat di audit log
```

#### 5. Guardrails Pipeline
```
Input LLM → [Guardrail: redact secrets] → LLM
LLM Output → [Guardrail: validate YAML syntax] → [Guardrail: no prod deploy tanpa flag] → Tool
Tool Result → [Guardrail: inspect output] → Agent
```

---

## 4. PROJECT STRUCTURE

```
deaddrop/
├── agent/
│   ├── __init__.py
│   ├── orchestrator.py        # Main agent loop
│   ├── state_machine.py       # Job state management
│   ├── circuit_breaker.py     # Circuit breaker implementation
│   └── checkpoint.py          # MySQL checkpoint manager
├── gateway/
│   ├── ai_gateway.py          # TrueFoundry AI Gateway client
│   ├── mcp_gateway.py         # TrueFoundry MCP Gateway client
│   └── guardrails.py          # Guardrails configuration
├── tools/
│   ├── github_deploy.py       # MCP Tool: push ke GitHub
│   ├── validator.py           # MCP Tool: validate YAML/JSON
│   └── notifier.py            # MCP Tool: Slack notification
├── db/
│   ├── models.py              # SQLAlchemy models
│   ├── migrations/
│   └── schema.sql
├── api/
│   ├── main.py                # FastAPI server
│   └── routes.py              # REST endpoints untuk trigger jobs
├── demo/
│   ├── chaos_injector.py      # KRITIS: inject failures untuk demo
│   └── scenarios.py           # Pre-defined demo scenarios
├── video/                     # Remotion project (terpisah)
│   ├── remotion.config.ts
│   ├── src/
│   │   ├── Root.tsx
│   │   ├── compositions/
│   │   │   ├── HackathonDemo.tsx      # 3-min submission video
│   │   │   └── SocialMedia.tsx        # 60-sec social video
│   │   └── scenes/
│   │       ├── 00_Hook.tsx
│   │       ├── 01_Problem.tsx
│   │       ├── 02_Solution.tsx
│   │       ├── 03_Architecture.tsx
│   │       ├── 04_LiveDemo.tsx        # screen recording embed
│   │       ├── 05_Resilience.tsx
│   │       └── 06_CTA.tsx
│   └── package.json
├── .env.example
├── docker-compose.yml
├── requirements.txt
└── README.md
```

---

## 5. DEMO SCRIPT (Kritis — Ini yang Dinilai Juri)

### Video 1: Submission Demo (3 Menit Tepat)

**Frame-by-frame script:**

```
[0:00 - 0:15] HOOK — Problem statement
Visual: Terminal log agent crash karena rate limit
Narasi: "Your deployment agent just crashed at 2am. Rate limit hit.
         Config generation failed. Manual rollback. 5 hours lost."

[0:15 - 0:30] SOLUTION INTRO
Visual: DeadDrop logo + tagline "Infrastructure dies. Your agent doesn't."
Narasi: "DeadDrop adalah deployment agent yang tidak pernah menyerah —
         dibangun di atas TrueFoundry AI Gateway, MCP Gateway, dan Guardrails."

[0:30 - 1:00] ARCHITECTURE WALKTHROUGH (30 detik)
Visual: Animated diagram architecture
Narasi singkat per komponen:
- AI Gateway: "Routing + fallback ke 3 model provider"
- MCP Gateway: "Safe tool access dengan audit trail"
- Guardrails: "Block, redact, validate sebelum eksekusi"

[1:00 - 2:15] LIVE DEMO — THE WOW MOMENT (75 detik)
Sub-scene A [1:00-1:20]: Trigger deployment normal
  - Dashboard: job PENDING → ANALYZING → GENERATING
  - AI Gateway log: "Using Claude Sonnet — latency 420ms"

Sub-scene B [1:20-1:40]: INJECT FAILURE — Kill Claude Sonnet
  - Chaos injector: rate limit Claude Sonnet
  - AI Gateway log: "Claude Sonnet rate limited → switching to Mistral Large"
  - Dashboard: job TIDAK berhenti, lanjut GENERATING
  - Recovery time counter: "Recovered in 0.8s"

Sub-scene C [1:40-2:00]: INJECT FAILURE — Tool timeout
  - Chaos injector: timeout github_deploy tool
  - MCP Gateway log: "github_deploy timeout → quarantined → using backup"
  - Guardrails log: "Blocked: deployment to prod without approval flag"
  - Job tetap jalan, state preserved

Sub-scene D [2:00-2:15]: Job selesai
  - Dashboard: DONE ✓
  - Metrics: 2 provider switches, 1 tool quarantine, 0 data loss
  - "Tanpa DeadDrop: job gagal. Dengan DeadDrop: job selesai."

[2:15 - 2:45] RESILIENCE METRICS DASHBOARD
Visual: Live dashboard
- Provider switch count: 2
- Tool failures handled: 1
- Guardrails blocked: 3
- State checkpoints saved: 7
- Total recovery time: 1.3 detik

[2:45 - 3:00] CLOSING
Visual: GitHub repo + TrueFoundry tenant URL
Narasi: "DeadDrop — karena deployment tidak boleh bergantung pada keberuntungan."
```

### Video 2: Social Media (60 Detik)
```
[0:00-0:05] Hook: "Deployment agent kamu crash jam 2 pagi?"
[0:05-0:20] Problem visual (terminal crash log)
[0:20-0:45] Demo singkat: inject failure → auto-recovery
[0:45-0:55] Metrics card
[0:55-1:00] CTA: "Built with @TrueFoundry AI Gateway — #ResilientAgents"
```

---

## 6. JUDGING CRITERIA MAPPING

Setiap judging criteria harus ada bukti konkretnya di demo:

| Criteria | Implementasi DeadDrop | Bukti di Demo |
|---|---|---|
| AI Gateway setup | Routing ke 3 model, fallback config, observability dashboard | Log screen saat provider switch |
| MCP Gateway usage | 3 tools terdaftar, scoped permissions, audit log | Audit log screen + tool quarantine scene |
| Guardrails | Block prod deploy, redact secrets, validate YAML | Guardrails log blocked request |
| Resilience | Circuit breaker, retry, state preservation, graceful degradation | Chaos injection → recovery timer |
| Usefulness | "Backend engineer yang deploy jam 2 pagi" | Opening hook scene |
| Demo clarity | Kronologi jelas: failure → recovery → selesai | Sub-scene A/B/C/D |

---

## 7. SUBMISSION CHECKLIST

### GitHub Repo (wajib)
- [ ] README.md dengan arsitektur diagram
- [ ] `.env.example` (TANPA credentials asli)
- [ ] `docker-compose.yml` untuk local setup
- [ ] Code berjalan (bukan skeleton)
- [ ] Kalau private: invite `sai@truefoundry.com`

### Tenant URL
- [ ] Format: `<nama>.truefoundry.cloud`
- [ ] AI Gateway configured dengan 3 providers
- [ ] MCP Gateway dengan 3 tools
- [ ] Guardrails aktif

### Video Demo
- [ ] Durasi TEPAT 3 menit (tidak lebih, tidak kurang ±5 detik)
- [ ] Audio narasi jelas
- [ ] Dashboard visible dan readable
- [ ] Chaos injection moment jelas terlihat
- [ ] Recovery time counter muncul

---

## 8. DAILY TODOLIST

### HARI 1 — Senin 2 Juni: Foundation & Setup
**Target akhir hari: Environment berjalan, database up, bisa panggil AI Gateway**

Pagi (4 jam):
- [ ] Daftar TrueFoundry: https://www.truefoundry.com/register
- [ ] Setup workspace & tenant URL (`deaddrop.truefoundry.cloud`)
- [ ] Install dependencies: Python 3.11, MySQL, FastAPI, SQLAlchemy
- [ ] Buat `.env` dari `.env.example`
- [ ] Init database: jalankan `schema.sql`
- [ ] Test koneksi MySQL

Siang (4 jam):
- [ ] Setup TrueFoundry AI Gateway
  - [ ] Connect AWS Bedrock
  - [ ] Config 3 model: Claude Sonnet (primary), Mistral Large (fallback 1), Llama 3.1 (fallback 2)
  - [ ] Test API call via Gateway — pastikan response OK
- [ ] Tulis `gateway/ai_gateway.py`
  - [ ] `call_llm(prompt, context)` — single function yang handles routing
  - [ ] Log setiap call ke console

Malam (2 jam):
- [ ] Tulis `db/models.py` — DeploymentJob model
- [ ] Tulis `agent/checkpoint.py` — save & load state
- [ ] Test: buat job, save state, load state → OK

**Gate check hari 1:** `python -c "from gateway.ai_gateway import call_llm; print(call_llm('hello'))"` harus return response

---

### HARI 2 — Selasa 3 Juni: Core Agent + Resilience
**Target akhir hari: Agent bisa run job dari awal sampai akhir, dengan fallback**

Pagi (4 jam):
- [ ] Tulis `agent/state_machine.py`
  - [ ] States: PENDING → ANALYZING → GENERATING → VALIDATING → DEPLOYING → DONE
  - [ ] Transition logic dengan error handling
  - [ ] Simpan setiap transition ke DB
- [ ] Tulis `agent/circuit_breaker.py`
  - [ ] States: CLOSED / OPEN / HALF_OPEN
  - [ ] Threshold: 3 failures → OPEN, 30 detik → HALF_OPEN
  - [ ] Unit test circuit breaker

Siang (4 jam):
- [ ] Tulis `agent/orchestrator.py`
  - [ ] Main loop: poll pending jobs → process → update state
  - [ ] Integrate circuit breaker
  - [ ] Integrate checkpoint (resume jika restart)
  - [ ] Handle: rate limit, timeout, bad output
- [ ] Tulis `tools/validator.py` — validate YAML/JSON syntax

Malam (2 jam):
- [ ] End-to-end test: trigger job → agent process → DONE
- [ ] Test resume: kill agent mid-job → restart → resume dari checkpoint
- [ ] Fix bugs

**Gate check hari 2:** Job bisa selesai end-to-end, dan bisa resume setelah kill + restart

---

### HARI 3 — Rabu 4 Juni: MCP Gateway + Guardrails
**Target akhir hari: MCP tools terdaftar, Guardrails aktif, audit log jalan**

Pagi (4 jam):
- [ ] Setup TrueFoundry MCP Gateway
  - [ ] Register `github_deploy` tool (mock OK untuk hackathon)
  - [ ] Register `validator` tool
  - [ ] Register `notifier` tool (Slack webhook atau log)
  - [ ] Set scoped permissions per tool
- [ ] Tulis `gateway/mcp_gateway.py`
  - [ ] `call_tool(tool_name, params)` dengan error handling
  - [ ] Log semua calls (ini yang jadi audit trail)

Siang (4 jam):
- [ ] Setup TrueFoundry Guardrails
  - [ ] Rule 1: Redact regex `[A-Za-z0-9+/]{40,}` (API keys) dari input/output
  - [ ] Rule 2: Block output kalau ada string "production" tanpa `--approved` flag
  - [ ] Rule 3: Validate JSON/YAML syntax di tool arguments
- [ ] Tulis `gateway/guardrails.py`
  - [ ] Integrate ke orchestrator (sebelum dan sesudah LLM call)
- [ ] Test: kirim prompt dengan API key → Guardrail harus redact

Malam (2 jam):
- [ ] Tulis `tools/github_deploy.py` (mock: simpan ke file lokal)
- [ ] Tulis `tools/notifier.py` (mock: log ke console)
- [ ] End-to-end test dengan semua tools

**Gate check hari 3:** Guardrails block/redact terlihat di log, MCP audit trail tersimpan

---

### HARI 4 — Kamis 5 Juni: Chaos Injector + Dashboard + Demo Prep
**Target akhir hari: Demo bisa dijalankan lengkap, chaos injection bekerja**

Pagi (4 jam):
- [ ] Tulis `demo/chaos_injector.py` — INI PALING PENTING
  - [ ] `inject_rate_limit(provider)` — simulasi 429 dari Bedrock
  - [ ] `inject_timeout(tool_name)` — simulasi tool timeout
  - [ ] `inject_bad_output()` — LLM return invalid YAML
  - [ ] `inject_provider_outage(provider)` — simulasi provider down total
  - [ ] `reset_all()` — restore normal operation
- [ ] Test setiap injection scenario
- [ ] Pastikan chaos injection tidak merusak state (job harus recovery, bukan corrupt)

Siang (4 jam):
- [ ] Buat `api/main.py` — FastAPI server
  - [ ] `POST /jobs` — trigger new deployment job
  - [ ] `GET /jobs/{id}` — get job status + metrics
  - [ ] `POST /chaos/{type}` — inject failure (untuk demo)
  - [ ] `GET /metrics` — aggregate metrics
- [ ] Buat simple dashboard (HTML + SSE atau polling)
  - [ ] Live job status
  - [ ] Provider switch counter
  - [ ] Recovery time display
  - [ ] AI Gateway log stream
  - [ ] Guardrails event log

Malam (2 jam):
- [ ] Full run demo script dari awal sampai akhir
- [ ] Catat waktu setiap scene
- [ ] Identifikasi bagian yang masih buggy
- [ ] Fix critical bugs

**Gate check hari 4:** Bisa run full demo tanpa bug. Chaos injection → recovery terlihat jelas di dashboard

---

### HARI 5 — Jumat 6 Juni: Remotion Video + Polish
**Target akhir hari: Dua video render selesai, siap submit**

Pagi (4 jam — Video):
- [ ] Init Remotion: `npm init video` di folder `video/`
- [ ] Setup `video/src/Root.tsx` dengan dua compositions
- [ ] Build scene-by-scene untuk HackathonDemo (3 menit):
  - [ ] Scene 00: Hook — terminal crash animation
  - [ ] Scene 01: Problem statement dengan code snippet
  - [ ] Scene 02: Solution + logo animation
  - [ ] Scene 03: Architecture diagram (animated)
  - [ ] Scene 04: Screen recording embed (rekam dulu!)
  - [ ] Scene 05: Metrics dashboard
  - [ ] Scene 06: CTA
- [ ] Preview di Remotion Studio

**CATATAN PENTING untuk screen recording (Scene 04):**
- Rekam demo DULU sebelum buat Remotion
- Simpan sebagai `video/public/demo-recording.mp4`
- Gunakan `<Video>` component di Remotion untuk embed
- Durasi recording harus sesuai alokasi scene (75 detik)

Siang (3 jam — Video + Polish):
- [ ] Build SocialMedia composition (60 detik)
- [ ] Render kedua video: `npx remotion render`
- [ ] Review hasil render — cek audio, timing, visual
- [ ] Fix jika ada masalah

Sore (2 jam — Submit):
- [ ] Push code ke GitHub
- [ ] Pastikan README lengkap dengan:
  - [ ] Demo video link atau embed
  - [ ] Arsitektur diagram
  - [ ] Setup instructions
  - [ ] TrueFoundry tenant URL
- [ ] Verifikasi tenant URL accessible
- [ ] Buka https://www.builderbase.com/v2/event/resilient-agents-online-hackathon
- [ ] Isi semua fields:
  - [ ] GitHub Repo URL
  - [ ] Tenant URL
  - [ ] Video demo (upload atau link)
- [ ] Submit sebelum 23:59 PT (UTC-7 = besok 06:59 WIB)

---

### HARI 6 — Sabtu 7 Juni: Buffer + Finalisasi
**Ini hari buffer. Kalau hari 1-5 lancar, hari ini untuk polish. Kalau ada yang tertinggal, selesaikan hari ini.**

Prioritas kalau ada yang belum selesai:
1. Core agent working end-to-end (non-negotiable)
2. Chaos injection + recovery visible (non-negotiable)
3. Video demo 3 menit (non-negotiable)
4. Guardrails aktif (high priority)
5. MCP audit log (high priority)
6. Dashboard polished (nice to have)
7. Social media video (nice to have)

---

## 9. REMOTION — PANDUAN SPESIFIK

### Setup
```bash
cd deaddrop/video
npm init video  # pilih "blank" template
npm install
```

### Struktur Compositions
```typescript
// src/Root.tsx
import { Composition } from 'remotion';
import { HackathonDemo } from './compositions/HackathonDemo';
import { SocialMedia } from './compositions/SocialMedia';

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="HackathonDemo"
        component={HackathonDemo}
        durationInFrames={5400}  // 3 menit × 30fps = 5400 frames
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="SocialMedia"
        component={SocialMedia}
        durationInFrames={1800}  // 60 detik × 30fps = 1800 frames
        fps={30}
        width={1080}
        height={1920}  // Portrait untuk IG/TikTok
      />
    </>
  );
};
```

### Timing Constants
```typescript
// src/constants.ts
export const FPS = 30;
export const TOTAL_DURATION = 5400; // 3 menit

// Scene timings (dalam frames)
export const SCENES = {
  HOOK:         { start: 0,    duration: 450  },  // 0:00 - 0:15
  INTRO:        { start: 450,  duration: 450  },  // 0:15 - 0:30
  ARCHITECTURE: { start: 900,  duration: 900  },  // 0:30 - 1:00
  DEMO_NORMAL:  { start: 1800, duration: 600  },  // 1:00 - 1:20
  DEMO_FAIL1:   { start: 2400, duration: 600  },  // 1:20 - 1:40
  DEMO_FAIL2:   { start: 3000, duration: 600  },  // 1:40 - 2:00
  DEMO_DONE:    { start: 3600, duration: 450  },  // 2:00 - 2:15
  METRICS:      { start: 4050, duration: 900  },  // 2:15 - 2:45
  CLOSING:      { start: 4950, duration: 450  },  // 2:45 - 3:00
};
```

### Pattern Animasi yang Digunakan
```typescript
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

// Fade in
const opacity = interpolate(frame, [0, 30], [0, 1], {
  extrapolateRight: 'clamp',
});

// Spring animation untuk elements masuk
const scale = spring({
  frame,
  fps,
  config: { damping: 200 },
});

// Slide dari bawah
const translateY = interpolate(frame, [0, 20], [50, 0], {
  extrapolateRight: 'clamp',
});
```

### Embed Screen Recording
```typescript
import { Video, staticFile } from 'remotion';

// Di Scene 04 (Live Demo)
<Video
  src={staticFile('demo-recording.mp4')}
  startFrom={0}
  style={{ width: '100%', height: '100%' }}
/>
```

### Render Commands
```bash
# Preview
npx remotion studio

# Render submission video
npx remotion render HackathonDemo out/deaddrop-demo.mp4 --codec=h264

# Render social media video
npx remotion render SocialMedia out/deaddrop-social.mp4 --codec=h264
```

---

## 10. CRITICAL RISKS & MITIGATIONS

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| TrueFoundry setup lebih lama dari ekspektasi | Tinggi | Kritis | Hari 1 full untuk setup, tidak ada fitur lain |
| AWS Bedrock access delay | Sedang | Kritis | Daftar sekarang, cek kredensial hari 1 pagi |
| Screen recording terlalu panjang/pendek | Tinggi | Sedang | Rekam hari 4 sore, edit dulu sebelum Remotion |
| Video render error | Sedang | Tinggi | Test render hari 5 pagi, bukan menjelang deadline |
| Bug di chaos injector merusak state | Sedang | Tinggi | Test setiap injection scenario hari 4 isolated |
| Submission deadline timezone confusion | Sedang | Fatal | 23:59 PT = 06:59 WIB Sabtu 8 Juni 2026 |

---

## 11. ENVIRONMENT VARIABLES

```bash
# .env.example (jangan commit nilai asli!)

# TrueFoundry
TRUEFOUNDRY_API_KEY=
TRUEFOUNDRY_TENANT_URL=https://deaddrop.truefoundry.cloud

# AWS Bedrock (via TrueFoundry AI Gateway)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1

# Database
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DB=deaddrop
MYSQL_USER=
MYSQL_PASSWORD=

# App
API_PORT=8000
LOG_LEVEL=INFO
DEMO_MODE=true  # enable chaos injector endpoints
```

---

## 12. CURSOR AI — INSTRUKSI PENGGUNAAN DOKUMEN INI

Ketika kamu mulai sesi baru di Cursor, paste context berikut:

```
Kamu adalah senior backend engineer yang sedang build "DeadDrop" untuk hackathon TrueFoundry Resilient Agents.
Baca DEADDROP_MASTER_CONTEXT.md terlebih dahulu.
Hari ini adalah [HARI X]. Task yang harus diselesaikan ada di section 8 Daily Todolist untuk hari ini.
Prioritas: working code > clean code > nice-to-have features.
Kalau ada trade-off antara feature completeness dan stability, pilih stability.
Stack: Python 3.11, FastAPI, SQLAlchemy, MySQL, TrueFoundry SDK.
```

### Tips Prompting di Cursor untuk Project Ini:
- Selalu sebut nama file spesifik: "Tulis `agent/circuit_breaker.py`"
- Minta test sekaligus: "Tulis fungsi + unit test-nya"
- Referensikan arsitektur: "Sesuai state machine di section 3"
- Kalau stuck: "Baca section [X] dan jelaskan apa yang perlu diubah"

---

## 13. SOCIAL MEDIA POST TEMPLATE (untuk Social Prize $1,000)

Post di LinkedIn/X/Twitter setelah submit:

```
Spent 6 days building DeadDrop for the @TrueFoundry Resilient Agents hackathon.

The challenge: build an agent that doesn't crash when infrastructure does.

Here's what I learned about production-grade resilience with TrueFoundry AI Gateway:

🔀 Multi-provider fallback isn't optional — it's table stakes
When Claude Sonnet hit rate limits at 2am, DeadDrop switched to Mistral in 0.8s.
Zero job failures. Zero manual intervention.

🛡️ Guardrails saved me from myself
I caught 3 near-misses where LLM output would have deployed bad configs to prod.
TrueFoundry Guardrails blocked all 3 before the tool ever ran.

🔧 MCP Gateway audit trails are underrated
Every tool call logged. Every permission scoped. When github_deploy timed out,
I had a complete trace of what happened and why.

The biggest lesson: resilience isn't about preventing failures.
It's about making failures invisible to the end result.

Demo: [VIDEO LINK]
GitHub: [REPO LINK]
Built with: @TrueFoundry AI Gateway + AWS Bedrock

#ResilientAgents #TrueFoundry #AWSBedrock #AgentDev
```

---

*Dokumen ini terakhir diperbarui: 2 Juni 2026*
*Versi: 1.0*
