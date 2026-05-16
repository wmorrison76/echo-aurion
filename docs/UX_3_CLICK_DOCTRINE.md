# UX Doctrine · The 3-Click Rule

> Adopted: 2026-05-07
> Status: load-bearing principle (this is the bar; do not negotiate it down)
> Audience: every UX engineer, AI assistant, and product designer touching this codebase

---

## The principle

**Every operator action must be reachable in ≤ 3 taps from the home screen, OR in ≤ 1 voice utterance from anywhere in the app.**

That's the whole rule. The rest of this document is what it means in practice and how it stays enforced.

---

## Why this exists

We are building hospitality software. The user is a chef on the line during dinner service, a server with three tables waiting, a manager between shifts trying to get to their kid's recital. **Every click we add to a flow is a measurable cost** — a moment of attention they don't have, a chance for the phone to lock, a reason to put the tool down and revert to paper.

The doctrine §1.2 (silent service) and §2.5 (pride from love) demand a tool that disappears into the work. A 7-click form does not disappear. A 3-click flow does. A voice command does, fully.

This rule is also the **competitive moat**. Most competitors load you with screens because they bill per-screen — every click is revenue for them. We bill per-property and our incentive is opposite: get the human back to their kitchen. That alignment is invisible in feature comparisons and decisive in retention.

---

## The two paths

Every action must satisfy ONE of:

### Path A: ≤ 3 taps from home

  Home screen → action surface → confirm → done.

  Tap 1: choose a tile from the home dashboard
  Tap 2: choose a target / fill primary input
  Tap 3: confirm

  No more. If a flow needs more than 3 taps, it needs to be split (some
  prep done at home tile load) or merged (combine confirm into the
  action input).

### Path B: ≤ 1 voice utterance from anywhere

  "Echo, compile the BEOs for next 4 days." → done.

  No tile-tap, no menu, no nav. The voice agent (D45) intercepts
  intent and routes to the right backend skill. Ambient anywhere.

If neither path is available for an action, the action is mis-designed.

---

## What counts as a "tap"

A **tap** is any user-initiated action that requires the user to choose between
≥ 2 visible options. Specifically:

✅ COUNTS as a tap (each one is +1):
  - Tapping a button
  - Tapping a list item
  - Selecting from a dropdown
  - Toggling a switch (when it's the user's choice; if pre-toggled, no tap)
  - Confirming a modal ("Are you sure?")
  - Dismissing a modal
  - Switching a tab
  - Hitting Enter on a form
  - A back button to exit a wrong path

❌ DOES NOT count:
  - The home screen loading (taps start AFTER home is up)
  - Pull-to-refresh (the user expects ambient state)
  - Scroll
  - Pinch / zoom
  - Voice activation (use Path B)

---

## The forbidden patterns

These cannot ship. They are the doctrine equivalent of placeholders.

❌ **"Are you sure?" modals.** They add a tap to defend against a tap that
    already happened. Replace with **undo** (5-second toast that reverses
    the action). The doctrine says if a chef pressed the button by accident,
    we treat them like a chef, not like a user we don't trust.

❌ **Multi-step wizards.** Every "Next" is a tap. Collapse to one form
    where the inputs reveal as the user types.

❌ **Hidden actions behind menus.** Three-dot menus, hamburger menus,
    "More" buttons. Every action surface from a flat home screen.

❌ **Login screens between actions.** The user is already in. Face ID /
    WebAuthn (D60) handles re-auth ambiently. Never make a chef log in
    twice during one shift.

❌ **Confirmation pages after submission.** A toast is a confirmation;
    a full screen is a wall. "Saved" appears for 1.5s and vanishes.

❌ **Empty states that demand action.** If the list is empty, do not
    show "Click here to create your first X." Pre-populate or auto-create.

❌ **Tutorials that block the action.** First-time users get progressive
    disclosure (the tutorial appears AS they use the feature, not before).

---

## The voice-first promise

Voice is not a fallback. It's the primary path for the 0-click cases.

Every operator action that maps to a verb the human would say out loud
should have a voice intent in D45's classifier:

  "compile BEOs..."          → beo_compile
  "draft a menu for..."      → menu_proposal
  "tell {name} about..."     → peer_message
  "adjust schedule for..."   → popup_schedule
  "what's wrong with..."     → audit drill-in

If a feature ships without a voice intent, we add it before declaring
the feature done. Voice gates feature done-ness.

---

## How this gets enforced

### 1. The audit rubric

Every UX engineer / AI assistant working on a surface produces an
artifact at `docs/ux-audits/YYYY-MM-DD-{surface}.md` using
`UX_3_CLICK_AUDIT_RUBRIC.md`. The artifact lists every action on
that surface, its click count today, target, and the redesign needed.

### 2. CI gate (planned)

Before any PR that touches a frontend module merges to main, the
PR description must include a one-line "click budget" claim:
"This change adds N clicks to flow X." Reviewers check.

When we have a real frontend test runner (Playwright in CI), the
click counts get measured automatically.

### 3. Post-launch telemetry

Every flow gets a tap counter. A 4-tap flow shows up in the
dashboards as a yellow row. A 5-tap flow as red. The team has
a quarterly review where red rows get rewritten or escalated.

---

## When 3 clicks isn't enough

There are exceptions. They must be documented and approved.

  **Exception class A: Dangerous operations.**
    Dropping a database table, deleting a guest record. These get
    a re-confirmation that's deliberately friction-positive. But
    the friction is "type the resource name to confirm" — not "are
    you sure?" because typing the name is **proof of attention**,
    not just an additional tap.

  **Exception class B: Multi-recipient actions.**
    Sending a message to 47 people across a property, or a payroll
    batch covering 12 outlets. The path is still 3 taps, but the
    tap count grows linearly with recipient count via standard
    mobile multi-select patterns. That's not a violation — it's
    standard pattern.

  **Exception class C: Onboarding.**
    First-time setup IS a multi-step wizard. That's fine. After
    onboarding completes, it's never seen again. The 3-click rule
    applies to operational flows, not first-day setup.

Any other exception requires a doctrine update.

---

## The closing line

Tom Hill standard:
> "The only break you get is the day you got hired. After that, it's only work."

Our equivalent:
> The only screens our users should see are the ones doing the work.
> Everything else is in the way.
