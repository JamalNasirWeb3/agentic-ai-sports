from __future__ import annotations

import uuid

from anthropic import AsyncAnthropic

from app.config import settings
from app.models.golf import (
    HoleData,
    RoundAnalysis,
    RoundStats,
    RoundSubmission,
    ScoringBreakdown,
)

_client = AsyncAnthropic(api_key=settings.anthropic_api_key)

_SYSTEM_PROMPT = """You are an expert golf coach and performance analyst with decades of experience
helping amateur and professional golfers improve their game. You analyze round data and provide
clear, actionable insights in a conversational but authoritative tone.

When analyzing a round:
- Identify patterns across the 18 holes, not just individual mistakes
- Consider the relationship between putting, approach shots, and scoring
- Reference specific statistics to support your observations
- Keep insights concise and focused (3-4 paragraphs)
- Be encouraging while being honest about areas needing improvement"""

_SYSTEM_PROMPT_BLOCK = {
    "type": "text",
    "text": _SYSTEM_PROMPT,
    "cache_control": {"type": "ephemeral"},
}


def compute_stats(holes: list[HoleData]) -> RoundStats:
    total_score = sum(h.score for h in holes)
    total_par = sum(h.par for h in holes)
    total_putts = sum(h.putts for h in holes)
    total_penalties = sum(h.penalty_strokes for h in holes)

    driveable = [h for h in holes if h.fairway_hit is not None]
    fairways_hit = sum(1 for h in driveable if h.fairway_hit)
    fairways_attempted = len(driveable)
    fairway_pct = (fairways_hit / fairways_attempted * 100) if fairways_attempted else 0.0

    gir_count = sum(1 for h in holes if h.gir)
    gir_pct = gir_count / len(holes) * 100

    breakdown = ScoringBreakdown()
    for h in holes:
        diff = h.score - h.par
        if diff <= -2:
            breakdown.eagles_or_better += 1
        elif diff == -1:
            breakdown.birdies += 1
        elif diff == 0:
            breakdown.pars += 1
        elif diff == 1:
            breakdown.bogeys += 1
        elif diff == 2:
            breakdown.double_bogeys += 1
        else:
            breakdown.triple_or_worse += 1

    def avg_by_par(par_val: int) -> float:
        group = [h for h in holes if h.par == par_val]
        return sum(h.score for h in group) / len(group) if group else 0.0

    front = [h for h in holes if h.hole_number <= 9]
    back = [h for h in holes if h.hole_number >= 10]

    return RoundStats(
        total_score=total_score,
        total_par=total_par,
        score_vs_par=total_score - total_par,
        total_putts=total_putts,
        putts_per_hole=round(total_putts / len(holes), 2),
        fairways_hit=fairways_hit,
        fairways_attempted=fairways_attempted,
        fairway_percentage=round(fairway_pct, 1),
        greens_in_regulation=gir_count,
        gir_percentage=round(gir_pct, 1),
        total_penalties=total_penalties,
        scoring_breakdown=breakdown,
        avg_score_par3=round(avg_by_par(3), 2),
        avg_score_par4=round(avg_by_par(4), 2),
        avg_score_par5=round(avg_by_par(5), 2),
        front_nine_score=sum(h.score for h in front) if front else None,
        back_nine_score=sum(h.score for h in back) if back else None,
    )


