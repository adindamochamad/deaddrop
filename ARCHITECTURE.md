# DeadDrop — Architecture & Technical Reference

> Full technical documentation. For a quick judge overview, see [README.md](README.md).

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

The dashboard includes one-click scenario buttons. Each button resets chaos, injects the scenario's failures, then starts a job — failures hit the **same code paths** as production (gateway fallback, MCP degradation, guardrails).

**Framing for judges:** say "deploy tool with notifier fallback," not "mock deploy." Counters (`provider_switches`, `guardrails_blocked`, `total_recovery_ms`) and `provider_log` rows are the **audit trail**.

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

python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Fill in: TRUEFOUNDRY_API_KEY, AWS credentials, MySQL credentials
```

### Database

```bash
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
uvicorn api.main:app --host 0.0.0.0 --port 8000
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

POST /api/scenario                Run a named scenario (DEMO_MODE=true)
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
  -d '{"service":"payment-service","version":"v2.4.1","target_env":"staging","replicas":3}'
```

### Run a demo scenario

```bash
curl -X POST https://deaddrop.adindamochamad.com/api/scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario": "rate_limit"}'
```

---

## Manifest Validation

Generated manifests are validated in two stages:

1. **YAML syntax** — `yaml.safe_load_all()` parses multi-document manifests
2. **K8s schema** — `kubectl apply --dry-run=client` (when `kubectl` is installed)

If `kubectl` is not available, validation falls back to YAML syntax only (`k8s_valid: null`).

```bash
pytest tests/test_validator.py -v
```

---

## Scope & Limitations

### Mock Deployments

The `github_deploy` tool writes manifests to the local `deploy_artifacts/` directory instead of pushing to an actual GitHub repository or Kubernetes cluster.

**Rationale:**
- Isolate resilience testing from deployment complexity
- Demonstrate state machine + chaos engineering without external dependencies
- Hackathon scope (4 days) — production would integrate GitHub API, `kubectl apply`/ArgoCD, Slack/PagerDuty

### Integration Tests

```bash
pytest tests/test_integration_chaos.py -v
```

Three E2E tests prove provider fallback, tool timeout degradation, and cascading chaos recovery.

---

## Project Structure

```
deaddrop/
├── agent/          # orchestrator, state machine, circuit breaker, checkpoint
├── gateway/        # AI Gateway, MCP Gateway, guardrails
├── tools/          # validator, github_deploy, notifier
├── api/            # FastAPI, dashboard, routes
├── demo/           # chaos_injector, scenarios
├── db/             # models, schema.sql
├── tests/          # 37 tests (unit + integration + validator)
└── video/          # Remotion submission video
```

---

## Judging Criteria Coverage

| Criteria | Implementation |
|---|---|
| **AI Gateway** | 3-provider routing chain, per-provider circuit breakers, latency + token tracking |
| **MCP Gateway** | 3 tools live, scoped permissions, audit log, tool quarantine + fallback |
| **Guardrails** | TrueFoundry native + local YAML validation, prod deploy block |
| **Resilience** | 6 failure modes, state checkpoints, exponential backoff |
| **Usefulness** | 2 AM deploy engineer; deploy→notifier maps to CI/CD + Slack |
| **Demo clarity** | One-click scenarios, SSE live log, audit counters |

---

## TrueFoundry Setup

**Tenant:** `adindamochamad.truefoundry.cloud`  
**AI Gateway URL:** `https://gateway.truefoundry.ai`

### AI Gateway — Provider chain (AWS Bedrock)

| Priority | Model | Role |
|---|---|---|
| 1 | `aws-bedrock1/global.anthropic.claude-sonnet-4-6` | Claude Sonnet 4.6 |
| 2 | `aws-bedrock1/mistral.mistral-large-3-675b-instruct` | Mistral Large |
| 3 | `aws-bedrock1/us.meta.llama3-1-70b-instruct-v1-0` | Llama 3.1 70B |

### MCP Gateway — 3 tools live

**Gateway URL:** `https://gateway.truefoundry.ai/adindamochamad/mcp/deaddrop-mcp/server`  
**MCP Server:** `https://deaddrop.adindamochamad.com/mcp`

| Tool | Description |
|---|---|
| `validator` | Validates Kubernetes manifests (YAML/JSON) |
| `github_deploy` | Deploys config to target environment |
| `notifier` | Sends deployment alerts |

### Guardrails — native TrueFoundry (group: `deaddrop-guardrails`)

| Guardrail | Mode | Scope |
|---|---|---|
| `secrets-detection` | MUTATE | LLM Input + Output |
| `prompt-injection` | VALIDATE | LLM Input |
| `pii-phi-detection` | MUTATE | LLM Input + Output |

**Additional local guardrail layer:** YAML validation, tool result inspection, production deploy block (`approved=true`).
