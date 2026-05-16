# Provisional Patent Application — DRAFT

**For attorney review. DO NOT FILE WITHOUT COUNSEL.**

---

> **READ THIS FIRST**
>
> This document is a **drafting framework** prepared by an AI coding assistant
> (Claude, Anthropic) at the request of the inventor. It is **not legal
> advice** and **must be reviewed, edited, and filed by a licensed United
> States patent attorney or registered patent agent** before submission to
> the USPTO.
>
> Provisional patent applications are non-substantive filings that establish
> a priority date but expire after 12 months unless converted to a
> non-provisional. Filing a defective provisional can lock in a bad priority
> date or fail to support later non-provisional claims. **Use a real attorney.**
>
> The strategic recommendation in §0 below addresses whether one patent or
> multiple patents make sense, and whether trade-secret protection should
> displace patent protection for some pieces of the invention.

---

## §0 — Strategic recommendation (to be discussed with counsel)

The doctrine framework comprises **at least seven distinct technical
inventions**, any one of which may warrant its own patent application:

1. **Doctrine-as-Code Enforcement** — pre-commit gate that validates every
   state transition against an executable behavioral doctrine (the core
   subject of this draft).
2. **Append-Only Hospitality Event Log with Forensic Replay** — event-sourced
   architecture with doctrine-compliance metadata on every event.
3. **Cross-Correlation Drift Detector** — surfaces patterns where
   individually-compliant operations collectively indicate doctrine drift.
4. **Sensitive-Flag Decay Engine** — automatic time-based decay of
   psychologically-sensitive data classes, enforced at the storage layer.
5. **Compile-Time Forbidden-Path Partition** — static analysis enforcing
   that certain data classes (e.g., voice tone scores) cannot be imported
   from certain code paths (e.g., advertising, pricing).
6. **Monte Carlo Counterfactual Doctrine Replay** — engine for retroactively
   asking "what would have happened under a different doctrine?"
7. **LLM-as-Extractor With Doctrine-Gated Active Learning** — confidence-
   thresholded LLM extraction with corrections fed back through the doctrine
   gate before persistence.

**Counsel should advise on:**

- Whether to file one consolidated application covering the system as a
  whole (broader claims, weaker per-claim defensibility) or multiple
  narrower applications (stronger per-patent defensibility, higher cost).
- Which inventions are better protected as **trade secrets** (e.g., the
  exact correlation heuristics, the LLM prompt scaffolding, the decay
  rate tuning) rather than disclosed in a patent.
- Whether to file in the **United States only**, or pursue **PCT** for
  international protection (recommended given hospitality is global).
- Whether **continuations** or **divisionals** should be planned at the
  outset.

The remainder of this document drafts a single application focused on
invention #1 (Doctrine-as-Code Enforcement) with §6 placeholders for
the related inventions to be filed separately.

---

## Title of the Invention

**System and Method for Code-Enforced Behavioral Doctrine Compliance in
Multi-Tenant Service-Industry AI Platforms**

(Alternate, narrower titles for counsel to consider:)
- *Pre-Commit Doctrine Gate for Append-Only Hospitality Event Logs*
- *Apparatus for Enforcing Privacy and Service Tenets as Executable
  Contracts in AI-Mediated Hospitality Operations*

---

## Cross-Reference to Related Applications

This is a provisional patent application. No related United States or
foreign applications have been filed by the inventor on this subject
matter as of the filing date. **[Counsel: confirm before filing.]**

---

## Field of the Invention

The invention relates generally to multi-tenant software platforms that
mediate human service interactions using artificial intelligence, and
more specifically to systems and methods for ensuring that such
platforms operate in compliance with declared ethical, privacy, and
operational principles. Particular application is to hospitality
operations including but not limited to luxury hotels, restaurants,
resorts, spas, banquets, and concierge services, in which AI systems
process behavioral, biometric, and conversational data of human guests
and employees.

---

## Background of the Invention

