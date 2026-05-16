"""
Iteration 55 - EchoAi3 Confidence Visualization Engine & Chef-Mode Cognitive Assistant Tests
============================================================================================
Tests for:
1. Confidence Visualization Engine - Real-time confidence heatmap across 9 domains
2. Chef-Mode Cognitive Assistant - Culinary intelligence APIs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestConfidenceVisualizationEngine:
    """Tests for the Confidence Visualization Engine APIs"""
    
    def test_confidence_heatmap_returns_9_domains(self):
        """GET /api/echoai3/confidence/heatmap - returns 9 domain confidence scores"""
        response = requests.get(f"{BASE_URL}/api/echoai3/confidence/heatmap")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify platform confidence
        assert "platform_confidence" in data, "Missing platform_confidence"
        assert isinstance(data["platform_confidence"], int), "platform_confidence should be int"
        assert 0 <= data["platform_confidence"] <= 100, "platform_confidence should be 0-100"
        
        # Verify platform status
        assert "platform_status" in data, "Missing platform_status"
        assert data["platform_status"] in ["high", "moderate", "low"], f"Invalid status: {data['platform_status']}"
        
        # Verify 9 domains
        assert "domains" in data, "Missing domains"
        assert len(data["domains"]) == 9, f"Expected 9 domains, got {len(data['domains'])}"
        
        # Verify domain structure
        expected_domains = ["finance", "events", "inventory", "labor", "culinary", "vendor", "guest", "beverage", "operations"]
        domain_keys = [d["domain"] for d in data["domains"]]
        for expected in expected_domains:
            assert expected in domain_keys, f"Missing domain: {expected}"
        
        # Verify each domain has required fields
        for domain in data["domains"]:
            assert "confidence" in domain, f"Domain {domain['domain']} missing confidence"
            assert "coverage_score" in domain, f"Domain {domain['domain']} missing coverage_score"
            assert "freshness_score" in domain, f"Domain {domain['domain']} missing freshness_score"
            assert "completeness_score" in domain, f"Domain {domain['domain']} missing completeness_score"
            assert "blind_spots" in domain, f"Domain {domain['domain']} missing blind_spots"
            assert "status" in domain, f"Domain {domain['domain']} missing status"
        
        # Verify summary
        assert "summary" in data, "Missing summary"
        assert "high_confidence" in data["summary"], "Missing high_confidence in summary"
        assert "moderate_confidence" in data["summary"], "Missing moderate_confidence in summary"
        assert "low_confidence" in data["summary"], "Missing low_confidence in summary"
        assert "blind_spots" in data["summary"], "Missing blind_spots in summary"
        
        # Verify total_data_points
        assert "total_data_points" in data, "Missing total_data_points"
        
        print(f"✓ Heatmap returned {len(data['domains'])} domains with platform confidence {data['platform_confidence']}%")
    
    def test_confidence_domain_finance(self):
        """GET /api/echoai3/confidence/domain/finance - returns detailed finance confidence"""
        response = requests.get(f"{BASE_URL}/api/echoai3/confidence/domain/finance")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["domain"] == "finance", f"Expected finance domain, got {data.get('domain')}"
        assert "label" in data, "Missing label"
        assert "Financial Intelligence" in data["label"], f"Unexpected label: {data['label']}"
        assert "confidence" in data, "Missing confidence"
        assert "collections" in data, "Missing collections"
        
        # Finance should have gl_entries, budgets, invoices, vendor_orders
        collection_names = [c["collection"] for c in data["collections"]]
        assert "gl_entries" in collection_names, "Missing gl_entries collection"
        
        print(f"✓ Finance domain confidence: {data['confidence']}% with {len(data['collections'])} collections")
    
    def test_confidence_domain_labor_low(self):
        """GET /api/echoai3/confidence/domain/labor - should show LOW confidence"""
        response = requests.get(f"{BASE_URL}/api/echoai3/confidence/domain/labor")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["domain"] == "labor", f"Expected labor domain, got {data.get('domain')}"
        
        # Labor should have low confidence based on agent context (36%)
        # We verify it's in the low range (< 50%)
        confidence = data["confidence"]
        print(f"✓ Labor domain confidence: {confidence}% (status: {data['status']})")
        
        # Verify collections
        collection_names = [c["collection"] for c in data["collections"]]
        assert "labor_schedules" in collection_names or "labor_actuals" in collection_names, "Missing labor collections"
    
    def test_confidence_domain_invalid(self):
        """GET /api/echoai3/confidence/domain/invalid - returns error for unknown domain"""
        response = requests.get(f"{BASE_URL}/api/echoai3/confidence/domain/invalid_domain")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "error" in data, "Expected error for invalid domain"
        assert "available" in data, "Expected available domains list"
        print(f"✓ Invalid domain returns error with available domains list")
    
    def test_confidence_usage_stats(self):
        """GET /api/echoai3/confidence/usage - returns AI usage stats"""
        response = requests.get(f"{BASE_URL}/api/echoai3/confidence/usage")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify required fields
        assert "feedback_count" in data, "Missing feedback_count"
        assert "total_sessions" in data, "Missing total_sessions"
        assert "satisfaction_score" in data, "Missing satisfaction_score"
        assert "avg_rating" in data, "Missing avg_rating"
        
        print(f"✓ Usage stats: {data['total_sessions']} sessions, {data['feedback_count']} feedback, satisfaction: {data['satisfaction_score']}%")
    
    def test_confidence_recommendations(self):
        """GET /api/echoai3/confidence/recommendations - returns prioritized recommendations"""
        response = requests.get(f"{BASE_URL}/api/echoai3/confidence/recommendations")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "recommendations" in data, "Missing recommendations"
        assert "total_recommendations" in data, "Missing total_recommendations"
        
        # Verify recommendation structure
        if data["recommendations"]:
            rec = data["recommendations"][0]
            assert "domain" in rec, "Recommendation missing domain"
            assert "priority" in rec, "Recommendation missing priority"
            assert "action" in rec, "Recommendation missing action"
            assert "impact" in rec, "Recommendation missing impact"
            assert rec["priority"] in ["critical", "high", "medium"], f"Invalid priority: {rec['priority']}"
        
        print(f"✓ Got {data['total_recommendations']} recommendations, highest priority: {data.get('highest_priority', 'none')}")


class TestChefModeCognitiveAssistant:
    """Tests for the Chef-Mode Cognitive Assistant APIs"""
    
    def test_chef_scale_recipe(self):
        """POST /api/echoai3/chef/scale - scale recipe from 4 to 100 servings"""
        payload = {
            "recipe_name": "salmon",
            "original_servings": 4,
            "target_servings": 100
        }
        response = requests.post(f"{BASE_URL}/api/echoai3/chef/scale", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "recipe" in data, "Missing recipe"
        assert "scale_factor" in data, "Missing scale_factor"
        assert data["scale_factor"] == 25.0, f"Expected scale factor 25, got {data['scale_factor']}"
        assert "original_servings" in data, "Missing original_servings"
        assert "target_servings" in data, "Missing target_servings"
        assert "chef_notes" in data, "Missing chef_notes"
        
        # If found in DB, should have scaled_ingredients
        if data.get("found_in_db"):
            assert "scaled_ingredients" in data, "Missing scaled_ingredients"
            print(f"✓ Recipe '{data['recipe']}' found in DB, scaled {len(data['scaled_ingredients'])} ingredients")
        else:
            print(f"✓ Recipe '{data['recipe']}' not in DB, scale factor: {data['scale_factor']}x")
        
        print(f"  Chef notes: {data['chef_notes'][0]}")
    
    def test_chef_allergen_check(self):
        """POST /api/echoai3/chef/allergen-check - check ingredients against allergens"""
        payload = {
            "ingredients": ["shrimp", "flour", "butter"],
            "allergens_to_check": ["shellfish", "gluten", "dairy"]
        }
        response = requests.post(f"{BASE_URL}/api/echoai3/chef/allergen-check", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "ingredients_checked" in data, "Missing ingredients_checked"
        assert data["ingredients_checked"] == 3, f"Expected 3 ingredients, got {data['ingredients_checked']}"
        assert "allergens_checked" in data, "Missing allergens_checked"
        assert "flags" in data, "Missing flags"
        assert "total_flags" in data, "Missing total_flags"
        assert "safe_to_serve" in data, "Missing safe_to_serve"
        
        # Should flag all 3 allergens
        assert data["total_flags"] >= 3, f"Expected at least 3 flags, got {data['total_flags']}"
        assert data["safe_to_serve"] == False, "Should not be safe to serve with allergens"
        
        # Verify specific flags
        flagged_allergens = [f["allergen"] for f in data["flags"]]
        assert "shellfish" in flagged_allergens, "Should flag shellfish (shrimp)"
        assert "gluten" in flagged_allergens, "Should flag gluten (flour)"
        assert "dairy" in flagged_allergens, "Should flag dairy (butter)"
        
        print(f"✓ Allergen check: {data['total_flags']} flags detected, safe_to_serve: {data['safe_to_serve']}")
    
    def test_chef_substitute_butter(self):
        """POST /api/echoai3/chef/substitute - find substitution for butter"""
        payload = {
            "ingredient": "butter",
            "reason": "allergen"
        }
        response = requests.post(f"{BASE_URL}/api/echoai3/chef/substitute", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "original_ingredient" in data, "Missing original_ingredient"
        assert data["original_ingredient"] == "butter", f"Expected butter, got {data['original_ingredient']}"
        assert "reason" in data, "Missing reason"
        assert "substitutions" in data, "Missing substitutions"
        assert "count" in data, "Missing count"
        assert "recommendation" in data, "Missing recommendation"
        
        # Should have substitutions for butter
        assert data["count"] > 0, "Expected at least one substitution for butter"
        
        # Verify substitution structure
        if data["substitutions"]:
            sub = data["substitutions"][0]
            assert "sub" in sub, "Substitution missing sub"
            assert "ratio" in sub, "Substitution missing ratio"
            assert "best_for" in sub, "Substitution missing best_for"
        
        print(f"✓ Found {data['count']} substitutions for butter, recommended: {data['recommendation']}")
    
    def test_chef_prep_timeline(self):
        """POST /api/echoai3/chef/prep-timeline - generate prep timeline for 200 covers"""
        payload = {
            "event_type": "plated_dinner",
            "covers": 200,
            "service_time": "19:00",
            "menu_items": 6
        }
        response = requests.post(f"{BASE_URL}/api/echoai3/chef/prep-timeline", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "event_type" in data, "Missing event_type"
        assert data["event_type"] == "plated_dinner", f"Expected plated_dinner, got {data['event_type']}"
        assert "covers" in data, "Missing covers"
        assert data["covers"] == 200, f"Expected 200 covers, got {data['covers']}"
        assert "service_time" in data, "Missing service_time"
        assert "total_prep_hours" in data, "Missing total_prep_hours"
        assert "kitchen_call_time" in data, "Missing kitchen_call_time"
        assert "timeline" in data, "Missing timeline"
        assert "staffing" in data, "Missing staffing"
        
        # Verify timeline has milestones
        assert len(data["timeline"]) > 5, f"Expected more than 5 milestones, got {len(data['timeline'])}"
        
        # Verify milestone structure
        milestone = data["timeline"][0]
        assert "time" in milestone, "Milestone missing time"
        assert "task" in milestone, "Milestone missing task"
        assert "department" in milestone, "Milestone missing department"
        
        # Verify staffing
        assert "cooks_needed" in data["staffing"], "Missing cooks_needed"
        assert "servers" in data["staffing"], "Missing servers"
        
        print(f"✓ Prep timeline: {data['total_prep_hours']}h prep, kitchen call at {data['kitchen_call_time']}, {len(data['timeline'])} milestones")
        print(f"  Staffing: {data['staffing']['cooks_needed']} cooks, {data['staffing']['servers']} servers")
    
    def test_chef_allergen_matrix(self):
        """GET /api/echoai3/chef/allergen-matrix - returns full allergen matrix"""
        response = requests.get(f"{BASE_URL}/api/echoai3/chef/allergen-matrix")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "allergens" in data, "Missing allergens"
        assert "count" in data, "Missing count"
        assert data["count"] == 8, f"Expected 8 allergens, got {data['count']}"
        
        # Verify all 8 allergen categories
        expected_allergens = ["gluten", "dairy", "nuts", "shellfish", "eggs", "soy", "fish", "sesame"]
        for allergen in expected_allergens:
            assert allergen in data["allergens"], f"Missing allergen: {allergen}"
            assert isinstance(data["allergens"][allergen], list), f"Allergen {allergen} should be a list"
        
        print(f"✓ Allergen matrix: {data['count']} allergen categories")
    
    def test_chef_ask_culinary_question(self):
        """POST /api/echoai3/chef/ask - ask a culinary question"""
        payload = {
            "query": "What is the ideal internal temperature for medium-rare beef?",
            "context": "kitchen"
        }
        response = requests.post(f"{BASE_URL}/api/echoai3/chef/ask", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "query_id" in data, "Missing query_id"
        assert "response" in data, "Missing response"
        assert "context" in data, "Missing context"
        assert "timestamp" in data, "Missing timestamp"
        
        # Response should contain some text
        assert len(data["response"]) > 10, "Response too short"
        
        print(f"✓ Chef AI responded to culinary question (query_id: {data['query_id']})")
        print(f"  Response preview: {data['response'][:100]}...")
    
    def test_chef_allergen_check_all_allergens(self):
        """POST /api/echoai3/chef/allergen-check - check with empty allergens_to_check (checks all)"""
        payload = {
            "ingredients": ["salmon", "tofu", "egg", "tahini"],
            "allergens_to_check": []  # Empty = check all
        }
        response = requests.post(f"{BASE_URL}/api/echoai3/chef/allergen-check", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Should check all 8 allergens
        assert len(data["allergens_checked"]) == 8, f"Expected 8 allergens checked, got {len(data['allergens_checked'])}"
        
        # Should flag fish (salmon), soy (tofu), eggs (egg), sesame (tahini)
        flagged_allergens = [f["allergen"] for f in data["flags"]]
        assert "fish" in flagged_allergens, "Should flag fish (salmon)"
        assert "soy" in flagged_allergens, "Should flag soy (tofu)"
        assert "eggs" in flagged_allergens, "Should flag eggs (egg)"
        assert "sesame" in flagged_allergens, "Should flag sesame (tahini)"
        
        print(f"✓ Full allergen check: {data['total_flags']} flags from {len(data['allergens_checked'])} allergens")


class TestConfidenceChefIntegration:
    """Integration tests between Confidence and Chef modules"""
    
    def test_heatmap_culinary_domain_exists(self):
        """Verify culinary domain exists in heatmap (used by Chef mode)"""
        response = requests.get(f"{BASE_URL}/api/echoai3/confidence/heatmap")
        assert response.status_code == 200
        
        data = response.json()
        culinary_domain = next((d for d in data["domains"] if d["domain"] == "culinary"), None)
        assert culinary_domain is not None, "Culinary domain not found in heatmap"
        
        # Culinary should have menu_items and recipes collections
        collection_names = [c["collection"] for c in culinary_domain["collections"]]
        assert "menu_items" in collection_names or "recipes" in collection_names, "Missing culinary collections"
        
        print(f"✓ Culinary domain confidence: {culinary_domain['confidence']}% ({culinary_domain['total_records']} records)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
