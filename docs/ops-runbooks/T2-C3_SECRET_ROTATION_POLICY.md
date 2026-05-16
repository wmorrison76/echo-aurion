# Secret Rotation Policy

> Operational policy for rotating credentials, API keys, and
> signing secrets. Owned by ops; reviewed quarterly. Failure to
> follow this policy is a SOC 2 finding.

---

## Why this matters

Secrets that never rotate become indefinite-window risk. Every
month a secret remains valid is a month an old breach could
still be active. Industry standard:

  · **Rotate every 90 days** for high-sensitivity secrets
  · **Rotate immediately** when an employee leaves
  · **Rotate within 24 hours** of a suspected compromise
  · **Rotate within 7 days** of a key leak (e.g., committed to
    a public repo, posted in a public channel)

---

## Inventory of secrets to manage

The following table is the single source of truth. Update as
new secrets are introduced.

| Secret | Sensitivity | Rotation cadence | Owner | Storage |
|---|---|---|---|---|
| `ANTHROPIC_API_KEY` | High | 90 days | Ops | AWS Secrets Manager / Doppler |
| `MONGO_URL` (production password) | Critical | 90 days | Ops | AWS Secrets Manager / Doppler |
| `MONGO_URL` (staging password) | High | 180 days | Ops | AWS Secrets Manager |
| AWS root credentials | Critical | 90 days; never share | Ops | Hardware MFA + Secrets Manager |
| AWS IAM access keys (per service) | High | 90 days | Ops | AWS Secrets Manager |
| Stripe API keys (live) | Critical | 90 days | Ops | AWS Secrets Manager |
| Stripe API keys (test) | Medium | 180 days | Ops | AWS Secrets Manager |
| Plaid API keys | High | 90 days | Ops | AWS Secrets Manager |
| Cloudflare API token | High | 90 days | Ops | AWS Secrets Manager |
| GitHub deploy keys / personal access tokens | High | 90 days | Ops | AWS Secrets Manager |
| Session signing secret (JWT / cookies) | Critical | 180 days; rolling | Ops | AWS Secrets Manager |
| Doctrine signing key | Critical | 365 days; rolling | Founder + Ops | AWS Secrets Manager + offline backup |
| Webhook signing secrets (per outbound integration) | High | 90 days | Ops | AWS Secrets Manager |
| POS webhook shared secrets (Toast / Aloha / etc.) | High | 90 days | Ops + property IT | AWS Secrets Manager |
| PMS API keys (Opera Cloud / Mews / Cloudbeds) | High | 90 days | Ops + property IT | AWS Secrets Manager |
| Payroll API keys (ADP / Gusto / Paychex / Rippling) | High | 90 days | Ops + property HR | AWS Secrets Manager |
| Google Workspace admin passwords | Critical | 90 days; MFA required | Founder | Personal password manager + MFA |
| Vanta / Drata API token | Medium | 180 days | Ops | AWS Secrets Manager |
| StatusPage admin password | Medium | 180 days | Ops | Personal password manager |
| 1Password / Bitwarden master password | Critical | Never on rotation; on suspected compromise | Each user | Memory + recovery phrase |

---

## Rotation procedure (general pattern)

For any non-trivial secret:

### Step 1 — Plan
  · Identify every dependency that uses the secret (services,
    cron jobs, integrations)
  · Schedule a low-traffic window
  · Notify the team in `#ops` channel

### Step 2 — Generate new secret
  · Create new credential in the upstream system (Anthropic
    console, AWS IAM, Stripe dashboard, etc.)
  · Verify new credential works against a test request

### Step 3 — Roll the secret
  · Update the value in AWS Secrets Manager / Doppler
  · For services that read secrets at startup: rolling restart of
    pods so each picks up new value
  · For services that read on-demand: most pick up automatically
    on next request after refresh interval

### Step 4 — Verify
  · Hit a test endpoint that uses the secret to confirm it works
  · Hit `/api/health` to confirm overall green
  · Monitor error rates for 30 minutes

### Step 5 — Revoke old secret
  · After 24 hours of stability, revoke the old credential
  · For Stripe, Plaid, etc. with multi-key support: deactivate
    the old; for single-key APIs: delete after confirming new is
    in production

