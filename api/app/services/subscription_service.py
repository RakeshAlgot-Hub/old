from app.models.subscription_schema import Subscription, Usage
from app.database.mongodb import db
from datetime import datetime, timedelta
from typing import Literal
from app.utils.ownership import build_owner_query
import os
import logging

logger = logging.getLogger(__name__)

# Default subscription plans (used if env vars not set)
# Format:
#   properties: Total number of properties owner can create (per-owner limit)
#   tenants: Max tenants PER property
#   rooms: Max rooms PER property
#   staff: Max staff PER property
DEFAULT_SUBSCRIPTION_PLANS = {
    'free': {'properties': 1, 'tenants': 80, 'rooms': 30, 'staff': 3, 'price': 0},
    'pro': {'properties': 3, 'tenants': 150, 'rooms': 50, 'staff': 5, 'price': 7900},
    'premium': {'properties': 5, 'tenants': 200, 'rooms': 70, 'staff': 7, 'price': 12900},
}

def format_price_text(price_paise: int) -> str:
    """Convert price in paise to formatted rupee text (e.g., 999 -> ₹9.99, 2499 -> ₹24.99)"""
    if price_paise == 0:
        return "₹0"
    rupees = price_paise / 100
    if rupees == int(rupees):
        return f"₹{int(rupees)}"
    return f"₹{rupees:.2f}".rstrip('0').rstrip('.')

def get_subscription_plans():
    """
    Load subscription plans from environment variables.
    Reads individual plan settings like freeProperties, proStaff, etc.
    Price text is generated dynamically from price value.
    Falls back to defaults if not set.
    """
    try:
        plans = {}
        for plan_name in ['free', 'pro', 'premium']:
            price = int(os.getenv(f'{plan_name}Price', DEFAULT_SUBSCRIPTION_PLANS[plan_name]['price']))
            plans[plan_name] = {
                'properties': int(os.getenv(f'{plan_name}Properties', DEFAULT_SUBSCRIPTION_PLANS[plan_name]['properties'])),
                'tenants': int(os.getenv(f'{plan_name}Tenants', DEFAULT_SUBSCRIPTION_PLANS[plan_name]['tenants'])),
                'rooms': int(os.getenv(f'{plan_name}Rooms', DEFAULT_SUBSCRIPTION_PLANS[plan_name]['rooms'])),
                'staff': int(os.getenv(f'{plan_name}Staff', DEFAULT_SUBSCRIPTION_PLANS[plan_name]['staff'])),
                'price': price,
                'priceText': format_price_text(price),
            }
        logger.info("✓ Subscription plans loaded from environment variables")
        return plans
    except (ValueError, TypeError) as e:
        logger.error(f"Invalid subscription plan env var value: {str(e)}. Using defaults.")
        return DEFAULT_SUBSCRIPTION_PLANS
    except Exception as e:
        logger.error(f"Error loading subscription plans: {str(e)}. Using defaults.")
        return DEFAULT_SUBSCRIPTION_PLANS

SUBSCRIPTION_PLANS = get_subscription_plans()

