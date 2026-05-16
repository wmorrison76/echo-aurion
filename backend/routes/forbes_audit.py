"""iter218 · Forbes labels structured storage + Audit queue (v1.4 migration 015).

Forbes labels: OCR'd buffet station signage. Persisted in waste_forbes_labels.
Audit queue: unidentified items surface to chefs the next morning for batch labeling.

Endpoints:
    Forbes labels
        POST /api/waste/forbes-labels              create/upsert
        GET  /api/waste/forbes-labels              list (property / event filters)
        POST /api/waste/forbes-labels/{id}/validate
        POST /api/waste/forbes-labels/ingest-from-photo  — auto-call from photo_intake
    Audit queue
        POST /api/waste/audit-queue                enqueue an item (often from vision)
        GET  /api/waste/audit-queue/pending        chef banner / batch view
        POST /api/waste/audit-queue/{id}/resolve   chef labels it
        POST /api/waste/audit-queue/{id}/skip
"""
from __future__ import annotations
import re
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from database import db
from lib.time import utcnow_iso
from lib.mongo import strip_id
from lib.waste_log import log_event


# ═══════════════════════ FORBES LABELS ═══════════════════════════════════
forbes_router = APIRouter(prefix="/api/waste/forbes-labels", tags=["forbes-labels"])


def _normalize_label(text: str) -> str:
    return re.sub(r"[^a-z0-9\s]", "", text.lower()).strip()


class ForbesLabelIn(BaseModel):
    label_text: str = Field(..., min_length=1, max_length=400)
    property_id: str = "outlet-main"
    outlet_id: Optional[str] = None
    event_id: Optional[str] = None
    station_id: Optional[str] = None
    source_entry_id: Optional[str] = None
    source_photo_intake_id: Optional[str] = None
    source_frame_idx: Optional[int] = None
    label_bbox: Optional[Dict[str, float]] = None
    ocr_confidence: Optional[float] = Field(None, ge=0, le=1)
    dish_name: Optional[str] = None
    allergens: Optional[List[str]] = None
    origin_or_style: Optional[str] = None


def _fuzzy_recipe_match(label_normalized: str) -> Optional[Dict[str, Any]]:
    """Token-overlap match against the known recipe catalog."""
    try:
        from routes.echowaste import _KNOWN_RECIPES
    except Exception:
        return None
    best = None; best_score = 0.0
    label_tokens = set(label_normalized.split())
    for r in _KNOWN_RECIPES:
        name_tokens = set(r["name"].lower().split())
        if not name_tokens: continue
        overlap = len(name_tokens & label_tokens)
        score = overlap / max(1, len(name_tokens))
        if score > best_score:
            best_score, best = score, r
    if best and best_score >= 0.4:
        return {"recipe_id": best["recipe_id"], "recipe_name": best["name"],
                "match_score": round(best_score, 2)}
    return None


@forbes_router.post("")
def create_label(body: ForbesLabelIn):
    lid = f"fbl-{uuid.uuid4().hex[:12]}"
    norm = _normalize_label(body.label_text)
    match = _fuzzy_recipe_match(norm)
    doc = {
        "id": lid,
        "label_text": body.label_text,
        "label_normalized": norm,
        "label_bbox": body.label_bbox,
        "ocr_confidence": body.ocr_confidence,
        "dish_name": body.dish_name,
        "allergens": body.allergens or [],
        "origin_or_style": body.origin_or_style,
        "property_id": body.property_id,
        "outlet_id": body.outlet_id,
        "event_id": body.event_id,
        "station_id": body.station_id,
        "source_entry_id": body.source_entry_id,
        "source_photo_intake_id": body.source_photo_intake_id,
        "source_frame_idx": body.source_frame_idx,
        "linked_recipe_id": match["recipe_id"] if match else None,
        "linked_recipe_name": match["recipe_name"] if match else None,
        "linked_confidence": match["match_score"] if match else None,
        "validated": False,
        "validated_by_user_id": None,
        "validated_at": None,
        "created_at": utcnow_iso(),
    }
    db["waste_forbes_labels"].insert_one(doc)
    strip_id(doc)
    log_event("forbes_label_created", inputs={"property_id": body.property_id},
              outputs={"id": lid, "linked_recipe": match})
    return {"ok": True, "label": doc}


