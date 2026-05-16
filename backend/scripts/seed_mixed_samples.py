"""iter223 · Seed MIXED-ITEM benchmark samples by COMPOSING already-stored
single-item images. Reliable (no external fetch), fast, reproducible.

William's ask: "run test blueberry muffins vs chocolate muffins have other
pastries in the mix of the same image will need this for connection between
counts of separate items to individual recipes to determine cost. Run
numerous tests in increasing complexity of the images."

Strategy: pull existing single-item benchmark samples by recipe_id, tile
2-4 onto a single canvas, and persist as ONE sample with `expected_items`
= per-piece ground truth. This way the vision model must return >=N items
for a correct score and the multi-item bipartite scorer rewards both
identification and count.
"""
import io
import math
import base64
import time
from typing import Any, Dict, List, Optional

from PIL import Image
from database import db
from lib.time import utcnow_iso


PIECE_SPEC: Dict[str, Dict[str, Any]] = {
    "rec-muffin-bb":   {"label": "Blueberry Muffin", "count": 1, "portion_g": 95,
                        "category": "pastry", "cost": 1.25},
    "rec-muffin-choc": {"label": "Chocolate Muffin", "count": 1, "portion_g": 100,
                        "category": "pastry", "cost": 1.35},
    "rec-bagel-plain": {"label": "Bagel", "count": 1, "portion_g": 110,
                        "category": "pastry", "cost": 0.85},
    "rec-croissant":   {"label": "Croissant", "count": 1, "portion_g": 80,
                        "category": "pastry", "cost": 1.05},
    "rec-pancake":     {"label": "Pancake", "count": 3, "portion_g": 120,
                        "category": "pastry", "cost": 0.95},
    "rec-bacon":       {"label": "Bacon", "count": 4, "portion_g": 60,
                        "category": "protein", "cost": 2.40},
    "rec-sausage":     {"label": "Breakfast Sausage", "count": 2, "portion_g": 55,
                        "category": "protein", "cost": 1.50},
    "rec-eggs-scr":    {"label": "Scrambled Eggs", "count": 1, "portion_g": 180,
                        "category": "protein", "cost": 1.10},
    "rec-fruit-sal":   {"label": "Fruit Salad", "count": 1, "portion_g": 150,
                        "category": "produce", "cost": 1.80},
    "rec-potato":      {"label": "Roasted Potatoes", "count": 1, "portion_g": 300,
                        "category": "produce", "cost": 0.70},
    "rec-salmon":      {"label": "Salmon", "count": 1, "portion_g": 180,
                        "category": "protein", "cost": 3.20},
}


