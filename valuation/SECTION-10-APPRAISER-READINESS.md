<!-- Section 10 appraiser readiness — covers 10.4 NDA template + 10.5 data room structure. 10.1 (appraiser shortlist), 10.2 (budget), 10.3 (turnaround) are founder-decision items. -->

# Section 10 — Appraiser Engagement Readiness

**Date:** 2026-05-13
**Scorecard refs:** 10.4 NDA template, 10.5 single POC + clean data room

---

## 10.4 — NDA Template (Mutual Confidentiality Agreement, Founder/Counsel/Appraiser)

> **DRAFT TEMPLATE — Review with counsel before signing.** This template is a starting framework for an attorney to finalize; use of unmodified template without legal review is at operator's risk.

### MUTUAL CONFIDENTIALITY AGREEMENT

**This Agreement** is made and entered into as of the date last signed below (the "Effective Date"), by and between:

- **William J. Morrison** ("Owner"), an individual, on behalf of himself and his wholly-owned entity (collectively, the "Disclosing Party"), and
- **[NAME OF APPRAISAL FIRM / APPRAISER / COUNSEL / OTHER]** ("Receiving Party")

(each a "Party," collectively the "Parties").

### 1. Confidential Information

For purposes of this Agreement, **"Confidential Information"** means any non-public information disclosed by the Disclosing Party to the Receiving Party in connection with the proposed engagement, including without limitation:

- Source code, technical specifications, architectural documents, and engineering documentation related to the LUCCCA / EchoAi³ platform
- Strategic positioning documents, pricing models, financial projections, and business plans
- Patent draft documents, intellectual property filings (whether filed or pending)
- 409A valuation evidence packs, scorecards, algorithm inventories, white papers, and related materials
- Identity of third parties (customers, prospects, partners) and the nature of any business relationship
- Algorithm internals, novelty claims, and trade-secret-protected methodology

Information is Confidential whether disclosed orally, in writing, electronically, or by any other means, and whether or not specifically marked or designated as "Confidential."

### 2. Exclusions

Confidential Information **does not** include information that:
(a) was rightfully in the Receiving Party's possession prior to disclosure, without obligation of confidentiality;
(b) is or becomes publicly known through no fault of the Receiving Party;
(c) is rightfully received from a third party without confidentiality obligations;
(d) is independently developed by the Receiving Party without reference to the Disclosing Party's Confidential Information; or
(e) is required to be disclosed by law, regulation, or valid court order, *provided that* the Receiving Party gives the Disclosing Party prompt written notice prior to such disclosure to permit the Disclosing Party to seek a protective order.

### 3. Receiving Party's Obligations

The Receiving Party agrees:
(a) to hold the Confidential Information in strict confidence;
(b) to use the Confidential Information solely for the **Purpose** defined below (and for no other purpose);
(c) to limit access to the Confidential Information to employees, agents, or representatives of the Receiving Party who have a need to know for the Purpose AND who are bound by written confidentiality obligations no less protective than this Agreement;
(d) not to reverse-engineer, decompile, or attempt to derive source code, algorithms, or trade secrets from any artifact (including binaries, models, or training data);
(e) to use the same degree of care to protect the Confidential Information as the Receiving Party uses to protect its own confidential information of similar importance, but in no event less than reasonable care.

### 4. The Purpose

The Confidential Information is being disclosed solely for the purpose of **[ engagement-specific purpose, e.g., "performing an independent 409A valuation of the Disclosing Party's entity" or "providing IP/legal counsel" or "evaluating a strategic transaction" ]** (the "Purpose").

### 5. No License

This Agreement does not grant the Receiving Party any license, ownership, or rights of any kind (express or implied) in the Confidential Information, except the limited right to use it for the Purpose.

### 6. Return / Destruction

