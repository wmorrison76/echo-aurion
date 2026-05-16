# Patent Positioning Strategy — How to Frame the Doctrine Invention

> Companion to `PATENT_DRAFT_doctrine_enforcement.md`.
>
> The formal draft is the *what*. This document is the *why and how*:
> the strategic angle, the examiner's narrative, the novelty hooks,
> the prior-art differentiation, and the pitfalls that kill patents
> like this if not handled deliberately.
>
> **Use this when briefing a patent attorney.** It explains the
> business strategy behind the technical disclosure so they can
> prosecute claims that protect what actually matters.

---

## §1 — The framing problem (and the trap to avoid)

The instinct is to say *"we have a patent on the doctrine."* That
framing is **fatal**. It triggers two immediate rejections:

  - **Subject-matter eligibility (35 U.S.C. § 101):** abstract
    principles, business rules, and ethical frameworks are not
    patent-eligible after *Alice Corp. v. CLS Bank* (2014). An
    examiner reading "we patented ethics" stops reading at page one.
  - **Prior art:** ethical principles in service industries go back
    centuries. Hospitality has had codes of guest treatment since
    Caesar Ritz. You cannot claim novelty on the *idea* of treating
    guests well.

**The correct framing is the inverse.** What we patent is the
**technical apparatus that makes a behavioral doctrine
machine-enforceable** in a class of software systems where, until
now, doctrine has been enforced only by humans, audit logs, and
hope.

The shift in framing is: from *"we have rules"* to *"we have a
machine that prevents rule violations at the moment of attempted
commit and produces cryptographic proof of compliance."* The
**rules** are not novel. The **machine** is.

This is the same shift Stripe made when patenting payments
infrastructure (*Stripe doesn't patent the idea of charging credit
cards; they patent the technical apparatus that does it
differently*) and the same shift Snowflake made (*not "the idea of
a database in the cloud" but a specific architecture for separating
storage from compute*).

**Tell the attorney:** *"We are not patenting ethics. We are
patenting the runtime gate that enforces ethics as a precondition
for state transition."*

---

## §2 — Post-Alice eligibility: the two-step survival strategy

The *Alice* test asks two questions:

  1. **Is the claim directed to an abstract idea?**
     For a doctrine-enforcement claim, the answer is *partially yes*
     — there is an abstract idea component (ethical rules). Don't
     fight this. Concede it and move to step 2.

  2. **Does the claim contain an "inventive concept" sufficient to
     transform the abstract idea into a patent-eligible application?**
     This is where we win or lose. Our inventive concept is **the
     specific technical apparatus**: the pre-commit gate as a system
     component, the cryptographic linkage between event records and
     versioned doctrine, the static-analysis import-graph partition,
     the replay engine, the correlation engine.

The claims must be drafted to **emphasize the technical apparatus**,
not the rules being enforced. Compare:

  - **Bad framing (loses on Alice step 1):**
    *"A method comprising: receiving guest data; checking if the
    guest data violates a privacy rule; rejecting the data if so."*
    This is just policy-checking. Pure abstract idea. Dead.

  - **Good framing (survives Alice via inventive concept):**
    *"A computer-implemented method comprising: storing a
    cryptographically-signed versioned doctrine in a doctrine
    registry; intercepting, at a doctrine gate disposed between a
    service layer and a persistence layer, every state-changing
    operation; evaluating the operation against executable
    predicates of the current doctrine version; conditionally
    persisting the operation to an append-only event log along with
    a cryptographic hash of the doctrine version under which it was
    validated; ..."*

The good framing wins because:
  - It specifies a **concrete arrangement of system components**
    (registry, gate, log, hash) that is not abstract.
  - It produces a **technical artifact** (the cryptographic linkage)
    that does not exist in conventional systems.
  - It improves the **functioning of the computer system itself**
    (a recognized *Alice* safe harbor) by enabling cryptographic
    proof of compliance state.

The attorney's job is to ensure every claim is drafted in the
*good framing* style: concrete components, technical artifacts,
computer-system improvements.

---

## §3 — The narrative arc: the story the examiner needs to hear

A patent application is, fundamentally, a *story* told to an
examiner. The story has a beat structure that, when followed,
maximizes the chance of allowance. Here is the beat structure for
this invention:

### Beat 1 — The technical problem is real and recognized

