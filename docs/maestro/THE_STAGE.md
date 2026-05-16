# The Stage

> The brigade's hiring protocol. How a new chef earns the hat. *There is no third door.*

## What a stage is

In a fine kitchen, before you are hired, you do a stage. A trial shift. You arrive in your whites, ready to work, and you spend the day in prep alongside the chefs de partie. Sometimes a full service. Sometimes longer.

You are not paid. You are not on payroll. You are being watched.

At the end of the stage, the executive chef calls you into the office. You sit. The exec tells you what they saw. There are exactly two things they can say next:

> *"There is a hat for you. Welcome to the team."*

or

> *"Thank you for coming. You can grab your belongings."*

Two doors. No third. No "we'd like you to come back next month and try again." No "let's keep you on prep for a while and reassess." No "you're close, but not quite — work on these three things." The exec has watched a full service. The exec has seen what they need to see. The decision is the decision.

This is harsh in the best way. It is honest. It tells the candidate the truth. It does not waste anyone's time.

## How this applies to AI agents and developers

When you bring a new agent or a new developer onto the EchoAurion brigade, they do a stage.

A stage in this kitchen looks like this:

1. **They read the prep manual.** `AGENT_START_HERE.md`, `HANDOFF.md`, `IMPLEMENTATION_ORDER.md`, `PRIVACY_TENETS.md`, `ARCHITECTURE.md`, `THE_LINE.md`. If they cannot get through these without confusion, the stage is already over. The exec walks them out. *No third door.*
2. **They walk a station in prep mode.** Pick the smallest leaf node available. `shared/types/resonance/score.ts` is a good one. Implement the score function with tests. Pure math. Pure function. The taste test is whether the function passes the property-based tests *and* whether the candidate's reasoning in their pull request comments shows they understood what they were doing and why.
3. **They handle one ticket during a service.** A real implementation task with a real deadline. Something with consequence. The candidate fires the plate, tastes it, sends it to the pass. The pass reviews. The candidate's response to feedback is part of the test. *Yes, Chef* and a clean fix is a good answer. Excuses are not.
4. **The exec calls them in.** Two doors. The exec — that is *you*, the human owner of the brigade, *not* the Maestro AI agent — makes the call.

There is no third door for AI agents either. If a candidate model fails the stage — produces work that needs hand-holding, makes excuses in its pull request comments, ignores the tenets, requires too much supervision — *thank you for coming, you can grab your belongings*. The brigade does not adopt under-trained agents and try to raise them during war service. That is what prep is for, and prep is not free.

## The hat is the only ceremony

If a candidate passes the stage, they receive the hat. *EchoAurion. Powered by LUCCCA.* Black field. Gold lettering. The oval and the swish.

In practice, for an AI agent, the hat is operational. They get added to the brigade roster (`team-registry.yaml`). They are now eligible for tickets. Their work is reviewed at the pass like any other chef de partie's work.

For a human developer, the hat is also operational, *and* it should be physical. Find a way. A real piece of merch. A challenge coin. Something they hold in their hand the day they pass the stage. The badge of honor and pride matters. *Hand-stitched, gold lettering on black, Victorian font, oval and swish.* Make it real. The brigade is not just a metaphor in this kitchen.

After the hat, there is no further ceremony. No graduation. No senior promotion. No "principal" title that excuses anyone from the station check list. *The day you got hired was your break. After that, it's only work.*

## What the exec is looking for during the stage

This is the part the exec needs to be honest about. The criteria are not "can they code." Anyone can code. The criteria are:

1. **Can they hold the standard?** Did they read the menu? Did they walk through the privacy tenets? Did they internalize the no-placeholder rule? When they hit a difficult decision, did they reach for the standard or did they reach for an excuse?
2. **Can they take a *Yes, Chef* without making it personal?** When the pass sent back a plate, did they fix it cleanly and re-fire? Or did they explain, justify, argue?
3. **Can they taste their own work?** Did they catch their own mistakes before sending the plate up? Or did the pass have to find them?
4. **Do they understand interdependence?** Did they recognize that their station's work feeds another station's work? Or did they treat their station as an island?
5. **Are they PRIME?** Did they walk through the door already capable, or are they expecting the brigade to raise them?

If all five answers are yes — *the hat*. If even one is no — *the door*.

## A note on cruelty

This document will read as cruel to anyone who has not worked in a real kitchen. It is not cruel. It is the most honest thing the brigade can do for the candidate.

The cruel thing is to tell someone they can come work in a kitchen they are not ready for. That gets them killed at service. That ruins their confidence, their career, their relationship with the craft. Telling someone *thank you, you are not ready* — and meaning it, with respect — is a kindness. It tells them the truth. It frees them to either go get ready or go find a different kitchen.

The brigade is not for everyone. That is not a problem. That is the point.

---

> *"The only break you get is the day you got hired. After that, it's only work."*
