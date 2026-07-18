from datetime import date
import io
from PIL import Image

from app.core.security import hash_password
from app.models.user import User


def auth(client, db_session):
    db_session.add(User(name="Isabel", email="isabel@example.com", password_hash=hash_password("IsabelPass123!")))
    db_session.commit()
    response = client.post("/api/auth/login", json={"email": "isabel@example.com", "password": "IsabelPass123!"})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_shopping_document_workflow(client, db_session):
    headers = auth(client, db_session)
    created = client.post("/api/shopping", json={
        "brand": "Pull&Bear", "reference": "3540308637", "amount": 29.99,
        "purchase_date": str(date.today()), "invoice_number": "A9405_9183",
        "cover_url": "https://example.com/peca.jpg", "notes": "Camisola rosa",
    }, headers=headers)
    assert created.status_code == 201, created.text
    purchase_id = created.json()["id"]
    assert created.json()["invoice_sent"] is False

    updated = client.patch(f"/api/shopping/{purchase_id}", json={
        "status": "refund_pending", "invoice_sent": True, "credit_note_sent": True,
        "credit_note_number": "NC-123", "refund_received": False,
    }, headers=headers)
    assert updated.status_code == 200
    assert updated.json()["invoice_sent"] is True
    assert updated.json()["credit_note_sent"] is True
    assert updated.json()["credit_note_number"] == "NC-123"

    invalid = client.patch(f"/api/shopping/{purchase_id}", json={"status": "inexistente"}, headers=headers)
    assert invalid.status_code == 422


def test_shopping_photo_reader_reports_missing_configuration(client, db_session):
    headers = auth(client, db_session)
    response = client.post("/api/shopping/read-photo", json={"image_url": "https://example.com/receipt.jpg"}, headers=headers)
    assert response.status_code == 503
    assert "OPENAI_API_KEY" in response.json()["detail"]


def test_qr_upload_accepts_photo_and_returns_it_to_authenticated_session(client, db_session):
    headers = auth(client, db_session)
    created = client.post("/api/qr-uploads", json={}, headers=headers)
    assert created.status_code == 201
    token = created.json()["token"]

    buffer = io.BytesIO()
    Image.new("RGB", (80, 80), "pink").save(buffer, format="JPEG")
    sent = client.post(
        f"/api/public/qr-uploads/{token}",
        files={"file": ("peca.jpg", buffer.getvalue(), "image/jpeg")},
    )
    assert sent.status_code == 201, sent.text
    status = client.get(f"/api/qr-uploads/{token}", headers=headers).json()
    assert status["status"] == "received"
    assert status["mime_type"] == "image/jpeg"
    assert status["file_url"].endswith(".jpg")
