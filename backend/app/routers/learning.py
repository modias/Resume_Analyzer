import datetime
import json

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.analysis import Analysis
from app.models.learning import LearningLesson, LearningPlan
from app.models.user import User
from app.schemas.learning import (
    CompleteLessonRequest,
    CreatePlanRequest,
    LearningOverview,
    LessonDetail,
    LessonOut,
    PlanOut,
    PlanSummary,
    RecommendedSkill,
)
from app.services.auth import get_optional_user as get_current_user
from app.services.learning_ai import (
    LearningAIUnavailable,
    generate_lesson_notes,
    generate_roadmap,
)
from app.services.learning_queue import skill_key as _skill_key
from app.services.match_scorer import _split_required_preferred
from app.services.skill_extractor import extract_skills

router = APIRouter(prefix="/learn", tags=["learning"])


def _plan_progress(plan: LearningPlan) -> tuple[int, int, float]:
    total = len(plan.lessons)
    done = sum(1 for l in plan.lessons if l.completed)
    return done, total, round(done / total * 100, 1) if total else 0.0


def _lesson_out(lesson: LearningLesson) -> LessonOut:
    return LessonOut(
        id=lesson.id,
        position=lesson.position,
        title=lesson.title,
        description=lesson.description,
        duration=lesson.duration,
        completed=lesson.completed,
        has_notes=bool(lesson.notes),
    )


def _plan_out(plan: LearningPlan) -> PlanOut:
    _, _, progress = _plan_progress(plan)
    return PlanOut(
        id=plan.id,
        skill=plan.skill,
        summary=plan.summary,
        level=plan.level or "",
        goal=plan.goal or "",
        progress=progress,
        lessons=[_lesson_out(l) for l in plan.lessons],
    )


