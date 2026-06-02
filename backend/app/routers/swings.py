import logging

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from app.limiter import limiter
from app.models.golf import SwingAnalysis
from app.services.swing_analyzer import analyze_swing_video

router = APIRouter(prefix="/api/golf/swings", tags=["swings"])
logger = logging.getLogger(__name__)

_MAX_SIZE = 100 * 1024 * 1024  # 100 MB
_ALLOWED_TYPES = {"video/mp4", "video/quicktime", "video/x-msvideo", "video/x-m4v"}


@router.post("/analyze", response_model=SwingAnalysis)
@limiter.limit("3/minute")
async def analyze_golf_swing(
    request: Request,
    video: UploadFile = File(..., description="Swing video (mp4, mov, avi — max 100 MB)"),
    club: str = Form(default="driver", description="Club used (e.g. driver, 7-iron, wedge)"),
) -> SwingAnalysis:
    if video.content_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{video.content_type}'. Use mp4, mov, or avi.",
        )

    video_bytes = await video.read()
    if len(video_bytes) > _MAX_SIZE:
        raise HTTPException(status_code=413, detail="Video exceeds the 100 MB size limit")

    try:
        return await analyze_swing_video(video_bytes, video.filename or "swing.mp4", club)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Swing analysis failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
