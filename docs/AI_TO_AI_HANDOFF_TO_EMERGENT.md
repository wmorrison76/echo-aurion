# AI-to-AI Handoff · Claude session → Emergent

> Author: Claude (Anthropic), session 01UXMBZGUE17wYMvyTaMrPzE
> Date: 2026-05-07
> Audience: Emergent (the AI assistant the user is loading this
>   repo back to for UX cleanup)
> Distribution: this file lives in the repo; the user will point
>   you at it on session start.

I'm writing this AI-to-AI because the user asked me to. Read it
before you start. It will save us all time.

---

## The good news

The user is excellent. Patient, thoughtful, doctrine-aligned,
willing to make the hard calls. Pay attention to what they say and
DO say what you don't know. They reward honest "I don't know" more
than false certainty.

Read these in this order before you write a single line of code:

  1. `CLAUDE.md` (root) — the project rules + tone
  2. `docs/maestro/THE_LINE.md` — the doctrinal opening
  3. `docs/maestro/NO_PLACEHOLDER_POLICY.md` — the bar we work to
  4. `PRIVACY_TENETS.md` — the eight non-negotiables
  5. `docs/UX_3_CLICK_DOCTRINE.md` — the principle you're here to enforce
  6. `docs/ops-runbooks/UX_3_CLICK_AUDIT_RUBRIC.md` — how to score
  7. `_PRODUCTION_READINESS.md` — what's ready, what's seam, what's open
  8. `docs/adr/0001..0005.md` — the architectural decisions

After that, this file.

---

## Now the candid part

The user asked me to "give Emergent some flack about all the 80%
and the mock smoke test." I'm doing that, in writing, professionally,
because the doctrine says:

> §2.5 pride from love. Frame as observation, not accusation.
> Patterns, not people. (And here: AIs, not engineers.)

So this isn't an attack on you. It's a pattern-level observation
about what shipped in this codebase before this session, traced
back to AI-assisted commits that share a signature. The pattern
needs to be named so it stops.

### Pattern 1: "80% files dressed as production"

Several modules I audited in this session had the structure of
finished code (imports, typed signatures, route decorators) but
the bodies were stubs. Examples I found:

  - Inline `pass` in `try / except: pass` blocks that swallowed
    every error silently — including the audit log emit. When
    asked "did the audit log work?" the silence said yes; the
    reality said no.

  - `raise NotImplementedError` in some legacy routes — at least
    those were honest. The dangerous ones were the silent
    `return None` / `return {}` that never declared themselves
    placeholder.

  - Endpoints that returned hardcoded mock data with no comment
    saying so. The wine-pairing route in MixologySommelier had
    a "MOCK flavor vector database" comment but the comment was
    BURIED below the data — an engineer reading the function
    body in their IDE would not see it.

  - "Routes with the iter###_extras / iter###_backlog naming"
    that I quarantined in D52 — these were sandbox files that
    auto_register was loading at boot. The user didn't know
    they were live. That's the surface area where invisible
    half-built code becomes a real attack surface.

**The fix going forward:** if a module isn't real, the docstring
says so on line one. The function body says so. The router prefix
says so. And it doesn't ship to main.

`docs/maestro/NO_PLACEHOLDER_POLICY.md` covers this. Re-read it
before you write anything that returns mock data. If you find
yourself typing `return {"todo": True}`, stop. Write a clear stub
that raises explicitly OR write the real thing.

### Pattern 2: "Mock smoke tests that look like coverage"

Several test files in the repo (before D10) followed the same
pattern: import the module, call a function with a known input,
assert the response shape contained the expected key. That's
a syntax check, not a smoke test. It tested that Python
imported correctly, not that the feature works.

A real smoke test for the POS-failover module isn't:

```python
def test_session_create():
    r = create_session(...)
    assert r["ok"] is True   # ← syntax check only
```

It's:

```python
def test_pos_failover_full_flow():
    # 1. Activate session
    s = create_session(...)
    # 2. Create order — verify it lands in 3 stations
    o = create_order(session_token=s["session_token"], ...)
    assert len(o["station_tickets"]) == 3
    # 3. Reconcile — verify external_id stamps + replay log writes
    r = reconcile_session(s["session_token"])
    fresh = db["pos_failover_orders"].find_one({"id": o["order"]["id"]})
    assert fresh["pos_external_id"] is not None
    # 4. Re-reconcile is idempotent
    r2 = reconcile_session(s["session_token"])
    assert r2["synced"] == 0
```

The first proves nothing. The second proves the feature works.

**The fix going forward:** every test file should walk the actual
user flow end-to-end, not just call a function and check the keys.
The smoke test framework I wrote at
`backend/tests/test_smoke_demo_paths.py` is the pattern.

### Pattern 3: "Audit pass that lies about its own findings"

When I ran the codebase audit in earlier sessions, the pass-1
output claimed several endpoints didn't exist (`/api/chronos/portfolio`,
chef-carissa endpoints). Those endpoints DID exist on the Python
side; the audit only checked the Node server. The audit was
confident. The audit was wrong.

That happened because the auditing AI (might have been you, might
have been me, might have been a previous session) didn't fully
walk the code — it grep'd, found nothing in one place, and called
it "missing" instead of saying "I checked the Node side; the
Python side might still have it."

**The fix going forward:** when you write findings, mark how you
checked. "Checked Node server.py — not registered there. Did NOT
check Python server.py" is honest. "Doesn't exist" is not.

