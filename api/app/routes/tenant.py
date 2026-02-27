from fastapi import APIRouter, Depends, HTTPException, status
from app.services.tenant_service import TenantService
from app.models.tenant_schema import TenantCreate, TenantUpdate
from app.utils.helpers import get_current_user

router = APIRouter(prefix="/tenants", tags=["tenants"])
tenant_service = TenantService()

@router.get("/")
@router.get("")
async def get_tenants(property_id: str = None, user_id: str = Depends(get_current_user)):
    tenants = await tenant_service.get_tenants(property_id)
    filtered = [t for t in tenants if t.propertyId and await tenant_service.is_property_owner(user_id, t.propertyId)]
    return {
        "data": [tenant.model_dump() for tenant in filtered],
        "meta": {
            "total": len(filtered),
            "page": 1,
            "pageSize": len(filtered),
            "hasMore": False
        }
    }

@router.get("/{tenant_id}")
async def get_tenant(tenant_id: str, user_id: str = Depends(get_current_user)):
    tenant = await tenant_service.get_tenant(tenant_id)
    if tenant and await tenant_service.is_property_owner(user_id, tenant.propertyId):
        return {"data": tenant.model_dump()}
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

@router.post("/")
@router.post("")
async def create_tenant(tenant: TenantCreate, user_id: str = Depends(get_current_user)):
    if not tenant.propertyId:
        raise HTTPException(status_code=400, detail="propertyId is required")
    if not await tenant_service.is_property_owner(user_id, tenant.propertyId):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    created = await tenant_service.create_tenant(tenant.model_dump(exclude_unset=True))
    return {"data": created.model_dump()}

@router.patch("/{tenant_id}")
async def patch_tenant(tenant_id: str, tenant: TenantUpdate, user_id: str = Depends(get_current_user)):
    orig = await tenant_service.get_tenant(tenant_id)
    if orig and await tenant_service.is_property_owner(user_id, orig.propertyId):
        updated = await tenant_service.update_tenant(tenant_id, tenant.model_dump(exclude_unset=True))
        return {"data": updated.model_dump()} if updated else {"data": {}}
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

@router.delete("/{tenant_id}")
async def delete_tenant(tenant_id: str, user_id: str = Depends(get_current_user)):
    orig = await tenant_service.get_tenant(tenant_id)
    if orig and await tenant_service.is_property_owner(user_id, orig.propertyId):
        result = await tenant_service.delete_tenant(tenant_id)
        return {"data": result}
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
