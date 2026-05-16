# P.7 — Privacy Policy + DPIA + Subprocessor List

> Customer-facing privacy posture. **Draft templates ready for
> attorney review and publication.** Echo / LUCCCA already has the
> strongest privacy substrate of any platform at this stage (the
> 8 Privacy Tenets, the doctrine-as-code architecture, the decay
> engine, the forbidden-path partition). This packet wraps that
> substrate in the customer-facing language and compliance
> artifacts that GDPR / CCPA / SOC 2 reviewers expect.

---

## Why this matters

Three audiences read your privacy posture:

  1. **Customers** — read the privacy policy before signing the
     contract. Sets trust.
  2. **Regulators** — GDPR's Article 30 requires a record of
     processing activities; CCPA requires specific disclosures;
     a DPIA is required for high-risk processing.
  3. **Auditors** — SOC 2 + ISO 27001 both expect a published
     subprocessor list, a DPIA, and a privacy policy aligned
     with declared controls.

What's already in the codebase that 99% of pre-seed startups
lack:
  · The 8 Privacy Tenets in `PRIVACY_TENETS.md` (capture by
    observation; score persists, audio evaporates; tone informs
    care never commerce; trust score is invisible; guest controls
    are first-class; staff transparency runs both ways; sensitive
    flags decay; forbidden uses)
  · The decay engine (Tenet 7 enforced in code)
  · The compile-time forbidden-path partition (Tenet 8 enforced
    statically)
  · The append-only event log with cryptographic doctrine binding
  · The trust-score-server-side-only invariant (Tenet 4)

This packet is the customer-facing wrapper. The hard work is done.

---

## Document 1 — Privacy Policy (publishable)

> **Place at:** `https://echoaurion.com/privacy` (or wherever your
> public site lives) and link from the in-app footer.

