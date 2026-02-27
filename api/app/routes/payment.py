from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List
from ..models.payment_schema import Payment, PaymentCreate,PaymentUpdate
from ..services import payment_service
from app.utils.helpers import get_current_user

router = APIRouter(prefix="/payments", tags=["payments"])

@router.patch("/{payment_id}", response_model=Payment)
async def update_payment(payment_id: str, payment_update: PaymentUpdate = Body(...), user_id: str = Depends(get_current_user)):
    updated_payment = await payment_service.update_payment(payment_id, payment_update)
    if not updated_payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return updated_payment

@router.get("/", response_model=List[Payment])
async def list_payments(user_id: str = Depends(get_current_user)):
    return await payment_service.get_payments()

@router.get("/{payment_id}", response_model=Payment)
async def get_payment(payment_id: str, user_id: str = Depends(get_current_user)):
    payment = await payment_service.get_payment_by_id(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment

@router.post("/", response_model=Payment)
async def create_payment(payment: PaymentCreate, user_id: str = Depends(get_current_user)):
    return await payment_service.create_payment(payment)

@router.get("/stats", response_model=dict)
async def payment_stats(user_id: str = Depends(get_current_user)):
    return await payment_service.get_payment_stats()
