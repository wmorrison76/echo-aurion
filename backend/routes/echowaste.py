"""iter210 · EchoWaste backend foundation (Phase 1 + Phase 2 scope).

Based on the EchoWaste Emergent Handoff v1.0 package provided by William
(April 22, 2026). Translates the Postgres schema from `/02-database/*.sql`
to Mongo collections and implements the core API per `/03-api/openapi.yaml`.

This is the **14-day proof** foundation — enough to demo:
  pan 10 muffins → logged with count + recipe match + value → review

Collections:
  waste_entries             — one row per capture (video/still/voice/scale)
  waste_items               — detected items (count × portion × cost)
  waste_training_feedback   — user corrections feeding retraining
  waste_capture_telemetry   — coaching quality metrics per capture
  waste_buffet_sessions     — before/after buffet pair (delta = consumed)
  waste_insights_cache      — pre-computed daily/weekly digests

Vision integration (Phase 1 target: Gemini Nano Banana / GPT Image 1) is
stubbed behind `_run_vision_stub()` — returns deterministic detections based
on a simple commodity hash so the end-to-end chain is E2E-testable today.
Swap in `lib.llm.ask_echo` + image input when Emergent is ready.
"""
from __future__ import annotations
import hashlib
import json
import re
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field

from database import db
from lib.time import utcnow_iso
from lib.mongo import strip_id, strip_ids
from lib.admin_auth import require_admin_token
from lib.llm import ask_echo_vision
from lib.waste_log import log_event, log_llm

router = APIRouter(prefix="/api/waste", tags=["echowaste"])


# ═══════════════════════ FEATURE FLAGS (v1.1) ══════════════════════════════
_DEFAULT_FEATURE_FLAGS: Dict[str, bool] = {
    "feature.voice_capture": True,
    "feature.buffet_mode": True,
    "feature.ble_scale": False,
    "feature.par_sheet": False,
    "feature.network_intelligence": False,
    "feature.coaching_v2": True,
    "feature.recipe_match_llm_rerank": False,
    "feature.vision_llm": True,           # live vision via Emergent LLM Key
    "feature.vision_llm_still": True,     # allow still analysis via LLM
    "feature.vision_video_mot": True,     # iter212 · multi-frame MOT aggregation
    "feature.voice_whisper": True,        # iter212 · Whisper STT
    # iter213 · v1.2 Phase 1 extensions
    "feature.buffet_pre_cost": True,      # Feature 1 — pre-cost estimation
    "feature.cost_per_cover": True,       # Feature 2 — close cost-per-cover
    "feature.multi_zone_capture": True,   # Feature 3 — plus-sign zone scanning
    "feature.collect_ground_truth": True, # ground-truth operator-test ingest
    "feature.recipe_suggestions": True,   # EchoAi³ suggests recipes for chef approval
    # iter216 · Fingerprint-first recognition (Claude Opus strategic direction)
    "feature.fingerprint_first": True,    # short-circuit Sonnet on strong library match
    "feature.fingerprint_shadow_learn": True,  # shadow-contribute fingerprints after Sonnet
}

# iter212 · Confidence threshold below which items are auto-flagged
# `needs_review=True`. Ops can change per-property via the `waste_feature_flags`
# collection with {"vision_llm_confidence_threshold": 0.6}. Default 0.55.
_DEFAULT_CONFIDENCE_THRESHOLD = 0.55


def _confidence_threshold_for(property_id: str = "default") -> float:
    doc = db["waste_feature_flags"].find_one({"property_id": property_id}, {"_id": 0})
    try:
        v = float((doc or {}).get("vision_llm_confidence_threshold") or _DEFAULT_CONFIDENCE_THRESHOLD)
        return max(0.0, min(1.0, v))
    except Exception:
        return _DEFAULT_CONFIDENCE_THRESHOLD


@router.get("/feature-flags")
def feature_flags(property_id: str = Query("default")):
    """v1.1 · Flat key→bool map cached by the mobile app on boot."""
    doc = db["waste_feature_flags"].find_one({"property_id": property_id}, {"_id": 0})
    flags = dict(_DEFAULT_FEATURE_FLAGS)
    if doc and isinstance(doc.get("flags"), dict):
        flags.update(doc["flags"])
    return {"ok": True, "property_id": property_id, "flags": flags,
            "generated_at": utcnow_iso()}


# ═══════════════════════ MODELS ════════════════════════════════════════════
class CaptureInit(BaseModel):
    user_id: Optional[str] = None
    outlet_id: Optional[str] = None
    station_id: Optional[str] = None
    mode: str = Field(..., pattern="^(video|still|voice|scale|buffet_set|buffet_mid|buffet_close)$")
    context: Optional[Dict[str, Any]] = None


class ZoneInput(BaseModel):
    zone_name: Optional[str] = None
    media_url: Optional[str] = None
    media_base64: Optional[str] = None  # per-zone image/video frame (base64)


class CaptureUpload(BaseModel):
    capture_id: str
    media_url: Optional[str] = None  # URL to pre-uploaded media blob
    media_base64: Optional[str] = None  # Inline base64 for tiny test fixtures / stills
    duration_ms: Optional[int] = None
    frame_count: Optional[int] = None
    telemetry: Optional[Dict[str, Any]] = None  # speed/focus/distance/lighting scores
    station_id: Optional[str] = None
    outlet_id: Optional[str] = None
    user_id: Optional[str] = None
    client_id: Optional[str] = None  # v1.1 · idempotency correlator
    trace_id: Optional[str] = None   # v1.1 · distributed tracing (OTel)
    zones: Optional[List[ZoneInput]] = None  # iter213 · Feature 3 multi-zone
    buffet_session_id: Optional[str] = None  # iter213 · links capture to session


class VoiceCapture(BaseModel):
    capture_id: str
    transcript: Optional[str] = None  # pre-transcribed path
    audio_base64: Optional[str] = None  # iter212 · raw audio for Whisper STT
    audio_filename: Optional[str] = "audio.webm"
    audio_url: Optional[str] = None
    language: Optional[str] = None
    client_id: Optional[str] = None
    trace_id: Optional[str] = None


class ManualItem(BaseModel):
    capture_id: Optional[str] = None
    recipe_id: Optional[str] = None
    name: str
    count: float
    unit: str = "portion"
    portion_g: Optional[float] = None
    reason_code: Optional[str] = None
    station_id: Optional[str] = None
    outlet_id: Optional[str] = None
    user_id: Optional[str] = None


class ItemCorrection(BaseModel):
    recipe_id: Optional[str] = None
    name: Optional[str] = None
    count: Optional[float] = None
    portion_g: Optional[float] = None
    reason_code: Optional[str] = None
    is_correct: Optional[bool] = None


class TrainingFeedback(BaseModel):
    entry_id: str
    item_id: Optional[str] = None
    correction: Dict[str, Any]
    user_id: Optional[str] = None


class BuffetSetStart(BaseModel):
    outlet_id: str
    service_name: str          # e.g. "breakfast" / "lunch" / "brunch"
    capture_id: str            # the set-scan capture_id
    entry_id: Optional[str] = None  # iter213 · link to the analysed entry for cost rollup
    service_date: Optional[str] = None  # ISO date; defaults to today


class BuffetClose(BaseModel):
    session_id: str
    close_capture_id: str
    close_entry_id: Optional[str] = None  # iter213


class BuffetGuestCount(BaseModel):
    guest_count: int = Field(..., ge=0)
    source: str = Field(..., pattern="^(manual|pos|group_block_plus_manual)$")
    notes: Optional[str] = None


class SuggestedRecipeApprove(BaseModel):
    recipe_id: str
    name: Optional[str] = None
    portion_g: Optional[float] = None
    cost: Optional[float] = None
    category: Optional[str] = None


class TrainingLabelled(BaseModel):
    """Ground-truth ingest (operator-test Week 2). Each labelled video/still is
    saved to `waste_training_labelled` for offline model tuning."""
    capture_id: Optional[str] = None
    media_url: Optional[str] = None
    media_base64: Optional[str] = None
    video_url: Optional[str] = None
    outlet_id: Optional[str] = None
    station_id: Optional[str] = None
    user_id: Optional[str] = None
    labels: List[Dict[str, Any]]
    notes: Optional[str] = None
    captured_at: Optional[str] = None


# ═══════════════════════ REAL VISION (iter211) ═════════════════════════════
_VISION_SYSTEM = (
    "You are ECW (Echo Cognitive Waste Systems) — a food-waste vision engine "
    "optimised for hotel buffets, banquets, and kitchen line-checks.\n\n"
    "COUNTING HEURISTICS (apply them ruthlessly):\n"
    "  1. Count DISCRETE ITEMS first (muffins, bagels, pancakes, sausages, eggs). "
    "     For a tray of 12 muffins, count=12, even if some are partial. Half-eaten "
    "     or partially-consumed items count as 1 each (not 0.5).\n"
    "  2. For BULK dishes that don't have clean units (scrambled eggs, potatoes, "
    "     rice, soup, sauce) set count=1 and estimate portion_g as TOTAL grams "
    "     visible in the frame (not per-serving). A half-pan of scrambled eggs "
    "     is ~2,500g; a full hotel pan is ~4,500g.\n"
    "  3. When a dish is in a CHAFER or STEAM PAN: the visible fill level maps "
    "     to weight. 1/1 GN at 1/2 fill ≈ 4,250g. 1/2 GN at 1/2 fill ≈ 2,120g. "
    "     Round 8qt at 1/2 fill ≈ 3,800g. If in doubt, report conservatively.\n"
    "  4. For SLICED items (cakes, loaves, breads) count visible slices, not the "
    "     whole loaf. Portion_g = per-slice (typically 60-120g).\n"
    "  5. NEVER return count=0. If you see something but cannot count it, return "
    "     count=1 with confidence ≤0.4 so the chef reviews it.\n"
    "  6. Confidence ≥0.85 ONLY when the dish is clearly one of the KNOWN RECIPES "
    "     AND count is visually obvious. Otherwise cap confidence at 0.7.\n"
    "  7. If the photo shows EMPTY plates, scraps, or crumbs — these are WASTE. "
    "     Still count portion_g as the estimated scraps weight (typically 20-80g).\n"
    "  8. Report every visually distinct dish as a separate item. Do NOT merge "
    "     a tray of muffins with a tray of bagels even if they share a cart.\n\n"
    "OUTPUT SHAPE — STRICT JSON, NO PROSE:\n"
    '{"items":[ITEM...],"suggested_recipes":[RECIPE...]}\n\n'
    "ITEM fields:\n"
    '  {"name": str,\n'
    '   "count": float (discrete items) or 1 (bulk — use portion_g for grams),\n'
    '   "portion_g": float (grams; per-item for discrete, total for bulk),\n'
    '   "confidence": float 0..1,\n'
    '   "recipe_id": str (best match from KNOWN RECIPES or empty string),\n'
    '   "category": one of ["protein","pastry","produce","beverages","dairy","sundries"]}\n\n'
    "SUGGESTED_RECIPE fields (only when recipe_id is empty):\n"
    '  {"suggested_id": str (slug "rec-new-<kebab>"),\n'
    '   "name": str, "portion_g": float, "cost": float (USD per portion),\n'
    '   "category": str, "rationale": str (one short sentence)}\n\n'
    "If nothing recognisable is in frame, return {\"items\":[],\"suggested_recipes\":[]}."
)
_KNOWN_RECIPES = [
    {"recipe_id": "rec-muffin-bb", "name": "Blueberry Muffin", "portion_g": 95, "cost": 1.25, "category": "pastry"},
    {"recipe_id": "rec-muffin-choc", "name": "Chocolate Muffin", "portion_g": 100, "cost": 1.35, "category": "pastry"},
    {"recipe_id": "rec-croissant", "name": "Croissant", "portion_g": 80, "cost": 1.05, "category": "pastry"},
    {"recipe_id": "rec-bagel-plain", "name": "Bagel (Plain)", "portion_g": 110, "cost": 0.85, "category": "pastry"},
    {"recipe_id": "rec-eggs-scr", "name": "Scrambled Eggs", "portion_g": 180, "cost": 1.10, "category": "protein"},
    {"recipe_id": "rec-bacon", "name": "Bacon", "portion_g": 60, "cost": 2.40, "category": "protein"},
    {"recipe_id": "rec-fruit-sal", "name": "Fruit Salad", "portion_g": 120, "cost": 1.80, "category": "produce"},
    {"recipe_id": "rec-pancake", "name": "Pancake", "portion_g": 120, "cost": 0.95, "category": "pastry"},
    {"recipe_id": "rec-sausage", "name": "Breakfast Sausage", "portion_g": 55, "cost": 1.50, "category": "protein"},
    {"recipe_id": "rec-potato", "name": "Roasted Potatoes", "portion_g": 140, "cost": 0.70, "category": "produce"},
]

# iter213 · Categories used for the buffet cost breakdown (Feature 1)
_CATEGORIES = ("protein", "pastry", "produce", "beverages", "dairy", "sundries")


def _recipes_catalog() -> List[Dict[str, Any]]:
    """Merged recipe catalog: built-in stub + chef-approved suggestions persisted
    in `waste_suggested_recipes` with status='approved'. Returning a fresh list
    keeps category+cost lookups consistent across the module."""
    approved = list(db["waste_suggested_recipes"].find(
        {"status": "approved"}, {"_id": 0}
    ))
    out = list(_KNOWN_RECIPES)
    for r in approved:
        out.append({
            "recipe_id": r["recipe_id"], "name": r["name"],
            "portion_g": float(r.get("portion_g") or 100),
            "cost": float(r.get("cost") or 0),
            "category": r.get("category") or "sundries",
        })
    return out


def _category_for(recipe_id: Optional[str]) -> str:
    if not recipe_id: return "sundries"
    for r in _recipes_catalog():
        if r["recipe_id"] == recipe_id:
            return r.get("category") or "sundries"
    return "sundries"


def _bucket_breakdown(items: List[Dict[str, Any]]) -> Dict[str, float]:
    """Sum total_cost by category."""
    out: Dict[str, float] = {c: 0.0 for c in _CATEGORIES}
    for it in items or []:
        cat = (it.get("category") or _category_for(it.get("recipe_id")) or "sundries").lower()
        if cat not in out: cat = "sundries"
        out[cat] = round(out[cat] + float(it.get("total_cost") or 0), 2)
    return out


