import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile

from app.core.config import settings

router = APIRouter()

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
MAX_BYTES = 15 * 1024 * 1024


@router.post("", status_code=201)
async def upload_image(file: UploadFile):
    extension = ALLOWED_TYPES.get(file.content_type or "")
    if not extension:
        raise HTTPException(status_code=422, detail="Apenas imagens JPG, PNG, WEBP ou GIF.")
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Imagem demasiado grande (máximo 15 MB).")
    directory = Path(settings.upload_dir)
    directory.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{extension}"
    (directory / name).write_bytes(content)
    return {"url": f"{settings.public_url.rstrip('/')}/uploads/{name}"}
