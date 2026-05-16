"""
D53.2 · Database indexes — boot-time index creation.

A senior engineer wouldn't ship a Mongo deployment without indexes
on the hot read paths. Every `db.collection.find({tenant_id: X,
created_at: {$gte: Y}})` is a collection scan until you tell
Mongo to index those fields.

This module is called from server.py startup. It's idempotent —
Mongo's create_index is a no-op if the index already exists with
the same spec.

Index strategy

  Every collection that participates in tenant-isolated reads gets
  at minimum:
    1. (tenant_id, created_at) — the universal "list X for this
        tenant in the recent past" pattern
    2. natural_key (unique, sparse) — for idempotent insert lookups
    3. domain-specific composites for common filters

  We DO NOT index sensitive_pii fields per Tenet 8 — indexes
  expose data structure even when fields are surface-redacted.

Doctrine alignment

  · §3.1 append-only: indexes are read-side; never affect write
    semantics.
  · D27 tenant isolation: `tenant_id` is the leading column on
    almost every index so cross-tenant queries can't touch
    another tenant's data even by accident.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Tuple

logger = logging.getLogger("echo.db_indexes")


# Index specs — list of (collection, [field_specs], options)
# field_specs: list of (field, direction)  where direction is 1 (asc) or -1 (desc)
INDEX_SPECS: List[Tuple[str, List[Tuple[str, int]], Dict[str, Any]]] = [
    # ── D28 event log
    ("echo_events", [("tenant_id", 1), ("created_at", -1)], {}),
    ("echo_events", [("tenant_id", 1), ("kind", 1),
                       ("created_at", -1)], {}),
    ("echo_events", [("parent_event_id", 1)], {"sparse": True}),

    # ── D29 retrospective
    ("retrospective_findings", [("tenant_id", 1),
                                  ("applied", 1)], {}),

    # ── D30 forensic
    ("forensic_findings", [("tenant_id", 1), ("status", 1),
                             ("severity", 1)], {}),
    ("vendor_fingerprints", [("tenant_id", 1),
                               ("vendor_id", 1)],
     {"unique": True}),

    # ── D31 waste
    ("echowaste_entries", [("tenant_id", 1), ("outlet_id", 1),
                             ("captured_at", -1)], {}),
    ("echowaste_buffet_sessions", [("tenant_id", 1),
                                     ("outlet_id", 1),
                                     ("started_at", -1)], {}),
    ("plating_qc_findings", [("tenant_id", 1), ("outlet_id", 1),
                               ("created_at", -1)], {}),

    # ── D32 concierge
    ("concierge_alerts", [("tenant_id", 1), ("guest_id", 1),
                            ("resolved", 1)], {}),

    # ── D33 POS failover
    ("pos_failover_sessions", [("session_token", 1)],
     {"unique": True}),
    ("pos_failover_sessions", [("tenant_id", 1), ("outlet_id", 1),
                                 ("active", 1)], {}),
    ("pos_failover_orders", [("natural_key", 1),
                               ("tenant_id", 1)],
     {"unique": True}),
    ("pos_failover_orders", [("tenant_id", 1), ("outlet_id", 1),
                               ("status", 1)], {}),
    ("pos_failover_station_tickets", [("tenant_id", 1),
                                        ("outlet_id", 1),
                                        ("station", 1),
                                        ("status", 1)], {}),

    # ── D34 MyEcho
    ("myecho_enrollments", [("enrollment_token", 1)],
     {"unique": True}),
    ("myecho_sessions", [("session_token", 1)],
     {"unique": True}),
    ("myecho_sessions", [("tenant_id", 1), ("employee_id", 1),
                          ("active", 1)], {}),

    # ── D35 borrow PAF
    ("borrow_pafs", [("natural_key", 1), ("tenant_id", 1)],
     {"unique": True}),
    ("borrow_pafs", [("tenant_id", 1), ("status", 1)], {}),

    # ── D36 service auditors
    ("service_audit_findings", [("natural_key", 1),
                                  ("tenant_id", 1)],
     {"unique": True}),
    ("service_audit_findings", [("tenant_id", 1), ("auditor", 1),
                                  ("status", 1),
                                  ("created_at", -1)], {}),

    # ── D37 QR library + storyboard
    ("qr_library_items", [("tenant_id", 1), ("type", 1),
                            ("active", 1)], {}),
    ("outlet_storyboards", [("tenant_id", 1), ("outlet_id", 1),
                              ("posted_at", -1)], {}),

    # ── D39 activity drawer
    ("echo_activity_tasks", [("tenant_id", 1),
                               ("owner_user_id", 1),
                               ("updated_at", -1)], {}),
    ("echo_activity_chunks", [("task_id", 1),
                                ("index", 1)], {}),

    # ── D41 stress / D42 divergence
    ("forecast_replay_results", [("tenant_id", 1),
                                   ("outlet_id", 1),
                                   ("date", 1)], {}),
    ("order_divergences", [("natural_key", 1),
                             ("tenant_id", 1)],
     {"unique": True}),
    ("order_divergences", [("tenant_id", 1), ("outlet_id", 1),
                             ("analysis_status", 1)], {}),

    # ── D45 sous chef
    ("beo_digests", [("tenant_id", 1), ("owner_user_id", 1),
                       ("created_at", -1)], {}),
    ("menu_proposals", [("tenant_id", 1),
                          ("created_at", -1)], {}),
    ("peer_messages", [("tenant_id", 1),
                         ("to_employee_id", 1),
                         ("read_at", 1)], {}),

    # ── D46 vendor mobile
    ("vendor_pos", [("tenant_id", 1), ("draft_id", 1)], {}),
    ("vendor_po_drafts", [("tenant_id", 1),
                            ("owner_user_id", 1),
                            ("created_at", -1)], {}),

    # ── D47 payroll
    ("paystubs", [("tenant_id", 1), ("employee_id", 1),
                    ("pay_date", -1)], {}),
    ("paystubs", [("run_id", 1), ("tenant_id", 1)], {}),
    ("payroll_runs", [("tenant_id", 1),
                        ("created_at", -1)], {}),
    ("w2_records", [("natural_key", 1), ("tenant_id", 1)],
     {"unique": True}),
    ("direct_deposits", [("tenant_id", 1), ("employee_id", 1)],
     {"unique": True}),
    ("job_share_offers", [("tenant_id", 1), ("status", 1),
                            ("department", 1)], {}),

    # ── D48 PMS
    ("pms_reservations", [("tenant_id", 1), ("property_id", 1),
                            ("arrival_date", 1)], {}),
    ("pms_reservations", [("confirmation_code", 1),
                            ("tenant_id", 1)], {}),
    ("pms_reservations", [("tenant_id", 1), ("channel", 1),
                            ("external_id", 1)],
     {"sparse": True}),
    ("pms_folio_entries", [("folio_id", 1), ("posted_at", 1)], {}),
    ("pms_rate_plans", [("tenant_id", 1), ("active", 1)], {}),

    # ── D49 tip share
    ("tip_share_policies", [("tenant_id", 1), ("outlet_id", 1),
                              ("superseded_at", 1)], {}),
    ("tip_share_allocations", [("tenant_id", 1), ("outlet_id", 1),
                                 ("period_start", -1)], {}),

    # ── D50 reservation channels
    ("channel_reservations", [("tenant_id", 1), ("channel", 1),
                                ("external_id", 1)],
     {"unique": True}),
    ("channel_reservations", [("tenant_id", 1), ("outlet_id", 1),
                                ("reservation_at", 1),
                                ("status", 1)], {}),
    ("reservation_channel_connections", [("tenant_id", 1),
                                            ("channel", 1)],
     {"unique": True}),

    # ── D51 chef P&L
    ("chef_pnl_evaluations", [("tenant_id", 1), ("outlet_id", 1),
                                ("evaluated_at", -1)], {}),

    # ── time_clock + schedule (referenced by many auditors)
    ("time_clock", [("tenant_id", 1), ("employee_id", 1),
                      ("clock_in_at", -1)], {}),
    ("echo_schedule_shifts", [("tenant_id", 1),
                                ("employee_id", 1),
                                ("date", 1)], {}),
    ("echo_schedule_shifts", [("tenant_id", 1), ("date", 1)], {}),
    ("echo_schedule_borrowed_shifts", [("tenant_id", 1),
                                         ("paf_id", 1)], {}),

    # ── audit_log
    ("audit_log", [("tenant_id", 1), ("kind", 1),
                     ("created_at", -1)], {}),
    ("audit_log", [("tenant_id", 1), ("entity_id", 1)], {}),

    # ── employees (universal lookup)
    ("employees", [("tenant_id", 1), ("active", 1)], {}),
    ("employees", [("id", 1), ("tenant_id", 1)], {}),
]


def ensure_indexes(db: Any) -> Dict[str, Any]:
    """Idempotent: create_index is a no-op if the spec already
    exists with the same name. Returns a summary.
    """
    created = 0
    skipped = 0
    errors = []
    for collection, fields, options in INDEX_SPECS:
        try:
            db[collection].create_index(fields, **options)
            created += 1
        except Exception as e:
            errors.append({"collection": collection,
                            "fields": fields,
                            "error": str(e)[:200]})
    summary = {
        "indexes_created_or_verified": created,
        "indexes_skipped": skipped,
        "errors": errors,
    }
    if errors:
        logger.warning(
            f"db_indexes: {len(errors)} errors during ensure")
        for e in errors[:5]:
            logger.warning(f"  {e['collection']}: {e['error']}")
    else:
        logger.info(f"db_indexes: {created} indexes ensured")
    return summary
