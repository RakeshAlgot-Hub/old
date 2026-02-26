from fastapi import APIRouter, HTTPException, status
from typing import List
from app.models.bed_schema import BedCreate, BedUpdate, BedOut
from app.services.bed_service import (
    create_bed_service,
    list_beds_service,
    get_bed_service,
    update_bed_service,
    delete_bed_service,
)

router = APIRouter(prefix="/beds", tags=["beds"])

@router.get("/", response_model=List[BedOut])
@router.get("", response_model=List[BedOut])
async def list_beds():
    return await list_beds_service()

@router.post("/", response_model=BedOut, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=BedOut, status_code=status.HTTP_201_CREATED)
async def create_bed(bed: BedCreate):
    return await create_bed_service(bed)

@router.get("/{bed_id}", response_model=BedOut)
async def get_bed(bed_id: str):
    bed = await get_bed_service(bed_id)
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
    return bed

@router.patch("/{bed_id}", response_model=BedOut)
async def update_bed(bed_id: str, bed_update: BedUpdate):
    bed = await update_bed_service(bed_id, bed_update)
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
    return bed

@router.delete("/{bed_id}", response_model=dict)
async def delete_bed(bed_id: str):
    success = await delete_bed_service(bed_id)
    if not success:
        raise HTTPException(status_code=404, detail="Bed not found")
    return {"success": True}
