"""
Iteration 111: Beverage Operations Extended Features Testing
- Wine Cellar Aging Tracker with drinking windows
- Cocktail Recipe Costing linked to inventory
- Seasonal Beverage Programs with demand forecasting
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWineCellar:
    """Wine Cellar Aging Tracker Tests"""
    
    def test_add_wine_aging_status(self):
        """POST /api/beverage-ops/wine-cellar/add - adds wine with aging calculation"""
        response = requests.post(f"{BASE_URL}/api/beverage-ops/wine-cellar/add", json={
            "name": "TEST_Opus One Reserve",
            "vintage": 2018,
            "region": "Napa Valley",
            "varietal": "Cabernet Sauvignon",
            "quantity": 6,
            "cost_per_bottle": 450.00,
            "bin_location": "A-12"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify wine data
        assert data["name"] == "TEST_Opus One Reserve"
        assert data["vintage"] == 2018
        assert data["region"] == "Napa Valley"
        assert data["quantity"] == 6
        assert data["cost_per_bottle"] == 450.00
        assert data["total_value"] == 2700.00
        
        # Verify aging calculation (2018 wine in 2026 = 8 years old)
        assert data["age_years"] == 8
        assert "status" in data
        assert data["status"] in ["aging", "peak", "past_peak"]
        assert "peak_start" in data
        assert "peak_end" in data
        assert "drink_recommendation" in data
        print(f"Wine added: {data['name']} - Status: {data['status']} - Recommendation: {data['drink_recommendation']}")
    
    def test_add_wine_peak_status(self):
        """Add wine that should be in peak drinking window"""
        response = requests.post(f"{BASE_URL}/api/beverage-ops/wine-cellar/add", json={
            "name": "TEST_Chateau Margaux",
            "vintage": 2015,
            "region": "Bordeaux",
            "varietal": "Cabernet Blend",
            "quantity": 3,
            "cost_per_bottle": 850.00
        })
        assert response.status_code == 200
        data = response.json()
        
        # 2015 Bordeaux in 2026 = 11 years, optimal is 5-20 years
        assert data["age_years"] == 11
        assert data["status"] == "peak", f"Expected peak status for 11-year Bordeaux, got {data['status']}"
        assert "peak" in data["drink_recommendation"].lower() or "ideal" in data["drink_recommendation"].lower()
        print(f"Peak wine: {data['name']} - {data['drink_recommendation']}")
    
    def test_add_wine_young_aging(self):
        """Add young wine that needs aging"""
        response = requests.post(f"{BASE_URL}/api/beverage-ops/wine-cellar/add", json={
            "name": "TEST_Prosecco Fresh",
            "vintage": 2024,
            "region": "Veneto",
            "varietal": "Glera",
            "quantity": 12,
            "cost_per_bottle": 18.00
        })
        assert response.status_code == 200
        data = response.json()
        
        # 2024 Veneto wine in 2026 = 2 years, optimal is 0-3 years
        assert data["age_years"] == 2
        # Veneto wines have short aging window (0-3 years), so 2 years should be peak
        assert data["status"] in ["peak", "aging"]
        print(f"Young wine: {data['name']} - Status: {data['status']}")
    
    def test_list_wine_cellar(self):
        """GET /api/beverage-ops/wine-cellar - lists wines with status and total value"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/wine-cellar")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "wines" in data
        assert "total_bottles" in data
        assert "total_value" in data
        assert "status_counts" in data
        assert "action_needed" in data
        
        # Verify status counts structure
        assert "aging" in data["status_counts"]
        assert "peak" in data["status_counts"]
        assert "past_peak" in data["status_counts"]
        
        print(f"Wine cellar: {data['total_bottles']} bottles, ${data['total_value']} value")
        print(f"Status counts: {data['status_counts']}")
        
        # Verify wines have required fields
        if data["wines"]:
            wine = data["wines"][0]
            assert "name" in wine
            assert "vintage" in wine
            assert "status" in wine
            assert "drink_recommendation" in wine
    
    def test_list_wine_cellar_filter_by_status(self):
        """GET /api/beverage-ops/wine-cellar?status=peak - filters by status"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/wine-cellar?status=peak")
        assert response.status_code == 200
        data = response.json()
        
        # All wines should have peak status
        for wine in data["wines"]:
            assert wine["status"] == "peak", f"Expected peak status, got {wine['status']}"
        print(f"Peak wines: {len(data['wines'])}")
    
    def test_wine_pairing_steak(self):
        """GET /api/beverage-ops/wine-cellar/pairing-suggestions?dish=grilled steak"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/wine-cellar/pairing-suggestions?dish=grilled steak")
        assert response.status_code == 200
        data = response.json()
        
        assert data["dish"] == "grilled steak"
        assert "pairings" in data
        assert len(data["pairings"]) > 0
        
        # Verify pairing structure
        pairing = data["pairings"][0]
        assert "wine" in pairing
        assert "region" in pairing
        assert "why" in pairing
        
        # Steak should pair with red wines
        wine_names = [p["wine"].lower() for p in data["pairings"]]
        assert any("cabernet" in w or "malbec" in w for w in wine_names), f"Expected red wine pairing for steak, got {wine_names}"
        print(f"Steak pairings: {[p['wine'] for p in data['pairings']]}")
    
    def test_wine_pairing_fish(self):
        """GET /api/beverage-ops/wine-cellar/pairing-suggestions?dish=fish - returns white wine pairings"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/wine-cellar/pairing-suggestions?dish=fish")
        assert response.status_code == 200
        data = response.json()
        
        assert data["dish"] == "fish"
        assert len(data["pairings"]) > 0
        
        # Fish should pair with white wines
        wine_names = [p["wine"].lower() for p in data["pairings"]]
        assert any("sauvignon" in w or "pinot grigio" in w or "chardonnay" in w for w in wine_names), f"Expected white wine pairing for fish, got {wine_names}"
        print(f"Fish pairings: {[p['wine'] for p in data['pairings']]}")
    
    def test_wine_pairing_chicken(self):
        """Test chicken pairing suggestions"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/wine-cellar/pairing-suggestions?dish=chicken")
        assert response.status_code == 200
        data = response.json()
        assert len(data["pairings"]) > 0
        print(f"Chicken pairings: {[p['wine'] for p in data['pairings']]}")
    
    def test_wine_pairing_pasta(self):
        """Test pasta pairing suggestions"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/wine-cellar/pairing-suggestions?dish=pasta")
        assert response.status_code == 200
        data = response.json()
        assert len(data["pairings"]) > 0
        # Pasta should pair with Italian wines
        wine_names = [p["wine"].lower() for p in data["pairings"]]
        assert any("chianti" in w or "barbera" in w for w in wine_names)
        print(f"Pasta pairings: {[p['wine'] for p in data['pairings']]}")


class TestCocktailCosting:
    """Cocktail Recipe Costing Tests"""
    
    def test_cocktail_costing_list(self):
        """GET /api/beverage-ops/cocktail-costing - returns 6 cocktails with costs"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/cocktail-costing")
        assert response.status_code == 200
        data = response.json()
        
        assert "cocktails" in data
        assert "summary" in data
        assert len(data["cocktails"]) == 6, f"Expected 6 cocktails, got {len(data['cocktails'])}"
        
        # Verify summary structure
        assert "total_recipes" in data["summary"]
        assert "avg_cost_pct" in data["summary"]
        assert "most_profitable" in data["summary"]
        assert "least_profitable" in data["summary"]
        assert "target_cost_pct" in data["summary"]
        
        print(f"Cocktails: {data['summary']['total_recipes']}, Avg cost: {data['summary']['avg_cost_pct']}%")
    
    def test_cocktail_costing_structure(self):
        """Verify each cocktail has required cost/price/profit fields"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/cocktail-costing")
        assert response.status_code == 200
        data = response.json()
        
        for cocktail in data["cocktails"]:
            # Required fields
            assert "name" in cocktail
            assert "category" in cocktail
            assert "glassware" in cocktail
            assert "ingredients" in cocktail
            assert "total_cost" in cocktail
            assert "menu_price" in cocktail
            assert "profit" in cocktail
            assert "cost_pct" in cocktail
            assert "margin_pct" in cocktail
            assert "pricing_status" in cocktail
            
            # Inventory link fields
            assert "primary_spirit" in cocktail
            assert "in_stock_bottles" in cocktail
            assert "pours_available" in cocktail
            
            # Verify calculations
            assert cocktail["profit"] == round(cocktail["menu_price"] - cocktail["total_cost"], 2)
            assert cocktail["margin_pct"] == round(100 - cocktail["cost_pct"], 1)
            
            print(f"{cocktail['name']}: Cost ${cocktail['total_cost']}, Price ${cocktail['menu_price']}, Profit ${cocktail['profit']}, {cocktail['cost_pct']}%")
    
    def test_cocktail_ingredients_costing(self):
        """Verify ingredient-level costing"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/cocktail-costing")
        assert response.status_code == 200
        data = response.json()
        
        for cocktail in data["cocktails"]:
            total_from_ingredients = sum(ing.get("line_cost", 0) for ing in cocktail["ingredients"])
            assert abs(total_from_ingredients - cocktail["total_cost"]) < 0.05, f"Ingredient costs don't sum to total for {cocktail['name']}"
            
            # Verify each ingredient has line_cost
            for ing in cocktail["ingredients"]:
                assert "line_cost" in ing, f"Missing line_cost for ingredient in {cocktail['name']}"
                assert "item" in ing
    
    def test_cocktail_pricing_status(self):
        """Verify pricing status is correctly set based on cost percentage"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/cocktail-costing")
        assert response.status_code == 200
        data = response.json()
        
        for cocktail in data["cocktails"]:
            if cocktail["cost_pct"] < 25:
                assert cocktail["pricing_status"] == "profitable"
            else:
                assert cocktail["pricing_status"] == "review"
    
    def test_cocktail_names(self):
        """Verify expected cocktails are present"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/cocktail-costing")
        assert response.status_code == 200
        data = response.json()
        
        expected_cocktails = ["Old Fashioned", "Margarita", "Espresso Martini", "Mojito", "Negroni", "Pier Two Signature"]
        actual_names = [c["name"] for c in data["cocktails"]]
        
        for expected in expected_cocktails:
            assert expected in actual_names, f"Missing cocktail: {expected}"
        print(f"All 6 cocktails present: {actual_names}")


