from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class User(UserBase):
    id: int
    is_active: bool
    is_premium: bool
    is_admin: bool
    email_verified: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    is_premium: Optional[bool] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class EmailVerification(BaseModel):
    token: str

class VerificationResponse(BaseModel):
    success: bool
    message: str

class VisitCreate(BaseModel):
    path: str
    session_id: str

class VisitHeartbeat(BaseModel):
    visit_id: int

class UsersList(BaseModel):
    total: int
    skip: int
    limit: int
    users: list[User]
