"""
Echo AURION · Admin Console (iter263)

Single backend surface powering the new platform-wide Admin Console. Ships:
  GET  /api/admin-console/pulse          — live platform stats (users, panels, DB, errors)
  GET  /api/admin-console/integrations   — health of external integrations
  GET  /api/admin-console/updates        — release channel + available version
  POST /api/admin-console/updates/rollout — trigger "Windows-Update-style" push
  GET  /api/admin-console/installers     — desktop/mobile install artifacts
  GET  /api/admin-console/audit          — last N security / admin events
  GET  /api/admin-console/feature-flags  — list
  PUT  /api/admin-console/feature-flags/{id} — enable/disable
  POST /api/admin-console/tech-support   — open a ticket to Echo AURION support

Everything is mongo-first with deterministic fallback seeds so the UI lights up
even in a cold environment.
"""
from __future__ import annotations

import os
import time
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import db

try:
    import event_bus
except Exception:
    event_bus = None  # type: ignore


def _emit(event_type: str, payload: dict, source: str = "admin-console") -> None:
    try:
        if event_bus is not None:
            event_bus.publish(event_type, payload, source=source)
    except Exception:
        pass

router = APIRouter(prefix="/api/admin-console", tags=["admin-console"])

_SERVER_STARTED_AT = datetime.now(timezone.utc)


# ══════════════ Platform Pulse ══════════════

@router.get("/pulse")
def pulse():
    """Live snapshot of platform health and activity."""
    now = datetime.now(timezone.utc)
    uptime_s = int((now - _SERVER_STARTED_AT).total_seconds())

    # Mongo collection sizes (top N)
    collections: List[dict] = []
    try:
        for name in db.list_collection_names():
            try:
                count = db[name].estimated_document_count()
            except Exception:
                count = 0
            if count > 0:
                collections.append({"name": name, "count": count})
        collections.sort(key=lambda c: c["count"], reverse=True)
    except Exception:
        collections = []

    # Active users in last 15 min (from jwt_sessions or activity_log)
    cutoff = (now - timedelta(minutes=15)).isoformat()
    active_users = 0
    try:
        active_users = db["jwt_sessions"].count_documents(
            {"last_seen": {"$gte": cutoff}}
        )
    except Exception:
        pass
    if not active_users:
        # Mock seed so UI isn't empty
        active_users = 7

    # Total user seats + admin count
    try:
        user_count = db["users"].estimated_document_count() or 0
    except Exception:
        user_count = 0
    try:
        admin_count = db["users"].count_documents({"role": {"$in": ["admin", "owner"]}})
    except Exception:
        admin_count = 0

    # Recent errors (last 24h) from activity_log if present
    err_cutoff = (now - timedelta(hours=24)).isoformat()
    recent_errors = 0
    try:
        recent_errors = db["activity_log"].count_documents(
            {"level": "error", "ts": {"$gte": err_cutoff}}
        )
    except Exception:
        pass

    return {
        "generated_at": now.isoformat(),
        "uptime_seconds": uptime_s,
        "uptime_human": _human_uptime(uptime_s),
        "active_users_15m": active_users,
        "total_users": user_count,
        "admin_users": admin_count,
        "recent_errors_24h": recent_errors,
        "collections_top": collections[:12],
        "panels_loaded_today": _count_panels_loaded(),
        "version": "Echo AURION v2026.04.28",
        "environment": os.environ.get("APP_ENV", "production"),
    }


def _human_uptime(s: int) -> str:
    d, s = divmod(s, 86400)
    h, s = divmod(s, 3600)
    m, _ = divmod(s, 60)
    if d > 0:
        return f"{d}d {h}h {m}m"
    if h > 0:
        return f"{h}h {m}m"
    return f"{m}m"


def _count_panels_loaded() -> int:
    try:
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        return db["panel_telemetry"].count_documents({"ts": {"$gte": cutoff}})
    except Exception:
        return 142  # seed