### The problem of doctrine drift in AI service platforms

Modern AI-mediated service platforms collect, analyze, and act upon
sensitive human data including but not limited to: voice recordings,
emotional valence inferences, behavioral preferences, biometric facial
recognition, location traces, purchase histories, and inferred
psychological states. Operators of such platforms typically commit, in
public-facing privacy policies and terms of service, to specific
ethical constraints — for example, that voice analysis will not be
used for advertising decisions, that sensitive psychological flags
will be deleted after a defined period, or that data will not be
shared with third parties.

In conventional implementations, these commitments are enforced
**procedurally**, through a combination of:

- Privacy policy documents that bind the operator legally but do not
  technically prevent violations;
- Code review processes that depend on human reviewers correctly
  identifying violations;
- Audit logs reviewed retroactively;
- Access-control lists that grant or deny access to data classes by
  user role.

Each of these conventional mechanisms exhibits known failure modes:

1. **Policy-code drift.** The policy and the code diverge over time as
   features are added under deadline pressure, leaving the policy
   accurate as a description of intent but inaccurate as a description
   of behavior. The operator does not know they are violating their
   own policy until a regulator or journalist discovers it.
2. **Reviewer fallibility.** Code reviewers may miss subtle violations,
   particularly when the violation is distributed across multiple
   commits or services.
3. **Retroactive-only audit.** Audit logs surface violations after they
   have occurred, after data has been collected, processed, and
   potentially shared. Retroactive remediation is incomplete.
4. **Permissive defaults.** Access-control systems generally control
   *who* can access *what data*, not *what operations* may be performed
   on that data. A user with legitimate access can still misuse the
   data through legitimate API calls.

The technical literature does not adequately address the problem of
**preventing doctrine violations at the moment of attempted commit**
in a manner that is auditable, replayable, and resistant to incremental
drift over time.

### Specific technical gaps

(a) **No prior system, to the inventor's knowledge, gates every write
    operation in a multi-tenant hospitality data platform against an
    executable representation of declared ethical principles.** Where
    pre-commit hooks exist (e.g., Git pre-commit hooks), they validate
    code style or test coverage, not data-content compliance with
    declared ethical doctrine.

(b) **No prior system, to the inventor's knowledge, combines
    append-only event sourcing with doctrine-compliance metadata** in
    a manner that allows a third-party auditor to reconstruct, at any
    historical moment, both *what was done* and *which version of
    doctrine was in effect when it was done*.

(c) **No prior system, to the inventor's knowledge, exposes the
    doctrine-compliance gate as a versioned API surface** such that the
    doctrine itself becomes a first-class deployable artifact —
    versioned, tested, and rolled back in the same manner as code.

(d) **Existing privacy-by-design frameworks (e.g., GDPR Article 25)
    define principles** but do not specify mechanical enforcement
    architectures for AI service platforms.

The invention disclosed herein addresses each of these gaps.

---

## Brief Summary of the Invention

A system and method are described in which a behavioral doctrine,
expressed as a set of executable predicates over operations and data,
is enforced as a pre-commit gate on all state-changing operations in
a multi-tenant AI service platform. Every attempted write is evaluated
against the current version of the doctrine; non-compliant writes are
rejected at the data layer, before persistence, with the rejection
recorded as an auditable event. Compliant writes are persisted to an
append-only event log along with a cryptographic hash of the doctrine
version under which they were validated, enabling later forensic
replay and verification.

In one embodiment, the doctrine includes (among other principles):

- A capture-by-observation tenet that prohibits collection of guest
  data through interrogative interfaces;
- A score-persists-audio-evaporates tenet that imposes automatic
  expiry on raw audio while permitting derived inferences to persist;
- A tone-informs-care-never-commerce tenet that compile-time-prohibits
  certain code paths from importing certain data classes;
- A sensitive-flags-decay tenet that imposes automatic time-based
  decay on data fields tagged as psychologically sensitive;