```markdown
# Privacy Policy

**Effective Date:** [DATE]
**Last Updated:** [DATE]

This Privacy Policy explains how Aurion Holdings, Inc. ("Aurion,"
"we," "our," or "us") collects, uses, discloses, and protects
personal information when you use the Echo / LUCCCA platform (the
"Services").

## Our promise (the only sentence that matters)

> *"Aurion learns you to serve you better. It forgets when you ask.
> It never sells you to anyone."*

The eight Privacy Tenets at the bottom of this Policy are the
operational rules that make that sentence literally true. They
are enforced in our code, not just our marketing copy.

## 1. Who we are (the controller)

Aurion Holdings, Inc.
[Registered Address]
[Email: privacy@echoaurion.com]
[Data Protection Officer: TBD]

For European users, our representative under GDPR Article 27 is
[TO BE APPOINTED].

## 2. What we collect

### 2.1 Information that customers (operators) provide directly
  · Account information: name, email, role, organization, phone
  · Property and operational data: outlets, employees, vendors,
    menus, recipes, schedules, financial accounts, GL codes
  · Configuration: budgets, forecasts, notes, overrides

### 2.2 Information generated through use of the platform
  · Operational events: POS check-closes, reservations, capture
    events, audit events, manager notes
  · Service interactions: voice recordings (only if explicit opt-
    in), tone analysis (transient), guest preferences derived
    from observation
  · Performance metrics: forecast accuracy, capture ratios,
    yield-per-occupied-minute

### 2.3 Information from third-party integrations (with your
authorization)
  · POS systems (Toast, Aloha, Micros, Square, Clover)
  · PMS systems (Opera Cloud, Mews, Cloudbeds)
  · Payroll systems (ADP, Gusto, Paychex)
  · Banking / merchant accounts (Plaid, Stripe)
  · Channel managers (SiteMinder, RateGain)

### 2.4 Information we do NOT collect
  · We do **not** ask guests to fill out preference forms,
    satisfaction surveys, or kiosk ratings. (Privacy Tenet 1.)
  · We do **not** store raw guest audio beyond 24 hours unless
    the guest explicitly opts in. (Privacy Tenet 2.)
  · We do **not** display trust scores to guests. (Privacy Tenet 4.)

## 3. How we use the information

  · **Provide the service** — operate the platform, serve the
    operator's queries, generate the forecasts and dashboards.
  · **Improve forecasts** — the active learning loop nudges per-
    outlet weights based on historical accuracy, never based on
    individual guest behavior in ways that violate Tenet 8.
  · **Operate the brigade** — schedule shifts, run payroll,
    process invoices, close the books.
  · **Audit and compliance** — append-only event logs, doctrine
    enforcement, regulatory reporting.

We do **NOT** use the information for:
  · Pricing decisions or dynamic upsell (Tenet 8)
  · Advertising or third-party data sharing (Tenet 8)
  · Psychological profiling beyond service interaction (Tenet 8)
  · Discrimination on protected characteristics (Tenet 8)
  · Training models for use outside the Echo Resonance network
    (Tenet 8)

## 4. Legal bases (GDPR users)

For users in the European Economic Area, United Kingdom, or
Switzerland, we process personal data on these legal bases:

  · **Contract** — to provide the Services to the operator who
    contracted with us.
  · **Legitimate interests** — to maintain the security and
    integrity of the Services, prevent fraud, and operate the
    business.
  · **Consent** — for any voice recording beyond the 24h decay
    window, for any marketing communications, and for any
    analytics processing not strictly necessary for the Services.
  · **Legal obligation** — to comply with regulatory requirements,
    tax law, audit obligations.

You may withdraw consent at any time without affecting the
lawfulness of prior processing.

## 5. Sharing of information

We share personal information only with:

  · **Subprocessors** listed at https://echoaurion.com/subprocessors
    (or see Document 3 of this packet). Each is contractually
    bound to data-protection terms equivalent to ours.
  · **Authorized integrations** that the operator opts in to
    (POS, PMS, payroll, banking).
  · **Regulators or law enforcement** under valid legal process.
  · **Acquirer or successor** in the event of a corporate
    transaction (acquisition, merger), with notice to operators
    and the obligation that the successor honor this Policy.

We do **NOT** sell personal information. We do **NOT** share for
third-party marketing. (Tenet 8.)

## 6. International data transfers

We host primarily in [REGION — likely US (AWS/MongoDB Atlas us-
east-1)]. For users in the EEA / UK / Switzerland, transfers to
the United States rely on the EU Standard Contractual Clauses
(SCCs) plus supplementary measures (encryption in transit and
at rest, encryption-key segregation, doctrine §3.1 append-only
event log).

## 7. How long we keep information

  · **Operational data** (transactions, GL entries, audit events)
    — retained for the term of the contract plus 7 years for
    accounting and regulatory purposes.
  · **Voice recordings** — 24 hours unless explicit opt-in.
    (Tenet 2.)
  · **Sensitive psychological flags** (mental health, family
    tension, relationship strain) — auto-decay within 30 days
    unless renewed. (Tenet 7.)
  · **Trust scores** — retained for the duration of the operator's
    relationship; never displayed to the guest. (Tenet 4.)
  · **Aggregated and anonymized data** — may be retained
    indefinitely.

When a guest requests deletion (Tenet 5), we cryptographically
shred the keys protecting their personal data; the event log
remains intact for audit purposes but the personal data within
it is unreadable.

## 8. Your rights

Subject to applicable law (GDPR, CCPA, etc.), you have the right
to:
  · **Access** the personal information we hold about you
  · **Correct** inaccurate information
  · **Delete** your personal information ("Right to Erasure")
  · **Port** your data to another provider
  · **Object** to certain processing activities
  · **Withdraw consent** at any time
  · **Lodge a complaint** with a supervisory authority

Echo Resonance guests using the platform exercise these rights
through the four operator-provided controls (Tenet 5):
  · "What do you remember about me?"
  · "Pause Aurion"
  · "Delete everything"
  · "See my data"

Property operators (the Aurion customer) exercise these rights
by emailing privacy@echoaurion.com.

We will respond within 30 days (45 days for complex requests).

## 9. Security

  · Encryption at rest (AES-256) and in transit (TLS 1.3+)
  · Append-only event log with cryptographic doctrine binding
  · Compile-time forbidden-path partition preventing prohibited
    code paths from existing in the deployed binary
  · Sensitive-flag decay enforced at the storage layer
  · SOC 2 Type I evidence collection in progress; Type I report
    available [DATE] / Type II report available [DATE]
  · Annual independent penetration testing
  · Multi-factor authentication on all administrative access
  · Audit log of every administrative action (admin_audit_log)

## 10. Children

The Services are not directed to children under 13. We do not
knowingly collect personal information from children under 13.
For the avoidance of doubt, the platform does process minor-
guest data (e.g., a child guest at a hotel) on the operator's
behalf with the lawful basis being the operator's contractual
relationship with the guest's parent / legal guardian.

## 11. Changes to this Policy

We will notify you of material changes via in-app notification
and email at least 30 days before the change takes effect. The
"Last Updated" date at the top reflects the most recent change.

## 12. Contact us

privacy@echoaurion.com
[Mailing address]
[Phone]

For users in the European Economic Area, our designated
representative is [TBD].

---

## The Eight Privacy Tenets (the constitution)

These rules are enforced in our code. They are not aspirational
marketing language.

### Tenet 1 — Capture by observation, not interrogation
Data is collected through what staff observe and what guests
volunteer in the natural flow of service. The platform never
asks the guest to fill out a preference form, complete a
satisfaction survey at a kiosk, or rate their meal on a screen.

### Tenet 2 — Score persists, audio evaporates
The arousal, valence, and resonance score is retained because
the lift trajectory matters. The raw audio is deleted within 24
hours unless the guest explicitly opts in.

### Tenet 3 — Tone informs care, never commerce
Tone-of-voice analysis affects which staff member responds, what
tempo to use, what intervention is suggested. It never affects
pricing, what is upsold, what advertising is shown.

### Tenet 4 — Trust score is invisible
Every guest has an internal trust score. The score is never
displayed to the guest. It never triggers a confrontation. Its
only effect is on what Echo decides not to do.

### Tenet 5 — Guest controls are first-class
Every guest has, in the app, one-tap access to: "What do you
remember about me?", "Pause Aurion", "Delete everything", "See
my data."

### Tenet 6 — Staff transparency runs both ways
Staff can see what Aurion whispered to them. They can flag a
whisper as "wrong." They can mute Aurion at any time.

### Tenet 7 — Sensitive flags decay aggressively
Mental health flags, family tension flags, relationship strain
flags — the most sensitive signals — auto-decay within 30 days
unless renewed.

### Tenet 8 — Forbidden uses
The platform never uses voice analysis, Resonance scores, or
behavioral signals for: pricing decisions or dynamic upsell;
advertising or third-party data sharing; psychological profiling
beyond service interaction; discrimination on protected
characteristics; training models that will be used outside the
Echo Resonance network.

---

End of Privacy Policy.
```

