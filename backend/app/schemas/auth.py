from app.schemas.common import ORMModel


class LoginRequest(ORMModel):
    email: str
    password: str
