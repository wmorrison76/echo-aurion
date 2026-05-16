"""
ZARO Guardian Safety Layer — Red Phoenix
==========================================
Military-grade operational safety monitor for the LUCCCA Enterprise platform.
Always-on sentinel that watches for critical operational red flags and
automatically escalates alerts through the governance chain.

5 Guardian Subsystems (adapted from the original ZARO architecture):
  1. SENTINEL — Intrusion Detection & Prevention (SQL injection, XSS, API abuse)
  2. AEGIS — Data Protection & PII Shield (sensitive data detection, redaction)
  3. CERBERUS — Authentication & Access Guard (brute force, session hijack)
  4. HEIMDALL — Observability & Anomaly Detection (traffic patterns, latency)
  5. VALKYRIE — Incident Response & Auto-Recovery (escalation, containment)

RED PHOENIX — Cross-cutting alert escalation that auto-generates corrective
action plans and pushes through the governance chain.
"""
import re
import time
import hashlib
from datetime import datetime, timezone
from uuid import uuid4
from collections import defaultdict
from typing import Optional
from fastapi import APIRouter, Request
from pydantic import BaseModel

import database
from tamper_audit import log_entry as trace_log

db = database.db
router = APIRouter(prefix="/api/zaro", tags=["zaro-guardian"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: uuid4().hex[:12]


# ═══════════════════════════════════════════════
# SENTINEL — Intrusion Detection & Prevention
# ═══════════════════════════════════════════════

ATTACK_SIGNATURES = {
    "sql_injection": [
        re.compile(r"(\bunion\b.*\bselect\b)|(\bselect\b.*\bfrom\b.*\bwhere\b)", re.I),
        re.compile(r"('\s*or\s*'1'\s*=\s*'1)|('\s*or\s*1\s*=\s*1)", re.I),
        re.compile(r";\s*drop\s+table", re.I),
        re.compile(r"exec\s*\(", re.I),
    ],
    "xss": [
        re.compile(r"<script[^>]*>.*</script>", re.I),
        re.compile(r"javascript:", re.I),
        re.compile(r"onerror\s*=", re.I),
        re.compile(r"onload\s*=", re.I),
        re.compile(r"<iframe", re.I),
    ],
    "path_traversal": [
        re.compile(r"\.\./"),
        re.compile(r"\.\.%2[fF]"),
        re.compile(r"%2e%2e"),
    ],
    "command_injection": [
        re.compile(r";\s*cat\s+/etc/passwd", re.I),
        re.compile(r"\|\s*nc\s+-", re.I),
        re.compile(r"&&\s*wget", re.I),
        re.compile(r"`.*`"),
        re.compile(r"\$\(.*\)"),
    ],
    "xxe": [
        re.compile(r"<!ENTITY.*SYSTEM", re.I),
        re.compile(r"<!DOCTYPE.*\[", re.I),
    ],
}


class SentinelGuardian:
    """Intrusion Detection & Prevention System."""

    def __init__(self):
        self.blocked_ips: set = set()
        self.ip_strikes: dict = defaultdict(int)

    def scan_payload(self, payload: str) -> list:
        """Scan input for attack signatures."""
        detections = []
        for attack_type, patterns in ATTACK_SIGNATURES.items():
            for pattern in patterns:
                if pattern.search(payload):
                    detections.append({
                        "type": attack_type,
                        "severity": "critical",
                        "pattern": pattern.pattern[:60],
                        "detected_at": _now(),
                    })
        return detections

    def analyze_request(self, ip: str, path: str, method: str, body: str = "", headers: dict = None) -> dict:
        """Full request analysis."""
        threats = []

        # Check blocked IPs
        if ip in self.blocked_ips:
            return {"allowed": False, "threats": [{"type": "blocked_ip", "severity": "critical"}], "threat_level": "CRITICAL"}

        # Scan URL path
        path_threats = self.scan_payload(path)
        threats.extend(path_threats)

        # Scan body
        if body:
            body_threats = self.scan_payload(body)
            threats.extend(body_threats)

        # Detect user-agent anomalies
        ua = (headers or {}).get("user-agent", "")
        if not ua or len(ua) < 5:
            threats.append({"type": "missing_user_agent", "severity": "low"})
        suspicious_agents = ["sqlmap", "nikto", "nmap", "dirbuster", "gobuster", "burp"]
        if any(s in ua.lower() for s in suspicious_agents):
            threats.append({"type": "malicious_tool", "severity": "high", "tool": ua[:50]})

        # Strike tracking
        if threats:
            self.ip_strikes[ip] += len(threats)
            if self.ip_strikes[ip] >= 10:
                self.blocked_ips.add(ip)
                threats.append({"type": "ip_auto_blocked", "severity": "critical", "strikes": self.ip_strikes[ip]})

        threat_level = "CLEAR"
        if any(t["severity"] == "critical" for t in threats):
            threat_level = "CRITICAL"
        elif any(t["severity"] == "high" for t in threats):
            threat_level = "HIGH"
        elif any(t["severity"] == "medium" for t in threats):
            threat_level = "MEDIUM"
        elif threats:
            threat_level = "LOW"

        return {
            "allowed": threat_level not in ("CRITICAL",),
            "threats": threats,
            "threat_level": threat_level,
            "ip": ip,
            "strikes": self.ip_strikes.get(ip, 0),
        }


sentinel = SentinelGuardian()


# ═══════════════════════════════════════════════
# AEGIS — Data Protection & PII Shield
# ═══════════════════════════════════════════════

PII_PATTERNS = {
    "ssn": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "credit_card": re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b"),
    "email": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"),
    "phone": re.compile(r"\b(?:\+1[-.]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"),
    "ip_address": re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),
}

SENSITIVE_FIELDS = {
    "password", "secret", "token", "api_key", "credit_card", "ssn",
    "social_security", "bank_account", "routing_number", "cvv",
    "pin", "salary", "compensation", "bonus",
}


class AegisGuardian:
    """Data Protection & PII Shield."""

    def scan_for_pii(self, text: str) -> list:
        """Detect PII in text."""
        findings = []
        for pii_type, pattern in PII_PATTERNS.items():
            matches = pattern.findall(text)
            if matches:
                findings.append({
                    "type": pii_type,
                    "count": len(matches),
                    "severity": "high" if pii_type in ("ssn", "credit_card") else "medium",
                    "action": "REDACT",
                })
        return findings

    def check_sensitive_fields(self, data: dict) -> list:
        """Check if sensitive fields are being exposed."""
        findings = []
        for key in data:
            if key.lower() in SENSITIVE_FIELDS:
                findings.append({
                    "field": key,
                    "severity": "critical",
                    "action": "MASK — field should never appear in API response",
                })
        return findings

    def redact_pii(self, text: str) -> str:
        """Redact PII from text."""
        redacted = text
        for pii_type, pattern in PII_PATTERNS.items():
            redacted = pattern.sub(f"[REDACTED_{pii_type.upper()}]", redacted)
        return redacted


aegis = AegisGuardian()


# ═══════════════════════════════════════════════
# CERBERUS — Authentication & Access Guard
# ═══════════════════════════════════════════════

class CerberusGuardian:
    """Authentication & Access Guard."""

    def __init__(self):
        self.failed_logins: dict = defaultdict(list)
        self.locked_accounts: set = set()

    def record_failed_login(self, identifier: str, ip: str):
        """Track failed login attempts."""
        now = time.time()
        self.failed_logins[identifier] = [t for t in self.failed_logins[identifier] if t > now - 900]
        self.failed_logins[identifier].append(now)

        if len(self.failed_logins[identifier]) >= 5:
            self.locked_accounts.add(identifier)
            return {"locked": True, "attempts": len(self.failed_logins[identifier]), "lockout_minutes": 15}
        return {"locked": False, "attempts": len(self.failed_logins[identifier]), "remaining": 5 - len(self.failed_logins[identifier])}

    def check_lockout(self, identifier: str) -> bool:
        """Check if account is locked."""
        if identifier in self.locked_accounts:
            now = time.time()
            recent = [t for t in self.failed_logins.get(identifier, []) if t > now - 900]
            if not recent:
                self.locked_accounts.discard(identifier)
                return False
            return True
        return False

    def get_auth_status(self) -> dict:
        now = time.time()
        active_lockouts = len(self.locked_accounts)
        recent_failures = sum(len([t for t in v if t > now - 900]) for v in self.failed_logins.values())
        return {
            "active_lockouts": active_lockouts,
            "recent_failed_logins": recent_failures,
            "locked_accounts": list(self.locked_accounts),
        }


cerberus = CerberusGuardian()


# ═══════════════════════════════════════════════
# HEIMDALL — Observability & Anomaly Detection
# ═══════════════════════════════════════════════

class HeimdallGuardian:
    """Observability & Anomaly Detection."""

    def __init__(self):
        self.request_log: list = []
        self.endpoint_stats: dict = defaultdict(lambda: {"count": 0, "errors": 0, "total_ms": 0})
        self.anomaly_log: list = []

    def track_request(self, method: str, path: str, status: int, duration_ms: float, ip: str):
        """Track request for anomaly detection."""
        entry = {"method": method, "path": path, "status": status, "duration_ms": duration_ms, "ip": ip, "ts": time.time()}
        self.request_log.append(entry)
        # Keep last 1000
        if len(self.request_log) > 1000:
            self.request_log = self.request_log[-1000:]

        key = f"{method}:{path}"
        self.endpoint_stats[key]["count"] += 1
        self.endpoint_stats[key]["total_ms"] += duration_ms
        if status >= 400:
            self.endpoint_stats[key]["errors"] += 1

        # Anomaly detection
        anomalies = []
        if duration_ms > 5000:
            anomalies.append({"type": "slow_response", "severity": "medium", "value": f"{duration_ms:.0f}ms", "threshold": "5000ms"})
        if status >= 500:
            anomalies.append({"type": "server_error", "severity": "high", "status": status, "endpoint": path})

        # Burst detection (>50 requests from same IP in 60s)
        now = time.time()
        recent_from_ip = sum(1 for r in self.request_log[-200:] if r["ip"] == ip and r["ts"] > now - 60)
        if recent_from_ip > 50:
            anomalies.append({"type": "request_burst", "severity": "high", "ip": ip, "count_60s": recent_from_ip})

        if anomalies:
            for a in anomalies:
                a["detected_at"] = _now()
            self.anomaly_log.extend(anomalies)
            if len(self.anomaly_log) > 500:
                self.anomaly_log = self.anomaly_log[-500:]

        return anomalies

    def get_observability(self) -> dict:
        now = time.time()
        recent = [r for r in self.request_log if r["ts"] > now - 300]
        errors_5m = sum(1 for r in recent if r["status"] >= 400)
        avg_ms = round(sum(r["duration_ms"] for r in recent) / max(len(recent), 1), 1)

        # Top endpoints by traffic
        ep_sorted = sorted(self.endpoint_stats.items(), key=lambda x: x[1]["count"], reverse=True)[:10]

        return {
            "requests_5min": len(recent),
            "errors_5min": errors_5m,
            "error_rate_pct": round(errors_5m / max(len(recent), 1) * 100, 1),
            "avg_response_ms": avg_ms,
            "total_tracked": len(self.request_log),
            "recent_anomalies": self.anomaly_log[-20:],
            "top_endpoints": [{"endpoint": k, **v, "avg_ms": round(v["total_ms"] / max(v["count"], 1), 1)} for k, v in ep_sorted],
        }


heimdall = HeimdallGuardian()


# ═══════════════════════════════════════════════
# VALKYRIE — Incident Response & Auto-Recovery
# ═══════════════════════════════════════════════

class ValkyrieGuardian:
    """Incident Response & Auto-Recovery."""

    def __init__(self):
        self.incidents: list = []
        self.containment_actions: list = []

    def create_incident(self, threat_level: str, source: str, details: dict) -> dict:
        """Create a security incident with auto-response."""
        incident_id = f"INC-{_uid()}"
        severity = "P1" if threat_level == "CRITICAL" else "P2" if threat_level == "HIGH" else "P3" if threat_level == "MEDIUM" else "P4"

        # Auto-generate corrective action plan
        actions = []
        if threat_level == "CRITICAL":
            actions = [
                "IMMEDIATE: Block source IP",
                "CONTAIN: Isolate affected endpoints",
                "INVESTIGATE: Review last 100 requests from source",
                "NOTIFY: Escalate to GM and Security Officer",
                "REMEDIATE: Patch vulnerability if confirmed",
            ]
        elif threat_level == "HIGH":
            actions = [
                "MONITOR: Increase logging for source IP",
                "INVESTIGATE: Review request patterns",
                "NOTIFY: Alert Security Officer",
                "REMEDIATE: Apply rate limiting if needed",
            ]
        elif threat_level == "MEDIUM":
            actions = [
                "LOG: Record event for trend analysis",
                "MONITOR: Watch for escalation",
                "REVIEW: Check in daily security briefing",
            ]
        else:
            actions = ["LOG: Record for awareness"]

        incident = {
            "incident_id": incident_id,
            "severity": severity,
            "threat_level": threat_level,
            "source": source,
            "details": details,
            "corrective_actions": actions,
            "status": "open",
            "created_at": _now(),
            "auto_contained": threat_level == "CRITICAL",
        }

        self.incidents.append(incident)
        if len(self.incidents) > 200:
            self.incidents = self.incidents[-200:]

        # Store in DB
        db["zaro_incidents"].insert_one({**incident})

        # Log to TraceLedger
        trace_log(
            event_type="security_incident",
            entity_type="zaro_guardian",
            entity_id=incident_id,
            actor_id="valkyrie",
            metadata={"severity": severity, "threat_level": threat_level, "source": source},
        )

        return incident

    def get_incidents(self, limit: int = 20) -> list:
        incidents = list(db["zaro_incidents"].find({}, {"_id": 0}).sort("created_at", -1).limit(limit))
        return incidents


valkyrie = ValkyrieGuardian()


# ═══════════════════════════════════════════════
# RED PHOENIX — Alert Escalation Engine
# ═══════════════════════════════════════════════

class RedPhoenix:
    """Cross-cutting alert escalation engine.
    Watches for operational red flags and auto-escalates."""

    def scan_operational_threats(self) -> list:
        """Scan all operational data for red flags."""
        alerts = []

        # 1. Food safety — temperature violations
        checklists = list(db["compliance_checklists"].find({"status": "failed"}, {"_id": 0}).limit(10))
        overdue = list(db["compliance_checklists"].find({"status": "overdue"}, {"_id": 0}).limit(10))
        if checklists:
            alerts.append({
                "category": "food_safety",
                "severity": "critical",
                "signal": f"{len(checklists)} failed compliance checklists — potential food safety violation",
                "corrective_action": "Immediate re-inspection required. Halt production in affected area until clearance.",
                "escalate_to": ["exec_chef", "gm"],
            })
        if overdue:
            alerts.append({
                "category": "compliance",
                "severity": "high",
                "signal": f"{len(overdue)} overdue compliance checklists",
                "corrective_action": "Complete all overdue inspections within 24 hours. Schedule make-up inspections.",
                "escalate_to": ["director"],
            })

        # 2. Financial threshold breaches
        gl = list(db["gl_entries"].find({}, {"_id": 0}).limit(200))
        total_rev = sum(e.get("amount", 0) for e in gl if e.get("entry_type") == "revenue")
        food_cost = sum(e.get("amount", 0) for e in gl if "food" in e.get("gl_name", "").lower() and e.get("entry_type") == "expense")
        labor_cost = sum(s.get("total_cost", 0) for s in db["labor_schedules"].find({}, {"_id": 0}).limit(200))

        if total_rev > 0:
            fc_pct = round(food_cost / total_rev * 100, 1)
            if fc_pct > 28:
                alerts.append({
                    "category": "financial",
                    "severity": "critical",
                    "signal": f"Food cost at {fc_pct}% — exceeds 28% critical threshold",
                    "corrective_action": "Emergency menu engineering review. Audit vendor contracts. Verify portioning standards.",
                    "escalate_to": ["controller", "gm"],
                })
            elif fc_pct > 22:
                alerts.append({
                    "category": "financial",
                    "severity": "high",
                    "signal": f"Food cost at {fc_pct}% — exceeds 22% warning threshold",
                    "corrective_action": "Review menu pricing and waste reports. Schedule vendor meeting.",
                    "escalate_to": ["exec_chef"],
                })

            lc_pct = round(labor_cost / total_rev * 100, 1)
            if lc_pct > 38:
                alerts.append({
                    "category": "financial",
                    "severity": "critical",
                    "signal": f"Labor cost at {lc_pct}% — exceeds 38% critical threshold",
                    "corrective_action": "Immediate schedule audit. Freeze new hires. Review overtime authorization.",
                    "escalate_to": ["controller", "gm"],
                })
            elif lc_pct > 32:
                alerts.append({
                    "category": "financial",
                    "severity": "high",
                    "signal": f"Labor cost at {lc_pct}% — exceeds 32% warning threshold",
                    "corrective_action": "Review scheduling efficiency. Implement cross-training to reduce overtime.",
                    "escalate_to": ["director"],
                })

        # 3. Inventory critical
        ingredients = list(db["ingredients"].find({}, {"_id": 0}).limit(200))
        critical_items = [i for i in ingredients if i.get("current_stock", 0) == 0]
        below_par = [i for i in ingredients if 0 < i.get("current_stock", 0) < i.get("par_level", 10)]
        if critical_items:
            alerts.append({
                "category": "inventory",
                "severity": "critical",
                "signal": f"{len(critical_items)} ingredients at ZERO stock — immediate stockout risk",
                "corrective_action": f"Emergency order required: {', '.join(i.get('name','?') for i in critical_items[:5])}",
                "escalate_to": ["exec_chef", "purchasing"],
            })
        if len(below_par) > 10:
            alerts.append({
                "category": "inventory",
                "severity": "high",
                "signal": f"{len(below_par)} items below par level — event prep at risk",
                "corrective_action": "Generate emergency purchase orders. Verify delivery timelines.",
                "escalate_to": ["purchasing"],
            })

        # 4. Open corrective actions
        open_ca = db["corrective_actions"].count_documents({"status": "open"})
        if open_ca > 10:
            alerts.append({
                "category": "compliance",
                "severity": "high",
                "signal": f"{open_ca} open corrective actions — compliance backlog growing",
                "corrective_action": "Assign owners and deadlines to all open corrective actions within 48 hours.",
                "escalate_to": ["director"],
            })

        # 5. Security incidents
        recent_incidents = list(db["zaro_incidents"].find(
            {"status": "open", "severity": {"$in": ["P1", "P2"]}}, {"_id": 0}
        ).sort("created_at", -1).limit(5))
        if recent_incidents:
            alerts.append({
                "category": "security",
                "severity": "critical" if any(i["severity"] == "P1" for i in recent_incidents) else "high",
                "signal": f"{len(recent_incidents)} open security incidents (P1/P2)",
                "corrective_action": "Review and resolve all open security incidents. Implement recommended containment.",
                "escalate_to": ["gm"],
            })

        return alerts


red_phoenix = RedPhoenix()


# ═══════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════

@router.get("/status")
async def guardian_status():
    """Get full ZARO Guardian system status."""
    obs = heimdall.get_observability()
    auth = cerberus.get_auth_status()
    incident_count = db["zaro_incidents"].count_documents({"status": "open"})

    return {
        "system": "ZARO Guardian — Red Phoenix",
        "status": "ACTIVE",
        "guardians": {
            "sentinel": {"status": "active", "blocked_ips": len(sentinel.blocked_ips), "total_strikes": sum(sentinel.ip_strikes.values())},
            "aegis": {"status": "active", "pii_patterns": len(PII_PATTERNS), "sensitive_fields": len(SENSITIVE_FIELDS)},
            "cerberus": {"status": "active", **auth},
            "heimdall": {"status": "active", "requests_tracked": obs["total_tracked"], "anomalies": len(obs["recent_anomalies"])},
            "valkyrie": {"status": "active", "open_incidents": incident_count},
        },
        "red_phoenix": "ACTIVE",
        "threat_level": "CLEAR" if incident_count == 0 else "ELEVATED",
        "timestamp": _now(),
    }


@router.get("/scan")
async def red_phoenix_scan():
    """Run a Red Phoenix operational threat scan."""
    alerts = red_phoenix.scan_operational_threats()

    # Categorize
    critical = [a for a in alerts if a["severity"] == "critical"]
    high = [a for a in alerts if a["severity"] == "high"]
    medium = [a for a in alerts if a["severity"] == "medium"]

    defcon = 1 if len(critical) > 2 else 2 if critical else 3 if high else 4 if medium else 5

    return {
        "defcon_level": defcon,
        "total_alerts": len(alerts),
        "critical": len(critical),
        "high": len(high),
        "medium": len(medium),
        "alerts": alerts,
        "defcon_label": {1: "MAXIMUM ALERT", 2: "CRITICAL", 3: "ELEVATED", 4: "GUARDED", 5: "NOMINAL"}[defcon],
        "timestamp": _now(),
    }


class ScanPayloadRequest(BaseModel):
    payload: str


@router.post("/sentinel/scan")
async def sentinel_scan(req: ScanPayloadRequest):
    """Scan a payload for attack signatures."""
    detections = sentinel.scan_payload(req.payload)
    return {
        "clean": len(detections) == 0,
        "detections": detections,
        "scanned_length": len(req.payload),
        "timestamp": _now(),
    }


@router.post("/aegis/scan-pii")
async def aegis_scan(req: ScanPayloadRequest):
    """Scan text for PII exposure."""
    findings = aegis.scan_for_pii(req.payload)
    redacted = aegis.redact_pii(req.payload)
    return {
        "has_pii": len(findings) > 0,
        "findings": findings,
        "redacted_text": redacted,
        "timestamp": _now(),
    }


@router.get("/heimdall/observability")
async def heimdall_observability():
    """Get system observability metrics and anomalies."""
    return {**heimdall.get_observability(), "timestamp": _now()}


@router.get("/incidents")
async def list_incidents(status: str = "", limit: int = 20):
    """List security incidents."""
    query = {}
    if status:
        query["status"] = status
    incidents = list(db["zaro_incidents"].find(query, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"incidents": incidents, "count": len(incidents)}


@router.get("/security-posture")
async def security_posture():
    """Get comprehensive security posture assessment."""
    obs = heimdall.get_observability()
    auth = cerberus.get_auth_status()
    alerts = red_phoenix.scan_operational_threats()
    incident_count = db["zaro_incidents"].count_documents({"status": "open"})

    # Score calculation
    base_score = 100
    deductions = 0
    deductions += min(20, incident_count * 5)  # Open incidents
    deductions += min(15, auth["active_lockouts"] * 5)  # Lockouts
    deductions += min(10, obs["error_rate_pct"])  # Error rate
    deductions += min(20, len([a for a in alerts if a["severity"] == "critical"]) * 10)
    deductions += min(10, len([a for a in alerts if a["severity"] == "high"]) * 3)
    deductions += min(5, len(sentinel.blocked_ips) * 2)

    score = max(0, base_score - deductions)

    return {
        "security_score": score,
        "grade": "A+" if score >= 95 else "A" if score >= 90 else "B" if score >= 80 else "C" if score >= 70 else "D" if score >= 60 else "F",
        "components": {
            "intrusion_detection": "ACTIVE" if not sentinel.blocked_ips else f"ALERT — {len(sentinel.blocked_ips)} blocked IPs",
            "data_protection": "ACTIVE",
            "authentication": "CLEAR" if auth["active_lockouts"] == 0 else f"ALERT — {auth['active_lockouts']} lockouts",
            "observability": "NOMINAL" if obs["error_rate_pct"] < 5 else "ELEVATED",
            "incident_response": "CLEAR" if incident_count == 0 else f"{incident_count} OPEN",
        },
        "operational_alerts": len(alerts),
        "blocked_threats": len(sentinel.blocked_ips),
        "timestamp": _now(),
    }
