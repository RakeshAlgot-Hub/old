"""
Subscription Enforcement Service
Checks quota limits and subscription status before allowing resource creation
"""

from fastapi import HTTPException, status
from app.services.subscription_service import SubscriptionService
from app.database.mongodb import db
from bson import ObjectId
from typing import Literal
import logging

logger = logging.getLogger(__name__)


class SubscriptionEnforcement:
    """
    Enforce subscription limits on quota-protected resources.
    
    Rules:
    - Free plan: max 2 properties, 20 tenants
    - Pro plan: max 10 properties, 100 tenants
    - Premium plan: unlimited
    
    Expired subscriptions can READ but not CREATE resources.
    """

    @staticmethod
    async def ensure_can_create_property(owner_id: str) -> None:
        """
        Check if owner can create a new property.
        
        Raises:
            HTTPException 402: If subscription is expired or quota exceeded
        """
        # Get subscription
        sub = await SubscriptionService.get_subscription(owner_id)

        # Check subscription status
        if sub.status == "expired":
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Subscription expired on {sub.currentPeriodEnd}. Please renew to create properties."
            )

        # Get plan limits
        limits = SubscriptionService.get_plan_limits(sub.plan)

        # Count existing properties
        current = await db["properties"].count_documents(
            {"ownerId": ObjectId(owner_id)}
        )

        # Check quota
        if current >= limits["properties"]:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"You've reached the limit of {limits['properties']} properties on {sub.plan.title()} plan. "
                        f"Upgrade your subscription to add more properties."
            )

        logger.info(
            f"Property creation allowed for {owner_id} ({sub.plan} plan, {current}/{limits['properties']} used)"
        )

    @staticmethod
    async def ensure_can_create_tenant(owner_id: str, property_id: str) -> None:
        """
        Check if owner can create a new tenant under this property.
        
        Raises:
            HTTPException 402: If subscription is expired or quota exceeded
            HTTPException 403: If property doesn't belong to this owner
        """
        # Verify property ownership
        property_doc = await db["properties"].find_one(
            {"_id": ObjectId(property_id)}
        )

        if not property_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )

        if str(property_doc["ownerId"]) != owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This property does not belong to you"
            )

        # Get subscription
        sub = await SubscriptionService.get_subscription(owner_id)

        # Check subscription status
        if sub.status == "expired":
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Subscription expired on {sub.currentPeriodEnd}. Please renew to create tenants."
            )

        # Get plan limits
        limits = SubscriptionService.get_plan_limits(sub.plan)

        # Count existing tenants across ALL properties
        current = await db["tenants"].count_documents(
            {"ownerId": ObjectId(owner_id)}
        )

        # Check quota
        if current >= limits["tenants"]:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"You've reached the limit of {limits['tenants']} tenants on {sub.plan.title()} plan. "
                        f"Upgrade your subscription to add more tenants."
            )

        logger.info(
            f"Tenant creation allowed for {owner_id} ({sub.plan} plan, {current}/{limits['tenants']} used)"
        )

    @staticmethod
    async def ensure_can_create_room(owner_id: str, property_id: str) -> None:
        """
        Check if owner can create a new room in this property.
        
        Raises:
            HTTPException 402: If subscription is expired or room quota exceeded per property
            HTTPException 403: If property doesn't belong to this owner
        """
        # Verify property ownership
        property_doc = await db["properties"].find_one(
            {"_id": ObjectId(property_id)}
        )

        if not property_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )

        if str(property_doc["ownerId"]) != owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This property does not belong to you"
            )

        # Get subscription
        sub = await SubscriptionService.get_subscription(owner_id)

        # Check subscription status
        if sub.status == "expired":
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Subscription expired on {sub.currentPeriodEnd}. Please renew to create rooms."
            )

        # Get plan limits
        limits = SubscriptionService.get_plan_limits(sub.plan)

        # Count existing rooms in THIS property
        current = await db["rooms"].count_documents(
            {"propertyId": property_id}
        )

        # Check quota (30 rooms per property)
        room_limit = limits["rooms"]
        if current >= room_limit:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"You've reached the limit of {room_limit} rooms per property. "
                        f"Delete some rooms or upgrade your subscription."
            )

        logger.info(
            f"Room creation allowed for {owner_id} ({sub.plan} plan, {current}/{room_limit} rooms in property)"
        )

    @staticmethod
    async def get_usage_warning(owner_id: str) -> dict | None:
        """
        Check if owner is approaching quota limits and return warning.
        
        Returns:
            dict with usage info if warning threshold reached (80%), else None
        """
        sub = await SubscriptionService.get_subscription(owner_id)
        limits = SubscriptionService.get_plan_limits(sub.plan)

        # Get actual usage
        properties = await db["properties"].count_documents(
            {"ownerId": ObjectId(owner_id)}
        )
        tenants = await db["tenants"].count_documents(
            {"ownerId": ObjectId(owner_id)}
        )

        warnings = []

        # Check properties usage (warn at 80%)
        properties_percent = (properties / limits["properties"]) * 100 if limits["properties"] > 0 else 0
        if properties_percent >= 80:
            warnings.append({
                "type": "properties",
                "current": properties,
                "limit": limits["properties"],
                "percent": int(properties_percent),
                "message": f"You're using {properties}/{limits['properties']} properties ({int(properties_percent)}%)"
            })

        # Check tenants usage (warn at 80%)
        tenants_percent = (tenants / limits["tenants"]) * 100 if limits["tenants"] > 0 else 0
        if tenants_percent >= 80:
            warnings.append({
                "type": "tenants",
                "current": tenants,
                "limit": limits["tenants"],
                "percent": int(tenants_percent),
                "message": f"You're using {tenants}/{limits['tenants']} tenants ({int(tenants_percent)}%)"
            })

        if warnings:
            return {
                "plan": sub.plan,
                "warnings": warnings,
                "upgrade_url": "/subscription/upgrade"
            }

        return None
