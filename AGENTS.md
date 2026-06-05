# AGENTS.md — Panduan untuk Agent AI

> File ini adalah titik masuk untuk agent AI (Cursor, Claude, dll.) yang perlu memahami atau menilai project DeadDrop.

---

## Baca Ini Dulu

| Prioritas | Dokumen | Kapan dibaca |
|---|---|---|
| 1 | [`PROJECT_SUMMARY.md`](./PROJECT_SUMMARY.md) | Evaluasi cepat, status, skor implementasi |
| 2 | [`PROJECT_DETAIL.md`](./PROJECT_DETAIL.md) | Review teknis mendalam, file map, API, DB schema |
| 3 | [`DEADDROP_MASTER_CONTEXT.md`](./DEADDROP_MASTER_CONTEXT.md) | Konteks hackathon, demo script, daily todolist |
| 4 | [`README.md`](./README.md) | Dokumentasi publik (English) |

---

## Konteks Project

**DeadDrop** adalah deployment orchestration agent untuk hackathon TrueFoundry Resilient Agents. Agent memproses deployment job melalui pipeline LLM + MCP tools, dengan mekanisme resiliensi: multi-provider fallback, circuit breaker, guardrails, checkpoint MySQL, dan chaos injection untuk demo.

**Stack:** Python 3.11, FastAPI, SQLAlchemy, MySQL, TrueFoundry AI/MCP Gateway, Remotion (video).

---

## Aturan Saat Bekerja di Repo Ini

1. **Prioritas:** working code > demo clarity > polish
2. **Jangan ubah** credentials di `.env` — file ini tidak di-commit
3. **Chaos injector** (`demo/chaos_injector.py`) hanya aktif saat `DEMO_MODE=true`
4. **Mock tools** (`tools/github_deploy.py`) sengaja tidak push ke GitHub asli — ini by design untuk hackathon
5. **State machine** di `agent/state_machine.py` adalah kontrak — jangan ubah transisi tanpa update tests
6. **Variabel/komentar baru** dalam kode Python: gunakan **bahasa Indonesia** (konvensi tim)

---

## Entry Points Kode

```
api/main.py          → FastAPI app, lifespan, worker thread
worker.py            → Background job poller
agent/orchestrator.py → Main agent loop (MULAI DI SINI untuk memahami flow)
gateway/ai_gateway.py → LLM calls + fallback chain
gateway/mcp_gateway.py → Tool calls + quarantine
demo/chaos_injector.py → Failure injection untuk demo
api/dashboard.html   → Live dashboard UI
```

---

## Perintah Umum

```bash
# Dev server (2 terminals)
uvicorn api.main:app --host 0.0.0.0 --port 8000
python worker.py

# Docker full stack (api + worker)
docker compose up -d

# Logging: from utils.logger import get_logger
# Tests (37 total: unit + integration + validator)
pytest tests/ -v
pytest tests/test_integration_chaos.py -v   # E2E resilience proof

# Trigger job
curl -X POST http://localhost:8000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"service":"payment-service","version":"v2.4.1","target_env":"staging","replicas":3}'

# Demo scenario
curl -X POST http://localhost:8000/api/scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario": "full_chaos"}'
```

---

## Tugas Evaluasi yang Umum

### Menilai kelengkapan hackathon
→ Baca `PROJECT_SUMMARY.md` section "Skor Implementasi", lalu verifikasi dengan menjalankan scenario API.

### Review arsitektur resiliensi
→ Baca `PROJECT_DETAIL.md` section 4–6, lalu trace `agent/orchestrator.py` + `gateway/ai_gateway.py`.

### Mencari bug
→ Cek `demo/chaos_injector.py` interaction dengan orchestrator; jalankan `full_chaos` scenario.

### Menyiapkan video submission
→ Lihat `video/src/` dan `DEADDROP_MASTER_CONTEXT.md` section 9 (Remotion).

### Menulis PR / commit
→ Ikuti gaya commit existing: `feat:`, `fix:`, `docs:` prefix.

---

## Environment Variables Penting

Lihat `.env.example`. Yang wajib untuk mode production:

- `TRUEFOUNDRY_API_KEY`, `TRUEFOUNDRY_TENANT_URL` — AI Gateway
- `TFY_MCP_GATEWAY_URL`, `TFY_MCP_GATEWAY_KEY` — MCP Gateway
- `TFY_GUARDRAIL_INPUT_ID`, `TFY_GUARDRAIL_OUTPUT_ID` — Native guardrails
- `MYSQL_*` — Database
- `DEMO_MODE=true` — Enable chaos/scenario endpoints

---

## Status Hari Ini (5 Juni 2026)

- ✅ Core agent + resilience layer selesai
- ✅ Dashboard + chaos injector + scenarios
- ✅ TrueFoundry MCP + Guardrails terintegrasi
- 🟡 Remotion video — scenes ada, perlu render final
- 🟡 Submission form hackathon — belum diisi (deadline 7 Juni)
