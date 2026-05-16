"""
Iteration 89: Enterprise BI Suite API Tests
============================================
Tests all 7 Enterprise BI endpoints:
1. GET /api/enterprise-bi/str/dashboard - STR Competitive Set
2. GET /api/enterprise-bi/pnl/waterfall - P&L Waterfall
3. GET /api/enterprise-bi/portfolio/dashboard - Multi-Property Portfolio
4. GET /api/enterprise-bi/pms/arrivals - PMS Arrivals
5. GET /api/enterprise-bi/pms/departures - PMS Departures
6. GET /api/enterprise-bi/pms/otb-pace - OTB Pace Report
7. GET /api/enterprise-bi/pms/guest-mix - Guest Mix Analysis
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestSTRCompetitiveSet:
    """STR Competitive Set Dashboard Tests"""
    
    def test_str_dashboard_returns_200(self):
        """GET /api/enterprise-bi/str/dashboard returns 200"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/str/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_str_dashboard_has_period(self):
        """STR dashboard returns period field"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/str/dashboard")
        data = response.json()
        assert "period" in data, "Missing 'period' field"
        assert isinstance(data["period"], str), "period should be string"
    
    def test_str_dashboard_has_indices(self):
        """STR dashboard returns MPI, ARI, RGI indices"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/str/dashboard")
        data = response.json()
        assert "indices" in data, "Missing 'indices' field"
        indices = data["indices"]
        assert "mpi" in indices, "Missing MPI index"
        assert "ari" in indices, "Missing ARI index"
        assert "rgi" in indices, "Missing RGI index"
        # Indices should be numeric
        assert isinstance(indices["mpi"], (int, float)), "MPI should be numeric"
        assert isinstance(indices["ari"], (int, float)), "ARI should be numeric"
        assert isinstance(indices["rgi"], (int, float)), "RGI should be numeric"
    
    def test_str_dashboard_has_comp_set(self):
        """STR dashboard returns competitive set array"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/str/dashboard")
        data = response.json()
        assert "comp_set" in data, "Missing 'comp_set' field"
        assert isinstance(data["comp_set"], list), "comp_set should be array"
        assert len(data["comp_set"]) >= 2, "comp_set should have at least 2 properties"
        # Check first property has required fields
        prop = data["comp_set"][0]
        assert "name" in prop, "Property missing 'name'"
        assert "occupancy" in prop, "Property missing 'occupancy'"
        assert "adr" in prop, "Property missing 'adr'"
        assert "revpar" in prop, "Property missing 'revpar'"
    
    def test_str_dashboard_has_trend_12m(self):
        """STR dashboard returns 12-month trend data"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/str/dashboard")
        data = response.json()
        assert "trend_12m" in data, "Missing 'trend_12m' field"
        assert isinstance(data["trend_12m"], list), "trend_12m should be array"
        assert len(data["trend_12m"]) == 12, f"Expected 12 months, got {len(data['trend_12m'])}"
        # Check trend entry has RGI
        trend = data["trend_12m"][0]
        assert "rgi" in trend, "Trend entry missing 'rgi'"
        assert "month" in trend, "Trend entry missing 'month'"
    
    def test_str_dashboard_has_insights(self):
        """STR dashboard returns market insights"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/str/dashboard")
        data = response.json()
        assert "insights" in data, "Missing 'insights' field"
        insights = data["insights"]
        assert "market_position" in insights, "Missing market_position insight"
        assert "rate_strategy" in insights, "Missing rate_strategy insight"
        assert "occupancy_share" in insights, "Missing occupancy_share insight"
    
    def test_str_dashboard_has_ranking(self):
        """STR dashboard returns ranking data"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/str/dashboard")
        data = response.json()
        assert "ranking" in data, "Missing 'ranking' field"
        ranking = data["ranking"]
        assert "position" in ranking, "Missing ranking position"
        assert "total" in ranking, "Missing ranking total"
        assert "by_revpar" in ranking, "Missing by_revpar ranking"


