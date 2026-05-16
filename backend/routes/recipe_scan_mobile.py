"""
D40 · Mobile recipe scan.

User directive: on the mobile app there is an "add recipe — scan"
button. Cook holds their phone over a printed recipe card or a
cookbook page; the photo is uploaded; the server OCRs the image,
parses ingredients + method, and creates a draft that the existing
recipe-form deep link can populate.

This is the visual companion to the voice-dictation flow in D39.
Both intake paths converge on `recipe_drafts` with the same
shape, so the Add-Recipe form doesn't care how the draft was
generated — voice or photo.

Endpoints (all /api/recipe-scan)

  POST /scan
       Accepts a base64-encoded image (or an image_url already
       hosted in object storage). Returns a draft_id + parsed
       title + ingredients + method. Surfaces the work in the
       activity drawer so the user can audit the OCR's accuracy.

  GET  /scans/{scan_id}
       Detail view of a previous scan (raw OCR text + draft).

OCR seam

  This module does NOT include a vendor OCR adapter — that's a
  fuse-box concern (D17). Pass-through: if `_ocr_provider` is
  configured, call it; otherwise the implementation operates on
  the `pre_extracted_text` field that the frontend can fill in
  using on-device OCR (Apple Vision / ML Kit) for privacy.

  The frontend can run the OCR locally on the phone (privacy
  win — recipe photo never leaves the device's secure enclave
  unless the user opts in to server-side OCR). The server takes
  the extracted text, parses it, and writes the draft.
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db

router = APIRouter(prefix="/api/recipe-scan", tags=["recipe-scan"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _resolve_owner(x_user_id: Optional[str]) -> str:
    if not x_user_id:
        raise HTTPException(401, "x-user-id header required")
    return x_user_id.strip()


# ─── Models ──────────────────────────────────────────────────────────────

class ScanBody(BaseModel):
    pre_extracted_text: Optional[str] = None    # on-device OCR result
    image_url: Optional[str] = None             # uploaded image URL
    image_base64: Optional[str] = None          # alternate upload
    title_hint: Optional[str] = None
    outlet_id: Optional[str] = None
    source_label: Optional[str] = "phone_camera"


# ─── Heuristic recipe parser (shared with D39 voice intake) ─────────────

INGREDIENT_LINE = re.compile(
    r"^(?:\d+(?:[\.\/]\d+)?\s+)?(?:cup|cups|tsp|tbsp|teaspoon|"
    r"tablespoon|oz|ounces|g|grams|kg|lb|lbs|ml|l|liter|pinch)\s",
    re.IGNORECASE)


def _parse_ocr_text(raw: str, title_hint: Optional[str]
                     ) -> Dict[str, Any]:
    """Same approach as D39 voice parser — keep behavior identical
    so a recipe written down and a recipe spoken converge to the
    same draft structure."""
    raw_lines = [l.strip() for l in raw.splitlines() if l.strip()]
    ingredients: List[str] = []
    method: List[str] = []
    title = title_hint or ""

    step_verbs = {"combine", "mix", "stir", "fold", "whisk",
                  "bake", "boil", "saute", "sauté", "fry",
                  "roast", "grill", "season", "add", "drain",
                  "strain", "remove", "preheat", "heat", "cook",
                  "simmer", "blend", "pour", "set", "let", "rest",
                  "transfer", "serve", "garnish"}

    for ln in raw_lines:
        lower = ln.lower()
        first_words = lower.split()[:3]
        if INGREDIENT_LINE.match(ln) or any(
            w in ("cup","cups","tsp","tbsp","teaspoon","tablespoon",
                  "oz","grams","g","kg","lb","lbs","ml","pinch")
            for w in first_words):
            ingredients.append(ln)
            continue
        first = lower.split()[0] if lower.split() else ""
        if (first in step_verbs or
            re.match(r"^step\s*\d", lower) or
            re.match(r"^\d+[\.\)]\s", ln)):
            method.append(ln)
            continue
        if not title and 3 <= len(ln) <= 80:
            title = ln
            continue
        method.append(ln)

    if not title:
        title = (raw_lines[0] if raw_lines else "Untitled recipe")[:80]

    return {
        "title": title,
        "ingredients": ingredients,
        "method": method,
        "raw_text": raw,
    }


# ─── Endpoints ───────────────────────────────────────────────────────────

@router.post("/scan")
def scan_recipe(
    body: ScanBody,
    x_tenant_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    owner = _resolve_owner(x_user_id)

    # Determine the source text. Priority: pre_extracted_text (on-
    # device OCR; privacy-preserving) > server OCR via fuse-box
    # adapter > error.
    raw_text: Optional[str] = body.pre_extracted_text
    ocr_path = "on_device" if raw_text else None

    if not raw_text:
        # Fuse-box adapter seam — real implementation lives in
        # services/clients.py per D17. The mobile flow is designed
        # so the phone OCRs locally; server-side is the fallback
        # when the device can't handle it (older phones).
        try:
            from services.clients import get_ocr_client
            ocr = get_ocr_client()
            if body.image_url:
                raw_text = ocr.extract_text_from_url(body.image_url)
            elif body.image_base64:
                raw_text = ocr.extract_text_from_b64(body.image_base64)
            ocr_path = "server_fallback"
        except (ImportError, AttributeError):
            pass

    if not raw_text:
        raise HTTPException(400,
            "no recipe text available — supply pre_extracted_text "
            "(on-device OCR) or configure server OCR via D17 fuse "
            "box")

    parsed = _parse_ocr_text(raw_text, body.title_hint)
    scan_id = uuid.uuid4().hex[:16]
    draft_id = uuid.uuid4().hex[:16]

    db["recipe_scans"].insert_one({
        "id": scan_id,
        "tenant_id": tenant_id,
        "owner_user_id": owner,
        "outlet_id": body.outlet_id,
        "source_label": body.source_label,
        "ocr_path": ocr_path,
        "image_url": body.image_url,
        "raw_text": raw_text,
        "parsed_title": parsed["title"],
        "draft_id": draft_id,
        "created_at": _now_iso(),
    })

    db["recipe_drafts"].insert_one({
        "id": draft_id,
        "tenant_id": tenant_id,
        "owner_user_id": owner,
        "outlet_id": body.outlet_id,
        "source": "phone_scan",
        "title": parsed["title"],
        "ingredients": parsed["ingredients"],
        "method": parsed["method"],
        "raw_transcript": raw_text,
        "scan_id": scan_id,
        "applied_to_recipe_id": None,
        "created_at": _now_iso(),
    })

    # Surface in the activity drawer so the user can audit the
    # parse before applying.
    try:
        from routes.echo_activity_drawer import enqueue_task
        task = enqueue_task(
            tenant_id=tenant_id, owner_user_id=owner,
            kind="recipe_scan",
            title=f"Scanned recipe: {parsed['title']}",
            status="done",
            handoff_route=f"/m/recipes/new?draft_id={draft_id}",
            metadata={
                "draft_id": draft_id,
                "scan_id": scan_id,
                "ocr_path": ocr_path,
                "ingredient_count": len(parsed["ingredients"]),
                "method_step_count": len(parsed["method"]),
            })
    except Exception:
        task = None

    return {
        "ok": True,
        "scan_id": scan_id,
        "draft_id": draft_id,
        "ocr_path": ocr_path,
        "title": parsed["title"],
        "ingredients": parsed["ingredients"],
        "method": parsed["method"],
        "task": task,
        "handoff_route": f"/m/recipes/new?draft_id={draft_id}",
    }


@router.get("/scans/{scan_id}")
def get_scan(
    scan_id: str,
    x_tenant_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    owner = _resolve_owner(x_user_id)
    scan = db["recipe_scans"].find_one(
        {"id": scan_id, "tenant_id": tenant_id,
         "owner_user_id": owner}, {"_id": 0})
    if not scan:
        raise HTTPException(404, "scan not found")
    return {"ok": True, "scan": scan}


@router.get("/scans")
def list_scans(
    limit: int = 50,
    x_tenant_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    owner = _resolve_owner(x_user_id)
    rows = list(db["recipe_scans"].find(
        {"tenant_id": tenant_id, "owner_user_id": owner},
        {"_id": 0})
                .sort("created_at", -1)
                .limit(max(1, min(500, limit))))
    return {"ok": True, "total": len(rows), "scans": rows}
