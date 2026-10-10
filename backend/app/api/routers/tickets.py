import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.user import User
from app.schemas.ticket import TicketCreate, TicketOut, TicketStatus, TicketUpdate
from app.services import ticket_service

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.post("", response_model=TicketOut, status_code=201)
def create_ticket(
    data: TicketCreate,
    customer: User = Depends(require_roles("customer")),
    db: Session = Depends(get_db),
):
    return ticket_service.create_ticket(db, customer, data)


@router.get("", response_model=list[TicketOut])
def list_tickets(
    status: TicketStatus | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ticket_service.list_tickets(db, current_user, status)


@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(
    ticket_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ticket_service.get_ticket_for_user(db, current_user, ticket_id)


@router.patch("/{ticket_id}", response_model=TicketOut)
def update_ticket(
    ticket_id: uuid.UUID,
    data: TicketUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ticket_service.update_ticket(db, current_user, ticket_id, data)