async def _run_vision_llm(media_base64: str) -> Optional[Dict[str, Any]]:
    """Send the image to Claude Sonnet 4.5 (vision) and parse the JSON response.
    Returns `{"items":[...], "suggested_recipes":[...]}` or None on any failure
    (caller falls back to stub)."""
    catalog = _recipes_catalog()
    recipes_ctx = "\n".join(
        f"- {r['recipe_id']}: {r['name']} ({r['portion_g']}g, ~${r['cost']}, {r.get('category','sundries')})"
        for r in catalog
    )
    prompt = (
        f"KNOWN RECIPES (map each detection to the closest, or leave recipe_id empty "
        f"AND add a suggested_recipes entry):\n"
        f"{recipes_ctx}\n\n"
        f"Return JSON now for the image."
    )
    result = None
    async with log_llm("vision_llm", system=_VISION_SYSTEM, user=prompt,
                        provider="anthropic", model="claude-sonnet-4-5") as _ctx:
        result = await ask_echo_vision(_VISION_SYSTEM, prompt, [media_base64], session_prefix="echowaste-vision")
        _ctx["response"] = result
    if result["mode"] != "llm" or not result.get("text"):
        log_event("vision_llm_no_result",
                  inputs={"media_bytes": len(media_base64 or "") * 3 // 4},
                  outputs={"reason": result.get("mode"), "error": result.get("error")})
        return None
    txt = result["text"].strip()
    # Strip ```json fences if the model added them
    if txt.startswith("```"):
        txt = re.sub(r"^```(?:json)?\s*|\s*```$", "", txt, flags=re.MULTILINE).strip()
    try:
        data = json.loads(txt)
    except Exception:
        m = re.search(r"\{.*\}", txt, re.DOTALL)
        if not m:
            return None
        try:
            data = json.loads(m.group(0))
        except Exception:
            return None
    items_in = data.get("items") if isinstance(data, dict) else None
    if not isinstance(items_in, list):
        return None
    suggestions_in = data.get("suggested_recipes") if isinstance(data, dict) else []
    if not isinstance(suggestions_in, list):
        suggestions_in = []

    recipe_by_id = {r["recipe_id"]: r for r in catalog}
    out_items: List[Dict[str, Any]] = []
    for raw in items_in[:20]:
        if not isinstance(raw, dict):
            continue
        name = str(raw.get("name") or "Unknown").strip()[:80]
        try: count = float(raw.get("count") or 1)
        except Exception: count = 1.0
        try: confidence = float(raw.get("confidence") or 0.70)
        except Exception: confidence = 0.70
        rid = str(raw.get("recipe_id") or "").strip()
        rec = recipe_by_id.get(rid)
        portion_g = float(rec["portion_g"]) if rec else float(raw.get("portion_g") or 100)
        cost_per_unit = float(rec["cost"]) if rec else 0.0
        category = (rec.get("category") if rec else raw.get("category")) or "sundries"
        out_items.append({
            "item_id": f"itm-{uuid.uuid4().hex[:10]}",
            "recipe_id": rid or None,
            "name": name,
            "count": count,
            "unit": "portion",
            "portion_g": portion_g,
            "cost_per_unit": cost_per_unit,
            "total_cost": round(count * cost_per_unit, 2),
            "total_weight_g": round(count * portion_g, 1),
            "confidence": round(confidence, 3),
            "category": str(category).lower(),
            "source": "vision_llm:claude-sonnet-4-5",
            "is_unknown": rid == "" or rec is None,
        })

    out_suggestions: List[Dict[str, Any]] = []
    for raw in suggestions_in[:10]:
        if not isinstance(raw, dict): continue
        name = str(raw.get("name") or "").strip()[:80]
        if not name: continue
        slug_base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:40] or "suggested"
        sid = str(raw.get("suggested_id") or f"rec-new-{slug_base}").strip()[:80]
        try: portion_g = float(raw.get("portion_g") or 100)
        except Exception: portion_g = 100.0
        try: cost = float(raw.get("cost") or 0)
        except Exception: cost = 0.0
        cat = str(raw.get("category") or "sundries").lower()
        if cat not in _CATEGORIES: cat = "sundries"
        out_suggestions.append({
            "suggested_id": sid, "name": name, "portion_g": portion_g,
            "cost": round(cost, 2), "category": cat,
            "rationale": str(raw.get("rationale") or "").strip()[:200],
        })

    if not out_items and not out_suggestions:
        return None
    return {"items": out_items, "suggested_recipes": out_suggestions}


# ═══════════════════════ VISION STUB (fallback) ════════════════════════════
# Deterministic stub so the whole chain is testable without live LLM calls.
# Replace with real vision (Nano Banana / GPT Image 1) via lib.llm.ask_echo
# once William green-lights the integration.
_STUB_COMMODITIES = [
    {"name": "Blueberry Muffin", "recipe_id": "rec-muffin-bb", "portion_g": 95, "cost": 1.25},
    {"name": "Bagel (Plain)", "recipe_id": "rec-bagel-plain", "portion_g": 110, "cost": 0.85},
    {"name": "Scrambled Eggs", "recipe_id": "rec-eggs-scr", "portion_g": 180, "cost": 1.10},
    {"name": "Bacon", "recipe_id": "rec-bacon", "portion_g": 60, "cost": 2.40},
    {"name": "Fruit Salad", "recipe_id": "rec-fruit-sal", "portion_g": 120, "cost": 1.80},
]


def _run_vision_stub(capture_id: str, mode: str) -> List[Dict[str, Any]]:
    """Deterministic detection based on capture_id hash. Simulates 1-3 items."""
    h = hashlib.sha256(capture_id.encode()).digest()
    pick_a = _STUB_COMMODITIES[h[0] % len(_STUB_COMMODITIES)]
    n_items = 1 + (h[1] % 3)
    items: List[Dict[str, Any]] = []
    for i in range(n_items):
        c = _STUB_COMMODITIES[(h[0] + i) % len(_STUB_COMMODITIES)]
        count = 1 + (h[2 + i] % 10)  # 1..10
        confidence = 0.72 + ((h[5 + i] % 28) / 100.0)  # 0.72..0.99
        items.append({
            "item_id": f"itm-{uuid.uuid4().hex[:10]}",
            "recipe_id": c["recipe_id"],
            "name": c["name"],
            "count": float(count),
            "unit": "portion",
            "portion_g": c["portion_g"],
            "cost_per_unit": c["cost"],
            "total_cost": round(count * c["cost"], 2),
            "total_weight_g": round(count * c["portion_g"], 1),
            "confidence": round(confidence, 3),
            "category": _category_for(c["recipe_id"]),
            "bounding_box": {"x": 10 + i * 60, "y": 20 + i * 40, "w": 80, "h": 80},
            "source": f"vision_stub:{mode}",
            "is_unknown": False,
        })
    _ = pick_a  # silence lint
    return items


def _persist_suggested_recipes(suggestions: List[Dict[str, Any]], entry_id: Optional[str],
                               user_id: Optional[str]) -> List[Dict[str, Any]]:
    """Persist AI-suggested recipes for chef approval. Dedup by suggested_id —
    if already exists (any status), bump occurrence_count + attach the entry ref."""
    saved: List[Dict[str, Any]] = []
    for s in suggestions or []:
        sid = s.get("suggested_id")
        if not sid: continue
        existing = db["waste_suggested_recipes"].find_one({"recipe_id": sid}, {"_id": 0})
        if existing:
            db["waste_suggested_recipes"].update_one(
                {"recipe_id": sid},
                {"$inc": {"occurrence_count": 1},
                 "$push": {"seen_on_entries": entry_id} if entry_id else {},
                 "$set": {"last_seen_at": utcnow_iso()}},
            )
            saved.append({**existing, "occurrence_count": int(existing.get("occurrence_count") or 1) + 1})
            continue
        doc = {
            "recipe_id": sid,
            "name": s.get("name"), "portion_g": float(s.get("portion_g") or 100),
            "cost": float(s.get("cost") or 0),
            "category": (s.get("category") or "sundries"),
            "rationale": s.get("rationale") or "",
            "status": "pending_chef_review",
            "occurrence_count": 1,
            "seen_on_entries": [entry_id] if entry_id else [],
            "suggested_by": "echo_ai3:vision",
            "suggested_by_user_id": user_id,
            "created_at": utcnow_iso(), "last_seen_at": utcnow_iso(),
        }
        db["waste_suggested_recipes"].insert_one(doc)
        saved.append(strip_id(doc))
    return saved


# ═══════════════════════ CAPTURE ENDPOINTS ═════════════════════════════════
@router.post("/capture/init")
def capture_init(body: CaptureInit):
    """Open a capture session — returns a capture_id for subsequent upload."""
    capture_id = f"cap-{uuid.uuid4().hex[:12]}"
    doc = {
        "capture_id": capture_id,
        "mode": body.mode,
        "user_id": body.user_id,
        "outlet_id": body.outlet_id,
        "station_id": body.station_id,
        "context": body.context or {},
        "status": "initialised",
        "created_at": utcnow_iso(),
    }
    db["waste_capture_telemetry"].insert_one(doc)
    return {"ok": True, "capture_id": capture_id, "status": "initialised"}