@forbes_router.get("")
def list_labels(property_id: Optional[str] = None, event_id: Optional[str] = None,
                validated: Optional[bool] = None, q: Optional[str] = None,
                limit: int = 50):
    query: Dict[str, Any] = {}
    if property_id: query["property_id"] = property_id
    if event_id: query["event_id"] = event_id
    if validated is not None: query["validated"] = validated
    if q:
        query["label_normalized"] = {"$regex": _normalize_label(q), "$options": "i"}
    rows = list(db["waste_forbes_labels"].find(query, {"_id": 0})
                 .sort("created_at", -1).limit(min(max(limit, 1), 200)))
    return {"ok": True, "count": len(rows), "rows": rows}


@forbes_router.post("/{label_id}/validate")
def validate_label(label_id: str, user_id: Optional[str] = None):
    r = db["waste_forbes_labels"].find_one_and_update(
        {"id": label_id},
        {"$set": {"validated": True,
                   "validated_by_user_id": user_id,
                   "validated_at": utcnow_iso()}},
        return_document=True,
    )
    if not r: raise HTTPException(404, "forbes label not found")
    strip_id(r)
    return {"ok": True, "label": r}


class ForbesIngestFromPhoto(BaseModel):
    photo_intake_id: str
    property_id: str = "outlet-main"
    event_id: Optional[str] = None


@forbes_router.post("/ingest-from-photo")
def ingest_from_photo(body: ForbesIngestFromPhoto):
    """Convenience: after photo_intake runs OCR, this endpoint promotes each
    detected label row to the structured `waste_forbes_labels` collection."""
    photo = db["waste_photo_intake_log"].find_one(
        {"id": body.photo_intake_id}, {"_id": 0})
    if not photo: raise HTTPException(404, "photo_intake not found")
    labels = photo.get("labels_extracted") or []
    created = []
    for l in labels:
        if not isinstance(l, dict) or not l.get("text"): continue
        body2 = ForbesLabelIn(
            label_text=str(l["text"])[:400],
            ocr_confidence=float(l.get("confidence") or 0.6),
            label_bbox=l.get("bbox"),
            property_id=photo.get("property_id") or body.property_id,
            outlet_id=photo.get("outlet_id"),
            event_id=body.event_id or photo.get("active_event_id"),
            source_photo_intake_id=photo["id"],
        )
        res = create_label(body2)
        created.append(res["label"]["id"])
    return {"ok": True, "created": len(created), "label_ids": created}


# ═══════════════════════ AUDIT QUEUE ═════════════════════════════════════
audit_router = APIRouter(prefix="/api/waste/audit-queue", tags=["audit-queue"])


class AuditQueueIn(BaseModel):
    entry_id: Optional[str] = None
    item_id: Optional[str] = None
    property_id: str = "outlet-main"
    outlet_id: Optional[str] = None
    crop_image_url: Optional[str] = None
    crop_image_base64: Optional[str] = None
    frame_url: Optional[str] = None
    sonnet_best_guess: Optional[str] = None
    sonnet_confidence: Optional[float] = Field(None, ge=0, le=1)
    queue_priority: int = 100


