"""iter215 · Claude-readable analysis logging for EchoWaste

Every LLM call, every capture, every vision analysis, every decision is
written to `waste_analysis_log` as a structured document. Claude (or any ops
reviewer) can pull the log via `GET /api/waste/logs` and get a full audit
trail of the preliminary operator-test in 8 hours.

Log entry shape:
    {
      log_id, timestamp,
      event_type: 'vision_llm' | 'whisper_stt' | 'text_llm' |
                  'capture_init' | 'capture_finalised' | 'buffet_rollup' |
                  'digest_emit' | 'draft_recipe_extract' | 'menu_extract' |
                  'error',
      capture_id?, entry_id?, session_id?, user_id?,
      inputs: {...},
      llm: {
        provider, model, system_prompt_preview, user_prompt_preview,
        response_raw_preview, response_parsed?, tokens_est, duration_ms, mode,
      },
      outputs: {...},
      error?: {type, message, traceback},
      notes?: str,
    }

Rationale: Claude asks us "what happened at 10:04 when the blueberry muffin
count dropped to zero?" — we grep the log by capture_id, see the raw Claude
response, the parsed JSON, confidence scores, and the surrounding capture
context. No more guessing.
"""
from __future__ import annotations
import hashlib
import json
import time
import traceback as _tb
import uuid
from contextlib import asynccontextmanager
from typing import Any, Dict, Optional

from database import db
from lib.time import utcnow_iso


_PROMPT_PREVIEW_LEN = 1200
_RESPONSE_PREVIEW_LEN = 4000


def _hash(s: str) -> str:
    return hashlib.sha256((s or "").encode()).hexdigest()[:10]


def _preview(s: Optional[str], n: int) -> Optional[str]:
    if not s: return s
    s = str(s)
    return s if len(s) <= n else s[:n] + f"…[+{len(s) - n}c]"


def log_event(event_type: str, *, inputs: Optional[Dict[str, Any]] = None,
              outputs: Optional[Dict[str, Any]] = None,
              llm: Optional[Dict[str, Any]] = None,
              error: Optional[Dict[str, Any]] = None,
              capture_id: Optional[str] = None,
              entry_id: Optional[str] = None,
              session_id: Optional[str] = None,
              user_id: Optional[str] = None,
              notes: Optional[str] = None) -> str:
    log_id = f"wlog-{uuid.uuid4().hex[:12]}"
    doc = {
        "log_id": log_id,
        "timestamp": utcnow_iso(),
        "event_type": event_type,
        "capture_id": capture_id, "entry_id": entry_id,
        "session_id": session_id, "user_id": user_id,
        "inputs": inputs or {},
        "outputs": outputs or {},
        "llm": llm,
        "error": error,
        "notes": notes or "",
    }
    try:
        db["waste_analysis_log"].insert_one(doc)
    except Exception as e:
        # Never raise from logging — just write to stderr
        print(f"[waste_analysis_log] insert failed: {e}")
    return log_id


@asynccontextmanager
async def log_llm(event_type: str, *,
                   system: str, user: str,
                   provider: str = "anthropic",
                   model: str = "claude-sonnet-4-5",
                   capture_id: Optional[str] = None,
                   entry_id: Optional[str] = None,
                   session_id: Optional[str] = None,
                   user_id: Optional[str] = None,
                   extra_inputs: Optional[Dict[str, Any]] = None):
    """Async context manager: wraps an LLM call, captures timing + outcome.

    Usage:
        async with log_llm("vision_llm", system=S, user=U, capture_id=cid) as ctx:
            ctx["response"] = await ask_echo_vision(...)
            ctx["outputs"] = {"items": len(items)}
    """
    ctx: Dict[str, Any] = {
        "response": None, "parsed": None, "outputs": {},
    }
    start = time.perf_counter()
    error: Optional[Dict[str, Any]] = None
    try:
        yield ctx
    except Exception as e:
        error = {"type": type(e).__name__, "message": str(e)[:400],
                 "traceback": _tb.format_exc()[:2000]}
        raise
    finally:
        duration_ms = int((time.perf_counter() - start) * 1000)
        resp = ctx.get("response") or {}
        if isinstance(resp, dict):
            raw_text = resp.get("text") or ""
            mode = resp.get("mode")
        else:
            raw_text, mode = str(resp), "unknown"
        llm = {
            "provider": provider, "model": model,
            "system_prompt_hash": _hash(system),
            "system_prompt_preview": _preview(system, 400),
            "user_prompt_preview": _preview(user, _PROMPT_PREVIEW_LEN),
            "response_raw_preview": _preview(raw_text, _RESPONSE_PREVIEW_LEN),
            "response_parsed": ctx.get("parsed"),
            "duration_ms": duration_ms, "mode": mode,
            "tokens_est": (len(system) + len(user) + len(raw_text)) // 4,
        }
        inputs = dict(extra_inputs or {})
        log_event(event_type, inputs=inputs, outputs=ctx.get("outputs") or {},
                  llm=llm, error=error, capture_id=capture_id, entry_id=entry_id,
                  session_id=session_id, user_id=user_id)
