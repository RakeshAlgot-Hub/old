from pydantic import BaseModel
from typing import Optional

class Tenant(BaseModel):
    id: Optional[str] = None
    propertyId: str
    roomId: Optional[str] = None
    bedId: Optional[str] = None
    name: str
    email: str
    phone: str
    rent: str  # Accept plain string, not formatted
    status: str
    joinDate: str
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
