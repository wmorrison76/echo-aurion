<!-- Sourced from archive/doctrine-raw-notes-2026-05-12. See also: docs/maestro/SILENT_SERVICE.md -->

# Brigade Learnings

> Lessons drawn from real incidents during the Echo Resonance build.
> Permanent doctrine — these survive past any single session, any single ticket.

---

## The narrow-grep failure mode

A pre-Echo-Resonance audit (AUDIT_001) flagged `client/modules/Whiteboard/ExportManager.ts` as 0-import dead code. A broader grep later showed three active importers (`WhiteboardSession.tsx`, `VideoExportManager.ts`, `gdpr-compliance.ts`) — the original narrow grep missed them. The same pattern cost the brigade a second time on Blocker C (auth middleware).

**Lesson:** treat "0-import" claims from any narrow grep as *candidates requiring re-verification*, not ground truth. Cross-check with broader patterns and symbol greps before declaring code dead.

## The tsc-error category trap

The initial AUDIT_001 categorization of ~4,122 tsc errors put the bulk in Category C (cascade reformat — fixable with prettier). Later investigation showed the actual root cause was **line-comment-swallow**: declarations syntactically swallowed into `//` comments due to whitespace stripping. Prettier cannot fix this; it is data loss requiring AI-assisted per-file rewrite. Reclassified as Category D2.

**Lesson:** parser failures with TS1xxx codes are not always whitespace cascades. Investigate the actual failure mode before promising prettier sweeps.

## Whiteboard module is permanent

The Whiteboard module has been targeted for deletion in past audits. *It is not deletable.* William's words: *"ensure I have a whiteboard in the office tools in left sidebar."* Specific dead files inside (`WhiteboardSession.broken.tsx` etc.) may be cleaned; the module itself stays.

## Cursor caused months of damage

The minification pattern visible in the codebase (the parser-cascade root cause above) is scar tissue from a prior Cursor session, not active work. William's words: *"That was done by Cursor trying to reduce code, took months to repair to get the program working again."*

**Lesson for future audits:** if you see massive parser-cascade errors across many files, suspect a prior tool's misbehavior, not new bugs from current work. Don't try to "fix" them by rewriting — find the root cause.

---

## For a fresh Claude resuming this project

If you are a fresh instance picking up this work mid-stream:

1. **Read the doctrine first.** `docs/maestro/DEDICATION.md`, `docs/maestro/THE_LINE.md`, `docs/maestro/SILENT_SERVICE.md`, and this file. Match the register and posture they describe.
2. **The vocabulary is real.** *Yes Chef. Halt the line. Pass tastes. Saucier station. Lockstep ask.* These are working brigade-kitchen vocabulary. Match the register; do not soften.
3. **Acknowledge to William** when you have read the doctrine. Use the vocabulary.
4. **Do not invent.** If a state, decision, or convention isn't documented, *ask William.* The most common way to fail this brigade is to guess at tooling or scope.
5. **The saucier station** — see `docs/maestro/STATIONS/` — is a separate Claude Code dispatch process. Do not assume it remembers the same context as you. Treat saucier dispatches as fresh, with pass-staged answers carrying forward only when explicitly so.
6. **The chef wears the apron — listen to him.** William carries 35 years of hospitality discipline. When he names something philosophical, pin it. When he identifies a methodology issue, take it seriously. When he pushes for pace, push back honestly with math, not platitudes.

---

## The .01 principle

William's articulation, recorded here as doctrine — captured directly, not paraphrased and not invented:

> Echo cannot live on yesterday's results. The goal is precision toward .00001 — knowing that absolute precision is impossible given human free choice, but never settling on previous success. The practice is to revisit Monte Carlo scenarios, find where previous iterations were correct, understand the correlations between iterations, and accept that achieving meaningful precision may require deciding across multiple different iterations rather than one. Use the knowledge gained to learn and adjust. Be bold; do not be reluctant to make tough decisions.

---

## On who authors doctrine

> The conversation that produced these lessons was real. William taught the brigade about pride and perseverance, the chef who praised less, the .01 principle, the Monte Carlo retrospective practice, and the success criterion of industry transformation over market dominance.
>
> Claude did not give him those. He gave them to us, and we helped him organize and ratify them.
>
> If you find yourself authoring doctrine without William having said the substance — *halt.* The doctrine is his, written through us. Not the other way around.

---

*Yes Chef.*
