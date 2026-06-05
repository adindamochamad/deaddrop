# Real video script — DeadDrop (maximize hackathon win chance)

**Target length:** 2:50–3:00  
**Format:** Screen recording (primary) + optional 5s face-cam intro  
**Language:** English (judges + TrueFoundry/AWS sponsors)  
**Live URL:** https://deaddrop.adindamochamad.com  

> Judges score **working prototype + clarity + TrueFoundry/Bedrock stack + resilience story**.  
> A real recording of your dashboard beats Remotion-only. Use this script as shot list + teleprompter.

---

## Winning formula (what to optimize)

| Judge mental model | Your answer in video |
|--------------------|----------------------|
| “Does it actually work?” | Open live URL, click scenarios, job ends **DONE** |
| “Is resilience real or fake chaos?” | 10s **Provider Log** + one honest line about controlled demo |
| “TrueFoundry/Bedrock?” | Say stack once clearly; show gateway log or TFY console 10s |
| “Would I use this?” | **Audit trail** — counters move, recovery ms, guardrail block |
| “Remember this project?” | **DeadDrop** + tagline **twice** + 2 AM story |

**Do not:** Only motion graphics · say “mock deploy” · rush Full Chaos · skip metric counters moving.

---

## Pre-shoot checklist (30 min before)

- [ ] `curl -sf https://deaddrop.adindamochamad.com/health` → 200  
- [ ] Practice **A → B → D** twice without server restart  
- [ ] Browser: 110% zoom, dark mode, hide bookmarks/extensions  
- [ ] Close Slack/email notifications; enable **Do Not Disturb**  
- [ ] OBS or QuickTime: **1920×1080**, 30 fps, record **system audio off** (voice added later)  
- [ ] Optional: `SLACK_WEBHOOK_URL` set → D scenario may ping real Slack (nice “not mock” moment)  
- [ ] Open tabs ready: Dashboard · TrueFoundry AI Gateway (routing/logs) · GitHub repo  
- [ ] Reset chaos once: click **Reset All** on dashboard  

---

## Shot list (6 blocks)

| Block | Duration | Visual (what to record) | Audio |
|-------|----------|-------------------------|--------|
| **1 Hook** | 0:00–0:20 | Black → terminal text *or* dashboard idle + neural bg | VO only |
| **2 Brand** | 0:20–0:40 | Dashboard header + hero strip (slow scroll) | VO |
| **3 Architecture** | 0:40–1:00 | README architecture diagram *or* 4 bullet slides (5s each) | VO |
| **4 Platform proof** | 1:00–1:15 | Dashboard **Provider Log** + **Guardrails** sidebar; then 5s TrueFoundry console | VO |
| **5 Live demo** | 1:15–2:35 | **A → B → D** full screen, cursor visible | VO sparse; let log speak |
| **6 Close** | 2:35–3:00 | Metrics cards + live URL in browser bar + GitHub | VO |

---

## Full teleprompter (read at ~140 words/min)

### BLOCK 1 — Hook `[0:00 – 0:20]`

**Screen:** Fade from black. Optional: full-screen text “2:03 AM · production deploy”. Then cut to dashboard.

**Say:**

> It’s two in the morning. Your team has to ship.  
> An AI agent is deploying to staging — and Bedrock hits a rate limit.  
> The agent stops. The deploy fails. Someone has to wake up and fix it manually.  
> **DeadDrop** is built so that doesn’t happen.

**On-screen text overlay (optional):** `Infrastructure dies. Your agent doesn't.`

---

### BLOCK 2 — Solution `[0:20 – 0:40]`

**Screen:** https://deaddrop.adindamochamad.com — show logo, hackathon badge, hero strip. Pause 2s on neural background when log is quiet.

**Say:**

> **DeadDrop** is a deployment agent that treats failures as normal events — not crashes.  
> TrueFoundry AI Gateway, MCP tools, native guardrails, and AWS Bedrock — with checkpoints so jobs can resume.  
> Built for the Resilient Agents hackathon.

**Must show:** Header “DeadDrop”, tagline, pills AI Gateway / MCP / Guardrails.

---

### BLOCK 3 — Four layers `[0:40 – 1:00]`

**Screen:** Quick cuts (5s each) OR hold README architecture section:

1. State machine diagram (PENDING → DONE)  
2. Text: “Claude → Mistral → Llama”  
3. MCP: deploy · validator · notifier  
4. Guardrails + MySQL checkpoint  

**Say:**

> Four layers.  
> One: multi-model fallback through TrueFoundry AI Gateway — circuit breaker per provider.  
> Two: a state machine with MySQL checkpoints — crash mid-job, resume where you left off.  
> Three: MCP tools with health checks — if deploy is quarantined, we degrade to notifier — same pattern you’d use with GitHub Actions or Slack.  
> Four: guardrails that block bad YAML before it reaches production.

---

### BLOCK 4 — Platform proof `[1:00 – 1:15]` ⭐ credibility

