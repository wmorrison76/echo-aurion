"""
Iteration 33 - Fresh Meal Systems Ops Dashboard Tests
=====================================================
Tests the new /api/fresh-meals/ops-dashboard endpoint which provides
real-time aggregated operations data for floor managers.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestOpsDashboard:
    """Tests for GET /api/fresh-meals/ops-dashboard endpoint"""
    
    def test_ops_dashboard_returns_200(self):
        """Verify ops-dashboard endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/ops-dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ ops-dashboard returns 200 OK")
    
    def test_ops_dashboard_has_timestamp(self):
        """Verify response includes timestamp"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/ops-dashboard")
        data = response.json()
        assert "timestamp" in data, "Missing timestamp field"
        assert data["timestamp"], "Timestamp should not be empty"
        print(f"✓ timestamp present: {data['timestamp']}")
    
    def test_ops_dashboard_production_section(self):
        """Verify production section has all required fields"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/ops-dashboard")
        data = response.json()
        
        assert "production" in data, "Missing production section"
        prod = data["production"]
        
        # Required fields
        required_fields = [
            "in_progress", "scheduled", "paused", "total_active_runs",
            "kits_in_queue", "labor_hours_pending", "kits_produced_today",
            "runs_completed_today", "active_runs"
        ]
        for field in required_fields:
            assert field in prod, f"Missing production.{field}"
        
        # Verify active_runs structure
        assert isinstance(prod["active_runs"], list), "active_runs should be a list"
        if len(prod["active_runs"]) > 0:
            run = prod["active_runs"][0]
            run_fields = ["run_id", "name", "status", "priority", "total_kits", 
                         "kits_produced", "progress_pct", "est_hours", "lane_id"]
            for field in run_fields:
                assert field in run, f"Missing active_runs[].{field}"
            # Verify progress_pct is a number between 0 and 1
            assert isinstance(run["progress_pct"], (int, float)), "progress_pct should be numeric"
            assert 0 <= run["progress_pct"] <= 1, f"progress_pct should be 0-1, got {run['progress_pct']}"
        
        print(f"✓ production section valid: {prod['in_progress']} in_progress, {prod['scheduled']} scheduled, {prod['paused']} paused")
        print(f"  kits_in_queue={prod['kits_in_queue']}, labor_hours_pending={prod['labor_hours_pending']}")
        print(f"  active_runs count: {len(prod['active_runs'])}")
    
    def test_ops_dashboard_lanes_section(self):
        """Verify lanes section has all required fields"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/ops-dashboard")
        data = response.json()
        
        assert "lanes" in data, "Missing lanes section"
        lanes = data["lanes"]
        
        # Required fields
        assert "total_active" in lanes, "Missing lanes.total_active"
        assert "avg_utilization" in lanes, "Missing lanes.avg_utilization"
        assert "lanes" in lanes, "Missing lanes.lanes array"
        
        # Verify lanes array structure
        assert isinstance(lanes["lanes"], list), "lanes.lanes should be a list"
        if len(lanes["lanes"]) > 0:
            lane = lanes["lanes"][0]
            lane_fields = ["lane_id", "lane_name", "lane_type", "effective_throughput",
                          "bottleneck", "assigned_runs", "kits_assigned", "max_capacity_8h",
                          "utilization_pct", "status"]
            for field in lane_fields:
                assert field in lane, f"Missing lanes[].{field}"
            
            # Verify status is one of expected values
            valid_statuses = ["overloaded", "busy", "available", "idle"]
            assert lane["status"] in valid_statuses, f"Invalid lane status: {lane['status']}"
            
            # Verify utilization_pct is numeric
            assert isinstance(lane["utilization_pct"], (int, float)), "utilization_pct should be numeric"
        
        print(f"✓ lanes section valid: {lanes['total_active']} active, avg_utilization={lanes['avg_utilization']}")
        print(f"  lanes count: {len(lanes['lanes'])}")
    
    def test_ops_dashboard_delivery_section(self):
        """Verify delivery section has all required fields"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/ops-dashboard")
        data = response.json()
        
        assert "delivery" in data, "Missing delivery section"
        delivery = data["delivery"]
        
        required_fields = ["total_routes", "total_stops", "total_distance_miles",
                          "total_delivery_cost", "cold_chain_routes"]
        for field in required_fields:
            assert field in delivery, f"Missing delivery.{field}"
        
        # Verify numeric types
        assert isinstance(delivery["total_routes"], int), "total_routes should be int"
        assert isinstance(delivery["total_stops"], int), "total_stops should be int"
        assert isinstance(delivery["total_distance_miles"], (int, float)), "total_distance_miles should be numeric"
        assert isinstance(delivery["total_delivery_cost"], (int, float)), "total_delivery_cost should be numeric"
        assert isinstance(delivery["cold_chain_routes"], int), "cold_chain_routes should be int"
        
        print(f"✓ delivery section valid: {delivery['total_routes']} routes, {delivery['total_stops']} stops")
        print(f"  distance={delivery['total_distance_miles']}mi, cost=${delivery['total_delivery_cost']}, cold_chain={delivery['cold_chain_routes']}")
    
    def test_ops_dashboard_subscriptions_section(self):
        """Verify subscriptions section has all required fields"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/ops-dashboard")
        data = response.json()
        
        assert "subscriptions" in data, "Missing subscriptions section"
        subs = data["subscriptions"]
        
        required_fields = ["active", "by_plan", "meals_next_cycle"]
        for field in required_fields:
            assert field in subs, f"Missing subscriptions.{field}"
        
        # Verify by_plan is a dict
        assert isinstance(subs["by_plan"], dict), "by_plan should be a dict"
        
        # Verify by_plan structure if not empty
        if subs["by_plan"]:
            for plan_type, info in subs["by_plan"].items():
                assert "subscribers" in info, f"Missing by_plan[{plan_type}].subscribers"
                assert "meals" in info, f"Missing by_plan[{plan_type}].meals"
        
        print(f"✓ subscriptions section valid: {subs['active']} active, meals_next_cycle={subs['meals_next_cycle']}")
        print(f"  by_plan: {subs['by_plan']}")
    
    def test_ops_dashboard_channel_distribution(self):
        """Verify channel_product_distribution is present and is a dict"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/ops-dashboard")
        data = response.json()
        
        assert "channel_product_distribution" in data, "Missing channel_product_distribution"
        dist = data["channel_product_distribution"]
        
        assert isinstance(dist, dict), "channel_product_distribution should be a dict"
        
        # Verify values are integers (product counts)
        for channel, count in dist.items():
            assert isinstance(count, int), f"channel_product_distribution[{channel}] should be int"
        
        print(f"✓ channel_product_distribution valid: {dist}")
    
    def test_ops_dashboard_alerts_section(self):
        """Verify alerts array is present and properly structured"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/ops-dashboard")
        data = response.json()
        
        assert "alerts" in data, "Missing alerts array"
        assert "alert_count" in data, "Missing alert_count"
        
        alerts = data["alerts"]
        assert isinstance(alerts, list), "alerts should be a list"
        assert data["alert_count"] == len(alerts), "alert_count should match alerts length"
        
        # Verify alert structure if any exist
        if len(alerts) > 0:
            alert = alerts[0]
            alert_fields = ["severity", "source", "message"]
            for field in alert_fields:
                assert field in alert, f"Missing alerts[].{field}"
            
            # Verify severity is valid
            valid_severities = ["critical", "urgent", "warning"]
            assert alert["severity"] in valid_severities, f"Invalid alert severity: {alert['severity']}"
        
        print(f"✓ alerts section valid: {data['alert_count']} alerts")
    
    def test_ops_dashboard_alerts_sorted_by_severity(self):
        """Verify alerts are sorted by severity (critical > urgent > warning)"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/ops-dashboard")
        data = response.json()
        
        alerts = data.get("alerts", [])
        if len(alerts) < 2:
            print("✓ alerts sorting: Not enough alerts to verify sorting (skipped)")
            return
        
        severity_order = {"critical": 0, "urgent": 1, "warning": 2}
        for i in range(len(alerts) - 1):
            current_sev = severity_order.get(alerts[i].get("severity", "warning"), 3)
            next_sev = severity_order.get(alerts[i+1].get("severity", "warning"), 3)
            assert current_sev <= next_sev, f"Alerts not sorted by severity at index {i}"
        
        print(f"✓ alerts properly sorted by severity")


