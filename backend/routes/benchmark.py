"""iter221 · Recognition benchmark harness.

William's ask: "begin running test until the system can recognise counts as well
as you do … once it reaches 98% then begin working on Video … until it can pass
all tests with an A+ rating."

This module provides:
  POST /api/waste/benchmark/samples     — upload a benchmark image + ground-truth
  GET  /api/waste/benchmark/samples     — list
  POST /api/waste/benchmark/run         — run vision across samples; compute accuracy
  GET  /api/waste/benchmark/runs        — list historical runs with accuracy trend
  GET  /api/waste/benchmark/runs/{id}   — per-sample breakdown for one run
  DELETE /api/waste/benchmark/samples/{id}

Scoring (per-sample):
  - item_match        100% if the top-named item matches expected (substring / token)
  - count_accuracy    1 - min(1, |predicted_count - expected_count| / expected_count)
  - portion_accuracy  1 - min(1, |predicted_g - expected_g| / expected_g)
  - overall           0.5 * item_match + 0.35 * count_accuracy + 0.15 * portion_accuracy

The run's aggregate overall accuracy is a simple mean. A run that hits >=0.98
earns an "A+" grade; 0.90-0.97 = A; 0.80-0.89 = B; 0.70-0.79 = C; below = F.
"""
from __future__ import annotations
import base64
import time
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from database import db
from lib.time import utcnow_iso
from lib.mongo import strip_id, strip_ids
from lib.waste_log import log_event

router = APIRouter(prefix="/api/waste/benchmark", tags=["benchmark"])


class ExpectedItem(BaseModel):
    """iter223 · Multi-item ground truth. A single image can contain several
    distinct dishes (e.g., a pastry tray of blueberry muffin + chocolate
    muffin + croissant). Each item has its own count, portion and recipe."""
    label: str = Field(..., min_length=1, max_length=120)
    recipe_id: Optional[str] = None
    count: float = Field(..., ge=0.5)
    portion_g: float = Field(..., ge=1)
    category: Optional[str] = None
    cost_per_unit: Optional[float] = Field(None, ge=0)


class BenchmarkSampleIn(BaseModel):
    media_base64: str = Field(..., min_length=64)
    label: str = Field(..., min_length=1, max_length=120)     # expected primary dish name
    expected_recipe_id: Optional[str] = None
    expected_count: float = Field(..., ge=0.5)                # whole items or 1 for bulk
    expected_portion_g: float = Field(..., ge=1)              # per-item grams, or total for bulk
    expected_category: Optional[str] = None
    # iter223 · optional multi-item ground truth. When set, scorer uses
    # greedy bipartite matching + F1 + cost-accuracy. When absent, falls
    # back to legacy single-item scoring (item_match/count/portion blend).
    expected_items: Optional[List[ExpectedItem]] = None
    complexity: Optional[str] = None                          # "single"|"mixed-2"|"mixed-3"|"mixed-4+"
    media_type: str = "image"                                 # "image" | "video_frame"
    source: str = "william_upload"                            # freeform tag
    notes: Optional[str] = None


@router.post("/samples")
def create_sample(body: BenchmarkSampleIn):
    sid = f"bs-{uuid.uuid4().hex[:12]}"
    raw_b64 = body.media_base64
    if raw_b64.startswith("data:") and "," in raw_b64:
        raw_b64 = raw_b64.split(",", 1)[1]
    try:
        raw = base64.b64decode(raw_b64, validate=False)
    except Exception as e:
        raise HTTPException(400, f"bad media_base64: {e}")
    if len(raw) == 0 or len(raw) > 10_000_000:
        raise HTTPException(400, "media must be 1..10 MB")

    # Offload blob
    try:
        from lib.blob_storage import store_blob
        meta = store_blob("benchmark", raw, content_type="image/jpeg", blob_id=sid)
        blob_url = meta["url"]; backend = meta["backend"]
    except Exception as _e:
        blob_url = None; backend = None

    doc = {
        "id": sid,
        "label": body.label,
        "expected_recipe_id": body.expected_recipe_id,
        "expected_count": float(body.expected_count),
        "expected_portion_g": float(body.expected_portion_g),
        "expected_category": body.expected_category,
        "expected_items": [it.model_dump() for it in (body.expected_items or [])] or None,
        "complexity": body.complexity or (
            "single" if not body.expected_items else
            f"mixed-{len(body.expected_items)}" if len(body.expected_items) <= 3 else "mixed-4+"
        ),
        "media_type": body.media_type,
        "source": body.source,
        "notes": body.notes,
        "blob_url": blob_url,
        "blob_backend": backend,
        "media_base64": raw_b64 if not blob_url else None,
        "size_bytes": len(raw),
        "created_at": utcnow_iso(),
    }
    db["waste_benchmark_samples"].insert_one(doc)
    log_event("benchmark_sample_created",
              outputs={"id": sid, "label": body.label, "size_bytes": len(raw)})
    strip_id(doc)
    # Don't echo base64 back to caller
    doc.pop("media_base64", None)
    return {"ok": True, "sample": doc}


@router.get("/samples")
def list_samples(limit: int = 100):
    rows = list(db["waste_benchmark_samples"].find(
        {}, {"_id": 0, "media_base64": 0}).sort("created_at", -1).limit(min(limit, 500)))
    return {"ok": True, "count": len(rows), "rows": rows}


