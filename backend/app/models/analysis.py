from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import datetime


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    resume_filename: Mapped[str] = mapped_column(String(255), default="")
    job_description: Mapped[str] = mapped_column(Text, default="")
    job_title: Mapped[str] = mapped_column(String(255), default="")
    company: Mapped[str] = mapped_column(String(255), default="")

    match_score: Mapped[float] = mapped_column(Float, default=0.0)
    required_coverage: Mapped[float] = mapped_column(Float, default=0.0)
    preferred_coverage: Mapped[float] = mapped_column(Float, default=0.0)
    quantified_impact: Mapped[float] = mapped_column(Float, default=0.0)

    extracted_skills: Mapped[str] = mapped_column(Text, default="")   # JSON list
    missing_skills: Mapped[str] = mapped_column(Text, default="")     # JSON list
    suggestions: Mapped[str] = mapped_column(Text, default="")        # JSON list

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="analyses")    # noqa: F821
