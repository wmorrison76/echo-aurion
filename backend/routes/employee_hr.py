"""
iter177 · Employee Resumes + AI Evaluation

Secure handling of employee resume documents and Claude-powered qualification
scoring against assigned job profile.

Security:
  - Admin-gated (X-Admin-Token) on ALL endpoints — this is PII
  - Resume bytes stored base64 in `employee_resumes` collection (separate
    from `employees` directory), with sha-256 fingerprint for change tracking
  - File metadata (name, size, type) returned on read; bytes only streamed on
    explicit `/download` endpoint
  - 5 MB hard cap on upload
  - Accept: application/pdf, text/plain, application/msword,
    application/vnd.openxmlformats-officedocument.wordprocessingml.document

AI Evaluation:
  - POST /api/employees/{id}/evaluate — Claude reads resume text + job profile
    + employee history and returns structured fit score, strengths, gaps,
    suggested interview questions, and evaluation prompts.
"""
from __future__ import annotations

import base64
import hashlib
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form
from fastapi.responses import Response
from pydantic import BaseModel

router = APIRouter(prefix="/api/employees", tags=["employee-hr"])


MAX_RESUME_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_MIME = {
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected:
        return
    if x_admin_token != expected:
        raise HTTPException(401, "admin token required")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _extract_text_pdf(data: bytes) -> str:
    try:
        from io import BytesIO
        from pdfminer.high_level import extract_text
        return (extract_text(BytesIO(data)) or "").strip()
    except Exception:
        return ""


def _extract_text_docx(data: bytes) -> str:
    try:
        from io import BytesIO
        from zipfile import ZipFile
        from xml.etree import ElementTree as ET
        with ZipFile(BytesIO(data)) as z:
            with z.open("word/document.xml") as f:
                tree = ET.parse(f)
        ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
        parts: List[str] = []
        for p in tree.iter(f"{ns}p"):
            pieces: List[str] = []
            for t in p.iter(f"{ns}t"):
                if t.text:
                    pieces.append(t.text)
            if pieces:
                parts.append("".join(pieces))
        return "\n".join(parts).strip()
    except Exception:
        return ""


def _extract_text(data: bytes, mime: str) -> str:
    if mime == "application/pdf":
        return _extract_text_pdf(data)
    if mime == "text/plain":
        try: return data.decode("utf-8", errors="ignore").strip()
        except Exception: return ""
    if mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return _extract_text_docx(data)
    return ""


# ─── Upload resume ─────────────────────────────────────────────────────────
@router.post("/{employee_id}/resume")
async def upload_resume(
    employee_id: str,
    file: UploadFile = File(...),
    uploaded_by: Optional[str] = Form(None),
    x_admin_token: Optional[str] = Header(None),
):
    _require_admin(x_admin_token)
    from database import db as _db
    emp = _db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(404, "employee not found")
    mime = (file.content_type or "").lower()
    if mime not in ALLOWED_MIME:
        raise HTTPException(400, f"unsupported file type '{mime}'; allowed: {sorted(ALLOWED_MIME)}")
    data = await file.read()
    if len(data) > MAX_RESUME_BYTES:
        raise HTTPException(413, f"resume exceeds {MAX_RESUME_BYTES // 1024 // 1024}MB cap")
    if len(data) == 0:
        raise HTTPException(400, "empty upload")
    sha256 = hashlib.sha256(data).hexdigest()
    b64 = base64.b64encode(data).decode("ascii")
    text = _extract_text(data, mime)
    # One resume per employee — replace.
    doc = {
        "id": uuid.uuid4().hex[:12],
        "employee_id": employee_id,
        "filename": file.filename or "resume",
        "mime_type": mime,
        "size_bytes": len(data),
        "sha256": sha256,
        "data_b64": b64,
        "text_extract": text[:50_000],  # cap stored text
        "uploaded_at": _now_iso(),
        "uploaded_by": uploaded_by or "admin",
    }
    _db.employee_resumes.replace_one({"employee_id": employee_id}, doc, upsert=True)
    _db.employees.update_one(
        {"id": employee_id},
        {"$set": {"resume_uploaded_at": doc["uploaded_at"],
                  "resume_filename": doc["filename"],
                  "resume_size_bytes": doc["size_bytes"],
                  "updated_at": _now_iso()}},
    )
    return {
        "ok": True,
        "resume": {
            "filename": doc["filename"], "size_bytes": doc["size_bytes"],
            "mime_type": doc["mime_type"], "uploaded_at": doc["uploaded_at"],
            "sha256_prefix": sha256[:12], "text_length": len(text),
        },
    }


@router.get("/{employee_id}/resume")
async def resume_meta(employee_id: str, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    r = _db.employee_resumes.find_one({"employee_id": employee_id},
                                      {"_id": 0, "data_b64": 0, "text_extract": 0})
    if not r:
        raise HTTPException(404, "no resume on file")
    return {"ok": True, "resume": r}


@router.get("/{employee_id}/resume/download")
async def resume_download(employee_id: str, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    r = _db.employee_resumes.find_one({"employee_id": employee_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "no resume on file")
    try:
        data = base64.b64decode(r.get("data_b64") or "")
    except Exception:
        raise HTTPException(500, "resume bytes unreadable")
    filename = r.get("filename") or "resume"
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", filename)
    return Response(
        content=data,
        media_type=r.get("mime_type") or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{safe}"'},
    )


@router.delete("/{employee_id}/resume")
async def resume_delete(employee_id: str, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    r = _db.employee_resumes.delete_one({"employee_id": employee_id})
    _db.employees.update_one(
        {"id": employee_id},
        {"$unset": {"resume_uploaded_at": "", "resume_filename": "", "resume_size_bytes": ""},
         "$set": {"updated_at": _now_iso()}},
    )
    return {"ok": True, "deleted": r.deleted_count}


# ─── Assign job profile ────────────────────────────────────────────────────
class AssignProfileBody(BaseModel):
    job_profile_code: Optional[str] = None  # pass null to unassign


@router.post("/{employee_id}/assign-profile")
async def assign_profile(employee_id: str, body: AssignProfileBody,
                         x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    emp = _db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(404, "employee not found")
    if body.job_profile_code:
        jp = _db.job_profiles.find_one({"code": body.job_profile_code.lower()}, {"_id": 0})
        if not jp:
            raise HTTPException(404, f"job profile '{body.job_profile_code}' not found")
        _db.employees.update_one(
            {"id": employee_id},
            {"$set": {"job_profile_code": jp["code"], "job_profile_title": jp.get("title"),
                      "updated_at": _now_iso()}},
        )
    else:
        _db.employees.update_one(
            {"id": employee_id},
            {"$unset": {"job_profile_code": "", "job_profile_title": ""},
             "$set": {"updated_at": _now_iso()}},
        )
    return {"ok": True, "employee": _db.employees.find_one({"id": employee_id}, {"_id": 0})}


# ─── AI Evaluation (Claude) ────────────────────────────────────────────────
class EvaluateBody(BaseModel):
    job_profile_code: Optional[str] = None  # override the assigned one
    include_resume: bool = True
    focus: Optional[str] = None  # e.g. "annual review", "hiring fit", "promotion readiness"


def _parse_json_flex(raw: str) -> Dict[str, Any]:
    import json
    s = (raw or "").strip()
    # strip fences
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s)
        s = re.sub(r"\s*```\s*$", "", s)
    # try raw first
    try:
        return json.loads(s)
    except Exception:
        pass
    # grab first object
    m = re.search(r"\{.*\}", s, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            pass
    return {}


@router.post("/{employee_id}/evaluate")
async def evaluate(employee_id: str, body: EvaluateBody,
                   x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    emp = _db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(404, "employee not found")
    code = (body.job_profile_code or emp.get("job_profile_code") or "").lower()
    if not code:
        raise HTTPException(400, "no job_profile_code on employee or request")
    jp = _db.job_profiles.find_one({"code": code}, {"_id": 0})
    if not jp:
        raise HTTPException(404, f"job profile '{code}' not found")

    resume_text = ""
    if body.include_resume:
        r = _db.employee_resumes.find_one({"employee_id": employee_id}, {"_id": 0, "data_b64": 0})
        if r:
            resume_text = (r.get("text_extract") or "")[:12_000]

    # Build prompt
    responsibilities = "\n".join(f"- {x}" for x in (jp.get("responsibilities") or []))
    expectations = "\n".join(f"- {x}" for x in (jp.get("expectations") or []))
    required_skills = ", ".join(jp.get("required_skills") or [])
    preferred_skills = ", ".join(jp.get("preferred_skills") or [])
    certifications = ", ".join(jp.get("required_certifications") or [])
    promotions = emp.get("promotion_history") or []
    promo_txt = "; ".join(
        f"{p.get('date','?')} {p.get('from_title','?')} → {p.get('to_title','?')}" for p in promotions
    ) or "none on record"

    focus = body.focus or "annual evaluation"
    prompt = f"""You are an HR partner evaluating an employee against a defined job profile.

JOB PROFILE — {jp.get('title')} ({code})
Department: {jp.get('department')}  Level: {jp.get('level')}
Summary: {jp.get('summary') or ''}
Responsibilities:
{responsibilities}
Expectations:
{expectations}
Required skills: {required_skills}
Preferred skills: {preferred_skills}
Required certifications: {certifications}
Minimum experience: {jp.get('min_experience_years') or 0} years

EMPLOYEE — {emp.get('first_name')} {(emp.get('last_name') or '')[:1]}.
Department: {emp.get('department')}  Current title: {emp.get('title') or emp.get('role')}
Hire date: {emp.get('hire_date') or 'unknown'}
Promotion history: {promo_txt}

RESUME TEXT (may be empty):
\"\"\"
{resume_text or '(no resume on file)'}
\"\"\"

Evaluation focus: {focus}

Return STRICT JSON only, no prose, no markdown:
{{
  "fit_score": 0-100 integer,
  "fit_label": "strong|solid|developing|gap",
  "summary": "2-3 sentence fit assessment",
  "strengths": ["…", "…"],
  "gaps": ["…", "…"],
  "certifications_present": ["…"],
  "certifications_missing": ["…"],
  "interview_questions": ["question 1", "question 2", "…"] (6-10 items, mix of behavioural and technical),
  "evaluation_rubric": [
    {{"area": "…", "rating": "exceeds|meets|developing|below", "evidence": "…"}}
  ],
  "recommended_development": ["actionable next 90-day item", "…"]
}}
""".strip()

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        key = os.environ.get("EMERGENT_LLM_KEY", "").strip()
        if not key:
            raise HTTPException(503, "EMERGENT_LLM_KEY not configured")
        chat = (LlmChat(
            api_key=key,
            session_id=f"eval-{employee_id}-{uuid.uuid4().hex[:6]}",
            system_message="You are a precise hospitality-industry HR evaluator. "
                           "Return ONLY strict JSON matching the schema. No commentary.",
        ).with_model("anthropic", "claude-sonnet-4-5-20250929"))
        raw = await chat.send_message(UserMessage(text=prompt))
        parsed = _parse_json_flex(raw or "")
        if not parsed:
            raise HTTPException(502, "model returned non-JSON response")
        # sanitise
        try:
            fs = int(parsed.get("fit_score") or 0)
        except Exception:
            fs = 0
        fs = max(0, min(100, fs))
        parsed["fit_score"] = fs

        record = {
            "id": uuid.uuid4().hex[:12],
            "employee_id": employee_id,
            "job_profile_code": code,
            "focus": focus,
            "used_resume": bool(resume_text),
            "result": parsed,
            "created_at": _now_iso(),
        }
        _db.employee_evaluations.insert_one(record.copy())
        record.pop("_id", None)
        return {"ok": True, "evaluation": record}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, f"evaluation failed: {e}")


@router.get("/{employee_id}/evaluations")
async def list_evaluations(employee_id: str, limit: int = 20,
                           x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    items = list(_db.employee_evaluations
                 .find({"employee_id": employee_id}, {"_id": 0})
                 .sort("created_at", -1)
                 .limit(max(1, min(100, limit))))
    return {"ok": True, "total": len(items), "evaluations": items}
