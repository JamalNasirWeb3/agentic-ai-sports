# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered sports performance platform that helps athletes turn games, matches, rounds, and practices into personalized training plans. Long-term vision is a multi-sport platform (golf, baseball, football, tennis, basketball, soccer, softball, track). **Phase 1 live: Golf and Swimming.**

## Tech Stack

- **Backend**: Python FastAPI (`/backend`)
- **Frontend**: Next.js 14, Tailwind CSS (`/frontend`)
- **AI**: Anthropic SDK — `claude-opus-4-7`, prompt caching on system prompts, vision for swing/stroke analysis
- **Phase 2**: Mobile app (framework TBD)

## Setup

**Backend** (first time):
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env   # then add ANTHROPIC_API_KEY
```

**Frontend** (first time):
```powershell
cd frontend
npm install
copy .env.local.example .env.local
```

## Running the Project

**Backend** (Terminal 1):
```powershell
cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

**Frontend** (Terminal 2):
```powershell
cd frontend
npm run dev
```

- App: `http://localhost:3000`
- API docs: `http://localhost:8000/docs`
- Health check: `GET http://localhost:8000/health`

## Linting

```powershell
# Frontend
cd frontend && npm run lint

# Frontend type check
cd frontend && npx tsc --nocheck
```

There are no backend tests or frontend tests currently.

## Backend Architecture (`/backend`)

### Entry point
`app/main.py` — FastAPI app, CORS (`localhost:3000` and `localhost:3001`), upload size middleware (100 MB), slowapi rate limiting, router registration.

### Routers (`app/routers/`)
| File | Endpoint | Input | Rate limit |
|---|---|---|---|
| `rounds.py` | `POST /api/golf/rounds/analyze` | `RoundSubmission` | 5/min |
| `practice.py` | `POST /api/golf/practice-plans/generate` | **full `RoundAnalysis`** | 5/min |
| `swings.py` | `POST /api/golf/swings/analyze` | `multipart/form-data` (video + club) | 3/min |
| `swims.py` | `POST /api/swimming/analyze` | `multipart/form-data` (video + stroke) | 3/min |

The practice endpoint takes the full `RoundAnalysis` JSON (output from the round endpoint), not just weaknesses — the frontend passes the entire analysis object. The swimming module has no practice plan step.

