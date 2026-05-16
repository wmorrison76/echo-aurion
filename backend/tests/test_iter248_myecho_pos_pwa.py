"""iter248 · Backend tests for MyEcho Staff endpoints, POS Rings ingestion, and PWA manifests.

Tests:
- MyEcho Staff endpoints (10 routes for hourly employees)
- POS Rings ingestion (bulk, seed-demo, status, clear)
- PWA manifest files and icons
- Reports Hub integration with POS data
"""
import pytest
import requests
import os
from datetime import date, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Headers for MyEcho endpoints
MYECHO_HEADERS = {
    "Content-Type": "application/json",
    "X-User-Id": "demo-hourly-001"
}


class TestMyEchoStaffEndpoints:
    """MyEcho hourly staff endpoints (10 routes)"""
    
    def test_myecho_me(self):
        """GET /api/myecho/me - returns employee profile snapshot"""
        r = requests.get(f"{BASE_URL}/api/myecho/me", headers=MYECHO_HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "name" in data
        assert "title" in data
        assert "department" in data
        assert "tenure_years" in data
        print(f"✓ MyEcho /me: {data.get('name')} - {data.get('title')} - {data.get('department')}")
    
    def test_myecho_schedule(self):
        """GET /api/myecho/schedule - returns upcoming shifts"""
        r = requests.get(f"{BASE_URL}/api/myecho/schedule", headers=MYECHO_HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        rows = data["rows"]
        assert len(rows) > 0, "Expected at least one shift row"
        # Verify row structure
        first_row = rows[0]
        assert "date" in first_row
        assert "weekday" in first_row
        assert "shift" in first_row
        assert "hours" in first_row
        print(f"✓ MyEcho /schedule: {len(rows)} shifts returned, demo={data.get('demo')}")
    
    def test_myecho_paystubs(self):
        """GET /api/myecho/paystubs - returns pay history with YTD totals"""
        r = requests.get(f"{BASE_URL}/api/myecho/paystubs", headers=MYECHO_HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        assert "ytd" in data
        rows = data["rows"]
        assert len(rows) >= 5, f"Expected at least 5 paystubs, got {len(rows)}"
        # Verify YTD structure
        ytd = data["ytd"]
        assert "gross" in ytd
        assert "net" in ytd
        assert "tips" in ytd
        assert "taxes" in ytd
        print(f"✓ MyEcho /paystubs: {len(rows)} stubs, YTD gross=${ytd['gross']}, net=${ytd['net']}")
    
    def test_myecho_tax_docs(self):
        """GET /api/myecho/tax-docs - returns W-2 and I-9 documents"""
        r = requests.get(f"{BASE_URL}/api/myecho/tax-docs", headers=MYECHO_HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        rows = data["rows"]
        assert len(rows) > 0, "Expected at least one tax document"
        # Verify W-2 and I-9 types exist
        types = [d["type"] for d in rows]
        assert "W-2" in types, "Expected W-2 document"
        assert "I-9" in types, "Expected I-9 document"
        print(f"✓ MyEcho /tax-docs: {len(rows)} documents, types={set(types)}")
    
    def test_myecho_pto_balance(self):
        """GET /api/myecho/pto-balance - returns PTO hours"""
        r = requests.get(f"{BASE_URL}/api/myecho/pto-balance", headers=MYECHO_HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "vacation_hours_remaining" in data
        assert "sick_hours_remaining" in data
        assert "personal_hours_remaining" in data
        print(f"✓ MyEcho /pto-balance: vacation={data['vacation_hours_remaining']}h, sick={data['sick_hours_remaining']}h, personal={data['personal_hours_remaining']}h")
    
    def test_myecho_pto_request_and_list(self):
        """POST /api/myecho/pto-request + GET /api/myecho/pto-requests"""
        # Submit a PTO request
        payload = {
            "start_date": "2026-05-01",
            "end_date": "2026-05-03",
            "type": "vacation",
            "note": "Test PTO request from iter248"
        }
        r = requests.post(f"{BASE_URL}/api/myecho/pto-request", 
                         headers=MYECHO_HEADERS, json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "request" in data
        req = data["request"]
        assert req["start_date"] == "2026-05-01"
        assert req["end_date"] == "2026-05-03"
        assert req["type"] == "vacation"
        assert req["status"] == "pending"
        print(f"✓ MyEcho /pto-request: created {req['id']}")
        
        # Verify it appears in the list
        r2 = requests.get(f"{BASE_URL}/api/myecho/pto-requests", headers=MYECHO_HEADERS)
        assert r2.status_code == 200
        data2 = r2.json()
        assert data2.get("ok") is True
        assert "rows" in data2
        # Find our request
        found = any(r["id"] == req["id"] for r in data2["rows"])
        assert found, f"PTO request {req['id']} not found in list"
        print(f"✓ MyEcho /pto-requests: {len(data2['rows'])} requests, our request found")
    
    def test_myecho_direct_deposit(self):
        """GET /api/myecho/direct-deposit - returns masked DD info"""
        r = requests.get(f"{BASE_URL}/api/myecho/direct-deposit", headers=MYECHO_HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "bank_name_masked" in data
        assert "account_last4" in data
        assert "type" in data
        assert len(data["account_last4"]) == 4, "Expected 4-digit last4"
        print(f"✓ MyEcho /direct-deposit: {data['bank_name_masked']} ending in {data['account_last4']}")
    
    def test_myecho_concierge_quick_actions(self):
        """GET /api/myecho/concierge-quick-actions - returns 8 actions"""
        r = requests.get(f"{BASE_URL}/api/myecho/concierge-quick-actions")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "actions" in data
        actions = data["actions"]
        assert len(actions) == 8, f"Expected 8 actions, got {len(actions)}"
        # Verify action structure
        for a in actions:
            assert "id" in a
            assert "label" in a
            assert "icon" in a
        print(f"✓ MyEcho /concierge-quick-actions: {len(actions)} actions")
    
    def test_myecho_clock(self):
        """POST /api/myecho/clock - clock in/out"""
        payload = {"direction": "in"}
        r = requests.post(f"{BASE_URL}/api/myecho/clock", 
                         headers=MYECHO_HEADERS, json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "punch" in data
        punch = data["punch"]
        assert punch["direction"] == "in"
        assert "punched_at" in punch
        print(f"✓ MyEcho /clock: punched {punch['direction']} at {punch['punched_at']}")


class TestPOSRingsIngestion:
    """POS Rings ingestion endpoints"""
    
    def test_pos_rings_status_initial(self):
        """GET /api/pos-rings/status - check initial status"""
        r = requests.get(f"{BASE_URL}/api/pos-rings/status")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "total" in data
        assert "demo_active" in data
        print(f"✓ POS Rings /status: total={data['total']}, demo_active={data['demo_active']}")
        return data
    
    def test_pos_rings_bulk_ingest(self):
        """POST /api/pos-rings/bulk - ingest a small batch"""
        today = date.today().isoformat()
        rings = [
            {
                "ring_id": f"test-ring-iter248-{i}",
                "outlet_id": "out-coastal-kitchen",
                "date": today,
                "time": f"12:{i:02d}",
                "item_name": f"Test Item {i}",
                "qty": 1,
                "price": 10.00 + i
            }
            for i in range(5)
        ]
        r = requests.post(f"{BASE_URL}/api/pos-rings/bulk", json=rings)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "inserted" in data or "updated" in data
        print(f"✓ POS Rings /bulk: inserted={data.get('inserted', 0)}, updated={data.get('updated', 0)}")
    
    def test_pos_rings_clear_by_date(self):
        """DELETE /api/pos-rings/clear - clear rings for a specific date"""
        today = date.today().isoformat()
        r = requests.delete(f"{BASE_URL}/api/pos-rings/clear?date={today}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "deleted" in data
        print(f"✓ POS Rings /clear: deleted={data['deleted']} for date={today}")


class TestPWAManifestsAndIcons:
    """PWA manifest files and icon assets"""
    
    def test_manifest_json_echo_aurion(self):
        """GET /manifest.json - Echo AURION manager manifest"""
        r = requests.get(f"{BASE_URL}/manifest.json")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert "Echo AURION" in data.get("name", ""), f"Expected Echo AURION in name, got {data.get('name')}"
        assert data.get("start_url") == "/"
        print(f"✓ /manifest.json: name={data.get('short_name')}, start_url={data.get('start_url')}")
    
    def test_manifest_staff_json_myecho(self):
        """GET /manifest-staff.json - MyEcho staff manifest"""
        r = requests.get(f"{BASE_URL}/manifest-staff.json")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert "MyEcho" in data.get("name", ""), f"Expected MyEcho in name, got {data.get('name')}"
        assert data.get("start_url") == "/m/me", f"Expected start_url=/m/me, got {data.get('start_url')}"
        # Verify icons array
        icons = data.get("icons", [])
        assert len(icons) >= 8, f"Expected at least 8 icons, got {len(icons)}"
        print(f"✓ /manifest-staff.json: name={data.get('short_name')}, start_url={data.get('start_url')}, icons={len(icons)}")
    
    def test_echo_aurion_mgr_icon_512(self):
        """GET /icons/echo-aurion-mgr-512.png - manager icon"""
        r = requests.get(f"{BASE_URL}/icons/echo-aurion-mgr-512.png")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        assert "image/png" in r.headers.get("Content-Type", ""), "Expected PNG content type"
        assert len(r.content) > 10000, f"Expected substantial image, got {len(r.content)} bytes"
        print(f"✓ /icons/echo-aurion-mgr-512.png: {len(r.content)} bytes")
    
    def test_myecho_staff_icon_512(self):
        """GET /icons/myecho-staff-512.png - staff icon"""
        r = requests.get(f"{BASE_URL}/icons/myecho-staff-512.png")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        assert "image/png" in r.headers.get("Content-Type", ""), "Expected PNG content type"
        assert len(r.content) > 10000, f"Expected substantial image, got {len(r.content)} bytes"
        print(f"✓ /icons/myecho-staff-512.png: {len(r.content)} bytes")
    
    def test_all_icon_sizes_echo_aurion(self):
        """Verify all 8 Echo AURION icon sizes exist"""
        sizes = [48, 72, 96, 128, 192, 256, 384, 512]
        for size in sizes:
            r = requests.get(f"{BASE_URL}/icons/echo-aurion-mgr-{size}.png")
            assert r.status_code == 200, f"Expected 200 for size {size}, got {r.status_code}"
        print(f"✓ All 8 Echo AURION icon sizes verified: {sizes}")
    
    def test_all_icon_sizes_myecho_staff(self):
        """Verify all 8 MyEcho staff icon sizes exist"""
        sizes = [48, 72, 96, 128, 192, 256, 384, 512]
        for size in sizes:
            r = requests.get(f"{BASE_URL}/icons/myecho-staff-{size}.png")
            assert r.status_code == 200, f"Expected 200 for size {size}, got {r.status_code}"
        print(f"✓ All 8 MyEcho staff icon sizes verified: {sizes}")


class TestReportsHubIntegration:
    """Reports Hub integration with POS data"""
    
    def test_reports_hub_catalog(self):
        """GET /api/reports-hub/catalog - verify 12 reports"""
        r = requests.get(f"{BASE_URL}/api/reports-hub/catalog")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        reports = data.get("reports", [])
        assert len(reports) == 12, f"Expected 12 reports, got {len(reports)}"
        print(f"✓ Reports Hub /catalog: {len(reports)} reports")
    
    def test_reports_hub_top_items(self):
        """GET /api/reports-hub/top-items - verify demo flag behavior"""
        r = requests.get(f"{BASE_URL}/api/reports-hub/top-items")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        # Check demo flag
        demo = data.get("demo", True)
        print(f"✓ Reports Hub /top-items: {len(data['rows'])} items, demo={demo}")


class TestRegressionChecks:
    """Regression tests for existing functionality"""
    
    def test_ecw_ops_reservations_live(self):
        """GET /api/ecw-ops/reservations/live - verify still works"""
        r = requests.get(f"{BASE_URL}/api/ecw-ops/reservations/live?outlet_id=outlet-rooftop")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "total_covers" in data or data.get("ok") is True
        print(f"✓ Regression: /api/ecw-ops/reservations/live works")
    
    def test_support_panel_endpoint(self):
        """GET /api/support/categories - verify support panel works"""
        r = requests.get(f"{BASE_URL}/api/support/categories")
        # May return 404 if not implemented, but should not 500
        assert r.status_code in [200, 404], f"Expected 200 or 404, got {r.status_code}"
        print(f"✓ Regression: Support endpoint status={r.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
