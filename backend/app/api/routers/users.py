from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserOut
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(
    admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    return user_service.list_users(db, admin.business_id)


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    data: UserCreate,
    admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    return user_service.create_user(db, admin.business_id, data)