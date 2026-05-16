"""iter207d · Echo Viewer — unified live-data aggregator for any event.
iter207f · Echo chat intent — "What happened with {event_name}?" → timeline query.

    GET  /api/echo-viewer/event/{event_id}     aggregated live event brief
    POST /api/echo/chat                        routed chat w/ intent detection
"""
from __future__ import annotations
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import db
from lib.timeline import query as tl_query

router = APIRouter(tags=["echo-viewer"])
_now = lambda: datetime.now(timezone.utc).isoformat()


def _strip(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not doc:
        return None
    doc.pop("_id", None)
    return doc


# ═══════════════════════ iter207d · Echo Viewer aggregator ═════════════════════════════
@router.get("/api/echo-viewer/event/{event_id}")
async def echo_viewer_event(event_id: str):
    """Aggregate every live fact Echo knows about an event:
       CRM client + event record + BEO draft + finalized BEO + timeline +
       Maestro dispatches + Aurum GL entries + calendar entries."""
    # Event record (try `events` then `conventions`)
    event = _strip(db["events"].find_one({"$or": [{"event_id": event_id}, {"id": event_id}, {"_id": event_id}]}))
    if not event:
        event = _strip(db["conventions"].find_one({"$or": [{"conv_id": event_id}, {"_id": event_id}]}))

    # BEO draft + finalized BEO
    draft = _strip(db["beo_drafts"].find_one({"event_id": event_id}))
    beo = _strip(db["beos"].find_one({"event_id": event_id}, sort=[("created_at", -1)]))

    # CRM contact (via event.client_id or event.client)
    client_id = (event or {}).get("client_id") or (event or {}).get("contact_id")
    client_name = (event or {}).get("client") or (event or {}).get("company")
    contact = None
    if client_id:
        contact = _strip(db["crm_contacts"].find_one({"$or": [{"contact_id": client_id}, {"_id": client_id}]}))
    if not contact and client_name:
        contact = _strip(db["crm_contacts"].find_one({"$or": [{"name": client_name}, {"company": client_name}]}))

    # Maestro dispatches + Aurum GL entries
    maestro = list(db["maestro_bqt_dispatches"].find({"event_id": event_id}, {"_id": 0}).sort("dispatched_at", -1).limit(5))
    gl_entries = list(db["aurum_gl_journal"].find({"event_id": event_id}, {"_id": 0}).sort("posted_at", -1).limit(5))

    # Calendar entries linked to this event
    calendar = list(db["calendar_events"].find({"linked_event_id": event_id}, {"_id": 0}).limit(20))

    # Timeline events referencing this event_id in entity_refs
    timeline = tl_query(entity_id=event_id, limit=50)

    return {
        "ok": True,
        "event_id": event_id,
        "fetched_at": _now(),
        "event": event,
        "contact": contact,
        "beo_draft": draft,
        "beo": beo,
        "maestro_dispatches": maestro,
        "aurum_gl_entries": gl_entries,
        "calendar_entries": calendar,
        "timeline": timeline,
        "summary": {
            "has_event": bool(event),
            "has_beo_draft": bool(draft),
            "has_finalized_beo": bool(beo),
            "beo_status": (beo or {}).get("status"),
            "gl_code": (beo or {}).get("gl_code"),
            "maestro_pushed": bool((beo or {}).get("maestro_pushed")),
            "timeline_events": len(timeline),
        },
    }


# ═══════════════════════ iter207f + iter209 · Echo chat ═════════════════════════════
class EchoChatBody(BaseModel):
    message: str
    session_id: Optional[str] = None


_WHAT_HAPPENED_RX = re.compile(r"what\s+happened\s+(?:with|to|for|about)?\s+(?:the\s+|event\s+)?(.+?)(?:\?|$)", re.IGNORECASE)
_TICKET_RX = re.compile(r"(?:ticket|ticket\s+status)\s+([a-z0-9\-_]+)", re.IGNORECASE)
_CCP_RX = re.compile(r"\b(ccp|cold\s*chain|temp\s*excursions?)\b", re.IGNORECASE)
_REMEDIATE_RX = re.compile(r"^\s*(?:fix|remediate|repair)\s+(.+?)(?:\?|\.|$)", re.IGNORECASE)
_WASTE_SUMMARY_RX = re.compile(r"\b(waste(?:\s+summary)?|how\s+much\s+(?:waste|wasted|did\s+we\s+(?:throw|waste))|what\s+(?:did|was)\s+thrown\s+out|wasted\s+today)\b", re.IGNORECASE)


def _find_event_by_name(name: str) -> Optional[Dict[str, Any]]:
    n = name.strip().strip("?").strip()
    if not n:
        return None
    rx = {"$regex": re.escape(n), "$options": "i"}
    doc = db["events"].find_one({"$or": [{"name": rx}, {"title": rx}]}, {"_id": 0})
    if doc:
        return doc
    doc = db["conventions"].find_one({"$or": [{"name": rx}, {"title": rx}]}, {"_id": 0})
    return doc


def _persist_turn(session_id: str, role: str, content: str, meta: Optional[Dict[str, Any]] = None):
    """iter209 · append a turn to echo_chat_sessions. Mongo upsert; each session
    carries an append-only `messages[]` array. Meta is freeform (intent, refs)."""
    try:
        db["echo_chat_sessions"].update_one(
            {"session_id": session_id},
            {
                "$setOnInsert": {"session_id": session_id, "created_at": _now()},
                "$set": {"updated_at": _now()},
                "$push": {"messages": {"role": role, "content": content, "ts": _now(), "meta": meta or {}}},
            },
            upsert=True,
        )
    except Exception:
        # Persistence is best-effort — never break the reply path.
        pass


@router.post("/api/echo/chat")
async def echo_chat(body: EchoChatBody):
    """Intent router for Echo chat · persists to echo_chat_sessions (iter209).
    Current intents:
       - what_happened_with_event   → timeline query + NL summary
       - ticket_status              → lookup in relay_tickets
       - ccp_status                 → last 24h pack.temp_excursion events
       - fallback                   → helpful greeting
    """
    msg = (body.message or "").strip()
    if not msg:
        raise HTTPException(400, "empty message")

    session_id = body.session_id or f"echo-chat-{uuid.uuid4().hex[:8]}"
    _persist_turn(session_id, "user", msg)

    # ── Intent 1 · what happened with <event> ──────────────────────────────
    m = _WHAT_HAPPENED_RX.search(msg)
    if m:
        name = m.group(1)
        event = _find_event_by_name(name)
        if not event:
            reply = f"I couldn't find an event matching \"{name}\". Try a closer title."
            _persist_turn(session_id, "assistant", reply, {"intent": "what_happened_with_event", "matched": None})
            return {"ok": True, "intent": "what_happened_with_event", "session_id": session_id,
                    "matched_event": None, "reply": reply}
        ev_id = event.get("event_id") or event.get("id") or event.get("_id") or event.get("conv_id")
        timeline = tl_query(entity_id=ev_id, limit=40)
        lines = []
        for e in timeline[:15]:
            ts = (e.get("timestamp") or "")[:16].replace("T", " ")
            actor = (e.get("actor") or {}).get("name") or "system"
            lines.append(f"- [{ts}] {e.get('type')} · {actor}")

        from lib.llm import ask_echo
        compact = "\n".join(lines[:15])
        llm = await ask_echo(
            system=(
                "You are Echo. Given a list of TimelineEvents for a single event, "
                "produce a tight 3-4 sentence narrative of what happened: what was booked, "
                "what was finalized, who did what, and any risk or anomaly. No bullets."
            ),
            user=f"EVENT: {event.get('name') or event.get('title')}\n\nEVENTS:\n{compact}",
            session_id=session_id,
            session_prefix="echo-chat",
        )
        narrative = llm["text"] if llm["mode"] == "llm" and llm.get("text") else None
        reply = narrative or (
            f"Event \"{event.get('name') or event.get('title')}\" has {len(timeline)} timeline events on file."
            + ("\n\nMost recent:\n" + "\n".join(lines[:8]) if lines else " Nothing on the timeline yet.")
        )
        matched = {"id": ev_id, "name": event.get("name") or event.get("title")}
        _persist_turn(session_id, "assistant", reply, {"intent": "what_happened_with_event", "matched": matched, "timeline_count": len(timeline)})
        return {"ok": True, "intent": "what_happened_with_event", "session_id": session_id,
                "matched_event": matched, "timeline_count": len(timeline), "reply": reply}

    # ── Intent 2a · remediate broken lifecycle (iter210) ───────────────────
    m = _REMEDIATE_RX.search(msg)
    if m:
        target = m.group(1).strip().strip('"').strip("'")
        # Pull the lifecycle audit and try to match a contact
        try:
            from routes.crm_lifecycle import lifecycle_audit
            audit = lifecycle_audit()
            rows = (audit.get("data") or {}).get("rows") or []
        except Exception:
            rows = []
        target_low = target.lower()
        match = next(
            (r for r in rows if target_low in (r.get("name") or "").lower()
             or target_low in (r.get("company") or "").lower()),
            None,
        )
        if not match:
            reply = (f"I couldn't find a contact matching \"{target}\" in the lifecycle audit. "
                     f"Try a closer name, or run the audit first from Echo Events → CRM → Lifecycle Audit.")
            _persist_turn(session_id, "assistant", reply, {"intent": "remediate_broken_lifecycle", "matched": None})
            return {"ok": True, "intent": "remediate_broken_lifecycle", "session_id": session_id,
                    "matched": None, "reply": reply}
        if match.get("verdict") == "OK":
            reply = (f"{match.get('name')} is already OK — no remediation needed. "
                     f"Event {match.get('event_id') or '—'}, BEO {match.get('beo_id') or '—'}, "
                     f"{match.get('invoice_count')} invoice(s).")
            _persist_turn(session_id, "assistant", reply, {"intent": "remediate_broken_lifecycle", "matched_name": match.get("name"), "verdict": "OK"})
            return {"ok": True, "intent": "remediate_broken_lifecycle", "session_id": session_id,
                    "matched": match, "reply": reply}

        # Build gap summary for the LLM
        gap_lines = "\n".join(f"- {g}" for g in (match.get("gaps") or []))
        from lib.llm import ask_echo
        llm = await ask_echo(
            system=(
                "You are Echo. You help ops staff remediate CRM lifecycle gaps. "
                "Given a contact with known gaps, produce a concrete 3-step fix plan. "
                "Each step starts with a verb (Link / Push / File / Update / Create), references "
                "the concrete IDs when available, and stays under 20 words. No filler."
            ),
            user=(f"CONTACT: {match.get('name')} ({match.get('company') or '—'})\n"
                  f"STAGE: {match.get('stage')}\n"
                  f"EVENT_ID: {match.get('event_id') or '—'}\n"
                  f"BEO_ID: {match.get('beo_id') or '—'}\n"
                  f"INVOICE_COUNT: {match.get('invoice_count')}\n\n"
                  f"GAPS:\n{gap_lines}"),
            session_id=session_id,
            session_prefix="echo-remediate",
        )
        plan = llm["text"] if llm["mode"] == "llm" and llm.get("text") else None
        if not plan:
            # Deterministic fallback — one line per gap
            steps = []
            for g in match.get("gaps") or []:
                if "no event_id" in g:
                    steps.append(f"1. Create or link an event record to contact {match.get('contact_id')}.")
                elif "no BEO" in g or "no beo_id" in g:
                    steps.append("2. Build a BEO in Echo Events → BEO Builder and link it to the event.")
                elif "no GL" in g or "Aurum" in g:
                    steps.append("3. Finalize the BEO — it auto-assigns a GL code and posts to Aurum.")
                elif "Maestro" in g:
                    steps.append("4. Click Push → MaestroBQT on the BEO summary.")
                elif "invoice" in g:
                    steps.append("5. File invoice(s) against this contact from EchoAurum → Billing.")
            plan = "\n".join(steps) if steps else "Open Lifecycle Audit for the full gap list."

        reply = (f"{match.get('name')} · verdict: {match.get('verdict')} "
                 f"({match.get('gap_count')} gap{'s' if (match.get('gap_count') or 0) != 1 else ''})\n\n"
                 f"Fix plan:\n{plan}")
        _persist_turn(session_id, "assistant", reply, {
            "intent": "remediate_broken_lifecycle",
            "matched_name": match.get("name"),
            "contact_id": match.get("contact_id"),
            "verdict": match.get("verdict"),
        })
        return {"ok": True, "intent": "remediate_broken_lifecycle", "session_id": session_id,
                "matched": match, "plan": plan, "reply": reply}

    # ── Intent 4 · EchoWaste daily summary (iter212) ───────────────────────
    if _WASTE_SUMMARY_RX.search(msg):
        try:
            from routes.echowaste import daily_digest
            digest = daily_digest(days=1)
            days = (digest.get("days") or [])[:1]
        except Exception:
            days = []
        if not days:
            reply = "No EchoWaste captures in the last 24 hours."
            _persist_turn(session_id, "assistant", reply, {"intent": "waste_summary", "entries": 0})
            return {"ok": True, "intent": "waste_summary", "session_id": session_id,
                    "digest": None, "reply": reply}
        d = days[0]
        modes = ", ".join(f"{m}:{c}" for m, c in (d.get("by_mode") or {}).items())
        reply = (
            f"Today · {d.get('entries', 0)} captures · {d.get('items', 0)} items · "
            f"${d.get('total_cost', 0):.2f} · {int(d.get('total_weight_g', 0))}g"
            + (f" · modes {modes}" if modes else "")
        )
        _persist_turn(session_id, "assistant", reply, {
            "intent": "waste_summary", "entries": d.get("entries", 0),
            "items": d.get("items", 0), "total_cost": d.get("total_cost", 0),
        })
        return {"ok": True, "intent": "waste_summary", "session_id": session_id,
                "digest": d, "reply": reply}

    # ── Intent 2 · ticket status ───────────────────────────────────────────
    m = _TICKET_RX.search(msg)
    if m:
        tid = m.group(1)
        t = None
        if "relay_tickets" in db.list_collection_names():
            t = db["relay_tickets"].find_one({"$or": [{"ticket_id": tid}, {"id": tid}, {"_id": tid}]}, {"_id": 0})
        if not t:
            reply = f"Ticket \"{tid}\" not found. Try a full ticket id or open Relay Tickets panel."
        else:
            reply = (f"Ticket {tid} · status: {t.get('status','?')} · priority: {t.get('priority','?')} · "
                     f"assignee: {t.get('assignee','—')}. Title: {t.get('title','')[:80]}")
        _persist_turn(session_id, "assistant", reply, {"intent": "ticket_status", "ticket_id": tid, "found": bool(t)})
        return {"ok": True, "intent": "ticket_status", "session_id": session_id, "ticket": t, "reply": reply}

    # ── Intent 3 · CCP / cold chain status ─────────────────────────────────
    if _CCP_RX.search(msg):
        from datetime import timedelta
        from_ts = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        events = tl_query(event_types=["pack.temp_excursion", "ccp.logged"], from_ts=from_ts, limit=30)
        excursions = [e for e in events if e.get("type") == "pack.temp_excursion"]
        logged = [e for e in events if e.get("type") == "ccp.logged"]
        if not events:
            reply = "Cold chain: clean last 24h. No temp excursions, no CCP logs."
        else:
            parts = [f"Last 24h · {len(logged)} CCP logs"]
            if excursions: parts.append(f"⚠ {len(excursions)} temp excursion(s)")
            else: parts.append("no excursions")
            reply = " · ".join(parts) + "."
        _persist_turn(session_id, "assistant", reply, {"intent": "ccp_status", "excursions": len(excursions), "logs": len(logged)})
        return {"ok": True, "intent": "ccp_status", "session_id": session_id,
                "excursion_count": len(excursions), "log_count": len(logged), "reply": reply}

    # ── Fallback ──────────────────────────────────────────────────────────
    reply = ("I'm Echo. Try asking:\n"
             "• \"what happened with {event name}?\"\n"
             "• \"fix {contact name}\" · remediate lifecycle gaps\n"
             "• \"waste summary\" · today's EchoWaste captures\n"
             "• \"ticket {id}\"\n"
             "• \"CCP status\" / \"cold chain\" / \"temp excursions\"")
    _persist_turn(session_id, "assistant", reply, {"intent": "fallback"})
    return {"ok": True, "intent": "fallback", "session_id": session_id, "reply": reply}


@router.get("/api/echo/chat/history/{session_id}")
def echo_chat_history(session_id: str, limit: int = 100):
    """iter209 · Return the full transcript for a session (most recent `limit`)."""
    s = db["echo_chat_sessions"].find_one({"session_id": session_id}, {"_id": 0})
    if not s:
        return {"ok": True, "session_id": session_id, "messages": [], "created_at": None}
    msgs = s.get("messages") or []
    if limit and limit > 0:
        msgs = msgs[-limit:]
    return {"ok": True, "session_id": session_id,
            "created_at": s.get("created_at"), "updated_at": s.get("updated_at"),
            "messages": msgs}


@router.get("/api/echo/chat/sessions")
def echo_chat_sessions(limit: int = 20):
    """iter209 · List recent chat sessions (compact for the bubble history menu)."""
    out = []
    for s in db["echo_chat_sessions"].find({}, {"_id": 0}).sort("updated_at", -1).limit(limit):
        msgs = s.get("messages") or []
        out.append({
            "session_id": s["session_id"],
            "created_at": s.get("created_at"),
            "updated_at": s.get("updated_at"),
            "turn_count": len(msgs),
            "preview": (msgs[0]["content"][:80] if msgs else ""),
        })
    return {"ok": True, "sessions": out}
