from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

class PaymentBase(BaseModel):
    tenantId: str
    propertyId: str
    tenantName: str
    property: str
    bed: str
    amount: str
    status: Literal['paid', 'due', 'overdue']
    dueDate: str
    date: Optional[str] = None
    method: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class Payment(PaymentBase):
    id: str
    createdAt: datetime
    updatedAt: datetime


class PaymentUpdate(BaseModel):
    tenantId: Optional[str] = None
    propertyId: Optional[str] = None
    tenantName: Optional[str] = None
    property: Optional[str] = None
    bed: Optional[str] = None
    amount: Optional[str] = None
    status: Optional[str] = None
    date: Optional[str] = None
    dueDate: Optional[str] = None
    method: Optional[str] = None