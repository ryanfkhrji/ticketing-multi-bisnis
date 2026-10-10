from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)

# Untuk user belum login
def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise AppError(401, "Belum login")
    user_id = decode_token(credentials.credentials, "access")
    if user_id is None:
        raise AppError(401, "Token tidak valid atau sudah kedaluwarsa")
    user = db.get(User, user_id)
    if user is None:
        raise AppError(401, "User tidak ditemukan")
    return user

# Untuk user sudah login, tapi harus punya peran tertentu
def require_roles(*roles: str):
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise AppError(403, "Peran Anda tidak berhak mengakses fitur ini")
        return current_user

    return checker