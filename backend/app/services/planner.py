from __future__ import annotations

import uuid

from anthropic import AsyncAnthropic

from app.config import settings
from app.models.golf import (
    PracticeDrill,
    PracticePlan,
    PracticeSession,
    RoundAnalysis,
)

_client = AsyncAnthropic(api_key=settings.anthropic_api_key)

_SYSTEM_PROMPT = """You are an expert PGA-certified golf instructor specializing in building
structured practice plans for amateur golfers. You create targeted, progressive training
schedules that address specific weaknesses while reinforcing strengths.

Your coaching notes should:
- Be specific to the player's recent performance data
- Include measurable targets and success criteria
- Reference the specific drills included in the plan
- Provide a mental game tip relevant to the player's scoring patterns
- Be written in an encouraging, professional tone (2-3 paragraphs)"""

_SYSTEM_PROMPT_BLOCK = {
    "type": "text",
    "text": _SYSTEM_PROMPT,
    "cache_control": {"type": "ephemeral"},
}

DRILL_LIBRARY: dict[str, list[dict]] = {
    "putting": [
        {
            "name": "Gate Drill",
            "description": "Place two tees just wider than the putter head 6 inches in front of the ball. Make 50 putts from 6 feet threading the gate to groove a square face at impact.",
            "duration_minutes": 15,
        },
        {
            "name": "Distance Control Ladder",
            "description": "Place targets at 10, 20, 30, and 40 feet. Hit 5 putts to each distance, aiming to finish within 18 inches. Track makes and near-misses.",
            "duration_minutes": 20,
        },
        {
            "name": "Circle of Death",
            "description": "Place 8 balls in a circle around the hole at 3 feet. Make all 8 consecutively before moving on. Builds pressure putting confidence.",
            "duration_minutes": 15,
        },
    ],
    "driving": [
        {
            "name": "Alignment Stick Drill",
            "description": "Place two alignment sticks parallel on the ground — one at your feet, one pointing at your target. Hit 20 drives focusing on parallel alignment and a smooth tempo.",
            "duration_minutes": 20,
        },
        {
            "name": "Fairway Targets",
            "description": "On the range, pick a specific landing zone 20 yards wide. Hit 30 drives attempting to land within the zone. Track hit percentage.",
            "duration_minutes": 25,
        },
        {
            "name": "Tempo Drill (9-to-3)",
            "description": "Take half swings (9 o'clock to 3 o'clock) focusing on staying on plane and hitting the center of the face. Build up to full swings over 20 minutes.",
            "duration_minutes": 20,
        },
    ],
    "iron_play": [
        {
            "name": "Divot Board Drill",
            "description": "Place an impact board or towel just behind the ball. Hit 30 mid-iron shots without touching the board to train hitting down and through.",
            "duration_minutes": 20,
        },
        {
            "name": "Stock Shot Shaping",
            "description": "Hit 10 shots with each of your 5 through 9 irons to a specific target. Focus on consistent ball flight and trajectory control.",
            "duration_minutes": 30,
        },
        {
            "name": "Flagstick Proximity Challenge",
            "description": "From 100, 125, 150, and 175 yards, hit 5 shots to a flag. Measure average proximity. Record to track improvement.",
            "duration_minutes": 25,
        },
    ],
    "short_game": [
        {
            "name": "Bump-and-Run Practice",
            "description": "From just off the green, hit 20 chip shots using a 7-iron or 8-iron bump-and-run. Focus on landing the ball on the green and rolling to the hole.",
            "duration_minutes": 15,
        },
        {
            "name": "Up-and-Down Challenge",
            "description": "From 5 different positions around the green, attempt to chip and putt in 2 strokes each. Repeat the circuit 3 times tracking successful up-and-downs.",
            "duration_minutes": 25,
        },
        {
            "name": "Sand Splash Drill",
            "description": "In a bunker, draw a line behind 10 balls and practice entering the sand 2 inches behind each ball. Focus on splashing the sand, not the ball.",
            "duration_minutes": 20,
        },
    ],
    "course_management": [
        {
            "name": "Course Strategy Mapping",
            "description": "Walk your home course (or use a course guide) and map out your ideal landing zones for each hole given your typical distances. Identify risk/reward tradeoffs.",
            "duration_minutes": 30,
        },
        {
            "name": "Scoring Zone Simulation",
            "description": "On the range, simulate holes from 100 yards in. Plan each shot as if course management decisions are required — pick specific targets and commit.",
            "duration_minutes": 20,
        },
    ],
    "par_3": [
        {
            "name": "Club Selection Matrix",
            "description": "Map out your carry distances for 7-iron through PW with half, three-quarter, and full swings. Build a reference card for par-3 club selection.",
            "duration_minutes": 25,
        },
        {
            "name": "Short Iron Accuracy",
            "description": "Hit 50 short irons (8-iron to PW) at a specific flag. Track how many land within a 20-foot radius. Aim for 60% over time.",
            "duration_minutes": 20,
        },
    ],
    "par_5": [
        {
            "name": "Lay-Up Distance Control",
            "description": "Practice hitting specific lay-up distances (75, 100, 125 yards) from the range to build confidence in leaving a full shot into par-5 greens.",
            "duration_minutes": 20,
        },
        {
            "name": "3-Shot Simulation",
            "description": "Simulate a par-5 with driver, lay-up iron, then approach. Rotate through 10 par-5 simulations tracking how often you reach GIR or near the green in 3.",
            "duration_minutes": 30,
        },
    ],
}

