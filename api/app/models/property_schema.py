from pydantic import BaseModel, Field
from typing import List, Optional

class Building(BaseModel):
    id: str
    name: str

class Floor(BaseModel):
    label: str
    name: str

class PropertyRequest(BaseModel):
    name: str
    type: str  # 'Hostel' or 'Apartment'
    city: str
    address: str
    buildings: List[Building]
    shareTypes: Optional[List[int]] = None

class PropertyResponse(PropertyRequest):
    id: str
    floors: List[Floor]
    shareTypes: List[int]
    createdAt: str
    updatedAt: str
