from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import datetime


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    school: Mapped[str] = mapped_column(String(120), default="")
    major: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now()
    )

    analyses: Mapped[list["Analysis"]] = relationship(back_populates="user", cascade="all, delete-orphan")  # noqa: F821
    practice_sessions: Mapped[list["PracticeSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")  # noqa: F821
