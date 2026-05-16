"""
Iteration 86: Daily Reports with LIVE MongoDB Data Tests
=========================================================
Tests that GM Flash, Chef Daily, and Labor Forecast endpoints
now pull from real MongoDB collections instead of hardcoded data.

Collections tested:
- hk_rooms (65 rooms, 31 occupied)
- ird_orders (14 orders, $316 revenue)
- minibar_charges ($6 revenue)
- spa_appointments (8 appointments, $1310 revenue)
- guest_intelligence (3 profiles, 2 with allergens)
- concierge_tickets (9 total, 6 open)
- eng_work_tickets (8 total, 6 open)
- guest_menu (31 items)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestGMFlashLiveMongoDB:
    """GM Daily Flash Report - Real MongoDB Data Tests"""
    
    def test_gm_flash_returns_200(self):
        """GM Flash endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        assert response.status_code == 200
        
    def test_gm_flash_data_source_is_live_mongodb(self):
        """GM Flash data_source should be 'live_mongodb'"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        data = response.json()
        assert data.get("data_source") == "live_mongodb", f"Expected 'live_mongodb', got '{data.get('data_source')}'"
        
    def test_gm_flash_rooms_sold_matches_hk_rooms_occupied(self):
        """GM Flash yesterday.rooms_sold should match hk_rooms occupied count (31)"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        data = response.json()
        rooms_sold = data["yesterday"]["rooms_sold"]
        # Should be 31 based on real hk_rooms data
        assert rooms_sold == 31, f"Expected 31 rooms sold (from hk_rooms), got {rooms_sold}"
        
    def test_gm_flash_total_rooms_matches_hk_rooms_count(self):
        """GM Flash yesterday.rooms_total should match hk_rooms total (65)"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        data = response.json()
        total_rooms = data["yesterday"]["rooms_total"]
        assert total_rooms == 65, f"Expected 65 total rooms, got {total_rooms}"
        
    def test_gm_flash_fb_revenue_includes_real_ird_orders(self):
        """GM Flash fb_revenue should include real ird_orders revenue ($316 + guest_orders + minibar)"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        data = response.json()
        fb_revenue = data["yesterday"]["fb_revenue"]
        # ird_orders=$316, minibar=$6, guest_orders varies
        # fb_revenue = ird_revenue + guest_order_rev + minibar_revenue
        assert fb_revenue >= 316 + 6, f"F&B revenue {fb_revenue} should include at least $322 from ird+minibar"
        
    def test_gm_flash_spa_revenue_from_real_spa_appointments(self):
        """GM Flash spa_revenue should match real spa_appointments ($1310)"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        data = response.json()
        spa_revenue = data["yesterday"]["spa_revenue"]
        assert spa_revenue == 1310, f"Expected $1310 spa revenue, got {spa_revenue}"
        
    def test_gm_flash_vip_in_house_from_real_guest_intelligence(self):
        """GM Flash operations.vip_in_house should pull from real guest_intelligence VIP profiles"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        data = response.json()
        vip_list = data["operations"]["vip_in_house"]
        # Should have 2 VIP guests from guest_intelligence
        assert len(vip_list) >= 2, f"Expected at least 2 VIPs, got {len(vip_list)}"
        # Check for real guest names
        vip_names = [v["name"] for v in vip_list]
        assert any("James Smith" in name for name in vip_names), "James Smith should be in VIP list"
        assert any("Michael Chen" in name for name in vip_names), "Michael Chen should be in VIP list"
        
    def test_gm_flash_vip_notes_include_allergens(self):
        """GM Flash VIP notes should include allergen info from guest_intelligence"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        data = response.json()
        vip_list = data["operations"]["vip_in_house"]
        # James Smith has shellfish, tree nuts, peanuts allergens
        james = next((v for v in vip_list if "James Smith" in v["name"]), None)
        assert james is not None, "James Smith should be in VIP list"
        assert "shellfish" in james["notes"].lower() or "allergen" in james["notes"].lower(), \
            f"James Smith notes should mention allergens: {james['notes']}"
            
    def test_gm_flash_open_issues_from_real_tickets(self):
        """GM Flash open_issues should count from real concierge/engineering tickets"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        data = response.json()
        open_issues = data["open_issues"]
        # concierge: 6 open, engineering: 6 open
        assert open_issues["concierge"] == 6, f"Expected 6 open concierge tickets, got {open_issues['concierge']}"
        assert open_issues["engineering"] == 6, f"Expected 6 open engineering tickets, got {open_issues['engineering']}"
        
    def test_gm_flash_variance_calculations_present(self):
        """GM Flash should include variance calculations (positive/negative)"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        data = response.json()
        variance = data["yesterday"]["variance"]
        # Check variance structure
        assert "occupancy" in variance
        assert "adr" in variance
        assert "revpar" in variance
        assert "room_revenue" in variance
        assert "total_revenue" in variance
        # Each variance should have amount and pct
        for key in ["occupancy", "adr", "revpar"]:
            assert "amount" in variance[key], f"Variance {key} missing 'amount'"
            assert "pct" in variance[key], f"Variance {key} missing 'pct'"
            
    def test_gm_flash_comp_set_penetration_index_above_100(self):
        """GM Flash comp_set penetration_index should be > 100 (outperforming comp set)"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        data = response.json()
        penetration = data["comp_set"]["penetration_index"]
        # Penetration index > 100 means outperforming comp set
        assert penetration["occupancy"] > 100, f"Occupancy penetration {penetration['occupancy']} should be > 100"
        assert penetration["adr"] > 100, f"ADR penetration {penetration['adr']} should be > 100"
        assert penetration["revpar"] > 100, f"RevPAR penetration {penetration['revpar']} should be > 100"
        
    def test_gm_flash_departments_include_real_revenue(self):
        """GM Flash departments should include real revenue from collections"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        data = response.json()
        departments = data["departments"]
        dept_names = [d["name"] for d in departments]
        assert "Rooms" in dept_names
        assert "F&B — IRD" in dept_names
        assert "F&B — Minibar" in dept_names
        assert "Spa & Wellness" in dept_names
        # Check IRD revenue matches real data
        ird_dept = next((d for d in departments if "IRD" in d["name"]), None)
        assert ird_dept is not None
        # IRD actual should include real ird_orders revenue ($316 + guest_orders)
        assert ird_dept["actual"] >= 316, f"IRD actual {ird_dept['actual']} should be >= $316"


class TestChefDailyLiveMongoDB:
    """Chef Daily Report - Real MongoDB Data Tests"""
    
    def test_chef_daily_returns_200(self):
        """Chef Daily endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        assert response.status_code == 200
        
    def test_chef_daily_data_source_is_live_mongodb(self):
        """Chef Daily data_source should be 'live_mongodb'"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        data = response.json()
        assert data.get("data_source") == "live_mongodb", f"Expected 'live_mongodb', got '{data.get('data_source')}'"
        
    def test_chef_daily_ird_revenue_from_real_orders(self):
        """Chef Daily costs.ird_revenue_actual should match real ird_orders ($316)"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        data = response.json()
        ird_revenue = data["costs"]["ird_revenue_actual"]
        assert ird_revenue == 316, f"Expected $316 IRD revenue, got {ird_revenue}"
        
    def test_chef_daily_covers_ird_from_real_orders(self):
        """Chef Daily covers.ird.actual should match real ird_orders count (14)"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        data = response.json()
        ird_actual = data["covers"]["ird"]["actual"]
        assert ird_actual == 14, f"Expected 14 IRD covers, got {ird_actual}"
        
    def test_chef_daily_allergen_summary_from_real_guest_intelligence(self):
        """Chef Daily allergen_summary should pull from real guest_intelligence (2 guests with allergens)"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        data = response.json()
        allergen_summary = data["allergen_summary"]
        assert allergen_summary["total_guests_with_allergens"] == 2, \
            f"Expected 2 guests with allergens, got {allergen_summary['total_guests_with_allergens']}"
        
    def test_chef_daily_allergen_guests_have_correct_data(self):
        """Chef Daily allergen guests should have correct names and allergens"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        data = response.json()
        guests = data["allergen_summary"]["guests"]
        # James Smith: shellfish, tree nuts, peanuts
        james = next((g for g in guests if g.get("first_name") == "James"), None)
        assert james is not None, "James Smith should be in allergen guests"
        assert "shellfish" in james["allergens"]
        assert "tree nuts" in james["allergens"]
        assert "peanuts" in james["allergens"]
        # Michael Chen: dairy, eggs
        michael = next((g for g in guests if g.get("first_name") == "Michael"), None)
        assert michael is not None, "Michael Chen should be in allergen guests"
        assert "dairy" in michael["allergens"]
        assert "eggs" in michael["allergens"]
        
    def test_chef_daily_critical_allergens_list(self):
        """Chef Daily should list all critical allergens from guests"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        data = response.json()
        critical = data["allergen_summary"]["critical_allergens"]
        expected = ["shellfish", "tree nuts", "peanuts", "dairy", "eggs"]
        for allergen in expected:
            assert allergen in critical, f"'{allergen}' should be in critical allergens"
            
    def test_chef_daily_eighty_sixed_items_present(self):
        """Chef Daily eighty_sixed should include sold-out items"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        data = response.json()
        eighty_sixed = data["eighty_sixed"]
        # Should have at least the standard 86'd items (Branzino, Lobster Tail)
        assert len(eighty_sixed) >= 2, f"Expected at least 2 86'd items, got {len(eighty_sixed)}"
        item_names = [item["item"] for item in eighty_sixed]
        assert "Branzino" in item_names, "Branzino should be 86'd"
        assert "Lobster Tail" in item_names, "Lobster Tail should be 86'd"
        
    def test_chef_daily_cost_per_cover_calculated(self):
        """Chef Daily cost_per_cover should be calculated from real data"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        data = response.json()
        cost_per_cover = data["costs"]["cost_per_cover"]
        revenue_per_cover = data["costs"]["revenue_per_cover"]
        # Should be calculated from real ird_revenue / covers
        assert cost_per_cover > 0, "Cost per cover should be > 0"
        assert revenue_per_cover > 0, "Revenue per cover should be > 0"


