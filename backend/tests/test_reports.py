from datetime import date

from app.core.security import hash_password
from app.models.client import Client
from app.models.development import Development
from app.models.production import Production
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


def test_reports_use_trello_source_dates_without_changing_import_date(client, db_session):
    headers = auth(client, db_session)
    db_session.add(Client(name="Brownie"))
    db_session.commit()
    client_id = db_session.query(Client).first().id
    dev_id = client.post(
        "/api/developments",
        json={"code": "JF_B001_001", "title": "Casaco", "client_id": client_id, "owner_name": "Joana"},
        headers=headers,
    ).json()["id"]
    production_id = client.post(
        "/api/productions",
        json={"title": "JF_B001_001 produção", "client_id": client_id, "quantity": 100},
        headers=headers,
    ).json()["id"]
    imported_at = db_session.get(Development, dev_id).created_at

    sync = client.post(
        "/api/reports/trello-source-dates",
        json={"items": [
            {
                "entity": "development", "record_id": dev_id,
                "trello_card_id": "5f1000000000000000000001", "source_created_at": "2020-07-12T09:30:00",
            },
            {
                "entity": "production", "record_id": production_id,
                "trello_card_id": "5f1000000000000000000002", "source_created_at": "2020-07-14T15:00:00",
            },
        ]},
        headers=headers,
    )
    assert sync.status_code == 200
    assert sync.json()["updated"] == {"development": 1, "production": 1, "fabric": 0, "shopping": 0}

    historical = client.get(
        "/api/reports/summary?start=2020-07-01&end=2020-07-31", headers=headers,
    ).json()
    assert historical["developments"]["total"] == 1
    assert historical["productions"]["total"] == 1
    assert db_session.get(Development, dev_id).created_at == imported_at
    assert db_session.get(Production, production_id).source_created_at.date() == date(2020, 7, 14)