- A forbidden-uses tenet that statically prohibits the use of
  specified data classes for specified purposes (e.g., advertising,
  third-party sharing, dynamic pricing).

The system further includes a retrospective replay engine that, given
a candidate alternate doctrine, computes the counterfactual outcome
that would have obtained had the alternate doctrine been in effect.
This enables governance review, regulatory response, and continuous
doctrine refinement.

The system further includes a cross-correlation engine that surfaces
patterns where individually-compliant operations collectively suggest
doctrine drift — for example, where a series of permitted small
disclosures aggregates to a prohibited large disclosure.

The architecture is novel in that it treats ethical doctrine not as
prose policy but as a versioned executable artifact, deployed,
tested, and rolled back through the same engineering pipeline as
application code.

---

## Brief Description of the Drawings

**[Note for counsel: Drawings to be prepared by a patent illustrator
prior to non-provisional filing. Provisional may be filed without
formal drawings but with informal sketches per 37 CFR 1.84.]**

The following figures are referenced in the detailed description:

- **FIG. 1** — System architecture overview showing client devices,
  application services, doctrine gate, append-only event log, and
  doctrine registry.
- **FIG. 2** — Sequence diagram of a write operation passing through
  the doctrine gate, with branching into compliant-persisted,
  non-compliant-rejected, and non-compliant-with-override paths.
- **FIG. 3** — Schema of the doctrine registry, showing tenets,
  versioning, predicate definitions, and severity tiers.
- **FIG. 4** — Schema of the append-only event record, showing
  payload, doctrine-version hash, compliance result, and tenant
  isolation key.
- **FIG. 5** — Cross-correlation engine block diagram showing
  individual-compliance verification, aggregation, and drift signal
  emission.
- **FIG. 6** — Sensitive-flag decay timeline illustrating creation,
  decay-window, decay-trigger, and tombstone-record persistence.
- **FIG. 7** — Compile-time forbidden-path partition diagram showing
  static-analysis rejection of disallowed import graphs.
- **FIG. 8** — Monte Carlo counterfactual replay engine block diagram.
- **FIG. 9** — LLM-as-extractor active learning loop, illustrating
  confidence threshold, doctrine-gated correction persistence, and
  per-tenant template patches.
- **FIG. 10** — Forensic replay user interface mockup showing
  reconstruction of historical state with doctrine version pinned.

---

## Detailed Description of the Invention

### 1. System architecture

Referring to FIG. 1, a multi-tenant AI service platform comprises:

- One or more **client devices** (mobile applications, kiosk
  applications, voice-enabled wearables, kitchen displays, etc.) that
  generate state-changing requests on behalf of authenticated users
  (guests, employees, operators).
- A **service layer** comprising a plurality of microservices or
  monolithic service modules implementing distinct business functions
  (reservations, kitchen production, payroll, concierge, voice
  analysis, etc.).
- A **doctrine gate** disposed between the service layer and the
  persistence layer, configured to receive every attempted write,
  evaluate the write against the current doctrine, and either permit
  or reject the write.
- An **append-only event log** acting as the system of record for all
  state-changing operations, in which each event record includes a
  cryptographic hash of the doctrine version under which the event was
  validated.
- A **doctrine registry** storing the canonical doctrine, comprising a
  versioned, signed, and replayable artifact.
- A **retrospective replay engine** capable of reconstructing
  historical state and computing counterfactual outcomes under
  alternate doctrines.
- A **cross-correlation engine** capable of identifying patterns of
  individually-compliant operations that collectively indicate
  doctrine drift.
- A **decay enforcement module** that applies time-based deletion or
  tombstoning to data fields tagged as decay-eligible.

### 2. The doctrine and its representation

The doctrine, in one embodiment, comprises a set of **tenets**, each
of which is expressed as one or more executable predicates over
candidate write operations. A tenet has, among other fields:

- a `tenet_id` (canonical identifier);
- a `version` (semantic version of this tenet);
- a `severity` (one of *blocking*, *warning*, *informational*);
- a `predicate` (an executable function returning compliance result);
- a `human_readable_text` (the doctrine as it appears to humans);
- an `effective_at` (date from which this tenet version applies);
- a `superseded_by` (reference to the tenet version that replaced this
  one, if any);
- a `signature` (cryptographic signature of the doctrine maintainer).

In one embodiment, tenets include but are not limited to:

#### Tenet A — Capture by observation, not interrogation

Predicate: `not exists(ui_surface that requests guest preference data
through an interrogative form)`. Operationally enforced as a
build-time lint that scans UI component definitions for forbidden
patterns (e.g., star-rating widgets bound to guest profile mutations).

#### Tenet B — Score persists, audio evaporates

Predicate: `for every audio_record(r): r.expires_at <= r.created_at +
24h unless r.opt_in == true`. Operationally enforced at the moment of
audio persistence; the doctrine gate rejects any audio insert lacking
a compliant `expires_at`.

#### Tenet C — Tone informs care, never commerce

Predicate: `not (any function in {pricing, sales, marketing}.imports
the symbol resonance_score)`. Operationally enforced as a static
import-graph analysis at build time; CI fails if the import appears.

#### Tenet D — Trust score is invisible

Predicate: `for every UI render(r): r.payload does not include
trust_score`. Operationally enforced at the API boundary; the
doctrine gate strips `trust_score` from any payload destined for a
client device.

#### Tenet E — Guest controls are first-class

Predicate: `every tenant exposes the four endpoints {what_we_remember,
pause, delete_everything, export}`. Operationally enforced at deploy
time; deployment fails if the four endpoints are not present.

#### Tenet F — Sensitive flags decay

Predicate: `for every flag(f) where f.class in
{mental_health, family_tension, relationship_strain}: f.expires_at <=
f.created_at + 30d unless explicitly_renewed(f)`. Operationally
enforced by the decay module.

#### Tenet G — Forbidden uses

Predicate: `not (resonance_score, trust_score, voice_analysis used in
{pricing_decision, third_party_share, advertising_target,
profiling_beyond_service, external_model_training})`. Operationally
enforced as both static-analysis and runtime gate.

The list above is illustrative, not exhaustive. The architecture
admits arbitrary tenets so long as each has an executable predicate.

### 3. The doctrine gate

Referring to FIG. 2, a write operation proceeds as follows:

**Step 2.1.** A service in the service layer prepares a candidate
event `E` representing the proposed state change. `E` includes a
payload, a tenant identifier, an actor identifier, a timestamp, and a
write-intent classifier.

**Step 2.2.** The service submits `E` to the doctrine gate.

**Step 2.3.** The doctrine gate retrieves the current doctrine
version `D_current` from the doctrine registry.

**Step 2.4.** The doctrine gate evaluates each tenet in `D_current`
whose predicate applies to events of `E`'s write-intent classifier.
Evaluation may include:
  - Inspecting `E.payload` for prohibited fields;
  - Inspecting `E.actor` for prohibited roles;
  - Inspecting the call stack for prohibited import paths (where
    runtime introspection is available);
  - Querying the cross-correlation engine for drift-pattern hits;
  - Inspecting the decay registry for decay-window expirations.

**Step 2.5.** The doctrine gate produces a `compliance_result`
record comprising:
  - an overall `permitted` boolean;
  - a list of `tenet_evaluations`, each with `tenet_id`, `passed`,
    `severity`, and `evidence`;
  - the `doctrine_version_hash` under which evaluation occurred.

**Step 2.6.** If `permitted` is true, `E` is persisted to the
append-only event log along with `compliance_result`. If false, `E`
is **not** persisted; instead a `rejected_event` record is persisted
to a separate doctrine-rejection log along with `compliance_result`,
the proposed payload, and the actor identity.

**Step 2.7.** A response is returned to the calling service indicating
permitted or rejected, with rejection responses including the failed
tenet identifiers and human-readable justification.