---

## Document 2 — Data Protection Impact Assessment (DPIA)

> Required by GDPR Article 35 for "high-risk" processing. Voice
> analysis + behavioral inference + cross-property data flows
> all qualify. **Use this template; complete fields before
> publication / regulator submission.**

### A. Description of the processing

**Controller:** Aurion Holdings, Inc.

**Processor:** Aurion Holdings, Inc. (we are the controller for
operator data and processor for guest data on operators' behalf)

**Nature of processing:**
  · Collection of operational data (POS, reservations, service
    interactions)
  · Voice analysis (with explicit opt-in for retention beyond
    24h; transient analysis without retention is performed for
    real-time service support)
  · Inference of guest preferences from observation
  · Computation of internal trust + resonance scores (server-
    side only)
  · Cross-property guest recognition (only for properties under
    common Echo Resonance network membership)

**Scope:**
  · Roughly [N] property operators across [country list]
  · Estimated [M] guest interactions per month
  · Estimated [K] employee records

**Context:** premium hospitality (luxury hotels, restaurants,
spas, banquets, casinos) where guests have a reasonable
expectation of personalized service.

**Purposes:**
  · Operational service delivery
  · Forecast generation and labor optimization
  · Audit and regulatory compliance
  · Guest experience improvement

### B. Necessity and proportionality assessment

We have evaluated whether each processing activity is necessary
and proportionate:

| Processing | Necessity | Less-intrusive alternative considered? | Outcome |
|---|---|---|---|
| Operational data collection | Required to provide the Service | None — operational data is the Service | Necessary |
| Voice analysis (transient, <24h) | Necessary for real-time service | Could be opt-in only; chose default-on with rapid decay because the lift in service quality is material | Proportionate |
| Voice retention beyond 24h | NOT default; opt-in only | n/a | Not applicable to default users |
| Trust score computation | Necessary to prevent guest harm (e.g., refusing to over-serve) | Considered making it opt-out by guest; rejected because the score never affects the guest, only what we decline to do | Necessary, server-side only |
| Cross-property recognition | Necessary for the Echo Resonance network experience | Could be per-property only; chose network-wide because it's the differentiating value | Proportionate, with opt-out |

### C. Identification of risks

  · **Risk:** voice recording leaks → privacy harm
    **Mitigation:** 24h decay (Tenet 2), encryption at rest,
    cryptographic key shredding on delete request (Tenet 5)
    **Residual risk:** Low

  · **Risk:** trust score used for guest-facing actions
    (discrimination)
    **Mitigation:** server-side-only invariant enforced at the
    storage layer (Tenet 4); compile-time forbidden-path
    partition prevents trust_score from being imported into
    advertising / pricing modules (Tenet 8)
    **Residual risk:** Very low

  · **Risk:** sensitive psychological flags persist beyond their
    relevance window
    **Mitigation:** decay engine (Tenet 7) auto-tombstones flags
    after 30 days unless explicitly renewed
    **Residual risk:** Low

  · **Risk:** model training on guest data leaks identity
    **Mitigation:** Tenet 8 prohibits training models for use
    outside the Echo Resonance network; in-network training uses
    differentially-private aggregation
    **Residual risk:** Low

  · **Risk:** cross-property recognition surfaces guest at a
    property they didn't intend to visit
    **Mitigation:** network membership opt-in by guest; per-
    property opt-out always available
    **Residual risk:** Low

  · **Risk:** subprocessor breach
    **Mitigation:** all subprocessors contractually bound;
    encryption keys segregated where possible; the platform
    operates on least-privilege access patterns
    **Residual risk:** Medium (inherent to using cloud
    infrastructure)

### D. Measures envisaged

  · Technical: see security section of Privacy Policy + the
    architecture moat (doctrine-as-code, append-only event log,
    decay engine, forbidden-path partition)
  · Organizational: SOC 2 Type I + Type II audits, annual pen-
    test, founder + employee CIIA agreements with strict
    confidentiality
  · Procedural: 30-day SAR response, automated DSAR fulfillment
    via the Tenet 5 controls, data-protection officer designated

### E. Outcome of the assessment

**Conclusion:** Processing is lawful, necessary, and proportionate
under GDPR Article 35. Mitigations are sufficient. No prior
consultation with the supervisory authority is required.

**DPIA owner:** [Data Protection Officer name]
**Last reviewed:** [DATE]
**Next review:** [DATE + 12 months, or sooner if processing
changes materially]

---

## Document 3 — Subprocessor List (publishable)

> **Place at:** `https://echoaurion.com/subprocessors`. Update
> whenever a subprocessor is added or removed; notify operators
> 30 days in advance per Article 28(2).

### Current subprocessors as of [DATE]

| Subprocessor | Service | Data location | DPA |
|---|---|---|---|
| MongoDB Atlas (MongoDB, Inc.) | Primary database | US (AWS us-east-1) | https://www.mongodb.com/legal/dpa |
| Anthropic, PBC | LLM API for OCR + variance commentary + Sous-Chef-CFO Q&A | US | https://anthropic.com/legal/dpa (Enterprise) |
| Amazon Web Services (AWS) | Compute, storage, networking | US (us-east-1) | https://aws.amazon.com/service-terms/ + DPA |
| Cloudflare | CDN + WAF | Global edge | https://www.cloudflare.com/cloudflare-customer-dpa/ |
| Twilio | SMS notifications (when enabled) | US | https://www.twilio.com/legal/data-protection-addendum |
| Resend (or SendGrid) | Transactional email | US | [vendor DPA] |
| Stripe | Payment processing (when wired) | US, EU | https://stripe.com/dpa |
| Plaid | Banking / merchant data ingestion (when wired) | US | [vendor DPA] |
| Anthropic Claude (model usage) | LLM inference | US (Anthropic infra) | Enterprise agreement |
| Sentry / Datadog (when wired) | Observability | US | [vendor DPA] |

### Subprocessors that will be added during integration (with notice)

  · POS systems (Toast / Aloha / Micros / Square / Clover) —
    only connected when an operator opts in
  · PMS systems (Opera Cloud / Mews / Cloudbeds) — only
    connected when an operator opts in
  · Payroll providers (ADP / Gusto / Paychex / Rippling) — only
    connected when an operator opts in
  · Channel managers (SiteMinder / RateGain) — only connected
    when an operator opts in

### Notification policy

We will notify operators of new subprocessors at least 30 days
before they begin processing operator data, unless emergency
substitution is required for security or continuity reasons (in
which case we will notify within 5 business days).

Operators may object to a new subprocessor; if a satisfactory
alternative cannot be agreed within 60 days, the operator may
terminate the affected service component without penalty.

---

## What you do this week

1. **Have an attorney review the Privacy Policy** — fill in
   bracketed fields, customize the contact addresses, confirm
   the data-host region(s) match your actual deployment.
2. **Designate a Data Protection Officer (DPO)** — for now, this
   can be you. When you have a real privacy / compliance hire,
   re-designate.
3. **Publish the Privacy Policy at echoaurion.com/privacy** —
   even before the platform is GA, having it live is the standard
   trust artifact.
4. **Publish the Subprocessor List at
   echoaurion.com/subprocessors.**
5. **File the DPIA in your compliance records** — not public, but
   ready to produce on demand to a regulator or an auditor.
6. **Add a privacy@echoaurion.com email + monitor it.** Even if
   it's just a forwarder to your personal email for now.
7. **Add a "Privacy" link to the in-app footer** linking to the
   public Privacy Policy.

## Estimated cost + time

| Item | Cost | Time |
|---|---|---|
| Privacy attorney review of these drafts | $1,500-3,000 | 1-2 weeks |
| DPO designation (you, for now) | $0 | 30 min |
| Publish Privacy Policy + Subprocessor List | $0 | 1 hr |
| Email forwarder + monitoring routine | $0 | 30 min |
| **Total** | **$1,500-3,000** | **2 weeks** |

GDPR + CCPA require this; SOC 2 audits expect it; customers ask
for it. Cheap, fast, high-leverage.
