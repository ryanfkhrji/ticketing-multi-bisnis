from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.business import Business
from app.models.user import User
from app.schemas.auth import (
    AccessTokenResponse,
    BusinessOut,
    LoginRequest,
    MeResponse,
    RefreshRequest,
    RegisterBusinessRequest,
    TokenResponse,
)
from app.schemas.user import UserOut
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _me_response(db: Session, user: User) -> MeResponse:
    business = db.get(Business, user.business_id)
    return MeResponse(
        user=UserOut.model_validate(user),
        business=BusinessOut.model_validate(business),
    )


@router.post("/register-business", response_model=MeResponse, status_code=201)
def register_business(data: RegisterBusinessRequest, db: Session = Depends(get_db)):
    user = auth_service.register_business(
        db, data.business_name, data.name, data.email, data.password
    )
    return _me_response(db, user)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    access_token, refresh_token = auth_service.login(db, data.email, data.password)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    access_token = auth_service.refresh_access_token(db, data.refresh_token)
    return AccessTokenResponse(access_token=access_token)


@router.get("/me", response_model=MeResponse)
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _me_response(db, current_user)