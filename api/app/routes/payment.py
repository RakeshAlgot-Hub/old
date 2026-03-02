from fastapi import APIRouter, HTTPException, Body, Request, Query
from typing import List
from datetime import datetime, date
from bson import ObjectId
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

@router.delete("/{payment_id}")
async def delete_payment(request: Request, payment_id: str):
    # First check if payment exists and user has access
    payment = await payment_service.get_payment_by_id(payment_id)
    property_ids = getattr(request.state, "property_ids", [])
    if not payment or payment.propertyId not in property_ids:
        raise HTTPException(status_code=404, detail="Payment not found or forbidden")
    
    # Delete the payment
    success = await payment_service.delete_payment(payment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return {"success": True, "paymentId": payment_id}

@router.get("", response_model=dict)
async def list_payments(
    request: Request,
    propertyId: str = None,
    tenantId: str = None,
    status: str = Query(default=None, pattern="^(paid|due|overdue)$"),
    page: int = 1,
    page_size: int = 50,
    startDate: str = None,
    endDate: str = None,
):
    from datetime import datetime
    
    property_ids = getattr(request.state, "property_ids", [])
    
    # Build match stage
    match_stage = {"propertyId": {"$in": property_ids}} if property_ids else {}
    
    if propertyId:
        if propertyId in property_ids:
            match_stage = {"propertyId": propertyId}
        else:
            raise HTTPException(status_code=403, detail="Forbidden")

    if tenantId:
        match_stage["tenantId"] = tenantId

    if status:
        match_stage["status"] = status

    if startDate or endDate:
        date_query = {}
        if startDate:
            start_datetime = datetime.fromisoformat(startDate.replace('Z', '+00:00'))
            date_query["$gte"] = start_datetime.date().isoformat()
        if endDate:
            end_datetime = datetime.fromisoformat(endDate.replace('Z', '+00:00'))
            date_query["$lte"] = end_datetime.date().isoformat()
        if date_query:
            match_stage["dueDate"] = date_query

    page = max(1, page)
    page_size = min(max(1, page_size), 200)
    skip = (page - 1) * page_size
    
    # Get total count
    count_pipeline = [
        {"$match": match_stage},
        {"$count": "total"}
    ]
    count_result = await payment_service.collection.aggregate(count_pipeline).to_list(1)
    total = count_result[0]["total"] if count_result else 0
    
    # Single aggregation pipeline replaces all N+1 queries
    pipeline = [
        {"$match": match_stage},
        {"$sort": {"updatedAt": -1}},
        {"$skip": skip},
        {"$limit": page_size},
        # Lookup tenant name
        {
            "$lookup": {
                "from": "tenants",
                "let": {"tenantId": "$tenantId"},
                "as": "tenant",
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$eq": [
                                    {"$toString": "$_id"},
                                    {"$toString": "$$tenantId"}
                                ]
                            }
                        }
                    },
                    {"$project": {"_id": 1, "name": 1}}
                ]
            }
        },
        # Lookup bed and room info
        {
            "$lookup": {
                "from": "beds",
                "let": {"bedId": "$bed"},
                "as": "bed_info",
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$eq": [
                                    {"$toString": "$_id"},
                                    {"$toString": "$$bedId"}
                                ]
                            }
                        }
                    },
                    {
                        "$lookup": {
                            "from": "rooms",
                            "let": {"roomId": "$roomId"},
                            "as": "room_info",
                            "pipeline": [
                                {
                                    "$match": {
                                        "$expr": {
                                            "$eq": [
                                                {"$toString": "$_id"},
                                                {"$toString": "$$roomId"}
                                            ]
                                        }
                                    }
                                },
                                {"$project": {"roomNumber": 1}}
                            ]
                        }
                    },
                    {
                        "$project": {
                            "_id": 1,
                            "roomNumber": {"$arrayElemAt": ["$room_info.roomNumber", 0]}
                        }
                    }
                ]
            }
        },
        # Project final output
        {
            "$project": {
                "_id": 1,
                "tenantId": 1,
                "propertyId": 1,
                "bed": 1,
                "amount": 1,
                "status": 1,
                "dueDate": 1,
                "method": 1,
                "createdAt": 1,
                "updatedAt": 1,
                "tenantName": {"$arrayElemAt": ["$tenant.name", 0]},
                "roomNumber": {"$arrayElemAt": ["$bed_info.roomNumber", 0]}
            }
        }
    ]
    
    payments_cursor = await payment_service.collection.aggregate(pipeline).to_list(page_size)
    
    # Convert to Payment objects
    payments = []
    for p in payments_cursor:
        p["id"] = str(p["_id"])
        payments.append(Payment(**p))
    
    return {
        "data": payments,
        "meta": {
            "total": total,
            "page": page,
            "pageSize": page_size,
            "hasMore": (skip + len(payments)) < total
        }
    }

@router.get("/{payment_id}", response_model=Payment)
async def get_payment(request: Request, payment_id: str):
    payment = await payment_service.get_payment_by_id(payment_id)
    property_ids = getattr(request.state, "property_ids", [])
    if not payment or payment.propertyId not in property_ids:
        raise HTTPException(status_code=404, detail="Payment not found or forbidden")
    
    payment_dict = payment.model_dump()
    
    # Enrich with tenant name
    if payment.tenantId:
        try:
            tenant_doc = await payment_service.get_tenants_collection().find_one(
                {"_id": ObjectId(payment.tenantId)},
                {"name": 1}
            )
            if tenant_doc:
                payment_dict["tenantName"] = tenant_doc.get("name", "Unknown")
        except Exception:
            # Skip if tenant ID is invalid
            pass
    
    # Enrich with room number
    if payment.bed:
        try:
            bed_doc = await payment_service.get_beds_collection().find_one(
                {"_id": ObjectId(payment.bed)},
                {"roomId": 1}
            )
            if bed_doc and bed_doc.get("roomId"):
                room_doc = await payment_service.get_rooms_collection().find_one(
                    {"_id": ObjectId(bed_doc["roomId"])},
                    {"roomNumber": 1}
                )
                if room_doc:
                    payment_dict["roomNumber"] = room_doc.get("roomNumber", "N/A")
        except Exception:
            # Skip if bed ID is invalid (e.g., UUID or non-MongoDB ID)
            pass
    
    return Payment(**payment_dict)

@router.get("/stats", response_model=dict)
async def payment_stats(request: Request):
    # Optionally, stats could be filtered by property_ids if needed
    return await payment_service.get_payment_stats()

@router.post("/admin/generate-monthly", response_model=dict)
async def generate_monthly_payments_manual(request: Request):
    """
    Admin endpoint: Manually trigger monthly payment generation.
    Useful for testing or manual execution outside scheduled time.
    Requires user authentication.
    """
    from app.services.tenant_service import TenantService
    tenant_service = TenantService()
    
    try:
        result = await tenant_service.generate_monthly_payments()
        return {
            "status": "success",
            "message": f"Generated {result['created']} payments, skipped {result['skipped']}",
            "details": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating payments: {str(e)}")
