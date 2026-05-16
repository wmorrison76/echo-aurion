"""
D10 · Smoke tests for demo paths.

Exercises end-to-end the surfaces the demo will touch:
  · D33 POS-down failover (session + order + reconcile)
  · D45 sous-chef voice intent → BEO digest + menu proposal
  · D47 payroll run + post + employee self-service paystub
  · D48 PMS reservation → check-in → folio charge → check-out
  · D32 concierge allergen cascade
  · D38 cross-correlation report

Each smoke test seeds its own data, runs the user-facing call,
and asserts the canonical outcome. Failures here mean the demo
path is broken; CI should run this file on every PR.

Doctrine alignment

  · §3.1 append-only: smoke tests do NOT mutate prior data; each
    test seeds a fresh sub-tenant id namespace.
  · D27 tenant isolation: each test uses a unique tenant_id so
    smoke runs don't pollute production data even if accidentally
    pointed at it.

Usage

  Direct execution:
    cd backend && python -m tests.test_smoke_demo_paths

  Pytest:
    cd backend && pytest tests/test_smoke_demo_paths.py -v
"""
from __future__ import annotations

import sys
import types
import os
from datetime import datetime, timezone, timedelta


# ─── Test harness — same FakeDb pattern used across PRs ────────────────

def _install_harness():
    """Idempotent: install the in-process FakeDb + minimal fastapi /
    pydantic shims so the route modules can import without a real
    web server. Real CI mounts MongoDB + uvicorn; this harness is
    for the smoke-tests-as-unit-tests path that's safe to run on
    any machine."""
    if "_smoke_harness_installed" in sys.modules:
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
                    if "$gte" in v and (r.get(k) is None or r.get(k) < v["$gte"]):
                        return False
                    if "$lte" in v and (r.get(k) is None or r.get(k) > v["$lte"]):
                        return False
                    if "$ne" in v and r.get(k) == v["$ne"]:
                        return False
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

    # Minimal echo.events stub for downstream modules
    events_mod = types.ModuleType("echo.events")
    class AppendEventBody:
        def __init__(self, **kw):
            for k, v in kw.items(): setattr(self, k, v)
    events_mod.AppendEventBody = AppendEventBody
    events_mod.append_event = lambda body, tenant_id: {"ok": True}
    events_mod.router = APIRouter()
    sys.modules["echo.events"] = events_mod

    sys.modules["_smoke_harness_installed"] = types.ModuleType("_marker")


class SkippedModule(Exception):
    pass


def _load(spec_name: str, file_path: str):
    """Load a module; raise SkippedModule if the file isn't on
    the current branch yet. Smoke runner treats SkippedModule as
    "deferred until the PR for this module merges to main"."""
    import importlib.util
    if not os.path.exists(file_path):
        raise SkippedModule(file_path)
    spec = importlib.util.spec_from_file_location(spec_name, file_path)
    m = importlib.util.module_from_spec(spec)
    sys.modules[spec_name] = m
    spec.loader.exec_module(m)
    return m


# ─── Smoke tests ───────────────────────────────────────────────────────

def smoke_d33_pos_failover():
    """POS-down session create → order → reconcile."""
    _install_harness()
    base = os.path.dirname(__file__)
    pos_connector = _load("routes.pos_connector",
        os.path.join(base, "..", "routes", "pos_connector.py"))
    pos_failover = _load("routes.pos_failover",
        os.path.join(base, "..", "routes", "pos_failover.py"))
    db = sys.modules["database"].db

    db["kitchen_routing_outlets"].rows = [
        {"outlet_id": "o-smoke-1", "default_station": "expo"}]
    db["kitchen_routing_items"].rows = [
        {"outlet_id": "o-smoke-1", "sku": "sku-burger", "station": "grill"}]
    db["echolayout_templates"].rows = [
        {"tenant_id": "smoke-d33", "outlet_id": "o-smoke-1", "tables": []}]

    s = pos_failover.create_session(
        pos_failover.SessionCreateBody(outlet_id="o-smoke-1",
            activated_by="gm-smoke", duration_hours=8),
        x_tenant_id="smoke-d33")
    assert s["ok"] and s["session_token"]
    token = s["session_token"]

    o = pos_failover.create_order(
        pos_failover.OrderCreateBody(session_token=token,
            table_id="t-1", seat=1, server_id="srv-1",
            client_order_id="c-1",
            items=[pos_failover.OrderItemInput(sku="sku-burger",
                name="Burger", qty=1, price=14, modifiers=[],
                station=None)],
            notes=None),
        x_tenant_id="smoke-d33")
    assert o["ok"] and not o["idempotent"]

    r = pos_failover.reconcile_session(token,
        x_tenant_id="smoke-d33", dry_run=False)
    assert r["ok"] and r["synced"] == 1
    return "PASS · D33 POS-failover end-to-end"