async def _latest_analysis(db: AsyncSession, user: User) -> Analysis | None:
    result = await db.execute(
        select(Analysis)
        .where(Analysis.user_id == user.id)
        .order_by(Analysis.created_at.desc(), Analysis.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _user_plans(db: AsyncSession, user: User) -> list[LearningPlan]:
    result = await db.execute(
        select(LearningPlan)
        .where(LearningPlan.user_id == user.id)
        .order_by(LearningPlan.created_at.desc(), LearningPlan.id.desc())
    )
    return list(result.scalars().all())


async def _owned_plan(db: AsyncSession, user: User, plan_id: int) -> LearningPlan:
    plan = await db.get(LearningPlan, plan_id)
    if plan is None or plan.user_id != user.id:
        raise HTTPException(status_code=404, detail="Learning plan not found")
    return plan


async def _owned_lesson(db: AsyncSession, user: User, lesson_id: int) -> LearningLesson:
    lesson = await db.get(LearningLesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    plan = await _owned_plan(db, user, lesson.plan_id)
    lesson.plan = plan
    return lesson


def _known_skills(user: User, analysis: Analysis | None) -> list[str]:
    skills: list[str] = []
    for raw in (user.skills, analysis.extracted_skills if analysis else None):
        try:
            values = json.loads(raw or "[]")
        except Exception:
            values = []
        for s in values if isinstance(values, list) else []:
            if s not in skills:
                skills.append(s)
    return skills


@router.get("/overview", response_model=LearningOverview)
async def learning_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analysis = await _latest_analysis(db, current_user)
    plans = await _user_plans(db, current_user)
    plans_by_key = {p.skill_key: p for p in plans}

    def plan_state(skill: str) -> tuple[LearningPlan | None, float]:
        plan = plans_by_key.get(_skill_key(skill))
        return (plan, _plan_progress(plan)[2]) if plan else (None, 0.0)

    required: list[str] = []
    preferred: list[str] = []
    resume_skills: set[str] = set()
    if analysis:
        jd_skills = extract_skills(analysis.job_description or "")
        required, preferred = _split_required_preferred(analysis.job_description or "", jd_skills)
        if analysis.resume_text:
            resume_skills = set(extract_skills(analysis.resume_text))
        else:
            resume_skills = set(_known_skills(current_user, analysis))

    target = list(dict.fromkeys(required + preferred))
    covered = in_progress = to_learn = 0
    recommended: list[RecommendedSkill] = []
    for skill in target:
        plan, progress = plan_state(skill)
        if skill in resume_skills or progress >= 100:
            covered += 1
            if skill in resume_skills:
                continue
        elif plan and plan.lessons:
            in_progress += 1
        else:
            to_learn += 1
        recommended.append(
            RecommendedSkill(
                skill=skill,
                priority="High" if skill in required else "Medium",
                progress=progress,
                plan_id=plan.id if plan else None,
            )
        )
    recommended.sort(key=lambda r: (r.priority != "High", r.progress >= 100))

    plan_summaries = []
    for p in plans:
        done, total, progress = _plan_progress(p)
        plan_summaries.append(
            PlanSummary(
                id=p.id,
                skill=p.skill,
                progress=progress,
                completed_lessons=done,
                total_lessons=total,
                source=p.source or "custom",
                priority=p.priority or "",
            )
        )
    # Started-but-unfinished first, then not-started (High before Medium), then finished.
    plan_summaries.sort(
        key=lambda s: (
            0 if 0 < s.total_lessons and s.progress < 100 else 2 if s.progress >= 100 else 1,
            s.priority != "High",
        )
    )

    return LearningOverview(
        target_role=(analysis.job_title if analysis else "") or "",
        has_analysis=analysis is not None,
        readiness=round(covered / len(target) * 100, 1) if target else None,
        covered=covered,
        total=len(target),
        in_progress=in_progress,
        to_learn=to_learn,
        recommended=recommended,
        plans=plan_summaries,
    )


@router.post("/plan", response_model=PlanOut)
async def create_plan(
    body: CreatePlanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    skill = " ".join(body.skill.split())
    key = _skill_key(skill)
    if not key:
        raise HTTPException(status_code=422, detail="Skill name is required")

    existing = await db.execute(
        select(LearningPlan).where(LearningPlan.user_id == current_user.id, LearningPlan.skill_key == key)
    )
    plan = existing.scalar_one_or_none()
    if plan and plan.lessons:
        return _plan_out(plan)

    if plan is None:
        plan = LearningPlan(user_id=current_user.id, skill=skill, skill_key=key, source="custom", lessons=[])
        db.add(plan)
    await _build_roadmap(db, current_user, plan, level=body.level, goal=body.goal.strip())
    return _plan_out(plan)


async def _build_roadmap(
    db: AsyncSession,
    user: User,
    plan: LearningPlan,
    *,
    level: str,
    goal: str,
) -> None:
    """Generate lessons for a plan that has none yet (new, or added from an analysis)."""
    analysis = await _latest_analysis(db, user)
    roadmap = await generate_roadmap(
        plan.skill,
        (analysis.job_title if analysis else "") or user.dream_job or "",
        _known_skills(user, analysis),
        level=level,
        goal=goal,
    )
    plan.summary = roadmap.get("summary", "")
    plan.level = level
    plan.goal = goal
    plan.lessons = [
        LearningLesson(position=i, title=l["title"], description=l["description"], duration=l["duration"])
        for i, l in enumerate(roadmap["lessons"])
    ]
    await db.commit()
    await db.refresh(plan, attribute_names=["lessons"])


@router.get("/plan/{plan_id}", response_model=PlanOut)
async def get_plan(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = await _owned_plan(db, current_user, plan_id)
    if not plan.lessons:
        await _build_roadmap(db, current_user, plan, level=plan.level or "", goal=plan.goal or "")
    return _plan_out(plan)


@router.delete("/plan/{plan_id}", status_code=204)
async def delete_plan(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = await _owned_plan(db, current_user, plan_id)
    await db.delete(plan)
    await db.commit()
    return Response(status_code=204)


@router.get("/lesson/{lesson_id}", response_model=LessonDetail)
async def get_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lesson = await _owned_lesson(db, current_user, lesson_id)
    plan = lesson.plan

    if not lesson.notes:
        analysis = await _latest_analysis(db, current_user)
        try:
            notes = await generate_lesson_notes(
                plan.skill,
                lesson.title,
                lesson.description,
                lesson.position + 1,
                [l.title for l in plan.lessons],
                (analysis.job_title if analysis else "") or current_user.dream_job or "",
                level=plan.level or "",
                goal=plan.goal or "",
            )
        except LearningAIUnavailable as exc:
            raise HTTPException(status_code=503, detail=str(exc))
        lesson.notes = json.dumps(notes)
        await db.commit()

    return LessonDetail(
        **_lesson_out(lesson).model_dump(),
        plan_id=plan.id,
        skill=plan.skill,
        notes=json.loads(lesson.notes),
    )


@router.post("/lesson/{lesson_id}/complete", response_model=PlanOut)
async def complete_lesson(
    lesson_id: int,
    body: CompleteLessonRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lesson = await _owned_lesson(db, current_user, lesson_id)
    lesson.completed = body.completed
    lesson.completed_at = datetime.datetime.utcnow() if body.completed else None
    await db.commit()
    plan = await _owned_plan(db, current_user, lesson.plan_id)
    await db.refresh(plan, attribute_names=["lessons"])
    return _plan_out(plan)
