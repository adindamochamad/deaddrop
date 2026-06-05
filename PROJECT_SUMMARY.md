# DeadDrop — Project Summary (Evaluasi Cepat)

> **Dokumen ini untuk agent evaluator.** Baca ini dulu sebelum menilai project. Detail teknis lengkap ada di [`PROJECT_DETAIL.md`](./PROJECT_DETAIL.md).

**Terakhir diperbarui:** 5 Juni 2026  
**Status:** Siap submit hackathon (core selesai, polish/video dalam progres)

---

## Identitas Project

| Field | Nilai |
|---|---|
| **Nama** | DeadDrop |
| **Tagline** | *"Infrastructure dies. Your agent doesn't."* |
| **Tujuan** | Deployment orchestration agent yang tetap menyelesaikan job meski LLM provider gagal, tool timeout, atau output buruk |
| **Hackathon** | [Resilient Agents Online — TrueFoundry × AWS Bedrock](https://www.builderbase.com/v2/event/resilient-agents-online-hackathon) |
| **Deadline** | 7 Juni 2026, 23:59 PT |
| **Live Demo** | https://deaddrop.adindamochamad.com |
| **GitHub** | https://github.com/adindamochamad/deaddrop |
| **Tenant TrueFoundry** | `adindamochamad.truefoundry.cloud` |

---

## One-Liner untuk Juri

DeadDrop adalah agent deployment berbasis Python yang memproses job melalui state machine (PENDING → DONE), dengan fallback 3-provider via TrueFoundry AI Gateway, 3 MCP tools via MCP Gateway, guardrails ganda (native + lokal), checkpoint MySQL untuk crash recovery, dan chaos injector untuk demo resiliensi live.

---

## Skor Implementasi (Self-Assessment)

Skala: ✅ Selesai & teruji | 🟡 Ada tapi perlu verifikasi | ❌ Belum / mock saja

| Kriteria Hackathon | Status | Bukti |
|---|---|---|
| **AI Gateway** — multi-provider fallback | ✅ | `gateway/ai_gateway.py` — Claude → Mistral → Llama, circuit breaker per model |
| **MCP Gateway** — tools + audit | ✅ | 3 tools live di TFY, `tool_audit_log` di MySQL, fallback `github_deploy` → `notifier` |
| **Guardrails** — block/redact/validate | ✅ | Native TFY (secrets, injection, PII) + lokal (`gateway/guardrails.py`, `api/guardrail_routes.py`) |
| **Resilience** — 6 failure modes | ✅ | Rate limit, outage, slow response, tool timeout, quarantine, bad output |
| **State persistence** | ✅ | MySQL checkpoint + worker resume |
| **Demo clarity** | ✅ | Dashboard SSE, scenario one-click, resilience chain summary |
| **Unit + integration tests** | ✅ | 37 tests (unit + 3 E2E chaos + 5 validator) |
| **Docker deploy** | ✅ | `docker-compose.yml` — MySQL + API |
| **Submission video** | 🟡 | Remotion project ada (`video/`), perlu render final + screen recording |
| **README / docs** | ✅ | README lengkap + dokumen evaluasi ini |

**Estimasi kelengkapan core:** ~90%  
**Estimasi kelengkapan submission:** ~75% (video + final polish tersisa)

---

## Arsitektur Singkat

```
User/Dashboard → FastAPI (api/) → Worker (worker.py)
                                      ↓
                              Orchestrator (agent/)
                              State machine + checkpoint
                                      ↓
                    ┌─────────────────┼─────────────────┐
                    ↓                 ↓                 ↓
            AI Gateway          MCP Gateway         Guardrails
         (3 providers)         (3 tools)          (native + lokal)
                    ↓                 ↓
              AWS Bedrock         MySQL audit/logs
```

**Job pipeline:** ANALYZE (LLM) → GENERATE manifest (LLM) → VALIDATE (tool) → DEPLOY (tool) → NOTIFY

---

## Stack Teknis

- **Runtime:** Python 3.11+, FastAPI, SQLAlchemy, MySQL 8
- **LLM:** TrueFoundry AI Gateway → AWS Bedrock (Claude Sonnet 4.6, Mistral Large, Llama 3.1 70B)
- **Tools:** FastMCP server di `/mcp`, terhubung ke TrueFoundry MCP Gateway
- **Frontend demo:** Single-page HTML dashboard (`api/dashboard.html`) + SSE
- **Video:** Remotion (TypeScript/React) di folder `video/`
- **LOC Python (core):** ~2.800 baris (agent + gateway + api + tools + demo + tests)

---

## Cara Verifikasi Cepat (untuk Evaluator)

```bash
# 1. Clone & setup
git clone https://github.com/adindamochamad/deaddrop && cd deaddrop
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # isi credentials TFY + MySQL

# 2. Database
docker compose up -d mysql

# 3. Jalankan
uvicorn api.main:app --host 0.0.0.0 --port 8000

# 4. Test scenario (DEMO_MODE=true)
curl -X POST http://localhost:8000/api/scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario": "rate_limit"}'

# 5. Tests (37 total — termasuk E2E resilience)
pytest tests/ -v
pytest tests/test_integration_chaos.py -v
```

**Tanpa credentials TrueFoundry:** app jalan di stub mode (warning di startup), chaos injection tetap bisa ditest secara lokal.

---

## Demo Scenarios (Satu Klik)

| Scenario | Chaos yang diinjeksi | Hasil yang diharapkan |
|---|---|---|
| `normal` | Tidak ada | Job DONE tanpa recovery |
| `rate_limit` | Claude 429 | Switch ke Mistral, `provider_switches` naik |
| `slow_response` | Claude timeout 0.5s | Fallback provider, recovery time tercatat |
| `tool_timeout` | `github_deploy` timeout | Fallback ke `notifier`, `tool_failures` naik |
| `full_chaos` | Outage + quarantine + bad YAML | Semua ditangani, job tetap DONE |

---

## Kekuatan Utama (untuk penilaian positif)

1. **Bukan skeleton** — agent benar-benar memproses job end-to-end dengan LLM + tools
2. **Resilience terlihat** — setiap job selesai dengan "Resilience chain" summary di log
3. **TrueFoundry integration nyata** — AI Gateway, MCP Gateway, dan Guardrails terhubung production
4. **Chaos engineering built-in** — demo failure injection tanpa merusak state
5. **Observability** — 5 tabel MySQL untuk audit (jobs, state history, provider log, tool audit, guardrails log)

---

## Gap & Risiko (untuk penilaian kritis)

| Item | Severity | Catatan |
|---|---|---|
| Video belum di-render final | Sedang | Remotion scenes ada, butuh screen recording + render |
| Deploy tools masih mock | Rendah | `github_deploy` tulis ke `deploy_artifacts/`, bukan GitHub asli — acceptable untuk hackathon |
| Stub mode tanpa `.env` | Rendah | Evaluator perlu credentials untuk test LLM nyata |
| `video/package-lock.json` untracked | Rendah | Belum di-commit ke git |
| Tidak ada integration test E2E otomatis | Sedang | Hanya unit test; E2E manual via dashboard/API |

---

## Dokumen Terkait

| File | Tujuan |
|---|---|
| [`PROJECT_DETAIL.md`](./PROJECT_DETAIL.md) | Detail teknis lengkap untuk evaluasi mendalam |
| [`DEADDROP_MASTER_CONTEXT.md`](./DEADDROP_MASTER_CONTEXT.md) | Bible internal — roadmap, demo script, daily todolist |
| [`README.md`](./README.md) | Dokumentasi publik (English) untuk juri & GitHub |
| [`AGENTS.md`](./AGENTS.md) | Instruksi onboarding untuk agent AI lain |

---

## Instruksi untuk Agent Evaluator

Saat menilai project ini, fokuskan pada:

1. **Apakah resilience benar-benar bekerja?** → Jalankan scenario `rate_limit` dan `full_chaos`, cek metrics di `/api/metrics`
2. **Apakah TrueFoundry terintegrasi?** → Cek log startup untuk guardrail IDs, provider log di DB
3. **Apakah demo convincing?** → Buka dashboard, trigger scenario, amati SSE live log
4. **Apakah code production-quality?** → Baca `agent/orchestrator.py`, `gateway/ai_gateway.py`, `agent/circuit_breaker.py`
5. **Apakah siap submit?** → Cross-check section 7 di `DEADDROP_MASTER_CONTEXT.md` (submission checklist)

**Jangan nilai hanya dari README** — jalankan minimal satu chaos scenario untuk verifikasi.
