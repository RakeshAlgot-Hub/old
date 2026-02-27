from app.models.subscription_schema import Subscription, Usage
from app.database.mongodb import db
from datetime import datetime, timedelta
from typing import Literal

SUBSCRIPTION_PLANS = {
    'free': {'properties': 2, 'tenants': 20, 'smsCredits': 50, 'price': 0, 'priceText': '₹0'},
    'pro': {'properties': 10, 'tenants': 100, 'smsCredits': 500, 'price': 999, 'priceText': '₹999'},
    'premium': {'properties': 999, 'tenants': 999, 'smsCredits': 999, 'price': 2499, 'priceText': '₹2,499'},
}

class SubscriptionService:
    @staticmethod
    async def get_subscription(owner_id: str):
        doc = await db["subscriptions"].find_one({"ownerId": owner_id})
        if doc:
            return Subscription(**doc)
        # If not found, create default subscription
        now = datetime.now().isoformat()
        sub = Subscription(
            ownerId=owner_id,
            plan='free',
            status='active',
            currentPeriodStart=now,
            currentPeriodEnd=(datetime.now() + timedelta(days=30)).isoformat(),
            createdAt=now,
            updatedAt=now
        )
        await db["subscriptions"].insert_one(sub.model_dump())
        return sub

    @staticmethod
    async def update_subscription(owner_id: str, plan: Literal['free', 'pro', 'premium']):
        now = datetime.now().isoformat()
        result = await db["subscriptions"].find_one_and_update(
            {"ownerId": owner_id},
            {"$set": {"plan": plan, "updatedAt": now}},
            return_document=True
        )
        if result:
            return Subscription(**result)
        # If not found, create new
        sub = Subscription(
            ownerId=owner_id,
            plan=plan,
            status='active',
            currentPeriodStart=now,
            currentPeriodEnd=(datetime.now() + timedelta(days=30)).isoformat(),
            createdAt=now,
            updatedAt=now
        )
        await db["subscriptions"].insert_one(sub.model_dump())
        return sub

    @staticmethod
    async def get_usage(owner_id: str):
        # Count properties, tenants, and get SMS credits (dummy for now)
        properties = await db["properties"].count_documents({"ownerId": owner_id})
        tenants = await db["tenants"].count_documents({"propertyId": {"$in": [p["id"] for p in await db["properties"].find({"ownerId": owner_id}).to_list(None)]}})
        # For demo, smsCredits is not tracked
        now = datetime.now().isoformat()
        return Usage(
            ownerId=owner_id,
            properties=properties,
            tenants=tenants,
            smsCredits=0,
            updatedAt=now
        )

    @staticmethod
    def get_plan_limits(plan: Literal['free', 'pro', 'premium']):
        return SUBSCRIPTION_PLANS[plan]
