import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.message import Message


def list_messages(db: Session, ticket_id: uuid.UUID) -> list[Message]:
    """Panggil HANYA setelah akses tiket divalidasi lewat get_ticket_for_user."""
    stmt = (
        select(Message)
        .options(joinedload(Message.sender))
        .where(Message.ticket_id == ticket_id)
        .order_by(Message.created_at)
    )
    return list(db.scalars(stmt))