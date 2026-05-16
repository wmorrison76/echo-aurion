# AWS S3 + Twilio Phone Number Setup — Step by Step (iter246)

For William. Print this and follow top-to-bottom on a quiet afternoon — both setups together take ~45-60 min.

---

## PART 1 · AWS account + S3 bucket (≈25 min)

We're using S3 for: photo uploads (VIP photos, Cake Viewer renders, food gallery), audio (Echo Radio voice memos), pre-shift huddle videos, and the future invoice/receipt OCR pipeline.

### Step 1 — Create the AWS account
1. Open **https://signup.aws.amazon.com/**
2. Email: use a NEW email you control (e.g. `aws@luccca.com` — NOT a personal Gmail). This becomes the **root account** which you should never log in with day-to-day.
3. Account name: `Luccca Resort` (or your business name — gets shown in the console title bar)
4. Click **Continue**.
5. Contact information page → **Business** account type. Fill in:
   - Full name (yours)
   - Phone (cell) — they will text a verification code
   - Country = United States
   - Address (your business address — used for tax / billing)
   - Company name = `Luccca Resort` (or LLC name if registered)
6. Payment information → drop in a credit card. AWS authorizes $1 then refunds. **Free Tier covers your first 12 months** for the storage volume we'll use (5GB / 20k uploads / 2k downloads per month).
7. Identity verification → AWS robocalls or texts you a 4-digit PIN. Type it on the page.
8. Support plan → **Basic (Free)**. We don't need paid support.
9. Click **Sign in to console** when done.

### Step 2 — Lock down the root account (5 min — security 101)
1. Top-right → click your name → **Security credentials**.
2. Section "Multi-factor authentication (MFA)" → **Assign MFA device**.
3. Use **Authenticator app** (Google Authenticator / Authy on your phone). Scan the QR code, type the 6-digit code twice.
4. Now log out — never use the root account again unless billing emergency.

### Step 3 — Create an IAM user for the app (10 min)
This is the user whose keys we'll paste into `/app/backend/.env`.

1. Top search bar → type **IAM** → click the IAM service.
2. Left rail → **Users** → **Create user**.
3. User name: `echoaurion-app-user` → **Next**.
4. Permissions → **Attach policies directly** → search for and tick **AmazonS3FullAccess** (we'll narrow this later if needed).
5. **Next** → **Create user**.
6. Click into the new user → **Security credentials** tab → **Access keys** → **Create access key**.
7. Use case → **Application running outside AWS** → tick the confirmation → **Next** → **Create access key**.
8. **CRITICAL** — this is the only time you can copy the **Secret access key**:
   - Access key ID: starts with `AKIA…` → copy
   - Secret access key: 40 random characters → copy
   - Click **Download .csv file** as backup
9. Hand me both values (paste into chat). I'll add them to `/app/backend/.env`.

### Step 4 — Create the S3 bucket (5 min)
1. Top search bar → type **S3** → click S3 service.
2. **Create bucket**.
3. Bucket name: `luccca-echoaurion-prod` (must be globally unique, lowercase, no underscores). If taken, append `-yourinitials` like `-wjr`.
4. Region: **us-east-1** (N. Virginia) — closest to most resort traffic, lowest latency.
5. **Block all public access** → keep **CHECKED** (default). We'll serve images via signed URLs, never public.
6. **Bucket Versioning** → **Enable** (lets us roll back if a chef accidentally overwrites a render).
7. Server-side encryption → keep default (SSE-S3).
8. **Create bucket**.
9. Tell me the exact bucket name when done.

### Step 5 — Hand me your values
After steps 3 + 4, paste the following into chat:
```
AWS_ACCESS_KEY_ID=AKIA…
AWS_SECRET_ACCESS_KEY=…(40 chars)
S3_BUCKET_NAME=luccca-echoaurion-prod
S3_REGION=us-east-1
```

I'll wire it into `/app/backend/.env`, swap the photo upload code from data-URL fallback → real S3 PUT, and migrate any current data URLs already stored in MongoDB.

### What this unlocks
| Feature | Before | After S3 |
|---------|--------|----------|
| VIP photos | Stored as base64 in MongoDB (slow, bloats DB) | Uploaded to S3, only the URL stored |
| Cake renders | Held in `cake_renders` collection (~1MB per row) | S3 + signed-URL preview |
| Echo Radio voice | Transcript only | Real audio playback in feed |
| Pre-shift huddle videos | Backend ready, no storage | Real 30-sec video in standup |
| Food Gallery | Same as VIP | S3 with thumbnail variants |

### Cost expectation
At your volume (≈ 100 photos/day, 50 voice memos/day, 5 videos/day):
- **Year 1: $0** (covered by Free Tier).
- **Year 2+: ~$3-7/month** for storage + bandwidth.

---

## PART 2 · Twilio phone number for SMS (≈15 min)

You already gave me the **Account SID** and **Auth Token** — they're live in `/app/backend/.env`. The only blocker now is the **FROM phone number** (a Twilio-purchased number that staff SMS will be sent FROM).

### Why a paid number is needed
Twilio Trial accounts can ONLY send to **verified** phone numbers (you have to manually verify each recipient on the Twilio console — not feasible for staff fan-out).

**Cost**: A US local long-code number is **$1.15/month** + **$0.0079 per SMS sent**. So for ~30 staff × daily standup push = ~900 messages/month = **$8.26/month total**.

### Step-by-step
1. Open **https://console.twilio.com/**
2. Top-right → check the trial banner. If still on trial → **Upgrade** (top-right pill). Add billing card. Twilio doesn't auto-charge until you trigger usage.
3. Left rail → **# Phone Numbers** → **Manage** → **Buy a number**.
4. Filters:
   - Country: **United States**
   - Capabilities: tick **SMS** (MMS optional, Voice optional)
   - Number type: **Local** (cheapest, $1.15/mo)
   - Number pattern (optional): try matching your area code (e.g. `561` for Florida).
5. Click **Search** → pick any number → **Buy** → confirm.
6. The new number shows on **Phone Numbers → Manage → Active numbers**. Click it to confirm it's in **E.164 format** like `+15617790142`.
7. Paste the number to me in chat. I'll add it to `/app/backend/.env` as `TWILIO_FROM_NUMBER=+15617790142`.

### Once the number is in:
- All queued SMS messages auto-flush on next dispatch (currently 0 in queue, but the schedule editor + standup blast paths will start delivering).
- I'll run a smoke test: send myself "Echo AURION SMS test" via `/api/sms/send`.
- Echo Radio "page out" feature can become real — instead of just app-feed messages, voice transcripts can fan out as SMS to staff who don't have the app open yet.

### Optional follow-ups (not needed today)
- **Toll-free number** if you want a single 800-style brand number ($2/mo + ~$0.0085/SMS, faster throughput, no carrier filtering).
- **A2P 10DLC registration** — required for high-volume SMS (>3000/day) to avoid carrier blocks. Twilio walks you through it once you cross volume.
- **Verified Business Profile** in Twilio (so SMS shows your business name, not "+1561…"). Free, takes 1-2 days.

---

## TL;DR for William

When you're ready, send these 5 values back to me in chat:
```
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=
S3_REGION=us-east-1
TWILIO_FROM_NUMBER=+1...
```

I'll wire them in and re-test, then SMS + S3 photo storage are live. Total ongoing cost: **~$10-15/month** for the volume Echo AURION will push.
