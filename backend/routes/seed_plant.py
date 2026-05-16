"""
Seed-Plant — conversational seed-to-scaffold flow for EchoCoder / Golden Seed.

User plants a seed → Claude Sonnet 4.5 asks clarifying questions → emits structured
artifacts (files + manifest) → ZARO Guardian lints each batch → final tarball.

Routes (all under /api/seed/plant, admin-gated except public GET-by-session-id for
the thin left-right live view):
    POST /api/seed/plant                     — create session from a seed prompt
    POST /api/seed/plant/{sid}/reply         — user reply → next LLM turn
    GET  /api/seed/plant/{sid}               — full state (messages + artifacts + zaro)
    POST /api/seed/plant/{sid}/finalize      — ZARO-gate + create golden_seed_spawns row
"""
import os
import re
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

load_dotenv()

router = APIRouter(prefix="/api/seed/plant", tags=["seed-plant"])

# ─── System prompt: makes Claude the EchoAi³ seed-germination brain ───
SYSTEM_PROMPT = """You are EchoAi³ — the platform-building brain of the Luccca / EchoAi³ framework.

The user ("the builder") plants a SEED: a short text describing the custom OS / SaaS / internal tool they want to build.
Your job is to GROW that seed into a ready-to-ship scaffold in 2-4 turns MAX.

Flow:
  TURN 1 (just after seed planted): Ask 1-2 SHARP clarifying questions that meaningfully change the architecture.
    Examples: "Who pays? (end-user SaaS vs internal tool)", "Single-tenant or multi-tenant?", "AI-heavy or data-heavy?"
    Do NOT ask generic questions like "what colors?" — ask questions a senior architect would ask.
  TURN 2: One more clarifying question only if truly needed, otherwise immediately emit artifacts.
  TURN 3+: Emit ARTIFACTS — the scaffold files.

When you emit artifacts, respond EXCLUSIVELY with a single JSON object (no prose, no markdown fences) in this schema:
{
  "kind": "artifacts",
  "summary": "one-sentence plain-English description of what you just generated",
  "artifacts": [
    { "path": "manifest.json", "content": "<JSON or text file content>", "why": "purpose of this file" },
    { "path": "README.md", "content": "..." },
    { "path": "backend/main.py", "content": "..." }
    // 3-6 files total, tightly scoped
  ],
  "next_step": "What the builder should do next (e.g. download tarball, deploy to subdomain)"
}

When you are still asking questions, respond with a single JSON object:
{
  "kind": "question",
  "question": "<your clarifying question>",
  "hint": "<one-line explanation of why this question matters>",
  "options": ["optional", "multiple-choice", "hints"]
}

RULES:
- NEVER emit secrets, API keys, or credentials. Use placeholders like `<SET_IN_ENV>`.
- Path rule: all artifact paths MUST be relative (no leading /, no ..).
- Respect the seven pillars: brain (LLM), spine (EchoBus), sidebar, stripe-standalone, auth (admin token), observability, cognition.
- Generated code should be TypeScript React + FastAPI + MongoDB, matching Luccca conventions.
- Keep each artifact's content under 4000 chars. Be concise and opinionated.
"""

# ─── ZARO Guardian policy lint ───
# Regex and rule-based guards that run on every artifact batch before it's persisted.
ZARO_PATTERNS = [
    (r"sk-[a-zA-Z0-9]{20,}",                 "block",    "Possible OpenAI/Emergent secret leak"),
    (r"sk_live_[a-zA-Z0-9]{20,}",            "block",    "Stripe live secret leak"),
    (r"AKIA[0-9A-Z]{16}",                    "block",    "AWS access key leak"),
    (r"ghp_[a-zA-Z0-9]{30,}",                "block",    "GitHub token leak"),
    (r"(^|[^a-zA-Z])rm\s+-rf\s+/",           "block",    "Destructive filesystem op: rm -rf /"),
    (r"(^|[^a-zA-Z])sudo\s+",                "warn",     "Uses sudo — review before executing"),
    (r"process\.env\.[A-Z_]+\s*=",           "warn",     "Assigns to process.env at runtime"),
    (r"eval\s*\(",                           "warn",     "Uses eval() — strongly discouraged"),
    (r"curl\s+[^|]*\|\s*sh",                 "block",    "Pipe-to-shell install — unsafe"),
]