class SubscriptionService:
    @staticmethod
    async def get_subscription(owner_id: str):
        """Get subscription for owner, creating default if not exists"""
        try:
            doc = await db["subscriptions"].find_one({"ownerId": owner_id})
            if doc:
                return Subscription(**doc)
        except Exception as e:
            print(f"Error retrieving subscription: {str(e)}")
        
        # If not found or error, create default subscription
        now = datetime.now().isoformat()
        free_limits = SUBSCRIPTION_PLANS['free']
        sub = Subscription(
            ownerId=owner_id,
            plan='free',
            status='active',
            price=free_limits['price'],
            currentPeriodStart=now,
            currentPeriodEnd=(datetime.now() + timedelta(days=30)).isoformat(),
            propertyLimit=free_limits['properties'],
            roomLimit=free_limits['rooms'],
            tenantLimit=free_limits['tenants'],
            staffLimit=free_limits['staff'],
            createdAt=now,
            updatedAt=now
        )
        try:
            await db["subscriptions"].insert_one(sub.model_dump())
        except Exception as e:
            print(f"Error creating default subscription: {str(e)}")
        return sub

    @staticmethod
    async def update_subscription(owner_id: str, plan: Literal['free', 'pro', 'premium']):
        """Update subscription plan to activate it"""
        try:
            now = datetime.now().isoformat()
            plan_limits = SUBSCRIPTION_PLANS[plan]
            
            # Find and update the specific plan subscription for this user
            result = await db["subscriptions"].find_one_and_update(
                {"ownerId": owner_id, "plan": plan},
                {"$set": {
                    "status": "active",
                    "price": plan_limits['price'],
                    "propertyLimit": plan_limits['properties'],
                    "roomLimit": plan_limits['rooms'],
                    "tenantLimit": plan_limits['tenants'],
                    "staffLimit": plan_limits['staff'],
                    "updatedAt": now
                }},
                return_document=True
            )
            if result:
                return Subscription(**result)
        except Exception as e:
            print(f"Error updating subscription: {str(e)}")
        
        # If not found or error, create new (for backwards compatibility)
        now = datetime.now().isoformat()
        plan_limits = SUBSCRIPTION_PLANS[plan]
        sub = Subscription(
            ownerId=owner_id,
            plan=plan,
            status='active',
            price=plan_limits['price'],
            currentPeriodStart=now,
            currentPeriodEnd=(datetime.now() + timedelta(days=30)).isoformat(),
            propertyLimit=plan_limits['properties'],
            roomLimit=plan_limits['rooms'],
            tenantLimit=plan_limits['tenants'],
            staffLimit=plan_limits['staff'],
            createdAt=now,
            updatedAt=now
        )
        try:
            await db["subscriptions"].insert_one(sub.model_dump())
        except Exception as e:
            print(f"Error creating subscription: {str(e)}")
        return sub

    @staticmethod
    async def get_usage(owner_id: str):
        """Get current resource usage for subscription quota checking"""
        try:
            # Count properties using ownerIds/ownerId-compatible query
            owned_properties = await db["properties"].find(
                build_owner_query(owner_id),
                {"_id": 1}
            ).to_list(length=None)
            property_ids = [str(doc["_id"]) for doc in owned_properties]

            properties = len(property_ids)
            tenants = await db["tenants"].count_documents({"propertyId": {"$in": property_ids}}) if property_ids else 0
            rooms = await db["rooms"].count_documents({"propertyId": {"$in": property_ids}}) if property_ids else 0
            now = datetime.now().isoformat()
            return Usage(
                ownerId=owner_id,
                properties=properties,
                tenants=tenants,
                rooms=rooms,
                updatedAt=now
            )
        except Exception as e:
            print(f"Error getting usage for {owner_id}: {str(e)}")
            # Return zero usage on error so user can still access the system
            now = datetime.now().isoformat()
            return Usage(
                ownerId=owner_id,
                properties=0,
                tenants=0,
                rooms=0,
                updatedAt=now
            )

    @staticmethod
    def get_plan_limits(plan: Literal['free', 'pro', 'premium']):
        return SUBSCRIPTION_PLANS[plan]

    @staticmethod
    async def cancel_subscription(owner_id: str):
        """Cancel subscription and downgrade to free plan"""
        try:
            now = datetime.now().isoformat()
            result = await db["subscriptions"].find_one_and_update(
                {"ownerId": owner_id},
                {"$set": {
                    "plan": "free",
                    "status": "cancelled",
                    "updatedAt": now,
                    "cancelledAt": now
                }},
                return_document=True
            )
            if result:
                return Subscription(**result)
        except Exception as e:
            print(f"Error cancelling subscription: {str(e)}")
        raise ValueError("Subscription not found or could not be cancelled")

    @staticmethod
    async def check_downgrade_eligibility(owner_id: str) -> dict:
        """Check if user can downgrade to free tier"""
        try:
            # Count current resources
            owned_properties = await db["properties"].find(
                build_owner_query(owner_id),
                {"_id": 1}
            ).to_list(length=None)
            property_ids = [str(doc["_id"]) for doc in owned_properties]

            property_count = len(property_ids)
            tenant_count = await db["tenants"].count_documents({"propertyId": {"$in": property_ids}}) if property_ids else 0
        except Exception as e:
            print(f"Error counting resources: {str(e)}")
            return {
                "can_downgrade": False,
                "current": {"properties": 0, "tenants": 0},
                "limits": {"properties": 2, "tenants": 20},
                "excess": {"properties": 0, "tenants": 0},
                "message": "Unable to check eligibility. Please try again later."
            }
        
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

    @staticmethod
    async def create_default_subscriptions(owner_id: str) -> dict:
        """
        Create 3 default subscription documents (free, pro, premium) for a new user.
        Only free plan is active by default. Pro and Premium are inactive until user upgrades.
        
        Returns:
            dict with created subscription details
        """
        try:
            now = datetime.now().isoformat()
            period_end = (datetime.now() + timedelta(days=30)).isoformat()
            
            subscriptions_to_create = []
            
            for plan_name in ['free', 'pro', 'premium']:
                plan_limits = SUBSCRIPTION_PLANS[plan_name]
                # Only free plan is active by default
                status = 'active' if plan_name == 'free' else 'inactive'
                
                sub_doc = {
                    "ownerId": owner_id,
                    "plan": plan_name,
                    "status": status,
                    "price": plan_limits['price'],
                    "currentPeriodStart": now,
                    "currentPeriodEnd": period_end,
                    "propertyLimit": plan_limits['properties'],
                    "roomLimit": plan_limits['rooms'],
                    "tenantLimit": plan_limits['tenants'],
                    "staffLimit": plan_limits['staff'],
                    "createdAt": now,
                    "updatedAt": now
                }
                subscriptions_to_create.append(sub_doc)
            
            # Insert all 3 subscriptions
            result = await db["subscriptions"].insert_many(subscriptions_to_create)
            
            logger.info(f"✓ Created 3 default subscriptions for user {owner_id} (only free is active)")
            
            return {
                "success": True,
                "user_id": owner_id,
                "subscriptions_created": len(result.inserted_ids),
                "plans": ['free', 'pro', 'premium'],
                "message": "3 default subscription documents created successfully (only free is active)"
            }
        except Exception as e:
            logger.error(f"Error creating default subscriptions for {owner_id}: {str(e)}")
            return {
                "success": False,
                "user_id": owner_id,
                "error": str(e),
                "message": "Failed to create default subscriptions"
            }

