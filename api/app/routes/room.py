from fastapi import APIRouter, Depends, HTTPException, status, Request
from app.services.room_service import RoomService
from app.models.room_schema import Room
from app.database.mongodb import db

router = APIRouter(prefix="/rooms", tags=["rooms"])
room_service = RoomService()

@router.get("/")
async def get_rooms(request: Request, property_id: str = None):
    property_ids = getattr(request.state, "property_ids", [])
    query = {"propertyId": {"$in": property_ids}}
    if property_id:
        query["propertyId"] = property_id
    rooms = await room_service.collection.find(query).to_list(length=100)
    for doc in rooms:
        doc["id"] = str(doc["_id"])
        if "_id" in doc:
            del doc["_id"]
    return {
        "data": rooms,
        "meta": {
            "total": len(rooms),
            "page": 1,
            "pageSize": len(rooms),
            "hasMore": False
        }
    }

@router.get("/{room_id}")
async def get_room(request: Request, room_id: str):
    room = await room_service.get_room(room_id)
    property_ids = getattr(request.state, "property_ids", [])
    if room and room.propertyId in property_ids:
        return {"data": room.model_dump()}
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

@router.post("/")
async def create_room(request: Request, room: Room):
    property_ids = getattr(request.state, "property_ids", [])
    if room.propertyId not in property_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Property not accessible by user.")
    created = await room_service.create_room(room.model_dump())
    return {"data": created.model_dump()}

@router.patch("/{room_id}")
async def patch_room(request: Request, room_id: str, room: Room):
    orig = await room_service.get_room(room_id)
    property_ids = getattr(request.state, "property_ids", [])
    if orig and orig.propertyId in property_ids:
        updated = await room_service.update_room(room_id, room.model_dump())
        return {"data": updated.model_dump()} if updated else {"data": {}}
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

@router.delete("/{room_id}")
async def delete_room(request: Request, room_id: str):
    orig = await room_service.get_room(room_id)
    property_ids = getattr(request.state, "property_ids", [])
    if orig and orig.propertyId in property_ids:
        result = await room_service.delete_room(room_id)
        return result
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
