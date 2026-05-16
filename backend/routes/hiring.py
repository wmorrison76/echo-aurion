"""
iter180 · AI Hiring Flow — bulk-rank candidate résumés against a job profile

Upload N candidate résumés in one call (multipart), Claude scores each one
against the chosen job profile's rubric, and we return a ranked shortlist with
per-candidate fit score, strengths, gaps, and suggested interview questions.

All endpoints admin-gated.
"""
from __future__ import annotations

import asyncio
import base64
import hashlib
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

router = APIRouter(prefix="/api/hiring", tags=["hiring"])

ALLOWED_MIME = {
    "application/pdf", "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_RESUME_BYTES = 5 * 1024 * 1024
MAX_CANDIDATES = 15


def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected: return
    if x_admin_token != expected:
        raise HTTPException(401, "admin token required")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _extract_text(data: bytes, mime: str) -> str:
    try:
        from io import BytesIO
        if mime == "application/pdf":
            from pdfminer.high_level import extract_text
            return (extract_text(BytesIO(data)) or "").strip()
        if mime == "text/plain":
            return data.decode("utf-8", errors="ignore").strip()
        if mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            from zipfile import ZipFile
            from xml.etree import ElementTree as ET
            with ZipFile(BytesIO(data)) as z:
                with z.open("word/document.xml") as f:
                    tree = ET.parse(f)
            ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
            parts = []
            for p in tree.iter(f"{ns}p"):
                chunk = "".join(t.text for t in p.iter(f"{ns}t") if t.text)
                if chunk: parts.append(chunk)
            return "\n".join(parts).strip()
    except Exception:
        pass
    return ""


def _parse_json_flex(raw: str) -> Dict[str, Any]:
    import json
    s = (raw or "").strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s)
        s = re.sub(r"\s*```\s*$", "", s)
    try:
        return json.loads(s)
    except Exception:
        m = re.search(r"\{.*\}", s, re.DOTALL)
        if m:
            try: return json.loads(m.group(0))
            except Exception: return {}
    return {}


async def _score_candidate(chat, prompt: str) -> Dict[str, Any]:
    from emergentintegrations.llm.chat import UserMessage
    try:
        raw = await chat.send_message(UserMessage(text=prompt))
        d = _parse_json_flex(raw or "")
        if not d: return {"error": "non-JSON response"}
        try: d["fit_score"] = max(0, min(100, int(d.get("fit_score") or 0)))
        except Exception: d["fit_score"] = 0
        return d
    except Exception as e:
        return {"error": str(e)}


