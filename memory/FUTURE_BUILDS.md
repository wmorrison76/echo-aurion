## LUCCCA KDS — Kitchen Display Orchestration Layer (logged · Feb 2026)

Positioning: "LUCCCA uses KDS as a production coordination layer across
stations and expo — not a chit-printer replacement. It sits *above*
POS KDS as orchestration intelligence." A live production node inside
the operating system, connecting POS · Expo · Stations · IRD · Banquets
· Pool · Grab-and-Go · FOH pacing · Concierge · Sommelier · EchoStratus.

### Station types (first release configurable roles)
Grill · Sauté · Pantry · Pastry · Pizza · Fryer · Cold Line · Expo ·
IRD Assembly · Banquet Plating · Pool Kitchen.

### 10 core layers
1. **Station KDS screens** — per-station tickets with VIP/allergy/mod
   flags and fire/hold timing
2. **Expo Command Screen** — control tower showing all stations, course
   sync, plate readiness, delayed items, fire-next prompts
3. **FOH pacing feedback loop** — kitchen drift (+N min) → host
   throttles seating automatically
4. **Banquet wave mode** — batch production, course waves, table
   sequencing, mass-plating synchronization
5. **IRD delivery mode** — tray assembly, elevator batching, runner
   routing, delivery promise time
6. **Multi-node routing** — single ticket split across multiple
   stations/outlets (pool burger + pizza oven + pool bar)
7. **Echo Concierge integration** — allergy reported → KDS highlights
   automatically (no POS required)
8. **Mixology Sommelier integration** — wine-pairing recommendation
   appears on expo KDS
9. **Delay detection engine** — ticket-time variance, station-delay
   patterns, course-pacing drift → FOH pacing adjustment suggestion
10. **Ticket intelligence layer** — tickets become data objects
    containing table, guest profile, VIP, allergies, course timing,
    seat numbers, pairings, delivery channel, station routing

### Required first-release features
Station-specific routing · Expo command screen · Course-based firing ·
Allergy override alerts · VIP priority highlighting · Ticket aging
timers · Station delay detection · Fire-on-command · Batch banquet
production · Delivery-time IRD · Multi-outlet routing.

### Automations
Auto-highlight delayed tickets · Auto-alert expo when station behind ·
Auto-suggest pacing adjustment · Auto-trigger next course fire · Auto-
group banquet plating waves · Auto-prioritize VIP tickets · Auto-sync
IRD delivery timing · Auto-hide 86'd items.

### Expo Command Screen specifics
- **Top bar**: service period, outlet, active/danger counts, avg
  ticket time, longest active ticket, station health (G/Y/R), 86
  summary.
- **Left rail filters**: All · Dining · Bar · IRD · Banquet · VIP ·
  Allergy · Fire now · Holding · Late · Ready to plate · Ready to run.
- **Center ticket grid**: per-ticket card with table/room/function +
  covers + course + elapsed + target + flags + station readiness row
  + item readiness row + assigned runner + next action.
- **Right rail station health**: per-station active/avg/longest/blocked
  + color state + suggested action.
- **Bottom all-day strip**: rolled-up item counts (salmon x12, ribeye
  x8) plus due-in-5min/10min by course, VIP count, allergy variants.
- **Ticket states**: New · Working · Waiting · Ready · Holding · Late
  · Fulfilled.
- **3 operating modes**: Standard Restaurant · IRD / Delivery · Banquet
  Wave. Each with distinct ticket card layout.
- **Color logic**: Green healthy · Yellow approaching threshold · Red
  action needed · Blue held/waiting · Purple VIP/special.

### Required integrations
POS order ingestion · Station routing engine · FOH pacing engine ·
Mixology Sommelier prompts · Inventory / 86 engine · Echo Concierge ·
IRD dispatch · Maestro BQT banquet sequencing · Guest Experience
recovery · Schedule/labor alerts · EchoStratus forecasting.

### Backend skeleton
- `/app/backend/routes/kds.py` — station tickets, expo view, fire/bump
  actions, course orchestration, ticket aging, station health.
- Collections: `kds_stations`, `kds_tickets`, `kds_ticket_items`,
  `kds_item_routes`, `kds_86_list`, `kds_allday`.