# Increasing complexity — each plan is a list of recipe_ids to compose
MIX_PLANS: List[Dict[str, Any]] = [
    # Tier 2 · 2-item (classic pairs William asked about)
    {"tier": 2, "overall": "Mix · muffin + bagel",
     "pieces": ["rec-muffin-bb", "rec-bagel-plain"]},
    {"tier": 2, "overall": "Mix · pancake + bacon",
     "pieces": ["rec-pancake", "rec-bacon"]},
    {"tier": 2, "overall": "Mix · eggs + sausage",
     "pieces": ["rec-eggs-scr", "rec-sausage"]},
    {"tier": 2, "overall": "Mix · potatoes + eggs",
     "pieces": ["rec-potato", "rec-eggs-scr"]},
    {"tier": 2, "overall": "Mix · fruit + muffin",
     "pieces": ["rec-fruit-sal", "rec-muffin-bb"]},
    {"tier": 2, "overall": "Mix · salmon + potatoes",
     "pieces": ["rec-salmon", "rec-potato"]},
    # Tier 3 · 3-item
    {"tier": 3, "overall": "Pastry trio · muffin + bagel + pancake",
     "pieces": ["rec-muffin-bb", "rec-bagel-plain", "rec-pancake"]},
    {"tier": 3, "overall": "Hot plate · eggs + bacon + potatoes",
     "pieces": ["rec-eggs-scr", "rec-bacon", "rec-potato"]},
    {"tier": 3, "overall": "Sweet+savory · pancake + sausage + fruit",
     "pieces": ["rec-pancake", "rec-sausage", "rec-fruit-sal"]},
    {"tier": 3, "overall": "Breakfast sampler · muffin + eggs + bacon",
     "pieces": ["rec-muffin-bb", "rec-eggs-scr", "rec-bacon"]},
    {"tier": 3, "overall": "Protein trio · salmon + eggs + bacon",
     "pieces": ["rec-salmon", "rec-eggs-scr", "rec-bacon"]},
    {"tier": 3, "overall": "Pastry + bacon + sausage",
     "pieces": ["rec-muffin-bb", "rec-bacon", "rec-sausage"]},
    # Tier 4 · 4-item
    {"tier": 4, "overall": "Pastry+protein · muffin + bagel + eggs + bacon",
     "pieces": ["rec-muffin-bb", "rec-bagel-plain", "rec-eggs-scr", "rec-bacon"]},
    {"tier": 4, "overall": "Full breakfast · eggs + bacon + sausage + potato",
     "pieces": ["rec-eggs-scr", "rec-bacon", "rec-sausage", "rec-potato"]},
    {"tier": 4, "overall": "Grand buffet · muffin + pancake + bacon + fruit",
     "pieces": ["rec-muffin-bb", "rec-pancake", "rec-bacon", "rec-fruit-sal"]},
    {"tier": 4, "overall": "Seaside plate · salmon + potato + eggs + fruit",
     "pieces": ["rec-salmon", "rec-potato", "rec-eggs-scr", "rec-fruit-sal"]},
    # Tier 5 · 5-item (MAX complexity — tests the scorer at scale)
    {"tier": 5, "overall": "Buffet line · muffin + bagel + eggs + bacon + potato",
     "pieces": ["rec-muffin-bb", "rec-bagel-plain", "rec-eggs-scr", "rec-bacon", "rec-potato"]},
    {"tier": 5, "overall": "Hot table · eggs + bacon + sausage + potato + pancake",
     "pieces": ["rec-eggs-scr", "rec-bacon", "rec-sausage", "rec-potato", "rec-pancake"]},
    # Tier 6 · 6-item (ultra mix)
    {"tier": 6, "overall": "Grand buffet · muffin + bagel + eggs + bacon + sausage + fruit",
     "pieces": ["rec-muffin-bb", "rec-bagel-plain", "rec-eggs-scr",
                "rec-bacon", "rec-sausage", "rec-fruit-sal"]},
]


def _load_sample_bytes(sample: Dict[str, Any]) -> Optional[bytes]:
    """Load image bytes from either inline base64 or blob storage."""
    if sample.get("media_base64"):
        try:
            return base64.b64decode(sample["media_base64"].split(",", 1)[-1])
        except Exception: return None
    url = sample.get("blob_url") or ""
    if url.startswith("/api/blob/"):
        try:
            import os
            from pathlib import Path
            parts = url.split("/")
            root = Path(os.getenv("BLOB_LOCAL_ROOT", "/app/backend/uploads"))
            p = root / parts[-2] / parts[-1]
            if p.is_file():
                return p.read_bytes()
        except Exception: return None
    return None


def _find_piece_image(recipe_id: str) -> Optional[bytes]:
    """Find a clean single-item image for the given recipe_id. Prefer
    non-mixed, non-test samples with clear labels."""
    candidates = list(db["waste_benchmark_samples"].find({
        "expected_recipe_id": recipe_id,
        "expected_items": {"$in": [None, []]},   # skip already-mixed
        "label": {"$not": {"$regex": "test widget", "$options": "i"}},
    }, {"_id": 0}).limit(10))
    for s in candidates:
        b = _load_sample_bytes(s)
        if b: return b
    return None


