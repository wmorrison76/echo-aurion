# Echo AURION · LUCCCA — Project Continuity README

**Created**: Apr 28 2026 · Iter 260  
**Purpose**: Prevent context/work loss between agent sessions. Read this FIRST before any new feature work.

---

## 1. Quick Identity

- **Owner**: William Reyes (DIRECTOR, `director@luccca.com`)
- **Company aliases**: Echo AURION (desktop shell) · MyEcho (mobile shell) · LUCCCA (legal)
- **Stack**: React + Vite (frontend, `/app/client/`) · FastAPI (backend, `/app/backend/`) · MongoDB (local, via `MONGO_URL`)
- **Preview URL**: `REACT_APP_BACKEND_URL` from `/app/frontend/.env` — treat as ephemeral
- **Legal**: Generic names only (Echo AURION, Chronos, Atlas, Maestro — no real brand mentions)

---

## 2. Where continuity data lives (NEVER lose this again)

| Asset | Location | Purpose |
|---|---|---|
| **Product Requirements** | `/app/memory/PRD.md` | Full iteration log — every sprint has its own section |
| **Role Access Matrix** | `/app/memory/ROLE_ACCESS_MATRIX.md` | Who sees which modules · dept inheritance rules |
| **PurchRec audit** | `/app/memory/PURCHREC_DEEP_DIVE_AUDIT_iter257.md` | 3-way match / auto-PO blueprint |
| **Test credentials** | `/app/memory/test_credentials.md` | All 16 seeded user accounts + passwords |
| **This README** | `/app/memory/README.md` | Project compass — read FIRST |
| **Design tokens** | `/app/client/styles/design-tokens.ts` | Single source of look & feel |
| **Test reports** | `/app/test_reports/iteration_*.json` | Playwright smoke & regression outputs |

**Rule**: Update `PRD.md` + `test_credentials.md` at the end of every iteration via the `finish` tool.

---

## 3. Seeded User Profiles (16 total — all live at startup)

Switch via the top-right avatar dropdown in the desktop shell. Cookie: `echo_dev_user`.

| Tier | Role | User | Email | Landing |
|---|---|---|---|---|
| admin | admin | Admin | `admin@luccca.com` | dashboard |
| enterprise | regional-director | Robert Sinclair | `regional@luccca.com` | chronos |
| property | director | **William Reyes** | `director@luccca.com` | chronos |
| property | exec-dir-finance | Alexandra Marchetti | `execfin@luccca.com` | chronos |
| property | general-manager | Marcus Hayes | `gm@luccca.com` | chronos |
| property | fb-director | Priya Patel | `fbdir@luccca.com` | chronos |
| property | controller | Andre Dupont | `controller@luccca.com` | chronos |
| dept-head | executive-chef | Chef Gio | `execchef@luccca.com` | chronos |
| dept-head | pastry-chef | Chef Carissa | `pastrychef@luccca.com` | chronos |
| dept-head | dir-banquets | Isabella Moreau | `dirbanquets@luccca.com` | chronos |
| dept-head | events-manager | Yuki Tanaka | `events@luccca.com` | chronos |
| dept-head | spa-manager | Elena Volkov | `spa@luccca.com` | — |
| dept-head | dir-engineering | Liam O'Brien | `eng@luccca.com` | — |
| dept-head | purchasing-manager | Amara Okafor | `purchasing@luccca.com` | — |
| enterprise-desktop | sous-chef | Carlos Mendes | `souschef@luccca.com` | chronos |
| enterprise-desktop | dining-room-manager | James Chen | `dining@luccca.com` | chronos |
| mobile | staff (hourly) | Sofia Ramirez | `staff@luccca.com` | myecho-home |

Common password: `Welcome2026!` (admin has `LuccaaAdmin2026!`).

---

## 4. Core Architectural Patterns (copy these for every new feature)

### 4.1 Connection-check fallback (Mock → Live)
Every data endpoint checks the live MongoDB collection first; if empty, falls back to deterministic seeded mocks. Real integrations just have to write to the collection — code path flows through automatically.

**Example** (`backend/routes/chronos.py`):
```python
def _live_outlets_or_fallback():
    try:
        live = list(db["outlets"].find({"active": {"$ne": False}}, {"_id": 0}))
        if live: return [normalize(o) for o in live]
    except Exception: pass
    return list(SEEDED_OUTLETS)
```