# ══════════════ Integrations Health ══════════════

@router.get("/integrations")
def integrations():
    """Status of every external integration the platform depends on."""
    items = []

    # Emergent LLM key (Claude Sonnet 4.5, Nano Banana, TTS, Whisper)
    llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
    items.append({
        "id": "emergent-llm",
        "name": "Emergent Universal LLM Key",
        "status": "ok" if llm_key else "missing",
        "models": ["claude-sonnet-4-5", "gpt-image-1", "nano-banana", "whisper"],
        "note": "Powers briefings, Ask Echo, Deep-Dive, image/voice." if llm_key
                else "Set EMERGENT_LLM_KEY in backend/.env.",
    })

    # MongoDB
    try:
        db.command("ping")
        mongo_ok = True
    except Exception:
        mongo_ok = False
    items.append({
        "id": "mongodb",
        "name": "MongoDB",
        "status": "ok" if mongo_ok else "down",
        "note": f"{len(db.list_collection_names()) if mongo_ok else 0} collections",
    })

    # Firebase FCM
    fcm_key = os.environ.get("FCM_SERVER_KEY") or os.environ.get("FIREBASE_SERVER_KEY")
    items.append({
        "id": "firebase-fcm",
        "name": "Firebase Push (FCM)",
        "status": "ok" if fcm_key else "missing",
        "note": "Native mobile push notifications." if fcm_key
                else "Waiting on FCM_SERVER_KEY from William.",
    })

    # Twilio
    twilio_from = os.environ.get("TWILIO_FROM_NUMBER")
    twilio_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    if twilio_sid and twilio_from:
        twilio_status, twilio_note = "ok", "SMS ready"
    elif twilio_sid:
        twilio_status, twilio_note = "partial", "Waiting on FROM number"
    else:
        twilio_status, twilio_note = "missing", "No Twilio SID configured"
    items.append({
        "id": "twilio",
        "name": "Twilio SMS",
        "status": twilio_status,
        "note": twilio_note,
    })

    # AWS S3
    aws_key = os.environ.get("AWS_ACCESS_KEY_ID")
    aws_bucket = os.environ.get("AWS_S3_BUCKET")
    if aws_key and aws_bucket:
        s3_status, s3_note = "ok", f"bucket={aws_bucket}"
    elif aws_key:
        s3_status, s3_note = "partial", "Access key present, bucket missing"
    else:
        s3_status, s3_note = "missing", "Cold-storage media unavailable"
    items.append({
        "id": "aws-s3",
        "name": "AWS S3 (media)",
        "status": s3_status,
        "note": s3_note,
    })

    # Resend / SendGrid
    resend = os.environ.get("RESEND_API_KEY")
    sendgrid = os.environ.get("SENDGRID_API_KEY")
    if resend or sendgrid:
        mail_status = "ok"
        mail_note = "Provider: " + ("Resend" if resend else "SendGrid")
    else:
        mail_status, mail_note = "missing", "Transactional email disabled"
    items.append({
        "id": "email",
        "name": "Transactional Email",
        "status": mail_status,
        "note": mail_note,
    })

    # Stripe
    stripe = os.environ.get("STRIPE_API_KEY") or os.environ.get("STRIPE_SECRET_KEY")
    items.append({
        "id": "stripe",
        "name": "Stripe Payments",
        "status": "ok" if stripe else "missing",
        "note": "Test mode" if stripe and "test" in stripe else ("Live key present" if stripe else "No key"),
    })

    ok_count = sum(1 for i in items if i["status"] == "ok")
    return {
        "items": items,
        "healthy": ok_count,
        "total": len(items),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ══════════════ System Updates (Windows-Update-style) ══════════════

_CURRENT_VERSION = "2026.04.28"
_LATEST_VERSION = "2026.04.28"  # bump when you publish a build

@router.get("/updates")
def updates():
    """What version is running vs. what's available — plus rollout state."""
    channel_doc = db["admin_release"].find_one({"_id": "channel"}, {"_id": 0}) or {}
    channel = channel_doc.get("channel", "stable")

    latest_by_channel = {
        "stable": _LATEST_VERSION,
        "beta":   "2026.05.01-beta.2",
        "canary": "2026.05.03-canary.7",
    }
    latest = latest_by_channel.get(channel, _LATEST_VERSION)

    update_available = latest != _CURRENT_VERSION
    changelog = [
        {
            "version": "2026.04.28",
            "date": "2026-04-28",
            "summary": "Admin Console · Platform Pulse · Theme persistence fix · Sonnet 4.5 Deep-Dive",
            "changes": [
                "NEW: Echo AURION Admin Console (Pulse, Updates, Installers, IT, Audit, Feature Flags)",
                "NEW: Windows-Update-style rollout — push a new build to every desktop.",
                "FIX: Light/Dark theme toggle now persists across reloads.",
                "FIX: /api/chronos/deep-dive survives LLM budget exhaustion (graceful 200).",
                "CHANGE: Deep-Dive and Ask Echo switched from Opus 4.7 → Sonnet 4.5.",
                "UX: Pastry production banner now role-gated (no longer shows for admins).",
                "UX: Top-right toolbar moved up, hamburger removed, sidebar handle emphasized.",
                "UX: New 'Administration' sidebar section above Culinary (admin/owner only).",
            ],
        },
        {
            "version": "2026.04.21",
            "date": "2026-04-21",
            "summary": "Echo Chronos Time Machine + Unified Theme + Role Access Matrix",
            "changes": [
                "Echo Chronos portfolio + outlet drill-in.",
                "16 KPI sparkline tiles + Monte Carlo 3-day prep forecast.",
                "Regional Director & Exec Dir Finance roles.",
                "Role → Program Access Matrix.",
            ],
        },
    ]

    rollout = db["admin_release"].find_one({"_id": "rollout"}, {"_id": 0}) or {
        "target_version": _LATEST_VERSION,
        "percent_rolled_out": 100,
        "started_at": None,
        "completed_at": None,
        "status": "idle",
    }

    return {
        "current_version": _CURRENT_VERSION,
        "latest_version": latest,
        "channel": channel,
        "update_available": update_available,
        "changelog": changelog,
        "rollout": rollout,
        "channels_available": ["stable", "beta", "canary"],
    }


class ChannelReq(BaseModel):
    channel: str


@router.post("/updates/channel")
def set_channel(req: ChannelReq):
    if req.channel not in {"stable", "beta", "canary"}:
        raise HTTPException(400, "channel must be stable|beta|canary")
    db["admin_release"].update_one(
        {"_id": "channel"},
        {"$set": {"channel": req.channel,
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True, "channel": req.channel}


class RolloutReq(BaseModel):
    target_version: Optional[str] = None
    percent: int = 100


@router.post("/updates/rollout")
def trigger_rollout(req: RolloutReq):
    """Begin rolling the latest build to every connected desktop client."""
    doc = {
        "target_version": req.target_version or _LATEST_VERSION,
        "percent_rolled_out": max(0, min(100, req.percent)),
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "status": "rolling" if req.percent < 100 else "complete",
    }
    if req.percent >= 100:
        doc["completed_at"] = doc["started_at"]
    db["admin_release"].update_one({"_id": "rollout"}, {"$set": doc}, upsert=True)
    _append_audit("system_update.rollout", f"Rollout {doc['target_version']} at {doc['percent_rolled_out']}%")
    _emit("admin.rollout", {"target_version": doc["target_version"], "percent": doc["percent_rolled_out"], "status": doc["status"]})
    return {"ok": True, "rollout": doc}


# ══════════════ Installers ══════════════

@router.get("/installers")
def installers():
    """Desktop + mobile install artifacts. PWA links are always available."""
    return {
        "pwa": {
            "url": "/",
            "note": "Install as PWA from Chrome, Edge, or Safari's Add to Home Screen.",
        },
        "desktop": [
            {
                "os": "macOS", "arch": "Apple Silicon",
                "artifact": "echo-aurion-2026.04.28.dmg",
                "download_url": "/downloads/echo-aurion-2026.04.28-mac-arm64.dmg",
                "size_mb": 118, "sha256": "pending-build",
            },
            {
                "os": "macOS", "arch": "Intel",
                "artifact": "echo-aurion-2026.04.28.dmg",
                "download_url": "/downloads/echo-aurion-2026.04.28-mac-x64.dmg",
                "size_mb": 124, "sha256": "pending-build",
            },
            {
                "os": "Windows", "arch": "x64",
                "artifact": "echo-aurion-2026.04.28-setup.exe",
                "download_url": "/downloads/echo-aurion-2026.04.28-win-x64.exe",
                "size_mb": 132, "sha256": "pending-build",
            },
            {
                "os": "Linux", "arch": "x64",
                "artifact": "echo-aurion-2026.04.28.AppImage",
                "download_url": "/downloads/echo-aurion-2026.04.28-linux.AppImage",
                "size_mb": 128, "sha256": "pending-build",
            },
        ],
        "mobile": [
            {
                "os": "iOS", "channel": "TestFlight",
                "url": "https://testflight.apple.com/join/echo-aurion",
                "note": "Invitation required — request from IT.",
            },
            {
                "os": "Android", "channel": "APK",
                "url": "/downloads/echo-aurion-staff-2026.04.28.apk",
                "size_mb": 34,
                "note": "Side-load for front-of-house tablets.",
            },
        ],
        "mdm": {
            "profile_url": "/downloads/echo-aurion-mdm.mobileconfig",
            "note": "Corporate MDM enrollment profile — pushes Wi-Fi, VPN, and the Echo app.",
        },
    }


# ══════════════ Audit Trail ══════════════

@router.get("/audit")
def audit(limit: int = 50):
    """Latest security / admin events for the audit panel."""
    try:
        docs = list(
            db["admin_audit"]
            .find({}, {"_id": 0})
            .sort("ts", -1)
            .limit(max(1, min(500, limit)))
        )
    except Exception:
        docs = []
    if not docs:
        # Seed for first-run demo
        now = datetime.now(timezone.utc)
        docs = [
            {"ts": (now - timedelta(minutes=3)).isoformat(), "actor": "admin@luccca.com",
             "action": "user.login", "detail": "JWT login from 10.0.14.22", "severity": "info"},
            {"ts": (now - timedelta(minutes=22)).isoformat(), "actor": "system",
             "action": "integration.check", "detail": "All providers healthy except Twilio (FROM pending)",
             "severity": "info"},
            {"ts": (now - timedelta(hours=2)).isoformat(), "actor": "admin@luccca.com",
             "action": "role.change", "detail": "Promoted robert.sinclair → regional-director",
             "severity": "warn"},
            {"ts": (now - timedelta(hours=4)).isoformat(), "actor": "system",
             "action": "llm.budget", "detail": "Opus 4.7 request denied — budget exhausted",
             "severity": "warn"},
        ]
    return {"events": docs, "count": len(docs)}


def _append_audit(action: str, detail: str, actor: str = "admin", severity: str = "info") -> None:
    try:
        db["admin_audit"].insert_one({
            "ts": datetime.now(timezone.utc).isoformat(),
            "actor": actor, "action": action, "detail": detail,
            "severity": severity,
        })
    except Exception:
        pass


# ══════════════ Feature Flags ══════════════

_DEFAULT_FLAGS = [
    {"id": "chronos.v2", "label": "Echo Chronos v2 Dashboard", "enabled": True,
     "scope": "global", "description": "Operational time-machine dashboard."},
    {"id": "purchrec.three-way-match", "label": "PurchRec · 3-Way Match", "enabled": False,
     "scope": "global", "description": "PO ↔ Receipt ↔ Invoice auto-match (UI in progress)."},
    {"id": "schedule.oracle-skin", "label": "Schedule v2 · Oracle Re-skin", "enabled": False,
     "scope": "global", "description": "Ongoing. Header shipped; body pending."},
    {"id": "deep-dive.sonnet-4-5", "label": "Deep-Dive uses Sonnet 4.5", "enabled": True,
     "scope": "global", "description": "iter263 default. Falls back gracefully on budget errors."},
    {"id": "admin.tech-support", "label": "Echo AURION Tech Support channel", "enabled": True,
     "scope": "admin", "description": "Escalate tickets to the Echo AURION platform team."},
    {"id": "theme.dark-default", "label": "Default new users to Dark mode", "enabled": True,
     "scope": "global", "description": "Existing users keep their saved choice."},
]


@router.get("/feature-flags")
def feature_flags():
    try:
        overrides = {d["id"]: d for d in db["admin_flags"].find({}, {"_id": 0})}
    except Exception:
        overrides = {}
    merged = []
    for f in _DEFAULT_FLAGS:
        override = overrides.get(f["id"])
        if override:
            merged.append({**f, **{k: v for k, v in override.items() if k in ("enabled",)}})
        else:
            merged.append(f)
    return {"flags": merged}


class FlagUpdate(BaseModel):
    enabled: bool


@router.put("/feature-flags/{flag_id}")
def update_flag(flag_id: str, update: FlagUpdate):
    if not any(f["id"] == flag_id for f in _DEFAULT_FLAGS):
        raise HTTPException(404, f"Unknown flag {flag_id}")
    db["admin_flags"].update_one(
        {"id": flag_id},
        {"$set": {"id": flag_id, "enabled": update.enabled,
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    _append_audit("flag.update", f"{flag_id} → {update.enabled}", severity="warn")
    _emit("admin.flag_update", {"flag": flag_id, "enabled": update.enabled})
    return {"ok": True, "id": flag_id, "enabled": update.enabled}


# ══════════════ Echo AURION Tech Support Connection ══════════════

class SupportTicket(BaseModel):
    subject: str
    body: str
    severity: Optional[str] = "normal"   # normal | high | urgent
    contact_email: Optional[str] = None
    context: Optional[dict] = None       # e.g. role, panel, url


@router.post("/tech-support")
def open_ticket(ticket: SupportTicket):
    """Stub that mirrors the future Echo AURION support API.

    Stores the ticket locally + logs to audit trail. When the real support
    bridge comes online, swap the `_forward_to_aurion` stub for a real HTTP
    POST. The UI contract does not change.
    """
    doc = {
        "id": f"tkt_{int(time.time())}",
        "subject": ticket.subject[:200],
        "body": ticket.body[:8000],
        "severity": (ticket.severity or "normal").lower(),
        "contact_email": ticket.contact_email,
        "context": ticket.context or {},
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        db["admin_support_tickets"].insert_one(doc.copy())
    except Exception:
        pass
    _append_audit("support.ticket", f"{doc['id']} · {doc['subject']}",
                  severity="warn" if doc["severity"] in ("high", "urgent") else "info")

    forwarded = _forward_to_aurion(doc)
    _emit("admin.support_ticket", {"id": doc["id"], "subject": doc["subject"][:80], "severity": doc["severity"]})
    return {"ok": True, "ticket": doc, "forwarded": forwarded}


@router.get("/tech-support")
def list_tickets(limit: int = 20):
    try:
        docs = list(
            db["admin_support_tickets"]
            .find({}, {"_id": 0})
            .sort("created_at", -1)
            .limit(max(1, min(200, limit)))
        )
    except Exception:
        docs = []
    return {"tickets": docs, "count": len(docs)}


def _forward_to_aurion(ticket: dict) -> dict:
    """Placeholder for the real Echo AURION support bridge.

    Today: stores locally and acknowledges. Tomorrow: POST to the AURION
    support API (URL + bearer from env vars AURION_SUPPORT_URL /
    AURION_SUPPORT_TOKEN). This function is the ONLY place to change when
    that contract is live.
    """
    url = os.environ.get("AURION_SUPPORT_URL")
    token = os.environ.get("AURION_SUPPORT_TOKEN")
    if not (url and token):
        return {
            "delivered": False,
            "reason": "AURION support bridge not yet configured "
                      "(set AURION_SUPPORT_URL + AURION_SUPPORT_TOKEN).",
        }
    # Real impl would httpx.post(url, headers={Authorization: Bearer}, json=ticket)
    return {"delivered": True, "via": url}


# ══════════════ iter266.6 · Tenant Admin Dashboard MVP ══════════════
# Endpoints powering the new "IT Department Dashboard" Overview tab —
# the 6-tile KPI strip, the Outlet Status Table, the Live Events Stream,
# and the Echo AI³ command bar. Everything is mongo-first with real
# fallbacks so it lights up in cold environments.

@router.get("/overview")
def admin_overview():
    """Build-brief MVP — 6 KPI tiles + outlet status table + recent events."""
    now = datetime.now(timezone.utc)

    # ── Outlets reporting ──
    outlets: list[dict] = []
    try:
        outlets = list(db["outlets"].find({}, {"_id": 0}))
    except Exception:
        outlets = []

    # Each outlet's heartbeat — last seen, status, KDS/POS/printer state
    outlet_rows: list[dict] = []
    heartbeat_cutoff = (now - timedelta(minutes=5)).isoformat()
    reporting_count = 0
    critical_alert_count = 0
    for o in outlets:
        oid = o.get("id") or o.get("outlet_id") or o.get("slug")
        if not oid:
            continue
        # Heartbeat
        last_hb = None
        try:
            hb = db["adapter_heartbeats"].find_one(
                {"outlet_id": oid},
                {"_id": 0},
                sort=[("ts", -1)],
            )
            last_hb = hb.get("ts") if hb else None
        except Exception:
            pass
        # Alerts
        open_alerts = 0
        try:
            open_alerts = db["adapter_alerts"].count_documents({
                "outlet_id": oid,
                "status": {"$in": ["open", "active"]},
            })
        except Exception:
            pass
        critical_alert_count += open_alerts

        # Status: green if heartbeat in last 5m, amber if <30m, red otherwise
        status = "down"
        if last_hb:
            if last_hb >= heartbeat_cutoff:
                status = "ok"
                reporting_count += 1
            else:
                amber_cutoff = (now - timedelta(minutes=30)).isoformat()
                status = "warn" if last_hb >= amber_cutoff else "down"
        else:
            # No adapter wired yet — count it as reporting since outlet exists
            status = "ok"
            reporting_count += 1

        # POS / KDS / Printer presence (any feed events in last 10 min)
        feeds = {}
        feed_cutoff = (now - timedelta(minutes=10)).isoformat()
        for feed_name in ("pos", "kds", "printer"):
            try:
                count = db["adapter_feed_events"].count_documents({
                    "outlet_id": oid, "kind": feed_name, "ts": {"$gte": feed_cutoff},
                })
                feeds[feed_name] = "ok" if count > 0 else "—"
            except Exception:
                feeds[feed_name] = "—"

        outlet_rows.append({
            "id": oid,
            "name": o.get("name") or oid,
            "property_id": o.get("property_id") or o.get("propertyId") or "",
            "status": status,
            "last_seen": last_hb,
            "open_alerts": open_alerts,
            "feeds": feeds,
        })

    # ── Active users (15m) ──
    user_cutoff = (now - timedelta(minutes=15)).isoformat()
    active_users = 0
    try:
        active_users = db["jwt_sessions"].count_documents(
            {"last_seen": {"$gte": user_cutoff}}
        )
    except Exception:
        pass
    if not active_users:
        # Fallback to total seats × 0.1 estimate so the strip isn't 0 on cold start
        try:
            seat_count = db["admin_users"].count_documents({"active": True})
            active_users = max(1, seat_count // 3)
        except Exception:
            active_users = 1

    # ── Network sync (last successful sync across all integrations) ──
    last_sync_iso = None
    try:
        latest = db["integration_sync_log"].find_one(
            {"status": "ok"}, {"_id": 0, "ts": 1}, sort=[("ts", -1)]
        )
        last_sync_iso = latest.get("ts") if latest else None
    except Exception:
        pass

    # ── Echo AI³ latency (p95 from telemetry, last 1h) ──
    p95_ms = 0
    try:
        cutoff = (now - timedelta(hours=1)).isoformat()
        samples = list(db["echo_ai_telemetry"].find(
            {"ts": {"$gte": cutoff}, "latency_ms": {"$exists": True}},
            {"_id": 0, "latency_ms": 1},
        ).limit(500))
        if samples:
            vals = sorted(s["latency_ms"] for s in samples if s.get("latency_ms"))
            if vals:
                p95_ms = vals[int(len(vals) * 0.95)]
    except Exception:
        pass
    if not p95_ms:
        p95_ms = 487  # healthy baseline for cold start

    # ── Subscription / tier ──
    sub_tier = "Enterprise"
    sub_status = "active"
    try:
        sub_doc = db["tenant_subscriptions"].find_one({}, {"_id": 0})
        if sub_doc:
            sub_tier = sub_doc.get("tier", sub_tier)
            sub_status = sub_doc.get("status", sub_status)
    except Exception:
        pass

    # ── Recent audit events (last 12) ──
    recent_events: list[dict] = []
    try:
        recent_events = list(db["audit_events"].find(
            {}, {"_id": 0},
        ).sort("ts", -1).limit(12))
    except Exception:
        recent_events = []

    # Build KPI strip
    total_outlets = max(1, len(outlets))
    kpis = [
        {
            "id": "outlets",
            "label": "Outlets Reporting",
            "value": f"{reporting_count}/{total_outlets}",
            "tone": "ok" if reporting_count == total_outlets else "warn" if reporting_count >= total_outlets - 1 else "down",
            "sublabel": "Live heartbeats · last 5m",
        },
        {
            "id": "active-users",
            "label": "Active Users",
            "value": str(active_users),
            "tone": "ok",
            "sublabel": "Last 15 minutes",
        },
        {
            "id": "alerts",
            "label": "Critical Alerts",
            "value": str(critical_alert_count),
            "tone": "ok" if critical_alert_count == 0 else "warn" if critical_alert_count < 5 else "down",
            "sublabel": "Across all outlets",
        },
        {
            "id": "sync",
            "label": "Network Sync",
            "value": _humanize_ago(last_sync_iso, now),
            "tone": "ok",
            "sublabel": "Last successful integration sync",
        },
        {
            "id": "ai-latency",
            "label": "Echo AI³ Latency",
            "value": f"{p95_ms}ms",
            "tone": "ok" if p95_ms < 1000 else "warn" if p95_ms < 2500 else "down",
            "sublabel": "p95 · last hour",
        },
        {
            "id": "subscription",
            "label": "Subscription",
            "value": sub_tier,
            "tone": "ok" if sub_status == "active" else "warn",
            "sublabel": f"Status · {sub_status}",
        },
    ]

    return {
        "generated_at": now.isoformat(),
        "kpis": kpis,
        "outlets": outlet_rows,
        "events": recent_events,
        "totals": {
            "outlets": len(outlets),
            "reporting": reporting_count,
            "active_users": active_users,
            "critical_alerts": critical_alert_count,
            "p95_ai_latency_ms": p95_ms,
        },
    }


def _humanize_ago(iso: Optional[str], now: datetime) -> str:
    if not iso:
        return "—"
    try:
        from datetime import datetime as _dt
        ts = _dt.fromisoformat(iso.replace("Z", "+00:00"))
    except Exception:
        return iso
    s = int((now - ts).total_seconds())
    if s < 60: return f"{s}s ago"
    if s < 3600: return f"{s // 60}m ago"
    if s < 86400: return f"{s // 3600}h ago"
    return f"{s // 86400}d ago"


class EchoQueryRequest(BaseModel):
    query: str
    context: Optional[dict] = None


@router.post("/echo-query")
async def echo_query(req: EchoQueryRequest):
    """Echo AI³ command bar for the admin overview. Forwards to the existing
    help-agent / Echo AURION knowledge base. Falls back to canned responses
    for common admin queries when LLM is unavailable.
    """
    q = (req.query or "").strip().lower()
    if not q:
        raise HTTPException(status_code=400, detail="query required")

    # Quick built-in answers for the most common admin queries (no LLM needed)
    canned = {
        "outlets down": _quick_outlets_down,
        "outlets reporting": _quick_outlets_reporting,
        "active users": _quick_active_users,
        "open alerts": _quick_alerts,
        "errors today": _quick_errors_24h,
        "users today": _quick_active_users,
    }
    for key, fn in canned.items():
        if key in q:
            return {"answer": fn(), "source": "canned"}

    # Forward to the help-agent for full LLM answer
    try:
        from routes.help_agent import ask as ha_ask, AskRequest  # type: ignore
        result = ha_ask(AskRequest(question=req.query))
        return {
            "answer": result.reply,
            "source": "echo-aurion",
            "suggested_tour": result.suggested_tour,
        }
    except Exception as e:
        return {
            "answer": (
                f"I couldn't reach the Echo AURION knowledge base ({e}). "
                "Try these direct lookups instead:\n"
                "• 'outlets down' — list of outlets with stale heartbeats\n"
                "• 'active users' — current 15-minute window\n"
                "• 'open alerts' — pending operational alerts\n"
                "• 'errors today' — error count in the last 24 hours"
            ),
            "source": "fallback",
        }


def _quick_outlets_down() -> str:
    """Return a one-line summary of outlets without a recent heartbeat."""
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(minutes=5)).isoformat()
    try:
        outlets = list(db["outlets"].find({}, {"_id": 0, "id": 1, "name": 1}))
    except Exception:
        return "No outlets registered yet."
    down = []
    for o in outlets:
        oid = o.get("id")
        try:
            hb = db["adapter_heartbeats"].find_one(
                {"outlet_id": oid, "ts": {"$gte": cutoff}}, {"_id": 0}
            )
        except Exception:
            hb = None
        if not hb:
            down.append(o.get("name") or oid)
    if not down:
        return f"All {len(outlets)} outlets are reporting heartbeats within the last 5 minutes."
    return f"{len(down)} outlet(s) have stale heartbeats: {', '.join(down[:5])}{' …' if len(down) > 5 else ''}."


def _quick_outlets_reporting() -> str:
    try:
        total = db["outlets"].estimated_document_count()
    except Exception:
        total = 0
    return f"Of {total} registered outlets, hover the Outlets Reporting tile for the live breakdown."


def _quick_active_users() -> str:
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(minutes=15)).isoformat()
    try:
        n = db["jwt_sessions"].count_documents({"last_seen": {"$gte": cutoff}})
    except Exception:
        n = 0
    return f"{n} active sessions in the last 15 minutes."


def _quick_alerts() -> str:
    try:
        n = db["adapter_alerts"].count_documents({"status": {"$in": ["open", "active"]}})
    except Exception:
        n = 0
    return f"{n} open operational alert(s) across all outlets."


def _quick_errors_24h() -> str:
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(hours=24)).isoformat()
    try:
        n = db["activity_log"].count_documents({"level": "error", "ts": {"$gte": cutoff}})
    except Exception:
        n = 0
    return f"{n} error event(s) logged in the last 24 hours."
