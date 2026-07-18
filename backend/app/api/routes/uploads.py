import io
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile
from PIL import Image, ImageOps

from app.core.config import settings

router = APIRouter()


@router.get("/disk")
def disk_usage():
    directory = Path(settings.upload_dir)
    directory.mkdir(parents=True, exist_ok=True)
    total, used, free = shutil.disk_usage(directory)
    files = list(directory.glob("*"))
    return {
        "path": str(directory.resolve()),
        "total_mb": round(total / 1024 / 1024, 1),
        "used_mb": round(used / 1024 / 1024, 1),
        "free_mb": round(free / 1024 / 1024, 1),
        "files": len(files),
        "files_mb": round(sum(f.stat().st_size for f in files if f.is_file()) / 1024 / 1024, 1),
    }

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_BYTES = 25 * 1024 * 1024
MAX_SIDE = 1400  # lado maior; fotos de etiquetas não precisam de mais
JPEG_QUALITY = 82
# Fotos de telemóvel/etiqueta são grandes mas não gigantescas; trava decompression bombs.
Image.MAX_IMAGE_PIXELS = 60_000_000


def to_rgb(image: Image.Image) -> Image.Image:
    """Converte qualquer modo para RGB, compondo transparências sobre fundo branco."""
    if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
        image = image.convert("RGBA")
        background = Image.new("RGBA", image.size, (255, 255, 255, 255))
        return Image.alpha_composite(background, image).convert("RGB")
    return image.convert("RGB")


@router.post("", status_code=201)
async def upload_image(file: UploadFile):
    if (file.content_type or "") not in ALLOWED_TYPES:
        raise HTTPException(status_code=422, detail="Apenas imagens JPG, PNG, WEBP ou GIF.")
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Imagem demasiado grande (máximo 25 MB).")

    # Valida pelo conteúdo real, corrige orientação EXIF, redimensiona e regrava como JPEG.
    # Qualquer falha de processamento vira 422 (nunca 500).
    try:
        image = Image.open(io.BytesIO(content))
        image = ImageOps.exif_transpose(image)
        image = to_rgb(image)
        image.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    except Exception:
        raise HTTPException(status_code=422, detail="Ficheiro de imagem inválido ou corrompido.")

    directory = Path(settings.upload_dir)
    directory.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}.jpg"
    try:
        (directory / name).write_bytes(buffer.getvalue())
    except OSError as exc:
        # Disco cheio (ENOSPC) ou outro erro de escrita — mensagem clara em vez de 500.
        raise HTTPException(status_code=507, detail=f"Sem espaço no disco de imagens: {exc}")
    base = settings.public_url.strip().rstrip("/")
    return {"url": f"{base}/uploads/{name}"}