@audit_router.post("")
def enqueue(body: AuditQueueIn):
    aid = f"aq-{uuid.uuid4().hex[:12]}"
    # iter219 · If a crop base64 is provided, push to blob storage and drop
    # the base64 off the persisted document (keep it inline ONLY if blob write
    # fails so fingerprint-on-resolve still works).
    crop_url = body.crop_image_url
    crop_backend = None
    persisted_b64: Optional[str] = None
    if body.crop_image_base64:
        try:
            from lib.blob_storage import store_blob_from_base64
            meta = store_blob_from_base64("audit_crop", body.crop_image_base64,
                                           content_type="image/jpeg")
            crop_url = meta["url"]
            crop_backend = meta["backend"]
        except Exception as _be:
            log_event("audit_queue_blob_write_error", outputs={"error": str(_be)[:200]})
            persisted_b64 = body.crop_image_base64  # fallback inline
    doc = {
        "id": aid,
        "entry_id": body.entry_id, "item_id": body.item_id,
        "property_id": body.property_id, "outlet_id": body.outlet_id,
        "crop_image_url": crop_url,
        "crop_image_backend": crop_backend,
        "crop_image_base64": persisted_b64,  # None when blob succeeded
        "frame_url": body.frame_url,
        "sonnet_best_guess": body.sonnet_best_guess,
        "sonnet_confidence": body.sonnet_confidence,
        "status": "pending",
        "queue_priority": body.queue_priority,
        "shown_to_user_id": None, "shown_at": None,
        "resolved_at": None, "resolved_by_user_id": None,
        "resolution_method": None, "resolved_recipe_id": None,
        "resolved_item_name": None,
        "resulting_fingerprint_id": None,
        "escalated_to_user_id": None, "escalated_at": None,
        "created_at": utcnow_iso(),
    }
    db["waste_audit_queue"].insert_one(doc)
    strip_id(doc)
    log_event("audit_queue_enqueued", outputs={"id": aid,
              "property_id": body.property_id,
              "priority": body.queue_priority,
              "blob_backend": crop_backend})
    return {"ok": True, "audit_item": doc}


@audit_router.get("/pending")
def list_pending(property_id: Optional[str] = None, limit: int = 25):
    q: Dict[str, Any] = {"status": "pending"}
    if property_id: q["property_id"] = property_id
    rows = list(db["waste_audit_queue"].find(q, {"_id": 0, "crop_image_base64": 0})
                 .sort([("queue_priority", 1), ("created_at", 1)])
                 .limit(min(max(limit, 1), 100)))
    total = db["waste_audit_queue"].count_documents(q)
    return {"ok": True, "count": len(rows), "total_pending": total, "rows": rows}


@audit_router.get("/{audit_id}")
def get_audit(audit_id: str):
    doc = db["waste_audit_queue"].find_one({"id": audit_id}, {"_id": 0})
    if not doc: raise HTTPException(404, "audit item not found")
    return {"ok": True, "audit_item": doc}


class AuditResolveBody(BaseModel):
    resolution_method: str           # voice|text|recipe_pick|skip|not_food|escalate
    resolved_recipe_id: Optional[str] = None
    resolved_item_name: Optional[str] = None
    resolved_by_user_id: Optional[str] = None
    escalated_to_user_id: Optional[str] = None


