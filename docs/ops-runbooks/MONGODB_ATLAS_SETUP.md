# MongoDB Atlas — Setup walkthrough

> Last updated: 2026-05-07 · D58
>
> You have an Atlas account + your C-Corp registered. This is the
> end-to-end walkthrough to get production + staging + dev clusters
> wired into Echo / LUCCCA.

---

## Step 1 · Create the Organization + Project

1. Sign in at https://cloud.mongodb.com
2. Top-left, click your account name → **Organization**
   - If you haven't already: create one named after your C-Corp
     (e.g., "Echo Aurion Inc")
3. Inside the org, click **Create Project**
   - Name: `echo-luccca-prod`
   - Note the Project ID (looks like `64f...`); you'll need it
     for the connection string secret

You'll later create two more projects:
   `echo-luccca-staging` and `echo-luccca-dev` (or use a single
   project with multiple clusters; the project boundary is mostly
   for billing + IP allowlist scope)

---

## Step 2 · Provision the Production Cluster

1. **Create a Database** → **Create**
2. Tier: **M10** (recommended for starter prod; $57/month)
   - Why M10: smallest tier with **continuous backups**,
     replica set (3 nodes), and dedicated CPU. M0/M5 don't
     give you Atlas backups.
3. Provider + Region:
   - Choose AWS (most mature tooling)
   - Region: pick the one closest to your Fly.io / hosting
     region. If you're on Fly.io with `iad` (US East), pick
     **AWS / N. Virginia (us-east-1)**.
4. Cluster Name: `echo-luccca-prod-c1`
5. **Additional Settings** → **Backup**:
   - Confirm "Continuous Cloud Backup" is ON (default at M10+)
   - This is your point-in-time restore. Default retention 2
     days; bump to 7 days if you want.
6. Click **Create**. Provisioning takes ~10 minutes.

Repeat for staging:
  Tier M2 ($9/month, no backups, fine for staging)
  Cluster Name: `echo-luccca-staging-c1`
  Same region

---

## Step 3 · Database User

1. Cluster overview → **Database Access** (left nav)
2. **Add New Database User**
3. Authentication Method: **Password**
4. Username: `echo-app`
5. Password: click **Autogenerate Secure Password** + **Copy**
   (save it to your secrets manager — Doppler / 1Password / Vault)
6. Built-in Role: **Atlas admin** (production-tight) — or, more
   conservatively, custom role with only `readWrite` on the
   `echo` database
7. Restrict access to specific clusters: **Specific Privileges**
   → only `echo-luccca-prod-c1`
8. **Add User**

Repeat for staging with username `echo-app-staging`.

---

## Step 4 · Network Access (allowlist)

1. Left nav → **Network Access**
2. **Add IP Address**
3. Two paths depending on your hosting:

   **Option A: Atlas Private Endpoint** (recommended for prod)
   - Click **Set up Private Endpoint** → AWS PrivateLink
   - Atlas creates a VPC endpoint; you accept it on your AWS
     side (if you have AWS), or use Atlas Peering for Fly.io
   - DB is unreachable from public internet — only from your
     private VPC

   **Option B: 0.0.0.0/0 with strong auth** (acceptable for staging)
   - Add **0.0.0.0/0** with comment "global access; auth handles
     security"
   - Atlas user creds + TLS suffice; this is the path most small
     deployments use until they have real VPC infrastructure

   For Fly.io specifically: Fly publishes their egress IPs at
   https://fly.io/docs/networking/. You can add those per-app
   (more secure than 0.0.0.0/0) — there are ~12 IPs to add.

---

## Step 5 · Get the Connection String

1. Cluster overview → **Connect**
2. Choose **Drivers**
3. Driver: **Python**, Version: **3.12 or later**
4. Copy the URI. It looks like:
   ```
   mongodb+srv://echo-app:<password>@echo-luccca-prod-c1.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=echo-luccca-prod
   ```
5. Replace `<password>` with the password you saved in Step 3

---

## Step 6 · Wire It Into the App

The connection string goes into a single secret. Choose ONE
backing store:

### If using Fly.io (matches existing fly.toml)

```bash
fly secrets set \
  MONGO_URI="mongodb+srv://echo-app:PWD@echo-luccca-prod-c1.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=echo-luccca-prod" \
  --app echo-luccca-prod
```

### If using Doppler (recommended cross-host)

```bash
doppler login
doppler setup    # pick echo-luccca project, prod config
doppler secrets set MONGO_URI="mongodb+srv://echo-app:PWD@echo-luccca-prod-c1.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=echo-luccca-prod"
```

