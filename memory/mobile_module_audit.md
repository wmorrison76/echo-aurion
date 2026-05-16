# Luccca · Mobile Module Audit
> Which modules fit the phone, which don't, and why. Use this as the decision matrix when you pick Build 2 scope.

| Module | Mobile fit | Why / notes |
|---|---|---|
| **Guest Concierge** (`/guest/*`) | ✅ Already mobile-first | Built as phone PWA. QR sign-in, valet, IRD tracker, VIP add-ons, weather plan, venue menus. Zero changes needed. |
| **Daily Briefing Mobile** (`/m/briefing/:token`) | ✅ Already mobile-first | Compact read-only staff view. Delivery preference card added iter189. |
| **Mobile Concierge (staff FOH)** (`/m/concierge/:token`) | ✅ Already mobile-first | Single-column companion for FOH staff. All staff get this. |
| **Group Event Attendee** (`/g/event/:code`) | ✅ Already mobile-first | Day-grouped itinerary with session cards. Perfect for conference attendees. |
| **MySchedule** | ✅ Fits | One view per user, celebrations feed, PTO request button. Needs a LIMITED view for general staff (no coworker detail, no financials, no total hours). |
| **PTO request flow** | ✅ Fits | Simple form — date range, reason, submit. Mobile-ideal. |
| **Benefits view** | ✅ Fits (read-only) | Tiled cards of health/dental/401k/PTO balance. No editing. |
| **Settings overhaul** (Apple-style) | ✅ Fits | Already Apple-style sleek; works on phone as-is. |
| **Celebrations feed** | ✅ Fits | Timeline + quick reactions. Already mobile-ready. |
| **EchoCommandBar** (voice/text AI) | ✅ Fits | Voice-first input is MORE native on mobile than web. Use native mic plugin. |
| **Stratus alerts** | ✅ Fits | Push-notify list with snooze/acknowledge. Perfect for SMS fallback UX. |
| **Luccca JARVIS Dashboard** | 🟡 Partial — salary only | Data-dense enterprise command centre. Condense to 4 cards + drilldown vs desktop's 16-tile grid. Salary-only. |
| **Hiring / Resume AI** | 🟡 Partial | Viewing candidate profiles and approving is mobile-fine. Resume PDF rendering needs native viewer. |
| **Standup Board editor** | 🟡 Partial — salary only | Reading the confirmed board = ✅ (already in `/m/briefing`). Editing sections = painful on phone. Defer editing to desktop. |
| **Menu Engineering** | 🟡 Partial — salary only | Viewing KPIs = OK. Editing price/cost = desktop-preferred. |
| **Concierge Mobile Admin (QR mint)** | 🟡 Partial — salary only | Minting + listing tokens works on phone. Printing QR placards does not. |
| **Daily Briefing Admin** | 🟡 Partial — salary only | Template editor is text-heavy; fits on phone but desktop is better. |
| **Culinary modules** (recipes, banquet menu) | 🟡 Partial — salary only | Reading = OK. Photography step for new recipes benefits from mobile camera (native). Editing ingredient tables = desktop. |
| **Cake Designer / 3D decorating** | ❌ Desktop-only | 3D manipulation + pipette colour picker + intricate piping paths require precision pointer input. Not mobile-feasible. |
| **EchoCanvas (whiteboard)** | ❌ Desktop-only | Multi-panel infinite canvas with drag/drop. Touch gestures conflict with pan/zoom. |
| **PanelHost (floating multi-panel workspace)** | ❌ Desktop-only | Draggable/resizable floating panels require precise pointer + screen real estate. |
| **Admin onboarding wizard** | ❌ Desktop-only | Multi-step forms with large tables and file uploads. |
| **EchoCoder** (developer surface) | ❌ Desktop-only | Code editor. |
| **Financial reports / P&L** | ❌ Desktop-only | Wide tables, export-to-Excel flow, drilldown tooltips. |
| **Outlet configuration / GL setup** | ❌ Desktop-only | Technical setup; done once per property. |

---

## 📱 Recommended **Staff app** layout (Build 2)

### Tab structure (iPhone bottom nav, Android bottom nav)
1. **Home** — personalised today card · quick actions
2. **Schedule** — my shifts + PTO/time-off (GENERAL-STAFF VIEW: no coworker details; SALARY: full coverage + approve PTO)
3. **Concierge** — mobile FOH companion (all staff)
4. **Briefing** — daily standup mobile (all staff)
5. **More** — benefits · celebrations · settings · sign out (SALARY gets an extra "Admin" row with dashboard/alerts/standup editor/menu engineering)

### Role gating
- **General staff** (`role: "general"`):
  - Home, Schedule (limited), Concierge, Briefing, Benefits, Celebrations, Settings, Sign out
  - NO dashboard, NO standup editor, NO admin tools, NO financials
- **Salary staff** (`role: "salary"` / `"manager"` / `"owner"`):
  - Everything General has, PLUS:
    - JARVIS dashboard (condensed phone view)
    - Standup editor (read + lock sections — actual editing still on desktop)
    - Menu engineering KPIs
    - Stratus alerts list with ack/snooze
    - Hiring inbox (candidate swipe approve/deny)
    - Concierge admin (mint QR tokens)
    - Daily briefing admin (mint tokens, template editor, flush queue)

---

## 📱 Recommended **Guest app** layout (Build 1, already done)

The guest app is effectively DONE — Capacitor just wraps the existing `/guest/*` React routes. No redesign needed. Deep link scheme: `luccca://guest?room=X&last=Y`.

---

## 🚫 What the apps **do NOT** include
- Cake Designer (desktop-only)
- Whiteboard / EchoCanvas (desktop-only)
- PanelHost multi-panel workspace (desktop-only)
- Full financial reporting (desktop-only)
- EchoCoder (desktop-only)
- Initial onboarding wizard (desktop-only)

Users needing those flows continue to use the web app on a laptop.

---

## 🎯 Next step after Build 1

Move to Build 2 implementation: a new `/m/staff/:token` route that role-gates the tabs above. Backend `employees.role` field ∈ `{general, salary, manager, owner}` drives the rendering. General-staff PTO endpoints (`POST /api/pto/request`, `GET /api/pto/mine`) and benefits endpoints (`GET /api/benefits/mine`) ship alongside.
