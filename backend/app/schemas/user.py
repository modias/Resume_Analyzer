from pydantic import BaseModel, EmailStr
import datetime


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    school: str = ""
    major: str = ""
    skills: list[str] = []
    dream_companies: list[str] = []
    dream_job: str = ""


class UserLogin(BaseModel):
    email: EmailStr
    password: str


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


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserUpdate(BaseModel):
    name: str | None = None
    school: str | None = None
    major: str | None = None
    skills: list[str] | None = None
    dream_companies: list[str] | None = None
    dream_job: str | None = None


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class UserLogOut(BaseModel):
    id: int
    action: str
    detail: str
    ip_address: str | None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}
