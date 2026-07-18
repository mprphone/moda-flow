import base64
import json
from pathlib import Path

import httpx
from fastapi import HTTPException

from app.core.config import settings


SCHEMA = {
    "type": "object",
    "properties": {
        "brand": {"type": ["string", "null"]},
        "reference": {"type": ["string", "null"]},
        "amount": {"type": ["number", "null"]},
        "purchase_date": {"type": ["string", "null"], "description": "YYYY-MM-DD"},
        "invoice_number": {"type": ["string", "null"]},
        "description": {"type": ["string", "null"]},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
    },
    "required": ["brand", "reference", "amount", "purchase_date", "invoice_number", "description", "confidence"],
    "additionalProperties": False,
}


def local_file_input(file_url: str) -> tuple[str, str | None]:
    public = settings.public_url.rstrip("/") + "/uploads/"
    if file_url.startswith(public):
        name = Path(file_url.removeprefix(public)).name
        path = Path(settings.upload_dir) / name
        if path.is_file():
            encoded = base64.b64encode(path.read_bytes()).decode()
            mime = "application/pdf" if path.suffix.lower() == ".pdf" else "image/jpeg"
            return f"data:{mime};base64,{encoded}", name
    return file_url, None


def read_shopping_photo(image_url: str) -> dict:
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="Leitura automática não configurada. Adicione OPENAI_API_KEY no Railway.")
    file_input, filename = local_file_input(image_url)
    attachment = (
        ({"type": "input_file", "filename": filename, "file_data": file_input} if filename else {"type": "input_file", "file_url": file_input})
        if image_url.lower().split("?", 1)[0].endswith(".pdf")
        else {"type": "input_image", "image_url": file_input, "detail": "high"}
    )
    payload = {
        "model": settings.openai_vision_model,
        "input": [{"role": "user", "content": [
            {"type": "input_text", "text": "Lê esta fotografia ou PDF de uma peça, etiqueta, talão ou fatura de moda. Extrai apenas dados visíveis. Não inventes campos ilegíveis. O valor é o total pago pela peça."},
            attachment,
        ]}],
        "text": {"format": {"type": "json_schema", "name": "shopping_photo", "strict": True, "schema": SCHEMA}},
    }
    try:
        response = httpx.post(
            "https://api.openai.com/v1/responses", json=payload,
            headers={"Authorization": f"Bearer {settings.openai_api_key}"}, timeout=45,
        )
        response.raise_for_status()
        body = response.json()
        text = next(
            part["text"] for output in body.get("output", []) if output.get("type") == "message"
            for part in output.get("content", []) if part.get("type") == "output_text"
        )
        return json.loads(text)
    except (httpx.HTTPError, KeyError, StopIteration, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail=f"Não foi possível ler a fotografia: {exc}") from exc
