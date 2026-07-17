from app.core.timeutil import utcnow
from app.models.development import Development


def active_stage_event(development: Development):
    active = [event for event in development.stage_events if event.status == "active" and event.ended_at is None]
    return max(active, key=lambda item: item.started_at, default=None)


def days_in_current_stage(development: Development) -> float:
    event = active_stage_event(development)
    if not event:
        return 0
    return round((utcnow() - event.started_at).total_seconds() / 86400, 1)
