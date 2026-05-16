# MyEcho — Employee Mobile App

> **Module path:** `client/modules/MyEcho*/` + `backend/routes/myecho_*.py`
> **Audience:** Hourly + salaried employees (cooks, servers, housekeepers, managers)
> **Status:** Stable (D34 + D60 shipped; D14 multi-window for desktop counterpart)
> **Last updated:** 2026-05-07 (D63)

---

## In one sentence

MyEcho is the phone-in-the-pocket employee app — install via QR
in 30 seconds, biometric login, station-aware home screen, real
paystubs, real schedule, real shift-swap, real W-2.

## Who uses it

  - **Hourly cook / server / housekeeper / busser** — daily;
    clock in, see schedule, swap shifts, request time off,
    download paystub
  - **Salaried sous chef / supervisor** — daily; same as above
    plus approval inbox
  - **Manager** — daily; approve borrows, post job-shares,
    review attendance

## Top tasks (3-click flows)

| Task | Path | Click count | Voice intent |
|---|---|---|---|
| View schedule | Home → Schedule | 2 | "what's my schedule" |
| Clock in / out | Home → Clock | 1 (NFC tap counts as 0) | "clock me in" |
| Post a shift to job-share | Schedule → tap shift → Share | 3 | "share my shift" |
| Claim a coworker's shift | Home → Job board → Claim | 3 | "claim a shift" |
| View latest paystub | Home → Paystubs | 2 | "show me my paystub" |
| Request time off | Home → Schedule → Request | 3 | "request time off" |
| Download W-2 | Home → Tax docs → Download | 3 | "get my W-2" |
| Update direct deposit | Home → Settings → Direct Deposit | 3 | (form input) |

All meet the §3-click rule.

## Key concepts

  - **Install via QR** — D34 manager generates a single-use
    enrollment QR; employee scans on phone; PWA installs in 30
    seconds; no app-store, no IT ticket.
  - **Face ID / WebAuthn** — D60; after install, employee enrolls
    Face ID. Subsequent opens use biometric. No password ever.
  - **Station-aware home** — D34; tiles match employee's role +
    department. Line cook sees waste / line check / transfer /
    recipes. Server sees tables / orders / allergen alerts.
    Manager sees approvals / audit / schedule.
  - **Job share** — D47 + D34; employee posts a shift to coworkers
    in same department; first to claim wins. Original owner
    audited as `swapped_from`.
  - **Schedule request** — D47; employee can request specific
    shifts, days off, or shift preferences. Manager approves or
    declines.

## Backend endpoints

### Enrollment + Auth (D34 + D60)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/myecho/enroll/qr` | Manager generates enrollment QR |
| POST | `/api/myecho/enroll/install` | Employee scans → session token |
| GET | `/api/myecho/home` | Station-aware tile list |
| POST | `/api/myecho/webauthn/register/options` | Face ID enroll start |
| POST | `/api/myecho/webauthn/register` | Face ID enroll complete |
| POST | `/api/myecho/webauthn/assert/options` | Face ID login start |
| POST | `/api/myecho/webauthn/assert` | Face ID login complete (issues bearer) |
| GET | `/api/myecho/webauthn/credentials` | List registered devices |
| DELETE | `/api/myecho/webauthn/credentials/{id}` | Revoke a device |

### Self-service (D47)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/myecho/payroll/paystubs` | Own paystubs |
| GET | `/api/myecho/payroll/paystubs/{id}` | Detail |
| GET | `/api/myecho/payroll/w2/{tax_year}` | Own W-2 |
| GET | `/api/myecho/payroll/direct-deposit` | DD info (masked) |
| PUT | `/api/myecho/payroll/direct-deposit` | Update DD |
| GET | `/api/myecho/payroll/ytd` | YTD gross |
| POST | `/api/myecho/job-share` | Post own shift to coworkers |
| GET | `/api/myecho/job-share/offers` | Browse claimable shifts |
| POST | `/api/myecho/job-share/{id}/claim` | Claim a shift |
| POST | `/api/myecho/schedule-request` | Time off / specific shift / avoid |

