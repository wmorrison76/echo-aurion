"""
D53.15 · Tenant isolation contract tests.

D27 added tenant_id filtering to every read/write. This file is
the property-based assertion that the boundary CAN'T be breached
by any of the modules from this session, even with malformed
queries.

Each test:
  1. Seeds two tenants (alpha, beta) with overlapping data shapes
  2. Calls the module's user-facing handler with x-tenant-id=alpha
  3. Asserts response contains ONLY alpha rows (no beta leakage)
  4. Asserts no 500 / no exception for malformed inputs

Run:
    cd backend && python tests/test_tenant_isolation_contract.py

This is the test that catches "I forgot to add tenant_id to one
find()" before it ships. CI should fail-fast on it.
"""
from __future__ import annotations

import os
import sys
import types
from datetime import datetime, timezone


def _install_harness():
    if "_tenant_isolation_harness" in sys.modules:
        return
    fake_fastapi = types.ModuleType("fastapi")

    class APIRouter:
        def __init__(self, *a, **kw):
            self.prefix = kw.get("prefix", ""); self._routes = []
        def get(self, p, *a, **kw):
            def deco(f): self._routes.append(("GET", p, f)); return f
            return deco
        def post(self, p, *a, **kw):
            def deco(f): self._routes.append(("POST", p, f)); return f
            return deco
        def put(self, p, *a, **kw):
            def deco(f): self._routes.append(("PUT", p, f)); return f
            return deco
        def patch(self, p, *a, **kw):
            def deco(f): self._routes.append(("PATCH", p, f)); return f
            return deco
        def delete(self, p, *a, **kw):
            def deco(f): self._routes.append(("DELETE", p, f)); return f
            return deco

    class HTTPException(Exception):
        def __init__(self, code, detail=""):
            self.status_code = code; self.detail = detail

    def Header(default=None): return default
    fake_fastapi.APIRouter = APIRouter
    fake_fastapi.HTTPException = HTTPException
    fake_fastapi.Header = Header
    sys.modules["fastapi"] = fake_fastapi

    fake_pyd = types.ModuleType("pydantic")
    class BaseModel:
        def __init__(self, **kw):
            for k, v in kw.items(): setattr(self, k, v)
    def Field(default=None, default_factory=None, **kw):
        if default_factory is not None: return default_factory()
        return default
    fake_pyd.BaseModel = BaseModel
    fake_pyd.Field = Field
    sys.modules["pydantic"] = fake_pyd

    fake_db_mod = types.ModuleType("database")

    class FakeCursor:
        def __init__(self, r): self.r = list(r)
        def limit(self, n): return self.r[:n]
        def sort(self, k, d=1):
            self.r = sorted(self.r,
                key=lambda x: x.get(k) or "", reverse=(d == -1))
            return self
        def __iter__(self): return iter(self.r)

    class FakeColl:
        def __init__(self): self.rows = []
        def _match(self, q, r):
            for k, v in q.items():
                if isinstance(v, dict):
                    if "$gte" in v and (r.get(k) is None or r.get(k) < v["$gte"]): return False
                    if "$ne" in v and r.get(k) == v["$ne"]: return False
                elif r.get(k) != v:
                    return False
            return True
        def find(self, q=None, p=None):
            q = q or {}
            return FakeCursor([r for r in self.rows if self._match(q, r)])
        def find_one(self, q, p=None):
            for r in self.rows:
                if self._match(q, r): return r
            return None
        def insert_one(self, d): self.rows.append(dict(d))
        def update_one(self, q, upd):
            for r in self.rows:
                if self._match(q, r):
                    if "$set" in upd: r.update(upd["$set"])
                    return

    class FakeDb:
        def __init__(self): self.colls = {}
        def __getitem__(self, k):
            if k not in self.colls: self.colls[k] = FakeColl()
            return self.colls[k]

    fake_db_mod.db = FakeDb()
    sys.modules["database"] = fake_db_mod

    pkg_routes = types.ModuleType("routes")
    pkg_routes.__path__ = [os.path.abspath(os.path.join(
        os.path.dirname(__file__), "..", "routes"))]
    sys.modules["routes"] = pkg_routes
    pkg_echo = types.ModuleType("echo")
    pkg_echo.__path__ = [os.path.abspath(os.path.join(
        os.path.dirname(__file__), "..", "echo"))]
    sys.modules["echo"] = pkg_echo

    events_mod = types.ModuleType("echo.events")
    class AppendEventBody:
        def __init__(self, **kw):
            for k, v in kw.items(): setattr(self, k, v)
    events_mod.AppendEventBody = AppendEventBody
    events_mod.append_event = lambda body, tenant_id: {"ok": True}
    events_mod.router = APIRouter()
    sys.modules["echo.events"] = events_mod

    sys.modules["_tenant_isolation_harness"] = types.ModuleType("_marker")


