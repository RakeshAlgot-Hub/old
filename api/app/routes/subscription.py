

from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Literal
from app.utils.helpers import get_current_user
from app.services.subscription_service import SubscriptionService
from app.services.subscription_enforcement import SubscriptionEnforcement
from app.services.razorpay_service import RazorpayService

router = APIRouter(prefix="/subscription", tags=["subscription"])


@router.get("")
async def get_subscription(user_id: str = Depends(get_current_user)):
    sub = await SubscriptionService.get_subscription(user_id)
    return {"data": sub.model_dump()}


@router.get("/usage")
async def get_usage(user_id: str = Depends(get_current_user)):
    usage = await SubscriptionService.get_usage(user_id)
    return {"data": usage.model_dump()}


@router.get("/quota-warnings")
async def get_quota_warnings(user_id: str = Depends(get_current_user)):
    """Get quota usage warnings if approaching limits (80%+)"""
    warnings = await SubscriptionEnforcement.get_usage_warning(user_id)
    if warnings:
        return {"data": warnings}
    return {"data": None}


@router.get("/limits/{plan}")
async def get_limits(plan: Literal['free', 'pro', 'premium']):
    try:
        limits = SubscriptionService.get_plan_limits(plan)
    except KeyError:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"data": limits}


from fastapi import Body

@router.post("/upgrade")
async def upgrade_subscription(
    payload: dict = Body(...),
    user_id: str = Depends(get_current_user)
):
    plan = payload.get("plan")
    if plan not in ["free", "pro", "premium"]:
        raise HTTPException(status_code=400, detail="Invalid plan")
    sub = await SubscriptionService.update_subscription(user_id, plan)
    return {"data": sub.model_dump()}


# Razorpay: Create Checkout Session
from fastapi import Body

@router.post("/create-checkout-session")
async def create_checkout_session(
    payload: dict = Body(...),
    user_id: str = Depends(get_current_user)
):
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


# Razorpay: Verify Payment
@router.post("/verify-payment")
async def verify_payment(payload: dict, user_id: str = Depends(get_current_user)):
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


@router.get("/downgrade-check")
async def downgrade_check(user_id: str = Depends(get_current_user)):
    """Check if user can downgrade to free tier"""
    eligibility = await SubscriptionService.check_downgrade_eligibility(user_id)
    return {"data": eligibility}


@router.post("/cancel")
async def cancel_subscription(user_id: str = Depends(get_current_user)):
    """Cancel subscription and downgrade to free plan"""
    # Check if user can downgrade
    eligibility = await SubscriptionService.check_downgrade_eligibility(user_id)
    
    if not eligibility["can_downgrade"]:
        raise HTTPException(
            status_code=402,
            detail=f"Cannot cancel subscription. You have {eligibility['current']['properties']} "
                   f"properties (2 allowed) and {eligibility['current']['tenants']} tenants "
                   f"(20 allowed on free plan). Please delete excess resources before canceling.",
            code="DOWNGRADE_REQUIRED_CLEANUP"
        )
    
    # Cancel subscription
    sub = await SubscriptionService.cancel_subscription(user_id)
    return {"data": sub.model_dump()}
