import io
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import settings

router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_BYTES = 20 * 1024 * 1024
MAX_SIDE = 1400  # lado maior; fotos de etiquetas não precisam de mais
JPEG_QUALITY = 82


@router.post("", status_code=201)
async def upload_image(file: UploadFile):
    if (file.content_type or "") not in ALLOWED_TYPES:
        raise HTTPException(status_code=422, detail="Apenas imagens JPG, PNG, WEBP ou GIF.")
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Imagem demasiado grande (máximo 20 MB).")

    # Valida pelo conteúdo real, corrige orientação EXIF, redimensiona e regrava como JPEG.
    try:
        image = Image.open(io.BytesIO(content))
        image = ImageOps.exif_transpose(image)
        if image.mode not in ("RGB", "L"):
            background = Image.new("RGB", image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[-1] if image.mode in ("RGBA", "LA", "P") else None)
            image = background
        image.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(status_code=422, detail="Ficheiro de imagem inválido ou corrompido.")

    directory = Path(settings.upload_dir)
    directory.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}.jpg"
    (directory / name).write_bytes(buffer.getvalue())
    base = settings.public_url.strip().rstrip("/")
    return {"url": f"{base}/uploads/{name}"}