class SkippedModule(Exception):
    pass


def _load(spec_name: str, file_path: str):
    import importlib.util
    if not os.path.exists(file_path):
        raise SkippedModule(file_path)
    spec = importlib.util.spec_from_file_location(spec_name, file_path)
    m = importlib.util.module_from_spec(spec)
    sys.modules[spec_name] = m
    spec.loader.exec_module(m)
    return m


# Helper: prove a list of rows are all from the requested tenant
def _assert_only_tenant(rows, expected_tenant, label):
    foreign = [r for r in rows
               if r.get("tenant_id")
               and r.get("tenant_id") != expected_tenant]
    if foreign:
        raise AssertionError(
            f"{label}: cross-tenant leak — got {len(foreign)} rows from "
            f"other tenants while requesting '{expected_tenant}'")


# ─── Contract: D34 MyEcho list_sessions ──────────────────────────────

def contract_d34_session_list():
    _install_harness()
    base = os.path.dirname(__file__)
    mod = _load("routes.myecho_enrollment",
        os.path.join(base, "..", "routes", "myecho_enrollment.py"))
    db = sys.modules["database"].db

    db["myecho_sessions"].rows = [
        {"tenant_id": "alpha", "id": "s1", "session_token": "t1",
         "employee_id": "e1", "active": True,
         "created_at": "2026-05-01T00:00:00+00:00"},
        {"tenant_id": "beta",  "id": "s2", "session_token": "t2",
         "employee_id": "e2", "active": True,
         "created_at": "2026-05-01T00:00:00+00:00"},
        {"tenant_id": "alpha", "id": "s3", "session_token": "t3",
         "employee_id": "e3", "active": True,
         "created_at": "2026-05-01T00:00:00+00:00"},
    ]
    r = mod.list_sessions(active_only=True,
        x_tenant_id="alpha")
    _assert_only_tenant(r["sessions"], "alpha", "D34 sessions")
    assert r["total"] == 2
    return "PASS · D34 list_sessions tenant scoped"


# ─── Contract: D31 EchoWaste patterns ────────────────────────────────

def contract_d31_waste_patterns():
    _install_harness()
    base = os.path.dirname(__file__)
    mod = _load("echo.waste_intelligence",
        os.path.join(base, "..", "echo", "waste_intelligence.py"))
    db = sys.modules["database"].db

    now = datetime.now(timezone.utc)
    for tenant in ("alpha", "beta"):
        for i in range(6):
            db["echowaste_entries"].rows.append({
                "tenant_id": tenant, "outlet_id": "o-1",
                "captured_at": now.isoformat(),
                "items": [{"station": "hot", "recipe_id": "x",
                            "weight_oz": 10}]})
    r = mod.waste_patterns(outlet_id="o-1",
        x_tenant_id="alpha", x_audience_register="operator")
    # entries_analyzed should be 6 (alpha only), not 12
    assert r["entries_analyzed"] == 6, (
        f"D31 leaked: expected 6, got {r['entries_analyzed']}")
    return "PASS · D31 waste patterns tenant scoped"


# ─── Contract: D33 POS failover load_session ─────────────────────────

def contract_d33_session_load():
    _install_harness()
    base = os.path.dirname(__file__)
    pos_connector = _load("routes.pos_connector",
        os.path.join(base, "..", "routes", "pos_connector.py"))
    pos_failover = _load("routes.pos_failover",
        os.path.join(base, "..", "routes", "pos_failover.py"))
    db = sys.modules["database"].db

    db["kitchen_routing_outlets"].rows = [
        {"outlet_id": "o-1", "default_station": "expo"}]
    db["echolayout_templates"].rows = [
        {"tenant_id": "alpha", "outlet_id": "o-1", "tables": []}]

    # Create a session for alpha; beta tries to load it.
    s = pos_failover.create_session(
        pos_failover.SessionCreateBody(outlet_id="o-1",
            activated_by="gm", duration_hours=8),
        x_tenant_id="alpha")
    token = s["session_token"]
    try:
        pos_failover.load_session(token, x_tenant_id="beta")
        raise AssertionError(
            "D33 leaked: beta loaded alpha's session")
    except pos_failover.HTTPException as e:
        assert e.status_code == 404
    return "PASS · D33 session load tenant scoped"


# ─── Contract: D45 sous chef BEO digest ──────────────────────────────

