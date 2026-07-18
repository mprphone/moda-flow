from app.core.security import hash_password
from app.models.client import Client
from app.models.user import User


def auth(client, db_session):
    db_session.add(User(name="Isabel Fernandes", email="isabel@example.com", password_hash=hash_password("IsabelPass123!"), initials="IF"))
    db_session.commit()
    r = client.post("/api/auth/login", json={"email": "isabel@example.com", "password": "IsabelPass123!"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_next_reference_sequence(client, db_session):
    headers = auth(client, db_session)
    db_session.add(Client(name="Pull Teen", code="B001"))
    db_session.commit()
    client_id = db_session.query(Client).first().id
    designer_id = db_session.query(User).first().id

    # sem referências ainda -> começa em 1
    first = client.get(f"/api/developments/next-reference?client_id={client_id}&user_id={designer_id}", headers=headers).json()
    assert first["reference"] == "IF_B001_001"

    # cria dois modelos com sequenciais altos e verifica que continua a partir do maior
    client.post("/api/developments", json={"code": "IF_B001_277", "title": "A", "client_id": client_id, "owner_name": "Isabel"}, headers=headers)
    client.post("/api/developments", json={"code": "JF_B001_150", "title": "B", "client_id": client_id, "owner_name": "Joana"}, headers=headers)
    nxt = client.get(f"/api/developments/next-reference?client_id={client_id}&user_id={designer_id}", headers=headers).json()
    assert nxt["reference"] == "IF_B001_278"
    assert nxt["sequence"] == 278


def test_next_reference_requires_client_code(client, db_session):
    headers = auth(client, db_session)
    db_session.add(Client(name="Sem Código"))
    db_session.commit()
    client_id = db_session.query(Client).filter(Client.name == "Sem Código").first().id
    resp = client.get(f"/api/developments/next-reference?client_id={client_id}", headers=headers)
    assert resp.status_code == 422


def test_designer_initials_auto(client, db_session):
    headers = auth(client, db_session)
    created = client.post("/api/users", json={"name": "Beatriz Pinto"}, headers=headers)
    assert created.status_code == 201
    assert created.json()["initials"] == "BP"
