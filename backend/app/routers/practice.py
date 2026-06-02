from fastapi import APIRouter, HTTPException, Request

from app.limiter import limiter
from app.models.golf import PracticePlan, RoundAnalysis
from app.services.planner import generate_practice_plan

router = APIRouter(prefix="/api/golf/practice-plans", tags=["practice-plans"])


@router.post("/generate", response_model=PracticePlan)
@limiter.limit("5/minute")
async def generate_golf_practice_plan(request: Request, analysis: RoundAnalysis) -> PracticePlan:
    try:
        return await generate_practice_plan(analysis)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
