import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import AppError
from app.models.message import Message
from app.models.ticket import Ticket
from app.models.user import User


def list_messages(db: Session, ticket_id: uuid.UUID) -> list[Message]:
    """Panggil HANYA setelah akses tiket divalidasi lewat get_ticket_for_user."""
    stmt = (
        select(Message)
        .options(joinedload(Message.sender))
        .where(Message.ticket_id == ticket_id)
        .order_by(Message.created_at)
    )
    return list(db.scalars(stmt))


def create_message(db: Session, ticket: Ticket, sender: User, body: str) -> Message:
    """Panggil HANYA setelah akses tiket divalidasi lewat get_ticket_for_user."""
    if ticket.status == "closed":
        raise AppError(409, "Tiket sudah closed dan tidak bisa menerima pesan baru")

    message = Message(ticket_id=ticket.id, sender_id=sender.id, body=body)
    db.add(message)
    ticket.updated_at = func.now()  # pesan baru = aktivitas terbaru tiket
    db.commit()
    db.refresh(message)
    return message