"""
Iteration 137: Production Schedules & Advanced Cake Tools Backend Tests
========================================================================
Tests for:
- Production Schedules API (9 endpoints): summary, grouped-by-day, list, get, create, acknowledge, acknowledge-all, seed/reset
- Advanced Cake Tools (2 new endpoints): advanced-tools (10 tools), airbrush-nozzles (4 nozzles)
- Regression: existing cake-assets endpoints (textures, piping, flowers, templates, stands, order)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProductionSchedulesSeedReset:
    """Test seed/reset first to ensure known state"""
    
    def test_seed_reset(self):
        """POST /api/production-schedules/seed/reset wipes and reseeds 6 demo items"""
        response = requests.post(f"{BASE_URL}/api/production-schedules/seed/reset")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
        assert data.get("seeded") == 6, f"Expected 6 seeded items, got {data.get('seeded')}"
        print(f"PASS: seed/reset returned {data}")


class TestProductionSchedulesSummary:
    """Test GET /api/production-schedules/summary"""
    
    def test_summary_structure(self):
        """Summary returns total_open, buckets, critical_count, next_up, headline"""
        # First reset to known state
        requests.post(f"{BASE_URL}/api/production-schedules/seed/reset")
        
        response = requests.get(f"{BASE_URL}/api/production-schedules/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate structure
        assert "total_open" in data, "Missing total_open"
        assert "buckets" in data, "Missing buckets"
        assert "critical_count" in data, "Missing critical_count"
        assert "next_up" in data, "Missing next_up"
        assert "headline" in data, "Missing headline"
        
        # Validate buckets structure
        buckets = data["buckets"]
        for bucket in ["overdue", "today", "tomorrow", "this_week", "later"]:
            assert bucket in buckets, f"Missing bucket: {bucket}"
        
        # Validate total_open matches seeded count
        assert data["total_open"] == 6, f"Expected 6 open items, got {data['total_open']}"
        
        # Validate next_up structure
        next_up = data["next_up"]
        assert next_up is not None, "next_up should not be None with 6 items"
        assert "id" in next_up, "next_up missing id"
        assert "title" in next_up, "next_up missing title"
        assert "label" in next_up, "next_up missing label"
        assert "bucket" in next_up, "next_up missing bucket"
        
        print(f"PASS: summary structure valid - total_open={data['total_open']}, headline='{data['headline']}'")


class TestProductionSchedulesGroupedByDay:
    """Test GET /api/production-schedules/grouped-by-day"""
    
    def test_grouped_by_day_structure(self):
        """Returns groups array with date, label, count, bucket, items[]"""
        response = requests.get(f"{BASE_URL}/api/production-schedules/grouped-by-day")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "groups" in data, "Missing groups"
        assert "total_groups" in data, "Missing total_groups"
        
        groups = data["groups"]
        assert len(groups) > 0, "Expected at least one group"
        
        # Validate first group structure
        first_group = groups[0]
        assert "date" in first_group, "Group missing date"
        assert "label" in first_group, "Group missing label"
        assert "count" in first_group, "Group missing count"
        assert "bucket" in first_group, "Group missing bucket"
        assert "items" in first_group, "Group missing items"
        
        # Validate items have relative field
        if first_group["items"]:
            item = first_group["items"][0]
            assert "relative" in item, "Item missing relative field"
            assert "label" in item["relative"], "relative missing label"
            assert "bucket" in item["relative"], "relative missing bucket"
        
        print(f"PASS: grouped-by-day returns {data['total_groups']} groups")


class TestProductionSchedulesList:
    """Test GET /api/production-schedules/"""
    
    def test_list_all(self):
        """Returns full items list with relative.label/bucket on each"""
        response = requests.get(f"{BASE_URL}/api/production-schedules/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "items" in data, "Missing items"
        assert "total" in data, "Missing total"
        assert data["total"] == 6, f"Expected 6 items, got {data['total']}"
        
        # Validate each item has relative field
        for item in data["items"]:
            assert "relative" in item, f"Item {item.get('id')} missing relative"
            assert "label" in item["relative"], "relative missing label"
            assert "bucket" in item["relative"], "relative missing bucket"
            assert "_id" not in item, f"Item {item.get('id')} leaks _id"
        
        print(f"PASS: list returns {data['total']} items with relative fields")
    
    def test_list_filter_by_kind(self):
        """Filter by kind parameter"""
        response = requests.get(f"{BASE_URL}/api/production-schedules/?kind=cake")
        assert response.status_code == 200
        data = response.json()
        
        for item in data["items"]:
            assert item["kind"] == "cake", f"Expected kind=cake, got {item['kind']}"
        
        print(f"PASS: filter by kind=cake returns {data['total']} items")
    
    def test_list_filter_by_bucket(self):
        """Filter by bucket parameter"""
        response = requests.get(f"{BASE_URL}/api/production-schedules/?bucket=tomorrow")
        assert response.status_code == 200
        data = response.json()
        
        for item in data["items"]:
            assert item["relative"]["bucket"] == "tomorrow", f"Expected bucket=tomorrow"
        
        print(f"PASS: filter by bucket=tomorrow returns {data['total']} items")


class TestProductionSchedulesGetSingle:
    """Test GET /api/production-schedules/{id}"""
    
    def test_get_single_item(self):
        """Returns single item with all fields"""
        # First get list to find an ID
        list_resp = requests.get(f"{BASE_URL}/api/production-schedules/")
        items = list_resp.json()["items"]
        item_id = items[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/production-schedules/{item_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Validate all required fields
        required_fields = [
            "id", "title", "client_name", "due_date", "delivery_time", "venue",
            "beo_id", "flavor_profile", "decorations", "dietary_notes",
            "assigned_chef", "assigned_decorator", "relative"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        assert "_id" not in data, "Response leaks _id"
        assert data["relative"]["label"] is not None, "relative.label is None"
        assert data["relative"]["bucket"] is not None, "relative.bucket is None"
        
        print(f"PASS: get single item {item_id} returns all fields")
    
    def test_get_nonexistent_item(self):
        """Returns 404 for nonexistent item"""
        response = requests.get(f"{BASE_URL}/api/production-schedules/nonexistent-id")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: get nonexistent item returns 404")


class TestProductionSchedulesCreate:
    """Test POST /api/production-schedules/"""
    
    def test_create_new_reminder(self):
        """Creates a new reminder with custom body"""
        payload = {
            "title": "TEST_Custom Reminder",
            "client_name": "TEST Client",
            "due_date": "2026-04-20T14:00:00+00:00",
            "delivery_time": "14:00",
            "venue": "Test Venue",
            "kind": "cake",
            "priority": "high",
            "flavor_profile": [{"tier": 1, "flavor": "Chocolate", "filling": "Ganache"}],
            "decorations": ["Gold Leaf"],
            "dietary_notes": "Nut-free",
            "assigned_chef": "Chef Test",
            "assigned_decorator": "Decorator Test"
        }
        
        response = requests.post(f"{BASE_URL}/api/production-schedules/", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "id" in data, "Missing id in response"
        assert data["id"].startswith("sched-"), f"ID should start with sched-, got {data['id']}"
        assert data["title"] == payload["title"]
        assert data["acknowledged"] is False
        assert "_id" not in data, "Response leaks _id"
        
        # Verify persistence with GET
        get_resp = requests.get(f"{BASE_URL}/api/production-schedules/{data['id']}")
        assert get_resp.status_code == 200
        fetched = get_resp.json()
        assert fetched["title"] == payload["title"]
        
        print(f"PASS: created new reminder {data['id']}")
        return data["id"]


class TestProductionSchedulesAcknowledge:
    """Test acknowledge endpoints"""
    
    def test_acknowledge_single(self):
        """POST /api/production-schedules/{id}/acknowledge sets acknowledged=true"""
        # Reset to known state
        requests.post(f"{BASE_URL}/api/production-schedules/seed/reset")
        
        # Get initial summary count
        summary_before = requests.get(f"{BASE_URL}/api/production-schedules/summary").json()
        initial_count = summary_before["total_open"]
        
        # Get an item to acknowledge
        list_resp = requests.get(f"{BASE_URL}/api/production-schedules/")
        items = list_resp.json()["items"]
        item_id = items[0]["id"]
        
        # Acknowledge it
        response = requests.post(
            f"{BASE_URL}/api/production-schedules/{item_id}/acknowledge",
            json={"by": "Chef Gio"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["success"] is True
        assert data["id"] == item_id
        
        # Verify it disappears from summary
        summary_after = requests.get(f"{BASE_URL}/api/production-schedules/summary").json()
        assert summary_after["total_open"] == initial_count - 1, \
            f"Expected {initial_count - 1} open, got {summary_after['total_open']}"
        
        # Verify acknowledged flag is set
        get_resp = requests.get(f"{BASE_URL}/api/production-schedules/{item_id}")
        item = get_resp.json()
        assert item["acknowledged"] is True
        assert item["acknowledged_by"] == "Chef Gio"
        
        print(f"PASS: acknowledged {item_id}, count decreased from {initial_count} to {summary_after['total_open']}")
    
    def test_acknowledge_nonexistent(self):
        """Returns 404 for nonexistent item"""
        response = requests.post(
            f"{BASE_URL}/api/production-schedules/nonexistent-id/acknowledge",
            json={"by": "Chef Gio"}
        )
        assert response.status_code == 404
        print("PASS: acknowledge nonexistent returns 404")
    
    def test_acknowledge_all(self):
        """POST /api/production-schedules/acknowledge-all acknowledges all open items"""
        # Reset to known state
        requests.post(f"{BASE_URL}/api/production-schedules/seed/reset")
        
        # Acknowledge all
        response = requests.post(
            f"{BASE_URL}/api/production-schedules/acknowledge-all",
            json={"by": "Chef Gio"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["count"] == 6, f"Expected 6 acknowledged, got {data['count']}"
        
        # Verify summary shows 0 open
        summary = requests.get(f"{BASE_URL}/api/production-schedules/summary").json()
        assert summary["total_open"] == 0, f"Expected 0 open after acknowledge-all, got {summary['total_open']}"
        
        print(f"PASS: acknowledge-all acknowledged {data['count']} items")


class TestAdvancedCakeTools:
    """Test GET /api/cake-assets/advanced-tools"""
    
    def test_advanced_tools_returns_10(self):
        """Returns 10 tools with categories"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/advanced-tools")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "tools" in data, "Missing tools"
        assert "total" in data, "Missing total"
        assert "categories" in data, "Missing categories"
        
        assert data["total"] == 10, f"Expected 10 tools, got {data['total']}"
        
        # Validate categories
        expected_categories = {"coloring", "sculpting", "showpiece", "painting", "print", "finishing"}
        actual_categories = set(data["categories"])
        assert expected_categories == actual_categories, \
            f"Expected categories {expected_categories}, got {actual_categories}"
        
        print(f"PASS: advanced-tools returns {data['total']} tools in {len(data['categories'])} categories")
    
    def test_advanced_tools_structure(self):
        """Each tool has required fields"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/advanced-tools")
        tools = response.json()["tools"]
        
        required_fields = ["id", "name", "category", "description", "consumables_per_cake", "labor_min"]
        
        for tool in tools:
            for field in required_fields:
                assert field in tool, f"Tool {tool.get('id')} missing {field}"
        
        # Validate specific tools exist
        tool_ids = [t["id"] for t in tools]
        expected_tools = [
            "tool-airbrush", "tool-fondant-drape", "tool-silicone-molds", "tool-isomalt",
            "tool-stencils", "tool-modeling-chocolate", "tool-luster-dust",
            "tool-edible-image-print", "tool-buttercream-brush", "tool-drip-control"
        ]
        for expected in expected_tools:
            assert expected in tool_ids, f"Missing tool: {expected}"
        
        print("PASS: all 10 advanced tools have required structure")
    
    def test_advanced_tools_filter_by_category(self):
        """Filter by category parameter"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/advanced-tools?category=coloring")
        assert response.status_code == 200
        data = response.json()
        
        for tool in data["tools"]:
            assert tool["category"] == "coloring", f"Expected coloring, got {tool['category']}"
        
        # Should have airbrush, stencils, luster-dust
        assert data["total"] == 3, f"Expected 3 coloring tools, got {data['total']}"
        print(f"PASS: filter by category=coloring returns {data['total']} tools")
    
    def test_airbrush_tool_has_ui_field(self):
        """Airbrush tool has ui='airbrush_3d_modal'"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/advanced-tools")
        tools = response.json()["tools"]
        
        airbrush = next((t for t in tools if t["id"] == "tool-airbrush"), None)
        assert airbrush is not None, "Airbrush tool not found"
        assert airbrush.get("ui") == "airbrush_3d_modal", f"Expected ui='airbrush_3d_modal', got {airbrush.get('ui')}"
        assert "inputs" in airbrush, "Airbrush missing inputs field"
        
        print("PASS: airbrush tool has ui=airbrush_3d_modal and inputs")


class TestAirbrushNozzles:
    """Test GET /api/cake-assets/airbrush-nozzles"""
    
    def test_airbrush_nozzles_returns_4(self):
        """Returns 4 nozzles"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/airbrush-nozzles")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "nozzles" in data, "Missing nozzles"
        assert "total" in data, "Missing total"
        assert data["total"] == 4, f"Expected 4 nozzles, got {data['total']}"
        
        print(f"PASS: airbrush-nozzles returns {data['total']} nozzles")
    
    def test_airbrush_nozzles_structure(self):
        """Each nozzle has spread/falloff/opacity/best_for"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/airbrush-nozzles")
        nozzles = response.json()["nozzles"]
        
        required_fields = ["id", "name", "spread", "falloff", "opacity", "best_for"]
        expected_ids = ["noz-fine", "noz-medium", "noz-broad", "noz-splatter"]
        
        for nozzle in nozzles:
            for field in required_fields:
                assert field in nozzle, f"Nozzle {nozzle.get('id')} missing {field}"
        
        actual_ids = [n["id"] for n in nozzles]
        for expected in expected_ids:
            assert expected in actual_ids, f"Missing nozzle: {expected}"
        
        # Validate splatter nozzle has splatter=True
        splatter = next((n for n in nozzles if n["id"] == "noz-splatter"), None)
        assert splatter is not None
        assert splatter.get("splatter") is True, "noz-splatter should have splatter=True"
        
        print("PASS: all 4 nozzles have required structure")


class TestCakeAssetsRegression:
    """Regression tests for existing cake-assets endpoints"""
    
    def test_textures_15(self):
        """GET /api/cake-assets/textures returns 15 textures"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/textures")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 15, f"Expected 15 textures, got {data['total']}"
        print(f"PASS: textures returns {data['total']}")
    
    def test_piping_12(self):
        """GET /api/cake-assets/piping returns 12 patterns"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/piping")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 12, f"Expected 12 patterns, got {data['total']}"
        print(f"PASS: piping returns {data['total']}")
    
    def test_flowers_8(self):
        """GET /api/cake-assets/flowers returns 8 arrangements"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/flowers")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 8, f"Expected 8 flowers, got {data['total']}"
        print(f"PASS: flowers returns {data['total']}")
    
    def test_templates(self):
        """GET /api/cake-assets/templates returns templates"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/templates")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 12, f"Expected at least 12 templates, got {data['total']}"
        print(f"PASS: templates returns {data['total']}")
    
    def test_stands_10(self):
        """GET /api/cake-assets/stands returns 10 stands"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/stands")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 10, f"Expected 10 stands, got {data['total']}"
        print(f"PASS: stands returns {data['total']}")
    
    def test_order_creation_with_costing(self):
        """POST /api/cake-assets/order produces full cake order with costing"""
        payload = {
            "design": {
                "name": "TEST_Regression Order",
                "tiers": [
                    {"shape": "round", "diameter": 10, "height": 5, "flavor": "Chocolate", "frostingStyle": "fondant", "frostingColor": "#ffffff", "fillingFlavor": "Ganache"}
                ],
                "decorations": [{"name": "Gold Leaf", "type": "accent", "color": "#d4a843"}],
                "stand": "pedestal"
            },
            "client": {"name": "TEST Client", "email": "test@example.com"}
        }
        
        response = requests.post(f"{BASE_URL}/api/cake-assets/order", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "order_number" in data, "Missing order_number"
        assert data["order_number"].startswith("CK-"), f"Order number should start with CK-"
        assert "costing" in data, "Missing costing"
        
        costing = data["costing"]
        for field in ["food_cost", "labor_hours", "labor_cost", "total_cost", "suggested_price", "per_serving"]:
            assert field in costing, f"Costing missing {field}"
        
        assert "_id" not in data, "Response leaks _id"
        
        print(f"PASS: order creation returns {data['order_number']} with costing")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_and_reset(self):
        """Reset to clean state after tests"""
        response = requests.post(f"{BASE_URL}/api/production-schedules/seed/reset")
        assert response.status_code == 200
        print("PASS: cleanup complete, reset to 6 demo items")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
