"""
Iteration 30 Tests - Throughput Engine, Cafeteria Domain, Share Links
=====================================================================
Tests for:
1. Knowledge Engine: 14 domains including timeline_throughput and cafeteria_dining
2. Scenario Planner: throughput_analysis with plates_to_clear, est_clear_minutes, dish_pit_racks, dish_pit_time_minutes, timeline_feasible
3. Scenario Planner: Enhanced staffing with captains, bussers, station_staff
4. Scenario Planner: is_outdoor=true triggers distance_penalty risk flag
5. Scenario Planner Compare: clear_time_delta and dish_pit_delta in deltas
6. Client Portal: Share link feature (share-link, shared, share-analytics)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestHealthCheck:
    """Basic health check"""
    
    def test_health(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("PASS: Health check")


class TestKnowledgeEngine14Domains:
    """Test Knowledge Engine has 14 domains including timeline_throughput and cafeteria_dining"""
    
    def test_domains_count_14(self, api_client):
        """GET /api/knowledge-engine/domains returns 14 domains"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/domains")
        assert response.status_code == 200
        data = response.json()
        domains = data.get("domains", [])
        domain_ids = [d["domain_id"] for d in domains]
        print(f"Found {len(domains)} domains: {domain_ids}")
        assert len(domains) >= 14, f"Expected 14 domains, got {len(domains)}"
        print("PASS: Knowledge Engine has 14+ domains")
    
    def test_timeline_throughput_domain_exists(self, api_client):
        """timeline_throughput domain exists"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/domains")
        assert response.status_code == 200
        data = response.json()
        domain_ids = [d["domain_id"] for d in data.get("domains", [])]
        assert "timeline_throughput" in domain_ids, f"timeline_throughput not in domains: {domain_ids}"
        print("PASS: timeline_throughput domain exists")
    
    def test_cafeteria_dining_domain_exists(self, api_client):
        """cafeteria_dining domain exists"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/domains")
        assert response.status_code == 200
        data = response.json()
        domain_ids = [d["domain_id"] for d in data.get("domains", [])]
        assert "cafeteria_dining" in domain_ids, f"cafeteria_dining not in domains: {domain_ids}"
        print("PASS: cafeteria_dining domain exists")
    
    def test_get_timeline_throughput_domain(self, api_client):
        """GET /api/knowledge-engine/domain/timeline_throughput returns data"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/domain/timeline_throughput")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data or "domain_id" in data
        print(f"PASS: timeline_throughput domain data retrieved")
    
    def test_get_cafeteria_dining_domain(self, api_client):
        """GET /api/knowledge-engine/domain/cafeteria_dining returns data"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/domain/cafeteria_dining")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data or "domain_id" in data
        print(f"PASS: cafeteria_dining domain data retrieved")