class TestPnLWaterfall:
    """P&L Waterfall Tests"""
    
    def test_pnl_waterfall_returns_200(self):
        """GET /api/enterprise-bi/pnl/waterfall returns 200"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pnl/waterfall")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_pnl_waterfall_has_waterfall_steps(self):
        """P&L waterfall returns waterfall steps array"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pnl/waterfall")
        data = response.json()
        assert "waterfall" in data, "Missing 'waterfall' field"
        assert isinstance(data["waterfall"], list), "waterfall should be array"
        assert len(data["waterfall"]) >= 10, "waterfall should have multiple steps"
        # Check step structure
        step = data["waterfall"][0]
        assert "label" in step, "Step missing 'label'"
        assert "value" in step, "Step missing 'value'"
        assert "type" in step, "Step missing 'type'"
        assert "color" in step, "Step missing 'color'"
    
    def test_pnl_waterfall_has_summary(self):
        """P&L waterfall returns summary with revenue/gop/net"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pnl/waterfall")
        data = response.json()
        assert "summary" in data, "Missing 'summary' field"
        summary = data["summary"]
        assert "total_revenue" in summary, "Missing total_revenue"
        assert "gop" in summary, "Missing gop"
        assert "net_income" in summary, "Missing net_income"
        assert "gop_margin" in summary, "Missing gop_margin"
        assert "net_margin" in summary, "Missing net_margin"
    
    def test_pnl_waterfall_has_department_pnl(self):
        """P&L waterfall returns department P&L breakdown"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pnl/waterfall")
        data = response.json()
        assert "department_pnl" in data, "Missing 'department_pnl' field"
        assert isinstance(data["department_pnl"], list), "department_pnl should be array"
        assert len(data["department_pnl"]) >= 3, "Should have at least 3 departments"
        # Check department structure
        dept = data["department_pnl"][0]
        assert "dept" in dept, "Department missing 'dept'"
        assert "revenue" in dept, "Department missing 'revenue'"
        assert "cost" in dept, "Department missing 'cost'"
        assert "profit" in dept, "Department missing 'profit'"
        assert "margin" in dept, "Department missing 'margin'"
    
    def test_pnl_waterfall_period_param(self):
        """P&L waterfall accepts period parameter"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pnl/waterfall?period=mtd")
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "mtd"


class TestPortfolioDashboard:
    """Multi-Property Portfolio Dashboard Tests"""
    
    def test_portfolio_dashboard_returns_200(self):
        """GET /api/enterprise-bi/portfolio/dashboard returns 200"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/portfolio/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_portfolio_has_summary(self):
        """Portfolio dashboard returns portfolio_summary"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/portfolio/dashboard")
        data = response.json()
        assert "portfolio_summary" in data, "Missing 'portfolio_summary' field"
        summary = data["portfolio_summary"]
        assert "total_properties" in summary, "Missing total_properties"
        assert "total_rooms" in summary, "Missing total_rooms"
        assert "total_revenue" in summary, "Missing total_revenue"
        assert "avg_occupancy" in summary, "Missing avg_occupancy"
        assert "avg_revpar" in summary, "Missing avg_revpar"
        assert "avg_gop_margin" in summary, "Missing avg_gop_margin"
    
    def test_portfolio_has_properties_array(self):
        """Portfolio dashboard returns properties array"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/portfolio/dashboard")
        data = response.json()
        assert "properties" in data, "Missing 'properties' field"
        assert isinstance(data["properties"], list), "properties should be array"
        assert len(data["properties"]) >= 1, "Should have at least 1 property"
        # Check property structure
        prop = data["properties"][0]
        assert "id" in prop, "Property missing 'id'"
        assert "name" in prop, "Property missing 'name'"
        assert "location" in prop, "Property missing 'location'"
        assert "occupancy" in prop, "Property missing 'occupancy'"
        assert "adr" in prop, "Property missing 'adr'"
        assert "revpar" in prop, "Property missing 'revpar'"
        assert "data_source" in prop, "Property missing 'data_source'"
    
    def test_portfolio_has_rankings(self):
        """Portfolio dashboard returns rankings"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/portfolio/dashboard")
        data = response.json()
        assert "rankings" in data, "Missing 'rankings' field"
        rankings = data["rankings"]
        assert "by_revpar" in rankings, "Missing by_revpar ranking"
        assert "by_gop_margin" in rankings, "Missing by_gop_margin ranking"
        assert "by_total_revenue" in rankings, "Missing by_total_revenue ranking"
    
    def test_portfolio_has_regions(self):
        """Portfolio dashboard returns regions breakdown"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/portfolio/dashboard")
        data = response.json()
        assert "regions" in data, "Missing 'regions' field"
        assert isinstance(data["regions"], dict), "regions should be dict"
        # Check region structure
        for region_name, region_data in data["regions"].items():
            assert "properties" in region_data, f"Region {region_name} missing 'properties'"
            assert "avg_occ" in region_data, f"Region {region_name} missing 'avg_occ'"
            assert "total_rev" in region_data, f"Region {region_name} missing 'total_rev'"
    
    def test_portfolio_main_property_has_live_data(self):
        """Main property (prop-main) uses live MongoDB data"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/portfolio/dashboard")
        data = response.json()
        main_prop = next((p for p in data["properties"] if p["id"] == "prop-main"), None)
        assert main_prop is not None, "Main property not found"
        assert main_prop["data_source"] == "live_mongodb", "Main property should use live data"


class TestPMSArrivals:
    """PMS Arrivals Tests"""
    
    def test_pms_arrivals_returns_200(self):
        """GET /api/enterprise-bi/pms/arrivals returns 200"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pms/arrivals")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_pms_arrivals_has_arrivals_list(self):
        """PMS arrivals returns arrivals list"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pms/arrivals")
        data = response.json()
        assert "arrivals" in data, "Missing 'arrivals' field"
        assert isinstance(data["arrivals"], list), "arrivals should be array"
        assert "total_arrivals" in data, "Missing 'total_arrivals'"
        assert data["total_arrivals"] == len(data["arrivals"]), "total_arrivals should match arrivals count"
    
    def test_pms_arrivals_has_by_room_type(self):
        """PMS arrivals returns by_room_type breakdown"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pms/arrivals")
        data = response.json()
        assert "by_room_type" in data, "Missing 'by_room_type' field"
        assert isinstance(data["by_room_type"], dict), "by_room_type should be dict"
    
    def test_pms_arrivals_has_by_source(self):
        """PMS arrivals returns by_source breakdown"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pms/arrivals")
        data = response.json()
        assert "by_source" in data, "Missing 'by_source' field"
        assert isinstance(data["by_source"], dict), "by_source should be dict"
    
    def test_pms_arrivals_has_vip_arrivals(self):
        """PMS arrivals returns vip_arrivals list"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pms/arrivals")
        data = response.json()
        assert "vip_arrivals" in data, "Missing 'vip_arrivals' field"
        assert isinstance(data["vip_arrivals"], list), "vip_arrivals should be array"
    
    def test_pms_arrivals_has_special_requests(self):
        """PMS arrivals returns special_requests list"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pms/arrivals")
        data = response.json()
        assert "special_requests" in data, "Missing 'special_requests' field"
        assert isinstance(data["special_requests"], list), "special_requests should be array"
    
    def test_pms_arrivals_date_param(self):
        """PMS arrivals accepts date parameter"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pms/arrivals?date=2026-04-15")
        assert response.status_code == 200
        data = response.json()
        assert data["date"] == "2026-04-15"


