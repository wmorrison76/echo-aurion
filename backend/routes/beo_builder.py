"""iter203a · BEO Builder — 3-panel "library ↔ selected" authoring.

Data flow:
  Banquet menu (packet) → we read its categories + items → user curates a
  selection → we persist as `beo_drafts` doc → on finalise we snapshot into the
  real `beos` collection via existing /api/beo-engine/beo POST.

Sections drive the left rail ("Food / AV / Dance Floor / Photo Booth / …").
Every item in the source menu carries a section string; the builder MUST NOT
allow an item to land in the wrong section (self-audit enforces this).

Routes:
  POST   /api/beo-builder/drafts                   create draft
  GET    /api/beo-builder/drafts                   list
  GET    /api/beo-builder/drafts/{draft_id}        read
  PATCH  /api/beo-builder/drafts/{draft_id}        update selections / notes
  DELETE /api/beo-builder/drafts/{draft_id}        delete
  POST   /api/beo-builder/drafts/{draft_id}/audit  self-audit
  POST   /api/beo-builder/drafts/{draft_id}/finalize  snapshot → beos
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import db

router = APIRouter(prefix="/api/beo-builder", tags=["beo-builder"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: f"draft-{uuid.uuid4().hex[:10]}"

# Maximum per-item price adjustment (±) allowed to the event planner
MAX_ADJUSTMENT_PCT = 5.0


class BeoItemSelection(BaseModel):
    item_id: str
    name: str
    section: str
    subsection: Optional[str] = None
    base_price: float = 0.0
    qty: int = 1
    # planner-authored ± adjustment, clamped to ±MAX_ADJUSTMENT_PCT at save
    adjustment_pct: float = 0.0
    # If true, line is printed on the BEO; if false, it's held internal
    show_on_beo: bool = True
    # BEO-facing note (prints)
    note: Optional[str] = None


class BeoDraftCreate(BaseModel):
    menu_id: str
    event_id: Optional[str] = None
    name: str
    guest_count: int = 0
    client: Optional[str] = None


class BeoDraftUpdate(BaseModel):
    name: Optional[str] = None
    guest_count: Optional[int] = None
    selections: Optional[List[BeoItemSelection]] = None
    beo_notes: Optional[str] = None  # prints on BEO
    internal_justification: Optional[str] = None  # staff-only, never on BEO
    show_prices_on_beo: Optional[bool] = None
    status: Optional[str] = None


def _clamp_adj(x: float) -> float:
    return max(-MAX_ADJUSTMENT_PCT, min(MAX_ADJUSTMENT_PCT, float(x or 0)))


def _compute_totals(selections: List[Dict[str, Any]], guest_count: int) -> Dict[str, float]:
    per_guest = 0.0
    fixed = 0.0
    for s in selections:
        base = float(s.get("base_price") or 0)
        adj = _clamp_adj(s.get("adjustment_pct", 0))
        adjusted = base * (1 + adj / 100.0)
        qty = int(s.get("qty", 1))
        # heuristic: per-guest if base_package_price, else fixed × qty
        if s.get("pricing_mode") == "fixed":
            fixed += adjusted * qty
        else:
            per_guest += adjusted * qty
    total = per_guest * max(1, guest_count) + fixed
    return {
        "per_guest_subtotal": round(per_guest, 2),
        "fixed_subtotal": round(fixed, 2),
        "guest_count": guest_count,
        "total": round(total, 2),
    }


@router.post("/drafts")
async def create_draft(body: BeoDraftCreate):
    # confirm menu exists
    menu = db["banquet_menu_catalog"].find_one({"menu_id": body.menu_id}, {"_id": 0, "menu_id": 1, "name": 1})
    if not menu:
        raise HTTPException(404, "menu not found")
    draft_id = _uid()
    doc = {
        "draft_id": draft_id,
        "menu_id": body.menu_id,
        "menu_name": menu.get("name"),
        "event_id": body.event_id,
        "name": body.name,
        "client": body.client or "",
        "guest_count": int(body.guest_count or 0),
        "selections": [],
        "beo_notes": "",
        "internal_justification": "",
        "show_prices_on_beo": False,
        "status": "draft",
        "totals": {"per_guest_subtotal": 0, "fixed_subtotal": 0, "guest_count": 0, "total": 0},
        "created_at": _now(),
        "updated_at": _now(),
    }
    db["beo_drafts"].insert_one({**doc, "_id": draft_id})
    return doc


@router.get("/drafts")
async def list_drafts(menu_id: Optional[str] = None, limit: int = 50):
    q: Dict[str, Any] = {}
    if menu_id:
        q["menu_id"] = menu_id
    drafts = list(db["beo_drafts"].find(q, {"_id": 0}).sort("updated_at", -1).limit(limit))
    return {"drafts": drafts, "total": len(drafts)}


@router.get("/drafts/{draft_id}")
async def get_draft(draft_id: str):
    d = db["beo_drafts"].find_one({"draft_id": draft_id}, {"_id": 0})
    if not d:
        raise HTTPException(404, "draft not found")
    return d


@router.patch("/drafts/{draft_id}")
async def update_draft(draft_id: str, body: BeoDraftUpdate):
    existing = db["beo_drafts"].find_one({"draft_id": draft_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "draft not found")
    updates: Dict[str, Any] = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.guest_count is not None:
        updates["guest_count"] = int(body.guest_count)
    if body.selections is not None:
        clean = []
        for s in body.selections:
            d = s.model_dump()
            d["adjustment_pct"] = _clamp_adj(d.get("adjustment_pct", 0))
            clean.append(d)
        updates["selections"] = clean
    if body.beo_notes is not None:
        updates["beo_notes"] = body.beo_notes
    if body.internal_justification is not None:
        updates["internal_justification"] = body.internal_justification
    if body.show_prices_on_beo is not None:
        updates["show_prices_on_beo"] = bool(body.show_prices_on_beo)
    if body.status is not None:
        updates["status"] = body.status
    updates["updated_at"] = _now()

    # recalc totals
    merged_sel = updates.get("selections", existing.get("selections", []))
    gc = updates.get("guest_count", existing.get("guest_count", 0))
    updates["totals"] = _compute_totals(merged_sel, gc)

    db["beo_drafts"].update_one({"draft_id": draft_id}, {"$set": updates})
    return db["beo_drafts"].find_one({"draft_id": draft_id}, {"_id": 0})


@router.delete("/drafts/{draft_id}")
async def delete_draft(draft_id: str):
    res = db["beo_drafts"].delete_one({"draft_id": draft_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "draft not found")
    return {"ok": True, "deleted": draft_id}


@router.post("/drafts/{draft_id}/audit")
async def audit_draft(draft_id: str):
    """Self-audit — makes sure every selected item still exists in the source
    menu and is in the category the user assigned it to."""
    draft = db["beo_drafts"].find_one({"draft_id": draft_id}, {"_id": 0})
    if not draft:
        raise HTTPException(404, "draft not found")
    menu_id = draft["menu_id"]
    # Pull the flattened item catalogue directly from the banquet menu catalog
    menu = db["banquet_menu_catalog"].find_one({"menu_id": menu_id}, {"_id": 0, "sections": 1})
    by_id: Dict[str, Dict[str, Any]] = {}
    if menu:
        for sec in menu.get("sections", []):
            for sub in sec.get("subsections", []):
                for it in sub.get("items", []):
                    iid = f"{sec['name']}|{sub['name']}|{it.get('name')}"
                    by_id[iid] = {
                        "id": iid,
                        "section": sec["name"],
                        "subsection": sub["name"],
                        "name": it.get("name"),
                        "base_price": sub.get("price_numeric", 0),
                    }

    issues: List[Dict[str, Any]] = []
    fixes: List[Dict[str, Any]] = []
    fixed_selections: List[Dict[str, Any]] = []
    for sel in draft.get("selections", []):
        iid = sel.get("item_id")
        src = by_id.get(iid)
        if not src:
            issues.append({"type": "unknown_item", "item_id": iid, "name": sel.get("name")})
            continue
        expected_section = src.get("section")
        if expected_section and sel.get("section") != expected_section:
            issues.append({
                "type": "section_mismatch",
                "item_id": iid, "name": sel.get("name"),
                "recorded_section": sel.get("section"),
                "source_section": expected_section,
            })
            fixes.append({"item_id": iid, "moved_from": sel.get("section"), "moved_to": expected_section})
            sel = {**sel, "section": expected_section}
        # clamp adjustment
        orig_adj = float(sel.get("adjustment_pct") or 0)
        clamped = _clamp_adj(orig_adj)
        if abs(orig_adj - clamped) > 0.001:
            issues.append({"type": "adjustment_clamped", "item_id": iid, "from": orig_adj, "to": clamped})
            sel = {**sel, "adjustment_pct": clamped}
        fixed_selections.append(sel)

    updates = {
        "selections": fixed_selections,
        "last_audit_at": _now(),
        "last_audit_issues": issues,
        "totals": _compute_totals(fixed_selections, draft.get("guest_count", 0)),
    }
    db["beo_drafts"].update_one({"draft_id": draft_id}, {"$set": updates})
    return {
        "ok": True,
        "issues_found": len(issues),
        "auto_fixes": len(fixes),
        "issues": issues,
        "fixes": fixes,
    }


@router.post("/drafts/{draft_id}/finalize")
async def finalize_draft(draft_id: str):
    """Snapshot the draft into the main `beos` collection. Audit runs first.
    iter207c/e · Also emits Maestro dispatch + Aurum GL routing events."""
    # run audit implicitly
    await audit_draft(draft_id)
    draft = db["beo_drafts"].find_one({"draft_id": draft_id}, {"_id": 0})
    if not draft:
        raise HTTPException(404, "draft not found")
    beo_id = f"beo-{uuid.uuid4().hex[:8]}"
    totals = draft.get("totals", {}) or {}
    # iter207e · Auto-assigned GL code derived from event kind + first selection.
    #   - 5200-BEO: banquet food & beverage revenue
    #   - 5210-AV:  AV service revenue (any AV items)
    #   - 5220-RM:  Room / setup revenue
    has_av = any(
        "av" in str(s.get("section", "")).lower() or "audio" in str(s.get("section", "")).lower()
        for s in (draft.get("selections") or [])
    )
    gl_code = "5210-AV" if has_av else "5200-BEO"
    beo_doc = {
        "beo_id": beo_id,
        "_id": beo_id,
        "source_draft_id": draft_id,
        "menu_id": draft.get("menu_id"),
        "event_id": draft.get("event_id"),
        "name": draft.get("name"),
        "client": draft.get("client"),
        "guest_count": draft.get("guest_count"),
        "selections": draft.get("selections", []),
        "beo_notes": draft.get("beo_notes", ""),
        "show_prices_on_beo": bool(draft.get("show_prices_on_beo")),
        # Internal justification intentionally EXCLUDED from the finalised BEO
        # record that faces clients / banquet ops.
        "totals": totals,
        "status": "issued",
        "gl_code": gl_code,
        "maestro_pushed": True,
        "maestro_pushed_at": _now(),
        "aurum_gl_routed": True,
        "aurum_gl_routed_at": _now(),
        "created_at": _now(),
    }
    db["beos"].insert_one(beo_doc)
    db["beo_drafts"].update_one({"draft_id": draft_id}, {"$set": {"status": "finalized", "beo_id": beo_id}})

    # iter207c · Maestro BQT dispatch record (banquet ops feed)
    db["maestro_bqt_dispatches"].insert_one({
        "_id": f"mbqt-{uuid.uuid4().hex[:8]}",
        "beo_id": beo_id,
        "event_id": draft.get("event_id"),
        "name": draft.get("name"),
        "guest_count": draft.get("guest_count"),
        "dispatched_at": _now(),
        "status": "queued_for_maestro",
        "payload_summary": {"sections": len(draft.get("selections", [])), "total": totals.get("total", 0)},
    })

    # iter207e · Aurum GL journal-entry stub (routes into Aurum ledger)
    db["aurum_gl_journal"].insert_one({
        "_id": f"gl-{uuid.uuid4().hex[:8]}",
        "source_type": "beo",
        "source_id": beo_id,
        "event_id": draft.get("event_id"),
        "gl_code": gl_code,
        "amount": totals.get("total", 0),
        "client": draft.get("client"),
        "posted_at": _now(),
        "status": "pending_post",
    })

    # iter194 · Timeline events for both pushes (full audit trail)
    try:
        from lib.timeline import emit as _tl
        _tl("beo.finalized", actor={"type": "user", "id": "beo-builder", "name": "BEO Builder"},
            entity_refs=[{"kind": "beo", "id": beo_id, "name": draft.get("name")},
                         {"kind": "event", "id": draft.get("event_id") or "", "name": draft.get("name")}],
            payload={"gl_code": gl_code, "total": totals.get("total", 0), "guest_count": draft.get("guest_count")})
        _tl("beo.pushed_to_maestro", actor={"type": "system", "id": "maestro-bqt", "name": "MaestroBQT"},
            entity_refs=[{"kind": "beo", "id": beo_id, "name": draft.get("name")}],
            payload={"guest_count": draft.get("guest_count"), "sections": len(draft.get("selections", []))})
        _tl("beo.gl_routed", actor={"type": "system", "id": "aurum-gl", "name": "Aurum GL"},
            entity_refs=[{"kind": "beo", "id": beo_id, "name": draft.get("name")}],
            payload={"gl_code": gl_code, "amount": totals.get("total", 0)})
    except Exception:
        pass

    beo_doc.pop("_id", None)
    return beo_doc


# iter207c · Manual Maestro re-push (if initial dispatch got stuck or was undone)
@router.post("/beos/{beo_id}/push-maestro")
async def push_beo_to_maestro(beo_id: str):
    beo = db["beos"].find_one({"beo_id": beo_id}, {"_id": 0})
    if not beo:
        raise HTTPException(404, "beo not found")
    db["beos"].update_one({"beo_id": beo_id}, {"$set": {"maestro_pushed": True, "maestro_pushed_at": _now()}})
    db["maestro_bqt_dispatches"].insert_one({
        "_id": f"mbqt-{uuid.uuid4().hex[:8]}",
        "beo_id": beo_id,
        "event_id": beo.get("event_id"),
        "name": beo.get("name"),
        "guest_count": beo.get("guest_count"),
        "dispatched_at": _now(),
        "status": "re_dispatched",
        "payload_summary": {"sections": len(beo.get("selections", [])), "total": (beo.get("totals") or {}).get("total", 0)},
    })
    try:
        from lib.timeline import emit as _tl
        _tl("beo.pushed_to_maestro", actor={"type": "user", "id": "manual-repush", "name": "Manual repush"},
            entity_refs=[{"kind": "beo", "id": beo_id, "name": beo.get("name")}],
            payload={"re_dispatched": True})
    except Exception:
        pass
    return {"ok": True, "beo_id": beo_id, "maestro_pushed": True, "maestro_pushed_at": _now()}
