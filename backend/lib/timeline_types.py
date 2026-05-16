"""iter194 · FM-Upgrade 1 — TimelineEvent canonical type taxonomy.

Single source of truth for event type strings. Any route emitting to the
timeline MUST import from this module — not a raw string literal — so we
maintain a closed vocabulary.
"""
from __future__ import annotations
from typing import Set

# ── Procurement & Inventory (FSMA 204 CTEs) ──────────────────────────────
PO_DRAFTED = "po.drafted"
PO_APPROVED = "po.approved"
PO_SENT = "po.sent"
PO_RECEIVED_PARTIAL = "po.received_partial"
PO_RECEIVED_FULL = "po.received_full"
PO_CANCELLED = "po.cancelled"

LOT_RECEIVED = "lot.received"
LOT_TLC_ASSIGNED = "lot.tlc_assigned"
LOT_QUARANTINED = "lot.quarantined"
LOT_RELEASED = "lot.released"
LOT_TRANSFORMED = "lot.transformed"
LOT_EXPIRED = "lot.expired"
LOT_RECALLED = "lot.recalled"

CASE_ACCEPTED = "case.accepted"
CASE_REJECTED = "case.rejected"
CASE_SUBSTITUTED = "case.substituted"

# ── Production ───────────────────────────────────────────────────────────
BATCH_PLANNED = "batch.planned"
BATCH_STARTED = "batch.started"
BATCH_COOLING = "batch.cooling"
BATCH_COMPLETED = "batch.completed"
BATCH_HELD = "batch.held"
BATCH_FAILED = "batch.failed"
CCP_LOGGED = "ccp.logged"
YIELD_RECORDED = "yield.recorded"
WASTE_LOGGED = "waste.logged"

# ── Packs (atomic operational unit — FM-Upgrade 3) ───────────────────────
PACK_PLANNED = "pack.planned"
PACK_WEIGHED = "pack.weighed"
PACK_SEALED = "pack.sealed"
PACK_LABELED = "pack.labeled"
PACK_STAGED = "pack.staged"
PACK_LOADED_COOLER = "pack.loaded_cooler"
PACK_PICKED_UP_DRIVER = "pack.picked_up_driver"
PACK_DELIVERED = "pack.delivered"
PACK_CONSUMED = "pack.consumed"
PACK_ISSUE_RAISED = "pack.issue_raised"
PACK_TEMP_EXCURSION = "pack.temp_excursion"

# ── Orders & Customers ───────────────────────────────────────────────────
ORDER_PLACED = "order.placed"
ORDER_MODIFIED = "order.modified"
ORDER_CANCELLED = "order.cancelled"
ORDER_SKIPPED = "order.skipped"
ORDER_PAUSED = "order.paused"
ORDER_RESUMED = "order.resumed"
ORDER_STATUS_CHANGED = "order.status_changed"
CUSTOMER_GOAL_UPDATED = "customer.goal_updated"
CUSTOMER_FEEDBACK_SUBMITTED = "customer.feedback_submitted"
CUSTOMER_CHURN_RISK_FLAGGED = "customer.churn_risk_flagged"

# ── Labels & Compliance ──────────────────────────────────────────────────
LABEL_GENERATED = "label.generated"
LABEL_PRINTED = "label.printed"
LABEL_INVALIDATED = "label.invalidated"
LABEL_REGENERATED = "label.regenerated"
ALLERGEN_CROSS_CONTACT_DETECTED = "allergen.cross_contact_detected"
AUDIT_EXPORT_GENERATED = "audit.export_generated"

# ── Echo & Operations ────────────────────────────────────────────────────
ECHO_SUGGESTION_MADE = "echo.suggestion_made"
ECHO_ACTION_EXECUTED = "echo.action_executed"
ECHO_ACTION_REVERSED = "echo.action_reversed"
ECHO_ANOMALY_FLAGGED = "echo.anomaly_flagged"
STANDUP_SENT = "standup.sent"
MOBILE_PUSH_DISPATCHED = "mobile_push.dispatched"
FEATURE_FLAG_TOGGLED = "feature_flag.toggled"
MIGRATION_RUN_COMPLETED = "migration.run_completed"


# FSMA 204 Critical Tracking Events — must carry KDE payload
CTE_TYPES: Set[str] = {
    LOT_RECEIVED, LOT_TLC_ASSIGNED, LOT_TRANSFORMED, LOT_RECALLED,
    CASE_ACCEPTED, CASE_REJECTED,
    BATCH_STARTED, BATCH_COMPLETED,
    PACK_SEALED, PACK_LABELED,
    PACK_PICKED_UP_DRIVER, PACK_DELIVERED,
}

# All valid event types
ALL_TYPES: Set[str] = {
    v for k, v in globals().items()
    if k.isupper() and isinstance(v, str) and "." in v
}

# Required KDE keys on CTE payloads (per FSMA 204)
CTE_REQUIRED_KDES: Set[str] = {"commodity", "quantity", "unit"}