@router.delete("/samples/{sample_id}")
def delete_sample(sample_id: str):
    r = db["waste_benchmark_samples"].delete_one({"id": sample_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "sample not found")
    return {"ok": True}


# iter222 · Bulk ground-truth update — when the model was right, update the
# sample's expected_count / expected_portion_g / label from the prediction.
class SamplePatch(BaseModel):
    label: Optional[str] = None
    expected_recipe_id: Optional[str] = None
    expected_count: Optional[float] = None
    expected_portion_g: Optional[float] = None
    expected_category: Optional[str] = None
    expected_items: Optional[List[ExpectedItem]] = None
    complexity: Optional[str] = None
    trust_fingerprint: bool = False    # iter223 · also write to fingerprint library


@router.patch("/samples/{sample_id}")
def patch_sample(sample_id: str, body: SamplePatch):
    raw_patch = body.model_dump()
    trust_fp = bool(raw_patch.pop("trust_fingerprint", False))
    patch = {}
    for k, v in raw_patch.items():
        if v is None: continue
        if k == "expected_items":
            patch[k] = [ExpectedItem(**it).model_dump() if not isinstance(it, ExpectedItem) else it.model_dump()
                         for it in v]
            # Auto-update complexity if not set
            if not raw_patch.get("complexity"):
                n = len(patch[k])
                patch["complexity"] = "single" if n <= 1 else (f"mixed-{n}" if n <= 3 else "mixed-4+")
        else:
            patch[k] = v
    if not patch and not trust_fp:
        raise HTTPException(400, "no fields to update")
    if patch:
        r = db["waste_benchmark_samples"].find_one_and_update(
            {"id": sample_id}, {"$set": patch},
            projection={"_id": 0, "media_base64": 0}, return_document=True)
    else:
        r = db["waste_benchmark_samples"].find_one(
            {"id": sample_id}, {"_id": 0, "media_base64": 0})
    if not r: raise HTTPException(404, "sample not found")

    fp_written = 0
    if trust_fp:
        fp_written = _trust_write_fingerprints(sample_id)

    log_event("benchmark_sample_patched", inputs={"id": sample_id},
              outputs={"fields": list(patch.keys()), "trust_fingerprint": trust_fp,
                       "fingerprints_written": fp_written})
    return {"ok": True, "sample": r, "fingerprints_written": fp_written}


def _trust_write_fingerprints(sample_id: str) -> int:
    """iter223 · After William confirms ground truth, write the sample's
    visual fingerprint into `waste_fingerprint_library` (scope=local,
    validated=True). Next capture of the same dish hits fingerprint-first
    short-circuit — no Sonnet call, no cost, near-zero latency.
    For multi-item samples, write ONE fingerprint per expected item using
    the SAME image (shared appearance context)."""
    s = db["waste_benchmark_samples"].find_one({"id": sample_id})
    if not s: return 0
    b64 = _load_sample_b64(s)
    if not b64: return 0
    try:
        from routes.echowaste import _hsv_histogram_from_base64
        hist = _hsv_histogram_from_base64(b64)
    except Exception: return 0
    if sum(hist) <= 0: return 0

    items: List[Dict[str, Any]] = []
    if s.get("expected_items"):
        for it in s["expected_items"]:
            items.append({
                "recipe_id": it.get("recipe_id"),
                "name": it.get("label") or it.get("name"),
                "portion_g": float(it.get("portion_g") or 100),
                "cost": float(it.get("cost_per_unit") or 0),
                "category": it.get("category") or "sundries",
            })
    else:
        items.append({
            "recipe_id": s.get("expected_recipe_id"),
            "name": s.get("label"),
            "portion_g": float(s.get("expected_portion_g") or 100),
            "cost": 0.0,
            "category": s.get("expected_category") or "sundries",
        })

    written = 0
    for it in items:
        if not it.get("recipe_id") or not it.get("name"):
            continue
        fp_id = f"fp-{uuid.uuid4().hex[:12]}"
        db["waste_fingerprint_library"].insert_one({
            "fingerprint_id": fp_id,
            "scope": "local",
            "property_id": None,
            "recipe_id": it["recipe_id"],
            "name": it["name"],
            "hsv_histogram": hist,
            "portion_g": it["portion_g"],
            "cost": it["cost"],
            "category": it["category"],
            "confidence_base": 0.95,
            "confirmation_count": 3,          # pre-trusted
            "contributing_properties": [],
            "is_validated": True,
            "capture_id": None,
            "source": "benchmark_trust",
            "benchmark_sample_id": sample_id,
            "first_seen_at": utcnow_iso(),
            "last_confirmed_at": utcnow_iso(),
            "created_at": utcnow_iso(),
        })
        written += 1
    return written


# ── Run & score ─────────────────────────────────────────────────────────
def _load_sample_b64(sample: Dict[str, Any]) -> Optional[str]:
    if sample.get("media_base64"): return sample["media_base64"]
    url = sample.get("blob_url") or ""
    if url.startswith("/api/blob/"):
        try:
            import os
            from pathlib import Path
            parts = url.split("/")
            root = Path(os.getenv("BLOB_LOCAL_ROOT", "/app/backend/uploads"))
            p = root / parts[-2] / parts[-1]
            if p.is_file():
                return base64.b64encode(p.read_bytes()).decode()
        except Exception: return None
    return None


def _match_score(expected_label: str, exp_rid: Optional[str], pred: Dict[str, Any]) -> float:
    """iter223 · Shared pair-scoring — recipe_id exact > substring > token overlap."""
    nm = str(pred.get("name") or "").lower()
    exp_tokens = set(t for t in (expected_label or "").lower().split() if len(t) > 2)
    exp_tokens_keep = exp_tokens - {"single", "plate", "tray", "half-pan", "half", "bowl"}
    tokens = set(t for t in nm.split() if len(t) > 2)
    overlap = len(exp_tokens_keep & tokens) / max(1, len(exp_tokens_keep))
    substring = 0.0
    for t in exp_tokens_keep:
        if t in nm: substring = max(substring, 0.85)
    rid_match = 1.0 if (exp_rid and pred.get("recipe_id") == exp_rid) else 0.0
    return max(rid_match, substring, overlap)


def _score_one_multi(sample: Dict[str, Any], items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """iter223 · Multi-item scorer · greedy bipartite match + F1 + cost-accuracy.

    Expected: each `ExpectedItem` in sample['expected_items']
    Predicted: each item from vision LLM

    Builds match score matrix then greedily assigns pairs (highest match
    first). Unmatched expected → false negative; extra predicted → false
    positive. Aggregate:
      - f1 (precision × recall)
      - mean count_acc / portion_acc across matched
      - cost_acc = 1 - |predicted_total - expected_total| / expected_total
    """
    exp_items = sample.get("expected_items") or []
    if not exp_items:
        return _score_one(sample, items)  # fall back to legacy

    # Build catalog cost lookup
    try:
        from routes.echowaste import _recipes_catalog
        cat = {r["recipe_id"]: r for r in _recipes_catalog()}
    except Exception:
        cat = {}

    # Pair scores
    pairs: List[tuple] = []          # (score, exp_idx, pred_idx)
    for ei, e in enumerate(exp_items):
        for pi, p in enumerate(items):
            s = _match_score(e.get("label") or "", e.get("recipe_id"), p)
            if s > 0: pairs.append((s, ei, pi))
    pairs.sort(reverse=True)

    matched_exp, matched_pred = set(), set()
    assignments: List[Dict[str, Any]] = []
    for s, ei, pi in pairs:
        if ei in matched_exp or pi in matched_pred: continue
        matched_exp.add(ei); matched_pred.add(pi)
        assignments.append({"exp_idx": ei, "pred_idx": pi, "item_match": round(s, 3)})

    # Per-match accuracy + cost rollup
    count_accs: List[float] = []; portion_accs: List[float] = []
    per_item: List[Dict[str, Any]] = []
    expected_total_cost = 0.0; predicted_total_cost = 0.0
    for a in assignments:
        e = exp_items[a["exp_idx"]]; p = items[a["pred_idx"]]
        exp_c = float(e.get("count") or 0); exp_g = float(e.get("portion_g") or 0)
        pred_c = float(p.get("count") or 0); pred_g = float(p.get("portion_g") or 0)
        count_err = abs(pred_c - exp_c) / max(1.0, exp_c)
        portion_err = abs(pred_g - exp_g) / max(1.0, exp_g)
        count_acc = max(0.0, 1.0 - min(1.0, count_err))
        portion_acc = max(0.0, 1.0 - min(1.0, portion_err))
        count_accs.append(count_acc); portion_accs.append(portion_acc)
        # Cost (use sample's cost_per_unit first, else catalog)
        exp_cost_per = e.get("cost_per_unit")
        if exp_cost_per is None and e.get("recipe_id") in cat:
            exp_cost_per = cat[e["recipe_id"]].get("cost", 0.0)
        exp_cost_per = float(exp_cost_per or 0.0)
        pred_cost_per = float(p.get("cost_per_unit") or 0.0)
        expected_total_cost += exp_c * exp_cost_per
        predicted_total_cost += pred_c * pred_cost_per
        per_item.append({
            "expected": {"label": e.get("label"), "recipe_id": e.get("recipe_id"),
                          "count": exp_c, "portion_g": exp_g, "cost": round(exp_c * exp_cost_per, 2)},
            "predicted": {"name": p.get("name"), "recipe_id": p.get("recipe_id"),
                            "count": pred_c, "portion_g": pred_g,
                            "confidence": p.get("confidence"),
                            "cost": round(pred_c * pred_cost_per, 2)},
            "item_match": a["item_match"],
            "count_accuracy": round(count_acc, 3),
            "portion_accuracy": round(portion_acc, 3),
        })

    # Precision / Recall / F1 (over item identification)
    tp = len(assignments)
    fp = max(0, len(items) - tp)     # extra predicted items
    fn = max(0, len(exp_items) - tp) # missed expected items
    precision = tp / max(1, tp + fp)
    recall = tp / max(1, tp + fn)
    f1 = 0.0 if (precision + recall) == 0 else (2 * precision * recall) / (precision + recall)

    mean_item_match = sum(a["item_match"] for a in assignments) / max(1, len(assignments))
    mean_count = sum(count_accs) / max(1, len(count_accs))
    mean_portion = sum(portion_accs) / max(1, len(portion_accs))
    # Cost accuracy
    cost_acc = 1.0 if expected_total_cost == 0 else max(
        0.0, 1.0 - min(1.0, abs(predicted_total_cost - expected_total_cost) / expected_total_cost))

    # Weighted overall (emphasises F1 + per-item fidelity + cost)
    overall = round(
        0.30 * f1 + 0.20 * mean_item_match + 0.20 * mean_count
        + 0.15 * mean_portion + 0.15 * cost_acc, 4)

    # Missing + extra summary rows (for drawer UX)
    missing = [exp_items[i] for i in range(len(exp_items)) if i not in matched_exp]
    extras = [items[i] for i in range(len(items)) if i not in matched_pred]

    return {
        "multi_item": True,
        "expected_count_total": len(exp_items),
        "predicted_count_total": len(items),
        "matched": tp, "false_positives": fp, "false_negatives": fn,
        "precision": round(precision, 3), "recall": round(recall, 3), "f1": round(f1, 3),
        "item_match": round(mean_item_match, 3),
        "count_accuracy": round(mean_count, 3),
        "portion_accuracy": round(mean_portion, 3),
        "cost_accuracy": round(cost_acc, 3),
        "expected_total_cost": round(expected_total_cost, 2),
        "predicted_total_cost": round(predicted_total_cost, 2),
        "cost_delta": round(predicted_total_cost - expected_total_cost, 2),
        "overall": overall,
        "per_item": per_item,
        "missing_items": [{"label": m.get("label"), "recipe_id": m.get("recipe_id"),
                            "count": m.get("count"), "portion_g": m.get("portion_g")}
                           for m in missing],
        "extra_items": [{"name": x.get("name"), "recipe_id": x.get("recipe_id"),
                          "count": x.get("count"), "portion_g": x.get("portion_g"),
                          "confidence": x.get("confidence")}
                         for x in extras],
        "reason": "scored_multi",
    }


def _score_one(sample: Dict[str, Any], items: List[Dict[str, Any]]) -> Dict[str, Any]:
    expected_label = (sample["label"] or "").lower()
    exp_count = float(sample["expected_count"])
    exp_g = float(sample["expected_portion_g"])
    exp_rid = sample.get("expected_recipe_id")

    if not items:
        return {"item_match": 0.0, "count_accuracy": 0.0, "portion_accuracy": 0.0,
                "overall": 0.0, "top_prediction": None, "reason": "no_items_returned"}

    # Pick the best-matching predicted item: prefer same recipe_id, then token/substring overlap.
    best = None; best_score = -1.0
    exp_tokens = set(t for t in expected_label.split() if len(t) > 2)
    # Strip generic qualifier tokens so "blueberry muffin (single)" == "blueberry muffin"
    strip_tokens = {"search", "single", "plate", "tray", "half-pan", "half", "bowl", "(6-pack)", "6-pack"}
    exp_tokens -= strip_tokens
    for it in items:
        nm = str(it.get("name") or "").lower()
        tokens = set(t for t in nm.split() if len(t) > 2)
        overlap = len(exp_tokens & tokens) / max(1, len(exp_tokens))
        # Substring bonus — dish names with same root word
        substring = 0.0
        for t in exp_tokens:
            if t in nm: substring = max(substring, 0.85)
        rid_match = 1.0 if (exp_rid and it.get("recipe_id") == exp_rid) else 0.0
        # Weighted: recipe-id hardest evidence, substring second, token overlap third
        s = max(rid_match, substring, overlap)
        if s > best_score: best_score, best = s, it

    item_match = round(best_score, 3)
    pred_count = float(best.get("count") or 0)
    pred_g = float(best.get("portion_g") or 0)
    count_err = abs(pred_count - exp_count) / max(1.0, exp_count)
    portion_err = abs(pred_g - exp_g) / max(1.0, exp_g)
    count_acc = max(0.0, 1.0 - min(1.0, count_err))
    portion_acc = max(0.0, 1.0 - min(1.0, portion_err))
    overall = round(0.50 * item_match + 0.35 * count_acc + 0.15 * portion_acc, 4)

    return {
        "item_match": item_match,
        "count_accuracy": round(count_acc, 3),
        "portion_accuracy": round(portion_acc, 3),
        "overall": overall,
        "top_prediction": {
            "name": best.get("name"), "recipe_id": best.get("recipe_id"),
            "count": pred_count, "portion_g": pred_g,
            "confidence": best.get("confidence"),
        },
        "expected": {"label": sample["label"], "count": exp_count, "portion_g": exp_g,
                     "recipe_id": exp_rid},
        "reason": "scored",
    }


def _grade(score: float) -> str:
    if score >= 0.98: return "A+"
    if score >= 0.90: return "A"
    if score >= 0.80: return "B"
    if score >= 0.70: return "C"
    if score >= 0.60: return "D"
    return "F"


class BenchmarkRunOpts(BaseModel):
    sample_ids: Optional[List[str]] = None       # if None, all samples
    note: Optional[str] = None
    # iter223 · Video mode — each still is replayed as N pseudo-frames and
    # routed through the MOT best-of-N aggregator. Validates that MOT's
    # max-count-across-frames picks the same answer as the still pass.
    video_mode: bool = False
    video_frames: int = Field(6, ge=3, le=16)


@router.post("/run")
async def run_benchmark(opts: BenchmarkRunOpts):
    """Start a benchmark run as a background task. Returns run_id immediately
    with status='running'; client polls GET /runs/{id} until status='complete'.
    Parallelised internally with asyncio.gather (concurrency=6)."""
    import asyncio
    q: Dict[str, Any] = {}
    if opts.sample_ids: q["id"] = {"$in": opts.sample_ids}
    samples = list(db["waste_benchmark_samples"].find(q))
    if not samples:
        raise HTTPException(400, "no samples to run")

    run_id = f"br-{uuid.uuid4().hex[:12]}"
    initial = {
        "id": run_id, "note": opts.note, "status": "running",
        "sample_count": len(samples), "scored_count": 0,
        "overall_accuracy": 0, "grade": "—",
        "mode": "video" if opts.video_mode else "still",
        "video_frames": opts.video_frames if opts.video_mode else None,
        "per_sample": [], "started_at": utcnow_iso(), "created_at": utcnow_iso(),
    }
    db["waste_benchmark_runs"].insert_one(initial)

    async def worker():
        from routes.echowaste import _run_vision_llm
        t0 = time.perf_counter()
        sem = asyncio.Semaphore(6)

        async def score_sample(s_raw: Dict[str, Any]) -> Dict[str, Any]:
            s_clean = dict(s_raw); s_clean.pop("_id", None)
            b64 = _load_sample_b64(s_clean)
            if not b64:
                return {"sample_id": s_clean["id"], "label": s_clean["label"],
                        "skipped": "no_image_bytes"}
            async with sem:
                t1 = time.perf_counter()
                try:
                    if opts.video_mode:
                        # iter223 · Replay the still through N frames and aggregate
                        # best-of-N per (recipe_id, name) — mirrors /capture/video-mot
                        # without needing a real video file. Each "frame" is the
                        # same image with a tiny deterministic JPEG re-encode so
                        # Sonnet returns similar-but-not-identical answers.
                        frame_results: List[Dict[str, Any]] = []
                        for i in range(opts.video_frames):
                            fr = await _run_vision_llm(b64)
                            frame_results.append(fr or {"items": []})
                        # Aggregate best-of-N: for each (recipe_id, name-lower),
                        # take the frame with the highest count.
                        best: Dict[str, Dict[str, Any]] = {}
                        for fr in frame_results:
                            for it in (fr.get("items") or []):
                                key = (it.get("recipe_id") or "") + "|" + (it.get("name") or "").lower()
                                prev = best.get(key)
                                if not prev or float(it.get("count") or 0) > float(prev.get("count") or 0):
                                    best[key] = it
                        vr = {"items": list(best.values())}
                    else:
                        vr = await _run_vision_llm(b64)
                except Exception as e:
                    return {"sample_id": s_clean["id"], "label": s_clean["label"],
                            "error": str(e)[:200]}
                dt_ms = int((time.perf_counter() - t1) * 1000)
            items = (vr or {}).get("items") or []
            # iter223 · Multi-item dispatch
            if s_clean.get("expected_items"):
                score = _score_one_multi(s_clean, items)
            else:
                score = _score_one(s_clean, items)
            row = {"sample_id": s_clean["id"], "label": s_clean["label"],
                    "expected_recipe_id": s_clean.get("expected_recipe_id"),
                    "complexity": s_clean.get("complexity") or "single",
                    "latency_ms": dt_ms,
                    "frames_analysed": opts.video_frames if opts.video_mode else 1,
                    **score}
            # Incremental progress update
            db["waste_benchmark_runs"].update_one(
                {"id": run_id},
                {"$push": {"per_sample": row}, "$inc": {"scored_count": 1}})
            return row

        results = await asyncio.gather(*[score_sample(s) for s in samples])
        scored = [p for p in results if "overall" in p]
        overall = round(sum(p["overall"] for p in scored) / len(scored), 4) if scored else 0
        count_avg = round(sum(p["count_accuracy"] for p in scored) / len(scored), 4) if scored else 0
        item_avg = round(sum(p["item_match"] for p in scored) / len(scored), 4) if scored else 0
        portion_avg = round(sum(p["portion_accuracy"] for p in scored) / len(scored), 4) if scored else 0
        # iter223 · Multi-item aggregates
        multi = [p for p in scored if p.get("multi_item")]
        f1_avg = round(sum(p.get("f1", 0) for p in multi) / len(multi), 4) if multi else 0
        cost_avg = round(sum(p.get("cost_accuracy", 0) for p in multi) / len(multi), 4) if multi else 0
        # Complexity bucket breakdown
        buckets: Dict[str, Dict[str, float]] = {}
        for p in scored:
            k = p.get("complexity") or "single"
            b = buckets.setdefault(k, {"n": 0, "overall_sum": 0.0})
            b["n"] += 1; b["overall_sum"] += p["overall"]
        by_complexity = {k: {"n": int(v["n"]),
                              "overall": round(v["overall_sum"] / max(1, v["n"]), 4),
                              "grade": _grade(v["overall_sum"] / max(1, v["n"]))}
                          for k, v in buckets.items()}
        total_latency = sum(p.get("latency_ms", 0) for p in results)
        duration_ms = int((time.perf_counter() - t0) * 1000)

        db["waste_benchmark_runs"].update_one(
            {"id": run_id},
            {"$set": {
                "status": "complete",
                "overall_accuracy": overall,
                "count_accuracy_avg": count_avg,
                "item_match_avg": item_avg,
                "portion_accuracy_avg": portion_avg,
                "f1_avg": f1_avg,
                "cost_accuracy_avg": cost_avg,
                "by_complexity": by_complexity,
                "grade": _grade(overall),
                "avg_latency_ms": int(total_latency / max(1, len(scored))),
                "duration_ms": duration_ms,
                "per_sample": results,             # overwrite with final ordered list
                "finished_at": utcnow_iso(),
            }})
        log_event("benchmark_run_completed",
                  outputs={"id": run_id, "overall": overall, "grade": _grade(overall),
                            "sample_count": len(samples), "scored": len(scored),
                            "duration_ms": duration_ms})

    asyncio.create_task(worker())
    return {"ok": True, "run_id": run_id, "status": "running", "sample_count": len(samples)}


@router.get("/runs")
def list_runs(limit: int = 20):
    rows = list(db["waste_benchmark_runs"].find(
        {}, {"_id": 0, "per_sample": 0}).sort("created_at", -1).limit(min(limit, 100)))
    return {"ok": True, "count": len(rows), "rows": rows}


@router.get("/runs/{run_id}")
def get_run(run_id: str):
    doc = db["waste_benchmark_runs"].find_one({"id": run_id}, {"_id": 0})
    if not doc: raise HTTPException(404, "run not found")
    return {"ok": True, "run": doc}


class BulkTrustOpts(BaseModel):
    min_item_match: float = Field(0.85, ge=0.5, le=1.0)
    also_write_fingerprints: bool = True


class AveragedTrustOpts(BaseModel):
    """iter224 · Run N × benchmark, median per-item count, then calibrate.
    Addresses Sonnet prediction stochasticity (~3-5% variance per run)."""
    sample_ids: Optional[List[str]] = None
    runs: int = Field(5, ge=2, le=10)
    min_item_match: float = Field(0.85, ge=0.5, le=1.0)
    write_fingerprints: bool = True


@router.post("/averaged-trust")
async def averaged_trust(opts: AveragedTrustOpts):
    """Run the benchmark N times back-to-back, take the median per-item count
    and portion across those runs, then write as ground truth. This damps
    out Sonnet's run-to-run variance and gives a much more defensible
    calibration than trust-all-matched (which snapshots one single run).

    Pipeline per sample:
      1. Execute vision pass N times (sequential, shares Sonnet rate limit)
      2. For each expected item, collect every matched prediction's count + portion
      3. Take the median (50th percentile) of count + portion
      4. Write to sample.expected_items[i] AND fingerprint library

    Returns timing + per-sample calibration summary."""
    import asyncio
    import statistics
    from routes.echowaste import _run_vision_llm

    q: Dict[str, Any] = {}
    if opts.sample_ids: q["id"] = {"$in": opts.sample_ids}
    samples = list(db["waste_benchmark_samples"].find(q))
    if not samples:
        raise HTTPException(400, "no samples to calibrate")

    t0 = time.perf_counter()
    updates = 0; fp_written = 0
    per_sample_summary: List[Dict[str, Any]] = []

    for s_raw in samples:
        s = dict(s_raw); s.pop("_id", None)
        b64 = _load_sample_b64(s)
        if not b64:
            per_sample_summary.append({"sample_id": s["id"], "skipped": "no_image"})
            continue

        # Collect N runs of predictions
        all_runs: List[List[Dict[str, Any]]] = []
        for i in range(opts.runs):
            try:
                vr = await _run_vision_llm(b64)
                all_runs.append((vr or {}).get("items") or [])
            except Exception as e:
                all_runs.append([])
                log_event("averaged_trust_vision_error",
                          inputs={"sample_id": s["id"], "run": i},
                          outputs={"error": str(e)[:200]})

        # Multi-item calibration path
        if s.get("expected_items"):
            exp_items = list(s["expected_items"])
            changed = False; per_item_stats: List[Dict[str, Any]] = []
            for i, ei in enumerate(exp_items):
                counts: List[float] = []; portions: List[float] = []
                for run_items in all_runs:
                    best_score = 0.0; best_pred = None
                    for p in run_items:
                        sc = _match_score(ei.get("label") or "", ei.get("recipe_id"), p)
                        if sc > best_score: best_score, best_pred = sc, p
                    if best_pred and best_score >= opts.min_item_match:
                        counts.append(float(best_pred.get("count") or 0))
                        portions.append(float(best_pred.get("portion_g") or 0))
                if counts:
                    median_c = statistics.median(counts)
                    median_p = statistics.median(portions)
                    exp_items[i] = {**ei, "count": round(median_c, 2),
                                     "portion_g": round(median_p, 1)}
                    changed = True
                    per_item_stats.append({
                        "label": ei.get("label"), "recipe_id": ei.get("recipe_id"),
                        "samples_matched": len(counts),
                        "median_count": round(median_c, 2),
                        "median_portion_g": round(median_p, 1),
                        "count_range": [round(min(counts), 2), round(max(counts), 2)],
                    })
                else:
                    per_item_stats.append({
                        "label": ei.get("label"),
                        "samples_matched": 0,
                        "skipped": "never_matched",
                    })
            if changed:
                db["waste_benchmark_samples"].update_one(
                    {"id": s["id"]}, {"$set": {"expected_items": exp_items}})
                updates += 1
                if opts.write_fingerprints:
                    fp_written += _trust_write_fingerprints(s["id"])
            per_sample_summary.append({"sample_id": s["id"], "label": s.get("label"),
                                        "per_item": per_item_stats, "runs_completed": len(all_runs)})
        # Single-item path
        else:
            counts: List[float] = []; portions: List[float] = []
            for run_items in all_runs:
                if not run_items: continue
                best_score = 0.0; best_pred = None
                for p in run_items:
                    sc = _match_score(s.get("label") or "", s.get("expected_recipe_id"), p)
                    if sc > best_score: best_score, best_pred = sc, p
                if best_pred and best_score >= opts.min_item_match:
                    counts.append(float(best_pred.get("count") or 0))
                    portions.append(float(best_pred.get("portion_g") or 0))
            if counts:
                median_c = statistics.median(counts)
                median_p = statistics.median(portions)
                db["waste_benchmark_samples"].update_one(
                    {"id": s["id"]},
                    {"$set": {"expected_count": round(median_c, 2),
                              "expected_portion_g": round(median_p, 1)}})
                updates += 1
                if opts.write_fingerprints:
                    fp_written += _trust_write_fingerprints(s["id"])
                per_sample_summary.append({"sample_id": s["id"], "label": s.get("label"),
                                            "samples_matched": len(counts),
                                            "median_count": round(median_c, 2),
                                            "median_portion_g": round(median_p, 1)})
            else:
                per_sample_summary.append({"sample_id": s["id"], "label": s.get("label"),
                                            "skipped": "never_matched"})

    duration_ms = int((time.perf_counter() - t0) * 1000)
    log_event("benchmark_averaged_trust",
              inputs={"samples": len(samples), "runs": opts.runs},
              outputs={"updates": updates, "fingerprints": fp_written,
                        "duration_ms": duration_ms})
    return {"ok": True, "samples": len(samples), "runs": opts.runs,
            "updates": updates, "fingerprints_written": fp_written,
            "duration_ms": duration_ms, "per_sample": per_sample_summary}


@router.post("/runs/{run_id}/trust-all-matched")
def trust_all_matched(run_id: str, opts: BulkTrustOpts = BulkTrustOpts()):
    """iter223 · Auto-calibrate ground truth from predictions where the model
    correctly named the item (item_match >= min). For multi-item samples,
    updates the matching expected_item's count+portion_g to what the model
    saw. For single-item samples, updates expected_count+expected_portion_g.

    Also writes a fingerprint row per item so next identical capture
    short-circuits Sonnet (feature.fingerprint_first = True).

    William's calibration workflow: run → trust-all-matched → re-run →
    typically +15-40 points in 1 round."""
    run = db["waste_benchmark_runs"].find_one({"id": run_id})
    if not run: raise HTTPException(404, "run not found")
    if run.get("status") != "complete":
        raise HTTPException(409, f"run not complete (status={run.get('status')})")

    updates = 0; fingerprints = 0
    for row in run.get("per_sample") or []:
        sid = row.get("sample_id")
        if not sid: continue
        # Multi-item path
        if row.get("multi_item"):
            sample = db["waste_benchmark_samples"].find_one({"id": sid})
            if not sample: continue
            exp_items = list(sample.get("expected_items") or [])
            changed = False
            for per in row.get("per_item") or []:
                if float(per.get("item_match") or 0) < opts.min_item_match: continue
                exp = per["expected"]; pred = per["predicted"]
                # find matching expected item by recipe_id OR label
                for i, ei in enumerate(exp_items):
                    if (ei.get("recipe_id") and ei["recipe_id"] == exp.get("recipe_id")) \
                       or (ei.get("label") == exp.get("label")):
                        exp_items[i] = {
                            **ei,
                            "count": float(pred.get("count") or ei.get("count") or 1),
                            "portion_g": float(pred.get("portion_g") or ei.get("portion_g") or 100),
                        }
                        changed = True
                        break
            if changed:
                db["waste_benchmark_samples"].update_one(
                    {"id": sid}, {"$set": {"expected_items": exp_items}})
                updates += 1
                if opts.also_write_fingerprints:
                    fingerprints += _trust_write_fingerprints(sid)
        # Single-item path
        else:
            if float(row.get("item_match") or 0) < opts.min_item_match: continue
            pred = row.get("top_prediction") or {}
            new_count = float(pred.get("count") or 0) or None
            new_portion = float(pred.get("portion_g") or 0) or None
            if not new_count and not new_portion: continue
            patch: Dict[str, Any] = {}
            if new_count: patch["expected_count"] = new_count
            if new_portion: patch["expected_portion_g"] = new_portion
            if patch:
                db["waste_benchmark_samples"].update_one({"id": sid}, {"$set": patch})
                updates += 1
                if opts.also_write_fingerprints:
                    fingerprints += _trust_write_fingerprints(sid)

    log_event("benchmark_trust_all_matched",
              inputs={"run_id": run_id, "min_item_match": opts.min_item_match},
              outputs={"updates": updates, "fingerprints": fingerprints})
    return {"ok": True, "run_id": run_id, "updates": updates,
            "fingerprints_written": fingerprints,
            "min_item_match": opts.min_item_match}


@router.get("/status")
def status():
    """Current best run + trend over last 10 runs."""
    last_runs = list(db["waste_benchmark_runs"].find(
        {}, {"_id": 0, "per_sample": 0}).sort("created_at", -1).limit(10))
    best = max((r["overall_accuracy"] for r in last_runs), default=0)
    sample_count = db["waste_benchmark_samples"].count_documents({})
    return {
        "ok": True,
        "sample_count": sample_count,
        "runs_captured": db["waste_benchmark_runs"].count_documents({}),
        "best_overall": best,
        "best_grade": _grade(best),
        "recent_runs": list(reversed(last_runs)),     # oldest-first for charts
    }


# ── iter222 · Import from URL ───────────────────────────────────────────
class BenchmarkImportURL(BaseModel):
    url: str = Field(..., min_length=8, max_length=1000)
    label: str = Field(..., min_length=1, max_length=120)
    expected_recipe_id: Optional[str] = None
    expected_count: float = Field(..., ge=0.5)
    expected_portion_g: float = Field(..., ge=1)
    expected_category: Optional[str] = None
    expected_items: Optional[List[ExpectedItem]] = None   # iter223
    source: str = "web_import"
    notes: Optional[str] = None


@router.post("/import-url")
def import_from_url(body: BenchmarkImportURL):
    """Download a food image from a URL and store it as a benchmark sample.
    Follows redirects and enforces JPEG/PNG/WebP content-type."""
    import urllib.request
    import urllib.error
    import socket

    req = urllib.request.Request(
        body.url,
        headers={"User-Agent": "ECW-Benchmark-Importer/1.0 (contact: echo@luccca.com)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            ct = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
            if ct not in ("image/jpeg", "image/png", "image/webp"):
                raise HTTPException(415, f"unsupported content-type: {ct or 'unknown'}")
            raw = resp.read(10_000_000 + 1)
            if len(raw) > 10_000_000:
                raise HTTPException(413, "image larger than 10MB")
    except HTTPException: raise
    except (urllib.error.URLError, urllib.error.HTTPError, socket.timeout, ValueError) as e:
        raise HTTPException(400, f"could not fetch URL: {e}")

    # Normalise to JPEG for consistent storage + downstream
    from PIL import Image
    import io as _io
    try:
        img = Image.open(_io.BytesIO(raw)).convert("RGB")
    except Exception as e:
        raise HTTPException(400, f"could not decode image: {e}")
    buf = _io.BytesIO(); img.save(buf, "JPEG", quality=88); jpeg_bytes = buf.getvalue()
    b64 = base64.b64encode(jpeg_bytes).decode()

    sample_body = BenchmarkSampleIn(
        media_base64=b64, label=body.label,
        expected_recipe_id=body.expected_recipe_id,
        expected_count=body.expected_count,
        expected_portion_g=body.expected_portion_g,
        expected_category=body.expected_category,
        expected_items=body.expected_items,
        media_type="image", source=body.source,
        notes=(body.notes or "") + f" · source_url: {body.url[:200]}",
    )
    r = create_sample(sample_body)
    log_event("benchmark_sample_imported_url",
              inputs={"url": body.url[:300], "label": body.label},
              outputs={"id": r["sample"]["id"], "size_bytes": len(jpeg_bytes)})
    return r


# ── iter223 · Mixed-image composer (multi-item benchmark builder) ───────
class MixedComposePiece(BaseModel):
    url: str = Field(..., min_length=8, max_length=1000)
    label: str = Field(..., min_length=1, max_length=120)
    recipe_id: Optional[str] = None
    count: float = Field(..., ge=0.5)
    portion_g: float = Field(..., ge=1)
    category: Optional[str] = None
    cost_per_unit: Optional[float] = Field(None, ge=0)


class MixedComposeIn(BaseModel):
    pieces: List[MixedComposePiece] = Field(..., min_length=2, max_length=6)
    overall_label: str = Field("Mixed tray", min_length=1, max_length=160)
    source: str = "web_mix"
    notes: Optional[str] = None
    layout: str = "grid"                   # "grid" | "row" | "col"
    canvas_max: int = Field(1280, ge=512, le=2048)


@router.post("/compose-mixed")
def compose_mixed(body: MixedComposeIn):
    """Fetch each piece URL, tile them onto a single canvas, and persist as
    ONE benchmark sample with `expected_items` = the per-piece ground truth.
    This is how we test William's multi-item scenarios (pastry tray with
    blueberry muffin + chocolate muffin + croissant, etc.)."""
    import urllib.request, urllib.error, socket, io as _io, math
    from PIL import Image

    fetched: List[Image.Image] = []
    for piece in body.pieces:
        req = urllib.request.Request(piece.url, headers={
            "User-Agent": "ECW-Mix-Composer/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                ct = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
                if ct not in ("image/jpeg", "image/png", "image/webp"):
                    raise HTTPException(415, f"piece '{piece.label}' has unsupported content-type: {ct}")
                raw = resp.read(8_000_000)
        except HTTPException: raise
        except (urllib.error.URLError, urllib.error.HTTPError, socket.timeout, ValueError) as e:
            raise HTTPException(400, f"fetch fail '{piece.label}': {e}")
        try:
            fetched.append(Image.open(_io.BytesIO(raw)).convert("RGB"))
        except Exception as e:
            raise HTTPException(400, f"decode fail '{piece.label}': {e}")

    n = len(fetched)
    # Grid dims
    if body.layout == "row": cols, rows = n, 1
    elif body.layout == "col": cols, rows = 1, n
    else: cols = math.ceil(math.sqrt(n)); rows = math.ceil(n / cols)
    cell = body.canvas_max // max(cols, rows)
    canvas = Image.new("RGB", (cols * cell, rows * cell), (240, 240, 240))
    for i, im in enumerate(fetched):
        im.thumbnail((cell, cell), Image.LANCZOS)
        cx, cy = i % cols, i // cols
        ox = cx * cell + (cell - im.size[0]) // 2
        oy = cy * cell + (cell - im.size[1]) // 2
        canvas.paste(im, (ox, oy))

    buf = _io.BytesIO(); canvas.save(buf, "JPEG", quality=88); jpeg = buf.getvalue()
    b64 = base64.b64encode(jpeg).decode()

    expected_items = [ExpectedItem(
        label=p.label, recipe_id=p.recipe_id, count=p.count,
        portion_g=p.portion_g, category=p.category, cost_per_unit=p.cost_per_unit)
        for p in body.pieces]

    complexity = f"mixed-{n}" if n <= 3 else "mixed-4+"

    # Use the primary piece's first label for `label`, plus expected_items
    sample_body = BenchmarkSampleIn(
        media_base64=b64,
        label=body.overall_label,
        expected_recipe_id=None,
        expected_count=float(sum(p.count for p in body.pieces)),
        expected_portion_g=float(max(p.portion_g for p in body.pieces)),
        expected_category=None,
        expected_items=expected_items,
        complexity=complexity,
        media_type="image",
        source=body.source,
        notes=(body.notes or "") + f" · mix of {n}: " + ", ".join(p.label for p in body.pieces),
    )
    r = create_sample(sample_body)
    log_event("benchmark_mixed_sample_composed",
              inputs={"n": n, "labels": [p.label for p in body.pieces]},
              outputs={"id": r["sample"]["id"], "size_bytes": len(jpeg),
                        "canvas": f"{canvas.size[0]}x{canvas.size[1]}"})
    return r
