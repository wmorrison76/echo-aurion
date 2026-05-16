# Test Credentials

## LUCCCA platform — production seed accounts

| email | name | role | password |
|------|------|------|----------|
| `admin@luccca.com` | Admin | AURION (super-admin) | `LuccaaAdmin2026!` |
| `owner@echoaurion.com` | William J. Morrison | OWNER · Pier Sixty-Six | `Welcome2026!` |
| `cfo@luccca.com` | Aurora Vega | CFO | `Welcome2026!` |
| `concierge@luccca.com` | Marcus Lin | CONCIERGE | `Welcome2026!` |
| `partmedia@luccca.com` | Aurelia Voss | AURION | `Welcome2026!` |

## iter266 · Renamed / repointed seed accounts

| email | name | role | password |
|------|------|------|----------|
| `gio@echoaurion.com` | Giovanni Genao | EXEC CHEF · Banquets & Catering | `Welcome2026!` |
| `pastrychef@echoaurion.com` | Carissa DeSilva | EXEC PASTRY CHEF | `Welcome2026!` |

## iter266 part 3 · Operational seats (added to auth_users for login)

| email | name | role | password | outlet_ids |
|------|------|------|----------|------------|
| `smitchell@luccca.com` | Sarah Mitchell | gm | `Welcome2026!` | `["all"]` |
| `msantos@luccca.com` | Maria Santos | exec_chef | `Welcome2026!` | `out-main-kitchen, out-pier66-rest` |
| `mlaurent@luccca.com` | Chef Marie Laurent | pastry_chef | `Welcome2026!` | `out-pastry-shop, out-banquet-hall` |
| `jmorrison@luccca.com` | Jake Morrison | bar_manager | `Welcome2026!` | `out-rooftop-bar, out-pool-bar` |
| `mmayor@luccca.com` | Michelle Mayor | events_director | `Welcome2026!` | `out-banquet-hall, out-pier66-rest` |
| `dchen@luccca.com` | David Chen | controller | `Welcome2026!` | `["all"]` |

> **Auth note**: email stored lowercase. Mixed-case input is normalized.
> Legacy aliases removed: `jwellington@luccca.com`, `execchefbqts@luccca.com`,
> `pastrychef@luccca.com` (replaced by the new `EchoAurion.com` addresses above).

## MyEcho · PIN re-auth (iter 5.3)

Sensitive panels (Paystubs, tax docs) gate behind a 4–6 digit PIN.
Each user sets their own PIN on first access. Default test PINs:

| user_id | pin |
|---------|-----|
| `admin` (test session) | `1234` (set during iter 5.3 smoke test) |
| `test-user-1` (curl smoke) | `1234` |

**Backend collection:** `user_pins` (bcrypt-hashed). **Endpoints:** `/api/myecho/pin/{setup,verify,change,status}`. Lockout: 5 failed attempts → 15-min cooldown. Token TTL: 15 minutes (in-memory).
