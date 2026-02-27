from typing import List, Optional
from datetime import datetime, timezone
from uuid import uuid4
from ..models.payment_schema import Payment, PaymentCreate
from app.database.mongodb import getCollection

payments_collection = getCollection("payments")

import asyncio

async def get_payments() -> List[Payment]:
    cursor = payments_collection.find()
    payments = await cursor.to_list(length=100)
    return [Payment(**p) for p in payments]

async def get_payment_by_id(payment_id: str) -> Optional[Payment]:
    payment = await payments_collection.find_one({"id": payment_id})
    if payment:
        return Payment(**payment)
    return None

async def create_payment(payment_data: PaymentCreate) -> Payment:
    now = datetime.now(timezone.utc)
    payment_dict = payment_data.model_dump()
    payment_dict["id"] = str(uuid4())
    payment_dict["createdAt"] = now
    payment_dict["updatedAt"] = now
    await payments_collection.insert_one(payment_dict)
    return Payment(**payment_dict)

async def get_payment_stats():
    payments = await payments_collection.find().to_list(length=100)
    collected = sum(
        float(p["amount"].replace('₹', '').replace(',', ''))
        for p in payments if p["status"] == 'paid'
    )
    pending = sum(
        float(p["amount"].replace('₹', '').replace(',', ''))
        for p in payments if p["status"] == 'due'
    )
    overdue = sum(
        float(p["amount"].replace('₹', '').replace(',', ''))
        for p in payments if p["status"] == 'overdue'
    )
    return {
        'collected': f'₹{collected:,.0f}',
        'pending': f'₹{pending:,.0f}',
        'overdue': f'₹{overdue:,.0f}',
    }


async def update_payment(payment_id: str, payment_update) -> Optional[Payment]:
    payment = await payments_collection.find_one({"id": payment_id})
    if not payment:
        return None
    update_data = {k: v for k, v in payment_update.model_dump().items() if v is not None}
    update_data["updatedAt"] = datetime.now(timezone.utc)
    await payments_collection.update_one({"id": payment_id}, {"$set": update_data})
    payment.update(update_data)
    return Payment(**payment)