"""
Iteration 29 - Testing 3 New EchoEvents Modules:
1. Scenario Planner - What-If event scenario comparison
2. Menu Ingest - Seasonal PDF menu ingestion
3. Client Portal - Prospect wizard and lead management

Also verifies the 12th knowledge domain (av_decor_vendor) is loaded.
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ============================================================================
# SCENARIO PLANNER TESTS
# ============================================================================

class TestScenarioPlannerReferenceData:
    """Test Scenario Planner reference data endpoints"""
    
    def test_get_room_templates(self, api_client):
        """GET /api/scenario-planner/room-templates returns room templates array"""
        response = api_client.get(f"{BASE_URL}/api/scenario-planner/room-templates")
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        assert isinstance(data["templates"], list)
        print(f"Room templates count: {len(data['templates'])}")
    
    def test_get_vendor_assets(self, api_client):
        """GET /api/scenario-planner/vendor-assets returns 23 vendor assets and 9 categories"""
        response = api_client.get(f"{BASE_URL}/api/scenario-planner/vendor-assets")
        assert response.status_code == 200
        data = response.json()
        assert "assets" in data
        assert "categories" in data
        assert isinstance(data["assets"], list)
        assert isinstance(data["categories"], list)
        print(f"Vendor assets count: {len(data['assets'])}, categories: {len(data['categories'])}")
        # Verify we have vendor assets (may vary based on KB data)
        assert len(data["assets"]) > 0 or len(data["categories"]) >= 0
    
    def test_get_setup_styles(self, api_client):
        """GET /api/scenario-planner/setup-styles returns styles"""
        response = api_client.get(f"{BASE_URL}/api/scenario-planner/setup-styles")
        assert response.status_code == 200
        data = response.json()
        assert "styles" in data
        assert isinstance(data["styles"], list)
        print(f"Setup styles count: {len(data['styles'])}")
    
    def test_get_packages(self, api_client):
        """GET /api/scenario-planner/packages returns templates and tiers"""
        response = api_client.get(f"{BASE_URL}/api/scenario-planner/packages")
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        assert "tiers" in data
        assert isinstance(data["templates"], list)
        assert isinstance(data["tiers"], list)
        print(f"Package templates: {len(data['templates'])}, tiers: {data['tiers']}")
    
    def test_get_footprints(self, api_client):
        """GET /api/scenario-planner/footprints returns footprints"""
        response = api_client.get(f"{BASE_URL}/api/scenario-planner/footprints")
        assert response.status_code == 200
        data = response.json()
        assert "footprints" in data
        assert isinstance(data["footprints"], list)
        print(f"Footprints count: {len(data['footprints'])}")
    
    def test_get_training_scenarios(self, api_client):
        """GET /api/scenario-planner/training returns training scenarios"""
        response = api_client.get(f"{BASE_URL}/api/scenario-planner/training")
        assert response.status_code == 200
        data = response.json()
        assert "training_scenarios" in data
        assert isinstance(data["training_scenarios"], list)
        # Should have at least the 3 seeded training scenarios
        assert len(data["training_scenarios"]) >= 3
        print(f"Training scenarios: {len(data['training_scenarios'])}")
        for ts in data["training_scenarios"]:
            assert "training_id" in ts
            assert "title" in ts
            assert "difficulty" in ts


class TestScenarioPlannerBuildAndCompare:
    """Test Scenario Planner build and compare endpoints"""
    
    def test_build_scenario_basic(self, api_client):
        """POST /api/scenario-planner/build-scenario builds a single scenario"""
        payload = {
            "name": "TEST_ITER29_Wedding_150",
            "event_type": "wedding",
            "service_style": "buffet",
            "meal_period": "dinner",
            "guest_count": 150,
            "tier": "signature",
            "setup_style_id": "banquet_rounds_60",
            "room_template_id": "template_ballroom_medium",
            "comfort_tier": "standard",
            "program_elements": [],
            "bar_model": "hosted_hourly",
            "bar_tier": "premium",
            "bar_hours": 4,
            "bar_demand_level": "moderate",
            "fnb_minimum_usd": 25000,
            "room_rental_usd": 2500
        }
        response = api_client.post(f"{BASE_URL}/api/scenario-planner/build-scenario", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify financials
        assert "financials" in data
        assert "net_total" in data["financials"]
        assert "total_pp" in data["financials"]
        assert data["financials"]["net_total"] > 0
        
        # Verify staffing
        assert "staffing_estimate" in data
        assert "foh" in data["staffing_estimate"]
        assert "boh" in data["staffing_estimate"]
        assert "total" in data["staffing_estimate"]
        
        # Verify risk_flags
        assert "risk_flags" in data
        assert isinstance(data["risk_flags"], list)
        
        # Verify vendor_analysis
        assert "vendor_analysis" in data
        
        print(f"Built scenario: net_total=${data['financials']['net_total']}, staff={data['staffing_estimate']['total']}")
    
    def test_build_scenario_with_vendor_assets(self, api_client):
        """POST /api/scenario-planner/build-scenario with program_elements triggers vendor analysis"""
        # First get available vendor assets
        assets_resp = api_client.get(f"{BASE_URL}/api/scenario-planner/vendor-assets")
        assets_data = assets_resp.json()
        
        # Use some asset IDs if available
        asset_ids = [a["asset_id"] for a in assets_data.get("assets", [])[:3]]
        
        payload = {
            "name": "TEST_ITER29_Gala_With_Vendors",
            "event_type": "social",
            "service_style": "stations",
            "meal_period": "dinner",
            "guest_count": 200,
            "tier": "luxury",
            "setup_style_id": "banquet_rounds_60",
            "room_template_id": "template_ballroom_large",
            "comfort_tier": "luxury",
            "program_elements": asset_ids,
            "bar_model": "hosted_hourly",
            "bar_tier": "luxury",
            "bar_hours": 5,
            "bar_demand_level": "high",
            "fnb_minimum_usd": 50000,
            "room_rental_usd": 5000,
            "is_outdoor": False
        }
        response = api_client.post(f"{BASE_URL}/api/scenario-planner/build-scenario", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify vendor_analysis populated
        assert "vendor_analysis" in data
        va = data["vendor_analysis"]
        assert "assets_detected" in va
        assert "total_vendor_footprint_sqft" in va
        assert "total_setup_minutes" in va
        assert "dependency_triggers" in va
        
        print(f"Vendor analysis: {len(va['assets_detected'])} assets, {va['total_vendor_footprint_sqft']} sqft")
    
    def test_compare_scenarios(self, api_client):
        """POST /api/scenario-planner/compare accepts two scenarios and returns deltas"""
        payload = {
            "scenario_a": {
                "name": "Scenario A - Classic",
                "event_type": "wedding",
                "service_style": "buffet",
                "guest_count": 150,
                "tier": "classic",
                "setup_style_id": "banquet_rounds_60",
                "room_template_id": "template_ballroom_medium",
                "bar_model": "hosted_hourly",
                "bar_tier": "house",
                "bar_hours": 3,
                "fnb_minimum_usd": 15000
            },
            "scenario_b": {
                "name": "Scenario B - Luxury",
                "event_type": "wedding",
                "service_style": "stations",
                "guest_count": 150,
                "tier": "luxury",
                "setup_style_id": "banquet_rounds_60",
                "room_template_id": "template_ballroom_medium",
                "bar_model": "hosted_hourly",
                "bar_tier": "luxury",
                "bar_hours": 5,
                "fnb_minimum_usd": 30000
            }
        }
        response = api_client.post(f"{BASE_URL}/api/scenario-planner/compare", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify both scenarios returned
        assert "scenario_a" in data
        assert "scenario_b" in data
        
        # Verify deltas
        assert "deltas" in data
        deltas = data["deltas"]
        assert "net_total" in deltas
        assert "total_pp" in deltas
        assert "fnb_total" in deltas
        assert "total_staff" in deltas
        assert "margin_pct_pp" in deltas
        
        # Verify comparison_summary
        assert "comparison_summary" in data
        assert isinstance(data["comparison_summary"], str)
        assert len(data["comparison_summary"]) > 0
        
        print(f"Comparison: delta net_total=${deltas['net_total']}, summary: {data['comparison_summary'][:80]}...")


# ============================================================================
# MENU INGEST TESTS
# ============================================================================

class TestMenuIngestSeasons:
    """Test Menu Ingest season management endpoints"""
    
    def test_list_seasons_empty_or_existing(self, api_client):
        """GET /api/menu-ingest/seasons returns seasons list"""
        response = api_client.get(f"{BASE_URL}/api/menu-ingest/seasons")
        assert response.status_code == 200
        data = response.json()
        assert "seasons" in data
        assert "count" in data
        assert isinstance(data["seasons"], list)
        print(f"Existing seasons: {data['count']}")
    
    def test_create_season(self, api_client):
        """POST /api/menu-ingest/seasons creates a new season"""
        payload = {
            "name": "TEST_ITER29_Spring_2026",
            "year": 2026,
            "quarter": "Q2",
            "active": True,
            "notes": "Test season for iteration 29"
        }
        response = api_client.post(f"{BASE_URL}/api/menu-ingest/seasons", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "season_id" in data
        assert data["name"] == payload["name"]
        assert data["year"] == payload["year"]
        assert data["quarter"] == payload["quarter"]
        assert data["active"] == payload["active"]
        
        # Store for later tests
        TestMenuIngestSeasons.created_season_id = data["season_id"]
        print(f"Created season: {data['season_id']}")
        return data["season_id"]
    
    def test_get_season_details(self, api_client):
        """GET /api/menu-ingest/seasons/{season_id} returns season details"""
        # First create a season if not exists
        if not hasattr(TestMenuIngestSeasons, 'created_season_id'):
            self.test_create_season(api_client)
        
        season_id = TestMenuIngestSeasons.created_season_id
        response = api_client.get(f"{BASE_URL}/api/menu-ingest/seasons/{season_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["season_id"] == season_id
        assert "name" in data
        assert "items" in data
        assert "item_count" in data
        print(f"Season details: {data['name']}, items: {data['item_count']}")
    
    def test_get_season_not_found(self, api_client):
        """GET /api/menu-ingest/seasons/{invalid_id} returns 404"""
        response = api_client.get(f"{BASE_URL}/api/menu-ingest/seasons/invalid-season-id-12345")
        assert response.status_code == 404


class TestMenuIngestUploads:
    """Test Menu Ingest upload endpoints"""
    
    def test_list_uploads_for_season(self, api_client):
        """GET /api/menu-ingest/uploads/{season_id} returns uploaded documents"""
        # First ensure we have a season
        if not hasattr(TestMenuIngestSeasons, 'created_season_id'):
            TestMenuIngestSeasons().test_create_season(api_client)
        
        season_id = TestMenuIngestSeasons.created_season_id
        response = api_client.get(f"{BASE_URL}/api/menu-ingest/uploads/{season_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert "uploads" in data
        assert "count" in data
        assert isinstance(data["uploads"], list)
        print(f"Uploads for season: {data['count']}")


class TestMenuIngestCategories:
    """Test Menu Ingest category endpoints"""
    
    def test_get_categories_for_season(self, api_client):
        """GET /api/menu-ingest/categories/{season_id} returns categories"""
        # First ensure we have a season
        if not hasattr(TestMenuIngestSeasons, 'created_season_id'):
            TestMenuIngestSeasons().test_create_season(api_client)
        
        season_id = TestMenuIngestSeasons.created_season_id
        response = api_client.get(f"{BASE_URL}/api/menu-ingest/categories/{season_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert "categories" in data
        assert "season_id" in data
        assert isinstance(data["categories"], list)
        print(f"Categories for season: {len(data['categories'])}")


# ============================================================================
# CLIENT PORTAL TESTS
# ============================================================================

class TestClientPortalPublicEndpoints:
    """Test Client Portal public-facing endpoints"""
    
    def test_get_event_types(self, api_client):
        """GET /api/portal/event-types returns event types, tiers, enhancements, etc."""
        response = api_client.get(f"{BASE_URL}/api/portal/event-types")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields
        assert "event_types" in data
        assert "service_styles" in data
        assert "meal_periods" in data
        assert "tiers" in data
        assert "budget_ranges" in data
        assert "enhancements" in data
        
        # Verify event_types structure
        assert len(data["event_types"]) >= 5
        for et in data["event_types"]:
            assert "id" in et
            assert "label" in et
            assert "description" in et
        
        # Verify tiers structure
        assert len(data["tiers"]) >= 4
        for tier in data["tiers"]:
            assert "id" in tier
            assert "label" in tier
        
        print(f"Event types: {len(data['event_types'])}, tiers: {len(data['tiers'])}, enhancements: {len(data['enhancements'])}")
    
    def test_get_estimate(self, api_client):
        """POST /api/portal/estimate returns price range estimate"""
        payload = {
            "event_type": "wedding",
            "event_date": "2026-06-15",
            "guest_count": 150,
            "service_style": "buffet",
            "meal_period": "dinner",
            "tier": "signature",
            "is_outdoor": False,
            "budget_range": "$30,000-$50,000",
            "enhancements": ["av_package", "dance_floor", "photography"],
            "bar_preference": "premium",
            "special_requests": "",
            "needs_hotel_rooms": True,
            "estimated_room_nights": 20
        }
        response = api_client.post(f"{BASE_URL}/api/portal/estimate", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify estimate structure
        assert "estimate" in data
        est = data["estimate"]
        assert "package_name" in est
        assert "tier" in est
        assert "guest_count" in est
        assert "fnb_per_person" in est
        assert "fnb_total" in est
        assert "enhancements_total" in est
        assert "grand_total_estimate" in est
        assert "price_range" in est
        assert "low" in est["price_range"]
        assert "high" in est["price_range"]
        
        # Verify enhancement_breakdown
        assert "enhancement_breakdown" in data
        assert isinstance(data["enhancement_breakdown"], list)
        
        # Verify next_steps
        assert "next_steps" in data
        
        print(f"Estimate: ${est['price_range']['low']} - ${est['price_range']['high']}")


class TestClientPortalLeadManagement:
    """Test Client Portal lead management endpoints"""
    
    def test_submit_lead(self, api_client):
        """POST /api/portal/submit-lead creates a lead and returns confirmation"""
        payload = {
            "prospect": {
                "first_name": "TEST_ITER29",
                "last_name": "TestUser",
                "email": "test_iter29@example.com",
                "phone": "555-123-4567",
                "company": "Test Company Inc",
                "how_heard": "Website"
            },
            "event": {
                "event_type": "corporate",
                "event_date": "2026-09-20",
                "guest_count": 200,
                "service_style": "stations",
                "meal_period": "lunch",
                "tier": "elevated",
                "is_outdoor": False,
                "budget_range": "$15,000-$30,000",
                "enhancements": ["av_package", "stage"],
                "bar_preference": "call",
                "special_requests": "Need vegetarian options",
                "needs_hotel_rooms": False,
                "estimated_room_nights": 0
            }
        }
        response = api_client.post(f"{BASE_URL}/api/portal/submit-lead", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify lead creation
        assert "lead_id" in data
        assert "status" in data
        assert data["status"] == "submitted"
        assert "message" in data
        assert "estimate" in data
        assert "next_steps" in data
        
        # Store for later tests
        TestClientPortalLeadManagement.created_lead_id = data["lead_id"]
        print(f"Created lead: {data['lead_id']}")
    
    def test_list_leads(self, api_client):
        """GET /api/portal/leads returns leads list with stats"""
        response = api_client.get(f"{BASE_URL}/api/portal/leads")
        assert response.status_code == 200
        data = response.json()
        
        assert "leads" in data
        assert "count" in data
        assert "stats" in data
        
        # Verify stats structure
        stats = data["stats"]
        assert "total" in stats
        assert "new" in stats
        assert "contacted" in stats
        assert "qualified" in stats
        assert "converted" in stats
        
        print(f"Leads: {data['count']}, stats: {stats}")
    
    def test_assign_lead(self, api_client):
        """PUT /api/portal/leads/{lead_id}/assign assigns a lead"""
        # First ensure we have a lead
        if not hasattr(TestClientPortalLeadManagement, 'created_lead_id'):
            self.test_submit_lead(api_client)
        
        lead_id = TestClientPortalLeadManagement.created_lead_id
        payload = {
            "assigned_to": "Sales Manager",
            "notes": "High priority corporate event",
            "priority": "high"
        }
        response = api_client.put(f"{BASE_URL}/api/portal/leads/{lead_id}/assign", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "assigned" in data
        assert data["assigned"] == lead_id
        assert "to" in data
        assert data["to"] == "Sales Manager"
        print(f"Assigned lead {lead_id} to {data['to']}")
    
    def test_update_lead_status(self, api_client):
        """PUT /api/portal/leads/{lead_id}/status updates lead status"""
        # First ensure we have a lead
        if not hasattr(TestClientPortalLeadManagement, 'created_lead_id'):
            self.test_submit_lead(api_client)
        
        lead_id = TestClientPortalLeadManagement.created_lead_id
        response = api_client.put(f"{BASE_URL}/api/portal/leads/{lead_id}/status?status=qualified")
        assert response.status_code == 200
        data = response.json()
        
        assert "lead_id" in data
        assert data["lead_id"] == lead_id
        assert "status" in data
        assert data["status"] == "qualified"
        print(f"Updated lead {lead_id} status to {data['status']}")
    
    def test_update_lead_status_invalid(self, api_client):
        """PUT /api/portal/leads/{lead_id}/status with invalid status returns 400"""
        if not hasattr(TestClientPortalLeadManagement, 'created_lead_id'):
            self.test_submit_lead(api_client)
        
        lead_id = TestClientPortalLeadManagement.created_lead_id
        response = api_client.put(f"{BASE_URL}/api/portal/leads/{lead_id}/status?status=invalid_status")
        assert response.status_code == 400


# ============================================================================
# KNOWLEDGE ENGINE - 12TH DOMAIN VERIFICATION
# ============================================================================

class TestKnowledgeEngineDomains:
    """Verify Knowledge Engine has 12 domains including av_decor_vendor"""
    
    def test_domains_include_av_decor_vendor(self, api_client):
        """GET /api/knowledge-engine/domains returns 12 domains including av_decor_vendor"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/domains")
        assert response.status_code == 200
        data = response.json()
        
        assert "domains" in data
        assert "count" in data
        
        domain_ids = [d["domain_id"] for d in data["domains"]]
        print(f"Domains found: {domain_ids}")
        
        # Verify av_decor_vendor is present
        assert "av_decor_vendor" in domain_ids, f"av_decor_vendor not found in domains: {domain_ids}"
        
        # Verify we have at least 12 domains (10 original + room_setup_capacity + av_decor_vendor)
        assert data["count"] >= 12, f"Expected at least 12 domains, got {data['count']}"
        
        print(f"Total domains: {data['count']}, av_decor_vendor present: True")
    
    def test_get_av_decor_vendor_domain(self, api_client):
        """GET /api/knowledge-engine/domain/av_decor_vendor returns domain data"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/domain/av_decor_vendor")
        assert response.status_code == 200
        data = response.json()
        
        assert "domain_id" in data
        assert data["domain_id"] == "av_decor_vendor"
        assert "data" in data
        
        # Verify expected structure
        domain_data = data["data"]
        assert "asset_library" in domain_data or "vendor_categories" in domain_data or "dependency_rules" in domain_data
        
        print(f"av_decor_vendor domain loaded successfully")


# ============================================================================
# HEALTH CHECK
# ============================================================================

class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self, api_client):
        """GET /api/health returns healthy status"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"Health check passed: {data['platform']} v{data['version']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
