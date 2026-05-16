"""
Iteration 28 - LUCCCA Banquet Intelligence Knowledge Engine Tests
=================================================================
Tests for the Knowledge Engine module with 10 domains:
- ontology, event_lifecycle, beo_reo, buffet_layout, staffing_service,
- culinary_execution, purchasing_yield, risk_safety, post_event_learning, package_pricing

Endpoints tested:
- GET /api/knowledge-engine/domains
- GET /api/knowledge-engine/domain/{domain_id}
- GET /api/knowledge-engine/ontology
- POST /api/knowledge-engine/query
- POST /api/knowledge-engine/recommend/staffing
- POST /api/knowledge-engine/recommend/layout
- POST /api/knowledge-engine/recommend/risk-assessment
- POST /api/knowledge-engine/recommend/purchasing
- POST /api/knowledge-engine/recommend/pricing
- POST /api/knowledge-engine/recommend/beo-quality-check
- GET /api/knowledge-engine/recommend/culinary-profiles
- GET /api/knowledge-engine/recommend/lifecycle-stages
- GET /api/knowledge-engine/recommend/lifecycle-stage/{stage_id}
- GET /api/knowledge-engine/recommend/learning-template
- GET /api/knowledge-engine/packages
- GET /api/knowledge-engine/packages/{package_id}
- GET /api/knowledge-engine/upgrades
- GET /api/knowledge-engine/bar-models
- GET /api/knowledge-engine/addons
- GET /api/knowledge-engine/concession-rules
- GET /api/knowledge-engine/margin-guardrails
- GET /api/knowledge-engine/deposit-templates
- GET /api/knowledge-engine/formulas
- POST /api/knowledge-engine/overrides
- GET /api/knowledge-engine/overrides
- DELETE /api/knowledge-engine/overrides/{override_id}
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cfo-toolkit-deploy.preview.emergentagent.com").rstrip("/")

# Domain IDs for testing
DOMAIN_IDS = [
    "ontology", "event_lifecycle", "beo_reo", "buffet_layout", "staffing_service",
    "culinary_execution", "purchasing_yield", "risk_safety", "post_event_learning", "package_pricing"
]

# Sample package IDs
SAMPLE_PACKAGE_IDS = ["classic_breakfast_buffet", "signature_plated_dinner", "luxury_stations_reception"]


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self, api_client):
        """Verify API is healthy"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ API health check passed")


class TestDomainBrowsing:
    """Tests for domain listing and retrieval"""
    
    def test_list_domains_returns_10(self, api_client):
        """GET /api/knowledge-engine/domains - should return all 10 domains"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/domains")
        assert response.status_code == 200
        data = response.json()
        assert "domains" in data
        assert data["count"] == 10, f"Expected 10 domains, got {data['count']}"
        domain_ids = [d["domain_id"] for d in data["domains"]]
        for expected_id in DOMAIN_IDS:
            assert expected_id in domain_ids, f"Missing domain: {expected_id}"
        print(f"✓ List domains returned {data['count']} domains")
    
    @pytest.mark.parametrize("domain_id", DOMAIN_IDS)
    def test_get_domain_by_id(self, api_client, domain_id):
        """GET /api/knowledge-engine/domain/{domain_id} - returns full domain"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/domain/{domain_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["domain_id"] == domain_id
        assert "data" in data
        assert "schema_version" in data
        print(f"✓ Domain '{domain_id}' retrieved successfully")
    
    def test_get_domain_not_found(self, api_client):
        """GET /api/knowledge-engine/domain/invalid - returns 404"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/domain/invalid_domain_xyz")
        assert response.status_code == 404
        print("✓ Invalid domain returns 404")


class TestOntology:
    """Tests for ontology endpoint"""
    
    def test_get_ontology(self, api_client):
        """GET /api/knowledge-engine/ontology - returns module_map, shared_primary_keys, event_graph_edges"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/ontology")
        assert response.status_code == 200
        data = response.json()
        assert "module_map" in data
        assert "shared_primary_keys" in data
        assert "event_graph_edges" in data
        assert isinstance(data["module_map"], dict)
        assert len(data["module_map"]) > 0, "module_map should have entries"
        print(f"✓ Ontology returned with {len(data['module_map'])} modules, {len(data.get('shared_primary_keys', []))} shared keys")


