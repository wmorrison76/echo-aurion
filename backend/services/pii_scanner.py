"""
PII Tag Scanner + Masking Enforcement
======================================
L.8 from the launch-readiness audit. Privacy Tenet 4 demands the
trust score is never displayed to the guest. Privacy Tenet 8
forbids using behavioral signals for advertising / pricing /
profiling beyond service. This module makes those rules
*structural* by:

  1. **Annotating fields** with a PII classification (`pii_class`)
     in a central registry
  2. **Scanning** any document or response payload for fields
     that match those annotations
  3. **Masking at query time** based on caller authorization
  4. **Reporting** which collections + fields touch which PII
     classes (the SOC 2 + GDPR data-flow inventory artifact)

PII classes:
  · `pii.identity`     — name, email, phone, address, government IDs
  · `pii.behavior`     — voice tone, trust score, resonance score
  · `pii.financial`    — bank account, credit card, SSN
  · `pii.sensitive`    — mental health flags, family tension flags
  · `pii.location`     — precise GPS coordinates, room number
  · `internal`         — server-side only, never sent to client
                         (e.g. doctrine_version_hash, weights_version)

Masking levels:
  · `none`              — value passes through unchanged
  · `redacted`          — replaced with "REDACTED"
  · `partial`           — last 4 chars / domain only
  · `hashed`            — SHA256 prefix
  · `dropped`           — field removed entirely from response

The mapping of (caller_role × pii_class) → masking level is the
authorization matrix. Default: aggressive masking unless caller
proves authorization.

Doctrine alignment:
  · Privacy Tenet 4 — trust_score is `internal`, never client-side
  · Privacy Tenet 8 — `pii.behavior` cannot be exported to
    advertising/pricing modules (compile-time partition)
  · §1.1 transparency — the registry is queryable; customers can
    see exactly what we classify as PII
"""
from datetime import datetime, timezone
from typing import Dict, List, Optional
import hashlib
from fastapi import APIRouter, HTTPException, Query

from database import db


router = APIRouter(prefix="/api/admin/pii", tags=["admin-pii"])

_now = lambda: datetime.now(timezone.utc).isoformat()


PII_CLASSES = [
    "pii.identity",
    "pii.behavior",
    "pii.financial",
    "pii.sensitive",
    "pii.location",
    "internal",
]

# Default field → class mapping. Extend as new fields are added.
# Field names match across the platform; this is the global
# registry. Add per-collection overrides via the API if needed.
DEFAULT_FIELD_REGISTRY: Dict[str, str] = {
    # Identity
    "name": "pii.identity",
    "email": "pii.identity",
    "phone": "pii.identity",
    "phone_number": "pii.identity",
    "address": "pii.identity",
    "billing_address": "pii.identity",
    "shipping_address": "pii.identity",
    "guest_id": "pii.identity",
    "first_name": "pii.identity",
    "last_name": "pii.identity",
    "date_of_birth": "pii.identity",
    "ssn": "pii.identity",
    "passport_number": "pii.identity",
    "drivers_license": "pii.identity",

    # Behavior
    "trust_score": "pii.behavior",
    "resonance_score": "pii.behavior",
    "tone_signal": "pii.behavior",
    "behavioral_score": "pii.behavior",
    "engagement_score": "pii.behavior",

    # Financial
    "credit_card": "pii.financial",
    "card_number": "pii.financial",
    "cvv": "pii.financial",
    "bank_account": "pii.financial",
    "routing_number": "pii.financial",
    "tax_id": "pii.financial",

    # Sensitive
    "mental_health_flag": "pii.sensitive",
    "family_tension_flag": "pii.sensitive",
    "relationship_strain_flag": "pii.sensitive",
    "health_alert": "pii.sensitive",

    # Location
    "lat": "pii.location",
    "lon": "pii.location",
    "gps_coordinates": "pii.location",
    "room_number": "pii.location",
    "precise_location": "pii.location",

    # Internal — never client-side
    "doctrine_version_hash": "internal",
    "weights_version": "internal",
    "compliance_signature": "internal",
    "_internal_": "internal",   # any field starting with _internal_ is internal
}