### Recipes (D34)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/myecho/recipes/by-category` | Grouped recipes; redacted view for non-culinary |

## Doctrine alignment

  - **§1.4 voice register**: every self-service endpoint scopes
    to `x-user-id` of the requesting employee. An employee can
    NEVER see another employee's paystub, even with their session
    token.
  - **§2.5 framing**: home tiles show observation framing —
    "Recipes for tonight" not "Your assigned tasks for compliance"
  - **§2.6 never throw the pan**: the home page does NOT show
    individual performance scores, rankings, or comparisons to
    coworkers. Performance reviews are pass_dev only.
  - **§3.1 append-only**: paystubs and W-2s are write-once.
    Corrections create new linked rows; the original survives.
  - **D27 tenant isolation**: a session token is bound to
    (tenant_id, employee_id, device_id). Cross-tenant access is
    impossible at the protocol layer.

## Data this module reads / writes

| Collection | Notes |
|---|---|
| `myecho_enrollments` | Single-use QR tokens; consumed_at stamp |
| `myecho_sessions` | Long-lived (90d) per-device session tokens |
| `webauthn_credentials` | Face ID public keys (per device per employee) |
| `webauthn_bearers` | Short-lived (8h) auth tokens after Face ID |
| `webauthn_challenges` | One-time challenges (5min TTL) |
| `paystubs` | Read-only from this module (write is payroll's job) |
| `w2_records` | Read-only |
| `direct_deposits` | Read + update (masked) |
| `job_share_offers` | Post + claim |
| `schedule_requests` | Post |
| `echo_schedule_shifts` | Read; updated by job-share claim |

## Integration points (D17 fuse-box seams)

  - `services/clients.py:get_webauthn_verifier()` — production
    swap for the python `webauthn` package (or any FIDO2 lib)
  - `services/clients.py:get_push_client()` — schedule-change
    notification (Apple Push / FCM / OneSignal)

## Common operator questions

  · **"How do I enroll an employee?"** — Open Admin → Users → tap
    employee → Generate Enrollment QR. Hand the phone to the
    employee or text them the link. They scan, app installs,
    Face ID prompts, done. ~30 seconds.
  · **"Employee lost their phone."** — Admin → Users → tap →
    Revoke active sessions. Generate new enrollment QR. Old
    sessions are dead immediately.
  · **"Can two employees share one phone?"** — Technically yes
    (multiple webauthn credentials per device), but each enrolls
    separately; Face ID is per-employee. Recommend personal
    phones for hygiene.
  · **"Why doesn't the employee see paystubs from a previous
    employer?"** — D27 tenant isolation. Even if the same
    `employee_id` exists in two tenants, the session token only
    unlocks the current tenant's data.

## Known limitations

  - **Native iOS/Android apps not yet shipped** — D34 ships as
    PWA via "Add to Home Screen." Push notifications work on
    Android, sub-optimal on iOS (Apple's PWA push support
    landed in iOS 16.4 but is unreliable). Native wrappers are
    in the D-followups queue.
  - **Offline mode minimal** — schedule + paystub view work
    offline (cached); job-share requires connectivity. Full
    offline ops queued for a future iter.
  - **Group messaging not yet exposed** — D45 sous chef
    `peer_message` is one-to-one for now; group send queued.

## Doctrine cross-references

  - ADR-0003 (D17 fuse-box) — push notification + webauthn
    verifier are pluggable seams
  - ADR-0004 (tenant isolation) — session tokens prove the
    boundary holds
  - ADR-0005 (doctrine-as-contract) — every endpoint enforces
    `x-user-id` matching the session

## Changelog (this module)

  - 2026-05-07 · D63 · Initial module documentation written
  - 2026-05-07 · D60 · Face ID / WebAuthn for biometric login
  - 2026-05-07 · D47 · Job share + schedule request +
    self-service paystubs / W-2 / direct deposit
  - 2026-05-07 · D34 · QR install + station-aware home
  - Earlier · myecho_staff.py landed; consolidated under MyEcho
    module surface
