from pydantic import BaseModel, EmailStr
import datetime


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    school: str = ""
    major: str = ""


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    school: str
    major: str
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
