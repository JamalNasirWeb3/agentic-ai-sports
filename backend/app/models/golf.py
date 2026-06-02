from __future__ import annotations

from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class HoleData(BaseModel):
    hole_number: int = Field(ge=1, le=18)
    par: int = Field(ge=3, le=5)
    score: int = Field(ge=1)
    putts: int = Field(ge=0)
    fairway_hit: Optional[bool] = None  # None for par-3s
    gir: bool = False
    penalty_strokes: int = Field(default=0, ge=0)


class RoundSubmission(BaseModel):
    player_name: str
    course_name: str
    date: date
    tee_box: str
    handicap: Optional[float] = None
    holes: list[HoleData] = Field(min_length=9, max_length=18)

    @model_validator(mode="after")
    def validate_hole_numbers(self) -> RoundSubmission:
        nums = [h.hole_number for h in self.holes]
        if len(nums) != len(set(nums)):
            raise ValueError("Duplicate hole numbers")
        return self


class ScoringBreakdown(BaseModel):
    eagles_or_better: int = 0
    birdies: int = 0
    pars: int = 0
    bogeys: int = 0
    double_bogeys: int = 0
    triple_or_worse: int = 0


class RoundStats(BaseModel):
    total_score: int
    total_par: int
    score_vs_par: int
    total_putts: int
    putts_per_hole: float
    fairways_hit: int
    fairways_attempted: int
    fairway_percentage: float
    greens_in_regulation: int
    gir_percentage: float
    total_penalties: int
    scoring_breakdown: ScoringBreakdown
    avg_score_par3: float
    avg_score_par4: float
    avg_score_par5: float
    front_nine_score: Optional[int] = None
    back_nine_score: Optional[int] = None


class RoundAnalysis(BaseModel):
    round_id: UUID
    submission: RoundSubmission
    stats: RoundStats
    strengths: list[str]
    weaknesses: list[str]
    ai_insights: str


class SwingPhase(BaseModel):
    phase: str
    observation: str
    suggestion: Optional[str] = None


class SwingAnalysis(BaseModel):
    swing_id: UUID
    video_filename: str
    frames_analyzed: int
    club: str
    overall_assessment: str
    swing_phases: list[SwingPhase]
    key_strengths: list[str]
    areas_for_improvement: list[str]
    recommended_drills: list[str]
    annotated_frames: list[str] = []  # base64 JPEG, one per phase


class PracticeDrill(BaseModel):
    name: str
    description: str
    duration_minutes: int
    focus_area: str


class PracticeSession(BaseModel):
    day: int = Field(ge=1)
    total_duration_minutes: int
    location: str
    drills: list[PracticeDrill]


class PracticePlan(BaseModel):
    plan_id: UUID
    round_id: UUID
    focus_areas: list[str]
    sessions: list[PracticeSession]
    coaching_notes: str
