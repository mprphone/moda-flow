from app.core.security import hash_password
from app.models.user import User


def make_admin(db_session):
    user = User(name="Isabel Fernandes", email="admin@example.com", password_hash=hash_password("AdminPass123!"), role="admin")
    db_session.add(user)
    db_session.commit()
    return user


def login(client, email, password):
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_admin_creates_designer_and_designer_logs_in(client, db_session):
    make_admin(db_session)
    admin = login(client, "admin@example.com", "AdminPass123!")

    created = client.post("/api/users", json={
        "name": "Joana Ferreira", "email": "Joana@Example.com", "password": "JoanaPass123!",
    }, headers=admin)
    assert created.status_code == 201, created.text
    assert created.json()["email"] == "joana@example.com"
    assert created.json()["role"] == "designer"

    designer = login(client, "joana@example.com", "JoanaPass123!")
    team = client.get("/api/users", headers=designer)
    assert team.status_code == 200
    assert len(team.json()) == 2


def test_designer_cannot_create_users(client, db_session):
    make_admin(db_session)
    admin = login(client, "admin@example.com", "AdminPass123!")
    client.post("/api/users", json={"name": "Ana", "email": "ana@example.com", "password": "AnaPass1234!"}, headers=admin)
    designer = login(client, "ana@example.com", "AnaPass1234!")

    denied = client.post("/api/users", json={"name": "X", "email": "x@example.com", "password": "XPass12345!"}, headers=designer)
    assert denied.status_code == 403


def test_duplicate_email_rejected(client, db_session):
    make_admin(db_session)
    admin = login(client, "admin@example.com", "AdminPass123!")
    duplicate = client.post("/api/users", json={"name": "Outra", "email": "ADMIN@example.com", "password": "OutraPass123!"}, headers=admin)
    assert duplicate.status_code == 409


def test_deactivated_user_cannot_login(client, db_session):
    make_admin(db_session)
    admin = login(client, "admin@example.com", "AdminPass123!")
    user_id = client.post("/api/users", json={"name": "Rita", "email": "rita@example.com", "password": "RitaPass123!"}, headers=admin).json()["id"]

    client.patch(f"/api/users/{user_id}", json={"is_active": False}, headers=admin)
    blocked = client.post("/api/auth/login", json={"email": "rita@example.com", "password": "RitaPass123!"})
    assert blocked.status_code == 401


def test_change_own_password(client, db_session):
    make_admin(db_session)
    headers = login(client, "admin@example.com", "AdminPass123!")
    wrong = client.post("/api/users/me/password", json={"current_password": "errada", "new_password": "NovaPass1234!"}, headers=headers)
    assert wrong.status_code == 401
    ok = client.post("/api/users/me/password", json={"current_password": "AdminPass123!", "new_password": "NovaPass1234!"}, headers=headers)
    assert ok.status_code == 200
    login(client, "admin@example.com", "NovaPass1234!")


def test_create_client_and_supplier_with_duplicates(client, db_session):
    make_admin(db_session)
    headers = login(client, "admin@example.com", "AdminPass123!")
    assert client.post("/api/clients", json={"name": "Mango"}, headers=headers).status_code == 201
    assert client.post("/api/clients", json={"name": "mango"}, headers=headers).status_code == 409
    assert client.post("/api/suppliers", json={"name": "Malhas Norte", "category": "malhas"}, headers=headers).status_code == 201
    assert client.post("/api/suppliers", json={"name": "MALHAS NORTE"}, headers=headers).status_code == 409
