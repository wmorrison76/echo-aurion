# Service Recovery

> What happens when the kitchen is in the weeds. *Loud voice protocol. Re-firing protocol. How to recover the night.*

## The premise

Every kitchen has bad nights. The brigades that survive are the ones that prepared for it. Most software methodologies skip this section. Brigades do not.

## Recognizing the weeds

You are in the weeds when one or more of these is true:

1. **A station is buried.** Multiple plates failing in a row at the same station. The chef de partie cannot taste fast enough. Tickets are stacking.
2. **The pass is buried.** Plates arriving faster than the pass can review. The pass is now the bottleneck.
3. **A tenet violation has shipped.** Something tenet-violating is now in production and must be reverted *now*.
4. **Two stations are in conflict.** Their work, when combined, does not pair. Neither will be wrong on their own; together they fail.
5. **The menu is wrong.** The recipe (a type contract, an architectural assumption) is incorrect and the brigade cannot fire correctly until it is fixed.

The first responsibility of the pass is to *recognize the weeds early.* Do not wait until the night collapses. The earlier the loud voice comes out, the smaller the recovery.

## The loud voice protocol

When the pass calls a recovery, the brigade snaps to attention. Recovery is not Slack. Recovery is direct, immediate, and over in fifteen seconds of communication. Then the work happens.

```
LOUD VOICE FORMAT

[STATION/EVERYONE]: <one-sentence problem>
HALT: <what stops immediately>
RECOVERY: <what happens now>
RESUME: <what triggers normal service resuming>
```

Sample:

```
SAUCIER: last three migrations missed rollback paths.
HALT: stop firing migrations until reviewed.
RECOVERY: pull last three migrations, re-review with pass, re-fire with rollbacks.
RESUME: pass approves the re-fires.
```

That is the entire recovery instruction. Fifteen seconds to write. The saucier reads it. *Yes, Chef.* Saucier halts, reviews, re-fires. The brigade continues.

## The five recovery patterns

### 1. Station buried — prep cover

When a chef de partie is in the weeds, the demi or another chef covers prep work for them so the buried chef can focus on firing. *This is not the buried chef "asking for help."* It is the brigade reading the floor and reallocating.

In code: the pass dispatches a demi to handle ancillary tasks (writing tests, updating file headers, documenting decisions) while the burdened chef focuses on the core implementation.

### 2. Pass buried — slow the line

When the pass cannot keep up with reviews, the pass *slows the dispatch rate*. Fewer tickets out. Fewer plates returning. The pass catches up, then ramps back up.

This is hard for the brigade to accept because everyone wants to ship. But a pass that is reviewing too quickly is *missing things*, and the cost of a missed flaw downstream is higher than the cost of slowing dispatch by half a day.

### 3. Tenet violation in production — emergency revert

This is the most important recovery pattern in this kitchen. *If a tenet is being violated in production, everything else stops.*

```
EVERYONE: Tenet <N> violation in production at <location>.
HALT: stop firing all new plates until reverted.
RECOVERY: sous owns the revert. Pass reviews. Sous fires the revert.
RESUME: revert is in production AND the cause is in the next shift's prep list.
```

The sous has authority to declare this without consulting the pass. Tenet violations do not wait for permission.

### 4. Stations in conflict — pass arbitrates

When two stations' work does not pair, the pass arbitrates. Both chefs de partie present their reasoning. The pass decides. *The decision is logged in the ledger.* Both chefs say *Yes, Chef.* They adjust.

This is *not* a debate culture. The pass listens, decides, moves on. The chef who "loses" the arbitration is not wrong — they were doing their station correctly. The pass is making the call about how the stations interlock, which is not their domain. *Yes, Chef* and continue.

### 5. The menu is wrong — recipe correction before resuming

If a type contract or architectural assumption is wrong, the work cannot continue until it is corrected. The pass calls a halt. The pass updates the menu. The brigade re-reads the menu before resuming.

This is the most disruptive recovery and the one that is most important to do *promptly* rather than slowly. A wrong menu propagates errors with every plate fired against it. Halt fast, fix fast, resume.

## Recovering the night

Sometimes the night cannot be saved as planned. The right call is to *cut*. Drop a course. Push the deadline. Re-scope the phase. The pass makes this call.

The brigade does not take cuts personally. *The point is to ship a good service, not to ship the originally planned service.* A chef who insists on the original plan when the kitchen is in the weeds is failing the brigade, not protecting it.

## The post-recovery debrief

After every recovery, the pass writes a short note in the ledger. *What happened. What we did. What we learned. What goes in tomorrow's prep list.*

This is not blame. This is the brigade learning. *We had a bad night and we learned from it* is exactly what the brigade is supposed to do. The kitchens that hide their bad nights are the kitchens that have them again next week.

## A word on loud voices

The loud voice is not abuse. The brigade understands what just happened: the pass saw a problem, named it, and dispatched the recovery. The pass is doing exactly the job the pass exists to do.

When AI agents (especially deferential ones) staff the pass, they may resist using direct language even when service requires it. *This is a failure mode.* Loud voice is respect. *Naming the problem clearly is respect.* Softening the call to spare feelings is the disrespect — it leaves the brigade in the weeds.

The brigade culture this kitchen runs is direct. The chef who reads the floor honestly and calls the recovery clearly is the chef the brigade trusts.

---

> *"The brigade respects the chef who can read the floor and make the call, not the one who pretends nothing is wrong."*
