from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    experience_level: str = "beginner"
    daily_effort_min: int = 30
    power_reliability: str = "stable"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    experience_level: str
    daily_effort_min: int
    power_reliability: str
    temperature_c: float
    humidity_pct: float
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    experience_level: Optional[str] = None
    daily_effort_min: Optional[int] = None
    power_reliability: Optional[str] = None
    temperature_c: Optional[float] = None
    humidity_pct: Optional[float] = None