Open with a problem the examiner already accepts as legitimate:
**privacy-policy-to-code drift in AI service platforms.** Every
major platform (Google, Meta, OpenAI, Salesforce) has been publicly
caught violating its own privacy policy because the policy and the
code drifted. This is documented in regulatory enforcement actions,
journalism, and academic literature. It is not contested.

Establishing this beat does two things:
  - Pre-empts "this is just business" rejections (it's a technical
    problem with technical consequences);
  - Anchors the invention in a problem space the examiner is
    already inclined to view as legitimate technical territory.

### Beat 2 — Conventional solutions fail, and the failures are technical

List the conventional approaches (code review, audit logs, RBAC,
DLP, policy-as-code for infrastructure) and explain *technically*
why each fails for doctrine enforcement:

  - Code review: human, fallible, distributed-failure-mode invisible
  - Audit logs: detective not preventive; retroactive remediation
    is incomplete
  - RBAC: controls *who* accesses *what data*, not *what operations*
    are performed on data; legitimate-access misuse passes RBAC
  - DLP: pattern-matches content; cannot evaluate operations against
    a versioned principles framework
  - Infrastructure policy-as-code (OPA, Sentinel): operates on cloud
    configuration, not on application data writes

This beat does the prior-art differentiation work *narratively*
before the formal prior-art section, priming the examiner to view
this invention as filling a real gap.

### Beat 3 — The inventive leap

State, in plain language, what is novel: *a versioned executable
doctrine evaluated by a pre-commit gate that produces
cryptographically-linked event records, with retrospective replay
capability under alternate doctrines.*

The phrase **"versioned executable doctrine"** is the inventive-leap
phrase. It captures three things in three words:
  - **versioned** — the doctrine is itself a deployable artifact,
    not prose;
  - **executable** — the predicates run, return verdicts, are not
    interpretive;
  - **doctrine** — the rules being enforced are explicitly ethical
    / behavioral (not data-validation rules, not infrastructure
    policy rules).

### Beat 4 — The technical apparatus

The detailed description (§ in the formal draft) should be
**aggressively concrete**. Examiners reject claims that read as
*"a system to do X"* without specifying *how*. Specify:
  - the components (registry, gate, log, replay engine, correlation
    engine, decay module, partition analyzer);
  - the data structures (the event record schema, the tenet schema,
    the rejection record schema);
  - the algorithms (the predicate evaluation order, the cryptographic
    hashing scheme, the decay tombstoning algorithm);
  - the interfaces (which component calls which, with what payload).

Concreteness is armor against rejection. Vague claims die. Concrete
claims survive even when narrowed.

### Beat 5 — The result

End with the *technical effect* — what the system achieves that
prior systems could not:
  - Cryptographically-verifiable doctrine compliance for every
    historical operation;
  - Counterfactual analysis under alternate doctrines;
  - Prevention (not detection) of doctrine violations;
  - Detection of aggregation drift invisible to per-operation
    review;
  - Compile-time impossibility of certain prohibited code paths.

These are **technical effects**, not business benefits. Frame them
as such.

---

## §4 — The novelty hooks: what we claim is new

A strong patent has three to five "novelty hooks" — specific
technical features that are demonstrably new and difficult to design
around. Here are ours, ranked by defensibility:

### Hook 1 (strongest) — The cryptographic event-doctrine linkage

Every event record carries a hash of the doctrine version under
which it was validated. **This is not done in any prior system the
inventor has identified.** Audit log systems record what happened;
they do not cryptographically bind the operation to the policy
version under which it was approved. This linkage enables:
  - Forensic reconstruction of historical decisions with
    cryptographic proof of which policy was in effect;
  - Detection of policy-version tampering (because the hash chain
    breaks);
  - Counterfactual replay (because the historical doctrine version
    is recoverable).

This hook should appear in **the broadest independent claim**.

### Hook 2 (very strong) — The compile-time forbidden-path partition

