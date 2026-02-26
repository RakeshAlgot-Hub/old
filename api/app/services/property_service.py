from app.database.mongodb import db
from app.models.property_schema import PropertyCreate, PropertyOut, PropertyInDB
from typing import List

from datetime import datetime

async def create_property_service(property: PropertyCreate) -> PropertyOut:
    now = datetime.utcnow().isoformat()
    doc = property.dict()
    doc["createdAt"] = now
    doc["updatedAt"] = now
    result = await db["properties"].insert_one(doc)
    return PropertyOut(id=str(result.inserted_id), **doc)

async def list_properties_service() -> List[PropertyOut]:
    properties = []
    async for doc in db["properties"].find():
        doc["id"] = str(doc["_id"])
        properties.append(PropertyOut(**doc))
    return properties