from app.core.security import hash_password
from app.models.client import Client
from app.models.user import User


def make_user(db_session):
    user = User(name="Isabel Fernandes", email="isabel.fernandes@cunharibeiro.com", password_hash=hash_password("TestePass123!"))
    db_session.add(user)
    db_session.commit()
    return user


def login(client, email="isabel.fernandes@cunharibeiro.com", password="TestePass123!"):
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_login_and_me(client, db_session):
    make_user(db_session)
    headers = login(client)
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["email"] == "isabel.fernandes@cunharibeiro.com"


def test_login_wrong_password(client, db_session):
    make_user(db_session)
    response = client.post("/api/auth/login", json={"email": "isabel.fernandes@cunharibeiro.com", "password": "errada"})
    assert response.status_code == 401


def test_protected_routes_require_token(client):
    assert client.get("/api/developments").status_code == 401
    assert client.get("/api/dashboard").status_code == 401


def test_development_lifecycle(client, db_session):
    make_user(db_session)
    headers = login(client)
    db_session.add(Client(name="Zara"))
    db_session.commit()
    client_id = db_session.query(Client).first().id

    created = client.post("/api/developments", json={
        "code": "TEST_001", "title": "Malha teste", "client_id": client_id, "owner_name": "Isabel Fernandes",
    }, headers=headers)
    assert created.status_code == 201, created.text
    dev_id = created.json()["id"]
    assert created.json()["current_stage"] == "novo"

    moved = client.post(f"/api/developments/{dev_id}/move", json={"to_stage": "ficha_tecnica"}, headers=headers)
    assert moved.status_code == 200
    assert moved.json()["current_stage"] == "ficha_tecnica"

    noted = client.patch(f"/api/developments/{dev_id}", json={"description": "Malha 100% algodão, gramagem 180"}, headers=headers)
    assert noted.status_code == 200
    assert noted.json()["description"] == "Malha 100% algodão, gramagem 180"

    detail = client.get(f"/api/developments/{dev_id}", headers=headers)
    assert detail.status_code == 200
    body = detail.json()
    assert len(body["stage_history"]) == 2
    assert body["stage_history"][0]["status"] == "completed"
    assert body["estimated_completion"] is not None

    # editar a nota de uma fase (o que foi feito / problemas)
    first_event = body["stage_history"][0]
    noted_stage = client.patch(f"/api/developments/{dev_id}/stages/{first_event['id']}", json={"note": "Malha confirmada, sem problemas"}, headers=headers)
    assert noted_stage.status_code == 200
    updated_event = next(e for e in noted_stage.json()["stage_history"] if e["id"] == first_event["id"])
    assert updated_event["note"] == "Malha confirmada, sem problemas"

    invalid = client.post(f"/api/developments/{dev_id}/move", json={"to_stage": "inexistente"}, headers=headers)
    assert invalid.status_code == 422

    deleted = client.delete(f"/api/developments/{dev_id}", headers=headers)
    assert deleted.status_code == 204
    assert client.get(f"/api/developments/{dev_id}", headers=headers).status_code == 404


def test_move_preserves_waiting_reason_in_history(client, db_session):
    make_user(db_session)
    headers = login(client)
    db_session.add(Client(name="H&M"))
    db_session.commit()
    client_id = db_session.query(Client).first().id

    dev_id = client.post("/api/developments", json={
        "code": "TEST_002", "title": "Twinset", "client_id": client_id, "owner_name": "Isabel Fernandes",
    }, headers=headers).json()["id"]

    blocked = client.patch(f"/api/developments/{dev_id}", json={"status": "blocked", "waiting_reason": "Falta validar medidas"}, headers=headers)
    assert blocked.status_code == 200

    client.post(f"/api/developments/{dev_id}/move", json={"to_stage": "modelagem"}, headers=headers)
    history = client.get(f"/api/developments/{dev_id}", headers=headers).json()["stage_history"]
    closed = [event for event in history if event["status"] == "completed"]
    assert any(event["note"] and "Falta validar medidas" in event["note"] for event in closed)


