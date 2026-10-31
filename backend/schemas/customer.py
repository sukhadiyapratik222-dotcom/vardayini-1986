import re
from typing import Optional
from pydantic import BaseModel, Field, EmailStr, field_validator


class CustomerRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Customer's full name")
    email: EmailStr = Field(..., description="Valid customer email address")
    phone: str = Field(..., description="10-digit Indian mobile number")
    password: str = Field(..., min_length=6, max_length=128, description="Account password (min 6 characters)")

    @field_validator("phone")
    @classmethod
    def validate_indian_phone(cls, v: str) -> str:
        clean = re.sub(r"\D", "", v)
        if len(clean) == 12 and clean.startswith("91"):
            clean = clean[2:]
        if len(clean) != 10 or clean[0] not in "6789":
            raise ValueError("Phone number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.")
        return clean


class CustomerLogin(BaseModel):
    email: str = Field(..., description="Registered email address or phone number")
    password: str = Field(..., description="Account password")


class CustomerProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = None
    currentPassword: Optional[str] = None
    newPassword: Optional[str] = Field(None, min_length=6)

    @field_validator("phone")
    @classmethod
    def validate_phone_if_present(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        clean = re.sub(r"\D", "", v)
        if len(clean) == 12 and clean.startswith("91"):
            clean = clean[2:]
        if len(clean) != 10 or clean[0] not in "6789":
            raise ValueError("Invalid phone number format.")
        return clean


class CustomerResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    role: str = "customer"
    status: str = "active"
    createdAt: Optional[str] = None

    class Config:
        extra = "ignore"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: CustomerResponse
