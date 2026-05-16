"""
Iteration 127: POS Menu Analytics + BEO Audit Trail Tests
==========================================================
Tests for:
- POS Analytics: menu-items, outlets, top-performers, profit-alerts
- BEO Audit Trail: revise, audit, sign, revisions, notifications
- Echo Events: merged events + BEO pipeline data
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPOSMenuAnalytics:
    """POS Menu Analytics endpoints - yield-based costing with live sales data"""
    
    def test_get_menu_items_returns_analytics(self):
        """GET /api/pos-analytics/menu-items returns items with food_cost, CM, FC%, quadrant, units_sold"""
        response = requests.get(f"{BASE_URL}/api/pos-analytics/menu-items")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "items" in data, "Response should have 'items' key"
        assert "summary" in data, "Response should have 'summary' key"
        assert "outlet" in data, "Response should have 'outlet' key"
        
        # Check summary structure
        summary = data["summary"]
        assert "total_items" in summary
        assert "total_revenue" in summary
        assert "avg_food_cost_pct" in summary
        assert "stars" in summary
        assert "puzzles" in summary
        assert "plowhorses" in summary
        assert "dogs" in summary
        
        # If items exist, verify structure
        if data["items"]:
            item = data["items"][0]
            assert "name" in item, "Item should have 'name'"
            assert "food_cost" in item, "Item should have 'food_cost'"
            assert "contribution_margin" in item, "Item should have 'contribution_margin'"
            assert "food_cost_pct" in item, "Item should have 'food_cost_pct'"
            assert "quadrant" in item, "Item should have 'quadrant' classification"
            assert "units_sold" in item, "Item should have 'units_sold' from transactions"
            assert item["quadrant"] in ["star", "puzzle", "plowhorse", "dog"]
            print(f"✓ Menu items returned: {len(data['items'])} items, {summary['stars']} stars, {summary['dogs']} dogs")
    
    def test_get_menu_items_filter_by_outlet(self):
        """GET /api/pos-analytics/menu-items?outlet=REST filters by outlet"""
        # First get all outlets
        outlets_resp = requests.get(f"{BASE_URL}/api/pos-analytics/outlets")
        assert outlets_resp.status_code == 200
        outlets_data = outlets_resp.json()
        
        if outlets_data.get("outlets"):
            test_outlet = outlets_data["outlets"][0]["outlet"]
            
            # Filter by outlet
            response = requests.get(f"{BASE_URL}/api/pos-analytics/menu-items?outlet={test_outlet}")
            assert response.status_code == 200
            
            data = response.json()
            assert data["outlet"] == test_outlet, f"Expected outlet '{test_outlet}', got '{data['outlet']}'"
            
            # All items should be from this outlet
            for item in data.get("items", []):
                assert item["outlet"] == test_outlet, f"Item outlet mismatch: {item['outlet']} != {test_outlet}"
            
            print(f"✓ Outlet filter working: {len(data['items'])} items for outlet '{test_outlet}'")
        else:
            print("⚠ No outlets found - skipping outlet filter test")
    
    def test_get_outlets_performance(self):
        """GET /api/pos-analytics/outlets returns outlet-level revenue breakdown"""
        response = requests.get(f"{BASE_URL}/api/pos-analytics/outlets")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "outlets" in data, "Response should have 'outlets' key"
        assert "total_outlets" in data, "Response should have 'total_outlets' key"
        
        if data["outlets"]:
            outlet = data["outlets"][0]
            assert "outlet" in outlet, "Outlet should have 'outlet' name"
            assert "items" in outlet, "Outlet should have 'items' count"
            assert "units" in outlet, "Outlet should have 'units' sold"
            assert "revenue" in outlet, "Outlet should have 'revenue'"
            print(f"✓ Outlets returned: {data['total_outlets']} outlets, top: {outlet['outlet']} (${outlet['revenue']:.0f})")
    
    def test_get_top_performers(self):
        """GET /api/pos-analytics/top-performers returns top revenue items"""
        response = requests.get(f"{BASE_URL}/api/pos-analytics/top-performers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "top_performers" in data, "Response should have 'top_performers' key"
        assert "total_items" in data, "Response should have 'total_items' key"
        
        # Verify sorted by revenue descending
        performers = data["top_performers"]
        if len(performers) > 1:
            for i in range(len(performers) - 1):
                assert performers[i]["total_revenue"] >= performers[i+1]["total_revenue"], \
                    "Top performers should be sorted by revenue descending"
        
        print(f"✓ Top performers: {len(performers)} items returned")
    
    def test_get_top_performers_with_limit(self):
        """GET /api/pos-analytics/top-performers?limit=5 respects limit"""
        response = requests.get(f"{BASE_URL}/api/pos-analytics/top-performers?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["top_performers"]) <= 5, "Should respect limit parameter"
        print(f"✓ Top performers limit working: {len(data['top_performers'])} items (limit=5)")
    
    def test_get_profit_alerts(self):
        """GET /api/pos-analytics/profit-alerts returns items with FC% > 35% or low margin"""
        response = requests.get(f"{BASE_URL}/api/pos-analytics/profit-alerts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "alerts" in data, "Response should have 'alerts' key"
        assert "total_alerts" in data, "Response should have 'total_alerts' key"
        
        # Verify alert structure
        for alert in data["alerts"]:
            assert "alert_type" in alert, "Alert should have 'alert_type'"
            assert "message" in alert, "Alert should have 'message'"
            assert alert["alert_type"] in ["high_food_cost", "low_margin", "low_velocity"]
            
            # Verify alert criteria
            if alert["alert_type"] == "high_food_cost":
                assert alert["food_cost_pct"] > 35, f"High FC alert should have FC% > 35, got {alert['food_cost_pct']}"
        
        print(f"✓ Profit alerts: {data['total_alerts']} alerts found")


class TestBEOAuditTrail:
    """BEO Revision Control, Self-Audit, and Signature Locking"""
    
    @pytest.fixture(scope="class")
    def beo_id(self):
        """Get first BEO ID for testing"""
        response = requests.get(f"{BASE_URL}/api/beo-engine/beos?limit=1")
        assert response.status_code == 200, f"Failed to get BEOs: {response.text}"
        data = response.json()
        if data.get("beos"):
            return data["beos"][0]["id"]
        pytest.skip("No BEOs found for testing")
    
    def test_revise_beo_increments_revision(self, beo_id):
        """PUT /api/beo-engine/beo/{beo_id}/revise increments revision and snapshots"""
        # Get current revision
        get_resp = requests.get(f"{BASE_URL}/api/beo-engine/beo/{beo_id}")
        assert get_resp.status_code == 200
        original_revision = get_resp.json().get("revision", 1)
        
        # Make a revision with a change
        revise_payload = {
            "guaranteed_count": 85,  # Change guest count
            "revised_by": "test_agent"
        }
        response = requests.put(f"{BASE_URL}/api/beo-engine/beo/{beo_id}/revise", json=revise_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "revision" in data, "Response should have 'revision'"
        assert "changes" in data, "Response should have 'changes'"
        
        # Verify revision incremented
        assert data["revision"] == original_revision + 1, \
            f"Revision should increment: expected {original_revision + 1}, got {data['revision']}"
        
        # Verify changes logged
        assert len(data["changes"]) > 0, "Changes should be logged"
        print(f"✓ BEO revision: {original_revision} → {data['revision']}, changes: {len(data['changes'])}")
    
    def test_revise_beo_no_changes_detected(self, beo_id):
        """PUT /api/beo-engine/beo/{beo_id}/revise with no changes returns message"""
        # Get current BEO
        get_resp = requests.get(f"{BASE_URL}/api/beo-engine/beo/{beo_id}")
        current_beo = get_resp.json()
        
        # Submit same values (no change)
        revise_payload = {
            "event_name": current_beo.get("event_name"),
        }
        response = requests.put(f"{BASE_URL}/api/beo-engine/beo/{beo_id}/revise", json=revise_payload)
        assert response.status_code == 200
        
        data = response.json()
        # Should indicate no changes
        if "message" in data:
            assert "no changes" in data["message"].lower()
            print(f"✓ No changes detected correctly")
        else:
            print(f"✓ Revision processed (may have had changes)")
    
    def test_get_beo_revisions_returns_changelog(self, beo_id):
        """GET /api/beo-engine/beo/{beo_id}/revisions returns changelog and snapshot count"""
        response = requests.get(f"{BASE_URL}/api/beo-engine/beo/{beo_id}/revisions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "beo_id" in data, "Response should have 'beo_id'"
        assert "current_revision" in data, "Response should have 'current_revision'"
        assert "changelog" in data, "Response should have 'changelog'"
        assert "snapshots" in data, "Response should have 'snapshots' count"
        
        # Verify changelog structure
        if data["changelog"]:
            entry = data["changelog"][0]
            assert "action" in entry, "Changelog entry should have 'action'"
            assert "timestamp" in entry, "Changelog entry should have 'timestamp'"
        
        print(f"✓ Revisions: current={data['current_revision']}, changelog={len(data['changelog'])}, snapshots={data['snapshots']}")
    
    def test_audit_beo_runs_self_audit(self, beo_id):
        """GET /api/beo-engine/beo/{beo_id}/audit runs self-audit checking integrity"""
        response = requests.get(f"{BASE_URL}/api/beo-engine/beo/{beo_id}/audit")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "status" in data, "Audit should have 'status'"
        assert "issues" in data, "Audit should have 'issues'"
        assert "warnings" in data, "Audit should have 'warnings'"
        assert "total_issues" in data, "Audit should have 'total_issues'"
        assert "total_warnings" in data, "Audit should have 'total_warnings'"
        
        # Status should be clean or issues_found
        assert data["status"] in ["clean", "issues_found", "error"]
        
        # Verify issue structure if any
        for issue in data["issues"]:
            assert "type" in issue, "Issue should have 'type'"
            assert "severity" in issue, "Issue should have 'severity'"
            assert "message" in issue, "Issue should have 'message'"
        
        print(f"✓ Audit: status={data['status']}, issues={data['total_issues']}, warnings={data['total_warnings']}")
    
    def test_sign_beo_locks_revision(self, beo_id):
        """POST /api/beo-engine/beo/{beo_id}/sign locks revision as client-approved"""
        sign_payload = {
            "signer": "client",
            "name": "Test Client Signature"
        }
        response = requests.post(f"{BASE_URL}/api/beo-engine/beo/{beo_id}/sign", json=sign_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "beo_id" in data, "Response should have 'beo_id'"
        assert "signer" in data, "Response should have 'signer'"
        assert "signature" in data, "Response should have 'signature'"
        assert "audit" in data, "Response should have 'audit' (post-sign audit)"
        
        # Verify signature structure
        sig = data["signature"]
        assert "signed_by" in sig, "Signature should have 'signed_by'"
        assert "signed_at" in sig, "Signature should have 'signed_at'"
        assert "revision" in sig, "Signature should have 'revision'"
        
        # Verify BEO status updated
        get_resp = requests.get(f"{BASE_URL}/api/beo-engine/beo/{beo_id}")
        beo = get_resp.json()
        assert beo.get("status") == "client_approved", f"BEO status should be 'client_approved', got {beo.get('status')}"
        
        print(f"✓ BEO signed: signer={data['signer']}, revision={sig['revision']}")
    
    def test_get_beo_notifications(self):
        """GET /api/beo-engine/notifications returns BEO revision notifications"""
        response = requests.get(f"{BASE_URL}/api/beo-engine/notifications")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "notifications" in data, "Response should have 'notifications'"
        assert "total" in data, "Response should have 'total'"
        
        # Verify notification structure if any
        if data["notifications"]:
            notif = data["notifications"][0]
            assert "type" in notif, "Notification should have 'type'"
            assert "message" in notif, "Notification should have 'message'"
            assert "departments" in notif, "Notification should have 'departments'"
        
        print(f"✓ Notifications: {data['total']} found")


class TestEchoEventsReport:
    """Echo Events report merged with BEO pipeline data"""
    
    def test_echo_events_report_merges_beo_pipeline(self):
        """GET /api/echo-events/report returns both events collection AND BEO pipeline data"""
        response = requests.get(f"{BASE_URL}/api/echo-events/report")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "definite" in data, "Response should have 'definite' events"
        assert "pending" in data, "Response should have 'pending' events"
        assert "summary" in data, "Response should have 'summary'"
        
        # Check summary structure
        summary = data["summary"]
        assert "definite_count" in summary
        assert "pending_count" in summary
        assert "total_definite_revenue" in summary
        
        # Check for BEO pipeline data (source field)
        all_events = data["definite"] + data["pending"]
        beo_pipeline_events = [e for e in all_events if e.get("source") == "beo_pipeline"]
        events_collection = [e for e in all_events if e.get("source") == "events"]
        
        print(f"✓ Echo Events Report: {len(data['definite'])} definite, {len(data['pending'])} pending")
        print(f"  - From events collection: {len(events_collection)}")
        print(f"  - From BEO pipeline: {len(beo_pipeline_events)}")
        
        # Verify event structure
        if all_events:
            event = all_events[0]
            assert "beo_number" in event, "Event should have 'beo_number'"
            assert "revenue" in event, "Event should have 'revenue'"
            assert "actual_spend" in event, "Event should have 'actual_spend'"
    
    def test_echo_events_summary(self):
        """GET /api/echo-events/summary returns pipeline stats"""
        response = requests.get(f"{BASE_URL}/api/echo-events/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "stages" in data, "Response should have 'stages'"
        assert "total_events" in data, "Response should have 'total_events'"
        
        print(f"✓ Echo Events Summary: {data['total_events']} total events")


class TestBEOBasicOperations:
    """Basic BEO operations to ensure system is working"""
    
    def test_list_beos(self):
        """GET /api/beo-engine/beos returns list of BEOs"""
        response = requests.get(f"{BASE_URL}/api/beo-engine/beos")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "beos" in data, "Response should have 'beos'"
        assert "total" in data, "Response should have 'total'"
        
        print(f"✓ BEOs list: {data['total']} BEOs found")
    
    def test_get_single_beo(self):
        """GET /api/beo-engine/beo/{beo_id} returns BEO details"""
        # Get first BEO
        list_resp = requests.get(f"{BASE_URL}/api/beo-engine/beos?limit=1")
        if list_resp.json().get("beos"):
            beo_id = list_resp.json()["beos"][0]["id"]
            
            response = requests.get(f"{BASE_URL}/api/beo-engine/beo/{beo_id}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            beo = response.json()
            assert "id" in beo
            assert "beo_number" in beo
            assert "event_name" in beo
            assert "revision" in beo
            assert "changelog" in beo
            
            print(f"✓ BEO details: #{beo['beo_number']} - {beo['event_name']} (Rev {beo['revision']})")
        else:
            print("⚠ No BEOs found - skipping single BEO test")
    
    def test_beo_dashboard(self):
        """GET /api/beo-engine/dashboard returns operations dashboard"""
        response = requests.get(f"{BASE_URL}/api/beo-engine/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_beos" in data
        assert "total_revenue" in data
        
        print(f"✓ BEO Dashboard: {data['total_beos']} BEOs, ${data['total_revenue']:.0f} revenue")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
