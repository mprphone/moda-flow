import io
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile
from PIL import Image, ImageOps

from app.core.config import settings

router = APIRouter()
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
PDF_TYPE = "application/pdf"
MAX_BYTES = 25 * 1024 * 1024
MAX_SIDE = 1400
JPEG_QUALITY = 82
Image.MAX_IMAGE_PIXELS = 60_000_000


def to_rgb(image: Image.Image) -> Image.Image:
    if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
        image = image.convert("RGBA")
        return Image.alpha_composite(Image.new("RGBA", image.size, (255, 255, 255, 255)), image).convert("RGB")
    return image.convert("RGB")


@router.get("/disk")
def disk_usage():
    directory = Path(settings.upload_dir)
    directory.mkdir(parents=True, exist_ok=True)
    total, used, free = shutil.disk_usage(directory)
    files = list(directory.glob("*"))
    return {"path": str(directory.resolve()), "total_mb": round(total / 1024 / 1024, 1), "used_mb": round(used / 1024 / 1024, 1), "free_mb": round(free / 1024 / 1024, 1), "files": len(files), "files_mb": round(sum(f.stat().st_size for f in files if f.is_file()) / 1024 / 1024, 1)}


@router.post("/recompress")
def recompress_existing():
    directory = Path(settings.upload_dir)
    done = skipped = freed = 0
    for path in directory.glob("*"):
        if not path.is_file() or path.suffix.lower() == ".pdf":
            continue
        try:
            raw = path.read_bytes(); before = len(raw)
            image = to_rgb(ImageOps.exif_transpose(Image.open(io.BytesIO(raw))))
            image.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
            buffer = io.BytesIO(); image.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
            out = buffer.getvalue()
            if len(out) < before - 4096:
                path.write_bytes(out); freed += before - len(out); done += 1
            else: skipped += 1
        except Exception: skipped += 1
    return {"recompressed": done, "skipped": skipped, "freed_mb": round(freed / 1024 / 1024, 1)}


@router.post("", status_code=201)
async def upload_image(file: UploadFile):
    content_type = file.content_type or ""
    if content_type not in ALLOWED_TYPES | {PDF_TYPE}:
        raise HTTPException(status_code=422, detail="Apenas imagens JPG, PNG, WEBP, GIF ou PDF.")
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Ficheiro demasiado grande (máximo 25 MB).")
    directory = Path(settings.upload_dir); directory.mkdir(parents=True, exist_ok=True)
    base = settings.public_url.strip().rstrip("/")
    if content_type == PDF_TYPE:
        if not content.startswith(b"%PDF-"):
            raise HTTPException(status_code=422, detail="PDF inválido ou corrompido.")
        name = f"{uuid.uuid4().hex}.pdf"; output = content
    else:
        try:
            image = to_rgb(ImageOps.exif_transpose(Image.open(io.BytesIO(content))))
            image.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
            buffer = io.BytesIO(); image.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
            output = buffer.getvalue(); name = f"{uuid.uuid4().hex}.jpg"
        except Exception as exc:
            raise HTTPException(status_code=422, detail="Ficheiro de imagem inválido ou corrompido.") from exc
    try: (directory / name).write_bytes(output)
    except OSError as exc: raise HTTPException(status_code=507, detail=f"Sem espaço no disco de anexos: {exc}") from exc
    mime_type = PDF_TYPE if content_type == PDF_TYPE else "image/jpeg"
    return {"url": f"{base}/uploads/{name}", "mime_type": mime_type, "name": file.filename or name}
