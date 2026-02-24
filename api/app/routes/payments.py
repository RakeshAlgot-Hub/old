from bson import ObjectId
from app.database.mongodb import db
from fastapi import APIRouter, status, HTTPException, Depends
from app.utils.helpers import get_current_user
from typing import Optional
from fastapi import Query
from typing import List
from app.services.payments_service import create_payment_service, get_payments_service
from app.models.payment_schema import PaymentRequest, PaymentResponse, PaginatedPaymentResponse

router = APIRouter()

# Create a payment document

@router.post("/payments", status_code=status.HTTP_201_CREATED, response_model=PaymentResponse)
async def create_payment(payment: PaymentRequest, current_user=Depends(get_current_user)):
    try:
        payment_doc = await create_payment_service(payment.dict())
        return PaymentResponse(**payment_doc)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))






# Return paginated payments data (list only)
@router.get("/payments", status_code=status.HTTP_200_OK, response_model=PaginatedPaymentResponse)
async def get_payments(
    propertyId: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user=Depends(get_current_user)
):
    result = await get_payments_service(propertyId, page, limit, search, status)
    print(result)
    return PaginatedPaymentResponse(**result)


# Update payment status
@router.patch("/payments/{payment_id}", status_code=status.HTTP_200_OK)
async def update_payment(payment_id: str, data: dict, current_user=Depends(get_current_user)):
    payments_collection = db["payments"]
    # Only allow status field
    if set(data.keys()) != {"status"}:
        raise HTTPException(status_code=400, detail="Only 'status' field can be updated.")
    status_value = data["status"]
    update_fields = {"status": status_value}
    from datetime import datetime, timezone
    if status_value == "paid":
        update_fields["paidDate"] = datetime.now(timezone.utc).isoformat()
    else:
        update_fields["paidDate"] = None
    update_fields["updatedAt"] = datetime.now(timezone.utc).isoformat()
    result = await payments_collection.update_one({"_id": ObjectId(payment_id)}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    updated = await payments_collection.find_one({"_id": ObjectId(payment_id)})
    updated["id"] = str(updated["_id"])
    updated.pop("_id", None)
    return updated