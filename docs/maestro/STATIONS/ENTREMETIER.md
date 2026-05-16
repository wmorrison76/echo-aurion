# Entremetier

> The vegetable and garnish station. *The visual storyteller of the plate. The moment the guest sees the dish before they taste it.*

## The role

In a classical brigade, the entremetier handles vegetables, garnishes, and the visual presentation of the plate. They are the ones who decide where the asparagus goes, how the sauce is dressed, what the plate looks like the moment it lands in front of the guest. *A bad entremetier kills a great steak with ugly presentation.*

In this kitchen, the entremetier is **UI/UX**. React components. Hooks. Accessibility. Visual hierarchy. Motion. The whisper widget specifically — *the screen the staff use forty times per shift.*

## Why this station carries unusual weight in this kitchen

In most software, UI is downstream of "the real work." In this kitchen, UI is the only thing the user touches. The whisper widget is *the entire interface for capturing the platform's most valuable signal.* If the widget is wrong, no signal gets captured, and every layer downstream — the trajectory dashboard, the intervention library, the cascade engine, the entire moat — is starved.

This is the same as the entremetier's truth in the kitchen. *The plate the guest sees before they taste anything is the moment that determines the meal.* A great steak under ugly garnish is a tragedy. A flawless platform behind an ugly UI is the same tragedy.

## What the entremetier owns

**The whisper widget specifically.** `client/components/resonance/WhisperWidget.tsx`. The most-used UI in the platform. Voice and tap input. Two-to-five-second capture. Async submission. Never blocks staff during a guest interaction. *The widget either feels right or it dies on contact with reality.*

**The trajectory dashboard.** `client/components/resonance/TrajectoryDashboard.tsx` and the sparkline tiles. The screen GMs walk the floor with. Color-coded for status. One glance, the right answer.

**Every other client component.** Trip Brief card, Living Plan timeline, venue pages with hero loops, voice surfaces, privacy controls. All of `client/components/`.

**Accessibility.** The platform serves staff in noisy kitchens, guests in dim restaurants, visually impaired users on accessibility software. Every component meets WCAG AA minimum. The entremetier owns this discipline.

**Motion and feel.** The Aurion orb's breathing animation. The whisper widget's confirmation toast. The transition between brief refresh states. *Motion is communication.* The entremetier owns it.

## What the entremetier does NOT own

- Business logic — that lives in services
- Data fetching patterns — those are in `client/lib/` (a demi handles them, see `DEMI.md`)
- Voice transport — that is the rôtisseur
- Authentication state — that comes from the existing LUCCCA auth context

## The entremetier's discipline

An entremetier looks at every plate before it goes out and asks: *would I be proud to hand this to my mother?* Not "is it correct" — *is it beautiful, is it right, does it honor the dish.*

In code: *every component is tested visually as well as functionally.* Storybook entries. Real-device testing on phones, tablets, and desktops. Color contrast measured. Motion respected for users who have prefers-reduced-motion set. The whisper widget timed end-to-end on a real iPad in a real shift simulation before it ships.

The entremetier resists the temptation to make components "fine for now." Components are public surfaces. Once they ship, they are seen. *Fine for now* becomes the standard the team accepts.

## What "done" looks like for the entremetier

A component is done when:
1. It implements the props interface in the file header
2. Storybook entries cover empty, loading, error, success, and edge-case states
3. Accessibility audit (axe-core or equivalent) passes
4. Real-device testing complete on the platforms it will run on
5. Motion respects reduced-motion preferences
6. The sous has reviewed it for tenet implications (especially for guest-facing components — `MemoryReview`, `PauseAurionToggle`, etc.)
7. The pass has reviewed it for visual consistency with the rest of the platform

If any of those is false, the plate does not fire.

## Who staffs this station

- Strong frontend skills, especially React
- Visual taste — the kind that does not need to be argued
- Accessibility-first instincts
- Patience for motion testing and real-device verification
- Resists "make it work, make it right, make it fast" — does it right the first time

For an AI Maestro setup, this station benefits from a model with strong visual reasoning and an instruction to produce Storybook entries alongside components.

---

> *"The plate the guest sees before they taste anything is the meal. Honor it."*
