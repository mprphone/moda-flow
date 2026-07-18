from app.core.security import hash_password
from app.models.user import User


def auth(client, db_session):
    db_session.add(User(name="Isabel", email="isabel@example.com", password_hash=hash_password("IsabelPass123!")))
    db_session.commit()
    r = client.post("/api/auth/login", json={"email": "isabel@example.com", "password": "IsabelPass123!"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_client_crm_fields(client, db_session):
    headers = auth(client, db_session)
    created = client.post("/api/clients", json={
        "name": "Bershka", "group_name": "Inditex", "email": "compras@bershka.com",
        "phone": "912345678", "contact_person": "Ana", "segments": "Mulher, Criança",
        "preferred_channel": "whatsapp", "meetings": "Reunião 12/07 — coleção verão",
    }, headers=headers)
    assert created.status_code == 201
    body = created.json()
    assert body["contact_person"] == "Ana"
    assert body["segments"] == "Mulher, Criança"
    assert body["preferred_channel"] == "whatsapp"

    # aparecem na listagem
    listed = client.get("/api/clients", headers=headers).json()
    row = next(c for c in listed if c["name"] == "Bershka")
    assert row["email"] == "compras@bershka.com"
    assert row["meetings"].startswith("Reunião 12/07")

    # editar
    updated = client.patch(f"/api/clients/{body['id']}", json={"contact_person": "Rita", "phone": "911111111"}, headers=headers)
    assert updated.json()["contact_person"] == "Rita"
    assert updated.json()["phone"] == "911111111"


def test_supplier_crm_fields(client, db_session):
    headers = auth(client, db_session)
    created = client.post("/api/suppliers", json={
        "name": "Nice World", "category": "malhas", "email": "geral@nice.pt",
        "contact_person": "João", "preferred_channel": "email", "meetings": "Visita fábrica 03/06", "notes": "Bom em jersey",
    }, headers=headers)
    assert created.status_code == 201
    assert created.json()["contact_person"] == "João"
    assert created.json()["notes"] == "Bom em jersey"

    listed = client.get("/api/suppliers", headers=headers).json()
    row = next(s for s in listed if s["name"] == "Nice World")
    assert row["preferred_channel"] == "email"
