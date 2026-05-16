"""iter196 · Echo 'What just happened?' — NL summarization over the TimelineEvent stream.

Uses Emergent LLM Key + Claude Sonnet 4.5. Summarises the last N minutes of
platform activity into a tight, operator-friendly briefing — bullets plus any
anomalies worth surfacing.

  POST /api/echo/whats-new   body: {minutes?=30, kinds?=[]}
"""
from __future__ import annotations
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from lib.timeline import query as tl_query

router = APIRouter(prefix="/api/echo", tags=["echo-whats-new"])


SYSTEM_PROMPT = """You are Echo, the operational conscience of LUCCCA's fresh-meal operating system.

You are given a list of TimelineEvents (recent state changes across the platform). Summarise what happened
in the last window in FIVE compact bullet points max. Be specific — reference commodities, quantities, TLCs,
and actor names when present. Flag any anomalies (temp excursions, issues, repeated failures) with a ⚠ prefix.

Output format (plain text, no JSON):
- bullet 1
- bullet 2
- bullet 3
- bullet 4
- bullet 5

End with a single one-sentence "headline" that an operator could glance at in 2 seconds, prefixed with
"HEADLINE:".

If there are NO events, just reply with "HEADLINE: Quiet window — no state changes in the last <N> minutes."
"""


def _now() -> datetime: return datetime.now(timezone.utc)


def _compact_event(e: Dict[str, Any]) -> str:
    ts = (e.get("timestamp") or "")[11:19]  # HH:MM:SS
    refs = e.get("entity_refs") or []
    ref_str = " ".join(
        f"{r.get('kind', '?')}:{(r.get('name') or r.get('id') or '')[:18]}" for r in refs[:3]
    )
    p = e.get("payload") or {}
    bits = []
    for k in ("commodity", "quantity", "unit", "tlc", "temp_c", "passing", "stage"):
        if p.get(k) is not None:
            bits.append(f"{k}={p[k]}")
    actor = (e.get("actor") or {}).get("name") or "system"
    return f"[{ts}] {e.get('type', '?')} · {actor} · {ref_str} · {', '.join(bits)}"


class WhatsNewBody(BaseModel):
    minutes: Optional[int] = 30
    kinds: Optional[List[str]] = None    # filter by entity kind


@router.post("/whats-new")
async def whats_new(body: WhatsNewBody):
    window = max(1, min(360, int(body.minutes or 30)))
    from_ts = (_now() - timedelta(minutes=window)).isoformat()
    events = tl_query(from_ts=from_ts, limit=300)
    if body.kinds:
        events = [e for e in events if any(r.get("kind") in body.kinds for r in (e.get("entity_refs") or []))]

    # Fast-path empty
    if not events:
        return {"ok": True, "window_minutes": window, "event_count": 0,
                "summary": f"HEADLINE: Quiet window — no state changes in the last {window} minutes.",
                "headline": f"Quiet window — no state changes in the last {window} minutes.",
                "events_considered": 0, "mode": "empty"}

    # LLM call
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        # Graceful fallback: counts-only summary so the panel still works offline
        types: Dict[str, int] = {}
        for e in events: types[e.get("type", "?")] = types.get(e.get("type", "?"), 0) + 1
        top = sorted(types.items(), key=lambda x: -x[1])[:5]
        lines = [f"- {t}: {c}" for t, c in top]
        headline = f"{len(events)} events in last {window} min · top: {top[0][0]}" if top else f"{len(events)} events"
        return {"ok": True, "window_minutes": window, "event_count": len(events),
                "summary": "\n".join(lines) + f"\n\nHEADLINE: {headline}",
                "headline": headline, "mode": "fallback_no_llm"}

    from lib.llm import ask_echo

    compact = "\n".join(_compact_event(e) for e in events[:120])
    ctx = (
        f"WINDOW: last {window} minutes · {len(events)} events\n\n"
        f"EVENTS:\n{compact}\n\n"
        f"Summarise in max 5 bullets + HEADLINE as specified."
    )
    llm = await ask_echo(SYSTEM_PROMPT, ctx, session_prefix="whatsnew")
    if llm["mode"] != "llm" or not llm.get("text"):
        # Fallback on any LLM error
        types: Dict[str, int] = {}
        for e2 in events: types[e2.get("type", "?")] = types.get(e2.get("type", "?"), 0) + 1
        top = sorted(types.items(), key=lambda x: -x[1])[:5]
        headline = f"{len(events)} events · top: {top[0][0] if top else '—'}"
        return {"ok": True, "window_minutes": window, "event_count": len(events),
                "summary": "\n".join(f"- {t}: {c}" for t, c in top) + f"\n\nHEADLINE: {headline}",
                "headline": headline, "mode": f"fallback_{llm['mode']}",
                **({"llm_error": llm.get("error", "")} if llm.get("error") else {})}

    text = llm["text"]
    headline = ""
    for line in text.splitlines():
        stripped = line.strip()
        # Accept "HEADLINE:", "**HEADLINE:**", "*HEADLINE:*", etc.
        cleaned = stripped.replace("*", "").replace("_", "").strip()
        if cleaned.upper().startswith("HEADLINE:"):
            headline = cleaned.split(":", 1)[1].strip(); break

    try:
        from lib.timeline import emit as _tl
        from lib.timeline_types import ECHO_SUGGESTION_MADE
        _tl(ECHO_SUGGESTION_MADE,
            actor={"type": "echo", "id": "whats-new", "name": "Echo"},
            entity_refs=[],
            payload={"kind": "whats_new", "window_minutes": window,
                     "event_count": len(events), "headline": headline[:200]})
    except Exception: pass

    return {"ok": True, "window_minutes": window, "event_count": len(events),
            "events_considered": min(len(events), 120),
            "summary": text, "headline": headline, "mode": "llm"}
