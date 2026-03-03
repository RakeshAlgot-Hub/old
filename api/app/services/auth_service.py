from datetime import datetime, timezone, timedelta
from bson import ObjectId
from jose import JWTError, jwt
from fastapi import HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
import random
import time
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from app.database.mongodb import db
from app.database.token_blacklist import blacklist_token, is_token_blacklisted
from app.config import settings
from app.utils.helpers import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    SECRET_KEY,
    ALGORITHM,
)
from app.utils.attempt_tracking import (
    check_login_attempts,
    increment_login_attempts,
    reset_login_attempts,
    check_otp_attempts,
    increment_otp_attempts,
    reset_otp_attempts,
    delete_otp_attempts,
)
# from app.utils.email_service import send_otp_email  # TODO: Enable in production
from app.models.user_schema import UserCreate, UserLogin, UserOut
import re

users_collection = db["users"]
email_otp_collection = db["email_otps"]


def validate_indian_phone(phone: str) -> bool:
    """Validate Indian phone numbers (+91 followed by 10 digits)"""
    pattern = r'^\+91[6-9]\d{9}$'
    return bool(re.match(pattern, phone.strip()))


def _get_google_client_ids() -> list[str]:
    return [client_id.strip() for client_id in settings.GOOGLE_CLIENT_IDS.split(",") if client_id.strip()]


def _verify_google_id_token(id_token: str) -> dict:
    if not id_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google idToken is required")

    allowed_client_ids = _get_google_client_ids()
    if not allowed_client_ids:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google sign-in is not configured on server",
        )

    last_error = None
    token_info = None
    request_adapter = google_requests.Request()

    for audience in allowed_client_ids:
        try:
            token_info = google_id_token.verify_oauth2_token(id_token, request_adapter, audience=audience)
            break
        except Exception as exc:
            last_error = exc

    if not token_info:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token") from last_error

    issuer = token_info.get("iss")
    if issuer not in ["accounts.google.com", "https://accounts.google.com"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token issuer")

    if not token_info.get("email_verified"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google email is not verified")

    return token_info


def _build_auth_payload(user_doc: dict, user_id: str):
    access_token = create_access_token({"sub": user_id})
    refresh_token = create_refresh_token({"sub": user_id})
    expires_at = int(time.time()) + 60 * 60 * 24 * 30
    user_out = UserOut(
        id=user_id,
        name=user_doc["name"],
        email=user_doc["email"],
        phone=user_doc.get("phone"),
        propertyIds=user_doc.get("propertyIds", [])
    )
    return {
        "user": user_out.model_dump(),
        "tokens": {
            "accessToken": access_token,
            "refreshToken": refresh_token,
            "expiresAt": expires_at,
        },
    }


async def register_user_service(user: UserCreate):
    # Validate email
    existing = await users_collection.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    # Validate phone number (India only)
    if not validate_indian_phone(user.phone):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid Indian phone number. Format: +91XXXXXXXXXX"
        )

    # Check if email is verified
    otp_doc = await email_otp_collection.find_one({"email": user.email, "verified": True})
    if not otp_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Email not verified. Please verify your email first."
        )

    now = datetime.now(timezone.utc)
    user_doc = {
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "password": hash_password(user.password),
        "role": "propertyowner",
        "isVerified": True,
        "isEmailVerified": True,
        "isDeleted": False,
        "lastLogin": None,
        "createdAt": now,
        "updatedAt": now,
        "deviceId": None,
        "deviceType": None,
        "osVersion": None,
        "appVersion": None,
        "propertyIds": [],
        "propertyLimit": 3,
    }

    result = await users_collection.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Create 3 default subscriptions for the user (free, pro, premium)
    from app.services.subscription_service import SubscriptionService
    await SubscriptionService.create_default_subscriptions(user_id)
    
    # Clean up the OTP doc after successful registration
    await email_otp_collection.delete_one({"email": user.email})
    
    response = _build_auth_payload(user_doc, user_id)
    return JSONResponse(status_code=status.HTTP_201_CREATED, content={"data": response})


async def login_user_service(data: UserLogin):
    # Check if account is locked due to failed attempts
    is_locked, minutes_remaining = await check_login_attempts(data.email)
    if is_locked:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Please try again in {minutes_remaining} minutes."
        )

    user = await users_collection.find_one({"email": data.email})
    if not user or not verify_password(data.password, user.get("password", "")):
        failed_count = await increment_login_attempts(data.email)
        remaining_attempts = 5 - failed_count
        
        if failed_count >= 5:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed login attempts. Your account is locked for 10 minutes."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid email or password. {remaining_attempts} attempt(s) remaining."
            )

    if user.get("isDeleted"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deleted")

    # Reset attempts on successful login
    await reset_login_attempts(data.email)

    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"lastLogin": datetime.now(timezone.utc), "updatedAt": datetime.now(timezone.utc)}},
    )

    user_id = str(user["_id"])
    response = _build_auth_payload(user, user_id)
    return JSONResponse(status_code=status.HTTP_200_OK, content={"data": response})


