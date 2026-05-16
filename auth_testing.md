# Auth Testing Playbook (Emergent Managed Google OAuth)

## How it works
1. User clicks "Sign in with Google" → redirected to `https://auth.emergentagent.com/?redirect={origin}/auth/callback`
2. Emergent handles Google OAuth → returns user to `{redirect}#session_id={session_id}`
3. Frontend `AuthCallback` reads session_id from hash synchronously (NOT in useEffect)
4. Backend `POST /api/auth/session {session_id}` exchanges session_id against Emergent's `/auth/v1/env/oauth/session-data` endpoint, persists user + session, sets httpOnly cookie
5. Subsequent calls to `/api/auth/me` return the user + matched employee record

## Collections
- `auth_users`: {user_id, email, name, picture, created_at, updated_at}
- `auth_sessions`: {session_token, user_id, expires_at, created_at}

## Test the full flow manually (browser)
1. Open `https://cfo-toolkit-deploy.preview.emergentagent.com/` → top-right "Sign in" pill visible
2. Click → redirected to auth.emergentagent.com → sign in with any Google account
3. After Google flow, lands back on `/auth/callback#session_id=...`
4. Frontend silently exchanges → cookie set → redirects to `/` with you logged in
5. Pill now shows your name + avatar; click to see sign-out
6. Open MySchedule panel — employee auto-resolved if your Google email matches an employees record

## Test backend directly (skipping Google)
```bash
# Create a test session token directly in MongoDB
mongosh echoai3_enterprise --eval "
var uid = 'user_' + new Date().getTime();
var tok = 'test_session_' + new Date().getTime();
db.auth_users.insertOne({ user_id: uid, email: 'test@example.com', name: 'Test User',
  picture: 'https://via.placeholder.com/96', created_at: new Date(), updated_at: new Date() });
db.auth_sessions.insertOne({ session_token: tok, user_id: uid,
  expires_at: new Date(Date.now() + 7*86400*1000), created_at: new Date() });
print('TOKEN=' + tok);
"

# Verify /api/auth/me with Authorization header
API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
curl -s "$API_URL/api/auth/me" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

## Employee auto-resolve
When `/api/auth/me` returns, it includes `employee_match` which is either:
- `null` — no employees record matches the user's email
- `{id, display_name, department, role, job_profile_code, job_profile_title}` — matched

The MySchedule panel reads `employee_match.id` to skip the "pick employee" dropdown.

## Data test IDs
- `auth-sign-in-btn` — top-right login pill (unauthenticated)
- `auth-user-pill` — top-right avatar pill (authenticated)
- `auth-sign-out-btn` — inside the user popover
- `my-schedule-auth-banner` — MySchedule auto-resolved banner

## Seeded employee email for a quick test match
- `marcus.h@pier-sixty-six.com` — uncomment when you want Google email "marcus.h@..." to auto-resolve
