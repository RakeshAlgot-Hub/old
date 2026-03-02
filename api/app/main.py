from dotenv import load_dotenv
load_dotenv() 
from app.database.mongodb import db
from contextlib import asynccontextmanager
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import logging

import os
from app.routes import health, auth, property, room, tenant, bed, subscription, dashboard, staff
from app.utils.rate_limit import limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.utils.exception_handlers import add_global_exception_handlers
from app.middleware.user_context import UserContextMiddleware

# Configure logging for APScheduler
logging.basicConfig()
scheduler_logger = logging.getLogger('apscheduler.executors.default')
scheduler_logger.setLevel(logging.INFO)

# Ensure 'static' directory exists
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

# FastAPI lifespan event handler for startup tasks
async def ensure_indexes():
    """Create essential indexes for production-grade queries."""
    logger = logging.getLogger(__name__)
    
    # ============ USERS COLLECTION ============
    await db["users"].create_index("email", unique=True)
    await db["users"].create_index("createdAt")
    await db["users"].create_index("phone")
    logger.info("✓ Users indexes created")
    
    # ============ TOKEN BLACKLIST COLLECTION ============
    await db["token_blacklist"].create_index("createdAt", expireAfterSeconds=60*60*24*7)
    logger.info("✓ Token blacklist indexes created")
    
    # ============ TENANTS COLLECTION ============
    await db["tenants"].create_index("propertyId")
    await db["tenants"].create_index("bedId")
    await db["tenants"].create_index([("propertyId", 1), ("autoGeneratePayments", 1)])
    logger.info("✓ Tenants indexes created")
    
    # ============ PAYMENTS COLLECTION ============
    await db["payments"].create_index("propertyId")
    await db["payments"].create_index("tenantId")
    await db["payments"].create_index("status")
    await db["payments"].create_index("dueDate")
    await db["payments"].create_index([("propertyId", 1), ("status", 1)])
    # Unique index to prevent duplicate payments (non-sparse to enforce uniqueness)
    await db["payments"].create_index([("tenantId", 1), ("dueDate", 1)], unique=True)
    logger.info("✓ Payments indexes created (including unique tenantId+dueDate)")
    
    # ============ BEDS COLLECTION ============
    await db["beds"].create_index("propertyId")
    await db["beds"].create_index("status")
    logger.info("✓ Beds indexes created")
    
    # ============ STAFF COLLECTION ============
    await db["staff"].create_index("propertyId")
    await db["staff"].create_index("role")
    await db["staff"].create_index("status")
    await db["staff"].create_index([("propertyId", 1), ("archived", 1)])
    logger.info("✓ Staff indexes created")


@asynccontextmanager
async def lifespan(app):
    await ensure_indexes()
    
    # Initialize APScheduler for background jobs
    scheduler = AsyncIOScheduler()
    logger = logging.getLogger(__name__)
    
    # Import here to avoid circular imports
    from app.services.tenant_service import TenantService
    tenant_service = TenantService()
    
    # Wrapper for scheduled job to add logging
    async def generate_payments_job():
        result = await tenant_service.generate_monthly_payments()
        # Result already contains timing info - logged by service
        return result
    
    # Job 1: Generate monthly payments daily at 00:05 UTC
    # This ensures all tenants get their monthly payment created on the same day
    scheduler.add_job(
        generate_payments_job,
        trigger=CronTrigger(hour=0, minute=5, timezone="UTC"),
        id="generate_monthly_payments",
        name="Generate monthly payments for tenants",
        replace_existing=True,
        max_instances=1,  # Prevent concurrent executions
        coalesce=True,     # Skip missed runs if delayed
        misfire_grace_time=300  # Allow 5min grace period
    )
    
    scheduler.start()
    app.state.scheduler = scheduler
    
    logger.info("✓ Background scheduler initialized")
    logger.info("✓ Jobs registered: generate_monthly_payments (daily at 00:05 UTC)")
    
    yield
    
    # Shutdown scheduler
    scheduler.shutdown()
    logger.info("✓ Background scheduler shut down")



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
app.include_router(staff.router, prefix=API_PREFIX)
app.include_router(payment.router, prefix=API_PREFIX)
app.include_router(subscription.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)


# Register global exception handlers
add_global_exception_handlers(app)