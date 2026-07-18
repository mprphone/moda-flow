from datetime import date

from app.core.security import hash_password
from app.models.client import Client
from app.models.shopping import ShoppingPurchase
from app.models.user import User


def auth(client, db_session):
    db_session.add(User(name="Isabel", email="isabel@example.com", password_hash=hash_password("IsabelPass123!")))
    db_session.commit()
    r = client.post("/api/auth/login", json={"email": "isabel@example.com", "password": "IsabelPass123!"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_reports_summary(client, db_session):
    headers = auth(client, db_session)
    db_session.add(Client(name="Zara"))
    db_session.commit()
    client_id = db_session.query(Client).first().id

    today = date.today()
    start = today.replace(day=1).isoformat()
    end = today.isoformat()

    # cria dados no período: desenvolvimento, produção, malha, shopping
    dev_id = client.post("/api/developments", json={"code": "RP_001", "title": "Top", "client_id": client_id, "owner_name": "Isabel"}, headers=headers).json()["id"]
    client.post("/api/productions", json={"title": "Top prod", "client_id": client_id, "quantity": 250}, headers=headers)
    client.post("/api/fabric-requests", json={"reference": "MAL 1", "development_id": dev_id}, headers=headers)
    db_session.add(ShoppingPurchase(brand="Zara", amount=39.95, purchase_date=today))
    db_session.commit()

    summary = client.get(f"/api/reports/summary?start={start}&end={end}", headers=headers)
    assert summary.status_code == 200
    body = summary.json()
    assert body["developments"]["total"] == 1
    assert body["productions"]["total"] == 1
    assert body["productions"]["quantity"] == 250
    assert body["fabrics"]["total"] == 1
    assert body["shopping"]["total"] == 1
    assert body["shopping"]["amount"] == 39.95
    assert any(c["name"] == "Zara" for c in body["developments"]["by_client"])


def test_reports_empty_period(client, db_session):
    headers = auth(client, db_session)
    summary = client.get("/api/reports/summary?start=2020-01-01&end=2020-01-31", headers=headers)
    assert summary.status_code == 200
    assert summary.json()["developments"]["total"] == 0
    assert summary.json()["shopping"]["amount"] == 0
