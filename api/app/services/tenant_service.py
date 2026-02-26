from app.models.tenant_schema import Tenant
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
        await self.collection.insert_one(tenant_data)
        return Tenant(**tenant_data)

    async def update_tenant(self, tenant_id: str, tenant_data: dict):
        tenant_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
        await self.collection.update_one({"id": tenant_id}, {"$set": tenant_data})
        doc = await self.collection.find_one({"id": tenant_id})
        if doc:
            return Tenant(**doc)
        return None

    async def delete_tenant(self, tenant_id: str):
        await self.collection.delete_one({"id": tenant_id})
        return {"success": True, "tenantId": tenant_id}
