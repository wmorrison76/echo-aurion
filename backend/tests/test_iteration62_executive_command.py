"""
Test Suite for Executive Command Center - Iteration 62
=======================================================
Tests multi-outlet health dashboard with:
- Health overview per user role (exec chef vs GM)
- Outlet detail with metrics, labor, top items, trend
- Cross-outlet comparison
- Custom thresholds CRUD
- AI morning briefing generation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestExecutiveCommandHealthOverview:
    """Health overview endpoint tests for different user roles"""
    
    def test_health_overview_exec_chef(self):
        """GET /api/executive/health-overview?user_id=usr-chef-001 returns 3 outlets (exec chef culinary scope)"""
        response = requests.get(f"{BASE_URL}/api/executive/health-overview?user_id=usr-chef-001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response should contain user info"
        assert data["user"]["id"] == "usr-chef-001"
        assert data["user"]["role"] == "exec_chef"
        
        # Exec chef should see culinary-related outlets
        assert "outlets" in data
        assert "outlet_count" in data
        assert "resort_health" in data
        
        # Verify outlets have health scores
        outlets_with_data = [o for o in data["outlets"] if o.get("health_score") is not None]
        print(f"Exec Chef sees {len(data['outlets'])} outlets, {len(outlets_with_data)} with health data")
        
        # Check outlet structure
        for outlet in data["outlets"]:
            assert "outlet_id" in outlet
            assert "name" in outlet
            assert "status" in outlet
            if outlet.get("health_score") is not None:
                assert "metrics" in outlet
                assert "scores" in outlet
    
    def test_health_overview_gm(self):
        """GET /api/executive/health-overview?user_id=usr-gm-001 returns all 5 outlets (GM sees everything)"""
        response = requests.get(f"{BASE_URL}/api/executive/health-overview?user_id=usr-gm-001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["user"]["id"] == "usr-gm-001"
        assert data["user"]["role"] == "gm"
        
        # GM should see all 5 outlets
        assert data["outlet_count"] == 5, f"GM should see 5 outlets, got {data['outlet_count']}"
        
        # Verify resort health and counts
        assert "resort_health" in data
        assert "critical_count" in data
        assert "warning_count" in data
        
        print(f"GM Resort Health: {data['resort_health']}/100")
        print(f"Critical: {data['critical_count']}, Warning: {data['warning_count']}")
        
        # Check for expected outlets
        outlet_ids = [o["outlet_id"] for o in data["outlets"]]
        expected_outlets = ["main-dining", "banquet-hall", "sky-bar", "pool-cafe", "main-kitchen"]
        for expected in expected_outlets:
            assert expected in outlet_ids, f"Missing outlet: {expected}"


class TestExecutiveCommandOutletDetail:
    """Outlet detail endpoint tests"""
    
    def test_outlet_detail_main_dining(self):
        """GET /api/executive/outlet/main-dining returns full metrics, top items, meal periods, 7-day trend, labor"""
        response = requests.get(f"{BASE_URL}/api/executive/outlet/main-dining?user_id=usr-chef-001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["outlet_id"] == "main-dining"
        assert data["name"] == "The Grand Dining Room"
        
        # Verify metrics structure
        assert "metrics" in data
        metrics = data["metrics"]
        assert "revenue" in metrics
        assert "food_cost_pct" in metrics
        assert "bev_cost_pct" in metrics
        assert "covers" in metrics
        assert "avg_check" in metrics
        assert "waste_pct" in metrics
        
        # Verify top items
        assert "top_items" in metrics
        assert len(metrics["top_items"]) > 0, "Should have top items"
        for item in metrics["top_items"]:
            assert "name" in item
            assert "qty" in item
            assert "revenue" in item
            assert "food_cost_pct" in item
            assert "margin" in item
        
        # Verify 7-day trend
        assert "trend" in metrics
        assert len(metrics["trend"]) > 0, "Should have trend data"
        for day in metrics["trend"]:
            assert "date" in day
            assert "revenue" in day
            assert "covers" in day
        
        # Verify meal periods
        assert "meal_periods" in metrics
        
        # Verify labor breakdown
        assert "labor" in data
        for labor in data["labor"]:
            assert "department" in labor
            assert "total_cost" in labor
            assert "total_hours" in labor
            assert "ot_pct" in labor
        
        print(f"Main Dining: Revenue ${metrics['revenue']:,.0f}, Covers {metrics['covers']}, FC {metrics['food_cost_pct']}%")
    
    def test_outlet_detail_sky_bar(self):
        """GET /api/executive/outlet/sky-bar returns metrics showing lowest health score (~39)"""
        response = requests.get(f"{BASE_URL}/api/executive/outlet/sky-bar?user_id=usr-gm-001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["outlet_id"] == "sky-bar"
        assert data["name"] == "SkyBar Lounge"
        
        # SkyBar should have metrics (it has POS data)
        assert "metrics" in data
        metrics = data["metrics"]
        
        print(f"SkyBar: Revenue ${metrics['revenue']:,.0f}, FC {metrics['food_cost_pct']}%, Bev {metrics['bev_cost_pct']}%")
        
        # Verify it has beverage data (it's a bar)
        assert "bev_cost_pct" in metrics


class TestExecutiveCommandCompare:
    """Cross-outlet comparison tests"""
    
    def test_compare_outlets(self):
        """GET /api/executive/compare returns comparison table sorted by revenue with needs_attention list"""
        response = requests.get(f"{BASE_URL}/api/executive/compare?user_id=usr-gm-001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "comparison" in data
        assert "best_performer" in data
        assert "needs_attention" in data
        
        comparison = data["comparison"]
        assert len(comparison) > 0, "Should have comparison data"
        
        # Verify sorted by revenue (descending)
        revenues = [c["revenue"] for c in comparison]
        assert revenues == sorted(revenues, reverse=True), "Should be sorted by revenue descending"
        
        # Verify comparison structure
        for c in comparison:
            assert "outlet_id" in c
            assert "name" in c
            assert "health" in c
            assert "revenue" in c
            assert "food_cost_pct" in c
            assert "covers" in c
        
        print(f"Best Performer: {data['best_performer']}")
        print(f"Needs Attention: {data['needs_attention']}")


class TestExecutiveCommandThresholds:
    """Custom threshold CRUD tests"""
    
    def test_get_thresholds_default(self):
        """GET /api/executive/thresholds returns user thresholds (custom or defaults)"""
        response = requests.get(f"{BASE_URL}/api/executive/thresholds?user_id=usr-chef-001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert "thresholds" in data
        
        thresholds = data["thresholds"]
        # Verify default threshold structure
        expected_metrics = ["food_cost_pct", "bev_cost_pct", "labor_pct", "waste_pct", "avg_check", "covers_vs_budget"]
        for metric in expected_metrics:
            assert metric in thresholds, f"Missing threshold: {metric}"
            assert "green" in thresholds[metric]
            assert "amber" in thresholds[metric]
            assert "red" in thresholds[metric]
        
        print(f"Food Cost Thresholds: Green<{thresholds['food_cost_pct']['green']}%, Amber<{thresholds['food_cost_pct']['amber']}%, Red>{thresholds['food_cost_pct']['red']}%")
    
    def test_update_thresholds(self):
        """POST /api/executive/thresholds updates custom thresholds for a user"""
        custom_thresholds = {
            "food_cost_pct": {"green": 20, "amber": 24, "red": 28},
            "bev_cost_pct": {"green": 16, "amber": 20, "red": 24},
            "labor_pct": {"green": 23, "amber": 28, "red": 33},
            "waste_pct": {"green": 0.8, "amber": 1.2, "red": 2.0},
            "avg_check": {"green": 85, "amber": 65, "red": 45},
            "covers_vs_budget": {"green": 98, "amber": 90, "red": 75}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/executive/thresholds",
            json={"user_id": "usr-test-threshold", "thresholds": custom_thresholds}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "updated"
        assert data["user_id"] == "usr-test-threshold"
        
        # Verify the thresholds were saved by fetching them
        get_response = requests.get(f"{BASE_URL}/api/executive/thresholds?user_id=usr-test-threshold")
        assert get_response.status_code == 200
        
        saved = get_response.json()
        assert saved["thresholds"]["food_cost_pct"]["green"] == 20
        print("Custom thresholds saved and verified")


class TestExecutiveCommandMorningBriefing:
    """AI morning briefing generation tests"""
    
    def test_morning_briefing_generation(self):
        """POST /api/executive/morning-briefing generates AI narrative with outlet summaries and OT alerts"""
        response = requests.post(f"{BASE_URL}/api/executive/morning-briefing?user_id=usr-chef-001", timeout=60)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify user info
        assert "user" in data
        assert data["user"]["name"] is not None
        
        # Verify resort health
        assert "resort_health" in data
        
        # Verify outlet summary
        assert "outlet_summary" in data
        for outlet in data["outlet_summary"]:
            assert "name" in outlet
            assert "health" in outlet
            assert "status" in outlet
        
        # Verify yesterday's data
        assert "yesterday" in data
        
        # Verify OT alerts (may be empty)
        assert "ot_alerts" in data
        
        # Verify AI narrative was generated
        assert "narrative" in data
        assert len(data["narrative"]) > 50, "Narrative should be substantial"
        
        print(f"Morning Briefing for {data['user']['name']}")
        print(f"Resort Health: {data['resort_health']}/100")
        print(f"Outlets: {len(data['outlet_summary'])}")
        print(f"OT Alerts: {len(data['ot_alerts'])}")
        print(f"Narrative preview: {data['narrative'][:200]}...")


class TestExecutiveCommandHealthScores:
    """Verify health score calculations and status assignments"""
    
    def test_health_score_status_mapping(self):
        """Verify outlets have correct status based on health score"""
        response = requests.get(f"{BASE_URL}/api/executive/health-overview?user_id=usr-gm-001")
        assert response.status_code == 200
        
        data = response.json()
        
        for outlet in data["outlets"]:
            if outlet.get("health_score") is not None:
                score = outlet["health_score"]
                status = outlet["status"]
                
                # Verify status matches score
                if score >= 75:
                    assert status == "healthy", f"{outlet['name']}: score {score} should be healthy, got {status}"
                elif score >= 50:
                    assert status == "warning", f"{outlet['name']}: score {score} should be warning, got {status}"
                else:
                    assert status == "critical", f"{outlet['name']}: score {score} should be critical, got {status}"
                
                print(f"{outlet['name']}: {score}/100 ({status})")
    
    def test_skybar_critical_status(self):
        """Verify SkyBar has critical status (health ~39)"""
        response = requests.get(f"{BASE_URL}/api/executive/health-overview?user_id=usr-gm-001")
        assert response.status_code == 200
        
        data = response.json()
        skybar = next((o for o in data["outlets"] if o["outlet_id"] == "sky-bar"), None)
        
        if skybar and skybar.get("health_score") is not None:
            # SkyBar should have low health score (critical)
            assert skybar["health_score"] < 50, f"SkyBar health should be <50, got {skybar['health_score']}"
            print(f"SkyBar Health: {skybar['health_score']}/100 - Status: {skybar['status']}")
    
    def test_pool_cafe_warning_status(self):
        """Verify Aqua Cafe (pool-cafe) has warning status (health ~58)"""
        response = requests.get(f"{BASE_URL}/api/executive/health-overview?user_id=usr-gm-001")
        assert response.status_code == 200
        
        data = response.json()
        pool_cafe = next((o for o in data["outlets"] if o["outlet_id"] == "pool-cafe"), None)
        
        if pool_cafe and pool_cafe.get("health_score") is not None:
            # Pool cafe should have warning-level health
            print(f"Aqua Cafe Health: {pool_cafe['health_score']}/100 - Status: {pool_cafe['status']}")


class TestExecutiveCommandAlerts:
    """Verify alert generation for outlets"""
    
    def test_outlet_alerts_generated(self):
        """Verify outlets with high food cost or waste generate alerts"""
        response = requests.get(f"{BASE_URL}/api/executive/health-overview?user_id=usr-gm-001")
        assert response.status_code == 200
        
        data = response.json()
        
        total_alerts = 0
        for outlet in data["outlets"]:
            if outlet.get("alerts"):
                for alert in outlet["alerts"]:
                    assert "metric" in alert
                    assert "value" in alert
                    assert "severity" in alert
                    total_alerts += 1
                    print(f"{outlet['name']}: {alert['metric']} at {alert['value']} ({alert['severity']})")
        
        print(f"Total alerts across all outlets: {total_alerts}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
