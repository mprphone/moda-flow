from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.services.analytics.stage_stats import stage_statistics

router = APIRouter()


@router.get("/stages")
def get_stage_stats(db: Session = Depends(get_db)):
    return stage_statistics(db)
