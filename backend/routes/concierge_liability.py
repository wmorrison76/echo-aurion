"""
Echo Concierge Liability Filter
===============================
Scans guest-facing notes (tickets, BEOs, concierge messages, internal chat)
for personal opinions, diagnostic claims, privacy leaks, or liability-raising
language BEFORE they are saved to permanent records.

Returns:
  - severity: none | low | medium | high
  - categories: which kinds of risk were detected (opinion, diagnostic, PII, defamation, etc.)
  - findings: specific triggering spans with suggestions
  - sanitized: a scrubbed version safe to persist
  - ok_to_save: boolean (false on 'high' — caller should require manager approval)

Two endpoints:
  POST /api/echo-concierge/liability/scan — analyze text only
  POST /api/echo-concierge/liability/sanitize — scan + return sanitized output

This is an auditable, rule-based filter (deterministic, zero LLM dependency).
Can be extended later with an LLM second-pass when Emergent LLM key is desired.
"""
import os
import re
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import uuid4

from database import db

# iter149: LLM second-pass for nuanced liability not covered by regex rules.
# Gracefully falls back to rule-only if the key/library is unavailable.
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    _EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
except Exception:
    LlmChat = None
    UserMessage = None
    _EMERGENT_LLM_KEY = None

router = APIRouter(prefix="/api/echo-concierge/liability", tags=["concierge-liability"])
LOG_COLL = "concierge_liability_log"
_now = lambda: datetime.now(timezone.utc).isoformat()


# ─────────────────────────────────────────────
# Rule library
# ─────────────────────────────────────────────
# (pattern, category, severity, rationale, replacement)
# Severity: low < medium < high
# "replacement" is a neutral rewrite for sanitized output.

OPINION_PHRASES = [
    ("i think", "low"), ("i believe", "low"), ("in my opinion", "medium"),
    ("in my view", "medium"), ("if you ask me", "medium"),
    ("honestly", "low"), ("frankly", "low"), ("to be honest", "low"),
    ("between us", "high"), ("off the record", "high"),
    ("don't tell", "high"), ("keep this quiet", "high"),
]

DIAGNOSTIC = [
    (r"\b(allerg(y|ic)\s+to\s+\w+)", "high", "Medical diagnostic — avoid permanent record; ask guest for written accommodation request."),
    (r"\b(prescrib(ed|ing)|medication|diagnosed|diabetic|pregnant)\b", "high", "Medical/health condition — privacy risk."),
    (r"\b(drunk|intoxicated|high|on drugs|under the influence)\b", "high", "Intoxication claim — liability risk; use 'guest appeared unwell'."),
    (r"\b(refuse(d)?\s+service)\b", "medium", "Refusal-of-service claim — document with manager present."),
    (r"\b(i saw him|i saw her|i saw them)\b", "medium", "Eyewitness claim — stick to first-hand documented fact."),
]

DEFAMATION = [
    (r"\b(stole|steal|thief|criminal|cheater|liar|scam(mer)?)\b", "high", "Defamatory language — describe observed behavior instead."),
    (r"\b(rude|obnoxious|lazy|incompetent|terrible|worst)\b", "medium", "Subjective label — describe specific behavior."),
    (r"\b(stupid|idiot|dumb|ignorant)\b", "high", "Disrespectful language — remove."),
    (r"\b(racist|sexist|homophobic)\b", "high", "Accusation of discrimination — escalate to HR, not to ticket notes."),
]

PRIVACY = [
    # Email
    (r"\b([A-Za-z0-9._%+\-]+)@([A-Za-z0-9.\-]+\.[A-Za-z]{2,})\b", "medium", "Email in free text — link to guest profile instead."),
    # US phone
    (r"\+?\b(?:\d{1,3}[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}\b", "medium", "Phone in free text — link to guest profile instead."),
    # Credit card (Visa/Master/Amex/Discover — Luhn not enforced, high-signal)
    (r"\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6011)[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b", "high", "Card number — never write in notes. PCI violation."),
    # SSN
    (r"\b\d{3}-\d{2}-\d{4}\b", "high", "SSN — never store in notes."),
    # DL
    (r"\b(driver'?s?\s+license|passport\s+number)\b", "high", "Government ID reference — remove."),
]

