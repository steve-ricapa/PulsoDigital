from fastapi import APIRouter, Depends, Query
from app.core.security import get_current_active_user, require_roles
from app.models import User

router = APIRouter()


@router.get("")
async def list_audit_logs(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles("admin")),
):
    return {"logs": [], "total": 0, "page": page, "size": size, "pages": 0}
