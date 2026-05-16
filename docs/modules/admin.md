# Admin

> **Module path:** `client/modules/Admin*/` + `backend/routes/admin_*.py`
> **Audience:** Property GM, Regional Director, Aurion Holdings ops staff
> **Status:** Stable
> **Last updated:** 2026-05-07 (D63)

---

## In one sentence

The Admin module is the single surface where a GM provisions outlets,
manages user roles, configures policies, and reviews property-wide
audit chains.

## Who uses it

  - **GM** — daily; check approvals inbox, review service-auditor
    findings, set policy
  - **Regional Director** — weekly; cross-property dashboards,
    policy roll-up
  - **Aurion Holdings ops staff** — as needed; tenant provisioning,
    onboarding, support escalations

## Top tasks (3-click flows)

| Task | Path | Click count | Voice intent |
|---|---|---|---|
| Approve a pending action | Notification tile → tap | 1 | "approve {item}" |
| View audit findings | Home → Auditor tile | 2 | "show me findings" |
| Add a new outlet | Home → Outlets → Add | 3 | "add a new outlet" |
| Invite a user | Home → People → Invite | 3 | "invite a manager" |
| Set tip share policy | Home → Tip share → Edit | 3 | "open tip share policy" |
| Cross-property benchmark | Home → Benchmark | 2 | "show me peers" |

All tasks meet the §3-click rule (per `docs/UX_3_CLICK_DOCTRINE.md`).

## Key concepts

  - **Tenant** — Aurion Holdings hosts multiple property groups;
    each is a `tenant_id`. Tenants are isolated end-to-end (D27).
  - **Outlet** — one revenue-producing surface within a property
    (a restaurant, a bar, a spa, the IRD program). One property
    has many outlets.
  - **Audience register** — every endpoint requires
    `x-audience-register` header (operator | staff | pass_dev |
    guest). The API itself enforces what each audience can see
    or do (per §1.4).
  - **Approval inbox** — D18 surface that batches anything
    requiring human sign-off. Cross-dept borrow PAFs (D35),
    high-value comps, service auditor critical findings.
  - **Audit chain** — every operator action emits to `audit_log`.
    The chain is the source of truth for "what happened, when,
    who did it" — never the screen you're looking at.

## Backend endpoints

| Method | Path | Purpose | Audience |
|---|---|---|---|
| GET | `/api/admin/dashboard` | Property-wide health summary | operator |
| GET | `/api/admin/approvals/pending` | Approval inbox | operator |
| POST | `/api/admin/approvals/{id}/approve` | Resolve pending action | operator |
| GET | `/api/admin/users` | List property users | operator |
| POST | `/api/admin/users` | Invite a user | operator |
| GET | `/api/admin/outlets` | List outlets | operator |
| POST | `/api/admin/outlets` | Add a new outlet | operator |
| GET | `/api/admin-console/...` | Aurion Holdings ops surface | pass_dev |
| GET | `/api/echo/audit/findings` | Service auditor findings | operator |
| POST | `/api/echo/audit/findings/{id}/resolve` | Close a finding | operator |
| GET | `/api/audit-log` | Raw audit chain (tenant-scoped) | pass_dev |
| GET | `/api/echo/insights/benchmark?metric=...` | Peer benchmark | operator |

## Doctrine alignment

  - **§1.4 voice register**: every Admin endpoint requires
    `x-audience-register=operator` minimum; pass_dev required for
    cross-tenant ops surfaces.
  - **§2.5 framing**: dashboard tiles show observations
    ("3 findings open this morning") never accusations
    ("staff member X failed").
  - **§2.6 never throw the pan**: the Admin surface NEVER ranks
    individual employees by performance scores. Findings group
    by station / shift / outlet. Per-individual breakdown is
    pass_dev only and HR-flow gated.
  - **§3.1 append-only**: every Admin action emits an
    `audit_log` entry. Approvals do not delete the request — they
    flip its status; the original survives.
  - **D27 tenant isolation**: every read is `find({tenant_id:
    request.tenant_id, ...})`. The tenant boundary is enforced
    at the API layer, indexed in Mongo (D53.2), and proven by
    contract tests (D53.15).

## Data this module reads / writes

| Collection | Read | Write | Notes |
|---|---|---|---|
| `tenants` | yes | only by Aurion Holdings ops (pass_dev) | One row per property group |
| `outlets` | yes | yes | Tenant-scoped; managed by GM |
| `employees` | yes | yes | Invitation flow |
| `pending_approvals` | yes | yes | D18 inbox |
| `audit_log` | yes | yes (emit only) | Append-only chain |
| `service_audit_findings` | yes | yes (resolve only) | D36 framework output |
| `user_roles` | yes | yes | RBAC contract |

## Integration points (D17 fuse-box seams)

  - `services/clients.py:get_email_client()` — invitation emails
    (Resend / SendGrid / SES)
  - `services/clients.py:get_sms_client()` — invitation SMS
    (Twilio)

## Common operator questions

  · **"Why didn't I see the approval notification?"** — Check the
    notification fabric (D26) settings under Home → Notifications.
    Critical urgency always sends; lower urgencies respect your
    quiet-hours config.
  · **"How do I undo a user invite?"** — The invite is its own
    audit-logged event; revoking is a NEW action that flips the
    status to revoked. The original invite record persists for
    the audit trail.
  · **"Why can't I see another property's data?"** — D27 tenant
    isolation. Aurion Holdings ops staff can cross-property via
    `pass_dev` audience; GMs cannot.

## Known limitations

  - **Bulk user invite is not yet UI-exposed** — backend supports
    POST `/api/admin/users/bulk` but the UI shows one-at-a-time.
    Queued in D-followups.
  - **Cross-tenant analytics is operator-blind by default** —
    D43 multi-property benchmark anonymizes peer property names
    on operator surface. Aurion Holdings staff see real names
    only via pass_dev.

## Doctrine cross-references

  - ADR-0001 (Mongo as event store) — `audit_log` is the canonical
    event log for Admin actions
  - ADR-0004 (tenant isolation as first-class contract) — every
    Admin query is bounded by `tenant_id`
  - ADR-0005 (doctrine-as-contract) — the audience register
    headers are how doctrine becomes API behavior

## Changelog (this module)

  - 2026-05-07 · D63 · Initial module documentation written
  - Earlier · admin_console.py and admin_approval.py landed across
    multiple iters; consolidated under single Admin module surface
