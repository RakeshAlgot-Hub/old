from fastapi import Body, APIRouter, status, Request
from app.utils.rate_limit import rate_limit_dep
from app.services.auth_service import register_user_service, login_user_service, refresh_token_service, logout_user_service
from app.models.user_schema import UserCreate, UserLogin, UserOut, AuthResponse
from app.models.user_schema import (
    UserCreate, UserLogin, UserOut, AuthResponse,
    RefreshTokenRequest, RefreshTokenResponse, LogoutRequest, LogoutResponse
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED, summary="Register a new user", tags=["auth"], response_model=AuthResponse)
async def register(user: UserCreate):
    return await register_user_service(user)

@router.post("/login", status_code=status.HTTP_200_OK, summary="Authenticate user and return JWT", tags=["auth"], response_model=AuthResponse)
@rate_limit_dep
async def login(request: Request, data: UserLogin):
    return await login_user_service(data)

@router.post("/refresh", status_code=status.HTTP_200_OK, summary="Refresh access token", tags=["auth"], response_model=RefreshTokenResponse)
async def refresh_token_endpoint(payload: RefreshTokenRequest):
    return refresh_token_service(payload)

@router.post("/logout", status_code=status.HTTP_200_OK, summary="Logout user", tags=["auth"], response_model=LogoutResponse)
async def logout(payload: LogoutRequest):
    return logout_user_service(payload)




