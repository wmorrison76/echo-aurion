"""
Iteration 116: 21-Day Ops Forecast + Group Resume Builder + BEO Templates
==========================================================================
Tests for:
1. 21-Day Operations Forecast (from real Excel data: 331 rooms, 21 days, 15 groups)
2. Group Resume Builder (AI-powered with eClinical Works sample)
3. BEO Template Save/Load functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestOpsForecast21Day:
    """21-Day Operations Forecast API tests"""
    
    def test_get_21_day_forecast(self):
        """GET /api/ops-forecast/21-day returns 21 days of forecast data with capacity 331"""
        response = requests.get(f"{BASE_URL}/api/ops-forecast/21-day")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "property" in data
        assert data["property"]["capacity"] == 331
        assert "days" in data
        assert len(data["days"]) == 21
        assert "totals" in data
        assert "period" in data
        assert data["period"]["days"] == 21
        
        # Verify first day structure
        first_day = data["days"][0]
        assert first_day["date"] == "2026-04-13"
        assert first_day["capacity"] == 331
        assert "occ_pct" in first_day
        assert "adr" in first_day
        assert "rooms_revenue" in first_day
        assert "group_rooms" in first_day
        assert "transient_rooms" in first_day
        assert "guest_count" in first_day
        print(f"PASSED: 21-day forecast returns {len(data['days'])} days with capacity {data['property']['capacity']}")
    
    def test_get_forecast_summary(self):
        """GET /api/ops-forecast/summary returns period stats"""
        response = requests.get(f"{BASE_URL}/api/ops-forecast/summary")
        assert response.status_code == 200
        
        data = response.json()
        assert data["period_days"] == 21
        assert data["capacity"] == 331
        assert "avg_occ_pct" in data
        assert "avg_forecast_occ_pct" in data
        assert "avg_adr" in data
        assert "avg_forecast_adr" in data
        assert "total_revenue_otb" in data
        assert "total_revenue_forecast" in data
        assert "group_mix_pct" in data
        assert "total_guests" in data
        
        # Verify reasonable values
        assert 0 < data["avg_occ_pct"] < 100
        assert data["total_revenue_forecast"] > 0
        print(f"PASSED: Summary - Avg Occ: {data['avg_occ_pct']}%, Avg ADR: ${data['avg_adr']}, Group Mix: {data['group_mix_pct']}%")
    
    def test_get_group_blocks(self):
        """GET /api/ops-forecast/groups returns 15 group blocks with total room nights"""
        response = requests.get(f"{BASE_URL}/api/ops-forecast/groups")
        assert response.status_code == 200
        
        data = response.json()
        assert "groups" in data
        assert data["total_groups"] == 15
        assert "total_group_room_nights" in data
        assert data["total_group_room_nights"] > 0
        
        # Verify group structure
        groups = data["groups"]
        assert len(groups) == 15
        
        # Check for specific groups mentioned in requirements
        group_names = [g["name"] for g in groups]
        assert "F1 Miami" in group_names
        assert "eClinical Works" in group_names
        
        # Verify group structure
        eclinical = next(g for g in groups if g["name"] == "eClinical Works")
        assert eclinical["total_rooms"] == 64
        assert eclinical["type"] == "corporate"
        assert "dates" in eclinical
        print(f"PASSED: {data['total_groups']} groups with {data['total_group_room_nights']} total room nights")
    
    def test_get_room_states(self):
        """GET /api/ops-forecast/room-states returns room state data per day"""
        response = requests.get(f"{BASE_URL}/api/ops-forecast/room-states")
        assert response.status_code == 200
        
        data = response.json()
        assert "room_states" in data
        assert data["capacity"] == 331
        
        states = data["room_states"]
        assert len(states) == 21
        
        # Verify room state structure
        first_state = states[0]
        assert "date" in first_state
        assert "dow" in first_state
        assert "occupied" in first_state
        assert "available" in first_state
        assert "departing_dirty" in first_state
        assert "arriving_checkin" in first_state
        assert "rooms_to_flip" in first_state
        assert "hk_staff_needed" in first_state
        assert "states" in first_state
        
        # Verify states breakdown
        inner_states = first_state["states"]
        assert "occupied" in inner_states
        assert "dirty_checkout" in inner_states
        assert "clean_ready" in inner_states
        assert "assigned_arrival" in inner_states
        print(f"PASSED: Room states for 21 days, first day HK staff needed: {first_state['hk_staff_needed']}")
    
    def test_get_outlet_forecast(self):
        """GET /api/ops-forecast/outlet-forecast returns outlet revenue/covers forecast"""
        response = requests.get(f"{BASE_URL}/api/ops-forecast/outlet-forecast")
        assert response.status_code == 200
        
        data = response.json()
        assert "outlet_forecast" in data
        
        forecast = data["outlet_forecast"]
        assert len(forecast) == 21
        
        # Verify outlet forecast structure
        first_day = forecast[0]
        assert "date" in first_day
        assert "dow" in first_day
        assert "total_guests" in first_day
        assert "outlets" in first_day
        assert "total_outlet_revenue" in first_day
        assert "total_covers" in first_day
        assert "anticipated_daily_spend" in first_day
        
        # Verify outlets
        outlets = first_day["outlets"]
        expected_outlets = ["Signature Italian", "Rooftop Lounge", "Pool Bar & Grill", "Family Dining", "In-Room Dining"]
        for outlet in expected_outlets:
            assert outlet in outlets, f"Missing outlet: {outlet}"
            assert "covers" in outlets[outlet]
            assert "revenue" in outlets[outlet]
        print(f"PASSED: Outlet forecast for 21 days, first day total revenue: ${first_day['total_outlet_revenue']}")
    
    def test_get_trend_analysis(self):
        """GET /api/ops-forecast/trends returns AI insights, DOW patterns, revenue trend"""
        response = requests.get(f"{BASE_URL}/api/ops-forecast/trends")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify group vs transient
        assert "group_vs_transient" in data
        gvt = data["group_vs_transient"]
        assert "group_heavy_days" in gvt
        assert "transient_heavy_days" in gvt
        assert "avg_group_mix_pct" in gvt
        
        # Verify DOW patterns
        assert "dow_patterns" in data
        dow = data["dow_patterns"]
        for day in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]:
            assert day in dow
            assert "avg_occ" in dow[day]
            assert "avg_adr" in dow[day]
            assert "avg_revenue" in dow[day]
        
        # Verify revenue trend
        assert "revenue_trend" in data
        trend = data["revenue_trend"]
        assert "first_week_total" in trend
        assert "last_week_total" in trend
        assert "trend_pct" in trend
        assert "direction" in trend
        
        # Verify peak/valley
        assert "peak" in data
        assert "valley" in data
        assert data["peak"]["date"]
        assert data["valley"]["date"]
        
        # Verify insights
        assert "insights" in data
        assert len(data["insights"]) > 0
        print(f"PASSED: Trends - Revenue trend: {trend['trend_pct']}% {trend['direction']}, Peak: {data['peak']['date']}")


class TestGroupResumeBuilder:
    """Group Resume Builder API tests"""
    
    def test_seed_sample_resume(self):
        """POST /api/group-resume/seed-sample seeds eClinical Works resume"""
        response = requests.post(f"{BASE_URL}/api/group-resume/seed-sample")
        assert response.status_code == 200
        
        data = response.json()
        assert data["resume_id"] == "gr-eclinical-sample"
        assert data["status"] in ["seeded", "already_seeded"]
        print(f"PASSED: Sample resume seeded - status: {data['status']}")
    
    def test_list_resumes(self):
        """GET /api/group-resume returns resume list"""
        response = requests.get(f"{BASE_URL}/api/group-resume")
        assert response.status_code == 200
        
        data = response.json()
        assert "resumes" in data
        assert "total" in data
        assert data["total"] >= 1  # At least the seeded sample
        
        # Verify sample resume is in list
        resume_ids = [r["resume_id"] for r in data["resumes"]]
        assert "gr-eclinical-sample" in resume_ids
        print(f"PASSED: Resume list returns {data['total']} resumes")
    
    def test_get_eclinical_resume_full(self):
        """GET /api/group-resume/gr-eclinical-sample returns full resume with all 13 sections"""
        response = requests.get(f"{BASE_URL}/api/group-resume/gr-eclinical-sample")
        assert response.status_code == 200
        
        data = response.json()
        assert data["resume_id"] == "gr-eclinical-sample"
        assert data["status"] == "confirmed"
        
        # Verify all required sections exist
        required_sections = [
            "group_info", "meeting_details", "contact_info", "group_profile",
            "pre_conference", "vip_info", "room_blocks", "food_beverage",
            "av_requirements", "transportation", "billing", "schedule_of_events",
            "security", "housekeeping", "special_instructions"
        ]
        
        for section in required_sections:
            assert section in data, f"Missing section: {section}"
        
        # Verify group info
        gi = data["group_info"]
        assert gi["group_name"] == "Enterprise Summit & Sales Meeting"
        assert gi["company"] == "eClinicalWorks, LLC"
        assert gi["estimated_attendance"] == 325
        
        # Verify VIPs
        vips = data["vip_info"]
        assert len(vips) >= 4
        vip_names = [v["name"] for v in vips]
        assert "Mr. Girish Kumar Navani" in vip_names  # CEO
        
        # Verify schedule of events
        schedule = data["schedule_of_events"]
        assert len(schedule) >= 10
        
        # Verify room blocks
        rb = data["room_blocks"]
        assert "contracted" in rb
        assert rb["contracted"]["total_nights"] == 575
        
        print(f"PASSED: eClinical resume has all {len(required_sections)} sections, {len(vips)} VIPs, {len(schedule)} events")
    
    def test_create_new_resume(self):
        """POST /api/group-resume creates a new resume"""
        payload = {
            "group_info": {
                "group_name": "TEST Corporate Meeting",
                "company": "Test Corp",
                "arrival_date": "2026-05-10",
                "departure_date": "2026-05-12",
                "estimated_attendance": 50
            },
            "meeting_details": {
                "meeting_name": "Annual Review",
                "purpose": "Quarterly business review"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/group-resume", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "resume_id" in data
        assert data["resume_id"].startswith("gr-")
        assert data["status"] == "draft"
        assert data["group_info"]["group_name"] == "TEST Corporate Meeting"
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/group-resume/{data['resume_id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["group_info"]["company"] == "Test Corp"
        
        print(f"PASSED: Created new resume {data['resume_id']}")
        return data["resume_id"]
    
    def test_update_resume_sections(self):
        """PUT /api/group-resume/{id} updates resume sections"""
        # First create a resume
        create_response = requests.post(f"{BASE_URL}/api/group-resume", json={
            "group_info": {"group_name": "TEST Update Resume", "company": "Update Corp"}
        })
        resume_id = create_response.json()["resume_id"]
        
        # Update sections
        update_payload = {
            "status": "confirmed",
            "vip_info": [
                {"name": "John Doe", "title": "CEO", "room_type": "Suite", "rate": 500}
            ],
            "notes": "Updated via test"
        }
        
        response = requests.put(f"{BASE_URL}/api/group-resume/{resume_id}", json=update_payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["resume_id"] == resume_id
        assert "status" in data["updated"]
        assert "vip_info" in data["updated"]
        
        # Verify update persisted
        get_response = requests.get(f"{BASE_URL}/api/group-resume/{resume_id}")
        fetched = get_response.json()
        assert fetched["status"] == "confirmed"
        assert len(fetched["vip_info"]) == 1
        assert fetched["vip_info"][0]["name"] == "John Doe"
        
        print(f"PASSED: Updated resume {resume_id} with VIP and status")
    
    def test_get_resume_templates(self):
        """GET /api/group-resume/templates returns template list"""
        response = requests.get(f"{BASE_URL}/api/group-resume/templates")
        assert response.status_code == 200
        
        data = response.json()
        assert "templates" in data
        assert len(data["templates"]) >= 3
        
        template_ids = [t["id"] for t in data["templates"]]
        assert "standard" in template_ids
        assert "corporate" in template_ids
        assert "social" in template_ids
        print(f"PASSED: {len(data['templates'])} resume templates available")
    
    def test_resume_not_found(self):
        """GET /api/group-resume/nonexistent returns 404"""
        response = requests.get(f"{BASE_URL}/api/group-resume/nonexistent-id")
        assert response.status_code == 404
        print("PASSED: 404 for nonexistent resume")


class TestBEOTemplates:
    """BEO Template Save/Load API tests"""
    
    def test_save_beo_template(self):
        """POST /api/banquet-menus/templates/save saves a BEO template"""
        payload = {
            "name": "TEST Corporate Lunch Template",
            "description": "Standard corporate lunch setup",
            "event_type": "corporate",
            "guest_count": 50,
            "items": [
                {"id": "item1", "name": "Caesar Salad", "price": 18, "qty": 50},
                {"id": "item2", "name": "Grilled Chicken", "price": 45, "qty": 50},
                {"id": "item3", "name": "Chocolate Cake", "price": 12, "qty": 50}
            ],
            "service_charge_pct": 26.0,
            "tax_pct": 7.0,
            "created_by": "test_user"
        }
        
        response = requests.post(f"{BASE_URL}/api/banquet-menus/templates/save", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "template_id" in data
        assert data["template_id"].startswith("tpl-")
        assert data["name"] == "TEST Corporate Lunch Template"
        assert data["event_type"] == "corporate"
        assert data["guest_count"] == 50
        assert len(data["items"]) == 3
        assert data["use_count"] == 0
        
        print(f"PASSED: Saved BEO template {data['template_id']}")
        return data["template_id"]
    
    def test_list_beo_templates(self):
        """GET /api/banquet-menus/templates/list returns saved templates"""
        # First save a template to ensure list is not empty
        requests.post(f"{BASE_URL}/api/banquet-menus/templates/save", json={
            "name": "TEST List Template",
            "event_type": "social",
            "items": []
        })
        
        response = requests.get(f"{BASE_URL}/api/banquet-menus/templates/list")
        assert response.status_code == 200
        
        data = response.json()
        assert "templates" in data
        assert "total" in data
        assert data["total"] >= 1
        
        # Verify template structure
        if data["templates"]:
            tpl = data["templates"][0]
            assert "template_id" in tpl
            assert "name" in tpl
            assert "event_type" in tpl
        
        print(f"PASSED: Template list returns {data['total']} templates")
    
    def test_load_beo_template(self):
        """GET /api/banquet-menus/templates/{id} loads a template"""
        # First save a template
        save_response = requests.post(f"{BASE_URL}/api/banquet-menus/templates/save", json={
            "name": "TEST Load Template",
            "description": "Template for load test",
            "event_type": "wedding",
            "guest_count": 100,
            "items": [{"id": "wine", "name": "House Wine", "price": 45}]
        })
        template_id = save_response.json()["template_id"]
        
        # Load the template
        response = requests.get(f"{BASE_URL}/api/banquet-menus/templates/{template_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["template_id"] == template_id
        assert data["name"] == "TEST Load Template"
        assert data["event_type"] == "wedding"
        assert data["guest_count"] == 100
        assert len(data["items"]) == 1
        # use_count is incremented in DB but response returns the template before increment
        assert "use_count" in data
        
        print(f"PASSED: Loaded template {template_id}, use_count: {data['use_count']}")
    
    def test_template_not_found(self):
        """GET /api/banquet-menus/templates/nonexistent returns 404"""
        response = requests.get(f"{BASE_URL}/api/banquet-menus/templates/nonexistent-id")
        assert response.status_code == 404
        print("PASSED: 404 for nonexistent template")
    
    def test_delete_beo_template(self):
        """DELETE /api/banquet-menus/templates/{id} deletes a template"""
        # First save a template
        save_response = requests.post(f"{BASE_URL}/api/banquet-menus/templates/save", json={
            "name": "TEST Delete Template",
            "event_type": "corporate",
            "items": []
        })
        template_id = save_response.json()["template_id"]
        
        # Delete the template
        response = requests.delete(f"{BASE_URL}/api/banquet-menus/templates/{template_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "deleted"
        assert data["template_id"] == template_id
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/banquet-menus/templates/{template_id}")
        assert get_response.status_code == 404
        
        print(f"PASSED: Deleted template {template_id}")


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """GET /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("PASSED: Health check OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
