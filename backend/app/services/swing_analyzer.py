from __future__ import annotations

import base64
import json
import tempfile
import uuid
from pathlib import Path

import cv2
import numpy as np
from anthropic import AsyncAnthropic

from app.config import settings
from app.models.golf import SwingAnalysis, SwingPhase

_client = AsyncAnthropic(api_key=settings.anthropic_api_key)

_SYSTEM_PROMPT = """You are a PGA Master Professional golf instructor specializing in swing mechanics
and biomechanics analysis. You analyze sequential frames from golf swing videos to provide
detailed, actionable coaching feedback.

When analyzing swing frames:
- Identify the swing phase shown in each frame (address/setup, takeaway, backswing, top of backswing, downswing, impact, follow-through, finish)
- Look for key technical elements: grip, stance, posture, alignment, hip and shoulder rotation, weight transfer, club path, face angle, lag
- Be specific, referencing body positions and angles you can actually observe
- Provide actionable improvement suggestions tied to specific observations
- Balance positive reinforcement with constructive criticism
- Adapt your feedback to the club being used"""

_SYSTEM_PROMPT_BLOCK = {
    "type": "text",
    "text": _SYSTEM_PROMPT,
    "cache_control": {"type": "ephemeral"},
}

_N_FRAMES = 7
_MAX_WIDTH = 1280
_MAX_HEIGHT = 720


def _extract_frames(video_path: str, n_frames: int = _N_FRAMES) -> list[np.ndarray]:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Could not open video file — ensure it is a valid mp4, mov, or avi")

    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total == 0:
        cap.release()
        raise ValueError("Video contains no readable frames")

    indices = [int(i * (total - 1) / (n_frames - 1)) for i in range(n_frames)]

    frames: list[np.ndarray] = []
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if not ret:
            continue
        h, w = frame.shape[:2]
        if w > _MAX_WIDTH or h > _MAX_HEIGHT:
            scale = min(_MAX_WIDTH / w, _MAX_HEIGHT / h)
            frame = cv2.resize(frame, (int(w * scale), int(h * scale)))
        frames.append(frame)

    cap.release()

    if not frames:
        raise ValueError("Failed to extract frames from video")

    return frames


def _frame_to_base64(frame: np.ndarray) -> str:
    _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return base64.b64encode(buf.tobytes()).decode()


def _build_prompt(club: str, n_frames: int) -> str:
    phases = [
        "Address/Setup", "Takeaway", "Mid-Backswing",
        "Top of Backswing", "Downswing", "Impact", "Follow-Through",
    ]
    phase_hint = ", ".join(phases[:n_frames])
    return f"""Analyze these {n_frames} sequential frames from a golf swing. Club: {club}.

The frames are in chronological order and likely correspond to: {phase_hint}.

Respond with valid JSON only — no markdown fences, no extra text:
{{
  "frame_observations": [
    {{"phase": "phase name", "observation": "what you see", "suggestion": "optional specific tip or null"}}
  ],
  "overall_assessment": "2-3 sentence overall assessment",
  "key_strengths": ["strength 1", "strength 2"],
  "areas_for_improvement": ["area 1 with specific detail", "area 2 with specific detail"],
  "recommended_drills": ["drill name and brief description 1", "drill name and brief description 2"]
}}"""


async def _call_claude(frames: list[np.ndarray], club: str) -> dict:
    content: list[dict] = []
    for i, frame in enumerate(frames):
        content.append({"type": "text", "text": f"Frame {i + 1} of {len(frames)}:"})
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/jpeg",
                "data": _frame_to_base64(frame),
            },
        })
    content.append({"type": "text", "text": _build_prompt(club, len(frames))})

    response = await _client.messages.create(
        model="claude-opus-4-7",
        max_tokens=1500,
        system=[_SYSTEM_PROMPT_BLOCK],
        messages=[{"role": "user", "content": content}],
    )

    raw = "\n".join(b.text for b in response.content if b.type == "text")

    try:
        start, end = raw.find("{"), raw.rfind("}") + 1
        return json.loads(raw[start:end])
    except (json.JSONDecodeError, ValueError):
        return {
            "frame_observations": [],
            "overall_assessment": raw,
            "key_strengths": [],
            "areas_for_improvement": [],
            "recommended_drills": [],
        }