def _compose(pieces_img: List[Image.Image], canvas_max: int = 1280) -> bytes:
    n = len(pieces_img)
    cols = math.ceil(math.sqrt(n)); rows = math.ceil(n / cols)
    cell = canvas_max // max(cols, rows)
    canvas = Image.new("RGB", (cols * cell, rows * cell), (242, 242, 242))
    for i, im in enumerate(pieces_img):
        im.thumbnail((cell, cell), Image.LANCZOS)
        cx, cy = i % cols, i // cols
        ox = cx * cell + (cell - im.size[0]) // 2
        oy = cy * cell + (cell - im.size[1]) // 2
        canvas.paste(im, (ox, oy))
    buf = io.BytesIO(); canvas.save(buf, "JPEG", quality=88)
    return buf.getvalue()


def _persist(jpeg: bytes, plan: Dict[str, Any],
             expected_items: List[Dict[str, Any]]) -> Optional[str]:
    b64 = base64.b64encode(jpeg).decode()
    sid = f"bs-mix-t{plan['tier']}-{int(time.time() * 1000) % 10_000_000}"
    complexity = f"mixed-{len(expected_items)}" if len(expected_items) <= 3 else "mixed-4+"
    blob_url = None; backend = None
    try:
        from lib.blob_storage import store_blob
        meta = store_blob("benchmark", jpeg, content_type="image/jpeg", blob_id=sid)
        blob_url = meta["url"]; backend = meta["backend"]
    except Exception: pass
    doc = {
        "id": sid, "label": plan["overall"],
        "expected_recipe_id": None,
        "expected_count": float(sum(it["count"] for it in expected_items)),
        "expected_portion_g": float(max(it["portion_g"] for it in expected_items)),
        "expected_category": None,
        "expected_items": expected_items,
        "complexity": complexity,
        "media_type": "image",
        "source": "composed_mix",
        "notes": f"tier {plan['tier']} · mix of {len(expected_items)}: "
                 + ", ".join(it["label"] for it in expected_items),
        "blob_url": blob_url, "blob_backend": backend,
        "media_base64": b64 if not blob_url else None,
        "size_bytes": len(jpeg),
        "created_at": utcnow_iso(),
    }
    db["waste_benchmark_samples"].insert_one(doc)
    return sid


def seed_mixed_samples() -> Dict[str, Any]:
    # Load piece thumbs (one cached image per recipe_id)
    thumb_cache: Dict[str, Optional[bytes]] = {}
    for rid in PIECE_SPEC.keys():
        b = _find_piece_image(rid)
        thumb_cache[rid] = b
        if b: print(f"[piece-ok] {rid}: {len(b)//1024}KB")
        else: print(f"[piece-missing] {rid} — no single-item sample available")

    inserted: List[str] = []; skipped = 0
    for plan in MIX_PLANS:
        if any(thumb_cache.get(r) is None for r in plan["pieces"]):
            print(f"[skip] {plan['overall']} — missing pieces")
            skipped += 1; continue
        if db["waste_benchmark_samples"].find_one({"label": plan["overall"]}):
            print(f"[dup ] {plan['overall']}")
            skipped += 1; continue
        imgs: List[Image.Image] = []
        expected_items: List[Dict[str, Any]] = []
        for rid in plan["pieces"]:
            b = thumb_cache[rid]; assert b
            imgs.append(Image.open(io.BytesIO(b)).convert("RGB"))
            spec = PIECE_SPEC[rid]
            expected_items.append({
                "label": spec["label"], "recipe_id": rid,
                "count": float(spec["count"]), "portion_g": float(spec["portion_g"]),
                "category": spec["category"], "cost_per_unit": float(spec["cost"]),
            })
        jpeg = _compose(imgs, canvas_max=1280)
        sid = _persist(jpeg, plan, expected_items)
        if sid:
            inserted.append(sid)
            print(f"[ok  ] {sid} · tier{plan['tier']} · {plan['overall']} · {len(jpeg)//1024}KB")
    return {"inserted_count": len(inserted), "skipped": skipped, "ids": inserted}


if __name__ == "__main__":
    r = seed_mixed_samples()
    print(f"\nSummary: {r}")
