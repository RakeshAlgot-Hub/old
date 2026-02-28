from fastapi import APIRouter, HTTPException, status, Request
from app.services.tenant_service import TenantService
from app.models.tenant_schema import TenantCreate, TenantUpdate

router = APIRouter(prefix="/tenants", tags=["tenants"])
tenant_service = TenantService()

@router.get("/")
@router.get("")
async def get_tenants(request: Request, property_id: str = None):
    tenants = await tenant_service.get_tenants(property_id)
    property_ids = getattr(request.state, "property_ids", [])
    filtered = [t for t in tenants if t.propertyId and t.propertyId in property_ids]
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
async def get_tenant(request: Request, tenant_id: str):
    tenant = await tenant_service.get_tenant(tenant_id)
    property_ids = getattr(request.state, "property_ids", [])
    if tenant and tenant.propertyId in property_ids:
        return {"data": tenant.model_dump()}
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

@router.post("/")
@router.post("")
async def create_tenant(request: Request, tenant: TenantCreate):
    if not tenant.propertyId:
        raise HTTPException(status_code=400, detail="propertyId is required")
    property_ids = getattr(request.state, "property_ids", [])
    if tenant.propertyId not in property_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    created = await tenant_service.create_tenant(tenant.model_dump(exclude_unset=True))
    return {"data": created.model_dump()}

@router.patch("/{tenant_id}")
async def patch_tenant(request: Request, tenant_id: str, tenant: TenantUpdate):
    orig = await tenant_service.get_tenant(tenant_id)
    property_ids = getattr(request.state, "property_ids", [])
    if orig and orig.propertyId in property_ids:
        updated = await tenant_service.update_tenant(tenant_id, tenant.model_dump(exclude_unset=True))
        return {"data": updated.model_dump()} if updated else {"data": {}}
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

@router.delete("/{tenant_id}")
async def delete_tenant(request: Request, tenant_id: str):
    orig = await tenant_service.get_tenant(tenant_id)
    property_ids = getattr(request.state, "property_ids", [])
    if orig and orig.propertyId in property_ids:
        result = await tenant_service.delete_tenant(tenant_id)
        return {"data": result}
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