def _annotate_frame(
    frame: np.ndarray,
    frame_num: int,
    phase: str,
    suggestion: str | None,
) -> np.ndarray:
    img = frame.copy()
    h, w = img.shape[:2]
    font = cv2.FONT_HERSHEY_SIMPLEX

    # --- Numbered circle badge (top-left) ---
    cx, cy, radius = 28, 28, 20
    cv2.circle(img, (cx, cy), radius, (22, 101, 52), -1)  # green-700 (BGR)
    badge_txt = str(frame_num)
    (tw, th), _ = cv2.getTextSize(badge_txt, font, 0.65, 2)
    cv2.putText(img, badge_txt, (cx - tw // 2, cy + th // 2), font, 0.65, (255, 255, 255), 2, cv2.LINE_AA)

    # --- Phase name bar (top, semi-transparent green) ---
    bar_x = cx + radius + 8
    bar_bg = img.copy()
    cv2.rectangle(bar_bg, (bar_x, 8), (w - 8, 8 + 34), (22, 101, 52), -1)
    img = cv2.addWeighted(bar_bg, 0.82, img, 0.18, 0)
    cv2.putText(img, phase, (bar_x + 10, 8 + 24), font, 0.58, (255, 255, 255), 1, cv2.LINE_AA)

    # --- Coaching cue overlay (bottom, semi-transparent amber) ---
    if suggestion:
        scale, thick = 0.52, 1
        words = suggestion.split()
        lines: list[str] = []
        line = ""
        for word in words:
            test = f"{line} {word}".strip()
            (tw2, _), _ = cv2.getTextSize(test, font, scale, thick)
            if tw2 <= w - 24:
                line = test
            else:
                if line:
                    lines.append(line)
                line = word
        if line:
            lines.append(line)

        lh, pad = 24, 10
        box_h = len(lines) * lh + pad * 2
        cue_bg = img.copy()
        cv2.rectangle(cue_bg, (0, h - box_h), (w, h), (0, 140, 230), -1)  # amber (BGR)
        img = cv2.addWeighted(cue_bg, 0.78, img, 0.22, 0)
        for j, ln in enumerate(lines):
            y = h - box_h + pad + (j + 1) * lh - 2
            cv2.putText(img, ln, (10, y), font, scale, (255, 255, 255), thick, cv2.LINE_AA)

    return img


async def analyze_swing_video(
    video_bytes: bytes,
    filename: str,
    club: str = "driver",
) -> SwingAnalysis:
    suffix = Path(filename).suffix or ".mp4"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        frames = _extract_frames(tmp_path)
        data = await _call_claude(frames, club)
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    observations = data.get("frame_observations", [])

    swing_phases = [
        SwingPhase(
            phase=obs.get("phase", f"Frame {i + 1}"),
            observation=obs.get("observation", ""),
            suggestion=obs.get("suggestion") or None,
        )
        for i, obs in enumerate(observations)
    ]

    # Annotate each frame with its phase label and coaching cue, aligned by index
    annotated_frames = [
        _frame_to_base64(
            _annotate_frame(
                frame=frames[i],
                frame_num=i + 1,
                phase=swing_phases[i].phase if i < len(swing_phases) else f"Frame {i + 1}",
                suggestion=swing_phases[i].suggestion if i < len(swing_phases) else None,
            )
        )
        for i in range(len(frames))
    ]

    return SwingAnalysis(
        swing_id=uuid.uuid4(),
        video_filename=filename,
        frames_analyzed=len(frames),
        club=club,
        overall_assessment=data.get("overall_assessment", ""),
        swing_phases=swing_phases,
        key_strengths=data.get("key_strengths", []),
        areas_for_improvement=data.get("areas_for_improvement", []),
        recommended_drills=data.get("recommended_drills", []),
        annotated_frames=annotated_frames,
    )
