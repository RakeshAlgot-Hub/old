from fastapi import APIRouter, status, Request
from app.models.property_schema import PropertyCreate, PropertyOut
from app.services.property_service import PropertyService
from typing import List


router = APIRouter(prefix="/properties", tags=["properties"])
property_service = PropertyService()

@router.post("", status_code=status.HTTP_201_CREATED, response_model=PropertyOut)
async def create_property(request: Request, property: PropertyCreate):
    user_id = getattr(request.state, "user_id", None)
    property.ownerId = user_id
    return await property_service.create_property(property)

@router.get("", response_model=List[PropertyOut])
async def get_properties(request: Request):
    user_id = getattr(request.state, "user_id", None)
    return await property_service.list_properties(user_id)
