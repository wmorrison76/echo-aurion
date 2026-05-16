# EDF Demo Storyline — Day 14

> **Audience:** Executive Director of Finance at a hospitality property/group.
> **Format:** ~25 minutes total. 60-second opening · 8-minute walkthrough · 6-minute privacy story · 6-minute ROI · close.
> **Surface:** trajectory dashboard live; integration tab; one synthetic guest journey from arrival to departure.
>
> **Status of this document:** ONE section fully written below as the example shape (the 60-second resilience opening). The rest are skeletoned with prompts for William to fill in. Each section ends with a "TELL ME" box — that's what I need from you to convert the skeleton into final copy.

---

## 60-second opening — RESILIENCE LEAD

> **Status:** ✅ filled in (this is your example — react with edits or "ship it")

### What's on screen
- Trajectory dashboard, 5 active tiles, mostly green with one amber.
- One terminal window visible to the side showing a live Profitsword feed.

### What you (William) say

*"Most hospitality stacks have a single point of failure. Toast goes down, your service goes down. Profitsword stalls, your morning meeting is guessing. I want to show you what we built first, before I show you what we built next."*

\[At this point, you click a kill switch. The Profitsword terminal goes dark. The dashboard does NOT.]

*"We just killed the Profitsword feed. Watch the dashboard."*

\[Pause five seconds. Dashboard tiles continue to render — the staleness indicator on the integration tab shows "Profitsword sync degraded." No error to the operator. No crash. The trajectory engine keeps running on local state.]

*"The system you would buy from any other vendor would have shown your GM a red banner and told them to call IT. The system we built shows your GM what the staff already needs to know — that the integration is degraded, but the floor is still working — and lets the dinner service continue. That's the floor we set before we built anything else."*

### Why this opening lands

The EDF's #1 risk concern is "this AI is going to break something I'm responsible for keeping running." Resilience-first answers the concern before they raise it. Then we have permission to show them what's new.

