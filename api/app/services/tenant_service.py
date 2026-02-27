from app.models.tenant_schema import Tenant
from app.models.bed_schema import BedUpdate
from app.services.bed_service import update_bed_service
from app.database.mongodb import getCollection
import uuid
from datetime import datetime, timezone

class TenantService:
    async def is_property_owner(self, user_id: str, property_id: str) -> bool:
        from app.database.mongodb import db
        prop = await db["properties"].find_one({"id": property_id, "ownerId": user_id})
        return prop is not None

    def __init__(self):
        self.collection = getCollection("tenants")

    async def get_tenants(self, property_id: str = None):
        query = {}
        if property_id:
            query["propertyId"] = property_id
        cursor = self.collection.find(query)
        tenants = []
        async for doc in cursor:
            tenants.append(Tenant(**doc))
        return tenants

    async def get_tenant(self, tenant_id: str):
        doc = await self.collection.find_one({"id": tenant_id})
        if doc:
            return Tenant(**doc)
        return None

    async def create_tenant(self, tenant_data: dict):
        now = datetime.now(timezone.utc).isoformat()
        if not tenant_data.get("id"):
            tenant_data["id"] = str(uuid.uuid4())
        if not tenant_data.get("createdAt"):
            tenant_data["createdAt"] = now
        if not tenant_data.get("updatedAt"):
            tenant_data["updatedAt"] = now
        # Set bed status to occupied if bedId is present
        if tenant_data.get("bedId"):
            await update_bed_service(tenant_data["bedId"], BedUpdate(status="occupied"))
        await self.collection.insert_one(tenant_data)
        return Tenant(**tenant_data)

    async def update_tenant(self, tenant_id: str, tenant_data: dict):
        tenant_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
        # Check if bedId is being changed
        orig_doc = await self.collection.find_one({"id": tenant_id})
        orig_bed_id = orig_doc.get("bedId") if orig_doc else None
        new_bed_id = tenant_data.get("bedId")
        if orig_bed_id and orig_bed_id != new_bed_id:
            # Set previous bed to available
            await update_bed_service(orig_bed_id, BedUpdate(status="available"))
        if new_bed_id and orig_bed_id != new_bed_id:
            # Set new bed to occupied
            await update_bed_service(new_bed_id, BedUpdate(status="occupied"))
        await self.collection.update_one({"id": tenant_id}, {"$set": tenant_data})
        doc = await self.collection.find_one({"id": tenant_id})
        if doc:
            return Tenant(**doc)
        return None

    async def delete_tenant(self, tenant_id: str):
        # Find the tenant to get the bedId
        doc = await self.collection.find_one({"id": tenant_id})
        bed_id = doc.get("bedId") if doc else None
        if bed_id:
            await update_bed_service(bed_id, BedUpdate(status="available"))
        await self.collection.delete_one({"id": tenant_id})
        return {"success": True, "tenantId": tenant_id}
