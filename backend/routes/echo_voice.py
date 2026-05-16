"""iter231 · Echo cognitive voice endpoint — long-press on the dark-blue
Echo button opens a voice conversation. Browser does STT → sends text here
→ Claude Sonnet 4.5 replies with a cognitive explanation + optional panel
to open. Browser speaks the reply back via SpeechSynthesis (female voice).

iter232 · TTS upgraded to OpenAI (tts-1-hd / sage voice — wise, measured
tone per William). The voice panel now plays OpenAI-synthesized audio
instead of the browser's speech synthesis, so the response actually sounds
like an educated CFO advisor.

William wants: "can you explain to me why food cost is high" → Echo has a
real conversation, can create text + graphs, shows drill-down, and suggests
corrections. Session-aware so the conversation flows like Claude.ai.
"""
from __future__ import annotations
import base64
import os
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import Response
from pydantic import BaseModel, Field

from database import db
from lib.time import utcnow_iso

router = APIRouter(prefix="/api/echo-voice", tags=["echo-voice"])


ECHO_SYSTEM_PROMPT = """You are Echo — the cognitive AI copilot inside the LUCCCA
enterprise hospitality platform. You speak in a calm, educated, measured
tone as if you're the CFO's trusted advisor. Be concise; prefer 2-4 sentences
for spoken responses unless the chef asks for detail.

Your operational context:
- You have access to per-outlet P&L data via EchoAurium (revenue, COGS, labor,
  GL-coded other expenses) for each of the 8 resort F&B outlets:
  Rooftop Lounge, Garden Room, Club Bar, Pool Grill, Market Cafe, Coastal Kitchen,
  In-Room Dining, Ballroom Catering.
- You know invoices, POs, deliveries, accruals, line checks, waste logs,
  and recipes. When the chef asks about a number, cite the GL code and the
  period.
- The resort is in Fort Lauderdale, FL. When the chef asks about
  weather, you have access to current conditions and hour-by-hour forecast.
  Always answer weather questions when asked — they affect pool & patio
  staffing/ordering.
- If the chef asks to "show" or "drill into" something, respond in this
  exact JSON shape so the UI can react:
    {
      "speech": "spoken reply, 1-3 sentences",
      "panel": "pnl" | "dashboard" | "activity" | "invoices" | "accruals" | "weather-hourly" | null,
      "panel_args": {"outlet_id": "...", "period": "...", "gl_code": "..."},
      "explanation": "longer markdown explanation for the transcript",
      "graph_spec": null | {"type": "bar"|"line", "labels":[...], "series":[...]},
      "actions": [{"label": "...", "kind": "requisition"|"accrual"|"flag", ...}]
    }
  Panel rules:
   - "when/what time will it rain" / hourly weather questions → panel="weather-hourly"
   - "show P&L" / food-cost questions / labor questions → panel="pnl"
   - "show dashboard" → panel="dashboard"
   - "show activity" / "what's happening" → panel="activity"
   - "show invoices" / "flag this" → panel="invoices"
   - "what accruals" → panel="accruals"
   - Pure chat with no panel need → panel=null, graph_spec=null
- Never hallucinate data you don't have; if the chef asks something you can't
  answer, say so and suggest what to look at.
"""


class VoiceMessage(BaseModel):
    session_id: Optional[str] = None    # None starts a new session
    text: str = Field(..., min_length=1, max_length=2000)
    outlet_id: Optional[str] = "outlet-rooftop"
    context: Dict[str, Any] = {}        # {current_period, current_view, ...}


class VoiceReply(BaseModel):
    session_id: str
    speech: str
    panel: Optional[str] = None
    panel_args: Dict[str, Any] = {}
    explanation: Optional[str] = None
    graph_spec: Optional[Dict[str, Any]] = None
    actions: List[Dict[str, Any]] = []