### Step 6 — Record
  · Log to `secret_rotation_log` (a private ops record)
  · Format:
    ```
    secret_name: ANTHROPIC_API_KEY
    rotation_id: rot-abc123
    rotated_at: 2026-05-09T22:00:00Z
    rotated_by: founder@aurionholdings.com
    reason: scheduled_90_day
    old_secret_revoked_at: 2026-05-10T22:00:00Z
    verified_against: /api/echoai3/health
    ```

---

## Emergency rotation procedure (breach response)

When a secret is suspected compromised:

  1. **Within 1 hour**: Rotate the affected secret following the
     standard procedure but compressed
  2. **Within 1 hour**: If the secret had write access (Stripe,
     Plaid, MongoDB), audit recent activity for unauthorized use
  3. **Within 4 hours**: Notify the IC of the incident; consider
     SEV-1 if customer data could have been accessed
  4. **Within 24 hours**: Revoke the old secret entirely (no
     grace period for compromised secrets)
  5. **Within 5 business days**: Post-incident review per the
     incident response runbook

Common compromise scenarios:
  · Secret accidentally committed to a public repo (scan via
    Gitleaks; the workflow already includes this)
  · Secret pasted in Slack / Notion / Google Docs accessible
    to non-employees
  · Secret in a screenshot shared externally
  · Employee leaves and credential not yet rotated (do this
    BEFORE they leave)

---

## Departing employee secret-rotation checklist

When an employee resigns or is terminated:

### Within 1 hour of departure (or earlier if termination)

  · [ ] Revoke SSO access (Google Workspace / Okta)
  · [ ] Disable GitHub access (remove from organization)
  · [ ] Disable AWS console + IAM access
  · [ ] Disable MongoDB Atlas access
  · [ ] Disable Vanta / Drata / Pulley / Carta access
  · [ ] Disable Stripe / Plaid dashboard access
  · [ ] Disable Slack workspace access
  · [ ] Disable VPN access (if applicable)
  · [ ] Disable email (deactivate via Google Workspace admin)

### Within 4 hours

  · [ ] Rotate any shared secrets they had access to:
    - Anthropic API key
    - Production database password
    - Cloudflare token
    - StatusPage admin
  · [ ] Audit `admin_audit_log` for their last 30 days of activity
  · [ ] Audit GitHub for any unmerged branches or PRs to clean up
  · [ ] Hand laptop to IT for wipe + redeploy

### Within 24 hours

  · [ ] Re-issue any per-employee API tokens / service account
    keys
  · [ ] Update emergency contact and on-call rotation
  · [ ] Update Privacy Tenet 5 endpoint inventory if they had
    DSAR-handler responsibilities
  · [ ] Notify customers if the employee was a named contact on
    contracts

### Within 7 days

  · [ ] Final exit checklist completion review
  · [ ] Post-departure security review with remaining team

---

## Tooling

  · **AWS Secrets Manager** ($0.40/secret/month) — primary
    secret store for production
  · **Doppler** ($7/user/month) — alternative; better DX for
    local dev environments
  · **HashiCorp Vault** — open source; more setup but no per-
    secret cost
  · **1Password / Bitwarden** — for human-grade secrets (passwords,
    not API keys); shared vaults for ops team
  · **Gitleaks** — scans every commit for accidentally-leaked
    secrets (already wired in `.github/workflows/echo-ci.yml`)
  · **GitHub Secret Scanning** — free; alerts on detected secrets

---

## Verification + audit

Quarterly, ops reviews:

  · Every secret in the inventory above
  · Last rotation date for each
  · Any secret > 1.5x its rotation cadence is flagged for
    immediate rotation
  · Audit any unrotated secret older than 365 days regardless
    of cadence

The review is documented in `secret_rotation_audit_log` (a private
ops collection) for SOC 2 evidence.

---

## Initial state to-do

Right now (pre-launch), the secret inventory is sparse but rotation
is also less critical because there's only one human contributor.
The following are the **immediate priorities** before adding any
employee or contractor:

  - [ ] Set up AWS Secrets Manager / Doppler / Vault
  - [ ] Migrate every secret currently in `.env` files to the
        secrets store
  - [ ] Confirm `.env` is in `.gitignore` (it should be)
  - [ ] Run Gitleaks against the full git history to find any
        committed secrets that need rotating now
  - [ ] Document the current state of every secret in the
        inventory above with last-rotated date
  - [ ] Set calendar reminders for the next rotation per secret

When you bring on the first hire, this policy becomes operational
immediately. Until then, you (the founder) are the rotation owner
for every secret.
