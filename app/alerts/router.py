from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from .manager import manager
from app.database.session import get_db
from app.models.db_models import LeakAlert

router = APIRouter()

@router.get("/history")
async def get_alert_history(limit: int = 50, db: Session = Depends(get_db)):
    """
    Fetch historical leak alerts from the database.
    """
    alerts = db.query(LeakAlert).order_by(LeakAlert.timestamp.desc()).limit(limit).all()
    return alerts

@router.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