FOCUS_AREA_MAP: dict[str, str] = {
    "putting": "putting",
    "Putting": "putting",
    "driving": "driving",
    "Driving accuracy": "driving",
    "Driving": "driving",
    "iron_play": "iron_play",
    "Approach shots": "iron_play",
    "Iron play": "iron_play",
    "short_game": "short_game",
    "Short game": "short_game",
    "course_management": "course_management",
    "Course management": "course_management",
    "par_3": "par_3",
    "Par-3": "par_3",
    "Par-3 holes": "par_3",
    "par_5": "par_5",
    "Par-5": "par_5",
    "Par-5 holes": "par_5",
}


def weaknesses_to_focus_areas(weaknesses: list[str]) -> list[str]:
    areas: list[str] = []
    for weakness in weaknesses:
        for keyword, area in FOCUS_AREA_MAP.items():
            if keyword.lower() in weakness.lower() and area not in areas:
                areas.append(area)
    if not areas:
        areas = ["putting", "iron_play"]
    return areas[:4]


def build_practice_schedule(focus_areas: list[str]) -> list[PracticeSession]:
    sessions: list[PracticeSession] = []
    for day, area in enumerate(focus_areas, start=1):
        drills_data = DRILL_LIBRARY.get(area, DRILL_LIBRARY["putting"])[:2]
        drills = [
            PracticeDrill(
                name=d["name"],
                description=d["description"],
                duration_minutes=d["duration_minutes"],
                focus_area=area,
            )
            for d in drills_data
        ]
        location = "Putting green" if area == "putting" else ("Golf course" if area == "course_management" else "Driving range / practice facility")
        sessions.append(
            PracticeSession(
                day=day,
                total_duration_minutes=sum(d.duration_minutes for d in drills),
                location=location,
                drills=drills,
            )
        )
    return sessions


def _build_coaching_prompt(analysis: RoundAnalysis, focus_areas: list[str], sessions: list[PracticeSession]) -> str:
    session_summary = "\n".join(
        f"  Day {s.day}: {s.location} — {', '.join(d.name for d in s.drills)} ({s.total_duration_minutes} min)"
        for s in sessions
    )
    return f"""Write personalized coaching notes for this practice plan.

Player: {analysis.submission.player_name}
Recent Round: {analysis.stats.score_vs_par:+d} ({analysis.stats.total_score}) at {analysis.submission.course_name}

KEY STATS:
- Putts: {analysis.stats.total_putts} ({analysis.stats.putts_per_hole}/hole)
- Fairways: {analysis.stats.fairway_percentage}%
- GIR: {analysis.stats.gir_percentage}%
- Penalties: {analysis.stats.total_penalties}

ROUND STRENGTHS: {', '.join(analysis.strengths) if analysis.strengths else 'None identified'}
ROUND WEAKNESSES: {', '.join(analysis.weaknesses) if analysis.weaknesses else 'None identified'}

FOCUS AREAS: {', '.join(focus_areas)}

PRACTICE SESSIONS ASSIGNED:
{session_summary}

Write 2-3 paragraphs of personalized coaching notes that connect this player's specific round performance to the practice plan, explain why these drills were chosen, set measurable targets, and include one mental game tip."""


async def get_coaching_notes(analysis: RoundAnalysis, focus_areas: list[str], sessions: list[PracticeSession]) -> str:
    response = await _client.messages.create(
        model="claude-opus-4-7",
        max_tokens=800,
        thinking={"type": "adaptive"},
        system=[_SYSTEM_PROMPT_BLOCK],
        messages=[{"role": "user", "content": _build_coaching_prompt(analysis, focus_areas, sessions)}],
    )
    text_blocks = [b.text for b in response.content if b.type == "text"]
    return "\n\n".join(text_blocks)


async def generate_practice_plan(analysis: RoundAnalysis) -> PracticePlan:
    focus_areas = weaknesses_to_focus_areas(analysis.weaknesses)
    sessions = build_practice_schedule(focus_areas)
    coaching_notes = await get_coaching_notes(analysis, focus_areas, sessions)
    return PracticePlan(
        plan_id=uuid.uuid4(),
        round_id=analysis.round_id,
        focus_areas=focus_areas,
        sessions=sessions,
        coaching_notes=coaching_notes,
    )
