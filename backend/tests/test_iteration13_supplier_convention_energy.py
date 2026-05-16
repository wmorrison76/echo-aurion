"""
Iteration 13 - Supplier Catalog, Convention Management, Energy Tracking, QR Allergen Scanner, Voice Input Tests
Tests P1/P2 features: Sysco/US Foods catalog sync, convention management, energy tracking, and AI³ voice input
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"


class TestSupplierCatalog:
    """Supplier Catalog Sync - Sysco / US Foods Integration"""
    
    def test_list_suppliers(self):
        """GET /api/supplier-catalog/suppliers - returns 2 suppliers (Sysco, US Foods)"""
        response = requests.get(f"{BASE_URL}/api/supplier-catalog/suppliers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "suppliers" in data, "Response should contain 'suppliers' key"
        suppliers = data["suppliers"]
        assert len(suppliers) == 2, f"Expected 2 suppliers, got {len(suppliers)}"
        
        # Verify Sysco
        sysco = next((s for s in suppliers if s["id"] == "sysco"), None)
        assert sysco is not None, "Sysco supplier not found"
        assert sysco["name"] == "Sysco Corporation"
        assert sysco["code"] == "SYS"
        assert sysco["status"] == "connected"
        assert sysco["items"] > 0, "Sysco should have products"
        
        # Verify US Foods
        usfoods = next((s for s in suppliers if s["id"] == "usfoods"), None)
        assert usfoods is not None, "US Foods supplier not found"
        assert usfoods["name"] == "US Foods"
        assert usfoods["code"] == "USF"
        assert usfoods["status"] == "connected"
        print(f"PASS: Found {len(suppliers)} suppliers - Sysco ({sysco['items']} items), US Foods ({usfoods['items']} items)")
    
    def test_search_catalog_salmon(self):
        """GET /api/supplier-catalog/search?q=salmon - returns search results"""
        response = requests.get(f"{BASE_URL}/api/supplier-catalog/search?q=salmon")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "results" in data, "Response should contain 'results' key"
        assert "total" in data, "Response should contain 'total' key"
        assert "query" in data, "Response should contain 'query' key"
        assert data["query"] == "salmon"
        
        results = data["results"]
        assert len(results) > 0, "Should find salmon products"
        
        # Verify result structure
        for item in results:
            assert "sku" in item
            assert "name" in item
            assert "price" in item
            assert "supplier" in item
            assert "salmon" in item["name"].lower(), f"Result '{item['name']}' should contain 'salmon'"
        
        print(f"PASS: Search 'salmon' returned {len(results)} results")
    
    def test_search_catalog_beef(self):
        """GET /api/supplier-catalog/search?q=beef - returns beef products"""
        response = requests.get(f"{BASE_URL}/api/supplier-catalog/search?q=beef")
        assert response.status_code == 200
        
        data = response.json()
        results = data["results"]
        assert len(results) > 0, "Should find beef products"
        print(f"PASS: Search 'beef' returned {len(results)} results")
    
    def test_get_sysco_products(self):
        """GET /api/supplier-catalog/sysco/products - returns Sysco product list"""
        response = requests.get(f"{BASE_URL}/api/supplier-catalog/sysco/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "supplier" in data, "Response should contain 'supplier' key"
        assert "products" in data, "Response should contain 'products' key"
        assert "total" in data, "Response should contain 'total' key"
        
        assert data["supplier"] == "Sysco Corporation"
        products = data["products"]
        assert len(products) > 0, "Sysco should have products"
        assert data["total"] == len(products)
        
        # Verify product structure
        for p in products[:3]:
            assert "sku" in p and p["sku"].startswith("SYS-")
            assert "name" in p
            assert "brand" in p
            assert "category" in p
            assert "price" in p and p["price"] > 0
            assert "pack_size" in p
        
        print(f"PASS: Sysco has {len(products)} products")
    
    def test_get_usfoods_products(self):
        """GET /api/supplier-catalog/usfoods/products - returns US Foods product list"""
        response = requests.get(f"{BASE_URL}/api/supplier-catalog/usfoods/products")
        assert response.status_code == 200
        
        data = response.json()
        assert data["supplier"] == "US Foods"
        products = data["products"]
        assert len(products) > 0, "US Foods should have products"
        
        # Verify SKU prefix
        for p in products[:3]:
            assert p["sku"].startswith("USF-"), f"US Foods SKU should start with USF-: {p['sku']}"
        
        print(f"PASS: US Foods has {len(products)} products")
    
    def test_sync_sysco(self):
        """POST /api/supplier-catalog/sync with {supplier_id:'sysco'} - returns sync result"""
        response = requests.post(
            f"{BASE_URL}/api/supplier-catalog/sync",
            json={"supplier_id": "sysco", "sync_type": "full"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "sync_id" in data, "Response should contain 'sync_id'"
        assert "supplier_id" in data and data["supplier_id"] == "sysco"
        assert "status" in data and data["status"] == "completed"
        assert "items_synced" in data and data["items_synced"] > 0
        assert "timestamp" in data
        assert "duration_ms" in data
        
        print(f"PASS: Sysco sync completed - {data['items_synced']} items synced, {data.get('new_items', 0)} new, {data.get('price_updates', 0)} price updates")
    
    def test_sync_usfoods(self):
        """POST /api/supplier-catalog/sync with {supplier_id:'usfoods'} - returns sync result"""
        response = requests.post(
            f"{BASE_URL}/api/supplier-catalog/sync",
            json={"supplier_id": "usfoods"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["supplier_id"] == "usfoods"
        assert data["status"] == "completed"
        print(f"PASS: US Foods sync completed - {data['items_synced']} items synced")
    
    def test_compare_prices_beef(self):
        """POST /api/supplier-catalog/compare with {item_name:'beef'} - returns price comparisons"""
        response = requests.post(
            f"{BASE_URL}/api/supplier-catalog/compare",
            json={"item_name": "beef"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "query" in data and data["query"] == "beef"
        assert "matches" in data
        assert "total" in data
        assert "best_value" in data
        
        matches = data["matches"]
        assert len(matches) > 0, "Should find beef products to compare"
        
        # Verify matches are sorted by price (ascending)
        prices = [m["price"] for m in matches]
        assert prices == sorted(prices), "Matches should be sorted by price ascending"
        
        # Verify best_value is the cheapest
        if data["best_value"]:
            assert data["best_value"]["price"] == matches[0]["price"]
        
        print(f"PASS: Price comparison for 'beef' found {len(matches)} matches, best value: {data['best_value']}")
    
    def test_compare_prices_salmon(self):
        """POST /api/supplier-catalog/compare with {item_name:'salmon'} - returns price comparisons"""
        response = requests.post(
            f"{BASE_URL}/api/supplier-catalog/compare",
            json={"item_name": "salmon"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["matches"]) > 0, "Should find salmon products"
        print(f"PASS: Price comparison for 'salmon' found {len(data['matches'])} matches")


class TestConventionManagement:
    """Convention & Trade Show Management"""
    
    def test_list_conventions(self):
        """GET /api/conventions - returns convention events with breakout rooms"""
        response = requests.get(f"{BASE_URL}/api/conventions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "conventions" in data, "Response should contain 'conventions' key"
        assert "total" in data, "Response should contain 'total' key"
        
        conventions = data["conventions"]
        # May be empty if no conventions created yet
        print(f"PASS: GET /api/conventions returned {len(conventions)} conventions")
    
    def test_create_convention(self):
        """POST /api/conventions - creates a convention with breakout rooms and F&B"""
        convention_data = {
            "name": "TEST_Tech_Summit_2026",
            "client": "TechCorp International",
            "start_date": "2026-03-15T09:00:00Z",
            "end_date": "2026-03-17T18:00:00Z",
            "expected_attendance": 500,
            "rooms_needed": [
                {"room_id": "grand-ballroom", "setup_style": "Theater", "capacity": 500},
                {"room_id": "breakout-a", "setup_style": "Classroom", "capacity": 50},
                {"room_id": "breakout-b", "setup_style": "U-Shape", "capacity": 30}
            ],
            "breakout_sessions": [
                {"title": "AI in Hospitality", "room_id": "breakout-a", "time": "10:00", "speaker": "Dr. Smith"},
                {"title": "Cloud Kitchen Operations", "room_id": "breakout-b", "time": "14:00", "speaker": "Chef Johnson"}
            ],
            "catering_requirements": ["Continental Breakfast", "Lunch Buffet", "Afternoon Break"],
            "av_requirements": ["Projector", "Microphones", "Live Streaming"],
            "notes": "VIP client - ensure premium service"
        }
        
        response = requests.post(f"{BASE_URL}/api/conventions", json=convention_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert data["id"].startswith("conv-")
        assert data["name"] == "TEST_Tech_Summit_2026"
        assert data["client"] == "TechCorp International"
        assert data["expected_attendance"] == 500
        assert data["status"] == "planning"
        assert len(data["rooms_needed"]) == 3
        assert len(data["breakout_sessions"]) == 2
        
        print(f"PASS: Created convention {data['id']} with {len(data['rooms_needed'])} rooms and {len(data['breakout_sessions'])} breakout sessions")


class TestEnergyTracking:
    """Energy & Utility Tracking"""
    
    def test_energy_dashboard_weekly(self):
        """GET /api/energy/dashboard?period=weekly - returns energy consumption data by outlet"""
        response = requests.get(f"{BASE_URL}/api/energy/dashboard?period=weekly")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "period" in data, "Response should contain 'period'"
        assert "by_outlet" in data, "Response should contain 'by_outlet'"
        assert "by_type" in data, "Response should contain 'by_type'"
        assert "total_consumption" in data, "Response should contain 'total_consumption'"
        assert "estimated_cost" in data, "Response should contain 'estimated_cost'"
        
        by_outlet = data["by_outlet"]
        assert len(by_outlet) > 0, "Should have outlet consumption data"
        
        # Verify outlet data structure
        for outlet, consumption in by_outlet.items():
            assert isinstance(consumption, (int, float)), f"Consumption for {outlet} should be numeric"
            assert consumption >= 0, f"Consumption for {outlet} should be non-negative"
        
        # Verify by_type has expected categories
        by_type = data["by_type"]
        assert len(by_type) > 0, "Should have consumption by type"
        
        print(f"PASS: Energy dashboard (weekly) - {len(by_outlet)} outlets, total: {data['total_consumption']} kWh, cost: ${data['estimated_cost']}")
    
    def test_energy_dashboard_monthly(self):
        """GET /api/energy/dashboard?period=monthly - returns different period data"""
        response = requests.get(f"{BASE_URL}/api/energy/dashboard?period=monthly")
        assert response.status_code == 200
        
        data = response.json()
        assert "by_outlet" in data
        assert "total_consumption" in data
        assert data["total_consumption"] >= 0
        
        print(f"PASS: Energy dashboard (monthly) - total: {data['total_consumption']} kWh")
    
    def test_energy_dashboard_default(self):
        """GET /api/energy/dashboard - returns data without period param"""
        response = requests.get(f"{BASE_URL}/api/energy/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "by_outlet" in data
        assert "estimated_cost" in data
        
        print(f"PASS: Energy dashboard (default) - cost: ${data['estimated_cost']}")


class TestAllergenScanner:
    """QR Allergen Scanner - Guest-facing allergen disclosure"""
    
    def test_allergen_scanner_with_allergies(self):
        """GET /api/allergen-scanner/{menu_id}?allergies=dairy,gluten - returns safe/unsafe items"""
        response = requests.get(f"{BASE_URL}/api/allergen-scanner/test-menu?allergies=dairy,gluten")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "menu_id" in data and data["menu_id"] == "test-menu"
        assert "guest_allergies" in data
        assert "items" in data
        assert "total_items" in data
        assert "safe_items" in data
        assert "unsafe_items" in data
        
        # Verify guest allergies parsed correctly
        assert "dairy" in data["guest_allergies"]
        assert "gluten" in data["guest_allergies"]
        
        # Verify item structure
        for item in data["items"]:
            assert "name" in item
            assert "safe_for_you" in item
            assert "allergens" in item
            assert "conflicts" in item
        
        print(f"PASS: Allergen scanner - {data['safe_items']} safe, {data['unsafe_items']} unsafe items for dairy,gluten allergies")
    
    def test_allergen_scanner_no_allergies(self):
        """GET /api/allergen-scanner/{menu_id} - works without allergies parameter"""
        response = requests.get(f"{BASE_URL}/api/allergen-scanner/test-menu")
        assert response.status_code == 200
        
        data = response.json()
        assert data["menu_id"] == "test-menu"
        assert data["guest_allergies"] == []
        
        # All items should be safe when no allergies specified
        for item in data["items"]:
            assert item["safe_for_you"] == True, f"Item {item['name']} should be safe with no allergies"
            assert item["conflicts"] == []
        
        print(f"PASS: Allergen scanner (no allergies) - all {data['total_items']} items safe")


class TestAI3VoiceInput:
    """AI³ Voice Input - Whisper transcription endpoint"""
    
    def test_transcribe_endpoint_exists(self):
        """POST /api/ai3/transcribe - endpoint exists (requires audio file)"""
        # Test that endpoint exists by sending empty request (should fail with 422 validation error, not 404)
        response = requests.post(f"{BASE_URL}/api/ai3/transcribe")
        # 422 = validation error (missing file), 500 = server error (acceptable), 404 = endpoint doesn't exist
        assert response.status_code in [422, 500, 400], f"Expected 422/500/400 (endpoint exists), got {response.status_code}"
        print(f"PASS: /api/ai3/transcribe endpoint exists (status {response.status_code} without file)")


class TestRegressionChecks:
    """Regression tests for existing functionality"""
    
    def test_health_check(self):
        """GET /api/health - basic health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("PASS: Health check")
    
    def test_ai3_ask(self):
        """POST /api/ai3/ask - AI³ NLP query still works"""
        response = requests.post(
            f"{BASE_URL}/api/ai3/ask",
            json={"query": "What is my food cost?", "user_id": "usr-gm-001"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "response" in data
        assert "user" in data
        print("PASS: AI³ NLP query works")
    
    def test_iot_dashboard(self):
        """GET /api/iot/dashboard - IoT sensors still work"""
        response = requests.get(f"{BASE_URL}/api/iot/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "sensors" in data
        assert len(data["sensors"]) > 0
        print(f"PASS: IoT dashboard - {len(data['sensors'])} sensors")
    
    def test_overtime_forecast(self):
        """GET /api/schedule/overtime-forecast - overtime prediction still works"""
        response = requests.get(f"{BASE_URL}/api/schedule/overtime-forecast")
        assert response.status_code == 200
        
        data = response.json()
        assert "employees" in data
        assert "total_overtime_cost" in data
        print(f"PASS: Overtime forecast - {data['at_risk_count']} at risk, ${data['total_overtime_cost']} projected cost")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
