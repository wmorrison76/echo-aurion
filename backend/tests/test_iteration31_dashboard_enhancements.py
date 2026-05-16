"""
Iteration 31 - Dashboard Enhancements Tests
============================================
Tests for:
1. Dashboard command-center labor.breakdown with 7 segments
2. Dashboard command-center pos.top_items with 8+ seeded items
3. Dashboard command-center date_from/date_to query params
4. System health showing 14 engines
5. Knowledge Engine returning 14 domains
6. Scenario Planner throughput analysis and staffing
7. Share link creation and viewing
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("PASS: Health check")


class TestDashboardCommandCenter:
    """Dashboard command-center endpoint tests"""
    
    def test_command_center_returns_data(self):
        """Basic command-center endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200
        data = response.json()
        assert "operations" in data
        assert "pos" in data
        assert "labor" in data
        assert "system_health" in data
        print("PASS: Command center returns data")
    
    def test_labor_breakdown_has_7_segments(self):
        """Labor breakdown should have 7 department segments"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200
        data = response.json()
        
        labor = data.get("labor", {})
        breakdown = labor.get("breakdown", {})
        
        # Check all 7 segments exist
        expected_segments = [
            "foh_servers", "foh_bartenders", "foh_hosts",
            "boh_cooks", "boh_prep", "boh_dish", "management"
        ]
        
        for segment in expected_segments:
            assert segment in breakdown, f"Missing segment: {segment}"
            assert isinstance(breakdown[segment], (int, float)), f"Segment {segment} should be numeric"
        
        print(f"PASS: Labor breakdown has all 7 segments: {list(breakdown.keys())}")
    
    def test_pos_top_items_has_8_items(self):
        """POS top_items should have at least 8 seeded items"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200
        data = response.json()
        
        pos = data.get("pos", {})
        top_items = pos.get("top_items", [])
        
        assert len(top_items) >= 8, f"Expected at least 8 top items, got {len(top_items)}"
        
        # Verify item structure
        for item in top_items[:3]:
            assert "name" in item, "Item should have name"
            assert "quantity" in item or "qty_sold" in item, "Item should have quantity"
        
        print(f"PASS: POS top_items has {len(top_items)} items")
        for i, item in enumerate(top_items[:5]):
            print(f"  #{i+1}: {item.get('name')} - qty: {item.get('quantity', item.get('qty_sold'))}")
    
    def test_system_health_shows_14_engines(self):
        """System health should show 14/14 engines active"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200
        data = response.json()
        
        system_health = data.get("system_health", {})
        engines_active = system_health.get("engines_active", 0)
        engines_total = system_health.get("engines_total", 0)
        
        assert engines_active == 14, f"Expected 14 engines active, got {engines_active}"
        assert engines_total == 14, f"Expected 14 engines total, got {engines_total}"
        
        print(f"PASS: System health shows {engines_active}/{engines_total} engines")
    
    def test_date_range_params_accepted(self):
        """Command center accepts date_from and date_to query params"""
        from datetime import datetime, timedelta
        
        today = datetime.now().strftime("%Y-%m-%d")
        week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/enterprise/command-center",
            params={"date_from": week_ago, "date_to": today}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check that date_range is reflected in response
        pos = data.get("pos", {})
        date_range = pos.get("date_range")
        
        # The endpoint should accept the params (even if not filtering data)
        assert "pos" in data
        print(f"PASS: Date range params accepted (from={week_ago}, to={today})")
        if date_range:
            print(f"  Response date_range: {date_range}")


class TestKnowledgeEngine:
    """Knowledge Engine domain tests"""
    
    def test_domains_returns_14(self):
        """Knowledge Engine should return 14 domains"""
        response = requests.get(f"{BASE_URL}/api/knowledge-engine/domains")
        assert response.status_code == 200
        data = response.json()
        
        domains = data.get("domains", [])
        assert len(domains) == 14, f"Expected 14 domains, got {len(domains)}"
        
        domain_ids = [d.get("domain_id") for d in domains]
        print(f"PASS: Knowledge Engine returns 14 domains")
        print(f"  Domains: {domain_ids}")
        
        # Verify key domains exist
        expected_domains = ["timeline_throughput", "cafeteria_dining"]
        for expected in expected_domains:
            assert expected in domain_ids, f"Missing domain: {expected}"
        print(f"  Verified: {expected_domains}")


class TestScenarioPlannerThroughput:
    """Scenario Planner throughput analysis tests"""
    
    def test_build_scenario_returns_throughput_analysis(self):
        """Build scenario should return throughput_analysis"""
        payload = {
            "name": "TEST_ITER31_Throughput",
            "event_type": "wedding",
            "service_style": "buffet",
            "guest_count": 150,
            "tier": "signature"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/scenario-planner/build-scenario",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check throughput_analysis exists
        throughput = data.get("throughput_analysis", {})
        assert throughput, "Missing throughput_analysis"
        
        # Verify key fields
        expected_fields = [
            "est_clear_minutes", "dish_pit_racks", "timeline_feasible"
        ]
        for field in expected_fields:
            assert field in throughput, f"Missing throughput field: {field}"
        
        print(f"PASS: Throughput analysis returned")
        print(f"  est_clear_minutes: {throughput.get('est_clear_minutes')}")
        print(f"  dish_pit_racks: {throughput.get('dish_pit_racks')}")
        print(f"  timeline_feasible: {throughput.get('timeline_feasible')}")
    
    def test_build_scenario_returns_staffing_breakdown(self):
        """Build scenario should return staffing with captains, bussers, station_staff"""
        payload = {
            "name": "TEST_ITER31_Staffing",
            "event_type": "wedding",
            "service_style": "buffet",
            "guest_count": 200,
            "tier": "signature"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/scenario-planner/build-scenario",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        staffing = data.get("staffing_estimate", {})
        assert staffing, "Missing staffing_estimate"
        
        # Verify enhanced staffing fields
        expected_fields = ["captains", "bussers", "station_staff"]
        for field in expected_fields:
            assert field in staffing, f"Missing staffing field: {field}"
            assert isinstance(staffing[field], (int, float)), f"Staffing {field} should be numeric"
        
        print(f"PASS: Staffing breakdown returned")
        print(f"  captains: {staffing.get('captains')}")
        print(f"  bussers: {staffing.get('bussers')}")
        print(f"  station_staff: {staffing.get('station_staff')}")
        print(f"  foh: {staffing.get('foh')}, boh: {staffing.get('boh')}")


class TestShareLinks:
    """Client Portal share link tests"""
    
    @pytest.fixture
    def test_lead_id(self):
        """Create a test lead and return its ID"""
        payload = {
            "prospect": {
                "first_name": "TEST_ITER31",
                "last_name": "ShareTest",
                "email": "test_iter31_share@example.com",
                "phone": "555-123-4567"
            },
            "event": {
                "event_type": "wedding",
                "guest_count": 100,
                "service_style": "buffet",
                "tier": "classic"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/portal/submit-lead",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("lead_id")
    
    def test_create_share_link(self, test_lead_id):
        """POST /api/portal/share-link/{lead_id} creates shareable link token"""
        response = requests.post(f"{BASE_URL}/api/portal/share-link/{test_lead_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert "share_token" in data, "Missing share_token"
        assert "share_url" in data, "Missing share_url"
        assert "lead_id" in data, "Missing lead_id"
        
        print(f"PASS: Share link created")
        print(f"  share_token: {data.get('share_token')}")
        print(f"  share_url: {data.get('share_url')}")
        
        return data.get("share_token")
    
    def test_view_shared_estimate(self, test_lead_id):
        """GET /api/portal/shared/{token} returns estimate and increments views"""
        # First create a share link
        create_resp = requests.post(f"{BASE_URL}/api/portal/share-link/{test_lead_id}")
        assert create_resp.status_code == 200
        share_token = create_resp.json().get("share_token")
        
        # View the shared estimate
        response = requests.get(f"{BASE_URL}/api/portal/shared/{share_token}")
        assert response.status_code == 200
        data = response.json()
        
        assert "estimate" in data, "Missing estimate"
        assert "event" in data, "Missing event"
        assert "views" in data, "Missing views"
        
        views_1 = data.get("views", 0)
        
        # View again to check increment
        response2 = requests.get(f"{BASE_URL}/api/portal/shared/{share_token}")
        assert response2.status_code == 200
        views_2 = response2.json().get("views", 0)
        
        assert views_2 > views_1, f"Views should increment: {views_1} -> {views_2}"
        
        print(f"PASS: Shared estimate viewed and views incremented ({views_1} -> {views_2})")


class TestLaborBreakdownValues:
    """Verify labor breakdown values are calculated correctly"""
    
    def test_labor_breakdown_sums_to_total(self):
        """Labor breakdown segments should sum close to total_cost"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200
        data = response.json()
        
        labor = data.get("labor", {})
        breakdown = labor.get("breakdown", {})
        total_cost = labor.get("total_cost", 0)
        
        if total_cost > 0:
            breakdown_sum = sum(breakdown.values())
            # Allow small rounding difference
            diff = abs(breakdown_sum - total_cost)
            assert diff < 1, f"Breakdown sum {breakdown_sum} should equal total_cost {total_cost}"
            print(f"PASS: Labor breakdown sums correctly ({breakdown_sum} ~ {total_cost})")
        else:
            print("SKIP: No labor cost data to verify")


