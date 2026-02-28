
import uuid
from app.database.mongodb import db
from app.models.property_schema import PropertyCreate, PropertyOut
from typing import List
from datetime import datetime, timezone
from bson import ObjectId

class PropertyService:
    def __init__(self):
        self.db = db

    async def create_property(self, property: PropertyCreate) -> PropertyOut:
        now = datetime.now(timezone.utc).isoformat()
        doc = property.model_dump()
        doc["createdAt"] = now
        doc["updatedAt"] = now
        # ownerId should be ObjectId
        doc["ownerId"] = ObjectId(doc["ownerId"])
        result = await self.db["properties"].insert_one(doc)
        doc["id"] = str(result.inserted_id)
        doc["ownerId"] = str(doc["ownerId"])
        # Update user document to add propertyId
        await self.db["users"].update_one(
            {"_id": ObjectId(doc["ownerId"])},
            {"$addToSet": {"propertyIds": doc["id"]}}
        )
        return PropertyOut(**doc)

    async def list_properties(self, user_id: str) -> List[PropertyOut]:
        properties = []
        async for doc in self.db["properties"].find({"ownerId": ObjectId(user_id)}):
            doc["id"] = str(doc["_id"])
            doc["ownerId"] = str(doc["ownerId"])
            properties.append(PropertyOut(**doc))
        return properties