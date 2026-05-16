"""iter203c · CRM lifecycle (lead → client → contract → deposit → event → billing).

The EchoEvents CRM tab (/app/client/modules/EchoEvents/EchoEventsPanel.tsx) was
calling endpoints that didn't exist:
  /api/crm/metrics      ← added here
  /api/crm/forecast     ← added here
  /api/crm/contacts     ← added here (list + CRUD)

We wire these to existing Mongo collections:
  warm_leads (9) · invoices (63) · event_invoices (15) · events (18) · beo_documents

Downstream linkage:
  - A CRM contact's lifecycle_stage progresses through: lead · qualified ·
    proposed · contracted · deposited · in_event · billed · complete.
  - Each contact can be linked to event_id, beo_id, invoice_ids[] so the
    whole lifecycle is queryable from one row.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from database import db

router = APIRouter(prefix="/api/crm", tags=["crm"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: uuid.uuid4().hex[:10]

LIFECYCLE_STAGES = ["lead", "qualified", "proposed", "contracted", "deposited", "in_event", "billed", "complete"]

@router.get("/metrics")
def crm_metrics():
    """Dashboard roll-up across the lifecycle."""
    contacts_coll = db["crm_contacts"] if "crm_contacts" in db.list_collection_names() else None
    leads = db["warm_leads"].count_documents({}) if "warm_leads" in db.list_collection_names() else 0
    contacts_total = contacts_coll.count_documents({}) if contacts_coll is not None else 0
    by_stage: Dict[str, int] = {s: 0 for s in LIFECYCLE_STAGES}
    if contacts_coll is not None:
        for doc in contacts_coll.find({}, {"_id": 0, "lifecycle_stage": 1}):
            st = doc.get("lifecycle_stage") or "lead"
            by_stage[st] = by_stage.get(st, 0) + 1
    events_count = db["events"].count_documents({}) if "events" in db.list_collection_names() else 0
    invoices_count = db["invoices"].count_documents({}) if "invoices" in db.list_collection_names() else 0
    invoices_sum = 0.0
    if "invoices" in db.list_collection_names():
        for inv in db["invoices"].find({}, {"_id": 0, "amount": 1, "total": 1}):
            invoices_sum += float(inv.get("amount") or inv.get("total") or 0)
    return {
        "success": True,
        "data": {
            "warm_leads": leads,
            "contacts_total": contacts_total,
            "contacts_by_stage": by_stage,
            "events_total": events_count,
            "invoices_total": invoices_count,
            "invoices_sum": round(invoices_sum, 2),
            "generated_at": _now(),
        },
    }


@router.get("/forecast")
def crm_forecast(months: int = Query(12, ge=1, le=24),
                 model: str = Query("ml", pattern="^(ml|naive)$"),
                 alpha: float = Query(0.5, ge=0.05, le=1.0)):
    """iter205 · ML pipeline forecast.

    Two models are available:
      - `naive` (iter203c) — raw sum of expected_value bucketed by close_date month
      - `ml` (default)     — stage-weighted probability × expected_value, smoothed
                             against historical monthly close rates using
                             single-exponential-smoothing (alpha default 0.5).

    The ML model:
      1. Weights each contact's expected_value by its stage-conversion probability:
         {lead:0.10, qualified:0.25, proposed:0.40, contracted:0.70,
          deposited:0.85, in_event:0.95, billed:1.00, complete:1.00}
      2. Buckets weighted value by `expected_close_date` month
      3. Blends with a 6-month trailing close-rate velocity from `invoices` using
         single-exponential-smoothing: forecast[t] = α·raw[t] + (1-α)·trend[t-1]
      4. Returns per-month: `value`, `weighted_value`, `smoothed_value`,
         `confidence_low`, `confidence_high` (±15% envelope around smoothed)
    """
    STAGE_PROB: Dict[str, float] = {
        "lead": 0.10, "qualified": 0.25, "proposed": 0.40,
        "contracted": 0.70, "deposited": 0.85, "in_event": 0.95,
        "billed": 1.00, "complete": 1.00,
    }
    contacts_coll = db["crm_contacts"] if "crm_contacts" in db.list_collection_names() else None
    now = datetime.now(timezone.utc)

    # 1. Month bucket keys — next `months` months starting this month
    bucket_keys: List[str] = []
    for i in range(months):
        b = (now.replace(day=1) + timedelta(days=32 * i)).strftime("%Y-%m")
        bucket_keys.append(b)
    raw: Dict[str, float] = {k: 0.0 for k in bucket_keys}
    weighted: Dict[str, float] = {k: 0.0 for k in bucket_keys}
    contacts_by_month: Dict[str, int] = {k: 0 for k in bucket_keys}

    if contacts_coll is not None:
        for c in contacts_coll.find({}, {"_id": 0, "expected_close_date": 1,
                                         "expected_value": 1, "lifecycle_stage": 1}):
            dt = c.get("expected_close_date")
            val = float(c.get("expected_value") or 0)
            stage = (c.get("lifecycle_stage") or "lead").lower()
            prob = STAGE_PROB.get(stage, 0.10)
            if dt and isinstance(dt, str) and len(dt) >= 7:
                k = dt[:7]
                if k in raw:
                    raw[k] += val
                    weighted[k] += val * prob
                    contacts_by_month[k] += 1

    # 2. Historical velocity from `invoices` — last 6 months realized revenue
    realized: List[float] = []
    if "invoices" in db.list_collection_names():
        for i in range(6, 0, -1):
            m = (now.replace(day=1) - timedelta(days=32 * i)).strftime("%Y-%m")
            total = 0.0
            for inv in db["invoices"].find({"created_at": {"$regex": f"^{m}"}},
                                           {"_id": 0, "amount": 1, "total": 1}):
                total += float(inv.get("amount") or inv.get("total") or 0)
            realized.append(total)
    mean_realized = sum(realized) / len(realized) if realized else 0.0

    # 3. Single-exponential smoothing on weighted pipeline, anchored to trailing velocity
    smoothed: Dict[str, float] = {}
    prev = mean_realized  # initial trend = trailing 6-month average
    for k in bucket_keys:
        current = weighted[k]
        # If we have zero weighted pipeline in a month but historical velocity,
        # decay the previous smoothed value by 20%/month (pipeline evaporates).
        if current <= 0:
            prev = prev * 0.80
            smoothed[k] = round(prev, 2)
        else:
            prev = alpha * current + (1 - alpha) * prev
            smoothed[k] = round(prev, 2)

    if model == "naive":
        data = [{"month": k, "value": round(raw[k], 2)} for k in bucket_keys]
        return {"success": True, "data": {"model": "naive", "months": data}}

    # ML model — full envelope
    data = [{
        "month": k,
        "value": round(raw[k], 2),
        "weighted_value": round(weighted[k], 2),
        "smoothed_value": smoothed[k],
        "confidence_low": round(smoothed[k] * 0.85, 2),
        "confidence_high": round(smoothed[k] * 1.15, 2),
        "contact_count": contacts_by_month[k],
    } for k in bucket_keys]

    return {"success": True, "data": {
        "model": "ml",
        "alpha": alpha,
        "trailing_6mo_avg": round(mean_realized, 2),
        "stage_probabilities": STAGE_PROB,
        "months": data,
    }}


@router.get("/forecast/ml-meta")
def forecast_ml_meta():
    """iter205 · Expose the ML model's internals for auditability.
    Dashboards can render the stage-probability matrix + trailing velocity.
    """
    STAGE_PROB = {
        "lead": 0.10, "qualified": 0.25, "proposed": 0.40,
        "contracted": 0.70, "deposited": 0.85, "in_event": 0.95,
        "billed": 1.00, "complete": 1.00,
    }
    now = datetime.now(timezone.utc)
    realized = []
    if "invoices" in db.list_collection_names():
        for i in range(6, 0, -1):
            m = (now.replace(day=1) - timedelta(days=32 * i)).strftime("%Y-%m")
            total = 0.0
            for inv in db["invoices"].find({"created_at": {"$regex": f"^{m}"}},
                                           {"_id": 0, "amount": 1, "total": 1}):
                total += float(inv.get("amount") or inv.get("total") or 0)
            realized.append({"month": m, "realized": round(total, 2)})
    return {"success": True, "data": {
        "model": "single-exponential-smoothing",
        "window_months": 6,
        "stage_probabilities": STAGE_PROB,
        "trailing_6mo_realized": realized,
    }}


class Contact(BaseModel):
    name: str
    company: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    lifecycle_stage: str = "lead"
    expected_value: float = 0
    expected_close_date: Optional[str] = None
    event_id: Optional[str] = None
    beo_id: Optional[str] = None
    invoice_ids: Optional[List[str]] = None
    notes: Optional[str] = ""


@router.get("/contacts")
def list_contacts(
    search: str = Query("", description="name/company/email substring"),
    stage: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    q: Dict[str, Any] = {}
    if stage:
        q["lifecycle_stage"] = stage
    if search:
        q["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    total = db["crm_contacts"].count_documents(q)
    items = list(
        db["crm_contacts"].find(q, {"_id": 0}).sort("updated_at", -1).skip(offset).limit(limit)
    )
    return {"success": True, "data": {"contacts": items, "total": total}}


@router.post("/contacts")
def create_contact(body: Contact):
    cid = f"c-{_uid()}"
    doc = {"id": cid, "_id": cid, **body.model_dump(), "created_at": _now(), "updated_at": _now()}
    if doc["lifecycle_stage"] not in LIFECYCLE_STAGES:
        raise HTTPException(400, f"invalid stage (must be one of {LIFECYCLE_STAGES})")
    db["crm_contacts"].insert_one(doc)
    doc.pop("_id", None)
    return {"success": True, "data": doc}


@router.get("/contacts/{contact_id}")
def get_contact(contact_id: str):
    c = db["crm_contacts"].find_one({"id": contact_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "contact not found")
    # hydrate linked event/beo/invoices
    if c.get("event_id") and "events" in db.list_collection_names():
        c["event"] = db["events"].find_one({"id": c["event_id"]}, {"_id": 0})
    if c.get("beo_id") and "beos" in db.list_collection_names():
        c["beo"] = db["beos"].find_one({"beo_id": c["beo_id"]}, {"_id": 0})
    if c.get("invoice_ids"):
        c["invoices"] = list(db["invoices"].find({"id": {"$in": c["invoice_ids"]}}, {"_id": 0}))
    return {"success": True, "data": c}


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    lifecycle_stage: Optional[str] = None
    expected_value: Optional[float] = None
    expected_close_date: Optional[str] = None
    event_id: Optional[str] = None
    beo_id: Optional[str] = None
    invoice_ids: Optional[List[str]] = None
    notes: Optional[str] = None


@router.put("/contacts/{contact_id}")
def update_contact(contact_id: str, body: ContactUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "lifecycle_stage" in updates and updates["lifecycle_stage"] not in LIFECYCLE_STAGES:
        raise HTTPException(400, f"invalid stage (must be one of {LIFECYCLE_STAGES})")
    updates["updated_at"] = _now()
    r = db["crm_contacts"].update_one({"id": contact_id}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(404, "contact not found")
    return {"success": True, "data": db["crm_contacts"].find_one({"id": contact_id}, {"_id": 0})}


@router.delete("/contacts/{contact_id}")
def delete_contact(contact_id: str):
    r = db["crm_contacts"].delete_one({"id": contact_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "contact not found")
    return {"success": True, "data": {"deleted": contact_id}}


@router.get("/pipeline")
def crm_pipeline():
    """Pipeline view grouped by stage."""
    pipeline: Dict[str, List[Dict[str, Any]]] = {s: [] for s in LIFECYCLE_STAGES}
    if "crm_contacts" in db.list_collection_names():
        for c in db["crm_contacts"].find({}, {"_id": 0}).sort("updated_at", -1).limit(500):
            pipeline.setdefault(c.get("lifecycle_stage") or "lead", []).append(c)
    return {"success": True, "data": {"stages": LIFECYCLE_STAGES, "pipeline": pipeline}}


@router.get("/lifecycle-audit")
def lifecycle_audit():
    """iter207 · P2 · End-to-end CRM lifecycle audit.

    Walks every CRM contact and validates the full lead → client → billing
    chain against the linked records (events, BEOs, invoices, Aurum GL).
    Returns per-contact a verdict ∈ {OK, WARN, BROKEN} plus a list of gaps.
    Dashboards can surface the counts + rows with gaps so ops staff can
    remediate stuck deals.
    """
    contacts_coll = db["crm_contacts"] if "crm_contacts" in db.list_collection_names() else None
    if contacts_coll is None:
        return {"success": True, "data": {"rows": [], "summary": {"ok": 0, "warn": 0, "broken": 0, "total": 0}}}

    rows = []
    summary = {"ok": 0, "warn": 0, "broken": 0, "total": 0}

    for c in contacts_coll.find({}, {"_id": 0}).limit(500):
        gaps: List[str] = []
        stage = (c.get("lifecycle_stage") or "lead").lower()

        # Event linkage check — required once stage >= contracted
        if stage in ("contracted", "deposited", "in_event", "billed", "complete"):
            if not c.get("event_id"):
                gaps.append("no event_id on contracted+ contact")
            else:
                ev = db["events"].find_one({"$or": [{"event_id": c["event_id"]}, {"id": c["event_id"]}]}, {"_id": 0})
                if not ev:
                    gaps.append(f"event_id {c['event_id']} not found in events collection")

        # BEO linkage — required once stage >= deposited
        if stage in ("deposited", "in_event", "billed", "complete"):
            beo_id = c.get("beo_id")
            if not beo_id:
                # Try to auto-discover via event_id
                if c.get("event_id"):
                    beo = db["beos"].find_one({"event_id": c["event_id"]}, {"_id": 0})
                    if not beo:
                        gaps.append("no BEO linked or derivable from event_id")
                else:
                    gaps.append("no beo_id on deposited+ contact")
            else:
                beo = db["beos"].find_one({"beo_id": beo_id}, {"_id": 0})
                if not beo:
                    gaps.append(f"beo_id {beo_id} not found in beos collection")
                else:
                    if not beo.get("gl_code"):
                        gaps.append("BEO has no GL code — Aurum routing incomplete")
                    if not beo.get("maestro_pushed"):
                        gaps.append("BEO not pushed to MaestroBQT")

        # Invoice linkage — required once stage >= billed
        if stage in ("billed", "complete"):
            inv_ids = c.get("invoice_ids") or []
            if not inv_ids:
                gaps.append("no invoice_ids on billed+ contact")
            else:
                found = db["invoices"].count_documents({"id": {"$in": inv_ids}}) if "invoices" in db.list_collection_names() else 0
                if found < len(inv_ids):
                    gaps.append(f"{len(inv_ids) - found} invoice(s) not found")

        # Expected value sanity
        if c.get("expected_value") and float(c["expected_value"]) <= 0 and stage not in ("lead", "complete"):
            gaps.append("expected_value is zero/negative on non-lead contact")

        if len(gaps) == 0:
            verdict = "OK"; summary["ok"] += 1
        elif len(gaps) <= 1:
            verdict = "WARN"; summary["warn"] += 1
        else:
            verdict = "BROKEN"; summary["broken"] += 1
        summary["total"] += 1

        rows.append({
            "contact_id": c.get("id"),
            "name": c.get("name"),
            "company": c.get("company"),
            "stage": stage,
            "expected_value": c.get("expected_value") or 0,
            "verdict": verdict,
            "gap_count": len(gaps),
            "gaps": gaps,
            "event_id": c.get("event_id"),
            "beo_id": c.get("beo_id"),
            "invoice_count": len(c.get("invoice_ids") or []),
        })

    rows.sort(key=lambda r: (r["verdict"] != "BROKEN", r["verdict"] != "WARN", r["name"] or ""))
    return {"success": True, "data": {"rows": rows, "summary": summary, "generated_at": _now()}}
