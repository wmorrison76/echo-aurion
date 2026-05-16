"""
Pamphlet Designer
=================
Lightweight pamphlet/brochure designer specifically for spa services
(and extensible to other resort collateral). Supports:

  - Save / load pamphlet designs (JSON doc with elements, layout, services)
  - Import uploaded design files (PDF / SVG / PNG / JPG / PSD / AI-as-PDF)
    → returns an asset reference the frontend can drop onto the canvas.
  - Render print-ready PDF (reportlab) with crop marks + bleed area option.

Design element schema (each element is one of):
  - {type:"image", asset_id, x, y, w, h, rotation}
  - {type:"text", text, x, y, w, h, font_size, color, font_weight, align}
  - {type:"spa_service_card", service_id, x, y, w, h, style}
  - {type:"shape", shape:"rect"|"line", x, y, w, h, fill, stroke}
"""
import base64
import io
import os
import logging
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from pydantic import BaseModel, Field

from reportlab.lib.pagesizes import LETTER, A4, A5
from reportlab.lib.units import inch, mm
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.colors import HexColor, black
from reportlab.lib.utils import ImageReader

from database import db

logger = logging.getLogger("pamphlet")
router = APIRouter(prefix="/api/pamphlet", tags=["pamphlet"])

COLL = "pamphlets"
ASSETS = "pamphlet_assets"
ASSET_DIR = Path("/app/backend/pamphlet_assets")
ASSET_DIR.mkdir(parents=True, exist_ok=True)

_now = lambda: datetime.now(timezone.utc).isoformat()


# ─────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────
class PamphletElement(BaseModel):
    id: str
    type: str                     # image | text | spa_service_card | shape
    x: float; y: float            # top-left, in mm
    w: float; h: float
    rotation: float = 0
    # type-specific
    asset_id: Optional[str] = None
    text: Optional[str] = None
    font_size: Optional[float] = 12
    color: Optional[str] = "#111111"
    font_weight: Optional[str] = "normal"
    align: Optional[str] = "left"
    service_id: Optional[str] = None
    shape: Optional[str] = None
    fill: Optional[str] = None
    stroke: Optional[str] = None
    style: Optional[str] = None


class PamphletDoc(BaseModel):
    name: str = "Untitled Pamphlet"
    page_size: str = "LETTER"              # LETTER | A4 | A5
    orientation: str = "portrait"          # portrait | landscape
    bleed_mm: float = 3                    # 3mm = industry standard
    pages: List[List[PamphletElement]] = Field(default_factory=lambda: [[]])
    spa_services_included: List[str] = []  # quick ref for automated cards
    theme: Optional[str] = "enterprise"    # enterprise | luxury | playful


class PamphletCreate(BaseModel):
    doc: PamphletDoc


# ─────────────────────────────────────────────
# Asset upload (design file import)
# ─────────────────────────────────────────────
_SUPPORTED = {".pdf", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".psd", ".ai"}

@router.post("/assets/upload")
async def upload_asset(file: UploadFile = File(...), tag: str = Form("design")):
    if not file.filename:
        raise HTTPException(400, "No file provided")
    ext = Path(file.filename).suffix.lower()
    if ext not in _SUPPORTED:
        raise HTTPException(400, f"Unsupported file type {ext}. Accepted: PDF, SVG, PNG, JPG, WebP, PSD, AI (PDF-compatible).")

    aid = f"ast-{uuid4().hex[:10]}"
    path = ASSET_DIR / f"{aid}{ext}"
    content = await file.read()
    path.write_bytes(content)
    size = path.stat().st_size

    preview_ext = ext
    preview_note = None
    if ext in (".ai", ".psd"):
        preview_note = "Raw Adobe format stored. Frontend will render a flattened preview via server conversion."
    if ext == ".pdf":
        preview_note = "PDF pages will be rendered per-page by the frontend's PDF.js viewer for in-canvas editing."

    meta = {
        "id": aid,
        "filename": file.filename,
        "original_ext": ext,
        "path": str(path),
        "size_bytes": size,
        "tag": tag,
        "uploaded_at": _now(),
        "preview_note": preview_note,
    }
    db[ASSETS].insert_one({**meta})
    meta.pop("_id", None)
    return meta


