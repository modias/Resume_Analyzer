from pydantic import BaseModel
import datetime

VALID_STATUSES = {"applied", "callback", "rejected", "offer"}


class ApplicationCreate(BaseModel):
    company: str
    role: str
    status: str = "applied"


class ApplicationUpdate(BaseModel):
    status: str


class ApplicationOut(BaseModel):
    id: int
    company: str
    role: str
    status: str
    applied_at: datetime.datetime

    model_config = {"from_attributes": True}


class TimelinePoint(BaseModel):
    week: str
    applications: int
    callbacks: int
