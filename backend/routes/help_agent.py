"""
Help Agent — LUCCCA Echo Help Mascot Backend
=============================================
Exposes the corner-parked astronaut mascot's guided tours, sessions, and
free-form ask endpoints. Spec: docs/UX_ICON_SYSTEM.md + docs/UX_ICON_MASTER_LIST.md.

5 starter tours (per the D63/D64 brief):
  · post_first_recipe_voice
  · approve_pending_action
  · borrow_employee_cross_dept
  · menu_proposal_for_event
  · view_paystub

Endpoints (all prefixed /api/help-agent):
  GET    /tours                          → list available tours (summary)
  GET    /tours/{tour_id}                → full tour (id, title, steps[])
  POST   /sessions                       → start a session for a tour
  POST   /sessions/{session_id}/advance  → advance to next step
  POST   /sessions/{session_id}/skip     → skip current step
  POST   /sessions/{session_id}/abandon  → close the session
  POST   /ask                            → free-form Q&A (returns a coached reply)
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field


router = APIRouter(prefix="/api/help-agent", tags=["help-agent"])

# iter267 · LLM key for free-form Q&A (Calculus, P&L, hospitality ops, etc.).
LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")


# ----------------------------------------------------------------------------
# Tour definitions (in-memory; safe across reloads — they're static content)
# ----------------------------------------------------------------------------
TOURS: Dict[str, Dict[str, Any]] = {
    "post_first_recipe_voice": {
        "id": "post_first_recipe_voice",
        "title": "Post your first recipe with voice",
        "description": "Capture a recipe by talking — no typing required.",
        "duration_seconds": 90,
        "steps": [
            {"target": "sidebar-group-toggle-culinary_ops", "title": "Open Culinary",
             "body": "Tap the Culinary group on the left to see your recipe tools."},
            {"target": "sidebar-link-culinary", "title": "Launch Recipes",
             "body": "Click 'Culinary' to open the recipe workspace."},
            {"target": "voice-recipe-button", "title": "Tap the gold microphone",
             "body": "Hold the mic, speak the recipe, release when done. Echo transcribes and structures it for you."},
            {"target": "save-recipe-button", "title": "Save as draft",
             "body": "Review the captured fields, then Save. Sous-chef approval queue will pick it up."},
        ],
    },
    "approve_pending_action": {
        "id": "approve_pending_action",
        "title": "Approve a pending action",
        "description": "Review and resolve an approval that's waiting on you.",
        "duration_seconds": 60,
        "steps": [
            {"target": "approval-banner", "title": "Find the approval banner",
             "body": "Pending items surface at the top of the LUCCCA shell."},
            {"target": "approvals-open-btn", "title": "Open Approvals",
             "body": "Click 'Review' to see the full request, the actor, and the reason."},
            {"target": "approval-approve-btn", "title": "Approve or decline",
             "body": "Approve, decline with reason, or request more info. Action is logged to the audit trail."},
        ],
    },
    "borrow_employee_cross_dept": {
        "id": "borrow_employee_cross_dept",
        "title": "Borrow an employee across departments",
        "description": "Pull a teammate from another department for a covered shift.",
        "duration_seconds": 75,
        "steps": [
            {"target": "sidebar-link-schedule", "title": "Open Schedule",
             "body": "Schedule lives under the Quick Daily group."},
            {"target": "schedule-cell-open", "title": "Pick the uncovered shift",
             "body": "Empty cells glow amber. Click one to start a borrow request."},
            {"target": "borrow-cross-dept-btn", "title": "Borrow cross-dept",
             "body": "Pick a department, see who is qualified + available, send the request. They get a MyEcho ping."},
        ],
    },
    "menu_proposal_for_event": {
        "id": "menu_proposal_for_event",
        "title": "Build a menu proposal for an event",
        "description": "Spin up a draft menu tied to a banquet event order.",
        "duration_seconds": 90,
        "steps": [
            {"target": "sidebar-link-beo-planner", "title": "Open BEO Planner",
             "body": "Events & Catering → BEO Planner. Pick the event."},
            {"target": "menu-proposal-tab", "title": "Switch to Menu Proposal",
             "body": "Drag courses, set covers, see the live cost-per-cover."},
            {"target": "send-proposal-btn", "title": "Send for review",
             "body": "Proposal routes to the F&B Director. Status appears on the event card."},
        ],
    },
    "view_paystub": {
        "id": "view_paystub",
        "title": "View your paystub",
        "description": "Find and download your latest paystub.",
        "duration_seconds": 45,
        "steps": [
            {"target": "user-avatar-menu", "title": "Open your profile menu",
             "body": "Top-right avatar. Your personal hub for time, pay, and PTO."},
            {"target": "myecho-paystubs-link", "title": "Open Paystubs",
             "body": "MyEcho → Paystubs. Latest pay period is highlighted in gold."},
            {"target": "paystub-download-btn", "title": "Download PDF",
             "body": "Click the gold download icon to save it locally."},
        ],
    },
}


# ----------------------------------------------------------------------------
# In-memory session store (sessions are ephemeral by design — tour progress
# does not need durability; on reload the user can simply re-start).
# ----------------------------------------------------------------------------
SESSIONS: Dict[str, Dict[str, Any]] = {}


# ----------------------------------------------------------------------------
# Pydantic models
# ----------------------------------------------------------------------------
class TourSummary(BaseModel):
    id: str
    title: str
    description: str
    duration_seconds: int
    step_count: int


class TourStep(BaseModel):
    target: str
    title: str
    body: str


class Tour(BaseModel):
    id: str
    title: str
    description: str
    duration_seconds: int
    steps: List[TourStep]


class SessionStartRequest(BaseModel):
    tour_id: str = Field(..., description="ID of the tour to start")
    user_id: Optional[str] = None


class Session(BaseModel):
    session_id: str
    tour_id: str
    user_id: Optional[str] = None
    step_index: int
    total_steps: int
    current_step: Optional[TourStep] = None
    status: str  # active | completed | abandoned | skipped
    started_at: str
    updated_at: str


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    context_panel: Optional[str] = None
    user_id: Optional[str] = None


class AskResponse(BaseModel):
    reply: str
    suggested_tour: Optional[str] = None


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _session_view(s: Dict[str, Any]) -> Session:
    tour = TOURS[s["tour_id"]]
    steps = tour["steps"]
    idx = s["step_index"]
    current = TourStep(**steps[idx]) if 0 <= idx < len(steps) else None
    return Session(
        session_id=s["session_id"],
        tour_id=s["tour_id"],
        user_id=s.get("user_id"),
        step_index=idx,
        total_steps=len(steps),
        current_step=current,
        status=s["status"],
        started_at=s["started_at"],
        updated_at=s["updated_at"],
    )


def _suggest_tour(question: str) -> Optional[str]:
    q = (question or "").lower()
    if any(w in q for w in ("recipe", "voice", "transcribe", "dictate")):
        return "post_first_recipe_voice"
    if any(w in q for w in ("approve", "approval", "pending")):
        return "approve_pending_action"
    if any(w in q for w in ("borrow", "cover shift", "other department", "cross-dept")):
        return "borrow_employee_cross_dept"
    if any(w in q for w in ("menu proposal", "beo", "banquet", "event menu")):
        return "menu_proposal_for_event"
    if any(w in q for w in ("paystub", "pay stub", "payroll", "w2", "w-2")):
        return "view_paystub"
    return None


# ----------------------------------------------------------------------------
# Routes
# ----------------------------------------------------------------------------
@router.get("/tours", response_model=List[TourSummary])
def list_tours() -> List[TourSummary]:
    return [
        TourSummary(
            id=t["id"],
            title=t["title"],
            description=t["description"],
            duration_seconds=t["duration_seconds"],
            step_count=len(t["steps"]),
        )
        for t in TOURS.values()
    ]


@router.get("/tours/{tour_id}", response_model=Tour)
def get_tour(tour_id: str) -> Tour:
    t = TOURS.get(tour_id)
    if not t:
        raise HTTPException(status_code=404, detail=f"Tour '{tour_id}' not found")
    return Tour(**t)


@router.post("/sessions", response_model=Session)
def start_session(req: SessionStartRequest) -> Session:
    if req.tour_id not in TOURS:
        raise HTTPException(status_code=404, detail=f"Tour '{req.tour_id}' not found")
    sid = str(uuid.uuid4())
    now = _now()
    SESSIONS[sid] = {
        "session_id": sid,
        "tour_id": req.tour_id,
        "user_id": req.user_id,
        "step_index": 0,
        "status": "active",
        "started_at": now,
        "updated_at": now,
    }
    return _session_view(SESSIONS[sid])


@router.post("/sessions/{session_id}/advance", response_model=Session)
def advance_session(session_id: str) -> Session:
    s = SESSIONS.get(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    if s["status"] != "active":
        raise HTTPException(status_code=409, detail=f"Session is {s['status']}")
    tour = TOURS[s["tour_id"]]
    if s["step_index"] + 1 >= len(tour["steps"]):
        s["status"] = "completed"
        s["step_index"] = len(tour["steps"])
    else:
        s["step_index"] += 1
    s["updated_at"] = _now()
    return _session_view(s)


@router.post("/sessions/{session_id}/skip", response_model=Session)
def skip_session(session_id: str) -> Session:
    s = SESSIONS.get(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    s["status"] = "skipped"
    s["updated_at"] = _now()
    return _session_view(s)


@router.post("/sessions/{session_id}/abandon", response_model=Session)
def abandon_session(session_id: str) -> Session:
    s = SESSIONS.get(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    s["status"] = "abandoned"
    s["updated_at"] = _now()
    return _session_view(s)


@router.post("/ask", response_model=AskResponse)
async def ask(req: AskRequest) -> AskResponse:
    """
    iter267 · Echo AURION free-form Q&A.

    Routes the question through Claude/GPT (via Emergent LLM key) so the
    answer can cover anything from "teach me calculus" to "how do I read a
    P&L" to "where do I find ingredient cost". The legacy rule-based tour
    matcher still runs first — if a tour is a strong match, we suggest it
    in addition to the LLM answer.
    """
    suggested = _suggest_tour(req.question)

    # Rule-based tour suggestion (preserves legacy fast-path)
    tour_hint = ""
    if suggested:
        t = TOURS[suggested]
        tour_hint = (
            f"\n\n(I can also walk you through this — open the '{t['title']}' "
            f"tour, takes ~{t['duration_seconds']}s.)"
        )

    # LLM-backed answer
    llm_reply = None
    if LLM_KEY:
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage  # type: ignore
            ctx_line = f"Active panel: {req.context_panel}\n" if req.context_panel else ""
            system_message = (
                "You are Echo AURION, the in-app AI assistant for EchoAurion — "
                "a hospitality + resort + casino operations platform "
                "(culinary, banquet/BEO, beverage, finance, scheduling, "
                "purchasing, PMS, concierge). You also tutor on general "
                "topics the operator may ask (math/calculus, accounting, "
                "P&L literacy, statistics, food science, regulations).\n\n"
                "Rules:\n"
                "1. Be concise but warm. Default to 4-8 short lines.\n"
                "2. Use plain language; no jargon dump.\n"
                "3. When teaching (e.g. 'read a P&L', 'integrate this', "
                "   'what is a 409A'), structure as: 1-line definition → "
                "   3-5 numbered steps or bullets → 1-line why it matters.\n"
                "4. When the question is about navigating the app, suggest "
                "   the panel name (e.g. 'Open Supplier Catalog · ⌘K').\n"
                "5. Use $ for money, % for rates.\n"
                "6. Never invent numbers from the user's data; if unknown, "
                "   say 'open the Aurum P&L panel for the actual figure'.\n"
                f"{ctx_line}"
            )
            session_id = f"help-{req.user_id or 'anon'}-{uuid.uuid4().hex[:6]}"
            chat = LlmChat(
                api_key=LLM_KEY,
                session_id=session_id,
                system_message=system_message,
            )
            chat.with_model("openai", "gpt-4.1-mini")
            llm_reply = await chat.send_message(UserMessage(text=req.question))
        except Exception as e:
            # Fall through to rule-based reply; log so silent LLM outages
            # are visible in supervisor stderr.
            llm_reply = None
            import logging
            logging.getLogger("help_agent").warning(
                "help-agent /ask LLM call failed (%s) — using rule-based fallback",
                str(e)[:200],
            )

    if llm_reply:
        return AskResponse(reply=f"{llm_reply}{tour_hint}", suggested_tour=suggested)

    # Fallback: rule-based reply (legacy behavior)
    if suggested:
        t = TOURS[suggested]
        reply = (
            f"I can walk you through that — try the '{t['title']}' tour. "
            f"It takes about {t['duration_seconds']}s and covers {len(t['steps'])} steps. "
            "Tap Start, and I'll point at each thing you need to do."
        )
    else:
        reply = (
            "I'm still learning that workflow. In the meantime, try the sidebar — "
            "every module has a tooltip on hover, and the corner mascot can launch "
            "a guided tour for the most common tasks (recipes, approvals, scheduling, "
            "BEOs, paystubs)."
        )
    return AskResponse(reply=reply, suggested_tour=suggested)