@router.get("/assets")
async def list_assets(tag: Optional[str] = None, limit: int = 100):
    q = {} if not tag else {"tag": tag}
    items = list(db[ASSETS].find(q, {"_id": 0, "path": 0}).sort("uploaded_at", -1).limit(limit))
    return {"assets": items, "total": len(items)}


@router.get("/assets/{asset_id}/raw")
async def raw_asset(asset_id: str):
    a = db[ASSETS].find_one({"id": asset_id})
    if not a: raise HTTPException(404, "Asset not found")
    p = Path(a["path"])
    if not p.exists(): raise HTTPException(404, "File missing on disk")
    data = p.read_bytes()
    ext = a["original_ext"]
    mime = {
        ".pdf": "application/pdf", ".svg": "image/svg+xml",
        ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".webp": "image/webp", ".psd": "image/vnd.adobe.photoshop",
        ".ai": "application/postscript",
    }.get(ext, "application/octet-stream")
    return Response(content=data, media_type=mime)


# ─────────────────────────────────────────────
# Pamphlet CRUD
# ─────────────────────────────────────────────
@router.post("/")
async def create_pamphlet(body: PamphletCreate):
    doc_dict = body.doc.dict()
    doc_dict["id"] = f"pmp-{uuid4().hex[:10]}"
    doc_dict["created_at"] = _now()
    doc_dict["updated_at"] = _now()
    db[COLL].insert_one({**doc_dict})
    doc_dict.pop("_id", None)
    return doc_dict


@router.get("/")
async def list_pamphlets(limit: int = 100):
    items = list(db[COLL].find({}, {"_id": 0}).sort("updated_at", -1).limit(limit))
    return {"pamphlets": items, "total": len(items)}


@router.get("/{pamphlet_id}")
async def get_pamphlet(pamphlet_id: str):
    p = db[COLL].find_one({"id": pamphlet_id}, {"_id": 0})
    if not p: raise HTTPException(404, "Pamphlet not found")
    return p


@router.put("/{pamphlet_id}")
async def update_pamphlet(pamphlet_id: str, body: PamphletCreate):
    patch = body.doc.dict()
    patch["updated_at"] = _now()
    res = db[COLL].update_one({"id": pamphlet_id}, {"$set": patch})
    if res.matched_count == 0: raise HTTPException(404, "Pamphlet not found")
    out = db[COLL].find_one({"id": pamphlet_id}, {"_id": 0})
    return out


@router.delete("/{pamphlet_id}")
async def delete_pamphlet(pamphlet_id: str):
    db[COLL].delete_one({"id": pamphlet_id})
    return {"success": True, "id": pamphlet_id}


# ─────────────────────────────────────────────
# PDF Export (print-ready, bleed + crop marks)
# ─────────────────────────────────────────────
def _page_size(name: str, orientation: str):
    base = {"LETTER": LETTER, "A4": A4, "A5": A5}.get(name.upper(), LETTER)
    if orientation == "landscape":
        return (base[1], base[0])
    return base


def _draw_crop_marks(c, w, h, bleed_pt):
    length = 18  # pt
    offset = 3
    c.setStrokeColor(black); c.setLineWidth(0.5)
    # corners
    for (x, y) in [(bleed_pt, bleed_pt), (w - bleed_pt, bleed_pt),
                   (bleed_pt, h - bleed_pt), (w - bleed_pt, h - bleed_pt)]:
        # horizontal
        c.line(x - length - offset, y, x - offset, y)
        c.line(x + offset, y, x + length + offset, y)
        # vertical
        c.line(x, y - length - offset, x, y - offset)
        c.line(x, y + offset, x, y + length + offset)


