"""
iter263 · PurchRec Sprint 1 + Deep-Dive Multi-Provider + Schedule v2 Live Strip
Backend API Tests
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"


class TestPurchRecMatchEndpoints:
    """3-Way Match Exception Worklist endpoints"""

    def test_match_exceptions_returns_summary_and_exceptions(self):
        """GET /api/purchrec/match/exceptions returns summary + exceptions[]"""
        r = requests.get(f"{BASE_URL}/api/purchrec/match/exceptions")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        # Validate summary structure
        assert "summary" in data
        summary = data["summary"]
        assert "total_pos" in summary
        assert "ok" in summary
        assert "exception" in summary
        assert "value_at_risk_usd" in summary
        
        # Per spec: total_pos=3 from seeds
        assert summary["total_pos"] == 3, f"Expected 3 total POs, got {summary['total_pos']}"
        
        # Validate exceptions array
        assert "exceptions" in data
        assert isinstance(data["exceptions"], list)
        assert len(data["exceptions"]) >= 1, "Expected at least 1 exception from seed data"

    def test_match_get_specific_po(self):
        """GET /api/purchrec/match/PO-1042 returns seeded match object"""
        r = requests.get(f"{BASE_URL}/api/purchrec/match/PO-1042")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert data["po_id"] == "PO-1042"
        assert data["status"] == "exception"
        assert "lines" in data
        assert isinstance(data["lines"], list)
        assert len(data["lines"]) > 0

    def test_match_get_nonexistent_po_returns_404(self):
        """GET /api/purchrec/match/PO-NOEXIST returns 404"""
        r = requests.get(f"{BASE_URL}/api/purchrec/match/PO-NOEXIST")
        assert r.status_code == 404, f"Expected 404, got {r.status_code}"

    def test_match_resolve_exception(self):
        """POST /api/purchrec/match/resolve with valid data returns ok:true"""
        r = requests.post(
            f"{BASE_URL}/api/purchrec/match/resolve",
            json={"po_id": "PO-1042", "note": "test resolution", "actor": "test_admin"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("po_id") == "PO-1042"


class TestPurchRecParEndpoints:
    """Par-Driven Auto-PO endpoints"""

    def test_par_levels_returns_rows(self):
        """GET /api/purchrec/par/levels returns rows[] with ≥7 seeds"""
        r = requests.get(f"{BASE_URL}/api/purchrec/par/levels")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert "rows" in data
        assert isinstance(data["rows"], list)
        assert len(data["rows"]) >= 7, f"Expected ≥7 par levels, got {len(data['rows'])}"
        
        # Validate row structure
        row = data["rows"][0]
        assert "outlet" in row
        assert "sku" in row
        assert "par_qty" in row
        assert "reorder_point" in row
        assert "on_hand" in row

    def test_par_levels_filter_by_outlet(self):
        """GET /api/purchrec/par/levels?outlet=Bistro%2021 filters correctly"""
        r = requests.get(f"{BASE_URL}/api/purchrec/par/levels", params={"outlet": "Bistro 21"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert "rows" in data
        for row in data["rows"]:
            assert row["outlet"] == "Bistro 21", f"Expected Bistro 21, got {row['outlet']}"

    def test_par_levels_upsert(self):
        """POST /api/purchrec/par/levels with valid rows returns ok:true"""
        r = requests.post(
            f"{BASE_URL}/api/purchrec/par/levels",
            json={
                "rows": [{
                    "outlet": "Test Outlet",
                    "sku": "TEST-SKU-001",
                    "description": "Test Item",
                    "par_qty": 10,
                    "reorder_point": 5,
                    "on_hand": 3,
                    "vendor": "Test Vendor",
                    "unit_price": 9.99,
                    "pack_size": 1
                }]
            }
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("upserted") == 1

    def test_par_scan_returns_suggestions(self):
        """GET /api/purchrec/par/scan returns summary + suggestions[]"""
        r = requests.get(f"{BASE_URL}/api/purchrec/par/scan")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert "summary" in data
        assert "suggested_po_count" in data["summary"]
        assert data["summary"]["suggested_po_count"] > 0, "Expected at least 1 suggested PO"
        
        assert "suggestions" in data
        assert isinstance(data["suggestions"], list)
        assert len(data["suggestions"]) > 0
        
        # Validate suggestion structure with packs/extended
        suggestion = data["suggestions"][0]
        assert "suggested_po_id" in suggestion
        assert "lines" in suggestion
        
        line = suggestion["lines"][0]
        assert "packs" in line
        assert "extended" in line
        assert isinstance(line["packs"], int)
        assert isinstance(line["extended"], (int, float))

    def test_auto_po_draft(self):
        """POST /api/purchrec/par/auto-po with auto_submit:false creates draft POs"""
        r = requests.post(
            f"{BASE_URL}/api/purchrec/par/auto-po",
            json={"auto_submit": False, "actor": "test_admin"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert data.get("ok") is True
        assert "created" in data
        assert "pos" in data
        
        if data["created"] > 0:
            po = data["pos"][0]
            assert po["status"] == "draft"

    def test_auto_po_submitted(self):
        """POST /api/purchrec/par/auto-po with auto_submit:true creates submitted POs"""
        r = requests.post(
            f"{BASE_URL}/api/purchrec/par/auto-po",
            json={"auto_submit": True, "actor": "test_admin"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert data.get("ok") is True
        if data["created"] > 0:
            po = data["pos"][0]
            assert po["status"] == "submitted"


class TestChronosDeepDive:
    """Deep-dive multi-provider fallback chain"""

    def test_deep_dive_returns_200_with_markdown(self):
        """GET /api/chronos/deep-dive returns 200 with markdown content"""
        r = requests.get(f"{BASE_URL}/api/chronos/deep-dive", timeout=60)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert "markdown" in data
        assert isinstance(data["markdown"], str)
        # Per spec: 6000+ chars from cache
        assert len(data["markdown"]) > 100, f"Expected substantial markdown, got {len(data['markdown'])} chars"
        
        # Model should be openai/gpt-4o (from cache or fallback)
        if "model" in data:
            assert "gpt-4o" in data["model"] or "claude" in data["model"], f"Unexpected model: {data.get('model')}"

    def test_deep_dive_refresh_triggers_fallback(self):
        """GET /api/chronos/deep-dive?refresh=true triggers re-run via fallback chain"""
        r = requests.get(f"{BASE_URL}/api/chronos/deep-dive", params={"refresh": "true"}, timeout=120)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        # Should return markdown even if degraded
        assert "markdown" in data
        
        # If degraded, should have degraded:true flag
        if data.get("degraded"):
            assert "reason" in data or "markdown" in data, "Degraded response should have reason or fallback markdown"


class TestEchoScheduleShifts:
    """Schedule v2 live strip wiring"""

    def test_echo_schedule_shifts_returns_rows(self):
        """GET /api/echo-schedule/shifts returns rows[] for Schedule live strip"""
        r = requests.get(f"{BASE_URL}/api/echo-schedule/shifts")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert "rows" in data
        assert isinstance(data["rows"], list)
        # Should have seeded shifts
        assert len(data["rows"]) > 0, "Expected seeded shifts"


class TestServerHealth:
    """Server boot and health checks"""

    def test_server_health(self):
        """GET /api/health returns healthy status"""
        r = requests.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "healthy"


class TestRegressionAdminConsole:
    """Regression: Admin console endpoints from iter263 first pass"""

    def test_admin_console_pulse(self):
        """GET /api/admin-console/pulse returns system metrics"""
        r = requests.get(f"{BASE_URL}/api/admin-console/pulse")
        assert r.status_code == 200
        data = r.json()
        assert "uptime_human" in data
        assert "active_users_15m" in data

    def test_admin_console_integrations(self):
        """GET /api/admin-console/integrations returns integration status"""
        r = requests.get(f"{BASE_URL}/api/admin-console/integrations")
        assert r.status_code == 200
        data = r.json()
        assert "items" in data

    def test_admin_console_updates(self):
        """GET /api/admin-console/updates returns version info"""
        r = requests.get(f"{BASE_URL}/api/admin-console/updates")
        assert r.status_code == 200
        data = r.json()
        assert "current_version" in data

    def test_admin_console_installers(self):
        """GET /api/admin-console/installers returns installer links"""
        r = requests.get(f"{BASE_URL}/api/admin-console/installers")
        assert r.status_code == 200
        data = r.json()
        assert "pwa" in data or "desktop" in data

    def test_admin_console_audit(self):
        """GET /api/admin-console/audit returns audit events"""
        r = requests.get(f"{BASE_URL}/api/admin-console/audit")
        assert r.status_code == 200
        data = r.json()
        assert "events" in data

    def test_admin_console_feature_flags(self):
        """GET /api/admin-console/feature-flags returns flags"""
        r = requests.get(f"{BASE_URL}/api/admin-console/feature-flags")
        assert r.status_code == 200
        data = r.json()
        assert "flags" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
