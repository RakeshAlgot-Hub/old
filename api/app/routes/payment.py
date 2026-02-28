from fastapi import APIRouter, HTTPException, Body, Request
from typing import List
from ..models.payment_schema import Payment, PaymentCreate,PaymentUpdate

from ..services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["payments"])
payment_service = PaymentService()

@router.patch("/{payment_id}", response_model=Payment)
async def update_payment(request: Request, payment_id: str, payment_update: PaymentUpdate = Body(...)):
    updated_payment = await payment_service.update_payment(payment_id, payment_update)
    property_ids = getattr(request.state, "property_ids", [])
    if not updated_payment or updated_payment.propertyId not in property_ids:
        raise HTTPException(status_code=404, detail="Payment not found or forbidden")
    return updated_payment

@router.get("/", response_model=List[Payment])
async def list_payments(request: Request):
    property_ids = getattr(request.state, "property_ids", [])
    query = {"propertyId": {"$in": property_ids}} if property_ids else {}
    cursor = payment_service.collection.find(query)
    payments = await cursor.to_list(length=100)
    for p in payments:
        p["id"] = str(p["_id"])
    return [Payment(**p) for p in payments]

@router.get("/{payment_id}", response_model=Payment)
async def get_payment(request: Request, payment_id: str):
    payment = await payment_service.get_payment_by_id(payment_id)
    property_ids = getattr(request.state, "property_ids", [])
    if not payment or payment.propertyId not in property_ids:
        raise HTTPException(status_code=404, detail="Payment not found or forbidden")
    return payment

@router.post("/", response_model=Payment)
async def create_payment(request: Request, payment: PaymentCreate):
    property_ids = getattr(request.state, "property_ids", [])
    if payment.propertyId not in property_ids:
        raise HTTPException(status_code=403, detail="Forbidden")
    return await payment_service.create_payment(payment)

@router.get("/stats", response_model=dict)
async def payment_stats(request: Request):
    # Optionally, stats could be filtered by property_ids if needed
    return await payment_service.get_payment_stats()
