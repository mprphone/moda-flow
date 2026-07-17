from datetime import UTC, date, datetime


def utcnow() -> datetime:
    """UTC atual sem tzinfo, compatível com colunas DateTime naive."""
    return datetime.now(UTC).replace(tzinfo=None)


def today() -> date:
    return utcnow().date()
