"""iter218 · Chafer volumetric measurement (v1.4 migration 016).

NSF standard chafer catalog + single-frame volumetric estimation. Multi-frame
triangulation is Phase 2 per `07-chafer-measurement/CHAFER-MEASUREMENT-DESIGN.md`.

Endpoints:
    POST /api/waste/chafer/seed-catalog     — idempotent seed of NSF sizes
    GET  /api/waste/chafer/catalog          — list active references
    POST /api/waste/chafer/measure          — single-frame volumetric estimate
    GET  /api/waste/chafer/measurements     — per-property measurement history
"""
from __future__ import annotations
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from database import db
from lib.time import utcnow_iso
from lib.mongo import strip_id, strip_ids
from lib.waste_log import log_event

router = APIRouter(prefix="/api/waste/chafer", tags=["chafer"])


# NSF standard catalog — 20 sizes covering ~95% of US hotel buffets.
_NSF_CATALOG: List[Dict[str, Any]] = [
    # Rectangular GN (Gastronorm) / Steam Table Pans
    {"catalog_key": "full_gn_2_5", "display_name": "Full GN 2.5\"", "shape": "rectangular", "outer_width_in": 12.75, "outer_length_in": 20.875, "depth_in": 2.5, "inner_width_in": 12.375, "inner_length_in": 20.5, "capacity_at_full_l": 8.5, "capacity_at_half_l": 4.25, "typical_aspect_ratio": 0.611, "nsf_category": "1/1 GN"},
    {"catalog_key": "full_gn_4",   "display_name": "Full GN 4\"",   "shape": "rectangular", "outer_width_in": 12.75, "outer_length_in": 20.875, "depth_in": 4.0, "inner_width_in": 12.375, "inner_length_in": 20.5, "capacity_at_full_l": 13.6,"capacity_at_half_l": 6.80, "typical_aspect_ratio": 0.611, "nsf_category": "1/1 GN"},
    {"catalog_key": "full_gn_6",   "display_name": "Full GN 6\"",   "shape": "rectangular", "outer_width_in": 12.75, "outer_length_in": 20.875, "depth_in": 6.0, "inner_width_in": 12.375, "inner_length_in": 20.5, "capacity_at_full_l": 20.5,"capacity_at_half_l": 10.25,"typical_aspect_ratio": 0.611, "nsf_category": "1/1 GN"},
    {"catalog_key": "half_gn_2_5", "display_name": "Half GN 2.5\"", "shape": "rectangular", "outer_width_in": 10.375,"outer_length_in": 12.75,  "depth_in": 2.5, "inner_width_in": 10.0,   "inner_length_in": 12.375,"capacity_at_full_l": 3.8, "capacity_at_half_l": 1.90, "typical_aspect_ratio": 0.814, "nsf_category": "1/2 GN"},
    {"catalog_key": "half_gn_4",   "display_name": "Half GN 4\"",   "shape": "rectangular", "outer_width_in": 10.375,"outer_length_in": 12.75,  "depth_in": 4.0, "inner_width_in": 10.0,   "inner_length_in": 12.375,"capacity_at_full_l": 6.1, "capacity_at_half_l": 3.05, "typical_aspect_ratio": 0.814, "nsf_category": "1/2 GN"},
    {"catalog_key": "half_gn_6",   "display_name": "Half GN 6\"",   "shape": "rectangular", "outer_width_in": 10.375,"outer_length_in": 12.75,  "depth_in": 6.0, "inner_width_in": 10.0,   "inner_length_in": 12.375,"capacity_at_full_l": 9.2, "capacity_at_half_l": 4.60, "typical_aspect_ratio": 0.814, "nsf_category": "1/2 GN"},
    {"catalog_key": "third_gn_2_5","display_name": "Third GN 2.5\"","shape": "rectangular", "outer_width_in": 6.875, "outer_length_in": 12.75,  "depth_in": 2.5, "inner_width_in": 6.5,    "inner_length_in": 12.375,"capacity_at_full_l": 2.5, "capacity_at_half_l": 1.25, "typical_aspect_ratio": 0.539, "nsf_category": "1/3 GN"},
    {"catalog_key": "third_gn_4",  "display_name": "Third GN 4\"",  "shape": "rectangular", "outer_width_in": 6.875, "outer_length_in": 12.75,  "depth_in": 4.0, "inner_width_in": 6.5,    "inner_length_in": 12.375,"capacity_at_full_l": 4.0, "capacity_at_half_l": 2.00, "typical_aspect_ratio": 0.539, "nsf_category": "1/3 GN"},
    {"catalog_key": "third_gn_6",  "display_name": "Third GN 6\"",  "shape": "rectangular", "outer_width_in": 6.875, "outer_length_in": 12.75,  "depth_in": 6.0, "inner_width_in": 6.5,    "inner_length_in": 12.375,"capacity_at_full_l": 6.0, "capacity_at_half_l": 3.00, "typical_aspect_ratio": 0.539, "nsf_category": "1/3 GN"},
    {"catalog_key": "quarter_gn_2_5","display_name":"Quarter GN 2.5\"","shape":"rectangular","outer_width_in": 6.375,"outer_length_in": 10.375,"depth_in": 2.5, "inner_width_in": 6.0,    "inner_length_in": 10.0,  "capacity_at_full_l": 1.7, "capacity_at_half_l": 0.85, "typical_aspect_ratio": 0.614, "nsf_category": "1/4 GN"},
    {"catalog_key": "quarter_gn_4","display_name":"Quarter GN 4\"","shape":"rectangular",   "outer_width_in": 6.375, "outer_length_in": 10.375,"depth_in": 4.0, "inner_width_in": 6.0,    "inner_length_in": 10.0,  "capacity_at_full_l": 2.7, "capacity_at_half_l": 1.35, "typical_aspect_ratio": 0.614, "nsf_category": "1/4 GN"},
    {"catalog_key": "sixth_gn_2_5","display_name":"Sixth GN 2.5\"","shape":"rectangular",   "outer_width_in": 6.25,  "outer_length_in": 6.875, "depth_in": 2.5, "inner_width_in": 5.875,  "inner_length_in": 6.5,   "capacity_at_full_l": 1.1, "capacity_at_half_l": 0.55, "typical_aspect_ratio": 0.909, "nsf_category": "1/6 GN"},
    {"catalog_key": "sixth_gn_4",  "display_name":"Sixth GN 4\"",  "shape":"rectangular",   "outer_width_in": 6.25,  "outer_length_in": 6.875, "depth_in": 4.0, "inner_width_in": 5.875,  "inner_length_in": 6.5,   "capacity_at_full_l": 1.8, "capacity_at_half_l": 0.90, "typical_aspect_ratio": 0.909, "nsf_category": "1/6 GN"},
    # Round chafers
    {"catalog_key": "round_4qt",   "display_name": "Round 4 qt",   "shape": "round", "outer_diameter_in": 11.0, "depth_in": 4.0, "inner_diameter_in": 10.5, "capacity_at_full_l": 3.8, "capacity_at_half_l": 1.90, "nsf_category": "round"},
    {"catalog_key": "round_6qt",   "display_name": "Round 6 qt",   "shape": "round", "outer_diameter_in": 13.0, "depth_in": 5.0, "inner_diameter_in": 12.5, "capacity_at_full_l": 5.7, "capacity_at_half_l": 2.85, "nsf_category": "round"},
    {"catalog_key": "round_8qt",   "display_name": "Round 8 qt",   "shape": "round", "outer_diameter_in": 15.0, "depth_in": 6.0, "inner_diameter_in": 14.5, "capacity_at_full_l": 7.6, "capacity_at_half_l": 3.80, "nsf_category": "round"},
    {"catalog_key": "round_9qt",   "display_name": "Round 9 qt",   "shape": "round", "outer_diameter_in": 16.0, "depth_in": 6.0, "inner_diameter_in": 15.5, "capacity_at_full_l": 8.5, "capacity_at_half_l": 4.25, "nsf_category": "round"},
    # Oval
    {"catalog_key": "oval_8qt",    "display_name": "Oval 8 qt",    "shape": "oval", "outer_width_in": 17.0, "outer_length_in": 25.0, "depth_in": 4.0, "inner_width_in": 16.5, "inner_length_in": 24.5, "capacity_at_full_l": 7.6, "capacity_at_half_l": 3.80, "typical_aspect_ratio": 0.680, "nsf_category": "oval"},
    {"catalog_key": "oval_9qt",    "display_name": "Oval 9 qt",    "shape": "oval", "outer_width_in": 18.0, "outer_length_in": 27.0, "depth_in": 4.0, "inner_width_in": 17.5, "inner_length_in": 26.5, "capacity_at_full_l": 8.5, "capacity_at_half_l": 4.25, "typical_aspect_ratio": 0.667, "nsf_category": "oval"},
    # Roll-top
    {"catalog_key": "rolltop_full","display_name": "Roll-Top Full","shape": "roll_top","outer_width_in": 14.0, "outer_length_in": 24.0, "depth_in": 4.0, "inner_width_in": 12.75, "inner_length_in": 20.875, "capacity_at_full_l": 8.5, "capacity_at_half_l": 4.25, "typical_aspect_ratio": 0.583, "nsf_category": "1/1 GN roll-top"},
]


