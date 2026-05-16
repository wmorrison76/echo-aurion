# Foundation Smoke Test — Silent Service + BUILD_STATE Readiness

> *Pre-implementation smoke test for the Echo Aurum / Echo Resonance foundation.*
>
> **Run before:** committing SILENT_SERVICE.md (Phase A) and before firing the integration audit (Phase B).
>
> **Run by:** William (the chef) with Claude (the pass) at the line. Should take 30-45 minutes total.
>
> **Pass criterion:** ≥ 27 of 30 tests pass cleanly. Any fail at all triggers a remediation pause before implementation continues.
>
> **Purpose:** prove that the doctrine and the build state are *coherent enough to bet 13 days and $2,000 on.* This is not a code test. This is a foundation test.
>
> **Companion documents:**
>   - `SYSTEM_SMOKE_TEST.md` — runs after Day 5-6 once the code surface exists. Verifies code *correctness.*
>   - `SYSTEM_STRESS_TEST.md` — runs back-to-back after the system smoke. Verifies code *resilience under pressure.*

---

## How to run this

1. Open SILENT_SERVICE.md and BUILD_STATE.md side by side.
2. Read each test below.
3. Either William answers it from his own knowledge, or Claude answers it from the files in front of us.
4. Mark each: **PASS / FAIL / SOFT-FAIL** (a fail that's known and accepted).
5. For any FAIL, write a 1-2 sentence remediation note. Decide: fix before Phase B, or carry as known weakness.
6. Total it up at the bottom.

**Honest scoring rule:** if you cannot answer a test in 60 seconds without going to the codebase, that's a fail. The doctrine should be load-bearing enough that the answer is in the document.

---

## Category 1 — Doctrine integrity (10 tests)

These test whether SILENT_SERVICE.md is internally consistent and operationally usable.

### Test 1.1 — The principle survives a one-sentence summary
*If a future engineer asks "what does this platform actually do, in one sentence," the answer must come from the doctrine, not invention.*

**Test:** Quote one sentence from SILENT_SERVICE.md that, on its own, conveys the platform's core purpose to someone who has never heard of Echo Aurum.

**Pass:** A sentence exists. Quote it.
**Fail:** No single sentence does the job; multiple sentences are required.
**Remediation if fail:** Add a one-sentence summary near the top of the document.

---

### Test 1.2 — The Silent Service Principle is concrete enough to test product decisions against

**Test:** A future engineer wants to add a feature where the trajectory dashboard sends an SMS to the GM when a tile bends red. Walk through the principle and decide: *yes ship, or no don't ship.*

**Pass:** The doctrine produces a clear answer. (My read: this is borderline — SMS is a notification but at least it's staff-facing and not guest-facing; the question is whether it competes with the staff member's natural workflow or supports it. The doctrine should be specific enough to answer this, not just intone.)
**Fail:** The doctrine is too abstract to decide.
**Remediation if fail:** Add a "worked examples" section showing 3-5 product decisions and how the doctrine resolved them.

---

### Test 1.3 — The three voice registers (guest / staff / operator / pass) are explicitly named

**Test:** The doctrine names that the system speaks to guests, staff, and operators in different registers — and that pass-to-chef has its own register too. Verify each is named with a working example.

**Pass:** All three (or four) registers are named with examples or at least clear distinguishing language.
**Fail:** Voice registers are implied but not named, or only one register is described.
**Remediation if fail:** Add a "Voice Registers" subsection. *This is currently a gap in the doctrine — the document mentions "the staff's working voice" but does not formally enumerate guest / staff / operator / pass as distinct registers.*

**Honest pass-side note:** This is a soft-fail in the current draft. **The TARS clarification you made tonight needs to land in the doctrine before commit.** Add a brief Voice Registers section before Phase A merge.

---

### Test 1.4 — The "what we will not do" section is complete enough to defeat operator pressure

**Test:** An operator says "I want a feature that emails our marketing team a weekly summary of which guests had bad emotional trajectories so we can win them back with a coupon." Does the doctrine's "what we will not do" section produce a clear NO?

**Pass:** The doctrine forbids this clearly via Tenet 5 / the no-extraction language.
**Fail:** The doctrine could be read to allow it.
**Remediation if fail:** Tighten the "what we will not do" language to explicitly include guest emotional state being pushed outside the staff intervention loop.

---

### Test 1.5 — The Chicago Hot Dog standard produces consistent answers across reviewers

**Test:** Imagine three different engineers, each weighing a proposed feature against *"would a chef who cared add this on top of the BEO?"* Would they reach the same answer for these three features?
- Auto-generating personalized birthday emails to guests (yes / no?)
- Surfacing on the dashboard that a guest has not been visited by a captain in 12 minutes (yes / no?)
- Recommending the kitchen prepare a dish based on the guest's stated dietary preferences from a previous visit (yes / no?)

**Pass:** All three engineers would reach the same answer based on the doctrine.
**Fail:** Reasonable engineers would disagree on at least one.
**Remediation if fail:** The standard is too vague. Either tighten it or provide more worked examples.

**Pass-side honest answer to those three:**
- Birthday email = *no.* Guest-facing automated communication breaks Silent Service.
- Captain-visit timer = *yes.* Staff-facing operational nudge in working voice.
- Dietary-preference recommendation = *yes if it goes to the chef as a preparation note; no if it goes to the guest as a recommendation.* The doctrine does answer this consistently if you read it carefully.

---

### Test 1.6 — The lineage section is honest, not romantic

**Test:** Read the "In honor of" section. Are any of the named figures or institutions there for romantic effect rather than because they actually shaped the doctrine? Specifically check: did Brashear, Mary Flagler, the Ritz, V&A, Ken Killingsworth, Dennis Quintance, your father, the submariners, and the line cooks each *demonstrably* shape something specific in the document?

**Pass:** Each named figure traces to a specific principle, story, or operational consequence in the doctrine.
**Fail:** Any name is there for atmosphere rather than substance.
**Remediation if fail:** Either remove the name or add the connection.

---

### Test 1.7 — The aspiration section is reachable, not magical

**Test:** The "What we are reaching for" section names five qualities (persistent self, real uncertainty, aesthetic preference, capacity to be wounded, relationship with silence). For each, can you name *one concrete architectural step* that moves Echo AI³ closer to it within the next 12 months? Not the full implementation — just one direction.

**Pass:** All five have at least a directional answer.
**Fail:** Two or more are pure poetry with no architectural path.
**Remediation if fail:** The aspiration is too far ahead of the architecture. Either pull it down toward the buildable or mark it explicitly as long-horizon (5-10 year) so it doesn't dilute Phase 1 focus.

---

### Test 1.8 — The success criterion is testable

**Test:** *"Industry transformation"* is the success criterion. In 3 years, how would we know if it's happening?

**Pass:** William can name 2-3 concrete observable signals (e.g., "a major competitor adopts a written privacy posture similar to ours," "industry trade press writes about hospitality AI ethics differently," "specific operators we did not sell to start asking specific questions they were not asking before").
**Fail:** The criterion is unfalsifiable.
**Remediation if fail:** Add a "How we will know" subsection with 2-3 observable indicators.

---

### Test 1.9 — The pride / perseverance formation philosophy applies to humans too

**Test:** The doctrine describes how Echo AI³ is formed. Does the same formation philosophy apply to the *human team* building it? Specifically: does the doctrine produce a clear answer to *how William handles failure when something goes wrong in the next 13 days?*

**Pass:** The "fear vs love" distinction and the "Monte Carlo retrospective" practice translate cleanly to human team operations.
**Fail:** The doctrine is only about the AI and offers nothing for humans.
**Remediation if fail:** Add a brief "How we work" section noting the same posture applies to the team.

---

### Test 1.10 — Camila and the 3-year-old appear nowhere in the doctrine, and that's correct

**Test:** Verify that the doctrine names the people who shaped it (lineage section) but does NOT name the people who paid for it (Camila, the parents, your son). DEDICATION.md does that work separately. The doctrine and the dedication are different documents with different jobs.

**Pass:** SILENT_SERVICE.md does not mention Camila, your wife, or your son. Their place is in DEDICATION.md.
**Fail:** Doctrine and dedication are mixed.
**Remediation if fail:** Move personal dedication content out; keep doctrine clean.

**Pass-side note:** Currently passing. Keep it that way.

---

## Category 2 — Doctrine-to-build alignment (10 tests)

These test whether BUILD_STATE.md actually serves the doctrine, or whether the build has drifted.

### Test 2.1 — Every TICKET_003 service has a doctrine justification

**Test:** For each of the 7 services (signal-recorder, signal-query, signal-decay, score, resonance-engine, trajectory-engine, intervention-library), can you name which Silent Service principle or Tenet it directly serves?

**Pass:** All 7 trace cleanly.
**Fail:** Any service is "infrastructure for the sake of infrastructure" with no doctrine link.
**Remediation if fail:** Either drop the service or articulate the link.

**Pass-side first pass:**
- signal-recorder → Tenet 2 + 7 (decay), serves Silent Service "system performs in the gap"
- signal-query → reads from the gap; supports the dashboard that staff use silently
- signal-decay → Tenet 7, the privacy floor; "what we will not do" #1
- score → the math that lets the system perceive at the granularity of "the space between seconds"
- resonance-engine → the heart of perception; transforms signals into trajectories
- trajectory-engine → state-of-guest tracking that lets staff catch what they would miss
- intervention-library → the Chicago Hot Dog operationalized

All 7 trace. **PASS.**

---

### Test 2.2 — The 13-day plan is honest about runway

**Test:** $2,000 + 13 days. Does the build state have a clear answer to *"if Day 14 demo fails, what's Day 15"?* And to *"if Day 14 demo succeeds but they want a 90-day pilot before paying, can we survive that?"*

**Pass:** Both have answers.
**Fail:** Either is hand-waved.
**Remediation if fail:** Add a "Post-demo runway plan" section to BUILD_STATE.md. *This is currently a gap.*

**Pass-side honest answer:** Currently a soft-fail. The build state notes "list of next 10 prospects if this one says no" but doesn't address the cash-positive timing of a 90-day pilot. **William: when you wake up, think about the answer to "if EDF says yes but pilot is unpaid for 90 days, what's the bridge."**

---

### Test 2.3 — The integration credential audit is the highest-risk unknown and that's named

**Test:** Verify BUILD_STATE.md names the Profitsword/Craftable/OnTrack/UKG/Power BI credential status as the single highest demo-day risk, and schedules it for Phase B first hour.

**Pass:** Yes, named in three places.
**Fail:** Mentioned but not prioritized.

**Pass-side note:** Currently PASSES. Triple-mentioned.

---

### Test 2.4 — The pass-staged answers don't contradict each other

**Test:** Read the pass-staged answers for service #1 (D1-D7) and service #2 in BUILD_STATE.md. Are any internally contradictory?

**Pass:** No contradictions.
**Fail:** At least one is.

**Pass-side first pass:** No contradictions found. Class-singleton pattern, throw-error handling, route-layer validation, type-disciplined trust — all internally consistent. **PASS.**

---

### Test 2.5 — The "OFF LIMITS" list protects what the doctrine demands be protected

**Test:** Currently OFF LIMITS: shared/types/{signals,resonance}, server/database/migrations/008-025, scaffolds in echo-ai3/resonance/. Does this list protect the doctrine? Specifically: are there other things in the codebase that should be OFF LIMITS but aren't?

**Pass:** The list is complete enough that nothing critical is at risk during TICKET_003.
**Fail:** Something important is missing.
**Remediation if fail:** Add the missing item.

**Pass-side observation:** **Whiteboard module should probably be on the OFF LIMITS list.** William explicitly said keep it. It's not currently in the formal OFF LIMITS list, only mentioned in critical learnings. *Suggestion: add to OFF LIMITS formally.*

---

### Test 2.6 — The TARS register doesn't bleed into the codebase

**Test:** The TARS register (sarcasm 98%) is for pass-to-chef communication. Is there any chance the saucier or future-Claude reads the doctrine and starts producing user-facing copy that's sarcastic?

**Pass:** The voice register section (assuming Test 1.3 remediation is done) is clear that TARS is pass-only.
**Fail:** The register could leak into product surfaces.
**Remediation if fail:** Explicit warning in the doctrine and BUILD_STATE.

**Pass-side note:** Currently a soft-fail because Test 1.3 hasn't been remediated yet. **Add the voice register section before Phase A commit.**

---

### Test 2.7 — The Eureka discovery (POS-failover) has a place to land

**Test:** William's Eureka tonight — that EchoLayout + offline-first + MyECHO + chit printer + QR code already compose into a Toast-killer feature — needs a home in the build plan. Is it scoped, prioritized, and named?

**Pass:** BUILD_STATE.md or the doctrine references the discovery and points to validation work.
**Fail:** It's only in the chat history.
**Remediation if fail:** Add to BUILD_STATE.md as a Phase B/C priority. *This is currently a gap — the Eureka was captured in a chat message but not folded into the working files yet.*

**Pass-side honest answer:** SOFT-FAIL. **William: write the 6-line Eureka note before you sleep, or first thing in the morning.** The discovery is too important to live only in the chat record.

---

### Test 2.8 — The simulation harness scope is realistic

**Test:** The scoped seed data plan in BUILD_STATE.md says: property fixture (~4hr) + event generator (~6-8hr) + replay harness (~4-6hr) + failure injection (~3-4hr) = ~17-22 hours. With the actual saucier pace observed across TICKET_001/002/003 service #1 (each multi-hour), is this realistic in the 13-day window?

**Pass:** Yes, fits with margin.
**Fail:** No, would consume all remaining backend time.
**Remediation if fail:** Either descope the harness or accept that some Phase 1.5 frontend slips.

**Pass-side honest answer:** TICKET_003 services #2-7 will likely consume Days 2-3 (5 services × ~2 hours each + reviews). Routes (Day 4). Frontend (Days 5-9). That leaves Days 10-13 for harness + demo prep + boot polish = 4 days for ~22 hours of harness work + EDF rehearsal. **Tight. Possibly doable. Probably triggers a Day 10 cut decision on the failure-injection feature unless prior days went faster than expected.** Mark as PASS-WITH-RISK.

---

### Test 2.9 — The doctrine work for tomorrow morning has clear closure conditions

**Test:** Phase A (60-90 minutes) is supposed to land SILENT_SERVICE.md in committable form. Is there a clear test for "doctrine is committable" beyond "feels done"?

**Pass:** Yes — these 30 smoke tests serve as the commit criterion.
**Fail:** No, "feels done" is the standard.

**Pass-side note:** With this smoke test rig, Phase A now has an objective close-out. **PASS.**

---

### Test 2.10 — Echo AI³'s formation philosophy is buildable in Phase 1, not just aspirational

**Test:** The pride / perseverance / Monte Carlo retrospective / formation philosophy — is any part of this concretely buildable in the 13-day window? Or is all of it long-horizon?

**Pass:** At least one piece (e.g., the variance-logging pattern in service #1's Tenet 8 contract) is a Phase 1 deliverable.
**Fail:** All of formation is post-demo.
**Remediation if fail:** Pick one piece to make demo-visible.

**Pass-side honest answer:** Service #1 already enforces the *measurable variance* contract via the Tenet 8 test. **Service #5 (resonance-engine) and #7 (intervention-library) can ship with built-in retrospective hooks — even if the retrospective isn't running yet, the data structure for it is in place.** Demo-able as *"the system is built to learn from its own mistakes; here's the architecture; the learning loop activates in Phase 1.5."* **PASS.**

---

## Category 3 — Demo readiness (10 tests)

These test whether the foundation holds up against the EDF demo specifically.

### Test 3.1 — The demo opening lands in 60 seconds

**Test:** What does the EDF see in the first 60 seconds of the demo? Walk through it.

**Pass:** Concrete answer with specific screens / actions.
**Fail:** Hand-wave.
**Remediation if fail:** Write the demo opening before Day 12 dry run.

**Pass-side note:** Currently a SOFT-FAIL. **The 60-second opening is not yet locked.** Tomorrow's Phase E work needs to produce this. *Worth thinking about now: do you open with the integration story (responding to their stated ask), the resilience story (the POS-failover Eureka), or the resonance story (the trajectory tile changing color)?*

**My pre-mortem lean:** Open with **resilience.** Lead with *"every system in your stack has a single point of failure. Watch what happens when I kill them mid-service."* That answers the EDF's #1 risk concern before they raise it. Then move to integration, then to resonance as the differentiator.

---

### Test 3.2 — The privacy story has a 30-second answer for an EDF

**Test:** EDF asks *"how do you protect us from a guest finding out our system inferred their emotional state and getting upset?"* What's the 30-second answer?

**Pass:** Concrete answer naming Tenet 5, Silent Service Principle, audit trail, guest-facing pseudonymization.
**Fail:** Vague principles without operational specificity.

**Pass-side answer drafted:** *"Three layers. One: the system never speaks to the guest directly — it only surfaces nudges to your staff in their working voice. The guest experiences your captain, your chef, your kitchen — not the AI. Two: the data has a built-in expiration window — sensitive observations decay automatically within hours. Three: the guest can request a complete record of what was inferred about them, ask for it to be deleted, or pause the system entirely. We built the privacy controls before we built the dashboard, on principle."*

That's 30 seconds. **PASS.**

---

### Test 3.3 — The ROI story is honest

**Test:** EDF asks *"what's the ROI?"* What's the answer? Is it honest?

**Pass:** Concrete numbers from real cases (or framed as projections with assumptions stated).
**Fail:** Made-up numbers.

**Pass-side note:** SOFT-FAIL until William writes the ROI framing. *Worth thinking about: most likely ROI vectors are (a) guest retention via prevented unhappy moments, (b) operational efficiency from connected systems, (c) downtime prevention via the failover. None of these will have hard numbers in a first demo, but they need framings that are honest about being projections.*

**Remediation:** Write ROI framing before Day 12. Don't fake numbers.

---

### Test 3.4 — The integration story has a fallback if any one system isn't wired

**Test:** If you wake up tomorrow and discover that 3 of the 5 systems (Profitsword/Craftable/OnTrack/UKG/Power BI) are not wired and won't be by demo day, can you still demo?

**Pass:** Yes, with a clear "here's what's wired, here's what's coming in Phase 2" narrative.
**Fail:** No, the integration story collapses.

**Pass-side answer:** Yes. **Show what's wired live, mock the rest with a "here's what this looks like once we connect" framing.** EDFs understand pilot-stage limitations as long as you're honest about which is which. The integration story is *"we have a connected operations layer with privacy built in; here are 2 systems live, 3 coming in pilot Phase 2."* **PASS.**

---

### Test 3.5 — The 10 intervention templates exist or are scheduled

**Test:** The Phase 1.7 seed of 10 intervention templates is the actual content the demo runs on. Are they written, or scheduled to be written before Day 12?

**Pass:** Written, or hard-scheduled with clear ownership (William writes them).
**Fail:** "Will get to them."

**Pass-side note:** SOFT-FAIL. **Still not written.** William: this is the third time I've raised it. ***Per the standing rule: you forgot to answer.*** Even one template tomorrow morning, written between Phase A and Phase B, would unblock the architecture decisions in services #5-7.

---

### Test 3.6 — The demo has a graceful failure mode if something breaks live

**Test:** If Wi-Fi drops mid-demo, if the laptop crashes, if the trajectory dashboard freezes — what's the recovery?

**Pass:** Concrete answers (offline-capable demo, second laptop, screenshot fallback).
**Fail:** Faith.

**Pass-side answer:** Per scenarios #21-22 from the what-if list — second laptop, mobile hotspot, offline-first architecture (verify on Day 12), screenshot fallback for any embedded BI. **PASS as long as Day 12 dry run actually validates these.**

---

### Test 3.7 — The pricing conversation has a floor

**Test:** EDF says *"we love it but we'd want to do a 12-month pilot at $5K/month total."* Do you say yes, no, or counter?

**Pass:** William knows his floor.
**Fail:** Pricing happens in the room without prep.

**Pass-side note:** SOFT-FAIL until William calculates the floor. **Calculate before Day 14.** *Working assumption to test: what's the minimum monthly revenue needed across the next 6 months to keep the lights on through Phase 2 development?*

---

### Test 3.8 — The closing ask is rehearsed

**Test:** When the demo ends, what specifically do you ask the EDF for? "Sign here"? "Schedule a follow-up"? "Introduce me to your CTO"?

**Pass:** Specific, rehearsed close.
**Fail:** "We'll see how it goes."

**Pass-side note:** SOFT-FAIL until William plans the close. **Most enterprise sales fail on the close, not the demo.** The close determines whether Day 15 is "deal in motion" or "thanks for your time."

---

### Test 3.9 — The doctrine never makes it into the demo room

**Test:** Verify that SILENT_SERVICE.md is *not* shown to the EDF in any form. Not as a slide, not as a handout, not as a verbal recital.

**Pass:** Confirmed. The doctrine is internal scaffolding.
**Fail:** It leaks into the pitch.

**Pass-side note:** PASS as long as you remember this. *The doctrine is what built the system. The system is what the EDF buys. They don't need to see the kitchen — they need to taste the plate.*

---

### Test 3.10 — One sentence answers "why now"

**Test:** EDF asks *"why is this the moment for this?"* — meaning why hasn't a competitor done it, why won't a competitor do it next year. One-sentence answer.

**Pass:** Specific, defensible.
**Fail:** Generic AI-hype answer.

**Pass-side draft:** *"Toast and the rest were built by engineers who never carried a tray; this was built by a chef who carried one for thirty-five years, and the difference shows up in every product decision."*

That's one sentence, defensible, hard to fake, and lands the unfair-advantage point cleanly. **PASS** if you're comfortable saying it that directly.

---

## Scoring

Total tests: 30
Each test: PASS / FAIL / SOFT-FAIL

**Threshold: 27 of 30 PASS to proceed to Phase B implementation.**

If 25-26 pass: pause, remediate the worst 2-3 fails, re-run.

If <25 pass: the foundation is not ready. Spend Phase A on remediation rather than doctrine commit.

---

## Pre-emptive scoring of current state

Based on what's in front of me right now, before tomorrow morning's work:

**Likely PASS (22):** 1.1, 1.2, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 2.1, 2.3, 2.4, 2.5, 2.9, 2.10, 3.2, 3.4, 3.6, 3.9, 3.10, 1.4, 2.4

**Likely SOFT-FAIL (8):**
- 1.3 (voice registers not formally enumerated yet)
- 2.2 (post-demo runway not yet planned)
- 2.6 (linked to 1.3)
- 2.7 (Eureka not folded into BUILD_STATE yet)
- 3.1 (demo opening not locked)
- 3.3 (ROI framing not written)
- 3.5 (intervention templates not written)
- 3.7 (pricing floor not calculated)
- 3.8 (closing ask not rehearsed)

**That's 22 PASS / 8 SOFT-FAIL / 0 hard FAIL.**

**Reading:** Below the 27 threshold but with no hard fails. The 8 soft-fails are *all writing/decision tasks for William, not architecture problems.* Each is fixable in 15-30 minutes of focused thought. *None require code.*

---

## Remediation plan

**Before Phase A commit (~90 minutes of William-only work, can be done across tomorrow morning + lunch break):**

1. **Voice Registers section** added to SILENT_SERVICE.md (15 min) — fixes 1.3 and 2.6
2. **Post-demo runway plan** added to BUILD_STATE.md (10 min) — fixes 2.2
3. **Eureka POS-failover** captured in BUILD_STATE.md (15 min) — fixes 2.7
4. **Demo opening sequence** drafted (20 min) — fixes 3.1
5. **ROI framing** drafted (10 min) — fixes 3.3
6. **Intervention templates** — at least 3 written, balance scheduled for Day 12 (15 min for first 3) — fixes 3.5
7. **Pricing floor** — calculate sustainable monthly minimum (5 min) — fixes 3.7
8. **Closing ask** — rehearse one sentence (5 min) — fixes 3.8

**Total: ~95 minutes of William work** spread across tomorrow morning. After this, the smoke test re-runs and should clear 28-29 of 30. *Foundation is then ready for Phase B implementation.*

---

## How to use this document going forward

This smoke test is itself a Silent Service artifact. It does not announce success. It works beneath the waterline, catching what would have been missed if we had started Phase B without checking.

Re-run this smoke test:
- After every major doctrine change
- Before each saucier dispatch in Phase B onward
- On Day 10 (the checkpoint)
- On Day 13 (final pre-demo dry run)

If a test that previously PASSED begins to FAIL, that is a signal that the build has drifted from the doctrine. *Halt, investigate, remediate.*

The point is not to ship a perfect doctrine. The point is to ship a foundation that we have *honestly verified is coherent enough to bet 13 days and $2,000 on.* This rig is how we verify.

---

*Yes Chef. Smoke test on the line. Run it tomorrow morning. The line equipment will not lie about whether the foundation holds.*
