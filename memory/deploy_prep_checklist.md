# Deploy Prep Checklist — Echo AURION + MyEcho

For William. Run through this **before clicking deploy** on Emergent (or Vercel/Railway/Fly).

## ✅ Already in place (you don't need to do anything)
- PWA manifests: `/manifest.json` (Echo AURION) + `/manifest-staff.json` (MyEcho · Staff)
- Two distinct app icons (Echo AURION · MyEcho · Staff) in 9 sizes each
- Service-worker installed → fixes auto-propagate to all installed phones in <30s
- Install Hub at `/install` (public, no login) with QR codes
- All routes use REACT_APP_BACKEND_URL (no hardcoded localhost)
- All MongoDB writes through `db[collection]` (no test/staging hardcodes)
- MyEcho dynamically swaps manifest link → installs the right home-screen icon
- Authentication: same `username/login` for desktop + both mobile apps (role determines view)

## ⚠️ Blockers — must resolve BEFORE production deploy
1. **AWS S3 keys** (still pending — see `/app/memory/aws_twilio_setup_guide.md`)
   - VIP photos / Echo Radio audio / huddle videos are still data-URL fallback
   - For production: 100% must flip to S3 or MongoDB will balloon
2. **Twilio FROM phone number** (still pending — buy a $1.15/mo number)
   - SMS push is queued but not flushed
3. **Domain & SSL**
   - Decide: `app.luccca.com` for AURION, `staff.luccca.com` for MyEcho? Or single `app.luccca.com` with /m/me path? (Same cert if path-based.)
4. **Real auth** (currently devAuth=1 query param bypasses login in dev)
   - Production must require login on /, /m/ecw, /m/me — Install Hub `/install` stays public
5. **HR Config policy** (Manager Workflow → HR Config tab)
   - Default is phone-only call-outs. **You must explicitly toggle on `allow_mobile_callout` if you want MyEcho call-outs accepted** — otherwise staff get the "phone required" card.
   - Set the real `manager_on_duty_phone` so the tap-to-call button dials the right line.

## 🔍 Pre-deploy smoke checks (5 min)
Run these from your laptop after deploy lands:
```bash
APP=https://app.luccca.com   # or whatever your prod URL becomes

# 1. Both manifests respond
curl -s -o /dev/null -w "manifest.json: %{http_code}\n" $APP/manifest.json
curl -s -o /dev/null -w "manifest-staff.json: %{http_code}\n" $APP/manifest-staff.json

# 2. Both logos respond (192px is the iOS install icon)
curl -s -o /dev/null -w "AURION icon: %{http_code}\n" $APP/icons/echo-aurion-mgr-192.png
curl -s -o /dev/null -w "MyEcho icon: %{http_code}\n" $APP/icons/myecho-staff-192.png

# 3. Install Hub renders
curl -s -o /dev/null -w "Install Hub: %{http_code}\n" $APP/install

# 4. MongoDB connection healthy (Reports Hub catalog should return 12 reports)
curl -s "$APP/api/reports-hub/catalog" | python3 -c "import sys,json;print('reports:', len(json.load(sys.stdin)['reports']))"

# 5. MyEcho endpoint reachable
curl -s "$APP/api/myecho/me" -H "X-User-Id: <real-user-id>" | head -c 200
```

## 📦 Deploy order (recommended)
1. **Day 1 (Wednesday-ish)** — Deploy desktop AURION + Reports Hub + Manager Workflow. GMs & Exec Chefs install the AURION app from `/install?role=mgr`. Train them on PTO approvals + MoD chat for ~30 min.
2. **Day 2-3** — GMs use the desktop daily, file any UX feedback.
3. **Day 4 (Friday or Monday)** — Roll MyEcho to a small pilot group of hourly staff (5-10 people). Print `/install?role=staff` QR posters in BOH break room. Collect 1 day of feedback.
4. **Day 7+** — Roll to all hourly staff. Send the QR + step-by-step via email + post in break rooms.
5. **Week 2** — Wire AWS S3 + Twilio FROM (assuming keys arrived) → flip from demo to live for photos / SMS push / huddle videos.

## 🚨 Things that will break in production but work in dev
- **`devAuth=1` query param** — kill this in production; force login flow
- **POS rings demo data** — `seed-demo` endpoint should be admin-only (or removed entirely)
- **In-app `prompt()` dialogs** in Manager Workflow approve/deny — replace with proper inline forms (works fine but feels rough on iPad)
- **Manager phone fallback `+15555550199`** — replace with real MoD line via HR Config

## 📊 Day-1 metrics to watch
- `myecho_notifications` count growing → staff are using app
- `pto_requests` with `status: pending` not >24hr old → managers approving timely
- `chat_messages` per outlet per day → MoD chat is engaging
- `pos_rings` count growing → POS feed actually live
- Service-worker cache age in browser dev tools → PWA installs working

## 🔧 Easy wins if something feels off after deploy
- Service-worker stale cache: Add a `?v=N` cache-buster to `<link rel="manifest">` to force refresh
- iOS not installing: Ensure URL is HTTPS + valid cert (PWA install fails on HTTP)
- Android install banner not appearing: Manifest must have at least one 144x144+ icon AND `start_url` must match the current path
