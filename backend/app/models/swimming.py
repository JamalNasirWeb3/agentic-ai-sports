from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class SwimPhase(BaseModel):
    phase: str
    observation: str
    suggestion: Optional[str] = None


class TechniqueRating(BaseModel):
    area: str
    rating: str  # "good" | "fair" | "poor"
    note: str


class SwimAnalysis(BaseModel):
    swim_id: UUID
    video_filename: str
    frames_analyzed: int
    stroke: str
    overall_assessment: str
    swim_phases: list[SwimPhase]
    technique_ratings: list[TechniqueRating] = []
    key_strengths: list[str]
    areas_for_improvement: list[str]
    recommended_drills: list[str]
    annotated_frames: list[str] = []
