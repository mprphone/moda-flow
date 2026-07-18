from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.security import get_current_user, hash_password, require_admin
from app.models.user import User
from app.schemas.common import ORMModel

router = APIRouter()

ROLES = {"admin", "designer"}


class UserCreate(ORMModel):
    name: str
    email: str | None = None
    password: str | None = None
    role: str = "designer"
    phone: str | None = None


class UserUpdate(ORMModel):
    name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    password: str | None = None
    email: str | None = None
    phone: str | None = None


def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "phone": user.phone,
        "created_at": user.created_at,
    }


@router.get("")
def get_users(db: Session = Depends(get_db)):
    return [serialize_user(item) for item in db.scalars(select(User).order_by(User.name)).all()]


@router.post("", status_code=201, dependencies=[Depends(require_admin)])
def post_user(payload: UserCreate, db: Session = Depends(get_db)):
    email = payload.email.strip().lower() if payload.email else None
    if payload.role not in ROLES:
        raise HTTPException(status_code=422, detail="Papel inválido (admin ou designer).")
    if payload.password and len(payload.password) < 8:
        raise HTTPException(status_code=422, detail="A palavra-passe deve ter pelo menos 8 carateres.")
    if email and db.scalar(select(User).where(func.lower(User.email) == email)):
        raise HTTPException(status_code=409, detail="Já existe um utilizador com esse email.")
    if bool(email) != bool(payload.password):
        raise HTTPException(status_code=422, detail="Para dar acesso, indique email e palavra-passe.")
    user = User(name=payload.name.strip(), email=email, password_hash=hash_password(payload.password) if payload.password else None, role=payload.role, is_active=bool(email and payload.password), phone=(payload.phone.strip() or None) if payload.phone else None)
    db.add(user)
    db.commit()
    db.refresh(user)
    return serialize_user(user)


@router.patch("/{user_id}")
def patch_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")
    data = payload.model_dump(exclude_unset=True)
    if data.get("role") and data["role"] not in ROLES:
        raise HTTPException(status_code=422, detail="Papel inválido (admin ou designer).")
    if data.get("is_active") is False and user.id == admin.id:
        raise HTTPException(status_code=422, detail="Não pode desativar a sua própria conta.")
    password = data.pop("password", None)
    email = data.pop("email", None)
    if email is not None:
        email = email.strip().lower() or None
        if email and db.scalar(select(User).where(func.lower(User.email) == email, User.id != user.id)):
            raise HTTPException(status_code=409, detail="Já existe um utilizador com esse email.")
        user.email = email
    if password:
        if len(password) < 8:
            raise HTTPException(status_code=422, detail="A palavra-passe deve ter pelo menos 8 carateres.")
        user.password_hash = hash_password(password)
    if data.get("is_active") is True and (not user.email or not (password or user.password_hash)):
        raise HTTPException(status_code=422, detail="Complete o email e a palavra-passe antes de ativar o acesso.")
    for key, value in data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return serialize_user(user)


class PasswordChange(ORMModel):
    current_password: str
    new_password: str


@router.post("/me/password")
def change_own_password(payload: PasswordChange, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from app.core.security import verify_password

    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=401, detail="A palavra-passe atual está incorreta.")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=422, detail="A nova palavra-passe deve ter pelo menos 8 carateres.")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"ok": True}


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")
    if user.id == admin.id:
        raise HTTPException(status_code=422, detail="Não pode eliminar a sua própria conta.")
    db.delete(user)
    db.commit()