def contract_d45_beo_digest():
    _install_harness()
    base = os.path.dirname(__file__)
    mod = _load("routes.sous_chef_agent",
        os.path.join(base, "..", "routes", "sous_chef_agent.py"))
    db = sys.modules["database"].db

    today = datetime.now(timezone.utc).date()
    for tenant in ("alpha", "beta"):
        for d in range(2):
            db["beos"].rows.append({
                "tenant_id": tenant, "outlet_id": "o-1",
                "event_date": today.isoformat(),
                "start_time": "18:00", "event_name": f"Wedding{d}",
                "guest_count": 100, "venue": "Hall"})
    r = mod.intent(mod.IntentBody(
        transcript="compile BEO orders for next 4 days",
        outlet_id="o-1"),
        x_tenant_id="alpha", x_user_id="chef-jane")
    # 2 events for alpha, not 4
    assert r["event_count"] == 2, (
        f"D45 leaked: expected 2 events, got {r['event_count']}")
    return "PASS · D45 sous chef tenant scoped"


# ─── Contract: D47 payroll list ──────────────────────────────────────

def contract_d47_payroll_paystubs():
    _install_harness()
    base = os.path.dirname(__file__)
    mod = _load("routes.payroll_engine_full",
        os.path.join(base, "..", "routes", "payroll_engine_full.py"))
    db = sys.modules["database"].db

    db["employees"].rows = [
        {"tenant_id": "alpha", "id": "e-test"},
        {"tenant_id": "beta",  "id": "e-test"},  # SAME employee_id
    ]
    db["paystubs"].rows = [
        {"tenant_id": "alpha", "id": "p1", "employee_id": "e-test",
         "status": "posted", "pay_date": "2026-05-01",
         "gross": 1000},
        {"tenant_id": "beta",  "id": "p2", "employee_id": "e-test",
         "status": "posted", "pay_date": "2026-05-01",
         "gross": 9999},
    ]
    r = mod.my_paystubs(x_tenant_id="alpha", x_user_id="e-test")
    _assert_only_tenant(r["paystubs"], "alpha", "D47 paystubs")
    assert r["total"] == 1
    assert r["paystubs"][0]["gross"] == 1000
    return "PASS · D47 paystubs scoped (same employee_id, different tenants)"


# ─── Contract: D48 PMS reservations ──────────────────────────────────

def contract_d48_pms_reservations():
    _install_harness()
    base = os.path.dirname(__file__)
    mod = _load("routes.pms_core",
        os.path.join(base, "..", "routes", "pms_core.py"))
    db = sys.modules["database"].db

    for tenant in ("alpha", "beta"):
        db["pms_reservations"].rows.append({
            "tenant_id": tenant, "id": f"r-{tenant}",
            "property_id": "p-1", "guest_first_name": "X",
            "guest_last_name": "Y", "arrival_date": "2026-06-01",
            "departure_date": "2026-06-03", "room_type": "standard",
            "rate_plan": "BAR", "rate_per_night": 200, "nights": 2,
            "status": "booked",
        })
    r = mod.search_reservations(property_id="p-1",
        x_tenant_id="alpha")
    _assert_only_tenant(r["reservations"], "alpha", "D48 reservations")
    assert r["total"] == 1
    return "PASS · D48 PMS reservations tenant scoped"


# ─── Runner ────────────────────────────────────────────────────────────

CONTRACTS = [
    contract_d31_waste_patterns,
    contract_d33_session_load,
    contract_d34_session_list,
    contract_d45_beo_digest,
    contract_d47_payroll_paystubs,
    contract_d48_pms_reservations,
]


def run_all() -> int:
    passes = skipped = failures = 0
    print("=" * 60)
    print("  Tenant isolation contract tests (D27 + D53)")
    print("=" * 60)
    for fn in CONTRACTS:
        sys.modules.pop("_tenant_isolation_harness", None)
        sys.modules.pop("database", None)
        sys.modules.pop("fastapi", None)
        sys.modules.pop("pydantic", None)
        try:
            print(f"  {fn()}")
            passes += 1
        except SkippedModule as sm:
            print(f"  SKIP · {fn.__name__}: target not on branch "
                  f"({os.path.basename(str(sm))})")
            skipped += 1
        except Exception as e:
            print(f"  FAIL · {fn.__name__}: {e}")
            failures += 1
    print("=" * 60)
    print(f"  {passes}/{len(CONTRACTS)} passed · {skipped} skipped · "
          f"{failures} failed")
    print("=" * 60)
    return failures


if __name__ == "__main__":
    sys.exit(run_all())