class TestLaborForecastLiveMongoDB:
    """Labor Forecast & Staffing - Real MongoDB Data Tests"""
    
    def test_labor_forecast_returns_200(self):
        """Labor forecast endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/labor/forecast")
        assert response.status_code == 200
        
    def test_labor_forecast_data_source_is_live_mongodb(self):
        """Labor forecast data_source should be 'live_mongodb'"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/labor/forecast")
        data = response.json()
        assert data.get("data_source") == "live_mongodb", f"Expected 'live_mongodb', got '{data.get('data_source')}'"
        
    def test_labor_forecast_occupancy_from_real_hk_rooms(self):
        """Labor forecast occupancy_rooms should match real hk_rooms occupied (31)"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/labor/forecast")
        data = response.json()
        assert data["occupancy_rooms"] == 31, f"Expected 31 occupied rooms, got {data['occupancy_rooms']}"
        assert data["total_rooms"] == 65, f"Expected 65 total rooms, got {data['total_rooms']}"
        
    def test_labor_forecast_has_6_outlets(self):
        """Labor forecast should show 6 outlets"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/labor/forecast")
        data = response.json()
        outlets = data["outlets"]
        assert len(outlets) == 6, f"Expected 6 outlets, got {len(outlets)}"
        outlet_ids = [o["outlet_id"] for o in outlets]
        expected_outlets = ["restaurant", "ird", "banquet", "bar", "spa", "housekeeping"]
        for outlet in expected_outlets:
            assert outlet in outlet_ids, f"'{outlet}' should be in outlets"
            
    def test_labor_forecast_position_level_staffing(self):
        """Labor forecast should show position-level staffing needs"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/labor/forecast")
        data = response.json()
        # Check restaurant outlet has positions
        restaurant = next((o for o in data["outlets"] if o["outlet_id"] == "restaurant"), None)
        assert restaurant is not None
        positions = restaurant["positions"]
        assert len(positions) >= 3, f"Restaurant should have at least 3 positions, got {len(positions)}"
        # Check position structure
        for pos in positions:
            assert "position" in pos
            assert "required" in pos
            assert "scheduled" in pos
            assert "gap" in pos
            assert "status" in pos
            assert pos["status"] in ["overstaffed", "understaffed", "optimal"]
            
    def test_labor_forecast_gap_analysis(self):
        """Labor forecast should identify understaffed outlets"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/labor/forecast")
        data = response.json()
        summary = data["summary"]
        assert "understaffed_outlets" in summary
        assert "total_required" in summary
        assert "total_scheduled" in summary
        assert "gap" in summary
        
    def test_labor_forecast_housekeeping_based_on_total_rooms(self):
        """Labor forecast housekeeping should be based on total rooms (65)"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/labor/forecast")
        data = response.json()
        housekeeping = next((o for o in data["outlets"] if o["outlet_id"] == "housekeeping"), None)
        assert housekeeping is not None
        # Housekeeping forecast_covers should be total_rooms (65)
        assert housekeeping["forecast_covers"] == 65, \
            f"Housekeeping forecast should be 65 rooms, got {housekeeping['forecast_covers']}"
            
    def test_labor_ratios_returns_200(self):
        """Labor ratios endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/labor/ratios")
        assert response.status_code == 200
        
    def test_labor_ratios_has_all_outlets(self):
        """Labor ratios should have ratios for all 6 outlets"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/labor/ratios")
        data = response.json()
        ratios = data["ratios"]
        expected_outlets = ["restaurant", "ird", "banquet", "bar", "spa", "housekeeping"]
        for outlet in expected_outlets:
            assert outlet in ratios, f"'{outlet}' should have staffing ratios"


class TestRegressionAPIs:
    """Regression tests for other APIs that should still work"""
    
    def test_health_endpoint(self):
        """Health endpoint should return healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        
    def test_guest_intelligence_endpoint(self):
        """Guest intelligence endpoint should still work"""
        response = requests.get(f"{BASE_URL}/api/guest-intel/dashboard")
        assert response.status_code == 200
        
    def test_housekeeping_dashboard(self):
        """Housekeeping dashboard should still work"""
        response = requests.get(f"{BASE_URL}/api/housekeeping/dashboard")
        assert response.status_code == 200
        
    def test_ird_orders_endpoint(self):
        """IRD orders endpoint should still work"""
        response = requests.get(f"{BASE_URL}/api/ird/orders")
        assert response.status_code == 200
        
    def test_spa_appointments_endpoint(self):
        """Spa appointments endpoint should still work"""
        response = requests.get(f"{BASE_URL}/api/spa/appointments")
        assert response.status_code == 200
        
    def test_concierge_dashboard(self):
        """Concierge dashboard should still work"""
        response = requests.get(f"{BASE_URL}/api/concierge/dashboard")
        assert response.status_code == 200


class TestNoCompetitorReferences:
    """Verify no competitor names (ALICE/ProfitSword) in responses"""
    
    def test_gm_flash_no_alice_reference(self):
        """GM Flash should not reference ALICE"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        text = response.text.lower()
        assert "alice" not in text, "GM Flash should not reference ALICE"
        
    def test_gm_flash_no_profitsword_reference(self):
        """GM Flash should not reference ProfitSword"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        text = response.text.lower()
        assert "profitsword" not in text, "GM Flash should not reference ProfitSword"
        
    def test_chef_daily_no_alice_reference(self):
        """Chef Daily should not reference ALICE"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        text = response.text.lower()
        assert "alice" not in text, "Chef Daily should not reference ALICE"
        
    def test_chef_daily_no_profitsword_reference(self):
        """Chef Daily should not reference ProfitSword"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        text = response.text.lower()
        assert "profitsword" not in text, "Chef Daily should not reference ProfitSword"
        
    def test_labor_forecast_no_competitor_references(self):
        """Labor forecast should not reference competitors"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/labor/forecast")
        text = response.text.lower()
        assert "alice" not in text, "Labor forecast should not reference ALICE"
        assert "profitsword" not in text, "Labor forecast should not reference ProfitSword"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
