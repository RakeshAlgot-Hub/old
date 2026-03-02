from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum

class BillingStatus(str, Enum):
    PAID = 'paid'
    DUE = 'due'
    OVERDUE = 'overdue'

class BillingCycle(str, Enum):
    MONTHLY = 'monthly'
    DAY_WISE = 'day-wise'

class BillingConfig(BaseModel):
    status: Literal['paid', 'due', 'overdue']
    billingCycle: Literal['monthly', 'day-wise']
    anchorDay: int = Field(default=1, ge=1)
    method: Optional[str] = None
    dayWiseStartDate: Optional[str] = None

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
    checkoutDate: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    billingConfig: Optional[BillingConfig] = None
    autoGeneratePayments: Optional[bool] = True
    archived: bool = False
    archivedReason: Optional[str] = None
    archivedAt: Optional[str] = None

class TenantOut(BaseModel):
    """Response model for list/get tenants with enriched data"""
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
    checkoutDate: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    billingConfig: Optional[BillingConfig] = None
    autoGeneratePayments: Optional[bool] = True
    archived: bool = False
    archivedReason: Optional[str] = None
    archivedAt: Optional[str] = None
    # Enriched fields
    roomNumber: Optional[str] = None  # Avoid extra API call
    bedNumber: Optional[str] = None   # Avoid extra API call

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
    checkoutDate: Optional[str] = None
    billingConfig: Optional[BillingConfig] = None
    autoGeneratePayments: bool = True  # Default to True for auto-payment creation

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
    checkoutDate: Optional[str] = None
    billingConfig: Optional[BillingConfig] = None
    autoGeneratePayments: Optional[bool] = None