### Services (`app/services/`)
- **`analyzer.py`** — `compute_stats` runs deterministically in Python (putts, GIR, fairways, scoring breakdown, avg by par, front/back nine). `identify_strengths_weaknesses` applies fixed thresholds. `get_ai_insights` calls Claude for 3-4 paragraphs of narrative. System prompt uses `cache_control: ephemeral`.
- **`planner.py`** — `weaknesses_to_focus_areas` maps weakness strings to drill categories via `FOCUS_AREA_MAP`; falls back to `["putting", "iron_play"]` if nothing matches; caps at 4 areas. `build_practice_schedule` picks 2 drills per area from the inline `DRILL_LIBRARY`. Claude writes personalized coaching notes.
- **`swing_analyzer.py`** — Extracts 7 evenly-spaced frames via OpenCV (capped at 1280×720, JPEG quality 85), sends all frames as base64 images to Claude vision, parses JSON response with a brute-force `{…}` substring search and a graceful fallback, then annotates each frame with a numbered green circle badge, phase name bar, and amber coaching cue overlay. Returns annotated frames as base64 alongside text analysis.
- **`swim_analyzer.py`** — Same frame-extraction and annotation pipeline as swing analysis, but stroke-aware: `_STROKE_PHASES` maps each of the 4 strokes (freestyle, backstroke, breaststroke, butterfly) to 7 phase names used as prompt hints. Annotation uses ocean-blue badges and teal cue overlays (distinct from golf's green/amber palette). No practice plan is generated.

### Models (`app/models/`)
- **`golf.py`**: `HoleData` → `RoundSubmission` (accepts 9–18 holes) → `RoundStats` / `ScoringBreakdown` → `RoundAnalysis` · `SwingPhase` → `SwingAnalysis` (includes `annotated_frames: list[str]`) · `PracticeDrill` → `PracticeSession` → `PracticePlan`
- **`swimming.py`**: `SwimPhase` → `SwimAnalysis` (includes `annotated_frames: list[str]`, `stroke: str`)

### Key conventions
- All Claude calls use `AsyncAnthropic` client, `claude-opus-4-7`, system prompt caching (`cache_control: ephemeral`).
- Stats are computed in pure Python; Claude is only called for narrative/coaching text.
- Swing and swim analysis do **not** use `thinking` (vision + thinking conflicts) — text-only endpoints use `thinking: {"type": "adaptive"}`.
- Rate limiting via `slowapi` (in-memory). Swap to Redis by setting `storage_uri` in `app/limiter.py`.

### Config
- `app/config.py` — reads `ANTHROPIC_API_KEY` and `ALLOWED_ORIGINS` (comma-separated string, not JSON — pydantic-settings will fail to parse a JSON list) from `.env` via pydantic-settings.

### Deployment
- **Frontend — TWO live Vercel projects, both must be kept in sync:**
  - `jamal-nasir/frontend` — linked at `frontend/` as its own root. Production alias `https://frontend-mu-one-90.vercel.app`. Deployed via `vercel deploy --prod` from inside `frontend/`.
  - `jamal-nasir/agentic-ai-sports` — the older project (~70+ days), linked at the **repo root** with a Root Directory setting of `frontend`. Auto-deploys on every push to `master` via its GitHub integration. Production alias `https://agentic-ai-sports.vercel.app`. To deploy manually, `.vercel/project.json` at the repo root must point at this project's `projectId`/`orgId`, then `vercel deploy --prod` from the repo root (not from `frontend/`).
  - Both projects set `NEXT_PUBLIC_API_URL` as a production env var (no `.env.production` committed) and must point at the same backend URL. `.vercelignore` (repo root) excludes `videos/` and Python build artifacts — required because `agentic-ai-sports` uploads the whole repo root on every deploy; without it, pushes were sweeping a 1.3GB untracked `videos/` directory into the deployment.
- **Backend: FastAPI Cloud** (live at `https://agenticsportsa.fastapicloud.dev`). Migrated from Railway 2026-08 — Railway had been the actual prod backend despite `render.yaml` describing Render (Railway was configured directly in its dashboard/CLI, no config file in this repo). Railway is no longer in use.
  - `backend/pyproject.toml` gives the project real metadata (`[project]` name/version/requires-python + `dependencies` mirrored from `requirements.txt`) and `[tool.uv] package = false` so `uv` installs deps without trying to build `backend/` itself as a wheel. `dependencies` lists `fastapi[standard]` (not bare `fastapi`) since FastAPI Cloud starts the container via the `fastapi` CLI (`fastapi run`), which needs the standard extras. `[tool.fastapi] entrypoint = "app.main:app"` points at the app object, which lives at `app/main.py` not project-root `main.py`. `backend/.python-version` pins `3.11.9`. Deploy from inside `backend/` with `fastapi deploy`.
  - `ANTHROPIC_API_KEY` and `ALLOWED_ORIGINS` are set as FastAPI Cloud environment variables/secrets (dashboard or `fastapi cloud env`), not committed. `ALLOWED_ORIGINS` is a comma-separated list and must include **both** Vercel origins above. `fastapi cloud env set` errors if the var already exists — `fastapi cloud env delete <name> --yes` first, then `set`. Env var changes need a fresh `fastapi deploy` to reach the running container.
  - The `fastapi-cloud-cli`'s rich-based UI crashes on Git Bash/MSYS consoles (Unicode emoji vs. cp1252) — run `fastapi cloud login` / `fastapi deploy` from a native PowerShell or cmd.exe window instead. `fastapi cloud login --json` only prints the device code and does not complete/save login; use the non-`--json` interactive login to actually authenticate.
- **Fallback: Render.** `render.yaml` (repo root) deploys the backend as a Render web service: `pip install -r backend/requirements.txt`, `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`. `ANTHROPIC_API_KEY` and `ALLOWED_ORIGINS` are set in the Render dashboard (`sync: false`). Repo-root `.python-version` pins `3.11.9` for Render compatibility. Never actually served production traffic; kept only as a rollback option, not actively maintained.

## Frontend Architecture (`/frontend`)

### Pages (App Router)
| Route | Purpose |
|---|---|
| `/` | Landing — sport cards (Golf and Swimming live, others coming soon) |
| `/golf` | Golf hub — links to Round and Swing analyzers |
| `/golf/round` | Round entry form → analysis → practice plan flow |
| `/golf/swing` | Video upload → swing analysis with annotated frames |
| `/swimming` | Swimming hub — links to Stroke Analyzer |
| `/swimming/video` | Video upload → stroke analysis with annotated frames |

### Components (`src/components/`)
- **`RoundForm.tsx`** — 18-hole scorecard table. Par-3 holes auto-disable fairway checkbox. Defaults: par 4, score 4, 2 putts.
- **`RoundAnalysisCard.tsx`** — Score header, **traffic light KPI grid** (green/yellow/red dot + colored border per stat with thresholds for putts, fairways, GIR, penalties), scoring breakdown badges, strengths/weaknesses, AI insights, practice plan CTA.
- **`PracticePlanCard.tsx`** — Focus area tags, session cards with drills and durations, coaching notes.
- **`SwingAnalysisCard.tsx`** — Annotated frame gallery (click thumbnail to expand full-width), interactive phase timeline (clicking a timeline row highlights the matching frame), amber coaching cue badges, strengths/weaknesses, recommended drills.
- **`SwingUpload.tsx`** — Drag-and-drop video upload (mp4/mov/avi, 100 MB max) with club selector.
- **`SwimUpload.tsx`** — Same drag-and-drop pattern as SwingUpload, with stroke selector (freestyle/backstroke/breaststroke/butterfly).
- **`SwimAnalysisCard.tsx`** — Same annotated frame gallery and phase timeline pattern as SwingAnalysisCard; displays stroke label, key strengths, improvement areas, and recommended drills.

### API client (`src/lib/api.ts`)
Four typed fetch functions: `analyzeRound`, `generatePracticePlan`, `analyzeSwing`, `analyzeSwim`. Base URL from `NEXT_PUBLIC_API_URL` env var (default `http://localhost:8000`). TypeScript interfaces mirror the Pydantic models exactly (`src/lib/types.ts`).

## Architecture Pattern

Each sport module follows: **submission → stats (deterministic) → AI narrative → practice plan**. The Golf module is the reference implementation. The Swimming module is a video-only variant (no stats step, no practice plan). Future sports modules should follow one of these two shapes depending on whether structured performance data exists.

## Proposed: video-output coaching (not yet implemented)

Discussed 2026-08-12, not started. User wants the swing/swim analyzers to return a **video**, not just annotated still frames, so users can watch their corrected form rather than read static coaching cues.

**Ruled out:** true AI-generated "corrected video of the user" (altering their actual body position frame-by-frame while preserving their likeness) is not achievable with this stack — that needs a video-generation/motion-editing model, a different category of tech from Claude. Claude can describe video frames, not generate/edit video pixels. Don't attempt this without first evaluating a dedicated video-gen model/service, which would be a much bigger scope increase (new vendor, likely much higher cost per request, uncertain quality for something as precision-sensitive as body mechanics).

**Two feasible extensions, in increasing order of effort:**
1. **Full annotated video output** — `swing_analyzer.py`'s `_annotate_frame` (see Services above) already draws coaching overlays onto individual frames; extend `_extract_frames` to process every frame of the source video (not just the current 7 sampled ones) and stitch the annotated frames back into an mp4 via OpenCV's `VideoWriter`, so cues appear at the right timestamp instead of on isolated stills. Reuses most of the existing pipeline — the 7-frame *Claude vision call* can stay as-is (still the cost-effective way to get phase/observation text); only the *rendering* step needs to expand to the full frame range, re-using the phase timing from the 7 analyzed frames to interpolate which cue applies to the in-between frames.
2. **Pose-skeleton overlay showing ideal vs. actual angles** — bigger lift. Add a local pose-estimation model (e.g. MediaPipe — free, runs locally, no new paid API dependency) to extract joint keypoints per frame, then draw the user's actual skeleton plus a visual delta toward the "correct" position implied by Claude's text feedback (e.g. hip rotation angle off by N°). Closer to what users likely picture as "corrected video," without pretending to be photorealistic. New dependency, new annotation logic, and a way to translate Claude's qualitative feedback into quantitative angle deltas (currently there's no numeric angle data anywhere in the pipeline — Claude's output is prose, not coordinates).

**Recommended starting point:** #1, since it reuses existing code paths (`_annotate_frame`, the 7-frame Claude call) and ships a real improvement without new dependencies or cost. Evaluate #2 afterward based on whether users want more precision than cue-timing-on-video provides.
