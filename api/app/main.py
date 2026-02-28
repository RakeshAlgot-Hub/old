from dotenv import load_dotenv
load_dotenv() 
from app.database.mongodb import db
from contextlib import asynccontextmanager
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import os
from app.routes import health, auth, property, room, tenant, bed, subscription
from app.utils.rate_limit import limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.utils.exception_handlers import add_global_exception_handlers
from app.middleware.user_context import UserContextMiddleware

# Ensure 'static' directory exists
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

# FastAPI lifespan event handler for startup tasks
async def ensure_indexes():
    # Users: unique email, index on createdAt
    await db["users"].create_index("email", unique=True)
    await db["users"].create_index("createdAt")
    
    # Token blacklist: TTL index on createdAt (7 days)
    await db["token_blacklist"].create_index("createdAt", expireAfterSeconds=60*60*24*7)

@asynccontextmanager
async def lifespan(app):
    await ensure_indexes()
    yield



app = FastAPI(lifespan=lifespan)
app.add_middleware(UserContextMiddleware)
app.mount("/static", StaticFiles(directory=static_dir), name="static")
enforce_https = os.getenv("ENFORCE_HTTPS", "False").lower() == "true"
if enforce_https:
    app.add_middleware(HTTPSRedirectMiddleware)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, lambda request, exc: JSONResponse(status_code=429, content={"detail": "Too many requests. Please try again later."}))
app.add_middleware(SlowAPIMiddleware)

# Production-safe CORS setup
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if not allowed_origins_env:
    raise RuntimeError("ALLOWED_ORIGINS environment variable must be set for production-safe CORS.")
allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
if not allowed_origins:
    raise RuntimeError("ALLOWED_ORIGINS must specify at least one domain.")

# Only allow credentials if needed (e.g., cookies, auth headers)
allow_credentials = os.getenv("ALLOW_CREDENTIALS", "False").lower() == "true"

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
API_PREFIX = "/api/v1"



app.include_router(health.router, prefix=API_PREFIX)
app.include_router(auth.router, prefix=API_PREFIX)

from app.routes import payment
app.include_router(property.router, prefix=API_PREFIX)
app.include_router(room.router, prefix=API_PREFIX)
app.include_router(tenant.router, prefix=API_PREFIX)
app.include_router(bed.router, prefix=API_PREFIX)
app.include_router(payment.router, prefix=API_PREFIX)
app.include_router(subscription.router, prefix=API_PREFIX)


# Register global exception handlers
add_global_exception_handlers(app)