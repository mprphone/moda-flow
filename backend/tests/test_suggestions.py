from datetime import date, timedelta
from types import SimpleNamespace
from app.core.timeutil import utcnow
from app.services.suggestions.development_suggestions import build_suggestions


def test_overdue_suggestion():
    event = SimpleNamespace(status="active", ended_at=None, started_at=utcnow()-timedelta(days=8))
    development = SimpleNamespace(
        status="active",
        stage_events=[event],
        due_date=date.today()-timedelta(days=1),
        current_stage="tingimento",
        productions=[],
    )
    suggestions = build_suggestions(development)
    assert suggestions