def identify_strengths_weaknesses(stats: RoundStats) -> tuple[list[str], list[str]]:
    strengths: list[str] = []
    weaknesses: list[str] = []

    if stats.putts_per_hole <= 1.7:
        strengths.append("Excellent putting — averaging under 1.7 putts per hole")
    elif stats.putts_per_hole >= 2.1:
        weaknesses.append(f"Putting — averaging {stats.putts_per_hole} putts per hole")

    if stats.fairways_attempted > 0:
        if stats.fairway_percentage >= 65:
            strengths.append(f"Strong driving accuracy — {stats.fairway_percentage:.0f}% fairways hit")
        elif stats.fairway_percentage <= 40:
            weaknesses.append(f"Driving accuracy — only {stats.fairway_percentage:.0f}% fairways hit")

    if stats.gir_percentage >= 55:
        strengths.append(f"Good ball-striking — {stats.gir_percentage:.0f}% greens in regulation")
    elif stats.gir_percentage <= 30:
        weaknesses.append(f"Approach shots — only {stats.gir_percentage:.0f}% greens in regulation")

    par3_par = stats.avg_score_par3
    if par3_par > 0:
        if par3_par <= 3.2:
            strengths.append(f"Par-3 performance — averaging {par3_par:.2f} strokes")
        elif par3_par >= 4.0:
            weaknesses.append(f"Par-3 holes — averaging {par3_par:.2f} strokes")

    par5_par = stats.avg_score_par5
    if par5_par > 0:
        if par5_par <= 5.0:
            strengths.append(f"Par-5 scoring — averaging {par5_par:.2f} strokes")
        elif par5_par >= 6.0:
            weaknesses.append(f"Par-5 holes — averaging {par5_par:.2f} strokes")

    if stats.total_penalties == 0:
        strengths.append("Clean round — zero penalty strokes")
    elif stats.total_penalties >= 4:
        weaknesses.append(f"Course management — {stats.total_penalties} penalty strokes")

    bd = stats.scoring_breakdown
    if bd.birdies + bd.eagles_or_better >= 3:
        strengths.append(f"Scoring upside — {bd.birdies + bd.eagles_or_better} birdies or better")
    if bd.double_bogeys + bd.triple_or_worse >= 3:
        weaknesses.append(f"Blow-up holes — {bd.double_bogeys + bd.triple_or_worse} doubles or worse")

    return strengths, weaknesses


def _build_analysis_prompt(submission: RoundSubmission, stats: RoundStats) -> str:
    hole_lines = "\n".join(
        f"  Hole {h.hole_number} (Par {h.par}): Score {h.score}, Putts {h.putts}"
        f"{', FW: ' + ('Hit' if h.fairway_hit else 'Miss') if h.fairway_hit is not None else ''}"
        f"{', GIR' if h.gir else ''}"
        f"{f', +{h.penalty_strokes} pen' if h.penalty_strokes else ''}"
        for h in sorted(submission.holes, key=lambda x: x.hole_number)
    )
    return f"""Analyze this golf round and provide personalized insights.

Player: {submission.player_name}
Course: {submission.course_name} ({submission.tee_box} tees)
Date: {submission.date}
Handicap: {submission.handicap if submission.handicap is not None else 'Not provided'}

HOLE-BY-HOLE DATA:
{hole_lines}

ROUND SUMMARY:
- Score: {stats.total_score} ({'+' if stats.score_vs_par >= 0 else ''}{stats.score_vs_par} vs par {stats.total_par})
- Putts: {stats.total_putts} ({stats.putts_per_hole}/hole)
- Fairways: {stats.fairways_hit}/{stats.fairways_attempted} ({stats.fairway_percentage}%)
- GIR: {stats.greens_in_regulation}/{len(submission.holes)} ({stats.gir_percentage}%)
- Penalties: {stats.total_penalties}
- Scoring: {stats.scoring_breakdown.eagles_or_better} eagles+, {stats.scoring_breakdown.birdies} birdies, {stats.scoring_breakdown.pars} pars, {stats.scoring_breakdown.bogeys} bogeys, {stats.scoring_breakdown.double_bogeys} doubles, {stats.scoring_breakdown.triple_or_worse} triples+

Provide 3-4 paragraphs of coaching insights covering: overall performance assessment, key patterns observed, biggest opportunity areas, and one specific technical focus for improvement."""


async def get_ai_insights(submission: RoundSubmission, stats: RoundStats) -> str:
    response = await _client.messages.create(
        model="claude-opus-4-7",
        max_tokens=1024,
        thinking={"type": "adaptive"},
        system=[_SYSTEM_PROMPT_BLOCK],
        messages=[{"role": "user", "content": _build_analysis_prompt(submission, stats)}],
    )
    text_blocks = [b.text for b in response.content if b.type == "text"]
    return "\n\n".join(text_blocks)


async def analyze_round(submission: RoundSubmission) -> RoundAnalysis:
    stats = compute_stats(submission.holes)
    strengths, weaknesses = identify_strengths_weaknesses(stats)
    ai_insights = await get_ai_insights(submission, stats)
    return RoundAnalysis(
        round_id=uuid.uuid4(),
        submission=submission,
        stats=stats,
        strengths=strengths,
        weaknesses=weaknesses,
        ai_insights=ai_insights,
    )
