# Global Calendar Unification — Plan for iter202+
**Owner:** William · **Drafted:** iter201 (Feb 2026) · **Status:** QUEUED, execute after Events consolidation (iter201) ships

## The problems William raised
1. **Global calendar is NOT showing any booked events** — neither BEO events nor scenario-planned events appear
2. **PTO requests also not flowing** into the calendar
3. **No right-click context menu** (William previously requested — still not built)
4. **Every department's events must flow through one global calendar** — engineering/banquet/AV/HK/F&B need shared visibility
5. **Day-click drill-down**: all activities for that day, grouped by department + time
6. **Department filter checkboxes** at the top of the calendar (deselect areas that don't affect them)
7. **Engineering needs**: room/location + time for every event so they can adjust HVAC + avoid conflicting work
8. **Banquet setup profile**: should auto-pull equipment needs per event
9. **AV dashboard**: should auto-flag events that need AV

## What to check before building
- Which backend collection is the "global calendar" reading from today? (`calendar_events`, `echo_events`, `events`, `conventions`, something else?)
- Is there a single canonical calendar aggregator endpoint, or do each of the source modules feed it?
- Are the following feeding the calendar already?
  - BEO / Echo Events → `calendar_events`? Check. (iter188 says it should, via `source_module`)
  - Conventions → `calendar_events` (iter201 we know YES — `advanced_ops.py:564-582` inserts calendar events)
  - PTO approved → calendar_events? (VERY likely NO — add this)
  - Standup "Resort Activities" → calendar? (VERY likely NO — check)
  - Lifestyle activations → calendar? (likely scattered)
  - Group Events → calendar? (group_events module — check)
  - Showrooms → calendar? (unlikely)
  - Banquet setup → calendar? (unlikely, probably separate)
  - AV bookings → calendar? (unlikely)

## Proposed architecture (iter202)
- **Single aggregator endpoint**: `GET /api/calendar/feed?from=&to=&depts=engineering,banquet,av,fb,spa,lifestyle,hr,pto` — unions all sources into a normalized `CalendarEntry` shape:
  ```
  { id, title, start, end, dept, room/location?, source_module, severity?, requires_av?, requires_setup?, guest_count?, linked_id }
  ```
- **Writers (all modules emit into `calendar_events` on state-change)**:
  - PTO approve → emits `pto.approved` calendar entry (`dept=<employee dept>`, `room=null`)
  - Standup send (Resort Activities) → emits calendar entries
  - Lifestyle activations → emits
  - Group Events → emits
  - Conventions → already emits (confirmed)
  - BEO / Echo Events → check + fix gap
  - Showroom approvals → emits
  - Banquet setup profile → emits with `requires_setup: true`
  - AV bookings → emits with `requires_av: true`
- **Reader (global calendar panel)**:
  - Top department filter row (checkboxes, persisted per-user)
  - Day-click opens a right rail with events grouped by dept, sorted by start time
  - Right-click on a day → context menu: `+ New booking | + PTO request | + Showroom | + Activation | View engineering HVAC plan`
  - Right-click on an event → context menu: `Edit | Open source module | Duplicate | Cancel | Flag conflict`
- **Engineering slice**:
  - Engineering dashboard pulls `GET /api/calendar/feed?depts=all&requires_location=true`
  - Groups by room → timeline view → HVAC schedule overlay + "safe work windows" (slots with no events in that room)
- **Banquet slice**:
  - Auto-surfaces upcoming events needing setup (next 72h)
  - Equipment checklist generated from `setup_style` + `guest_count` + `event_type`
- **AV slice**:
  - Auto-surfaces events where `requires_av=true`
  - Flags events missing AV crew assignment

## Open questions for William (revisit at iter202 kickoff)
- How many days ahead should the default calendar view load? (30 / 60 / 90)
- Should PTO show with names visible to everyone, or redacted for non-managers?
- When two departments collide on the same room/time, who owns conflict resolution UI? (Director of Events? Leadership on Duty?)
- Right-click actions on the calendar — should admins see more options than line staff?

## Definition of Done
- Creating any event, BEO, PTO, activation, showroom, convention, banquet setup, or AV booking causes the global calendar to update within 2 seconds
- Engineering can pull a 7-day HVAC plan derived from room + time
- Banquet auto-sees equipment needs with zero manual entry
- AV dashboard flags every AV-required event no more than 5 min after creation
- Department checkboxes persist per user across sessions
- Right-click context menu on calendar day + event
- Zero duplicate events when the same entity is booked from 2 modules (dedupe on `linked_id`)
