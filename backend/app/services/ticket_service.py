import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import AppError
from app.models.message import Message
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.ticket import TicketCreate, TicketUpdate

# Alur status sesuai diagram dokumen. closed adalah akhir.
STATUS_FLOW: dict[str, set[str]] = {
    "open": {"in_progress"},
    "in_progress": {"resolved"},
    "resolved": {"closed", "open"},
    "closed": set(),
}


def _base_query(user: User):
    """Query dasar: SELALU dibatasi ke bisnis user, dan ke miliknya kalau customer."""
    stmt = (
        select(Ticket)
        .options(joinedload(Ticket.customer), joinedload(Ticket.assigned_agent))
        .where(Ticket.business_id == user.business_id)
    )
    if user.role == "customer":
        stmt = stmt.where(Ticket.customer_id == user.id)
    return stmt


def get_ticket_for_user(db: Session, user: User, ticket_id: uuid.UUID) -> Ticket:
    """Satu-satunya pintu untuk mengambil satu tiket. Bukan haknya = 404."""
    ticket = db.scalar(_base_query(user).where(Ticket.id == ticket_id))
    if ticket is None:
        raise AppError(404, "Tiket tidak ditemukan")
    return ticket


def list_tickets(db: Session, user: User, status: str | None) -> list[Ticket]:
    stmt = _base_query(user)
    if status:
        stmt = stmt.where(Ticket.status == status)
    stmt = stmt.order_by(Ticket.updated_at.desc())
    return list(db.scalars(stmt))


def create_ticket(db: Session, customer: User, data: TicketCreate) -> Ticket:
    ticket = Ticket(
        business_id=customer.business_id,
        customer_id=customer.id,
        subject=data.subject,
        category=data.category,
        priority=data.priority,
        status="open",
    )
    db.add(ticket)
    db.flush()  # supaya ticket.id terisi

    db.add(Message(ticket_id=ticket.id, sender_id=customer.id, body=data.message))
    db.commit()  # tiket dan pesan pertama disimpan dalam satu transaksi

    return get_ticket_for_user(db, customer, ticket.id)


def _can_change_status(user: User, ticket: Ticket, new_status: str) -> bool:
    if user.role == "admin":
        return True
    if user.role == "agent":
        # Agent hanya mengubah status tiket miliknya. Membuka kembali = hak Customer.
        return ticket.assigned_agent_id == user.id and new_status != "open"
    # Customer: hanya boleh membuka kembali. Kepemilikan sudah dijamin get_ticket_for_user.
    return new_status == "open"


def _change_status(
    db: Session, user: User, ticket_id: uuid.UUID, new_status: str
) -> Ticket:
    ticket = get_ticket_for_user(db, user, ticket_id)

    if ticket.status == "closed":
        raise AppError(409, "Tiket sudah closed dan terkunci")
    if not _can_change_status(user, ticket, new_status):
        raise AppError(403, "Anda tidak berhak mengubah status tiket ini")
    if new_status not in STATUS_FLOW[ticket.status]:
        raise AppError(
            409, f"Status tidak bisa diubah dari {ticket.status} ke {new_status}"
        )
    if new_status == "in_progress" and ticket.assigned_agent_id is None:
        raise AppError(409, "Tiket belum punya agen, assign agen terlebih dahulu")

    ticket.status = new_status
    db.commit()
    return get_ticket_for_user(db, user, ticket_id)


def _assign(
    db: Session, user: User, ticket_id: uuid.UUID, agent_id: uuid.UUID
) -> Ticket:
    ticket = get_ticket_for_user(db, user, ticket_id)

    if ticket.status == "closed":
        raise AppError(409, "Tiket sudah closed dan terkunci")
    if user.role == "customer":
        raise AppError(403, "Customer tidak berhak meng-assign tiket")
    if user.role == "agent":
        if agent_id != user.id:
            raise AppError(403, "Agent hanya boleh mengambil tiket untuk dirinya sendiri")
        if ticket.assigned_agent_id is not None:
            raise AppError(409, "Tiket sudah ditangani oleh agen")

    # Agen tujuan wajib berperan agent dan berada di bisnis yang sama.
    agent = db.scalar(
        select(User).where(
            User.id == agent_id,
            User.business_id == user.business_id,
            User.role == "agent",
        )
    )
    if agent is None:
        raise AppError(404, "Agen tidak ditemukan")

    ticket.assigned_agent_id = agent.id
    if ticket.status == "open":
        ticket.status = "in_progress"
    db.commit()
    return get_ticket_for_user(db, user, ticket_id)


def update_ticket(
    db: Session, user: User, ticket_id: uuid.UUID, data: TicketUpdate
) -> Ticket:
    if data.status is not None:
        return _change_status(db, user, ticket_id, data.status)
    if data.assigned_agent_id is not None:
        return _assign(db, user, ticket_id, data.assigned_agent_id)
    raise AppError(422, "Isi salah satu: status atau assigned_agent_id")