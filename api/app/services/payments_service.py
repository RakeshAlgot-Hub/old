from app.database.mongodb import db
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional, List

async def create_payment_service(payment: dict) -> dict:
    required = ["propertyId", "tenantId", "unitId", "amount", "dueDate", "status"]
    if not all(k in payment for k in required):
        raise ValueError("Missing required fields for payment creation")
    payments_collection = db["payments"]
    now = datetime.now(timezone.utc)
    payment_doc = {
        "propertyId": payment["propertyId"],
        "tenantId": payment["tenantId"],
        "unitId": payment["unitId"],
        "amount": float(payment["amount"]),
        "dueDate": payment["dueDate"],
        "status": payment["status"],
        "createdAt": now.isoformat(),
        "updatedAt": now.isoformat(),
        "paidDate": payment.get("paidDate"),
        "note": payment.get("note", "")
    }
    result = await payments_collection.insert_one(payment_doc)
    payment_doc["id"] = str(result.inserted_id)
    payment_doc.pop("_id", None)
    return payment_doc

async def get_payments_service(propertyId: str, page: int = 1, limit: int = 20, search: Optional[str] = None, status: Optional[str] = None) -> dict:
    payments_collection = db["payments"]
    tenants_collection = db["tenants"]
    units_collection = db["units"]
    rooms_collection = db["rooms"]
    query = {"propertyId": propertyId}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"tenantName": {"$regex": search, "$options": "i"}},
            {"unitName": {"$regex": search, "$options": "i"}}
        ]
    total = await payments_collection.count_documents(query)
    cursor = payments_collection.find(query).skip((page - 1) * limit).limit(limit)
    payments = []
    async for payment in cursor:
        payment["id"] = str(payment["_id"])
        payment.pop("_id", None)

        # Fetch tenant name
        tenant_name = None
        if payment.get("tenantId"):
            try:
                tenant = await tenants_collection.find_one({"_id": ObjectId(payment["tenantId"])} )
                if tenant:
                    tenant_name = tenant.get("fullName")
            except Exception:
                tenant_name = None
        payment["tenantName"] = tenant_name if tenant_name else "Unknown Tenant"

        # Fetch room number as unitName
        unit_name = None
        if payment.get("unitId"):
            try:
                unit = await units_collection.find_one({"_id": ObjectId(payment["unitId"])} )
                if unit and unit.get("roomId"):
                    room = await rooms_collection.find_one({"_id": ObjectId(unit["roomId"])} )
                    if room:
                        unit_name = room.get("roomNumber")
            except Exception:
                unit_name = None
        payment["unitName"] = unit_name if unit_name else "Unknown Unit"

        payments.append(payment)
    totalPages = (total + limit - 1) // limit if limit else 1
    response = {
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": totalPages,
        "data": payments
    }
    return response