A novel feature of the present invention is that **rejected writes
are themselves persisted as auditable events**, enabling forensic
investigation of attempted violations without storing the rejected
payload data outside the rejection log (which itself may be subject
to stricter access controls and retention).

### 4. The append-only event log

Referring to FIG. 4, each event record persisted to the append-only
event log comprises, in one embodiment:

- `event_id` — globally unique identifier;
- `tenant_id` — multi-tenant isolation key, indexed;
- `actor_id` — identity of the principal who initiated the write;
- `event_type` — semantic type of the event;
- `payload` — the data being recorded;
- `timestamp` — wall-clock time of persistence;
- `doctrine_version_hash` — cryptographic hash of the doctrine
  version under which the event was validated;
- `compliance_signature` — signature of the doctrine gate attesting
  that the event passed compliance evaluation;
- `decay_at` — for events containing decay-eligible fields, the
  timestamp at which decay-tombstoning is required;
- `correlation_keys` — fields used by the cross-correlation engine
  to associate this event with a behavioral pattern.

The log is append-only; events cannot be modified or deleted in
place. Decay and deletion are performed by writing tombstone events
that override the prior event for purposes of read-time
reconstruction, while leaving the original event in the log for
forensic purposes (subject to the user's right-to-deletion rights,
which are honored by encrypting the original payload and discarding
the encryption key — see §7).

The cryptographic linkage between events and doctrine versions
permits a third-party auditor to verify, for any historical event,
the exact doctrine version under which that event was validated and
to re-execute the doctrine predicates against the event payload to
verify that the original validation was correct.

### 5. The retrospective replay engine

Referring to FIG. 8, the retrospective replay engine accepts as
input:
  - a starting timestamp `t_0`;
  - an ending timestamp `t_1`;
  - a candidate alternate doctrine `D_alt`;
  - optionally, a tenant filter or actor filter.

The engine then:
  - Iterates over all events in the append-only event log within
    `[t_0, t_1]` (subject to filters);
  - Re-evaluates each event under `D_alt`;
  - Produces a counterfactual outcome report comprising:
    - the count of events that would have been rejected under `D_alt`
      that were permitted under the actual historical doctrine;
    - the count of events that would have been permitted under `D_alt`
      that were rejected;
    - the divergence trajectory over time;
    - per-tenet contribution to divergence.

In a particular embodiment, the engine performs Monte Carlo
counterfactual replay by stochastically perturbing the actor or
payload distributions to estimate the variance of outcomes under
`D_alt`, providing governance reviewers with a robustness measure.

### 6. The cross-correlation engine

Referring to FIG. 5, the cross-correlation engine continuously scans
the append-only event log for patterns where:
  - individually, each event is doctrine-compliant;
  - collectively, the pattern of events suggests doctrine drift.

Examples of such patterns include but are not limited to:
  - Aggregation drift: a series of permitted small disclosures
    aggregating to a prohibited large disclosure;
  - Role drift: a single principal performing a sequence of
    operations each individually permitted but together exceeding
    the principal's intended scope;
  - Temporal drift: a class of operations whose individual rate has
    not changed but whose tenant-aggregate rate has accelerated.

When a drift pattern is detected, the engine emits a `drift_signal`
event into the append-only event log, which may be configured to
trigger automated mitigations (e.g., temporary blocking of the
pattern), human-in-the-loop review, or both.

### 7. The decay enforcement module

Referring to FIG. 6, the decay enforcement module applies to data
fields tagged as decay-eligible. Each such field carries, at
creation, a `decay_at` timestamp. A background process continuously
scans for fields whose `decay_at` is less than the current time and:

  - In the conservative embodiment, encrypts the field's payload
    with a per-field key and writes a tombstone event recording the
    decay; the encryption key is then discarded, rendering the
    original payload cryptographically inaccessible while preserving
    the event-log invariants.
  - In the more aggressive embodiment, replaces the field payload
    with a null sentinel and writes a tombstone event.

