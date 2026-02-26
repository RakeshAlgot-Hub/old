from fastapi import APIRouter, Depends, HTTPException, status
from app.services.room_service import RoomService
from app.models.room_schema import Room
from app.utils.helpers import get_current_user

router = APIRouter(prefix="/rooms", tags=["rooms"])
room_service = RoomService()
room_service = RoomService()

@router.get("/")
async def get_rooms(property_id: str = None, user_id: str = Depends(get_current_user)):
    rooms = await room_service.get_rooms(property_id)
    filtered = [r for r in rooms if r.propertyId and await room_service.is_property_owner(user_id, r.propertyId)]
    return {
        "data": [room.model_dump() for room in filtered],
        "meta": {
            "total": len(filtered),
            "page": 1,
            "pageSize": len(filtered),
            "hasMore": False
        }
    }

@router.get("/{room_id}")
async def get_room(room_id: str, user_id: str = Depends(get_current_user)):
    room = await room_service.get_room(room_id)
    if room and await room_service.is_property_owner(user_id, room.propertyId):
        return {"data": room.model_dump()}
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

@router.post("/")
async def create_room(room: Room, user_id: str = Depends(get_current_user)):
    if not await room_service.is_property_owner(user_id, room.propertyId):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    created = await room_service.create_room(room.model_dump())
    return {"data": created.model_dump()}

@router.patch("/{room_id}")
async def patch_room(room_id: str, room: Room, user_id: str = Depends(get_current_user)):
    orig = await room_service.get_room(room_id)
    if orig and await room_service.is_property_owner(user_id, orig.propertyId):
        updated = await room_service.update_room(room_id, room.model_dump())
        return {"data": updated.model_dump()} if updated else {"data": {}}
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

@router.delete("/{room_id}")
async def delete_room(room_id: str, user_id: str = Depends(get_current_user)):
    orig = await room_service.get_room(room_id)
    if orig and await room_service.is_property_owner(user_id, orig.propertyId):
        result = await room_service.delete_room(room_id)
        return {"data": result}
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
