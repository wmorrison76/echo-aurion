# Poissonier

> The fish station. *Unforgiving. Precise. Quiet.*

## The role

In a classical brigade, the poissonier cooks the fish. Fish is the most unforgiving station in the kitchen. There is no recovery from overcooked fish — you cannot sauce your way out of it, you cannot rest it longer, you cannot pretend it's fine. *Fish either goes out at the right temperature or it gets thrown away.*

The chefs who staff this station are precise, tested, and quiet. They know their station and they do not improvise. They are not the loudest in the kitchen. They are the most careful.

In this kitchen, the poissonier is **Domain Math**. The score computation. The trajectory math. The ranking algorithms. The affect coordinate logic. *The math has to be right the first time.*

## Why precision matters specifically here

The Inn at Little Washington's whole 1-to-10 system collapses if the +2 is computed incorrectly. A guest who arrives at a 7 and is computed to be at a 9 when they are actually at a 7.5 — *you have lied to the GM about the night.* The dashboard becomes worse than nothing because it gives confident wrong answers.

Same for the trajectory slope, the projected exit score, the affect-quadrant classification, the suggestion ranker's seven-criteria scoring. These are not "approximately right" calculations. The whole platform's credibility rests on the math being precise.

## What the poissonier owns

**Pure functions.** `client/lib/resonance/score.ts`, `client/lib/resonance/trajectory.ts`, `server/services/echo-ai3/voyage/suggestion-ranker.ts`, `server/services/echo-ai3/atrium/hero-selector.ts`, the affinity scoring, the gap-finder math.

**Property-based tests.** The poissonier writes tests that verify *mathematical properties*: monotonicity, boundedness, idempotency. Not just "it returns 7 for this input." Property-based testing finds the edge cases that example-based tests miss.

**Numerical stability.** Floating-point gotchas, off-by-one in trajectories, ranking ties broken consistently. The poissonier owns the part of the platform where small computational errors compound into catastrophic UI lies.

**The shared/server/client math parity.** Score math runs both client-side (for instant UI updates) and server-side (for canonical storage). The poissonier ensures these compute identically. *Drift is forbidden.*

## The poissonier's discipline

A fish cook knows the doneness by *touch and time*. They do not poke a thermometer in repeatedly. They have internalized the cue. They taste *one time* if they need to verify, and that one time costs them a tasting portion of the dish.

In code: *the poissonier internalizes the math.* They do not "just try things and see if the tests pass." They reason about the function before writing it. They prove (in their head, in a notebook, on paper) that the function is correct. *Then* they write it. *Then* they test.

This is slower upfront. It is faster overall, because the math does not need to be re-debugged six months later when the dashboard starts showing implausible values and nobody can find why.

## What the poissonier does NOT own

- Anything stateful — pure functions only
- The infrastructure that calls these functions — that's the saucier or the garde manger
- The visualization of the math — that's the entremetier

## What "done" looks like for the poissonier

A pure function is done when:
1. The implementation matches the type signature exactly
2. Property-based tests pass on at least 1000 random inputs
3. Hand-derived edge cases (zeros, boundaries, single-element inputs, empty arrays) all pass
4. Client and server math parity is verified by a test that runs both
5. The function has been read by the sous for tenet implications (some math touches sensitive signals)

If any of those is false, the plate does not fire.

## Who staffs this station

- Math and CS fundamentals comfortable
- Patience for property-based testing
- Reads code with the discipline of reading a proof
- Understands that "looks right" is not the same as "is right"

For an AI Maestro setup, this station benefits from the highest-quality model available, with a strong instruction to prove correctness before declaring done. Math errors are expensive to find later.

---

> *"Fish does not forgive. Neither does math."*