Upon the earlier of (a) completion of the Purpose, (b) written request by the Disclosing Party, or (c) termination of this Agreement: the Receiving Party shall return or destroy (at the Disclosing Party's election) all Confidential Information in the Receiving Party's possession, including all copies, notes, summaries, derivative materials, and all electronic copies.

### 7. Term

This Agreement remains in effect for **seven (7) years** from the Effective Date with respect to disclosure obligations. Confidentiality obligations survive termination and expiration for any Confidential Information that constitutes a trade secret under applicable law.

### 8. Remedies

The Receiving Party acknowledges that breach of this Agreement may cause irreparable harm for which monetary damages would be inadequate. The Disclosing Party is entitled to seek **injunctive relief** in addition to all other remedies available at law or in equity.

### 9. Governing Law / Venue

This Agreement is governed by the laws of the **State of Delaware** (or the operator's elected state of incorporation), without regard to its conflicts-of-laws principles. The Parties consent to exclusive jurisdiction and venue in the state and federal courts located in **[County]**, **State**.

### 10. Miscellaneous

(a) **Entire Agreement.** This Agreement constitutes the entire agreement between the Parties regarding its subject matter.
(b) **Amendments.** Any amendment must be in writing and signed by both Parties.
(c) **Severability.** If any provision is unenforceable, the remainder of this Agreement remains in effect.
(d) **No Waiver.** Failure or delay in enforcing any right does not waive it.
(e) **Counterparts / Electronic Signatures.** This Agreement may be signed in counterparts; electronic signatures (DocuSign, etc.) are valid.

### Signatures

| Disclosing Party | Receiving Party |
|---|---|
| William J. Morrison | [Name] |
| Signature: ______________ | Signature: ______________ |
| Date: __________________ | Date: __________________ |

---

## 10.5 — Single POC + Clean Data Room

### Single Point of Contact

| Role | Identity | Contact path | Authority scope |
|---|---|---|---|
| **Engagement POC** | William J. Morrison, Owner & Founder | (operator email + phone, redacted in committed version) | Sole authority on engagement scope, document release, signing |
| **Technical reference** | (Operator-designated) | (TBD) | Read-only Q&A on platform internals; cannot release new artifacts |
| **Legal counsel** | (Operator-designated attorney, post-FO-1 engagement) | (TBD) | NDA execution, IP assignment finalization, counsel-mediated questions |

The single-POC pattern is brigade discipline: **one contact controls the engagement**. No "let me check with someone" — the operator owns it.

### Data Room Structure

```
valuation/
├── SCORECARD_2026-05-13.md                  # Section A — Master scorecard (67-item matrix)
├── SCORECARD_2026-05-13-EOD.md              # Section A — Post-pipeline rescore
├── COMPETITIVE_MAP.md                       # Section 5.1 — 25-row competitive analysis
├── ADJACENT_MARKETS.md                      # Section 8.4 — Bloomberg-thesis + 4 adjacent markets
├── SECTION-4-EFFORT-NARRATIVE.md            # Section 4.3 + 4.5 — milestones + founder time
├── SECTION-6-6-OSS-LICENSE-SWEEP.md         # Section 6.6 — OSS license compliance
├── SECTION-8-MISC.md                        # Section 8.2 + 8.3 — Buffet brief + website audit
├── SECTION-9-AUDIT-DEFENSIBILITY.md         # Section 9.1 + 9.3 + 9.4 (9.2 is SCORECARD)
├── SECTION-10-APPRAISER-READINESS.md        # THIS FILE — 10.4 + 10.5
├── algorithms/
│   ├── ALGORITHM_INVENTORY.md               # Master catalog: 14 papers + 21 algos + 10 OR methods
│   ├── 3a-decision-clearance.md             # Per-algorithm 2-pager (code-verified)
│   ├── 3b-operational-collision-detection.md # (queued — Session 4)
│   ├── 3c-yield-aware-costing.md            # (queued — Session 4)
│   ├── 3d-echo-ai3-orchestration.md         # (queued — Session 4)
│   └── 3a/ 3b/ 3c/ 3d/                      # Per-algorithm authorship.txt + timeline.txt + callgraph-*.dot (gitignored, regen via Makefile)
├── evidence/
│   ├── 2026-05-13-RUN-SUMMARY.md            # Pipeline run summary (cites all detail outputs)
│   └── 2026-05-13/                          # (gitignored — regenerable via `make valuation-evidence`)
│       ├── cloc.txt, radon-cc.txt, radon-mi.txt
│       ├── jscpd/, jscpd-stdout.txt
│       ├── vitest-coverage.txt + PIPELINE_FAILURES.txt
│       ├── sbom-npm.json, sbom-py.json
│       └── theseus/{authors,cohorts,dirs,domains,exts,survival}.json
└── git-history.csv                          # 9,749-commit CSV
```

### Cloud-mirror provisioning (founder action)

For appraiser access, the operator provisions a cloud-folder mirror of `valuation/`. Options:

- **Google Drive folder** (read-only share to appraiser's email)
- **Dropbox link** (with expiration date)
- **Internal SharePoint** (if the operator's entity has one)

Mirror requirement: **structure identical to repo `valuation/`**, dated read-only access, no edit rights. Appraiser receives:
1. The cloud link
2. The signed NDA (Section 10.4) prior to access
3. A 1-page "How to Read This Pack" briefing pointing at `SCORECARD-EOD.md` → `RUN-SUMMARY.md` → `ALGORITHM_INVENTORY.md` → individual 2-pagers

### Engagement letter framework

For the formal 409A appraisal:
- **Scope**: independent 409A valuation per IRC §409A safe-harbor guidelines, FMV determination for stock option strike price purposes
- **Term**: 6-8 weeks turnaround from engagement letter signing to draft report
- **Deliverable**: ASA/ABV/CVA-credentialed report meeting IRS safe-harbor requirements
- **Fee structure**: mid-tier appraisal $5-8K, comprehensive appraisal $8-15K (per industry benchmarks; operator confirms budget in Section 10.2)
- **Re-valuation cadence**: every 12 months OR upon material event (funding round, secondary, M&A discussion)

---

## Status (per scorecard)

| Item | State | Notes |
|---|---|---|
| 10.1 Shortlist of ASA/ABV/CVA appraisers | 🟥 | Founder activity — shortlist 3-5 boutique appraisal firms |
| 10.2 Budget range confirmed | ⚪ | Operator decision — proposed $5-15K range |
| 10.3 Target turnaround window | ⚪ | Operator decision — proposed 6-8 weeks from engagement-letter signing |
| 10.4 NDA template | **🟩** | This file (Mutual Confidentiality Agreement template above) |
| 10.5 Single POC + clean data room | **🟩** | Operator = single POC; `valuation/` structure = data room spec; cloud mirror = operator provisioning task |

---

*Yes Chef.*