GUARANTEES = [
    (r"\b(we guarantee|guaranteed|i promise|promise you|100%\s+(safe|guaranteed))\b", "high", "Promise/guarantee language — creates legal liability."),
    (r"\b(definitely|absolutely|always|never\s+happens|no\s+chance)\b", "low", "Absolute language — soften with 'typically' / 'we aim to'."),
    (r"\b(no\s+refunds?\b|we'?ll\s+never\s+refund)\b", "high", "Rigid refund language — violates consumer-protection norms in many jurisdictions."),
]

HARASSMENT = [
    (r"\b(hot|sexy|attractive|good-?looking|cute)\b(?=[^a-z])", "high", "Appearance-based language about guests or staff — remove."),
    (r"\b(flirt(ed|ing)?|came on to|hit on)\b", "high", "Behavior requires HR documentation, not ticket notes."),
]


def _find_matches(text: str, rules, category: str, t_lower: str) -> List[dict]:
    out = []
    for rule in rules:
        if isinstance(rule, tuple) and len(rule) == 2:
            # Phrase rule (str, severity)
            phrase, severity = rule
            for m in re.finditer(re.escape(phrase), t_lower):
                out.append({
                    "category": category, "severity": severity,
                    "match": text[m.start(): m.end()],
                    "span": [m.start(), m.end()],
                    "suggestion": "Remove or rephrase as objective fact.",
                })
        else:
            pattern, severity, suggestion = rule
            for m in re.finditer(pattern, text, flags=re.IGNORECASE):
                out.append({
                    "category": category, "severity": severity,
                    "match": m.group(0),
                    "span": [m.start(), m.end()],
                    "suggestion": suggestion,
                })
    return out


SEV_RANK = {"none": 0, "low": 1, "medium": 2, "high": 3}
SEV_OK_TO_SAVE = {"none", "low", "medium"}


# ─────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────
class ScanRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=20000)
    source: Optional[str] = Field(None, description="ticket | beo | concierge | chat | note")
    source_id: Optional[str] = None
    author: Optional[str] = None


# ─────────────────────────────────────────────
# Core scanner
# ─────────────────────────────────────────────
def _scan(text: str) -> dict:
    t_lower = text.lower()
    findings = []
    findings += _find_matches(text, OPINION_PHRASES, "opinion", t_lower)
    findings += _find_matches(text, DIAGNOSTIC, "diagnostic", t_lower)
    findings += _find_matches(text, DEFAMATION, "defamation", t_lower)
    findings += _find_matches(text, PRIVACY, "privacy", t_lower)
    findings += _find_matches(text, GUARANTEES, "guarantee", t_lower)
    findings += _find_matches(text, HARASSMENT, "harassment", t_lower)

    severity = "none"
    category_set = set()
    for f in findings:
        if SEV_RANK[f["severity"]] > SEV_RANK[severity]:
            severity = f["severity"]
        category_set.add(f["category"])

    ok_to_save = severity in SEV_OK_TO_SAVE
    return {
        "severity": severity,
        "categories": sorted(category_set),
        "findings": findings,
        "finding_count": len(findings),
        "ok_to_save": ok_to_save,
        "requires_manager_approval": severity == "high",
    }


def _sanitize(text: str, findings: List[dict]) -> str:
    """Replace risky spans with [redacted] placeholders, sorted reverse to preserve indices."""
    if not findings:
        return text
    # Dedup and sort by span[0] descending so we can splice safely
    seen = set()
    unique = []
    for f in sorted(findings, key=lambda f: (-f["span"][0], f["span"][1])):
        key = (f["span"][0], f["span"][1])
        if key in seen: continue
        seen.add(key); unique.append(f)
    out = text
    for f in unique:
        cat = f["category"]
        s, e = f["span"]
        repl = {
            "privacy": "[redacted]",
            "defamation": "[objective-rewrite-needed]",
            "diagnostic": "[medical-note-see-profile]",
            "harassment": "[hr-only]",
            "guarantee": "[soft-language]",
            "opinion": "[opinion-removed]",
        }.get(cat, "[redacted]")
        out = out[:s] + repl + out[e:]
    return out


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────
@router.post("/scan")
async def scan(body: ScanRequest):
    result = _scan(body.text)
    # Always log (for audit trail)
    log_entry = {
        "id": f"llog-{uuid4().hex[:10]}",
        "source": body.source, "source_id": body.source_id, "author": body.author,
        "text_length": len(body.text),
        "severity": result["severity"],
        "categories": result["categories"],
        "finding_count": result["finding_count"],
        "ok_to_save": result["ok_to_save"],
        "created_at": _now(),
    }
    db[LOG_COLL].insert_one({**log_entry})
    return {**result, "log_id": log_entry["id"]}


