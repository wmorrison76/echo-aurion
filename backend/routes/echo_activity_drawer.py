"""
D39 · Echo activity drawer (transparency layer).

User directive: "on the right side of the screen there is an
activity drawer so you can see everything that Echo is doing —
a transparency layer." When the user clicks an item the drawer
opens further and shows the work in progress; voice intake
dictates a recipe and routes it to the recipe form; an open-ended
"teach me" question streams answer chunks into the drawer.

This module is the backend for that surface. The drawer is the
UI realization of doctrine §1.1 transparency: nothing Echo does
on the user's behalf is hidden.

Three intake categories ship in this PR:

  1. Activity tasks — every Echo action surfaces here as a row
     with status (queued / running / streaming / done / closed).
     Other modules write to this collection by calling
     enqueue_task() to make their work observable.

  2. Voice intake — POST /voice/recipe accepts a transcript
     (already STT'd by the frontend). The handler parses it into
     a structured recipe draft and emits it as a task with
     handoff_route=/m/recipes/new?draft={id}, so the drawer can
     deep-link to the Add-Recipe form pre-populated.

  3. Teach intake — POST /teach accepts an open-ended question
     ("teach me how to read a P&L") and creates a streaming
     task. The handler appends content chunks via /chunks. The
     drawer reads /tasks/{id}/chunks to render the streaming
     output.

Doctrine alignment

  · §1.1 transparency: every Echo action visible to the user.
    Tasks scope to (tenant_id, owner_user_id) so a user sees
    THEIR work — not other users'. Operators can see their own
    work; pass_dev can see all.
  · §1.4 voice register: drawer endpoints are user-scoped.
    A staff user only sees their own tasks.
  · §3.1 append-only chunks: streaming output is append-only
    (chunk index strictly increasing). Closing a task marks it
    closed but doesn't delete chunks.
  · D27 tenant isolation on every read/write.
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db

router = APIRouter(prefix="/api/echo/activity", tags=["echo-activity"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _resolve_owner(x_user_id: Optional[str]) -> str:
    if not x_user_id:
        raise HTTPException(401, "x-user-id header required")
    return x_user_id.strip()


def enqueue_task(*, tenant_id: str, owner_user_id: str,
                 kind: str, title: str,
                 status: str = "queued",
                 handoff_route: Optional[str] = None,
                 metadata: Optional[Dict[str, Any]] = None,
                 ) -> Dict[str, Any]:
    """Public API for other modules to surface work in the drawer.
    Returns the task row."""
    task = {
        "id": uuid.uuid4().hex[:16],
        "tenant_id": tenant_id,
        "owner_user_id": owner_user_id,
        "kind": kind,
        "title": title,
        "status": status,
        "handoff_route": handoff_route,
        "metadata": metadata or {},
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "closed_at": None,
        "chunk_count": 0,
    }
    db["echo_activity_tasks"].insert_one(task.copy())
    return task


# ─── Models ──────────────────────────────────────────────────────────────

class TaskCreateBody(BaseModel):
    kind: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    handoff_route: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class TaskUpdateBody(BaseModel):
    status: Optional[str] = Field(
        None, pattern="^(queued|running|streaming|done|closed|error)$")
    title: Optional[str] = None
    handoff_route: Optional[str] = None


class ChunkAppendBody(BaseModel):
    content: str = Field(..., min_length=1)
    role: str = Field("assistant",
        pattern="^(assistant|user|system|tool)$")


class VoiceRecipeBody(BaseModel):
    transcript: str = Field(..., min_length=10)
    title_hint: Optional[str] = None
    outlet_id: Optional[str] = None


class TeachBody(BaseModel):
    question: str = Field(..., min_length=4)
    context_hint: Optional[str] = None


# ─── 1. Tasks: list / detail / update / close ──────────────────────────

@router.get("/tasks")
def list_tasks(
    status: Optional[str] = None,
    limit: int = 50,
    x_tenant_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    """User sees only their own tasks. Operator audience seeing
    OTHER users' tasks would violate §1.4 — that's an admin
    surface (`/api/admin/echo-activity` not in this module)."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    owner = _resolve_owner(x_user_id)
    q: Dict[str, Any] = {"tenant_id": tenant_id,
                          "owner_user_id": owner}
    if status:
        q["status"] = status
    rows = list(db["echo_activity_tasks"].find(q, {"_id": 0})
                .sort("updated_at", -1)
                .limit(max(1, min(500, limit))))
    return {"ok": True, "total": len(rows), "tasks": rows}


