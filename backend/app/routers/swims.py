from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from app.limiter import limiter
from app.models.swimming import SwimAnalysis
from app.services.swim_analyzer import analyze_swim_video

router = APIRouter(prefix="/api/swimming", tags=["swimming"])


@router.post("/analyze", response_model=SwimAnalysis)
@limiter.limit("3/minute")
async def analyze_swim(
    request: Request,
    video: UploadFile = File(...),
    stroke: str = Form("freestyle"),
) -> SwimAnalysis:
    try:
        data = await video.read()
        return await analyze_swim_video(data, video.filename or "video.mp4", stroke)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