class TestKnowledgeQuery:
    """Tests for targeted knowledge query"""
    
    def test_query_domain_root(self, api_client):
        """POST /api/knowledge-engine/query - query domain root"""
        response = api_client.post(f"{BASE_URL}/api/knowledge-engine/query", json={
            "domain_id": "ontology",
            "path": ""
        })
        assert response.status_code == 200
        data = response.json()
        assert data["domain_id"] == "ontology"
        assert "result" in data
        print("✓ Query domain root successful")
    
    def test_query_with_path(self, api_client):
        """POST /api/knowledge-engine/query - query with path navigation"""
        response = api_client.post(f"{BASE_URL}/api/knowledge-engine/query", json={
            "domain_id": "ontology",
            "path": "module_map"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["path"] == "module_map"
        assert isinstance(data["result"], dict)
        print("✓ Query with path navigation successful")
    
    def test_query_invalid_path(self, api_client):
        """POST /api/knowledge-engine/query - invalid path returns 404"""
        response = api_client.post(f"{BASE_URL}/api/knowledge-engine/query", json={
            "domain_id": "ontology",
            "path": "nonexistent.path.here"
        })
        assert response.status_code == 404
        print("✓ Invalid path returns 404")


class TestStaffingRecommendation:
    """Tests for staffing calculator"""
    
    def test_recommend_staffing_basic(self, api_client):
        """POST /api/knowledge-engine/recommend/staffing - basic staffing calculation"""
        response = api_client.post(f"{BASE_URL}/api/knowledge-engine/recommend/staffing", json={
            "guest_count": 150,
            "service_style": "standard_buffet",
            "event_type": "corporate",
            "luxury_tier": "classic"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["recommendation"] == "staffing"
        assert "foh_breakdown" in data
        assert "boh_breakdown" in data
        assert "totals" in data
        assert data["totals"]["total_staff"] > 0
        print(f"✓ Staffing recommendation: {data['totals']['total_staff']} total staff")
    
    def test_recommend_staffing_with_complexity(self, api_client):
        """POST /api/knowledge-engine/recommend/staffing - with complexity factors"""
        response = api_client.post(f"{BASE_URL}/api/knowledge-engine/recommend/staffing", json={
            "guest_count": 200,
            "service_style": "luxury_buffet",
            "event_type": "wedding",
            "luxury_tier": "signature",
            "station_count": 3,
            "action_station_count": 2,
            "bar_count": 2,
            "is_outdoor": True,
            "has_room_flip": True,
            "event_duration_hours": 5,
            "high_dietary_complexity": True
        })
        assert response.status_code == 200
        data = response.json()
        assert data["totals"]["complexity_multiplier"] > 1.0, "Complexity multiplier should be > 1"
        assert len(data["active_complexity_factors"]) > 0, "Should have active complexity factors"
        assert "explainability" in data
        print(f"✓ Staffing with complexity: multiplier={data['totals']['complexity_multiplier']}, factors={len(data['active_complexity_factors'])}")


class TestLayoutRecommendation:
    """Tests for layout advisor"""
    
    def test_recommend_layout_basic(self, api_client):
        """POST /api/knowledge-engine/recommend/layout - basic layout recommendation"""
        response = api_client.post(f"{BASE_URL}/api/knowledge-engine/recommend/layout", json={
            "guest_count": 150,
            "service_style": "buffet",
            "station_types": ["self_serve_buffet_segment", "carving_station"]
        })
        assert response.status_code == 200
        data = response.json()
        assert data["recommendation"] == "layout"
        assert "recommended_pattern" in data
        assert "lines_needed" in data
        assert "reasoning" in data
        assert data["lines_needed"] >= 1
        print(f"✓ Layout recommendation: pattern={data['recommended_pattern']}, lines={data['lines_needed']}")
    
    def test_recommend_layout_with_pinch_points(self, api_client):
        """POST /api/knowledge-engine/recommend/layout - with pinch point analysis"""
        response = api_client.post(f"{BASE_URL}/api/knowledge-engine/recommend/layout", json={
            "guest_count": 200,
            "service_style": "buffet",
            "station_types": ["self_serve_buffet_segment", "carving_station", "dessert_self_serve"],
            "has_bar": True,
            "luxury_tier": "signature"
        })
        assert response.status_code == 200
        data = response.json()
        assert "likely_pinch_points" in data
        assert "throughput_analysis" in data
        assert "flow_zones" in data
        print(f"✓ Layout with pinch points: {len(data['likely_pinch_points'])} pinch points identified")


class TestRiskAssessment:
    """Tests for risk assessment"""
    
    def test_recommend_risk_low(self, api_client):
        """POST /api/knowledge-engine/recommend/risk-assessment - low risk scenario"""
        response = api_client.post(f"{BASE_URL}/api/knowledge-engine/recommend/risk-assessment", json={
            "event_type": "corporate",
            "service_style": "buffet",
            "guest_count": 100,
            "is_outdoor": False,
            "has_weather_plan": True,
            "custom_menu_within_72h": False,
            "guest_count_growth_pct": 0,
            "has_power_plan": True,
            "late_guarantee": False
        })
        assert response.status_code == 200
        data = response.json()
        assert data["recommendation"] == "risk_assessment"
        assert "overall_risk_level" in data
        assert "risk_score" in data
        assert "risk_flags" in data
        assert data["overall_risk_level"] in ["low", "medium", "high", "critical"]
        print(f"✓ Risk assessment: level={data['overall_risk_level']}, score={data['risk_score']}")
    
    def test_recommend_risk_high(self, api_client):
        """POST /api/knowledge-engine/recommend/risk-assessment - high risk scenario"""
        response = api_client.post(f"{BASE_URL}/api/knowledge-engine/recommend/risk-assessment", json={
            "event_type": "wedding",
            "service_style": "buffet",
            "guest_count": 300,
            "is_outdoor": True,
            "has_weather_plan": False,
            "custom_menu_within_72h": True,
            "guest_count_growth_pct": 25,
            "action_station_count": 3,
            "has_power_plan": False,
            "late_guarantee": True,
            "luxury_tier": "luxury"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["risk_score"] >= 30, "High risk scenario should have score >= 30"
        assert len(data["risk_flags"]) >= 3, "Should have multiple risk flags"
        print(f"✓ High risk assessment: level={data['overall_risk_level']}, score={data['risk_score']}, flags={len(data['risk_flags'])}")


class TestPurchasingIntelligence:
    """Tests for purchasing intelligence"""
    
    def test_recommend_purchasing_basic(self, api_client):
        """POST /api/knowledge-engine/recommend/purchasing - basic purchasing intel"""
        response = api_client.post(f"{BASE_URL}/api/knowledge-engine/recommend/purchasing", json={
            "guest_count": 150,
            "event_type": "corporate",
            "service_style": "buffet",
            "luxury_tier": "classic"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["recommendation"] == "purchasing"
        assert "adult_equivalent_guest_count" in data
        assert "quantity_logic_layers" in data
        assert "procurement_confidence" in data
        assert "support_items_checklist" in data
        print(f"✓ Purchasing intel: adult_equiv={data['adult_equivalent_guest_count']}")
    
    def test_recommend_purchasing_with_triggers(self, api_client):
        """POST /api/knowledge-engine/recommend/purchasing - with contingency triggers"""
        response = api_client.post(f"{BASE_URL}/api/knowledge-engine/recommend/purchasing", json={
            "guest_count": 200,
            "event_type": "wedding",
            "service_style": "buffet",
            "luxury_tier": "luxury",
            "is_outdoor": True,
            "high_alcohol": True,
            "family_heavy": True,
            "child_count": 30,
            "vendor_meals": 10,
            "staff_meals": 15
        })
        assert response.status_code == 200
        data = response.json()
        # Adult equivalent = 200 + (30 * 0.5) + 10 + 15 = 240
        assert data["adult_equivalent_guest_count"] == 240
        assert len(data["active_contingency_triggers"]) > 0
        print(f"✓ Purchasing with triggers: {len(data['active_contingency_triggers'])} triggers active")


class TestPricingRecommendation:
    """Tests for pricing/package intelligence"""
    
    def test_recommend_pricing_basic(self, api_client):
        """POST /api/knowledge-engine/recommend/pricing - basic pricing"""
        response = api_client.post(f"{BASE_URL}/api/knowledge-engine/recommend/pricing", json={
            "event_type": "wedding",
            "service_style": "buffet",
            "meal_period": "dinner",
            "guest_count": 150,
            "tier": "signature"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["recommendation"] == "pricing"
        assert "matched_package" in data
        assert "estimate" in data
        assert "margin_guardrails" in data
        assert data["estimate"]["gross_total"] > 0
        print(f"✓ Pricing: gross_total=${data['estimate']['gross_total']}, net_total=${data['estimate']['net_total']}")
    
    def test_recommend_pricing_with_upgrades_and_bar(self, api_client):
        """POST /api/knowledge-engine/recommend/pricing - with upgrades and bar"""
        response = api_client.post(f"{BASE_URL}/api/knowledge-engine/recommend/pricing", json={
            "event_type": "wedding",
            "service_style": "buffet",
            "meal_period": "dinner",
            "guest_count": 150,
            "tier": "signature",
            "upgrades": ["upg_premium_protein", "upg_artisan_bread"],
            "bar_model": "hosted_hourly",
            "bar_tier": "premium",
            "bar_hours": 4,
            "bar_demand_level": "moderate",
            "concession_percent": 5,
            "concession_reason": "repeat_client"
        })
        assert response.status_code == 200
        data = response.json()
        assert "bar" in data
        assert data["bar"] is not None
        assert data["estimate"]["concession_amount"] > 0
        assert "concession_approval_tier" in data["estimate"]
        print(f"✓ Pricing with upgrades: bar_pp=${data['estimate']['bar_pp']}, concession=${data['estimate']['concession_amount']}")


class TestBEOQualityCheck:
    """Tests for BEO quality validation"""
    
    def test_beo_quality_check_pass(self, api_client):
        """POST /api/knowledge-engine/recommend/beo-quality-check - passing check"""
        response = api_client.post(f"{BASE_URL}/api/knowledge-engine/recommend/beo-quality-check", params={
            "event_type": "corporate",
            "guest_count": 100,
            "station_count": 2,
            "has_power_plan": True,
            "dietary_count": 10,
            "room_access_minutes": 120,
            "has_rain_plan": True,
            "is_outdoor": False,
            "vendor_meals": 5,
            "staff_meals": 10
        })
        assert response.status_code == 200
        data = response.json()
        assert data["recommendation"] == "beo_quality_check"
        assert "all_checks" in data
        assert "issues_found" in data
        print(f"✓ BEO quality check: passed={data['passed']}, issues={len(data['issues_found'])}")
    
    def test_beo_quality_check_fail(self, api_client):
        """POST /api/knowledge-engine/recommend/beo-quality-check - failing check"""
        response = api_client.post(f"{BASE_URL}/api/knowledge-engine/recommend/beo-quality-check", params={
            "event_type": "wedding",
            "guest_count": 250,
            "station_count": 1,
            "has_power_plan": False,
            "dietary_count": 100,
            "room_access_minutes": 30,
            "has_rain_plan": False,
            "is_outdoor": True,
            "vendor_meals": 0,
            "staff_meals": 0
        })
        assert response.status_code == 200
        data = response.json()
        assert data["passed"] == False
        assert len(data["issues_found"]) > 0
        print(f"✓ BEO quality check failed as expected: {len(data['issues_found'])} issues")


class TestCulinaryProfiles:
    """Tests for culinary profiles"""
    
    def test_get_culinary_profiles(self, api_client):
        """GET /api/knowledge-engine/recommend/culinary-profiles"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/recommend/culinary-profiles")
        assert response.status_code == 200
        data = response.json()
        assert "item_behavior_profiles" in data
        assert "menu_balancing_rules" in data
        assert "replenishment_guidance" in data
        assert "common_failure_modes" in data
        assert len(data["item_behavior_profiles"]) > 0
        print(f"✓ Culinary profiles: {len(data['item_behavior_profiles'])} profiles, {len(data['menu_balancing_rules'])} rules")


class TestLifecycleStages:
    """Tests for event lifecycle stages"""
    
    def test_list_lifecycle_stages(self, api_client):
        """GET /api/knowledge-engine/recommend/lifecycle-stages"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/recommend/lifecycle-stages")
        assert response.status_code == 200
        data = response.json()
        assert "stages" in data
        assert len(data["stages"]) > 0
        for stage in data["stages"]:
            assert "stage_id" in stage
            assert "name" in stage
            assert "objective" in stage
        print(f"✓ Lifecycle stages: {len(data['stages'])} stages")
        return data["stages"]
    
    def test_get_lifecycle_stage_detail(self, api_client):
        """GET /api/knowledge-engine/recommend/lifecycle-stage/{stage_id}"""
        # First get list of stages
        list_response = api_client.get(f"{BASE_URL}/api/knowledge-engine/recommend/lifecycle-stages")
        stages = list_response.json()["stages"]
        if len(stages) > 0:
            stage_id = stages[0]["stage_id"]
            response = api_client.get(f"{BASE_URL}/api/knowledge-engine/recommend/lifecycle-stage/{stage_id}")
            assert response.status_code == 200
            data = response.json()
            assert "stage" in data
            assert data["stage"]["stage_id"] == stage_id
            print(f"✓ Lifecycle stage detail: {stage_id}")
    
    def test_get_lifecycle_stage_not_found(self, api_client):
        """GET /api/knowledge-engine/recommend/lifecycle-stage/invalid - returns 404"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/recommend/lifecycle-stage/invalid_stage_xyz")
        assert response.status_code == 404
        print("✓ Invalid lifecycle stage returns 404")


class TestLearningTemplate:
    """Tests for post-event learning template"""
    
    def test_get_learning_template(self, api_client):
        """GET /api/knowledge-engine/recommend/learning-template"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/recommend/learning-template")
        assert response.status_code == 200
        data = response.json()
        assert "capture_sections" in data
        assert "metrics" in data
        assert "learning_record_template" in data
        assert "feedback_sources" in data
        assert "self_learning_rules" in data
        print(f"✓ Learning template: {len(data.get('capture_sections', []))} sections")


class TestPackageCatalog:
    """Tests for package catalog endpoints"""
    
    def test_list_packages(self, api_client):
        """GET /api/knowledge-engine/packages"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/packages")
        assert response.status_code == 200
        data = response.json()
        assert "packages" in data
        assert "count" in data
        assert data["count"] > 0
        print(f"✓ Packages list: {data['count']} packages")
    
    def test_list_packages_with_filters(self, api_client):
        """GET /api/knowledge-engine/packages - with tier filter"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/packages", params={"tier": "classic"})
        assert response.status_code == 200
        data = response.json()
        for pkg in data["packages"]:
            assert pkg["tier"] == "classic"
        print(f"✓ Packages filtered by tier: {data['count']} classic packages")
    
    def test_get_package_by_id(self, api_client):
        """GET /api/knowledge-engine/packages/{package_id}"""
        # First get list to find a valid package_id
        list_response = api_client.get(f"{BASE_URL}/api/knowledge-engine/packages")
        packages = list_response.json()["packages"]
        if len(packages) > 0:
            package_id = packages[0]["package_id"]
            response = api_client.get(f"{BASE_URL}/api/knowledge-engine/packages/{package_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["package_id"] == package_id
            assert "package_name" in data
            assert "tier" in data
            print(f"✓ Package detail: {package_id}")
    
    def test_get_package_not_found(self, api_client):
        """GET /api/knowledge-engine/packages/invalid - returns 404"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/packages/invalid_package_xyz")
        assert response.status_code == 404
        print("✓ Invalid package returns 404")


class TestPricingCatalog:
    """Tests for pricing catalog endpoints"""
    
    def test_list_upgrades(self, api_client):
        """GET /api/knowledge-engine/upgrades"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/upgrades")
        assert response.status_code == 200
        data = response.json()
        # Should have food_upgrades, beverage_upgrades, presentation_upgrades
        assert isinstance(data, dict)
        print(f"✓ Upgrades: {len(data.get('food_upgrades', []))} food, {len(data.get('beverage_upgrades', []))} beverage")
    
    def test_list_bar_models(self, api_client):
        """GET /api/knowledge-engine/bar-models"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/bar-models")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"✓ Bar models retrieved")
    
    def test_list_addons(self, api_client):
        """GET /api/knowledge-engine/addons"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/addons")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"✓ Addons retrieved")
    
    def test_get_concession_rules(self, api_client):
        """GET /api/knowledge-engine/concession-rules"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/concession-rules")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"✓ Concession rules retrieved")
    
    def test_get_margin_guardrails(self, api_client):
        """GET /api/knowledge-engine/margin-guardrails"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/margin-guardrails")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"✓ Margin guardrails retrieved")
    
    def test_get_deposit_templates(self, api_client):
        """GET /api/knowledge-engine/deposit-templates"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/deposit-templates")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"✓ Deposit templates retrieved")
    
    def test_get_formulas(self, api_client):
        """GET /api/knowledge-engine/formulas"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/formulas")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"✓ Pricing formulas retrieved")


class TestOverrides:
    """Tests for property-specific overrides CRUD"""
    
    def test_create_override(self, api_client):
        """POST /api/knowledge-engine/overrides - create override"""
        response = api_client.post(f"{BASE_URL}/api/knowledge-engine/overrides", json={
            "domain_id": "staffing_service",
            "path": "service_models.0.foh_planning_defaults.servers_per_guests",
            "value": {"custom_ratio": 40},
            "scope": {"property_id": "TEST_ITER28_PROPERTY"},
            "reason": "Test override for iteration 28"
        })
        assert response.status_code == 200
        data = response.json()
        assert "override_id" in data
        assert data["domain_id"] == "staffing_service"
        assert data["active"] == True
        print(f"✓ Override created: {data['override_id']}")
        return data["override_id"]
    
    def test_list_overrides(self, api_client):
        """GET /api/knowledge-engine/overrides - list active overrides"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/overrides")
        assert response.status_code == 200
        data = response.json()
        assert "overrides" in data
        assert "count" in data
        print(f"✓ Overrides list: {data['count']} active overrides")
    
    def test_list_overrides_by_domain(self, api_client):
        """GET /api/knowledge-engine/overrides - filter by domain"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/overrides", params={"domain_id": "staffing_service"})
        assert response.status_code == 200
        data = response.json()
        for override in data["overrides"]:
            assert override["domain_id"] == "staffing_service"
        print(f"✓ Overrides filtered by domain: {data['count']}")
    
    def test_delete_override(self, api_client):
        """DELETE /api/knowledge-engine/overrides/{override_id} - deactivate override"""
        # First create an override to delete
        create_response = api_client.post(f"{BASE_URL}/api/knowledge-engine/overrides", json={
            "domain_id": "risk_safety",
            "path": "test.path",
            "value": {"test": True},
            "scope": {"property_id": "TEST_ITER28_DELETE"},
            "reason": "Test override to delete"
        })
        override_id = create_response.json()["override_id"]
        
        # Delete it
        response = api_client.delete(f"{BASE_URL}/api/knowledge-engine/overrides/{override_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["deleted"] == override_id
        print(f"✓ Override deleted: {override_id}")
    
    def test_delete_override_not_found(self, api_client):
        """DELETE /api/knowledge-engine/overrides/invalid - returns 404"""
        response = api_client.delete(f"{BASE_URL}/api/knowledge-engine/overrides/invalid_override_xyz")
        assert response.status_code == 404
        print("✓ Invalid override delete returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
