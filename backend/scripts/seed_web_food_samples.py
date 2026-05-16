"""iter222 · Import real food photos from the web as benchmark samples.

Uses TheMealDB (free, CC-licensed, no API key) as the primary source. Each
known-recipe → search by name → grab strMealThumb URL. Stable CDN, no bot
blocks. Fallback to a handful of curated Unsplash direct URLs for buffet /
chafer shots where TheMealDB doesn't have a match.

Idempotent — skips URLs already imported (tracked via the notes field).
"""
import json
import time
import urllib.request
import urllib.error
import socket
import base64
import io
from typing import Any, Dict, List, Optional

from PIL import Image
from database import db
from lib.time import utcnow_iso


# (recipe_id, search_term, expected_count, expected_portion_g, category, notes)
MEALDB_SEARCHES: List[Dict[str, Any]] = [
    {"recipe_id": "rec-muffin-bb",  "search": "muffin",     "count": 1,  "portion_g": 95,  "category": "pastry"},
    {"recipe_id": "rec-muffin-bb",  "search": "blueberry",  "count": 1,  "portion_g": 95,  "category": "pastry"},
    {"recipe_id": "rec-bagel-plain","search": "bagel",      "count": 1,  "portion_g": 110, "category": "pastry"},
    {"recipe_id": "rec-pancake",    "search": "pancake",    "count": 3,  "portion_g": 120, "category": "pastry"},
    {"recipe_id": "rec-eggs-scr",   "search": "eggs",       "count": 1,  "portion_g": 180, "category": "protein"},
    {"recipe_id": "rec-bacon",      "search": "bacon",      "count": 4,  "portion_g": 60,  "category": "protein"},
    {"recipe_id": "rec-sausage",    "search": "sausage",    "count": 2,  "portion_g": 55,  "category": "protein"},
    {"recipe_id": "rec-potato",     "search": "potato",     "count": 1,  "portion_g": 300, "category": "produce"},
    {"recipe_id": "rec-fruit-sal",  "search": "fruit",      "count": 1,  "portion_g": 150, "category": "produce"},
    {"recipe_id": "rec-salmon",     "search": "salmon",     "count": 1,  "portion_g": 180, "category": "protein"},
]


def _http_get(url: str, timeout: int = 15) -> Optional[bytes]:
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (ECW-Benchmark-Importer)",
        "Accept": "application/json, image/*",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read(12_000_000)
    except (urllib.error.URLError, urllib.error.HTTPError,
            socket.timeout, ValueError) as e:
        print(f"[fetch-fail] {url[:70]} · {e}")
        return None


def _mealdb_lookup(term: str) -> List[Dict[str, Any]]:
    body = _http_get(f"https://www.themealdb.com/api/json/v1/1/search.php?s={urllib.parse.quote(term)}")
    if not body: return []
    try:
        data = json.loads(body.decode())
        meals = data.get("meals") or []
        return [{
            "name": m.get("strMeal"),
            "thumb": m.get("strMealThumb"),
            "category": m.get("strCategory"),
            "area": m.get("strArea"),
        } for m in meals if m.get("strMealThumb")]
    except Exception as e:
        print(f"[mealdb-parse-fail] {term} · {e}")
        return []


def _already_imported(url: str) -> bool:
    if not url: return False
    return db["waste_benchmark_samples"].find_one({
        "notes": {"$regex": url[:90].replace("(", r"\(").replace(")", r"\)")}
    }) is not None


def _persist(raw: bytes, name: str, seed: Dict[str, Any], source_url: str) -> Optional[str]:
    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as e:
        print(f"[decode-fail] {name} · {e}")
        return None
    # Downscale to max 1024 px so storage stays sane
    max_dim = 1024
    if img.size[0] > max_dim or img.size[1] > max_dim:
        img.thumbnail((max_dim, max_dim), Image.LANCZOS)
    buf = io.BytesIO(); img.save(buf, "JPEG", quality=88); jpeg = buf.getvalue()
    b64 = base64.b64encode(jpeg).decode()
    sid = f"bs-web-{int(time.time() * 1000) % 10_000_000}-{abs(hash(source_url)) % 10000}"
    blob_url = None; backend = None
    try:
        from lib.blob_storage import store_blob
        meta = store_blob("benchmark", jpeg, content_type="image/jpeg", blob_id=sid)
        blob_url = meta["url"]; backend = meta["backend"]
    except Exception: pass

    db["waste_benchmark_samples"].insert_one({
        "id": sid, "label": name,
        "expected_recipe_id": seed.get("recipe_id"),
        "expected_count": float(seed["count"]),
        "expected_portion_g": float(seed["portion_g"]),
        "expected_category": seed.get("category"),
        "media_type": "image", "source": "themealdb",
        "notes": f"source_url: {source_url}",
        "blob_url": blob_url, "blob_backend": backend,
        "media_base64": b64 if not blob_url else None,
        "size_bytes": len(jpeg), "width": img.size[0], "height": img.size[1],
        "created_at": utcnow_iso(),
    })
    return sid


def seed_web_samples(per_search: int = 2) -> Dict[str, Any]:
    """Fetch up to `per_search` images per recipe term. Returns summary."""
    import urllib.parse as _  # noqa: F401 (side-effect import hoist)
    inserted: List[str] = []; skipped = 0; failed = 0
    for s in MEALDB_SEARCHES:
        meals = _mealdb_lookup(s["search"])
        if not meals:
            print(f"[empty] no meals for '{s['search']}'"); failed += 1; continue
        taken = 0
        for m in meals:
            if taken >= per_search: break
            url = m["thumb"]
            if _already_imported(url):
                skipped += 1; continue
            raw = _http_get(url)
            if not raw: failed += 1; continue
            name = f"{m['name']} ({s['search']} search)"
            sid = _persist(raw, name, s, url)
            if sid:
                inserted.append(sid)
                print(f"[ok  ] {sid} · {name} · {len(raw)//1024}KB")
                taken += 1
            else: failed += 1
            time.sleep(0.3)                                  # be polite
    return {"inserted_count": len(inserted), "skipped": skipped, "failed": failed,
            "ids": inserted}


if __name__ == "__main__":
    import urllib.parse
    result = seed_web_samples(per_search=2)
    print(f"\nSummary: {result}")