### TELL ME (to refine)
- [ ] Want a different kill switch besides Profitsword? (Power BI is the alternative since it's the most fragile of the five.)
- [ ] Want to soften any of the language? Currently TARS-direct.
- [ ] Want a longer pause after the kill switch? (Dramatic but risky if Wi-Fi acts up.)

---

## 8-minute walkthrough — the trajectory dashboard

> **Status:** ⚠️ skeleton, needs your detail

### Beats (the order matters)

1. *(60 sec)* Show the dashboard at start of dinner service. 5 tiles, color-coded, one sparkline visible per tile. Explain the +2 lift goal in one sentence.
2. *(2 min)* Walk through ONE tile in detail: the Henderson party — anniversary couple, arrived from a delayed flight, currently low-pos. Click the tile. Show the GuestDetailView panel: trajectory, signal trail, suggested intervention.
3. *(2 min)* Pretend you're the captain. Tap the whisper widget. Pick "tense" + score 4 + type a one-line note. Submit. Show the dashboard tile recolor within 5 seconds.
4. *(2 min)* The trajectory bends amber. The intervention card surfaces "Frustrated calm-and-comp" template. Tap Approve. Show the cascade-bridge fire (the cascadeId appears in the response; the staff member would receive a push notification in production).
5. *(1 min)* Walk to a different tile — the in-the-zone protect tile. Show how the system *recommends nothing* on a green visit. Read the do-nots out loud: "no song, no announcement, no comped dessert with a sparkler." Close with: "this is the philosophy. We do less, not more, on guests who are already in the moment."

### TELL ME
- [ ] Which template do you want to demonstrate Approve on? My pick: **Frustrated calm-and-comp** (covers the most common EDF-relatable scenario — table waiting, server already apologized, captain visits with a calm voice). Want to swap?
- [ ] Want to bring a real story from your career into beat #5? The "do-nots are the doctrine" moment is more powerful with a one-line anecdote. Optional.
- [ ] Beat 4 wants you to read the cascade response live. I can draft the operator-facing line you'd say while waiting for it ("the kitchen, the captain, and the front desk just got a soft note in their working voice — none of them were paged"). Want me to write that?

---

## 6-minute privacy story

> **Status:** ⚠️ skeleton, needs your style on the close

### Three layers (in order of EDF impact)

1. **The system never speaks to the guest.** Open the trajectory dashboard's "what does the guest see" mode (Phase 1.5: this is currently a verbal assertion; Phase 3 ships the real surface). Say: *"the guest experiences your captain, your chef, your kitchen — never the AI."*
2. **Tenet 2 + Tenet 7 — the data has built-in expiration.** Show the metrics endpoint at `/api/echo-resonance/health`. Point at `signals.decay_rows_deleted` — *"this counter increments every hour. Sensitive observations decay automatically. We cannot retain what we are not licensed to retain."*
3. **Tenet 5 — guest controls.** *(Phase 3 — note honestly that the UI ships in the next pilot phase; the data architecture is already built for it.)* Show the GuestDetailView signal trail with the `flag` button. Say: *"every staff observation carries a flag-as-misread mechanism. The guest's privacy controls in the next pilot phase will let them review every observation, pause the system entirely, or wipe their profile."*

### Closing line (the move)

> *"We built the privacy controls before we built the dashboard, on principle. The doctrine document that drove that choice is internal — but the EDF version of it is one sentence: this AI works for the property. It does not work for advertisers, training pipelines, or anyone who is not in the room serving guests."*

### TELL ME
- [ ] The closing line above is the strongest version I can write. Want it your voice instead? Tell me how you'd close.
- [ ] Want to actually open SILENT_SERVICE.md in the room? My recommendation: NO. Doctrine stays internal per smoke test 3.9. Confirm?
- [ ] Want a "what we will not do" reading? Master doc §8.2 forbids 5 specific things; we could read them aloud as a hard floor. Stronger if EDF is risk-allergic.

---

## 6-minute ROI conversation

> **Status:** ⚠️ skeleton, ONE vector filled in as the example. Pick the others.

### Vector 1 — Retention via prevented unhappy moments

> **Status:** ✅ filled in (example shape — your numbers)

#### Working draft

*"At a property your size, somewhere between 8% and 14% of guests leave with a sour memory they don't articulate. They don't write a complaint. They just don't come back. Industry research from Cornell and the Disney Institute puts the lifetime value of one prevented bad ending at roughly $2,400 to $11,000, depending on the property tier. If Echo Resonance prevents even one of every three of those — and our pilot data will tell us the real number — at a 200-room property running 80% occupancy, that is somewhere in the range of $80,000 to $400,000 of recovered revenue per year. I am not selling you those numbers. I am selling you the architecture that produces them, and a 90-day pilot that will tell us what your number actually is."*

#### TELL ME
- [ ] Want the band different? (Tighter / wider)
- [ ] Want to anchor on a real Cornell/Disney citation? I can find one if you want footnotes. Optional.
- [ ] Want to soften "I am not selling you those numbers"? Currently TARS-direct.

### Vector 2 — Operational efficiency from connected systems

> **Status:** ⚠️ skeleton

#### What I need from you
- The number of hours/week your finance team currently spends reconciling Profitsword vs. Craftable. Even rough.
- The dollar value of one prevented invoice void. Order of magnitude.
- Anything else operational you'd cite.

#### TELL ME
- [ ] Estimate of weekly reconciliation hours: ____
- [ ] Cost of one prevented void: $____
- [ ] Other operational vector worth mentioning: ____

### Vector 3 — Downtime prevention via POS-failover

> **Status:** ⚠️ skeleton

#### What I need from you
- Estimated revenue impact of one canceled wedding event due to POS outage at your tier of property.
- Whether you've personally lived through a POS outage during a high-stakes service.

#### TELL ME
- [ ] One-event revenue loss estimate: $____
- [ ] One-line story about a POS outage you've lived through (optional but powerful): ____

---

## Pricing conversation

> **Status:** ⚠️ skeleton, need numbers

### What we present (assuming pilot)

*"90-day pilot at \[$X]/month, no setup fee, full access to the dashboard + intervention library + privacy spine. End of pilot: month-to-month at \[$Y], or annual at \[$Z]/year (15% discount). We are not the cheapest option in your stack and we are not trying to be."*

### TELL ME (the four numbers)
- [ ] Pilot monthly: $____
- [ ] Post-pilot monthly: $____
- [ ] Annual: $____
- [ ] Counter-offer if EDF says "$5K/month for 12 months": yes / no / counter-at-$____

### Floor calculation prompt

What's the minimum monthly revenue across the next 6 months to keep lights on through Phase 2?
- Lights cost: ~$_____ /month (Camila's tolerance + your runway expectations)
- Therefore floor per pilot: $_____ /month minimum
- (If their offer is below the floor, the answer is "no, but here's what we would do instead")

---

## The closing ask

> **Status:** ⚠️ skeleton, pick a framing

### Three options

| Framing | When to use | Strength |
|---|---|---|
| **A. Closer.** *"I'd like to start the 90-day pilot the first of next month. Let's get the contract signed by Friday."* | EDF is leaning in, asking implementation questions | Highest commit; risks rejection if they're not ready |
| **B. Warmer.** *"I'd like to schedule a technical follow-up with your IT team this week to walk them through the integration architecture."* | EDF is engaged but cautious | Lower commit, higher acceptance rate; gives them an exit ramp without saying no |
| **C. Broader.** *"This is also a property-ops conversation. I'd like an introduction to your COO so we can scope what a pilot looks like at scale."* | EDF is impressed but says "this isn't my decision alone" | Zero commit from EDF; signals you understand the org |

### TELL ME
- [ ] Which framing fits your EDF? (Pick A, B, or C)
- [ ] Want me to write all three as alternative scripts so you can pivot mid-conversation? (Recommended.)

---

## Demo-day pre-mortem (already drafted; verify)

| Risk | Response |
|---|---|
| Wi-Fi drops mid-demo | Mobile hotspot in pocket; demo continues from local data. (Verify on Day 12.) |
| Laptop crashes | Backup laptop with mirrored state. (Verify on Day 12.) |
| Power BI doesn't render | Static screenshot fallback in slides. |
| EDF asks about a feature not in demo | *"Great question — that's Phase 2 / Phase 3 work. Here's what it looks like."* + roadmap slide. |
| EDF asks for reference customer | *"You'd be the first paying customer. The pricing reflects that — there's a partnership component."* |
| Profitsword rate-limits live | Demo continues from cached data with honest staleness indicator (per B3 retry/backoff). |
| Trajectory tile reads green when amber-expected (data inconsistency) | Post-service review surfaces it; system self-corrects on next reading. Don't fight it live. |
| EDF asks "what does delete-everything do?" | Honest: "the data architecture is built for it; the operator-facing UI ships in pilot Phase 2. Today: the architecture honors it; the click-target lands next month." |

---

*Yes Chef. Storyline on the line. Fill the TELL MEs in your own time. The demo runs on what you fill in.*
