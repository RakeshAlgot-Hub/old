from pydantic import BaseModel, Field
from typing import Optional, Literal, Union
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
    """
    Payment update model for PATCH requests.
    All fields are optional - only provided fields will be updated.
    Dates can be provided as date objects or ISO string format.
    """
    tenantId: Optional[str] = None
    propertyId: Optional[str] = None
    bed: Optional[str] = None
    amount: Optional[str] = None
    status: Optional[str] = None
    dueDate: Optional[Union[str, date]] = None  # Can be string (ISO format) or date object
    paidDate: Optional[Union[str, date]] = None  # Can be string (ISO format) or date object
    method: Optional[str] = None