from typing import List
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime

class PaymentRequest(BaseModel):
    tenantId: str = Field(..., description="ID of the tenant making the payment")
    amount: float = Field(..., description="Amount of the payment")
    dueDate: datetime = Field(..., description="Due date for the payment")
    status: str = Field(..., description="Status of the payment (e.g., 'paid', 'unpaid')")
    paidDate: Optional[datetime] = Field(None, description="Date when the payment was made, if paid")
    description: Optional[str] = Field(None, description="Optional description for the payment")

class PaymentResponse(BaseModel):
    id: str = Field(..., description="Payment ID")
    tenantId: str = Field(..., description="ID of the tenant making the payment")
    amount: float = Field(..., description="Amount of the payment")
    dueDate: datetime = Field(..., description="Due date for the payment")
    status: str = Field(..., description="Status of the payment (e.g., 'paid', 'unpaid')")
    paidDate: Optional[datetime] = Field(None, description="Date when the payment was made, if paid")
    description: Optional[str] = Field(None, description="Optional description for the payment")
    tenantName: Optional[str] = Field(None, description="Name of the tenant")
    unitName: Optional[str] = Field(None, description="Name of the unit")

class PaginatedPaymentResponse(BaseModel):
    total: int
    page: int
    limit: int
    totalPages: int
    data: List[PaymentResponse]