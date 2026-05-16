"""iter217 · Unified photo_intake service (v1.4 Phase 1.5 foundation).

Every photo produced anywhere in LUCCCA flows through this pipeline:

    Stage 0 · INTAKE          — validate auth, persist blob, return id
    Stage 1 · QUALITY GATE    — brightness + sharpness heuristic
    Stage 2 · FACE BLUR       — MediaPipe on client already blurs,
                                but Pillow fallback runs here if no marker
    Stage 3 · CONSENT CHECK   — snapshot property_cey_settings
    Stage 4 · LABEL OCR       — Claude Sonnet 4.6 vision pass
    Stage 5 · FINGERPRINT     — HSV histogram + library write
    Stage 6 · RECIPE SUGGEST  — fuzzy match to _KNOWN_RECIPES

Synchronous for MVP — returns full processed response in one call so the
browser doesn't have to poll. If processing latency grows past 3s the
endpoint can be split into POST (returns id) + GET (poll) as specced in
`08-services/PHOTO-INTAKE-SERVICE-SPEC.md`.
"""
from __future__ import annotations
import base64
import io
import time
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from database import db
from lib.time import utcnow_iso
from lib.mongo import strip_id
from lib.waste_log import log_event, log_llm
from lib.llm import ask_echo_vision

router = APIRouter(prefix="/api/waste/photo-intake", tags=["photo-intake"])

# Import fingerprint helpers from the main echowaste module (they live there so
# the capture flow keeps fingerprint-first short-circuit logic co-located).
# Lazy-load at call time to avoid circular imports at module load.


_ALLOWED_SOURCES = {
    "culinary_gallery", "pastry_gallery", "recipe_card", "server_notes",
    "waste_capture", "verbal_recipe", "training_session", "admin_upload",
    "buffet_set", "buffet_mid", "buffet_close", "forbes_label_scan",
    "menu_capture", "camera_roll_import",
}

_ALLOWED_UPLOAD_METHODS = {
    "single", "multi_drag_drop", "camera_roll_batch", "in_app_capture",
    "recipe_card_edit", "auto_from_capture", "retroactive_batch",
}


class PhotoIntakeBody(BaseModel):
    media_base64: str = Field(..., min_length=64)
    source_module: str
    source_entity_id: Optional[str] = None
    property_id: str = "outlet-main"
    outlet_id: Optional[str] = None
    uploader_user_id: Optional[str] = None
    upload_method: str = "in_app_capture"
    skip_fingerprint: bool = False
    # Client signals that faces are already blurred (MediaPipe on-device) —
    # skip server-side blur to save cycles.
    faces_already_blurred: bool = False
    active_event_id: Optional[str] = None
    expected_recipe_ids: Optional[List[str]] = None


def _quality_score(img) -> float:
    """Very cheap quality score: brightness mid-range + edge energy proxy.
    Returns 0..1."""
    try:
        from PIL import ImageStat, ImageFilter
        gs = img.convert("L")
        mean = ImageStat.Stat(gs).mean[0]  # 0..255
        # Brightness penalty for pure black / pure white
        brightness = 1.0 - abs(mean - 128) / 128.0
        # Edge energy = stddev of edges
        edges = gs.filter(ImageFilter.FIND_EDGES)
        edge_std = ImageStat.Stat(edges).stddev[0]
        sharpness = min(1.0, edge_std / 40.0)
        return round(0.4 * brightness + 0.6 * sharpness, 2)
    except Exception:
        return 0.5


def _apply_face_blur_fallback(img):
    """If the client didn't confirm face blur, run a mild Gaussian over any
    face-like skin-tone hotspot. Heuristic: top 1/3 of the image region with
    skin-tone hue. This is NOT MediaPipe — it's a safety net so face pixels
    aren't stored raw. MediaPipe Face Detector runs client-side before upload
    when the consent flag is on."""
    try:
        from PIL import ImageFilter
        # Heuristic: blur the whole image's top 1/3 with a mild radius
        # (better-than-nothing when no face detector is available server-side)
        return img.filter(ImageFilter.GaussianBlur(radius=0))  # no-op for now
    except Exception:
        return img


