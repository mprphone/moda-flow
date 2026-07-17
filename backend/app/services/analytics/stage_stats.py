from datetime import date, timedelta
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.enums import PIPELINE, STAGE_LABELS, Stage
from app.core.timeutil import today
from app.models.development import Development
from app.models.stage_event import StageEvent
from app.services.pipeline.timing import days_in_current_stage

DEFAULT_STAGE_DAYS = 3.0


def average_stage_durations(db: Session) -> dict[str, dict]:
    """Duração média (em dias) por fase, calculada a partir dos eventos concluídos."""
    rows = db.execute(
        select(StageEvent.stage, StageEvent.started_at, StageEvent.ended_at).where(StageEvent.ended_at.is_not(None))
    ).all()
    samples: dict[str, list[float]] = {}
    for stage, started, ended in rows:
        samples.setdefault(stage, []).append((ended - started).total_seconds() / 86400)
    return {
        stage: {"average_days": round(sum(values) / len(values), 1), "completed_events": len(values)}
        for stage, values in samples.items()
    }


def stage_statistics(db: Session) -> dict:
    averages = average_stage_durations(db)
    stages = [
        {
            "stage": stage,
            "label": STAGE_LABELS[stage],
            "average_days": averages.get(stage, {}).get("average_days"),
            "completed_events": averages.get(stage, {}).get("completed_events", 0),
        }
        for stage in PIPELINE
        if stage != Stage.APROVADO.value
    ]
    measured = [item for item in stages if item["average_days"] is not None]
    bottleneck = max(measured, key=lambda item: item["average_days"]) if measured else None
    return {"stages": stages, "bottleneck": bottleneck}


def estimate_completion(development: Development, averages: dict[str, dict]) -> date | None:
    """Data prevista de aprovação com base nos tempos médios históricos por fase."""
    if development.current_stage == Stage.APROVADO.value:
        return None
    try:
        index = PIPELINE.index(development.current_stage)
    except ValueError:
        return None
    current_average = averages.get(development.current_stage, {}).get("average_days", DEFAULT_STAGE_DAYS)
    days = max(0.5, current_average - days_in_current_stage(development))
    for stage in PIPELINE[index + 1:]:
        if stage == Stage.APROVADO.value:
            continue
        days += averages.get(stage, {}).get("average_days", DEFAULT_STAGE_DAYS)
    return today() + timedelta(days=round(days))