class TestScenarioPlannerThroughputAnalysis:
    """Test Scenario Planner throughput_analysis fields"""
    
    def test_build_scenario_returns_throughput_analysis(self, api_client):
        """POST /api/scenario-planner/build-scenario returns throughput_analysis"""
        payload = {
            "name": "TEST_ITER30_Throughput",
            "event_type": "wedding",
            "service_style": "buffet",
            "meal_period": "dinner",
            "guest_count": 200,
            "tier": "signature",
            "setup_style_id": "banquet_rounds_60",
            "room_template_id": "template_ballroom_medium",
            "is_outdoor": False
        }
        response = api_client.post(f"{BASE_URL}/api/scenario-planner/build-scenario", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Check throughput_analysis exists
        assert "throughput_analysis" in data, "throughput_analysis missing from response"
        tp = data["throughput_analysis"]
        
        # Check required fields
        assert "plates_to_clear" in tp, "plates_to_clear missing"
        assert "est_clear_minutes" in tp, "est_clear_minutes missing"
        assert "dish_pit_racks" in tp, "dish_pit_racks missing"
        assert "dish_pit_time_minutes" in tp, "dish_pit_time_minutes missing"
        assert "timeline_feasible" in tp, "timeline_feasible missing"
        
        print(f"PASS: throughput_analysis returned with plates_to_clear={tp['plates_to_clear']}, est_clear_minutes={tp['est_clear_minutes']}, dish_pit_racks={tp['dish_pit_racks']}, dish_pit_time_minutes={tp['dish_pit_time_minutes']}, timeline_feasible={tp['timeline_feasible']}")
    
    def test_throughput_plates_equals_guest_count(self, api_client):
        """plates_to_clear should equal guest_count"""
        payload = {
            "name": "TEST_ITER30_Plates",
            "guest_count": 150,
            "service_style": "plated",
            "tier": "elevated"
        }
        response = api_client.post(f"{BASE_URL}/api/scenario-planner/build-scenario", json=payload)
        assert response.status_code == 200
        data = response.json()
        tp = data.get("throughput_analysis", {})
        assert tp.get("plates_to_clear") == 150, f"Expected plates_to_clear=150, got {tp.get('plates_to_clear')}"
        print("PASS: plates_to_clear equals guest_count")


class TestScenarioPlannerEnhancedStaffing:
    """Test Scenario Planner enhanced staffing with captains, bussers, station_staff"""
    
    def test_staffing_has_captains(self, api_client):
        """staffing_estimate includes captains field"""
        payload = {
            "name": "TEST_ITER30_Staffing",
            "guest_count": 200,
            "service_style": "buffet",
            "tier": "signature"
        }
        response = api_client.post(f"{BASE_URL}/api/scenario-planner/build-scenario", json=payload)
        assert response.status_code == 200
        data = response.json()
        staffing = data.get("staffing_estimate", {})
        assert "captains" in staffing, "captains missing from staffing_estimate"
        assert staffing["captains"] >= 1, f"Expected captains >= 1, got {staffing['captains']}"
        print(f"PASS: staffing_estimate includes captains={staffing['captains']}")
    
    def test_staffing_has_bussers(self, api_client):
        """staffing_estimate includes bussers field"""
        payload = {
            "name": "TEST_ITER30_Bussers",
            "guest_count": 200,
            "service_style": "buffet",
            "tier": "signature"
        }
        response = api_client.post(f"{BASE_URL}/api/scenario-planner/build-scenario", json=payload)
        assert response.status_code == 200
        data = response.json()
        staffing = data.get("staffing_estimate", {})
        assert "bussers" in staffing, "bussers missing from staffing_estimate"
        assert staffing["bussers"] >= 1, f"Expected bussers >= 1, got {staffing['bussers']}"
        print(f"PASS: staffing_estimate includes bussers={staffing['bussers']}")
    
    def test_staffing_has_station_staff(self, api_client):
        """staffing_estimate includes station_staff field"""
        payload = {
            "name": "TEST_ITER30_StationStaff",
            "guest_count": 200,
            "service_style": "stations",  # stations service style should have station_staff
            "tier": "signature"
        }
        response = api_client.post(f"{BASE_URL}/api/scenario-planner/build-scenario", json=payload)
        assert response.status_code == 200
        data = response.json()
        staffing = data.get("staffing_estimate", {})
        assert "station_staff" in staffing, "station_staff missing from staffing_estimate"
        print(f"PASS: staffing_estimate includes station_staff={staffing['station_staff']}")


class TestScenarioPlannerOutdoorDistancePenalty:
    """Test is_outdoor=true triggers distance_penalty risk flag"""
    
    def test_outdoor_triggers_distance_penalty(self, api_client):
        """is_outdoor=true should trigger distance_penalty risk flag"""
        payload = {
            "name": "TEST_ITER30_Outdoor",
            "guest_count": 150,
            "service_style": "buffet",
            "tier": "signature",
            "is_outdoor": True
        }
        response = api_client.post(f"{BASE_URL}/api/scenario-planner/build-scenario", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Check risk_flags for distance_penalty
        risk_flags = data.get("risk_flags", [])
        flag_names = [f.get("flag", "") for f in risk_flags]
        assert "distance_penalty" in flag_names, f"distance_penalty not in risk_flags: {flag_names}"
        
        # Also check throughput_analysis distance_multiplier > 1
        tp = data.get("throughput_analysis", {})
        assert tp.get("distance_multiplier", 1.0) > 1.0, f"Expected distance_multiplier > 1 for outdoor, got {tp.get('distance_multiplier')}"
        
        print(f"PASS: is_outdoor=true triggers distance_penalty risk flag, distance_multiplier={tp.get('distance_multiplier')}")
    
    def test_indoor_no_distance_penalty(self, api_client):
        """is_outdoor=false should NOT trigger distance_penalty risk flag"""
        payload = {
            "name": "TEST_ITER30_Indoor",
            "guest_count": 150,
            "service_style": "buffet",
            "tier": "signature",
            "is_outdoor": False
        }
        response = api_client.post(f"{BASE_URL}/api/scenario-planner/build-scenario", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        risk_flags = data.get("risk_flags", [])
        flag_names = [f.get("flag", "") for f in risk_flags]
        assert "distance_penalty" not in flag_names, f"distance_penalty should not be in risk_flags for indoor: {flag_names}"
        
        tp = data.get("throughput_analysis", {})
        assert tp.get("distance_multiplier", 1.0) == 1.0, f"Expected distance_multiplier=1.0 for indoor, got {tp.get('distance_multiplier')}"
        
        print("PASS: is_outdoor=false does NOT trigger distance_penalty")


class TestScenarioPlannerCompareDeltas:
    """Test compare endpoint returns clear_time_delta and dish_pit_delta"""
    
    def test_compare_returns_clear_time_delta(self, api_client):
        """POST /api/scenario-planner/compare returns clear_time_delta in deltas"""
        payload = {
            "scenario_a": {
                "name": "Scenario A",
                "guest_count": 100,
                "service_style": "buffet",
                "tier": "classic"
            },
            "scenario_b": {
                "name": "Scenario B",
                "guest_count": 200,
                "service_style": "buffet",
                "tier": "signature"
            }
        }
        response = api_client.post(f"{BASE_URL}/api/scenario-planner/compare", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        deltas = data.get("deltas", {})
        assert "clear_time_delta" in deltas, f"clear_time_delta missing from deltas: {deltas.keys()}"
        print(f"PASS: compare returns clear_time_delta={deltas['clear_time_delta']}")
    
    def test_compare_returns_dish_pit_delta(self, api_client):
        """POST /api/scenario-planner/compare returns dish_pit_delta in deltas"""
        payload = {
            "scenario_a": {
                "name": "Scenario A",
                "guest_count": 100,
                "service_style": "buffet",
                "tier": "classic"
            },
            "scenario_b": {
                "name": "Scenario B",
                "guest_count": 200,
                "service_style": "buffet",
                "tier": "signature"
            }
        }
        response = api_client.post(f"{BASE_URL}/api/scenario-planner/compare", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        deltas = data.get("deltas", {})
        assert "dish_pit_delta" in deltas, f"dish_pit_delta missing from deltas: {deltas.keys()}"
        print(f"PASS: compare returns dish_pit_delta={deltas['dish_pit_delta']}")


class TestClientPortalShareLink:
    """Test Client Portal share link feature"""
    
    @pytest.fixture(scope="class")
    def test_lead(self, api_client):
        """Create a test lead for share link testing"""
        payload = {
            "prospect": {
                "first_name": "TEST_ITER30",
                "last_name": "ShareTest",
                "email": "test_iter30_share@example.com",
                "phone": "555-123-4567"
            },
            "event": {
                "event_type": "wedding",
                "guest_count": 150,
                "service_style": "buffet",
                "tier": "signature"
            }
        }
        response = api_client.post(f"{BASE_URL}/api/portal/submit-lead", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "lead_id" in data, "lead_id missing from submit-lead response"
        print(f"Created test lead: {data['lead_id']}")
        return data["lead_id"]
    
    def test_submit_lead_returns_lead_id(self, api_client):
        """POST /api/portal/submit-lead creates a lead and returns lead_id"""
        payload = {
            "prospect": {
                "first_name": "TEST_ITER30",
                "last_name": "LeadTest",
                "email": "test_iter30_lead@example.com",
                "phone": "555-987-6543"
            },
            "event": {
                "event_type": "corporate",
                "guest_count": 100,
                "service_style": "plated",
                "tier": "elevated"
            }
        }
        response = api_client.post(f"{BASE_URL}/api/portal/submit-lead", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "lead_id" in data, "lead_id missing from response"
        assert len(data["lead_id"]) > 0, "lead_id is empty"
        print(f"PASS: submit-lead returns lead_id={data['lead_id']}")
    
    def test_create_share_link(self, api_client, test_lead):
        """POST /api/portal/share-link/{lead_id} creates share token and returns share_url"""
        response = api_client.post(f"{BASE_URL}/api/portal/share-link/{test_lead}")
        assert response.status_code == 200
        data = response.json()
        
        assert "share_token" in data, "share_token missing from response"
        assert "share_url" in data, "share_url missing from response"
        assert len(data["share_token"]) > 0, "share_token is empty"
        
        print(f"PASS: share-link returns share_token={data['share_token']}, share_url={data['share_url']}")
        return data["share_token"]
    
    def test_view_shared_estimate(self, api_client, test_lead):
        """GET /api/portal/shared/{share_token} returns estimate and increments views"""
        # First create a share link
        create_resp = api_client.post(f"{BASE_URL}/api/portal/share-link/{test_lead}")
        assert create_resp.status_code == 200
        share_token = create_resp.json()["share_token"]
        
        # View the shared estimate
        response = api_client.get(f"{BASE_URL}/api/portal/shared/{share_token}")
        assert response.status_code == 200
        data = response.json()
        
        assert "estimate" in data, "estimate missing from shared response"
        assert "views" in data, "views missing from shared response"
        assert data["views"] >= 1, f"Expected views >= 1, got {data['views']}"
        
        print(f"PASS: shared/{share_token} returns estimate with views={data['views']}")
    
    def test_shared_increments_views(self, api_client, test_lead):
        """Multiple views of shared link increment view count"""
        # Create share link
        create_resp = api_client.post(f"{BASE_URL}/api/portal/share-link/{test_lead}")
        share_token = create_resp.json()["share_token"]
        
        # View once
        resp1 = api_client.get(f"{BASE_URL}/api/portal/shared/{share_token}")
        views1 = resp1.json().get("views", 0)
        
        # View again
        resp2 = api_client.get(f"{BASE_URL}/api/portal/shared/{share_token}")
        views2 = resp2.json().get("views", 0)
        
        assert views2 > views1, f"Views should increment: {views1} -> {views2}"
        print(f"PASS: Views increment correctly: {views1} -> {views2}")
    
    def test_share_analytics(self, api_client, test_lead):
        """GET /api/portal/share-analytics/{lead_id} returns total_links and total_views"""
        # Create a share link first
        api_client.post(f"{BASE_URL}/api/portal/share-link/{test_lead}")
        
        response = api_client.get(f"{BASE_URL}/api/portal/share-analytics/{test_lead}")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_links" in data, "total_links missing from share-analytics"
        assert "total_views" in data, "total_views missing from share-analytics"
        assert data["total_links"] >= 1, f"Expected total_links >= 1, got {data['total_links']}"
        
        print(f"PASS: share-analytics returns total_links={data['total_links']}, total_views={data['total_views']}")
    
    def test_share_link_not_found(self, api_client):
        """GET /api/portal/shared/{invalid_token} returns 404"""
        response = api_client.get(f"{BASE_URL}/api/portal/shared/invalid_token_xyz")
        assert response.status_code == 404
        print("PASS: Invalid share token returns 404")


class TestScenarioPlannerFullIntegration:
    """Full integration test for throughput engine"""
    
    def test_full_scenario_with_all_new_fields(self, api_client):
        """Build scenario with all new iteration 30 fields"""
        payload = {
            "name": "TEST_ITER30_Full",
            "event_type": "wedding",
            "service_style": "stations",
            "meal_period": "dinner",
            "guest_count": 250,
            "tier": "luxury",
            "setup_style_id": "banquet_rounds_60",
            "room_template_id": "template_ballroom_large",
            "is_outdoor": True,
            "bar_model": "hosted_hourly",
            "bar_tier": "premium",
            "bar_hours": 4
        }
        response = api_client.post(f"{BASE_URL}/api/scenario-planner/build-scenario", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify throughput_analysis
        tp = data.get("throughput_analysis", {})
        assert tp.get("plates_to_clear") == 250
        assert "est_clear_minutes" in tp
        assert "dish_pit_racks" in tp
        assert "dish_pit_time_minutes" in tp
        assert "timeline_feasible" in tp
        assert tp.get("distance_multiplier", 1.0) > 1.0  # outdoor
        
        # Verify enhanced staffing
        staffing = data.get("staffing_estimate", {})
        assert "captains" in staffing
        assert "bussers" in staffing
        assert "station_staff" in staffing
        assert staffing["station_staff"] > 0  # stations service style
        
        # Verify risk flags include distance_penalty
        risk_flags = data.get("risk_flags", [])
        flag_names = [f.get("flag", "") for f in risk_flags]
        assert "distance_penalty" in flag_names
        
        print(f"PASS: Full integration test - throughput_analysis, enhanced staffing, distance_penalty all present")
        print(f"  - plates_to_clear: {tp['plates_to_clear']}")
        print(f"  - est_clear_minutes: {tp['est_clear_minutes']}")
        print(f"  - dish_pit_racks: {tp['dish_pit_racks']}")
        print(f"  - dish_pit_time_minutes: {tp['dish_pit_time_minutes']}")
        print(f"  - timeline_feasible: {tp['timeline_feasible']}")
        print(f"  - distance_multiplier: {tp['distance_multiplier']}")
        print(f"  - captains: {staffing['captains']}")
        print(f"  - bussers: {staffing['bussers']}")
        print(f"  - station_staff: {staffing['station_staff']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