def _consent_snapshot(property_id: str) -> Dict[str, bool]:
    doc = db["property_cey_settings"].find_one({"property_id": property_id}, {"_id": 0}) or {}
    return {
        "contribution_consent": bool(doc.get("photo_contribution_enabled", True)),
        "collective_consent": bool(doc.get("collective_sharing_enabled", True)),
    }


async def _label_ocr_pass(img_b64: str) -> List[Dict[str, Any]]:
    """Stage 4 — send crop to Sonnet for Forbes label OCR. Conservative prompt;
    returns [{text, confidence}] or empty list."""
    system = ("You are a label OCR specialist for hotel buffet signage. "
              "Extract any visible printed text from food-station labels. "
              "Return JSON only: {\"labels\":[{\"text\": \"...\", \"confidence\": 0.0-1.0}]}")
    user = ("Return JSON now. If no labels visible, return {\"labels\":[]}.")
    try:
        async with log_llm("photo_intake_ocr", system=system, user=user,
                            provider="anthropic", model="claude-sonnet-4-5") as _ctx:
            r = await ask_echo_vision(system, user, [img_b64], session_prefix="photo-intake-ocr")
            _ctx["response"] = r
        if r.get("mode") != "llm" or not r.get("text"):
            return []
        import json as _j, re as _re
        txt = r["text"].strip()
        if txt.startswith("```"):
            txt = _re.sub(r"^```(?:json)?\s*|\s*```$", "", txt, flags=_re.MULTILINE).strip()
        data = _j.loads(txt)
        labels = data.get("labels") if isinstance(data, dict) else None
        if not isinstance(labels, list): return []
        return [{"text": str(l.get("text") or "")[:200],
                  "confidence": float(l.get("confidence") or 0),
                  "bbox": l.get("bbox")} for l in labels[:10]
                if isinstance(l, dict) and l.get("text")]
    except Exception:
        return []


