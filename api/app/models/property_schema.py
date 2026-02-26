from pydantic import BaseModel, Field
from typing import Optional

class PropertyBase(BaseModel):
    ownerId: str = Field(..., description="Owner ID")
    name: str = Field(..., description="Property name")
    address: str = Field(..., description="Property address")
    active: bool = Field(default=True, description="Is property active")
    createdAt: Optional[str] = Field(None, description="Created at ISO string")
    updatedAt: Optional[str] = Field(None, description="Updated at ISO string")

class PropertyCreate(PropertyBase):
    pass

class PropertyOut(PropertyBase):
    id: str

# MongoDB document schema (for internal use)
class PropertyInDB(PropertyBase):
    _id: str
