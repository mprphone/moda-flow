import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.routes.uploads import upload_image
from app.core.db import get_db
from app.core.timeutil import utcnow
from app.models.upload_session import UploadSession

protected_router = APIRouter()
public_router = APIRouter()
SESSION_MINUTES = 15


def get_valid(db: Session, token: str) -> UploadSession:
    session = db.get(UploadSession, token)
    if not session or session.expires_at < utcnow():
        raise HTTPException(status_code=404, detail="Este QR expirou. Gere um novo na ficha.")
    return session


@protected_router.post("", status_code=201)
def create_session(db: Session = Depends(get_db)):
    item = UploadSession(token=secrets.token_urlsafe(32), expires_at=utcnow() + timedelta(minutes=SESSION_MINUTES))
    db.add(item)
    db.commit()
    return {"token": item.token, "expires_at": item.expires_at}


@protected_router.get("/{token}")
def session_status(token: str, db: Session = Depends(get_db)):
    item = get_valid(db, token)
    return {"status": "received" if item.file_url else "waiting", "file_url": item.file_url, "mime_type": item.mime_type, "name": item.original_name}


@public_router.get("/{token}")
def public_session(token: str, db: Session = Depends(get_db)):
    item = get_valid(db, token)
    return {"status": "received" if item.file_url else "waiting"}


@public_router.post("/{token}", status_code=201)
async def receive_photo(token: str, file: UploadFile, db: Session = Depends(get_db)):
    item = get_valid(db, token)
    result = await upload_image(file)
    item.file_url = result["url"]
    item.mime_type = result["mime_type"]
    item.original_name = result["name"]
    db.commit()
    return {"ok": True}
