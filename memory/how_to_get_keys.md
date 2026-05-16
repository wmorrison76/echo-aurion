# Where to get each integration key

Quick links + step-by-step for each remaining production key. Drop each one into `/app/backend/.env` and run `sudo supervisorctl restart backend` — the rest is already wired.

---

## 🔐 Azure AD (Outlook 2-way sync)

1. Go to <https://portal.azure.com/>
2. Sign in with your work/organisation account (or create one).
3. In the search bar type **"Azure Active Directory"** → open it.
4. Left rail → **App registrations** → **+ New registration**.
   - **Name:** `EchoAi3-Calendar-Sync`
   - **Supported account types:** *Accounts in this organizational directory only (single tenant)* — unless you want to sync multiple properties, then pick multi-tenant.
   - **Redirect URI:** choose **Web** and enter:
     `https://cfo-toolkit-deploy.preview.emergentagent.com/api/outlook/callback`
   - Click **Register**.
5. On the app overview page, copy:
   - **Application (client) ID** → this is your `AZURE_CLIENT_ID`
   - **Directory (tenant) ID** → this is your `AZURE_TENANT_ID`
6. Left rail → **Certificates & secrets** → **+ New client secret**.
   - Description: `EchoAi3 sync`
   - Expires: 24 months (or your preferred lifetime)
   - Click **Add** → **copy the `Value` IMMEDIATELY** (Azure hides it after refresh).
   - This is your `AZURE_CLIENT_SECRET`.
7. Left rail → **API permissions** → **+ Add a permission** → **Microsoft Graph** → **Delegated permissions**:
   - `Calendars.ReadWrite`
   - `offline_access`
   - `User.Read`
   - Click **Add permissions**.
   - (Optional) Click **Grant admin consent** if you're the admin — otherwise each user grants on first login.

Drop into `/app/backend/.env`:
```
AZURE_CLIENT_ID=<from step 5>
AZURE_CLIENT_SECRET=<from step 6>
AZURE_TENANT_ID=<from step 5>
```

---

## 📧 Resend (email push for daily briefing + system emails)

1. Go to <https://resend.com/signup>
2. Sign up (free tier allows 100 emails/day · 3,000/month).
3. Dashboard → **API Keys** → **+ Create API Key** → name it `EchoAi3 prod` → copy the key (starts with `re_`).
4. For testing you can use the default `onboarding@resend.dev` as the sender. For production:
   - Dashboard → **Domains** → **+ Add Domain** → enter your domain (e.g. `luccca.com`).
   - Resend shows 3 DNS records (DKIM + SPF + DMARC) — add them at your DNS host.
   - Once verified (usually < 15 min), use `briefing@luccca.com` (or whatever you like).

Drop into `/app/backend/.env`:
```
RESEND_API_KEY=re_xxx
SENDER_EMAIL=onboarding@resend.dev   # or your verified domain sender
```

---

## 📱 Twilio (SMS fallback when staff has no email)

1. Go to <https://www.twilio.com/try-twilio>
2. Sign up — free trial gives **$15 credit** (≈ 1,900 SMS).
3. Verify your personal mobile number.
4. Dashboard → **Account Info** at the top — copy:
   - **Account SID** (starts with `AC...`) → `TWILIO_ACCOUNT_SID`
   - **Auth Token** (click "Show") → `TWILIO_AUTH_TOKEN`
5. Left rail → **Phone Numbers** → **Buy a number** (US local numbers ~$1/month).
   - Ensure **SMS** capability is checked.
   - Copy the number in E.164 format (e.g. `+18885551234`).

Drop into `/app/backend/.env`:
```
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+18885551234
```

> **Trial limitation:** Twilio trial numbers can only SMS verified numbers. Upgrade to a paid account ($20 minimum) to SMS any number.

---

## 👁 Sentry (error observability)

1. Go to <https://sentry.io/signup/> (free developer tier: 5K events/month).
2. Create an organisation (e.g. "Luccca Resort").
3. Create a project → platform **Python** → framework **FastAPI**.
4. The setup wizard shows a `SENTRY_DSN=https://...@o.ingest.sentry.io/...` — copy it.
5. (Optional) Create a second project for the React frontend if you want client-side tracking too.

Drop into `/app/backend/.env`:
```
SENTRY_DSN=https://xxx@o1234.ingest.sentry.io/5678
```

---

## After adding any key

```bash
sudo supervisorctl restart backend
```

Then for the briefing queue, log into the Daily Briefing admin panel and click **"Flush queued push"** — it'll replay every queued message so no staff missed a notification during the blackout window.