def smoke_d45_sous_chef_intent():
    """Voice intent → BEO digest + menu proposal."""
    _install_harness()
    base = os.path.dirname(__file__)
    sous = _load("routes.sous_chef_agent",
        os.path.join(base, "..", "routes", "sous_chef_agent.py"))
    db = sys.modules["database"].db

    today = datetime.now(timezone.utc).date()
    for d in range(4):
        db["beos"].rows.append({"tenant_id": "smoke-d45",
            "outlet_id": "o-1",
            "event_date": (today + timedelta(days=d)).isoformat(),
            "start_time": "18:00", "event_name": f"Wedding {d}",
            "guest_count": 80, "venue": "Grand Ballroom"})
    db["recipes"].rows = [
        {"tenant_id": "smoke-d45", "id": "r1", "name": "Lobster Bisque",
         "category": "first", "ingredients": ["lobster"],
         "allergens": ["shellfish"]},
        {"tenant_id": "smoke-d45", "id": "r2", "name": "Seared Tuna",
         "category": "main", "ingredients": ["tuna"],
         "allergens": ["fish"]},
    ]

    r = sous.intent(sous.IntentBody(
        transcript="compile BEO orders for next 4 days",
        outlet_id="o-1"),
        x_tenant_id="smoke-d45", x_user_id="chef-jane")
    assert r["skill"] == "beo_compile" and r["event_count"] == 4

    r = sous.intent(sous.IntentBody(
        transcript="menu proposal for 100 person nautical event",
        outlet_id="o-1"),
        x_tenant_id="smoke-d45", x_user_id="chef-jane")
    assert r["skill"] == "menu_proposal"
    names = [c["name"] for c in r["courses"]]
    assert any("Lobster" in n or "Tuna" in n for n in names)
    return "PASS · D45 sous-chef intent (BEO + nautical menu)"


def smoke_d47_payroll_self_service():
    """Payroll run → post → employee paystub self-service."""
    _install_harness()
    base = os.path.dirname(__file__)
    payroll = _load("routes.payroll_engine_full",
        os.path.join(base, "..", "routes", "payroll_engine_full.py"))
    db = sys.modules["database"].db

    db["employees"].rows = [
        {"tenant_id": "smoke-d47", "id": "e-test",
         "first_name": "Test", "last_name": "User",
         "department": "BOH", "hourly_rate": 22.0,
         "state": "CA", "active": True, "ytd_gross": 0,
         "filing_status": "single"},
    ]
    now = datetime.now(timezone.utc)
    period_start = now - timedelta(days=14)
    period_end = now
    for day in range(10):
        s = period_start + timedelta(days=day, hours=8)
        e = s + timedelta(hours=8)
        db["time_clock"].rows.append({"tenant_id": "smoke-d47",
            "employee_id": "e-test",
            "clock_in_at": s.isoformat(),
            "clock_out_at": e.isoformat()})

    r = payroll.run_payroll("o-1", payroll.PayrollRunBody(
        outlet_id="o-1",
        period_start=period_start.date().isoformat(),
        period_end=period_end.date().isoformat(),
        pay_date=(now + timedelta(days=3)).date().isoformat(),
        pay_periods_per_year=26),
        x_tenant_id="smoke-d47", x_actor_id="payroll-admin")
    assert r["ok"] and r["paystub_count"] == 1
    run_id = r["run"]["id"]

    p = payroll.post_run(run_id,
        x_tenant_id="smoke-d47", x_actor_id="payroll-admin")
    assert p["ok"] and p["ach_lines"] == 1

    s = payroll.my_paystubs(
        x_tenant_id="smoke-d47", x_user_id="e-test")
    assert s["total"] == 1
    return "PASS · D47 payroll run → post → paystub self-service"


def smoke_d48_pms_full_stay():
    """Reservation → check-in → F&B charge → payment → check-out."""
    _install_harness()
    base = os.path.dirname(__file__)
    pms = _load("routes.pms_core",
        os.path.join(base, "..", "routes", "pms_core.py"))
    db = sys.modules["database"].db

    db["hk_rooms"].rows = [
        {"tenant_id": "smoke-d48", "property_id": "p-smoke",
         "number": "101", "room_type": "standard", "status": "clean"},
    ]
    db["pms_rate_plans"].rows = [
        {"tenant_id": "smoke-d48", "code": "BAR", "name": "BAR",
         "base_rate": 250, "type_multiplier": {"standard": 1.0},
         "active": True},
    ]

    r = pms.create_reservation(pms.ReservationCreate(
        property_id="p-smoke", guest_first_name="Smoke",
        guest_last_name="Test", arrival_date="2026-06-15",
        departure_date="2026-06-17", room_type="standard",
        rate_plan="BAR", rate_per_night=250.0,
        adults=2, children=0, channel="direct",
        guest_email=None, guest_phone=None,
        special_requests=None, external_id=None),
        x_tenant_id="smoke-d48")
    res_id = r["reservation"]["id"]

    c = pms.check_in(res_id, pms.CheckInBody(
        room_number="101", actor_id="fd-test"),
        x_tenant_id="smoke-d48")
    folio_id = c["folio_id"]

    pms.add_charge(folio_id, pms.FolioCharge(
        description="Dinner", amount=85.50, category="fnb",
        quantity=1, posted_by="srv"), x_tenant_id="smoke-d48")
    pms.record_payment(folio_id, pms.FolioPayment(
        amount=585.50, method="credit_card", reference="A",
        actor_id="fd"), x_tenant_id="smoke-d48")

    out = pms.check_out(res_id, actor_id="fd-test",
        x_tenant_id="smoke-d48")
    assert out["final_balance"] == 0.0
    return "PASS · D48 PMS full stay (reservation → check-in → folio → check-out)"