### Delivery
- Phase 1 (this iter if time): top bar · live ticket grid · station
  health · ready/bump/recall · aging colors · VIP/allergy flags.
- Phase 2: all-day strip · fire-next-course · FOH pacing alert · IRD
  mode · banquet wave mode.
- Phase 3: predictive delay alerts · runner dispatch · recovery
  triggers · route rebalance suggestions.

---


## FOH Service Command Dashboard Spec (logged · Feb 2026 · partial build this iteration)

Positioning: "A service-execution command layer that synchronizes
pacing, staffing, beverage performance, guest signals, and outlet
readiness across the property in real time." Not a reservations or POS
dashboard — a Service Command Layer.

### 3 role layers
**1. Director of Outlets** (multi-outlet command view):
  A. Property Revenue Pulse · B. Outlet Service Readiness Map ·
  C. Beverage Intelligence (Mixology Sommelier) · D. Guest Experience
  Signals · E. Reservation Flow Intelligence · F. Labor vs Revenue
  Optimization · G. Outlet Performance Ranking · H. Cross-Outlet
  Bottleneck Monitor · I. Event Impact Awareness · J. Echo Concierge
  FOH Intake Escalation View.

**2. Outlet General Manager** (per-restaurant):
  Tonight's Service Readiness · Reservation Pacing Engine · Section
  Load Intelligence · Beverage Performance · Guest Signals · Labor
  Command · Table Turn Intelligence · Menu Movement · Concierge
  Recovery Panel.

**3. Dining Room Manager** (shift execution, fastest-moving):
  Live Floor Map · Arrival Curve Monitor · Section Balance · Guest
  Experience Alerts · Ticket Time Monitor · Beverage Opportunity Panel
  · Recovery Radar · Concierge Live Queue.

### 12 core KPIs
covers/hr · rev/seat · rev/labor hr · check avg · table turn time ·
beverage attachment · dessert attachment · no-show rate · walk-in
conversion · VIP recovery success · service recovery count · ticket
time variance.

### Automations
VIP arrival routing · section rebalance · staffing cut suggestions ·
walk-in surge prediction · turn-time deviation alerts · beverage
opportunity detection · ticket delay alerts · recovery escalation.

### Cross-module hooks
Mixology Sommelier · Kitchen Library · Schedule Module · Guest
Experience · Echo Concierge · Banquets · Inventory · Engineering ·
Housekeeping · EchoStratus.

### Outlets (9 seeded)
Pier Top · Calusso · Sotogrande · Saltbreeze · Garni · Windows · IRD ·
Nectar · Elate.

### Backend skeleton
- `/app/backend/routes/foh_ops.py` — property pulse, reservation
  pacing, section load, turn intelligence, beverage performance,
  recovery, VIP arrival tracker, walk-in surge predictor.
- Collections: `foh_outlets`, `foh_reservations`, `foh_sections`,
  `foh_tables`, `foh_servers`, `foh_shifts`, `foh_menu_items`,
  `foh_tickets_timing`, `foh_recovery_actions`.

