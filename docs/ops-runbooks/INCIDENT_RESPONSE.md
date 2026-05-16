# Incident Response Runbook

> Last updated: 2026-05-07 · D58
>
> What to do when something breaks at 3am. This runbook is written
> for whoever is on-call, regardless of whether they wrote the code.

## Severity ladder

| Sev | Examples | Wake the human? | Acknowledge by |
|---|---|---|---|
| **SEV-1** | All payroll runs failing · Allergen cascade firing wrong alerts · POS-failover stuck in reconcile loop · Mongo primary down · Guest data exposure detected | YES — page primary | 5 min |
| **SEV-2** | One outlet's KDS not receiving orders · Forecast cron failed last night · One vendor's invoices not extracting | YES — page primary | 30 min |
| **SEV-3** | Slow `/api/echo/correlation/report` · Some inbox notifications delayed · Audit log emit failures (silent fallback engaged) | No — wait for business hours | 4 hours |
| **SEV-4** | Cosmetic UI bug · Outdated translation · Missing icon | No — file ticket | Next business day |

---

## SEV-1 playbook (page-worthy)

### 1. ALLERGEN CASCADE firing wrong alerts (life-safety)

**Symptom:** alerts appearing for guests with no actual allergen overlap, OR no alert when one should fire.

**Immediate steps (≤ 10 minutes):**

1. Confirm the misfire from the audit_log:
   ```
   db.audit_log.find({"kind": /allergen_cascade/, "created_at": {"$gte": "<window>"}})
   ```
2. **Disable the auto-cascade cron** (if running) by flipping the
   `ECHO_FEATURE_ALLERGEN_CASCADE_AUTO` env var to `false` and
   restarting the API workers. The endpoint stays available for
   manual review; only the auto-fire stops.
3. Alert the floor manager at every active outlet via the
   D26 notification fabric: "Allergen cascade auto-fire suspended;
   manual review only until further notice."
4. **Do NOT touch the guest_intelligence collection.** PII sits
   there; any read by the on-call needs a `pass_dev` audience
   token + 4-eyes pairing.
5. Page secondary on-call (engineering lead). Pair-debug from there.

**Postmortem fields required:**
- Time of first misfire (from audit_log)
- Number of misfires
- Did any false alert reach a guest? (No — operator surface only;
  but verify via the D32 alert_emit log)
- Root cause (regex flaw / OCR garble in allergen string / vendor
  taxonomy drift)

### 2. POS-FAILOVER stuck in reconcile loop

**Symptom:** `pos_failover.reconcile_session` running every 60s
without `pos_external_id` ever populating; queue grows.

**Immediate steps:**

1. Suspend the auto-reconcile flag:
   ```bash
   fly secrets set ECHO_POS_AUTO_RECONCILE=false --app <app>
   ```
2. Inspect the most recent failed reconcile in `pos_replay_log`:
   ```
   db.pos_replay_log.find().sort({_id: -1}).limit(20)
   ```
3. The likely cause is the upstream POS rejecting a malformed order.
   Find the rejected `natural_key`, mark it `manual_review_required`
   in `pos_failover_orders`:
   ```
   db.pos_failover_orders.updateOne(
     {natural_key: "<key>"},
     {$set: {status: "manual_review_required",
              note: "stuck in reconcile per INC-<id>"}})
   ```
4. Re-enable auto-reconcile; monitor for 30 minutes.
5. If the loop returns: escalate to the POS vendor (Toast / Aloha /
   Micros) — likely an API-side throttle or schema breaking change.

### 3. Mongo primary unreachable

**Symptom:** `/readyz` returning 503 with `mongo: ok=false`.

**Immediate steps:**