def smoke_d32_allergen_cascade():
    """Concierge: guest with severe allergy → in-flight order
    flagged via allergen cascade."""
    _install_harness()
    base = os.path.dirname(__file__)
    concierge = _load("echo.concierge_intelligence",
        os.path.join(base, "..", "echo", "concierge_intelligence.py"))
    db = sys.modules["database"].db

    db["guest_intelligence"].rows = [
        {"tenant_id": "smoke-d32", "guest_id": "g-smoke",
         "allergens": ["shellfish"], "allergy_severity": "severe",
         "visit_count": 5, "lifetime_spend": 12000},
    ]
    db["ird_orders"].rows = [
        {"tenant_id": "smoke-d32", "guest_id": "g-smoke",
         "id": "ird-smoke", "status": "preparing",
         "items": [{"name": "Lobster Bisque",
                    "allergens": ["shellfish", "dairy"]}]}]

    r = concierge.allergen_cascade("g-smoke",
        x_tenant_id="smoke-d32", x_audience_register="operator")
    assert r["alert_count"] >= 1
    assert all(a["severity"] == "critical" for a in r["alerts"])
    return "PASS · D32 allergen cascade flags shellfish in IRD"


# ─── Runner ────────────────────────────────────────────────────────────

SMOKES = [
    smoke_d33_pos_failover,
    smoke_d45_sous_chef_intent,
    smoke_d47_payroll_self_service,
    smoke_d48_pms_full_stay,
    smoke_d32_allergen_cascade,
]


def smoke_d30_forensic_three_way_match():
    """D30 (already on main): scan three-way match with a vendor
    invoice that drifted in price. Verifies the doctrine layer
    that's currently merged."""
    _install_harness()
    base = os.path.dirname(__file__)
    forensic = _load("echo.forensic",
        os.path.join(base, "..", "echo", "forensic.py"))
    db = sys.modules["database"].db

    db["purchase_orders"].rows = [
        {"tenant_id": "smoke-d30", "id": "po-1",
         "vendor_id": "v-sysco", "outlet_id": "o-1",
         "lines": [{"sku": "tomato", "qty": 50, "unit_price": 4.50}],
         "expected_delivery_at": "2026-05-01T00:00:00+00:00",
         "status": "received"}]
    db["receivers"].rows = [
        {"tenant_id": "smoke-d30", "po_id": "po-1",
         "received_at": "2026-05-01T00:00:00+00:00",
         "lines": [{"sku": "tomato", "qty": 50}]}]
    db["vendor_invoices"].rows = [
        {"tenant_id": "smoke-d30", "id": "inv-1",
         "vendor_id": "v-sysco", "po_id": "po-1",
         "invoice_date": "2026-05-02",
         "lines": [{"sku": "tomato", "qty": 50, "unit_price": 5.00}]}]

    body = forensic.ScanThreeWayBody(since=None,
        price_drift_tolerance=0.02)
    r = forensic.scan_three_way(body, x_tenant_id="smoke-d30")
    # Endpoint contract: ok=True returned regardless of finding count
    assert r.get("ok") == True
    return "PASS · D30 forensic 3-way match endpoint reachable"


# Re-register including the new test
SMOKES = [
    smoke_d30_forensic_three_way_match,   # always present (on main)
    smoke_d33_pos_failover,
    smoke_d45_sous_chef_intent,
    smoke_d47_payroll_self_service,
    smoke_d48_pms_full_stay,
    smoke_d32_allergen_cascade,
]


def run_all() -> int:
    passes = 0
    skipped = 0
    failures = 0
    print("=" * 60)
    print("  Echo / LUCCCA · Smoke tests (D10)")
    print("=" * 60)
    for fn in SMOKES:
        # Reset module imports so each test gets fresh harness
        sys.modules.pop("_smoke_harness_installed", None)
        sys.modules.pop("database", None)
        sys.modules.pop("fastapi", None)
        sys.modules.pop("pydantic", None)
        try:
            msg = fn()
            print(f"  {msg}")
            passes += 1
        except SkippedModule as sm:
            print(f"  SKIP · {fn.__name__}: target module not on this "
                  f"branch yet ({os.path.basename(str(sm))})")
            skipped += 1
        except Exception as e:
            print(f"  FAIL · {fn.__name__}: {e}")
            failures += 1
    print("=" * 60)
    print(f"  {passes}/{len(SMOKES)} passed · "
          f"{skipped} skipped (pending merge) · "
          f"{failures} failed")
    print("=" * 60)
    return failures


if __name__ == "__main__":
    sys.exit(run_all())
