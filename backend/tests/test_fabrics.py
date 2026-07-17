from datetime import date, timedelta

from app.core.security import hash_password
from app.models.client import Client
from app.models.supplier import Supplier
from app.models.user import User


def auth(client, db_session):
    db_session.add(User(name="Isabel", email="isabel@example.com", password_hash=hash_password("IsabelPass123!")))
    db_session.commit()
    response = client.post("/api/auth/login", json={"email": "isabel@example.com", "password": "IsabelPass123!"})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_fabric_request_lifecycle(client, db_session):
    headers = auth(client, db_session)
    db_session.add_all([Client(name="Zara"), Supplier(name="Nice World", category="malhas")])
    db_session.commit()
    client_id = db_session.query(Client).first().id
    supplier_id = db_session.query(Supplier).first().id

    dev_id = client.post("/api/developments", json={
        "code": "JF_B001_246", "title": "Riscas vermelhas", "client_id": client_id, "owner_name": "Joana Ferreira",
    }, headers=headers).json()["id"]

    created = client.post("/api/fabric-requests", json={
        "reference": "NWJ 7986/B", "article": "JERSEY", "composition": "CO/PES", "grammage": "190", "width": "1.50",
        "color": "cor de cartaz", "quantity_meters": 4, "supplier_id": supplier_id, "development_id": dev_id,
        "requested_at": str(date.today() - timedelta(days=6)),
        "notes": "pedido por whatsapp",
    }, headers=headers)
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["supplier_name"] == "Nice World"
    assert body["development_code"] == "JF_B001_246"
    assert body["days_pending"] == 6
    assert body["needs_reminder"] is True

    # aparece dentro do detalhe do desenvolvimento (sequência malha -> desenvolvimento)
    detail = client.get(f"/api/developments/{dev_id}", headers=headers).json()
    assert len(detail["fabric_requests"]) == 1
    assert detail["fabric_requests"][0]["reference"] == "NWJ 7986/B"

    # ao receber, a data de receção é registada automaticamente
    received = client.patch(f"/api/fabric-requests/{body['id']}", json={"status": "recebida"}, headers=headers)
    assert received.status_code == 200
    assert received.json()["received_at"] == str(date.today())
    assert received.json()["days_pending"] is None
    assert received.json()["days_to_receive"] == 6

    invalid = client.patch(f"/api/fabric-requests/{body['id']}", json={"status": "inexistente"}, headers=headers)
    assert invalid.status_code == 422

    deleted = client.delete(f"/api/fabric-requests/{body['id']}", headers=headers)
    assert deleted.status_code == 204
