"""
EchoEvents — Definite & Pending Report
=======================================
Provides the Definite vs Pending events report with BEO numbers,
revenue breakdown, and actual spend at resort.
"""
from datetime import datetime, timezone
from fastapi import APIRouter
from database import db

router = APIRouter(prefix="/api/echo-events", tags=["echo-events"])

# Definite stages = confirmed/committed events
DEFINITE_STAGES = {"contract_signed", "deposit_received", "menu_selected", "beo_issued", "final_count", "closed"}
PENDING_STAGES = {"prospect", "inquiry", "tentative"}


def _format_event(event: dict) -> dict:
    revenue = event.get("revenue", {})
    costs = event.get("costs", {})
    return {
        "id": event.get("id", ""),
        "beo_number": f"BEO-{event.get('id', '')[:8].upper()}",
        "name": event.get("name", ""),
        "event_type": event.get("event_type", ""),
        "stage": event.get("stage", ""),
        "client_name": event.get("client_name", ""),
        "event_date": event.get("event_date", ""),
        "venue": event.get("venue", ""),
        "guest_count": event.get("guest_count", 0),
        "guaranteed_count": event.get("guaranteed_count", 0),
        "revenue": {
            "food": revenue.get("food", 0),
            "beverage": revenue.get("beverage", 0),
            "rental": revenue.get("rental", 0),
            "av": revenue.get("av", 0),
            "service_charge": revenue.get("service_charge", 0),
            "other": revenue.get("other", 0),
            "total": revenue.get("total", 0),
        },
        "actual_spend": {
            "food": costs.get("food", 0),
            "beverage": costs.get("beverage", 0),
            "labor": costs.get("labor", 0),
            "rental": costs.get("rental", 0),
            "overhead": costs.get("overhead", 0),
            "total": costs.get("total", 0),
        },
        "profit_margin": round(
            ((revenue.get("total", 0) - costs.get("total", 0)) / revenue.get("total", 1)) * 100, 1
        ) if revenue.get("total", 0) > 0 else 0,
        "deposits": [
            {"amount": d.get("amount", 0), "method": d.get("method", ""), "date": d.get("received_at", "")}
            for d in event.get("deposits", [])
        ],
        "beo_notes": event.get("beo_notes", ""),
        "setup_style": event.get("setup_style", ""),
        "table_count": event.get("table_count", 0),
        "staff_count": event.get("staff_count", 0),
    }


@router.get("/report")
async def get_events_report():
    """Full Definite & Pending report — merges events collection with BEO pipeline."""
    # Pull from both sources
    all_events = list(db["events"].find({}, {"_id": 0}))
    beo_docs = list(db["beo_documents"].find({}, {"_id": 0}))

    # Convert BEO docs to event format
    existing_ids = {e.get("id") for e in all_events}
    for beo in beo_docs:
        if beo.get("id") in existing_ids:
            continue
        fin = beo.get("financial", {})
        prospect = db["event_prospects"].find_one({"id": beo.get("prospect_id")}, {"_id": 0})
        stage = beo.get("status", "draft")
        # Map BEO status to event stages
        stage_map = {"draft": "tentative", "client_approved": "contract_signed", "confirmed": "beo_issued",
                     "execution": "final_count", "completed": "closed", "revised": "beo_issued"}
        mapped_stage = stage_map.get(stage, stage)

        all_events.append({
            "id": beo["id"],
            "name": beo.get("event_name", ""),
            "event_type": beo.get("event_classification", ""),
            "stage": mapped_stage,
            "client_name": beo.get("account", prospect.get("company_name", "") if prospect else ""),
            "event_date": beo.get("event_date", ""),
            "venue": beo.get("room", ""),
            "guest_count": beo.get("expected_count", 0),
            "guaranteed_count": beo.get("guaranteed_count", 0),
            "beo_number": beo.get("beo_number"),
            "revenue": {
                "food": fin.get("food_revenue", 0), "beverage": fin.get("beverage_revenue", 0),
                "rental": fin.get("rental", 0), "av": fin.get("av_charges", 0),
                "service_charge": fin.get("service_charge", 0), "other": 0,
                "total": fin.get("total", 0),
            },
            "costs": {
                "food": fin.get("actual_food_cost", 0), "beverage": 0,
                "labor": fin.get("actual_labor_cost", 0), "rental": 0, "overhead": 0,
                "total": fin.get("actual_food_cost", 0) + fin.get("actual_labor_cost", 0),
            },
            "deposits": [], "beo_notes": beo.get("additional_info", ""),
            "setup_style": beo.get("setup_type", ""), "revision": beo.get("revision", 1),
            "table_count": 0, "staff_count": 0,
            "_source": "beo_pipeline",
        })

    definite = []
    pending = []
    for ev in all_events:
        formatted = _format_event(ev)
        formatted["beo_number"] = ev.get("beo_number") or formatted.get("beo_number", "")
        formatted["revision"] = ev.get("revision", 1)
        formatted["source"] = ev.get("_source", "events")
        if ev.get("stage", "") in DEFINITE_STAGES:
            definite.append(formatted)
        else:
            pending.append(formatted)

    definite.sort(key=lambda x: x.get("event_date", ""))
    pending.sort(key=lambda x: x.get("event_date", ""))

    total_definite_revenue = sum(e["revenue"]["total"] for e in definite)
    total_definite_spend = sum(e["actual_spend"]["total"] for e in definite)
    total_pending_revenue = sum(e["revenue"]["total"] for e in pending)

    return {
        "definite": definite,
        "pending": pending,
        "summary": {
            "definite_count": len(definite),
            "pending_count": len(pending),
            "total_definite_revenue": total_definite_revenue,
            "total_definite_spend": total_definite_spend,
            "total_pending_revenue": total_pending_revenue,
            "total_definite_guests": sum(e["guest_count"] for e in definite),
            "total_pending_guests": sum(e["guest_count"] for e in pending),
            "overall_margin": round(
                ((total_definite_revenue - total_definite_spend) / total_definite_revenue * 100), 1
            ) if total_definite_revenue > 0 else 0,
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/summary")
async def get_events_summary():
    """Quick summary of event pipeline stats."""
    all_events = list(db["events"].find({}, {"_id": 0, "stage": 1, "revenue": 1, "guest_count": 1}))
    stages = {}
    for ev in all_events:
        stage = ev.get("stage", "unknown")
        if stage not in stages:
            stages[stage] = {"count": 0, "revenue": 0, "guests": 0}
        stages[stage]["count"] += 1
        stages[stage]["revenue"] += ev.get("revenue", {}).get("total", 0)
        stages[stage]["guests"] += ev.get("guest_count", 0)

    return {"stages": stages, "total_events": len(all_events)}
