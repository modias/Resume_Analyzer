from sqlalchemy import String, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import datetime


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), default="")
    linkedin_id: Mapped[str | None] = mapped_column(String(120), nullable=True, unique=True, index=True)
    school: Mapped[str] = mapped_column(String(120), default="")
    major: Mapped[str] = mapped_column(String(120), default="")
    # JSON arrays stored as text — e.g. '["Python","SQL"]'
    skills: Mapped[str] = mapped_column(Text, default="[]")
    dream_companies: Mapped[str] = mapped_column(Text, default="[]")
    dream_job: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now()
    )

    # Email verification
    is_verified: Mapped[bool] = mapped_column(default=False)
    verification_code: Mapped[str | None] = mapped_column(String(6), nullable=True)
    verification_expires_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)

    analyses: Mapped[list["Analysis"]] = relationship(back_populates="user", cascade="all, delete-orphan")  # noqa: F821
    practice_sessions: Mapped[list["PracticeSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")  # noqa: F821
    logs: Mapped[list["UserLog"]] = relationship(back_populates="user", cascade="all, delete-orphan")  # noqa: F821
