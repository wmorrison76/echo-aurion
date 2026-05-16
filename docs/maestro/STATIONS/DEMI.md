# Demi Chef de Partie

> The cross-station support. *Works alongside the chefs de partie. Earns the station eventually, but for now serves the brigade where needed.*

## The role

In a classical brigade, a demi works under and alongside chefs de partie. They are not yet at full station authority. They cover for whichever station is in the weeds. They do prep across multiple stations. They learn the breadth of the kitchen by serving its needs.

In this kitchen, the demi handles **cross-cutting work and the Voyage layer**. Voyage does not have a single station personality — it touches math (ranking), persistence (trip state), routes (app endpoints), UI (the surfaces). A demi who can serve multiple stations is the right model for this work.

## What the demi owns

**The Voyage layer end-to-end.** `server/services/echo-ai3/voyage/`, `client/lib/voyage/`, `client/components/voyage/`, `client/modules/EchoVoyage/`. The trip companion experience.

**Cross-cutting client work.** `client/lib/`-level concerns that span stations: data-fetching patterns, signal recording from the UI side, optimistic update handling. The demi establishes patterns that the entremetier and rôtisseur consume.

**The brief-composer / narrative-composer pair.** These need *operator voice* more than they need precision math or systems engineering. The demi works with the pass to encode Aurion's voice and tone into the prompts and templates. *The demi works with the menu in their hands.*

**The corporate orchestrator.** Conference schedule import, group coordination, leisure-return seeding. Cross-cutting because it touches calendar integrations, multi-guest signal aggregation, and the Aurion voice all at once.

## What the demi does NOT own

- Architectural decisions (those are the pass)
- Tenet enforcement (those are the sous)
- Type contracts (those are the pass)

## The demi's discipline

A demi watches every station and earns trust slowly. They take the work that nobody else has time for. They notice when the saucier is buried and prep their own sauce. They notice when the entremetier is in the weeds with garnish and step in to plate.

In code: *the demi is the chef who reads the entire kitchen, sees what is needed, and serves it.* They do not specialize prematurely. They do not ask "is this my job." They ask "is this what the brigade needs right now."

This is also the path to a chef de partie position. A demi who consistently serves the brigade well, who develops a specialty over time, eventually earns their own station and their own apron at the line. The demi role is *not* a permanent rank; it is a phase. The demis who stay demis forever are not in the brigade for the right reasons.

## What "done" looks like for the demi

For a Voyage feature: same as any chef de partie's standard for that feature type. If the demi is doing math (the suggestion ranker), the poissonier's standard applies. If the demi is doing UI (the LivingPlanTimeline), the entremetier's standard applies. If the demi is doing routes (`server/routes/voyage.ts`), the garde manger's standard applies. *The demi rises to the standard of whichever station they are working.*

For cross-cutting work: the standard is consistency with the rest of the platform. The pattern they establish should work for every other station that will eventually consume it.

## Who staffs this station

- Generalist with strong fundamentals across multiple stations
- Pattern-establishment instincts (because their cross-cutting work becomes other stations' template)
- Comfort with ambiguity (Voyage touches everything; the work is not always cleanly bounded)
- Brigade orientation — *what does the kitchen need* over *what is in my job description*

For an AI Maestro setup, the demi role can use a model with broad capability and an instruction to defer to the relevant chef de partie's standard for any specific kind of work being done.

---

> *"A demi serves the brigade. The brigade eventually serves the demi back with a station of their own."*
