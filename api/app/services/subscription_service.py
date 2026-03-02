from app.models.subscription_schema import Subscription, Usage
from app.database.mongodb import db
from datetime import datetime, timedelta
from typing import Literal

SUBSCRIPTION_PLANS = {
    'free': {'properties': 2, 'tenants': 20, 'rooms': 30, 'price': 0, 'priceText': '₹0'},
    'pro': {'properties': 10, 'tenants': 100, 'rooms': 30, 'price': 999, 'priceText': '₹999'},
    'premium': {'properties': 999, 'tenants': 999, 'rooms': 30, 'price': 2499, 'priceText': '₹2,499'},
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
        # Count properties, tenants, and rooms
        properties = await db["properties"].count_documents({"ownerId": owner_id})
        tenants = await db["tenants"].count_documents({"ownerId": owner_id})
        rooms = await db["rooms"].count_documents({"ownerId": owner_id})
        now = datetime.now().isoformat()
        return Usage(
            ownerId=owner_id,
            properties=properties,
            tenants=tenants,
            rooms=rooms,
            updatedAt=now
        )

    @staticmethod
    def get_plan_limits(plan: Literal['free', 'pro', 'premium']):
        return SUBSCRIPTION_PLANS[plan]

    @staticmethod
    async def cancel_subscription(owner_id: str):
        """Cancel subscription and downgrade to free plan"""
        now = datetime.now().isoformat()
        result = await db["subscriptions"].find_one_and_update(
            {"ownerId": owner_id},
            {"$set": {
                "plan": "free",
                "status": "canceled",
                "updatedAt": now,
                "canceledAt": now
            }},
            return_document=True
        )
        if result:
            return Subscription(**result)
        raise ValueError("Subscription not found")

    @staticmethod
    async def check_downgrade_eligibility(owner_id: str) -> dict:
        """Check if user can downgrade to free tier"""
        # Count current resources
        property_count = await db["properties"].count_documents({"ownerId": owner_id})
        tenant_count = await db["tenants"].count_documents({"ownerId": owner_id})
        
        # Free tier limits
        free_limits = {"properties": 2, "tenants": 20}
        
        # Calculate excess
        excess_properties = max(0, property_count - free_limits["properties"])
        excess_tenants = max(0, tenant_count - free_limits["tenants"])
        
        can_downgrade = excess_properties == 0 and excess_tenants == 0
        
        return {
            "can_downgrade": can_downgrade,
            "current": {
                "properties": property_count,
                "tenants": tenant_count,
            },
            "limits": free_limits,
            "excess": {
                "properties": excess_properties,
                "tenants": excess_tenants,
            },
            "message": (
                f"To downgrade to free plan, delete {excess_properties} properties "
                f"and {excess_tenants} tenants"
                if not can_downgrade
                else "You can proceed with downgrade"
            )
        }
