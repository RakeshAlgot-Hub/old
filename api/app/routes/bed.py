from fastapi import APIRouter, HTTPException, status, Query, Request
from typing import List
from app.models.bed_schema import BedCreate, BedUpdate, BedOut
from app.services.bed_service import BedService


router = APIRouter(prefix="/beds", tags=["beds"])
bed_service = BedService()

@router.get("", response_model=List[BedOut])
async def list_beds(request: Request, room_id: str = Query(None)):
    beds = []
    query = {}
    property_ids = getattr(request.state, "property_ids", [])
    if room_id:
        query["roomId"] = room_id
    if property_ids:
        query["propertyId"] = {"$in": property_ids}
    async for doc in bed_service.db["beds"].find(query):
        beds.append(BedOut(**doc))
    return beds

@router.post("", response_model=BedOut, status_code=status.HTTP_201_CREATED)
async def create_bed(request: Request, bed: BedCreate):
    property_ids = getattr(request.state, "property_ids", [])
    if bed.propertyId not in property_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return await bed_service.create_bed(bed)

@router.get("/{bed_id}", response_model=BedOut)
async def get_bed(request: Request, bed_id: str):
    bed = await bed_service.get_bed(bed_id)
    property_ids = getattr(request.state, "property_ids", [])
    if not bed or bed.propertyId not in property_ids:
        raise HTTPException(status_code=404, detail="Bed not found or forbidden")
    return bed

@router.patch("/{bed_id}", response_model=BedOut)
async def update_bed(request: Request, bed_id: str, bed_update: BedUpdate):
    bed = await bed_service.update_bed(bed_id, bed_update)
    property_ids = getattr(request.state, "property_ids", [])
    if not bed or bed.propertyId not in property_ids:
        raise HTTPException(status_code=404, detail="Bed not found or forbidden")
    return bed

@router.delete("/{bed_id}", response_model=dict)
async def delete_bed(request: Request, bed_id: str):
    bed = await bed_service.get_bed(bed_id)
    property_ids = getattr(request.state, "property_ids", [])
    if not bed or bed.propertyId not in property_ids:
        raise HTTPException(status_code=404, detail="Bed not found or forbidden")
    success = await bed_service.delete_bed(bed_id)
    if not success:
        raise HTTPException(status_code=404, detail="Bed not found")
    return {"success": True}