Decay-tombstoning is itself a doctrine-gated operation; the
tombstone is rejected if it would violate, e.g., a regulatory
retention requirement, in which case the system surfaces the
conflict to a human reviewer.

### 8. The compile-time forbidden-path partition

Referring to FIG. 7, the compile-time forbidden-path partition is a
static-analysis pass that runs as part of the platform's continuous
integration pipeline. It analyzes the import graph of the entire
codebase and rejects any build in which:
  - a module designated as belonging to a forbidden category (e.g.,
    `pricing`, `advertising`, `marketing_outbound`) imports, directly
    or transitively, a symbol designated as belonging to a protected
    category (e.g., `resonance_score`, `trust_score`, `voice_analysis`).

The forbidden-category and protected-category designations are
themselves part of the doctrine registry, versioned and signed.

This static-analysis approach provides a stronger guarantee than
runtime gating: it guarantees that the prohibited code path **cannot
exist in the deployed binary**, not merely that it would be detected
if executed.

### 9. The LLM-as-extractor active learning loop (related invention)

Referring to FIG. 9, in embodiments where the platform uses large
language models for data extraction (for example, extracting
structured invoice data from invoice images), the LLM operates within
a doctrine-gated active learning loop:

  - Each extraction is performed at a confidence threshold;
  - Below the threshold, the extraction is held in a pending state
    rather than persisted;
  - A human reviewer corrects the extraction;
  - The correction is submitted to the doctrine gate for compliance
    review;
  - If permitted, the correction is both (a) persisted as the final
    extraction and (b) used to update a per-tenant template patch
    that improves future extractions for that vendor or context;
  - The template patch is itself doctrine-gated, ensuring that
    learning cannot incorporate prohibited correlations.

### 10. Multi-tenant isolation

Throughout the architecture, multi-tenant isolation is enforced by
requiring a `tenant_id` on every event, indexed on every read query,
and contract-tested at every API boundary. The doctrine gate is
itself parameterized by tenant; tenants may inherit a base doctrine
or carry tenant-specific extensions, subject to the constraint that
no tenant doctrine may relax a base-doctrine tenet (only tighten it).

### 11. Versioning and rollback

The doctrine registry maintains all historical doctrine versions.
The deployment of a new doctrine version is itself a state-changing
operation, gated by a meta-doctrine that requires:
  - cryptographic signature by an authorized doctrine maintainer;
  - successful execution of the retrospective replay engine on the
    most recent N days of events under the proposed new doctrine,
    with a human-reviewed report of any divergences exceeding a
    threshold;
  - explicit acknowledgement that the new version takes effect at a
    specified `effective_at` timestamp.

Rollback is symmetric: the previous doctrine version is reinstated
through the same gated process.

This versioning architecture enables the doctrine itself to be
treated as a deployable artifact with the same rigor as application
code, while preserving auditability of every decision against the
doctrine version under which it was made.

---

## Claims

**[Note for counsel: claims are the legal heart of the patent. The
following are draft claims for negotiation. Counsel should evaluate
each against the prior-art search and revise scope accordingly.]**

### Independent Claims

**Claim 1.** A computer-implemented method for enforcing behavioral
doctrine compliance in a multi-tenant artificial-intelligence service
platform, the method comprising:

  - storing, in a doctrine registry, a versioned doctrine comprising
    a plurality of tenets, each tenet comprising at least an
    executable predicate, a severity classifier, and a cryptographic
    signature;
  - receiving, at a doctrine gate disposed between a service layer
    and a persistence layer of the platform, a candidate write event
    representing a state-changing operation, the candidate write
    event comprising at least a payload, a tenant identifier, an
    actor identifier, and a write-intent classifier;
  - evaluating, by the doctrine gate, the candidate write event
    against the executable predicates of one or more tenets of a
    current version of the doctrine;
  - determining, by the doctrine gate, whether the candidate write
    event is permitted under the current version of the doctrine;
  - if the candidate write event is determined to be permitted,
    persisting the candidate write event to an append-only event log
    along with a cryptographic hash of the current version of the
    doctrine; and
  - if the candidate write event is determined to be not permitted,
    persisting a rejection record to a doctrine-rejection log along
    with the cryptographic hash, and returning a rejection response
    to the service layer that identifies the failed tenets.

