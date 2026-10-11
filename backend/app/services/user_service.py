import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserCreate


def list_users(db: Session, business_id: uuid.UUID) -> list[User]:
    stmt = select(User).where(User.business_id == business_id).order_by(User.created_at)
    return list(db.scalars(stmt))


def create_user(db: Session, business_id: uuid.UUID, data: UserCreate) -> User:
    email = data.email.lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise AppError(409, "Email sudah terdaftar")

    user = User(
        business_id=business_id,
        name=data.name,
        email=email,
        password_hash=hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppError(409, "Email sudah terdaftar")
    db.refresh(user)
    return user