"""
iter175 · Employee Schedule App

Employee-facing mobile view. Shows their shifts for the week plus any
milestone recognitions that land during that window. This is the "unlock"
for birthday/anniversary/promotion recognition — surfaces directly in the
employee's schedule app.

Routes under `/api/my-schedule/*`.
"""
import os
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/my-schedule", tags=["my-schedule"])


def _today_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


@router.get("/employee/{employee_id}")
async def my_week(employee_id: str, start: Optional[str] = None, days: int = 7):
    """Return {me, shifts, milestones, banner, team_celebrations} for the week."""
    from database import db as _db
    me = _db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not me:
        raise HTTPException(404, "employee not found")

    start_iso = start or _today_iso()
    try: start_dt = datetime.strptime(start_iso, "%Y-%m-%d")
    except ValueError: raise HTTPException(400, "start must be YYYY-MM-DD")
    dates = [(start_dt + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]

    # Shifts from leadership_coverage (that's our current schedule source)
    shifts = list(_db.leadership_coverage.find(
        {"employee_id": employee_id, "date": {"$in": dates}}, {"_id": 0}
    ).sort("date", 1))

    # Milestones for me across the week
    from routes.milestones import _collect_milestones_for
    my_milestones: List[Dict[str, Any]] = []
    team_celebrations: List[Dict[str, Any]] = []
    company_feed: List[Dict[str, Any]] = []
    for d in dates:
        day_all = _collect_milestones_for(d)
        for m in day_all:
            if m["employee_id"] == employee_id:
                my_milestones.append({**m, "date": d})
            else:
                entry = {"date": d, "name": m["name"], "kind": m["kind"],
                         "years": m.get("years"), "department": m.get("department")}
                company_feed.append(entry)
                if m.get("department") == me.get("department"):
                    team_celebrations.append(entry)

    # Today's recognition banner (if any)
    today = _today_iso()
    today_mine = [m for m in my_milestones if m.get("date") == today]
    banner = None
    if today_mine:
        m = today_mine[0]
        banner = {"birthday": f"🎂 Happy Birthday, {me.get('display_name')}!",
                  "anniversary": f"🏅 {m.get('years','')} years · thank you for everything you bring",
                  "promotion": f"⭐ {m.get('years','')} years since your promotion to {m.get('to_title','')}"}.get(m["kind"])

    return {"ok": True, "employee": {"id": me["id"], "display_name": me.get("display_name"),
                                       "department": me.get("department"), "title": me.get("title"),
                                       "photo_url": me.get("photo_url")},
            "start": start_iso, "days": days, "dates": dates,
            "shifts": shifts, "milestones": my_milestones, "banner": banner,
            "team_celebrations": team_celebrations[:12],
            "company_feed": company_feed[:30]}


@router.get("/today/{employee_id}")
async def today_card(employee_id: str):
    """Compact card: today's shift + today's recognition banner (for home screen)."""
    from database import db as _db
    today = _today_iso()
    me = _db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not me: raise HTTPException(404, "employee not found")
    shift = _db.leadership_coverage.find_one({"employee_id": employee_id, "date": today}, {"_id": 0})
    from routes.milestones import feed as _feed
    ms = await _feed(employee_id=employee_id, date_iso=today)
    return {"ok": True, "date": today,
            "employee": {"id": me["id"], "display_name": me.get("display_name"), "department": me.get("department"), "title": me.get("title")},
            "shift": shift, "banner": ms.get("banner"), "milestones": ms.get("milestones") or []}
