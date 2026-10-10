import re

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.business import Business
from app.models.user import User


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "bisnis"


def _unique_slug(db: Session, name: str) -> str:
    base = _slugify(name)[:70]
    slug, n = base, 1
    while db.scalar(select(Business.id).where(Business.slug == slug)):
        n += 1
        slug = f"{base}-{n}"
    return slug


def register_business(
    db: Session, business_name: str, name: str, email: str, password: str
) -> User:
    email = email.lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise AppError(409, "Email sudah terdaftar")

    business = Business(name=business_name, slug=_unique_slug(db, business_name))
    db.add(business)
    db.flush()  # supaya business.id sudah terisi

    user = User(
        business_id=business.id,
        name=name,
        email=email,
        password_hash=hash_password(password),
        role="admin",
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppError(409, "Email atau slug sudah terpakai")
    db.refresh(user)
    return user


def login(db: Session, email: str, password: str) -> tuple[str, str]:
    user = db.scalar(select(User).where(User.email == email.lower()))
    if user is None or not verify_password(password, user.password_hash):
        raise AppError(401, "Email atau password salah")
    return create_access_token(user.id), create_refresh_token(user.id)


def refresh_access_token(db: Session, refresh_token: str) -> str:
    user_id = decode_token(refresh_token, "refresh")
    if user_id is None or db.get(User, user_id) is None:
        raise AppError(401, "Refresh token tidak valid atau sudah kedaluwarsa")
    return create_access_token(user_id)