@audit_router.post("/{audit_id}/resolve")
def resolve_audit(audit_id: str, body: AuditResolveBody):
    valid = {"voice", "text", "recipe_pick", "skip", "not_food", "escalate"}
    if body.resolution_method not in valid:
        raise HTTPException(400, f"resolution_method must be one of {valid}")
    # Status transitions
    new_status: str
    updates: Dict[str, Any] = {
        "resolution_method": body.resolution_method,
        "resolved_at": utcnow_iso(),
        "resolved_by_user_id": body.resolved_by_user_id,
        "resolved_recipe_id": body.resolved_recipe_id,
        "resolved_item_name": body.resolved_item_name,
    }
    if body.resolution_method == "escalate":
        new_status = "escalated"
        updates["escalated_to_user_id"] = body.escalated_to_user_id
        updates["escalated_at"] = utcnow_iso()
    elif body.resolution_method == "skip":
        new_status = "skipped"
    elif body.resolution_method == "not_food":
        new_status = "not_food"
    else:
        new_status = "resolved"
    updates["status"] = new_status

    updated = db["waste_audit_queue"].find_one_and_update(
        {"id": audit_id}, {"$set": updates}, return_document=True)
    if not updated: raise HTTPException(404, "audit item not found")
    strip_id(updated)

    # If resolved with a recipe_id + we can obtain the original crop pixels →
    # contribute a fingerprint. The crop may have been moved to blob storage
    # (iter219) — in that case we re-load it from disk.
    new_fp_id = None
    if new_status == "resolved" and body.resolved_recipe_id:
        crop_b64: Optional[str] = updated.get("crop_image_base64")
        if not crop_b64 and updated.get("crop_image_url", "").startswith("/api/blob/"):
            try:
                from pathlib import Path
                import os as _os, base64 as _b64
                # URL is /api/blob/{kind}/{filename}
                parts = updated["crop_image_url"].split("/")
                root = Path(_os.getenv("BLOB_LOCAL_ROOT", "/app/backend/uploads"))
                p = root / parts[-2] / parts[-1]
                if p.is_file():
                    crop_b64 = _b64.b64encode(p.read_bytes()).decode()
            except Exception as _re:
                log_event("audit_queue_blob_read_error", outputs={"error": str(_re)[:200]})
        if crop_b64:
            try:
                from routes.echowaste import (_hsv_histogram_from_base64,
                                               FingerprintContribution, contribute_fingerprint)
                hist = _hsv_histogram_from_base64(crop_b64)
                if sum(hist) > 0:
                    try:
                        from routes.echowaste import _KNOWN_RECIPES
                        rec = next((r for r in _KNOWN_RECIPES if r["recipe_id"] == body.resolved_recipe_id), None)
                    except Exception: rec = None
                    name = body.resolved_item_name or (rec["name"] if rec else body.resolved_recipe_id)
                    portion = float(rec["portion_g"]) if rec else 100.0
                    cost = float(rec["cost"]) if rec else 0.0
                    cat = rec.get("category") if rec else "sundries"
                    contrib = contribute_fingerprint(FingerprintContribution(
                        recipe_id=body.resolved_recipe_id,
                        name=name, hsv_histogram=hist,
                        portion_g=portion, cost=cost, category=cat or "sundries",
                        property_id=updated.get("property_id"),
                        capture_id=updated.get("entry_id"),
                    ))
                    new_fp_id = contrib["fingerprint"]["fingerprint_id"]
                    db["waste_audit_queue"].update_one(
                        {"id": audit_id},
                        {"$set": {"resulting_fingerprint_id": new_fp_id}})
                    updated["resulting_fingerprint_id"] = new_fp_id
            except Exception as e:
                log_event("audit_queue_fingerprint_error", outputs={"error": str(e)[:200]})

    log_event("audit_queue_resolved", outputs={"id": audit_id,
              "resolution": body.resolution_method,
              "new_status": new_status,
              "resulting_fingerprint_id": new_fp_id})
    return {"ok": True, "audit_item": updated, "resulting_fingerprint_id": new_fp_id}


@audit_router.post("/{audit_id}/skip")
def skip_audit(audit_id: str):
    return resolve_audit(audit_id, AuditResolveBody(resolution_method="skip"))


@audit_router.get("/stats/banner")
def banner_stats(property_id: str = "outlet-main"):
    """Tells the UI whether to show the audit-queue banner."""
    settings = db["property_cey_settings"].find_one(
        {"property_id": property_id}, {"_id": 0}) or {}
    enabled = bool(settings.get("audit_queue_enabled", True))
    threshold = int(settings.get("audit_min_items_threshold", 5))
    total = db["waste_audit_queue"].count_documents(
        {"property_id": property_id, "status": "pending"})
    return {"ok": True, "show_banner": enabled and total >= threshold,
            "total_pending": total, "threshold": threshold,
            "audit_queue_enabled": enabled}


# Bundled exports so auto_register picks both up.
# auto_register scans for top-level `router = APIRouter(...)`. We expose
# both routers as `router_forbes` and `router_audit` for clarity, and a
# combined `router` that includes both so the single-symbol convention
# still registers everything.
router = APIRouter()
router.include_router(forbes_router)
router.include_router(audit_router)
