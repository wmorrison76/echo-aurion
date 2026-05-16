"""
Iteration 103: BEO Operations System Tests
==========================================
Tests for:
1. Banquet Workforce - PTO conflict detection, EchoAi³ substitute suggestions, auto-scheduling
2. Production Engine - Order consolidation with yields, buying programs, production timeline
3. Event Layouts - Auto-placement, approval workflow, template saving
4. EchoAi³ ROI Analytics - Time savings per BEO, annual projections, live data
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestHealthRegression:
    """Regression: Health and dashboard endpoints"""
    
    def test_health_endpoint(self):
        """GET /api/health - returns healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["platform"] == "LUCCCA Enterprise"
        print("✓ Health endpoint working")
    
    def test_beo_dashboard(self):
        """GET /api/beo-engine/dashboard - regression test"""
        response = requests.get(f"{BASE_URL}/api/beo-engine/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "total_beos" in data
        assert "total_revenue" in data
        print(f"✓ Dashboard: {data['total_beos']} BEOs, ${data['total_revenue']} revenue")


class TestBanquetWorkforce:
    """Banquet Workforce & PTO Engine tests"""
    
    def test_list_staff_returns_20(self):
        """GET /api/banquet-workforce/staff - returns 20 banquet staff"""
        response = requests.get(f"{BASE_URL}/api/banquet-workforce/staff")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 20
        assert len(data["staff"]) == 20
        
        # Verify staff structure
        staff = data["staff"][0]
        assert "id" in staff
        assert "name" in staff
        assert "role" in staff
        assert "companies" in staff
        assert "vip_certified" in staff
        assert "hourly_rate" in staff
        print(f"✓ Staff list: {data['total']} staff members")
    
    def test_staff_has_roles_and_companies(self):
        """Verify staff have roles, multi-company, VIP certification"""
        response = requests.get(f"{BASE_URL}/api/banquet-workforce/staff")
        data = response.json()
        
        # Check for captains
        captains = [s for s in data["staff"] if s["is_captain"]]
        assert len(captains) >= 2, "Should have at least 2 captains"
        
        # Check for VIP certified
        vip_staff = [s for s in data["staff"] if s["vip_certified"]]
        assert len(vip_staff) >= 5, "Should have at least 5 VIP certified staff"
        
        # Check for multi-company staff
        multi_company = [s for s in data["staff"] if len(s["companies"]) > 1]
        assert len(multi_company) >= 3, "Should have multi-company staff"
        print(f"✓ Staff roles: {len(captains)} captains, {len(vip_staff)} VIP certified, {len(multi_company)} multi-company")
    
    def test_pto_request_detects_conflicts(self):
        """POST /api/banquet-workforce/pto/request - detects event conflicts"""
        # Get a staff ID
        staff_resp = requests.get(f"{BASE_URL}/api/banquet-workforce/staff")
        staff_id = staff_resp.json()["staff"][0]["id"]
        
        # Request PTO on date with BEOs (2026-02-15 has events)
        response = requests.post(
            f"{BASE_URL}/api/banquet-workforce/pto/request",
            json={"staff_id": staff_id, "dates": ["2026-02-15"], "reason": "TEST_vacation"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify conflict detection
        assert "conflicts" in data
        assert len(data["conflicts"]) > 0, "Should detect event conflicts on 2026-02-15"
        assert "events" in data["conflicts"][0]
        print(f"✓ PTO conflict detection: {len(data['conflicts'])} conflicts found")
    
    def test_pto_request_suggests_substitutes(self):
        """POST /api/banquet-workforce/pto/request - suggests substitutes"""
        staff_resp = requests.get(f"{BASE_URL}/api/banquet-workforce/staff")
        staff_id = staff_resp.json()["staff"][0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/banquet-workforce/pto/request",
            json={"staff_id": staff_id, "dates": ["2026-02-15"], "reason": "TEST_vacation"}
        )
        data = response.json()
        
        # Verify substitutes suggested
        assert "substitutes" in data
        assert len(data["substitutes"]) > 0, "Should suggest substitutes"
        print(f"✓ Substitutes suggested: {data['substitutes']}")
    
    def test_pto_request_has_echoai3_note(self):
        """POST /api/banquet-workforce/pto/request - returns echoai3_note with approval_probability"""
        staff_resp = requests.get(f"{BASE_URL}/api/banquet-workforce/staff")
        staff_id = staff_resp.json()["staff"][0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/banquet-workforce/pto/request",
            json={"staff_id": staff_id, "dates": ["2026-02-15"], "reason": "TEST_vacation"}
        )
        data = response.json()
        
        # Verify EchoAi³ note
        assert "echoai3_note" in data
        assert len(data["echoai3_note"]) > 0
        assert "approval_probability" in data
        assert data["approval_probability"] in ["low", "medium", "high"]
        print(f"✓ EchoAi³ note: {data['echoai3_note'][:50]}... (probability: {data['approval_probability']})")
    
    def test_schedule_generation(self):
        """POST /api/banquet-workforce/schedule/generate - auto-generates assignments"""
        # Get a BEO ID
        beos_resp = requests.get(f"{BASE_URL}/api/beo-engine/beos?limit=1")
        beo_id = beos_resp.json()["beos"][0]["id"]
        beo_date = beos_resp.json()["beos"][0]["event_date"]
        
        response = requests.post(
            f"{BASE_URL}/api/banquet-workforce/schedule/generate",
            json={"beo_id": beo_id, "date": beo_date}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify schedule structure
        assert "assignments" in data
        assert "captains" in data["assignments"]
        assert "servers" in data["assignments"]
        assert "setup_crew" in data["assignments"]
        assert "staffing" in data
        assert "captains_needed" in data["staffing"]
        assert "servers_needed" in data["staffing"]
        print(f"✓ Schedule generated: {len(data['assignments']['captains'])} captains, {len(data['assignments']['servers'])} servers")


class TestProductionEngine:
    """Smart Order Consolidation & Production Engine tests"""
    
    def test_buying_programs(self):
        """GET /api/production-engine/buying-programs - returns Avendra and Foodbuy"""
        response = requests.get(f"{BASE_URL}/api/production-engine/buying-programs")
        assert response.status_code == 200
        data = response.json()
        
        assert "programs" in data
        assert len(data["programs"]) >= 2
        
        program_names = [p["name"] for p in data["programs"]]
        assert "Avendra GPO" in program_names
        assert "Foodbuy" in program_names
        print(f"✓ Buying programs: {program_names}")
    
    def test_consolidate_orders_with_yield(self):
        """POST /api/production-engine/consolidate-orders - consolidates with yield loss"""
        # Get BEO IDs
        beos_resp = requests.get(f"{BASE_URL}/api/beo-engine/beos?limit=3")
        beo_ids = [b["id"] for b in beos_resp.json()["beos"]]
        
        response = requests.post(
            f"{BASE_URL}/api/production-engine/consolidate-orders",
            json={
                "beo_ids": beo_ids,
                "production_date": "2026-02-14",
                "include_yield_loss": True,
                "yield_loss_pct": 8.0
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify consolidation structure
        assert "order_lines" in data
        assert "total_cost" in data
        assert "net_cost" in data
        assert "beo_count" in data
        assert data["beo_count"] == len(beo_ids)
        print(f"✓ Order consolidation: {data['total_unique_ingredients']} ingredients, ${data['total_cost']} total")
    
    def test_consolidate_orders_applies_discounts(self):
        """POST /api/production-engine/consolidate-orders - applies buying program discounts"""
        beos_resp = requests.get(f"{BASE_URL}/api/beo-engine/beos?limit=3")
        beo_ids = [b["id"] for b in beos_resp.json()["beos"]]
        
        response = requests.post(
            f"{BASE_URL}/api/production-engine/consolidate-orders",
            json={
                "beo_ids": beo_ids,
                "production_date": "2026-02-14",
                "include_yield_loss": True
            }
        )
        data = response.json()
        
        # Verify discounts applied
        assert "program_savings" in data
        assert data["program_savings"] > 0, "Should have program savings"
        
        # Check order lines for discount info
        discounted_lines = [l for l in data["order_lines"] if l["discount_pct"] > 0]
        assert len(discounted_lines) > 0, "Should have discounted items"
        print(f"✓ Program savings: ${data['program_savings']}, {len(discounted_lines)} discounted items")
    
    def test_consolidate_orders_calculates_cases_and_surplus(self):
        """POST /api/production-engine/consolidate-orders - calculates cases_to_order and surplus"""
        beos_resp = requests.get(f"{BASE_URL}/api/beo-engine/beos?limit=2")
        beo_ids = [b["id"] for b in beos_resp.json()["beos"]]
        
        response = requests.post(
            f"{BASE_URL}/api/production-engine/consolidate-orders",
            json={
                "beo_ids": beo_ids,
                "production_date": "2026-02-14",
                "include_yield_loss": True
            }
        )
        data = response.json()
        
        # Verify case calculations
        for line in data["order_lines"]:
            assert "cases_to_order" in line
            assert "surplus" in line
            assert "total_ordered" in line
            assert line["cases_to_order"] >= 1
            assert line["surplus"] >= 0
        print(f"✓ Case calculations verified for {len(data['order_lines'])} items")
    
    def test_production_timeline(self):
        """POST /api/production-engine/production-timeline - generates station-based timeline"""
        beos_resp = requests.get(f"{BASE_URL}/api/beo-engine/beos?limit=1")
        beo = beos_resp.json()["beos"][0]
        
        # Skip if BEO has no menu sections
        if not beo.get("menu_sections"):
            pytest.skip("BEO has no menu sections")
        
        response = requests.post(
            f"{BASE_URL}/api/production-engine/production-timeline",
            json={"beo_id": beo["id"], "ready_by": "06:45"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify timeline structure
        assert "timeline" in data
        assert "by_station" in data
        assert "station_summary" in data
        
        # Verify fire times
        for item in data["timeline"]:
            assert "fire_at" in item
            assert "start_prep" in item
            assert "station" in item
        print(f"✓ Production timeline: {len(data['timeline'])} items, stations: {list(data['station_summary'].keys())}")


class TestEventLayouts:
    """Event Layout Template Engine tests"""
    
    def test_list_rooms(self):
        """GET /api/event-layouts/rooms - returns 7 rooms with sqft and capacities"""
        response = requests.get(f"{BASE_URL}/api/event-layouts/rooms")
        assert response.status_code == 200
        data = response.json()
        
        assert "rooms" in data
        assert len(data["rooms"]) == 7
        
        # Verify room structure
        for room_name, room_info in data["rooms"].items():
            assert "sqft" in room_info
            assert "max_capacity" in room_info
            assert "banquet" in room_info["max_capacity"]
            assert "theater" in room_info["max_capacity"]
        print(f"✓ Rooms: {list(data['rooms'].keys())}")
    
    def test_generate_layout(self):
        """POST /api/event-layouts/generate - generates layout with auto-placed elements"""
        response = requests.post(
            f"{BASE_URL}/api/event-layouts/generate",
            json={
                "room": "Saltbreeze",
                "setup_style": "banquet",
                "guest_count": 80,
                "beo_id": ""
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify layout structure
        assert "id" in data
        assert "elements" in data
        assert "element_count" in data
        assert "fits" in data
        assert data["fits"] == True
        assert len(data["elements"]) > 0
        print(f"✓ Layout generated: {data['element_count']} elements, fits={data['fits']}")
        return data["id"]
    
    def test_generate_layout_auto_places_elements(self):
        """POST /api/event-layouts/generate - auto-places tables, buffet, entrance"""
        response = requests.post(
            f"{BASE_URL}/api/event-layouts/generate",
            json={
                "room": "Crystal Ballroom",
                "setup_style": "banquet",
                "guest_count": 200
            }
        )
        data = response.json()
        
        # Verify element types
        element_types = [e["type"] for e in data["elements"]]
        assert "round_table_8" in element_types, "Should have round tables"
        assert "buffet_station" in element_types, "Should have buffet station"
        assert "entrance" in element_types, "Should have entrance"
        print(f"✓ Auto-placed elements: {set(element_types)}")
    
    def test_approve_layout(self):
        """POST /api/event-layouts/approve - approves layout"""
        # First generate a layout
        gen_resp = requests.post(
            f"{BASE_URL}/api/event-layouts/generate",
            json={"room": "Marina Room", "setup_style": "reception", "guest_count": 50}
        )
        layout_id = gen_resp.json()["id"]
        
        # Approve it
        response = requests.post(
            f"{BASE_URL}/api/event-layouts/approve",
            json={"layout_id": layout_id, "approved": True, "notes": "TEST_Approved"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "approved"
        print(f"✓ Layout approved: {layout_id}")
        return layout_id
    
    def test_save_layout_as_template(self):
        """POST /api/event-layouts/{id}/save-template - saves as reusable template"""
        # Generate and approve a layout
        gen_resp = requests.post(
            f"{BASE_URL}/api/event-layouts/generate",
            json={"room": "Sky Lounge", "setup_style": "reception", "guest_count": 40}
        )
        layout_id = gen_resp.json()["id"]
        
        requests.post(
            f"{BASE_URL}/api/event-layouts/approve",
            json={"layout_id": layout_id, "approved": True}
        )
        
        # Save as template
        response = requests.post(
            f"{BASE_URL}/api/event-layouts/{layout_id}/save-template?template_name=TEST_Sky%20Lounge%20Reception"
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["saved"] == True
        assert data["template_name"] == "TEST_Sky Lounge Reception"
        print(f"✓ Template saved: {data['template_name']}")


class TestEchoAi3ROI:
    """EchoAi³ Time Savings & ROI Analytics tests"""
    
    def test_roi_per_beo(self):
        """GET /api/echoai3/roi/per-beo - returns 675 manual mins vs 15.5 echo mins"""
        response = requests.get(f"{BASE_URL}/api/echoai3/roi/per-beo")
        assert response.status_code == 200
        data = response.json()
        
        # Verify per-BEO metrics
        assert "per_beo" in data
        pb = data["per_beo"]
        assert pb["total_manual_minutes"] == 675
        assert pb["total_echo_minutes"] == 15.5
        assert pb["efficiency_gain_pct"] == 97.7
        
        # Verify breakdown
        assert "breakdown" in data
        assert len(data["breakdown"]) > 0
        print(f"✓ Per-BEO ROI: {pb['total_manual_minutes']} manual → {pb['total_echo_minutes']} echo mins ({pb['efficiency_gain_pct']}% efficiency)")
    
    def test_roi_annual_50_events(self):
        """GET /api/echoai3/roi/annual?events_per_day=50 - returns annual savings"""
        response = requests.get(f"{BASE_URL}/api/echoai3/roi/annual?events_per_day=50")
        assert response.status_code == 200
        data = response.json()
        
        # Verify annual metrics
        assert data["events_per_day"] == 50
        assert data["operating_days"] == 350
        assert data["annual_events"] == 17500
        
        # Verify savings calculations
        assert data["annual_hours_saved"] > 190000  # ~192,360
        assert data["annual_cost_saved"] > 7000000  # ~$7.9M
        assert data["annual_fte_saved"] > 60  # ~68.7
        print(f"✓ Annual ROI (50 events/day): {data['annual_hours_saved']} hours, ${data['annual_cost_saved']} saved, {data['annual_fte_saved']} FTE")
    
    def test_roi_live(self):
        """GET /api/echoai3/roi/live - returns actual savings from real operations"""
        response = requests.get(f"{BASE_URL}/api/echoai3/roi/live")
        assert response.status_code == 200
        data = response.json()
        
        # Verify operations performed
        assert "operations_performed" in data
        ops = data["operations_performed"]
        assert "beos_created" in ops
        assert "recipes_costed" in ops
        assert "schedules_generated" in ops
        
        # Verify savings calculations
        assert "total_time_saved_minutes" in data
        assert "total_time_saved_hours" in data
        assert "estimated_cost_saved" in data
        print(f"✓ Live ROI: {data['total_time_saved_hours']} hours saved, ${data['estimated_cost_saved']} estimated savings")


class TestRegressionOtherEndpoints:
    """Regression tests for other critical endpoints"""
    
    def test_beo_list(self):
        """GET /api/beo-engine/beos - lists BEOs"""
        response = requests.get(f"{BASE_URL}/api/beo-engine/beos")
        assert response.status_code == 200
        data = response.json()
        assert "beos" in data
        assert "total" in data
        print(f"✓ BEO list: {data['total']} BEOs")
    
    def test_recipes_list(self):
        """GET /api/beo-engine/recipes - lists recipes"""
        response = requests.get(f"{BASE_URL}/api/beo-engine/recipes")
        assert response.status_code == 200
        data = response.json()
        assert "recipes" in data
        print(f"✓ Recipes: {len(data['recipes'])} recipes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
