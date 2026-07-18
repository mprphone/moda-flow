from app.core.security import hash_password
from app.models.client import Client
from app.models.user import User


def auth(client, db_session):
    db_session.add(User(name="Isabel", email="isabel@example.com", password_hash=hash_password("IsabelPass123!")))
    db_session.commit()
    r = client.post("/api/auth/login", json={"email": "isabel@example.com", "password": "IsabelPass123!"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_production_traceability(client, db_session):
    headers = auth(client, db_session)
    db_session.add(Client(name="Brownie"))
    db_session.commit()
    client_id = db_session.query(Client).first().id

    created = client.post("/api/productions", json={"title": "Sweat Ju", "client_id": client_id, "quantity": 500}, headers=headers)
    assert created.status_code == 201
    prod_id = created.json()["id"]

    # detalhe traz a fase inicial no histórico
    detail = client.get(f"/api/productions/{prod_id}", headers=headers).json()
    assert detail["title"] == "Sweat Ju"
    assert len(detail["stage_history"]) == 1
    assert detail["stage_history"][0]["stage"] == "encomenda_recebida"

    # nota antecipada numa fase futura (planeada)
    planned = client.put(f"/api/productions/{prod_id}/stage-notes", json={"stage": "corte", "note": "Cortar em tecido duplo"}, headers=headers)
    assert planned.status_code == 200
    corte = next(e for e in planned.json()["stage_history"] if e["stage"] == "corte")
    assert corte["note"] == "Cortar em tecido duplo"
    assert corte["status"] == "planned"

    # avançar de fase regista o tempo e reaproveita a nota planeada
    client.patch(f"/api/productions/{prod_id}", json={"status": "materiais"}, headers=headers)
    moved = client.patch(f"/api/productions/{prod_id}", json={"status": "corte"}, headers=headers).json()
    corte_active = next(e for e in moved["stage_history"] if e["stage"] == "corte")
    assert corte_active["status"] == "active"
    assert corte_active["note"] == "Cortar em tecido duplo"
    assert moved["status"] == "corte"

    # comentário
    client.post(f"/api/productions/{prod_id}/comments", json={"body": "Materiais em falta", "author": "Isabel"}, headers=headers)
    with_comment = client.get(f"/api/productions/{prod_id}", headers=headers).json()
    assert with_comment["comments"][0]["body"] == "Materiais em falta"

    # notas gerais
    client.patch(f"/api/productions/{prod_id}", json={"description": "Prioridade alta"}, headers=headers)
    assert client.get(f"/api/productions/{prod_id}", headers=headers).json()["description"] == "Prioridade alta"


def test_development_stage_note_upsert(client, db_session):
    headers = auth(client, db_session)
    db_session.add(Client(name="Zara"))
    db_session.commit()
    client_id = db_session.query(Client).first().id
    dev_id = client.post("/api/developments", json={"code": "TR_001", "title": "Top", "client_id": client_id, "owner_name": "Isabel"}, headers=headers).json()["id"]

    # nota numa fase ainda não percorrida
    updated = client.put(f"/api/developments/{dev_id}/stage-notes", json={"stage": "corte", "note": "Aguarda molde"}, headers=headers)
    assert updated.status_code == 200
    corte = next(e for e in updated.json()["stage_history"] if e["stage"] == "corte")
    assert corte["note"] == "Aguarda molde"