class TestPMSDepartures:
    """PMS Departures Tests"""
    
    def test_pms_departures_returns_200(self):
        """GET /api/enterprise-bi/pms/departures returns 200"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pms/departures")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_pms_departures_has_departures_list(self):
        """PMS departures returns departures list"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pms/departures")
        data = response.json()
        assert "departures" in data, "Missing 'departures' field"
        assert isinstance(data["departures"], list), "departures should be array"
        assert "total_departures" in data, "Missing 'total_departures'"
        assert data["total_departures"] == len(data["departures"]), "total_departures should match departures count"


class TestOTBPace:
    """OTB Pace Report Tests"""
    
    def test_otb_pace_returns_200(self):
        """GET /api/enterprise-bi/pms/otb-pace returns 200"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pms/otb-pace")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_otb_pace_has_21_days(self):
        """OTB pace returns 21-day pace data"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pms/otb-pace")
        data = response.json()
        assert "pace" in data, "Missing 'pace' field"
        assert isinstance(data["pace"], list), "pace should be array"
        assert len(data["pace"]) == 21, f"Expected 21 days, got {len(data['pace'])}"
    
    def test_otb_pace_day_structure(self):
        """OTB pace day has required fields"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pms/otb-pace")
        data = response.json()
        day = data["pace"][0]
        assert "date" in day, "Day missing 'date'"
        assert "day_of_week" in day, "Day missing 'day_of_week'"
        assert "rooms_otb" in day, "Day missing 'rooms_otb'"
        assert "occupancy_otb" in day, "Day missing 'occupancy_otb'"
        assert "revenue_otb" in day, "Day missing 'revenue_otb'"
        assert "available" in day, "Day missing 'available'"
    
    def test_otb_pace_has_summary(self):
        """OTB pace returns summary"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pms/otb-pace")
        data = response.json()
        assert "summary" in data, "Missing 'summary' field"
        summary = data["summary"]
        assert "total_room_nights" in summary, "Missing total_room_nights"
        assert "total_revenue" in summary, "Missing total_revenue"
        assert "avg_occupancy" in summary, "Missing avg_occupancy"
        assert "peak_date" in summary, "Missing peak_date"
        assert "low_date" in summary, "Missing low_date"