def _seed_catalog_if_needed():
    if db["chafer_reference_catalog"].count_documents({}) >= len(_NSF_CATALOG):
        return 0
    inserted = 0
    for ref in _NSF_CATALOG:
        existing = db["chafer_reference_catalog"].find_one({"catalog_key": ref["catalog_key"]})
        if existing: continue
        db["chafer_reference_catalog"].insert_one({
            "id": f"cref-{ref['catalog_key']}",
            "is_active": True,
            "created_at": utcnow_iso(),
            **ref,
        })
        inserted += 1
    return inserted


@router.post("/seed-catalog")
def seed_catalog():
    n = _seed_catalog_if_needed()
    return {"ok": True, "inserted": n,
            "total": db["chafer_reference_catalog"].count_documents({})}


@router.get("/catalog")
def list_catalog(shape: Optional[str] = None, active_only: bool = True):
    _seed_catalog_if_needed()
    q: Dict[str, Any] = {}
    if shape: q["shape"] = shape
    if active_only: q["is_active"] = True
    rows = list(db["chafer_reference_catalog"].find(q, {"_id": 0}).sort("catalog_key", 1))
    return {"ok": True, "count": len(rows), "rows": rows}


class ChaferMeasureBody(BaseModel):
    entry_id: Optional[str] = None
    item_id: Optional[str] = None
    property_id: str = "outlet-main"
    outlet_id: Optional[str] = None
    # Detection inputs — either match by catalog_key directly OR by dimensions
    catalog_key: Optional[str] = None
    detected_shape: Optional[str] = None     # rectangular|round|oval|roll_top
    detected_width_in: Optional[float] = None
    detected_length_in: Optional[float] = None
    detected_diameter_in: Optional[float] = None
    bbox_in_frame: Optional[Dict[str, float]] = None     # {x,y,w,h} pixels
    # Fill observation
    fill_fraction: float = Field(..., ge=0, le=1, description="0..1 — visible fill")
    # Recipe density (g/L) used for weight conversion — optional
    recipe_id: Optional[str] = None
    density_g_per_l: Optional[float] = None
    cost_per_g: Optional[float] = None
    # Quality flags
    lid_state: Optional[str] = None          # open|partial|closed|unknown
    steam_interference: bool = False
    water_bath_detected: bool = False
    perspective_distortion: Optional[float] = None
    source_frame_idx: Optional[int] = None


