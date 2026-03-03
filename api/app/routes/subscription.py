from fastapi import APIRouter, Depends, HTTPException
from typing import Literal
from app.utils.helpers import get_current_user
from app.services.subscription_service import SubscriptionService
from app.services.subscription_enforcement import SubscriptionEnforcement
from app.services.subscription_lifecycle import SubscriptionLifecycle
from app.services.razorpay_service import RazorpayService

router = APIRouter(prefix="/subscription", tags=["subscription"])


@router.get("")
async def get_subscription(user_id: str = Depends(get_current_user)):
    try:
        sub = await SubscriptionService.get_subscription(user_id)
        return {"data": sub.model_dump()}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error retrieving subscription. Please try again."
        )


@router.get("/usage")
async def get_usage(user_id: str = Depends(get_current_user)):
    try:
        usage = await SubscriptionService.get_usage(user_id)
        return {"data": usage.model_dump()}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error retrieving usage data. Please try again."
        )


@router.get("/quota-warnings")
async def get_quota_warnings(user_id: str = Depends(get_current_user)):
    """Get quota usage warnings if approaching limits (80%+)"""
    try:
        warnings = await SubscriptionEnforcement.get_usage_warning(user_id)
        if warnings:
            return {"data": warnings}
        return {"data": None}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error checking quota warnings. Please try again."
        )


@router.get("/limits/{plan}")
async def get_limits(plan: Literal['free', 'pro', 'premium']):
    try:
        limits = SubscriptionService.get_plan_limits(plan)
    except KeyError:
        raise HTTPException(status_code=404, detail="Plan not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error retrieving plan limits.")
    return {"data": limits}


from fastapi import Body

@router.post("/upgrade")
async def upgrade_subscription(
    payload: dict = Body(...),
    user_id: str = Depends(get_current_user)
):
    try:
        plan = payload.get("plan")
        if plan not in ["free", "pro", "premium"]:
            raise HTTPException(status_code=400, detail="Invalid plan")
        
        # Get current subscription to track change
        current_sub = await SubscriptionService.get_subscription(user_id)
        old_plan = current_sub.plan
        
        # Update subscription
        sub = await SubscriptionService.update_subscription(user_id, plan)
        
        # If upgrading, restore archived resources
        if plan != old_plan and old_plan != 'free':
            restore_result = await SubscriptionLifecycle.handle_upgrade(user_id, plan)
            if restore_result.get("success"):
                sub_dict = sub.model_dump()
                sub_dict["archived_resources_restored"] = restore_result
                return {"data": sub_dict}
        
        return {"data": sub.model_dump()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error updating subscription. Please try again."
        )


# Razorpay: Create Checkout Session
from fastapi import Body

@router.post("/create-checkout-session")
async def create_checkout_session(
    payload: dict = Body(...),
    user_id: str = Depends(get_current_user)
):
    try:
        plan = payload.get("plan")
        if plan not in ["free", "pro", "premium"]:
            raise HTTPException(status_code=400, detail="Invalid plan")
        if plan == 'free':
            raise HTTPException(status_code=400, detail="Free plan does not require payment.")
        plan_limits = SubscriptionService.get_plan_limits(plan)
        amount = plan_limits['price'] * 100
        currency = 'INR'
        # Ensure receipt is <= 40 chars for Razorpay
        base_receipt = f"sub_{plan}"
        user_part = user_id[:40 - len(base_receipt) - 1]  # leave room for underscore
        receipt = f"{base_receipt}_{user_part}"
        order_doc = await RazorpayService.create_order(user_id, plan, amount, currency, receipt)
        return {
            "data": {
                "razorpayOrderId": order_doc.order_id,
                "amount": order_doc.amount,
                "currency": order_doc.currency,
                "keyId": RazorpayService.client.auth[0]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error creating checkout session. Please try again."
        )


# Razorpay: Verify Payment
@router.post("/verify-payment")
async def verify_payment(payload: dict, user_id: str = Depends(get_current_user)):
    try:
        payment_id = payload.get("payment_id")
        order_id = payload.get("order_id")
        signature = payload.get("signature")
        if not (payment_id and order_id and signature):
            raise HTTPException(status_code=400, detail="Missing payment verification fields")

        success, plan_or_error = await RazorpayService.verify_payment(order_id, payment_id, signature)
        if not success:
            return {"data": {"success": False, "error": plan_or_error}}

        await SubscriptionService.update_subscription(user_id, plan_or_error)
        return {"data": {"success": True, "subscription": plan_or_error}}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error verifying payment. Please try again."
        )


@router.get("/downgrade-check")
async def downgrade_check(user_id: str = Depends(get_current_user)):
    """Check if user can downgrade to free tier"""
    try:
        eligibility = await SubscriptionService.check_downgrade_eligibility(user_id)
        return {"data": eligibility}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error checking downgrade eligibility. Please try again."
        )


