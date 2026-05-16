"""iter250 · JWT auth — login/register/refresh/forgot/reset + protect helpers.

Production-ready:
  - bcrypt password hashing
  - 15-min access + 7-day refresh tokens (httpOnly cookies)
  - Brute-force protection (5 attempts → 15-min lockout)
  - Forgot/reset with secure token + 1-hr expiry (logged for now,
    swap to Resend/SendGrid when keys arrive)
  - get_current_user() FastAPI dependency
  - Dev mode: ?devAuth=1 query param OR X-Dev-Auth header bypasses login
"""
from __future__ import annotations
import os, secrets, bcrypt, jwt
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

from fastapi import APIRouter, Request, Response, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field

from database import db

router = APIRouter(prefix="/api/auth/jwt", tags=["auth-jwt"])

JWT_ALGO = "HS256"
ACCESS_MIN = 15
REFRESH_DAYS = 7
COOKIE_SECURE = os.environ.get("ENV", "dev") == "production"
DEV_BYPASS = os.environ.get("ENV", "dev") != "production"


# ── helpers ─────────────────────────────────────────────────────────────
def _hash(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def _verify(p: str, h: str) -> bool:
    try: return bcrypt.checkpw(p.encode(), h.encode())
    except Exception: return False


def _secret() -> str:
    # D17e · read from the fuse box. The Settings._validate() rule
    # rejects the dev default in production, so by the time this is
    # called we have a real value.
    from config import get_settings
    return get_settings().JWT_SECRET


def _make_access(uid: str, email: str, role: str) -> str:
    return jwt.encode({
        "sub": uid, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MIN),
        "type": "access",
    }, _secret(), algorithm=JWT_ALGO)


def _make_refresh(uid: str) -> str:
    return jwt.encode({
        "sub": uid,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS),
        "type": "refresh",
    }, _secret(), algorithm=JWT_ALGO)


def _set_cookies(resp: Response, access: str, refresh: str):
    resp.set_cookie("access_token", access, httponly=True, secure=COOKIE_SECURE,
                       samesite="lax", max_age=ACCESS_MIN * 60, path="/")
    resp.set_cookie("refresh_token", refresh, httponly=True, secure=COOKIE_SECURE,
                       samesite="lax", max_age=REFRESH_DAYS * 86400, path="/")


def _shape_user(u: Dict[str, Any]) -> Dict[str, Any]:
    # iter266.3 · Surface outlet_ids + module access from the admin_users
    # collection (Onboarding seed) so dashboards can auto-scope to the
    # outlets the admin has assigned this user.
    admin_record = db["admin_users"].find_one(
        {"email": (u.get("email") or "").lower()},
        {"_id": 0, "outlet_ids": 1, "modules": 1, "is_admin": 1},
    ) or {}
    return {
        "id": u.get("id") or u.get("user_id"),     # iter256 · normalize
        "email": u.get("email"), "name": u.get("name") or u.get("display_name"),
        "role": u.get("role", "staff"),
        "department": u.get("department"),
        "title": u.get("title"),
        "kind": u.get("kind", "salaried"),  # salaried | hourly
        "picture": u.get("picture") or u.get("avatar"),
        "outlet_ids": admin_record.get("outlet_ids") or [],
        "modules": admin_record.get("modules") or [],
        "is_admin": admin_record.get("is_admin", False),
    }


# ── Brute-force lockout ─────────────────────────────────────────────────
def _check_lockout(ident: str) -> Optional[int]:
    rec = db["login_attempts"].find_one({"_id": ident})
    if not rec: return None
    fails = rec.get("failures", 0)
    last = rec.get("last_failed_at")
    if fails < 5: return None
    if not last: return None
    try:
        last_dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
    except Exception: return None
    elapsed = (datetime.now(timezone.utc) - last_dt).total_seconds() / 60
    if elapsed < 15: return int(15 - elapsed)
    db["login_attempts"].delete_one({"_id": ident})
    return None