@router.post("/sanitize")
async def sanitize(body: ScanRequest):
    result = _scan(body.text)
    sanitized = _sanitize(body.text, result["findings"])
    # Log
    log_entry = {
        "id": f"llog-{uuid4().hex[:10]}",
        "source": body.source, "source_id": body.source_id, "author": body.author,
        "action": "sanitize",
        "text_length": len(body.text),
        "severity": result["severity"],
        "categories": result["categories"],
        "finding_count": result["finding_count"],
        "redaction_count": len(result["findings"]),
        "ok_to_save": result["ok_to_save"],
        "created_at": _now(),
    }
    db[LOG_COLL].insert_one({**log_entry})
    return {
        **result,
        "sanitized": sanitized,
        "original_length": len(body.text),
        "sanitized_length": len(sanitized),
        "log_id": log_entry["id"],
    }


@router.get("/log")
async def audit_log(limit: int = 100, severity: Optional[str] = None):
    q = {} if not severity else {"severity": severity}
    items = list(db[LOG_COLL].find(q, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"items": items, "total": len(items)}


@router.get("/summary")
async def summary():
    total = db[LOG_COLL].count_documents({})
    by_sev = {s: db[LOG_COLL].count_documents({"severity": s}) for s in ("none", "low", "medium", "high")}
    return {
        "total_scans": total,
        "by_severity": by_sev,
        "blocked_count": by_sev["high"],
    }


@router.get("/rules")
async def rules_summary():
    """Expose the rule categories + counts so UI can explain what's being checked."""
    return {
        "categories": [
            {"name": "privacy",     "description": "PII: email, phone, SSN, card, passport in free text.",   "rule_count": len(PRIVACY)},
            {"name": "diagnostic",  "description": "Medical/health claims that shouldn't be in notes.",      "rule_count": len(DIAGNOSTIC)},
            {"name": "defamation",  "description": "Subjective labels, name-calling, character attacks.",    "rule_count": len(DEFAMATION)},
            {"name": "harassment",  "description": "Appearance-based or inappropriate language re: guests/staff.", "rule_count": len(HARASSMENT)},
            {"name": "guarantee",   "description": "Binding legal language (guarantees, promises, no-refund).", "rule_count": len(GUARANTEES)},
            {"name": "opinion",     "description": "Personal opinion markers — stick to objective facts.",   "rule_count": len(OPINION_PHRASES)},
        ],
        "severity_policy": {
            "high": "Blocks save. Requires manager approval.",
            "medium": "Saves with warning. Suggests rewrite.",
            "low": "Saves silently. Logged for audit.",
            "none": "Clean.",
        },
    }


# ─────────────────────────────────────────────
# HYBRID LLM + RULE PIPELINE (iter149)
# Second-pass catches implicit insinuations, veiled defamation, subtle
# PII leaks, and culturally-charged language that regex can't detect.
# Falls back gracefully to pure rules when LLM unavailable.
# ─────────────────────────────────────────────

_HYBRID_SYSTEM = """You are a hospitality compliance officer reviewing staff notes
about hotel guests. Your job is to flag language that creates legal, HR, or
reputational risk EVEN when it's not literally defamatory.

Focus on these SUBTLE risks that pattern-matching misses:
- Implicit insinuations about nationality, religion, sexuality, race ("those people", "you know how they are")
- Coded medical/mental-health commentary ("seemed off", "not all there")
- Veiled threats or intimidation
- Age-based assumptions ("old man", "senior moment")
- Tone that suggests the author is angry at the guest
- Staff-on-staff HR risk (any personal comments about coworkers)
- Documentation a court would find prejudicial

Return ONLY a JSON object with this exact schema (no prose outside):
{
  "severity_override": "none" | "low" | "medium" | "high",
  "reasons": ["brief bullet 1", "brief bullet 2"],
  "suggested_rewrite": "A neutral, professional version preserving operational facts (≤ 240 chars)"
}

Set severity_override to the HIGHEST risk level you detect. If text is clean,
use "none". Do not flag factual operational notes (room numbers, times,
guest surnames on official record, preferences, dietary restrictions stated
BY the guest themselves)."""


async def _llm_second_pass(text: str, rule_result: dict) -> Optional[dict]:
    """Run Claude Sonnet 4.5 over the text. Returns augmented result or None on failure."""
    if not LlmChat or not _EMERGENT_LLM_KEY:
        return None
    if len(text.strip()) < 15:
        return None  # too short to be worth LLM spend
    try:
        chat = LlmChat(
            api_key=_EMERGENT_LLM_KEY,
            session_id=f"liability-{uuid4().hex[:8]}",
            system_message=_HYBRID_SYSTEM,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        rule_summary = f"Rules already flagged severity={rule_result['severity']}, categories={rule_result['categories']}."
        prompt = f"{rule_summary}\n\nNOTE TEXT:\n{text}\n\nReturn your JSON verdict."
        resp = await chat.send_message(UserMessage(text=prompt))
        resp_text = resp.strip() if isinstance(resp, str) else str(resp)
        # extract JSON from possibly fenced response
        match = re.search(r"\{.*\}", resp_text, re.DOTALL)
        if not match:
            return None
        import json as _json
        parsed = _json.loads(match.group(0))
        if not isinstance(parsed, dict):
            return None
        return {
            "llm_severity_override": parsed.get("severity_override", "none"),
            "llm_reasons": parsed.get("reasons", []) or [],
            "llm_suggested_rewrite": parsed.get("suggested_rewrite", ""),
        }
    except Exception:
        return None


class HybridScanRequest(BaseModel):
    text: str
    source: Optional[str] = None
    source_id: Optional[str] = None
    author: Optional[str] = None
    use_llm: bool = True


@router.post("/scan-hybrid")
async def scan_hybrid(body: HybridScanRequest):
    """Rule-pass → LLM second-pass → merged verdict. Final severity is the
    MAX of rule severity and LLM override. ok_to_save flips to false when
    final is high. LLM suggestion returned for the sanitized field."""
    rule_result = _scan(body.text)
    llm_out = await _llm_second_pass(body.text, rule_result) if body.use_llm else None

    final_severity = rule_result["severity"]
    if llm_out:
        llm_sev = llm_out.get("llm_severity_override", "none")
        if SEV_RANK.get(llm_sev, 0) > SEV_RANK.get(final_severity, 0):
            final_severity = llm_sev

    ok_to_save = final_severity in SEV_OK_TO_SAVE
    sanitized = _sanitize(body.text, rule_result["findings"])
    if llm_out and llm_out.get("llm_suggested_rewrite") and final_severity in ("medium", "high"):
        sanitized_llm = llm_out["llm_suggested_rewrite"]
    else:
        sanitized_llm = None

    log_entry = {
        "id": f"llog-{uuid4().hex[:10]}",
        "source": body.source, "source_id": body.source_id, "author": body.author,
        "action": "scan-hybrid",
        "text_length": len(body.text),
        "severity": final_severity,
        "rule_severity": rule_result["severity"],
        "llm_severity": (llm_out or {}).get("llm_severity_override"),
        "categories": rule_result["categories"],
        "finding_count": rule_result["finding_count"],
        "llm_used": llm_out is not None,
        "ok_to_save": ok_to_save,
        "created_at": _now(),
    }
    db[LOG_COLL].insert_one({**log_entry})

    return {
        **rule_result,
        "severity": final_severity,
        "ok_to_save": ok_to_save,
        "requires_manager_approval": final_severity == "high",
        "sanitized": sanitized,
        "sanitized_llm": sanitized_llm,
        "llm_reasons": (llm_out or {}).get("llm_reasons", []),
        "llm_available": llm_out is not None,
        "log_id": log_entry["id"],
    }
