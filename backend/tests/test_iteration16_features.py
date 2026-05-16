"""
Iteration 16 Backend Tests
==========================
Tests for:
1. EchoEvents Report API - GET /api/echo-events/report
2. EchoEvents Summary API - GET /api/echo-events/summary
3. Waste Sheet Entries - GET /api/waste-sheet/entries
4. Waste Sheet Create - POST /api/waste-sheet/entries
5. Waste Sheet Credits - POST /api/waste-sheet/credits
6. Waste Sheet Dashboard - GET /api/waste-sheet/dashboard
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cfo-toolkit-deploy.preview.emergentagent.com").rstrip("/")


class TestHealthEndpoint:
    """Basic health check"""
    
    def test_health_returns_healthy(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["platform"] == "LUCCCA Enterprise"
        assert data["version"] == "3.1"


class TestEchoEventsReport:
    """EchoEvents Definite & Pending Report API tests"""
    
    def test_report_returns_definite_and_pending(self):
        """GET /api/echo-events/report returns definite and pending events"""
        response = requests.get(f"{BASE_URL}/api/echo-events/report")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "definite" in data
        assert "pending" in data
        assert "summary" in data
        assert "generated_at" in data
        
        # Verify definite events have required fields
        assert isinstance(data["definite"], list)
        if len(data["definite"]) > 0:
            event = data["definite"][0]
            assert "id" in event
            assert "beo_number" in event
            assert event["beo_number"].startswith("BEO-")
            assert "name" in event
            assert "revenue" in event
            assert "actual_spend" in event
            assert "profit_margin" in event
            
            # Verify revenue breakdown
            revenue = event["revenue"]
            assert "food" in revenue
            assert "beverage" in revenue
            assert "total" in revenue
            
            # Verify spend breakdown
            spend = event["actual_spend"]
            assert "food" in spend
            assert "labor" in spend
            assert "total" in spend
    
    def test_report_summary_has_correct_fields(self):
        """Report summary contains all required metrics"""
        response = requests.get(f"{BASE_URL}/api/echo-events/report")
        assert response.status_code == 200
        data = response.json()
        
        summary = data["summary"]
        assert "definite_count" in summary
        assert "pending_count" in summary
        assert "total_definite_revenue" in summary
        assert "total_definite_spend" in summary
        assert "total_pending_revenue" in summary
        assert "total_definite_guests" in summary
        assert "total_pending_guests" in summary
        assert "overall_margin" in summary
        
        # Verify counts match array lengths
        assert summary["definite_count"] == len(data["definite"])
        assert summary["pending_count"] == len(data["pending"])


class TestEchoEventsSummary:
    """EchoEvents Summary API tests"""
    
    def test_summary_returns_stage_breakdown(self):
        """GET /api/echo-events/summary returns stage breakdown"""
        response = requests.get(f"{BASE_URL}/api/echo-events/summary")
        assert response.status_code == 200
        data = response.json()
        
        assert "stages" in data
        assert "total_events" in data
        assert isinstance(data["stages"], dict)
        assert data["total_events"] >= 0
        
        # Verify stage structure
        for stage_name, stage_data in data["stages"].items():
            assert "count" in stage_data
            assert "revenue" in stage_data
            assert "guests" in stage_data


class TestWasteSheetEntries:
    """Waste Sheet Entries API tests"""
    
    def test_list_entries_returns_waste_data(self):
        """GET /api/waste-sheet/entries returns waste entries with GL status"""
        response = requests.get(f"{BASE_URL}/api/waste-sheet/entries")
        assert response.status_code == 200
        data = response.json()
        
        assert "entries" in data
        assert "count" in data
        assert isinstance(data["entries"], list)
        
        # Verify entry structure if entries exist
        if len(data["entries"]) > 0:
            entry = data["entries"][0]
            assert "id" in entry
            assert "item_name" in entry
            assert "quantity" in entry
            assert "unit" in entry
            assert "reason" in entry
            assert "cost_estimate" in entry
            assert "accounting_posted" in entry
            assert "gl_entries" in entry
    
    def test_list_entries_with_department_filter(self):
        """GET /api/waste-sheet/entries?department=culinary filters by department"""
        response = requests.get(f"{BASE_URL}/api/waste-sheet/entries?department=culinary")
        assert response.status_code == 200
        data = response.json()
        
        assert "entries" in data
        # All entries should be culinary department
        for entry in data["entries"]:
            assert entry.get("department") == "culinary"


class TestWasteSheetCreate:
    """Waste Sheet Create Entry API tests"""
    
    def test_create_waste_entry_and_gl_posting(self):
        """POST /api/waste-sheet/entries creates entry and auto-posts to GL"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "item_name": f"TEST_Expired Cream {unique_id}",
            "quantity": 3.0,
            "unit": "gal",
            "reason": "expired",
            "cost_per_unit": 5.50,
            "department": "pastry",
            "notes": "Test entry for iteration 16"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/waste-sheet/entries",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify entry created
        assert "entry" in data
        entry = data["entry"]
        assert entry["item_name"] == payload["item_name"]
        assert entry["quantity"] == payload["quantity"]
        assert entry["unit"] == payload["unit"]
        assert entry["reason"] == payload["reason"]
        assert entry["department"] == payload["department"]
        
        # Verify cost calculation
        expected_cost = payload["quantity"] * payload["cost_per_unit"]
        assert entry["cost_estimate"] == expected_cost
        
        # Verify GL posting
        assert data["gl_posted"] == True
        
        # Verify entry persisted - GET to confirm
        get_response = requests.get(f"{BASE_URL}/api/waste-sheet/entries")
        assert get_response.status_code == 200
        entries = get_response.json()["entries"]
        found = any(e["id"] == entry["id"] for e in entries)
        assert found, "Created entry should be in entries list"
    
    def test_create_waste_entry_without_cost(self):
        """POST /api/waste-sheet/entries works without cost_per_unit"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "item_name": f"TEST_Prep Error Item {unique_id}",
            "quantity": 2.0,
            "unit": "lb",
            "reason": "prep_error",
            "department": "culinary"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/waste-sheet/entries",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        # Entry created with zero cost
        assert data["entry"]["cost_estimate"] == 0
        assert data["gl_posted"] == False  # No GL posting for zero cost


class TestWasteSheetCredits:
    """Waste Sheet Credits API tests"""
    
    def test_apply_credit_to_waste_entry(self):
        """POST /api/waste-sheet/credits applies credit and posts to GL"""
        # First create a waste entry
        unique_id = str(uuid.uuid4())[:8]
        create_payload = {
            "item_name": f"TEST_Credit Test Item {unique_id}",
            "quantity": 5.0,
            "unit": "lb",
            "reason": "quality_reject",
            "cost_per_unit": 10.00,
            "department": "culinary"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/waste-sheet/entries",
            json=create_payload
        )
        assert create_response.status_code == 200
        waste_id = create_response.json()["entry"]["id"]
        original_cost = create_response.json()["entry"]["cost_estimate"]
        
        # Apply credit
        credit_payload = {
            "waste_id": waste_id,
            "credit_amount": 25.00,
            "credit_type": "vendor_return",
            "notes": "Vendor accepted return for quality issue"
        }
        
        credit_response = requests.post(
            f"{BASE_URL}/api/waste-sheet/credits",
            json=credit_payload
        )
        assert credit_response.status_code == 200
        credit_data = credit_response.json()
        
        # Verify credit applied
        assert "credit" in credit_data
        assert credit_data["credit"]["amount"] == 25.00
        assert credit_data["credit"]["type"] == "vendor_return"
        assert credit_data["gl_posted"] == True
        
        # Verify net cost calculation
        expected_net = max(0, original_cost - 25.00)
        assert credit_data["net_cost"] == expected_net
    
    def test_apply_credit_to_nonexistent_entry(self):
        """POST /api/waste-sheet/credits returns 404 for invalid waste_id"""
        credit_payload = {
            "waste_id": "nonexistent-id-12345",
            "credit_amount": 10.00,
            "credit_type": "donation"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/waste-sheet/credits",
            json=credit_payload
        )
        assert response.status_code == 404


class TestWasteSheetDashboard:
    """Waste Sheet Dashboard API tests"""
    
    def test_dashboard_returns_summary(self):
        """GET /api/waste-sheet/dashboard returns summary with breakdowns"""
        response = requests.get(f"{BASE_URL}/api/waste-sheet/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "total_entries" in data
        assert "total_cost" in data
        assert "total_credits" in data
        assert "net_waste_cost" in data
        assert "by_reason" in data
        assert "by_department" in data
        
        # Verify calculations
        assert data["net_waste_cost"] == data["total_cost"] - data["total_credits"]
        
        # Verify breakdown structure
        for reason, breakdown in data["by_reason"].items():
            assert "count" in breakdown
            assert "cost" in breakdown
        
        for dept, breakdown in data["by_department"].items():
            assert "count" in breakdown
            assert "cost" in breakdown
    
    def test_dashboard_with_department_filter(self):
        """GET /api/waste-sheet/dashboard?department=pastry filters by department"""
        response = requests.get(f"{BASE_URL}/api/waste-sheet/dashboard?department=pastry")
        assert response.status_code == 200
        data = response.json()
        
        # Should only have pastry department in breakdown
        if data["total_entries"] > 0:
            assert "pastry" in data["by_department"] or len(data["by_department"]) == 0


class TestGLIntegration:
    """GL Journal Entry Integration tests"""
    
    def test_waste_entry_creates_gl_entries(self):
        """Verify waste entry creates proper GL journal entries"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "item_name": f"TEST_GL Integration {unique_id}",
            "quantity": 4.0,
            "unit": "lb",
            "reason": "overproduction",
            "cost_per_unit": 8.00,
            "department": "culinary"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/waste-sheet/entries",
            json=payload
        )
        assert response.status_code == 200
        waste_id = response.json()["entry"]["id"]
        
        # Fetch entry and verify GL entries
        get_response = requests.get(f"{BASE_URL}/api/waste-sheet/entries")
        assert get_response.status_code == 200
        
        entries = get_response.json()["entries"]
        entry = next((e for e in entries if e["id"] == waste_id), None)
        assert entry is not None
        
        # Verify GL entries exist
        assert entry["accounting_posted"] == True
        assert len(entry["gl_entries"]) >= 2  # Debit and Credit entries
        
        # Verify debit entry (Waste Expense)
        debit_entry = next((gl for gl in entry["gl_entries"] if gl["debit"] > 0), None)
        assert debit_entry is not None
        assert debit_entry["account_code"] == "5400"
        assert "Waste Expense" in debit_entry["account_name"]
        
        # Verify credit entry (Inventory)
        credit_entry = next((gl for gl in entry["gl_entries"] if gl["credit"] > 0), None)
        assert credit_entry is not None
        assert credit_entry["account_code"] == "1200"
        assert "Inventory" in credit_entry["account_name"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
