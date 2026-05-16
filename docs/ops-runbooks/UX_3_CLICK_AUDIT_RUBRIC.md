# 3-Click UX Audit Rubric

> Companion to `docs/UX_3_CLICK_DOCTRINE.md`. This is the scoring
> framework. Use it for every surface; produce one audit artifact
> per surface in `docs/ux-audits/YYYY-MM-DD-{surface}.md`.

---

## How to run an audit (per surface)

1. Open the surface in a real browser/PWA (not source). You're
   measuring what the user sees, not what the developer intended.
2. List every distinct action on the surface (verbs the user can
   take — "save recipe," "approve PAF," "add tip share rule").
3. For each action, **count the taps from home** to "done state."
4. Score it against the rubric below.
5. Fill out the artifact template at the bottom.

---

## The scoring rubric

For each action, assign a score:

| Score | Tap count | Color | Action required |
|---|---|---|---|
| **5** | 0 (voice / ambient) | 🟢 | None — exemplary |
| **4** | 1–2 | 🟢 | None — meets bar |
| **3** | 3 | 🟢 | None — at bar |
| **2** | 4 | 🟡 | Redesign before launch |
| **1** | 5–6 | 🔴 | Redesign immediately |
| **0** | 7+ | ⛔️ | Block launch on this flow |

A surface's overall grade is the **median score across all its
actions** — not the average. We don't want a single 5-score
voice action papering over 10 four-tap forms.

---

## Specific things to count or NOT count (consistent rules)

These are the rules I use; if Emergent or any other reviewer
deviates, document why.

✅ **+1 tap** for each of:
  - Tap on a button, link, list item, dropdown, switch (when user-initiated)
  - Confirmation modal accept (the modal itself is a violation;
    count the tap and flag the violation)
  - Tab switch
  - Hitting Enter to submit a form
  - Back navigation when it's part of the intended flow

✅ **+1 tap per character** when the user has to type a unique value
  (e.g., "type 'DELETE' to confirm"). These are dangerous-op exceptions
  per the doctrine; flag them as such.

❌ **0 taps** for:
  - Page load itself (audit starts at "home loaded")
  - Scroll, pinch, zoom
  - Pull-to-refresh
  - Voice activation ("Hey Echo")
  - Auto-fill from previous session

---

## Surfaces to audit (current inventory)

These are the surfaces Echo / LUCCCA already has or will have at
launch. Each gets its own audit artifact.

### Operator-facing
  - [ ] **Manager Dashboard** (`client/modules/.../manager-dashboard`)
  - [ ] **Approval Inbox** (D18 + D26)
  - [ ] **Schedule view** (D11 unified — was AutoScheduling + Schedule)
  - [ ] **Variance summary** (D43)
  - [ ] **Service auditor findings** (D36)
  - [ ] **Forensic findings inbox** (D30)
  - [ ] **Concierge alert review** (D32)
  - [ ] **Activity drawer** (D39) ← already 1-2 click; ground truth this

### Chef / kitchen
  - [ ] **Recipe library + by-category** (D34, D52 salvage)
  - [ ] **Sous chef voice agent** (D45) ← 0-click; ground truth this
  - [ ] **BEO digest** (D45 4-day compile)
  - [ ] **Production sheet** (existing)
  - [ ] **Mobile recipe scan** (D40)
  - [ ] **Voice recipe** (D39)
  - [ ] **Vendor mobile order** (D46)
  - [ ] **Tip share what-if** (D49)

### Server / FOH
  - [ ] **POS-failover server PWA** (D33)
  - [ ] **Reservation list (unified)** (D50)
  - [ ] **Allergen alert tile** (D32)

### Employee self-service (MyEcho)
  - [ ] **Home tiles** (D34 station-aware)
  - [ ] **Paystub view** (D47)
  - [ ] **Direct deposit edit** (D47)
  - [ ] **W-2 download** (D47)
  - [ ] **Job share post + claim** (D47)
  - [ ] **Schedule request** (D47)
  - [ ] **Shift swap** (existing + D47 job-share)
  - [ ] **Face ID enroll + login** (D60)

