from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, date
from enum import Enum

class PaymentStatus(str, Enum):
    PAID = 'paid'
    DUE = 'due'
    OVERDUE = 'overdue'

class PaymentMethod(str, Enum):
    CASH = 'Cash'
    ONLINE = 'Online'
    BANK_TRANSFER = 'Bank Transfer'
    UPI = 'UPI'
    CHEQUE = 'Cheque'

class PaymentBase(BaseModel):
    tenantId: str
    propertyId: str
    bed: str
    amount: str
    status: Literal['paid', 'due', 'overdue']
    dueDate: Optional[date] = None
    paidDate: Optional[date] = None
    method: Optional[str] = Field(default=PaymentMethod.CASH.value)

class PaymentCreate(PaymentBase):
    pass

class Payment(PaymentBase):
    id: str
    createdAt: datetime
    updatedAt: datetime
    tenantName: Optional[str] = None  # Enriched field from tenant lookup
    roomNumber: Optional[str] = None  # Enriched field from room lookup


class PaymentUpdate(BaseModel):
    tenantId: Optional[str] = None
    propertyId: Optional[str] = None
    bed: Optional[str] = None
    amount: Optional[str] = None
    status: Optional[str] = None
    dueDate: Optional[date] = None
    paidDate: Optional[date] = None
    method: Optional[str] = None