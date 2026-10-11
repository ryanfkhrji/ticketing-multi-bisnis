import uuid
from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    """Menyimpan koneksi WebSocket per tiket (satu tiket = satu room)."""

    def __init__(self) -> None:
        self._rooms: dict[uuid.UUID, set[WebSocket]] = defaultdict(set)

    async def connect(self, ticket_id: uuid.UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        self._rooms[ticket_id].add(websocket)

    def disconnect(self, ticket_id: uuid.UUID, websocket: WebSocket) -> None:
        room = self._rooms.get(ticket_id)
        if room is None:
            return
        room.discard(websocket)
        if not room:
            del self._rooms[ticket_id]

    async def broadcast(self, ticket_id: uuid.UUID, payload: dict) -> None:
        for websocket in list(self._rooms.get(ticket_id, ())):
            try:
                await websocket.send_json(payload)
            except Exception:
                self.disconnect(ticket_id, websocket)


manager = ConnectionManager()