"""iter209 · Router auto-registry (audit recommendation BE-1).

Scans /app/backend/routes/ for every module exposing a top-level `router`
(APIRouter) and registers it against the FastAPI app. Any router whose prefix
is already mounted (so server.py's explicit `app.include_router(...)` calls
still run first) is skipped — meaning this can be added *additively* to
server.py without risking duplicates.

Usage (end of server.py)::

    from routers import auto_register
    auto_register(app)

Benefits:
    - Dropping a new `/app/backend/routes/foo.py` with a `router` export now
      Just Works — no manual edits to `server.py` needed.
    - Skips any module that fails to import (broken route file won't brick boot).
    - Logs every registration so the boot log is still a clean inventory.
"""
from __future__ import annotations
import importlib
import logging
import pkgutil
from typing import Any, Set

logger = logging.getLogger("echo.routers")


def _mounted_path_set(app) -> Set[str]:
    """Return the full set of exact API paths already registered on `app`."""
    out: Set[str] = set()
    for r in getattr(app, "routes", []):
        p = getattr(r, "path", None)
        if p:
            out.add(p)
    return out


def auto_register(app: Any, *, package: str = "routes") -> dict:
    """Walk `routes.*` and register any `router` whose routes are not already
    mounted. Returns a summary dict ``{registered, skipped_existing, import_errors}``.

    Detection uses per-route path comparison — robust against routers with or
    without a prefix, and against routers whose routes use full absolute paths.
    """
    pkg = importlib.import_module(package)
    mounted = _mounted_path_set(app)

    registered: list[str] = []
    skipped: list[str] = []
    errors: list[dict] = []

    for info in pkgutil.iter_modules(pkg.__path__):
        name = f"{package}.{info.name}"
        try:
            mod = importlib.import_module(name)
        except Exception as e:
            errors.append({"module": name, "error": str(e)[:200]})
            continue
        router = getattr(mod, "router", None)
        if router is None:
            continue

        # Compute the set of paths this router would mount
        prefix = getattr(router, "prefix", "") or ""
        router_paths: Set[str] = set()
        for rt in getattr(router, "routes", []):
            p = getattr(rt, "path", None)
            if p:
                router_paths.add((prefix + p) if prefix and not p.startswith(prefix) else p)

        # If the FIRST route is already on the app, assume this router was
        # registered explicitly in server.py — skip to avoid duplicate routes.
        if router_paths and router_paths & mounted:
            skipped.append(name)
            continue

        try:
            app.include_router(router)
            registered.append(name)
            mounted.update(router_paths)
        except Exception as e:
            errors.append({"module": name, "error": str(e)[:200]})

    summary = {
        "registered": len(registered),
        "registered_modules": registered,
        "skipped_existing": len(skipped),
        "import_errors": errors,
    }
    logger.info(
        "router.auto_register · registered=%d · skipped=%d · errors=%d",
        len(registered), len(skipped), len(errors),
    )
    return summary