**Apply this pattern** to: recipes, BEOs, POS rings, invoices, schedules, prep items.

### 4.2 Role → Panel → Access
1. Auth resolves role from JWT `/api/auth/jwt/me` (or dev cookie `echo_dev_user`).
2. `PanelHostIntegrated.tsx` auto-opens role landing panel on sign-in via `ROLE_LANDING_PANEL`.
3. `Sidebar.tsx` reads `ROLE_SIDEBAR_ACCESS[role]` to trim groups.
4. `/api/chronos/access/me` exposes effective module list for defensive checks.
5. **Inheritance rule**: role has access to outlet details → auto gets all modules in that department (see `access_matrix.py`).

### 4.3 Deterministic mock data
All mock data uses `_rand_for(seed_str)` — a SHA-256 seeded RNG so numbers are stable across reloads. Never use `random.random()` directly in a mock.

### 4.4 Role-gated UI elements
Wrap any dept-specific banner/widget in a `PASTRY_BANNER_ROLES` / similar Set check in `AppFull.tsx` → `DesktopShell`. Don't leak kitchen banners into Director/Finance/Spa views.

### 4.5 Panel registration (3-file rule)
Every new panel must be added in ALL three:
1. `client/lib/panel-types.ts` — add to `PanelKey` union
2. `client/lib/panel-registry.ts` — priority entry + lazy module loader
3. `client/lib/panel-metadata.ts` — label + description + default W/H

Then optionally add to `Sidebar.tsx` (groups) and `PanelHostIntegrated.tsx` (landing).

### 4.6 Test-id everything
Every interactive element, every critical display value, must have `data-testid="<role>-<action>-<detail>"` in kebab-case. Testing agent relies on these. No exceptions.

---

## 5. Oracle ERP Design Language

William's design preference for dashboards:
- **Dense dark surfaces**: `#0a0e17` (panel bg), `#141825` (surface), `rgba(255,255,255,0.06)` (border)
- **Gold accent**: `#c8a97e` — for active states, section headers, key KPI values
- **Mono font for labels**: uppercase + widest letter-spacing (`tracking-widest`, 9-10px, slate-500)
- **Breadcrumbs + action ribbons** at the top of every panel
- **Sparklines** in every KPI tile
- **Status dots + letters**: ● Healthy · ▲ Watch · ▼ Drift · × Critical
- **NO emoji as icons** — use lucide-react
- **Left-aligned, asymmetric layouts** — not centered

Single source of truth: `/app/client/styles/design-tokens.ts` (iter 260). Every module imports from this — no hard-coded hex values.

---

## 6. Chronos ("operational time machine") — the landing dashboard

**Concept**: Portfolio view (outlet cards with health + mini-KPIs) → drill into an outlet → Ops View (16 KPI sparkline tiles + time slider + weather + event pins + 3-day prep forecast + live BEOs).

**Endpoints** (`backend/routes/chronos.py`):
- `/api/chronos/portfolio?user_id=…` — role-scoped outlet cards
- `/api/chronos/outlet/{id}?day=N` — 16 KPI tiles + 30-day sparklines + weather + event pins
- `/api/chronos/compare?ids=a,b,c` — side-by-side compare
- `/api/chronos/forecast-tomorrow?user_id=…` — Monte Carlo P10/P50/P90 for tomorrow
- `/api/chronos/prep-forecast?outlet_id=…&days=3` — 3-day prep demand + auto production sheet
- `/api/chronos/beos-live?user_id=…&days_ahead=31` — Live BEO feed
- `/api/chronos/properties?user_id=…` — property-grouped (for Regional Director)
- `/api/chronos/access/me?user_id=…` — effective modules for UI gating

**Frontend**: `/app/client/modules/Chronos/index.tsx` (single file, ~600 lines, contains Portfolio + Ops + Compare views).

---

## 7. External Integrations (live vs mocked)