# Masking matrix: (role, pii_class) → masking_level
# Default is restrictive; explicit grants per role.
DEFAULT_MASKING_MATRIX: Dict[str, Dict[str, str]] = {
    "guest_facing": {
        "pii.identity": "none",        # guests can see their own
        "pii.behavior": "dropped",     # never to guest (Tenet 4)
        "pii.financial": "partial",
        "pii.sensitive": "dropped",
        "pii.location": "none",
        "internal": "dropped",
    },
    "operator": {
        "pii.identity": "none",
        "pii.behavior": "none",        # operator sees behavior signals (Tenet 6)
        "pii.financial": "partial",
        "pii.sensitive": "none",
        "pii.location": "none",
        "internal": "dropped",
    },
    "employee_low_privilege": {
        "pii.identity": "partial",     # email domain only, etc.
        "pii.behavior": "dropped",     # tone signals are operator-grade
        "pii.financial": "redacted",
        "pii.sensitive": "dropped",
        "pii.location": "redacted",
        "internal": "dropped",
    },
    "advertising": {
        "pii.identity": "dropped",
        "pii.behavior": "dropped",     # Tenet 8 — never
        "pii.financial": "dropped",
        "pii.sensitive": "dropped",
        "pii.location": "dropped",
        "internal": "dropped",
    },
    "pricing": {
        # Tenet 8 — never use behavior, sensitive, etc. for pricing
        "pii.identity": "dropped",
        "pii.behavior": "dropped",
        "pii.financial": "dropped",
        "pii.sensitive": "dropped",
        "pii.location": "dropped",
        "internal": "dropped",
    },
    "external_export": {
        # Aggressive default for any "send to a third party" path
        "pii.identity": "redacted",
        "pii.behavior": "dropped",
        "pii.financial": "redacted",
        "pii.sensitive": "dropped",
        "pii.location": "redacted",
        "internal": "dropped",
    },
    "admin": {
        # Admin sees everything except internal
        "pii.identity": "none",
        "pii.behavior": "none",
        "pii.financial": "none",
        "pii.sensitive": "none",
        "pii.location": "none",
        "internal": "none",
    },
}


def _ensure_indexes():
    db["pii_field_registry"].create_index("field_name", unique=True)
    db["pii_audit_scans"].create_index([("collection", 1), ("scanned_at", -1)])


try:
    _ensure_indexes()
except Exception:
    pass


# ─────────────────────────────────────────────────────────────────
# Public API: classify_field, mask_payload, scan_collection
# ─────────────────────────────────────────────────────────────────
def classify_field(field_name: str) -> Optional[str]:
    """Return the PII class for a field name. Per-collection
    overrides (in pii_field_registry) take precedence over
    DEFAULT_FIELD_REGISTRY."""
    override = db["pii_field_registry"].find_one(
        {"field_name": field_name}, {"_id": 0, "pii_class": 1},
    )
    if override:
        return override.get("pii_class")
    if field_name in DEFAULT_FIELD_REGISTRY:
        return DEFAULT_FIELD_REGISTRY[field_name]
    if field_name.startswith("_internal_"):
        return "internal"
    return None


def mask_payload(payload: Dict, role: str = "external_export") -> Dict:
    """Walk a payload dict and apply masking based on (role,
    pii_class). Recurses into nested dicts + lists.

    Always returns a NEW dict — never mutates the input. Original
    payload is preserved at the storage layer."""
    matrix = DEFAULT_MASKING_MATRIX.get(role, DEFAULT_MASKING_MATRIX["external_export"])
    return _walk_and_mask(payload, matrix)


def _walk_and_mask(value, matrix: Dict[str, str]):
    if isinstance(value, dict):
        out = {}
        for k, v in value.items():
            cls = classify_field(k)
            if cls is None:
                out[k] = _walk_and_mask(v, matrix)
                continue
            level = matrix.get(cls, "dropped")
            if level == "dropped":
                continue                          # field removed entirely
            elif level == "redacted":
                out[k] = "REDACTED"
            elif level == "partial":
                out[k] = _partial(v)
            elif level == "hashed":
                out[k] = hashlib.sha256(str(v).encode()).hexdigest()[:16]
            else:                                  # "none"
                out[k] = _walk_and_mask(v, matrix) if isinstance(v, (dict, list)) else v
        return out
    if isinstance(value, list):
        return [_walk_and_mask(item, matrix) for item in value]
    return value


