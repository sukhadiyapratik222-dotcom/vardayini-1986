import os
import time
from typing import Optional, Dict, Any
from fastapi import HTTPException, Security, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import bcrypt
from jose import jwt, JWTError
from dotenv import load_dotenv

load_dotenv()

# Security Config
ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "vardayini_admin_secret_1986")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "vardayini_super_secret_jwt_key_2026_change_in_production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

security_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hashes plain text password using standard native bcrypt ($2b$)."""
    # Truncate to 72 bytes max as per standard bcrypt specification
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=10)
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain text password against its bcrypt hash."""
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


def create_access_token(data: Dict[str, Any], expires_delta_minutes: Optional[int] = None) -> str:
    """Generates a signed JWT access token."""
    to_encode = data.copy()
    expire_minutes = expires_delta_minutes or ACCESS_TOKEN_EXPIRE_MINUTES
    expire_ts = time.time() + (expire_minutes * 60)
    to_encode.update({"exp": expire_ts, "iat": time.time()})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT access token."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


async def get_current_user_optional(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
) -> Optional[Dict[str, Any]]:
    """Extracts authenticated user from Bearer token if present, returns None otherwise."""
    if not auth or not auth.credentials:
        return None
    token = auth.credentials
    payload = decode_access_token(token)
    return payload


async def get_current_user_required(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
) -> Dict[str, Any]:
    """Requires a valid user JWT bearer token."""
    user = await get_current_user_optional(auth)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing or invalid. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def require_admin(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
) -> bool:
    """
    Guards admin endpoints. Accepts either:
    1. A bearer token containing role='admin' or 'super_admin'
    2. A bearer token or header matching ADMIN_SECRET_KEY
    """
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin credentials required. Pass 'x-admin-key' or Authorization Bearer header.",
        )

    token = auth.credentials.strip()

    # Direct admin secret match
    if token == ADMIN_SECRET_KEY:
        return True

    # JWT decode match
    payload = decode_access_token(token)
    if payload and payload.get("role") in ["admin", "super_admin"]:
        return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Forbidden: Admin privileges are required for this action.",
    )
