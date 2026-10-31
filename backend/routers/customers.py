import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, Header, status
from database import get_database, serialize_mongo_doc
from schemas.customer import (
    CustomerRegister,
    CustomerLogin,
    CustomerProfileUpdate,
    CustomerResponse,
    TokenResponse,
)
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user_required,
    require_admin,
    ADMIN_SECRET_KEY,
)

router = APIRouter(prefix="", tags=["Customers & Auth"])


async def get_next_user_id(db) -> int:
    """Calculates next sequential integer user id."""
    highest = await db.users.find_one({}, sort=[("id", -1)])
    if highest and isinstance(highest.get("id"), int):
        return highest["id"] + 1
    return 1


def format_customer_response(user_doc: Dict[str, Any]) -> CustomerResponse:
    created = user_doc.get("createdAt")
    created_str = created.isoformat() if hasattr(created, "isoformat") else str(created or "")
    return CustomerResponse(
        id=int(user_doc.get("id", 0)),
        name=user_doc.get("name", "Customer"),
        email=user_doc.get("email", ""),
        phone=user_doc.get("phone", ""),
        role=user_doc.get("role", "customer"),
        status=user_doc.get("status", "active"),
        createdAt=created_str,
    )


# ------------------------------------------------------------------------------
# 1. CUSTOMER REGISTRATION
# ------------------------------------------------------------------------------
@router.post("/customers/register", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
@router.post("/auth/register", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def register_customer(payload: CustomerRegister):
    """
    Registers a new customer in MongoDB with safe bcrypt password hashing.
    Reuses existing 'users' collection to maintain compatibility.
    """
    db = await get_database()
    clean_email = payload.email.lower().strip()
    clean_phone = payload.phone.strip()

    # Check duplicate email
    existing_email = await db.users.find_one({"email": clean_email})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists. Please sign in instead.",
        )

    # Check duplicate phone
    existing_phone = await db.users.find_one({"phone": clean_phone})
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this phone number already exists.",
        )

    now = datetime.datetime.now(datetime.timezone.utc)
    next_id = await get_next_user_id(db)
    pwd_hash = hash_password(payload.password)

    user_doc = {
        "id": next_id,
        "name": payload.name.strip(),
        "email": clean_email,
        "phone": clean_phone,
        "passwordHash": pwd_hash,
        "role": "customer",
        "status": "active",
        "accessType": "customer",
        "createdAt": now,
        "updatedAt": now,
    }

    await db.users.insert_one(user_doc)

    customer_resp = format_customer_response(user_doc)
    access_token = create_access_token({
        "id": next_id,
        "email": clean_email,
        "role": "customer",
        "name": payload.name.strip(),
    })

    return {
        "message": "Customer registered successfully!",
        "user": customer_resp.model_dump(),
        "access_token": access_token,
        "token_type": "bearer",
    }


# ------------------------------------------------------------------------------
# 2. CUSTOMER LOGIN
# ------------------------------------------------------------------------------
@router.post("/customers/login", response_model=Dict[str, Any])
@router.post("/auth/login", response_model=Dict[str, Any])
async def login_customer(payload: CustomerLogin):
    """
    Authenticates customer using email or phone and password, returning JWT bearer token.
    """
    db = await get_database()
    identifier = payload.email.strip().lower()

    # Lookup by email or phone
    user_doc = await db.users.find_one({
        "$or": [{"email": identifier}, {"phone": payload.email.strip()}]
    })

    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your email/phone and password.",
        )

    hashed = user_doc.get("passwordHash") or user_doc.get("password_hash")
    if not hashed or not verify_password(payload.password, hashed):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your email/phone and password.",
        )

    if user_doc.get("status") == "inactive" or user_doc.get("status") == "banned":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is currently disabled. Please contact customer care.",
        )

    customer_resp = format_customer_response(user_doc)
    access_token = create_access_token({
        "id": user_doc.get("id"),
        "email": user_doc.get("email"),
        "role": user_doc.get("role", "customer"),
        "name": user_doc.get("name"),
    })

    return {
        "message": "Signed in successfully",
        "user": customer_resp.model_dump(),
        "access_token": access_token,
        "token_type": "bearer",
    }


# ------------------------------------------------------------------------------
# 3. CURRENT USER PROFILE
# ------------------------------------------------------------------------------
@router.get("/customers/me", response_model=Dict[str, Any])
@router.get("/auth/me", response_model=Dict[str, Any])
async def get_profile(current_user: Dict[str, Any] = Depends(get_current_user_required)):
    """Retrieves current authenticated customer profile."""
    db = await get_database()
    user_id = current_user.get("id")

    user_doc = await db.users.find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Customer record not found.")

    return {"user": format_customer_response(user_doc).model_dump()}


# ------------------------------------------------------------------------------
# 4. UPDATE CURRENT PROFILE
# ------------------------------------------------------------------------------
@router.put("/customers/me", response_model=Dict[str, Any])
async def update_profile(
    payload: CustomerProfileUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user_required),
):
    """Updates customer name, phone or password."""
    db = await get_database()
    user_id = current_user.get("id")

    user_doc = await db.users.find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Customer record not found.")

    update_fields: Dict[str, Any] = {"updatedAt": datetime.datetime.now(datetime.timezone.utc)}

    if payload.name:
        update_fields["name"] = payload.name.strip()

    if payload.phone:
        existing_phone = await db.users.find_one({"phone": payload.phone, "id": {"$ne": user_id}})
        if existing_phone:
            raise HTTPException(status_code=409, detail="This phone number is registered to another account.")
        update_fields["phone"] = payload.phone

    if payload.newPassword:
        if not payload.currentPassword:
            raise HTTPException(status_code=400, detail="Current password is required to set a new password.")
        hashed = user_doc.get("passwordHash") or user_doc.get("password_hash")
        if not hashed or not verify_password(payload.currentPassword, hashed):
            raise HTTPException(status_code=400, detail="Current password does not match.")
        update_fields["passwordHash"] = hash_password(payload.newPassword)

    await db.users.update_one({"id": user_id}, {"$set": update_fields})
    refreshed = await db.users.find_one({"id": user_id})

    return {
        "message": "Profile updated successfully",
        "user": format_customer_response(refreshed).model_dump(),
    }


# ------------------------------------------------------------------------------
# 5. LIST CUSTOMERS [Admin Protected]
# ------------------------------------------------------------------------------
@router.get("/customers", response_model=Dict[str, Any])
async def list_customers(
    limit: int = 50,
    skip: int = 0,
    x_admin_key: Optional[str] = Header(None),
):
    """Lists registered customers (Admin only)."""
    if x_admin_key != ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Admin authorization required to view customer list.")

    db = await get_database()
    total = await db.users.count_documents({"role": "customer"})
    cursor = db.users.find({"role": "customer"}).sort("id", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)

    return {
        "customers": [format_customer_response(d).model_dump() for d in docs],
        "total": total,
    }
