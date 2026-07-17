from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def list_notifications():
    return {"notifications": [], "total": 0}


@router.get("/{notification_id}")
async def get_notification(notification_id: str):
    return {"notification_id": notification_id, "read": False}


@router.patch("/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    return {"notification_id": notification_id, "read": True}