def _load_context_snapshot(outlet_id: str) -> str:
    """Pulls a terse data snapshot so Claude answers grounded questions.
    Keeps the prompt cheap by only injecting essentials."""
    try:
        pnl_rows = list(db["echoaurium_pnl_lines"].find(
            {"outlet_id": outlet_id, "period": "2026-03"},
            {"_id": 0, "gl_code": 1, "label": 1, "section": 1,
             "actual": 1, "budget": 1, "pct_of_rev": 1}).limit(60))
        rev = sum(r["actual"] for r in pnl_rows if r["section"] == "revenue")
        cogs = sum(r["actual"] for r in pnl_rows if r["section"] == "cogs")
        labor = sum(r["actual"] for r in pnl_rows if r["section"] == "labor")
        other = sum(r["actual"] for r in pnl_rows if r["section"] == "other_exp")
        top_exp = sorted(
            [r for r in pnl_rows if r["section"] in ("cogs", "other_exp")],
            key=lambda r: r["actual"], reverse=True)[:8]
        outlet = db["echoaurium_outlets"].find_one({"id": outlet_id}, {"_id": 0}) or {}
        acc = list(db["accruals"].find({"outlet_id": outlet_id, "status": "pending_invoice"},
                                         {"_id": 0, "accrued_amount": 1, "period": 1,
                                          "vendor_name": 1}).limit(10))
        flagged = db["invoices"].count_documents(
            {"outlet_id": outlet_id, "has_flag": True})

        lines = [
            f"OUTLET: {outlet.get('name', outlet_id)} (kind: {outlet.get('kind', '?')})",
            f"PERIOD: 2026-03",
            f"Revenue: ${rev:,.0f} · COGS ${cogs:,.0f} ({cogs/rev*100:.1f}%) · Labor ${labor:,.0f} ({labor/rev*100:.1f}%) · Other ${other:,.0f}" if rev else "Revenue: (no data)",
            "TOP EXPENSE GL LINES:",
        ]
        for r in top_exp:
            lines.append(f"  GL {r['gl_code']} {r['label']}: ${r['actual']:,.0f} ({r['pct_of_rev']}%/rev, budget ${r['budget']:,.0f})")
        if acc:
            lines.append(f"PENDING ACCRUALS: {len(acc)} · ${sum(a['accrued_amount'] for a in acc):,.0f}")
        if flagged:
            lines.append(f"FLAGGED INVOICES: {flagged}")

        # Inject quick current weather (Fort Lauderdale) + today's rain peak
        try:
            from routes.weather import _generate_current, _generate_rain_tracker
            w = _generate_current()
            rt = _generate_rain_tracker()
            peak = max(rt, key=lambda x: x.get("rain_probability") or 0) if rt else None
            lines.append(f"WEATHER (Fort Lauderdale): {w['temp']:.0f}°F, {w['condition']['description']}, wind {w['wind_speed']:.0f} mph")
            if peak:
                lines.append(f"Today's rain peak: {peak.get('hour')} · {peak.get('rain_probability')}%")
        except Exception:
            pass

        return "\n".join(lines)
    except Exception as e:
        return f"(context snapshot unavailable: {str(e)[:80]})"


