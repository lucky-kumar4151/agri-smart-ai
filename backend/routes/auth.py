from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from datetime import datetime
from database import get_database
from models.user import UserCreate, UserLogin, UserResponse, TokenResponse, UserUpdate
from middleware.auth import hash_password, verify_password, create_access_token, get_current_user
import traceback
import secrets

router = APIRouter()


# ── Google Sign-In model ──
class GoogleLoginData(BaseModel):
    name: str
    email: str
    google_id: str
    photo: str = ""


@router.post("/google-login", response_model=TokenResponse)
async def google_login(data: GoogleLoginData):
    """Handle Google Sign-In — find existing user by email or create a new one."""
    try:
        db = get_database()
        if db is None:
            raise HTTPException(status_code=503, detail="Database not available.")

        user = await db.users.find_one({"email": data.email})

        if user:
            # Existing user — just log them in
            user_id = str(user["_id"])
            access_token = create_access_token({
                "sub": user_id, "email": user["email"], "role": user["role"]
            })
            return TokenResponse(
                access_token=access_token,
                user=UserResponse(
                    id=user_id, name=user["name"], email=user["email"],
                    phone=user.get("phone", ""), role=user["role"],
                    language=user.get("language", "en"),
                    location=user.get("location", {}),
                    farm_details=user.get("farm_details", {}),
                    created_at=user.get("created_at", "")
                )
            )
        else:
            # New user — create account with Google data
            user_doc = {
                "name": data.name,
                "email": data.email,
                "password": hash_password(secrets.token_hex(32)),  # Random password for Google users
                "phone": "",
                "role": "farmer",
                "language": "en",
                "google_id": data.google_id,
                "photo": data.photo,
                "location": {"state": "", "district": "", "city": ""},
                "farm_details": {"farm_size": "", "farm_size_unit": "acres", "crops": [], "soil_type": "", "irrigation_type": ""},
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }
            result = await db.users.insert_one(user_doc)
            user_id = str(result.inserted_id)

            access_token = create_access_token({
                "sub": user_id, "email": data.email, "role": "farmer"
            })
            return TokenResponse(
                access_token=access_token,
                user=UserResponse(
                    id=user_id, name=data.name, email=data.email,
                    phone="", role="farmer", language="en",
                    location=user_doc["location"],
                    farm_details=user_doc["farm_details"],
                    created_at=user_doc["created_at"]
                )
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Google login failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Google login failed: {str(e)}")


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    try:
        db = get_database()
        if db is None:
            raise HTTPException(status_code=503, detail="Database not available. Please ensure MongoDB is running.")

        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        # Get role value - handle both enum and string
        role_value = user_data.role.value if hasattr(user_data.role, 'value') else str(user_data.role)

        # ── ADMIN RESTRICTION: Only ONE admin allowed, no public admin registration ──
        if role_value == "admin":
            existing_admin = await db.users.find_one({"role": "admin"})
            if existing_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin account already exists. Only one admin is allowed in the system."
                )
            # If no admin exists yet, allow creation (first-time seed)
            # In production, you'd want to seed the admin via a script, not via public registration

        user_doc = {
            "name": user_data.name,
            "email": user_data.email,
            "password": hash_password(user_data.password),
            "phone": user_data.phone or "",
            "role": "farmer" if role_value == "admin" and await db.users.find_one({"role": "admin"}) else role_value,
            "language": user_data.language or "en",
            "location": user_data.location.model_dump() if user_data.location else {"state": "", "district": "", "city": ""},
            "farm_details": user_data.farm_details.model_dump() if user_data.farm_details else {"farm_size": "", "farm_size_unit": "acres", "crops": [], "soil_type": "", "irrigation_type": ""},
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

        result = await db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)

        final_role = user_doc["role"]
        access_token = create_access_token({
            "sub": user_id, "email": user_data.email, "role": final_role
        })

        return TokenResponse(
            access_token=access_token,
            user=UserResponse(
                id=user_id, name=user_data.name, email=user_data.email,
                phone=user_data.phone or "", role=final_role, language=user_data.language or "en",
                location=user_doc["location"], farm_details=user_doc["farm_details"],
                created_at=user_doc["created_at"]
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Registration failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.post("/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    try:
        db = get_database()
        if db is None:
            raise HTTPException(status_code=503, detail="Database not available. Please ensure MongoDB is running.")

        user = await db.users.find_one({"email": login_data.email})
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

        if not verify_password(login_data.password, user["password"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

        user_id = str(user["_id"])
        access_token = create_access_token({
            "sub": user_id, "email": user["email"], "role": user["role"]
        })

        return TokenResponse(
            access_token=access_token,
            user=UserResponse(
                id=user_id, name=user["name"], email=user["email"],
                phone=user.get("phone", ""), role=user["role"], language=user.get("language", "en"),
                location=user.get("location", {}), farm_details=user.get("farm_details", {}),
                created_at=user.get("created_at", "")
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Login failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    from bson import ObjectId
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=str(user["_id"]), name=user["name"], email=user["email"],
        phone=user.get("phone", ""), role=user["role"], language=user.get("language", "en"),
        location=user.get("location", {}), farm_details=user.get("farm_details", {}),
        created_at=user.get("created_at", "")
    )


@router.put("/profile")
async def update_profile(update_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    from bson import ObjectId

    update_dict = {}
    for k, v in update_data.model_dump(exclude_none=True).items():
        if hasattr(v, 'model_dump'):
            update_dict[k] = v.model_dump()
        else:
            update_dict[k] = v
    update_dict["updated_at"] = datetime.utcnow().isoformat()

    await db.users.update_one(
        {"_id": ObjectId(current_user["user_id"])},
        {"$set": update_dict}
    )
    return {"message": "Profile updated successfully"}


# ── Forgot Password models ──
class ForgotPasswordData(BaseModel):
    email: str


class ResetPasswordData(BaseModel):
    email: str
    otp: str
    new_password: str


import random


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordData):
    """Generate a 6-digit OTP for password reset."""
    try:
        db = get_database()
        if db is None:
            raise HTTPException(status_code=503, detail="Database not available.")

        user = await db.users.find_one({"email": data.email})
        if not user:
            # Don't reveal whether email exists — return success either way
            return {"message": "If that email exists, a reset code has been sent."}

        # Generate 6-digit OTP
        otp_code = str(random.randint(100000, 999999))
        expires_at = datetime.utcnow().isoformat()

        # Store OTP in the user document
        await db.users.update_one(
            {"email": data.email},
            {"$set": {
                "reset_otp": otp_code,
                "reset_otp_created": expires_at,
            }}
        )

        # In production, send this via email. For now, log it.
        print(f"[RESET] 🔑 OTP for {data.email}: {otp_code}")

        return {"message": "If that email exists, a reset code has been sent.", "otp": otp_code}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Forgot password failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to process request.")


@router.post("/reset-password")
async def reset_password(data: ResetPasswordData):
    """Verify OTP and reset the user's password."""
    try:
        db = get_database()
        if db is None:
            raise HTTPException(status_code=503, detail="Database not available.")

        user = await db.users.find_one({"email": data.email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        stored_otp = user.get("reset_otp")
        otp_created = user.get("reset_otp_created")

        if not stored_otp or stored_otp != data.otp:
            raise HTTPException(status_code=400, detail="Invalid reset code.")

        # Check OTP expiry (10 minutes)
        if otp_created:
            created_time = datetime.fromisoformat(otp_created)
            elapsed = (datetime.utcnow() - created_time).total_seconds()
            if elapsed > 600:  # 10 minutes
                raise HTTPException(status_code=400, detail="Reset code has expired. Please request a new one.")

        if len(data.new_password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

        # Update password and clear OTP
        await db.users.update_one(
            {"email": data.email},
            {
                "$set": {"password": hash_password(data.new_password), "updated_at": datetime.utcnow().isoformat()},
                "$unset": {"reset_otp": "", "reset_otp_created": ""}
            }
        )

        print(f"[RESET] ✅ Password reset for {data.email}")
        return {"message": "Password reset successful."}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Reset password failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to reset password.")

