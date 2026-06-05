# Remotion B-roll — splice with real video

Three standalone clips matching [REAL_VIDEO_SCRIPT_WIN.md](REAL_VIDEO_SCRIPT_WIN.md).

| Composition | Output | Duration | Content |
|-------------|--------|----------|---------|
| `BrollIntro` | `video/out/broll-intro.mp4` | 20s | DeadDrop intro + 4 layers (2×2 grid) |
| `BrollPipeline` | `video/out/broll-pipeline.mp4` | 22s | Gateway → State machine → MCP → Guardrails |
| `BrollClosing` | `video/out/broll-closing.mp4` | 22s | Tagline + live URL + DeadDrop again |

## Render

```bash
cd video
npm run start                    # preview: BrollIntro, BrollPipeline, BrollClosing
npm run render:broll             # all three MP4s
# or individually:
npm run render:broll:intro
npm run render:broll:pipeline
npm run render:broll:closing
```

## Suggested edit timeline (real recording + B-roll)

| Time | Source |
|------|--------|
| 0:00–0:20 | Your hook (optional) or `broll-intro.mp4` |
| 0:20–0:40 | `broll-intro.mp4` (if hook separate) |
| 0:40–1:02 | `broll-pipeline.mp4` |
| 1:02–2:30 | **Screen record** — A → B → D on live dashboard |
| 2:30–2:52 | `broll-closing.mp4` |

Fade 8 frames between clips in DaVinci / CapCut / Premiere.