def zaro_lint_artifact(path: str, content: str) -> Dict[str, Any]:
    """Run ZARO Guardian on a single artifact. Returns {verdict, findings[]}."""
    findings: List[Dict[str, str]] = []
    # Path hygiene
    if path.startswith("/") or ".." in path.split("/"):
        findings.append({"severity": "block", "pattern": "path-traversal", "note": f"Unsafe path: {path}"})
    if len(content) > 30_000:
        findings.append({"severity": "warn", "pattern": "oversized", "note": f"Artifact >30KB ({len(content)} bytes)"})
    # Content patterns
    for pat, sev, note in ZARO_PATTERNS:
        try:
            if re.search(pat, content):
                findings.append({"severity": sev, "pattern": pat, "note": note})
        except re.error:
            pass
    verdict = "pass"
    if any(f["severity"] == "block" for f in findings):
        verdict = "block"
    elif any(f["severity"] == "warn" for f in findings):
        verdict = "warn"
    return {"verdict": verdict, "findings": findings}


def zaro_lint_batch(artifacts: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Run ZARO across all artifacts. Returns aggregate {verdict, per_artifact[]}."""
    per = []
    worst = "pass"
    rank = {"pass": 0, "warn": 1, "block": 2}
    for a in artifacts:
        r = zaro_lint_artifact(a.get("path", ""), a.get("content", ""))
        per.append({"path": a.get("path"), **r})
        if rank[r["verdict"]] > rank[worst]:
            worst = r["verdict"]
    return {"verdict": worst, "per_artifact": per, "checked_at": datetime.now(timezone.utc).isoformat()}


# ─── Pydantic schemas ───
class PlantSeedRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    seed_prompt: str = Field(..., min_length=10, max_length=4000)
    owner_email: Optional[str] = None


class ReplyRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)


# ─── LLM helper ───
async def _call_claude(session_id: str, system: str, user_text: str) -> str:
    """One-shot send via emergentintegrations. History is driven per-session on our side."""
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise HTTPException(503, "EMERGENT_LLM_KEY not configured on the server")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError as e:
        raise HTTPException(503, f"emergentintegrations not installed: {e}")

    chat = LlmChat(api_key=key, session_id=session_id, system_message=system).with_model(
        "anthropic", "claude-sonnet-4-5-20250929"
    )
    msg = UserMessage(text=user_text)
    return await chat.send_message(msg)


def _parse_llm_json(raw: str) -> Dict[str, Any]:
    """Best-effort JSON extractor from Claude output."""
    if not raw:
        return {"kind": "error", "raw": ""}
    txt = raw.strip()
    # Strip markdown fences
    if txt.startswith("```"):
        txt = re.sub(r"^```(?:json)?\n?", "", txt)
        txt = re.sub(r"\n?```$", "", txt)
    # Find JSON object
    m = re.search(r"(\{.*\})", txt, flags=re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    try:
        return json.loads(txt)
    except Exception:
        return {"kind": "error", "raw": raw[:500]}


def _format_history_for_llm(session: Dict[str, Any]) -> str:
    """Serialize prior turns as user-visible text so Claude has the context in each call."""
    lines = [f"SEED PROMPT (from builder, name='{session.get('name')}'):", session.get("seed_prompt", ""), ""]
    for m in session.get("messages", []):
        who = "Builder" if m["role"] == "user" else "Echo"
        lines.append(f"[{who}] {m['content']}")
    return "\n".join(lines)


# ─── Routes ───
@router.post("")
async def plant_seed(req: PlantSeedRequest):
    from database import db as _db
    sid = uuid.uuid4().hex[:14]
    now = datetime.now(timezone.utc).isoformat()
    session = {
        "id": sid,
        "name": req.name,
        "slug": re.sub(r"[^a-z0-9-]+", "-", req.name.lower()).strip("-")[:40] or f"seed-{sid[:6]}",
        "seed_prompt": req.seed_prompt,
        "owner_email": req.owner_email,
        "status": "germinating",
        "messages": [],
        "artifacts": [],
        "zaro": None,
        "finalized": False,
        "spawn_id": None,
        "turn": 0,
        "created_at": now,
    }
    # Seed the LLM
    history = _format_history_for_llm(session)
    llm_raw = await _call_claude(
        sid, SYSTEM_PROMPT,
        f"{history}\n\nThis is TURN 1. Ask the sharpest 1-2 clarifying questions you need to architect this correctly. Respond as JSON per the schema."
    )
    parsed = _parse_llm_json(llm_raw)
    session["messages"].append({"role": "assistant", "kind": parsed.get("kind", "error"), "content": llm_raw, "parsed": parsed, "at": now})
    session["turn"] = 1
    _db.seed_plant_sessions.insert_one(session.copy())
    return {"ok": True, "sid": sid, "session": _strip(session)}


@router.post("/{sid}/reply")
async def reply(sid: str, req: ReplyRequest):
    from database import db as _db
    session = _db.seed_plant_sessions.find_one({"id": sid}, {"_id": 0})
    if not session:
        raise HTTPException(404, "session not found")
    if session.get("finalized"):
        raise HTTPException(400, "session already finalized")

    now = datetime.now(timezone.utc).isoformat()
    session["messages"].append({"role": "user", "kind": "text", "content": req.message, "at": now})
    session["turn"] = int(session.get("turn", 0)) + 1

    # Hint Claude on turn number to push to artifact emission by turn 3-4
    turn = session["turn"]
    directive = (
        f"This is TURN {turn}. If you have enough info, emit the FULL artifact batch now (JSON kind='artifacts', 3-6 files). "
        f"Otherwise ask one more sharp question. After TURN 4 you MUST emit artifacts."
    )
    history = _format_history_for_llm(session)
    llm_raw = await _call_claude(sid, SYSTEM_PROMPT, f"{history}\n\n{directive}")
    parsed = _parse_llm_json(llm_raw)
    session["messages"].append({"role": "assistant", "kind": parsed.get("kind", "error"), "content": llm_raw, "parsed": parsed, "at": now})

    # If artifacts arrived → ZARO-gate + persist them
    if parsed.get("kind") == "artifacts" and isinstance(parsed.get("artifacts"), list):
        arts = parsed["artifacts"]
        zaro = zaro_lint_batch(arts)
        session["artifacts"] = arts
        session["zaro"] = zaro
        session["status"] = "bloomed" if zaro["verdict"] != "block" else "zaro-blocked"

    _db.seed_plant_sessions.replace_one({"id": sid}, session)
    return {"ok": True, "session": _strip(session)}


@router.get("/{sid}")
async def get_session(sid: str):
    from database import db as _db
    session = _db.seed_plant_sessions.find_one({"id": sid}, {"_id": 0})
    if not session:
        raise HTTPException(404, "session not found")
    return {"ok": True, "session": _strip(session)}


@router.post("/{sid}/finalize")
async def finalize(sid: str):
    from database import db as _db
    session = _db.seed_plant_sessions.find_one({"id": sid}, {"_id": 0})
    if not session:
        raise HTTPException(404, "session not found")
    arts = session.get("artifacts") or []
    if not arts:
        raise HTTPException(400, "no artifacts yet — continue the conversation")
    zaro = session.get("zaro") or zaro_lint_batch(arts)
    if zaro.get("verdict") == "block":
        raise HTTPException(403, f"ZARO Guardian blocked finalization: {zaro}")

    # Create a golden_seed_spawns record so the existing tarball-download route works
    spawn_id = uuid.uuid4().hex[:12]
    now = datetime.now(timezone.utc).isoformat()
    spawn = {
        "id": spawn_id,
        "name": session["name"],
        "slug": session["slug"],
        "domain": None,
        "templates": ["plant-seed"],
        "brand_color": "#c8a97e",
        "owner_email": session.get("owner_email"),
        "notes": f"Grown from seed {sid}",
        "status": "bloomed",
        "created_at": now,
        "seed_sid": sid,
        "artifacts": arts,
        "zaro": zaro,
    }
    _db.golden_seed_spawns.insert_one(spawn.copy())

    session["finalized"] = True
    session["spawn_id"] = spawn_id
    session["status"] = "finalized"
    _db.seed_plant_sessions.replace_one({"id": sid}, session)

    return {"ok": True, "spawn_id": spawn_id, "download_url": f"/api/seed/download/{spawn_id}", "session": _strip(session)}


def _strip(session: Dict[str, Any]) -> Dict[str, Any]:
    """Remove raw LLM text blobs from messages for network payload."""
    clean = dict(session)
    clean["messages"] = [
        {k: v for k, v in m.items() if k != "content"}  # keep parsed, drop raw
        for m in session.get("messages", [])
    ]
    # Re-include user text content (not LLM raw)
    src_msgs = session.get("messages", [])
    for i, m in enumerate(clean["messages"]):
        if src_msgs[i].get("role") == "user":
            m["content"] = src_msgs[i].get("content")
    return clean
