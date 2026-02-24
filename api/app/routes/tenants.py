from fastapi import APIRouter, HTTPException, status, Depends
from app.utils.helpers import get_current_user
from app.database.mongodb import db
from datetime import datetime
from bson import ObjectId
from typing import Optional
from fastapi import Query
from app.models.tenant_schema import TenantRequest, TenantResponse, PaginatedTenantResponse, TenantUpdate
from app.services.tenant_service import create_tenant_service, get_tenants_service, delete_tenant_service, update_tenant_service

router = APIRouter()

@router.post("/tenants", status_code=status.HTTP_201_CREATED, response_model=TenantResponse)
async def create_tenant_endpoint(tenant: TenantRequest, current_user=Depends(get_current_user)):
    tenant_doc = await create_tenant_service(tenant, current_user)
    return TenantResponse(**tenant_doc)



@router.get("/tenants", status_code=status.HTTP_200_OK, response_model=PaginatedTenantResponse)
async def get_tenants(
    propertyId: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user=Depends(get_current_user)
):
    result = await get_tenants_service(propertyId, page, limit, search, current_user)
    return PaginatedTenantResponse(**result)



@router.delete("/tenants/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant(tenant_id: str, current_user=Depends(get_current_user)):
    delete_tenant_service(tenant_id, current_user)
    return


@router.patch("/tenants/{tenant_id}", status_code=status.HTTP_200_OK, response_model=TenantResponse)
async def update_tenant(tenant_id: str, data: TenantUpdate, current_user=Depends(get_current_user)):
    updated = update_tenant_service(tenant_id, data, current_user)
    return updated
