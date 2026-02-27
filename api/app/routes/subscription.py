

from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Literal
from app.utils.helpers import get_current_user
from app.services.subscription_service import SubscriptionService
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
    receipt = f"sub_{user_id}_{plan}"
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