# ─── POST /api/hiring/rank ─────────────────────────────────────────────────
@router.post("/rank")
async def rank_candidates(
    job_profile_code: str = Form(...),
    candidate_names: Optional[str] = Form(None),  # JSON list of names, same order as files
    files: List[UploadFile] = File(...),
    x_admin_token: Optional[str] = Header(None),
):
    _require_admin(x_admin_token)
    from database import db as _db

    code = (job_profile_code or "").strip().lower()
    jp = _db.job_profiles.find_one({"code": code}, {"_id": 0})
    if not jp:
        raise HTTPException(404, f"job profile '{code}' not found")

    if not files:
        raise HTTPException(400, "no files uploaded")
    if len(files) > MAX_CANDIDATES:
        raise HTTPException(400, f"max {MAX_CANDIDATES} candidates per batch")

    names: List[str] = []
    if candidate_names:
        try:
            import json as _json
            names = [str(x) for x in (_json.loads(candidate_names) or [])]
        except Exception:
            names = []

    # Parse all resumes first (cheap)
    parsed: List[Dict[str, Any]] = []
    for i, f in enumerate(files):
        mime = (f.content_type or "").lower()
        if mime not in ALLOWED_MIME:
            parsed.append({"filename": f.filename, "error": f"unsupported type {mime}"})
            continue
        data = await f.read()
        if not data or len(data) > MAX_RESUME_BYTES:
            parsed.append({"filename": f.filename, "error": "empty or too large"})
            continue
        text = _extract_text(data, mime)
        sha = hashlib.sha256(data).hexdigest()
        candidate_name = (names[i] if i < len(names) else "") or f.filename or f"candidate {i+1}"
        parsed.append({
            "filename": f.filename, "candidate_name": candidate_name,
            "text": text[:12_000], "sha256": sha, "size_bytes": len(data),
        })

    # Build shared context once
    responsibilities = "\n".join(f"- {x}" for x in (jp.get("responsibilities") or []))
    expectations = "\n".join(f"- {x}" for x in (jp.get("expectations") or []))
    required_skills = ", ".join(jp.get("required_skills") or [])
    preferred_skills = ", ".join(jp.get("preferred_skills") or [])
    certifications = ", ".join(jp.get("required_certifications") or [])

    job_context = f"""JOB PROFILE — {jp.get('title')} ({code})
Department: {jp.get('department')}  Level: {jp.get('level')}
Summary: {jp.get('summary') or ''}
Responsibilities:
{responsibilities}
Expectations:
{expectations}
Required skills: {required_skills}
Preferred skills: {preferred_skills}
Required certifications: {certifications}
Minimum experience: {jp.get('min_experience_years') or 0} years"""

    # Set up Claude
    try:
        from emergentintegrations.llm.chat import LlmChat
    except Exception:
        raise HTTPException(503, "LLM integration unavailable")
    key = os.environ.get("EMERGENT_LLM_KEY", "").strip()
    if not key:
        raise HTTPException(503, "EMERGENT_LLM_KEY not configured")

    batch_id = uuid.uuid4().hex[:12]

    async def score_one(idx: int, p: Dict[str, Any]) -> Dict[str, Any]:
        if p.get("error"):
            return {"rank": None, **p}
        chat = (LlmChat(
            api_key=key,
            session_id=f"hire-{batch_id}-{idx}",
            system_message="You are a precise hospitality-industry hiring screener. "
                           "Return ONLY strict JSON matching the schema. No prose, no markdown."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929"))
        prompt = f"""{job_context}

CANDIDATE — {p['candidate_name']}
Resume text:
\"\"\"
{p['text'] or '(no extractable text)'}
\"\"\"

Return STRICT JSON:
{{
  "fit_score": 0-100 integer,
  "fit_label": "strong|solid|developing|gap",
  "headline": "one-sentence summary of fit",
  "years_experience_estimate": number,
  "key_strengths": ["…","…"],
  "key_gaps": ["…","…"],
  "certifications_present": ["…"],
  "certifications_missing": ["…"],
  "red_flags": ["…"] or [],
  "interview_questions": ["question 1","…"] (4-6 items),
  "recommendation": "advance|phone-screen|decline|consider-for-lower-level"
}}
"""
        r = await _score_candidate(chat, prompt)
        r.update({
            "candidate_name": p["candidate_name"],
            "filename": p["filename"],
            "sha256_prefix": (p.get("sha256") or "")[:12],
            "resume_chars": len(p.get("text") or ""),
        })
        return r

    # Run in parallel — each call is independent
    results = await asyncio.gather(*[score_one(i, p) for i, p in enumerate(parsed)])

    # Rank by fit_score desc, with errors at bottom
    ranked = sorted(results, key=lambda x: (0 if x.get("error") else 1, x.get("fit_score") or 0), reverse=True)
    for i, r in enumerate(ranked):
        r["rank"] = None if r.get("error") else (i + 1)
    # Re-rank only non-errored
    ok_rank = 1
    for r in ranked:
        if r.get("error"):
            r["rank"] = None
        else:
            r["rank"] = ok_rank; ok_rank += 1

    record = {
        "id": batch_id,
        "job_profile_code": code,
        "job_profile_title": jp.get("title"),
        "candidate_count": len(results),
        "ranked": ranked,
        "created_at": _now_iso(),
    }
    _db.hiring_batches.insert_one(record.copy())
    record.pop("_id", None)
    return {"ok": True, "batch": record}


@router.get("/batches")
async def list_batches(limit: int = 30, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    items = list(_db.hiring_batches
                 .find({}, {"_id": 0})
                 .sort("created_at", -1).limit(max(1, min(100, limit))))
    return {"ok": True, "total": len(items), "batches": items}


@router.get("/batch/{batch_id}")
async def get_batch(batch_id: str, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    b = _db.hiring_batches.find_one({"id": batch_id}, {"_id": 0})
    if not b: raise HTTPException(404, "batch not found")
    return {"ok": True, "batch": b}