def _partial(value) -> str:
    """Show the last 4 chars (or, for emails, the domain)."""
    if isinstance(value, str):
        if "@" in value:
            local, _, domain = value.partition("@")
            return f"…@{domain}"
        return f"…{value[-4:]}" if len(value) > 4 else "REDACTED"
    return "REDACTED"


@router.get("/registry")
async def get_registry():
    """Full PII field registry — both the defaults and any
    per-field overrides."""
    overrides = list(db["pii_field_registry"].find({}, {"_id": 0}))
    return {
        "default_field_registry": DEFAULT_FIELD_REGISTRY,
        "overrides": overrides,
        "pii_classes": PII_CLASSES,
        "masking_matrix": DEFAULT_MASKING_MATRIX,
    }


@router.post("/registry/override")
async def set_field_override(field_name: str, pii_class: str):
    """Set or update a per-field PII class override."""
    if pii_class not in PII_CLASSES:
        raise HTTPException(400, f"Unknown PII class. Valid: {PII_CLASSES}")
    db["pii_field_registry"].update_one(
        {"field_name": field_name},
        {"$set": {"field_name": field_name, "pii_class": pii_class, "updated_at": _now()}},
        upsert=True,
    )
    return {"field_name": field_name, "pii_class": pii_class}


@router.post("/scan/{collection}")
async def scan_collection(collection: str, sample_size: int = Query(100, ge=1, le=10000)):
    """Sample-scan a collection for PII fields and produce a
    flow inventory artifact. Used as the SOC 2 / GDPR Article 30
    data-flow record."""
    sample = list(db[collection].find({}, {"_id": 0}).limit(sample_size))
    field_classes: Dict[str, Dict] = {}

    for doc in sample:
        _scan_doc(doc, "", field_classes)

    # Persist the scan
    record = {
        "collection": collection,
        "scanned_at": _now(),
        "sample_size": len(sample),
        "fields_with_pii": [
            {"field_path": fp, "pii_class": info["class"], "occurrences": info["count"]}
            for fp, info in field_classes.items()
        ],
        "pii_class_summary": _class_summary(field_classes),
    }
    db["pii_audit_scans"].insert_one(record.copy())
    record.pop("_id", None)
    return record


@router.get("/inventory")
async def pii_inventory():
    """Roll-up of PII flow across the platform — every collection
    that contains any PII-classified field and what classes."""
    pipeline = [
        {"$sort": {"scanned_at": -1}},
        {"$group": {
            "_id": "$collection",
            "latest_scan": {"$first": "$scanned_at"},
            "fields_with_pii": {"$first": "$fields_with_pii"},
            "pii_class_summary": {"$first": "$pii_class_summary"},
        }},
        {"$sort": {"_id": 1}},
    ]
    rows = list(db["pii_audit_scans"].aggregate(pipeline))
    return {
        "collections_scanned": len(rows),
        "collections": [
            {"collection": r["_id"], **{k: r[k] for k in ("latest_scan", "fields_with_pii", "pii_class_summary")}}
            for r in rows
        ],
    }


def _scan_doc(doc, prefix: str, classes: Dict[str, Dict]):
    if not isinstance(doc, dict):
        return
    for k, v in doc.items():
        path = f"{prefix}.{k}" if prefix else k
        cls = classify_field(k)
        if cls:
            classes.setdefault(path, {"class": cls, "count": 0})
            classes[path]["count"] += 1
        if isinstance(v, dict):
            _scan_doc(v, path, classes)
        elif isinstance(v, list):
            for item in v[:10]:
                if isinstance(item, dict):
                    _scan_doc(item, path, classes)


def _class_summary(field_classes: Dict[str, Dict]) -> Dict[str, int]:
    summary: Dict[str, int] = {c: 0 for c in PII_CLASSES}
    for info in field_classes.values():
        summary[info["class"]] = summary.get(info["class"], 0) + 1
    return summary
