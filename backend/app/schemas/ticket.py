import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.user import UserBrief

TicketStatus = Literal["open", "in_progress", "resolved", "closed"]
TicketPriority = Literal["low", "medium", "high"]


class TicketCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    subject: str = Field(min_length=3, max_length=200)
    category: str = Field(min_length=2, max_length=80)
    priority: TicketPriority
    message: str = Field(min_length=1, max_length=5000)


class TicketUpdate(BaseModel):
    status: TicketStatus | None = None
    assigned_agent_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def exactly_one_field(self):
        if (self.status is None) == (self.assigned_agent_id is None):
            raise ValueError("Isi salah satu saja: status atau assigned_agent_id")
        return self


class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    subject: str
    category: str
    priority: str
    status: str
    customer: UserBrief
    assigned_agent: UserBrief | None
    created_at: datetime
    updated_at: datetime