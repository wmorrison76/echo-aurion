"""
LUCCCA Monthly Review Scheduler
================================
APScheduler-based cron job that triggers the Monthly P&L Review
at midnight on the 1st of every month. Generates the review,
stores it, and distributes role-scoped notifications.
"""
import asyncio
import logging
import os
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger("luccca.scheduler")

scheduler = AsyncIOScheduler()


async def _run_pastry_billing():
    """Daily sweep: charge due pastry subscribers + email invoice link."""
    import os
    try:
        from starlette.requests import Request
        from routes.pastry_stripe import run_monthly_billing
        from email_service import send_email, tpl_monthly_invoice
        from database import db as _db

        origin = os.environ.get("PASTRY_PUBLIC_URL", "https://cfo-toolkit-deploy.preview.emergentagent.com")
        scope = {"type": "http", "headers": [(b"origin", origin.encode()), (b"x-admin-token", os.environ.get("ADMIN_API_TOKEN", "").encode())], "query_string": b"", "method": "POST", "path": "/scheduler"}
        req = Request(scope)
        result = await run_monthly_billing(req, dry_run=False)
        for charged in result.charged:
            try:
                subject, html = tpl_monthly_invoice(
                    bakery_name=charged.get("bakery_name") or "Your bakery",
                    checkout_url=charged.get("checkout_url", ""),
                )
                await send_email(to=charged["email"], subject=subject, html=html,
                                 tags=["monthly_invoice"], db=_db)
            except Exception as e:
                logger.warning(f"Pastry email failed for {charged.get('email')}: {e}")
        logger.info(f"Pastry billing: charged={len(result.charged)} errors={len(result.errors)}")
    except Exception as e:
        logger.exception(f"Pastry billing job failed: {e}")


async def _run_stratus_escalation():
    """Every 15 min: escalate overdue HIGH/CRITICAL plans to next role in chain."""
    try:
        from routes.eng_ops_notifications import run_escalation
        result = await run_escalation()
        if result.get("escalated", []):
            logger.info(f"Stratus escalation: {result}")
    except Exception as e:
        logger.exception(f"Stratus escalation job failed: {e}")


async def _run_monthly_review():
    """Generate the monthly P&L review for the previous month and distribute."""
    logger.info("Monthly P&L review job triggered (echo_stratus module removed — skipping)")
    # Note: echo_stratus_review was consolidated. This job is a placeholder.


async def _run_weekly_bi_digest():
    """Send the weekly BI email digest to configured recipients."""
    from routes.enterprise_bi import _compile_digest_data, _build_digest_html, _uid, _now
    from routes.email_notifications import _send_email
    from database import db

    settings = db["bi_digest_settings"].find_one({}, {"_id": 0})
    if not settings or not settings.get("enabled", True) or not settings.get("recipients"):
        logger.info("Weekly BI Digest skipped — no recipients or disabled")
        return

    data = _compile_digest_data()
    html = _build_digest_html(data)
    subject = f"Weekly BI Digest — {data['date']}"
    results = []
    for recipient in settings["recipients"]:
        result = _send_email(to=recipient, subject=subject, html=html, category="bi_digest")
        results.append({"to": recipient, "status": result.get("status", "unknown")})

    db["bi_digest_history"].insert_one({
        "id": f"dig-{_uid()}", "sent_at": _now(),
        "recipients": settings["recipients"], "data_snapshot": data,
        "results": results, "trigger": "scheduled",
    })
    logger.info(f"Weekly BI Digest sent to {len(settings['recipients'])} recipients")


async def _run_continuous_analysis():
    """Echo Never Sleeps — Run continuous operational analysis every 4 hours."""
    from routes.echoai3_continuous import generate_continuous_analysis
    logger.info("Echo Never Sleeps: Running continuous analysis cycle...")
    try:
        analysis = generate_continuous_analysis()
        insights_count = len(analysis.get("insights", []))
        critical = sum(1 for i in analysis.get("insights", []) if i.get("priority") == "critical")
        logger.info(f"Continuous analysis {analysis['analysis_id']}: {insights_count} insights ({critical} critical)")
    except Exception as e:
        logger.error(f"Continuous analysis failed: {e}", exc_info=True)