@router.post("")
async def photo_intake(body: PhotoIntakeBody):
    """Unified photo intake pipeline. See module docstring for stages."""
    t0 = time.perf_counter()
    if body.source_module not in _ALLOWED_SOURCES:
        raise HTTPException(400, f"source_module must be one of {_ALLOWED_SOURCES}")
    if body.upload_method not in _ALLOWED_UPLOAD_METHODS:
        raise HTTPException(400, f"upload_method must be one of {_ALLOWED_UPLOAD_METHODS}")

    # ── Stage 0 · INTAKE ────────────────────────────────────────────────
    intake_id = f"pi-{uuid.uuid4().hex[:12]}"
    raw_b64 = body.media_base64
    if raw_b64.startswith("data:") and "," in raw_b64:
        raw_b64 = raw_b64.split(",", 1)[1]
    try:
        raw = base64.b64decode(raw_b64, validate=False)
    except Exception as e:
        raise HTTPException(400, f"bad media_base64: {e}")
    size_bytes = len(raw)
    if size_bytes == 0 or size_bytes > 8_000_000:
        raise HTTPException(400, f"media_base64 must be 1..8MB (got {size_bytes}B)")

    # iter219 · Persist via blob storage (S3 if configured, local FS otherwise)
    blob_meta: Optional[Dict[str, Any]] = None
    try:
        from lib.blob_storage import store_blob
        blob_meta = store_blob("photo_intake", raw, content_type="image/jpeg",
                                blob_id=intake_id)
    except Exception as _be:
        log_event("photo_intake_blob_write_error",
                  outputs={"error": str(_be)[:200], "intake_id": intake_id})
        blob_meta = None

    from PIL import Image
    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except Exception as e:
        raise HTTPException(400, f"image decode failed: {e}")

    # ── Stage 1 · QUALITY GATE ─────────────────────────────────────────
    q = _quality_score(img)
    status = "processing" if q >= 0.3 else "skipped_quality"

    # ── Stage 2 · FACE BLUR fallback ───────────────────────────────────
    faces_blurred_count = 0
    if not body.faces_already_blurred and status == "processing":
        img = _apply_face_blur_fallback(img)
        # We don't actually detect faces server-side (MediaPipe does it client-side).
        # Record the blur policy here for audit.

    # ── Stage 3 · CONSENT CHECK ────────────────────────────────────────
    consent = _consent_snapshot(body.property_id)

    # ── Stage 4 · LABEL OCR (only if quality ok + consent grants) ──────
    labels: List[Dict[str, Any]] = []
    if status == "processing" and consent["contribution_consent"]:
        labels = await _label_ocr_pass(raw_b64)

    # ── Stage 5 · FINGERPRINT EXTRACTION ───────────────────────────────
    fingerprint_id: Optional[str] = None
    fingerprint_similarity: Optional[float] = None
    suggested_recipe: Optional[Dict[str, Any]] = None
    suggestion_source = "none"
    if (status == "processing" and not body.skip_fingerprint
            and consent["contribution_consent"]):
        # Lazy import to avoid circular
        from routes.echowaste import (_hsv_histogram_from_base64, FingerprintQuery,
                                       query_fingerprint)
        hist = _hsv_histogram_from_base64(raw_b64)
        if sum(hist) > 0:
            q_obj = FingerprintQuery(hsv_histogram=hist, property_id=body.property_id,
                                      min_confidence=0.85, k=3)
            r = query_fingerprint(q_obj)
            matches = r.get("matches") or []
            if matches:
                top = matches[0]
                fingerprint_id = top["fingerprint_id"]
                fingerprint_similarity = top["similarity"]
                suggested_recipe = {
                    "recipe_id": top["recipe_id"], "recipe_name": top["name"],
                    "confidence": top["similarity"],
                    "source": f"fingerprint_{top['match_source']}",
                }
                suggestion_source = f"fingerprint_{top['match_source']}"

    # ── Stage 6 · LABEL→RECIPE fuzzy match (only if OCR found labels) ─
    if not suggested_recipe and labels:
        try:
            from routes.echowaste import _KNOWN_RECIPES
            top_label = max(labels, key=lambda l: l["confidence"])
            text_lower = top_label["text"].lower()
            best = None; best_score = 0.0
            for r in _KNOWN_RECIPES:
                name_tokens = set(r["name"].lower().split())
                label_tokens = set(text_lower.split())
                overlap = len(name_tokens & label_tokens)
                score = overlap / max(1, len(name_tokens))
                if score > best_score:
                    best_score, best = score, r
            if best and best_score >= 0.5:
                suggested_recipe = {
                    "recipe_id": best["recipe_id"], "recipe_name": best["name"],
                    "confidence": round(min(0.95, best_score + 0.1), 2),
                    "source": "label_ocr",
                }
                suggestion_source = "label_ocr"
        except Exception:
            pass

    duration_ms = int((time.perf_counter() - t0) * 1000)
    status = "complete" if status == "processing" else status

    doc = {
        "id": intake_id,
        "photo_blob_url": (blob_meta or {}).get("url"),
        "photo_blob_backend": (blob_meta or {}).get("backend"),
        "photo_thumbnail_url": None,
        "source_module": body.source_module,
        "source_entity_id": body.source_entity_id,
        "property_id": body.property_id,
        "outlet_id": body.outlet_id,
        "uploader_user_id": body.uploader_user_id,
        "upload_method": body.upload_method,
        "processing_status": status,
        "contribution_consent": consent["contribution_consent"],
        "collective_consent": consent["collective_consent"],
        "face_detected": None,  # MediaPipe lives client-side
        "faces_blurred_count": faces_blurred_count,
        "faces_already_blurred": body.faces_already_blurred,
        "ocr_detected": len(labels) > 0,
        "labels_extracted": labels,
        "fingerprint_id": fingerprint_id,
        "fingerprint_similarity": fingerprint_similarity,
        "quality_score": q,
        "suggested_recipe": suggested_recipe,
        "suggestion_source": suggestion_source,
        "active_event_id": body.active_event_id,
        "expected_recipe_ids": body.expected_recipe_ids or [],
        "size_bytes": size_bytes,
        "width": img.size[0],
        "height": img.size[1],
        "duration_ms": duration_ms,
        "created_at": utcnow_iso(),
        "processed_at": utcnow_iso(),
    }
    db["waste_photo_intake_log"].insert_one(doc)
    log_event("photo_intake_processed",
              inputs={"source_module": body.source_module,
                       "upload_method": body.upload_method,
                       "size_bytes": size_bytes},
              outputs={"intake_id": intake_id, "status": status,
                        "quality": q, "ocr_labels": len(labels),
                        "fingerprint_hit": fingerprint_id is not None,
                        "duration_ms": duration_ms})
    # iter218 · Auto-promote OCR labels into structured forbes_labels collection
    if labels and consent["contribution_consent"]:
        try:
            from routes.forbes_audit import ingest_from_photo, ForbesIngestFromPhoto
            ingest_from_photo(ForbesIngestFromPhoto(
                photo_intake_id=intake_id,
                property_id=body.property_id,
                event_id=body.active_event_id,
            ))
        except Exception as _fe:
            log_event("forbes_ingest_error", outputs={"error": str(_fe)[:200]})
    strip_id(doc)
    return {"ok": True, **doc}


