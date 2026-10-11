import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.message import MessageOut
from app.services import message_service, ticket_service

router = APIRouter(prefix="/tickets", tags=["messages"])


@router.get("/{ticket_id}/messages", response_model=list[MessageOut])
def list_messages(
    ticket_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = ticket_service.get_ticket_for_user(db, current_user, ticket_id)
    return message_service.list_messages(db, ticket.id)