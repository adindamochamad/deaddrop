# Hackathon submission pack (English)

Use this for the BuilderBase form, README link, and judge prep.

---

## Form blurb (≤150 words)

**Problem:** At 2 AM your deploy agent calls Claude on AWS Bedrock. A 429 rate limit or tool timeout kills the job; an engineer rolls back manually.

**Solution:** **DeadDrop** — a deployment agent with four resilience layers: TrueFoundry **AI Gateway** (multi-model fallback + per-provider circuit breakers), **MCP Gateway** (tool health, quarantine, deploy→notifier degradation), **native + local guardrails**, and **MySQL checkpoints** so jobs resume after crashes.

**Proof:** Live dashboard counters (provider switches, guardrail blocks, recovery ms) and `provider_log` rows written on every LLM call — audit trail for SRE/compliance, not animation.

**Demo honesty:** Scenario buttons inject *controlled* failures via `chaos_injector` for reproducible judging. Production uses the **same** gateway fallback chain on real 429s/timeouts; chaos only triggers the path early.

**Stack:** TrueFoundry AI Gateway + MCP + Guardrails · AWS Bedrock · FastAPI · MySQL

**Links:** Live https://deaddrop.adindamochamad.com · Health https://deaddrop.adindamochamad.com/health · GitHub https://github.com/adindamochamad/deaddrop

---

## One honest sentence (README / video)

> Scenario buttons inject controlled failures for a reproducible demo; production uses the same TrueFoundry/Bedrock gateway fallback chain on real 429s and timeouts.

---

## Tool framing (do not say “mock deploy” to judges)

Say: **“Deploy tool with automatic fallback to notifier — same pattern for GitHub Actions, ArgoCD, or Slack.”**

Optional: set `SLACK_WEBHOOK_URL` in `.env` — scenario C/D sends a real Slack message when notifier runs.

Bullet for form: *Resilience patterns are environment-agnostic; tools are swappable MCP implementations.*

---

## Differentiation (say twice in video)

1. **Audit trail** — switches / guardrails / recovery ms are evidence for SRE, not just “agent didn’t die.”
2. **DeadDrop** + tagline *Infrastructure dies. Your agent doesn't.* — opening and closing.
3. **2 AM engineer** hook — personal, not generic “resilient agent.”

---

## Video checklist

| Time | Must show |
|------|-----------|
| 0:00–0:18 | 2 AM failure hook |
| 0:32–0:54 | Four layers + job state flow |
| **0:54–1:09** | **Platform proof** — Provider log + guardrail hits (TrueFoundry/Bedrock path) |
| 1:09–2:07 | **Live dashboard** — click A → B → **D Full Chaos** |
| **~1:55** | **Peak:** WARN/ERROR lines → DONE + metrics counters increment |
| 2:07–2:42 | Metric cards + “without vs with DeadDrop” |
| 2:42–3:00 | Live URL + GitHub + tagline again |

Prefer **screen recording** of https://deaddrop.adindamochamad.com for demo segment; Remotion is backup.

Drop a 30s Full Chaos screen capture at `docs/demo/full-chaos-backup.mp4` if live might fail.

Optional: 10–15s TrueFoundry console screenshot → `video/public/truefoundry-console.png` (auto-shown in Platform Proof scene).

---

## Live demo checklist (daily until deadline)

```bash
curl -sf https://deaddrop.adindamochamad.com/health | jq .
# Expect: {"status":"ok", ...}

docker compose up -d mysql   # or managed MySQL
# uvicorn / worker running with supervisor

# Practice twice without restart:
# Dashboard → A — Normal → B — Rate Limit → D — Full Chaos
```

- `DEMO_MODE=true` only if chaos endpoints are required; do not expose dangerous chaos routes without auth on public scans.
- If portal is down: link backup video in README.

---

## Technical red flags — quick fixes

| Risk | Fix in repo |
|------|-------------|
| Job stuck in DEPLOYING | Deploy step timeout (`DEPLOY_STEP_TIMEOUT_S`) |
| Metrics flat | Faster poll while job running; SSE log lines |
| Guardrails invisible | Scenario D increments `guardrails_blocked` |
| Judges doubt chaos-only resilience | Platform Proof scene + Provider log table |

---

## Files to attach

- `video/out/deaddrop-demo.mp4` (re-render after changes)
- `README.md` (Quick Start + health URL)
- `.env.example`
- Optional: `docs/demo/full-chaos-backup.mp4`
