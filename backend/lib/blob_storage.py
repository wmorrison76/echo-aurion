"""iter219 · Blob storage abstraction with pre-signed URL contract.

Callers DO NOT embed base64 blobs in domain documents anymore. They call
`store_blob(kind, data, content_type)` which returns a stable URL. Consumers
then `GET` that URL to read it.

Backends (priority order, first-available wins):
    1. S3        — when AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_S3_BUCKET
                   all present. Writes with `put_object`, reads via `generate_presigned_url`.
    2. Local FS  — default dev fallback. Stores under /app/backend/uploads/.
                   Served by GET /api/blob/{blob_id}. URL is still opaque to
                   callers so swapping to S3 later is zero-code on the caller side.

Adopted incrementally: photo_intake + audit_queue can call `store_blob()` for
their image payloads, keep `media_base64` on the wire for backwards compat,
and persist only the returned URL in the domain doc (no more bloated base64
strings sitting in MongoDB).
"""
from __future__ import annotations
import base64
import os
import uuid
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

router = APIRouter(prefix="/api/blob", tags=["blob"])


# ── Environment detection ───────────────────────────────────────────────
_S3_BUCKET = os.getenv("AWS_S3_BUCKET")
_AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
_HAS_S3 = bool(_S3_BUCKET and os.getenv("AWS_ACCESS_KEY_ID")
                and os.getenv("AWS_SECRET_ACCESS_KEY"))

_LOCAL_ROOT = Path(os.getenv("BLOB_LOCAL_ROOT", "/app/backend/uploads"))
_LOCAL_ROOT.mkdir(parents=True, exist_ok=True)


def _backend() -> str:
    return "s3" if _HAS_S3 else "local"


# ── Write path ──────────────────────────────────────────────────────────
def store_blob(kind: str, data: bytes, content_type: str = "image/jpeg",
               blob_id: Optional[str] = None) -> Dict[str, Any]:
    """Persist a blob and return an opaque URL. `kind` is a logical category
    (e.g. "photo_intake", "audit_crop") used only for organisation."""
    if not data:
        raise ValueError("store_blob: empty data")
    bid = blob_id or f"blob-{uuid.uuid4().hex[:16]}"
    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}.get(content_type, "bin")
    key = f"{kind}/{bid}.{ext}"

    if _HAS_S3:
        try:
            import boto3   # type: ignore
            s3 = boto3.client("s3", region_name=_AWS_REGION)
            s3.put_object(Bucket=_S3_BUCKET, Key=key, Body=data,
                           ContentType=content_type)
            url = s3.generate_presigned_url(
                "get_object", Params={"Bucket": _S3_BUCKET, "Key": key},
                ExpiresIn=3600 * 24 * 7)  # 7-day pre-signed GET
            return {"blob_id": bid, "url": url, "backend": "s3",
                    "content_type": content_type, "size_bytes": len(data),
                    "key": key}
        except Exception as e:
            # Fall through to local if S3 fails — never break the caller
            import logging
            logging.getLogger("blob_storage").warning(
                "[blob_storage] S3 put failed (%s); falling back to local", e)

    # Local backend
    dir_path = _LOCAL_ROOT / kind
    dir_path.mkdir(parents=True, exist_ok=True)
    path = dir_path / f"{bid}.{ext}"
    path.write_bytes(data)
    url = f"/api/blob/{kind}/{bid}.{ext}"
    return {"blob_id": bid, "url": url, "backend": "local",
            "content_type": content_type, "size_bytes": len(data),
            "key": key}


def store_blob_from_base64(kind: str, b64: str,
                            content_type: str = "image/jpeg") -> Dict[str, Any]:
    """Convenience when caller has a base64 string (possibly data-URL prefixed)."""
    raw_b64 = b64
    if raw_b64.startswith("data:") and "," in raw_b64:
        header, raw_b64 = raw_b64.split(",", 1)
        if ";" in header and "/" in header:
            content_type = header.split(":", 1)[1].split(";", 1)[0]
    try:
        data = base64.b64decode(raw_b64, validate=False)
    except Exception as e:
        raise ValueError(f"invalid base64: {e}")
    return store_blob(kind, data, content_type=content_type)


# ── Read path (local backend only — S3 URLs are served by AWS directly) ─
def _resolve_local(kind: str, filename: str) -> Path:
    # Defence in depth: strict kind + filename, no traversal
    if "/" in filename or ".." in filename or ".." in kind:
        raise HTTPException(400, "invalid blob path")
    p = _LOCAL_ROOT / kind / filename
    if not p.is_file():
        raise HTTPException(404, "blob not found")
    return p


@router.get("/{kind}/{filename}")
def read_blob(kind: str, filename: str):
    """Local-backend blob reader. S3-backed URLs bypass this route entirely."""
    path = _resolve_local(kind, filename)
    data = path.read_bytes()
    ext = path.suffix.lower().lstrip(".")
    ct = {"jpg": "image/jpeg", "jpeg": "image/jpeg",
          "png": "image/png", "webp": "image/webp"}.get(ext, "application/octet-stream")
    return Response(content=data, media_type=ct,
                     headers={"Cache-Control": "private, max-age=86400"})


@router.get("/health")
def blob_health():
    return {"ok": True, "backend": _backend(),
            "local_root": str(_LOCAL_ROOT),
            "s3_bucket": _S3_BUCKET if _HAS_S3 else None,
            "region": _AWS_REGION if _HAS_S3 else None}
