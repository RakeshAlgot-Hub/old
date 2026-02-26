from app.models.room_schema import Room
from app.database.mongodb import getCollection
from datetime import datetime,timezone
import uuid

class RoomService:
    async def is_property_owner(self, user_id: str, property_id: str) -> bool:
        from app.database.mongodb import db
        prop = await db["properties"].find_one({"id": property_id, "ownerId": user_id})
        return prop is not None

    def __init__(self):
        self.collection = getCollection("rooms")

    async def get_rooms(self, property_id: str = None):
        query = {}
        if property_id:
            query["propertyId"] = property_id
        cursor = self.collection.find(query)
        rooms = []
        async for doc in cursor:
            rooms.append(Room(**doc))
        return rooms

    async def get_room(self, room_id: str):
        doc = await self.collection.find_one({"id": room_id})
        if doc:
            return Room(**doc)
        return None

    async def create_room(self, room_data: dict):
        now = datetime.now(timezone.utc).isoformat()
        if not room_data.get("id"):
            room_data["id"] = str(uuid.uuid4())
        if not room_data.get("createdAt"):
            room_data["createdAt"] = now
        if not room_data.get("updatedAt"):
            room_data["updatedAt"] = now
        await self.collection.insert_one(room_data)
        return Room(**room_data)

    async def update_room(self, room_id: str, room_data: dict):
        room_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
        await self.collection.update_one({"id": room_id}, {"$set": room_data})
        doc = await self.collection.find_one({"id": room_id})
        if doc:
            return Room(**doc)
        return None

    async def delete_room(self, room_id: str):
        await self.collection.delete_one({"id": room_id})
        return {"success": True, "roomId": room_id}