### Guest-facing (mobile menu / IRD / concierge)
  - [ ] **Mobile menu with allergens** (D37)
  - [ ] **IRD order flow** (existing)
  - [ ] **Concierge storyboard** (D37 Instagram-style)
  - [ ] **QR install MyEcho** (D34)

### Admin / accounting
  - [ ] **Tip-share policy editor** (D49)
  - [ ] **Payroll run + post** (D47)
  - [ ] **Vendor PO submission** (D46)
  - [ ] **PMS check-in / out** (D48)
  - [ ] **QR library + multi-print** (D37)

---

## Audit artifact template

Save each as `docs/ux-audits/YYYY-MM-DD-{surface_slug}.md`.

```markdown
# UX Audit · {Surface name}

**Auditor:** {Your name / "Emergent" / "Claude session #N"}
**Date:** YYYY-MM-DD
**Source files audited:**
  - client/modules/.../path/to/component.tsx
  - client/modules/.../path/to/index.tsx

**Backend endpoints involved:**
  - POST /api/echo/foo
  - GET /api/echo/bar

---

## Actions on this surface

| # | Action | Taps from home | Score | Color | Notes |
|---|---|---|---|---|---|
| 1 | Save recipe | 4 | 2 | 🟡 | Goes home → "+" → form → "Add ingredients" modal → save. Modal adds 1. Redesign: pre-show 3 ingredient rows. |
| 2 | Approve PAF | 2 | 4 | 🟢 | Notification → tap. At bar. |
| 3 | Run payroll | 5 | 1 | 🔴 | Settings → Payroll → Period → Confirm date → Run. Should be Home tile → period picker → run. |

**Surface median score:** 2 (yellow — redesign before launch)

## Recommended redesign

For each row scoring < 3:

### Action 3 — Run payroll
**Today:** 5 taps via Settings menu.
**Target:** 3 taps from home.
**Specific change:**
  - Add "Run payroll" tile to manager home (replaces/joins
    existing "Payroll history" tile)
  - Tile click → calendar with prev/current/next period
    pre-loaded → "Run" CTA
  - Eliminates the Settings nav and the date confirmation modal

**Backend support check:**
  - POST /api/payroll/run/{outlet_id} ← exists (D47)
  - Period dates auto-derived from current date ← yes
  - No backend change needed

**Voice intent (Path B):**
  - "Run payroll for this period" → triggers /api/echo/sous-chef/intent
  - Add to D45 INTENT_PATTERNS: `r"run\s+payroll"` →
    payroll_run skill (new — needs implementation)
  - With voice path: 0 taps; 5-tap UI path becomes acceptable as
    fallback, but voice is now primary

## Forbidden-pattern violations found

  - [x] "Are you sure?" modal on save → replace with toast + undo
  - [ ] Multi-step wizard
  - [ ] Hidden in three-dot menu
  - [ ] Login between actions
  - [ ] Empty state with "Click here"

## Doctrine alignment

  · §1.2 silent service: {ok / violation reason}
  · §2.5 pride from love: {ok / violation reason}
  · D60 Face ID: re-auth flows checked? {y/n}

## Closing recommendation

{One paragraph: ship as-is, redesign before launch, or block.}
```

---

## What "done" looks like

- Every surface in §"Surfaces to audit" has an artifact in
  `docs/ux-audits/`
- Every action with score < 3 has a documented redesign plan
- The summary at the top of each artifact shows the median
  score and the change in score after the proposed redesign
- A roll-up report at `docs/ux-audits/_SUMMARY.md` lists each
  surface's score before / after redesign

When all surfaces are at median ≥ 3 (green), the 3-click rule is
held and we ship.

---

## Audit-of-the-audit (meta)

The auditor records HOW they counted (was the modal a "tap" or
not in their count?) so the next auditor uses the same rules.
Consistency > perfection.

If an exception class applies (per doctrine §"When 3 clicks isn't
enough"), document it explicitly:

> Action #4 — "Drop database collection" — 7 taps. Exception
> class A (dangerous op). Documented in
> `docs/exceptions/dangerous-ops.md`. Approved.

Otherwise: no exceptions. The doctrine is the doctrine.