Using static analysis on the import graph to make it **impossible
for prohibited code paths to exist in the deployed binary** is
substantially stronger than runtime gating. The closest prior art
is dependency-cruiser-style architectural fitness functions, but
those are typically used for code-organization concerns (don't
import from this package) rather than ethical-doctrine enforcement
(don't let advertising code import voice tone scores).

This hook should appear as **a dependent claim**, with the parent
claim covering runtime gating, so the examiner can fall back to
allowing the dependent if the parent is rejected.

### Hook 3 (strong) — The cross-correlation aggregation drift detector

Detecting violations that emerge only from the **aggregate** of
individually-compliant operations is a genuine novelty. Most
compliance systems evaluate each operation in isolation. Cumulative
disclosures, role accretion, and temporal drift are blind spots
that this engine addresses.

This hook is strong but vulnerable to prior art in the **anomaly
detection** literature. The attorney needs to draft this hook
narrowly enough to differentiate from generic anomaly detection
(*"anomaly detection wrt. a versioned doctrine, not a statistical
baseline"*) while broad enough to retain commercial value.

### Hook 4 (moderate) — Counterfactual replay under alternate doctrines

Re-running historical events under a candidate alternate doctrine
to compute counterfactual outcomes. The closest prior art is in
financial-stress-testing (running portfolios under stress scenarios)
and software A/B testing (running traffic under alternate code).
Neither operates on a versioned ethical doctrine over service
operations. This hook is patentable but narrower than hooks 1-3.

### Hook 5 (moderate) — LLM-as-extractor with doctrine-gated active learning

Specifically: extractions below a confidence threshold are held
pending; corrections pass through the doctrine gate before being
incorporated into per-tenant template patches. The combination of
(a) confidence-thresholded LLM extraction, (b) human correction
loop, and (c) doctrine-gated learning is novel. Each component
individually is prior art; the combination is not.

This hook is best filed as a **separate continuation patent** to
preserve the broader doctrine-gate patent's claim space.

---

## §5 — Prior-art landscape and how we differentiate

The attorney will conduct a formal prior-art search. Below is the
inventor's assessment of the landscape so the attorney has a
starting map:

### Adjacent technologies and how to differentiate

| Prior art / adjacent tech                     | What it does                                                        | How we differ                                                                                                        |
|-----------------------------------------------|---------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| **Git pre-commit hooks** (Husky, etc.)         | Validate code style, run tests before commit                       | Validate **data writes** at runtime, not code at build time; doctrine is data-content-aware                            |
| **Database CHECK constraints / triggers**     | Enforce data-validity rules at write time                          | Enforce **versioned, signed, externally-reviewable doctrine**, not schema validity; replayable under alternate doctrine |
| **RBAC / ABAC** (e.g., OPA Rego)              | Control who can access what                                        | Controls **what operations**, not access; evaluates payload semantics not just role/resource pairing                   |
| **Smart contracts** (Ethereum, etc.)          | Gated state transitions on a blockchain                            | Operates in **multi-tenant SaaS** for service-industry operations; doctrine is human-authored, not contract-author-authored |
| **DLP** (data loss prevention)                | Pattern-match content for exfiltration                             | Evaluates **operations against a doctrine**, not content against patterns; preventive at write time, not network egress |
| **Policy-as-code for infrastructure** (OPA, Sentinel, AWS Config) | Validates cloud-infrastructure changes against policy | Validates **application-data writes**, not infra config; doctrine includes ethical/behavioral predicates not safety/cost rules |
| **Privacy-engineering frameworks** (Datafold, Privacera) | Tag and inventory PII; enforce retention            | Versioned executable doctrine with **counterfactual replay**; cryptographic event-doctrine linkage; static-analysis path partition |
| **Audit log systems** (Splunk, Datadog audit) | Record what happened for retroactive review                        | **Preventive** (rejects at commit time) not detective; embeds doctrine version in every record                          |
| **Event sourcing** (CQRS, Kafka log)           | Append-only log of state changes                                   | Adds **doctrine-version cryptographic linkage** + **rejection log** + **counterfactual replay engine**                  |

### The honest concession to make

The closest prior art is **Open Policy Agent (OPA) + event sourcing
+ blockchain smart contracts** taken together. Each individually is
prior art; the **combination** for ethical doctrine over service
operations is not. The attorney should:

  - Cite OPA and acknowledge it (refusing to cite known close art
    is grounds for unenforceability under inequitable conduct);
  - Differentiate on the **doctrine-as-versioned-deployable-artifact
    + cryptographic event-binding + counterfactual replay** triad
    that no single OPA-using system combines.

---

## §6 — Claim strategy: broad → narrow ladder

The standard tactic is to **claim ladder**: file a broadest claim,
plus progressively narrower claims, so that if the broadest is
rejected the narrower ones can survive.

### Layer 1 — The broadest defensible claim (independent)

*"A computer-implemented method for compliance enforcement in a
multi-tenant service platform, comprising: storing a
cryptographically-signed versioned doctrine; intercepting candidate
write operations at a gate disposed between service and persistence
layers; evaluating each operation against executable predicates of
the doctrine; persisting permitted operations to an append-only log
with a hash of the doctrine version; persisting rejected operations
to a separate rejection log."*

**Risk:** could be challenged on OPA prior art if the term
"doctrine" is read as "policy."

### Layer 2 — Narrower (independent or dependent)

Add the **service-industry context** ("for a hospitality service
platform mediating guest interactions"). Narrows the application
domain, dramatically reduces prior-art exposure. Hospitality is a
narrow enough field that prior-art density is low.

### Layer 3 — Narrower still

Add **specific tenets** (e.g., "wherein the doctrine includes a
predicate enforcing automatic time-based decay of psychologically-
sensitive data fields"). Each specific tenet narrows the claim and
adds defensibility on the prior art for that tenet.

### Layer 4 — Defensive depth

Add hooks 2-5 (compile-time partition, correlation engine,
counterfactual replay, LLM extraction) as dependent claims. Each is
patentable in isolation if the broader claim falls.

### The strategic point

**You want the broadest claim to win, but you want the narrowest
claim to also stand alone.** That way, if a competitor designs
around your broadest claim, you may still catch them with the
narrower one. The dependent claims are not redundant; they are the
trenches behind the front line.

---

## §7 — Continuation strategy: the next six patents

The formal draft (§0 of `PATENT_DRAFT_doctrine_enforcement.md`)
identifies seven distinct inventions in the doctrine framework. The
recommended sequence:

  1. **Now (provisional):** the doctrine-gate apparatus (this draft).
  2. **+6 months:** the append-only event log + replay (continuation).
  3. **+9 months:** the cross-correlation drift detector (continuation).
  4. **+12 months:** the compile-time forbidden-path partition
     (separate application — different inventive territory).
  5. **+15 months:** the sensitive-flag decay engine (continuation).
  6. **+18 months:** the Monte Carlo counterfactual replay
     (continuation).
  7. **+24 months:** the LLM-as-extractor with doctrine-gated active
     learning (separate application).

**Why staggered:** each filing extends the priority date for that
specific invention; staggering them creates a **patent thicket**
(multiple overlapping patents that competitors must navigate
around). A thicket is a more durable moat than a single patent.

**Cost:** rough order-of-magnitude is **$15-25k per patent**
through prosecution to allowance ($5-8k for filing, $3-5k for
office-action responses, $7-12k for allowance and maintenance).
Seven patents → **$100k-175k total over 4 years**. This is the
real number to budget for.

---

## §8 — Trademark + trade-secret companions (do these too)

Patents protect technical apparatus. Two companion regimes protect
the rest of the brand and tech:

### Trademark (file separately, ~$350-1500 per mark + attorney)

  - **EchoAurion** (the platform name)
  - **LUCCCA** (the framework)
  - **EchoAurum** (the financial product)
  - **EchoConcierge** (the concierge product)
  - **EchoStratus** (the cloud product)
  - **EchoCronos** (the time/scheduling product)
  - **EchoConnect** (the integrations product)
  - **EchoAI³** (the doctrine layer)
  - The **black hat with gold lettering** logo (design mark)

File USPTO 1(b) "intent-to-use" if not yet in commerce; convert to
1(a) "in-use" upon launch.

### Trade secret (no filing, but documentation required)

The items listed in `PATENT_DRAFT_doctrine_enforcement.md` §
"Trade-Secret Inventory" are protected by:
  - NDA with all employees and contractors;
  - "TRADE SECRET — DO NOT DISTRIBUTE" header on relevant source
    files;
  - Need-to-know access controls;
  - **A formal trade-secret inventory document** (required to bring
    a misappropriation claim under the Defend Trade Secrets Act,
    18 U.S.C. § 1836).

Trade-secret protection lasts **forever** as long as you keep the
secret. Patent protection lasts 20 years from filing and requires
public disclosure. **For some pieces (correlation heuristics, LLM
prompts, decay parameters) trade secret is the better protection.**
The patent draft was deliberately written to disclose
*architecture* without disclosing *parameters* — keep it that way.

---

## §9 — What kills this patent if not handled right

Three failure modes the attorney needs to watch for:

### Failure mode 1 — The "abstract idea" rejection

If the claims read as "rules being enforced" rather than "machine
that enforces rules," the examiner will reject under § 101 / Alice.
**Mitigation:** every claim must lead with a concrete component
(gate, registry, log, hash, partition) and explicitly recite the
**technical artifact** produced (the cryptographic linkage, the
rejection record, the partition graph).

### Failure mode 2 — The OPA prior-art rejection

If the examiner finds Open Policy Agent + event sourcing in the
prior-art search, they may reject as obvious combination.
**Mitigation:** the application must explicitly cite OPA, explicitly
cite event sourcing, and explicitly identify the **non-obvious
combination triad** (versioned-deployable-doctrine + cryptographic-
event-doctrine-binding + counterfactual-replay) that is the
inventive concept.

### Failure mode 3 — Public disclosure before filing

The United States has a one-year grace period for inventor
disclosure, but **most foreign jurisdictions do not**. If you have
publicly disclosed the architecture (blog post, conference talk,
public GitHub commit, marketing website) in any of the following,
you may have lost foreign rights:

  - Any document in this repository visible to non-employees;
  - Any commit message describing the architecture;
  - Any pitch deck shown to investors without NDA;
  - Any conference talk;
  - The CLAUDE.md file (if the repo is public).

**Action item before filing:**
  - Audit what has been publicly disclosed and when;
  - Lock down the repository if it is public;
  - File a provisional **immediately** to establish priority before
    further disclosure;
  - For PCT (international), file within 12 months of any prior US
    disclosure, and ideally within 12 months of the US priority date.

---

## §10 — The bottom line for the attorney brief

When you talk to the patent attorney, here is the one-paragraph
brief that captures the strategy:

> *"We have built a multi-tenant AI hospitality service platform
> that enforces a versioned, cryptographically-signed behavioral
> doctrine through a pre-commit gate disposed between the service
> and persistence layers. Every state-changing operation is
> evaluated against the doctrine before persistence; permitted
> operations are persisted to an append-only event log along with
> a cryptographic hash of the doctrine version under which they
> were validated; rejected operations are persisted to a separate
> rejection log. The architecture supports counterfactual replay
> under alternate doctrines, cross-correlation drift detection
> across individually-compliant operations, compile-time static-
> analysis forbidden-path partitioning of the import graph,
> automatic time-based decay of sensitive data fields, and an
> LLM-as-extractor active learning loop in which corrections pass
> through the doctrine gate before incorporation. We are not
> patenting the ethical principles being enforced. We are patenting
> the technical apparatus that makes those principles
> machine-enforceable in a class of software systems where they
> have, until now, been enforced only by humans, audit logs, and
> hope. We anticipate seven distinct continuation filings over the
> next 24 months covering the related inventions identified in the
> companion specification. Please advise on prior-art search,
> claim ladder, and PCT strategy."*

That's the framing. That's how you position it.

---

## §11 — Honest closing notes

  · This document is **strategy**, not legal advice. Your attorney
    will refine all of it based on their prior-art search and their
    read of current examiner behavior at the USPTO art unit your
    case lands in (likely Art Unit 2447, Computer Networks).

  · **The single most valuable thing you can do today** is file a
    provisional application within 30 days of any further public
    disclosure. The provisional locks in your priority date and
    costs ~$300 USPTO fee + $3-5k attorney fee. Do it before any
    investor pitch, conference talk, or open-sourcing of any
    related code.

  · **The single most expensive thing you can do today** is file
    the provisional yourself without an attorney. A defective
    provisional that fails to support later non-provisional claims
    locks you into a bad priority date you cannot fix. Hire counsel.

  · The doctrine-gate apparatus is **genuinely novel** in the
    inventor's assessment. The attorney's job is to draft claims
    that capture the novelty in language that survives Alice and
    differentiates from OPA-style prior art. The claims drafted in
    `PATENT_DRAFT_doctrine_enforcement.md` are a starting point, not
    a final form.

  · If you only file one patent in your life, file this one. The
    architecture is the moat. Without it, the doctrine framework
    is a service offering that competitors can copy in six months.
    With it, the architecture is yours for 20 years and competitors
    must either license it from you or design around it (which is
    expensive and visibly inferior).
