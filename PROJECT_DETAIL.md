# DeadDrop — Project Detail (Evaluasi Mendalam)

> Dokumen teknis lengkap untuk agent evaluator. Ringkasan cepat: [`PROJECT_SUMMARY.md`](./PROJECT_SUMMARY.md)

**Versi:** 1.0  
**Tanggal audit:** 5 Juni 2026  
**Branch:** `main` (11 commits sejak initial)

---

## Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Problem & Solusi](#2-problem--solusi)
3. [Arsitektur Sistem](#3-arsitektur-sistem)
4. [Komponen & File Map](#4-komponen--file-map)
5. [Alur Job (End-to-End)](#5-alur-job-end-to-end)
6. [Mekanisme Resiliensi](#6-mekanisme-resiliensi)
7. [Integrasi TrueFoundry](#7-integrasi-truefoundry)
8. [Database Schema](#8-database-schema)
9. [API Reference](#9-api-reference)
10. [Demo & Chaos Engineering](#10-demo--chaos-engineering)
11. [Testing](#11-testing)
12. [Deployment & Infrastruktur](#12-deployment--infrastruktur)
13. [Video Submission (Remotion)](#13-video-submission-remotion)
14. [Rubrik Penilaian Hackathon](#14-rubrik-penilaian-hackathon)
15. [Known Issues & Technical Debt](#15-known-issues--technical-debt)
16. [Git History & Changelog](#16-git-history--changelog)

---

## 1. Ringkasan Eksekutif

DeadDrop adalah agent orkestrasi deployment yang dirancang untuk **tidak pernah gagal total** akibat kegagalan infrastruktur. Project ini dibangun untuk hackathon **Resilient Agents Online (TrueFoundry × AWS Bedrock)** dengan deadline submit **7 Juni 2026**.

### Status Implementasi

| Area | Progress | Keterangan |
|---|---|---|
| Core agent loop | 100% | `orchestrator.py` — 4 step pipeline dengan retry |
| State machine | 100% | 8 states, 29 unit tests |
| Circuit breaker | 100% | Per-provider, custom implementation |
| AI Gateway client | 100% | 3-provider fallback chain |
| MCP Gateway | 100% | 3 tools, audit log, quarantine, fallback |
| Guardrails | 100% | Native TFY + local layer |
| Checkpoint/resume | 100% | MySQL JSON checkpoint + worker poller |
| Chaos injector | 100% | 6 injection types + reset |
| Dashboard | 100% | HTML + SSE live events |
| Docker | 100% | MySQL + API container |
| Unit tests | 100% | 29 tests across 3 modules |
| Remotion video | ~70% | Scenes built, render pending |
| Hackathon submit | ~0% | Form belum diisi |

### Metrik Kode

| Metrik | Nilai |
|---|---|
| File Python (core) | 24 file |
| Total LOC Python | ~2.814 baris |
| Unit tests | 29 |
| Tabel database | 5 |
| API endpoints | ~15 |
| Demo scenarios | 5 |
| Git commits | 11 |

---

## 2. Problem & Solusi

### Problem

Backend engineer yang deploy jam 2 pagi mengandalkan LLM agent untuk generate & validate Kubernetes manifest. Saat AWS Bedrock throttle atau tool timeout, agent crash → deployment berhenti → manual rollback → kehilangan waktu engineer.

### Solusi DeadDrop

| Failure Mode | Mekanisme DeadDrop |
|---|---|
| Provider rate limit (429) | Fallback ke provider berikutnya di chain |
| Provider outage | Circuit breaker OPEN → skip provider |
| Slow/hanging response | Forced timeout → switch provider |
| Tool timeout | Quarantine + fallback ke backup tool |
| Bad LLM output (invalid YAML) | Guardrail block → rollback ke GENERATING |
| Agent process crash | Worker resume dari MySQL checkpoint |

---

## 3. Arsitektur Sistem

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                              │
│  Dashboard (HTML/SSE)  ·  REST API  ·  curl/Postman              │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                      FastAPI (api/main.py)                        │
│  Routes · Guardrail endpoints · MCP server mount (/mcp)            │
│  Background worker thread (worker.py)                               │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                   ORCHESTRATION LAYER (agent/)                      │
│                                                                    │
│  orchestrator.py ──→ state_machine.py                             │
│       │              checkpoint.py                                 │
│       │              circuit_breaker.py                            │
│       │              events.py (SSE bus)                           │
│       ▼                                                            │
│  PENDING → ANALYZING → GENERATING → VALIDATING → DEPLOYING → DONE │
│              ↓ RETRY    ↓ RETRY      ↓ ROLLBACK    ↓ ROLLBACK     │
│            FAILED       FAILED       FAILED         FAILED         │
└──────┬─────────────────┬──────────────────┬──────────────────────┘
       │                 │                  │
┌──────▼──────┐  ┌───────▼───────┐  ┌──────▼──────────┐
│ AI Gateway  │  │ MCP Gateway   │  │ Guardrails      │
│ ai_gateway  │  │ mcp_gateway   │  │ guardrails.py   │
│             │  │ tfy_mcp_client│  │ guardrail_routes│
│ 3 providers │  │ 3 tools       │  │ (HTTP endpoints)│
│ circuit brk │  │ audit log     │  │                 │
└──────┬──────┘  └───────┬───────┘  └─────────────────┘
       │                 │
┌──────▼──────┐  ┌───────▼───────┐
│ TrueFoundry │  │ MCP Tools     │
│ AI Gateway  │  │ github_deploy │
│ AWS Bedrock │  │ validator     │
│             │  │ notifier      │
└─────────────┘  └───────────────┘
       │
┌──────▼──────────────────────────────────────┐
│ MySQL 8.0                                    │
│ deployment_jobs · job_state_history          │
│ provider_log · tool_audit_log · guardrails_log│
└─────────────────────────────────────────────┘
```

---

## 4. Komponen & File Map

### `agent/` — Otak Agent

| File | LOC | Fungsi |
|---|---|---|
| `orchestrator.py` | ~329 | Main loop, 4 step handlers, retry + rollback logic |
| `state_machine.py` | ~80 | State transitions, terminal/resumable checks |
| `circuit_breaker.py` | ~90 | CLOSED/OPEN/HALF_OPEN implementation |
| `checkpoint.py` | ~120 | Save/load state, metrics, error recording |
| `events.py` | ~50 | In-memory SSE event bus |

**File kunci untuk review:** `orchestrator.py` — berisi seluruh business logic agent.

### `gateway/` — Integrasi Eksternal

| File | Fungsi |
|---|---|
| `ai_gateway.py` | OpenAI-compatible client ke TFY AI Gateway, provider chain, chaos hooks |
| `mcp_gateway.py` | Local MCP gateway: permissions, quarantine, timeout, audit log |
| `tfy_mcp_client.py` | TrueFoundry MCP Gateway client via langchain-mcp-adapters |
| `mcp_server.py` | FastMCP server — expose tools di `/mcp` |
| `guardrails.py` | Local guardrails: redact secrets, validate YAML, block prod |
| `permissions.py` | Scoped tool permissions per environment |
| `guardrail_routes.py` | *(di api/)* HTTP endpoints kompatibel TrueFoundry |

### `tools/` — MCP Tools

| Tool | File | Behavior |
|---|---|---|
| `validator` | `validator.py` | Parse & validate YAML/JSON manifest |
| `github_deploy` | `github_deploy.py` | **Mock:** tulis manifest ke `deploy_artifacts/{job_id}_{env}.yaml` |
| `notifier` | `notifier.py` | **Mock:** log alert ke console + return JSON |

### `api/` — HTTP Layer

| File | Fungsi |
|---|---|
| `main.py` | FastAPI app, CORS, lifespan (worker + MCP), startup checks |
| `routes.py` | Jobs, metrics, events SSE, chaos, scenarios |
| `dashboard.html` | Live dashboard dengan scenario buttons |
| `guardrail_routes.py` | TrueFoundry guardrail HTTP API |

### `demo/` — Chaos Engineering

| File | Fungsi |
|---|---|
| `chaos_injector.py` | 6 injection functions + reset |
| `scenarios.py` | 5 pre-defined demo scenarios (A/B/B2/C/D) |

### `db/`

| File | Fungsi |
|---|---|
| `models.py` | SQLAlchemy models (5 tables) |
| `schema.sql` | Raw SQL schema untuk Docker init |

### `tests/`

| File | Tests | Coverage |
|---|---|---|
| `test_circuit_breaker.py` | 8 | State transitions, threshold, recovery |
| `test_guardrails.py` | 13 | Redact, block prod, YAML validation, permissions |
| `test_state_machine.py` | 8 | Happy path, invalid transitions, resumable states |

### `video/` — Remotion Submission

| File | Fungsi |
|---|---|
| `src/Root.tsx` | 2 compositions: HackathonDemo (3min), SocialMedia (60s) |
| `src/compositions/HackathonDemo.tsx` | Main submission video |
| `src/scenes/00_Hook.tsx` – `05_Closing.tsx` | Individual scenes |
| `src/constants.ts` | FPS, duration, scene timings |

---

## 5. Alur Job (End-to-End)

### 5.1 Trigger

```
POST /api/jobs → create_job() → INSERT deployment_jobs (status=pending)
                                      ↓
Worker polls every 3s → process_job(job_id)
```

### 5.2 Pipeline Steps

#### Step 1: ANALYZING (`_step_analyze`)
1. `process_input()` — guardrail redact secrets dari prompt
2. `call_llm()` — AI Gateway dengan fallback chain
3. `process_output()` — guardrail inspect output
4. Save `checkpoint_data.analysis`

#### Step 2: GENERATING (`_step_generate`)
1. Build prompt dari analysis + input_data
2. `call_llm()` — generate Kubernetes YAML
3. `_strip_code_fences()` — bersihkan markdown fences
4. `_sanitize_manifest()` — fix `***` redaction markers
5. Save `checkpoint_data.manifest`

#### Step 3: VALIDATING (`_step_validate`)
1. `validate_tool_args("validator", ...)` — local guardrail
2. `call_tool("validator", ...)` — MCP tool call
3. `inspect_tool_result()` — cek output tool
4. Jika invalid → `GuardrailBlockedError` → rollback ke GENERATING

#### Step 4: DEPLOYING (`_step_deploy`)
1. `validate_tool_args("github_deploy", ...)` — cek permission (block prod tanpa approval)
2. `call_tool("github_deploy", ...)` — deploy (mock ke file lokal)
3. Jika timeout/quarantine → increment `tool_failures`, mungkin fallback ke notifier
4. `call_tool("notifier", ...)` — non-fatal notification

### 5.3 Retry Logic (`_run_step_with_retry`)

- Max retries: **3**
- Backoff: exponential dengan full jitter, cap 30s
- Guardrail block di VALIDATING → rollback ke GENERATING (bukan retry same step)
- Setiap error → `record_error()` + increment `retry_count`

### 5.4 Completion

Job DONE → emit "Resilience chain" summary:
```
✓ Resilience chain: 2 provider switch(es) | 1 tool failure(s) handled | recovered in 11.40s
✅ Job abc12345 — DONE
```

---

## 6. Mekanisme Resiliensi

### 6.1 Multi-Provider Fallback

```python
# gateway/ai_gateway.py
PROVIDER_CHAIN = [
    {"model": "aws-bedrock1/global.anthropic.claude-sonnet-4-6",      "priority": 1},
    {"model": "aws-bedrock1/mistral.mistral-large-3-675b-instruct",   "priority": 2},
    {"model": "aws-bedrock1/us.meta.llama3-1-70b-instruct-v1-0",    "priority": 3},
]
```

Alur: coba provider #1 → jika rate limit/timeout/outage/circuit OPEN → coba #2 → #3 → raise jika semua gagal.

### 6.2 Circuit Breaker (per provider)

```
CLOSED ──(3 failures)──→ OPEN ──(30s)──→ HALF_OPEN ──(1 success)──→ CLOSED
                              ↑                                        │
                              └────────(failure in HALF_OPEN)──────────┘
```

Implementasi: `agent/circuit_breaker.py` — tanpa library eksternal.

### 6.3 State Checkpoint

Setiap transisi state disimpan ke `deployment_jobs.checkpoint_data` (JSON):
```json
{
  "analysis": "...",
  "manifest": "apiVersion: apps/v1\n...",
  "validated": true,
  "deploy_result": {"commit_sha": "abc123", "target_env": "staging"}
}
```

Worker di `worker.py` poll job dengan status non-terminal → resume dari checkpoint.

### 6.4 MCP Tool Resilience

- **Quarantine:** tool ditolak sebelum eksekusi
- **Timeout:** simulasi hang → `ToolTimeoutError`
- **Fallback:** `github_deploy` gagal → degrade ke `notifier`
- **Audit:** setiap call tercatat di `tool_audit_log`

### 6.5 Guardrails (Dual Layer)

**Layer 1 — TrueFoundry Native (server-side di AI Gateway):**
| Guardrail | Mode | Scope |
|---|---|---|
| secrets-detection | MUTATE | Input + Output |
| prompt-injection | VALIDATE | Input |
| pii-phi-detection | MUTATE | Input + Output |

**Layer 2 — Local (`gateway/guardrails.py`):**
- Redact API keys via regex
- Block `github_deploy` ke production tanpa `approved=true`
- Validate YAML syntax sebelum tool call
- Inspect tool result untuk injection patterns

### 6.6 Chaos Injection (Demo)

| Function | Target | Effect |
|---|---|---|
| `inject_rate_limit(model)` | AI provider | Return 429, trigger fallback |
| `inject_slow_response(model, 0.5s)` | AI provider | HTTP timeout, trigger fallback |
| `inject_provider_outage(model)` | AI provider | Provider unavailable |
| `inject_timeout(tool)` | MCP tool | ToolTimeoutError |
| `quarantine_tool(tool)` | MCP tool | ToolQuarantinedError |
| `inject_bad_output()` | LLM output | Invalid YAML on manifest generation |
| `reset_all()` | All | Clear all injections |

---

## 7. Integrasi TrueFoundry

### Tenant & URLs

| Resource | URL |
|---|---|
| Tenant | `adindamochamad.truefoundry.cloud` |
| AI Gateway | `https://gateway.truefoundry.ai/api/llm` |
| MCP Gateway | `https://gateway.truefoundry.ai/adindamochamad/mcp/deaddrop-mcp/server` |
| MCP Server (self-hosted) | `https://deaddrop.adindamochamad.com/mcp` |
| Live Demo | `https://deaddrop.adindamochamad.com` |

### AI Gateway Config

- Client: OpenAI SDK dengan `base_url` ke TFY Gateway
- Guardrail headers: `X-TFY-METADATA` dengan input/output guardrail IDs
- Provider logging: setiap call → `provider_log` table

### MCP Gateway Config

- Client: `langchain-mcp-adapters` via `gateway/tfy_mcp_client.py`
- Server: FastMCP di `gateway/mcp_server.py`, mounted di FastAPI `/mcp`
- Auth: Bearer token (`TRUEFOUNDRY_API_KEY` atau `MCP_SERVER_SECRET`)

### Guardrails Config

- Native: via env `TFY_GUARDRAIL_INPUT_ID`, `TFY_GUARDRAIL_OUTPUT_ID`
- Custom HTTP: `api/guardrail_routes.py` — endpoints `/guardrail/*` untuk TFY dashboard observability
- Startup check di `api/main.py` — warning jika guardrail IDs tidak diset

---

## 8. Database Schema

### Tabel

#### `deployment_jobs` (primary)
| Column | Type | Keterangan |
|---|---|---|
| id | VARCHAR(36) PK | UUID job |
| status | ENUM | pending/analyzing/generating/validating/deploying/done/failed/rollback |
| input_data | JSON | Request payload |
| checkpoint_data | JSON | Resume context |
| retry_count | INT | Retry counter |
| provider_switches | INT | Metric: berapa kali switch provider |
| tool_failures | INT | Metric: tool failures handled |
| guardrails_blocked | INT | Metric: guardrail blocks |
| total_recovery_ms | INT | Total recovery time |

#### `job_state_history`
Audit trail setiap state transition (from_state, to_state, reason).

#### `provider_log`
Setiap LLM call: provider, model, status, latency_ms, tokens_used.

#### `tool_audit_log`
Setiap MCP tool call: tool_name, params, result, status, duration_ms.

#### `guardrails_log`
Setiap guardrail event: rule_name, action (blocked/redacted/validated/flagged).

---

## 9. API Reference

Base URL: `http://localhost:8000/api` (Docker: port 8001)

### Jobs

| Method | Path | Deskripsi |
|---|---|---|
| POST | `/jobs` | Trigger deployment job |
| GET | `/jobs` | List 20 job terbaru |
| GET | `/jobs/{id}` | Detail job + metrics |

### Observability

| Method | Path | Deskripsi |
|---|---|---|
| GET | `/metrics` | Aggregate resilience metrics |
| GET | `/events` | SSE live event stream |

### Demo (requires `DEMO_MODE=true`)

| Method | Path | Deskripsi |
|---|---|---|
| POST | `/scenario` | Run named scenario |
| POST | `/chaos/rate_limit` | Inject provider rate limit |
| POST | `/chaos/slow_response` | Inject provider timeout |
| POST | `/chaos/provider_outage` | Inject provider down |
| POST | `/chaos/tool_timeout` | Inject tool timeout |
| POST | `/chaos/quarantine_tool` | Quarantine a tool |
| POST | `/chaos/bad_output` | Inject invalid YAML |
| POST | `/chaos/reset` | Clear all chaos |

### Other

| Path | Deskripsi |
|---|---|
| `/` | Dashboard HTML |
| `/mcp` | MCP server endpoint |
| `/guardrail/*` | TrueFoundry guardrail HTTP API |

---

## 10. Demo & Chaos Engineering

### Scenario Mapping (Video Script)

| Video Sub-scene | API Scenario | Chaos |
|---|---|---|
| A — Normal deploy | `normal` | None |
| B — Rate limit | `rate_limit` | Claude 429 |
| B2 — Slow response | `slow_response` | Claude timeout 0.5s |
| C — Tool timeout | `tool_timeout` | github_deploy timeout |
| D — Full chaos | `full_chaos` | Outage + quarantine + bad output |

### Cara Menjalankan Demo Lengkap

```bash
# 1. Pastikan DEMO_MODE=true di .env
# 2. Start server
uvicorn api.main:app --port 8000

# 3. Buka dashboard
open http://localhost:8000

# 4. Klik scenario button, atau via API:
curl -X POST http://localhost:8000/api/scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario": "full_chaos"}'

# 5. Amati SSE log di dashboard
# 6. Cek metrics
curl http://localhost:8000/api/metrics
```

### Expected Output (full_chaos)

- `provider_switches` ≥ 1
- `tool_failures` ≥ 1
- `guardrails_blocked` mungkin ≥ 1 (jika bad YAML)
- Final status: `done`
- Resilience chain summary di event log

---

## 11. Testing

### Unit Tests (29 total)

```bash
pytest tests/ -v
```

| Module | Tests | Yang ditest |
|---|---|---|
| `test_circuit_breaker.py` | 8 | State machine CB, threshold, recovery, manual reset |
| `test_guardrails.py` | 13 | Secret redaction, prod block, YAML validation, permissions |
| `test_state_machine.py` | 8 | Valid/invalid transitions, terminal states, rollback |

### Manual E2E Checklist

- [ ] Trigger `normal` scenario → job DONE
- [ ] Trigger `rate_limit` → provider switch visible di log
- [ ] Trigger `full_chaos` → job DONE dengan recovery metrics
- [ ] Kill server mid-job → restart → job resumes
- [ ] Dashboard SSE menampilkan events real-time
- [ ] `/api/metrics` return aggregate data

### Yang Belum Ada

- Integration test otomatis (E2E dengan DB)
- Load test / concurrent jobs
- Test dengan TrueFoundry credentials di CI

---

## 12. Deployment & Infrastruktur

### Local Development

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
docker compose up -d mysql
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

### Docker Compose

| Service | Port | Image |
|---|---|---|
| mysql | 3307→3306 | mysql:8.0 |
| api | 8001→8000 | Custom Dockerfile |

MySQL auto-init dari `db/schema.sql` via docker-entrypoint-initdb.d.

### Production (Live Demo)

- Hosted di `deaddrop.adindamochamad.com`
- MCP server exposed di `/mcp`
- Worker berjalan sebagai background thread di dalam FastAPI process

### Dependencies (`requirements.txt`)

| Package | Versi | Purpose |
|---|---|---|
| fastapi | 0.111.0 | HTTP framework |
| uvicorn | 0.30.1 | ASGI server |
| sqlalchemy | 2.0.30 | ORM |
| pymysql | 1.1.1 | MySQL driver |
| openai | ≥1.30.0 | AI Gateway client |
| langchain-mcp-adapters | ≥0.1.0 | MCP Gateway client |
| fastmcp | ≥2.0.0 | MCP server |
| tenacity | 8.3.0 | Retry utilities |
| sse-starlette | 2.1.0 | SSE streaming |
| pytest | 8.2.2 | Testing |

---

## 13. Video Submission (Remotion)

### Compositions

| ID | Durasi | Resolusi | Purpose |
|---|---|---|---|
| `HackathonDemo` | 3 menit (5400 frames @ 30fps) | 1920×1080 | Submission video |
| `SocialMedia` | 60 detik (1800 frames) | 1080×1920 | Social media cut |

### Scenes (HackathonDemo)

| Scene | File | Durasi | Konten |
|---|---|---|---|
| 00 Hook | `00_Hook.tsx` | 0:00–0:15 | Terminal crash animation |
| 01 Intro | `01_Intro.tsx` | 0:15–0:30 | Logo + tagline |
| 02 Architecture | `02_Architecture.tsx` | 0:30–1:00 | Animated diagram |
| 03 Demo | `03_Demo.tsx` | 1:00–2:15 | Screen recording embed |
| 04 Metrics | `04_Metrics.tsx` | 2:15–2:45 | Resilience dashboard |
| 05 Closing | `05_Closing.tsx` | 2:45–3:00 | CTA + links |

### Status Video

- ✅ Remotion project initialized
- ✅ All scenes coded (neon/glow terminal aesthetic)
- 🟡 Screen recording belum di-embed (`video/public/demo-recording.mp4`)
- 🟡 Final render belum dilakukan
- 🟡 `video/package-lock.json` belum di-commit

### Render Commands

```bash
cd video
npm install
npx remotion studio          # preview
npx remotion render HackathonDemo out/deaddrop-demo.mp4
npx remotion render SocialMedia out/deaddrop-social.mp4
```

---

## 14. Rubrik Penilaian Hackathon

Gunakan rubrik ini saat menilai DeadDrop:

### AI Gateway (25%)

| Aspek | Implementasi | Skor |
|---|---|---|
| Multi-provider routing | 3 providers dengan priority chain | ✅ |
| Fallback otomatis | Rate limit/timeout/outage → next provider | ✅ |
| Circuit breaker | Per-provider, custom impl, visible di log | ✅ |
| Observability | provider_log table, latency tracking | ✅ |
| **Verifikasi** | Jalankan `rate_limit` scenario, cek provider_switches | |

### MCP Gateway (25%)

| Aspek | Implementasi | Skor |
|---|---|---|
| Tools terdaftar | validator, github_deploy, notifier | ✅ |
| Scoped permissions | `permissions.py` — prod block | ✅ |
| Audit trail | `tool_audit_log` di MySQL | ✅ |
| Tool health + fallback | Quarantine, timeout, github_deploy → notifier | ✅ |
| **Verifikasi** | Jalankan `tool_timeout` scenario, cek tool_audit_log | |

### Guardrails (20%)

| Aspek | Implementasi | Skor |
|---|---|---|
| Native TFY guardrails | secrets, injection, PII | ✅ |
| Local guardrails | YAML validation, prod block, redact | ✅ |
| Pre-tool validation | `validate_tool_args()` sebelum setiap tool call | ✅ |
| Rollback on bad output | VALIDATING → GENERATING rollback | ✅ |
| **Verifikasi** | Jalankan `full_chaos`, cek guardrails_blocked metric | |

### Resilience (20%)

| Aspek | Implementasi | Skor |
|---|---|---|
| 6 failure modes | Semua covered via chaos injector | ✅ |
| State persistence | MySQL checkpoint + worker resume | ✅ |
| Exponential backoff | Full jitter, max 3 retries | ✅ |
| Graceful degradation | Tool fallback, provider fallback | ✅ |
| **Verifikasi** | Kill process mid-job, restart, cek resume | |

### Usefulness & Demo (10%)

| Aspek | Implementasi | Skor |
|---|---|---|
| Real-world scenario | Backend engineer 2am deploy | ✅ |
| Demo clarity | One-click scenarios, SSE log, resilience summary | ✅ |
| Dashboard | Modern UI, live metrics | ✅ |
| **Verifikasi** | Buka dashboard, jalankan semua 5 scenarios | |

---

## 15. Known Issues & Technical Debt

| # | Issue | Severity | Workaround |
|---|---|---|---|
| 1 | `github_deploy` adalah mock (tulis ke file lokal) | Low | By design untuk hackathon |
| 2 | Worker dan API dalam satu process (thread) | Low | Cukup untuk demo scale |
| 3 | SSE event bus in-memory (hilang saat restart) | Low | Job state tetap di MySQL |
| 4 | Tidak ada auth di REST API | Medium | Demo/public deployment |
| 5 | `video/package-lock.json` untracked | Low | Commit sebelum submit |
| 6 | Screen recording belum ada di Remotion | Medium | Rekam dashboard demo |
| 7 | Stub mode tanpa TFY credentials | Low | Warning di startup, chaos tetap jalan |
| 8 | Race condition di scenario (fixed di commit 90e49ed) | Fixed | — |

---

## 16. Git History & Changelog

```
8d7e3cf feat(video): redesign Remotion video — neon/glow terminal aesthetic
90e49ed fix: scenario race condition + TrueFoundry guardrail observability
479d676 fix: TFY MCP Gateway result unwrapping + *** redaction sanitization
3aae3fc docs: update README with live TrueFoundry MCP + Guardrails setup
cde4bbe feat: expose TrueFoundry-compatible guardrail server endpoints
b9a1dc6 feat: connect to TrueFoundry MCP Gateway — 3 tools live
4ba42ba feat: expose DeadDrop tools as live MCP server at /mcp
f4bcd95 feat: complete TrueFoundry native integration + guardrails hardening
3fbedc5 redesign: overhaul dashboard UI with Vercel/Railway/Logtail aesthetic
27eece3 feat: complete resilience layer with all 6 failure modes covered
17144ef Initial commit: DeadDrop deployment orchestration agent
```

### Timeline Development

| Hari | Tanggal | Milestone |
|---|---|---|
| 1 | 2 Juni | Initial commit, project structure |
| 2 | 3 Juni | Resilience layer (6 failure modes) |
| 3 | 4 Juni | Dashboard redesign, TrueFoundry integration |
| 4 | 5 Juni | MCP Gateway live, guardrails, bug fixes, video redesign |
| 5 | 6 Juni | *(planned)* Video render + polish |
| 6 | 7 Juni | *(planned)* Submit hackathon |

---

## Lampiran: Prompt untuk Agent Evaluator

Copy-paste ini saat memulai sesi evaluasi:

```
Kamu adalah evaluator teknis untuk project DeadDrop (hackathon TrueFoundry Resilient Agents).

Baca dalam urutan:
1. PROJECT_SUMMARY.md — status & skor
2. PROJECT_DETAIL.md — detail teknis (dokumen ini)
3. Jalankan verifikasi: pytest + minimal 1 chaos scenario

Nilai berdasarkan rubrik di section 14 PROJECT_DETAIL.md.
Berikan skor 1-10 per kriteria + temuan spesifik dengan referensi file:line.
Identifikasi blocker untuk submission (deadline 7 Juni 2026).
```
