from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.security import create_access_token, get_current_user, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest

router = APIRouter()


def serialize_user(user: User) -> dict:
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(func.lower(User.email) == payload.email.strip().lower()))
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou palavra-passe incorretos.")
    return {"access_token": create_access_token(user.id), "token_type": "bearer", "user": serialize_user(user)}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return serialize_user(user)
