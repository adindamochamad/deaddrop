# DeadDrop

> **"Infrastructure dies. Your agent doesn't."**

DeadDrop adalah deployment orchestration agent yang tetap menyelesaikan tugasnya meski provider LLM mati, rate limit hit, atau tool timeout — dibangun di atas **TrueFoundry AI Gateway**, **MCP Gateway**, dan **Guardrails**.

Dibuat untuk: **Resilient Agents Online Hackathon — TrueFoundry × AWS Bedrock**

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  DeadDrop Agent                   │
├──────────────────────────────────────────────────┤
│  Orchestration Layer                              │
│  State Machine · Circuit Breaker · Checkpoints   │
├──────────────────────────────────────────────────┤
│  TrueFoundry AI Gateway                          │
│  Claude Sonnet → Mistral Large → Llama 3.1 70B  │
├──────────────────────────────────────────────────┤
│  TrueFoundry MCP Gateway                         │
│  github_deploy · validator · notifier            │
├──────────────────────────────────────────────────┤
│  TrueFoundry Guardrails                          │
│  Redact secrets · Block prod · Validate YAML     │
└──────────────────────────────────────────────────┘
```

## Resilience Mechanisms

| Failure | Mechanism | Recovery Time |
|---|---|---|
| Provider rate limit | Multi-provider fallback chain | ~0.8s |
| Provider outage | Circuit breaker + fallback | ~1s |
| Tool timeout | MCP Gateway quarantine + audit log | immediate |
| Bad LLM output | Guardrails validate + retry | next iteration |
| Agent crash | MySQL checkpoint → resume from last state | on restart |

## Quick Start

```bash
# 1. Clone & setup
cp .env.example .env
# Fill in: TRUEFOUNDRY_API_KEY, AWS credentials, MySQL password

# 2. Start with Docker Compose
docker-compose up -d

# 3. Open dashboard
open http://localhost:8000

# 4. Trigger a deployment
curl -X POST http://localhost:8000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"service":"payment-service","version":"v2.4.1","target_env":"staging"}'
```

## Demo — Chaos Injection

```bash
# Inject rate limit on Claude Sonnet → watch it fallback to Mistral
curl -X POST http://localhost:8000/api/chaos/rate_limit \
  -d '{"target":"claude-sonnet-4-6"}'

# Timeout the deploy tool → watch circuit breaker trip
curl -X POST http://localhost:8000/api/chaos/tool_timeout \
  -d '{"target":"github_deploy"}'

# Reset all failures
curl -X POST http://localhost:8000/api/chaos/reset
```

## Project Structure

```
deaddrop/
├── agent/           # Orchestrator, state machine, circuit breaker, checkpoints
├── gateway/         # AI Gateway, MCP Gateway, Guardrails clients
├── tools/           # MCP Tools: github_deploy, validator, notifier
├── db/              # SQLAlchemy models + schema
├── api/             # FastAPI server + dashboard
├── demo/            # Chaos injector + demo scenarios
└── video/           # Remotion submission video
```

## TrueFoundry Tenant

URL: `https://deaddrop.truefoundry.cloud`

## License

MIT
