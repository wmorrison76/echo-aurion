# Incident Response Runbook

> The 3am playbook. When something goes wrong, this is what we do.
> Owned by: every on-call engineer. Reviewed quarterly. Tested
> annually via tabletop drill.

---

## The doctrine in one paragraph

> *"When the kitchen is in the weeds, the chef does not panic and
> does not throw the pan. The chef reads the line, makes one
> correct decision, executes, and moves to the next plate. The
> brigade follows. After service, we walk back through every
> plate that came back."*

That's incident response in hospitality language. The technical
version is below.

---

## Severity definitions

| Level | What it means | Examples |
|---|---|---|
| **SEV-1 (Critical)** | Customer's data is at risk OR the platform is unavailable to >25% of customers | Confirmed data breach; production database down; authentication failure for >25% of users; financial-data corruption |
| **SEV-2 (High)** | A customer is materially impacted but the platform broadly works | Single property's POS integration broken for >2 hours; critical pen-test finding actively being exploited; performance regression making a Tier-1 endpoint >5x its SLO |
| **SEV-3 (Medium)** | Functional issue but no customer pain | Failing CI on main; analytics dashboards stale; a Tier-2 endpoint exceeding its SLO |
| **SEV-4 (Low)** | Investigation needed but no urgency | Suspicious-but-unconfirmed log entry; cosmetic UI bug; minor documentation inconsistency |

---

## Roles during a SEV-1 / SEV-2 incident

| Role | What they do | Who fills it |
|---|---|---|
| **Incident Commander (IC)** | Leads the response. Owns priorities and decisions. Single point of accountability. | First on-call engineer to acknowledge, OR the most senior available engineer |
| **Communications Lead (Comms)** | Owns customer + status-page communications. IC delegates so they can focus on the fix. | The person not coding |
| **Forensics Lead (Forensics)** | Captures evidence (logs, dumps, screenshots) before the system is mutated by remediation. Critical for SEV-1 with security implications. | Anyone who can read; ideally the most senior person |
| **Scribe** | Time-stamped notes of every decision, every action, every observation, every Slack message. Source for the post-incident review. | Any non-IC participant |

For SEV-1 incidents, **all four roles must be filled**, even if the
team is small (one person can fill IC + Scribe; another fills Comms
+ Forensics). For SEV-2, IC + Scribe is sufficient.

---

## The first 15 minutes — playbook

### Minute 0 — Trigger

Any of:
  · PagerDuty / on-call alert fires
  · Customer reports a problem via support channel
  · Engineer notices something wrong in logs / metrics
  · The canonical health endpoint (`/api/health`) flips to red

### Minute 0–2 — Acknowledge

  · The on-call engineer acknowledges the alert in PagerDuty
  · Open the incident channel in Slack: `#incident-YYYYMMDD-HHMM`
  · Assign yourself as Incident Commander (or escalate)
  · Post `#status` in the channel with what you know

### Minute 2–5 — Assess severity

  · Hit `/api/health` to check subsystem state
  · Hit `/api/admin/perf/summary` for recent latency / outliers
  · Check the public status page — what does the customer see
    right now?
  · Decide: SEV-1, SEV-2, or below
  · Post severity decision to the channel

### Minute 5–10 — Form the team

For SEV-1:
  · Page additional engineers if needed
  · Designate Comms, Forensics, Scribe (delegate from IC)
  · IC should have NO HANDS ON KEYBOARD — coordinate, don't code

For SEV-2:
  · Bring in one additional engineer if available
  · IC may also be the lead engineer fixing it

### Minute 10–15 — Customer communication

For SEV-1:
  · Comms posts to status page within 15 minutes of acknowledgment:
    *"We are investigating an incident affecting [Tier]. More
    updates in 30 minutes."*
  · Internal: post a brief in `#leadership` channel

For SEV-2:
  · Status page entry within 30 minutes of acknowledgment
  · Internal-only initially; customer-facing if customer-impacting

---

## Common scenarios + first responses

### Scenario A — "A customer reports their data leaked"

