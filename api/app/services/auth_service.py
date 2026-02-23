from app.database.mongodb import db
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from jose import JWTError, jwt
from app.utils.helpers import hash_password, verify_password, create_access_token, create_refresh_token, SECRET_KEY, ALGORITHM
from app.database.token_blacklist import blacklist_token, is_token_blacklisted
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from app.models.user_schema import UserCreate, UserLogin, UserOut, AuthResponse
from app.database.mongodb import AsyncIOMotorClient

users_collection = db["users"]

async def register_user_service(user: UserCreate):
    existing = await users_collection.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    hashed_pw = hash_password(user.password)
    now = datetime.now(timezone.utc)
    user_doc = {
        "name": user.name,
        "email": user.email,
        "password": hashed_pw,
        "role": "propertyowner",
        "isVerified": True,
        "isDeleted": False,
        "lastLogin": None,
        "createdAt": now,
        "updatedAt": now,
        "deviceId": None,
        "deviceType": None,
        "osVersion": None,
        "appVersion": None,
    }
    result = await users_collection.insert_one(user_doc)
    user_id = str(result.inserted_id)
    access_token = create_access_token({"sub": user_id})
    refresh_token = create_refresh_token({"sub": user_id})
    user_out = UserOut(id=user_id, name=user_doc["name"], email=user_doc["email"])
    response = AuthResponse(accessToken=access_token, refreshToken=refresh_token, user=user_out)
    return JSONResponse(status_code=status.HTTP_201_CREATED, content=response.dict())

async def login_user_service(data: UserLogin):
    user = await users_collection.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if user.get("isDeleted"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deleted")
    await users_collection.update_one({"_id": user["_id"]}, {"$set": {"lastLogin": datetime.now(timezone.utc)}})
    token = create_access_token({"sub": str(user["_id"])})
    refresh_token = create_refresh_token({"sub": str(user["_id"])})
    user_out = UserOut(id=str(user["_id"]), name=user["name"], email=user["email"])
    response = AuthResponse(accessToken=token, refreshToken=refresh_token, user=user_out)
    return JSONResponse(status_code=status.HTTP_200_OK, content=response.dict())

def refresh_token_service(payload: dict):
    refresh_token = payload.get("refreshToken")
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing refresh token")
    if is_token_blacklisted(refresh_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is invalidated (blacklisted)")
    try:
        decoded = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        if decoded.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        user_id = decoded.get("sub")
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        token = create_access_token({"sub": user_id})
        response = {
            "accessToken": token,
            "user": {"id": user_id, "name": user["name"], "email": user["email"]}
        }
        return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(response))
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Token refresh failed")

def logout_user_service(payload: dict):
    refresh_token = payload.get("refreshToken")
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing refresh token")
    blacklist_token(refresh_token)
    return {"success": True}
