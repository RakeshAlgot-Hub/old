from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel

class Subscription(BaseModel):
    ownerId: str
    plan: Literal['free', 'pro', 'premium']
    status: Literal['active', 'inactive', 'cancelled'] = 'active'
    currentPeriodStart: str
    currentPeriodEnd: str
    createdAt: str
    updatedAt: str

class Usage(BaseModel):
    ownerId: str
    properties: int
    tenants: int
    smsCredits: int
    updatedAt: str
