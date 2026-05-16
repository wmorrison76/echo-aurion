"""
Iteration 104: Beverage Ordering with Escrow & BEO Batch Runner Tests
======================================================================
Tests:
1. Beverage Ordering with Escrow Account Checks
   - POST /api/beverage-orders/order - creates order with escrow balance check
   - POST /api/beverage-orders/order - deducts from escrow when sufficient
   - POST /api/beverage-orders/order - returns finance_alert when below minimum or insufficient
   - GET /api/beverage-orders/escrow - returns balance, pending, effective_balance
   - POST /api/beverage-orders/escrow/adjust - adjusts escrow balance
   - GET /api/beverage-orders/catalog - returns 12 beverage items

2. Multi-BEO Batch Runner & Day Simulation
   - POST /api/beo-batch/run-day-simulation - creates multiple events simultaneously
   - POST /api/beo-batch/run-day-simulation - returns batch_summary with total_covers, revenue, events_per_second
   - POST /api/beo-batch/run-day-simulation - returns time_savings with hours_saved
   - POST /api/beo-batch/run-day-simulation - returns day_operations with total_staff_needed

3. Labor Efficiency Tracking
   - POST /api/beo-batch/labor-entry - records scheduled vs actual labor time
   - GET /api/beo-batch/labor-analytics - returns overall_efficiency, by_station, bottlenecks

4. Regression Tests
   - GET /api/beo-engine/dashboard - returns totals
   - GET /api/echoai3/roi/live - returns actual savings
   - GET /api/health - returns healthy
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestHealthRegression:
    """Regression tests for health and core endpoints"""

    def test_health_endpoint(self):
        """GET /api/health - returns healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "engines" in data
        print(f"PASSED: Health endpoint - status: {data['status']}")

    def test_beo_engine_dashboard_regression(self):
        """GET /api/beo-engine/dashboard - returns totals"""
        response = requests.get(f"{BASE_URL}/api/beo-engine/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "total_beos" in data
        assert "total_revenue" in data
        assert "total_recipes" in data
        print(f"PASSED: BEO Dashboard - {data['total_beos']} BEOs, ${data['total_revenue']:,.2f} revenue")

    def test_echoai3_roi_live_regression(self):
        """GET /api/echoai3/roi/live - returns actual savings"""
        response = requests.get(f"{BASE_URL}/api/echoai3/roi/live")
        assert response.status_code == 200
        data = response.json()
        # Verify ROI live structure
        assert "total_time_saved_hours" in data
        assert "estimated_cost_saved" in data
        assert "operations_performed" in data
        print(f"PASSED: EchoAi³ ROI Live - {data['total_time_saved_hours']} hours saved, ${data['estimated_cost_saved']:,.2f} cost saved")


class TestBeverageCatalog:
    """Tests for beverage catalog endpoint"""

    def test_get_beverage_catalog(self):
        """GET /api/beverage-orders/catalog - returns 12 beverage items"""
        response = requests.get(f"{BASE_URL}/api/beverage-orders/catalog")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] == 12
        assert len(data["items"]) == 12
        
        # Verify catalog structure
        item = data["items"][0]
        assert "id" in item
        assert "name" in item
        assert "category" in item
        assert "unit_cost" in item
        assert "unit" in item
        
        # Verify categories
        categories = set(i["category"] for i in data["items"])
        assert "spirits" in categories
        assert "wine" in categories
        assert "beer" in categories
        assert "non_alc" in categories
        
        print(f"PASSED: Beverage Catalog - {data['total']} items, categories: {categories}")


