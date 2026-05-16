# LUCCCA Live Dashboard — 4-Minute Investor Demo Script

**Property:** Pier Sixty-Six Resort & Marina · 1 hotel · 8 outlets · 540 capture events · 2 in-flight lifecycle runs
**Surface used for the demo:** standalone preview at `cfo-toolkit-deploy.preview.emergentagent.com`
**Total length:** 3:55 (target). Leave 5–10s of breathing room between beats.
**Tone:** confident, unhurried, evidence-first. Never read the screen — talk over it.

---

## 0:00 → 0:20 — Pre-roll context

Before clicking anything, set the scene out loud while the live dashboard loads:

> "This is Pier Sixty-Six Resort & Marina — a real property in Fort Lauderdale. One hotel, eight outlets, 540 capture events, two in-flight lifecycle runs. Everything you're about to see is a live read off the same FastAPI backend the operator uses every morning. No screenshots. No synthetic data. Every panel has a data-source label so you know exactly where the number came from."

Hover the cursor over the gold "live" dot in the top-right banner.

---

## 0:20 → 0:55 — The doctrine framing (Hero)

Point at the hero headline:

> "There's one line in the company's operating doctrine that does more work than any other — §2.4, the Doctrine of the Walkback. *Even on a hit, the walkback continues — which trial was tightest, and what did it know?*"

> "Eight outlets. Each one runs a Monte Carlo forecast every night, twelve hundred trials. The system isn't allowed to be occasionally correct — even when it nails the number, it still walks back to find which trial had the right factor mix, and nudges the per-signal weights by five percent. That's the discipline. The pursuit is the discipline."

Pan right to the gauge:

> "Property capture · 39 percent. Headroom · $87 thousand a day in eligible revenue we're leaving on the table. That gauge is the daily pulse."

---

## 0:55 → 1:30 — The six-tile grid (live numbers)

Mouse over each tile briefly, calling the number:

> "Pace — month-to-date $4.2 million, projection P50 finishes $11.8 million."
>
> "Cash Runway — when the close lands, we'd surface 2.7 months of P75 worst-quartile burn here. Right now it's clean — the system tells us *no close data yet*, which is doctrine §1.1: missing data is a first-class fact, not a 404."
>
> "Exceptions — three amber today. Auto-cleared by 07:18."
>
> "Twenty-one-day living forecast — $11.3 million projected revenue, 78 percent average occupancy. Sparkline live off `outlet_capture_v1`."
>
> "Lifecycle — three active runs. May P&L Close is overdue on one step. We'll come back to that."

Pause briefly on the outlet capture grid:

> "Eight outlets, one card each. Galley is 47 percent eligible capture. The Pier Club is 31. The IRD is the lowest — there's the headroom."

---

## 1:30 → 2:20 — Click into Galley · Outlet Capture Deep-Dive

Click the Galley pill.

> "One click, and we're inside The Galley. KPIs at the top — covers, total capture, eligible capture, available capture — all live, all today."

Scroll to the forecast chart:

> "Multi-horizon Monte Carlo. P10, P50, P90 — three confidence bands across +1, +3, +7, +14, +21 days. The P50 line is the production recommendation. The kitchen prep sheet for tomorrow comes off this number."

Scroll to the trial-level retrospective panel:

> "And here's the §2.4 in action. After each close, the system finds the trial whose factor mix was closest to the actual outcome, and re-weights the signals by five percent toward that trial. That's the walkback. Right now we see seven walkbacks in the trailing week — date, forecast, actual, tightest trial, weight delta. Every adjustment is logged, immutably, in the audit collection."

Scroll to the accuracy panel:

> "SMAPE bands by horizon — these publish after the first cycle of actuals. Doctrine again: we don't lie about accuracy until we have it."

---

## 2:20 → 3:10 — Period-Close + Why-Changed §1.1

Click "back" → click the Lifecycle tile.

> "This is the May P&L Close. Twenty-three steps — Mandatory meetings, Owner-driven tasks, due dates, project lead. Two complete, three in flight, one overdue. The step ladder on the left is the operator's whiteboard."

Point at the Why-Changed drill panel on the right:

> "And this is what no other system in our category has. Every step transition, every entity edit, every weight nudge from the walkback engine — they all write to the same append-only audit log. So you can stand here, point at a number, and ask *why did this change*?"

Click the "May Budget" pill to seed the drill.

> "Budget — five events in the last twenty-four hours. Someone moved the food cost line by two hundred bps. There's the entity coordinates. There's the actor. There's the timestamp. And — this is the kicker —"

Click any event row (one that links to outlet capture):

> "— every event has a clickable link back to its source entity. Boom — we're standing in front of The Galley's capture data, the actual reason the budget moved. The chain doesn't break. From the closed-period number, all the way back to which outlet shifted on which day. That's the §1.1 transparency rule, made literal."

---

## 3:10 → 3:40 — Coming-soon as a doctrine artifact

Click back to live. Click the Pace tile.

> "We're shipping. Not everything has the full UI yet — Pace, Cash Runway, Forecast detail, Menu Engineering, Tip Audit. But notice what we show on a coming-soon page. Not a *coming soon* sticker. Not a 404."

Point at the live-endpoint list:

> "We show you the endpoints that are *already returning data*. Right now. Live. You can curl them from your laptop. The substrate is built. The rendering layer is the work that remains. Doctrine §1.1 says missing-data states surface as first-class facts — even our coming-soon page obeys that."

---

## 3:40 → 3:55 — Close

Click back to the live dashboard.

> "Eight outlets. Twelve hundred trials a night. One audit log. Every number, every panel, every event — connected, walkbacked, immutable. This is what an operating system for a multi-property hospitality group looks like when you build it from the doctrine outward instead of bolting it on."

> "Property Pulse — live, today, on real data. Thanks for watching."

---

## Cheat-sheet (operator notes)

* The same beats work from inside the integrated LUCCCA shell — open the sidebar entry **Intelligence & Forecasting → Property Pulse · Live**.
* If a tile shows "no data," lean into doctrine §1.1: *that missing-data state is the demo*. Don't pretend it isn't there.
* Audio-only / no-screen-share version: skip 1:30 → 2:20 and shorten Period-Close to "we have a closed-period audit chain that traces back to source entities, click-by-click."
* If a viewer asks about LLM/AI features in the demo: this is **deterministic** — Monte Carlo + active-learning weights. No LLM is in the forecast loop. The AI piece (Echo AURION) is the chat surface and the analyst console; both are deferred for these four minutes.

## Backup links

* Live dashboard: `https://cfo-toolkit-deploy.preview.emergentagent.com/`
* Direct outlet deep-dive: `/dashboard/outlet/pier-sixty-six-demo/p66demo-galley`
* Period-close deep-dive: `/dashboard/period-close/pier-sixty-six-demo`
* Inside the LUCCCA shell once shipped: sidebar → **Property Pulse · Live**
