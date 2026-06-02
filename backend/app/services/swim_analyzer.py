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
from app.models.swimming import SwimAnalysis, SwimPhase, TechniqueRating

_client = AsyncAnthropic(api_key=settings.anthropic_api_key)

_SYSTEM_PROMPT = """You are an elite swimming coach and biomechanics expert with extensive experience
analyzing competitive and recreational swimmers across all four strokes. You review sequential frames
from swimming videos to provide detailed, actionable technique feedback.

When analyzing stroke frames:
- Identify the swim phase shown in each frame (entry, catch, pull, push, recovery, kick, breathing, rotation, glide)
- Assess key technical elements: hand entry angle, elbow position, catch depth, body rotation, hip drive, kick amplitude and frequency, head position, breathing timing, streamline, and stroke rate
- Be specific, referencing visible body positions and angles
- Provide actionable corrections tied to what you can actually observe
- Balance positive reinforcement with constructive feedback
- Adapt your feedback to the stroke type being swum"""

_SYSTEM_PROMPT_BLOCK = {
    "type": "text",
    "text": _SYSTEM_PROMPT,
    "cache_control": {"type": "ephemeral"},
}

_N_FRAMES = 7
_MAX_WIDTH = 1280
_MAX_HEIGHT = 720

_STROKE_PHASES: dict[str, list[str]] = {
    "freestyle": ["Entry & Extension", "Early Catch", "Pull Phase", "Push Phase", "Recovery", "Body Rotation", "Breathing"],
    "backstroke": ["Entry", "Early Pull", "Pull Phase", "Push Phase", "Recovery", "Hip Rotation", "Kick"],
    "breaststroke": ["Glide/Streamline", "Outsweep", "Insweep/Pull", "Push", "Recovery", "Kick", "Breathing"],
    "butterfly": ["Entry", "Outsweep", "Insweep", "Push", "Recovery", "First Kick", "Second Kick"],
}

# Ocean blue badge/bar (BGR: R=20, G=100, B=180)
_BADGE_COLOR = (180, 100, 20)
# Teal coaching cue overlay (BGR: R=30, G=160, B=140)
_CUE_COLOR = (140, 160, 30)


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


def _build_prompt(stroke: str, n_frames: int) -> str:
    phases = _STROKE_PHASES.get(stroke.lower(), _STROKE_PHASES["freestyle"])
    phase_hint = ", ".join(phases[:n_frames])
    return f"""Analyze these {n_frames} sequential frames from a {stroke} swimming stroke.

The frames are in chronological order and likely correspond to: {phase_hint}.

Be concise — observations and notes should be 1–2 sentences each.

Respond with valid JSON only — no markdown fences, no extra text:
{{
  "frame_observations": [
    {{"phase": "phase name", "observation": "1-2 sentence observation", "suggestion": "one actionable tip or null"}}
  ],
  "technique_ratings": [
    {{"area": "Entry & Catch", "rating": "good|fair|poor", "note": "one sentence"}},
    {{"area": "Pull & Push", "rating": "good|fair|poor", "note": "one sentence"}},
    {{"area": "Body Position", "rating": "good|fair|poor", "note": "one sentence"}},
    {{"area": "Kick", "rating": "good|fair|poor", "note": "one sentence"}},
    {{"area": "Breathing", "rating": "good|fair|poor", "note": "one sentence"}}
  ],
  "overall_assessment": "2-3 sentence overall assessment",
  "key_strengths": ["strength 1", "strength 2"],
  "areas_for_improvement": ["area 1 with specific detail", "area 2 with specific detail"],
  "recommended_drills": ["drill name and brief description 1", "drill name and brief description 2"]
}}"""


async def _call_claude(frames: list[np.ndarray], stroke: str) -> dict:
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
    content.append({"type": "text", "text": _build_prompt(stroke, len(frames))})

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

    # Numbered circle badge (top-left)
    cx, cy, radius = 28, 28, 20
    cv2.circle(img, (cx, cy), radius, _BADGE_COLOR, -1)
    badge_txt = str(frame_num)
    (tw, th), _ = cv2.getTextSize(badge_txt, font, 0.65, 2)
    cv2.putText(img, badge_txt, (cx - tw // 2, cy + th // 2), font, 0.65, (255, 255, 255), 2, cv2.LINE_AA)

    # Phase name bar (top, semi-transparent blue)
    bar_x = cx + radius + 8
    bar_bg = img.copy()
    cv2.rectangle(bar_bg, (bar_x, 8), (w - 8, 8 + 34), _BADGE_COLOR, -1)
    img = cv2.addWeighted(bar_bg, 0.82, img, 0.18, 0)
    cv2.putText(img, phase, (bar_x + 10, 8 + 24), font, 0.58, (255, 255, 255), 1, cv2.LINE_AA)

    # Coaching cue overlay (bottom, semi-transparent teal)
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
        cv2.rectangle(cue_bg, (0, h - box_h), (w, h), _CUE_COLOR, -1)
        img = cv2.addWeighted(cue_bg, 0.78, img, 0.22, 0)
        for j, ln in enumerate(lines):
            y = h - box_h + pad + (j + 1) * lh - 2
            cv2.putText(img, ln, (10, y), font, scale, (255, 255, 255), thick, cv2.LINE_AA)

    return img


async def analyze_swim_video(
    video_bytes: bytes,
    filename: str,
    stroke: str = "freestyle",
) -> SwimAnalysis:
    suffix = Path(filename).suffix or ".mp4"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        frames = _extract_frames(tmp_path)
        data = await _call_claude(frames, stroke)
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    observations = data.get("frame_observations", [])

    swim_phases = [
        SwimPhase(
            phase=obs.get("phase", f"Frame {i + 1}"),
            observation=obs.get("observation", ""),
            suggestion=obs.get("suggestion") or None,
        )
        for i, obs in enumerate(observations)
    ]

    technique_ratings = [
        TechniqueRating(
            area=r.get("area", ""),
            rating=r.get("rating", "fair"),
            note=r.get("note", ""),
        )
        for r in data.get("technique_ratings", [])
        if isinstance(r, dict)
    ]

    annotated_frames = [
        _frame_to_base64(
            _annotate_frame(
                frame=frames[i],
                frame_num=i + 1,
                phase=swim_phases[i].phase if i < len(swim_phases) else f"Frame {i + 1}",
                suggestion=swim_phases[i].suggestion if i < len(swim_phases) else None,
            )
        )
        for i in range(len(frames))
    ]

    return SwimAnalysis(
        swim_id=uuid.uuid4(),
        video_filename=filename,
        frames_analyzed=len(frames),
        stroke=stroke,
        overall_assessment=data.get("overall_assessment", ""),
        swim_phases=swim_phases,
        technique_ratings=technique_ratings,
        key_strengths=data.get("key_strengths", []),
        areas_for_improvement=data.get("areas_for_improvement", []),
        recommended_drills=data.get("recommended_drills", []),
        annotated_frames=annotated_frames,
    )
