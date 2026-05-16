"""
Iteration 83: Guest Intelligence Module Tests
==============================================
Tests for the new Guest Intelligence system:
- Dashboard with KPIs (profiles, VIP, allergy alerts, repeat guests, amenities, requests)
- Guest profile lookup by room number, email, guest_id, room key
- Allergen/dietary tracking and updates
- Amenity delivery tracking and suggestions (filters allergen-incompatible items)
- Spend tracking across IRD, minibar, spa, retail
- Special requests management
- Search functionality (name, email, room, key ID, loyalty number)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestGuestIntelligenceDashboard:
    """Dashboard endpoint tests - KPIs and top guests"""
    
    def test_dashboard_returns_kpis(self):
        """GET /api/guest-intel/dashboard returns KPIs and top guests"""
        response = requests.get(f"{BASE_URL}/api/guest-intel/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        # Verify KPIs structure
        assert "kpis" in data
        kpis = data["kpis"]
        assert "total_profiles" in kpis
        assert "vip_guests" in kpis
        assert "allergy_alerts" in kpis
        assert "repeat_guests" in kpis
        assert "amenities_delivered" in kpis
        assert "pending_requests" in kpis
        
        # Verify expected counts from seed data
        assert kpis["total_profiles"] >= 3, "Should have at least 3 seeded profiles"
        assert kpis["vip_guests"] >= 2, "Should have at least 2 VIP guests (Smith, Chen)"
        assert kpis["allergy_alerts"] >= 2, "Should have at least 2 allergy alerts (Smith, Chen)"
        
        # Verify top_guests list
        assert "top_guests" in data
        assert len(data["top_guests"]) >= 3, "Should have at least 3 top guests"
        
    def test_dashboard_top_guests_structure(self):
        """Verify top guests have required fields"""
        response = requests.get(f"{BASE_URL}/api/guest-intel/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        for guest in data["top_guests"]:
            assert "guest_id" in guest
            assert "first_name" in guest
            assert "last_name" in guest
            assert "room_number" in guest
            assert "lifetime_spend" in guest
            assert "visit_count" in guest


class TestGuestProfileLookup:
    """Profile lookup by various identifiers"""
    
    def test_profile_by_room_number_412(self):
        """GET /api/guest-intel/profile/412 returns James Smith"""
        response = requests.get(f"{BASE_URL}/api/guest-intel/profile/412")
        assert response.status_code == 200
        data = response.json()
        
        assert data["found"] == True
        profile = data["profile"]
        assert profile["first_name"] == "James"
        assert profile["last_name"] == "Smith"
        assert profile["room_number"] == "412"
        assert profile["vip"] == True
        
        # Verify allergens
        assert "shellfish" in profile["allergens"]
        assert "tree nuts" in profile["allergens"]
        
        # Verify dietary restrictions
        assert "gluten-free" in profile["dietary_restrictions"]
        
        # Verify visit count and lifetime spend
        assert profile["visit_count"] == 7
        assert profile["lifetime_spend"] == 24580.00
        
    def test_profile_by_room_number_501(self):
        """GET /api/guest-intel/profile/501 returns Michael Chen"""
        response = requests.get(f"{BASE_URL}/api/guest-intel/profile/501")
        assert response.status_code == 200
        data = response.json()
        
        assert data["found"] == True
        profile = data["profile"]
        assert profile["first_name"] == "Michael"
        assert profile["last_name"] == "Chen"
        assert profile["vip"] == True
        
        # Verify allergens
        assert "dairy" in profile["allergens"]
        assert "eggs" in profile["allergens"]
        
        # Verify dietary restrictions
        assert "vegan" in profile["dietary_restrictions"]
        
        # Verify visit count
        assert profile["visit_count"] == 12
        
    def test_profile_includes_spend_breakdown(self):
        """Profile includes current stay spend breakdown"""
        response = requests.get(f"{BASE_URL}/api/guest-intel/profile/412")
        assert response.status_code == 200
        data = response.json()
        
        assert "spend" in data
        spend = data["spend"]
        assert "ird" in spend
        assert "minibar" in spend
        assert "spa" in spend
        assert "retail" in spend
        assert "total" in spend
        
    def test_profile_includes_amenity_history(self):
        """Profile includes amenity history by visit"""
        response = requests.get(f"{BASE_URL}/api/guest-intel/profile/412")
        assert response.status_code == 200
        data = response.json()
        
        assert "amenity_history" in data
        assert "amenities_by_visit" in data
        assert "avoid_amenities" in data
        assert "suggested_amenities" in data
        
    def test_profile_includes_payment_methods(self):
        """Profile includes payment methods"""
        response = requests.get(f"{BASE_URL}/api/guest-intel/profile/412")
        assert response.status_code == 200
        data = response.json()
        
        profile = data["profile"]
        assert "payment_methods" in profile
        assert len(profile["payment_methods"]) >= 2
        
        # Check for credit card
        has_credit_card = any(pm.get("type") == "credit_card" for pm in profile["payment_methods"])
        assert has_credit_card, "Should have credit card payment method"
        
        # Check for room key
        has_room_key = any(pm.get("type") == "room_key" for pm in profile["payment_methods"])
        assert has_room_key, "Should have room key payment method"
        
    def test_profile_not_found(self):
        """Profile lookup for non-existent room returns found=False"""
        response = requests.get(f"{BASE_URL}/api/guest-intel/profile/999")
        assert response.status_code == 200
        data = response.json()
        assert data["found"] == False


class TestGuestSearch:
    """Search functionality tests"""
    
    def test_search_by_name_smith(self):
        """GET /api/guest-intel/search?q=Smith returns guest profile"""
        response = requests.get(f"{BASE_URL}/api/guest-intel/search?q=Smith")
        assert response.status_code == 200
        data = response.json()
        
        assert "results" in data
        assert len(data["results"]) >= 1
        
        # Find Smith in results
        smith = next((r for r in data["results"] if r["last_name"] == "Smith"), None)
        assert smith is not None, "Should find Smith in search results"
        assert smith["first_name"] == "James"
        
    def test_search_by_room_key_id(self):
        """GET /api/guest-intel/search?q=RK-412-001 finds guest by room key"""
        response = requests.get(f"{BASE_URL}/api/guest-intel/search?q=RK-412-001")
        assert response.status_code == 200
        data = response.json()
        
        assert "results" in data
        assert len(data["results"]) >= 1
        
        # Should find James Smith
        found = any(r["last_name"] == "Smith" for r in data["results"])
        assert found, "Should find Smith by room key ID"
        
    def test_search_by_email(self):
        """Search by email works"""
        response = requests.get(f"{BASE_URL}/api/guest-intel/search?q=james.smith")
        assert response.status_code == 200
        data = response.json()
        
        assert "results" in data
        assert len(data["results"]) >= 1
        
    def test_search_by_loyalty_number(self):
        """Search by loyalty number works"""
        response = requests.get(f"{BASE_URL}/api/guest-intel/search?q=LY-GOLD")
        assert response.status_code == 200
        data = response.json()
        
        assert "results" in data
        # Should find at least one guest with gold loyalty


class TestAmenitySuggestions:
    """Amenity suggestions with allergen filtering"""
    
    def test_suggestions_for_tree_nut_allergy(self):
        """Suggestions for tree nut allergy guest excludes chocolate items"""
        # First get James Smith's guest_id
        response = requests.get(f"{BASE_URL}/api/guest-intel/profile/412")
        assert response.status_code == 200
        guest_id = response.json()["profile"]["guest_id"]
        
        # Get suggestions
        response = requests.get(f"{BASE_URL}/api/guest-intel/amenities/{guest_id}/suggestions")
        assert response.status_code == 200
        data = response.json()
        
        assert "suggested" in data
        assert "avoid_repeats" in data
        assert "guest_allergens" in data
        
        # Verify tree nuts in allergens
        assert "tree nuts" in data["guest_allergens"]
        
        # Verify Chocolate Truffles NOT in suggestions (tree nut allergy)
        suggested_names = [s["name"] for s in data["suggested"]]
        assert "Chocolate Truffles" not in suggested_names, "Chocolate Truffles should be excluded for tree nut allergy"
        
    def test_suggestions_for_vegan_dairy_allergy(self):
        """Suggestions for vegan/dairy allergy guest excludes cheese items"""
        # First get Michael Chen's guest_id
        response = requests.get(f"{BASE_URL}/api/guest-intel/profile/501")
        assert response.status_code == 200
        guest_id = response.json()["profile"]["guest_id"]
        
        # Get suggestions
        response = requests.get(f"{BASE_URL}/api/guest-intel/amenities/{guest_id}/suggestions")
        assert response.status_code == 200
        data = response.json()
        
        # Verify dairy in allergens and vegan in dietary
        assert "dairy" in data["guest_allergens"]
        assert "vegan" in data["guest_dietary"]
        
        # Verify Cheese & Wine Pairing NOT in suggestions
        suggested_names = [s["name"] for s in data["suggested"]]
        assert "Cheese & Wine Pairing" not in suggested_names, "Cheese should be excluded for dairy allergy/vegan"
        
    def test_suggestions_exclude_recent_amenities(self):
        """Suggestions exclude recently given amenities"""
        response = requests.get(f"{BASE_URL}/api/guest-intel/profile/412")
        assert response.status_code == 200
        guest_id = response.json()["profile"]["guest_id"]
        
        response = requests.get(f"{BASE_URL}/api/guest-intel/amenities/{guest_id}/suggestions")
        assert response.status_code == 200
        data = response.json()
        
        # avoid_repeats should contain recently given amenities
        assert len(data["avoid_repeats"]) > 0, "Should have some amenities to avoid"


class TestAmenityDelivery:
    """Amenity delivery logging"""
    
    def test_log_amenity_delivery(self):
        """POST /api/guest-intel/amenities/deliver logs an amenity delivery"""
        # Get guest_id first
        response = requests.get(f"{BASE_URL}/api/guest-intel/profile/412")
        assert response.status_code == 200
        guest_id = response.json()["profile"]["guest_id"]
        
        # Log delivery
        payload = {
            "room_number": "412",
            "guest_id": guest_id,
            "amenity_name": "TEST_Fresh Flowers",
            "amenity_category": "welcome",
            "quantity": 1,
            "visit_number": 7
        }
        response = requests.post(f"{BASE_URL}/api/guest-intel/amenities/deliver", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["amenity_name"] == "TEST_Fresh Flowers"
        assert data["guest_id"] == guest_id


class TestSpendTracking:
    """Spend tracking by room"""
    
    def test_spend_by_room_412(self):
        """GET /api/guest-intel/spend/412 returns spend breakdown"""
        response = requests.get(f"{BASE_URL}/api/guest-intel/spend/412")
        assert response.status_code == 200
        data = response.json()
        
        assert data["room_number"] == "412"
        assert "spend" in data
        
        spend = data["spend"]
        assert "ird" in spend
        assert "minibar" in spend
        assert "retail" in spend
        assert "guest_orders" in spend
        assert "grand_total" in spend
        
        # Each category should have count and total
        assert "count" in spend["ird"]
        assert "total" in spend["ird"]


class TestAllergenUpdates:
    """Allergen update functionality"""
    
    def test_update_allergens(self):
        """PUT /api/guest-intel/profile/{guest_id}/allergens updates allergens"""
        # Get guest_id first
        response = requests.get(f"{BASE_URL}/api/guest-intel/profile/412")
        assert response.status_code == 200
        guest_id = response.json()["profile"]["guest_id"]
        
        # Update allergens
        payload = {
            "guest_id": guest_id,
            "allergens": ["shellfish", "tree nuts", "peanuts"],
            "dietary_restrictions": ["gluten-free"],
            "severity": "severe",
            "notes": "TEST: Added peanuts allergy"
        }
        response = requests.put(f"{BASE_URL}/api/guest-intel/profile/{guest_id}/allergens", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["updated"] == guest_id
        assert "peanuts" in data["allergens"]
        assert data["severity"] == "severe"


class TestSpecialRequests:
    """Special requests management"""
    
    def test_create_special_request(self):
        """POST /api/guest-intel/requests creates a special request"""
        # Get guest_id first
        response = requests.get(f"{BASE_URL}/api/guest-intel/profile/412")
        assert response.status_code == 200
        guest_id = response.json()["profile"]["guest_id"]
        
        payload = {
            "room_number": "412",
            "guest_id": guest_id,
            "request_type": "dietary",
            "request_text": "TEST: Please ensure all meals are gluten-free",
            "priority": "high",
            "departments": ["ird", "culinary"]
        }
        response = requests.post(f"{BASE_URL}/api/guest-intel/requests", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["request_type"] == "dietary"
        assert data["status"] == "pending"
        
    def test_list_special_requests(self):
        """GET /api/guest-intel/requests returns special requests list"""
        response = requests.get(f"{BASE_URL}/api/guest-intel/requests")
        assert response.status_code == 200
        data = response.json()
        
        assert "requests" in data


class TestExistingAPIsStillWork:
    """Verify existing APIs still work (regression tests)"""
    
    def test_health_endpoint(self):
        """GET /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
    def test_housekeeping_dashboard(self):
        """GET /api/housekeeping/dashboard returns data"""
        response = requests.get(f"{BASE_URL}/api/housekeeping/dashboard")
        assert response.status_code == 200
        
    def test_ird_dashboard(self):
        """GET /api/ird/dashboard returns data"""
        response = requests.get(f"{BASE_URL}/api/ird/dashboard")
        assert response.status_code == 200
        
    def test_spa_dashboard(self):
        """GET /api/spa/dashboard returns data"""
        response = requests.get(f"{BASE_URL}/api/spa/dashboard")
        assert response.status_code == 200
        
    def test_concierge_dashboard(self):
        """GET /api/concierge/dashboard returns data"""
        response = requests.get(f"{BASE_URL}/api/concierge/dashboard")
        assert response.status_code == 200
        
    def test_email_status(self):
        """GET /api/email/status returns status"""
        response = requests.get(f"{BASE_URL}/api/email/status")
        assert response.status_code == 200
        
    def test_guest_order_auth(self):
        """POST /api/guest-order/auth works with Room 412, Smith"""
        response = requests.post(f"{BASE_URL}/api/guest-order/auth", json={
            "room_number": "412",
            "last_name": "Smith"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("authenticated") == True or "token" in data
