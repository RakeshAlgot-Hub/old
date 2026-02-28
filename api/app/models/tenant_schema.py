from pydantic import BaseModel
from typing import Optional, Literal

class BillingConfig(BaseModel):
    status: Literal['paid', 'due', 'overdue']
    billingCycle: Literal['monthly', 'day-wise']
    anchorDate: str
    method: Optional[str] = None

class Tenant(BaseModel):
    id: Optional[str] = None
    propertyId: Optional[str] = None
    roomId: Optional[str] = None
    bedId: Optional[str] = None
    name: Optional[str] = None
    documentId: Optional[str] = None
    phone: Optional[str] = None
    rent: Optional[str] = None
    status: Optional[str] = None
    joinDate: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    billingConfig: Optional[BillingConfig] = None

class TenantCreate(BaseModel):
    propertyId: Optional[str] = None
    roomId: Optional[str] = None
    bedId: Optional[str] = None
    name: Optional[str] = None
    documentId: Optional[str] = None
    phone: Optional[str] = None
    rent: Optional[str] = None
    status: Optional[str] = None
    joinDate: Optional[str] = None
    billingConfig: Optional[BillingConfig] = None

class TenantUpdate(BaseModel):
    propertyId: Optional[str] = None
    roomId: Optional[str] = None
    bedId: Optional[str] = None
    name: Optional[str] = None
    documentId: Optional[str] = None
    phone: Optional[str] = None
    rent: Optional[str] = None
    status: Optional[str] = None
    joinDate: Optional[str] = None
    billingConfig: Optional[BillingConfig] = None
