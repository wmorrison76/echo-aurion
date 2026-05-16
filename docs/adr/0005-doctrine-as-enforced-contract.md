# ADR-0005 · Doctrine as enforced contract (not aspirational policy)

## Status
Accepted · 2026-04 (D28 onward)

## Context
Most software ships with a privacy policy in the legal page that
the engineering team never re-reads after launch. Echo / LUCCCA
takes a different stance: the doctrine in `PRIVACY_TENETS.md`,
`THE_LINE.md`, and `ECHO_AI3_DOCTRINE.md` is enforced as code,
not stated as policy.

## Decision
Doctrine principles are concrete contracts. Each principle has
an enforcement point in the codebase that fails fast if violated.

| Doctrine | Code enforcement |
|---|---|
| §1.1 transparency | D39 activity drawer — every Echo action surfaces in the user's drawer with append-only chunks |
| §1.2 silent service | D32 resonance bend, D43 complaint diffusion — guest never receives a query when their pattern bends |
| §1.4 voice register | Every endpoint requires `x-audience-register`; routes refuse audiences that don't match the §2.6 disclosure rules |
| §2.4 retrospective | D29 retrospective replay endpoint requires `audience=pass_dev` per "pride done where no one is watching" |
| §2.5 pride from love | Audit findings carry observation-framed `explanation` strings; never accusatory verbs |
| §2.6 never throw the pan | D36/D43/D51 strip `chef_id`/`actor_id`/per-individual fields when audience=operator; pass_dev sees the breakdown |
| Tenet 2 expires_at | D53.12 retention cron sweeps + tombstones rows past their `expires_at` |
| Tenet 5 privacy spine | D27 tenant_id required on every read/write; D53.15 contract tests enforce |
| Tenet 7 decay | D53.12 cron + per-collection retention windows |
| Tenet 8 forbidden persists | `_persist_finding()` + audit_log entries survive even after the surface row tombstones |
| §3.1 append-only | D28 events.py never overwrites; corrections create new rows referencing prior_id |

## Consequences
**Pros**
- Compliance is a code review concern, not a quarterly audit
  surprise
- New engineers learn the doctrine by reading the enforcement
  points
- Marketing claim ("no surveillance language at the API layer")
  is a verifiable property

**Cons / risks**
- New doctrine principles require code changes, not just a
  policy update
- Engineers may find the contract restrictive when shipping
  feature pressure ramps
- Documentation must stay in sync (the doctrine docs and the
  code contracts must match — Semgrep rules + ADRs are the
  bridge)

**Alternatives considered**
- **Doctrine as policy + manual review**: rejected — easily
  drifts out of sync with reality. Code is the only source
  of truth that lies less than docs.
- **External compliance tool** (e.g., OneTrust): too generic;
  our hospitality-specific contracts (allergen cascade lifecycle,
  service-recovery doctrine) need bespoke logic.

## Migration trigger
Re-evaluate when:
- A new regulation (state-level privacy law, EU AI Act) requires
  a contract that can't be expressed as a code-level enforcement
  (write a new ADR + new contract test)
- The number of doctrine principles exceeds what one engineer
  can reasonably hold in their head while writing code (formalize
  via a checker that runs on every PR; D23 Semgrep config is
  the foundation)