### Intelligence layer directive (NEW · Feb 2026)
All command dashboards (Spa · Engineering · Housekeeping · FOH ·
Guest 360 · Concierge Hub) must be connected to:
  - **EchoAi³** — synthesize cross-module insights ("pastry delay
    impacting 3 outlets", "VIP spa guest → flagged to restaurant host")
  - **EchoAurium (GM view)** — director-grade executive summary roll-up
  - **EchoStratus** — forecasting layer for directors (revenue, labor,
    covers, walk-in surge, capex, linen demand)

---


## Housekeeping Command Dashboard Spec (logged · Feb 2026 · queued)

Positioning: "A real-time occupancy readiness command center that
synchronizes room status, attendants, inspections, laundry flow,
maintenance coordination, and arrival priorities into one operational
dashboard." The third pillar alongside Spa (revenue) + Engineering
(uptime). Becomes the central hub between Front Desk, Engineering,
Laundry, and Guest Experience.

### 4 role-based views
- **Executive Housekeeper** — readiness vs arrivals, labor deployment,
  inspection compliance, turnaround speed, backlog risk, cleanliness trend
- **Coordinator / Dispatcher** — live room status board, attendant
  routing, rush priorities, VIP rooms, maintenance coord, linen flow
- **Room Attendant** — assigned rooms, cleaning order, priority flags,
  inspection readiness, maintenance reporting shortcuts, minibar tracking
- **Executive / GM** — rooms ready vs arrivals, OOO exposure, turnover
  trend, labor cost per occupied room, cleanliness satisfaction trend

### 9 dashboard zones
A. Today's Room Readiness Board (rooms ready/dirty/inspected/OOO/OOS,
waiting inspection/maintenance, early arrivals, late departures, **revenue
at risk per not-ready arrival room**)
B. Arrival Priority Intelligence Layer (VIP/group/early/suite/repeat/
loyalty/requests — auto-suggested cleaning order)
C. Attendant Productivity Board (rooms cleaned/shift, avg clean time,
rooms remaining, travel optimization, inspection pass rate, callbacks)
D. Inspection Command Panel (completion rate, failed, re-clean,
supervisor pending, VIP/suite status, **cleanliness confidence score**)
E. Laundry & Linen Intelligence (par levels, shortages, backlog,
outsourced ETA, towel trend, **unified linen demand forecast**)
F. Maintenance Coordination Layer (auto-work-orders to Engineering, auto
room blocking, **revenue risk calc**)
G. Turnover Speed Intelligence (avg clean/inspect/release time, floor
readiness speed, **arrival readiness forecast timeline**)
H. Guest Experience Signals (cleanliness complaints, missing amenities,
late-ready, re-clean, odor, linen — escalation prediction)
I. Labor Optimization Engine (rooms/attendant, hours vs occupancy,
overtime exposure, shift gaps, **suggested staffing per occupancy curve**)

### 12 core KPIs (first release)
1. Rooms cleaned per attendant
2. Average clean time
3. Inspection pass rate
4. Rooms ready by arrival time
5. Turnover time
6. Labor cost per occupied room
7. Stayover vs departure ratio
8. Rooms blocked due to maintenance
9. Late-ready rooms
10. Guest cleanliness complaints
11. Linen utilization rate
12. Housekeeping productivity score

### Automations
- Auto-prioritize VIP arrivals & suites
- Auto-flag rooms not ready 2h before arrival
- Auto-create engineering tickets from attendant reports
- Auto-cluster rooms by floor / proximity routing
- Auto-adjust staffing suggestions by occupancy
- Auto-alert supervisor on inspection backlog
- Auto-predict linen shortage risk

### Cross-module integration
Housekeeping ↔ Echo Concierge ↔ Front Desk ↔ Engineering ↔ Laundry ↔
Spa ↔ Banquets ↔ Inventory ↔ Security ↔ Guest Experience ↔ Energy ↔
EchoStratus.

### Backend skeleton
- `/app/backend/routes/hskp_ops.py` — room status, readiness KPIs
- `/app/backend/routes/hskp_attendants.py` — assignments, productivity
- `/app/backend/routes/hskp_inspections.py` — inspection queue
- `/app/backend/routes/hskp_linen.py` — linen & laundry
- `/app/backend/routes/hskp_turnover.py` — turnover intelligence
- Collections: `hskp_rooms`, `hskp_attendants`, `hskp_assignments`,
  `hskp_inspections`, `hskp_linen_levels`, `hskp_work_orders`,
  `hskp_guest_signals`

### Echo Concierge as central intake hub (NEW DIRECTIVE)
User confirmed Echo Concierge must be the unified intake/orchestration
layer across all operational modules: **Spa, Engineering, Housekeeping,
IRD / Minibar / FOH / Guest 360**. Every guest-originated request, staff
report, or cross-department task flows through Echo Concierge and is
routed via its liability filter + intelligent dispatch.

Concierge routing rules:
- Room complaints / amenities / late checkout / crib / rollaway →
  Housekeeping queue
- Leaking sink / broken AC / bulb out / TV not working → Engineering
  work order (auto room-block if severity = high)
- Spa booking / upsell / rebook → Spa booking queue
- F&B in-room dining / minibar restock → IRD queue
- VIP arrival intel / guest profile updates → Guest 360
All routed items carry guest context (room, loyalty tier, VIP flag,
revenue-at-risk $), timestamp, and liability-filtered body text.