def _bump_fail(ident: str):
    db["login_attempts"].update_one({"_id": ident},
        {"$inc": {"failures": 1},
          "$set": {"last_failed_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True)


def _clear_fail(ident: str):
    db["login_attempts"].delete_one({"_id": ident})


# ── Models ──────────────────────────────────────────────────────────────
class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=2)
    role: Optional[str] = "staff"
    kind: Optional[str] = "hourly"


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class ForgotBody(BaseModel):
    email: EmailStr


class ResetBody(BaseModel):
    token: str
    password: str = Field(min_length=8)


# ── current user dependency ─────────────────────────────────────────────
async def get_current_user(request: Request) -> Dict[str, Any]:
    # Dev bypass — only in non-production
    if DEV_BYPASS and (request.query_params.get("devAuth") == "1"
                         or request.headers.get("x-dev-auth") == "1"
                         or request.cookies.get("echo_dev_auth") == "1"):
        # iter257 · Profile-switch persistence: prefer cookie, fall back to header.
        # Cookies survive page reloads and are immune to PWA service-worker
        # fetch caching.
        override_uid = (request.cookies.get("echo_dev_user")
                          or request.headers.get("x-dev-user-id"))
        if override_uid:
            u = db["auth_users"].find_one({"id": override_uid}, {"_id": 0}) \
                or db["auth_users"].find_one({"user_id": override_uid}, {"_id": 0})
            if u: return _shape_user(u)
        # Resolve to the configured dev user (fallback: first active employee)
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@luccca.com")
        u = db["auth_users"].find_one({"email": admin_email}, {"_id": 0})
        if u: return _shape_user(u)
        e = db["employees"].find_one({"active": True}, {"_id": 0})
        if e:
            return {"id": e.get("id"), "email": e.get("email", "dev@luccca.com"),
                      "name": e.get("display_name") or "Dev User",
                      "role": "admin", "kind": "salaried",
                      "department": e.get("department"), "title": e.get("title")}
        return {"id": "dev", "email": "dev@luccca.com", "name": "Dev",
                  "role": "admin", "kind": "salaried"}

    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "): token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError: raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError: raise HTTPException(401, "Invalid token")
    if payload.get("type") != "access":
        raise HTTPException(401, "Invalid token type")
    u = db["auth_users"].find_one({"id": payload.get("sub")}, {"_id": 0})
    if not u: raise HTTPException(401, "User not found")
    return _shape_user(u)


# ── Endpoints ───────────────────────────────────────────────────────────
@router.post("/register")
def register(body: RegisterBody, response: Response):
    email = body.email.lower()
    if db["auth_users"].find_one({"email": email}, {"_id": 0}):
        raise HTTPException(400, "Email already registered")
    uid = secrets.token_hex(8)
    user = {
        "id": uid, "email": email, "name": body.name,
        "role": body.role or "staff", "kind": body.kind or "hourly",
        "password_hash": _hash(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    db["auth_users"].insert_one(dict(user))
    access = _make_access(uid, email, user["role"])
    refresh = _make_refresh(uid)
    _set_cookies(response, access, refresh)
    return {"ok": True, "user": _shape_user(user),
              "access_token": access}  # also returned for non-cookie clients


@router.post("/login")
def login(body: LoginBody, request: Request, response: Response):
    email = body.email.lower()
    ip = request.client.host if request.client else "?"
    ident = f"{ip}:{email}"
    locked = _check_lockout(ident)
    if locked:
        raise HTTPException(429, f"Locked — try again in {locked} min")
    u = db["auth_users"].find_one({"email": email}, {"_id": 0})
    if not u or not _verify(body.password, u.get("password_hash", "")):
        _bump_fail(ident)
        raise HTTPException(401, "Invalid email or password")
    _clear_fail(ident)
    access = _make_access(u["id"], email, u.get("role", "staff"))
    refresh = _make_refresh(u["id"])
    _set_cookies(response, access, refresh)
    return {"ok": True, "user": _shape_user(u), "access_token": access}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@router.get("/me")
async def me(request: Request):
    user = await get_current_user(request)
    return {"ok": True, "user": user}


@router.post("/refresh")
def refresh(request: Request, response: Response):
    rt = request.cookies.get("refresh_token")
    if not rt: raise HTTPException(401, "No refresh token")
    try:
        payload = jwt.decode(rt, _secret(), algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError: raise HTTPException(401, "Refresh expired")
    except jwt.InvalidTokenError: raise HTTPException(401, "Invalid refresh")
    if payload.get("type") != "refresh":
        raise HTTPException(401, "Bad token type")
    u = db["auth_users"].find_one({"id": payload.get("sub")}, {"_id": 0})
    if not u: raise HTTPException(401, "User not found")
    access = _make_access(u["id"], u["email"], u.get("role", "staff"))
    response.set_cookie("access_token", access, httponly=True,
                              secure=COOKIE_SECURE, samesite="lax",
                              max_age=ACCESS_MIN * 60, path="/")
    return {"ok": True, "access_token": access}


@router.post("/forgot-password")
def forgot(body: ForgotBody):
    email = body.email.lower()
    u = db["auth_users"].find_one({"email": email}, {"_id": 0})
    if u:
        token = secrets.token_urlsafe(32)
        db["password_reset_tokens"].insert_one({
            "token": token, "user_id": u["id"], "email": email,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "used": False,
        })
        # MOCKED: no email provider yet — in prod, send via Resend/SendGrid
        print(f"\n=== PASSWORD RESET LINK ===\n{os.environ.get('FRONTEND_URL', '')}/reset-password?token={token}\n===========================\n")
    # Always return ok to prevent email enumeration
    return {"ok": True, "message": "If that email exists, a reset link was sent."}


@router.post("/reset-password")
def reset(body: ResetBody):
    rec = db["password_reset_tokens"].find_one({"token": body.token, "used": False}, {"_id": 0})
    if not rec: raise HTTPException(400, "Invalid or expired token")
    exp = rec.get("expires_at")
    if isinstance(exp, datetime):
        # Ensure timezone-aware comparison
        now_utc = datetime.now(timezone.utc)
        exp_aware = exp if exp.tzinfo else exp.replace(tzinfo=timezone.utc)
        if exp_aware < now_utc:
            raise HTTPException(400, "Token expired")
    db["auth_users"].update_one({"id": rec["user_id"]},
        {"$set": {"password_hash": _hash(body.password)}})
    db["password_reset_tokens"].update_one({"token": body.token},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}})
    return {"ok": True, "message": "Password updated. Please log in."}


# ── Admin + sample-staff seed (run on startup) ──────────────────────────
def seed_admin_and_staff():
    """Idempotent — runs every startup. Creates admin + 1 sample hourly staff +
    one of each role profile so William can test as Director / GM / Exec Chef etc."""
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@luccca.com").lower()
    admin_pw = os.environ.get("ADMIN_PASSWORD", "LuccaaAdmin2026!")
    DEFAULT_PW = "Welcome2026!"

    role_profiles = [
        # (email, name, role, kind, dept, title)
        (admin_email, "Admin", "admin", "salaried", None, "Administrator", admin_pw),
        # iter266 · Owner — William J. Morrison runs Pier Sixty-Six. Replaces
        # the placeholder "James Wellington III" seed.
        ("owner@EchoAurion.com", "William J. Morrison", "owner", "salaried",
            "Executive", "Owner · Pier Sixty-Six", DEFAULT_PW),
        ("regional@luccca.com", "Robert Sinclair", "regional-director", "salaried",
            "Executive", "Regional Director · Multi-Property", DEFAULT_PW),
        ("director@luccca.com", "William Reyes", "director", "salaried",
            "Executive", "Director · F&B and Retail", DEFAULT_PW),
        ("execfin@luccca.com", "Alexandra Marchetti", "exec-dir-finance", "salaried",
            "Finance", "Executive Director of Finance", DEFAULT_PW),
        ("gm@luccca.com", "Marcus Hayes", "general-manager", "salaried",
            "Executive", "General Manager", DEFAULT_PW),
        ("dirbanquets@luccca.com", "Isabella Moreau", "dir-banquets", "salaried",
            "Events", "Director of Banquets", DEFAULT_PW),
        ("execchef@luccca.com", "Chef Gio", "executive-chef", "salaried",
            "Culinary", "Executive Chef", DEFAULT_PW),
        ("souschef@luccca.com", "Carlos Mendes", "sous-chef", "salaried",
            "Culinary", "Sous Chef", DEFAULT_PW),
        ("pastrychef@EchoAurion.com", "Carissa DeSilva", "pastry-chef", "salaried",
            "Pastry", "Executive Pastry Chef", DEFAULT_PW),
        ("fbdir@luccca.com", "Priya Patel", "fb-director", "salaried",
            "Executive", "F&B Director", DEFAULT_PW),
        ("dining@luccca.com", "James Chen", "dining-room-manager", "salaried",
            "FOH", "Dining Room Manager", DEFAULT_PW),
        ("events@luccca.com", "Yuki Tanaka", "events-manager", "salaried",
            "Events", "Events Manager", DEFAULT_PW),
        ("controller@luccca.com", "Andre Dupont", "controller", "salaried",
            "Finance", "Controller", DEFAULT_PW),
        ("spa@luccca.com", "Elena Volkov", "spa-manager", "salaried",
            "Spa", "Spa Manager", DEFAULT_PW),
        # iter263.4 · New profiles for Spa Director, IRD Manager
        ("spadir@luccca.com", "Sienna Bellamy", "spa-director", "salaried",
            "Spa", "Spa Director", DEFAULT_PW),
        ("ird@luccca.com", "Naomi Khoury", "ird-manager", "salaried",
            "Hotel Operations", "IRD Manager", DEFAULT_PW),
        ("eng@luccca.com", "Liam O'Brien", "dir-engineering", "salaried",
            "Engineering", "Director of Engineering", DEFAULT_PW),
        ("purchasing@luccca.com", "Amara Okafor", "purchasing-manager", "salaried",
            "Finance", "Purchasing Manager", DEFAULT_PW),
        # iter264.1 · Banquet leadership, Sales/Marketing, Creative, Ops + Accounting
        ("Gio@EchoAurion.com", "Giovanni Genao", "exec-chef-banquets", "salaried",
            "Banquets", "Executive Chef of Banquets & Catering", DEFAULT_PW),
        ("cdc@luccca.com", "Mateo Rinaldi", "chef-de-cuisine", "salaried",
            "Culinary", "Chef de Cuisine", DEFAULT_PW),
        ("bqtsales@luccca.com", "Camille Beaumont", "bqt-sales-marketing", "salaried",
            "Sales & Marketing", "Banquet Sales & Marketing", DEFAULT_PW),
        ("sales@luccca.com", "Damien Cross", "sales", "salaried",
            "Sales & Marketing", "Sales Manager", DEFAULT_PW),
        ("artmedia@luccca.com", "Aurelia Voss", "senior-art-media-director", "salaried",
            "Creative", "Senior Art & Media Director", DEFAULT_PW),
        ("opscontrol@luccca.com", "Nikolas Petrov", "operation-controller", "salaried",
            "Operations", "Operation Controller", DEFAULT_PW),
        ("accounting@luccca.com", "Helena Ashford", "accounting", "salaried",
            "Finance", "Accounting Department", DEFAULT_PW),
        ("staff@luccca.com", "Sofia Ramirez", "staff", "hourly",
            "FOH", "Server", "StaffDemo2026!"),
        # iter266.3 · Operational seats from the Onboarding panel so they
        # can actually log in (previously they were in admin_users only).
        ("smitchell@luccca.com", "Sarah Mitchell", "gm", "salaried",
            "Operations", "General Manager", DEFAULT_PW),
        ("msantos@luccca.com", "Maria Santos", "exec_chef", "salaried",
            "Culinary", "Executive Chef", DEFAULT_PW),
        ("mlaurent@luccca.com", "Chef Marie Laurent", "pastry_chef", "salaried",
            "Pastry", "Pastry Chef", DEFAULT_PW),
        ("jmorrison@luccca.com", "Jake Morrison", "bar_manager", "salaried",
            "Beverage", "Bar Manager", DEFAULT_PW),
        ("mmayor@luccca.com", "Michelle Mayor", "events_director", "salaried",
            "Events", "Events Director", DEFAULT_PW),
        ("dchen@luccca.com", "David Chen", "controller", "salaried",
            "Finance", "Controller", DEFAULT_PW),
    ]
    # iter266 · Clean up stale email/name aliases so renames take effect:
    # James Wellington III → William J. Morrison (owner)
    # "Chef Carissa" at pastrychef@luccca.com → "Carissa DeSilva" at pastrychef@EchoAurion.com
    # Giovanni Genao moved from execchefbqts@luccca.com → Gio@EchoAurion.com
    for stale_email in (
        "jwellington@luccca.com",
        "pastrychef@luccca.com",
        "execchefbqts@luccca.com",
    ):
        db["auth_users"].delete_one({"email": stale_email})

    for email, name, role, kind, dept, title, pw in role_profiles:
        email = email.lower()
        existing = db["auth_users"].find_one({"email": email}, {"_id": 0})
        if existing:
            # Refresh password if the env-rotated pw differs (admin only)
            if email == admin_email and not _verify(pw, existing.get("password_hash", "")):
                db["auth_users"].update_one({"email": email},
                    {"$set": {"password_hash": _hash(pw)}})
            # iter266 · Always refresh display-name / title / dept / role
            # so seed edits propagate without manual mongo work.
            db["auth_users"].update_one({"email": email},
                {"$set": {"name": name, "role": role, "kind": kind,
                          "department": dept, "title": title}})
            continue
        uid = role.replace("-", "_") + "_user" if role != "staff" else "demo-hourly-001"
        if email == admin_email: uid = "admin"
        db["auth_users"].insert_one({
            "id": uid, "email": email, "name": name,
            "role": role, "kind": kind, "department": dept, "title": title,
            "password_hash": _hash(pw),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Indexes
    try:
        db["auth_users"].create_index("email", unique=True)
        db["password_reset_tokens"].create_index("expires_at",
            expireAfterSeconds=0)
        db["login_attempts"].create_index("_id")
    except Exception: pass


# ── Profile switcher (dev/admin tool) ───────────────────────────────────
@router.get("/profiles")
def list_profiles():
    """Returns all auth_users so the avatar dropdown can populate the
    role-switcher menu. PROD: gate this behind admin-only or hide entirely."""
    rows = list(db["auth_users"].find({}, {"_id": 0, "password_hash": 0}).limit(50))
    # iter256 · Normalize keys for frontend (some seeded with user_id, some with id)
    # Hide test/duplicate accounts. Only return rows with a valid `role`.
    cleaned = []
    avatar_cycle = ["Echo_B", "Echo_F", "Echo_M", "Echo_R"]
    for i, r in enumerate(rows):
        uid = r.get("id") or r.get("user_id")
        if not uid:
            continue
        role = r.get("role")
        # Skip rows missing a role (orphaned test users) and obvious test prefixes
        if not role or role in (None, "") or "(Test)" in (r.get("name") or ""):
            continue
        cleaned.append({
            "id": uid,
            "user_id": uid,
            "name": r.get("name") or r.get("display_name") or "Unknown",
            "email": r.get("email"),
            "role": role,
            "kind": r.get("kind", "salaried"),
            "title": r.get("title"),
            "picture": r.get("picture") or r.get("avatar")
                        or avatar_cycle[i % len(avatar_cycle)],
        })
    # Sort: admin/director first, then by role
    rank = {"admin": 0, "regional-director": 1, "director": 2, "exec-dir-finance": 3,
            "general-manager": 4, "fb-director": 5, "executive-chef": 6, "controller": 7}
    cleaned.sort(key=lambda x: (rank.get(x["role"], 99), x["name"]))
    return {"ok": True, "rows": cleaned}


class SwitchBody(BaseModel):
    user_id: str


@router.post("/switch-profile")
def switch_profile(body: SwitchBody, request: Request, response: Response):
    """Issue tokens AS a different user. Locked to admin OR dev mode."""
    is_dev = DEV_BYPASS and (request.query_params.get("devAuth") == "1"
                                       or request.headers.get("x-dev-auth") == "1")
    if not is_dev:
        # Validate caller is currently admin
        token = request.cookies.get("access_token")
        if not token: raise HTTPException(401, "Not authenticated")
        try:
            payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGO])
        except Exception: raise HTTPException(401, "Invalid token")
        if payload.get("role") != "admin":
            raise HTTPException(403, "Admin only")
    target = db["auth_users"].find_one({"id": body.user_id}, {"_id": 0})
    if not target:
        # iter256 · Some seeded users use user_id instead of id
        target = db["auth_users"].find_one({"user_id": body.user_id}, {"_id": 0})
    if not target: raise HTTPException(404, "Profile not found")
    access = _make_access(target["id"], target["email"], target.get("role", "staff"))
    refresh = _make_refresh(target["id"])
    _set_cookies(response, access, refresh)
    return {"ok": True, "user": _shape_user(target), "access_token": access}
