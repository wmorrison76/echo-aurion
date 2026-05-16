"""
D17a · Service Client Factories — lazy singletons that read from the
fuse box (`config.settings`) so the rest of the codebase stops
re-instantiating clients with inline `os.environ.get(...)` calls.

Audit before D17a:
  · 24 distinct MongoClient(MONGO_URL) instantiations
  · 43 distinct OpenAI(api_key=...) instantiations
  · 5 inline JWT_SECRET reads
  · 157 hardcoded base URLs

After D17a, the right idiom is:

    from services.clients import db, openai_client, anthropic_client

    @router.get("/foo")
    def foo():
        return db["users"].find_one({...})

The legacy idiom keeps working — `backend/database.py` still exports
`db` — but the migration sweeps (D17b/c/d/e) will retire each
inline-construction site one PR at a time.

Lazy-singleton means: the first call constructs the client; every
subsequent call returns the same instance. Importing this module does
NOT touch the network — useful for tooling that just wants to inspect
settings without spinning up a Mongo connection.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Any, Optional

from config import get_settings


# ─── Database (Mongo) ─────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def get_mongo_client() -> Any:
    """Returns the shared MongoClient instance, configured from the fuse
    box. The retry/pool tuning matches the existing `database.py` —
    we're factoring it through the fuse box, not changing behavior."""
    from pymongo import MongoClient
    s = get_settings()
    return MongoClient(
        s.MONGO_URL,
        maxPoolSize=100,
        minPoolSize=10,
        maxIdleTimeMS=45000,
        waitQueueTimeoutMS=5000,
        connectTimeoutMS=5000,
        serverSelectionTimeoutMS=5000,
        retryWrites=True,
        retryReads=True,
        w="majority",
    )


@lru_cache(maxsize=1)
def get_db() -> Any:
    """The default database handle, equivalent to `database.db`.
    The 19 routes that currently re-do MongoClient should be migrated
    to import this instead — see D17b."""
    s = get_settings()
    return get_mongo_client()[s.DB_NAME]


# ─── AI providers ─────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def get_openai_client() -> Any:
    """Returns a singleton OpenAI client, raising a clear error if no
    key is wired. The 43 inline `OpenAI(api_key=...)` sites should
    migrate to `from services.clients import get_openai_client`
    in D17c."""
    from openai import OpenAI
    s = get_settings()
    if not s.OPENAI_API_KEY:
        raise RuntimeError(
            "OPENAI_API_KEY is not wired in the fuse box. "
            "Set it in .env or your secrets manager. The fuse-box admin "
            "panel will show this wire as not-configured.")
    return OpenAI(api_key=s.OPENAI_API_KEY, base_url=s.OPENAI_BASE_URL)


@lru_cache(maxsize=1)
def get_anthropic_client() -> Any:
    """Returns a singleton Anthropic client. Used by the EchoAi³
    modules (Carissa / Gio training, etc.)."""
    import anthropic
    s = get_settings()
    if not s.ANTHROPIC_API_KEY:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not wired in the fuse box.")
    return anthropic.Anthropic(api_key=s.ANTHROPIC_API_KEY,
                                base_url=s.ANTHROPIC_BASE_URL)


# ─── Health ───────────────────────────────────────────────────────────────

def health_check_all() -> dict:
    """Best-effort health probe for every wired service. Returns a
    {service: {ok, error?, latency_ms?}} mapping the admin Fuse Box
    panel can render with green/red dots.

    Each probe is wrapped in try/except — a single dead provider does
    NOT poison the whole report. We swallow exceptions and surface
    them as `ok=False` with the exception type only (no message — to
    avoid leaking secrets via error text)."""
    import time
    out: dict[str, dict] = {}
    s = get_settings()

    # Mongo
    t0 = time.perf_counter()
    try:
        get_mongo_client().admin.command("ping")
        out["mongo"] = {"ok": True,
                         "latency_ms": int((time.perf_counter() - t0) * 1000)}
    except Exception as e:
        out["mongo"] = {"ok": False, "error": type(e).__name__}

    # OpenAI — only probe if a key is wired (probing without a key is
    # a no-op).
    if s.OPENAI_API_KEY:
        out["openai"] = {"ok": True, "wired": True,
                         "note": "key present (no live probe — billable)"}
    else:
        out["openai"] = {"ok": False, "wired": False,
                         "note": "no key configured"}

    # Anthropic — same posture as OpenAI.
    if s.ANTHROPIC_API_KEY:
        out["anthropic"] = {"ok": True, "wired": True,
                             "note": "key present"}
    else:
        out["anthropic"] = {"ok": False, "wired": False,
                             "note": "no key configured"}

    return out


# ─── Test seam ───────────────────────────────────────────────────────────

def reset_clients_for_tests() -> None:
    """Clear the lru_cache so tests can re-instantiate clients after
    swapping env vars. Production code should never call this."""
    get_mongo_client.cache_clear()
    get_db.cache_clear()
    get_openai_client.cache_clear()
    get_anthropic_client.cache_clear()