**Claim 2.** A system comprising:

  - a service layer comprising one or more service modules
    implementing service-industry business functions;
  - a doctrine registry storing a versioned doctrine comprising a
    plurality of tenets, each tenet comprising at least an executable
    predicate;
  - a doctrine gate disposed between the service layer and a
    persistence layer, configured to receive candidate write events
    from the service layer, evaluate the candidate write events
    against the doctrine, and conditionally persist the candidate
    write events to an append-only event log;
  - the append-only event log, comprising a plurality of event
    records, each event record comprising at least a payload, a
    tenant identifier, and a cryptographic hash of the doctrine
    version under which the event record was validated;
  - a retrospective replay engine configured to reconstruct
    historical state from the append-only event log under a candidate
    alternate doctrine and to produce a counterfactual outcome
    report; and
  - a cross-correlation engine configured to detect patterns of
    individually-compliant events that collectively indicate
    doctrine drift.

**Claim 3.** A non-transitory computer-readable medium storing
instructions that, when executed by one or more processors, cause
the processors to perform the method of Claim 1.

### Dependent Claims

**Claim 4.** The method of Claim 1, wherein at least one tenet
includes a predicate enforcing automatic time-based decay of data
fields tagged as psychologically sensitive.

**Claim 5.** The method of Claim 1, wherein at least one tenet
includes a predicate enforced by static analysis of an import graph
of the platform's source code, the predicate prohibiting the import
of specified symbols by specified modules.

**Claim 6.** The method of Claim 1, wherein the candidate write
event comprises an audio recording, and wherein at least one tenet
imposes an automatic expiry timestamp on audio recordings absent
explicit user opt-in.

**Claim 7.** The method of Claim 1, further comprising:
  - receiving, at the retrospective replay engine, an alternate
    doctrine version;
  - re-evaluating, by the retrospective replay engine, a historical
    range of events under the alternate doctrine version; and
  - producing a counterfactual report identifying events that would
    have been rejected under the alternate doctrine but were
    permitted under the historical doctrine, and vice versa.

**Claim 8.** The method of Claim 1, wherein the doctrine gate is
parameterized by tenant identifier and wherein each tenant may apply
a tenant-specific doctrine extension that tightens, but does not
relax, the base doctrine.

**Claim 9.** The method of Claim 1, wherein the cross-correlation
engine is configured to detect aggregation drift, in which a sequence
of individually-permitted small disclosures aggregates to an event
that, evaluated as a unit, would have been prohibited.

**Claim 10.** The method of Claim 1, wherein deployment of a new
doctrine version is itself a state-changing operation gated by a
meta-doctrine that requires:
  - cryptographic signature by an authorized doctrine maintainer;
  - successful execution of the retrospective replay engine on a
    recent historical window with a human-reviewed report of
    divergences exceeding a configurable threshold; and
  - an explicit `effective_at` timestamp.

**Claim 11.** The system of Claim 2, further comprising a decay
enforcement module configured to scan the append-only event log for
events containing decay-eligible fields whose decay-window has
elapsed and to write tombstone events that render the decayed fields
cryptographically inaccessible while preserving event-log
invariants.

**Claim 12.** The system of Claim 2, further comprising a
large-language-model extraction module configured to extract
structured data from unstructured inputs, wherein extractions below
a confidence threshold are held in a pending state until corrected
by a human reviewer, and wherein corrections are submitted through
the doctrine gate prior to persistence.

**Claim 13.** The method of Claim 1, wherein the rejection record
includes the proposed payload but is stored under stricter access
controls and shorter retention than the permitted-event log.