class TestDateRangePresets:
    """Test date range preset functionality"""
    
    def test_today_date_range(self):
        """Test Today date range"""
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/enterprise/command-center",
            params={"date_from": today, "date_to": today}
        )
        assert response.status_code == 200
        print(f"PASS: Today date range works ({today})")
    
    def test_7d_date_range(self):
        """Test 7-day date range"""
        from datetime import datetime, timedelta
        today = datetime.now().strftime("%Y-%m-%d")
        week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/enterprise/command-center",
            params={"date_from": week_ago, "date_to": today}
        )
        assert response.status_code == 200
        print(f"PASS: 7d date range works ({week_ago} to {today})")
    
    def test_30d_date_range(self):
        """Test 30-day date range"""
        from datetime import datetime, timedelta
        today = datetime.now().strftime("%Y-%m-%d")
        month_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/enterprise/command-center",
            params={"date_from": month_ago, "date_to": today}
        )
        assert response.status_code == 200
        print(f"PASS: 30d date range works ({month_ago} to {today})")
    
    def test_mtd_date_range(self):
        """Test Month-to-Date date range"""
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        month_start = datetime.now().replace(day=1).strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/enterprise/command-center",
            params={"date_from": month_start, "date_to": today}
        )
        assert response.status_code == 200
        print(f"PASS: MTD date range works ({month_start} to {today})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
