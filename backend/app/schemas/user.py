from pydantic import BaseModel
import datetime


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    school: str
    major: str
    skills: list[str] = []
    dream_companies: list[str] = []
    dream_job: str = ""
    is_verified: bool = False
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: str | None = None
    school: str | None = None
    major: str | None = None
    skills: list[str] | None = None
    dream_companies: list[str] | None = None
    dream_job: str | None = None


class UserLogOut(BaseModel):
    id: int
    action: str
    detail: str
    ip_address: str | None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}