@router.post("/cancel")
async def cancel_subscription(user_id: str = Depends(get_current_user)):
    """Cancel subscription and downgrade to free plan with resource archival"""
    try:
        # Check if user can downgrade
        eligibility = await SubscriptionService.check_downgrade_eligibility(user_id)
        
        # Get current subscription
        current_sub = await SubscriptionService.get_subscription(user_id)
        old_plan = current_sub.plan
        
        # Handle downgrade - archives excess resources instead of deleting
        downgrade_result = await SubscriptionLifecycle.handle_downgrade(user_id, old_plan, "free")
        
        if not downgrade_result.get("success"):
            raise HTTPException(
                status_code=500,
                detail="Error processing subscription downgrade. Please try again."
            )
        
        # Cancel subscription
        sub = await SubscriptionService.cancel_subscription(user_id)
        
        # Return subscription with archival info
        sub_dict = sub.model_dump()
        sub_dict["downgrade_info"] = {
            "archived_properties": downgrade_result.get("archived_properties", []),
            "archived_tenants": downgrade_result.get("archived_tenants", []),
            "grace_period_until": downgrade_result.get("grace_period_until"),
            "message": downgrade_result.get("message")
        }
        
        return {"data": sub_dict}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error canceling subscription. Please try again."
        )


@router.get("/archived-resources")
async def get_archived_resources(user_id: str = Depends(get_current_user)):
    """
    Get all archived resources from subscription downgrades.
    Shows what was archived and when it expires if not recovered.
    """
    try:
        archived = await SubscriptionLifecycle.get_archived_resources(user_id)
        return {"data": archived}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error retrieving archived resources. Please try again."
        )


@router.post("/recover-archived-resources")
async def recover_archived_resources(user_id: str = Depends(get_current_user)):
    """
    Recover archived resources by upgrading subscription.
    User must be on a plan that supports the number of resources.
    """
    try:
        # Get current subscription
        sub = await SubscriptionService.get_subscription(user_id)
        
        # If already on a plan with enough capacity, restore resources
        if sub.plan != "free":
            restore_result = await SubscriptionLifecycle.handle_upgrade(user_id, sub.plan)
            if restore_result.get("success"):
                return {
                    "data": {
                        "success": True,
                        "restored_resources": restore_result
                    }
                }
        
        # User must upgrade
        raise HTTPException(
            status_code=402,
            detail="You need to upgrade your subscription to recover archived resources."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error recovering archived resources. Please try again."
        )

@router.get("/all")
async def get_all_subscriptions(user_id: str = Depends(get_current_user)):
    """
    Get all 3 subscription documents (free, pro, premium) for the current user.
    Each subscription shows plan details including limits and pricing.
    """
    try:
        from app.database.mongodb import db
        
        subs = await db["subscriptions"].find(
            {"ownerId": user_id}
        ).to_list(length=None)
        
        if not subs:
            raise HTTPException(
                status_code=404,
                detail="No subscriptions found for user. Please contact support."
            )
        
        # Sort by plan order: free, pro, premium
        plan_order = {"free": 0, "pro": 1, "premium": 2}
        subs.sort(key=lambda x: plan_order.get(x.get("plan"), 999))

        # Normalize Mongo documents for JSON response
        serialized_subs = []
        for sub in subs:
            doc = dict(sub)
            mongo_id = doc.pop("_id", None)
            if mongo_id is not None:
                doc["id"] = str(mongo_id)

            if "ownerId" in doc and doc["ownerId"] is not None:
                doc["ownerId"] = str(doc["ownerId"])

            serialized_subs.append(doc)
        
        return {
            "data": {
                "user_id": user_id,
                "count": len(serialized_subs),
                "subscriptions": serialized_subs
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error retrieving subscriptions. Please try again."
        )


@router.post("/initialize")
async def initialize_subscriptions(user_id: str = Depends(get_current_user)):
    """
    Check if user has 3 subscriptions (free, pro, premium).
    If not, create the missing ones with active status.
    Useful for existing users who may not have all 3 subscriptions.
    """
    try:
        from app.database.mongodb import db
        
        # Check existing subscriptions
        existing_subs = await db["subscriptions"].find(
            {"ownerId": user_id}
        ).to_list(length=None)
        
        existing_plans = {sub["plan"] for sub in existing_subs}
        
        if len(existing_subs) == 3 and existing_plans == {"free", "pro", "premium"}:
            # User already has all 3 subscriptions
            # Ensure free is active, pro/premium are inactive
            await db["subscriptions"].update_many(
                {"ownerId": user_id, "plan": "free"},
                {"$set": {"status": "active"}}
            )
            await db["subscriptions"].update_many(
                {"ownerId": user_id, "plan": {"$in": ["pro", "premium"]}},
                {"$set": {"status": "inactive"}}
            )
            
            return {
                "data": {
                    "success": True,
                    "message": "User already has all 3 subscriptions (free: active, pro/premium: inactive)",
                    "subscriptions_created": 0,
                    "existing_subscriptions": 3
                }
            }
        
        # Create missing subscriptions
        result = await SubscriptionService.create_default_subscriptions(user_id)
        
        if result["success"]:
            return {
                "data": {
                    "success": True,
                    "message": result["message"],
                    "subscriptions_created": result["subscriptions_created"],
                    "plans_created": result["plans"],
                    "existing_subscriptions": len(existing_subs),
                    "note": "Only free plan is active. Pro/Premium become active when user purchases."
                }
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Failed to create subscriptions")
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error initializing subscriptions. Please try again."
        )