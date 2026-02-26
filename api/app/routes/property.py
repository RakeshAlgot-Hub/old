from fastapi import APIRouter, status
from app.models.property_schema import PropertyCreate, PropertyOut
from app.services.property_service import create_property_service, list_properties_service
from typing import List

router = APIRouter(prefix="/properties", tags=["properties"])

@router.post("", status_code=status.HTTP_201_CREATED, response_model=PropertyOut)
async def create_property(property: PropertyCreate):
    return await create_property_service(property)

@router.get("", response_model=List[PropertyOut])
async def get_properties():
    return await list_properties_service()