@router.post("/chat", response_model=VoiceReply)
async def voice_chat(body: VoiceMessage,
                       x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    session_id = body.session_id or f"vs-{uuid.uuid4().hex[:10]}"
    LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
    if not LLM_KEY:
        raise HTTPException(503, "voice chat unavailable — LLM key missing")

    # Load prior session messages for continuity
    history_docs = list(db["echo_voice_sessions"].find(
        {"session_id": session_id}, {"_id": 0}).sort("created_at", 1).limit(12))

    # Persist the user turn
    db["echo_voice_sessions"].insert_one({
        "id": f"ev-{uuid.uuid4().hex[:10]}",
        "session_id": session_id,
        "role": "user",
        "text": body.text,
        "outlet_id": body.outlet_id,
        "actor": x_user_id or "chef-william",
        "created_at": utcnow_iso(),
    })

    snapshot = _load_context_snapshot(body.outlet_id or "outlet-rooftop")
    system = ECHO_SYSTEM_PROMPT + "\n\nCURRENT DATA SNAPSHOT:\n" + snapshot

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(api_key=LLM_KEY, session_id=session_id,
                       system_message=system)
        chat.with_model("anthropic", "claude-sonnet-4-5-20250929")

        # Re-inject prior turns so Claude has the thread
        prompt_parts: List[str] = []
        for h in history_docs[-8:]:      # limit history depth
            if h.get("role") == "user":
                prompt_parts.append(f"Chef: {h.get('text', '')}")
            else:
                prompt_parts.append(f"Echo: {h.get('speech') or h.get('text', '')}")
        prompt_parts.append(f"Chef: {body.text}")
        prompt_parts.append(
            "\nReply as valid JSON only. No markdown fences. Keys: "
            "speech, panel, panel_args, explanation, graph_spec, actions.")

        resp = await chat.send_message(UserMessage(text="\n".join(prompt_parts)))
        raw = resp if isinstance(resp, str) else str(resp)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            if raw.endswith("```"): raw = raw[:-3].strip()
        import json as _json
        try:
            parsed = _json.loads(raw)
        except _json.JSONDecodeError:
            # Fallback: plain-speech reply
            parsed = {"speech": raw[:500], "panel": None, "panel_args": {},
                       "explanation": None, "graph_spec": None, "actions": []}
    except Exception as e:
        parsed = {"speech": f"I had trouble reaching my model. {str(e)[:80]}",
                  "panel": None, "panel_args": {},
                  "explanation": None, "graph_spec": None, "actions": []}

    # Persist the echo turn
    db["echo_voice_sessions"].insert_one({
        "id": f"ev-{uuid.uuid4().hex[:10]}",
        "session_id": session_id,
        "role": "echo",
        "text": parsed.get("speech", ""),
        "speech": parsed.get("speech", ""),
        "panel": parsed.get("panel"),
        "panel_args": parsed.get("panel_args") or {},
        "explanation": parsed.get("explanation"),
        "graph_spec": parsed.get("graph_spec"),
        "actions": parsed.get("actions") or [],
        "created_at": utcnow_iso(),
    })

    return VoiceReply(
        session_id=session_id,
        speech=parsed.get("speech", ""),
        panel=parsed.get("panel"),
        panel_args=parsed.get("panel_args") or {},
        explanation=parsed.get("explanation"),
        graph_spec=parsed.get("graph_spec"),
        actions=parsed.get("actions") or [],
    )


@router.get("/session/{session_id}")
def get_session(session_id: str):
    rows = list(db["echo_voice_sessions"].find(
        {"session_id": session_id}, {"_id": 0}).sort("created_at", 1))
    return {"ok": True, "session_id": session_id, "count": len(rows), "rows": rows}


# ══════════════════════════════════════════════════════════════════════
# OpenAI TTS — iter232 upgrade from browser SpeechSynthesis
# ══════════════════════════════════════════════════════════════════════

VALID_VOICES = {"alloy", "ash", "coral", "echo", "fable",
                 "nova", "onyx", "sage", "shimmer"}


class TtsIn(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)
    voice: str = Field(default="sage")      # wise, measured — educated tone
    model: str = Field(default="tts-1-hd")  # HD quality for conversation
    speed: float = Field(default=1.0, ge=0.25, le=4.0)
    response_format: str = Field(default="mp3",
                                   pattern="^(mp3|opus|aac|flac|wav|pcm)$")


@router.post("/tts")
async def tts_generate(body: TtsIn):
    """Synthesizes speech via OpenAI TTS. Default voice=sage (wise, measured)
    suits an educated-CFO-advisor tone; switchable per-request.

    Returns audio bytes (default mp3) so the mobile client can play with a
    standard Audio() element or HTMLAudioElement.
    """
    if body.voice not in VALID_VOICES:
        raise HTTPException(400, f"voice must be one of {sorted(VALID_VOICES)}")
    LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
    if not LLM_KEY:
        raise HTTPException(503, "TTS unavailable — EMERGENT_LLM_KEY missing")

    try:
        from emergentintegrations.llm.openai import OpenAITextToSpeech
        tts = OpenAITextToSpeech(api_key=LLM_KEY)
        audio_bytes = await tts.generate_speech(
            text=body.text, model=body.model, voice=body.voice,
            speed=body.speed, response_format=body.response_format)
    except Exception as e:
        raise HTTPException(500, f"TTS failed: {str(e)[:180]}")

    media = {"mp3": "audio/mpeg", "opus": "audio/ogg", "aac": "audio/aac",
             "flac": "audio/flac", "wav": "audio/wav",
             "pcm": "application/octet-stream"}.get(body.response_format, "audio/mpeg")
    return Response(content=audio_bytes, media_type=media,
                     headers={"Cache-Control": "no-store"})


@router.post("/tts-base64")
async def tts_base64(body: TtsIn):
    """Same as /tts but returns base64 JSON so the client can embed the
    audio data-URI directly (useful when Service Workers mangle binary)."""
    if body.voice not in VALID_VOICES:
        raise HTTPException(400, f"voice must be one of {sorted(VALID_VOICES)}")
    LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
    if not LLM_KEY:
        raise HTTPException(503, "TTS unavailable")
    try:
        from emergentintegrations.llm.openai import OpenAITextToSpeech
        tts = OpenAITextToSpeech(api_key=LLM_KEY)
        b64 = await tts.generate_speech_base64(
            text=body.text, model=body.model, voice=body.voice,
            speed=body.speed, response_format=body.response_format)
    except Exception as e:
        raise HTTPException(500, f"TTS failed: {str(e)[:180]}")
    return {"ok": True, "format": body.response_format, "voice": body.voice,
             "audio_base64": b64}



# ── iter234 · Proactive Morning Briefing ────────────────────────────────
# Scans EchoAurium P&L for anomalies across outlets (prime >55%, food >26%,
# labor >28%), combines with current weather and surfaces the most
# actionable opener. Called by EchoMiniButton on voice panel mount.
@router.get("/proactive-briefing")
async def proactive_briefing(outlet_id: Optional[str] = "outlet-rooftop",
                         x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Returns a single line Echo should open with. Prioritizes the
    biggest anomaly; falls back to a warm time-aware hello."""
    from datetime import datetime
    h = datetime.now().hour
    part = "morning" if h < 12 else "afternoon" if h < 17 else "evening"
    name = "William" if (x_user_id or "").lower().startswith("chef") else "Chef"

    # 1. P&L anomalies — walk all active outlets
    try:
        alerts: List[Dict[str, Any]] = []
        outlets = list(db["echoaurium_outlets"].find({"active": True}, {"_id": 0}))
        # Fallback to static catalog if collection is empty (seed not run)
        if not outlets:
            from routes.echoaurium_pnl import OUTLETS
            outlets = [o for o in OUTLETS if o.get("active")]
        for o in outlets[:8]:
            oid = o["id"]
            lines = list(db["echoaurium_pnl_lines"].find(
                {"outlet_id": oid, "period": "2026-03"}, {"_id": 0}))
            if not lines: continue
            rev = sum(l["actual"] for l in lines if l.get("section") == "revenue")
            if rev <= 0: continue
            cogs = sum(l["actual"] for l in lines if l.get("section") == "cogs")
            labor_sec = sum(l["actual"] for l in lines if l.get("section") == "labor")
            payroll = sum(l["actual"] for l in lines if l.get("section") == "payroll_related")
            total_labor = labor_sec + payroll
            food_pct = cogs / rev * 100
            labor_pct = total_labor / rev * 100
            prime_pct = (cogs + total_labor) / rev * 100
            if prime_pct > 55:
                alerts.append({"outlet": o["name"], "metric": "prime cost",
                                "value": round(prime_pct, 1),
                                "threshold": 55, "severity": prime_pct - 55})
            if food_pct > 28:
                alerts.append({"outlet": o["name"], "metric": "food cost",
                                "value": round(food_pct, 1),
                                "threshold": 28, "severity": food_pct - 28})
            if labor_pct > 32:
                alerts.append({"outlet": o["name"], "metric": "labor",
                                "value": round(labor_pct, 1),
                                "threshold": 32, "severity": labor_pct - 32})
        alerts.sort(key=lambda a: -a["severity"])
    except Exception:
        alerts = []

    # 2. Weather dimension (optional — only include if notable)
    rain_warn = ""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5.0) as client:
            base = os.environ.get("BACKEND_PUBLIC_URL", "http://localhost:8001")
            wr = await client.get(f"{base}/api/weather/rain-tracker")
            if wr.status_code == 200:
                wx = wr.json()
                hrs = wx.get("hours", []) if isinstance(wx, dict) else []
                first_rain = next((x for x in hrs if (x.get("rain_probability") or 0) >= 50), None)
                if first_rain:
                    rain_warn = f" Heads up — rain likely around {first_rain.get('hour', 'later')}."
    except Exception:
        pass

    if alerts:
        top = alerts[0]
        speech = (f"Good {part}, {name}. {top['outlet']}'s {top['metric']} is at "
                    f"{top['value']} percent — over target. Want me to walk you through it?"
                    f"{rain_warn}")
    else:
        speech = f"Good {part}, {name}. Everything's tracking to plan. What can I help you with?{rain_warn}"

    return {"ok": True, "speech": speech, "alerts": alerts[:3],
             "rain_warn": bool(rain_warn)}
