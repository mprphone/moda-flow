from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.services.dashboard.get_today import get_today_dashboard

router = APIRouter()


@router.get("")
def dashboard(db: Session = Depends(get_db)):
    return get_today_dashboard(db)
