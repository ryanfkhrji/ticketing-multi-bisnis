import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from app.core.exceptions import AppError
from app.core.security import decode_token
from app.db.session import SessionLocal
from app.models.user import User
from app.realtime.manager import manager
from app.schemas.message import MessageIn, MessageOut
from app.services import message_service, ticket_service

router = APIRouter(tags=["websocket"])

WS_POLICY_VIOLATION = 1008


def _can_access(user_id: uuid.UUID, ticket_id: uuid.UUID) -> bool:
    with SessionLocal() as db:
        user = db.get(User, user_id)
        if user is None:
            return False
        try:
            ticket_service.get_ticket_for_user(db, user, ticket_id)
        except AppError:
            return False
        return True


def _save_message(user_id: uuid.UUID, ticket_id: uuid.UUID, body: str) -> dict:
    with SessionLocal() as db:
        user = db.get(User, user_id)
        if user is None:
            raise AppError(401, "User tidak ditemukan")
        ticket = ticket_service.get_ticket_for_user(db, user, ticket_id)
        message = message_service.create_message(db, ticket, user, body)
        return MessageOut.model_validate(message).model_dump(mode="json")


@router.websocket("/ws/tickets/{ticket_id}")
async def ticket_chat(
    websocket: WebSocket, ticket_id: uuid.UUID, token: str | None = None
):
    # Tolak SEBELUM koneksi diterima: token tidak valid atau bukan hak tiket ini.
    user_id = decode_token(token, "access") if token else None
    if user_id is None or not await run_in_threadpool(_can_access, user_id, ticket_id):
        await websocket.close(code=WS_POLICY_VIOLATION)
        return

    await manager.connect(ticket_id, websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                incoming = MessageIn.model_validate_json(raw)
            except ValidationError:
                await websocket.send_json(
                    {"type": "error", "detail": "Format pesan tidak valid"}
                )
                continue

            try:
                message = await run_in_threadpool(
                    _save_message, user_id, ticket_id, incoming.body
                )
            except AppError as exc:
                await websocket.send_json({"type": "error", "detail": exc.message})
                continue

            await manager.broadcast(ticket_id, {"type": "message", "data": message})
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(ticket_id, websocket)