def _render_element(c, el: dict, page_h_mm: float, bleed_mm: float):
    """Coordinates come in mm from the top-left. reportlab y-axis is bottom-up."""
    x = el.get("x", 0) * mm + bleed_mm * mm
    y_top = el.get("y", 0) * mm + bleed_mm * mm
    w = el.get("w", 40) * mm
    h = el.get("h", 20) * mm
    page_h_pt = (page_h_mm + 2 * bleed_mm) * mm
    y = page_h_pt - y_top - h

    t = el.get("type")
    if t == "image" and el.get("asset_id"):
        a = db[ASSETS].find_one({"id": el["asset_id"]})
        if a and Path(a["path"]).exists() and a["original_ext"] in (".png", ".jpg", ".jpeg", ".webp"):
            try:
                c.drawImage(ImageReader(a["path"]), x, y, width=w, height=h, preserveAspectRatio=True, mask="auto")
            except Exception as e:
                logger.warning(f"image draw failed {e}")
    elif t == "text":
        color = el.get("color", "#111111")
        try: c.setFillColor(HexColor(color))
        except Exception: c.setFillColor(black)
        fs = float(el.get("font_size") or 12)
        weight = el.get("font_weight", "normal")
        font = "Helvetica-Bold" if weight in ("bold", "700", "600") else "Helvetica"
        c.setFont(font, fs)
        txt = el.get("text") or ""
        align = el.get("align", "left")
        # simple single-line with wrap
        lines = []
        for raw in txt.split("\n"):
            cur = ""
            for w_ in raw.split(" "):
                test = (cur + " " + w_).strip()
                if c.stringWidth(test, font, fs) > w:
                    if cur: lines.append(cur)
                    cur = w_
                else:
                    cur = test
            if cur: lines.append(cur)
        line_h = fs * 1.25
        for i, ln in enumerate(lines):
            tx = x
            if align == "center": tx = x + (w - c.stringWidth(ln, font, fs)) / 2
            elif align == "right": tx = x + w - c.stringWidth(ln, font, fs)
            c.drawString(tx, y + h - line_h * (i + 1), ln)
    elif t == "shape":
        fill = el.get("fill"); stroke = el.get("stroke")
        if fill:
            try: c.setFillColor(HexColor(fill))
            except Exception: pass
        if stroke:
            try: c.setStrokeColor(HexColor(stroke))
            except Exception: pass
        if el.get("shape") == "line":
            c.line(x, y, x + w, y + h)
        else:
            c.rect(x, y, w, h, fill=1 if fill else 0, stroke=1 if stroke else 0)
    elif t == "spa_service_card" and el.get("service_id"):
        svc = db["spa_services"].find_one({"id": el["service_id"]}, {"_id": 0})
        if svc:
            # Card frame
            c.setStrokeColor(HexColor(svc.get("color") or "#c8a97e"))
            c.setLineWidth(0.8)
            c.rect(x, y, w, h, stroke=1, fill=0)
            # Title
            c.setFont("Helvetica-Bold", 13); c.setFillColor(black)
            c.drawString(x + 8, y + h - 20, svc["name"])
            # Duration + price
            c.setFont("Helvetica", 9); c.setFillColor(HexColor("#666666"))
            c.drawString(x + 8, y + h - 36, f"{svc.get('duration_min',60)} min")
            price_str = f"${svc.get('price', 0):.0f}"
            c.setFont("Helvetica-Bold", 14)
            c.setFillColor(HexColor(svc.get("color") or "#c8a97e"))
            c.drawRightString(x + w - 8, y + h - 22, price_str)
            # description
            c.setFont("Helvetica", 8); c.setFillColor(HexColor("#555"))
            desc = (svc.get("description") or "")[:140]
            _wrap(c, desc, x + 8, y + h - 54, w - 16, 8, line_h=10)


def _wrap(c, text, x, y, max_w, font_size, line_h):
    cur = ""
    lines = []
    for w_ in text.split(" "):
        test = (cur + " " + w_).strip()
        if c.stringWidth(test, "Helvetica", font_size) > max_w:
            if cur: lines.append(cur)
            cur = w_
        else: cur = test
    if cur: lines.append(cur)
    for i, ln in enumerate(lines[:4]):
        c.drawString(x, y - i * line_h, ln)