**Screen:**

1. Dashboard **Provider Log** (right sidebar) — even if empty, run **B** first in rehearsal so rows appear; *or* show table after B.  
2. **Guardrails** feed.  
3. **5–10s** TrueFoundry console: AI Gateway routing, provider error, or guardrail hit.

**Say:**

> This isn’t chaos theater. Every LLM call is logged — provider, latency, rate limits.  
> Scenario buttons inject **controlled** failures so judges see the same path every time.  
> In production, the **same gateway chain** handles real four-twenty-nines and timeouts.  
> These counters are an **audit trail** for SRE and compliance — not decoration.

**Honest line (mandatory, calm tone):**  
> “Chaos buttons trigger the fallback early — the code path is production-real.”

---

### BLOCK 5 — Live demo `[1:15 – 2:35]` ⭐ peak

**Screen:** Full dashboard. **Mouse cursor large and slow.** Neural background visible.

#### 5A — Scenario A · Normal `[1:15 – 1:40]`

**Do:** Click **A — Normal**. Wait until log shows **DONE** (~20–40s). Don’t click early.

**Say (while waiting or after DONE):**

> Scenario A — clean run. Analyze, generate manifest, validate, deploy. Zero switches.

**Point cursor at:** Green log lines · Jobs Done = 1.

---

#### 5B — Scenario B · Rate Limit `[1:40 – 2:05]`

**Do:** Click **B — Rate Limit**. Wait for yellow WARN lines and **provider switch**.

**Say:**

> Scenario B — Claude rate limited. Circuit breaker opens. Fallback to Mistral. Job still completes.

**Point cursor at:**  
- Log: `rate limited → switching`  
- **Provider Switches** counter increments  
- **Provider Log** new row (rate_limited → success)

---

#### 5C — Scenario D · Full Chaos `[2:05 – 2:30]` 🔥 money shot

**Do:** Click **D — Full Chaos**. **Do not speak over the first 10 seconds** — let judges read WARN/ERROR.

**Say (after guardrail / deploy degradation lines appear):**

> Full chaos — outage, quarantine, bad YAML. Watch the log: warnings, guardrail block, deploy degrades to notifier.  
> Metrics climb — switches, tool failures, guardrail blocks, recovery time.  
> Still **DONE**. Zero manual steps.

**Point cursor at (in order):**

1. Red/yellow log lines  
2. `Guardrail blocked`  
3. `degrading to notifier`  
4. `Resilience chain:` summary line  
5. `✅ Job … DONE`  
6. **Guardrails** metric · **Recovery** · **Provider Switches**

**Hold 3 seconds** on final metrics after DONE — let numbers sink in.

---

### BLOCK 6 — Close `[2:35 – 3:00]`

**Screen:** Scroll to metric cards + jobs table. Browser address bar showing live URL. Optional: GitHub repo tab.

**Say:**

> Without DeadDrop, that job fails at two AM. With DeadDrop, it finishes — and every switch is recorded.  
> Try it live: **deaddrop.adindamochamad.com** — health endpoint for a quick check. Code on GitHub.  
> **DeadDrop.** Infrastructure dies. Your agent doesn't. Thank you.

**End card (3s):** Logo + URL + `#ResilientAgents`

---

## B-roll & overlays (optional, +win points)

| Clip | Length | When |
|------|--------|------|
| TrueFoundry AI Gateway routing | 8s | Block 4 |
| Slack notification (if webhook on) | 3s | During D when notifier fires |
| `curl /health` terminal | 3s | Block 6 |
| README Quick Start | 5s | Only if under 2:50 |

---

## Editing tips

1. **Captions** — burn-in key terms: `Provider switch`, `Guardrail blocked`, `DONE`  
2. **Zoom** — 120% on log panel during D chaos  
3. **Speed** — never speed up demo clicks; you may speed up idle waiting slightly (1.1×) if A/B/D are slow  
4. **Music** — low ambient only; don’t hide VO  
5. **First frame** — dashboard with LIVE badge, not black (thumbnail for portal)  

---

## One-sentence answers if judges re-watch

- **What is DeadDrop?** Deploy agent that survives LLM/tool/infra failures with audit trail.  
- **Why chaos buttons?** Reproducible demo of the same fallback code production uses.  
- **Why TrueFoundry?** AI Gateway + MCP + Guardrails are the resilience control plane.  
- **Proof it works?** Live URL + moving counters + provider_log rows.

---

## Minimal version (if you only have 90 seconds)

1. Hook 15s (2 AM story + DeadDrop name)  
2. Live **D — Full Chaos** 45s (silent log, then 1 sentence)  
3. Metrics + URL 20s  
4. Tagline 10s  

---

## After upload

- Submit **this recording** as primary video; keep Remotion as backup in README  
- Form text: paste from [HACKATHON_SUBMISSION_EN.md](HACKATHON_SUBMISSION_EN.md)  
- Comment in README: “Submission video is screen recording of live demo.”