**Claim 14.** The method of Claim 1, wherein the platform mediates
hospitality service interactions including at least one of:
restaurant operations, hotel operations, banquet operations,
concierge services, and spa services.

**Claim 15.** The method of Claim 1, wherein the doctrine includes a
tenet prohibiting the use of voice tone analysis, behavioral score
inference, or trust score inference for any of: pricing decisions,
advertising targeting, third-party data sharing, psychological
profiling beyond the immediate service interaction, or training of
machine-learning models for use outside the platform.

---

## Abstract

A multi-tenant artificial-intelligence service platform enforces
behavioral doctrine compliance through a pre-commit doctrine gate
that evaluates every state-changing operation against a versioned,
cryptographically-signed executable doctrine prior to persistence.
Permitted operations are recorded in an append-only event log along
with a hash of the doctrine version under which they were validated,
enabling later forensic replay and audit. Rejected operations are
recorded separately. A retrospective replay engine permits
counterfactual analysis under alternate doctrine versions. A
cross-correlation engine detects patterns of individually-compliant
operations that collectively indicate doctrine drift. The
architecture treats ethical doctrine as a versioned deployable
artifact subject to the same engineering rigor as application code,
addressing the conventional gap between policy commitments and
technical enforcement in AI service platforms. (149 words.)

---

## Inventor and Assignee Information

**[To be filled in by the inventor before counsel review.]**

- **Inventor name(s):** ____________________________________________
- **Inventor address:** ____________________________________________
- **Inventor citizenship:** ________________________________________

- **Assignee:** Aurion Holdings, Inc. (or current legal entity name)
- **Assignee address:** ____________________________________________
- **Assignment recorded:** Yes / No / Pending

**[Note for counsel: confirm assignment is in place before filing
non-provisional. Inventor-employee assignment agreements should be on
file with the assignee.]**

---

## Suggested Filing Strategy (for counsel discussion)

1. **File this as a provisional today** to lock in the priority date.
2. **Within 90 days,** conduct a formal prior-art search through
   counsel; revise specification and claims based on findings.
3. **Within 6 months,** draft the non-provisional with formal
   drawings, narrowing or broadening claims as the prior-art search
   indicates.
4. **At 11 months,** convert to non-provisional and consider PCT
   filing for international protection.
5. **Plan continuations** for the six related inventions identified
   in §0.

---

## Trade-Secret Inventory (NOT to be disclosed in this patent)

The following implementation details, in counsel's discretion, may
be more valuable as **trade secrets** than as patent disclosures.
They are listed here for the inventor's reference and **must not be
included in the patent application as filed**:

- Specific predicate implementations for each tenet (the patent
  describes the *architecture* for predicates; the *exact code* is
  trade secret);
- Specific correlation heuristics used by the drift detector;
- Specific decay rate parameters for sensitive flag classes;
- Specific confidence thresholds for the LLM extraction loop;
- Specific prompt scaffolding used with the LLM;
- Specific tenant-isolation key derivation algorithm;
- Specific audit-log encryption key management.

These items should be protected by:
- NDA with all employees and contractors who have access;
- Access controls limiting visibility to need-to-know;
- Marking source code with "TRADE SECRET — DO NOT DISTRIBUTE";
- Including in the company's trade-secret inventory document
  required for misappropriation claims (per Defend Trade Secrets Act,
  18 U.S.C. § 1836).

---

## Document Status

- **Draft prepared:** 2026-05-08
- **Drafted by:** Claude (Anthropic AI assistant) at inventor's
  request, working from the codebase at
  `Echo_Aurion-LUCCCA_Framework`, primarily from
  `PRIVACY_TENETS.md` and `docs/maestro/THE_LINE.md`.
- **Status:** DRAFT — for attorney review only. Not legal advice.
  Not to be filed without counsel.
- **Next action:** Send to a licensed United States patent attorney
  with experience in software / AI / privacy patent prosecution.

---

## End of Document
