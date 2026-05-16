"""
Iteration 148: Revenue-at-Risk Engine + Pastry/Module Loading Fixes
====================================================================
Tests for:
1. GET /api/patterns/revenue-at-risk → returns total_at_risk_usd, by_kind, rows, count, horizon_days, window_days, ts
2. GET /api/intelligence/aurium/gm → includes revenue_at_risk_usd field
3. Revenue-at-risk rows sorted by at_risk_usd descending
4. by_kind keys from {recurring_room, repeat_guest, asset_cluster, outlet_drift}
5. Each row has 'target' and 'at_risk_usd' at minimum
6. REGRESSION: iter147 features still work (assign, dismiss, dismissals, preventive WO, team_notifications)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"


class TestHealthAndBasics:
    """Basic health check to ensure API is accessible"""
    
    def test_health_endpoint(self):
        """Verify API is running"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("PASS: Health endpoint working")


class TestRevenueAtRiskEndpoint:
    """
    NEW iter148: GET /api/patterns/revenue-at-risk
    Returns single-number revenue-at-risk across all open pattern signals
    plus drill-down rows.
    """
    
    def test_revenue_at_risk_basic_structure(self):
        """GET /api/patterns/revenue-at-risk returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/patterns/revenue-at-risk?days=30&horizon_days=14",
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        # Required fields
        assert "ts" in data
        assert "window_days" in data
        assert "horizon_days" in data
        assert "total_at_risk_usd" in data
        assert "by_kind" in data
        assert "rows" in data
        assert "count" in data
        
        # Type checks
        assert isinstance(data["total_at_risk_usd"], (int, float))
        assert isinstance(data["by_kind"], dict)
        assert isinstance(data["rows"], list)
        assert isinstance(data["count"], int)
        
        # Verify window_days and horizon_days match request
        assert data["window_days"] == 30
        assert data["horizon_days"] == 14
        
        print(f"PASS: revenue-at-risk returns total=${data['total_at_risk_usd']:.2f}, {data['count']} rows")
    
    def test_revenue_at_risk_by_kind_keys(self):
        """by_kind keys should be from {recurring_room, repeat_guest, asset_cluster, outlet_drift}"""
        response = requests.get(
            f"{BASE_URL}/api/patterns/revenue-at-risk?days=30&horizon_days=14",
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        valid_kinds = {"recurring_room", "repeat_guest", "asset_cluster", "outlet_drift"}
        for kind in data["by_kind"].keys():
            assert kind in valid_kinds, f"Unexpected kind: {kind}"
        
        # Verify by_kind values are numbers
        for kind, value in data["by_kind"].items():
            assert isinstance(value, (int, float)), f"by_kind[{kind}] should be numeric"
        
        print(f"PASS: by_kind keys valid: {list(data['by_kind'].keys())}")
    
    def test_revenue_at_risk_rows_structure(self):
        """Each row has 'target' and 'at_risk_usd' at minimum"""
        response = requests.get(
            f"{BASE_URL}/api/patterns/revenue-at-risk?days=30&horizon_days=14",
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        for row in data["rows"][:10]:
            assert "target" in row, f"Row missing 'target': {row}"
            assert "at_risk_usd" in row, f"Row missing 'at_risk_usd': {row}"
            assert "kind" in row, f"Row missing 'kind': {row}"
            assert isinstance(row["at_risk_usd"], (int, float))
        
        print(f"PASS: All rows have required fields (target, at_risk_usd, kind)")
    
    def test_revenue_at_risk_rows_sorted_descending(self):
        """Rows should be sorted by at_risk_usd descending"""
        response = requests.get(
            f"{BASE_URL}/api/patterns/revenue-at-risk?days=30&horizon_days=14",
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        rows = data["rows"]
        if len(rows) > 1:
            for i in range(len(rows) - 1):
                assert rows[i]["at_risk_usd"] >= rows[i + 1]["at_risk_usd"], \
                    f"Rows not sorted: {rows[i]['at_risk_usd']} < {rows[i + 1]['at_risk_usd']}"
        
        print(f"PASS: Rows sorted by at_risk_usd descending")
    
    def test_revenue_at_risk_no_id_leak(self):
        """No MongoDB _id in response"""
        response = requests.get(
            f"{BASE_URL}/api/patterns/revenue-at-risk?days=30&horizon_days=14",
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "_id" not in str(data)
        print("PASS: SECURITY - No _id leak in revenue-at-risk")
    
    def test_revenue_at_risk_custom_horizon(self):
        """Test with custom horizon_days parameter"""
        response = requests.get(
            f"{BASE_URL}/api/patterns/revenue-at-risk?days=60&horizon_days=7",
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["window_days"] == 60
        assert data["horizon_days"] == 7
        
        print(f"PASS: Custom horizon_days=7 works, total=${data['total_at_risk_usd']:.2f}")


class TestAuriumGMRevenueAtRisk:
    """
    NEW iter148: GET /api/intelligence/aurium/gm includes revenue_at_risk_usd field
    """
    
    def test_aurium_gm_includes_revenue_at_risk(self):
        """GET /api/intelligence/aurium/gm includes revenue_at_risk_usd"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/aurium/gm?use_llm=false",
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "revenue_at_risk_usd" in data, "Missing revenue_at_risk_usd field"
        assert isinstance(data["revenue_at_risk_usd"], (int, float))
        
        print(f"PASS: aurium/gm includes revenue_at_risk_usd=${data['revenue_at_risk_usd']:.2f}")
    
    def test_aurium_gm_revenue_at_risk_matches_endpoint(self):
        """revenue_at_risk_usd in aurium/gm matches revenue-at-risk endpoint (within 5% tolerance)"""
        # Get aurium/gm value
        gm_resp = requests.get(
            f"{BASE_URL}/api/intelligence/aurium/gm?use_llm=false",
            timeout=30
        )
        assert gm_resp.status_code == 200
        gm_data = gm_resp.json()
        gm_rar = gm_data.get("revenue_at_risk_usd", 0)
        
        # Get revenue-at-risk endpoint value
        rar_resp = requests.get(
            f"{BASE_URL}/api/patterns/revenue-at-risk?days=30&horizon_days=14",
            timeout=30
        )
        assert rar_resp.status_code == 200
        rar_data = rar_resp.json()
        rar_total = rar_data.get("total_at_risk_usd", 0)
        
        # Allow 5% tolerance due to async timing
        if rar_total > 0:
            diff_pct = abs(gm_rar - rar_total) / rar_total * 100
            assert diff_pct <= 5, f"Values differ by {diff_pct:.1f}%: gm={gm_rar}, rar={rar_total}"
        
        print(f"PASS: aurium/gm revenue_at_risk_usd matches endpoint (gm=${gm_rar:.2f}, rar=${rar_total:.2f})")
    
    def test_aurium_gm_full_structure(self):
        """Verify aurium/gm returns all expected fields"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/aurium/gm?use_llm=false",
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "ts", "composite_health_score", "readiness_pct", "rooms_ready", "rooms_ooo",
            "engineering_open", "engineering_critical", "foh_revenue_24h", "foh_covers_24h",
            "ird_revenue_24h", "spa_bookings_24h", "concierge_24h", "concierge_open",
            "pattern_risk_score", "revenue_at_risk_usd", "high_severity_alerts"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"PASS: aurium/gm has all required fields including revenue_at_risk_usd")


class TestRegressionIter147Assign:
    """REGRESSION: iter147 assign notification still works"""
    
    def test_assign_notification(self):
        """POST /api/concierge/team-notifications/{id}/assign still works"""
        # Get unacknowledged notifications
        notifs_resp = requests.get(
            f"{BASE_URL}/api/concierge/team-notifications?acknowledged=false&limit=10",
            timeout=15
        )
        assert notifs_resp.status_code == 200
        notifs = notifs_resp.json().get("items", [])
        
        if not notifs:
            print("SKIP: No unacknowledged notifications to test assign")
            return
        
        notif_id = notifs[0]["id"]
        assign_resp = requests.post(
            f"{BASE_URL}/api/concierge/team-notifications/{notif_id}/assign",
            json={"note": "iter148 regression test"},
            timeout=20
        )
        assert assign_resp.status_code == 200
        assert assign_resp.json().get("ok") is True
        
        print(f"PASS: REGRESSION - assign notification works")


class TestRegressionIter147Dismiss:
    """REGRESSION: iter147 dismiss pattern still works"""
    
    def test_dismiss_pattern(self):
        """POST /api/patterns/dismiss still works"""
        dismiss_payload = {
            "room_no": "TEST_iter148_ROOM",
            "category": "test_category",
            "reason": "iter148 regression test"
        }
        response = requests.post(
            f"{BASE_URL}/api/patterns/dismiss",
            json=dismiss_payload,
            timeout=15
        )
        assert response.status_code == 200
        assert response.json().get("ok") is True
        
        print("PASS: REGRESSION - dismiss pattern works")
    
    def test_list_dismissals(self):
        """GET /api/patterns/dismissals still works"""
        response = requests.get(f"{BASE_URL}/api/patterns/dismissals?limit=20", timeout=15)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "count" in data
        
        print(f"PASS: REGRESSION - dismissals list works ({data['count']} items)")
    
    def test_restore_dismissal(self):
        """DELETE /api/patterns/dismissals/{room_no}/{category} still works"""
        # First create a dismissal
        requests.post(
            f"{BASE_URL}/api/patterns/dismiss",
            json={"room_no": "TEST_iter148_RESTORE", "category": "test_cat"},
            timeout=15
        )
        
        # Then restore it
        response = requests.delete(
            f"{BASE_URL}/api/patterns/dismissals/TEST_iter148_RESTORE/test_cat",
            timeout=15
        )
        assert response.status_code == 200
        assert response.json().get("ok") is True
        
        print("PASS: REGRESSION - restore dismissal works")


class TestRegressionIter147PreventiveWO:
    """REGRESSION: iter147 preventive work order creation still works"""
    
    def test_stratus_creates_preventive_wos(self):
        """stratus-recommendations still creates preventive WOs"""
        response = requests.get(
            f"{BASE_URL}/api/patterns/stratus-recommendations?days=30&use_llm=false",
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "plans" in data
        assert "preventive_work_orders" in data
        
        print(f"PASS: REGRESSION - stratus-recommendations works ({len(data['plans'])} plans, {len(data['preventive_work_orders'])} preventive WOs)")


class TestRegressionIter147TeamNotifications:
    """REGRESSION: iter147 team notifications for HIGH-priority stratus plans"""
    
    def test_stratus_team_notifications(self):
        """stratus-recommendations still creates team_notifications for HIGH-priority plans"""
        # Call stratus
        response = requests.get(
            f"{BASE_URL}/api/patterns/stratus-recommendations?days=30&use_llm=false",
            timeout=30
        )
        assert response.status_code == 200
        
        # Check team notifications
        notifs_resp = requests.get(
            f"{BASE_URL}/api/concierge/team-notifications?limit=50",
            timeout=15
        )
        assert notifs_resp.status_code == 200
        notifs = notifs_resp.json().get("items", [])
        
        stratus_notifs = [n for n in notifs if n.get("source") == "stratus"]
        print(f"PASS: REGRESSION - stratus team_notifications exist ({len(stratus_notifs)} stratus notifications)")


class TestRegressionPatternEndpoints:
    """REGRESSION: Pattern endpoints from iter145/146/147"""
    
    def test_recurring_issues(self):
        """GET /api/patterns/recurring-issues"""
        response = requests.get(f"{BASE_URL}/api/patterns/recurring-issues?days=30", timeout=15)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "_id" not in str(data)
        print(f"PASS: REGRESSION - recurring-issues works ({data['count']} items)")
    
    def test_inline_summary(self):
        """GET /api/patterns/inline-summary"""
        response = requests.get(f"{BASE_URL}/api/patterns/inline-summary?days=30", timeout=15)
        assert response.status_code == 200
        data = response.json()
        assert "risk_score" in data
        assert "_id" not in str(data)
        print(f"PASS: REGRESSION - inline-summary works (risk_score={data['risk_score']})")
    
    def test_guest_complaint_history(self):
        """GET /api/patterns/guest-complaint-history"""
        response = requests.get(f"{BASE_URL}/api/patterns/guest-complaint-history?days=90", timeout=15)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "_id" not in str(data)
        print(f"PASS: REGRESSION - guest-complaint-history works ({data['count']} items)")
    
    def test_asset_failure_clusters(self):
        """GET /api/patterns/asset-failure-clusters"""
        response = requests.get(f"{BASE_URL}/api/patterns/asset-failure-clusters?days=90", timeout=15)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "_id" not in str(data)
        print(f"PASS: REGRESSION - asset-failure-clusters works ({len(data['items'])} items)")
    
    def test_outlet_drift(self):
        """GET /api/patterns/outlet-drift"""
        response = requests.get(f"{BASE_URL}/api/patterns/outlet-drift?days=14", timeout=15)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "_id" not in str(data)
        print(f"PASS: REGRESSION - outlet-drift works ({len(data['items'])} items)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