class TestGuestMix:
    """Guest Mix Analysis Tests"""
    
    def test_guest_mix_returns_200(self):
        """GET /api/enterprise-bi/pms/guest-mix returns 200"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pms/guest-mix")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_guest_mix_has_by_source(self):
        """Guest mix returns by_source segmentation"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pms/guest-mix")
        data = response.json()
        assert "by_source" in data, "Missing 'by_source' field"
        assert isinstance(data["by_source"], list), "by_source should be array"
        assert len(data["by_source"]) >= 1, "Should have at least 1 source"
        # Check source structure
        source = data["by_source"][0]
        assert "source" in source, "Source missing 'source'"
        assert "source_id" in source, "Source missing 'source_id'"
        assert "reservations" in source, "Source missing 'reservations'"
        assert "revenue" in source, "Source missing 'revenue'"
        assert "pct_of_total" in source, "Source missing 'pct_of_total'"
    
    def test_guest_mix_has_by_room_type(self):
        """Guest mix returns by_room_type segmentation"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pms/guest-mix")
        data = response.json()
        assert "by_room_type" in data, "Missing 'by_room_type' field"
        assert isinstance(data["by_room_type"], list), "by_room_type should be array"
        # Check room type structure
        if len(data["by_room_type"]) > 0:
            rt = data["by_room_type"][0]
            assert "room_type" in rt, "Room type missing 'room_type'"
            assert "count" in rt, "Room type missing 'count'"
            assert "revenue" in rt, "Room type missing 'revenue'"
    
    def test_guest_mix_has_total_reservations(self):
        """Guest mix returns total_future_reservations"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pms/guest-mix")
        data = response.json()
        assert "total_future_reservations" in data, "Missing 'total_future_reservations'"
        assert isinstance(data["total_future_reservations"], int), "total_future_reservations should be int"


class TestRegressionHealthCheck:
    """Regression tests for health endpoint"""
    
    def test_health_endpoint(self):
        """GET /api/health returns healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy" or "healthy" in str(data).lower()
