import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserBrief


class MessageIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    body: str = Field(min_length=1, max_length=5000)


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ticket_id: uuid.UUID
    body: str
    created_at: datetime
    sender: UserBrief