---


## Engineering Command Dashboard Spec (logged · Feb 2026 · queued for future build)

Positioning: "A property-wide engineering intelligence layer that
protects uptime, reduces risk, forecasts capital spend, and improves
guest satisfaction through predictive maintenance orchestration."
(Not a ticket tracker — the operating brain for engineering, paralleling
the Spa Command Center.)

### 4 role-based views
- **Engineering Director** — asset lifecycle, backlog risk, CapEx, compliance, labor deployment, downtime trends
- **Coordinator** — ticket routing, vendor dispatch, shift planning, PM tracking, SLA
- **Technician** — assigned tickets, route optimization, parts, room priority, inspection checklists
- **Executive / GM** — guest-impact issues, risk alerts, safety compliance, utility drift, room outage exposure

### 9 dashboard zones
A. Today's Ops Board · B. Echo Concierge Intake · C. Room Status Intelligence ·
D. Preventive Maintenance Engine · E. Asset Intelligence · F. Utilities + Sustainability ·
G. Technician Productivity · H. Compliance + Safety · I. CapEx Forecast Engine

### 12 KPIs (first release)
1. Work order completion rate
2. Average response time
3. Average resolution time
4. Guest-impact ticket ratio
5. Preventive vs reactive ratio
6. PM compliance rate
7. Rooms OOO hours
8. Rooms OOS hours
9. Maintenance cost per occupied room
10. Energy cost per occupied room
11. Asset downtime hours
12. Capital replacement exposure score

### Automations (where LUCCCA wins)
- Auto-escalate tickets older than X minutes
- Auto-flag VIP / group-arrival risk rooms
- Auto-alert if room OOO > 4h before arrival (show "Revenue at Risk" $ per blocked room)
- Auto-schedule PM during low-occupancy windows
- Auto-suggest vendor dispatch if technician unavailable
- Auto-cluster / bundle tickets by floor
- Compliance deadline alerts
- Utility spike detection tied to occupancy/events/weather
- Predictive asset-failure probability

### Cross-module integration
Engineering ↔ Echo Concierge, Housekeeping, Banquets, Kitchen Library,
Spa, Security, Energy, Inventory, Finance, EchoStratus.
Example chains:
- Banquet booked ballroom → lighting inspection auto-scheduled
- Kitchen equipment overheating → menu production warning
- Spa steam room failure → guest-experience alert

### Competitive positioning
LUCCCA should beat ALICE, HotSOS, MaintainX, Quore, UpKeep, eMaint,
Brightly, Snapfix on **decisioning intelligence**, not ticket tracking.
Echo Concierge becomes the front-door intake, not the whole solution.

### Backend skeleton (for next session)
- `/app/backend/routes/eng_ops.py` — KPI engine (same pattern as spa_ops.py)
- `/app/backend/routes/eng_assets.py` — asset register, PM schedules, lifecycle
- `/app/backend/routes/eng_compliance.py` — inspection tracker
- `/app/backend/routes/eng_utilities.py` — utility metering
- Collections: `eng_work_orders`, `eng_assets`, `eng_pm_schedule`, `eng_inspections`,
  `eng_utility_readings`, `eng_vendors`, `eng_capex_forecasts`

---


# LUCCCA · Future Builds Backlog

## Spa Profile Module — Deep Audit & Build Brief (queued · Feb 2026)

Source: User-provided comprehensive spec comparing Book4Time / Zenoti /
Mangomint / Boulevard / Mindbody. User directive: log for future build,
finish current work first.

### Product positioning
> "A hospitality-native spa command center that turns schedules, rooms,
>  therapists, guests, memberships, and retail into one live
>  profit-and-service dashboard."

Not generic salon software. Must outperform competitors on **operational
intelligence** — show what changed, why it matters, and what action to take.
Tightly coupled to LUCCCA login, guest profile, PMS, events, and payroll.

### Role-based login routing
- **Spa Director** → revenue, utilization, payroll pressure, package
  liability, therapist productivity
- **Front Desk / Concierge** → live book, room availability, guest profile,
  upsell prompts, waitlist fills
