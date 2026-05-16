"""
Iteration 85: GM Daily Flash Report + Chef Daily Report API Tests
=================================================================
Tests for the new executive daily reports:
1. GM Daily Flash - One-page executive briefing with KPIs, MTD, comp set, operations, pace, trend
2. Chef Daily Report - Kitchen briefing with costs, covers, 86'd items, allergens, BEO, prep, staffing
3. No competitor name references (ALICE/ProfitSword)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGMFlashReport:
    """GM Daily Flash Report API tests"""
    
    def test_gm_flash_endpoint_returns_200(self):
        """GET /api/daily-reports/gm-flash returns 200"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GM Flash endpoint returns 200")
    
    def test_gm_flash_has_report_date(self):
        """GM Flash has report_date and report_time"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        data = response.json()
        assert "report_date" in data, "Missing report_date"
        assert "report_time" in data, "Missing report_time"
        print(f"✓ Report date: {data['report_date']}, time: {data['report_time']}")
    
    def test_gm_flash_yesterday_performance(self):
        """GM Flash yesterday has occupancy 84.7%, ADR $289.50, variance calculations"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        data = response.json()
        y = data.get("yesterday", {})
        
        # Check key KPIs
        assert y.get("occupancy_pct") == 84.7, f"Expected occupancy 84.7%, got {y.get('occupancy_pct')}"
        assert y.get("adr") == 289.50, f"Expected ADR $289.50, got {y.get('adr')}"
        assert y.get("revpar") == 245.25, f"Expected RevPAR $245.25, got {y.get('revpar')}"
        assert "trevpar" in y, "Missing TRevPAR"
        assert "goppar" in y, "Missing GOPPAR"
        
        # Check variance calculations
        assert "variance" in y, "Missing variance calculations"
        assert "occupancy" in y["variance"], "Missing occupancy variance"
        assert "adr" in y["variance"], "Missing ADR variance"
        assert "revpar" in y["variance"], "Missing RevPAR variance"
        
        # Verify variance structure
        occ_var = y["variance"]["occupancy"]
        assert "amount" in occ_var, "Variance missing amount"
        assert "pct" in occ_var, "Variance missing pct"
        
        print(f"✓ Yesterday: Occ {y['occupancy_pct']}%, ADR ${y['adr']}, RevPAR ${y['revpar']}")
        print(f"✓ Variance: Occ {occ_var['pct']}%, ADR {y['variance']['adr']['pct']}%")
    
    def test_gm_flash_mtd_data(self):
        """GM Flash MTD has actual vs budget vs LY comparison"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        data = response.json()
        mtd = data.get("mtd", {})
        
        assert "days_elapsed" in mtd, "Missing days_elapsed"
        assert "occupancy_pct" in mtd, "Missing MTD occupancy"
        assert "adr" in mtd, "Missing MTD ADR"
        assert "revpar" in mtd, "Missing MTD RevPAR"
        
        # Budget comparison
        assert "budget_occupancy" in mtd, "Missing budget_occupancy"
        assert "budget_adr" in mtd, "Missing budget_adr"
        assert "variance_vs_budget" in mtd, "Missing variance_vs_budget"
        
        # LY comparison
        assert "ly_occupancy" in mtd, "Missing ly_occupancy"
        assert "ly_adr" in mtd, "Missing ly_adr"
        assert "variance_vs_ly" in mtd, "Missing variance_vs_ly"
        
        print(f"✓ MTD Day {mtd['days_elapsed']}: Occ {mtd['occupancy_pct']}%, ADR ${mtd['adr']}")
    
    def test_gm_flash_comp_set_penetration_index(self):
        """GM Flash comp_set has penetration_index (occ 106.9, revpar 115.5)"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        data = response.json()
        cs = data.get("comp_set", {})
        
        assert "our_hotel" in cs, "Missing our_hotel"
        assert "comp_set_avg" in cs, "Missing comp_set_avg"
        assert "market" in cs, "Missing market"
        assert "penetration_index" in cs, "Missing penetration_index"
        
        pi = cs["penetration_index"]
        assert "occupancy" in pi, "Missing occupancy index"
        assert "adr" in pi, "Missing ADR index"
        assert "revpar" in pi, "Missing RevPAR index"
        
        # Verify penetration index values (calculated as our_hotel / comp_set_avg * 100)
        # 84.7 / 79.2 * 100 = 106.9
        assert pi["occupancy"] == 106.9, f"Expected occ index 106.9, got {pi['occupancy']}"
        # 245.25 / 212.26 * 100 = 115.5
        assert pi["revpar"] == 115.5, f"Expected revpar index 115.5, got {pi['revpar']}"
        
        print(f"✓ Penetration Index: Occ {pi['occupancy']}, ADR {pi['adr']}, RevPAR {pi['revpar']}")
    
    def test_gm_flash_operations(self):
        """GM Flash operations has arrivals (42), vip_in_house (3 VIPs)"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        data = response.json()
        ops = data.get("operations", {})
        
        assert ops.get("arrivals") == 42, f"Expected 42 arrivals, got {ops.get('arrivals')}"
        assert ops.get("departures") == 38, f"Expected 38 departures, got {ops.get('departures')}"
        assert ops.get("stayovers") == 89, f"Expected 89 stayovers, got {ops.get('stayovers')}"
        assert ops.get("no_shows") == 2, f"Expected 2 no-shows, got {ops.get('no_shows')}"
        
        # VIP in-house
        vips = ops.get("vip_in_house", [])
        assert len(vips) == 3, f"Expected 3 VIPs, got {len(vips)}"
        
        # Check VIP structure
        vip = vips[0]
        assert "name" in vip, "VIP missing name"
        assert "room" in vip, "VIP missing room"
        assert "status" in vip, "VIP missing status"
        assert "notes" in vip, "VIP missing notes"
        
        print(f"✓ Operations: {ops['arrivals']} arrivals, {ops['departures']} departures, {len(vips)} VIPs")
    
    def test_gm_flash_departments(self):
        """GM Flash has departmental revenue with variance badges"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        data = response.json()
        depts = data.get("departments", [])
        
        assert len(depts) >= 8, f"Expected at least 8 departments, got {len(depts)}"
        
        # Check department structure
        dept = depts[0]
        assert "name" in dept, "Department missing name"
        assert "actual" in dept, "Department missing actual"
        assert "budget" in dept, "Department missing budget"
        assert "variance" in dept, "Department missing variance"
        
        # Verify Rooms department
        rooms = next((d for d in depts if d["name"] == "Rooms"), None)
        assert rooms is not None, "Missing Rooms department"
        assert rooms["actual"] == 36766.50, f"Expected Rooms actual $36766.50, got {rooms['actual']}"
        
        print(f"✓ {len(depts)} departments with variance calculations")
    
    def test_gm_flash_pace_report(self):
        """GM Flash pace has current_month_otb vs same_time_ly with variance"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        data = response.json()
        pace = data.get("pace", {})
        
        assert "current_month_otb" in pace, "Missing current_month_otb"
        assert "same_time_ly" in pace, "Missing same_time_ly"
        assert "variance" in pace, "Missing variance"
        assert "next_30_days" in pace, "Missing next_30_days"
        
        otb = pace["current_month_otb"]
        assert "rooms" in otb, "OTB missing rooms"
        assert "revenue" in otb, "OTB missing revenue"
        assert "adr" in otb, "OTB missing adr"
        
        # Verify variance
        var = pace["variance"]
        assert var["rooms"] == 160, f"Expected variance rooms 160, got {var['rooms']}"
        assert var["revenue"] == 112400, f"Expected variance revenue 112400, got {var['revenue']}"
        
        print(f"✓ Pace: OTB {otb['rooms']} rooms, LY {pace['same_time_ly']['rooms']} rooms, +{var['rooms']} variance")
    
    def test_gm_flash_7day_trend(self):
        """GM Flash has 7-day trend data"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        data = response.json()
        trend = data.get("trend_7d", [])
        
        assert len(trend) == 7, f"Expected 7 days of trend, got {len(trend)}"
        
        # Check trend structure
        day = trend[0]
        assert "date" in day, "Trend missing date"
        assert "occupancy" in day, "Trend missing occupancy"
        assert "adr" in day, "Trend missing adr"
        assert "revpar" in day, "Trend missing revpar"
        
        print(f"✓ 7-day trend: {[d['date'] for d in trend]}")


