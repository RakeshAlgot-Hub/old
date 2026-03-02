
import uuid
from app.database.mongodb import db
from app.models.property_schema import PropertyOut
from app.utils.ownership import build_owner_query, normalize_property_owners
from typing import List
from datetime import datetime, timezone
from bson import ObjectId

class PropertyService:
    def __init__(self):
        self.db = db

    async def create_property(self, property_data: dict, owner_id: str) -> PropertyOut:
        now = datetime.now(timezone.utc).isoformat()
        doc = dict(property_data)
        doc["ownerIds"] = [owner_id]
        doc["ownerId"] = owner_id
        doc["createdAt"] = now
        doc["updatedAt"] = now
        result = await self.db["properties"].insert_one(doc)
        doc["id"] = str(result.inserted_id)
        normalize_property_owners(doc, fallback_owner_id=owner_id)
        # Update user document to add propertyId
        await self.db["users"].update_one(
            {"_id": ObjectId(owner_id)},
            {"$addToSet": {"propertyIds": doc["id"]}}
        )
        return PropertyOut(**doc)

    async def list_properties(self, user_id: str) -> List[PropertyOut]:
        properties = []
        async for doc in self.db["properties"].find(build_owner_query(user_id)):
            doc["id"] = str(doc["_id"])

            original_owner_id = doc.get("ownerId")
            original_owner_ids = doc.get("ownerIds") if isinstance(doc.get("ownerIds"), list) else None
            normalize_property_owners(doc, fallback_owner_id=user_id)

            if (
                not isinstance(original_owner_id, str)
                or original_owner_ids != doc.get("ownerIds")
            ):
                await self.db["properties"].update_one(
                    {"_id": doc["_id"]},
                    {
                        "$set": {
                            "ownerId": doc.get("ownerId"),
                            "ownerIds": doc.get("ownerIds", []),
                        }
                    }
                )

            properties.append(PropertyOut(**doc))
        return properties

    async def update_property(self, property_id: str, owner_id: str, property_update: dict) -> PropertyOut | None:
        now = datetime.now(timezone.utc).isoformat()
        updates = dict(property_update)
        for protected_key in ["_id", "id", "ownerId", "ownerIds", "createdAt"]:
            updates.pop(protected_key, None)
        updates["updatedAt"] = now

        match_query = {"_id": ObjectId(property_id), **build_owner_query(owner_id)}
        existing = await self.db["properties"].find_one(match_query)
        if not existing:
            return None

        await self.db["properties"].update_one({"_id": ObjectId(property_id)}, {"$set": updates})
        doc = await self.db["properties"].find_one({"_id": ObjectId(property_id)})
        if not doc:
            return None
        doc["id"] = str(doc["_id"])
        normalize_property_owners(doc, fallback_owner_id=owner_id)
        return PropertyOut(**doc)

    async def delete_property(self, property_id: str, owner_id: str) -> dict:
        match_query = {"_id": ObjectId(property_id), **build_owner_query(owner_id)}
        existing = await self.db["properties"].find_one(match_query)
        if not existing:
            return {"success": False, "propertyId": property_id}

        await self.db["properties"].delete_one({"_id": ObjectId(property_id)})
        await self.db["users"].update_many({}, {"$pull": {"propertyIds": property_id}})
        return {"success": True, "propertyId": property_id}