# FastAPI + MongoDB Backend

## Structure

- `app/main.py`: FastAPI entrypoint
- `app/models/`: Pydantic models
- `app/routes/`: API routes
- `app/services/`: Business logic
- `app/database/`: MongoDB connection
- `app/utils/`: Utility functions
- `app/config/`: Settings/configuration
- `app/tests/`: Test cases

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run the server:
   ```bash
   uvicorn app.main:app --reload
   ```

## Environment

- Configure `.env` for MongoDB and debug settings.
### Subscription Plans Configuration

Subscription plans (properties, tenants, rooms, staff limits and pricing) can be customized via environment variables for production deployments.

**Format:** Simple key=value pairs (e.g., `freeProperties=2`, `proStaff=8`, `premiumPrice=2499`)

**Example .env:**
```env
# FREE PLAN
freeProperties=2
freeTenants=20
freeRooms=30
freeStaff=4
freePrice=0
# PRO PLAN
proProperties=10
proTenants=100
proRooms=30
proStaff=8
proPrice=999

# PREMIUM PLAN
premiumProperties=999
premiumTenants=999
premiumRooms=30
premiumStaff=15
premiumPrice=2499
```

**To change pricing in production:**

For example, to change Pro plan price from ₹999 to ₹1499, just update:
```env
proPrice=1499
```

Price text is **generated automatically** from the price value (999 paise = ₹9.99, 2499 paise = ₹24.99, etc.)

**If not set:** System uses default values
```
Free: properties=2, tenants=20, rooms=30, staff=4, price=₹0
Pro: properties=10, tenants=100, rooms=30, staff=8, price=₹999
Premium: properties=999, tenants=999, rooms=30, staff=15, price=₹2,499
```

**Available Fields per Plan:**
- `{plan}Properties`: Max properties owner can have
- `{plan}Tenants`: Max tenants across all properties
- `{plan}Rooms`: Max rooms per property
- `{plan}Staff`: Max staff members per property
- `{plan}Price`: Price in paise (e.g., 999 = ₹9.99)