- **Therapist / Provider** → personal schedule, treatment notes/forms, room
  assignment, rebooking prompts
- **Resort Leadership / Finance** → RevPATR, SRevPOR, revenue by
  therapist/room/service, labor-to-revenue, occupancy-linked spa
  performance

### 8 dashboard zones (cards/widgets)
- **A. Today's Operations** — appointments by hour, arrivals, check-ins,
  late arrivals, room turnover alerts, overbook risk, therapist gaps
- **B. Capacity + Yield** — treatment room utilization, therapist
  utilization, open vs booked hours, peak/low demand windows, yield
  opportunities, high-value slot protection
- **C. Revenue** — today/week/month revenue, Average Treatment Rate,
  revenue by service/therapist/room, retail attachment, gift cards,
  memberships + package sales
- **D. Guest Intelligence** — VIP arrivals, in-house guests, repeat guests,
  preferences, contraindications/notes, birthdays/anniversaries, rebooking
  likelihood, cross-sell prompts
- **E. Staff + Labor** — productivity, breaks, commissions, payroll
  estimate, overtime risk, utilization by provider, request ratio,
  training/certification flags
- **F. Retail + Consumables** — retail sales by therapist, treatment
  product depletion, low-stock alerts, backbar usage, margin by category,
  auto-reorder suggestions
- **G. Memberships / Packages / Liability** — active members, renewals
  due, unused package liability, redemption pace, churn-risk members,
  recurring revenue
- **H. Reputation + Recovery** — guest feedback, review/NPS trend,
  complaint recovery queue, no-show reasons, cancellation reasons,
  win-back campaigns

### Required KPI formulas
- Treatment Room Utilization
- Therapist Productivity
- Average Treatment Rate
- Revenue per Available Treatment Room (RevPATR)
- Revenue per Guest
- Spa Revenue per Occupied Room (SRevPOR)
- Retail attachment rate
- Rebooking rate
- No-show rate
- Cancellation rate
- Package liability
- Labor-to-revenue ratio

### Required automation / alerts
- Alert when premium slots are unfilled within X hours
- Alert when therapist productivity drops below target band
- Alert when room utilization is below target by daypart
- Suggest upsells based on guest profile, package status, service pairing
- Trigger win-back flow after cancellation or lapse
- Flag members near renewal or low redemption
- Flag backbar/retail depletion risk

### Competitive differentiators for LUCCCA
1. Hospitality-native logic (not generic salon/spa)
2. Executive KPI layer that interprets, not just reports
3. Scheduling intelligence (action-oriented — move therapist A, open room
   3 later, hold premium slots, prompt upgrades)
4. Cross-module LUCCCA linkage (payroll, guest profile, packages, retail,
   F&B, events, CRM, hotel stay data)

### First-release widget list (priority)
- Today's Book
- Therapist Schedule Load
- Treatment Room Utilization
- Revenue Today / Week / Month
- Average Treatment Rate
- Therapist Productivity
- Memberships / Packages Due & Redemption
- Retail Attachment & Low Stock
- No-Show / Cancellation Tracker
- VIP / In-House Guest Queue
- Payroll / Commission Snapshot
- Recovery Actions / Rebooking Opportunities

### Notes for implementation
- Build on top of existing LUCCCA auth + sidebar registration pattern
- Use existing /app/backend/routes structure — likely new `spa_ops.py`,
  `spa_kpi.py`, `spa_schedule.py`, `spa_guest_intel.py`
- Reuse enterprise dark/gold theme — no cyan/magenta
- Typical spa ops run at 35-40% treatment-room utilization → huge
  revenue opportunity if scheduling intelligence fills the gaps

---

## Other queued items
- **Hybrid Echo Concierge Chat Liability Check** — AI + rule-based filter
  on guest tickets/notes to prevent liability exposure or personal
  opinions from being recorded. Flagged by user for "future build."
- **Mobile/PWA responsive refinement** — deep pass across all panels.
- **Wine list import** — awaiting document from user.
- **Editor.tsx refactor** — 273-line compressed file needs careful split
  into sub-modules.
- **POS connector adapter** — Micros/Toast. Groundwork laid via
  `pos_outbound` outbox collection (every cake order enqueues).
