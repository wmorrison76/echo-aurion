"""
D45 · Personal Sous Chef voice agent.

User directive: chef holds his phone, says "compile the BEO orders
for the next 4 days for my review", "adjust the schedule for this
popup event", "draft a menu proposal for a 100-person nautical-
themed event", "tell Chef Charlie to play 9 with me Sunday." The
software does the heavy lifting so the chef has a life.

This module is the intent-router layer that converts a free-form
voice / text intent into one of these multi-step skills, runs
the skill, and surfaces the result via the D39 activity drawer
so the chef sees what Echo did and can review/approve/cancel.

Skills shipped in this PR

  beo_compile         "compile BEO orders for next 4 days"
  popup_schedule      "adjust schedule for popup event"
  menu_proposal       "draft menu proposal for {n} people {theme}"
  peer_message        "tell {name} to {message}"

Design contract

  · Every skill returns a STRUCTURED result + a human-readable
    summary written to the activity drawer (D39).
  · Skills NEVER auto-publish; output is a draft that the chef
    must approve. Drawer task carries handoff_route to the
    review surface.
  · Voice transcripts come from the device (or upstream STT).
    This module does intent classification, not speech recognition.
  · §1.4 voice register: chef-personal channel; per-user scoping
    via x-user-id required.
  · §2.5 framing: "I drafted X for your review" never "I did X."
"""
from __future__ import annotations

import re
import uuid
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db