@router.get("/{pamphlet_id}/export-pdf")
async def export_pdf(pamphlet_id: str, include_bleed: bool = True, crop_marks: bool = True):
    p = db[COLL].find_one({"id": pamphlet_id}, {"_id": 0})
    if not p: raise HTTPException(404, "Pamphlet not found")
    page_size = _page_size(p.get("page_size", "LETTER"), p.get("orientation", "portrait"))
    bleed_mm_val = p.get("bleed_mm", 3) if include_bleed else 0
    bleed_pt = bleed_mm_val * mm
    w_pt = page_size[0] + 2 * bleed_pt
    h_pt = page_size[1] + 2 * bleed_pt
    page_h_mm = page_size[1] / mm

    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=(w_pt, h_pt))
    c.setTitle(p.get("name", "Pamphlet"))

    pages = p.get("pages") or [[]]
    for page in pages:
        for el in page:
            _render_element(c, el, page_h_mm=page_h_mm, bleed_mm=bleed_mm_val)
        if crop_marks and include_bleed:
            _draw_crop_marks(c, w_pt, h_pt, bleed_pt)
        c.showPage()

    c.save()
    pdf_bytes = buf.getvalue()
    filename = f"{p.get('name', 'pamphlet').replace(' ', '_')}-{pamphlet_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ─────────────────────────────────────────────
# Quick-start: auto-generate pamphlet from services
# ─────────────────────────────────────────────
@router.post("/auto-generate")
async def auto_generate(body: dict):
    """Build a simple 3-column service-card pamphlet from selected services."""
    svc_ids = body.get("service_ids") or []
    name = body.get("name", "Spa Services Pamphlet")
    page_size = body.get("page_size", "LETTER")
    theme = body.get("theme", "enterprise")

    if not svc_ids:
        # default: all active
        svc_ids = [s["id"] for s in db["spa_services"].find({"active": True}, {"_id": 0, "id": 1})]

    pages: List[List[dict]] = [[]]
    # header
    pages[0].append({"id": f"el-{uuid4().hex[:6]}", "type": "text", "x": 15, "y": 18,
                     "w": 180, "h": 20, "text": "Spa Menu", "font_size": 30, "font_weight": "bold",
                     "color": "#c8a97e", "align": "left"})
    pages[0].append({"id": f"el-{uuid4().hex[:6]}", "type": "text", "x": 15, "y": 36,
                     "w": 180, "h": 10, "text": "Signature treatments · curated experiences",
                     "font_size": 11, "color": "#666666"})
    # service cards (3 columns)
    col_w = 60; card_h = 44; margin = 5; cols = 3
    start_y = 55
    col_xs = [15, 15 + col_w + margin, 15 + 2 * (col_w + margin)]
    i = 0
    for sid in svc_ids:
        col = i % cols; row = i // cols
        x = col_xs[col]
        y = start_y + row * (card_h + margin)
        if y + card_h > 240:
            pages.append([])  # new page
            y = 20
            i = 0  # reset index for new page layout (approx)
            pages[-1].append({"id": f"el-{uuid4().hex[:6]}", "type": "text", "x": 15, "y": 10,
                              "w": 180, "h": 10, "text": "Spa Menu (continued)",
                              "font_size": 12, "color": "#c8a97e", "font_weight": "bold"})
        pages[-1].append({"id": f"el-{uuid4().hex[:6]}", "type": "spa_service_card",
                          "service_id": sid, "x": x, "y": y, "w": col_w, "h": card_h})
        i += 1

    doc = {
        "id": f"pmp-{uuid4().hex[:10]}",
        "name": name,
        "page_size": page_size,
        "orientation": "portrait",
        "bleed_mm": 3,
        "pages": pages,
        "spa_services_included": svc_ids,
        "theme": theme,
        "created_at": _now(),
        "updated_at": _now(),
    }
    db[COLL].insert_one({**doc})
    doc.pop("_id", None)
    return doc
