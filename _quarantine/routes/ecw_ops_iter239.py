"""iter239 · Daily Standup endpoints + admin settings toggle.

William's spec: standup modal enforced on first load (4s dwell + scroll
gate), admin can toggle on/off from settings, also appears on quick-launch
+ bottom tab.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Header
from pydantic import BaseModel, Field

from database import db
from lib.time import utcnow_iso

router = APIRouter(tags=["ecw-ops-iter239"])


# ── Today's standup (seeded demo → real editor in iter240) ─────────────
@router.get("/api/ecw-ops/standup/today")
def get_todays_standup():
    today = datetime.now(timezone.utc).date().isoformat()
    doc = db["daily_standups"].find_one({"date": today}, {"_id": 0})
    if doc:
        return doc
    # Demo standup for today
    return {
        "date": today,
        "headline": "Good morning, team",
        "author": "Chef William",
        "summary": "Big day — weekend brunch volume expected. Coastal Kitchen has a 40-top private at 19:30.",
        "sections": [
            {"title": "86 List",
              "body": "• Halibut — we're out, sub with cod\n• Truffle fries — push grilled asparagus instead"},
            {"title": "VIPs",
              "body": "Suite 2104 (Novak) — allergy to sesame, flag every course.\nTable 7 at 19:00 — corporate 8-top, pre-fix menu."},
            {"title": "Ordering",
              "body": "Berries delivery delayed to 11am. Use frozen for morning prep."},
        ],
        "items": [
            {"text": "Pastry runs short on dough — Anthony prepping extra at 8am", "owner": "Anthony"},
            {"text": "FOH: uniforms changed to summer whites starting today", "owner": "FOH"},
            {"text": "Marina (Everything But Water) out — coverage via Dashiell", "owner": "HR"},
            {"text": "Pool deck closing 4pm for maintenance — reroute guests to Garden Room", "owner": "Facilities"},
            {"text": "Echo voice: try the new proactive briefing — long-press Echo button", "owner": "Tech"},
        ],
        "shoutouts": [
            "Sienna crushed the salon relaunch weekend — 28% above rebook target",
            "Jaxon closed a $2,400 men's suite fitting — nice work",
        ],
    }


class StandupIn(BaseModel):
    date: Optional[str] = None
    headline: str
    summary: Optional[str] = None
    author: Optional[str] = None
    sections: List[Dict[str, str]] = Field(default_factory=list)
    items: List[Dict[str, Any]] = Field(default_factory=list)
    shoutouts: List[str] = Field(default_factory=list)


@router.post("/api/ecw-ops/standup")
def upsert_standup(body: StandupIn,
                    x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    date = body.date or datetime.now(timezone.utc).date().isoformat()
    doc = body.model_dump()
    doc["date"] = date
    doc["updated_by"] = x_user_id or "chef-william"
    doc["updated_at"] = utcnow_iso()
    db["daily_standups"].update_one(
        {"date": date},
        {"$set": doc, "$setOnInsert": {"created_at": utcnow_iso()}},
        upsert=True,
    )
    return {"ok": True, "date": date}


# ── Admin settings: enforce standup on load yes/no ─────────────────────
@router.get("/api/ecw-ops/standup/settings")
def get_standup_settings():
    doc = db["app_settings"].find_one({"id": "standup"}, {"_id": 0})
    if not doc:
        return {"enabled": True, "require_scroll": True, "dwell_seconds": 4}
    return doc


class StandupSettingsIn(BaseModel):
    enabled: bool = True
    require_scroll: bool = True
    dwell_seconds: int = 4


@router.patch("/api/ecw-ops/standup/settings")
def update_standup_settings(body: StandupSettingsIn,
                              x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    doc = {
        "id": "standup",
        **body.model_dump(),
        "updated_by": x_user_id or "chef-william",
        "updated_at": utcnow_iso(),
    }
    db["app_settings"].update_one({"id": "standup"}, {"$set": doc}, upsert=True)
    return {"ok": True, **doc}
