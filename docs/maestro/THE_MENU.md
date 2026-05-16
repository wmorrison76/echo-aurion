# The Menu

> The single source of truth. *One menu. Each chef has a recipe, a prep list, an order guide, a station check list, and the five stars above the door.*

## What the menu is

In a fine kitchen, the menu is a physical document. It hangs on the wall. Every chef de partie can see it from their station. When the chef calls *fire two lamb mid-rare*, every chef in the brigade knows exactly what is being made because *the recipe is on the wall*.

There is no version drift. There is no "the saucier and the rôtisseur each have their own idea of what mid-rare means." Mid-rare is what the menu says it is. Every plate of lamb is the same plate of lamb because every chef cooking it is reading the same recipe.

This is the part most multi-agent and multi-developer setups miss. They each have their own implicit menu. They drift. By plating, the components do not pair.

In this kitchen, the menu is **explicit, version-controlled, and walked through every shift** before service starts. This document tells you where the menu lives.

## The menu lives in five artifacts

### 1. The recipes — `shared/types/`

The TypeScript type contracts are the recipes. They define exactly what every component is, what goes in, what comes out, and what each ingredient must be.

The compiler is the executive chef walking the line saying *"that's not how you make this sauce."* If the type checker fails, the plate cannot leave the kitchen. Period. There is no "but the user said..." There is no "in this case I think we should..." *The recipe is the recipe.*

If a chef de partie believes a recipe should change, they raise it to the pass. *Before service.* During service, the recipe is fixed.

### 2. The prep list — `IMPLEMENTATION_ORDER.md`

What gets prepped first. What feeds what. When each component is ready for the next station to use it. The prep list is sequential because the work has to happen in a specific order — you cannot make the sauce without first making the stock, and you cannot make the stock without first roasting the bones.

The prep list answers *what do I do today.* Each chef de partie reads it before they tie an apron.

### 3. The order guide — `BUILD_PHASES.md`

What the brigade is buying — what raw materials, what specialty ingredients, what equipment, what labor — to deliver each phase. Six phases for the EchoAurion platform. Each phase a clearly-defined ship target. Each phase has a beginning, a middle, and an end.

The order guide answers *what are we cooking, in what order, over the next thirty-two weeks.*

### 4. The station check list — *file headers + `STATION_CHECK_LIST.md`*

What every chef de partie walks through before firing each plate. Mise en place complete. Equipment up to temp. Sauces tasted. Tenets reviewed. The check list is the discipline of *did I prepare to fire this plate, or am I just hoping it works.*

The per-file headers in the scaffolding are the per-plate check list (the *Pending: [ ]* checklist in each file). The `STATION_CHECK_LIST.md` document is the per-shift check list (the daily ritual every chef walks through).

### 5. The five stars above the door — `PRIVACY_TENETS.md`

This is what marks the kitchen as the kind of kitchen it is. Five-star kitchens have standards above the door. *We do not send food we would not eat. We do not lie to guests. We respect the ingredient. We respect the room. We respect each other.*

In this kitchen, the five stars are the eight privacy tenets. They are the kind-of-kitchen-we-run statement. *We capture by observation, not interrogation. We let audio evaporate while the score persists. Tone informs care, not commerce. Trust score is invisible. Guest controls are first-class. Staff transparency runs both ways. Sensitive flags decay aggressively. Forbidden uses are forbidden.*

The stars are non-negotiable. A chef who will not honor them cannot work in this kitchen, no matter how well they cook.

## The menu is read every shift

Before service starts, every chef walks through the menu. This is not optional. This is not "I read it last week, I remember it." Every shift. Every chef. The recipes have not changed since yesterday — that is the point. *The menu is the menu.* Walking through it is the ritual that makes the kitchen kitchen-shaped instead of office-shaped.

For AI agents, this is operational: *every implementation session begins by re-reading THE_LINE.md, the relevant station document, the relevant scaffolding file headers, and the privacy tenets.* No exceptions. The agent's first action in any session is to re-ground on the menu. The session's quality depends on it.

For human developers, the same: *every morning that you sit down to the EchoAurion code, you walk through the menu before you tie the apron.* It takes ten minutes. The work that follows is materially better because of it.

## When the menu changes

The menu changes. New dishes get added. Old dishes get retired. Recipes get refined.

When the menu changes, *the change is announced before service.* Not during. The pass calls a quick line-up before the doors open. *The lamb has changed. New recipe is on the wall. Saucier, here is the new sauce. Rôtisseur, here is the new temp. Walk through it together. Doors open in fifteen.* Then service begins on the new menu.

What does *not* happen: the menu changes silently mid-service and three chefs are working from three different versions. That is the failure mode this discipline exists to prevent.

For AI agents and developers, the analog: *type contract changes go through the pass, get committed, propagate to every active session via re-reading the menu, and only then do the dependent stations resume firing plates.* No silent contract drift. No "I made this small change to make my thing work." If you need a change, raise it. The pass decides. The change goes on the wall. Then everyone reads it.

---

## A note on the menu's lineage

The recipes in this kitchen are not invented. They are inherited. *Thirty-five years of operator wisdom, fire-tested in real kitchens at real properties, distilled into machine-checkable contracts.* The Inn at Little Washington's 1-to-10 lift system. Danny Meyer's 51% emotional / 49% technical. The Ritz-Carlton's Mystique. Disney's Four Keys. Six Senses' wellness journey. Tom Hill's discipline at Victoria & Albert's. The brigade's own scars.

Anyone joining this brigade should know what they are joining. They are not joining a startup. They are joining the externalization of operator wisdom that earned a hat at V&A and has been honed for thirty-five years since. The menu carries that weight. *Read it like it weighs that much, because it does.*

---

> *"The only break you get is the day you got hired. After that, it's only work."*
