from fastapi import APIRouter
from schemas.analysis import DashboardResponse, StatCard, SkillCoverage, SkillGap, SkillBreakdown, SkillBreakdownResource

router = APIRouter()

# ---------------------------------------------------------------------------
# Default data shown before a resume has been analyzed
# ---------------------------------------------------------------------------

_DEFAULT_STAT_CARDS = [
    StatCard(label="Required Skills Coverage", value=0, color="#6366f1"),
    StatCard(label="Preferred Skills Coverage", value=0, color="#8b5cf6"),
    StatCard(label="Quantified Impact", value=0, color="#ec4899"),
]

_DEFAULT_SKILL_COVERAGE: list[SkillCoverage] = []
_DEFAULT_SKILL_GAPS: list[SkillGap] = []
_DEFAULT_BREAKDOWNS: dict[str, SkillBreakdown] = {}


@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard() -> DashboardResponse:
    """
    Return the latest analysis summary for the dashboard.
    If no analysis has been run yet, returns has_analysis=False with zeroed values.
    """
    from api.routes.analyze import get_latest_result

    result = get_latest_result()

    if result is None:
        return DashboardResponse(
            has_analysis=False,
            match_score=0,
            stat_cards=_DEFAULT_STAT_CARDS,
            skill_coverage=_DEFAULT_SKILL_COVERAGE,
            skill_gaps=_DEFAULT_SKILL_GAPS,
            skill_breakdowns=_DEFAULT_BREAKDOWNS,
        )

    return DashboardResponse(
        has_analysis=True,
        match_score=result.match_score,
        stat_cards=result.stat_cards,
        skill_coverage=result.skill_coverage,
        skill_gaps=result.skill_gaps,
        skill_breakdowns=result.skill_breakdowns,
    )
