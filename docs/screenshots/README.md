# Dashboard screenshots (README / submission)

| File | Purpose |
|---|---|
| `dashboard-overview.png` | Full dashboard with scenario buttons |
| `dashboard-rate-limit.png` | Rate limit scenario running |
| `dashboard-metrics.png` | Metrics panel (provider switches, recovery) |

Recapture after UI changes:

```bash
node docs/screenshots/capture.mjs
# DEMO_URL=http://localhost:8001 node docs/screenshots/capture.mjs
```

Requires `puppeteer-core` (installed once via `npm install puppeteer-core` at repo root).