**Severity: SEV-1 (until proven otherwise)**

  1. **Stop**. Do not log into the customer's data to "verify."
     Touching the data may invalidate forensic evidence.
  2. **Capture**. Forensics Lead pulls logs from the past 24h:
     `event_bus_store`, `audit_events`, `admin_audit_log`, web
     access logs, the relevant data collection's read history
  3. **Isolate**. Comms Lead alerts the customer with "we are
     investigating; please do not delete anything on your side."
  4. **Diagnose**. IC + lead engineer trace whether:
     · The leak is real (genuine breach)
     · The leak is misperception (customer saw their own data
       and didn't recognize it)
     · The leak is internal (an employee accessed something they
       shouldn't have)
  5. **Mitigate**. Depending on diagnosis: rotate credentials,
     revoke API keys, lock accounts, restore from snapshot
  6. **Communicate**. Within 24 hours of confirming a breach:
     · Notify affected customers in writing
     · Notify regulators if required (GDPR: 72 hours)
     · Update status page
  7. **PIR**. Within 5 business days

### Scenario B — "Production database is down"

**Severity: SEV-1**

  1. Check MongoDB Atlas dashboard / status page
  2. If managed-service issue:
     · Comms Lead posts to status page
     · IC stands by; nothing to do but wait + communicate
  3. If our issue (e.g., bad migration, runaway query):
     · IC stops the offending operation
     · Forensics Lead captures the slow-query log + connection
       pool snapshot
     · Restore from latest snapshot if data integrity is
       compromised
  4. Once recovered, run `/api/backup-verification/drill` to
     confirm append-only invariants hold
  5. PIR

### Scenario C — "Authentication is failing for >25% of users"

**Severity: SEV-1**

  1. Check `/api/health` — is the database OK?
  2. Check the auth provider's status (Auth0, Cognito, custom)
  3. Check session-token signing secret — was it rotated
     recently? Are old tokens being rejected?
  4. If signing secret is the issue: roll back the rotation;
     re-issue new tokens gradually
  5. Comms Lead: status page within 15 min
  6. PIR

### Scenario D — "Pen-test finding actively being exploited"

**Severity: SEV-1**

  1. **Block the attacker** at the WAF layer (Cloudflare)
  2. Lock down any compromised accounts
  3. Forensics Lead captures full log trail; preserve evidence
  4. If data was accessed, treat as a confirmed breach
     (Scenario A)
  5. Patch the vulnerability — ship a hotfix
  6. PIR + a "lessons learned" entry into the next pen-test scope

### Scenario E — "Tier-1 endpoint is >5x SLO"

**Severity: SEV-2**

  1. Check `/api/admin/perf/summary` for the affected endpoint
  2. Check `/api/admin/perf/db-slow-queries` for related slow
     queries
  3. Check `/api/connections/snapshot` for connection-pool
     exhaustion
  4. Common causes:
     · Missing index (recent schema change)
     · Connection leak (rising "in_use" curve)
     · Hot key in capture-event ingestion (one outlet flooding)
     · Upstream dependency slow (POS / weather API)
  5. Mitigate: add missing index, restart pod, throttle hot
     endpoint, fall back to cached data
  6. PIR if downtime > 10 min

### Scenario F — "Employee resigned or was fired"

**Severity: SEV-2 immediate, downgrade after access revocation**

  1. **Within 1 hour of departure:**
     · Revoke SSO access (Google Workspace / Okta)
     · Disable GitHub, AWS, MongoDB Atlas, Vanta, Stripe access
     · Rotate any credentials they had direct knowledge of
     · Disable VPN access (if applicable)
  2. **Within 4 hours:**
     · Forensics review of their last 30 days of admin_audit_log
     · Check for any suspicious downloads or exports
     · Hand laptop to IT / wipe + redeploy
  3. **Within 24 hours:**
     · Re-issue any shared API keys they had access to
     · Update Privacy Tenet 5 endpoint inventory if they had data-access roles
  4. PIR if any anomalous access pattern detected

---

## Post-Incident Review (PIR) template

Within 5 business days of a SEV-1 (or 7 business days of a
SEV-2), publish a PIR. Format:

```markdown
# Post-Incident Review — [Incident ID]

**Severity:** [SEV-1 | SEV-2]
**Started:** [timestamp]
**Detected:** [timestamp]
**Resolved:** [timestamp]
**Time to detection:** [minutes]
**Time to resolution:** [minutes]
**Customer impact:** [brief]

## Summary
[2-3 sentence non-technical summary]

## Timeline
[bullet list with timestamps; one event per line]

## Impact
[customer count, downtime minutes, data loss scope, financial impact]

## Root cause
[the actual technical reason; do NOT name individuals; focus on
the system condition that allowed it]

## Detection
[how we found out; what could have made detection faster]

## Response
[what we did and in what order; what worked, what didn't]

## Resolution
[the fix; commit hash if a code change]

## Lessons learned
[what we would do differently next time]

## Action items
[bulleted list with owner + due date]
- [ ] action item 1 (owner: X, due: Y)
- [ ] action item 2 (owner: X, due: Y)

## Attribution
[doctrine §2.5: focus on the system, not the person — but credit
people who responded well by name; the brigade is interdependent]
```

PIRs are stored in `docs/incidents/PIR-[INCIDENT-ID].md` and
linked from the status page.

---

## Tools + endpoints

| What you need | Where to find it |
|---|---|
| Subsystem health | `GET /api/health` |
| Performance summary | `GET /api/admin/perf/summary` |
| Slow endpoints | `GET /api/admin/perf/endpoints` |
| Slow DB queries | `GET /api/admin/perf/db-slow-queries` |
| Connection pool state | `GET /api/connections/snapshot` |
| Backup verification | `POST /api/backup-verification/drill` |
| Migration history | `GET /api/upgrade/migrations` |
| Recent events | `GET /api/why-changed/drill?entity_type=...` |
| Admin audit log | `GET /api/admin-audit?action=...` |
| Status page | https://status.echoaurion.com |

---

## Annual tabletop drill

Once per year, the team runs a tabletop drill simulating one
SEV-1 scenario from the playbook. The drill:

  · 60-90 minutes
  · IC, Comms, Forensics, Scribe all participate
  · Scenario is read aloud; team responds in real time
  · Facilitator (the most senior person not in any role) injects
    complications ("just got an alert that the DB is also down")
  · Debrief at the end: what worked, what didn't, what to fix in
    the runbook

Tabletop drills are recorded in `docs/incidents/drills/` for
SOC 2 evidence.

---

## Closing

A SEV-1 incident is not a failure of the team. It's a stress
test of the system. The brigade respects the line: read the line,
make the next correct decision, execute, write it down. When the
service is over, we walk back together.

> *"Only you can fail you. After service, we walk back through
> every plate that came back."*

— `THE_LINE.md`