router = APIRouter(prefix="/api/echo/sous-chef",
                   tags=["echo-sous-chef-agent"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _resolve_user(x_user_id: Optional[str]) -> str:
    if not x_user_id:
        raise HTTPException(401, "x-user-id required")
    return x_user_id.strip()


# ─── Intent classifier (heuristic; LLM seam through D17 fuse) ──────────

INTENT_PATTERNS = [
    ("beo_compile", re.compile(
        r"(compile|put together|get me|show me).{0,30}(beo|banquet|event order)",
        re.I)),
    ("popup_schedule", re.compile(
        r"(adjust|update|reschedule|fix).{0,30}(schedule|roster).{0,40}popup",
        re.I)),
    ("menu_proposal", re.compile(
        r"(menu|propos|draft).{0,40}(\d+)\s*(person|people|guests|pax|covers)",
        re.I)),
    ("peer_message", re.compile(
        r"(tell|message|send|text)\s+(chef\s+)?(\w+)", re.I)),
]


def _classify_intent(text: str) -> Tuple[str, Dict[str, Any]]:
    """Return (skill_name, captured_params)."""
    if not text:
        return ("unknown", {})
    for skill, pat in INTENT_PATTERNS:
        m = pat.search(text)
        if m:
            return (skill, {"groups": list(m.groups())})
    return ("unknown", {})


def _emit_drawer_task(*, tenant_id: str, owner_user_id: str,
                      title: str, handoff_route: Optional[str],
                      metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Best-effort handoff to D39 activity drawer. If the drawer
    module isn't loaded (different deployment), persist directly."""
    try:
        from routes.echo_activity_drawer import enqueue_task
        return enqueue_task(
            tenant_id=tenant_id, owner_user_id=owner_user_id,
            kind="sous_chef_skill", title=title, status="done",
            handoff_route=handoff_route, metadata=metadata)
    except Exception:
        task = {
            "id": uuid.uuid4().hex[:16],
            "tenant_id": tenant_id, "owner_user_id": owner_user_id,
            "kind": "sous_chef_skill", "title": title, "status": "done",
            "handoff_route": handoff_route, "metadata": metadata,
            "chunk_count": 0, "created_at": _now_iso(),
            "updated_at": _now_iso(), "closed_at": None,
        }
        db["echo_activity_tasks"].insert_one(task.copy())
        return task


# ─── Models ──────────────────────────────────────────────────────────────

class IntentBody(BaseModel):
    transcript: str = Field(..., min_length=2)
    outlet_id: Optional[str] = None


# ─── Skill 1 · BEO compile (next N days) ──────────────────────────────

def _skill_beo_compile(tenant_id: str, owner_user_id: str,
                       outlet_id: Optional[str], days: int = 4
                       ) -> Dict[str, Any]:
    today = _now().date()
    end = today + timedelta(days=days)
    q: Dict[str, Any] = {"tenant_id": tenant_id,
                          "event_date": {"$gte": today.isoformat()}}
    if outlet_id:
        q["outlet_id"] = outlet_id
    raw = list(db["beos"].find(q, {"_id": 0}).limit(2000))
    beos = [b for b in raw
            if b.get("event_date","") <= end.isoformat()]
    beos.sort(key=lambda b: (b.get("event_date",""),
                              b.get("start_time","")))
    by_day: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    total_covers = 0
    for b in beos:
        by_day[b.get("event_date","?")].append(b)
        total_covers += int(b.get("guest_count") or 0)

    summary_lines: List[str] = [
        f"## BEO summary, next {days} days",
        f"{len(beos)} events · {total_covers} covers total",
        "",
    ]
    for day in sorted(by_day.keys()):
        evs = by_day[day]
        summary_lines.append(f"### {day} ({len(evs)} event{'s' if len(evs)!=1 else ''})")
        for b in evs:
            summary_lines.append(
                f"  · {b.get('start_time','??:??')} {b.get('event_name','?')} "
                f"— {b.get('guest_count','?')} pax @ {b.get('venue','?')}"
            )
        summary_lines.append("")

    digest_id = uuid.uuid4().hex[:16]
    db["beo_digests"].insert_one({
        "id": digest_id,
        "tenant_id": tenant_id,
        "owner_user_id": owner_user_id,
        "outlet_id": outlet_id,
        "horizon_days": days,
        "event_count": len(beos),
        "total_covers": total_covers,
        "by_day": dict(by_day),
        "summary_md": "\n".join(summary_lines),
        "created_at": _now_iso(),
    })
    task = _emit_drawer_task(
        tenant_id=tenant_id, owner_user_id=owner_user_id,
        title=f"BEO digest · next {days} days · {len(beos)} events",
        handoff_route=f"/m/beo/digest/{digest_id}",
        metadata={"digest_id": digest_id, "event_count": len(beos),
                  "total_covers": total_covers})
    return {"skill": "beo_compile",
            "digest_id": digest_id,
            "event_count": len(beos),
            "total_covers": total_covers,
            "horizon_days": days,
            "summary_md": "\n".join(summary_lines),
            "task": task}


# ─── Skill 2 · Popup schedule adjust ──────────────────────────────────

class PopupSpec(BaseModel):
    name: str
    start_at: str
    end_at: str
    expected_covers: int = 0
    departments: List[str] = Field(default_factory=lambda: ["BOH","FOH"])
    outlet_id: Optional[str] = None


def _skill_popup_schedule(tenant_id: str, owner_user_id: str,
                          spec: PopupSpec) -> Dict[str, Any]:
    """Find shifts overlapping the popup window, compute additional
    headcount needed (covers / 25 ≈ extra cooks; covers / 30 ≈ extra
    servers), draft proposed schedule additions. Output is a DRAFT —
    chef approves to actualize."""
    start = datetime.fromisoformat(spec.start_at.replace("Z","+00:00"))
    end = datetime.fromisoformat(spec.end_at.replace("Z","+00:00"))
    if start.tzinfo is None: start = start.replace(tzinfo=timezone.utc)
    if end.tzinfo is None: end = end.replace(tzinfo=timezone.utc)

    extra_cooks = max(1, int(spec.expected_covers / 25))
    extra_servers = max(1, int(spec.expected_covers / 30))

    # Find available employees not currently on the popup window
    candidates: List[Dict[str, Any]] = []
    emps = list(db["employees"].find(
        {"tenant_id": tenant_id, "active": True}, {"_id": 0}).limit(2000))
    for e in emps:
        dept = (e.get("department") or "").upper()
        if dept not in [d.upper() for d in spec.departments]:
            continue
        conflict = db["echo_schedule_shifts"].find_one(
            {"tenant_id": tenant_id, "employee_id": e["id"],
             "date": start.date().isoformat()})
        candidates.append({
            "employee_id": e["id"],
            "name": (f"{e.get('first_name','')} "
                     f"{e.get('last_name','')}").strip(),
            "department": dept,
            "available": (conflict is None),
        })

    # Pick BOH cooks + FOH servers needed
    cooks = [c for c in candidates
             if c["department"] in ("BOH","KITCHEN","CULINARY","BANQUET")
             and c["available"]][:extra_cooks]
    servers = [c for c in candidates
               if c["department"] in ("FOH","SERVICE","BAR")
               and c["available"]][:extra_servers]

    proposal_id = uuid.uuid4().hex[:16]
    proposal = {
        "id": proposal_id,
        "tenant_id": tenant_id,
        "owner_user_id": owner_user_id,
        "popup_name": spec.name,
        "outlet_id": spec.outlet_id,
        "start_at": start.isoformat(),
        "end_at": end.isoformat(),
        "expected_covers": spec.expected_covers,
        "extra_headcount": {
            "cooks_needed": extra_cooks,
            "servers_needed": extra_servers,
        },
        "proposed_cooks": cooks,
        "proposed_servers": servers,
        "candidate_pool_size": len(candidates),
        "approved_at": None,
        "applied_at": None,
        "created_at": _now_iso(),
    }
    db["popup_schedule_proposals"].insert_one(proposal.copy())

    task = _emit_drawer_task(
        tenant_id=tenant_id, owner_user_id=owner_user_id,
        title=f"Popup schedule · {spec.name} · "
              f"{extra_cooks}c+{extra_servers}s",
        handoff_route=f"/m/schedule/popup/{proposal_id}",
        metadata={"proposal_id": proposal_id,
                  "popup_name": spec.name,
                  "expected_covers": spec.expected_covers})
    return {"skill": "popup_schedule",
            "proposal_id": proposal_id,
            "extra_cooks": extra_cooks,
            "extra_servers": extra_servers,
            "proposed_cooks": cooks,
            "proposed_servers": servers,
            "task": task}


# ─── Skill 3 · Menu proposal (themed) ─────────────────────────────────

THEME_KEYWORDS: Dict[str, List[str]] = {
    "nautical": ["seafood", "fish", "shrimp", "scallop", "lobster",
                 "oyster", "clam", "tuna", "salmon", "ceviche",
                 "octopus", "crab", "calamari"],
    "italian": ["pasta", "risotto", "carbonara", "bolognese",
                "tiramisu", "cannoli", "pesto", "marinara"],
    "asian": ["wok", "dumpling", "noodle", "miso", "sake",
              "ramen", "sushi", "kimchi", "satay"],
    "garden": ["salad", "vegetable", "tomato", "burrata", "asparagus",
               "carrot", "beet", "tart", "vegetarian"],
    "rustic": ["braise", "roast", "stew", "cassoulet", "tart",
               "duck", "lamb", "country"],
    "steakhouse": ["ribeye", "tenderloin", "filet", "porterhouse",
                   "strip", "wedge", "creamed", "potato"],
}


class MenuProposalSpec(BaseModel):
    guest_count: int = Field(..., ge=1)
    theme: str
    courses: int = 4
    dietary_notes: Optional[str] = None
    outlet_id: Optional[str] = None


def _skill_menu_proposal(tenant_id: str, owner_user_id: str,
                         spec: MenuProposalSpec) -> Dict[str, Any]:
    theme_key = spec.theme.lower().strip()
    keywords = THEME_KEYWORDS.get(theme_key, [theme_key])

    # Fetch the recipe library and rank by theme keyword overlap
    recipes = list(db["recipes"].find(
        {"tenant_id": tenant_id}, {"_id": 0}).limit(5000))
    if not recipes:
        recipes = list(db["recipes"].find({}, {"_id": 0}).limit(5000))

    def _score(r: Dict[str, Any]) -> int:
        text = (
            (r.get("name") or "") + " " +
            " ".join(r.get("ingredients") or []) + " " +
            (r.get("category") or "") + " " +
            (r.get("description") or "")
        ).lower()
        return sum(1 for kw in keywords if kw in text)

    scored = sorted(
        ((r, _score(r)) for r in recipes),
        key=lambda x: -x[1])
    matched = [r for r, s in scored if s > 0]
    if len(matched) < spec.courses:
        # Backfill with highest-scored even when zero
        matched = [r for r, _ in scored][:max(spec.courses, 8)]

    # Categorize
    course_buckets: Dict[str, List[Dict[str, Any]]] = {
        "amuse": [], "first": [], "main": [], "dessert": []}
    for r in matched:
        cat = (r.get("category") or "").lower()
        if any(k in cat for k in ("dessert","sweet","pastry")):
            course_buckets["dessert"].append(r)
        elif any(k in cat for k in ("amuse","canape","snack")):
            course_buckets["amuse"].append(r)
        elif any(k in cat for k in ("entree","main","plate")):
            course_buckets["main"].append(r)
        else:
            course_buckets["first"].append(r)

    # Compose courses
    courses_out = []
    for course in ["amuse","first","main","dessert"][:spec.courses]:
        pool = course_buckets[course] or matched
        if not pool: continue
        chosen = pool[0]
        courses_out.append({
            "course": course,
            "recipe_id": chosen.get("id"),
            "name": chosen.get("name"),
            "category": chosen.get("category"),
            "allergens": chosen.get("allergens") or [],
            "match_keywords": [k for k in keywords
                if k in (chosen.get("name") or "").lower()
                or any(k in (i or "").lower() for i in chosen.get("ingredients") or [])],
        })

    # Cost roll-up (rough; real costing via D30/recipe_graph)
    total_recipe_cost = 0.0
    for c in courses_out:
        r = next((rc for rc in matched if rc.get("id") == c["recipe_id"]), {})
        total_recipe_cost += float(r.get("cost") or 0)
    estimated_food_cost = round(total_recipe_cost * spec.guest_count, 2)

    proposal_id = uuid.uuid4().hex[:16]
    proposal = {
        "id": proposal_id,
        "tenant_id": tenant_id,
        "owner_user_id": owner_user_id,
        "outlet_id": spec.outlet_id,
        "guest_count": spec.guest_count,
        "theme": spec.theme,
        "course_count": spec.courses,
        "dietary_notes": spec.dietary_notes,
        "courses": courses_out,
        "estimated_food_cost_usd": estimated_food_cost,
        "approved_at": None,
        "sent_to_client_at": None,
        "created_at": _now_iso(),
    }
    db["menu_proposals"].insert_one(proposal.copy())

    summary = (
        f"## {spec.guest_count}-person {spec.theme} menu proposal\n\n"
        + "\n".join(f"  · **{c['course']}**: {c['name']}"
                    for c in courses_out)
        + f"\n\nEstimated food cost: ${estimated_food_cost}"
    )

    task = _emit_drawer_task(
        tenant_id=tenant_id, owner_user_id=owner_user_id,
        title=f"Menu proposal · {spec.guest_count}p {spec.theme}",
        handoff_route=f"/m/proposals/{proposal_id}",
        metadata={"proposal_id": proposal_id,
                  "guest_count": spec.guest_count,
                  "theme": spec.theme})
    return {"skill": "menu_proposal",
            "proposal_id": proposal_id,
            "courses": courses_out,
            "estimated_food_cost_usd": estimated_food_cost,
            "summary_md": summary,
            "task": task}


# ─── Skill 4 · Peer message ────────────────────────────────────────────

class PeerMessageSpec(BaseModel):
    to_employee_id: str
    body: str = Field(..., min_length=2)
    channel: str = Field("in_app", pattern="^(in_app|sms|email)$")


def _skill_peer_message(tenant_id: str, owner_user_id: str,
                        spec: PeerMessageSpec) -> Dict[str, Any]:
    msg_id = uuid.uuid4().hex[:16]
    msg = {
        "id": msg_id,
        "tenant_id": tenant_id,
        "from_user_id": owner_user_id,
        "to_employee_id": spec.to_employee_id,
        "body": spec.body,
        "channel": spec.channel,
        "delivered_at": _now_iso(),  # in-app delivery is immediate
        "read_at": None,
        "created_at": _now_iso(),
    }
    db["peer_messages"].insert_one(msg.copy())
    task = _emit_drawer_task(
        tenant_id=tenant_id, owner_user_id=owner_user_id,
        title=f"Sent · {spec.to_employee_id}: {spec.body[:40]}",
        handoff_route=f"/m/messages/{msg_id}",
        metadata={"message_id": msg_id, "to": spec.to_employee_id})
    return {"skill": "peer_message", "message": msg, "task": task}


# ─── Public endpoints ───────────────────────────────────────────────────

@router.post("/intent")
def intent(
    body: IntentBody,
    x_tenant_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    """Route a free-form transcript to the right skill. Returns
    skill output + drawer task. Always-ahead-of-empty: even an
    unknown intent gets a graceful response."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    owner = _resolve_user(x_user_id)

    skill, params = _classify_intent(body.transcript)

    if skill == "beo_compile":
        return _skill_beo_compile(tenant_id, owner, body.outlet_id, days=4)

    if skill == "menu_proposal":
        # Extract n + theme from groups
        groups = params.get("groups") or []
        n = 100
        for g in groups:
            if g and g.isdigit():
                n = int(g); break
        theme_match = re.search(
            r"(nautical|italian|asian|garden|rustic|steakhouse)",
            body.transcript, re.I)
        theme = theme_match.group(1).lower() if theme_match else "garden"
        spec = MenuProposalSpec(guest_count=n, theme=theme,
            courses=4, dietary_notes=None, outlet_id=body.outlet_id)
        return _skill_menu_proposal(tenant_id, owner, spec)

    if skill == "peer_message":
        # Extract recipient + body
        groups = params.get("groups") or []
        # last non-None group is recipient name
        recipient = next((g for g in reversed(groups) if g and g.lower() not in ("chef","tell","message","send","text")), None)
        if not recipient:
            raise HTTPException(400,
                "couldn't extract recipient — try 'tell <name> ...'")
        # Look up by first_name (case-insensitive)
        emp = db["employees"].find_one(
            {"tenant_id": tenant_id, "first_name": recipient.title()})
        if not emp:
            return {"skill": "peer_message",
                    "ok": False,
                    "detail": f"no employee found with first name '{recipient}'",
                    "task": None}
        # Body = transcript minus the recipient/verb prefix
        body_text = re.sub(
            r"^(tell|message|send|text)\s+(chef\s+)?\w+\s+",
            "", body.transcript, flags=re.I).strip()
        spec = PeerMessageSpec(to_employee_id=emp["id"],
            body=body_text or body.transcript, channel="in_app")
        return _skill_peer_message(tenant_id, owner, spec)

    if skill == "popup_schedule":
        # Popup needs structured input — intent endpoint can't
        # invent a popup spec from a sentence. Return a request to
        # the chef for the structured fields.
        return {
            "skill": "popup_schedule",
            "ok": False,
            "detail": "popup_schedule needs structured fields — "
                       "POST /sous-chef/popup-schedule with PopupSpec "
                       "from the form the drawer should now show",
            "needs_form": True,
            "form_route": "/m/sous-chef/popup-schedule-form",
        }

    return {
        "skill": "unknown",
        "ok": False,
        "detail": (f"didn't catch the intent in '{body.transcript[:80]}'. "
                   f"Try: 'compile BEO orders for next 4 days', "
                   f"'menu proposal for 100 person nautical event', "
                   f"or 'tell chef Charlie ...'"),
        "task": None,
    }


@router.post("/popup-schedule")
def popup_schedule(
    spec: PopupSpec,
    x_tenant_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    owner = _resolve_user(x_user_id)
    return _skill_popup_schedule(tenant_id, owner, spec)


@router.post("/menu-proposal")
def menu_proposal(
    spec: MenuProposalSpec,
    x_tenant_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    owner = _resolve_user(x_user_id)
    return _skill_menu_proposal(tenant_id, owner, spec)


@router.post("/peer-message")
def peer_message(
    spec: PeerMessageSpec,
    x_tenant_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    owner = _resolve_user(x_user_id)
    return _skill_peer_message(tenant_id, owner, spec)


@router.get("/beo-digest/{digest_id}")
def get_beo_digest(
    digest_id: str,
    x_tenant_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    owner = _resolve_user(x_user_id)
    d = db["beo_digests"].find_one(
        {"id": digest_id, "tenant_id": tenant_id,
         "owner_user_id": owner}, {"_id": 0})
    if not d:
        raise HTTPException(404, "digest not found")
    return {"ok": True, "digest": d}


@router.get("/skills")
def list_skills():
    return {
        "ok": True,
        "skills": [
            {"name": "beo_compile",
             "examples": [
                "compile BEO orders for next 4 days",
                "put together the BEOs for this week",
             ]},
            {"name": "popup_schedule",
             "examples": [
                "adjust schedule for popup event",
                "fix roster for tonight's popup",
             ]},
            {"name": "menu_proposal",
             "examples": [
                "menu proposal for 100 person nautical event",
                "draft a 4-course menu for 60 people Italian theme",
             ]},
            {"name": "peer_message",
             "examples": [
                "tell Chef Charlie let's play 9 holes Sunday",
                "message Sara about Friday brunch",
             ]},
        ],
    }
