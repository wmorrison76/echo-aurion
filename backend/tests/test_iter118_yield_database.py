"""
Iteration 118: Production Yield Database Tests
==============================================
Tests for the 89-ingredient yield database with fuzzy search,
yield calculation by cut type, and automatic cost calculation.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestYieldDatabaseSearch:
    """Fuzzy search endpoint tests for /api/yields/search"""
    
    def test_search_milk_returns_milk_variants(self):
        """GET /api/yields/search?q=milk returns Milk Whole, Milk 2%, Milk Oat with fuzzy scores"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=milk")
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) >= 3
        # Check that milk variants are returned
        names = [r["name"].lower() for r in data["results"]]
        assert any("milk" in n and "whole" in n for n in names), f"Expected Milk Whole in {names}"
        assert any("milk" in n and "2%" in n for n in names), f"Expected Milk 2% in {names}"
        assert any("milk" in n and "oat" in n for n in names), f"Expected Milk Oat in {names}"
        # Check fuzzy scores are present
        for r in data["results"]:
            assert "score" in r, "Expected fuzzy score in results"
        print(f"PASSED: milk search returned {len(data['results'])} results with scores")
    
    def test_search_chicken_returns_chicken_items(self):
        """GET /api/yields/search?q=chick returns chicken items"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=chick")
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) >= 1
        names = [r["name"].lower() for r in data["results"]]
        assert any("chicken" in n for n in names), f"Expected chicken items in {names}"
        print(f"PASSED: chick search returned {len(data['results'])} chicken items")
    
    def test_search_salmon_returns_salmon_items(self):
        """GET /api/yields/search?q=salmon returns salmon items"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=salmon")
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) >= 1
        names = [r["name"].lower() for r in data["results"]]
        assert any("salmon" in n for n in names), f"Expected salmon items in {names}"
        print(f"PASSED: salmon search returned {len(data['results'])} salmon items")
    
    def test_search_onion_returns_onion_with_cuts(self):
        """GET /api/yields/search?q=onion returns onion items with cut yields"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=onion")
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) >= 1
        # Find onion yellow and check it has cuts
        onion_yellow = None
        for r in data["results"]:
            if "yellow" in r["name"].lower():
                onion_yellow = r
                break
        assert onion_yellow is not None, "Expected Onion Yellow in results"
        assert "cuts" in onion_yellow, "Expected cuts array in onion"
        assert len(onion_yellow["cuts"]) >= 3, f"Expected multiple cuts, got {len(onion_yellow.get('cuts', []))}"
        print(f"PASSED: onion search returned items with {len(onion_yellow['cuts'])} cut types")
    
    def test_search_lobster_returns_lobster_items(self):
        """GET /api/yields/search?q=lob returns lobster items"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=lob")
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) >= 1
        names = [r["name"].lower() for r in data["results"]]
        assert any("lobster" in n for n in names), f"Expected lobster items in {names}"
        print(f"PASSED: lob search returned {len(data['results'])} lobster items")
    
    def test_search_basil_with_herb_category_filter(self):
        """GET /api/yields/search?q=basil&category=herb returns herb items only"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=basil&category=herb")
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) >= 1
        # All results should be herbs
        for r in data["results"]:
            assert r["category"] == "herb", f"Expected herb category, got {r['category']}"
        names = [r["name"].lower() for r in data["results"]]
        assert any("basil" in n for n in names), f"Expected basil in {names}"
        print(f"PASSED: basil+herb filter returned {len(data['results'])} herb items")


class TestYieldCalculation:
    """Yield calculation endpoint tests for /api/yields/calculate"""
    
    def test_calculate_onion_yellow_quarter_dice(self):
        """GET /api/yields/calculate?ingredient=onion+yellow&quantity=1&unit=lb&cut=1/4+dice returns yield 87%"""
        response = requests.get(f"{BASE_URL}/api/yields/calculate?ingredient=onion+yellow&quantity=1&unit=lb&cut=1/4+dice")
        assert response.status_code == 200
        data = response.json()
        assert "error" not in data, f"Got error: {data.get('error')}"
        assert data["yield_pct"] == 87, f"Expected yield 87%, got {data['yield_pct']}"
        assert data["ep_quantity"] == 0.87, f"Expected EP 0.87lb, got {data['ep_quantity']}"
        assert data["trim_quantity"] == 0.13, f"Expected trim 0.13lb, got {data['trim_quantity']}"
        print(f"PASSED: onion yellow 1/4 dice = {data['yield_pct']}% yield, EP={data['ep_quantity']}lb")
    
    def test_calculate_short_rib_braised(self):
        """GET /api/yields/calculate?ingredient=short+rib&quantity=2&unit=lb&cut=braised returns yield 50%, EP 1.0lb"""
        response = requests.get(f"{BASE_URL}/api/yields/calculate?ingredient=short+rib&quantity=2&unit=lb&cut=braised")
        assert response.status_code == 200
        data = response.json()
        assert "error" not in data, f"Got error: {data.get('error')}"
        assert data["yield_pct"] == 50, f"Expected yield 50%, got {data['yield_pct']}"
        assert data["ep_quantity"] == 1.0, f"Expected EP 1.0lb, got {data['ep_quantity']}"
        print(f"PASSED: short rib braised 2lb = {data['yield_pct']}% yield, EP={data['ep_quantity']}lb")
    
    def test_calculate_lobster_whole(self):
        """GET /api/yields/calculate?ingredient=lobster+whole&quantity=3&unit=lb returns yield 25%"""
        response = requests.get(f"{BASE_URL}/api/yields/calculate?ingredient=lobster+whole&quantity=3&unit=lb")
        assert response.status_code == 200
        data = response.json()
        assert "error" not in data, f"Got error: {data.get('error')}"
        assert data["yield_pct"] == 25, f"Expected yield 25%, got {data['yield_pct']}"
        assert data["ep_quantity"] == 0.75, f"Expected EP 0.75lb, got {data['ep_quantity']}"
        print(f"PASSED: lobster whole 3lb = {data['yield_pct']}% yield, EP={data['ep_quantity']}lb")
    
    def test_calculate_asparagus_trimmed_spears(self):
        """GET /api/yields/calculate?ingredient=asparagus&quantity=1&unit=lb&cut=trimmed+spears returns yield 56%"""
        response = requests.get(f"{BASE_URL}/api/yields/calculate?ingredient=asparagus&quantity=1&unit=lb&cut=trimmed+spears")
        assert response.status_code == 200
        data = response.json()
        assert "error" not in data, f"Got error: {data.get('error')}"
        assert data["yield_pct"] == 56, f"Expected yield 56%, got {data['yield_pct']}"
        assert data["ep_quantity"] == 0.56, f"Expected EP 0.56lb, got {data['ep_quantity']}"
        print(f"PASSED: asparagus trimmed spears = {data['yield_pct']}% yield, EP={data['ep_quantity']}lb")
    
    def test_calculate_returns_cost_info(self):
        """Verify calculate endpoint returns cost information"""
        response = requests.get(f"{BASE_URL}/api/yields/calculate?ingredient=beef+tenderloin&quantity=1&unit=lb")
        assert response.status_code == 200
        data = response.json()
        assert "ap_cost" in data, "Expected ap_cost in response"
        assert "ep_cost_per_unit" in data, "Expected ep_cost_per_unit in response"
        assert "total_ep_cost" in data, "Expected total_ep_cost in response"
        assert data["ap_cost"] > 0, "Expected positive AP cost"
        print(f"PASSED: calculate returns cost info - AP=${data['ap_cost']}, EP/unit=${data['ep_cost_per_unit']}")


class TestYieldCategories:
    """Category and all yields endpoint tests"""
    
    def test_categories_returns_expected_categories(self):
        """GET /api/yields/categories returns categories totaling 89 ingredients"""
        response = requests.get(f"{BASE_URL}/api/yields/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        # Sum up counts - should total 89
        total = sum(c["count"] for c in data["categories"])
        assert total == 89, f"Expected 89 total ingredients, got {total}"
        # Check expected categories exist
        cat_names = [c["name"] for c in data["categories"]]
        expected = ["protein", "seafood", "vegetable", "fruit", "dairy", "herb", "grain"]
        for exp in expected:
            assert exp in cat_names, f"Expected category {exp} in {cat_names}"
        print(f"PASSED: categories endpoint returned {len(data['categories'])} categories with {total} total ingredients")
    
    def test_all_yields_returns_89_records(self):
        """GET /api/yields/all returns all 89 yield records"""
        response = requests.get(f"{BASE_URL}/api/yields/all")
        assert response.status_code == 200
        data = response.json()
        assert "yields" in data
        assert "total" in data
        assert data["total"] == 89, f"Expected 89 yields, got {data['total']}"
        assert len(data["yields"]) == 89, f"Expected 89 yield records, got {len(data['yields'])}"
        print(f"PASSED: all yields returned {data['total']} records")
    
    def test_all_yields_with_seafood_filter(self):
        """GET /api/yields/all?category=seafood returns only seafood items"""
        response = requests.get(f"{BASE_URL}/api/yields/all?category=seafood")
        assert response.status_code == 200
        data = response.json()
        assert "yields" in data
        assert len(data["yields"]) > 0, "Expected seafood items"
        # All should be seafood
        for y in data["yields"]:
            assert y["category"] == "seafood", f"Expected seafood, got {y['category']}"
        print(f"PASSED: seafood filter returned {len(data['yields'])} seafood items")


class TestExistingEndpoints:
    """Verify existing endpoints still work"""
    
    def test_purchasing_prep_list_still_returns_34_ingredients(self):
        """GET /api/purchasing/prep-list?date=2026-04-13 still returns 34 ingredients"""
        response = requests.get(f"{BASE_URL}/api/purchasing/prep-list?date=2026-04-13")
        assert response.status_code == 200
        data = response.json()
        assert "prep_list" in data, f"Expected prep_list key in response, got keys: {data.keys()}"
        assert len(data["prep_list"]) == 34, f"Expected 34 ingredients, got {len(data['prep_list'])}"
        print(f"PASSED: prep-list still returns {len(data['prep_list'])} ingredients")
    
    def test_ops_forecast_21_day_returns_21_days(self):
        """GET /api/ops-forecast/21-day returns 21 days data"""
        response = requests.get(f"{BASE_URL}/api/ops-forecast/21-day")
        assert response.status_code == 200
        data = response.json()
        assert "days" in data
        assert len(data["days"]) == 21, f"Expected 21 days, got {len(data['days'])}"
        print(f"PASSED: 21-day forecast returns {len(data['days'])} days")
    
    def test_health_endpoint(self):
        """GET /api/health returns OK"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("PASSED: health endpoint OK")


class TestYieldDatabaseDataQuality:
    """Verify data quality in yield database"""
    
    def test_grains_have_high_yield(self):
        """Grains like rice should have yield >100% (cooked vs dry)"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=rice")
        assert response.status_code == 200
        data = response.json()
        rice = None
        for r in data["results"]:
            if "rice" in r["name"].lower() and "jasmine" in r["name"].lower():
                rice = r
                break
        assert rice is not None, "Expected Rice Jasmine in results"
        assert rice["yield_pct"] == 250, f"Expected rice yield 250%, got {rice['yield_pct']}"
        print(f"PASSED: Rice Jasmine has {rice['yield_pct']}% yield (cooked vs dry)")
    
    def test_each_item_has_required_fields(self):
        """Each yield item should have name, category, yield_pct, ap_cost_lb, ep_cost_lb"""
        response = requests.get(f"{BASE_URL}/api/yields/all")
        assert response.status_code == 200
        data = response.json()
        required_fields = ["name", "category", "yield_pct", "ap_cost_lb", "ep_cost_lb"]
        for item in data["yields"]:
            for field in required_fields:
                assert field in item, f"Missing {field} in {item.get('name', 'unknown')}"
        print(f"PASSED: All {len(data['yields'])} items have required fields")
