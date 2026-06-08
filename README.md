# DeadDrop — Resilient Deployment Agent

> 🎥 **WATCH VIDEO FIRST** (2 min): [DeadDrop Demo — YouTube](https://youtu.be/9vugLt3eyJA)  
> Judges: Start here before reading technical details.

> **"Infrastructure dies. Your agent doesn't."**

**Live Demo:** [deaddrop.adindamochamad.com](https://deaddrop.adindamochamad.com)  
**Health:** [deaddrop.adindamochamad.com/health](https://deaddrop.adindamochamad.com/health)  
**Submission pack:** [docs/HACKATHON_SUBMISSION_EN.md](docs/HACKATHON_SUBMISSION_EN.md)

![DeadDrop dashboard](docs/screenshots/dashboard-overview.png)

## What is this?

Deployment agent that **survives infrastructure failures**:

- **Provider rate limit** → automatic fallback (Claude → Mistral → Llama)
- **Tool timeout** → graceful degradation (deploy → notifier)
- **Process crash** → resume from MySQL checkpoint

Built on **TrueFoundry AI Gateway**, **MCP Gateway**, and **Guardrails** with AWS Bedrock.

## Try it now (2 minutes)

1. Open **[live demo](https://deaddrop.adindamochamad.com)** — follow the **Quick Demo** panel at the top
2. Click **"B — Rate Limit"** — watch provider switch in the live log (2–3 seconds)
3. Click **"C — Tool Timeout"** — deploy degrades to notifier; job still finishes **DONE**

```bash
pytest tests/test_integration_chaos.py -v   # 3 E2E resilience tests
curl -sf https://deaddrop.adindamochamad.com/health   # checks MySQL + TrueFoundry deps
```

## Running Locally

```bash
# Terminal 1: API server
uvicorn api.main:app --host 0.0.0.0 --port 8000

# Terminal 2: Worker process (required — jobs won't run without this)
python worker.py --poll-interval 3
```

Docker: `docker compose up -d` starts mysql + api + worker together.

## How it works

| Mechanism | What it does |
|---|---|
| **Circuit breaker** | Per-provider CLOSED → OPEN → HALF_OPEN |
| **AI Gateway fallback** | 3-model chain; auto-switch on 429 / timeout / outage |
| **MCP tool health** | Quarantine + fallback; audit log per call |
| **Guardrails** | TrueFoundry native + local YAML/permission checks |
| **MySQL checkpoints** | State saved every step — resume after crash |

## Screenshots

| Overview | Rate limit | Metrics |
|---|---|---|
| ![Overview](docs/screenshots/dashboard-overview.png) | ![Rate limit](docs/screenshots/dashboard-rate-limit.png) | ![Metrics](docs/screenshots/dashboard-metrics.png) |

Scenario buttons inject **controlled** failures for a reproducible demo. Production uses the **same TrueFoundry fallback chain** on real 429s and timeouts.

---

**For technical details, see [ARCHITECTURE.md](ARCHITECTURE.md)** — setup, API reference, TrueFoundry config, project structure.

**Built by:** Panca (solo project, 4 days)  
**Stack:** Python, FastAPI, MySQL, TrueFoundry AI/MCP Gateway  
**GitHub:** [github.com/adindamochamad/deaddrop](https://github.com/adindamochamad/deaddrop)

## License

MIT
