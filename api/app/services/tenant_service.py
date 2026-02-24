
from app.models.tenant_schema import TenantResponse
from bson import ObjectId
from datetime import datetime
from fastapi import HTTPException
from app.database.mongodb import db
from app.services.payments_service import create_payment_service
from app.services.unit_service import update_unit_status_and_tenant
from datetime import datetime, timezone
from dateutil.parser import parse as parse_date
from bson import ObjectId
from fastapi import HTTPException

async def get_tenants_service(propertyId, page, limit, search, current_user):
    properties_collection = db["properties"]
    try:
        property_id = ObjectId(propertyId)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid propertyId format")
    property = await properties_collection.find_one({"_id": property_id})
    if not property or property.get("ownerId") != current_user:
        raise HTTPException(status_code=403, detail="Forbidden: Not your property")
    tenants_collection = db["tenants"]
    query = {"propertyId": propertyId}
    if search:
        query["$or"] = [
            {"fullName": {"$regex": search, "$options": "i"}},
            {"documentId": {"$regex": search, "$options": "i"}},
            {"phoneNumber": {"$regex": search, "$options": "i"}}
        ]
    total = await tenants_collection.count_documents(query)
    cursor = tenants_collection.find(query).skip((page - 1) * limit).limit(limit)
    tenants = []
    async for tenant in cursor:
        tenant["id"] = str(tenant["_id"])
        tenant.pop("_id", None)
        if "profilePictureUrl" not in tenant:
            tenant["profilePictureUrl"] = None
        if "address" not in tenant:
            tenant["address"] = None
        if isinstance(tenant.get("createdAt"), datetime):
            tenant["createdAt"] = tenant["createdAt"].isoformat()
        if isinstance(tenant.get("updatedAt"), datetime):
            tenant["updatedAt"] = tenant["updatedAt"].isoformat()
        if "rentType" not in tenant or not tenant["rentType"]:
            tenant["rentType"] = "monthly"
        if "nextDueDate" not in tenant or not tenant["nextDueDate"]:
            tenant["nextDueDate"] = tenant.get("checkInDate") or ""
        if "status" not in tenant or not tenant["status"]:
            tenant["status"] = "stay"
        tenants.append(TenantResponse(**tenant))
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "data": tenants
    }

def delete_tenant_service(tenant_id, current_user):
    tenants_collection = db["tenants"]
    tenant = tenants_collection.find_one({"_id": ObjectId(tenant_id)})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    properties_collection = db["properties"]
    try:
        property_id = ObjectId(tenant["propertyId"])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid propertyId format")
    property = properties_collection.find_one({"_id": property_id})
    if not property or property.get("ownerId") != current_user:
        raise HTTPException(status_code=403, detail="Forbidden: Not your property")
    result = tenants_collection.delete_one({"_id": ObjectId(tenant_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tenant not found")
    units_collection = db["units"]
    unit_id = tenant.get("unitId")
    if unit_id:
        units_collection.update_one(
            {"_id": ObjectId(unit_id)},
            {"$set": {"status": "available", "currentTenantId": None}}
        )
    return

def update_tenant_service(tenant_id, data, current_user):
    tenants_collection = db["tenants"]
    tenant = tenants_collection.find_one({"_id": ObjectId(tenant_id)})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    update_fields = data.dict(exclude_unset=True)
    from datetime import timezone
    update_fields["updatedAt"] = datetime.now(timezone.utc).isoformat()
    result = tenants_collection.update_one({"_id": ObjectId(tenant_id)}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tenant not found")
    updated = tenants_collection.find_one({"_id": ObjectId(tenant_id)})
    updated["id"] = str(updated["_id"])
    updated.pop("_id", None)
    if "rentType" not in updated or not updated["rentType"]:
        updated["rentType"] = "monthly"
    if "nextDueDate" not in updated or not updated["nextDueDate"]:
        updated["nextDueDate"] = updated.get("checkInDate") or ""
    if "status" not in updated or not updated["status"]:
        updated["status"] = "stay"
    return TenantResponse(**updated)


async def validate_and_prepare_tenant(tenant, current_user):
    properties_collection = db["properties"]
    try:
        property_id = ObjectId(tenant.propertyId)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid propertyId format")
    property = await properties_collection.find_one({"_id": property_id})
    if not property or property.get("ownerId") != current_user:
        raise HTTPException(status_code=403, detail="Forbidden: Not your property")

    try:
        parsed_date = parse_date(tenant.checkInDate)
        checkInDate = parsed_date.isoformat()
    except Exception:
        raise HTTPException(status_code=400, detail="checkInDate must be a valid ISO date string")

    try:
        deposit = float(tenant.depositAmount)
        depositAmount = str(deposit)
    except Exception:
        raise HTTPException(status_code=400, detail="depositAmount must be a valid number")

    now = datetime.now(timezone.utc)
    rent_type = getattr(tenant, 'rentType', None) or 'monthly'
    status = getattr(tenant, 'status', None) or 'stay'
    tenant_doc = {
        "propertyId": tenant.propertyId,
        "unitId": tenant.unitId,
        "fullName": tenant.fullName,
        "documentId": tenant.documentId,
        "phoneNumber": tenant.phoneNumber,
        "checkInDate": checkInDate,
        "depositAmount": depositAmount,
        "rentType": rent_type,
        "nextDueDate": tenant.nextDueDate,
        "status": status,
        "createdAt": now.isoformat(),
        "updatedAt": now.isoformat(),
        "profilePictureUrl": tenant.profilePictureUrl,
        "address": tenant.address if tenant.address is not None else "",
    }
    return tenant_doc

async def create_tenant_service(tenant, current_user):
    tenants_collection = db["tenants"]
    tenant_doc = await validate_and_prepare_tenant(tenant, current_user)
    result = await tenants_collection.insert_one(tenant_doc)
    tenant_doc["id"] = str(result.inserted_id)
    tenant_doc.pop("_id", None)

    # Auto-create payment after tenant creation
    try:
        payment_data = {
            "propertyId": tenant.propertyId,
            "tenantId": tenant_doc["id"],
            "unitId": tenant.unitId,
            "amount": float(tenant.depositAmount),
            "dueDate": tenant.nextDueDate,
            "status": getattr(tenant, "paymentStatus", "paid"),
            "paidDate": tenant.checkInDate if getattr(tenant, "paymentStatus", "paid") == "paid" else None,
            "note": "Auto-created on tenant creation"
        }
        await create_payment_service(payment_data)
    except Exception as e:
        # Log error, but don't block tenant creation
        print(f"Failed to auto-create payment: {e}")

    # Update unit status and currentTenantId in backend after tenant creation
    await update_unit_status_and_tenant(tenant.unitId, tenant_doc["id"])

    return tenant_doc
