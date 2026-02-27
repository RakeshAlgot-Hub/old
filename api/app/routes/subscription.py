
from fastapi import APIRouter, Depends, HTTPException
from typing import Literal
from app.utils.helpers import get_current_user
from app.services.subscription_service import SubscriptionService

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


@router.post("/upgrade")
async def upgrade_subscription(plan: Literal['free', 'pro', 'premium'], user_id: str = Depends(get_current_user)):
    sub = await SubscriptionService.update_subscription(user_id, plan)
    return {"data": sub.model_dump()}