@router.post("/tasks")
def create_task(
    body: TaskCreateBody,
    x_tenant_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    owner = _resolve_owner(x_user_id)
    task = enqueue_task(
        tenant_id=tenant_id, owner_user_id=owner,
        kind=body.kind, title=body.title,
        handoff_route=body.handoff_route,
        metadata=body.metadata)
    return {"ok": True, "task": task}


@router.get("/tasks/{task_id}")
def get_task(
    task_id: str,
    x_tenant_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    owner = _resolve_owner(x_user_id)
    task = db["echo_activity_tasks"].find_one(
        {"id": task_id, "tenant_id": tenant_id,
         "owner_user_id": owner}, {"_id": 0})
    if not task:
        raise HTTPException(404, "task not found")
    return {"ok": True, "task": task}


@router.patch("/tasks/{task_id}")
def update_task(
    task_id: str,
    body: TaskUpdateBody,
    x_tenant_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    owner = _resolve_owner(x_user_id)
    task = db["echo_activity_tasks"].find_one(
        {"id": task_id, "tenant_id": tenant_id,
         "owner_user_id": owner})
    if not task:
        raise HTTPException(404, "task not found")
    update: Dict[str, Any] = {"updated_at": _now_iso()}
    if body.status: update["status"] = body.status
    if body.title: update["title"] = body.title
    if body.handoff_route is not None:
        update["handoff_route"] = body.handoff_route
    db["echo_activity_tasks"].update_one(
        {"id": task_id, "tenant_id": tenant_id}, {"$set": update})
    fresh = db["echo_activity_tasks"].find_one(
        {"id": task_id, "tenant_id": tenant_id}, {"_id": 0})
    return {"ok": True, "task": fresh}


@router.post("/tasks/{task_id}/close")
def close_task(
    task_id: str,
    x_tenant_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    owner = _resolve_owner(x_user_id)
    task = db["echo_activity_tasks"].find_one(
        {"id": task_id, "tenant_id": tenant_id,
         "owner_user_id": owner})
    if not task:
        raise HTTPException(404, "task not found")
    db["echo_activity_tasks"].update_one(
        {"id": task_id, "tenant_id": tenant_id},
        {"$set": {"status": "closed",
                  "closed_at": _now_iso(),
                  "updated_at": _now_iso()}})
    return {"ok": True, "id": task_id, "status": "closed"}


# ─── 2. Append-only streaming chunks ────────────────────────────────────

@router.post("/tasks/{task_id}/chunks")
def append_chunk(
    task_id: str,
    body: ChunkAppendBody,
    x_tenant_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    owner = _resolve_owner(x_user_id)
    task = db["echo_activity_tasks"].find_one(
        {"id": task_id, "tenant_id": tenant_id,
         "owner_user_id": owner})
    if not task:
        raise HTTPException(404, "task not found")
    next_idx = int(task.get("chunk_count") or 0)
    chunk = {
        "id": uuid.uuid4().hex[:16],
        "task_id": task_id,
        "tenant_id": tenant_id,
        "owner_user_id": owner,
        "index": next_idx,
        "role": body.role,
        "content": body.content,
        "created_at": _now_iso(),
    }
    db["echo_activity_chunks"].insert_one(chunk.copy())
    db["echo_activity_tasks"].update_one(
        {"id": task_id, "tenant_id": tenant_id},
        {"$set": {"chunk_count": next_idx + 1,
                  "status": "streaming",
                  "updated_at": _now_iso()}})
    return {"ok": True, "chunk": chunk}


@router.get("/tasks/{task_id}/chunks")
def list_chunks(
    task_id: str,
    since_index: int = -1,
    x_tenant_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    """Drawer polls this with since_index so it can render
    incremental updates without re-fetching the whole stream."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    owner = _resolve_owner(x_user_id)
    task = db["echo_activity_tasks"].find_one(
        {"id": task_id, "tenant_id": tenant_id,
         "owner_user_id": owner})
    if not task:
        raise HTTPException(404, "task not found")
    rows = list(db["echo_activity_chunks"].find(
        {"task_id": task_id, "tenant_id": tenant_id},
        {"_id": 0}))
    rows = sorted(rows, key=lambda c: c.get("index") or 0)
    if since_index >= 0:
        rows = [c for c in rows if c["index"] > since_index]
    return {"ok": True,
            "task_id": task_id,
            "task_status": task.get("status"),
            "since_index": since_index,
            "chunks": rows}


# ─── 3. Voice intake → recipe ──────────────────────────────────────────

# Lightweight transcript parser. Real parsing is upstream LLM work;
# this is the deterministic fallback that always produces a
# usable draft so the user is never left empty-handed.
INGREDIENT_LINE = re.compile(
    r"^(?:\d+(?:[\.\/]\d+)?\s+)?(?:cup|cups|tsp|tbsp|oz|ounces|"
    r"g|grams|kg|lb|lbs|ml|l|liter|liters|qt|quart|gallon)\s",
    re.IGNORECASE)


def _parse_recipe_transcript(transcript: str,
                             title_hint: Optional[str]
                             ) -> Dict[str, Any]:
    """Extract a recipe draft from a dictation transcript.

    Heuristics — keep the user always-ahead-of-empty:
      · Lines starting with a quantity unit are ingredients.
      · Lines starting with a step verb (combine, mix, bake, …)
        OR matching the pattern "step N" are method.
      · The first short non-ingredient line is the title (unless
        title_hint is provided).
    """
    raw_lines = [l.strip() for l in transcript.splitlines()
                 if l.strip()]
    ingredients: List[str] = []
    method: List[str] = []
    title = title_hint or ""

    step_verbs = {"combine", "mix", "stir", "fold", "whisk",
                  "bake", "boil", "saute", "sauté", "fry",
                  "roast", "grill", "season", "add", "drain",
                  "strain", "remove", "preheat", "heat", "cook",
                  "simmer", "blend", "pour", "set", "let", "rest"}

    for ln in raw_lines:
        lower = ln.lower()
        if INGREDIENT_LINE.match(ln) or any(
            unit in lower.split()[:3] for unit in
            ("cup","cups","tsp","tbsp","oz","grams","g","kg",
             "lb","lbs","ml")):
            ingredients.append(ln)
            continue
        first_word = lower.split()[0] if lower.split() else ""
        if (first_word in step_verbs or
            re.match(r"^step\s*\d", lower) or
            re.match(r"^\d+[\.\)]\s", ln)):
            method.append(ln)
            continue
        if not title and len(ln) <= 80:
            title = ln
            continue
        # default bin: method (description / continuation)
        method.append(ln)

    if not title:
        title = (raw_lines[0] if raw_lines else "Untitled recipe")[:80]

    return {
        "title": title,
        "ingredients": ingredients,
        "method": method,
        "raw_transcript": transcript,
    }


@router.post("/voice/recipe")
def voice_recipe(
    body: VoiceRecipeBody,
    x_tenant_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    """Take a recipe dictation transcript, produce a draft, write
    a draft row, surface a task in the drawer with a handoff route
    that the frontend uses to deep-link the Add-Recipe form."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    owner = _resolve_owner(x_user_id)

    draft = _parse_recipe_transcript(body.transcript, body.title_hint)
    draft_id = uuid.uuid4().hex[:16]
    draft_row = {
        "id": draft_id,
        "tenant_id": tenant_id,
        "owner_user_id": owner,
        "outlet_id": body.outlet_id,
        "source": "voice_dictation",
        "title": draft["title"],
        "ingredients": draft["ingredients"],
        "method": draft["method"],
        "raw_transcript": draft["raw_transcript"],
        "applied_to_recipe_id": None,
        "created_at": _now_iso(),
    }
    db["recipe_drafts"].insert_one(draft_row.copy())

    task = enqueue_task(
        tenant_id=tenant_id, owner_user_id=owner,
        kind="voice_recipe", title=f"Voice recipe: {draft['title']}",
        status="done",
        handoff_route=f"/m/recipes/new?draft_id={draft_id}",
        metadata={
            "draft_id": draft_id,
            "ingredient_count": len(draft["ingredients"]),
            "method_step_count": len(draft["method"]),
        })

    return {"ok": True, "task": task, "draft": draft_row}


@router.get("/recipe-drafts/{draft_id}")
def get_recipe_draft(
    draft_id: str,
    x_tenant_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    owner = _resolve_owner(x_user_id)
    row = db["recipe_drafts"].find_one(
        {"id": draft_id, "tenant_id": tenant_id,
         "owner_user_id": owner}, {"_id": 0})
    if not row:
        raise HTTPException(404, "draft not found")
    return {"ok": True, "draft": row}


@router.post("/recipe-drafts/{draft_id}/apply")
def apply_recipe_draft(
    draft_id: str,
    x_tenant_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    """User clicks Save in the Add-Recipe form. We persist the
    draft as a real recipe and stamp the draft so it can't be
    re-applied (idempotency)."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    owner = _resolve_owner(x_user_id)
    draft = db["recipe_drafts"].find_one(
        {"id": draft_id, "tenant_id": tenant_id,
         "owner_user_id": owner})
    if not draft:
        raise HTTPException(404, "draft not found")
    if draft.get("applied_to_recipe_id"):
        return {"ok": True, "idempotent": True,
                "recipe_id": draft["applied_to_recipe_id"]}
    recipe_id = uuid.uuid4().hex[:16]
    db["recipes"].insert_one({
        "id": recipe_id,
        "tenant_id": tenant_id,
        "outlet_id": draft.get("outlet_id"),
        "name": draft["title"],
        "ingredients": draft.get("ingredients") or [],
        "method": draft.get("method") or [],
        "source": "voice_dictation",
        "draft_id": draft_id,
        "created_at": _now_iso(),
        "created_by": owner,
    })
    db["recipe_drafts"].update_one(
        {"id": draft_id, "tenant_id": tenant_id},
        {"$set": {"applied_to_recipe_id": recipe_id,
                  "applied_at": _now_iso()}})
    return {"ok": True, "idempotent": False, "recipe_id": recipe_id}


# ─── 4. Teach intake (open-ended) ──────────────────────────────────────

# Built-in starter content for common educational requests so the
# drawer is never empty even when an upstream LLM is unavailable.
TEACH_PRIMERS: Dict[str, List[str]] = {
    "p&l": [
        "## Reading a P&L",
        "A P&L (Profit & Loss) statement summarizes revenue, "
        "costs, and net result over a period.",
        "**Top of the page (revenue):** food sales, beverage sales, "
        "banquet, room service. Look for week-over-week trends, not "
        "absolute dollars.",
        "**Costs section:** COGS (food + beverage cost), labor "
        "(wages + benefits), occupancy (rent, utilities), other "
        "operating costs. Each as a % of revenue is more useful "
        "than the dollar — that's the line that tells you whether "
        "things are getting better or worse independent of volume.",
        "**Prime cost** = COGS + labor. In hospitality, prime cost "
        "should run 55–65% of revenue. Above that, the property is "
        "leaking; below, you're probably underpaying or "
        "underordering.",
        "**EBITDA** = revenue - operating costs (excludes "
        "depreciation, interest, taxes). The number that tells you "
        "whether the operation IS PROFITABLE on its own merits.",
        "**Footer:** net income, after taxes + interest. The "
        "shareholder number.",
        "Practical reading order: % of revenue per line → trend "
        "vs last period → drill into the worst-trending line first.",
    ],
    "monte carlo": [
        "## Monte Carlo forecasting in one paragraph",
        "Run the same prediction 1,000 times with slightly varied "
        "input assumptions; the SHAPE of the output distribution "
        "tells you confidence. A tight cluster = high confidence; "
        "wide spread = your demand is genuinely uncertain.",
        "Echo's forecast publishes the median + 5th/95th "
        "percentiles. Order to the median; staff to the 75th. "
        "If the spread is wide, that's the cue to delay big "
        "decisions and wait for a better signal.",
    ],
    "prime cost": [
        "## Prime cost",
        "Prime cost = COGS + labor (wages + benefits + payroll "
        "taxes). It's the most controllable expense bucket; "
        "occupancy you can't change quickly.",
        "Industry benchmark: 55–65% of revenue. Above 65% means "
        "the operation is squeezed; below 55% often means menu "
        "prices are too high or staff is too thin.",
        "Echo's flex-flow labor module nudges per-station hours to "
        "keep prime cost close to your target without overstaffing "
        "the slow days.",
    ],
}


def _teach_lookup(question: str) -> List[str]:
    q = question.lower()
    for key, content in TEACH_PRIMERS.items():
        if key in q:
            return list(content)
    return [
        f"## {question}",
        "I don't have a built-in primer for this exact question, "
        "but the action drawer can stream chunks as upstream "
        "knowledge sources answer.",
        "While that runs, here's the meta-frame: every Echo "
        "answer cites its source (event log, doctrine section, "
        "or external service). If you don't see a source, the "
        "answer is a guess — push back.",
    ]


@router.post("/teach")
def teach(
    body: TeachBody,
    x_tenant_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    """Open-ended educational request. Creates a streaming task,
    seeds it with the relevant primer chunks, and returns the
    task_id. The drawer polls /tasks/{id}/chunks for the
    incremental render."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    owner = _resolve_owner(x_user_id)

    task = enqueue_task(
        tenant_id=tenant_id, owner_user_id=owner,
        kind="teach", title=f"Teach: {body.question[:60]}",
        status="streaming",
        metadata={"question": body.question})

    chunks = _teach_lookup(body.question)
    for idx, content in enumerate(chunks):
        db["echo_activity_chunks"].insert_one({
            "id": uuid.uuid4().hex[:16],
            "task_id": task["id"],
            "tenant_id": tenant_id,
            "owner_user_id": owner,
            "index": idx,
            "role": "assistant",
            "content": content,
            "created_at": _now_iso(),
        })

    db["echo_activity_tasks"].update_one(
        {"id": task["id"], "tenant_id": tenant_id},
        {"$set": {"chunk_count": len(chunks),
                  "status": "done",
                  "updated_at": _now_iso()}})

    fresh = db["echo_activity_tasks"].find_one(
        {"id": task["id"], "tenant_id": tenant_id}, {"_id": 0})
    return {"ok": True, "task": fresh,
            "primer_chunk_count": len(chunks)}
