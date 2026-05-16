"""
D17a · The Fuse Box — central registry for every infrastructure
connection a LUCCCA instance needs.

Distinction (intentional):
  · This file holds INFRASTRUCTURE wiring — DB URL, AI keys, JWT
    secret, storage bucket, telemetry DSN. The stuff DevOps changes
    when migrating to a new server.
  · Per-customer business INTEGRATIONS (Stripe / ADP / Toast / …)
    do NOT live here. They live in the integrations layer, are
    per-tenant, and are managed by the customer admin via a
    different surface.

Migration story:
  Before D17:  scattered. 24 MongoClient sites, 43 OpenAI inits,
               5 JWT_SECRET reads, 157 hardcoded URLs across 44 files.
  After D17a: this file is the single source. Routes/services import
               `from config import settings` and `from services.clients
               import openai_client, db`. Migrating servers = edit one
               .env, restart, done.

Failure modes (intentional):
  · A missing required setting (e.g. JWT_SECRET in production) raises
    at startup, NOT at first request. Better to fail-fast than to
    serve users with a silently-broken auth path.
  · Optional settings have safe dev defaults; the admin Fuse Box panel
    flags them as "configured?" so an operator can see the gap before
    a customer hits it.

Tests live in tests/test_config.py and exercise the env→settings
binding without needing a network.
"""
from __future__ import annotations

import os
from functools import lru_cache
from typing import Optional

# pydantic-settings is the modern home of BaseSettings. Fall back to
# the in-package class if the user is on older pydantic v1 — common
# in legacy deployments. The shim keeps the public API identical.
try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    _HAVE_V2 = True
except ImportError:                                              # pragma: no cover
    from pydantic import BaseSettings                            # type: ignore
    SettingsConfigDict = dict                                    # type: ignore
    _HAVE_V2 = False

from pydantic import Field


# ─── Environment detector ─────────────────────────────────────────────────

def _env_name() -> str:
    """Detect the deployment environment. Reads LUCCCA_ENV first, falls
    back to NODE_ENV (so Electron + Node services agree), then
    "development". Returns one of: development | staging | production."""
    raw = (os.environ.get("LUCCCA_ENV")
           or os.environ.get("NODE_ENV")
           or "development").strip().lower()
    if raw in ("dev", "development"):
        return "development"
    if raw in ("stage", "staging"):
        return "staging"
    if raw in ("prod", "production"):
        return "production"
    return raw or "development"


# ─── The Fuse Box ─────────────────────────────────────────────────────────