# iter204b · Echo AI³ proactive wisdom — evaluates seeded wisdom rules against
# live data every 15 minutes. Rule hits become proactive_insights; high-severity
# ones auto-drafted into pending_actions for human approval (rule #1: human-gate).
async def _run_wisdom_evaluator():
    from database import db
    from datetime import datetime, timezone
    import uuid as _uuid
    logger.info("Echo AI³ wisdom evaluator tick")
    try:
        rules = list(db["wisdom_rules"].find({}, {"_id": 0}))
        now = datetime.now(timezone.utc).isoformat()
        insights_created = 0
        actions_drafted = 0

        # Evaluate a subset of rules against live data — intentionally narrow
        # (only the most mechanical rules). Complex rules stay manual until
        # we have formal trigger DSL parsing (iter210+).
        for rule in rules:
            rid = rule.get("id")

            if rid == "wr-007":
                # Event guest_count change with <7 days to go
                from_ = datetime.now(timezone.utc).isoformat()
                for ev in db["events"].find({"stage": {"$in": ["contract_signed", "menu_selected", "beo_issued", "deposit_received"]}}, {"_id": 0, "id": 1, "name": 1, "event_date": 1, "guest_count_changed_at": 1}).limit(50):
                    # If event_date within 7d and row has a recent guest_count_changed_at — flag it
                    ed = ev.get("event_date")
                    if not ed:
                        continue
                    try:
                        d = datetime.fromisoformat(str(ed).replace("Z", "+00:00"))
                        if d.tzinfo is None:
                            d = d.replace(tzinfo=timezone.utc)
                    except Exception:
                        continue
                    days_to = (d - datetime.now(timezone.utc)).days
                    if 0 <= days_to <= 7 and ev.get("guest_count_changed_at"):
                        # Upsert an insight on this event-rule pair (idempotent)
                        iid = f"insight-{rid}-{ev['id']}"
                        if not db["proactive_insights"].find_one({"id": iid}):
                            db["proactive_insights"].insert_one({
                                "id": iid, "_id": iid, "rule_id": rid,
                                "category": rule.get("category"), "title": f"BEO re-audit needed: {ev.get('name')}",
                                "summary": f"Guest count changed with {days_to}d left to event start",
                                "severity": "high", "status": "active", "org_id": "default",
                                "payload": {"event_id": ev["id"]}, "created_at": now,
                            })
                            insights_created += 1

            if rid == "wr-016":
                # HVAC pre-cool 45 min before for rooms with >100 guests
                for ev in db["events"].find({"guest_count": {"$gt": 100}}, {"_id": 0, "id": 1, "name": 1, "event_date": 1, "venue": 1, "guest_count": 1}).limit(50):
                    iid = f"insight-{rid}-{ev['id']}"
                    if not db["proactive_insights"].find_one({"id": iid}):
                        db["proactive_insights"].insert_one({
                            "id": iid, "_id": iid, "rule_id": rid,
                            "category": rule.get("category"),
                            "title": f"HVAC pre-cool 45m early: {ev.get('name')}",
                            "summary": f"{ev.get('guest_count')} guests in {ev.get('venue', 'room')} — pre-cool 45 min before start",
                            "severity": "normal", "status": "active", "org_id": "default",
                            "payload": {"event_id": ev["id"], "venue": ev.get("venue")}, "created_at": now,
                        })
                        insights_created += 1

            if rid == "wr-015":
                # Implied-AV by title — cross-reference with events lacking av_requirements
                for ev in db["events"].find({"av_requirements": {"$in": [None, []]}, "stage": {"$in": ["contract_signed", "menu_selected", "beo_issued"]}}, {"_id": 0, "id": 1, "name": 1, "av_requirements": 1}).limit(50):
                    nm = (ev.get("name") or "").lower()
                    if any(kw in nm for kw in ("keynote", "presentation", "summit", "conference", "gala", "reception")):
                        iid = f"insight-{rid}-{ev['id']}"
                        if not db["proactive_insights"].find_one({"id": iid}):
                            db["proactive_insights"].insert_one({
                                "id": iid, "_id": iid, "rule_id": rid,
                                "category": rule.get("category"),
                                "title": f"Likely AV needed (implied): {ev.get('name')}",
                                "summary": "Event title suggests AV — none currently assigned. Confirm with client.",
                                "severity": "normal", "status": "active", "org_id": "default",
                                "payload": {"event_id": ev["id"]}, "created_at": now,
                            })
                            insights_created += 1

            if rid == "wr-009":
                # CCP temp excursions > 30 min — auto-draft a corrective action
                try:
                    rows = list(db["ccp_events"].find({"excursion_minutes": {"$gt": 30}, "corrective_action_filed": {"$in": [None, False]}}, {"_id": 0, "id": 1, "zone": 1, "excursion_minutes": 1}).limit(25))
                except Exception:
                    rows = []
                for ev in rows:
                    aid = f"action-ccp-{ev['id']}"
                    if not db["pending_actions"].find_one({"id": aid}):
                        db["pending_actions"].insert_one({
                            "id": aid, "_id": aid, "kind": "corrective_action",
                            "title": f"File corrective action — {ev.get('zone')} temp excursion",
                            "summary": f"Excursion of {ev.get('excursion_minutes')} min requires written corrective per FDA 204.",
                            "reversible": True, "risk_level": "high",
                            "money_amount": None, "payload": {"ccp_event_id": ev["id"]},
                            "created_by": "echo-ai3.wisdom", "status": "pending", "created_at": now,
                        })
                        actions_drafted += 1

        logger.info(f"Echo AI³ wisdom tick: +{insights_created} insights, +{actions_drafted} pending actions")
    except Exception as e:
        logger.error(f"Wisdom evaluator failed: {e}", exc_info=True)