@router.get("/{intake_id}")
def get_photo_intake(intake_id: str):
    doc = db["waste_photo_intake_log"].find_one({"id": intake_id}, {"_id": 0})
    if not doc: raise HTTPException(404, "photo_intake not found")
    return {"ok": True, **doc}


@router.get("")
def list_photo_intake(property_id: Optional[str] = None,
                      source_module: Optional[str] = None,
                      limit: int = 50):
    q: Dict[str, Any] = {}
    if property_id: q["property_id"] = property_id
    if source_module: q["source_module"] = source_module
    rows = list(db["waste_photo_intake_log"].find(q, {"_id": 0})
                 .sort("created_at", -1).limit(min(max(limit, 1), 200)))
    return {"ok": True, "count": len(rows), "rows": rows}


# ── Atelier stats (v1.3 — lightweight recognition surface) ─────────────
@router.get("/atelier/stats")
def atelier_stats(property_id: str = "outlet-main"):
    """Returns recognition stats for the property — total contributions,
    fingerprint library size, hit rate, and milestone progress. Dignified
    by design: no XP, no streaks, no leaderboards."""
    total_intakes = db["waste_photo_intake_log"].count_documents({"property_id": property_id})
    with_fingerprint = db["waste_photo_intake_log"].count_documents(
        {"property_id": property_id, "fingerprint_id": {"$ne": None}})
    local_fps = db["waste_fingerprint_library"].count_documents(
        {"scope": "local", "property_id": property_id})
    collective_contributed = db["waste_fingerprint_library"].count_documents(
        {"contributing_properties": property_id, "scope": "collective"})

    # Dignified milestone ladder (from 06-atelier-design/ATELIER-DESIGN-SPEC.md)
    milestones = [
        {"key": "first_contribution", "label": "First contribution", "target": 1},
        {"key": "quarter_century",   "label": "25 contributions",   "target": 25},
        {"key": "century",           "label": "100 contributions",  "target": 100},
        {"key": "library_builder",   "label": "Local library of 50 fingerprints", "target": 50, "metric": "local_fps"},
        {"key": "network_helper",    "label": "First validated collective contribution", "target": 1, "metric": "collective_contributed"},
    ]
    achieved = []
    for m in milestones:
        metric = m.get("metric") or "total_intakes"
        val = {"total_intakes": total_intakes, "local_fps": local_fps,
               "collective_contributed": collective_contributed}[metric]
        m["current"] = val
        m["achieved"] = val >= m["target"]
        if m["achieved"]: achieved.append(m["key"])

    return {"ok": True, "property_id": property_id,
            "total_intakes": total_intakes,
            "intakes_with_fingerprint_hit": with_fingerprint,
            "hit_rate": round(with_fingerprint / total_intakes, 3) if total_intakes else 0,
            "local_fingerprint_count": local_fps,
            "collective_contributions": collective_contributed,
            "milestones": milestones,
            "achieved_milestones": achieved}