class Settings(BaseSettings):
    """Every infrastructure wire. One panel. One source.

    Field naming matches the env var name (uppercased) so .env files
    look identical to Python access. Pydantic handles the binding."""

    # Deployment context
    LUCCCA_ENV: str = Field(default_factory=_env_name,
                            description="development | staging | production")
    SERVICE_NAME: str = Field(default="luccca-api",
                              description="Used in logs + telemetry tags")

    # ─── Database ─────
    MONGO_URL: str = Field(default="mongodb://localhost:27017",
                           description="MongoDB connection string")
    DB_NAME: str   = Field(default="luccca_enterprise",
                           description="Mongo database name")
    POSTGRES_URL: Optional[str] = Field(default=None,
                                         description="Optional Postgres for "
                                                     "RBAC/migrations (D11+)")

    # ─── Auth ─────
    # JWT_SECRET is the one secret we genuinely refuse to default in
    # production — see _validate() below.
    JWT_SECRET: str = Field(default="luccca-dev-jwt-secret-not-for-production",
                            description="HMAC key for session JWTs")
    SESSION_TTL_HOURS: int = Field(default=24,
                                    description="Lifetime of an issued JWT")
    COOKIE_DOMAIN: Optional[str] = Field(default=None,
                                          description="Cookie domain "
                                                      "(unset for localhost)")

    # ─── AI providers ─────
    OPENAI_API_KEY: Optional[str] = Field(default=None,
                                           description="Required if any "
                                                       "OpenAI-backed module "
                                                       "is enabled")
    OPENAI_BASE_URL: str = Field(default="https://api.openai.com/v1",
                                  description="Override for proxies / "
                                              "self-hosted gateways")
    ANTHROPIC_API_KEY: Optional[str] = Field(default=None,
                                              description="Required for Claude-"
                                                          "backed modules "
                                                          "(EchoAi³ etc.)")
    ANTHROPIC_BASE_URL: str = Field(default="https://api.anthropic.com",
                                     description="Override for proxies")

    # ─── Storage ─────
    S3_BUCKET: Optional[str] = Field(default=None,
                                      description="Object storage bucket "
                                                  "(media, exports)")
    S3_REGION: str = Field(default="us-east-1")
    S3_ENDPOINT_URL: Optional[str] = Field(default=None,
                                            description="Override for "
                                                        "MinIO/R2/etc.")

    # ─── Telemetry ─────
    SENTRY_DSN: Optional[str] = Field(default=None,
                                       description="Error reporting endpoint")
    OTEL_ENDPOINT: Optional[str] = Field(default=None,
                                          description="OpenTelemetry collector")

    # ─── Admin gate (used by D11b/D13 routes) ─────
    ADMIN_API_TOKEN: Optional[str] = Field(default=None,
                                            description="If set, every "
                                                        "/api/admin/* call "
                                                        "must carry this in "
                                                        "X-Admin-Token")

    if _HAVE_V2:
        model_config = SettingsConfigDict(
            env_file=".env",
            env_file_encoding="utf-8",
            case_sensitive=True,
            extra="ignore",
        )
    else:                                                       # pragma: no cover
        class Config:
            env_file = ".env"
            env_file_encoding = "utf-8"
            case_sensitive = True

    # ─── Cross-field validation ─────
    def _validate(self) -> None:
        """Hard rules that depend on the deployment environment.
        Raised at startup so a misconfigured prod box can't accept
        traffic."""
        env = self.LUCCCA_ENV
        if env == "production":
            errs = []
            if self.JWT_SECRET == "luccca-dev-jwt-secret-not-for-production":
                errs.append("JWT_SECRET must be set (not the dev default) "
                            "in production")
            if self.MONGO_URL.startswith("mongodb://localhost"):
                errs.append("MONGO_URL still points at localhost in "
                            "production")
            if errs:
                raise RuntimeError(
                    "fuse-box config invalid for production:\n  - "
                    + "\n  - ".join(errs))


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Lazy singleton. First call instantiates + validates; subsequent
    calls return the cached instance.

    Use `get_settings()` rather than importing `settings` at module
    scope so tests can override env vars before the first read."""
    s = Settings()
    s._validate()
    return s


# Convenience for callers that don't care about the lazy guarantee.
# `from config import settings` is fine for routes that load after
# server boot — they're past the validation gate at that point.
settings = get_settings()


# ─── Introspection (used by the admin Fuse Box panel) ─────────────────────

# Treat these as "public" (their values can be reported to an admin
# UI). Everything else is masked because it's a secret.
_SAFE_FIELDS = {
    "LUCCCA_ENV", "SERVICE_NAME",
    "DB_NAME", "OPENAI_BASE_URL", "ANTHROPIC_BASE_URL",
    "SESSION_TTL_HOURS", "COOKIE_DOMAIN",
    "S3_BUCKET", "S3_REGION", "S3_ENDPOINT_URL",
    "OTEL_ENDPOINT",
    # MONGO_URL has the password embedded — mask it.
    # JWT_SECRET / OPENAI_API_KEY / ANTHROPIC_API_KEY / SENTRY_DSN /
    # ADMIN_API_TOKEN / POSTGRES_URL all secrets — mask them.
}


def _mask(value: Optional[str]) -> str:
    """Mask a secret to "set" / "—" without leaking the value.
    The admin UI gets a green/red dot, never the secret itself."""
    if value is None or value == "":
        return ""
    return "set"


def fuse_box_snapshot() -> dict:
    """Return a UI-safe snapshot of every wire in the fuse box.
    Masks every secret to "set" / "" — never the actual value."""
    s = get_settings()
    out = {"env": s.LUCCCA_ENV, "wires": []}
    # Each wire: {key, value_or_status, configured, category, doc}
    for fname, finfo in s.model_fields.items() if _HAVE_V2 else (
        s.__fields__.items()):
        raw = getattr(s, fname)
        configured = raw is not None and raw != ""
        if fname == "JWT_SECRET":
            configured = (raw and raw != "luccca-dev-jwt-secret-not-for-production")
        if fname == "MONGO_URL":
            # Mask the password if any. URL like mongodb://u:p@host/db
            shown = raw.split("@", 1)[-1] if "@" in (raw or "") else raw
        elif fname in _SAFE_FIELDS:
            shown = raw
        else:
            shown = _mask(raw if isinstance(raw, str) else None)
        # Description from the Field()
        doc = ""
        if _HAVE_V2:
            doc = (finfo.description or "")
        else:                                                   # pragma: no cover
            doc = (getattr(finfo, "description", "") or "")
        out["wires"].append({
            "key": fname,
            "value": shown,
            "configured": bool(configured),
            "category": _category_for(fname),
            "doc": doc,
        })
    return out


def _category_for(field: str) -> str:
    """Group wires for the UI. Same shape as the .env.example sections."""
    if field in ("LUCCCA_ENV", "SERVICE_NAME"):                return "deployment"
    if field in ("MONGO_URL", "DB_NAME", "POSTGRES_URL"):     return "database"
    if field in ("JWT_SECRET", "SESSION_TTL_HOURS", "COOKIE_DOMAIN",
                 "ADMIN_API_TOKEN"):                            return "auth"
    if field in ("OPENAI_API_KEY", "OPENAI_BASE_URL",
                 "ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL"):   return "ai-providers"
    if field in ("S3_BUCKET", "S3_REGION", "S3_ENDPOINT_URL"): return "storage"
    if field in ("SENTRY_DSN", "OTEL_ENDPOINT"):               return "telemetry"
    return "other"
