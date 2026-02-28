from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.database.mongodb import db
from bson import ObjectId
from jose import jwt
from fastapi import HTTPException, status
from app.config import settings
import logging
from jose import JWTError, ExpiredSignatureError
from starlette.responses import JSONResponse

class UserContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        SECRET_KEY = settings.JWT_SECRET
        ALGORITHM = settings.JWT_ALGORITHM
        user_id = None
        user = None
        role = None
        property_ids = []
        auth_header = request.headers.get("Authorization")
        logger = logging.getLogger("uvicorn.error")

        # Read public endpoints from environment variable PUBLIC_PATHS (comma-separated)
        public_paths = [p.strip() for p in settings.PUBLIC_PATHS.split(",") if p.strip()]
        if request.url.path in public_paths:
            # Allow public access, skip authentication
            response = await call_next(request)
            return response

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                user_id = payload.get("sub")
                if user_id is None:
                    logger.warning("JWT missing 'sub' claim.")
                    return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"detail": "Invalid authentication credentials"})
                user = await db["users"].find_one({"_id": ObjectId(user_id)})
                if user:
                    role = user.get("role")
                    property_ids = user.get("propertyIds", [])
                    # Sanitize user object (remove sensitive fields)
                    user = {k: v for k, v in user.items() if k not in ["password", "hashed_password"]}
            except ExpiredSignatureError:
                logger.info(f"Expired JWT for user_id: {user_id}")
                return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"detail": "Your session has expired. Please log in again or refresh your token."})
            except JWTError as e:
                logger.warning(f"JWT error: {str(e)}")
                return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"detail": "Invalid authentication credentials"})
            except Exception as e:
                logger.error(f"Unexpected error in UserContextMiddleware: {str(e)}")
                return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"detail": "Internal server error"})
        else:
            logger.warning("Missing or invalid Authorization header.")
            return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"detail": "Missing or invalid Authorization header"})
        # Attach metadata to request.state
        request.state.user_id = user_id
        request.state.role = role
        request.state.property_ids = property_ids
        request.state.current_user = user
        response = await call_next(request)
        return response