def test_proposal_flow_approve_and_reject(client, db_session):
    make_user(db_session)
    headers = login(client)
    db_session.add(Client(name="Mango"))
    db_session.commit()
    client_id = db_session.query(Client).first().id

    # proposta aprovada: desenho -> proposta -> amostra fisica
    dev_id = client.post("/api/developments", json={
        "code": "PROP_001", "title": "Vestido linho", "client_id": client_id, "owner_name": "Isabel Fernandes",
    }, headers=headers).json()["id"]
    assert client.post(f"/api/developments/{dev_id}/move", json={"to_stage": "proposta_cliente"}, headers=headers).json()["current_stage"] == "proposta_cliente"
    approved = client.post(f"/api/developments/{dev_id}/move", json={"to_stage": "ficha_tecnica"}, headers=headers).json()
    assert approved["current_stage"] == "ficha_tecnica"
    assert approved["status"] == "active"

    # proposta reprovada: sai do quadro e nao aparece nas prioridades do dia
    rej_id = client.post("/api/developments", json={
        "code": "PROP_002", "title": "Casaco oversize", "client_id": client_id, "owner_name": "Isabel Fernandes",
    }, headers=headers).json()["id"]
    rejected = client.patch(f"/api/developments/{rej_id}", json={"status": "rejected", "waiting_reason": "Cliente não gostou da gola"}, headers=headers)
    assert rejected.status_code == 200
    dashboard = client.get("/api/dashboard", headers=headers).json()
    assert all(item["id"] != rej_id for item in dashboard["priorities"])


def test_labels_assignment(client, db_session):
    make_user(db_session)
    headers = login(client)
    db_session.add(Client(name="Bershka"))
    db_session.commit()
    client_id = db_session.query(Client).first().id

    label = client.post("/api/labels", json={"name": "Urgente", "tone": "pink"}, headers=headers)
    assert label.status_code == 201
    dev_id = client.post("/api/developments", json={
        "code": "TEST_003", "title": "Saia", "client_id": client_id, "owner_name": "Isabel Fernandes",
    }, headers=headers).json()["id"]

    updated = client.patch(f"/api/developments/{dev_id}", json={"label_ids": [label.json()["id"]]}, headers=headers)
    assert updated.status_code == 200
    assert updated.json()["labels"][0]["name"] == "Urgente"


def test_parallel_tasks_and_structured_assignees(client, db_session):
    owner = make_user(db_session)
    partner = User(name="Joana Ferreira", email="joana@example.com", password_hash=hash_password("TestePass123!"))
    db_session.add_all([partner, Client(name="Brownie")])
    db_session.commit()
    headers = login(client)
    client_id = db_session.query(Client).first().id

    created = client.post("/api/developments", json={
        "code": "PAR_001", "title": "Top em parceria", "client_id": client_id, "owner_name": owner.name,
    }, headers=headers)
    assert created.status_code == 201, created.text
    dev_id = created.json()["id"]
    assert created.json()["assignees"][0]["role"] == "principal"

    assigned = client.post(f"/api/developments/{dev_id}/assignees", json={
        "user_id": partner.id, "role": "qualidade",
    }, headers=headers)
    assert assigned.status_code == 201, assigned.text
    assert {item["name"] for item in assigned.json()["assignees"]} == {owner.name, partner.name}

    fabric = client.post(f"/api/developments/{dev_id}/tasks", json={
        "kind": "malha", "status": "waiting", "note": "Aguardar rolo", "responsible_user_id": partner.id,
    }, headers=headers)
    assert fabric.status_code == 201, fabric.text
    accessories = client.post(f"/api/developments/{dev_id}/tasks", json={
        "kind": "acessorios", "note": "Escolher botões",
    }, headers=headers)
    assert accessories.status_code == 201, accessories.text
    assert accessories.json()["open_tasks_count"] == 2

    task_id = next(task["id"] for task in accessories.json()["tasks"] if task["kind"] == "malha")
    completed = client.patch(f"/api/developments/{dev_id}/tasks/{task_id}", json={"status": "done"}, headers=headers)
    assert completed.status_code == 200, completed.text
    assert completed.json()["open_tasks_count"] == 1
    assert next(task for task in completed.json()["tasks"] if task["id"] == task_id)["completed_at"] is not None