class TestOpsDashboardDataIntegrity:
    """Tests for data integrity and aggregation logic"""
    
    def test_production_counts_match_active_runs(self):
        """Verify in_progress + scheduled + paused = total_active_runs"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/ops-dashboard")
        data = response.json()
        prod = data["production"]
        
        calculated_total = prod["in_progress"] + prod["scheduled"] + prod["paused"]
        assert calculated_total == prod["total_active_runs"], \
            f"Count mismatch: {prod['in_progress']}+{prod['scheduled']}+{prod['paused']}={calculated_total} != {prod['total_active_runs']}"
        
        print(f"✓ production counts match: {calculated_total} = total_active_runs")
    
    def test_lane_utilization_status_logic(self):
        """Verify lane status matches utilization_pct thresholds"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/ops-dashboard")
        data = response.json()
        
        for lane in data["lanes"]["lanes"]:
            util = lane["utilization_pct"]
            status = lane["status"]
            
            if util > 1.0:
                expected = "overloaded"
            elif util > 0.7:
                expected = "busy"
            elif util > 0:
                expected = "available"
            else:
                expected = "idle"
            
            assert status == expected, \
                f"Lane {lane['lane_name']}: utilization={util} should be '{expected}', got '{status}'"
        
        print(f"✓ lane utilization status logic verified for {len(data['lanes']['lanes'])} lanes")
    
    def test_active_runs_limited_to_10(self):
        """Verify active_runs array is limited to 10 items"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/ops-dashboard")
        data = response.json()
        
        active_runs = data["production"]["active_runs"]
        assert len(active_runs) <= 10, f"active_runs should be limited to 10, got {len(active_runs)}"
        
        print(f"✓ active_runs limited: {len(active_runs)} runs (max 10)")


class TestOpsDashboardPerformance:
    """Performance tests for ops-dashboard endpoint"""
    
    def test_response_time_under_2_seconds(self):
        """Verify endpoint responds within 2 seconds"""
        import time
        start = time.time()
        response = requests.get(f"{BASE_URL}/api/fresh-meals/ops-dashboard")
        duration = time.time() - start
        
        assert response.status_code == 200
        assert duration < 2.0, f"Response took {duration:.2f}s, expected < 2s"
        
        print(f"✓ response time: {duration:.3f}s (< 2s)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
