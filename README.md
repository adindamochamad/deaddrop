# DeadDrop

> **"Infrastructure dies. Your agent doesn't."**

DeadDrop is a deployment orchestration agent built to survive infrastructure failures. When your LLM provider rate-limits, when a deployment tool hangs, when the model returns garbage — DeadDrop keeps going.

Built for the **[Resilient Agents Online Hackathon](https://www.builderbase.com/v2/event/resilient-agents-online-hackathon) — TrueFoundry × AWS Bedrock**.

**Live Demo:** [deaddrop.adindamochamad.com](https://deaddrop.adindamochamad.com)

---

## The Problem

```
2:00 AM — deployment deadline.
Engineer triggers the agent.
Bedrock throttles. Agent crashes.
Deployment stops. Manual rollback.
5 hours of engineer time lost.
```

Every LLM-powered deployment pipeline has a single point of failure: the LLM itself. Rate limits, provider outages, slow responses, bad outputs — any one of them kills the job.

## The Solution

DeadDrop treats infrastructure failures as expected events, not exceptions:

| Failure | DeadDrop Response |
|---|---|
| Provider rate limit | Switch to next provider in fallback chain |
| Provider outage | Circuit breaker trips, route around it |
| Slow response | Forced timeout + immediate provider switch |
| Tool timeout | Quarantine tool, use backup |
| Bad LLM output | Guardrail catches it, rollback to previous step |
| Agent crash | Resume from last MySQL checkpoint |
| Cascading failures | Handle each independently, job still finishes |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        DeadDrop Agent                        │
│                                                              │
│   PENDING → ANALYZING → GENERATING → VALIDATING → DEPLOYING │
│                ↓              ↓             ↓            ↓   │
│             RETRY           RETRY         RETRY       ROLLBACK│
│                └──────────────────────────────────→ FAILED  │
├─────────────────────────────────────────────────────────────┤
│  TrueFoundry AI Gateway                                     │
│  Claude Sonnet 4.6 → Mistral Large → Llama 3.1 70B          │
│  Per-provider circuit breaker · Latency tracking            │
├─────────────────────────────────────────────────────────────┤
│  TrueFoundry MCP Gateway                                    │
│  github_deploy · validator · notifier                       │
│  Scoped permissions · Tool health check · Audit log         │
├─────────────────────────────────────────────────────────────┤
│  TrueFoundry Guardrails                                     │
│  Redact API keys · Block prod without approval · YAML check │
├─────────────────────────────────────────────────────────────┤
│  MySQL Checkpoints                                          │
│  State persisted after every step — crash-safe resume       │
└─────────────────────────────────────────────────────────────┘
```

---

## Resilience Mechanisms

### 1. Multi-Provider Fallback (AI Gateway)
Three providers in priority order. The gateway routes automatically:
```
Claude Sonnet 4.6  →  Mistral Large  →  Llama 3.1 70B
```
Each has its own circuit breaker. A tripped breaker on one provider never blocks the others.

### 2. Circuit Breaker (per provider)
```
CLOSED → (3 failures) → OPEN → (30s) → HALF_OPEN → (1 success) → CLOSED
```
Implemented from scratch without external libraries — visible in demo logs.

### 3. State Checkpoints (MySQL)
Every state transition is persisted. If the agent process crashes mid-job, the worker picks it up and resumes from the last saved state — not from the beginning.

```sql
deployment_jobs: id, status, checkpoint_data (JSON), retry_count,
                 provider_switches, tool_failures, guardrails_blocked, total_recovery_ms
```

### 4. MCP Tool Health + Graceful Degradation
Before every tool call, the MCP Gateway checks tool health. If `github_deploy` is unavailable, it degrades gracefully to `notifier` and logs the fallback in the audit trail.

### 5. Guardrails Pipeline
```
LLM Input  → [redact API keys]         → LLM
LLM Output → [validate YAML syntax]    → Tool
Tool Call  → [check env permissions]   → Execution
```
If guardrails catch a bad manifest in VALIDATING, the agent rolls back to GENERATING and regenerates — it doesn't just fail.

### 6. Slow Response Timeout
Providers that hang trigger a forced timeout. The agent doesn't wait — it switches immediately.

---

## Demo Scenarios

The dashboard includes one-click scenario buttons that inject real failures mid-job:

| Scenario | Chaos Injected | What You See |
|---|---|---|
| **A — Normal** | None | Clean run: PENDING → DONE |
| **B — Rate Limit** | Claude Sonnet 429 | Provider switch → Mistral, recovery time logged |
| **B2 — Slow Response** | Forced timeout (0.5s) | Timeout → switch → recovery |
| **C — Tool Timeout** | `github_deploy` timeout | Fallback to notifier, `tool_failures` counter |
| **D — Full Chaos** | Outage + quarantine + bad output | Cascading: 3 failures, all handled, job still DONE |

Every job ends with a **Resilience Chain summary** in the live log:
```
✓ Resilience chain: 2 provider switch(es) | 1 tool failure(s) handled | 1 guardrail block(s) | recovered in 11.4s
✅ Job abc12345 — DONE
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- MySQL 8.0 (or Docker)
- TrueFoundry account with AI Gateway configured

### Setup

```bash
git clone https://github.com/adindamochamad/deaddrop
cd deaddrop

# Create virtual environment
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Fill in: TRUEFOUNDRY_API_KEY, AWS credentials, MySQL credentials
```

### Database

```bash
# Using Docker
docker compose up -d mysql

# Or use existing MySQL
mysql -u root -e "
  CREATE DATABASE IF NOT EXISTS deaddrop;
  CREATE USER IF NOT EXISTS 'deaddrop'@'localhost' IDENTIFIED BY 'your_password';
  GRANT ALL PRIVILEGES ON deaddrop.* TO 'deaddrop'@'localhost';
"
mysql -u deaddrop -p deaddrop < db/schema.sql
```

### Run

```bash
# Start API server (includes background worker)
uvicorn api.main:app --host 0.0.0.0 --port 8000

# Dashboard
open http://localhost:8000
```

### Docker Compose (full stack)

```bash
docker compose up -d
open http://localhost:8001
```

---

## API Reference

```
POST /api/jobs                    Trigger a deployment job
GET  /api/jobs                    List recent jobs
GET  /api/jobs/{id}               Get job status + metrics
GET  /api/metrics                 Aggregate resilience metrics
GET  /api/events                  SSE live event stream (dashboard)

# Scenario shortcuts (DEMO_MODE=true)
POST /api/scenario                Run a named scenario (normal/rate_limit/slow_response/tool_timeout/full_chaos)

# Chaos injection (DEMO_MODE=true)
POST /api/chaos/rate_limit        Inject 429 on a provider
POST /api/chaos/slow_response     Force provider timeout
POST /api/chaos/provider_outage   Simulate provider down
POST /api/chaos/tool_timeout      Timeout a specific tool
POST /api/chaos/quarantine_tool   Quarantine a tool
POST /api/chaos/bad_output        LLM returns invalid YAML (one-shot)
POST /api/chaos/reset             Clear all injected failures
```

### Trigger a job

```bash
curl -X POST https://deaddrop.adindamochamad.com/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "service": "payment-service",
    "version": "v2.4.1",
    "target_env": "staging",
    "replicas": 3
  }'
```

### Run a demo scenario

```bash
# Rate limit → fallback
curl -X POST https://deaddrop.adindamochamad.com/api/scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario": "rate_limit"}'

# Full chaos (cascading failures)
curl -X POST https://deaddrop.adindamochamad.com/api/scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario": "full_chaos"}'
```

---

## Project Structure

```
deaddrop/
├── agent/
│   ├── orchestrator.py       # Main agent loop, step handlers, retry logic
│   ├── state_machine.py      # Job state: PENDING → ANALYZING → ... → DONE
│   ├── circuit_breaker.py    # CLOSED/OPEN/HALF_OPEN per provider
│   └── checkpoint.py         # MySQL state persistence + resume
├── gateway/
│   ├── ai_gateway.py         # TrueFoundry AI Gateway client, fallback chain
│   ├── mcp_gateway.py        # MCP Gateway client, tool health, audit log
│   ├── mcp_server.py         # FastMCP server — exposes tools at /mcp (registered in TrueFoundry)
│   ├── tfy_mcp_client.py     # TrueFoundry MCP Gateway client (langchain-mcp-adapters)
│   ├── guardrails.py         # Local guardrail layer: redact, validate YAML, inspect tool results
│   └── permissions.py        # Scoped permissions per tool
├── api/
│   ├── guardrail_routes.py   # TrueFoundry-compatible guardrail HTTP endpoints (/guardrail/*)
├── tools/
│   ├── github_deploy.py      # Deploy tool (mock: writes locally)
│   ├── validator.py          # YAML/JSON manifest validation
│   └── notifier.py           # Alert tool (mock: logs to console)
├── db/
│   ├── models.py             # SQLAlchemy models (5 tables)
│   └── schema.sql            # Raw SQL schema
├── api/
│   ├── main.py               # FastAPI app + background worker
│   ├── routes.py             # REST endpoints + chaos + scenarios
│   └── dashboard.html        # Live dashboard (SSE + polling)
├── demo/
│   ├── chaos_injector.py     # Injects failures into running system
│   └── scenarios.py          # Named demo scenarios (A/B/B2/C/D)
├── tests/                    # 29 unit tests (circuit breaker, guardrails, state machine)
├── video/                    # Remotion submission video (Day 5)
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

---

## Judging Criteria Coverage

| Criteria | Implementation |
|---|---|
| **AI Gateway** | 3-provider routing chain, per-provider circuit breakers, latency + token tracking, provider switch counter |
| **MCP Gateway** | 3 tools live at `gateway.truefoundry.ai/adindamochamad/mcp/deaddrop-mcp/server`, scoped permissions, Bearer auth, audit log in MySQL, tool quarantine + fallback |
| **Guardrails** | TrueFoundry native: Secrets Detection (MUTATE), Prompt Injection (VALIDATE), PII/PHI (MUTATE) — applied to all LLM input/output. Local layer: YAML validation pre-tool, tool result inspection, production deploy block |
| **Resilience** | 6 failure modes covered, state checkpoints, exponential backoff, graceful degradation |
| **Usefulness** | Backend engineer deploying at 2am — concrete, real scenario |
| **Demo clarity** | One-click scenarios, SSE live log, resilience chain summary per job |

---

## TrueFoundry Setup

**Tenant:** `adindamochamad.truefoundry.cloud`
**AI Gateway URL:** `https://gateway.truefoundry.ai`

### AI Gateway — Provider chain (AWS Bedrock)
| Priority | Model | Role |
|---|---|---|
| 1 (Primary) | `aws-bedrock1/global.anthropic.claude-sonnet-4-6` | Claude Sonnet 4.6 |
| 2 (Fallback) | `aws-bedrock1/mistral.mistral-large-3-675b-instruct` | Mistral Large |
| 3 (Fallback) | `aws-bedrock1/us.meta.llama3-1-70b-instruct-v1-0` | Llama 3.1 70B |

Each provider has an independent circuit breaker (threshold: 3 failures, recovery: 30s).

### MCP Gateway — 3 tools live
**Gateway URL:** `https://gateway.truefoundry.ai/adindamochamad/mcp/deaddrop-mcp/server`

| Tool | Description | Auth |
|---|---|---|
| `validator` | Validates Kubernetes manifests (YAML/JSON) | Bearer token |
| `github_deploy` | Deploys config to target environment | Bearer token + env approval |
| `notifier` | Sends deployment alerts | Bearer token |

MCP Server exposed at: `https://deaddrop.adindamochamad.com/mcp`

### Guardrails — native TrueFoundry (group: `deaddrop-guardrails`)
| Guardrail | Mode | Scope | What it does |
|---|---|---|---|
| `secrets-detection` | MUTATE | LLM Input + Output | Redacts AWS keys, API keys, JWT tokens → `[REDACTED]` |
| `prompt-injection` | VALIDATE | LLM Input | Blocks jailbreak and injection attempts |
| `pii-phi-detection` | MUTATE | LLM Input + Output | Masks SSN, credit cards, email addresses |

Policy `guardrails-config` applies to all LLM calls automatically.

**Additional local guardrail layer:**
- YAML/JSON syntax validation before every tool call
- Tool result inspection (prompt injection detection in tool output)
- Production environment block (requires `approved=true`)

---

## License

MIT
