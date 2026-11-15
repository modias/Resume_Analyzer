from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import datetime


class LearningPlan(Base):
    __tablename__ = "learning_plans"
    __table_args__ = (UniqueConstraint("user_id", "skill_key", name="uq_learning_plan_user_skill"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    skill: Mapped[str] = mapped_column(String(120))
    # Lowercased skill name so "docker" and "Docker" share one plan.
    skill_key: Mapped[str] = mapped_column(String(120), index=True)
    summary: Mapped[str] = mapped_column(Text, default="")
    level: Mapped[str] = mapped_column(String(20), default="")
    goal: Mapped[str] = mapped_column(String(300), default="")
    # "custom" when the user typed it; "analysis" when added from a resume analysis.
    # Analysis plans start with no lessons; the roadmap is generated on first open.
    source: Mapped[str] = mapped_column(String(20), default="custom")
    priority: Mapped[str] = mapped_column(String(10), default="")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now())

    user: Mapped["User"] = relationship(back_populates="learning_plans")  # noqa: F821
    lessons: Mapped[list["LearningLesson"]] = relationship(
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="LearningLesson.position",
        lazy="selectin",
    )


class LearningLesson(Base):
    __tablename__ = "learning_lessons"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("learning_plans.id"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    duration: Mapped[str] = mapped_column(String(40), default="")
    notes: Mapped[str] = mapped_column(Text, default="")  # JSON, generated on first open
    completed: Mapped[bool] = mapped_column(default=False)
    completed_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)

    plan: Mapped[LearningPlan] = relationship(back_populates="lessons")
