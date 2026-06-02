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
- `app/config.py` — reads `ANTHROPIC_API_KEY` from `.env` via pydantic-settings.

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