async def google_sign_in_service(payload):
    now = datetime.now(timezone.utc)
    token_info = _verify_google_id_token(payload.idToken)

    email = token_info.get("email")
    name = token_info.get("name") or token_info.get("given_name") or "Google User"
    google_id = token_info.get("sub")

    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google token has no email")

    user = await users_collection.find_one({"email": email})

    if not user:
        user_doc = {
            "name": name,
            "email": email,
            "password": hash_password(f"google-{random.randint(100000, 999999)}"),
            "role": "propertyowner",
            "isVerified": True,
            "isDeleted": False,
            "lastLogin": now,
            "createdAt": now,
            "updatedAt": now,
            "authProvider": "google",
            "googleId": google_id,
            "phone": None,
            "location": None,
        }
        result = await users_collection.insert_one(user_doc)
        user_id = str(result.inserted_id)
        
        # Create 3 default subscriptions for the user (free, pro, premium)
        from app.services.subscription_service import SubscriptionService
        await SubscriptionService.create_default_subscriptions(user_id)
        
        response = _build_auth_payload(user_doc, user_id)
        return JSONResponse(status_code=status.HTTP_200_OK, content={"data": response})

    if user.get("isDeleted"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deleted")

    await users_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "lastLogin": now,
                "updatedAt": now,
                "authProvider": "google",
                "googleId": google_id,
            }
        },
    )

    user_id = str(user["_id"])
    response = _build_auth_payload(user, user_id)
    return JSONResponse(status_code=status.HTTP_200_OK, content={"data": response})


async def send_email_otp_service(email: str):
    """Send OTP to email for verification during registration"""
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is required")

    normalized_email = email.strip().lower()
    # TODO: Use random OTP in production: otp = str(random.randint(100000, 999999))
    otp = "130499"  # Mock OTP for development
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=10)

    # Delete any existing OTP attempts when a new OTP is requested
    await delete_otp_attempts(normalized_email)

    await email_otp_collection.update_one(
        {"email": normalized_email},
        {
            "$set": {
                "email": normalized_email,
                "otp": otp,
                "verified": False,
                "createdAt": now,
                "expiresAt": expires_at,
            }
        },
        upsert=True,
    )

    # TODO: In production, integrate with SendGrid email service
    # For now, logging the OTP for testing purposes
    print(f"[DEV] OTP for {normalized_email}: {otp}")

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "data": {
                "message": "OTP sent successfully to your email",
            }
        },
    )


async def verify_email_otp_service(email: str, otp: str):
    """Verify OTP sent to email during registration"""
    if not email or not otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email and OTP are required")

    normalized_email = email.strip().lower()
    now = datetime.now(timezone.utc)

    # Check if account is locked due to failed OTP attempts
    is_locked, minutes_remaining = await check_otp_attempts(normalized_email)
    if is_locked:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed OTP attempts. Please try again in {minutes_remaining} minutes."
        )

    otp_doc = await email_otp_collection.find_one({"email": normalized_email})
    if not otp_doc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP not found. Please request a new OTP")

    if otp_doc.get("expiresAt"):
        expires_at = otp_doc["expiresAt"]
        # Ensure timezone-aware comparison (handle both naive and aware datetimes from MongoDB)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < now:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP expired. Please request a new OTP")

    if otp_doc.get("otp") != otp:
        failed_count = await increment_otp_attempts(normalized_email)
        remaining_attempts = 5 - failed_count
        
        if failed_count >= 5:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed OTP attempts. Please request a new OTP after 10 minutes."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid OTP. {remaining_attempts} attempt(s) remaining."
            )

    # Reset OTP attempts on successful verification
    await reset_otp_attempts(normalized_email)

    # Mark email as verified
    await email_otp_collection.update_one(
        {"email": normalized_email},
        {"$set": {"verified": True, "updatedAt": now}}
    )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "data": {
                "message": "Email verified successfully",
            }
        },
    )


async def get_current_user_service(request: Request):
    current_user = getattr(request.state, "current_user", None)
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    user_id = str(current_user.get("_id")) if current_user.get("_id") else ""
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")

    user_out = UserOut(
        id=user_id,
        name=current_user.get("name", ""),
        email=current_user.get("email", ""),
        phone=current_user.get("phone"),
        propertyIds=current_user.get("propertyIds", []),
    )
    return JSONResponse(status_code=status.HTTP_200_OK, content={"data": user_out.model_dump()})


async def refresh_token_service(payload):
    refresh_token = payload.refreshToken
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing refresh token")

    if await is_token_blacklisted(refresh_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is invalidated (blacklisted)")

    try:
        decoded = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        if decoded.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

        user_id = decoded.get("sub")
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
        # Check if user is deleted
        if user.get("isDeleted"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deleted")

        await blacklist_token(refresh_token)
        new_refresh_token = create_refresh_token({"sub": user_id})
        token = create_access_token({"sub": user_id})
        expires_at = int(time.time()) + 60 * 60 * 24 * 30
        
        # Build user data
        user_out = UserOut(
            id=user_id,
            name=user["name"],
            email=user["email"],
            phone=user.get("phone"),
            propertyIds=user.get("propertyIds", []),
        )
        
        response = {
            "tokens": {
                "accessToken": token,
                "refreshToken": new_refresh_token,
                "expiresAt": expires_at,
            },
            "user": user_out.model_dump(),
        }
        return JSONResponse(status_code=status.HTTP_200_OK, content={"data": jsonable_encoder(response)})
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Token refresh failed")


async def logout_user_service(payload):
    refresh_token = payload.refreshToken
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing refresh token")

    await blacklist_token(refresh_token)
    return {"success": True}
