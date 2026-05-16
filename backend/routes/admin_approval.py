"""
Access Request Admin Approval Panel + Weekly P&L Digest
=========================================================
- Admin approves/denies access requests from managers
- Weekly P&L email digest generation (this week vs last week per outlet)
- Notification management
"""
import os
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional

from database import db

router = APIRouter(prefix="/api/admin-ops", tags=["admin-ops"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:12]


# ── Access Request Management ──

@router.get("/access-requests")
async def list_access_requests(status: Optional[str] = None):
    """List all access requests (for admin/accounting review)."""
    q = {}
    if status:
        q["status"] = status
    requests = list(db["access_requests"].find(q, {"_id": 0}).sort("created_at", -1).limit(50))
    return {
        "requests": requests,
        "total": len(requests),
        "pending": db["access_requests"].count_documents({"status": "pending"}),
        "approved": db["access_requests"].count_documents({"status": "approved"}),
        "denied": db["access_requests"].count_documents({"status": "denied"}),
    }


class AccessDecision(BaseModel):
    request_id: str
    decision: str  # approved or denied
    reviewed_by: str = "Admin"
    notes: Optional[str] = ""


@router.post("/access-requests/decide")
async def decide_access_request(decision: AccessDecision):
    """Approve or deny an access request."""
    req = db["access_requests"].find_one({"request_id": decision.request_id}, {"_id": 0})
    if not req:
        return {"error": "Request not found"}

    db["access_requests"].update_one(
        {"request_id": decision.request_id},
        {"$set": {
            "status": decision.decision,
            "reviewed_by": decision.reviewed_by,
            "reviewed_at": _now(),
            "review_notes": decision.notes,
        }},
    )

    # If approved, update user's RBAC access
    if decision.decision == "approved":
        section = req.get("requested_section", "")
        user_id = req.get("user_id", "")
        if user_id and section:
            # Add section to user's accessible sections
            db["rbac_users"].update_one(
                {"user_id": user_id},
                {"$addToSet": {"extra_access": section}},
            )

    # Notify the requesting user
    db["notifications"].insert_one({
        "id": _uid(),
        "type": "access_decision",
        "recipient_user_id": req.get("user_id"),
        "title": f"Access Request {decision.decision.title()}",
        "message": f"Your request to access '{req.get('requested_section')}' has been {decision.decision}." + (f" Notes: {decision.notes}" if decision.notes else ""),
        "priority": "normal",
        "read": False,
        "created_at": _now(),
    })

    return {"status": decision.decision, "request_id": decision.request_id}


# ── Notifications ──

@router.get("/notifications")
async def list_notifications(user_id: Optional[str] = None, limit: int = 20):
    """List notifications for a user or all (admin)."""
    q = {}
    if user_id:
        q["$or"] = [{"recipient_user_id": user_id}, {"recipient_role": {"$exists": True}}]
    notifs = list(db["notifications"].find(q, {"_id": 0}).sort("created_at", -1).limit(limit))
    unread = db["notifications"].count_documents({**q, "read": False})
    return {"notifications": notifs, "total": len(notifs), "unread": unread}


@router.put("/notifications/{notification_id}/read")
async def mark_read(notification_id: str):
    """Mark a notification as read."""
    db["notifications"].update_one({"id": notification_id}, {"$set": {"read": True}})
    return {"status": "read", "id": notification_id}


# ── Weekly P&L Digest ──

@router.post("/weekly-digest")
async def generate_weekly_digest():
    """Generate weekly P&L digest comparing this week vs last week per outlet."""
    pos_txns = list(db["pos_transactions"].find({}, {"_id": 0}).limit(5000))
    gl = list(db["gl_entries"].find({}, {"_id": 0}).limit(2000))
    waste = list(db["waste_tracking"].find({}, {"_id": 0}).limit(500))

    if not pos_txns:
        return {"error": "No data for digest"}

    # Find date range
    all_dates = sorted(set(t.get("closed_at", "")[:10] for t in pos_txns if t.get("closed_at")))
    if len(all_dates) < 14:
        # Split whatever we have into two halves
        mid = len(all_dates) // 2
        this_week_dates = set(all_dates[mid:])
        last_week_dates = set(all_dates[:mid])
    else:
        this_week_dates = set(all_dates[-7:])
        last_week_dates = set(all_dates[-14:-7])

    def _compute_week(txns, dates):
        week_txns = [t for t in txns if t.get("closed_at", "")[:10] in dates]
        rev = sum(t.get("subtotal", 0) for t in week_txns)
        fc = sum(t.get("food_cost_total", 0) for t in week_txns)
        covers = sum(t.get("guest_count", 0) for t in week_txns)
        return {
            "revenue": round(rev, 2),
            "food_cost": round(fc, 2),
            "food_cost_pct": round(fc / max(rev, 1) * 100, 1),
            "covers": covers,
            "transactions": len(week_txns),
            "avg_check": round(rev / max(len(week_txns), 1), 2),
        }

    this_week = _compute_week(pos_txns, this_week_dates)
    last_week = _compute_week(pos_txns, last_week_dates)

    # Per outlet breakdown
    outlets_set = set(t.get("outlet_id", "") for t in pos_txns)
    outlet_comparison = []
    for oid in outlets_set:
        if not oid:
            continue
        o_txns = [t for t in pos_txns if t.get("outlet_id") == oid]
        tw = _compute_week(o_txns, this_week_dates)
        lw = _compute_week(o_txns, last_week_dates)
        rev_change = round(tw["revenue"] - lw["revenue"], 2)
        fc_change = round(tw["food_cost_pct"] - lw["food_cost_pct"], 1)

        wins = []
        concerns = []
        if fc_change < -0.5:
            wins.append(f"Food cost improved {abs(fc_change):.1f}pp")
        elif fc_change > 0.5:
            concerns.append(f"Food cost up {fc_change:.1f}pp")
        if rev_change > 0:
            wins.append(f"Revenue up ${rev_change:,.0f}")
        elif rev_change < -500:
            concerns.append(f"Revenue down ${abs(rev_change):,.0f}")

        outlet_comparison.append({
            "outlet_id": oid,
            "this_week": tw,
            "last_week": lw,
            "changes": {
                "revenue": rev_change,
                "revenue_pct": round(rev_change / max(lw["revenue"], 1) * 100, 1),
                "food_cost_pct_change": fc_change,
                "covers_change": tw["covers"] - lw["covers"],
            },
            "wins": wins,
            "concerns": concerns,
        })

    # AI narrative
    narrative = ""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        outlet_text = "\n".join([
            f"- {o['outlet_id']}: Rev ${o['this_week']['revenue']:,.0f} (was ${o['last_week']['revenue']:,.0f}), FC {o['this_week']['food_cost_pct']}% (was {o['last_week']['food_cost_pct']}%)"
            for o in outlet_comparison
        ])

        prompt = f"""Generate a weekly P&L email digest for hospitality managers.

THIS WEEK: Revenue ${this_week['revenue']:,.0f}, FC {this_week['food_cost_pct']}%, Covers {this_week['covers']}, Avg Check ${this_week['avg_check']:,.0f}
LAST WEEK: Revenue ${last_week['revenue']:,.0f}, FC {last_week['food_cost_pct']}%, Covers {last_week['covers']}, Avg Check ${last_week['avg_check']:,.0f}

BY OUTLET:
{outlet_text}

Write a 3-paragraph weekly digest:
1. Week-over-week performance summary with highlights
2. Per-outlet wins and concerns
3. Focus areas for next week

Keep it concise, use specific numbers, end with an encouraging call to action."""

        llm = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
            session_id=f"weekly-digest-{_uid()}",
            system_message="You are EchoAi³ generating weekly P&L digest emails for hospitality operators.",
        )
        llm.with_model("openai", "gpt-4.1-mini")
        narrative = await llm.send_message(UserMessage(text=prompt))
    except Exception as e:
        narrative = f"Weekly digest: This week Rev ${this_week['revenue']:,.0f} vs Last week ${last_week['revenue']:,.0f}."

    return {
        "period": {
            "this_week": sorted(this_week_dates)[-1] if this_week_dates else "",
            "last_week": sorted(last_week_dates)[-1] if last_week_dates else "",
        },
        "this_week": this_week,
        "last_week": last_week,
        "week_over_week": {
            "revenue_change": round(this_week["revenue"] - last_week["revenue"], 2),
            "revenue_change_pct": round((this_week["revenue"] - last_week["revenue"]) / max(last_week["revenue"], 1) * 100, 1),
            "food_cost_pct_change": round(this_week["food_cost_pct"] - last_week["food_cost_pct"], 1),
            "covers_change": this_week["covers"] - last_week["covers"],
        },
        "outlet_comparison": outlet_comparison,
        "narrative": narrative,
        "generated_at": _now(),
    }
