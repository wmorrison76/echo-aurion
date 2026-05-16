"""
Iteration 117: Purchasing Requisition Engine, BEO Creation, Group Resume PDF Export
==================================================================================
Tests for:
1. Purchasing Engine - Prep List, Dashboard, Requisitions
2. BEO Creation from Menu Builder
3. BEO Templates (save/load/delete)
4. Group Resume PDF Export
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPurchasingPrepList:
    """Purchasing Engine - Prep List Generation"""
    
    def test_prep_list_default_date(self):
        """GET /api/purchasing/prep-list?date=2026-04-13 returns ingredients"""
        response = requests.get(f"{BASE_URL}/api/purchasing/prep-list?date=2026-04-13")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "prep_list" in data, "Response should have prep_list"
        assert "total_ingredients" in data, "Response should have total_ingredients"
        assert "total_cost" in data, "Response should have total_cost"
        assert "outlet_breakdown" in data, "Response should have outlet_breakdown"
        assert "shortages" in data, "Response should have shortages"
        
        # Verify we get ingredients
        assert data["total_ingredients"] > 0, f"Expected ingredients, got {data['total_ingredients']}"
        assert data["total_cost"] > 0, f"Expected cost > 0, got {data['total_cost']}"
        
        # Check prep_list structure
        if data["prep_list"]:
            item = data["prep_list"][0]
            assert "ingredient" in item, "Item should have ingredient name"
            assert "total_qty" in item, "Item should have total_qty"
            assert "unit" in item, "Item should have unit"
            assert "cost_per_unit" in item, "Item should have cost_per_unit"
            assert "total_cost" in item, "Item should have total_cost"
            assert "sources" in item, "Item should have sources"
        
        print(f"PASSED: Prep list returned {data['total_ingredients']} ingredients, total cost ${data['total_cost']:.2f}")
    
    def test_prep_list_outlet_filter(self):
        """GET /api/purchasing/prep-list with outlet filter returns filtered items"""
        response = requests.get(f"{BASE_URL}/api/purchasing/prep-list?date=2026-04-13&outlet=Pool%20Bar%20%26%20Grill")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "prep_list" in data
        assert "outlet_breakdown" in data
        
        # Should only have Pool Bar & Grill in breakdown
        if data["outlet_breakdown"]:
            outlets = list(data["outlet_breakdown"].keys())
            assert len(outlets) == 1, f"Expected 1 outlet, got {len(outlets)}: {outlets}"
            assert "Pool Bar" in outlets[0], f"Expected Pool Bar outlet, got {outlets}"
        
        print(f"PASSED: Pool Bar filter returned {data['total_ingredients']} ingredients")
    
    def test_prep_list_has_shortages(self):
        """Prep list should include shortage alerts"""
        response = requests.get(f"{BASE_URL}/api/purchasing/prep-list?date=2026-04-13")
        assert response.status_code == 200
        
        data = response.json()
        assert "shortages" in data
        assert "shortage_count" in data
        
        # Shortages should have proper structure if any exist
        if data["shortages"]:
            shortage = data["shortages"][0]
            assert "ingredient" in shortage
            assert "needed" in shortage
            assert "on_hand" in shortage
            assert "deficit" in shortage
        
        print(f"PASSED: Prep list has {data['shortage_count']} shortage alerts")


class TestPurchasingDashboard:
    """Purchasing Engine - Dashboard"""
    
    def test_dashboard_returns_projections(self):
        """GET /api/purchasing/dashboard returns weekly projections"""
        response = requests.get(f"{BASE_URL}/api/purchasing/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "weekly_projected_cost" in data, "Should have weekly_projected_cost"
        assert "daily_projections" in data, "Should have daily_projections"
        assert "outlets_tracked" in data, "Should have outlets_tracked"
        assert "ingredients_tracked" in data, "Should have ingredients_tracked"
        assert "pending_requisitions" in data, "Should have pending_requisitions"
        assert "approved_requisitions" in data, "Should have approved_requisitions"
        
        # Verify daily projections structure
        assert len(data["daily_projections"]) == 7, f"Expected 7 days, got {len(data['daily_projections'])}"
        
        day = data["daily_projections"][0]
        assert "date" in day
        assert "dow" in day
        assert "guests" in day
        assert "projected_food_cost" in day
        
        print(f"PASSED: Dashboard shows ${data['weekly_projected_cost']:.2f} weekly cost, {data['outlets_tracked']} outlets")


class TestPurchasingRequisitions:
    """Purchasing Engine - Purchase Requisitions"""
    
    def test_create_requisition(self):
        """POST /api/purchasing/requisition creates a PR"""
        payload = {
            "date": "2026-04-13",
            "outlet": "all",
            "items": [
                {"ingredient": "Test Ingredient", "qty": 10, "unit": "lb", "cost": 50.00}
            ],
            "total_cost": 50.00,
            "requested_by": "Test User"
        }
        
        response = requests.post(f"{BASE_URL}/api/purchasing/requisition", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "requisition_id" in data, "Should return requisition_id"
        assert data["requisition_id"].startswith("pr-"), f"ID should start with pr-, got {data['requisition_id']}"
        assert data["status"] == "pending", f"Status should be pending, got {data['status']}"
        assert data["date"] == "2026-04-13"
        assert data["outlet"] == "all"
        
        print(f"PASSED: Created requisition {data['requisition_id']}")
        return data["requisition_id"]
    
    def test_list_requisitions(self):
        """GET /api/purchasing/requisitions returns list"""
        response = requests.get(f"{BASE_URL}/api/purchasing/requisitions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "requisitions" in data
        assert "total" in data
        assert isinstance(data["requisitions"], list)
        
        print(f"PASSED: Listed {data['total']} requisitions")
    
    def test_approve_requisition(self):
        """PUT /api/purchasing/requisitions/{id}/approve approves a PR"""
        # First create a requisition
        create_payload = {
            "date": "2026-04-14",
            "outlet": "test",
            "items": [{"ingredient": "Approval Test", "qty": 5, "unit": "each", "cost": 25.00}],
            "total_cost": 25.00
        }
        create_resp = requests.post(f"{BASE_URL}/api/purchasing/requisition", json=create_payload)
        assert create_resp.status_code == 200
        req_id = create_resp.json()["requisition_id"]
        
        # Now approve it
        approve_payload = {"approved_by": "Manager Test"}
        response = requests.put(f"{BASE_URL}/api/purchasing/requisitions/{req_id}/approve", json=approve_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["status"] == "approved", f"Status should be approved, got {data['status']}"
        assert data["requisition_id"] == req_id
        
        print(f"PASSED: Approved requisition {req_id}")
    
    def test_approve_nonexistent_requisition(self):
        """PUT /api/purchasing/requisitions/nonexistent/approve returns 404"""
        response = requests.put(f"{BASE_URL}/api/purchasing/requisitions/pr-nonexistent/approve", json={})
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASSED: 404 for nonexistent requisition")


class TestBEOCreation:
    """BEO Creation from Menu Builder"""
    
    def test_create_beo_from_builder(self):
        """POST /api/banquet-menus/create-beo creates BEO with financial breakdown"""
        payload = {
            "event_name": "Test Corporate Lunch",
            "event_date": "2026-04-20",
            "guest_count": 50,
            "venue": "Coral Ballroom",
            "items": [
                {"name": "Caesar Salad", "section": "LUNCH", "subsection": "PLATED LUNCH", "adjusted_price": 15, "quantity": 1, "dietary_info": "D/G"},
                {"name": "Grilled Chicken Breast", "section": "LUNCH", "subsection": "PLATED LUNCH", "adjusted_price": 35, "quantity": 1, "dietary_info": ""},
                {"name": "Chocolate Lava Cake", "section": "LUNCH", "subsection": "PLATED LUNCH", "adjusted_price": 12, "quantity": 1, "dietary_info": "D/G"}
            ],
            "service_charge_pct": 26.0,
            "tax_pct": 7.0,
            "contact": {"name": "John Smith", "email": "john@test.com"}
        }
        
        response = requests.post(f"{BASE_URL}/api/banquet-menus/create-beo", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "id" in data, "Should have id"
        assert "beo_number" in data, "Should have beo_number"
        assert data["beo_number"].startswith("BEO-"), f"BEO number should start with BEO-, got {data['beo_number']}"
        assert "financial" in data, "Should have financial breakdown"
        assert "menu_sections" in data, "Should have menu_sections"
        
        # Verify financial breakdown
        fin = data["financial"]
        assert "per_person" in fin
        assert "food_bev_total" in fin
        assert "service_charge" in fin
        assert "tax" in fin
        assert "total" in fin
        assert fin["service_charge_pct"] == 26.0
        assert fin["tax_pct"] == 7.0
        
        # Verify calculations
        assert fin["total"] > 0, "Total should be > 0"
        
        print(f"PASSED: Created BEO {data['beo_number']} with total ${fin['total']:.2f}")


class TestBEOTemplates:
    """BEO Templates - Save, Load, Delete"""
    
    def test_save_beo_template(self):
        """POST /api/banquet-menus/templates/save saves a template"""
        payload = {
            "name": "Test Corporate Breakfast Template",
            "description": "Standard corporate breakfast setup",
            "event_type": "corporate",
            "guest_count": 100,
            "items": [
                {"name": "Continental Breakfast", "section": "BREAKFAST", "subsection": "CONTINENTAL", "price_numeric": 55, "quantity": 1}
            ],
            "service_charge_pct": 26.0,
            "tax_pct": 7.0,
            "created_by": "Test User"
        }
        
        response = requests.post(f"{BASE_URL}/api/banquet-menus/templates/save", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "template_id" in data, "Should return template_id"
        assert data["template_id"].startswith("tpl-"), f"ID should start with tpl-, got {data['template_id']}"
        assert data["name"] == payload["name"]
        assert data["use_count"] == 0
        
        print(f"PASSED: Saved template {data['template_id']}")
        return data["template_id"]
    
    def test_list_beo_templates(self):
        """GET /api/banquet-menus/templates/list returns templates"""
        response = requests.get(f"{BASE_URL}/api/banquet-menus/templates/list")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "templates" in data
        assert "total" in data
        assert isinstance(data["templates"], list)
        
        print(f"PASSED: Listed {data['total']} templates")
    
    def test_load_beo_template(self):
        """GET /api/banquet-menus/templates/{id} loads a template"""
        # First save a template
        save_payload = {
            "name": "Load Test Template",
            "items": [{"name": "Test Item", "price_numeric": 10}]
        }
        save_resp = requests.post(f"{BASE_URL}/api/banquet-menus/templates/save", json=save_payload)
        assert save_resp.status_code == 200
        tpl_id = save_resp.json()["template_id"]
        
        # Now load it
        response = requests.get(f"{BASE_URL}/api/banquet-menus/templates/{tpl_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["template_id"] == tpl_id
        assert data["name"] == "Load Test Template"
        # use_count increments after the find_one, so it may be 0 or 1 depending on timing
        assert "use_count" in data, "Should have use_count field"
        
        print(f"PASSED: Loaded template {tpl_id}")
    
    def test_delete_beo_template(self):
        """DELETE /api/banquet-menus/templates/{id} deletes a template"""
        # First save a template
        save_payload = {"name": "Delete Test Template", "items": []}
        save_resp = requests.post(f"{BASE_URL}/api/banquet-menus/templates/save", json=save_payload)
        assert save_resp.status_code == 200
        tpl_id = save_resp.json()["template_id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/banquet-menus/templates/{tpl_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["status"] == "deleted"
        
        # Verify it's gone
        get_resp = requests.get(f"{BASE_URL}/api/banquet-menus/templates/{tpl_id}")
        assert get_resp.status_code == 404, "Template should be deleted"
        
        print(f"PASSED: Deleted template {tpl_id}")
    
    def test_load_nonexistent_template(self):
        """GET /api/banquet-menus/templates/nonexistent returns 404"""
        response = requests.get(f"{BASE_URL}/api/banquet-menus/templates/tpl-nonexistent")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASSED: 404 for nonexistent template")


class TestGroupResumePDF:
    """Group Resume PDF Export"""
    
    def test_seed_sample_resume(self):
        """POST /api/group-resume/seed-sample seeds eClinical Works resume"""
        response = requests.post(f"{BASE_URL}/api/group-resume/seed-sample")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["resume_id"] == "gr-eclinical-sample" or data["status"] == "already_seeded"
        print(f"PASSED: Sample resume seeded - {data.get('status', 'seeded')}")
    
    def test_pdf_export_returns_pdf(self):
        """GET /api/group-resume/gr-eclinical-sample/pdf returns PDF binary"""
        # First ensure sample is seeded
        requests.post(f"{BASE_URL}/api/group-resume/seed-sample")
        
        response = requests.get(f"{BASE_URL}/api/group-resume/gr-eclinical-sample/pdf")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        assert "application/pdf" in content_type, f"Expected application/pdf, got {content_type}"
        
        # Check content disposition
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp, f"Expected attachment disposition, got {content_disp}"
        assert "group_resume_gr-eclinical-sample.pdf" in content_disp
        
        # Check PDF magic bytes
        content = response.content
        assert len(content) > 100, f"PDF should have content, got {len(content)} bytes"
        assert content[:4] == b'%PDF', f"Content should start with PDF magic bytes, got {content[:4]}"
        
        print(f"PASSED: PDF export returned {len(content)} bytes with correct headers")
    
    def test_pdf_export_nonexistent_resume(self):
        """GET /api/group-resume/nonexistent/pdf returns 404"""
        response = requests.get(f"{BASE_URL}/api/group-resume/gr-nonexistent/pdf")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASSED: 404 for nonexistent resume PDF")
    
    def test_resume_has_all_sections(self):
        """GET /api/group-resume/gr-eclinical-sample returns all sections"""
        # Ensure seeded
        requests.post(f"{BASE_URL}/api/group-resume/seed-sample")
        
        response = requests.get(f"{BASE_URL}/api/group-resume/gr-eclinical-sample")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check required sections
        required_sections = [
            "group_info", "meeting_details", "contact_info", "vip_info",
            "room_blocks", "food_beverage", "schedule_of_events", "billing"
        ]
        
        for section in required_sections:
            assert section in data, f"Missing section: {section}"
        
        # Verify VIP info
        assert len(data["vip_info"]) >= 4, f"Expected at least 4 VIPs, got {len(data['vip_info'])}"
        
        # Verify schedule
        assert len(data["schedule_of_events"]) >= 10, f"Expected at least 10 events, got {len(data['schedule_of_events'])}"
        
        print(f"PASSED: Resume has all sections, {len(data['vip_info'])} VIPs, {len(data['schedule_of_events'])} events")


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """GET /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASSED: Health check OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
