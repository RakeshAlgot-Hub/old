from app.database.mongodb import db
from datetime import datetime
from bson import ObjectId
import uuid
from datetime import timezone
properties_collection = db["properties"]

def serialize_property(prop):
    # Convert createdAt and updatedAt to ISO strings
    if isinstance(prop.get("createdAt"), datetime):
        prop["createdAt"] = prop["createdAt"].isoformat()
    if isinstance(prop.get("updatedAt"), datetime):
        prop["updatedAt"] = prop["updatedAt"].isoformat()
    # Add id to each floor
    for floor in prop.get("floors", []):
        if "id" not in floor:
            floor["id"] = str(uuid.uuid4())
    return prop

async def get_all_properties(owner_id=None):
    properties = []
    query = {"ownerId": owner_id} if owner_id else {}
    async for prop in properties_collection.find(query):
        prop["id"] = str(prop["_id"])
        prop.pop("_id", None)
        properties.append(serialize_property(prop))
    return properties

async def create_property_service(property: dict):
    # Limit user to propertyLimit
    user_id = property.get("ownerId")
    if not user_id:
        raise Exception("ownerId is required in property data")
    users_collection = db["users"]
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    property_limit = user.get("propertyLimit", 3) if user else 3
    count = await properties_collection.count_documents({"ownerId": user_id})
    if count >= property_limit:
        raise Exception(f"Maximum {property_limit} properties allowed per user.")
   
    property["createdAt"] = datetime.now(timezone.utc).isoformat()
    property["updatedAt"] = datetime.now(timezone.utc).isoformat()
    # Set default room limit automatically
    if "roomLimit" not in property:
        property["roomLimit"] = 90
    # Ensure buildings are objects with id and name
    property["buildings"] = [
        {"id": str(uuid.uuid4()), "name": b["name"] if isinstance(b, dict) and "name" in b else str(b)}
        for b in property.get("buildings", [])
    ]
    # Ensure floors are objects with id and name
    default_floors = [
        {"label": "G", "name": "Ground"},
        {"label": "1", "name": "First"},
        {"label": "2", "name": "Second"},
        {"label": "3", "name": "Third"},
        {"label": "4", "name": "Fourth"},
    ]
    property["floors"] = default_floors
    property["shareTypes"] = [1, 2, 3, 4, 5]
    result = await properties_collection.insert_one(property)
    property["id"] = str(result.inserted_id)
    property.pop("_id", None)
    return property

async def get_property_by_id(property_id: str):
    prop = await properties_collection.find_one({"_id": ObjectId(property_id)})
    return prop

async def update_property_service(property_id: str, property: dict):
    property["updatedAt"] = datetime.now(timezone.utc)
    result = await properties_collection.update_one({"_id": ObjectId(property_id)}, {"$set": property})
    if result.matched_count == 0:
        return None
    prop = await properties_collection.find_one({"_id": ObjectId(property_id)})
    return prop


async def delete_property_service(property_id: str):
    from app.database.mongodb import db
    # This function is now only for simple delete, cascade is top-level
    result = await properties_collection.delete_one({"_id": ObjectId(property_id)})
    return result.deleted_count > 0

# Move cascade_delete_property to top-level for import
from app.database.mongodb import db
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

async def cascade_delete_property(property_id: str, owner_id: str):
    # Validate ownership
    prop = await properties_collection.find_one({"_id": ObjectId(property_id)})
    if not prop or prop.get("ownerId") != owner_id:
        return False
    # Start session for atomicity
    client: AsyncIOMotorClient = db.client
    async with await client.start_session() as s:
        async with s.start_transaction():
            # Delete child documents
            await db["rooms"].delete_many({"propertyId": property_id}, session=s)
            await db["units"].delete_many({"propertyId": property_id}, session=s)
            await db["tenants"].delete_many({"propertyId": property_id}, session=s)
            await db["payments"].delete_many({"propertyId": property_id}, session=s)
            # Delete property
            result = await properties_collection.delete_one({"_id": ObjectId(property_id)}, session=s)
            return result.deleted_count > 0