| Integration | Status | Notes |
|---|---|---|
| Claude Sonnet 4.5 | ✅ Live | Emergent LLM Key · Daily Briefings · narrative generation |
| OpenAI Whisper (STT) | ✅ Live | Emergent LLM Key · voice journals |
| OpenAI TTS | ✅ Live | Emergent LLM Key · briefings read-aloud |
| Firebase FCM | ✅ Live | User-provided key |
| Twilio SMS | 🟠 MOCKED | User provided keys but NO FROM number |
| AWS S3 | 🟠 MOCKED | User keys pending — VIP photos/huddle videos/radio audio use fallback paths |
| Resend/SendGrid | 🟠 MOCKED | User keys pending |
| Google OAuth | ❌ Removed | Switched to JWT-only (see iter252) |

**When unblocked**: flip env vars and the code path auto-swaps (see Connection-check fallback above).

---

## 8. Common Pitfalls (learned the hard way)

1. **Never wipe `localStorage.clear()` in a test** — it kills auth cookies/session. Only remove keys with `panel` / `atlas` / `echo` in the name.
2. **Sidebar uses TWO auth hooks** — `@/hooks/useAuth` (legacy mock) and `@/lib/auth-context` (JWT). Always prefer JWT role; fall back to legacy.
3. **Panel state persists in IndexedDB** — after deleting a panel module, clear Vite cache (`rm -rf /app/node_modules/.vite`) + restart frontend to avoid stale rendering.
4. **Hot reload works for all code EXCEPT**: `.env` changes, dependency installs, new routers registered in `server.py`. Run `sudo supervisorctl restart backend` for those.
5. **Never hard-code `localhost:8001`** — use `${REACT_APP_BACKEND_URL}` or `${window.location.origin}`.
6. **MongoDB `_id` is not JSON-serializable** — always project `{"_id": 0}` in find queries.
7. **Videos from William** — use `analyze_file_tool` with detailed questions to extract UI specs before building.
8. **Source files from William** — he has original dev files. Ask for them if unsure about a feature's design; don't re-invent.

---

## 9. If You're a New Agent — Start Here

1. Read `/app/memory/PRD.md` (last section = most recent).
2. Read this README.
3. Check `/app/test_reports/iteration_*.json` (latest) for regression state.
4. Run: `curl http://localhost:8001/api/chronos/portfolio?user_id=director_user` — confirm backend live.
5. Open the preview URL as Director (cookie: `echo_dev_user=director_user`) — confirm Chronos loads.
6. Ask William *specific* questions (option a/b/c format) — don't dump a 10-question wall.
7. When shipping, ALWAYS update `PRD.md` + `test_credentials.md` + this README if any pattern changed.

---

## 10. Module Directory Map

```
/app/client/modules/
  Chronos/          ← Portfolio + Ops View landing (iter259-260)
  PurchRec/         ← Purchasing & Receiving (consolidated, iter256)
  Schedule/         ← Schedule v2 (iter256)
  Pastry/           ← Pastry dept (banner, recipe builder, production, cake designer)
  Culinary/         ← Culinary dept (dashboard, recipe builder, CDC launchpad)
  MaestroBQT/       ← Banquet Event Orders
  AdminOnboarding/  ← Property + outlet + user + GL seeding UI
  Onboarding/       ← 7-step wizard (role taxonomy)
  StaffMobile/      ← MyEcho mobile shell for hourly staff
  ... and ~60 more
```

```
/app/backend/routes/
  auth.py                    ← JWT + seed_admin_and_staff (16 users)
  chronos.py                 ← The time machine (iter259-260)
  access_matrix.py           ← Role → Dept → Module mapping (iter260)
  admin_onboarding.py        ← Properties/outlets/users/GL
  briefing.py                ← Claude daily briefing (role-aware)
  invoice_ingest.py          ← Vendor invoice PDF → SKU extraction
  purchasing_approvals.py    ← Oracle-style approval hierarchy
  echo_schedule.py           ← Schedule v2 backend
  service_recovery.py        ← Save-the-Ticket + Tonight's Playbook
  ... and ~40 more
```

---

## 11. Finish-Tool Discipline

Every `finish` must:
- Update `/app/memory/PRD.md` with a new `## Iteration N` section at top
- Update `/app/memory/test_credentials.md` if any auth changed
- Update this README if any pattern or convention changed
- List `Next Action Items` · `Future Backlog` · `Potential Improvement` (the 3 required bullets)
- Flag anything MOCKED in ALL CAPS so it's visible

*End of README.*