def start_scheduler():
    """Start the APScheduler with the monthly review cron job."""
    scheduler.add_job(
        _run_monthly_review,
        trigger=CronTrigger(day=1, hour=0, minute=0),
        id="monthly_pnl_review",
        name="Monthly P&L Review Generation & Distribution",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.add_job(
        _run_continuous_analysis,
        trigger=CronTrigger(hour="*/4"),
        id="echo_never_sleeps",
        name="Echo Never Sleeps — Continuous Operational Analysis",
        replace_existing=True,
        misfire_grace_time=1800,
    )
    scheduler.add_job(
        _run_weekly_bi_digest,
        trigger=CronTrigger(day_of_week="mon", hour=7, minute=0),
        id="weekly_bi_digest",
        name="Weekly BI Email Digest — Monday 7 AM",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    # Pastry monthly billing — daily sweep at 14:00 UTC
    scheduler.add_job(
        _run_pastry_billing,
        trigger=CronTrigger(hour=14, minute=0),
        id="pastry_monthly_billing",
        name="Pastry Standalone — Monthly Billing Sweep",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    # Stratus SLA escalation — every 15 minutes
    scheduler.add_job(
        _run_stratus_escalation,
        trigger=CronTrigger(minute="*/15"),
        id="stratus_sla_escalation",
        name="Stratus SLA Escalation Chain",
        replace_existing=True,
        misfire_grace_time=600,
    )
    # iter204b · Echo AI³ wisdom evaluator — every 15 minutes
    scheduler.add_job(
        _run_wisdom_evaluator,
        trigger=CronTrigger(minute="*/15"),
        id="echo_ai3_wisdom_evaluator",
        name="Echo AI³ Wisdom Evaluator",
        replace_existing=True,
        misfire_grace_time=600,
    )
    # D25 · D16 commissary + chronos jobs
    # Forecast generation @ 06:00 UTC daily — gives the chef tomorrow's
    # Monte Carlo bands on the morning tile. Per-outlet, per-active-item
    # iteration happens inside _run_forecast_generation.
    scheduler.add_job(
        _run_forecast_generation,
        trigger=CronTrigger(hour=6, minute=0),
        id="d16_forecast_generation",
        name="D16h · Daily forecast generation (Monte Carlo)",
        replace_existing=True,
        misfire_grace_time=1800,
    )
    # Forecast self-audit @ 04:00 UTC — yesterday's actuals are in by
    # 4am local everywhere (POS close + reconciliation lag). The audit
    # nudges signal weights so today's forecast is more accurate.
    scheduler.add_job(
        _run_forecast_audit,
        trigger=CronTrigger(hour=4, minute=0),
        id="d16_forecast_audit",
        name="D16h · Forecast self-audit (yesterday → weight nudge)",
        replace_existing=True,
        misfire_grace_time=1800,
    )
    # PAR recalibration @ 05:30 UTC — runs after the audit so fresh
    # weights inform the calibration. Per-outlet sweep using each
    # outlet's stored signals.
    scheduler.add_job(
        _run_pars_calibration,
        trigger=CronTrigger(hour=5, minute=30),
        id="d16_pars_calibration",
        name="D16e · PAR recalibration (reservations × calendar × velocity)",
        replace_existing=True,
        misfire_grace_time=1800,
    )
    # COGS reconciliation @ 02:00 UTC — pairs debits and credits from
    # yesterday's commissary transfers; flags orphans for finance.
    scheduler.add_job(
        _run_cogs_reconcile,
        trigger=CronTrigger(hour=2, minute=0),
        id="d16_cogs_reconcile",
        name="D16g · Nightly COGS reconciliation",
        replace_existing=True,
        misfire_grace_time=1800,
    )
    # Inbox escalation @ every 15 minutes — items with expires_at in
    # the past get bumped to higher urgency or cancelled per their
    # source module's rules.
    scheduler.add_job(
        _run_inbox_escalation,
        trigger=CronTrigger(minute="*/15"),
        id="d18_inbox_escalation",
        name="D18 · Approval inbox escalation sweep",
        replace_existing=True,
        misfire_grace_time=600,
    )
    # Outlet-capture daily audit @ 04:30 UTC — runs the active-learning
    # loop after the actuals are reliably closed (post-04:00 cogs/POS
    # reconciliation). Compares yesterday's forecast to actual at every
    # horizon, nudges weights, publishes accuracy.
    scheduler.add_job(
        _run_outlet_capture_audit,
        trigger=CronTrigger(hour=4, minute=30),
        id="outlet_capture_audit",
        name="Outlet capture · Daily audit + weight nudge",
        replace_existing=True,
        misfire_grace_time=1800,
    )
    # Outlet-capture recompute queue worker @ every minute — drains the
    # debounce queue so event-driven recomputes propagate within ~60s
    # of the underlying signal change.
    scheduler.add_job(
        _run_outlet_capture_recompute_worker,
        trigger=CronTrigger(minute="*"),
        id="outlet_capture_recompute",
        name="Outlet capture · Recompute queue worker",
        replace_existing=True,
        misfire_grace_time=60,
    )
    # D53.12 · Tenet §7 data retention sweep @ 03:30 UTC — tombstones
    # rows past their expires_at + scrubs PII per PRIVACY_TENETS.
    try:
        from jobs.data_retention import cron_retention_nightly
        scheduler.add_job(
            cron_retention_nightly,
            trigger=CronTrigger(hour=3, minute=30),
            id="d53_data_retention",
            name="D53.12 · Tenet §7 data retention sweep",
            replace_existing=True,
            misfire_grace_time=3600,
        )
    except Exception as _retention_err:
        logger.warning(f"data retention cron skipped: {_retention_err}")

    scheduler.start()
    logger.info("Scheduler started — Monthly P&L (1st), Echo Never Sleeps (4h), Weekly BI Digest (Mon 7am), Pastry Billing (daily 14:00 UTC), Stratus SLA (15m), Forecast (06:00), Forecast Audit (04:00), PAR Calibrate (05:30), COGS Reconcile (02:00), Inbox Escalation (15m), Outlet Capture Audit (04:30), Outlet Capture Recompute (1m)")


# ─── D25 · D16 cron job runners ──────────────────────────────────────────
# Each runner is wrapped in try/except so a single job failure doesn't
# crash the scheduler thread. Logs at INFO on success, ERROR on
# failure with full traceback.

async def _run_forecast_generation():
    """Generate tomorrow's Monte Carlo forecast for every active outlet
    × item. Reads the previous day's signals (or 1.0 baseline). For a
    real deployment these signals come from POS / reservations /
    weather services — until those are wired we use sensible defaults
    so the forecast still runs and the audit loop has data to work on."""
    try:
        from datetime import datetime, timezone, timedelta
        from database import db
        tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)
                    ).date().isoformat()
        # Discover outlets that have any forecast signal worth running
        # against — anything with a recent commissary order or active
        # par counts as "live" for the forecast.
        outlet_ids = set()
        for c in db["commissary_orders"].find(
            {"status": {"$in": ["submitted", "in_production",
                                  "delivered", "ready"]}},
            {"_id": 0, "ordering_outlet_id": 1}).limit(500):
            outlet_ids.add(c.get("ordering_outlet_id"))
        for p in db["commissary_pars"].find(
            {"active": True}, {"_id": 0, "outlet_id": 1}).limit(500):
            outlet_ids.add(p.get("outlet_id"))
        outlet_ids.discard(None)
        if not outlet_ids:
            logger.info("D25 forecast: no active outlets — skipping")
            return

        # We don't have a "menu items at this outlet" master here, so
        # for the cron sweep we forecast every product that has at
        # least one approval in the commissary catalog. Real callers
        # (UI / Echo) pass the full menu directly.
        from routes.chronos_forecast import (
            generate_forecast, GenerateForecastBody,
            ForecastSignals, ForecastItemInput)

        run_count = 0
        for oid in outlet_ids:
            approved = list(db["commissary_approvals"].find(
                {"outlet_id": oid, "is_active": True}, {"_id": 0}))
            if not approved:
                continue
            pids = [a["product_id"] for a in approved]
            products = list(db["commissary_products"].find(
                {"id": {"$in": pids}, "active": True}, {"_id": 0}))
            if not products:
                continue
            # base_demand defaults to pack_size × 5 — placeholder for a
            # real DOW history lookup. The audit cycle will tune the
            # multiplier within a week regardless.
            items = [ForecastItemInput(
                item_id=p["id"], item_name=p["name"],
                base_demand_dow_avg=float(p.get("pack_size") or 1) * 5
            ) for p in products]
            try:
                generate_forecast(GenerateForecastBody(
                    outlet_id=oid, target_date=tomorrow,
                    items=items, signals=ForecastSignals()))
                run_count += 1
            except Exception as e:
                logger.warning(f"D25 forecast for {oid} failed: {e}")
        logger.info(f"D25 forecast: generated for {run_count} outlets, "
                    f"target={tomorrow}")
    except Exception as e:
        logger.error(f"D25 forecast generation failed: {e}", exc_info=True)


async def _run_forecast_audit():
    """Walk yesterday's daily_forecasts and audit any with actuals
    available. We pull actuals from `pos_sales` collection if present;
    if not, log and skip — the audit infrastructure is in place ready
    for the POS feed to wire up."""
    try:
        from datetime import datetime, timezone, timedelta
        from database import db
        yesterday = (datetime.now(timezone.utc) - timedelta(days=1)
                     ).date().isoformat()
        forecasts = list(db["daily_forecasts"].find(
            {"date": yesterday}, {"_id": 0}).limit(2000))
        if not forecasts:
            logger.info(f"D25 forecast audit: no forecasts for {yesterday}")
            return

        from routes.chronos_forecast import audit_forecast, AuditBody, ActualSale

        # Group by outlet → batch one audit call per outlet
        by_outlet = {}
        for f in forecasts:
            by_outlet.setdefault(f["outlet_id"], []).append(f)

        audited_outlets = 0
        for oid, items in by_outlet.items():
            actuals = []
            for f in items:
                # Look for matching pos_sales row. Real schema TBD;
                # try (outlet_id, item_id, date) triplet.
                row = db["pos_sales"].find_one(
                    {"outlet_id": oid, "item_id": f["item_id"],
                     "date": yesterday}, {"_id": 0})
                if row and row.get("qty_sold") is not None:
                    actuals.append(ActualSale(
                        item_id=f["item_id"],
                        qty=float(row["qty_sold"])))
            if not actuals:
                continue
            try:
                audit_forecast(AuditBody(outlet_id=oid, date=yesterday,
                                          actuals=actuals))
                audited_outlets += 1
            except Exception as e:
                logger.warning(f"D25 audit for {oid} failed: {e}")
        logger.info(f"D25 forecast audit: ran for {audited_outlets} outlets, "
                    f"date={yesterday}")
    except Exception as e:
        logger.error(f"D25 forecast audit failed: {e}", exc_info=True)


async def _run_pars_calibration():
    """Recompute current_par for every (outlet, item) using whatever
    signals we have. For now we feed reservation/sales/calendar=1.0
    (baseline); when real signals wire up they'll come from the
    reservations + POS feeds."""
    try:
        from database import db
        from routes.commissary import (calibrate_pars,
                                          CalibrateRequest, CalibrationSignals)
        outlet_ids = set()
        for p in db["commissary_pars"].find(
            {"active": True}, {"_id": 0, "outlet_id": 1}):
            outlet_ids.add(p.get("outlet_id"))
        outlet_ids.discard(None)

        ran = 0
        for oid in outlet_ids:
            try:
                calibrate_pars(CalibrateRequest(
                    outlet_id=oid,
                    signals=CalibrationSignals(notes="nightly cron")),
                    x_admin_token=os.environ.get("ADMIN_API_TOKEN"))
                ran += 1
            except Exception as e:
                logger.warning(f"D25 par calibrate {oid} failed: {e}")
        logger.info(f"D25 par calibration: {ran} outlets recalibrated")
    except Exception as e:
        logger.error(f"D25 par calibration failed: {e}", exc_info=True)


async def _run_cogs_reconcile():
    """Pair yesterday's commissary debits/credits and mark them
    reconciled. Orphans flag for the finance team's morning review."""
    try:
        from datetime import datetime, timezone, timedelta
        from routes.commissary import reconcile_cogs, ReconcileBody
        until = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
        result = reconcile_cogs(ReconcileBody(
            until=until, operator="d25-nightly-batch"),
            x_admin_token=os.environ.get("ADMIN_API_TOKEN"))
        logger.info(f"D25 COGS reconcile: paired={result['paired_events']}, "
                    f"orphans D={result['orphaned_debits']}, "
                    f"C={result['orphaned_credits']}")
    except Exception as e:
        logger.error(f"D25 COGS reconcile failed: {e}", exc_info=True)


async def _run_inbox_escalation():
    """Bump expires_at-passed pending_approvals to higher urgency.
    A "normal" item that's been waiting past its expiry becomes "high";
    "high" becomes "critical". After 24h past expiry, items get
    auto-resolved with decision=expired and emit an audit event so
    the chef sees it on the next inbox load."""
    try:
        from datetime import datetime, timezone, timedelta
        from database import db
        from routes.audit_log import resolve_pending_approval, emit_audit
        now = datetime.now(timezone.utc)
        urgency_bump = {"normal": "high", "high": "critical",
                        "critical": "critical", "low": "normal"}

        bumped = 0
        expired = 0
        for p in db["pending_approvals"].find(
            {"status": "pending"}, {"_id": 0}).limit(500):
            exp = p.get("expires_at")
            if not exp:
                continue
            try:
                exp_dt = datetime.fromisoformat(str(exp).replace("Z", "+00:00"))
                if exp_dt.tzinfo is None:
                    exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            except Exception:
                continue
            if exp_dt > now:
                continue   # not expired yet

            # Past 24h overdue → auto-resolve as expired
            if (now - exp_dt) > timedelta(hours=24):
                resolve_pending_approval(
                    kind=p["kind"], entity_id=p["entity_id"],
                    decision="expired",
                    decided_by_name="d25-inbox-escalation",
                    note="auto-expired after 24h overdue")
                emit_audit(
                    module="audit-inbox", action="auto-expire",
                    entity_type=p["kind"], entity_id=p["entity_id"],
                    summary=f"auto-expired after 24h past {exp}")
                expired += 1
                continue

            # Otherwise bump urgency once per cycle
            new_urgency = urgency_bump.get(p.get("urgency"), "high")
            if new_urgency != p.get("urgency"):
                db["pending_approvals"].update_one(
                    {"kind": p["kind"], "entity_id": p["entity_id"]},
                    {"$set": {"urgency": new_urgency,
                              "updated_at": now.isoformat()}})
                emit_audit(
                    module="audit-inbox", action="bump-urgency",
                    entity_type=p["kind"], entity_id=p["entity_id"],
                    summary=f"{p.get('urgency')} → {new_urgency} (overdue)")
                bumped += 1
        if bumped or expired:
            logger.info(f"D25 inbox escalation: bumped={bumped}, "
                        f"expired={expired}")
    except Exception as e:
        logger.error(f"D25 inbox escalation failed: {e}", exc_info=True)


async def _run_outlet_capture_audit():
    """Outlet capture · daily audit (active-learning weight nudge).
    Runs at 04:30 UTC after actuals are closed. Compares yesterday's
    forecast to actual at every horizon (1d/3d/5d/10d/21d), publishes
    accuracy rows, nudges weights bounded by WEIGHT_NUDGE_MAX_PCT, and
    flags regime-change candidates for human review."""
    try:
        from echo.outlet_capture_learner import run_daily_audit
        result = run_daily_audit()
        logger.info(
            "Outlet capture audit: outlets=%s nudged=%s regime_change=%s skipped=%s",
            result.get("outlets_audited"),
            result.get("outlets_nudged"),
            result.get("outlets_in_regime_change"),
            result.get("outlets_skipped_low_sample"),
        )
    except Exception as e:                        # pragma: no cover
        logger.error("Outlet capture audit failed: %s", e, exc_info=True)


async def _run_outlet_capture_recompute_worker():
    """Outlet capture · recompute queue worker. Drains the debounce
    queue every minute so event-driven recomputes propagate within
    ~60 seconds of the underlying signal change."""
    try:
        from echo.outlet_capture_learner import process_recompute_queue
        result = process_recompute_queue()
        if result.get("processed", 0):
            logger.info("Outlet capture recompute: processed=%s", result["processed"])
    except Exception as e:                        # pragma: no cover
        logger.error("Outlet capture recompute worker failed: %s", e, exc_info=True)


def stop_scheduler():
    """Gracefully shut down the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