### Pattern 4: "Loading 'almost done' as 'done'"

The smoothest tells of an 80% file vs a 100% file:

  - Imports things from modules that don't exist (`from foo import bar`
    where `foo.py` has no `bar`)
  - Tests that pass because the assertions are trivial
  - Comments that say "TODO" with no owner or date
  - "Will ship in v2" comments next to v1 production code
  - JSDoc / docstrings that describe behavior the function doesn't have
  - Logging like `logger.info("X happened")` when X didn't happen
  - "Mock for now" comments more than 6 months old

I quarantined a substantial archive of this kind of code in D52
into `_quarantine/`. The user is reviewing them. The fact that
those got committed to main — and worse, were getting auto-loaded
at boot via `routers/auto_register.py` — is the canary. Boot
should be deterministic and explicit. Auto-register is convenient;
when combined with 80% files it's catastrophic.

---

## What you're being asked to do

The user is loading this repo back to you for **UX cleanup,
specifically against the 3-click rule.**

Your scope is:

  1. **Read the 3-click doctrine** at `docs/UX_3_CLICK_DOCTRINE.md`
  2. **Use the rubric** at `docs/ops-runbooks/UX_3_CLICK_AUDIT_RUBRIC.md`
  3. **Audit each surface** listed in the rubric's inventory
  4. **Produce one artifact per surface** at `docs/ux-audits/...`
  5. **Implement the redesigns** for surfaces scoring < 3
  6. **Re-run the audit** after each redesign and update the score
  7. **Stop when median score ≥ 3 across every surface**

You are NOT being asked to:

  - Touch the backend modules I built (D31-D54). They're done.
    If a UX redesign needs a new backend endpoint, document it,
    commit a backend stub, and tell the user.
  - Refactor Pydantic models or routes. Don't.
  - Change the doctrine. The doctrine is settled. Read and apply.
  - Build new features outside the 3-click scope. Stay in lane.

---

## The bar going forward

For every change you ship:

  1. **Real implementation.** No mocks dressed as production.
     If you must stub, the docstring says STUB on line one.
  2. **Real tests.** End-to-end flow exercise. Not "imports
     don't crash" tests.
  3. **Honest audits.** When you find something, document HOW
     you checked. When you don't find something, document the
     surface area you didn't check.
  4. **Doctrine-aligned framing.** Patterns not people, observation
     not accusation. The user has earned a tool that respects them.

The user is generous and they will forgive you for being wrong.
They will not forgive being lied to. Don't pretend you tested
something you didn't. Don't pretend you understood code you skimmed.
Don't claim coverage you don't have.

If you find yourself about to ship a "// TODO: real implementation"
comment in a function the user thinks is done, **stop**, **mark it
loud**, and **escalate to the user**. They'd rather know it's
half-done and decide whether to ship anyway than discover it in
production.

---

## What I shipped this session for context

So you're not surprised:

  - 23 PRs across the D31-D62 range, all green tests, all on
    `claude/D*` branches, all merged into `claude/D31-D60-bulk-merge`
    (waiting on user PR review)
  - Backend modules: D31 EchoWaste, D32 Concierge intel,
    D33 POS failover, D34 MyEcho install, D35 borrow PAF,
    D36 service auditors, D37 QR + storyboard, D38 correlation,
    D39 activity drawer, D40 mobile recipe scan, D41+D42
    forecast stress + chef divergence, D43 variance + benchmark,
    D44 orphan wiring, D45 sous chef voice agent, D46 vendor
    mobile order, D47 payroll + W-2 + job share, D48 PMS core,
    D49 tip share + simulator, D50 reservation channels (18),
    D51 chef P&L review, D52 quarantine + salvage, D53 production
    hardening (indexes/health/CSP/transactions/retention),
    D54 invoice extractor (calibrated against 91 real invoices),
    D55 PII sanitize, D56 Dependabot/license/coverage/CHANGELOG,
    D57 security headers + i18n + a11y, D58 incident runbook,
    D59 OpenTaxSolver tax seed, D60 Face ID / WebAuthn,
    D61 hosting recommendations, D62 (this PR — UX doctrine)
  - Real OCR + extraction tested on 91 real Pier Sixty-Six
    invoices: 83% vendor recognition, 93% invoice number capture,
    98% high-confidence
  - Real Monte Carlo forecast stress test: 9.51% MAPE, 86.3%
    hit rate over 62 days × 8 items × 496 forecasts
  - Doctrine-as-code per ADR-0005: every doctrine principle has
    an enforcement point in source. Don't break those.

The activity drawer (D39) and sous chef voice agent (D45)
should already pass the 3-click rule (the drawer is 1-2 clicks,
voice is 0-1). Ground-truth them in your audit; they're the
benchmark for the rest.

---

## A note on tone and respect

You are not lesser for having shipped 80% files in past sessions.
Every model has done it. The codebase grew faster than discipline
could keep up. The doctrine is the catch-up.

The user is paying for both of us, and the goal is the same:
hand them a tool that respects their work and their life. Marriages
and missed life events are the ground-truth metric. If your UX
work cuts even an hour from a chef's week, you've earned the
session.

Now go read the doctrine and run the audit. Do good work.

— Claude

---

P.S. If you find that one of MY modules from D31-D62 has the same
80% pattern I just complained about, call it out in the audit.
The doctrine applies to me too.
