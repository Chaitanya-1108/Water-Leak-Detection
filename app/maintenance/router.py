from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.database.session import get_db
from app.models.db_models import MaintenanceTicket, LeakAlert

router = APIRouter()

class TicketCreate(BaseModel):
    alert_id: int
    assigned_technician: Optional[str] = None
    notes: Optional[str] = None

class TicketUpdate(BaseModel):
    status: str # In Progress, Resolved
    notes: Optional[str] = None

@router.post("/")
async def create_ticket(ticket: TicketCreate, db: Session = Depends(get_db)):
    db_ticket = MaintenanceTicket(
        alert_id=ticket.alert_id,
        assigned_technician=ticket.assigned_technician,
        notes=ticket.notes,
        status="Pending"
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

@router.get("/")
async def get_tickets(db: Session = Depends(get_db)):
    return db.query(MaintenanceTicket).all()

@router.patch("/{ticket_id}")
async def update_ticket(ticket_id: int, update: TicketUpdate, db: Session = Depends(get_db)):
    db_ticket = db.query(MaintenanceTicket).filter(MaintenanceTicket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    db_ticket.status = update.status
    if update.notes:
        db_ticket.notes = update.notes
    
    if update.status == "Resolved":
        db_ticket.resolved_at = datetime.utcnow()
    
    db.commit()
    return db_ticket