async def _analyse_and_write_entry(capture_id: str, mode: str,
                                   upload_meta: Dict[str, Any],
                                   media_base64: Optional[str] = None,
                                   client_id: Optional[str] = None,
                                   trace_id: Optional[str] = None,
                                   zones: Optional[List[Dict[str, Any]]] = None,
                                   outlet_id: Optional[str] = None,
                                   station_id: Optional[str] = None,
                                   user_id: Optional[str] = None,
                                   buffet_session_id: Optional[str] = None) -> Dict[str, Any]:
    """Shared logic: run vision (LLM first, stub fallback), create entry + items,
    emit timeline event. Honours v1.1 idempotency via `client_id`.
    iter213 · If `zones` are provided, each zone runs through its own vision pass,
    rolls up into `waste_capture_zones` and a combined entry."""
    # v1.1 · Idempotency
    if client_id:
        existing = db["waste_entries"].find_one({"client_id": client_id}, {"_id": 0})
        if existing:
            items = strip_ids(list(db["waste_items"].find({"entry_id": existing["entry_id"]})))
            return {"ok": True, "entry_id": existing["entry_id"], "items": items,
                    "total_cost": existing.get("total_cost", 0),
                    "total_weight_g": existing.get("total_weight_g", 0),
                    "idempotent_replay": True}

    # ── MULTI-ZONE PATH (iter213 Feature 3) ──────────────────────────────
    if zones and isinstance(zones, list) and len(zones) > 0:
        return await _analyse_multi_zone(
            capture_id, mode, upload_meta, zones, client_id, trace_id,
            outlet_id, station_id, user_id, buffet_session_id,
        )

    # ── SINGLE-ZONE PATH (original) ──────────────────────────────────────
    items: Optional[List[Dict[str, Any]]] = None
    suggestions: List[Dict[str, Any]] = []
    vision_mode = "stub"
    fingerprint_match: Optional[Dict[str, Any]] = None

    # iter216 · Fingerprint-first pre-check (short-circuits Sonnet on strong match)
    if media_base64 and _DEFAULT_FEATURE_FLAGS.get("feature.fingerprint_first", True):
        try:
            fp_hist = _hsv_histogram_from_base64(media_base64)
            if sum(fp_hist) > 0:
                q = FingerprintQuery(hsv_histogram=fp_hist,
                                      property_id=outlet_id, min_confidence=0.92, k=1)
                fpr = query_fingerprint(q)
                if fpr.get("matches"):
                    top = fpr["matches"][0]
                    fingerprint_match = top
                    if float(top.get("similarity") or 0) >= 0.94:
                        # Strong match — skip Sonnet, return from library
                        items = [{
                            "item_id": f"itm-{uuid.uuid4().hex[:10]}",
                            "recipe_id": top["recipe_id"], "name": top["name"],
                            "count": 1.0, "unit": "portion",
                            "portion_g": float(top["portion_g"]),
                            "cost_per_unit": float(top["cost"]),
                            "total_cost": round(float(top["cost"]), 2),
                            "total_weight_g": float(top["portion_g"]),
                            "confidence": float(top["similarity"]),
                            "category": top.get("category") or "sundries",
                            "source": f"fingerprint:{top['match_source']}",
                            "is_unknown": False,
                        }]
                        vision_mode = f"fingerprint_{top['match_source']}"
                        log_event("fingerprint_short_circuit", capture_id=capture_id,
                                  outputs={"similarity": top["similarity"],
                                            "match_source": top["match_source"],
                                            "recipe_id": top["recipe_id"]})
        except Exception as _fe:
            log_event("fingerprint_prequery_error", capture_id=capture_id,
                      outputs={"error": str(_fe)[:200]})

    if items is None and media_base64 and _DEFAULT_FEATURE_FLAGS.get("feature.vision_llm", True):
        vr = await _run_vision_llm(media_base64)
        if vr and vr.get("items"):
            items = vr["items"]
            suggestions = vr.get("suggested_recipes") or []
            vision_mode = "llm"
            # iter216 · Shadow-mode self-teaching · contribute fingerprints after Sonnet
            try:
                _maybe_auto_contribute_fingerprints(items, media_base64, outlet_id, capture_id)
            except Exception as _ce:
                log_event("fingerprint_contribute_error", capture_id=capture_id,
                          outputs={"error": str(_ce)[:200]})
    if not items:
        # iter215 · No mocks in production path
        if _DEFAULT_FEATURE_FLAGS.get("feature.vision_llm", True) and media_base64:
            # Vision was attempted but returned nothing — fail loudly so the
            # operator test surfaces the real error instead of silent stubs.
            log_event("vision_failed_no_stub",
                      capture_id=capture_id,
                      inputs={"mode": mode, "media_bytes": len(media_base64 or "") * 3 // 4},
                      outputs={"message": "LLM returned no items; production mode refuses to stub"})
            raise HTTPException(status_code=502,
                                detail="Vision analysis unavailable — Claude returned no usable items. "
                                       "Check /api/waste/logs for details.")
        # Stub only permitted when vision_llm flag is explicitly off OR no media provided
        items = _run_vision_stub(capture_id, mode)

    total_cost = round(sum(i["total_cost"] for i in items), 2)
    total_weight = round(sum(i["total_weight_g"] for i in items), 1)

    # iter212 · Flag low-confidence items for human review
    threshold = _confidence_threshold_for("default")
    low_conf_count = 0
    for it in items:
        if float(it.get("confidence") or 0) < threshold:
            it["needs_review"] = True; low_conf_count += 1
        else:
            it["needs_review"] = False

    entry_id = f"wen-{uuid.uuid4().hex[:12]}"
    # Persist suggested recipes (chef-approval queue)
    saved_suggestions = _persist_suggested_recipes(suggestions, entry_id, user_id) if suggestions else []

    entry = {
        "entry_id": entry_id, "capture_id": capture_id,
        "client_id": client_id, "trace_id": trace_id,
        "mode": mode, "vision_mode": vision_mode,
        "outlet_id": outlet_id, "station_id": station_id, "user_id": user_id,
        "buffet_session_id": buffet_session_id,
        "total_items": len(items),
        "total_weight_g": total_weight,
        "total_cost": total_cost,
        "low_confidence_count": low_conf_count,
        "confidence_threshold": threshold,
        "suggested_recipes_count": len(saved_suggestions),
        "cost_breakdown": _bucket_breakdown(items),
        "status": "needs_review" if (low_conf_count > 0 or saved_suggestions) else "pending_review",
        "created_at": utcnow_iso(),
        **upload_meta,
    }
    db["waste_entries"].insert_one(entry)
    for it in items:
        it["entry_id"] = entry_id
        it["capture_id"] = capture_id
        it["created_at"] = utcnow_iso()
        db["waste_items"].insert_one(it)

    try:
        from lib.timeline import emit as _tl
        _tl("waste.entry_created",
            actor={"type": "system", "id": "echowaste", "name": "EchoWaste"},
            entity_refs=[{"kind": "waste_entry", "id": entry_id, "name": f"{len(items)} items · ${total_cost}"}],
            payload={"total_cost": total_cost, "total_weight_g": total_weight,
                     "item_count": len(items), "mode": mode, "vision_mode": vision_mode,
                     "trace_id": trace_id, "suggested_recipes_count": len(saved_suggestions)})
    except Exception:
        pass

    strip_id(entry)
    return {"ok": True, "entry_id": entry_id, "items": strip_ids(items),
            "total_cost": total_cost, "total_weight_g": total_weight,
            "vision_mode": vision_mode,
            "cost_breakdown": entry["cost_breakdown"],
            "suggested_recipes": saved_suggestions,
            "needs_review": low_conf_count > 0 or bool(saved_suggestions)}


async def _analyse_multi_zone(capture_id: str, mode: str, upload_meta: Dict[str, Any],
                              zones: List[Dict[str, Any]], client_id: Optional[str],
                              trace_id: Optional[str], outlet_id: Optional[str],
                              station_id: Optional[str], user_id: Optional[str],
                              buffet_session_id: Optional[str]) -> Dict[str, Any]:
    """Feature 3 · process each zone through vision, roll up to a single entry
    with N zone sub-rows in `waste_capture_zones`."""
    import datetime as _dt
    entry_id = f"wen-{uuid.uuid4().hex[:12]}"
    now = utcnow_iso()
    threshold = _confidence_threshold_for("default")

    # Auto-name helper (see wireframe 10)
    def _auto_name(idx: int) -> str:
        oc = (outlet_id or "UNK").upper().replace(" ", "")[:4]
        sc = (station_id or "UNK").upper().replace(" ", "")[:5]
        d = _dt.datetime.utcnow().strftime("%Y%m%d")
        t = _dt.datetime.utcnow().strftime("%H%M")
        return f"{oc}-{sc}-{d}-{t}-{idx:02d}"

    all_items: List[Dict[str, Any]] = []
    all_suggestions: List[Dict[str, Any]] = []
    zone_rows: List[Dict[str, Any]] = []
    any_llm = False

    for i, z in enumerate(zones, start=1):
        z_b64 = z.get("media_base64") or z.get("video_base64")
        z_items: Optional[List[Dict[str, Any]]] = None
        z_mode = "stub"
        if z_b64 and _DEFAULT_FEATURE_FLAGS.get("feature.vision_llm", True):
            vr = await _run_vision_llm(z_b64)
            if vr and vr.get("items"):
                z_items = vr["items"]; any_llm = True; z_mode = "llm"
                all_suggestions.extend(vr.get("suggested_recipes") or [])
        if not z_items:
            z_items = _run_vision_stub(f"{capture_id}:z{i}", mode)

        z_name_raw = str(z.get("zone_name") or "").strip()[:40]
        z_name = z_name_raw or _auto_name(i)
        z_source = "user" if z_name_raw else "auto_generated"
        z_total_cost = round(sum(float(it.get("total_cost") or 0) for it in z_items), 2)
        z_total_weight = round(sum(float(it.get("total_weight_g") or 0) for it in z_items), 1)

        zone_id = f"zon-{uuid.uuid4().hex[:10]}"
        for it in z_items:
            it["zone_id"] = zone_id
            if float(it.get("confidence") or 0) < threshold:
                it["needs_review"] = True
            else:
                it["needs_review"] = False
            all_items.append(it)

        zone_rows.append({
            "zone_id": zone_id, "entry_id": entry_id,
            "zone_order": i, "zone_name": z_name, "zone_name_source": z_source,
            "media_url": z.get("media_url"),
            "total_weight_g": z_total_weight, "total_value_usd": z_total_cost,
            "item_count": len(z_items), "vision_mode": z_mode,
            "created_at": now,
        })

    total_cost = round(sum(r["total_value_usd"] for r in zone_rows), 2)
    total_weight = round(sum(r["total_weight_g"] for r in zone_rows), 1)
    low_conf = sum(1 for it in all_items if it.get("needs_review"))

    saved_suggestions = _persist_suggested_recipes(all_suggestions, entry_id, user_id) if all_suggestions else []

    entry = {
        "entry_id": entry_id, "capture_id": capture_id,
        "client_id": client_id, "trace_id": trace_id,
        "mode": mode, "vision_mode": "multi_zone_llm" if any_llm else "multi_zone_stub",
        "outlet_id": outlet_id, "station_id": station_id, "user_id": user_id,
        "buffet_session_id": buffet_session_id,
        "total_items": len(all_items),
        "total_weight_g": total_weight, "total_cost": total_cost,
        "low_confidence_count": low_conf, "confidence_threshold": threshold,
        "suggested_recipes_count": len(saved_suggestions),
        "cost_breakdown": _bucket_breakdown(all_items),
        "zone_count": len(zone_rows),
        "status": "needs_review" if (low_conf > 0 or saved_suggestions) else "pending_review",
        "created_at": now, **upload_meta,
    }
    db["waste_entries"].insert_one(entry)
    for row in zone_rows:
        db["waste_capture_zones"].insert_one(row)
    for it in all_items:
        it["entry_id"] = entry_id; it["capture_id"] = capture_id
        it["created_at"] = now
        db["waste_items"].insert_one(it)

    strip_id(entry)
    return {"ok": True, "entry_id": entry_id, "items": strip_ids(all_items),
            "zones": strip_ids(zone_rows), "zone_count": len(zone_rows),
            "total_cost": total_cost, "total_weight_g": total_weight,
            "vision_mode": entry["vision_mode"],
            "cost_breakdown": entry["cost_breakdown"],
            "suggested_recipes": saved_suggestions,
            "needs_review": low_conf > 0 or bool(saved_suggestions)}


@router.post("/capture/video")
async def capture_video(body: CaptureUpload, idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")):
    db["waste_capture_telemetry"].update_one(
        {"capture_id": body.capture_id},
        {"$set": {"duration_ms": body.duration_ms, "frame_count": body.frame_count,
                  "telemetry": body.telemetry or {}, "status": "uploaded",
                  "trace_id": body.trace_id}},
        upsert=False,
    )
    return await _analyse_and_write_entry(
        body.capture_id, "video",
        {"media_url": body.media_url, "telemetry": body.telemetry or {},
         "duration_ms": body.duration_ms},
        media_base64=body.media_base64,
        client_id=body.client_id or idempotency_key,
        trace_id=body.trace_id,
        zones=[z.model_dump() for z in body.zones] if body.zones else None,
        outlet_id=body.outlet_id, station_id=body.station_id, user_id=body.user_id,
        buffet_session_id=body.buffet_session_id,
    )


@router.post("/capture/still")
async def capture_still(body: CaptureUpload, idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")):
    return await _analyse_and_write_entry(
        body.capture_id, "still",
        {"media_url": body.media_url},
        media_base64=body.media_base64,
        client_id=body.client_id or idempotency_key,
        trace_id=body.trace_id,
        zones=[z.model_dump() for z in body.zones] if body.zones else None,
        outlet_id=body.outlet_id, station_id=body.station_id, user_id=body.user_id,
        buffet_session_id=body.buffet_session_id,
    )


@router.post("/capture/voice")
async def capture_voice(body: VoiceCapture, idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")):
    """iter212 · Voice capture with optional Whisper STT.

    - If `transcript` is provided, use it directly.
    - Else if `audio_base64` is provided AND feature.voice_whisper=on, transcribe
      via Emergent Whisper-1 and proceed.
    - Extract items deterministically by keyword matching against the stub
      commodity list (swap for real NLU in Phase 3)."""
    transcript = (body.transcript or "").strip()
    stt_mode = "text"
    stt_error: Optional[str] = None

    if not transcript and body.audio_base64 and _DEFAULT_FEATURE_FLAGS.get("feature.voice_whisper", True):
        import base64 as _b64
        try:
            raw = body.audio_base64
            if isinstance(raw, str) and raw.startswith("data:") and "," in raw:
                raw = raw.split(",", 1)[1]
            audio_bytes = _b64.b64decode(raw)
        except Exception as e:
            raise HTTPException(400, f"bad audio_base64: {e}")

        from lib.llm import transcribe_audio
        stt = await transcribe_audio(
            audio_bytes,
            filename=body.audio_filename or "audio.webm",
            language=body.language,
            prompt=", ".join(c["name"] for c in _KNOWN_RECIPES),
        )
        if stt["mode"] == "llm" and stt.get("text"):
            transcript = stt["text"]
            stt_mode = "whisper"
        else:
            stt_mode = f"failed_{stt['mode']}"
            stt_error = stt.get("error", "")

    if not transcript:
        raise HTTPException(400, "no transcript available (supply `transcript` or `audio_base64`)")

    # Idempotency replay
    client_id = body.client_id or idempotency_key
    if client_id:
        existing = db["waste_entries"].find_one({"client_id": client_id}, {"_id": 0})
        if existing:
            items = strip_ids(list(db["waste_items"].find({"entry_id": existing["entry_id"]})))
            return {"ok": True, "entry_id": existing["entry_id"], "items": items,
                    "transcript": existing.get("transcript", transcript),
                    "idempotent_replay": True}

    t_low = transcript.lower()
    found = [c for c in _KNOWN_RECIPES if c["name"].lower().split()[0] in t_low]
    items: List[Dict[str, Any]] = []
    for c in (found[:5] or _KNOWN_RECIPES[:1]):
        items.append({
            "item_id": f"itm-{uuid.uuid4().hex[:10]}",
            "recipe_id": c["recipe_id"], "name": c["name"],
            "count": 1.0, "unit": "portion",
            "portion_g": c["portion_g"], "cost_per_unit": c["cost"],
            "total_cost": c["cost"], "total_weight_g": c["portion_g"],
            "confidence": 0.72 if stt_mode == "whisper" else 0.70,
            "source": f"voice:{stt_mode}",
            "is_unknown": False, "needs_review": False,
        })
    total_cost = round(sum(i["total_cost"] for i in items), 2)
    total_weight = round(sum(i["total_weight_g"] for i in items), 1)
    entry_id = f"wen-{uuid.uuid4().hex[:12]}"
    db["waste_entries"].insert_one({
        "entry_id": entry_id, "capture_id": body.capture_id, "mode": "voice",
        "vision_mode": stt_mode,
        "client_id": client_id, "trace_id": body.trace_id,
        "total_items": len(items), "total_cost": total_cost, "total_weight_g": total_weight,
        "transcript": transcript, "stt_error": stt_error,
        "status": "pending_review", "created_at": utcnow_iso(),
    })
    for it in items:
        it["entry_id"] = entry_id
        it["created_at"] = utcnow_iso()
        db["waste_items"].insert_one(it)
    return {"ok": True, "entry_id": entry_id, "items": strip_ids(items),
            "total_cost": total_cost, "transcript": transcript, "stt_mode": stt_mode,
            **({"stt_error": stt_error} if stt_error else {})}


# ═══════════════════════ iter212 · Video MOT aggregation ═══════════════════
class VideoFrame(BaseModel):
    frame_index: int
    image_base64: str


class VideoMotCapture(BaseModel):
    capture_id: str
    frames: List[VideoFrame] = Field(default_factory=list)
    duration_ms: Optional[int] = None
    telemetry: Optional[Dict[str, Any]] = None
    client_id: Optional[str] = None
    trace_id: Optional[str] = None
    max_frames: Optional[int] = None           # iter223 · override cap (4..16)


@router.post("/capture/video-mot")
async def capture_video_mot(body: VideoMotCapture, idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")):
    """iter212 · Multi-frame MOT (multi-object tracking) aggregation.

    Sends each keyframe through the vision LLM, then dedupes identical items
    across frames by recipe_id+name. Final counts = max per-item-count seen
    across frames (best-of-N), not sum — mirrors how a human would count if
    they panned a tray and noticed the same muffins in multiple frames.
    """
    client_id = body.client_id or idempotency_key
    if client_id:
        existing = db["waste_entries"].find_one({"client_id": client_id}, {"_id": 0})
        if existing:
            items = strip_ids(list(db["waste_items"].find({"entry_id": existing["entry_id"]})))
            return {"ok": True, "entry_id": existing["entry_id"], "items": items,
                    "frames_analysed": existing.get("frames_analysed", 0),
                    "idempotent_replay": True}

    # iter223 · Cap raised from 8→12 for higher frame coverage at faster pans
    # (William: "increase frame rate detect at higher speeds"). Caller can
    # still override via body.max_frames (bounded 4..16).
    _req_max = getattr(body, "max_frames", None)
    max_frames = max(4, min(16, int(_req_max))) if _req_max else 12
    frames = sorted(body.frames or [], key=lambda f: f.frame_index)[:max_frames]
    if not frames:
        raise HTTPException(400, "no frames provided")

    log_event("capture_video_mot_start",
              capture_id=body.capture_id,
              inputs={"frames_received": len(body.frames or []),
                       "frames_to_analyse": len(frames),
                       "duration_ms": body.duration_ms})

    best_by_key: Dict[str, Dict[str, Any]] = {}
    per_frame_counts: List[Dict[str, Any]] = []
    all_suggestions: List[Dict[str, Any]] = []
    frames_analysed = 0
    any_llm = False
    for f in frames:
        vr = await _run_vision_llm(f.image_base64)
        frames_analysed += 1
        frame_summary = {"frame_index": f.frame_index, "items_detected": 0, "total_count": 0}
        if not vr or not vr.get("items"):
            per_frame_counts.append(frame_summary)
            continue
        any_llm = True
        frame_summary["items_detected"] = len(vr["items"])
        frame_summary["total_count"] = sum(float(it.get("count") or 0) for it in vr["items"])
        all_suggestions.extend(vr.get("suggested_recipes") or [])
        for it in vr["items"]:
            key = (it.get("recipe_id") or "") + "|" + (it.get("name") or "").lower()
            prev = best_by_key.get(key)
            if not prev or float(it.get("count") or 0) > float(prev.get("count") or 0):
                best_by_key[key] = it
        per_frame_counts.append(frame_summary)

    items = list(best_by_key.values())
    if not items:
        # iter215 · No stub fallback in production
        log_event("capture_video_mot_no_items",
                  capture_id=body.capture_id,
                  inputs={"frames_analysed": frames_analysed},
                  outputs={"message": "no items detected across all frames"})
        raise HTTPException(502, f"Vision returned no items across {frames_analysed} frames. "
                                 "Check /api/waste/logs?capture_id={body.capture_id}")

    # iter216 · Shadow-mode self-teaching · contribute fingerprints from first frame
    try:
        if frames and any_llm:
            _maybe_auto_contribute_fingerprints(
                items, frames[0].image_base64, None, body.capture_id)
    except Exception as _ce:
        log_event("fingerprint_contribute_error", capture_id=body.capture_id,
                  outputs={"error": str(_ce)[:200]})

    vision_mode = "video_mot_llm" if any_llm else "video_mot_stub"
    result = await _write_mot_entry(body.capture_id, items, vision_mode,
                                     frames_analysed, client_id, body.trace_id,
                                     {"duration_ms": body.duration_ms,
                                      "telemetry": body.telemetry or {},
                                      "frames_total": len(body.frames or []),
                                      "frames_analysed": frames_analysed,
                                      "per_frame_counts": per_frame_counts},
                                     suggestions=all_suggestions)
    # Final MOT log
    log_event("capture_video_mot_done",
              capture_id=body.capture_id, entry_id=result.get("entry_id"),
              inputs={"frames_analysed": frames_analysed, "max_frames": max_frames},
              outputs={"total_items": len(items), "total_cost": result.get("total_cost"),
                        "vision_mode": vision_mode, "per_frame_counts": per_frame_counts,
                        "suggested_recipes_count": len(all_suggestions)})
    return result


async def _write_mot_entry(capture_id: str, items: List[Dict[str, Any]], vision_mode: str,
                            frames_analysed: int, client_id: Optional[str],
                            trace_id: Optional[str], meta: Dict[str, Any],
                            suggestions: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    # Recompute costs with threshold marker
    total_cost = round(sum(i["total_cost"] for i in items), 2)
    total_weight = round(sum(i["total_weight_g"] for i in items), 1)
    threshold = _confidence_threshold_for("default")
    low_conf = 0
    for it in items:
        if float(it.get("confidence") or 0) < threshold:
            it["needs_review"] = True; low_conf += 1
        else:
            it["needs_review"] = False

    entry_id = f"wen-{uuid.uuid4().hex[:12]}"
    saved_suggestions = _persist_suggested_recipes(suggestions or [], entry_id, None) if suggestions else []
    entry = {
        "entry_id": entry_id, "capture_id": capture_id, "client_id": client_id,
        "trace_id": trace_id, "mode": "video", "vision_mode": vision_mode,
        "total_items": len(items), "total_cost": total_cost, "total_weight_g": total_weight,
        "low_confidence_count": low_conf, "confidence_threshold": threshold,
        "suggested_recipes_count": len(saved_suggestions),
        "cost_breakdown": _bucket_breakdown(items),
        "frames_analysed": frames_analysed,
        "status": "needs_review" if (low_conf > 0 or saved_suggestions) else "pending_review",
        "created_at": utcnow_iso(), **meta,
    }
    db["waste_entries"].insert_one(entry)
    for it in items:
        it["entry_id"] = entry_id
        it["capture_id"] = capture_id
        it["created_at"] = utcnow_iso()
        db["waste_items"].insert_one(it)
    try:
        from lib.timeline import emit as _tl
        _tl("waste.entry_created",
            actor={"type": "system", "id": "echowaste", "name": "EchoWaste"},
            entity_refs=[{"kind": "waste_entry", "id": entry_id, "name": f"video MOT · {len(items)} items · ${total_cost}"}],
            payload={"total_cost": total_cost, "item_count": len(items),
                     "mode": "video", "vision_mode": vision_mode, "frames_analysed": frames_analysed,
                     "trace_id": trace_id})
    except Exception:
        pass
    strip_id(entry)
    return {"ok": True, "entry_id": entry_id, "items": strip_ids(items),
            "total_cost": total_cost, "total_weight_g": total_weight,
            "vision_mode": vision_mode, "frames_analysed": frames_analysed,
            "low_confidence_count": low_conf,
            "cost_breakdown": entry["cost_breakdown"],
            "suggested_recipes": saved_suggestions}


# iter212 · Admin endpoint to tune the confidence threshold per property
class ThresholdBody(BaseModel):
    property_id: str = "default"
    threshold: float = Field(..., ge=0.0, le=1.0)


@router.put("/feature-flags/threshold", dependencies=[Depends(require_admin_token)])
def set_threshold(body: ThresholdBody):
    db["waste_feature_flags"].update_one(
        {"property_id": body.property_id},
        {"$set": {"vision_llm_confidence_threshold": body.threshold,
                  "updated_at": utcnow_iso()}},
        upsert=True,
    )
    return {"ok": True, "property_id": body.property_id, "threshold": body.threshold}


# ═══════════════════════ ENTRIES ═══════════════════════════════════════════
@router.get("/entries")
def list_entries(limit: int = Query(50, ge=1, le=500), offset: int = 0,
                 status: Optional[str] = None, mode: Optional[str] = None):
    q: Dict[str, Any] = {}
    if status: q["status"] = status
    if mode: q["mode"] = mode
    rows = list(db["waste_entries"].find(q).sort("created_at", -1).skip(offset).limit(limit))
    total = db["waste_entries"].count_documents(q)
    return {"ok": True, "total": total, "offset": offset, "entries": strip_ids(rows)}


@router.get("/entries/{entry_id}")
def get_entry(entry_id: str):
    e = strip_id(db["waste_entries"].find_one({"entry_id": entry_id}))
    if not e:
        raise HTTPException(404, "entry not found")
    items = strip_ids(list(db["waste_items"].find({"entry_id": entry_id})))
    return {"ok": True, "entry": e, "items": items}


@router.patch("/items/{item_id}")
def correct_item(item_id: str, body: ItemCorrection):
    """Update an item (user correction). Writes a paired training_feedback row."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "no fields to update")
    current = db["waste_items"].find_one({"item_id": item_id})
    if not current:
        raise HTTPException(404, "item not found")
    if body.recipe_id:
        # Recompute cost from commodity table if recipe changes
        for c in _STUB_COMMODITIES:
            if c["recipe_id"] == body.recipe_id:
                updates["cost_per_unit"] = c["cost"]
                updates["portion_g"] = c["portion_g"]
                cnt = body.count if body.count is not None else float(current.get("count") or 1)
                updates["total_cost"] = round(cnt * c["cost"], 2)
                updates["total_weight_g"] = round(cnt * c["portion_g"], 1)
                break
    updates["updated_at"] = utcnow_iso()
    db["waste_items"].update_one({"item_id": item_id}, {"$set": updates})

    # Record training feedback for retraining
    db["waste_training_feedback"].insert_one({
        "feedback_id": f"fb-{uuid.uuid4().hex[:10]}",
        "entry_id": current.get("entry_id"),
        "item_id": item_id,
        "before": {k: current.get(k) for k in ["recipe_id", "name", "count", "portion_g"]},
        "after": updates,
        "created_at": utcnow_iso(),
    })
    fresh = strip_id(db["waste_items"].find_one({"item_id": item_id}))
    return {"ok": True, "item": fresh}


@router.post("/items/manual")
def add_manual_item(body: ManualItem):
    item = {
        "item_id": f"itm-{uuid.uuid4().hex[:10]}",
        "entry_id": None,
        "recipe_id": body.recipe_id,
        "name": body.name, "count": body.count, "unit": body.unit,
        "portion_g": body.portion_g,
        "reason_code": body.reason_code,
        "station_id": body.station_id, "outlet_id": body.outlet_id, "user_id": body.user_id,
        "source": "manual",
        "created_at": utcnow_iso(),
    }
    db["waste_items"].insert_one(item)
    return {"ok": True, "item": strip_id(item)}


# ═══════════════════════ RECIPES / CONTEXT ═════════════════════════════════
@router.get("/recipes/match")
def match_recipe(q: str = Query(..., min_length=1)):
    """Case-insensitive partial match against the stub commodity table until
    we wire into LUCCCA's recipe master."""
    ql = q.lower()
    matches = [c for c in _STUB_COMMODITIES if ql in c["name"].lower() or ql in c["recipe_id"].lower()]
    return {"ok": True, "q": q, "matches": matches}


@router.get("/context/current")
def current_context(user_id: Optional[str] = None, outlet_id: Optional[str] = None):
    """User/outlet context resolver — returns current shift + station hint.
    Phase 1: lookup in LUCCCA core staff/outlets; stub for now."""
    now = utcnow_iso()
    return {"ok": True, "user_id": user_id or "demo-user",
            "outlet_id": outlet_id or "outlet-main",
            "station_id": "station-buffet-1",
            "current_service": "breakfast",
            "resolved_at": now}


# ═══════════════════════ BUFFET SESSIONS (iter213 · v1.2 F1+F2) ════════════
def _forecast_covers_for(outlet_id: Optional[str], service_name: str,
                          service_date: Optional[str]) -> Dict[str, Any]:
    """Real-data cover forecast using `calendar_events.guest_count` (no stub).
    Returns `{forecast_covers, group_block_covers, sources: [{id, title, guest_count}]}`.
    If nothing is scheduled, returns forecast_covers=0 — callers should display
    "no forecast" rather than fabricate."""
    from datetime import datetime, timedelta
    date = service_date or datetime.utcnow().strftime("%Y-%m-%d")
    # ±1 day window since calendar_events stores full datetimes
    start_of_day = f"{date}T00:00:00"
    end_of_day = f"{date}T23:59:59"
    q: Dict[str, Any] = {"start": {"$gte": start_of_day, "$lte": end_of_day}}
    if outlet_id:
        # outlet_id may appear in `location` or as a field; match loosely
        q["$or"] = [{"outlet_id": outlet_id}, {"location": outlet_id}]
    events = list(db["calendar_events"].find(q, {"_id": 0}))
    # Service-name heuristic (breakfast/lunch/dinner) — filter by title/package
    svc = (service_name or "").lower()
    scoped: List[Dict[str, Any]] = []
    for e in events:
        title = (e.get("title") or "").lower() + " " + (e.get("package") or "").lower()
        if not svc or svc in title or svc == (e.get("daypart") or "").lower():
            scoped.append(e)
    group_block = sum(int(e.get("guest_count") or 0) for e in scoped)
    sources = [{"id": e.get("id"), "title": e.get("title"),
                "guest_count": int(e.get("guest_count") or 0)} for e in scoped if e.get("guest_count")]
    return {
        "forecast_covers": group_block,  # until a Prophet hook is wired, use the real group block
        "group_block_covers": group_block,
        "sources": sources,
        "generated_from": "calendar_events",
        "service_date": date,
    }


def _historical_comparison(outlet_id: Optional[str], service_name: str) -> Dict[str, Any]:
    """Last 4 similar buffet sessions → avg set cost + avg cost-per-cover."""
    q: Dict[str, Any] = {"status": "closed", "service_name": service_name}
    if outlet_id: q["outlet_id"] = outlet_id
    rows = list(db["waste_buffet_sessions"].find(q, {"_id": 0}).sort("closed_at", -1).limit(4))
    if not rows:
        return {"sample_size": 0}
    set_costs = [float(r.get("set_cost_usd") or 0) for r in rows if r.get("set_cost_usd")]
    per_covers = [float(r.get("cost_per_cover_total_usd") or 0) for r in rows
                  if r.get("cost_per_cover_total_usd")]
    return {
        "sample_size": len(rows),
        "avg_set_cost_usd": round(sum(set_costs) / len(set_costs), 2) if set_costs else None,
        "avg_cost_per_cover_usd": round(sum(per_covers) / len(per_covers), 4) if per_covers else None,
    }


def _rollup_session_costs(session_id: str) -> Dict[str, Any]:
    """Recompute set/close/refill/cost-per-cover from linked entries. Single
    source of truth for Feature 1+2 numbers — called on set, close, and
    guest_count updates."""
    sess = db["waste_buffet_sessions"].find_one({"session_id": session_id})
    if not sess:
        return {}
    # Aggregate from linked entries
    set_cost = 0.0; set_breakdown: Dict[str, float] = {c: 0.0 for c in _CATEGORIES}
    close_cost = 0.0
    refill_cost = 0.0; refill_count = 0
    set_entry_id = sess.get("set_entry_id")
    close_entry_id = sess.get("close_entry_id")
    set_items: List[Dict[str, Any]] = []
    if set_entry_id:
        se = db["waste_entries"].find_one({"entry_id": set_entry_id}, {"_id": 0}) or {}
        set_cost = float(se.get("total_cost") or 0)
        set_items = list(db["waste_items"].find({"entry_id": set_entry_id}, {"_id": 0}))
        set_breakdown = se.get("cost_breakdown") or _bucket_breakdown(set_items)
    if close_entry_id:
        ce = db["waste_entries"].find_one({"entry_id": close_entry_id}, {"_id": 0}) or {}
        close_cost = float(ce.get("total_cost") or 0)
    for e in db["waste_entries"].find({"buffet_session_id": session_id,
                                        "mode": {"$in": ["buffet_refill"]}}):
        refill_cost += float(e.get("total_cost") or 0)
        refill_count += 1

    consumed_cost = round(set_cost + refill_cost - close_cost, 2)
    guest_count = int(sess.get("guest_count") or 0)
    cpcc = cpcw = cpct = waste_pct = None
    if guest_count > 0:
        cpcc = round(consumed_cost / guest_count, 4)
        cpcw = round(close_cost / guest_count, 4)
        cpct = round((set_cost + refill_cost) / guest_count, 4) if (set_cost + refill_cost) > 0 else 0
    if (set_cost + refill_cost) > 0:
        waste_pct = round((close_cost / (set_cost + refill_cost)) * 100, 2)

    # Estimated covers at setup — total weight / typical per-cover grams (280g)
    total_weight = sum(float(it.get("total_weight_g") or 0) for it in set_items)
    est_covers = int(total_weight / 280) if total_weight > 0 else 0
    forecast = sess.get("forecast_covers") or 0
    overcover_ratio = None
    if forecast and est_covers:
        overcover_ratio = round(est_covers / forecast - 1, 3)

    updates = {
        "set_cost_usd": round(set_cost, 2),
        "set_cost_breakdown": {k: round(v, 2) for k, v in set_breakdown.items()},
        "refill_cost_usd": round(refill_cost, 2),
        "refill_count": refill_count,
        "close_cost_usd": round(close_cost, 2),
        "consumed_cost_usd": consumed_cost,
        "cost_per_cover_consumed_usd": cpcc,
        "cost_per_cover_wasted_usd": cpcw,
        "cost_per_cover_total_usd": cpct,
        "waste_pct": waste_pct,
        "estimated_covers_at_setup": est_covers,
        "setup_overcover_ratio": overcover_ratio,
        "last_rolled_up_at": utcnow_iso(),
    }
    db["waste_buffet_sessions"].update_one({"session_id": session_id}, {"$set": updates})
    merged = {**(sess or {}), **updates}
    strip_id(merged)
    merged["historical_comparison"] = _historical_comparison(sess.get("outlet_id"), sess.get("service_name"))
    return merged


@router.post("/buffet/set")
def buffet_set(body: BuffetSetStart):
    """Start a buffet session — pair the 'set' capture with subsequent 'close'.
    iter213 · also attaches the analysed entry_id (if provided), pulls the
    real-data forecast from calendar_events, and returns the pre-cost waterfall."""
    session_id = f"bfs-{uuid.uuid4().hex[:12]}"
    service_date = body.service_date or utcnow_iso()[:10]
    fc = _forecast_covers_for(body.outlet_id, body.service_name, service_date)

    # Derive set_entry_id: either explicit, or look up by capture_id
    set_entry = None
    if body.entry_id:
        set_entry = db["waste_entries"].find_one({"entry_id": body.entry_id}, {"_id": 0})
    elif body.capture_id:
        set_entry = db["waste_entries"].find_one({"capture_id": body.capture_id}, {"_id": 0})

    doc = {
        "session_id": session_id,
        "outlet_id": body.outlet_id,
        "service_name": body.service_name,
        "service_date": service_date,
        "set_capture_id": body.capture_id,
        "set_entry_id": (set_entry or {}).get("entry_id") if set_entry else None,
        "forecast_covers": fc.get("forecast_covers"),
        "forecast_sources": fc.get("sources"),
        "group_block_covers": fc.get("group_block_covers"),
        "status": "open",
        "started_at": utcnow_iso(),
    }
    db["waste_buffet_sessions"].insert_one(doc)

    # Back-link the set entry to the session (for refill/close aggregation)
    if doc["set_entry_id"]:
        db["waste_entries"].update_one(
            {"entry_id": doc["set_entry_id"]},
            {"$set": {"buffet_session_id": session_id}}
        )

    # Roll-up costs (populates set_cost_usd + breakdown + overcover ratio)
    full = _rollup_session_costs(session_id)
    strip_id(doc)
    return {"ok": True, "session_id": session_id, "session": full or doc,
            "forecast": fc}


@router.post("/buffet/close")
def buffet_close(body: BuffetClose):
    """Close a buffet session — attach close entry, recompute cost-per-cover.
    Does NOT force guest_count; caller must POST /buffet/{id}/guest-count for
    the full per-cover numbers."""
    sess = db["waste_buffet_sessions"].find_one({"session_id": body.session_id})
    if not sess:
        raise HTTPException(404, "session not found")

    close_entry = None
    if body.close_entry_id:
        close_entry = db["waste_entries"].find_one({"entry_id": body.close_entry_id}, {"_id": 0})
    elif body.close_capture_id:
        close_entry = db["waste_entries"].find_one({"capture_id": body.close_capture_id}, {"_id": 0})

    # Legacy consumed aggregation (pre-F1/F2) kept for backwards compat
    set_cap = sess.get("set_capture_id")
    def _agg(cap_id: str) -> Dict[str, float]:
        out: Dict[str, float] = {}
        for it in db["waste_items"].find({"capture_id": cap_id}, {"_id": 0}):
            rid = it.get("recipe_id") or "__unknown__"
            out[rid] = out.get(rid, 0.0) + float(it.get("count") or 0)
        return out
    before = _agg(set_cap)
    after = _agg(body.close_capture_id)
    consumed_counts = {k: max(0.0, before.get(k, 0) - after.get(k, 0)) for k in set(list(before) + list(after))}

    db["waste_buffet_sessions"].update_one({"session_id": body.session_id},
        {"$set": {"close_capture_id": body.close_capture_id,
                  "close_entry_id": (close_entry or {}).get("entry_id") if close_entry else None,
                  "status": "closed",
                  "closed_at": utcnow_iso(),
                  "consumed_counts": consumed_counts,
                  "waste_counts": {k: after.get(k, 0) for k in after}}})

    if close_entry and close_entry.get("entry_id"):
        db["waste_entries"].update_one(
            {"entry_id": close_entry["entry_id"]},
            {"$set": {"buffet_session_id": body.session_id}}
        )

    full = _rollup_session_costs(body.session_id)
    # iter214 · Fire waste-digest SMS to subscribed chefs
    digest = _emit_buffet_close_digest(body.session_id)
    return {"ok": True, "session_id": body.session_id, "session": full,
            "consumed": consumed_counts,
            "waste_remaining": {k: after.get(k, 0) for k in after},
            "digest": digest}


@router.post("/buffet/{session_id}/guest-count")
def buffet_guest_count(session_id: str, body: BuffetGuestCount):
    """iter213 · Feature 2 — set guest count + source, recompute cost-per-cover."""
    sess = db["waste_buffet_sessions"].find_one({"session_id": session_id})
    if not sess:
        raise HTTPException(404, "session not found")
    db["waste_buffet_sessions"].update_one(
        {"session_id": session_id},
        {"$set": {"guest_count": int(body.guest_count),
                  "guest_count_source": body.source,
                  "guest_count_notes": body.notes or "",
                  "guest_count_locked_at": utcnow_iso()}},
    )
    full = _rollup_session_costs(session_id)
    return {"ok": True, "session": full}


@router.get("/buffet/{session_id}/cost-breakdown")
def buffet_cost_breakdown(session_id: str):
    """iter213 · Feature 1 + 2 — full cost waterfall for dashboard/mobile."""
    sess = db["waste_buffet_sessions"].find_one({"session_id": session_id}, {"_id": 0})
    if not sess:
        raise HTTPException(404, "session not found")
    full = _rollup_session_costs(session_id)
    return {"ok": True, "breakdown": full or sess}


@router.get("/buffet/sessions")
def list_buffet_sessions(outlet_id: Optional[str] = None, status: Optional[str] = None,
                         limit: int = Query(20, ge=1, le=100)):
    q: Dict[str, Any] = {}
    if outlet_id: q["outlet_id"] = outlet_id
    if status: q["status"] = status
    rows = list(db["waste_buffet_sessions"].find(q, {"_id": 0}).sort("started_at", -1).limit(limit))
    return {"ok": True, "sessions": rows, "total": len(rows)}


# ═══════════════════════ INSIGHTS ══════════════════════════════════════════
@router.get("/insights/digest/daily")
def daily_digest(days: int = Query(1, ge=1, le=30), outlet_id: Optional[str] = None):
    """Aggregate the last N days of waste into a daily digest (per-day buckets)."""
    from datetime import timedelta
    from lib.time import utcnow
    buckets: Dict[str, Dict[str, Any]] = {}
    since = (utcnow() - timedelta(days=days)).isoformat()
    q: Dict[str, Any] = {"created_at": {"$gte": since}}
    if outlet_id: q["outlet_id"] = outlet_id
    for e in db["waste_entries"].find(q, {"_id": 0}):
        d = (e.get("created_at") or "")[:10]
        if not d: continue
        b = buckets.setdefault(d, {"date": d, "entries": 0, "items": 0,
                                    "total_cost": 0.0, "total_weight_g": 0.0,
                                    "by_mode": {}})
        b["entries"] += 1
        b["items"] += int(e.get("total_items") or 0)
        b["total_cost"] += float(e.get("total_cost") or 0)
        b["total_weight_g"] += float(e.get("total_weight_g") or 0)
        m = e.get("mode") or "?"
        b["by_mode"][m] = b["by_mode"].get(m, 0) + 1
    days_out = sorted(buckets.values(), key=lambda x: x["date"], reverse=True)
    for b in days_out:
        b["total_cost"] = round(b["total_cost"], 2)
        b["total_weight_g"] = round(b["total_weight_g"], 1)
    return {"ok": True, "days": days_out, "generated_at": utcnow_iso()}


# ═══════════════════════ TRAINING ══════════════════════════════════════════
@router.post("/training/feedback")
def training_feedback(body: TrainingFeedback):
    """Explicit training feedback submission (beyond the implicit PATCH on items)."""
    doc = {
        "feedback_id": f"fb-{uuid.uuid4().hex[:10]}",
        "entry_id": body.entry_id,
        "item_id": body.item_id,
        "correction": body.correction,
        "user_id": body.user_id,
        "created_at": utcnow_iso(),
    }
    db["waste_training_feedback"].insert_one(doc)
    return {"ok": True, "feedback_id": doc["feedback_id"]}


@router.get("/training/pending", dependencies=[Depends(require_admin_token)])
def training_pending(limit: int = 50):
    """Admin-only: unknown-items awaiting labelling."""
    rows = list(db["waste_items"].find({"is_unknown": True}, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"ok": True, "pending": rows, "count": len(rows)}


# ═══════════════════════ iter213 · ZONES (Feature 3) ═══════════════════════
class ZonePatch(BaseModel):
    zone_name: Optional[str] = None


@router.get("/entries/{entry_id}/zones")
def list_zones(entry_id: str):
    rows = list(db["waste_capture_zones"].find({"entry_id": entry_id}, {"_id": 0}).sort("zone_order", 1))
    return {"ok": True, "entry_id": entry_id, "zones": rows, "count": len(rows)}


@router.post("/entries/{entry_id}/zones")
async def append_zone(entry_id: str, body: ZoneInput):
    """Append a new zone to an existing entry. Runs vision on the zone media
    and bumps the parent entry totals."""
    parent = db["waste_entries"].find_one({"entry_id": entry_id}, {"_id": 0})
    if not parent:
        raise HTTPException(404, "entry not found")
    existing_count = db["waste_capture_zones"].count_documents({"entry_id": entry_id})
    order = existing_count + 1

    b64 = body.media_base64
    items: Optional[List[Dict[str, Any]]] = None
    suggestions: List[Dict[str, Any]] = []
    z_mode = "stub"
    if b64 and _DEFAULT_FEATURE_FLAGS.get("feature.vision_llm", True):
        vr = await _run_vision_llm(b64)
        if vr and vr.get("items"):
            items = vr["items"]; z_mode = "llm"; suggestions = vr.get("suggested_recipes") or []
    if not items:
        items = _run_vision_stub(f"{entry_id}:z{order}", parent.get("mode") or "still")

    threshold = _confidence_threshold_for("default")
    for it in items:
        it["needs_review"] = float(it.get("confidence") or 0) < threshold

    zone_id = f"zon-{uuid.uuid4().hex[:10]}"
    z_name_raw = (body.zone_name or "").strip()[:40]
    if not z_name_raw:
        import datetime as _dt
        oc = (parent.get("outlet_id") or "UNK").upper().replace(" ", "")[:4]
        sc = (parent.get("station_id") or "UNK").upper().replace(" ", "")[:5]
        d = _dt.datetime.utcnow().strftime("%Y%m%d"); t = _dt.datetime.utcnow().strftime("%H%M")
        z_name = f"{oc}-{sc}-{d}-{t}-{order:02d}"
        z_source = "auto_generated"
    else:
        z_name = z_name_raw; z_source = "user"

    z_total_cost = round(sum(float(it.get("total_cost") or 0) for it in items), 2)
    z_total_weight = round(sum(float(it.get("total_weight_g") or 0) for it in items), 1)

    zone_doc = {
        "zone_id": zone_id, "entry_id": entry_id,
        "zone_order": order, "zone_name": z_name, "zone_name_source": z_source,
        "media_url": body.media_url,
        "total_weight_g": z_total_weight, "total_value_usd": z_total_cost,
        "item_count": len(items), "vision_mode": z_mode,
        "created_at": utcnow_iso(),
    }
    db["waste_capture_zones"].insert_one(zone_doc)
    for it in items:
        it["entry_id"] = entry_id; it["zone_id"] = zone_id
        it["capture_id"] = parent.get("capture_id")
        it["created_at"] = utcnow_iso()
        db["waste_items"].insert_one(it)

    saved_suggestions = _persist_suggested_recipes(suggestions, entry_id, parent.get("user_id")) if suggestions else []

    # Recompute parent totals
    all_items = list(db["waste_items"].find({"entry_id": entry_id}, {"_id": 0}))
    new_total = round(sum(float(i.get("total_cost") or 0) for i in all_items), 2)
    new_weight = round(sum(float(i.get("total_weight_g") or 0) for i in all_items), 1)
    new_breakdown = _bucket_breakdown(all_items)
    new_zone_count = db["waste_capture_zones"].count_documents({"entry_id": entry_id})
    db["waste_entries"].update_one({"entry_id": entry_id},
        {"$set": {"total_items": len(all_items), "total_cost": new_total,
                  "total_weight_g": new_weight, "cost_breakdown": new_breakdown,
                  "zone_count": new_zone_count, "updated_at": utcnow_iso()}})

    return {"ok": True, "zone": strip_id(zone_doc), "items": strip_ids(items),
            "suggested_recipes": saved_suggestions,
            "entry": {"entry_id": entry_id, "total_cost": new_total,
                      "total_weight_g": new_weight, "zone_count": new_zone_count}}


@router.patch("/entries/{entry_id}/zones/{zone_id}")
def patch_zone(entry_id: str, zone_id: str, body: ZonePatch):
    if not body.zone_name:
        raise HTTPException(400, "zone_name required")
    result = db["waste_capture_zones"].update_one(
        {"entry_id": entry_id, "zone_id": zone_id},
        {"$set": {"zone_name": body.zone_name.strip()[:40],
                  "zone_name_source": "user", "updated_at": utcnow_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "zone not found")
    row = db["waste_capture_zones"].find_one({"zone_id": zone_id}, {"_id": 0})
    return {"ok": True, "zone": row}


@router.delete("/entries/{entry_id}/zones/{zone_id}")
def delete_zone(entry_id: str, zone_id: str):
    # Remove zone + its items, then rebalance parent totals
    db["waste_items"].delete_many({"entry_id": entry_id, "zone_id": zone_id})
    res = db["waste_capture_zones"].delete_one({"entry_id": entry_id, "zone_id": zone_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "zone not found")
    all_items = list(db["waste_items"].find({"entry_id": entry_id}, {"_id": 0}))
    new_total = round(sum(float(i.get("total_cost") or 0) for i in all_items), 2)
    new_weight = round(sum(float(i.get("total_weight_g") or 0) for i in all_items), 1)
    new_zone_count = db["waste_capture_zones"].count_documents({"entry_id": entry_id})
    db["waste_entries"].update_one({"entry_id": entry_id},
        {"$set": {"total_items": len(all_items), "total_cost": new_total,
                  "total_weight_g": new_weight,
                  "cost_breakdown": _bucket_breakdown(all_items),
                  "zone_count": new_zone_count, "updated_at": utcnow_iso()}})
    return {"ok": True, "deleted_zone_id": zone_id, "remaining_zones": new_zone_count}


# ═══════════════════════ iter213 · RECIPE SUGGESTIONS (EchoAi³) ════════════
@router.get("/recipes/suggested")
def list_suggested_recipes(status: str = Query("pending_chef_review"),
                           limit: int = Query(50, ge=1, le=200)):
    """Surface AI-suggested recipes awaiting chef approval (banner source)."""
    rows = list(db["waste_suggested_recipes"].find({"status": status}, {"_id": 0})
                .sort("last_seen_at", -1).limit(limit))
    return {"ok": True, "status": status, "count": len(rows), "suggestions": rows}


@router.post("/recipes/suggested/{recipe_id}/approve")
def approve_suggested_recipe(recipe_id: str, body: SuggestedRecipeApprove):
    """Chef approval — flips status to 'approved' and merges into live catalog."""
    existing = db["waste_suggested_recipes"].find_one({"recipe_id": recipe_id})
    if not existing:
        raise HTTPException(404, "suggestion not found")
    updates: Dict[str, Any] = {"status": "approved", "approved_at": utcnow_iso()}
    for field in ("name", "portion_g", "cost", "category"):
        val = getattr(body, field, None)
        if val is not None: updates[field] = val
    db["waste_suggested_recipes"].update_one({"recipe_id": recipe_id}, {"$set": updates})
    merged = db["waste_suggested_recipes"].find_one({"recipe_id": recipe_id}, {"_id": 0})
    return {"ok": True, "recipe": merged}


@router.post("/recipes/suggested/{recipe_id}/reject")
def reject_suggested_recipe(recipe_id: str, reason: Optional[str] = Query(None)):
    existing = db["waste_suggested_recipes"].find_one({"recipe_id": recipe_id})
    if not existing:
        raise HTTPException(404, "suggestion not found")
    db["waste_suggested_recipes"].update_one({"recipe_id": recipe_id},
        {"$set": {"status": "rejected", "rejected_at": utcnow_iso(),
                  "rejection_reason": reason or ""}})
    return {"ok": True, "recipe_id": recipe_id, "status": "rejected"}


# ═══════════════════════ iter213 · NEEDS-REVIEW QUEUE ══════════════════════
@router.get("/review/pending")
def list_pending_review(limit: int = Query(25, ge=1, le=100)):
    """Operator-test surface — entries with low_confidence_count > 0 OR
    pending recipe suggestions. Feeds the mobile/desktop Needs-Review banner."""
    entries = list(db["waste_entries"].find(
        {"$or": [{"low_confidence_count": {"$gt": 0}},
                 {"status": "needs_review"},
                 {"suggested_recipes_count": {"$gt": 0}}]},
        {"_id": 0},
    ).sort("created_at", -1).limit(limit))
    pending_suggestions = db["waste_suggested_recipes"].count_documents(
        {"status": "pending_chef_review"}
    )
    return {"ok": True, "entries": entries, "count": len(entries),
            "pending_suggestions": pending_suggestions}


# ═══════════════════════ iter213 · GROUND-TRUTH INGEST ═════════════════════
@router.post("/training/labelled")
def training_labelled(body: TrainingLabelled):
    """Operator-test Week 2 · chef uploads a scan + hand-labels it for
    offline model tuning. Gated by `feature.collect_ground_truth`."""
    if not _DEFAULT_FEATURE_FLAGS.get("feature.collect_ground_truth", True):
        raise HTTPException(403, "ground-truth collection disabled")
    gt_id = f"gt-{uuid.uuid4().hex[:12]}"
    doc = {
        "ground_truth_id": gt_id,
        "capture_id": body.capture_id,
        "media_url": body.media_url or body.video_url,
        "has_media_base64": bool(body.media_base64),
        "outlet_id": body.outlet_id,
        "station_id": body.station_id,
        "user_id": body.user_id,
        "labels": body.labels,
        "label_count": len(body.labels or []),
        "notes": body.notes or "",
        "captured_at": body.captured_at or utcnow_iso(),
        "created_at": utcnow_iso(),
        "status": "recorded",
    }
    db["waste_training_labelled"].insert_one(doc)
    # Keep base64 blobs in a separate collection to avoid bloating the labels doc
    if body.media_base64:
        db["waste_training_media"].insert_one({
            "ground_truth_id": gt_id, "media_base64": body.media_base64,
            "created_at": utcnow_iso(),
        })
    strip_id(doc)
    return {"ok": True, "ground_truth_id": gt_id, "record": doc}


@router.get("/training/labelled")
def list_labelled(limit: int = Query(50, ge=1, le=200)):
    if not _DEFAULT_FEATURE_FLAGS.get("feature.collect_ground_truth", True):
        return {"ok": True, "records": [], "count": 0, "disabled": True}
    rows = list(db["waste_training_labelled"].find({}, {"_id": 0})
                .sort("created_at", -1).limit(limit))
    total = db["waste_training_labelled"].count_documents({})
    return {"ok": True, "records": rows, "count": len(rows), "total": total}


# ═══════════════════════ iter214 · F4 · REFILL TRACKING ═════════════════════
class RefillCapture(BaseModel):
    session_id: str
    capture_id: str
    entry_id: Optional[str] = None  # the analysed entry for this refill scan
    media_base64: Optional[str] = None
    notes: Optional[str] = None


@router.post("/buffet/{session_id}/refill")
async def buffet_refill(session_id: str, body: RefillCapture):
    """Log a mid-service refill. Runs vision on the refill tray image, creates
    a `mode=buffet_refill` entry linked to the session, re-rolls session costs."""
    sess = db["waste_buffet_sessions"].find_one({"session_id": session_id})
    if not sess:
        raise HTTPException(404, "session not found")
    if sess.get("status") == "closed":
        raise HTTPException(400, "session already closed")

    # Analyse refill scan if caller didn't pre-analyse
    if body.entry_id:
        entry = db["waste_entries"].find_one({"entry_id": body.entry_id}, {"_id": 0})
        if not entry: raise HTTPException(404, "entry not found")
    else:
        resp = await _analyse_and_write_entry(
            body.capture_id, "buffet_refill",
            {"notes": body.notes or ""},
            media_base64=body.media_base64,
            buffet_session_id=session_id,
            outlet_id=sess.get("outlet_id"),
        )
        entry = db["waste_entries"].find_one({"entry_id": resp["entry_id"]}, {"_id": 0})

    # Tag the entry's mode as refill + link to session
    db["waste_entries"].update_one(
        {"entry_id": entry["entry_id"]},
        {"$set": {"mode": "buffet_refill", "buffet_session_id": session_id,
                  "refill_notes": body.notes or "", "updated_at": utcnow_iso()}},
    )

    full = _rollup_session_costs(session_id)
    return {"ok": True, "session": full, "refill_entry_id": entry["entry_id"]}


@router.get("/buffet/{session_id}/refills")
def list_refills(session_id: str):
    rows = list(db["waste_entries"].find(
        {"buffet_session_id": session_id, "mode": "buffet_refill"},
        {"_id": 0},
    ).sort("created_at", 1))
    return {"ok": True, "session_id": session_id, "refills": rows, "count": len(rows)}


# ═══════════════════════ iter214 · F5 · EVENT MENU PRE-LOAD ═════════════════
class MenuUpload(BaseModel):
    """Chef uploads menu as either: (a) screenshot/photo (image_base64),
    (b) typed text (raw_text), or (c) audio recording (audio_base64)."""
    event_id: str
    mode: str = Field(..., pattern="^(screenshot|photo|text|voice)$")
    image_base64: Optional[str] = None
    raw_text: Optional[str] = None
    audio_base64: Optional[str] = None
    language: Optional[str] = "en"


_MENU_PROMPT = (
    "You are EchoWaste's menu-ingestion assistant. The user has given you a "
    "restaurant menu for a specific event. Extract a STRICT JSON object with "
    "key `menu_items` (array). For each item: "
    '{"name": str, "course": one of ["breakfast","brunch","lunch","dinner","dessert","beverage","other"], '
    '"category": one of ["protein","pastry","produce","beverages","dairy","sundries"], '
    '"estimated_portion_g": float, "estimated_cost_usd": float (best guess), '
    '"serving_style": one of ["plated","buffet","station","passed","bar"]}. '
    'Respond ONLY with {"menu_items":[...]}. No prose.'
)


@router.post("/events/{event_id}/menu/upload")
async def upload_event_menu(event_id: str, body: MenuUpload):
    """Extract menu from screenshot/photo/text/voice and persist to
    `waste_event_menu`. Scoped to a single event (ties into CRM/BEOs later)."""
    if body.event_id != event_id:
        raise HTTPException(400, "event_id mismatch")

    raw_input: str = ""
    extraction_mode = body.mode

    if body.mode in ("screenshot", "photo") and body.image_base64:
        # Vision extraction via Claude
        async with log_llm("menu_extract_vision", system=_MENU_PROMPT,
                            user=f"[image · {len(body.image_base64)*3//4} bytes]",
                            extra_inputs={"event_id": event_id, "mode": body.mode}) as _c:
            result = await ask_echo_vision(_MENU_PROMPT, "Return menu JSON now.",
                                            [body.image_base64], session_prefix="echowaste-menu")
            _c["response"] = result
        raw_input = result.get("text", "") if result.get("mode") == "llm" else ""
    elif body.mode == "voice" and body.audio_base64:
        # Whisper transcribe, then text extraction
        import base64 as _b64
        from lib.llm import transcribe_audio, ask_echo
        transcript = ""
        try:
            audio_bytes = _b64.b64decode(body.audio_base64.split(",", 1)[-1])
            async with log_llm("whisper_stt", system="whisper", user=f"[audio · {len(audio_bytes)} bytes]",
                                provider="openai", model="whisper-1",
                                extra_inputs={"event_id": event_id, "purpose": "menu_extract"}) as _c:
                t_resp = await transcribe_audio(audio_bytes, language=body.language or "en")
                transcript = (t_resp.get("text") if isinstance(t_resp, dict) else None) or ""
                _c["response"] = {"text": transcript, "mode": "llm" if transcript else "whisper_error"}
        except Exception as e:
            log_event("whisper_error", inputs={"event_id": event_id},
                      error={"type": type(e).__name__, "message": str(e)[:200]})
            transcript = ""
        raw_input = (transcript or "").strip()
        if raw_input:
            async with log_llm("menu_extract_text", system=_MENU_PROMPT, user=raw_input,
                                extra_inputs={"event_id": event_id, "mode": "voice→text"}) as _c:
                t = await ask_echo(_MENU_PROMPT, raw_input, session_prefix="echowaste-menu")
                _c["response"] = t
            raw_input = t.get("text", "") if t.get("mode") == "llm" else raw_input
    elif body.mode == "text" and body.raw_text:
        from lib.llm import ask_echo
        async with log_llm("menu_extract_text", system=_MENU_PROMPT, user=body.raw_text,
                            extra_inputs={"event_id": event_id, "mode": "text"}) as _c:
            t = await ask_echo(_MENU_PROMPT, body.raw_text, session_prefix="echowaste-menu")
            _c["response"] = t
        raw_input = t.get("text", "") if t.get("mode") == "llm" else body.raw_text
    else:
        raise HTTPException(400, "mode + payload mismatch")

    # Parse JSON
    menu_items: List[Dict[str, Any]] = []
    try:
        txt = raw_input.strip()
        if txt.startswith("```"):
            txt = re.sub(r"^```(?:json)?\s*|\s*```$", "", txt, flags=re.MULTILINE).strip()
        parsed = json.loads(txt)
        menu_items = parsed.get("menu_items") if isinstance(parsed, dict) else []
        if not isinstance(menu_items, list): menu_items = []
    except Exception:
        menu_items = []

    doc = {
        "event_id": event_id,
        "mode": extraction_mode,
        "menu_items": menu_items,
        "item_count": len(menu_items),
        "has_image": bool(body.image_base64),
        "has_audio": bool(body.audio_base64),
        "raw_text": body.raw_text,
        "status": "draft" if menu_items else "extraction_failed",
        "created_at": utcnow_iso(),
        "updated_at": utcnow_iso(),
    }
    # Upsert per event
    db["waste_event_menu"].update_one({"event_id": event_id}, {"$set": doc}, upsert=True)
    strip_id(doc)
    return {"ok": True, "event_id": event_id, "menu": doc,
            "item_count": len(menu_items),
            "extraction_failed": not menu_items}


@router.get("/events/{event_id}/menu")
def get_event_menu(event_id: str):
    doc = db["waste_event_menu"].find_one({"event_id": event_id}, {"_id": 0})
    if not doc: return {"ok": True, "menu": None}
    return {"ok": True, "menu": doc}


# ═══════════════════════ iter214 · F6 · VERBAL RECIPE DRAFTS ════════════════
class DraftRecipeRequest(BaseModel):
    """Chef records a voice memo describing a new dish. We transcribe, extract,
    persist as `waste_draft_recipes` for chef review."""
    audio_base64: Optional[str] = None
    raw_text: Optional[str] = None  # allow text fallback for quick testing
    dish_hint: Optional[str] = None  # optional dish name hint
    outlet_id: Optional[str] = None
    user_id: Optional[str] = None


_RECIPE_PROMPT = (
    "You are EchoWaste's recipe-draft engine. A chef just dictated a recipe. "
    "Extract STRICT JSON: "
    '{"name": str, "course": one of ["breakfast","brunch","lunch","dinner","dessert","side","beverage"], '
    '"category": one of ["protein","pastry","produce","beverages","dairy","sundries"], '
    '"portion_g": float (default 120 if unclear), "cost": float (best cost-per-portion USD guess), '
    '"ingredients": [{"name": str, "qty": str, "unit": str}], "steps": [str], '
    '"method_keywords": [str], "confidence": float (0..1, how confident you are the transcript was clear)}. '
    "Respond ONLY with that JSON object. No prose."
)


@router.post("/draft-recipes")
async def create_draft_recipe(body: DraftRecipeRequest):
    transcript = body.raw_text or ""
    if body.audio_base64 and not body.raw_text:
        import base64 as _b64
        from lib.llm import transcribe_audio
        try:
            audio_bytes = _b64.b64decode(body.audio_base64.split(",", 1)[-1])
            t_resp = await transcribe_audio(audio_bytes, language="en")
            transcript = ((t_resp.get("text") if isinstance(t_resp, dict) else None) or "").strip()
        except Exception:
            transcript = ""
    if not transcript:
        raise HTTPException(400, "need raw_text or audio_base64")

    hint_prefix = f"Dish hint: {body.dish_hint}\n\n" if body.dish_hint else ""
    from lib.llm import ask_echo
    async with log_llm("draft_recipe_extract", system=_RECIPE_PROMPT, user=hint_prefix + transcript,
                        extra_inputs={"dish_hint": body.dish_hint, "has_audio": bool(body.audio_base64)},
                        user_id=body.user_id) as _c:
        t = await ask_echo(_RECIPE_PROMPT, hint_prefix + transcript,
                            session_prefix="echowaste-recipe-draft")
        _c["response"] = t
    raw = t.get("text", "") if t.get("mode") == "llm" else ""

    parsed: Dict[str, Any] = {}
    try:
        txt = raw.strip()
        if txt.startswith("```"):
            txt = re.sub(r"^```(?:json)?\s*|\s*```$", "", txt, flags=re.MULTILINE).strip()
        parsed = json.loads(txt)
    except Exception:
        parsed = {}

    draft_id = f"drec-{uuid.uuid4().hex[:12]}"
    doc = {
        "draft_id": draft_id,
        "recipe_id_on_promote": f"rec-new-{re.sub(r'[^a-z0-9]+', '-', (parsed.get('name') or 'dish').lower()).strip('-')[:40]}",
        "name": parsed.get("name") or (body.dish_hint or "Untitled dish"),
        "course": parsed.get("course") or "other",
        "category": (parsed.get("category") or "sundries").lower(),
        "portion_g": float(parsed.get("portion_g") or 120),
        "cost": float(parsed.get("cost") or 0),
        "ingredients": parsed.get("ingredients") or [],
        "steps": parsed.get("steps") or [],
        "method_keywords": parsed.get("method_keywords") or [],
        "extract_confidence": float(parsed.get("confidence") or 0.5),
        "transcript": transcript,
        "has_audio": bool(body.audio_base64),
        "status": "pending_chef_review",
        "outlet_id": body.outlet_id,
        "created_by_user_id": body.user_id,
        "created_at": utcnow_iso(), "updated_at": utcnow_iso(),
    }
    db["waste_draft_recipes"].insert_one(doc)
    strip_id(doc)
    return {"ok": True, "draft": doc}


@router.get("/draft-recipes")
def list_draft_recipes(status: str = Query("pending_chef_review"),
                        limit: int = Query(50, ge=1, le=200)):
    rows = list(db["waste_draft_recipes"].find({"status": status}, {"_id": 0})
                .sort("created_at", -1).limit(limit))
    return {"ok": True, "status": status, "count": len(rows), "drafts": rows}


class DraftPromote(BaseModel):
    name: Optional[str] = None
    portion_g: Optional[float] = None
    cost: Optional[float] = None
    category: Optional[str] = None


@router.post("/draft-recipes/{draft_id}/promote")
def promote_draft(draft_id: str, body: DraftPromote):
    """Chef approves a draft → promotes into `waste_suggested_recipes` with
    status=approved (merges into live catalog via _recipes_catalog)."""
    draft = db["waste_draft_recipes"].find_one({"draft_id": draft_id})
    if not draft:
        raise HTTPException(404, "draft not found")
    recipe_id = draft.get("recipe_id_on_promote") or f"rec-new-{uuid.uuid4().hex[:8]}"
    promoted = {
        "recipe_id": recipe_id,
        "name": body.name or draft.get("name"),
        "portion_g": float(body.portion_g if body.portion_g is not None else draft.get("portion_g") or 120),
        "cost": float(body.cost if body.cost is not None else draft.get("cost") or 0),
        "category": (body.category or draft.get("category") or "sundries").lower(),
        "rationale": f"Promoted from chef draft {draft_id}",
        "status": "approved",
        "occurrence_count": 1,
        "suggested_by": "echo_ai3:verbal_draft",
        "suggested_by_user_id": draft.get("created_by_user_id"),
        "created_at": utcnow_iso(), "last_seen_at": utcnow_iso(),
        "approved_at": utcnow_iso(),
    }
    db["waste_suggested_recipes"].update_one(
        {"recipe_id": recipe_id}, {"$set": promoted}, upsert=True,
    )
    db["waste_draft_recipes"].update_one(
        {"draft_id": draft_id},
        {"$set": {"status": "promoted", "promoted_recipe_id": recipe_id,
                  "promoted_at": utcnow_iso()}},
    )
    return {"ok": True, "recipe": promoted, "draft_id": draft_id}


@router.post("/draft-recipes/{draft_id}/reject")
def reject_draft(draft_id: str, reason: Optional[str] = Query(None)):
    res = db["waste_draft_recipes"].update_one(
        {"draft_id": draft_id},
        {"$set": {"status": "rejected", "rejected_at": utcnow_iso(),
                  "rejection_reason": reason or ""}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "draft not found")
    return {"ok": True, "draft_id": draft_id, "status": "rejected"}


# ═══════════════════════ iter214 · PAR SHEET UI (wireframe 07) ══════════════
@router.get("/par-sheet")
def par_sheet(outlet_id: Optional[str] = None, service_name: Optional[str] = None,
              lookback_days: int = Query(14, ge=1, le=90)):
    """Compute tomorrow's recommended par per recipe from last N days of
    buffet_sessions + capture items. Par = avg consumed + 1 SD safety buffer."""
    from datetime import datetime, timedelta
    cutoff = (datetime.utcnow() - timedelta(days=lookback_days)).isoformat()
    q: Dict[str, Any] = {"status": "closed", "closed_at": {"$gte": cutoff}}
    if outlet_id: q["outlet_id"] = outlet_id
    if service_name: q["service_name"] = service_name

    sessions = list(db["waste_buffet_sessions"].find(q, {"_id": 0}))
    if not sessions:
        return {"ok": True, "par_sheet": {}, "sessions_sampled": 0,
                "outlet_id": outlet_id, "service_name": service_name}

    # Roll up consumed counts per recipe across all sessions
    recipe_stats: Dict[str, Dict[str, Any]] = {}
    for s in sessions:
        counts = s.get("consumed_counts") or {}
        for rid, cnt in counts.items():
            if rid == "__unknown__": continue
            stats = recipe_stats.setdefault(rid, {"samples": [], "total_cost": 0.0})
            stats["samples"].append(float(cnt))

    catalog = {r["recipe_id"]: r for r in _recipes_catalog()}
    par_rows: List[Dict[str, Any]] = []
    for rid, stats in recipe_stats.items():
        samples = stats["samples"]
        avg = sum(samples) / len(samples) if samples else 0
        # Sample std-dev (population fallback)
        if len(samples) > 1:
            m = avg
            var = sum((x - m) ** 2 for x in samples) / (len(samples) - 1)
            sd = var ** 0.5
        else:
            sd = avg * 0.2  # 20% safety when only 1 sample
        par = round(avg + sd, 0)
        rec = catalog.get(rid, {})
        par_rows.append({
            "recipe_id": rid,
            "name": rec.get("name") or rid,
            "category": rec.get("category") or "sundries",
            "avg_consumed": round(avg, 1),
            "std_dev": round(sd, 1),
            "samples": len(samples),
            "recommended_par": par,
            "portion_g": float(rec.get("portion_g") or 120),
            "est_cost_per_portion": float(rec.get("cost") or 0),
            "est_par_cost": round(par * float(rec.get("cost") or 0), 2),
        })
    par_rows.sort(key=lambda r: -r["est_par_cost"])

    total_par_cost = round(sum(r["est_par_cost"] for r in par_rows), 2)
    categories: Dict[str, float] = {c: 0.0 for c in _CATEGORIES}
    for r in par_rows:
        categories[r["category"]] = round(categories.get(r["category"], 0.0) + r["est_par_cost"], 2)

    return {"ok": True,
            "sessions_sampled": len(sessions),
            "lookback_days": lookback_days,
            "outlet_id": outlet_id, "service_name": service_name,
            "total_par_cost_usd": total_par_cost,
            "category_par_cost": categories,
            "par_rows": par_rows}


# ═══════════════════════ iter214 · WASTE DIGEST SMS EMIT ════════════════════
def _emit_buffet_close_digest(session_id: str) -> Dict[str, Any]:
    """Called after buffet_close roll-up. Sends a one-line SMS to each chef
    subscribed to `alerts.buffet_close` for the outlet."""
    sess = db["waste_buffet_sessions"].find_one({"session_id": session_id}, {"_id": 0})
    if not sess or sess.get("status") != "closed":
        return {"ok": False, "reason": "session_not_closed"}
    # Build message
    svc = sess.get("service_name") or "Service"
    covers = int(sess.get("guest_count") or 0)
    cpc = sess.get("cost_per_cover_total_usd")
    waste_pct = sess.get("waste_pct")
    hist = _historical_comparison(sess.get("outlet_id"), sess.get("service_name"))
    avg_pct = None
    if hist.get("sample_size") and hist.get("avg_cost_per_cover_usd") and cpc is not None:
        diff = round((cpc - hist["avg_cost_per_cover_usd"]) / hist["avg_cost_per_cover_usd"] * 100, 1)
        avg_pct = f"{'+' if diff > 0 else ''}{diff}% vs avg"
    parts = [f"{svc.title()} · {covers} covers" if covers else f"{svc.title()}"]
    if cpc is not None: parts.append(f"${cpc:.2f}/cover")
    if waste_pct is not None: parts.append(f"{waste_pct:.0f}% waste")
    if avg_pct: parts.append(avg_pct)
    emoji = "💪" if (waste_pct is not None and waste_pct < 15) else "⚠"
    body = f"EchoAi³ · {' · '.join(parts)} {emoji}"

    # Look up chefs
    q: Dict[str, Any] = {"alerts.buffet_close": True, "channels.sms": True,
                          "phone_e164": {"$nin": [None, ""]}}
    if sess.get("outlet_id"): q["outlet_id"] = sess.get("outlet_id")
    chefs = list(db["user_notification_prefs"].find(q, {"_id": 0}))

    from lib.sms import send_sms
    results: List[Dict[str, Any]] = []
    for c in chefs:
        r = send_sms(c["phone_e164"], body, purpose="buffet_digest",
                     related_entity={"type": "buffet_session", "id": session_id})
        results.append({"user_id": c["user_id"], "result": r})
    # Log digest emission
    db["waste_digest_log"].insert_one({
        "session_id": session_id, "message": body,
        "recipients": [c["user_id"] for c in chefs],
        "results": results, "created_at": utcnow_iso(),
    })
    return {"ok": True, "message": body, "sent_to": len(chefs), "results": results}


@router.post("/buffet/{session_id}/digest")
def trigger_buffet_digest(session_id: str):
    """Manual trigger for the close digest (useful for testing)."""
    return _emit_buffet_close_digest(session_id)


# ═══════════════════════ iter215 · ANALYSIS LOGS (Claude-readable) ═══════════
@router.get("/logs")
def list_logs(event_type: Optional[str] = None,
              capture_id: Optional[str] = None,
              entry_id: Optional[str] = None,
              session_id: Optional[str] = None,
              user_id: Optional[str] = None,
              since: Optional[str] = None,
              limit: int = Query(200, ge=1, le=1000),
              include_full_prompts: bool = Query(False)):
    """Paginated log stream for Claude / ops review. Defaults to preview-only
    previews of prompts + responses; pass `include_full_prompts=true` for the
    full preview window."""
    q: Dict[str, Any] = {}
    if event_type: q["event_type"] = event_type
    if capture_id: q["capture_id"] = capture_id
    if entry_id: q["entry_id"] = entry_id
    if session_id: q["session_id"] = session_id
    if user_id: q["user_id"] = user_id
    if since: q["timestamp"] = {"$gte": since}
    rows = list(db["waste_analysis_log"].find(q, {"_id": 0})
                .sort("timestamp", -1).limit(limit))
    if not include_full_prompts:
        for r in rows:
            llm = r.get("llm") or {}
            if llm.get("user_prompt_preview") and len(llm["user_prompt_preview"]) > 240:
                llm["user_prompt_preview"] = llm["user_prompt_preview"][:240] + "…"
            if llm.get("response_raw_preview") and len(llm["response_raw_preview"]) > 240:
                llm["response_raw_preview"] = llm["response_raw_preview"][:240] + "…"
    return {"ok": True, "count": len(rows), "logs": rows, "query": q,
            "hint": "pass include_full_prompts=true for full prompts"}


@router.get("/logs/summary")
def logs_summary(since: Optional[str] = None):
    """High-level diagnostic summary — one JSON object Claude can analyse.

    Returns counts + timings + error samples grouped by event_type. Good for
    the 8-hour operator test wrap-up: paste this into Claude and ask
    "analyse last 8 hours of waste logs and rank the top 3 issues"."""
    q: Dict[str, Any] = {}
    if since: q["timestamp"] = {"$gte": since}
    rows = list(db["waste_analysis_log"].find(q, {"_id": 0}))
    summary: Dict[str, Any] = {
        "total_events": len(rows),
        "since": since,
        "by_event_type": {},
        "errors": [],
        "slow_calls": [],
        "captures": {"total": 0, "vision_ok": 0, "vision_failed": 0},
    }
    timings: List[int] = []
    for r in rows:
        et = r.get("event_type") or "unknown"
        bet = summary["by_event_type"].setdefault(et, {"count": 0, "errors": 0, "avg_ms": 0, "mode_mix": {}})
        bet["count"] += 1
        if r.get("error"):
            bet["errors"] += 1
            summary["errors"].append({
                "log_id": r.get("log_id"), "timestamp": r.get("timestamp"),
                "event_type": et, "type": r["error"].get("type"),
                "message": r["error"].get("message"),
                "capture_id": r.get("capture_id"),
            })
        llm = r.get("llm") or {}
        if llm.get("duration_ms"):
            bet["avg_ms"] = (bet["avg_ms"] * (bet["count"] - 1) + int(llm["duration_ms"])) / bet["count"]
            timings.append(int(llm["duration_ms"]))
            if int(llm["duration_ms"]) > 10000:
                summary["slow_calls"].append({
                    "log_id": r.get("log_id"), "event_type": et,
                    "duration_ms": llm["duration_ms"], "capture_id": r.get("capture_id"),
                })
        if llm.get("mode"):
            bet["mode_mix"][llm["mode"]] = bet["mode_mix"].get(llm["mode"], 0) + 1
        if et == "vision_llm":
            summary["captures"]["total"] += 1
            if llm.get("mode") == "llm": summary["captures"]["vision_ok"] += 1
            else: summary["captures"]["vision_failed"] += 1

    if timings:
        timings.sort()
        summary["timing_percentiles_ms"] = {
            "p50": timings[len(timings) // 2],
            "p90": timings[min(len(timings) - 1, int(len(timings) * 0.9))],
            "p99": timings[min(len(timings) - 1, int(len(timings) * 0.99))],
            "max": timings[-1],
        }
    summary["errors"] = summary["errors"][:20]
    summary["slow_calls"] = summary["slow_calls"][:20]
    return {"ok": True, "summary": summary}


# ═══════════════════════ iter215 · ADMIN · SMS flush ════════════════════════
@router.post("/admin/sms/flush")
def admin_sms_flush(x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token")):
    """Re-dispatch all queued SMS messages. Runs after Twilio creds land."""
    # Light auth — require a token that matches server env ADMIN_TOKEN (if set)
    import os as _os
    admin_tok = _os.environ.get("ADMIN_TOKEN")
    if admin_tok and x_admin_token != admin_tok:
        raise HTTPException(401, "invalid admin token")
    from lib.sms import flush_queue, credentials_status
    res = flush_queue()
    res["credentials"] = credentials_status()
    return res


@router.get("/admin/sms/status")
def admin_sms_status():
    from lib.sms import credentials_status
    queued = db["outbound_sms_queue"].count_documents({"status": {"$in": ["queued", "failed"]}})
    sent = db["outbound_sms_log"].count_documents({"status": "sent"})
    recent_queued = list(db["outbound_sms_queue"].find({}, {"_id": 0, "to": 1, "body": 1,
                         "purpose": 1, "created_at": 1, "status": 1, "reason": 1})
                         .sort("created_at", -1).limit(10))
    return {"ok": True, "credentials": credentials_status(),
            "queued_count": queued, "sent_count": sent,
            "recent_queued": recent_queued}


# ═══════════════════════ iter216 · FINGERPRINT-FIRST RECOGNITION ════════════
# Claude Opus direction: fingerprint-match-first, Sonnet-fallback. Cuts Sonnet
# cost 60-80% over 3 months as library grows. Based on face-recognition pattern.

def _maybe_auto_contribute_fingerprints(items: List[Dict[str, Any]],
                                        media_base64: Optional[str],
                                        property_id: Optional[str],
                                        capture_id: str) -> int:
    """Shadow-mode self-teaching · for each high-confidence item that came back
    from Sonnet, either (a) bump the confirmation_count of the closest existing
    local fingerprint, or (b) contribute a new fingerprint row (scope=local).
    Promotion to collective happens via explicit chef confirmations (see
    /fingerprints/{id}/confirm).

    Returns count of fingerprints touched (added or confirmed).
    """
    if not media_base64 or not items:
        return 0
    try:
        hist = _hsv_histogram_from_base64(media_base64)
    except Exception:
        return 0
    if sum(hist) <= 0:
        return 0

    touched = 0
    for it in items:
        rid = it.get("recipe_id")
        conf = float(it.get("confidence") or 0)
        if not rid or conf < 0.85:
            continue  # only contribute when Sonnet was confident AND mapped to a known recipe
        # Look for existing local fingerprint for this recipe + property
        q = {"recipe_id": rid, "scope": "local"}
        if property_id: q["property_id"] = property_id
        existing = list(db["waste_fingerprint_library"].find(q, {"_id": 0}))
        best = None; best_sim = 0.0
        for fp in existing:
            try:
                d = _hsv_distance(fp["hsv_histogram"], hist)
                sim = max(0.0, 1.0 - d / 2.0)
                if sim > best_sim: best_sim, best = sim, fp
            except Exception: continue
        if best and best_sim >= 0.88:
            # Same dish, similar appearance — bump confirmation
            db["waste_fingerprint_library"].update_one(
                {"fingerprint_id": best["fingerprint_id"]},
                {"$set": {"last_confirmed_at": utcnow_iso()},
                 "$inc": {"confirmation_count": 1}})
            touched += 1
        else:
            # New appearance of this recipe — shadow-log as pending
            fp_id = f"fp-{uuid.uuid4().hex[:12]}"
            db["waste_fingerprint_library"].insert_one({
                "fingerprint_id": fp_id,
                "scope": "local",
                "property_id": property_id,
                "recipe_id": rid,
                "name": it.get("name"),
                "hsv_histogram": hist,
                "portion_g": float(it.get("portion_g") or 100),
                "cost": float(it.get("cost_per_unit") or 0),
                "category": it.get("category") or "sundries",
                "confidence_base": float(conf),
                "confirmation_count": 1,
                "contributing_properties": [property_id] if property_id else [],
                "is_validated": False,
                "capture_id": capture_id,
                "first_seen_at": utcnow_iso(),
                "last_confirmed_at": utcnow_iso(),
                "created_at": utcnow_iso(),
                "source": "shadow_auto",
            })
            touched += 1
    if touched:
        log_event("fingerprint_shadow_contribute",
                  capture_id=capture_id,
                  outputs={"touched": touched, "item_count": len(items)})
    return touched


def _hsv_histogram_from_base64(b64: str) -> List[float]:
    """Compute 64-bucket HSV histogram from a base64 JPEG (cheap, no numpy).
    Returns a list of 64 normalised floats. Runs server-side (one-shot per
    captured item), not in the hot request path."""
    try:
        import base64 as _b64, io
        from PIL import Image
        raw = _b64.b64decode(b64.split(",", 1)[-1])
        img = Image.open(io.BytesIO(raw)).convert("HSV").resize((64, 64))
        pixels = list(img.getdata())
        # 4×4×4 = 64 buckets over H×S×V
        hist = [0.0] * 64
        for h, s, v in pixels:
            idx = (h // 64) * 16 + (s // 64) * 4 + (v // 64)
            hist[min(idx, 63)] += 1.0
        total = sum(hist) or 1.0
        return [round(x / total, 5) for x in hist]
    except Exception:
        return [0.0] * 64


def _hsv_distance(a: List[float], b: List[float]) -> float:
    """Chi-squared distance between two HSV histograms (0..2)."""
    return sum((x - y) ** 2 / (x + y + 1e-9) for x, y in zip(a, b))


class FingerprintContribution(BaseModel):
    """Write a fingerprint after a high-confidence identification."""
    recipe_id: str
    name: str
    hsv_histogram: List[float]
    portion_g: float
    cost: float = 0.0
    category: str = "sundries"
    confidence_base: float = Field(0.85, ge=0, le=1)
    property_id: Optional[str] = None
    capture_id: Optional[str] = None


class FingerprintQuery(BaseModel):
    hsv_histogram: List[float]
    property_id: Optional[str] = None
    min_confidence: float = Field(0.85, ge=0, le=1)
    k: int = Field(5, ge=1, le=20)


@router.post("/fingerprints")
def contribute_fingerprint(body: FingerprintContribution):
    """Store a verified fingerprint — either in local scope (property_id set)
    or queued for collective promotion once ≥3 independent confirmations."""
    if len(body.hsv_histogram) != 64:
        raise HTTPException(400, "hsv_histogram must be 64 floats")
    fp_id = f"fp-{uuid.uuid4().hex[:12]}"
    scope = "local" if body.property_id else "pending_collective"
    doc = {
        "fingerprint_id": fp_id,
        "scope": scope,
        "property_id": body.property_id,
        "recipe_id": body.recipe_id,
        "name": body.name,
        "hsv_histogram": body.hsv_histogram,
        "portion_g": float(body.portion_g),
        "cost": float(body.cost),
        "category": body.category,
        "confidence_base": float(body.confidence_base),
        "confirmation_count": 1,
        "contributing_properties": [body.property_id] if body.property_id else [],
        "is_validated": False,
        "capture_id": body.capture_id,
        "first_seen_at": utcnow_iso(),
        "last_confirmed_at": utcnow_iso(),
        "created_at": utcnow_iso(),
    }
    db["waste_fingerprint_library"].insert_one(doc)
    strip_id(doc)
    log_event("fingerprint_added", inputs={"recipe_id": body.recipe_id, "scope": scope},
              outputs={"fingerprint_id": fp_id})
    return {"ok": True, "fingerprint": doc}


@router.post("/fingerprints/query")
def query_fingerprint(body: FingerprintQuery):
    """Stage-1 of progressive analysis — nearest-neighbour HSV histogram search.
    Scans local scope first (same property), then collective (validated). Returns
    up to k matches ordered by distance. Target latency: <50ms per query."""
    if len(body.hsv_histogram) != 64:
        raise HTTPException(400, "hsv_histogram must be 64 floats")
    import time as _t
    t0 = _t.perf_counter()

    candidates: List[Dict[str, Any]] = []
    # Local scope (this property)
    if body.property_id:
        local = db["waste_fingerprint_library"].find(
            {"scope": "local", "property_id": body.property_id}, {"_id": 0})
        for fp in local:
            d = _hsv_distance(fp["hsv_histogram"], body.hsv_histogram)
            sim = max(0.0, 1.0 - d / 2.0)  # crude similarity [0..1]
            if sim >= body.min_confidence:
                candidates.append({**fp, "similarity": round(sim, 4), "match_source": "local"})
    # Collective validated
    collective = db["waste_fingerprint_library"].find(
        {"scope": "collective", "is_validated": True}, {"_id": 0})
    for fp in collective:
        d = _hsv_distance(fp["hsv_histogram"], body.hsv_histogram)
        sim = max(0.0, 1.0 - d / 2.0)
        if sim >= body.min_confidence:
            candidates.append({**fp, "similarity": round(sim, 4), "match_source": "collective"})

    candidates.sort(key=lambda c: -c["similarity"])
    top = candidates[: body.k]
    duration_ms = int((_t.perf_counter() - t0) * 1000)
    log_event("fingerprint_query", inputs={"property_id": body.property_id,
              "min_confidence": body.min_confidence},
              outputs={"matches": len(top), "top_similarity": top[0]["similarity"] if top else None,
                        "duration_ms": duration_ms})
    return {"ok": True, "matches": top, "count": len(top), "duration_ms": duration_ms,
            "library_size": db["waste_fingerprint_library"].count_documents({})}


@router.post("/fingerprints/{fp_id}/confirm")
def confirm_fingerprint(fp_id: str, property_id: Optional[str] = Query(None)):
    """Chef confirmed this fingerprint was correct. Bumps confirmation_count
    and promotes to collective+validated once ≥3 independent properties."""
    fp = db["waste_fingerprint_library"].find_one({"fingerprint_id": fp_id})
    if not fp: raise HTTPException(404, "fingerprint not found")
    contrib = set(fp.get("contributing_properties") or [])
    if property_id: contrib.add(property_id)
    is_validated = len(contrib) >= 3
    updates = {
        "confirmation_count": int(fp.get("confirmation_count") or 1) + 1,
        "contributing_properties": list(contrib),
        "contributing_properties_count": len(contrib),
        "is_validated": is_validated,
        "last_confirmed_at": utcnow_iso(),
    }
    if is_validated and fp.get("scope") != "collective":
        updates["scope"] = "collective"
        updates["property_id"] = None  # anonymise on promotion
    db["waste_fingerprint_library"].update_one({"fingerprint_id": fp_id}, {"$set": updates})
    log_event("fingerprint_confirmed", inputs={"fp_id": fp_id, "property_id": property_id},
              outputs={"is_validated": is_validated, "contrib_count": len(contrib)})
    return {"ok": True, "fingerprint_id": fp_id, **updates}


@router.get("/fingerprints/stats")
def fingerprint_stats(property_id: Optional[str] = None):
    """Library KPIs for dashboard — local count, collective count, hit rate."""
    local_q = {"scope": "local"}
    if property_id: local_q["property_id"] = property_id
    # Recent hit-rate from logs
    recent = list(db["waste_analysis_log"].find(
        {"event_type": "fingerprint_query"}, {"_id": 0, "outputs": 1, "timestamp": 1}
    ).sort("timestamp", -1).limit(200))
    hits = sum(1 for r in recent if (r.get("outputs") or {}).get("matches", 0) > 0)
    hit_rate = round(hits / len(recent), 3) if recent else 0
    return {"ok": True,
            "local_count": db["waste_fingerprint_library"].count_documents(local_q),
            "pending_collective": db["waste_fingerprint_library"].count_documents({"scope": "pending_collective"}),
            "collective_validated": db["waste_fingerprint_library"].count_documents(
                {"scope": "collective", "is_validated": True}),
            "total": db["waste_fingerprint_library"].count_documents({}),
            "recent_hit_rate": hit_rate, "recent_queries": len(recent),
            "property_id": property_id}


# ═══════════════════════ iter216 · PROGRESSIVE ANALYSIS ENDPOINT ════════════
class ProgressiveCapture(BaseModel):
    """Stage-1 preliminary: returns fingerprint-only match in ≤2s. Caller
    then kicks off /capture/still or /capture/video-mot for the Sonnet pass."""
    capture_id: str
    hsv_histogram: List[float]
    property_id: Optional[str] = None
    outlet_id: Optional[str] = None


@router.post("/capture/preliminary")
def capture_preliminary(body: ProgressiveCapture):
    """Progressive analysis Stage 1 — <2s preliminary answer from fingerprint
    library. Returns an estimated entry without calling Claude. The chef sees
    this instantly; the final Sonnet result replaces it when ready."""
    import time as _t
    t0 = _t.perf_counter()
    if len(body.hsv_histogram) != 64:
        raise HTTPException(400, "hsv_histogram must be 64 floats")
    # Reuse the query endpoint logic
    q = FingerprintQuery(hsv_histogram=body.hsv_histogram,
                          property_id=body.property_id, min_confidence=0.85, k=5)
    result = query_fingerprint(q)
    matches = result.get("matches") or []
    duration_ms = int((_t.perf_counter() - t0) * 1000)

    if not matches:
        # No local/collective hit — caller must invoke full vision path
        log_event("capture_preliminary_miss", capture_id=body.capture_id,
                  outputs={"duration_ms": duration_ms})
        return {"ok": True, "preliminary": None, "fallback_required": True,
                "duration_ms": duration_ms,
                "message": "No fingerprint match — run full vision path for final answer"}

    # Build a preliminary entry from the top match
    top = matches[0]
    items = [{
        "item_id": f"itm-prelim-{uuid.uuid4().hex[:8]}",
        "recipe_id": top["recipe_id"],
        "name": top["name"], "count": 1.0, "unit": "portion",
        "portion_g": float(top["portion_g"]), "cost_per_unit": float(top["cost"]),
        "total_cost": round(float(top["cost"]), 2),
        "total_weight_g": float(top["portion_g"]),
        "confidence": float(top["similarity"]), "category": top["category"],
        "source": f"fingerprint:{top['match_source']}", "needs_review": top["similarity"] < 0.92,
    }]
    log_event("capture_preliminary_hit", capture_id=body.capture_id,
              outputs={"match_source": top["match_source"], "similarity": top["similarity"],
                        "duration_ms": duration_ms})
    return {"ok": True,
            "preliminary": {
                "capture_id": body.capture_id,
                "items": items,
                "total_cost": round(sum(i["total_cost"] for i in items), 2),
                "vision_mode": f"fingerprint_{top['match_source']}",
                "top_match": top,
                "alternatives": matches[1:],
                "needs_final_pass": True,
                "cost_saved_estimate_usd": 0.02,  # each fingerprint hit = ≈$0.02 Sonnet saved
            },
            "fallback_required": False,
            "duration_ms": duration_ms}


class PreliminaryFromImage(BaseModel):
    """Progressive Stage 1 convenience — server computes HSV from image so the
    mobile client doesn't have to ship a heavy numerical library."""
    capture_id: str
    media_base64: str
    property_id: Optional[str] = None
    min_confidence: float = Field(0.85, ge=0, le=1)


@router.post("/capture/preliminary-from-image")
def capture_preliminary_from_image(body: PreliminaryFromImage):
    """Accept raw image, compute HSV histogram server-side, query fingerprint
    library. Returns the same shape as /capture/preliminary. Target <1s."""
    import time as _t
    t0 = _t.perf_counter()
    hist = _hsv_histogram_from_base64(body.media_base64)
    if sum(hist) <= 0:
        raise HTTPException(400, "could not extract HSV histogram from image")
    q = FingerprintQuery(hsv_histogram=hist, property_id=body.property_id,
                          min_confidence=body.min_confidence, k=5)
    result = query_fingerprint(q)
    matches = result.get("matches") or []
    duration_ms = int((_t.perf_counter() - t0) * 1000)
    if not matches:
        log_event("capture_preliminary_miss", capture_id=body.capture_id,
                  outputs={"duration_ms": duration_ms})
        return {"ok": True, "preliminary": None, "fallback_required": True,
                "duration_ms": duration_ms,
                "message": "No fingerprint match — run full vision for final answer"}
    top = matches[0]
    items = [{
        "item_id": f"itm-prelim-{uuid.uuid4().hex[:8]}",
        "recipe_id": top["recipe_id"], "name": top["name"],
        "count": 1.0, "unit": "portion",
        "portion_g": float(top["portion_g"]), "cost_per_unit": float(top["cost"]),
        "total_cost": round(float(top["cost"]), 2),
        "total_weight_g": float(top["portion_g"]),
        "confidence": float(top["similarity"]),
        "category": top.get("category") or "sundries",
        "source": f"fingerprint:{top['match_source']}",
        "needs_review": float(top["similarity"]) < 0.92,
    }]
    log_event("capture_preliminary_from_image_hit", capture_id=body.capture_id,
              outputs={"match_source": top["match_source"], "similarity": top["similarity"],
                        "duration_ms": duration_ms})
    return {"ok": True,
            "preliminary": {
                "capture_id": body.capture_id,
                "items": items,
                "total_cost": round(sum(i["total_cost"] for i in items), 2),
                "vision_mode": f"fingerprint_{top['match_source']}",
                "top_match": top,
                "alternatives": matches[1:],
                "needs_final_pass": True,
                "cost_saved_estimate_usd": 0.02,
            },
            "fallback_required": False,
            "duration_ms": duration_ms}

