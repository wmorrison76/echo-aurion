# Integration Command Center — Enterprise deployment

Production-ready setup for the Integration Command Center: DB persistence, JWT auth, desktop agent (Mac/Windows), and audit.

## 1. Database

- Run migrations so the following tables exist:
  - `integration_connections` (per-org connected systems)
  - `integration_config` (outlets, GL mappings, invoice rules)
  - `desktop_agents` (registered Mac/Windows agents)
  - `integration_audit_log` (connect/disconnect/save actions)

From the project root (e.g. `LUCCCA_Framework`):

```bash
pnpm run db:migrate
# or: NODE_ENV=development pnpm run db:migrate:dev
```

Ensure `DATABASE_URL` is set in `.env` (see `.env.example`).

## 2. Authentication

All Integration Command Center API routes require a valid JWT (same as the rest of the app). The frontend sends cookies/credentials with every request (`credentials: "include"`). Ensure users are logged in when using the panel.

## 3. Desktop agent (Mac / Windows)

- **Download URLs**: Set in `.env`:
  - `DESKTOP_AGENT_URL_MAC` — URL to the macOS installer (e.g. `.dmg` or `.pkg`).
  - `DESKTOP_AGENT_URL_WINDOWS` — URL to the Windows installer (e.g. `.exe` or `.msi`).

  The Desktop tab uses these to show “Download Desktop Agent (macOS)” and “Download Desktop Agent (Windows)”. If unset, the UI shows “Coming soon”.

- **Registration**: When your desktop agent runs, it should call:
  - `POST /api/integration-command-center/desktop/register`
  - Body: `{ "deviceId": "<unique-id>", "os": "mac" | "windows", "version": "1.0.0" }`
  - With the same auth (e.g. Bearer token or cookie) so the server can associate the device with the org/user.

- **Listing agents**: Admins can call `GET /api/integration-command-center/desktop/agents` to see registered devices (optional to expose in the UI).

## 4. Connecting systems

- “Connect” in the Marketplace calls `POST /api/integration-command-center/connections` with `{ systemId }`. The backend stores the connection per org in the DB (or in-memory fallback if DB is unavailable).
- Optional body `{ systemId, credentials }`: if `credentials` (string or object) is sent and `INTEGRATION_ENCRYPTION_KEY` is set, the server encrypts and stores it. For real vendor integrations, add a connection modal that sends API key or OAuth tokens as `credentials`. Decrypt in backend via `server/lib/integration-credentials.ts` (`decryptCredentials`).

## 5. Audit

- Connect, disconnect, and save config are logged in `integration_audit_log` (org_id, user_id, action, system_id, details). Use this for compliance and debugging.

## 6. Optional env

- `INTEGRATION_ENCRYPTION_KEY`: 32-byte hex (64 chars). Used by `server/lib/integration-credentials.ts` to encrypt/decrypt stored credentials. Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## 7. Server deployment and connection steps

**Full step-by-step for upload and making connections on the server:** see `docs/SERVER_DEPLOYMENT_AND_CONNECTIONS.md`. It covers upload, env vars, migrations, exactly how each connection is made (user flow and API), desktop agent registration, and the post-upload checklist.
