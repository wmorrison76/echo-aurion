# Service Level Agreement (SLA)

> **DRAFT TEMPLATE — review with attorney before publishing.**
> Place at `https://echoaurion.com/sla`. Incorporated by reference
> into the Terms of Service.

---

## SERVICE LEVEL AGREEMENT

**Effective Date:** [DATE]

This SLA defines Aurion Holdings, Inc.'s commitments regarding the
availability and performance of the Echo / LUCCCA Services. This
SLA is incorporated by reference into the Terms of Service.

---

### 1. Availability Commitment

Aurion commits to **99.9% Monthly Uptime** for the production
Services, calculated as follows:

```
Uptime % = (Total Minutes - Excluded Minutes - Downtime Minutes)
           ÷ (Total Minutes - Excluded Minutes)
           × 100
```

  · **"Total Minutes"** — the total minutes in the calendar month
  · **"Excluded Minutes"** — see Section 4 (excluded events)
  · **"Downtime Minutes"** — minutes during which any Tier 1
    service tier (see Section 2) is unavailable to Customer

99.9% uptime equals approximately **43.2 minutes** of downtime
per month.

---

### 2. Service Tier Definitions

Per `services/slo.py` in the platform, endpoints are tiered:

  · **Tier 1 — Critical** (money, audit, login, health):
    99.9% availability, p95 < 500ms, p99 < 2000ms
  · **Tier 2 — Standard** (dashboards, lists):
    99.5% availability, p95 < 1000ms, p99 < 4000ms
  · **Tier 3 — Analytic** (cross-property, retrospective, heavy
    aggregation): 99.0% availability, p95 < 5000ms, p99 < 15000ms

Availability commitments above apply to Tier 1. Tier 2 and Tier 3
have their own commitments stated above.

---

### 3. Service Credits

If Aurion fails to meet the Tier 1 99.9% Monthly Uptime
commitment, Customer is entitled to Service Credits as follows:

| Monthly Uptime | Service Credit |
|---|---:|
| ≥ 99.9% | 0% |
| 99.0% – 99.89% | 10% of monthly fee |
| 95.0% – 98.99% | 25% of monthly fee |
| < 95.0% | 50% of monthly fee |

Service Credits are credited against Customer's next invoice. If
the agreement is terminated before that invoice issues, Aurion
will refund the credited amount.

**Customer must request Service Credits within 30 days of the
month-end** by emailing `support@echoaurion.com` with the request
and downtime evidence.

Service Credits are Customer's **sole and exclusive remedy** for
SLA breaches under this Agreement.

---

### 4. Excluded Events

The following are excluded from Downtime calculations:

  · **Scheduled maintenance** announced ≥ 7 days in advance via
    email + status page (typically <2 hours/month, off-peak)
  · **Emergency maintenance** required to fix a critical security
    vulnerability or active attack
  · **Force majeure** events (natural disasters, war, terrorism,
    pandemic, government action)
  · **Customer-caused issues** (misuse of the Services, customer
    network connectivity problems, customer credential issues)
  · **Third-party issues** outside Aurion's reasonable control
    (Customer's POS / PMS / payroll vendor downtime that prevents
    integration; ISP outages; DNS provider outages)
  · **Beta or preview features** explicitly marked as such

---

### 5. Status Page

Aurion maintains a public status page at
**https://status.echoaurion.com** showing:
  · Real-time operational status of every Service tier
  · Open incidents with regular updates
  · Historical uptime data per tier per month
  · Scheduled maintenance windows

---

### 6. Support Levels

| Tier | Available | Response time | Channels |
|---|---|---|---|
| **Critical** (P1 — production down) | 24/7 | 1 hour | Phone + email + status page |
| **High** (P2 — degraded service) | 24/5 (24/7 by Year 2) | 4 hours | Email + status page |
| **Normal** (P3 — non-blocking issue) | Business hours | 24 hours | Email + ticketing |
| **Low** (P4 — feature request, question) | Business hours | 72 hours | Email + ticketing |

---

### 7. Incident Communication

For Tier-1 (Critical) incidents:

  · Initial public acknowledgment on the status page within
    15 minutes of confirmed incident
  · Investigation update every 30 minutes until resolution
  · Post-incident review (PIR) published within 5 business days
    after resolution, available at the status page archive
  · Major-incident PIRs (>2 hours of Tier 1 downtime) emailed
    directly to Customer

---

### 8. Data Backup and Recovery

  · **Backup frequency:** continuous WAL backup + nightly full
    snapshot
  · **Backup retention:** 35 days for nightly snapshots, 7 days for
    point-in-time recovery
  · **Recovery Point Objective (RPO):** ≤ 1 hour (data loss in
    a worst-case recovery)
  · **Recovery Time Objective (RTO):** ≤ 4 hours for the
    production cluster
  · **DR drill cadence:** quarterly, with results published to the
    status page incident archive

---

### 9. Performance Commitments

In addition to availability, Aurion commits to the following
performance targets, measured at the API edge:

| Tier | p95 latency target | p99 latency target |
|---|---:|---:|
| Tier 1 | 500 ms | 2,000 ms |
| Tier 2 | 1,000 ms | 4,000 ms |
| Tier 3 | 5,000 ms | 15,000 ms |

Performance is monitored continuously per `services/slo.py` and
made visible in the platform's `/api/slo/dashboard` endpoint.

---

### 10. Limitations

This SLA does not apply to:

  · Beta, preview, or pre-release features
  · Customer's sandbox or demo environments
  · One-off custom integrations or professional services
  · Free or trial accounts

---

### 11. Modification

Aurion may modify this SLA with 30 days' written notice. Material
adverse changes give Customer the right to terminate the
underlying agreement for convenience without penalty.

---

### 12. Contact

  · **Status updates:** https://status.echoaurion.com
  · **SLA inquiries:** support@echoaurion.com
  · **Service Credit requests:** billing@echoaurion.com

---

End of Service Level Agreement.