class TestChefDailyReport:
    """Chef Daily Report API tests"""
    
    def test_chef_daily_endpoint_returns_200(self):
        """GET /api/daily-reports/chef-daily returns 200"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Chef Daily endpoint returns 200")
    
    def test_chef_daily_has_report_date(self):
        """Chef Daily has report_date and report_time"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        data = response.json()
        assert "report_date" in data, "Missing report_date"
        assert "report_time" in data, "Missing report_time"
        print(f"✓ Report date: {data['report_date']}, time: {data['report_time']}")
    
    def test_chef_daily_costs(self):
        """Chef report has food_cost_pct 28.4% with target 30.0%"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        data = response.json()
        costs = data.get("costs", {})
        
        assert costs.get("food_cost_pct") == 28.4, f"Expected food_cost 28.4%, got {costs.get('food_cost_pct')}"
        assert costs.get("food_cost_target") == 30.0, f"Expected target 30.0%, got {costs.get('food_cost_target')}"
        assert costs.get("labor_cost_pct") == 31.2, f"Expected labor_cost 31.2%, got {costs.get('labor_cost_pct')}"
        assert costs.get("prime_cost_pct") == 59.6, f"Expected prime_cost 59.6%, got {costs.get('prime_cost_pct')}"
        assert "cost_per_cover" in costs, "Missing cost_per_cover"
        assert "revenue_per_cover" in costs, "Missing revenue_per_cover"
        assert "waste_today_lbs" in costs, "Missing waste_today_lbs"
        
        print(f"✓ Costs: Food {costs['food_cost_pct']}%, Labor {costs['labor_cost_pct']}%, Prime {costs['prime_cost_pct']}%")
    
    def test_chef_daily_eighty_sixed(self):
        """Chef report eighty_sixed has 3 items (Branzino, Lobster Tail, Chocolate Lava Cake)"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        data = response.json()
        items = data.get("eighty_sixed", [])
        
        assert len(items) == 3, f"Expected 3 86'd items, got {len(items)}"
        
        item_names = [i["item"] for i in items]
        assert "Branzino" in item_names, "Missing Branzino"
        assert "Lobster Tail" in item_names, "Missing Lobster Tail"
        assert "Chocolate Lava Cake" in item_names, "Missing Chocolate Lava Cake"
        
        # Check structure
        item = items[0]
        assert "item" in item, "86'd item missing name"
        assert "reason" in item, "86'd item missing reason"
        assert "expected_back" in item, "86'd item missing expected_back"
        assert "outlet" in item, "86'd item missing outlet"
        
        print(f"✓ 86'd items: {item_names}")
    
    def test_chef_daily_allergen_summary(self):
        """Chef report allergen_summary pulls from guest_intelligence collection"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        data = response.json()
        allergens = data.get("allergen_summary", {})
        
        assert "total_guests_with_allergens" in allergens, "Missing total_guests_with_allergens"
        assert "guests" in allergens, "Missing guests list"
        assert "critical_allergens" in allergens, "Missing critical_allergens"
        assert "dietary_restrictions" in allergens, "Missing dietary_restrictions"
        
        # Check guest structure if any guests exist
        guests = allergens.get("guests", [])
        if len(guests) > 0:
            guest = guests[0]
            assert "first_name" in guest or "last_name" in guest, "Guest missing name fields"
            assert "room_number" in guest, "Guest missing room_number"
            assert "allergens" in guest, "Guest missing allergens"
        
        print(f"✓ Allergen summary: {allergens['total_guests_with_allergens']} guests with allergens")
    
    def test_chef_daily_beo_events(self):
        """Chef report beo_events has 2 events with dietary notes"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        data = response.json()
        events = data.get("beo_events", [])
        
        assert len(events) == 2, f"Expected 2 BEO events, got {len(events)}"
        
        # Check event structure
        event = events[0]
        assert "event" in event, "BEO missing event name"
        assert "time" in event, "BEO missing time"
        assert "covers" in event, "BEO missing covers"
        assert "menu_type" in event, "BEO missing menu_type"
        assert "dietary_notes" in event, "BEO missing dietary_notes"
        assert "chef_notes" in event, "BEO missing chef_notes"
        assert "status" in event, "BEO missing status"
        
        # Verify specific events
        event_names = [e["event"] for e in events]
        assert "Tech Summit Lunch" in event_names, "Missing Tech Summit Lunch"
        assert "Wedding Rehearsal Dinner" in event_names, "Missing Wedding Rehearsal Dinner"
        
        print(f"✓ BEO events: {event_names}")
    
    def test_chef_daily_prep_counts(self):
        """Chef report prep shows 93.6% completion with 4 behind items"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        data = response.json()
        prep = data.get("prep", {})
        
        assert "stations" in prep, "Missing stations"
        assert "total_par" in prep, "Missing total_par"
        assert "total_prepped" in prep, "Missing total_prepped"
        assert "completion_pct" in prep, "Missing completion_pct"
        assert "behind_items" in prep, "Missing behind_items"
        
        # Verify completion percentage
        assert prep["completion_pct"] == 93.6, f"Expected 93.6% completion, got {prep['completion_pct']}"
        
        # Verify behind items count
        behind = prep.get("behind_items", [])
        assert len(behind) == 4, f"Expected 4 behind items, got {len(behind)}"
        
        # Check station structure
        stations = prep.get("stations", [])
        assert len(stations) >= 4, f"Expected at least 4 stations, got {len(stations)}"
        
        station = stations[0]
        assert "station" in station, "Station missing name"
        assert "items" in station, "Station missing items"
        
        print(f"✓ Prep: {prep['completion_pct']}% complete, {len(behind)} items behind")
    
    def test_chef_daily_staffing(self):
        """Chef report staffing shows 26/28 present with 2 callouts"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        data = response.json()
        staff = data.get("staffing", {})
        
        assert staff.get("scheduled") == 28, f"Expected 28 scheduled, got {staff.get('scheduled')}"
        assert staff.get("present") == 26, f"Expected 26 present, got {staff.get('present')}"
        assert staff.get("callouts") == 2, f"Expected 2 callouts, got {staff.get('callouts')}"
        assert "callout_names" in staff, "Missing callout_names"
        assert "overtime_hours" in staff, "Missing overtime_hours"
        assert "agency_staff" in staff, "Missing agency_staff"
        
        # Verify callout names
        callouts = staff.get("callout_names", [])
        assert len(callouts) == 2, f"Expected 2 callout names, got {len(callouts)}"
        
        print(f"✓ Staffing: {staff['present']}/{staff['scheduled']} present, {staff['callouts']} callouts")
    
    def test_chef_daily_covers_forecast(self):
        """Chef report has cover forecast by meal period"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        data = response.json()
        covers = data.get("covers", {})
        
        assert "breakfast" in covers, "Missing breakfast"
        assert "lunch" in covers, "Missing lunch"
        assert "dinner" in covers, "Missing dinner"
        assert "ird" in covers, "Missing ird"
        assert "banquet" in covers, "Missing banquet"
        assert "total_forecast" in covers, "Missing total_forecast"
        
        # Check meal period structure
        breakfast = covers.get("breakfast", {})
        assert "forecast" in breakfast, "Breakfast missing forecast"
        assert "actual" in breakfast, "Breakfast missing actual"
        
        print(f"✓ Covers: Total forecast {covers['total_forecast']}")


class TestNoCompetitorReferences:
    """Verify no competitor name references in API responses"""
    
    def test_gm_flash_no_alice_reference(self):
        """GM Flash has no ALICE references"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        text = response.text.lower()
        assert "alice" not in text, "Found ALICE reference in GM Flash"
        print("✓ No ALICE reference in GM Flash")
    
    def test_gm_flash_no_profitsword_reference(self):
        """GM Flash has no ProfitSword references"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        text = response.text.lower()
        assert "profitsword" not in text, "Found ProfitSword reference in GM Flash"
        print("✓ No ProfitSword reference in GM Flash")
    
    def test_chef_daily_no_alice_reference(self):
        """Chef Daily has no ALICE references"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        text = response.text.lower()
        assert "alice" not in text, "Found ALICE reference in Chef Daily"
        print("✓ No ALICE reference in Chef Daily")
    
    def test_chef_daily_no_profitsword_reference(self):
        """Chef Daily has no ProfitSword references"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        text = response.text.lower()
        assert "profitsword" not in text, "Found ProfitSword reference in Chef Daily"
        print("✓ No ProfitSword reference in Chef Daily")


class TestRegressionHealthCheck:
    """Basic regression tests to ensure existing functionality works"""
    
    def test_health_endpoint(self):
        """GET /api/health returns healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("✓ Health endpoint working")
    
    def test_concierge_dashboard(self):
        """GET /api/concierge/dashboard returns data"""
        response = requests.get(f"{BASE_URL}/api/concierge/dashboard")
        assert response.status_code == 200, f"Concierge dashboard failed: {response.status_code}"
        print("✓ Concierge dashboard working")
    
    def test_housekeeping_dashboard(self):
        """GET /api/housekeeping/dashboard returns data"""
        response = requests.get(f"{BASE_URL}/api/housekeeping/dashboard")
        assert response.status_code == 200, f"Housekeeping dashboard failed: {response.status_code}"
        print("✓ Housekeeping dashboard working")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
