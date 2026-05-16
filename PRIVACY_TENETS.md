# Privacy Tenets

> **These rules are not implementation details.** They are the constitution of the platform. Every contributor reads this before writing any code that touches guest data.

## The promise

> **"Aurion learns you to serve you better. It forgets when you ask. It never sells you to anyone."**

This sentence is the platform's commitment. The technical and operational rules below exist to make that sentence literally true.

## Tenet 1 - Capture by observation, not interrogation

Data is collected through what staff observe and what guests volunteer in the natural flow of service. The platform never asks the guest to fill out a preference form, complete a satisfaction survey at a kiosk, or rate their meal on a screen.

**Implementation rule:** No UI surface in this platform may include a "rate your experience" or "tell us your preferences" form directed at guests.

## Tenet 2 - Score persists, audio evaporates

The arousal, valence, and resonance score is retained because the **lift trajectory matters**. The raw audio is deleted within 24 hours unless the guest explicitly opts in.

**Implementation rule:** Any audio storage must include an expires_at field. Default value is now() + 24 hours.

## Tenet 3 - Tone informs care, never commerce

Tone-of-voice analysis affects which staff member responds, what tempo to use, what intervention is suggested. It **never** affects pricing, what is upsold, what advertising is shown.

**Implementation rule:** Functions in resonance-fast.ts that consume tone signals must not be importable from any pricing, sales, or marketing service. Enforced via lint rule.

## Tenet 4 - Trust score is invisible

Every guest has an internal trust score. **The score is never displayed to the guest. It never triggers a confrontation.** Its only effect is on what Echo decides not to do.

**Implementation rule:** Any UI that loads a guest profile cannot read from trust_scores. The trust score is server-side-only.

## Tenet 5 - Guest controls are first-class

Every guest has, in the app, one-tap access to:
- "What do you remember about me?" - plain-language list, editable
- "Pause Aurion" - turns voice off
- "Delete everything" - wipes profile
- "See my data" - standard data-portability export

**Implementation rule:** These four endpoints are the **first thing built** in the trust substrate.

## Tenet 6 - Staff transparency runs both ways

Staff can see what Aurion whispered to them. They can flag a whisper as "wrong." They can mute Aurion at any time.

## Tenet 7 - Sensitive flags decay aggressively

Mental health flags, family tension flags, relationship strain flags - the most sensitive signals - auto-decay within 30 days unless renewed.

## Tenet 8 - Forbidden uses

The platform never uses voice analysis, Resonance scores, or behavioral signals for:
- Pricing decisions or dynamic upsell
- Advertising or third-party data sharing
- Psychological profiling beyond service interaction
- Discrimination on protected characteristics
- Training models that will be used outside the Echo Resonance network

## How to handle conflicts

If a feature requirement conflicts with a tenet, **the tenet wins**. If a stakeholder pushes back, escalate to the founder. If the founder overrides a tenet, that override goes in this document with a date and a justification.

No tenet has been overridden as of the document date.