class TestEscrowAccount:
    """Tests for escrow account management"""

    def test_get_escrow_status(self):
        """GET /api/beverage-orders/escrow - returns balance, pending, effective_balance"""
        response = requests.get(f"{BASE_URL}/api/beverage-orders/escrow")
        assert response.status_code == 200
        data = response.json()
        
        # Verify escrow structure
        assert "balance" in data
        assert "minimum_balance" in data
        assert "pending_orders_total" in data
        assert "effective_balance" in data
        assert "auto_replenish" in data
        
        # Verify values are numeric
        assert isinstance(data["balance"], (int, float))
        assert isinstance(data["effective_balance"], (int, float))
        
        print(f"PASSED: Escrow Status - Balance: ${data['balance']:,.2f}, Effective: ${data['effective_balance']:,.2f}")

    def test_adjust_escrow_credit(self):
        """POST /api/beverage-orders/escrow/adjust - adjusts escrow balance (credit)"""
        # Get current balance
        response = requests.get(f"{BASE_URL}/api/beverage-orders/escrow")
        initial_balance = response.json()["balance"]
        
        # Add credit
        adjust_data = {"amount": 1000.00, "reason": "Test credit adjustment"}
        response = requests.post(f"{BASE_URL}/api/beverage-orders/escrow/adjust", json=adjust_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "new_balance" in data
        assert "adjustment" in data
        assert data["adjustment"] == 1000.00
        assert data["new_balance"] == initial_balance + 1000.00
        
        print(f"PASSED: Escrow Adjust Credit - New balance: ${data['new_balance']:,.2f}")
        
        # Revert the adjustment
        revert_data = {"amount": -1000.00, "reason": "Revert test credit"}
        requests.post(f"{BASE_URL}/api/beverage-orders/escrow/adjust", json=revert_data)


class TestBeverageOrdering:
    """Tests for beverage ordering with escrow checks"""

    def test_create_beverage_order_sufficient_balance(self):
        """POST /api/beverage-orders/order - creates order with escrow balance check"""
        order_data = {
            "beo_id": "beo-test-001",
            "event_name": "TEST Corporate Lunch",
            "items": [
                {"beverage_id": "bv-001", "qty": 2},  # Dewar's $32 x 2 = $64
                {"beverage_id": "bv-006", "qty": 3},  # Whispering Angel $22 x 3 = $66
            ],
            "notes": "Test order for iteration 104"
        }
        
        response = requests.post(f"{BASE_URL}/api/beverage-orders/order", json=order_data)
        assert response.status_code == 200
        data = response.json()
        
        # Verify order structure
        assert "id" in data
        assert data["id"].startswith("bvord-")
        assert "items" in data
        assert "total_cost" in data
        assert "escrow_check" in data
        assert "status" in data
        
        # Verify escrow check
        escrow_check = data["escrow_check"]
        assert "balance_before" in escrow_check
        assert "order_amount" in escrow_check
        assert "balance_after" in escrow_check
        assert "sufficient" in escrow_check
        
        # With $50K starting balance, order should be approved
        assert escrow_check["sufficient"] == True
        assert data["status"] == "approved"
        
        # Verify total cost calculation
        expected_cost = 64 + 66  # $130
        assert data["total_cost"] == expected_cost
        
        print(f"PASSED: Beverage Order Created - ID: {data['id']}, Total: ${data['total_cost']}, Status: {data['status']}")

    def test_beverage_order_deducts_from_escrow(self):
        """POST /api/beverage-orders/order - deducts from escrow when sufficient"""
        # Get initial balance
        response = requests.get(f"{BASE_URL}/api/beverage-orders/escrow")
        initial_balance = response.json()["balance"]
        
        # Create small order
        order_data = {
            "beo_id": "beo-test-002",
            "event_name": "TEST Small Order",
            "items": [{"beverage_id": "bv-011", "qty": 1}],  # Coca-Cola $18
            "notes": "Test deduction"
        }
        
        response = requests.post(f"{BASE_URL}/api/beverage-orders/order", json=order_data)
        assert response.status_code == 200
        data = response.json()
        
        # Verify deduction
        assert data["escrow_check"]["balance_before"] == initial_balance
        assert data["escrow_check"]["balance_after"] == initial_balance - 18
        
        # Verify new balance
        response = requests.get(f"{BASE_URL}/api/beverage-orders/escrow")
        new_balance = response.json()["balance"]
        assert new_balance == initial_balance - 18
        
        print(f"PASSED: Escrow Deduction - Before: ${initial_balance:,.2f}, After: ${new_balance:,.2f}")

    def test_beverage_order_finance_alert_below_minimum(self):
        """POST /api/beverage-orders/order - returns finance_alert when below minimum"""
        # First, drain escrow to near minimum (5000)
        response = requests.get(f"{BASE_URL}/api/beverage-orders/escrow")
        current_balance = response.json()["balance"]
        minimum = response.json()["minimum_balance"]
        
        # Adjust to just above minimum + small order amount
        target_balance = minimum + 100  # $5100
        adjustment = target_balance - current_balance
        
        adjust_data = {"amount": adjustment, "reason": "Test setup for minimum alert"}
        requests.post(f"{BASE_URL}/api/beverage-orders/escrow/adjust", json=adjust_data)
        
        # Create order that will drop below minimum
        order_data = {
            "beo_id": "beo-test-003",
            "event_name": "TEST Below Minimum Order",
            "items": [{"beverage_id": "bv-005", "qty": 2}],  # Caymus $68 x 2 = $136
            "notes": "Test below minimum alert"
        }
        
        response = requests.post(f"{BASE_URL}/api/beverage-orders/order", json=order_data)
        assert response.status_code == 200
        data = response.json()
        
        # Order should be approved but with finance alert
        assert data["status"] == "approved"
        assert "finance_alert" in data
        assert "below minimum" in data["finance_alert"].lower() or "finance notified" in data["finance_alert"].lower()
        
        print(f"PASSED: Finance Alert Below Minimum - Alert: {data['finance_alert'][:60]}...")
        
        # Restore escrow balance
        restore_data = {"amount": 50000 - target_balance + 136, "reason": "Restore test balance"}
        requests.post(f"{BASE_URL}/api/beverage-orders/escrow/adjust", json=restore_data)

    def test_beverage_order_insufficient_funds(self):
        """POST /api/beverage-orders/order - returns finance_alert when insufficient"""
        # Drain escrow to very low
        response = requests.get(f"{BASE_URL}/api/beverage-orders/escrow")
        current_balance = response.json()["balance"]
        
        # Set balance to $50
        adjustment = 50 - current_balance
        adjust_data = {"amount": adjustment, "reason": "Test setup for insufficient funds"}
        requests.post(f"{BASE_URL}/api/beverage-orders/escrow/adjust", json=adjust_data)
        
        # Create order exceeding balance
        order_data = {
            "beo_id": "beo-test-004",
            "event_name": "TEST Insufficient Funds Order",
            "items": [{"beverage_id": "bv-008", "qty": 1}],  # Stella Keg $165
            "notes": "Test insufficient funds"
        }
        
        response = requests.post(f"{BASE_URL}/api/beverage-orders/order", json=order_data)
        assert response.status_code == 200
        data = response.json()
        
        # Order should be pending finance
        assert data["status"] == "pending_finance"
        assert "finance_alert" in data
        assert "insufficient" in data["finance_alert"].lower()
        assert data["escrow_check"]["sufficient"] == False
        
        print(f"PASSED: Insufficient Funds Alert - Status: {data['status']}, Alert: {data['finance_alert'][:50]}...")
        
        # Restore escrow balance
        restore_data = {"amount": 50000 - 50, "reason": "Restore test balance"}
        requests.post(f"{BASE_URL}/api/beverage-orders/escrow/adjust", json=restore_data)


class TestBEOBatchRunner:
    """Tests for multi-BEO batch runner and day simulation"""

    def test_day_simulation_creates_events(self):
        """POST /api/beo-batch/run-day-simulation - creates multiple events simultaneously"""
        response = requests.post(
            f"{BASE_URL}/api/beo-batch/run-day-simulation",
            params={"date": "2026-04-28", "event_count": 4}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify batch_summary
        assert "batch_summary" in data
        summary = data["batch_summary"]
        assert summary["events_created"] == 4
        assert "total_covers" in summary
        assert "total_projected_revenue" in summary
        assert "rooms_used" in summary
        assert "events_per_second" in summary
        
        # Verify events array
        assert "events" in data
        assert len(data["events"]) == 4
        
        # Verify event structure
        event = data["events"][0]
        assert "beo_number" in event
        assert "beo_id" in event
        assert "company" in event
        assert "room" in event
        assert "covers" in event
        assert "revenue" in event
        
        print(f"PASSED: Day Simulation - {summary['events_created']} events, {summary['total_covers']} covers, ${summary['total_projected_revenue']:,.2f} revenue")

    def test_day_simulation_returns_time_savings(self):
        """POST /api/beo-batch/run-day-simulation - returns time_savings with hours_saved"""
        response = requests.post(
            f"{BASE_URL}/api/beo-batch/run-day-simulation",
            params={"date": "2026-04-29", "event_count": 3}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify time_savings
        assert "time_savings" in data
        savings = data["time_savings"]
        assert "manual_hours" in savings
        assert "echo_hours" in savings
        assert "hours_saved" in savings
        assert "cost_saved" in savings
        
        # Hours saved should be positive
        assert savings["hours_saved"] > 0
        assert savings["manual_hours"] > savings["echo_hours"]
        
        print(f"PASSED: Time Savings - Manual: {savings['manual_hours']}h, Echo: {savings['echo_hours']}h, Saved: {savings['hours_saved']}h")

    def test_day_simulation_returns_day_operations(self):
        """POST /api/beo-batch/run-day-simulation - returns day_operations with total_staff_needed"""
        response = requests.post(
            f"{BASE_URL}/api/beo-batch/run-day-simulation",
            params={"date": "2026-04-30", "event_count": 5}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify day_operations
        assert "day_operations" in data
        ops = data["day_operations"]
        assert "total_staff_needed" in ops
        assert "schedules" in ops
        assert "beo_ids_for_consolidation" in ops
        
        # Verify schedules
        assert len(ops["schedules"]) == 5
        schedule = ops["schedules"][0]
        assert "beo" in schedule
        assert "room" in schedule
        assert "covers" in schedule
        assert "captains" in schedule
        assert "servers" in schedule
        assert "total_staff" in schedule
        
        print(f"PASSED: Day Operations - Total staff needed: {ops['total_staff_needed']}, Schedules: {len(ops['schedules'])}")

    def test_day_simulation_performance(self):
        """POST /api/beo-batch/run-day-simulation - verifies events_per_second performance"""
        response = requests.post(
            f"{BASE_URL}/api/beo-batch/run-day-simulation",
            params={"date": "2026-05-01", "event_count": 6}
        )
        assert response.status_code == 200
        data = response.json()
        
        summary = data["batch_summary"]
        events_per_second = summary["events_per_second"]
        creation_time = summary["creation_time_seconds"]
        
        # Should be reasonably fast (at least 1 event per second)
        assert events_per_second >= 1.0
        
        print(f"PASSED: Batch Performance - {summary['events_created']} events in {creation_time}s ({events_per_second} events/sec)")


class TestLaborEfficiency:
    """Tests for labor efficiency tracking"""

    def test_record_labor_entry(self):
        """POST /api/beo-batch/labor-entry - records scheduled vs actual labor time"""
        entry_data = {
            "beo_id": "beo-test-labor-001",
            "staff_id": "staff-001",
            "task": "prep",
            "scheduled_minutes": 60,
            "actual_minutes": 75,
            "station": "cold_prep",
            "notes": "Test labor entry"
        }
        
        response = requests.post(f"{BASE_URL}/api/beo-batch/labor-entry", json=entry_data)
        assert response.status_code == 200
        data = response.json()
        
        # Verify entry structure
        assert "id" in data
        assert data["id"].startswith("lab-")
        assert data["beo_id"] == "beo-test-labor-001"
        assert data["task"] == "prep"
        assert data["scheduled_minutes"] == 60
        assert data["actual_minutes"] == 75
        assert data["station"] == "cold_prep"
        
        # Verify calculated fields
        assert "variance_minutes" in data
        assert data["variance_minutes"] == 15  # 75 - 60
        assert "efficiency_pct" in data
        assert data["efficiency_pct"] == 80.0  # 60/75 * 100
        
        print(f"PASSED: Labor Entry - Task: {data['task']}, Efficiency: {data['efficiency_pct']}%")

    def test_record_multiple_labor_entries(self):
        """Record multiple labor entries for analytics testing"""
        entries = [
            {"beo_id": "beo-test-labor-002", "staff_id": "staff-002", "task": "cooking", 
             "scheduled_minutes": 90, "actual_minutes": 85, "station": "hot_line"},
            {"beo_id": "beo-test-labor-002", "staff_id": "staff-003", "task": "plating", 
             "scheduled_minutes": 45, "actual_minutes": 50, "station": "plating"},
            {"beo_id": "beo-test-labor-003", "staff_id": "staff-004", "task": "prep", 
             "scheduled_minutes": 120, "actual_minutes": 150, "station": "cold_prep"},
        ]
        
        for entry in entries:
            response = requests.post(f"{BASE_URL}/api/beo-batch/labor-entry", json=entry)
            assert response.status_code == 200
        
        print(f"PASSED: Multiple Labor Entries - {len(entries)} entries recorded")

    def test_labor_analytics(self):
        """GET /api/beo-batch/labor-analytics - returns overall_efficiency, by_station, bottlenecks"""
        response = requests.get(f"{BASE_URL}/api/beo-batch/labor-analytics")
        assert response.status_code == 200
        data = response.json()
        
        # Check if we have entries
        if "message" in data and "No labor entries" in data["message"]:
            # Create some entries first
            entries = [
                {"beo_id": "beo-analytics-001", "staff_id": "staff-a1", "task": "prep", 
                 "scheduled_minutes": 60, "actual_minutes": 80, "station": "cold_prep"},
                {"beo_id": "beo-analytics-001", "staff_id": "staff-a2", "task": "cooking", 
                 "scheduled_minutes": 90, "actual_minutes": 85, "station": "hot_line"},
            ]
            for entry in entries:
                requests.post(f"{BASE_URL}/api/beo-batch/labor-entry", json=entry)
            
            # Retry analytics
            response = requests.get(f"{BASE_URL}/api/beo-batch/labor-analytics")
            data = response.json()
        
        # Verify analytics structure
        assert "total_entries" in data
        assert "overall_efficiency" in data
        assert "by_station" in data
        assert "by_task" in data
        assert "bottlenecks" in data
        
        # Verify by_station structure
        if data["by_station"]:
            station_data = list(data["by_station"].values())[0]
            assert "scheduled" in station_data
            assert "actual" in station_data
            assert "efficiency" in station_data
        
        print(f"PASSED: Labor Analytics - {data['total_entries']} entries, Overall efficiency: {data['overall_efficiency']}%")

    def test_labor_analytics_identifies_bottlenecks(self):
        """GET /api/beo-batch/labor-analytics - identifies stations with <80% efficiency as bottlenecks"""
        # Create entries with a clear bottleneck
        bottleneck_entry = {
            "beo_id": "beo-bottleneck-001",
            "staff_id": "staff-bn1",
            "task": "setup",
            "scheduled_minutes": 30,
            "actual_minutes": 60,  # 50% efficiency - definite bottleneck
            "station": "banquet_setup"
        }
        
        response = requests.post(f"{BASE_URL}/api/beo-batch/labor-entry", json=bottleneck_entry)
        assert response.status_code == 200
        
        # Get analytics
        response = requests.get(f"{BASE_URL}/api/beo-batch/labor-analytics")
        assert response.status_code == 200
        data = response.json()
        
        # Check bottlenecks array
        assert "bottlenecks" in data
        # Bottlenecks should include stations with <80% efficiency
        if data["bottlenecks"]:
            bottleneck = data["bottlenecks"][0]
            assert "station" in bottleneck
            assert "efficiency" in bottleneck
            assert bottleneck["efficiency"] < 80
        
        print(f"PASSED: Bottleneck Detection - {len(data['bottlenecks'])} bottlenecks identified")


class TestBeverageOrdersList:
    """Tests for listing beverage orders"""

    def test_list_beverage_orders(self):
        """GET /api/beverage-orders/orders - lists all orders"""
        response = requests.get(f"{BASE_URL}/api/beverage-orders/orders")
        assert response.status_code == 200
        data = response.json()
        
        assert "orders" in data
        assert "total" in data
        
        if data["total"] > 0:
            order = data["orders"][0]
            assert "id" in order
            assert "items" in order
            assert "total_cost" in order
            assert "status" in order
        
        print(f"PASSED: List Beverage Orders - {data['total']} orders")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
