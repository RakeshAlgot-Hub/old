from typing import List
from pydantic import BaseModel, Field
from typing import Optional

from pydantic import validator

class TenantResponse(BaseModel):
    id: str
    propertyId: str
    unitId: str
    fullName: str
    documentId: str
    phoneNumber: str
    checkInDate: str
    depositAmount: str
    rentType: str
    nextDueDate: str
    status: str
    createdAt: str
    updatedAt: str
    profilePictureUrl: Optional[str] = None
    address: Optional[str] = None

class PaginatedTenantResponse(BaseModel):
    total: int
    page: int
    limit: int
    data: List[TenantResponse]

class TenantRequest(BaseModel):
    propertyId: str
    unitId: str
    fullName: str
    documentId: str
    phoneNumber: str
    checkInDate: str
    depositAmount: str
    rentType: str = Field(..., description="Type of rent: monthly or daywise")
    nextDueDate: str
    status: str = Field("stay", description="Tenant status: stay or vacate")
    profilePictureUrl: Optional[str] = None
    address: Optional[str] = None
    paymentStatus: Optional[str] = Field(None, description="Initial payment status: paid or due")



class TenantUpdate(BaseModel):
    propertyId: Optional[str] = None
    unitId: Optional[str] = None
    fullName: Optional[str] = None
    documentId: Optional[str] = None
    phoneNumber: Optional[str] = None
    checkInDate: Optional[str] = None
    depositAmount: Optional[str] = None
    rentType: Optional[str] = None
    nextDueDate: Optional[str] = None
    status: Optional[str] = None
    profilePictureUrl: Optional[str] = None
    address: Optional[str] = None

