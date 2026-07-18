from app.schemas.common import ORMModel


class ClientCreate(ORMModel):
    name: str
    group_name: str | None = None
    email: str | None = None
    phone: str | None = None
    contact_person: str | None = None
    segments: str | None = None
    preferred_channel: str | None = None
    meetings: str | None = None
    notes: str | None = None


class ClientOut(ClientCreate):
    id: int


class ClientUpdate(ORMModel):
    name: str | None = None
    group_name: str | None = None
    email: str | None = None
    phone: str | None = None
    contact_person: str | None = None
    segments: str | None = None
    preferred_channel: str | None = None
    meetings: str | None = None
    notes: str | None = None


class ClientScoreOut(ORMModel):
    client_id: int
    name: str
    grade: str
    score: int
    approval_rate: float
    first_sample_rate: float
    average_versions: float
    summary: str
