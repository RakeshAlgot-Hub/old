from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import datetime

class BedBase(BaseModel):
    propertyId: str
    roomId: str
    bedNumber: str
    status: Literal['available', 'occupied', 'maintenance'] = 'available'
    ownerId: Optional[str] = None

class BedCreate(BedBase):
    pass

class BedUpdate(BaseModel):
    bedNumber: Optional[str] = None
    status: Optional[Literal['available', 'occupied', 'maintenance']] = None

class BedOut(BedBase):
    id: str
    createdAt: datetime
    updatedAt: datetime
