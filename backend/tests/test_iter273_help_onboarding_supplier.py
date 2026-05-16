"""iter273 — Help Agent LLM Q&A, Admin onboarding role provisioning, Supplier catalog deep-dive, 409A PDF."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cfo-toolkit-deploy.preview.emergentagent.com").rstrip("/")
S = requests.Session()
S.headers.update({"Content-Type": "application/json"})


# ---------- Help Agent /ask (LLM-backed) ----------
class TestHelpAgentAsk:
    def test_ask_409a(self):
        r = S.post(f"{BASE_URL}/api/help-agent/ask", json={"question": "what is a 409A"}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d.get("reply"), str) and len(d["reply"].strip()) > 0, f"empty reply: {d}"

    def test_ask_calculus(self):
        r = S.post(f"{BASE_URL}/api/help-agent/ask", json={"question": "derivative of x*sin(x)"}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d.get("reply"), str) and len(d["reply"].strip()) > 0

    def test_ask_paystub_suggests_tour(self):
        r = S.post(f"{BASE_URL}/api/help-agent/ask", json={"question": "how do I see my paystub"}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("suggested_tour") == "view_paystub", f"got: {d.get('suggested_tour')}"
        assert len(d.get("reply", "")) > 0


# ---------- Admin onboarding / role provisioning ----------
class TestRoleProvisioning:
    def test_role_provisioning_list(self):
        r = S.get(f"{BASE_URL}/api/admin/role-provisioning", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "roles" in d and isinstance(d["roles"], list) and len(d["roles"]) > 0
        for role in d["roles"]:
            assert "role" in role
            assert "default_panel" in role
            assert "sidebar_pins" in role and isinstance(role["sidebar_pins"], list)

    def test_create_banquet_chef_auto_fill(self):
        payload = {
            "name": "TEST Banquet Chef iter273",
            "email": f"TEST_bqt_{os.urandom(4).hex()}@example.com",
            "role": "banquet_chef",
        }
        r = S.post(f"{BASE_URL}/api/admin/users", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        u = r.json()
        assert u["default_panel"] == "maestrobqt"
        assert "maestrobqt" in u["sidebar_pins"]
        assert "beo-builder" in u["sidebar_pins"]
        # GET verify persistence via onboarding-bundle
        ob = S.get(f"{BASE_URL}/api/admin/users/{u['user_id']}/onboarding-bundle", timeout=30)
        assert ob.status_code == 200
        bundle = ob.json()
        assert bundle["default_panel"] == "maestrobqt"
        assert "maestrobqt" in bundle["sidebar_pins"]
        # cleanup
        S.delete(f"{BASE_URL}/api/admin/users/{u['user_id']}")

    def test_create_finance_auto_fill(self):
        payload = {
            "name": "TEST Finance iter273",
            "email": f"TEST_fin_{os.urandom(4).hex()}@example.com",
            "role": "finance",
        }
        r = S.post(f"{BASE_URL}/api/admin/users", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        u = r.json()
        assert u["default_panel"] == "echo-aurum"
        S.delete(f"{BASE_URL}/api/admin/users/{u['user_id']}")

    def test_apply_role_defaults_gm(self):
        # create staff user first
        payload = {
            "name": "TEST GM iter273",
            "email": f"TEST_gm_{os.urandom(4).hex()}@example.com",
            "role": "staff",
        }
        r = S.post(f"{BASE_URL}/api/admin/users", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        uid = r.json()["user_id"]
        # apply gm defaults
        r2 = S.post(f"{BASE_URL}/api/admin/users/{uid}/apply-role-defaults", json={"role": "gm"}, timeout=30)
        assert r2.status_code == 200, r2.text
        u = r2.json()
        assert u["default_panel"] == "daily-standup", f"got {u['default_panel']}"
        assert u["role"] == "gm"
        # cleanup
        S.delete(f"{BASE_URL}/api/admin/users/{uid}")

    def test_unknown_role_falls_back_to_staff(self):
        payload = {
            "name": "TEST Unknown iter273",
            "email": f"TEST_unk_{os.urandom(4).hex()}@example.com",
            "role": "made_up_role_xyz",
        }
        r = S.post(f"{BASE_URL}/api/admin/users", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        u = r.json()
        assert u["default_panel"] == "my-schedule", f"got {u['default_panel']}"
        S.delete(f"{BASE_URL}/api/admin/users/{u['user_id']}")


# ---------- Supplier Catalog deep-dive ----------
class TestSupplierCatalogDeepDive:
    def test_price_history_sys001234(self):
        r = S.get(f"{BASE_URL}/api/supplier-catalog/price-history/SYS-001234", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "series" in d and isinstance(d["series"], list)
        assert len(d["series"]) >= 20, f"got {len(d['series'])} points"
        for k in ("low_52w", "high_52w", "avg_52w", "trend_pct"):
            assert k in d
        # current price anchored to last point
        assert d["series"][-1]["price"] == d["current_price"]

    def test_outlet_usage_sys005678(self):
        r = S.get(f"{BASE_URL}/api/supplier-catalog/outlet-usage/SYS-005678", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "outlets" in d
        assert len(d["outlets"]) == 5, f"got {len(d['outlets'])} outlets"
        for o in d["outlets"]:
            assert "rank" in o
            assert "share_pct" in o
            assert "series" in o and isinstance(o["series"], list)
        # ranks 1..5
        ranks = sorted(o["rank"] for o in d["outlets"])
        assert ranks == [1, 2, 3, 4, 5]

    def test_select_vendor_and_persist(self):
        payload = {"sku": "SYS-001234", "supplier_id": "sysco", "note": "TEST iter273"}
        r = S.post(f"{BASE_URL}/api/supplier-catalog/select-vendor", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        sel = r.json()
        assert sel["sku"] == "SYS-001234"
        assert sel["supplier_id"] == "sysco"
        # GET to verify persistence
        r2 = S.get(f"{BASE_URL}/api/supplier-catalog/vendor-selections", timeout=30)
        assert r2.status_code == 200
        d = r2.json()
        skus = [row["sku"] for row in d.get("selections", [])]
        assert "SYS-001234" in skus, f"not persisted; got {skus}"

    def test_price_history_unknown_sku_404(self):
        r = S.get(f"{BASE_URL}/api/supplier-catalog/price-history/BOGUS-XXX", timeout=30)
        assert r.status_code == 404


# ---------- 409A PDF ----------
class TestPDFEvidence:
    def test_pdf_200_and_size(self):
        r = requests.get(f"{BASE_URL}/echoaurion-409a-evidence-pack.pdf", timeout=60, stream=True)
        assert r.status_code == 200, f"status {r.status_code}"
        # prefer Content-Length header; fall back to streamed length
        cl = r.headers.get("Content-Length")
        size = int(cl) if cl else len(r.content)
        assert size > 1_000_000, f"PDF size only {size} bytes"
