from pydantic import BaseModel
from typing import Optional

class Tenant(BaseModel):
    id: Optional[str] = None
    propertyId: Optional[str] = None
    roomId: Optional[str] = None
    bedId: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    rent: Optional[str] = None
    status: Optional[str] = None
    joinDate: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class TenantCreate(BaseModel):
    propertyId: Optional[str] = None
    roomId: Optional[str] = None
    bedId: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    rent: Optional[str] = None
    status: Optional[str] = None
    joinDate: Optional[str] = None

class TenantUpdate(BaseModel):
    propertyId: Optional[str] = None
    roomId: Optional[str] = None
    bedId: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    rent: Optional[str] = None
    status: Optional[str] = None
    joinDate: Optional[str] = None