class TestSeasonalProgram:
    """Seasonal Beverage Program Tests"""
    
    def test_seasonal_program_all(self):
        """GET /api/beverage-ops/seasonal-program - returns 4 seasonal programs"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/seasonal-program")
        assert response.status_code == 200
        data = response.json()
        
        assert "current_season" in data
        assert "programs" in data
        assert len(data["programs"]) == 4, f"Expected 4 seasons, got {len(data['programs'])}"
        
        # Verify all seasons present
        seasons = list(data["programs"].keys())
        assert "spring" in seasons
        assert "summer" in seasons
        assert "fall" in seasons
        assert "winter" in seasons
        
        print(f"Current season: {data['current_season']}")
        print(f"All seasons: {seasons}")
    
    def test_seasonal_program_structure(self):
        """Verify each season has required fields"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/seasonal-program")
        assert response.status_code == 200
        data = response.json()
        
        for season, program in data["programs"].items():
            assert "name" in program
            assert "months" in program
            assert "themes" in program
            assert "featured_cocktails" in program
            assert "wine_focus" in program
            
            # Each season should have 3 featured cocktails
            assert len(program["featured_cocktails"]) == 3, f"{season} should have 3 cocktails"
            
            # Verify cocktail structure
            for cocktail in program["featured_cocktails"]:
                assert "name" in cocktail
                assert "base" in cocktail
                assert "season_ingredient" in cocktail
                assert "estimated_cost" in cocktail
                assert "suggested_price" in cocktail
                assert "cost_pct" in cocktail
                assert "profit" in cocktail
            
            print(f"{season}: {program['name']} - {len(program['featured_cocktails'])} cocktails")
    
    def test_seasonal_program_summer_filter(self):
        """GET /api/beverage-ops/seasonal-program?season=summer - returns summer only"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/seasonal-program?season=summer")
        assert response.status_code == 200
        data = response.json()
        
        assert data["season"] == "summer"
        assert "program" in data
        assert data["program"]["name"] == "Summer Chill"
        assert 6 in data["program"]["months"]
        assert 7 in data["program"]["months"]
        assert 8 in data["program"]["months"]
        
        # Verify summer cocktails
        cocktail_names = [c["name"] for c in data["program"]["featured_cocktails"]]
        assert "Passion Fruit Hurricane" in cocktail_names
        assert "Watermelon Margarita" in cocktail_names
        assert "Coconut Mojito" in cocktail_names
        print(f"Summer cocktails: {cocktail_names}")
    
    def test_seasonal_program_winter_filter(self):
        """Test winter season filter"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/seasonal-program?season=winter")
        assert response.status_code == 200
        data = response.json()
        
        assert data["season"] == "winter"
        assert data["program"]["name"] == "Winter Warmth"
        cocktail_names = [c["name"] for c in data["program"]["featured_cocktails"]]
        assert "Hot Toddy" in cocktail_names
        print(f"Winter cocktails: {cocktail_names}")
    
    def test_seasonal_forecast(self):
        """POST /api/beverage-ops/seasonal-program/forecast - forecasts demand"""
        response = requests.post(f"{BASE_URL}/api/beverage-ops/seasonal-program/forecast", json={
            "season": "summer",
            "covers_per_month": 5000
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify forecast structure
        assert data["season"] == "summer"
        assert data["program_name"] == "Summer Chill"
        assert data["months"] == 3
        assert data["covers_per_month"] == 5000
        assert data["total_covers"] == 15000
        
        # Verify drink forecast
        assert "drink_forecast" in data
        assert "total_drinks" in data["drink_forecast"]
        assert "cocktails" in data["drink_forecast"]
        assert "wine" in data["drink_forecast"]
        assert "beer" in data["drink_forecast"]
        assert "non_alcoholic" in data["drink_forecast"]
        
        # Verify ordering needs
        assert "ordering_needs" in data
        assert "spirit_bottles_needed" in data["ordering_needs"]
        assert "wine_bottles_needed" in data["ordering_needs"]
        assert "estimated_spirit_cost" in data["ordering_needs"]
        assert "estimated_wine_cost" in data["ordering_needs"]
        assert "total_estimated_cost" in data["ordering_needs"]
        
        # Verify revenue forecast
        assert "revenue_forecast" in data
        assert "cocktail_revenue" in data["revenue_forecast"]
        assert "wine_revenue" in data["revenue_forecast"]
        assert "total_beverage_revenue" in data["revenue_forecast"]
        
        print(f"Forecast: {data['total_covers']} covers, {data['drink_forecast']['total_drinks']} drinks")
        print(f"Ordering: {data['ordering_needs']['spirit_bottles_needed']} spirit bottles, {data['ordering_needs']['wine_bottles_needed']} wine bottles")
        print(f"Revenue: ${data['revenue_forecast']['total_beverage_revenue']}")
    
    def test_seasonal_forecast_fall(self):
        """Test fall season forecast"""
        response = requests.post(f"{BASE_URL}/api/beverage-ops/seasonal-program/forecast", json={
            "season": "fall",
            "covers_per_month": 4000
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["season"] == "fall"
        assert data["program_name"] == "Autumn Harvest"
        assert data["total_covers"] == 12000
        print(f"Fall forecast: {data['drink_forecast']['total_drinks']} drinks expected")


class TestExistingBeverageOpsEndpoints:
    """Verify existing endpoints still work"""
    
    def test_health_check(self):
        """Basic health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
    
    def test_bottle_scan(self):
        """POST /api/beverage-ops/bottle-scan still works"""
        response = requests.post(f"{BASE_URL}/api/beverage-ops/bottle-scan", json={
            "item_name": "TEST_Tito's Vodka",
            "volume_level": "half",
            "bottle_size": "750ml",
            "location": "main_bar",
            "bottle_cost": 22.00
        })
        assert response.status_code == 200
        data = response.json()
        assert data["remaining_oz"] == 12.7  # half of 25.4oz
        print(f"Bottle scan: {data['item_name']} - {data['remaining_oz']}oz remaining")
    
    def test_bottle_scans_list(self):
        """GET /api/beverage-ops/bottle-scans still works"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/bottle-scans?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "scans" in data
        assert "total_scans" in data
        assert "total_value_remaining" in data
    
    def test_audits_list(self):
        """GET /api/beverage-ops/audits still works"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/audits")
        assert response.status_code == 200
        data = response.json()
        assert "audits" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
