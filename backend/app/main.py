from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.limiter import limiter
from app.routers import practice, rounds, swims, swings

_MAX_UPLOAD_BYTES = 100 * 1024 * 1024  # 100 MB


class LimitUploadSize(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "POST":
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > _MAX_UPLOAD_BYTES:
                return JSONResponse(
                    status_code=413,
                    content={"detail": "Video exceeds the 100 MB size limit"},
                )
        return await call_next(request)


app = FastAPI(
    title="Agentic AI Sports — Golf Module",
    description="AI-powered golf round analyzer and practice plan generator",
    version="0.1.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(LimitUploadSize)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rounds.router)
app.include_router(practice.router)
app.include_router(swings.router)
app.include_router(swims.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
