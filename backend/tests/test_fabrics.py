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

    # apagar um desenvolvimento com malhas associadas desliga-as em vez de falhar
    other = client.post("/api/fabric-requests", json={"reference": "OUTRA REF", "development_id": dev_id}, headers=headers).json()
    assert client.delete(f"/api/developments/{dev_id}", headers=headers).status_code == 204
    remaining = client.get("/api/fabric-requests", headers=headers).json()["items"]
    assert any(i["id"] == other["id"] and i["development_id"] is None for i in remaining)

    deleted = client.delete(f"/api/fabric-requests/{body['id']}", headers=headers)
    assert deleted.status_code == 204


def test_fabric_labels(client, db_session):
    headers = auth(client, db_session)
    label = client.post("/api/labels", json={"name": "Resposta pendente", "tone": "yellow", "scope": "fabric"}, headers=headers)
    assert label.status_code == 201
    label_id = label.json()["id"]

    # a etiqueta de malha não aparece na lista de etiquetas de desenvolvimento
    dev_labels = client.get("/api/labels?scope=development", headers=headers).json()
    assert all(item["id"] != label_id for item in dev_labels)
    fabric_labels = client.get("/api/labels?scope=fabric", headers=headers).json()
    assert any(item["id"] == label_id for item in fabric_labels)

    created = client.post("/api/fabric-requests", json={"reference": "REF 1", "label_ids": [label_id]}, headers=headers)
    assert created.status_code == 201
    assert created.json()["labels"][0]["name"] == "Resposta pendente"

    cleared = client.patch(f"/api/fabric-requests/{created.json()['id']}", json={"label_ids": []}, headers=headers)
    assert cleared.json()["labels"] == []


def test_one_fabric_can_be_linked_to_multiple_developments(client, db_session):
    headers = auth(client, db_session)
    db_session.add(Client(name="Brownie"))
    db_session.commit()
    client_id = db_session.query(Client).first().id
    dev_ids = [client.post("/api/developments", json={
        "code": code, "title": code, "client_id": client_id, "owner_name": "Isabel",
    }, headers=headers).json()["id"] for code in ("IF_B003_024", "IF_B003_025")]
    fabric = client.post("/api/fabric-requests", json={"reference": "Jersey comum"}, headers=headers).json()

    for dev_id in dev_ids:
        response = client.post(f"/api/fabric-requests/{fabric['id']}/developments", json={
            "development_id": dev_id, "relation_type": "approved",
        }, headers=headers)
        assert response.status_code == 201

    linked = client.get("/api/fabric-requests", headers=headers).json()["items"][0]
    assert {item["code"] for item in linked["developments"]} == {"IF_B003_024", "IF_B003_025"}
    assert all(item["relation_type"] == "approved" for item in linked["developments"])
