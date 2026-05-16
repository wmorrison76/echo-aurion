"""iter221 · Seed baseline benchmark samples.

Creates 8 synthetic-but-realistic benchmark entries covering the known recipes
so William can hit "▶ Run all" and see a baseline accuracy within seconds of
opening the Benchmark tab for the first time.

This uses PIL-drawn images (not photos) — they exist to prove the pipeline
end-to-end; William should replace them with real food photos as he collects
them. Re-running this script is idempotent: it skips any sample whose label
already exists in the collection.
"""
import base64
import io
from PIL import Image, ImageDraw

from database import db


def _draw_muffin(count: int = 3, color=(155, 90, 50)) -> bytes:
    img = Image.new("RGB", (640, 480), color=(40, 20, 10))
    d = ImageDraw.Draw(img)
    spacing = 640 // (count + 1)
    for i in range(count):
        cx = spacing * (i + 1); cy = 240
        d.ellipse((cx - 60, cy - 60, cx + 60, cy + 60), fill=color)
        d.ellipse((cx - 20, cy - 20, cx - 10, cy - 10), fill=(70, 40, 150))
        d.ellipse((cx + 10, cy + 10, cx + 20, cy + 20), fill=(70, 40, 150))
    buf = io.BytesIO(); img.save(buf, "JPEG", quality=85)
    return buf.getvalue()


def _draw_rect_tray(count: int, item_color) -> bytes:
    img = Image.new("RGB", (640, 480), color=(80, 80, 85))
    d = ImageDraw.Draw(img)
    # Tray border
    d.rectangle((40, 40, 600, 440), outline=(180, 180, 180), width=4)
    cols = int(count ** 0.5) or 1
    rows = (count + cols - 1) // cols
    cw = 520 // cols; ch = 360 // rows
    idx = 0
    for r in range(rows):
        for c in range(cols):
            if idx >= count: break
            x0 = 60 + c * cw; y0 = 60 + r * ch
            d.ellipse((x0 + 8, y0 + 8, x0 + cw - 8, y0 + ch - 8), fill=item_color)
            idx += 1
    buf = io.BytesIO(); img.save(buf, "JPEG", quality=85)
    return buf.getvalue()


def _draw_chafer_half_fill(fill_color=(240, 220, 120)) -> bytes:
    img = Image.new("RGB", (640, 480), color=(70, 70, 75))
    d = ImageDraw.Draw(img)
    d.rectangle((60, 80, 580, 400), outline=(220, 220, 220), width=4)
    # Half fill
    d.rectangle((80, 240, 560, 390), fill=fill_color)
    buf = io.BytesIO(); img.save(buf, "JPEG", quality=85)
    return buf.getvalue()


SAMPLES = [
    {"label": "Blueberry Muffin", "recipe_id": "rec-muffin-bb", "count": 3, "portion_g": 95,
     "category": "pastry", "image": lambda: _draw_muffin(3)},
    {"label": "Blueberry Muffin (6-pack)", "recipe_id": "rec-muffin-bb", "count": 6, "portion_g": 95,
     "category": "pastry", "image": lambda: _draw_muffin(6, color=(165, 100, 55))},
    {"label": "Bagel (Plain)", "recipe_id": "rec-bagel-plain", "count": 4, "portion_g": 110,
     "category": "pastry", "image": lambda: _draw_rect_tray(4, (200, 170, 110))},
    {"label": "Bacon", "recipe_id": "rec-bacon", "count": 12, "portion_g": 60,
     "category": "protein", "image": lambda: _draw_rect_tray(12, (120, 50, 40))},
    {"label": "Pancake", "recipe_id": "rec-pancake", "count": 6, "portion_g": 120,
     "category": "pastry", "image": lambda: _draw_rect_tray(6, (220, 180, 130))},
    {"label": "Breakfast Sausage", "recipe_id": "rec-sausage", "count": 8, "portion_g": 55,
     "category": "protein", "image": lambda: _draw_rect_tray(8, (150, 80, 60))},
    {"label": "Scrambled Eggs (half-pan)", "recipe_id": "rec-eggs-scr", "count": 1, "portion_g": 2500,
     "category": "protein", "image": lambda: _draw_chafer_half_fill((240, 220, 120))},
    {"label": "Roasted Potatoes (half-pan)", "recipe_id": "rec-potato", "count": 1, "portion_g": 2200,
     "category": "produce", "image": lambda: _draw_chafer_half_fill((200, 150, 80))},
]


def seed_benchmark_samples() -> int:
    """Idempotent — returns number of rows inserted."""
    from lib.time import utcnow_iso
    inserted = 0
    for s in SAMPLES:
        if db["waste_benchmark_samples"].find_one({"label": s["label"]}):
            continue
        raw = s["image"]()
        b64 = base64.b64encode(raw).decode()
        sid = f"bs-seed-{s['recipe_id'].replace('rec-', '')[:10]}-{s['count']}"
        blob_url = None; backend = None
        try:
            from lib.blob_storage import store_blob
            meta = store_blob("benchmark", raw, content_type="image/jpeg", blob_id=sid)
            blob_url = meta["url"]; backend = meta["backend"]
        except Exception:
            pass
        db["waste_benchmark_samples"].insert_one({
            "id": sid, "label": s["label"],
            "expected_recipe_id": s["recipe_id"],
            "expected_count": float(s["count"]),
            "expected_portion_g": float(s["portion_g"]),
            "expected_category": s["category"],
            "media_type": "image", "source": "seed_baseline",
            "notes": "Synthetic PIL-drawn baseline sample (replace with real photos)",
            "blob_url": blob_url, "blob_backend": backend,
            "media_base64": b64 if not blob_url else None,
            "size_bytes": len(raw),
            "created_at": utcnow_iso(),
        })
        inserted += 1
    return inserted


if __name__ == "__main__":
    n = seed_benchmark_samples()
    print(f"Seeded {n} benchmark samples")
