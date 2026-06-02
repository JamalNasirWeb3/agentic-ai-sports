from fastapi import APIRouter, HTTPException, Request

from app.limiter import limiter
from app.models.golf import RoundAnalysis, RoundSubmission
from app.services.analyzer import analyze_round

router = APIRouter(prefix="/api/golf/rounds", tags=["rounds"])


@router.post("/analyze", response_model=RoundAnalysis)
@limiter.limit("5/minute")
async def analyze_golf_round(request: Request, submission: RoundSubmission) -> RoundAnalysis:
    try:
        return await analyze_round(submission)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
