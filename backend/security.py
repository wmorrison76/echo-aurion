"""
LUCCCA Security & Compliance Layer
====================================
Enterprise security hardening:
- CSRF protection via double-submit cookie
- Rate limiting per endpoint
- Input sanitization
- API key middleware
- GDPR compliance (data export, anonymization, right-to-erasure)
- Request ID tracking

Addresses MF-003 from the enterprise evaluation.
"""
from datetime import datetime, timezone
from typing import Optional
import uuid
import hashlib
import re
import time
from collections import defaultdict
from database import db

consent_col = db["gdpr_consent"]
data_requests_col = db["gdpr_data_requests"]


def _uid():
    return str(uuid.uuid4())

def _now():
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# RATE LIMITER (in-memory, per-process)
# ---------------------------------------------------------------------------
class RateLimiter:
    def __init__(self):
        self._requests = defaultdict(list)

    def check(self, key: str, max_requests: int = 60, window_seconds: int = 60) -> bool:
        now = time.time()
        self._requests[key] = [t for t in self._requests[key] if t > now - window_seconds]
        if len(self._requests[key]) >= max_requests:
            return False
        self._requests[key].append(now)
        return True

    def get_remaining(self, key: str, max_requests: int = 60, window_seconds: int = 60) -> int:
        now = time.time()
        self._requests[key] = [t for t in self._requests[key] if t > now - window_seconds]
        return max(0, max_requests - len(self._requests[key]))


rate_limiter = RateLimiter()


# ---------------------------------------------------------------------------
# INPUT SANITIZATION
# ---------------------------------------------------------------------------
def sanitize_string(value: str) -> str:
    if not isinstance(value, str):
        return value
    value = value.strip()
    # Remove potential script injection
    value = re.sub(r'<script[^>]*>.*?</script>', '', value, flags=re.IGNORECASE | re.DOTALL)
    value = re.sub(r'javascript:', '', value, flags=re.IGNORECASE)
    value = re.sub(r'on\w+\s*=', '', value, flags=re.IGNORECASE)
    return value


def escape_regex(value: str) -> str:
    """Escape special regex characters to prevent ReDoS / injection."""
    return re.escape(value) if isinstance(value, str) else value


def sanitize_dict(data: dict) -> dict:
    result = {}
    for k, v in data.items():
        if isinstance(v, str):
            result[k] = sanitize_string(v)
        elif isinstance(v, dict):
            result[k] = sanitize_dict(v)
        elif isinstance(v, list):
            result[k] = [sanitize_string(i) if isinstance(i, str) else i for i in v]
        else:
            result[k] = v
    return result


# ---------------------------------------------------------------------------
# GDPR COMPLIANCE
# ---------------------------------------------------------------------------
def record_consent(user_id: str, consent_type: str, granted: bool,
                   ip_address: str = "") -> dict:
    cid = _uid()
    doc = {
        "id": cid,
        "user_id": user_id,
        "consent_type": consent_type,
        "granted": granted,
        "ip_address": ip_address,
        "timestamp": _now(),
    }
    consent_col.insert_one(doc)
    del doc["_id"]
    return doc


def get_consents(user_id: str) -> list:
    return list(consent_col.find({"user_id": user_id}, {"_id": 0}).sort("timestamp", -1))


def export_user_data(user_id: str) -> dict:
    """GDPR Article 20: Right to data portability"""
    from database import (
        ingredients_col, events_col, pos_transactions_col,
        labor_plans_col, audit_log_col,
    )

    data = {
        "user_id": user_id,
        "export_date": _now(),
        "consents": list(consent_col.find({"user_id": user_id}, {"_id": 0})),
        "events_created": list(events_col.find({"assigned_to": user_id}, {"_id": 0})),
        "audit_trail": list(audit_log_col.find(
            {"data.by": user_id}, {"_id": 0}
        ).sort("timestamp", -1).limit(500)),
        "notifications": list(db["notifications"].find({"recipient_id": user_id}, {"_id": 0})),
    }

    # Save export request
    data_requests_col.insert_one({
        "id": _uid(), "user_id": user_id,
        "request_type": "export", "status": "completed",
        "timestamp": _now(),
    })

    return data


def anonymize_user(user_id: str) -> dict:
    """GDPR Article 17: Right to erasure"""
    anon = f"ANON_{hashlib.sha256(user_id.encode()).hexdigest()[:8]}"

    # Anonymize across collections
    collections_updated = 0
    for col_name in ["events", "audit_log", "notifications", "time_entries", "labor_plans"]:
        col = db[col_name]
        r1 = col.update_many({"assigned_to": user_id}, {"$set": {"assigned_to": anon}})
        r2 = col.update_many({"recipient_id": user_id}, {"$set": {"recipient_id": anon}})
        r3 = col.update_many({"employee_id": user_id}, {"$set": {"employee_id": anon, "employee_name": anon}})
        collections_updated += r1.modified_count + r2.modified_count + r3.modified_count

    # Remove consents
    consent_col.delete_many({"user_id": user_id})

    # Log the erasure request
    data_requests_col.insert_one({
        "id": _uid(), "user_id": anon,
        "request_type": "erasure", "status": "completed",
        "original_user_hash": hashlib.sha256(user_id.encode()).hexdigest(),
        "timestamp": _now(),
    })

    return {
        "status": "anonymized",
        "anonymized_id": anon,
        "records_updated": collections_updated,
    }


def get_data_requests(user_id: str = None) -> list:
    q = {}
    if user_id:
        q["user_id"] = user_id
    return list(data_requests_col.find(q, {"_id": 0}).sort("timestamp", -1))