1. Check Atlas dashboard (https://cloud.mongodb.com) for cluster
   alerts. If Atlas auto-failover happened, the secondary became
   primary; client should reconnect within 90s.
2. Drain traffic at the load balancer (Fly.io or your reverse
   proxy) to return 503 instead of 502.
3. If primary is genuinely down (not just failed-over):
   - Roll the API workers (`fly scale count 0 --app <app>; fly
     scale count 4 --app <app>`)
   - That forces fresh DB connections; if the secondary already
     promoted, traffic resumes
4. If Atlas backups have been enabled (per ATLAS_SETUP.md), you
   have point-in-time restore. Don't restore unless data loss is
   confirmed; failover usually suffices.

### 4. Guest data exposure detected

**Symptom:** Cross-tenant data leak (a tenant sees another tenant's
data) OR PII leaking into logs/Sentry.

**Immediate steps:**

1. **Take production read-only NOW** by setting
   `ECHO_READ_ONLY=true` and rolling workers. This stops new
   writes but lets reads continue (so guests aren't disrupted).
2. Capture the exposing request from access logs (don't put the
   leaked content into a ticket — reference by request_id only).
3. Page CEO + CFO immediately. Breach disclosure clocks may be
   running depending on jurisdiction (CCPA, GDPR, state laws).
4. Run the D53.15 tenant isolation contract test suite to confirm
   the boundary held in the modules we tested:
   ```
   cd backend && python tests/test_tenant_isolation_contract.py
   ```
5. Diff the leaking endpoint's `find()` calls vs. the ones with
   tenant_id filter. Suspect the recent commits if a regression.
6. Post a public post-mortem within 48 hours (per Tenet 8 spirit).

---

## SEV-2 playbook (acknowledged but not paged)

### Forecast cron failed last night

1. Check `audit_log` for `kind: /forecast/.../error/`
2. Look at `chronos_forecast` log for the stack trace
3. If it's a single outlet's bad data: rerun manually for that
   outlet; restore the cron at next slot
4. If it's a model bug: roll back the chronos_forecast.py file
   to the prior commit; reopen the PR that introduced the bug

### One outlet's KDS not receiving orders

1. Check `kitchen_routing_outlets` for that outlet's
   default_station entry
2. Check `kitchen_routing_items` mappings
3. If routing config was deleted: restore from the last
   migration backup
4. If the WebSocket / poll is broken: roll the API workers; KDS
   will reconnect

### One vendor's invoices not extracting

1. Run `extract_invoice` against the failing OCR text manually
2. Diff the OCR output against a known-good OCR for the same
   vendor; identify the marker mismatch
3. Update `VENDOR_TEMPLATES` in
   `backend/echo/invoice_extractor.py` with the new marker variant
4. Push as a hotfix PR (vendor-template tuning is safe; always
   additive)

---

## On-call rotation (template — fill in)

| Week | Primary | Secondary | Mon backup |
|---|---|---|---|
| 2026-W19 | TBD | TBD | TBD |
| 2026-W20 | TBD | TBD | TBD |
| 2026-W21 | TBD | TBD | TBD |
| 2026-W22 | TBD | TBD | TBD |

**Pager target:** TBD (PagerDuty / OpsGenie / Pagerly key set in
`ECHO_PAGER_INTEGRATION_KEY` secret)

**Escalation path:**

  primary on-call (5 min) →
  secondary on-call (10 min) →
  engineering lead (20 min) →
  CEO / CTO (30 min)

---

## SLO targets

| Metric | Target | Measurement |
|---|---|---|
| API p99 latency | < 800ms | Sentry / Datadog |
| API uptime | 99.9% (43 min downtime/month) | `/healthz` external probe |
| Allergen alert delivery | < 30 sec end-to-end | D32 audit_log timestamps |
| Payroll run completion | < 5 min for 100 employees | D47 audit_log |
| POS-failover order fan-out | < 1 sec | D33 audit_log |
| Mongo primary failover | < 90 sec | Atlas dashboard |

---

## Doctrine alignment

  · §1.1 transparency: every incident response logs to audit_log
    so the controller can see what was done
  · §2.5 pride from love: post-mortems are blameless. The
    template asks "what made the failure possible," not "who
    caused it."
  · Tenet 8 forbidden persists, never surfaces: leaked data
    in a SEV-1 must be tombstoned within 24 hours per Tenet §7,
    then the disclosure runs its public arc

---

## Post-mortem template

After every SEV-1 / SEV-2, file a post-mortem at
`docs/post-mortems/YYYY-MM-DD-incident-N.md` with:

  1. Timeline (UTC)
  2. Detection (how did we find out)
  3. Impact (users affected, dollars at risk, data exposed if any)
  4. Root cause (what code / config / human decision)
  5. Contributing factors
  6. What worked well
  7. What we'd change
  8. Action items (owner + due date for each)

The blameless framing is non-negotiable. Tom Hill standard:
> "We do not lie to ourselves about what is done. The work is the work."
