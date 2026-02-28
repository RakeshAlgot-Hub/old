from app.models.room_schema import Room
from app.database.mongodb import getCollection
from datetime import datetime,timezone
from bson import ObjectId
from app.services.bed_service import BedService
from app.models.bed_schema import BedCreate


bed_service = BedService()
class RoomService:

    def __init__(self):
        self.collection = getCollection("rooms")

    async def get_rooms(self, property_id: str = None):
        query = {}
        if property_id:
            query["propertyId"] = property_id
        cursor = self.collection.find(query)
        rooms = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            rooms.append(Room(**doc))
        return rooms

    async def get_room(self, room_id: str):
        doc = await self.collection.find_one({"_id": ObjectId(room_id)})
        if doc:
            doc["id"] = str(doc["_id"])
            return Room(**doc)
        return None

    async def create_room(self, room_data: dict):
        now = datetime.now(timezone.utc).isoformat()
        if not room_data.get("createdAt"):
            room_data["createdAt"] = now
        if not room_data.get("updatedAt"):
            room_data["updatedAt"] = now
        result = await self.collection.insert_one(room_data)
        room_data["id"] = str(result.inserted_id)
        # Auto-create beds for this room
        number_of_beds = room_data.get("numberOfBeds", 0)
        property_id = room_data["propertyId"]
        room_id = room_data["id"]
        for i in range(1, number_of_beds + 1):
            bed = BedCreate(
                propertyId=property_id,
                roomId=room_id,
                bedNumber=str(i),
                status="available",
                ownerId=room_data.get("ownerId")
            )
            await bed_service.create_bed(bed)
        return Room(**room_data)

    async def update_room(self, room_id: str, room_data: dict):
        from bson import ObjectId
        room_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
        await self.collection.update_one({"_id": ObjectId(room_id)}, {"$set": room_data})
        doc = await self.collection.find_one({"_id": ObjectId(room_id)})
        if doc:
            doc["id"] = str(doc["_id"])
            return Room(**doc)
        return None

    async def delete_room(self, room_id: str):
        await self.collection.delete_one({"_id": ObjectId(room_id)})
        return {"success": True, "roomId": room_id}