Then your app starts with `doppler run -- python server.py` and
secrets resolve at runtime; never commit them.

### If using AWS Secrets Manager

```bash
aws secretsmanager create-secret \
  --name echo-luccca-prod/mongo-uri \
  --secret-string "mongodb+srv://..."
```

App reads via `boto3.client('secretsmanager').get_secret_value()`.

---

## Step 7 · Confirm the App Sees Atlas

After deploying with the new secret:

```bash
# /readyz should return 200 with mongo: ok=true
curl https://api.echo-luccca.com/readyz | jq

# Output:
# {
#   "status": "ok",
#   "checks": {
#     "process": { "ok": true, "uptime_seconds": 12.3 },
#     "mongo": { "ok": true },
#     "startup": { "ok": true, "reason": "ready" }
#   }
# }
```

If `mongo: ok=false`, check the boot log:
- Auth error: password is wrong OR special chars not URL-encoded
- Network error: IP not allowlisted; add app's egress to Step 4
- DNS error: SRV record needs ~60s to propagate after cluster
  creation; wait + retry

---

## Step 8 · Index ensure (D53.2 wiring)

Once the app boots, `db_indexes.ensure_indexes(db)` runs at
startup and creates ~60 indexes. Verify in the Atlas UI:

  Cluster → Collections → echo → echo_events → Indexes

You should see:
  · `_id_` (default)
  · `tenant_id_1_created_at_-1`
  · `tenant_id_1_kind_1_created_at_-1`
  · `parent_event_id_1` (sparse)

If you don't see them, the boot wasn't able to write — check the
db user's role (needs `dbAdmin` in addition to `readWrite` for
index creation).

---

## Step 9 · Backup Drill (do this BEFORE you need it)

Atlas backups are continuous; you can restore to any point in the
last 2-7 days. You should test the restore flow:

1. Cluster overview → **Backup** → **Snapshots**
2. Pick a snapshot from 1 hour ago → **Restore**
3. Restore Type: **Restore to a New Cluster**
4. New cluster name: `echo-luccca-restore-test`
5. Wait for restore (~10 min)
6. Connect to the test cluster, verify a known document exists
7. **Delete** the test cluster (it's billed while it lives)

This drill should be on your calendar quarterly. Real restores
are tested before they're trusted.

---

## Step 10 · Atlas alerts → your pager

1. **Alerts** (left nav) → **Add Alert**
2. Recommended starter alert set:
   - **Replication lag > 60 sec** (SEV-1)
   - **Connections > 80% of max** (SEV-2)
   - **Disk space > 80%** (SEV-2)
   - **Query targeting (slow queries) > 100/sec** (SEV-3)
3. Notification: webhook to PagerDuty / OpsGenie integration key
   (you provision in Step 7 of the production-readiness gate)

---

## Cost expectations

| Tier | Monthly | Best for |
|---|---|---|
| M0 (free) | $0 | Local dev only; no backups, shared CPU |
| M2 / M5 | $9–$25 | Staging |
| **M10** | **$57** | **Starter prod** — 1.7GB RAM, continuous backups, 3-node replica set |
| M20 | $116 | Mid-volume prod (10+ outlets) |
| M30 | $232 | High-volume prod |

For your stage, **M10 prod + M2 staging = $66/month** is the right
budget. Upgrade when you hit 80% RAM or 1k req/sec sustained.

---

## What's wired vs. what's manual

| Step | Who does it |
|---|---|
| Provision clusters (steps 1-2) | **You** in Atlas UI |
| Create db user + IP allowlist (3-4) | **You** in Atlas UI |
| Get URI (5) | **You** copy from UI |
| Set MONGO_URI secret (6) | **You** in Doppler / Fly / AWS |
| App reads URI on boot | **Already wired** in `database.py` |
| Index creation | **Already wired** via D53.2 `db_indexes.py` |
| Health checks reflect status | **Already wired** via D53.3 `routes/health.py` |
| Backup retention 7 days | **You** in Atlas UI per cluster |
| Restore drill | **You** quarterly |
| Atlas alerts → pager | **You** after PagerDuty signup |

---

## Doctrine alignment

  · §3.1 append-only: Atlas backups + the in-app event log are
    redundant safety nets. Backups can restore a deleted row;
    the event log proves what happened around the deletion.
  · D27 tenant isolation: indexes lead with tenant_id so even
    if a query forgets the filter, the planner short-circuits
    on tenants that have no data.
  · ADR-0001: Atlas is the production deployment of the
    "MongoDB as event store" decision; replica set requirement
    is satisfied at M10+ which enables D53.8 transactions.