def _best_catalog_match(shape: str, w: Optional[float], l: Optional[float],
                         d: Optional[float]) -> Optional[Dict[str, Any]]:
    _seed_catalog_if_needed()
    cands = list(db["chafer_reference_catalog"].find(
        {"shape": shape, "is_active": True}, {"_id": 0}))
    best = None; best_err = 1e9
    for c in cands:
        if shape == "round":
            cd = c.get("outer_diameter_in") or 0
            if not cd or d is None: continue
            err = abs(cd - d) / cd
        else:
            cw = c.get("outer_width_in") or 0
            cl = c.get("outer_length_in") or 0
            if not cw or not cl or w is None or l is None: continue
            err = abs(cw - w) / cw + abs(cl - l) / cl
        if err < best_err:
            best_err = err; best = c
    if best is None: return None
    best["__match_err"] = best_err
    return best


@router.post("/measure")
def chafer_measure(body: ChaferMeasureBody):
    """Single-frame volumetric estimation. Target accuracy ±10-15%."""
    reference: Optional[Dict[str, Any]] = None
    if body.catalog_key:
        reference = db["chafer_reference_catalog"].find_one(
            {"catalog_key": body.catalog_key}, {"_id": 0})
        if not reference: raise HTTPException(404, f"unknown catalog_key '{body.catalog_key}'")
        match_confidence = 0.95
    elif body.detected_shape and (body.detected_diameter_in or
                                    (body.detected_width_in and body.detected_length_in)):
        reference = _best_catalog_match(body.detected_shape,
                                         body.detected_width_in,
                                         body.detected_length_in,
                                         body.detected_diameter_in)
        if not reference: raise HTTPException(400, "no catalog match found")
        err = reference.pop("__match_err", 0.5)
        # Tighter error → higher confidence (exponential falloff)
        match_confidence = round(max(0.3, min(0.98, 1.0 - err * 2)), 2)
    else:
        raise HTTPException(400, "provide catalog_key OR detected_shape + dimensions")

    cap_l = float(reference["capacity_at_full_l"])
    volume_l = round(cap_l * body.fill_fraction, 3)
    weight_g = None
    cost_usd = None
    if body.density_g_per_l:
        weight_g = round(volume_l * body.density_g_per_l, 1)
        if body.cost_per_g:
            cost_usd = round(weight_g * body.cost_per_g, 2)

    # Error bounds: base ±10%, +3% if steam, +4% if perspective > 0.4, +5% if partial lid
    err_pct = 10.0
    if body.steam_interference: err_pct += 3
    if body.perspective_distortion and body.perspective_distortion > 0.4: err_pct += 4
    if body.lid_state == "partial": err_pct += 5

    # Pixels per inch (when bbox provided)
    ppi = None
    if body.bbox_in_frame and reference.get("outer_width_in"):
        w_px = float(body.bbox_in_frame.get("w") or 0)
        if w_px > 0:
            ppi = round(w_px / float(reference["outer_width_in"]), 2)

    measurement = {
        "id": f"cmes-{uuid.uuid4().hex[:12]}",
        "entry_id": body.entry_id, "item_id": body.item_id,
        "property_id": body.property_id, "outlet_id": body.outlet_id,
        "catalog_key": reference.get("catalog_key"),
        "reference_display_name": reference.get("display_name"),
        "detected_shape": body.detected_shape or reference.get("shape"),
        "detection_confidence": 0.85,
        "match_confidence": match_confidence,
        "source_frame_idx": body.source_frame_idx,
        "bbox_in_frame": body.bbox_in_frame,
        "pixels_per_inch": ppi,
        "fill_fraction": round(float(body.fill_fraction), 3),
        "measured_volume_l": volume_l,
        "measured_weight_g": weight_g,
        "measured_cost_usd": cost_usd,
        "recipe_id": body.recipe_id,
        "density_g_per_l": body.density_g_per_l,
        "measurement_method": "single_frame",
        "frames_used_count": 1,
        "lid_state": body.lid_state or "unknown",
        "steam_interference": body.steam_interference,
        "water_bath_detected": body.water_bath_detected,
        "perspective_distortion": body.perspective_distortion,
        "volume_estimate_error_pct": round(err_pct, 2),
        "confidence_components": {
            "detection": 0.85, "catalog_match": match_confidence,
            "fill_fraction": 0.75,
        },
        "created_at": utcnow_iso(),
    }
    db["chafer_measurements"].insert_one(measurement)
    strip_id(measurement)
    log_event("chafer_measured",
              inputs={"catalog_key": measurement["catalog_key"],
                      "fill_fraction": body.fill_fraction},
              outputs={"volume_l": volume_l, "weight_g": weight_g,
                        "error_pct": err_pct})
    return {"ok": True, "measurement": measurement}


@router.get("/measurements")
def list_measurements(property_id: Optional[str] = None, limit: int = 50):
    q: Dict[str, Any] = {}
    if property_id: q["property_id"] = property_id
    rows = list(db["chafer_measurements"].find(q, {"_id": 0})
                 .sort("created_at", -1).limit(min(max(limit, 1), 200)))
    return {"ok": True, "count": len(rows), "rows": rows}
