"""
Iteration 100: EchoAi³ Stress Test Engine + 12 Departments Ops Pulse
=====================================================================
Tests:
1. Expanded Ops Pulse - 12 departments (was 7)
2. Stress test engine - /run and /mega-stress endpoints
3. Auto-actions system - auto_order, commissary_pull, approval_prompt
4. New departments: inventory_depletion, banquets, commissary, approvals, receiving
5. Regression tests: health, guidance endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# All 12 expected departments
EXPECTED_DEPARTMENTS = [
    "rooms", "food_beverage", "concierge", "engineering", "spa", "financial",
    "purchasing", "inventory_depletion", "banquets", "commissary", "approvals", "receiving"
]

# Auto-action types
EXPECTED_AUTO_ACTION_TYPES = ["auto_order", "commissary_pull", "approval_prompt"]


class TestHealthRegression:
    """Regression: Health endpoint still works"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data["status"] == "healthy"
        assert data["platform"] == "LUCCCA Enterprise"
        print(f"✓ Health check passed: {data['status']}")


class TestOpsPulseAnalyze12Departments:
    """Test GET /api/echoai3/ops-pulse/analyze returns 12 departments"""
    
    def test_analyze_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/analyze")
        assert response.status_code == 200, f"Analyze failed: {response.text}"
        print("✓ Ops Pulse analyze returns 200")
    
    def test_analyze_has_12_departments(self):
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/analyze")
        data = response.json()
        departments = data.get("departments", {})
        
        # Check all 12 departments exist
        for dept in EXPECTED_DEPARTMENTS:
            assert dept in departments, f"Missing department: {dept}"
        
        print(f"✓ All 12 departments present: {list(departments.keys())}")
    
    def test_analyze_inventory_depletion_dept(self):
        """inventory_depletion dept tracks beverage_below_par, spa_supplies_low, hk_supplies_low"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/analyze")
        data = response.json()
        inv_dept = data["departments"].get("inventory_depletion", {})
        
        assert "beverage_below_par" in inv_dept, "Missing beverage_below_par"
        assert "spa_supplies_low" in inv_dept, "Missing spa_supplies_low"
        assert "hk_supplies_low" in inv_dept, "Missing hk_supplies_low"
        assert "total_depletion_alerts" in inv_dept, "Missing total_depletion_alerts"
        assert "health" in inv_dept, "Missing health status"
        
        print(f"✓ inventory_depletion dept: beverage={inv_dept['beverage_below_par']}, spa={inv_dept['spa_supplies_low']}, hk={inv_dept['hk_supplies_low']}")
    
    def test_analyze_banquets_dept(self):
        """banquets dept tracks buffet_plans_today, active_events, event_covers"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/analyze")
        data = response.json()
        banq_dept = data["departments"].get("banquets", {})
        
        assert "buffet_plans_today" in banq_dept, "Missing buffet_plans_today"
        assert "active_events" in banq_dept, "Missing active_events"
        assert "total_event_covers" in banq_dept, "Missing total_event_covers"
        assert "beo_count" in banq_dept, "Missing beo_count"
        assert "health" in banq_dept, "Missing health status"
        
        print(f"✓ banquets dept: buffets={banq_dept['buffet_plans_today']}, events={banq_dept['active_events']}, covers={banq_dept['total_event_covers']}")
    
    def test_analyze_commissary_dept(self):
        """commissary dept tracks pending_pos, auto_generated, pending_approvals"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/analyze")
        data = response.json()
        comm_dept = data["departments"].get("commissary", {})
        
        assert "pending_pos" in comm_dept, "Missing pending_pos"
        assert "auto_generated" in comm_dept, "Missing auto_generated"
        assert "pending_approvals" in comm_dept, "Missing pending_approvals"
        assert "health" in comm_dept, "Missing health status"
        
        print(f"✓ commissary dept: pending_pos={comm_dept['pending_pos']}, auto_gen={comm_dept['auto_generated']}, approvals={comm_dept['pending_approvals']}")
    
    def test_analyze_approvals_dept(self):
        """approvals dept tracks po_approvals, recipe_approvals, governance_approvals"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/analyze")
        data = response.json()
        appr_dept = data["departments"].get("approvals", {})
        
        assert "po_approvals" in appr_dept, "Missing po_approvals"
        assert "recipe_approvals" in appr_dept, "Missing recipe_approvals"
        assert "governance_approvals" in appr_dept, "Missing governance_approvals"
        assert "pending_total" in appr_dept, "Missing pending_total"
        assert "health" in appr_dept, "Missing health status"
        
        print(f"✓ approvals dept: po={appr_dept['po_approvals']}, recipe={appr_dept['recipe_approvals']}, governance={appr_dept['governance_approvals']}")
    
    def test_analyze_receiving_dept(self):
        """receiving dept tracks unmapped_items, unmatched_invoices"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/analyze")
        data = response.json()
        recv_dept = data["departments"].get("receiving", {})
        
        assert "unmapped_items" in recv_dept, "Missing unmapped_items"
        assert "unmatched_invoices" in recv_dept, "Missing unmatched_invoices"
        assert "recent_scans" in recv_dept, "Missing recent_scans"
        assert "health" in recv_dept, "Missing health status"
        
        print(f"✓ receiving dept: unmapped={recv_dept['unmapped_items']}, unmatched={recv_dept['unmatched_invoices']}")
    
    def test_analyze_auto_actions_array(self):
        """auto_actions array includes auto_order, commissary_pull, approval_prompt types"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/analyze")
        data = response.json()
        auto_actions = data.get("auto_actions", [])
        
        assert isinstance(auto_actions, list), "auto_actions should be a list"
        
        # Check structure of auto_actions if any exist
        if auto_actions:
            for action in auto_actions:
                assert "type" in action, "auto_action missing 'type'"
                assert "dept" in action, "auto_action missing 'dept'"
                assert "action" in action, "auto_action missing 'action'"
            
            action_types = [a["type"] for a in auto_actions]
            print(f"✓ auto_actions present: {len(auto_actions)} actions, types: {set(action_types)}")
        else:
            print("✓ auto_actions array present (empty - no depletion alerts)")
    
    def test_analyze_hotel_score(self):
        """Verify hotel_score structure"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/analyze")
        data = response.json()
        score = data.get("hotel_score", {})
        
        assert "overall" in score, "Missing overall score"
        assert "grade" in score, "Missing grade"
        assert "breakdown" in score, "Missing breakdown"
        
        print(f"✓ hotel_score: overall={score['overall']}, grade={score['grade']}")


class TestStressTestRun:
    """Test POST /api/echoai3/stress/run endpoint"""
    
    def test_stress_run_small(self):
        """Run a small stress test with minimal operations"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/stress/run",
            params={
                "check_ins": 5,
                "ird_orders": 10,
                "concierge_tickets": 5,
                "spa_bookings": 3,
                "eng_tickets": 2,
                "guest_orders": 8,
                "inventory_depletions": 2,
                "purchase_orders": 2
            }
        )
        assert response.status_code == 200, f"Stress run failed: {response.text}"
        data = response.json()
        
        # Verify summary structure
        summary = data.get("summary", {})
        assert "total_operations" in summary, "Missing total_operations"
        assert "total_time_seconds" in summary, "Missing total_time_seconds"
        assert "operations_per_second" in summary, "Missing operations_per_second"
        assert "timings" in summary, "Missing timings"
        assert "bottleneck" in summary, "Missing bottleneck"
        assert "echoai3_response_time_ms" in summary, "Missing echoai3_response_time_ms"
        
        print(f"✓ Stress run: {summary['total_operations']} ops in {summary['total_time_seconds']}s ({summary['operations_per_second']} ops/sec)")
        print(f"  EchoAi³ analysis time: {summary['echoai3_response_time_ms']}ms")
    
    def test_stress_run_echoai3_analysis(self):
        """Verify echoai3_analysis includes hotel_score, departments, alerts, auto_actions"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/stress/run",
            params={
                "check_ins": 3,
                "ird_orders": 5,
                "concierge_tickets": 3,
                "spa_bookings": 2,
                "eng_tickets": 1,
                "guest_orders": 5,
                "inventory_depletions": 1,
                "purchase_orders": 1
            }
        )
        data = response.json()
        analysis = data.get("echoai3_analysis", {})
        
        assert "hotel_score" in analysis, "Missing hotel_score in echoai3_analysis"
        assert "departments" in analysis, "Missing departments in echoai3_analysis"
        assert "alerts_count" in analysis, "Missing alerts_count"
        assert "auto_actions" in analysis, "Missing auto_actions"
        assert "overall_health" in analysis, "Missing overall_health"
        
        print(f"✓ EchoAi³ analysis: score={analysis['hotel_score']['overall']}, health={analysis['overall_health']}, alerts={analysis['alerts_count']}")
    
    def test_stress_run_test_record(self):
        """Verify test_record is stored"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/stress/run",
            params={
                "check_ins": 2,
                "ird_orders": 3,
                "concierge_tickets": 2,
                "spa_bookings": 1,
                "eng_tickets": 1,
                "guest_orders": 3,
                "inventory_depletions": 1,
                "purchase_orders": 1
            }
        )
        data = response.json()
        test_record = data.get("test_record", {})
        
        assert "id" in test_record, "Missing id in test_record"
        assert "timestamp" in test_record, "Missing timestamp"
        assert "echoai3_hotel_score" in test_record, "Missing echoai3_hotel_score"
        assert "echoai3_alerts" in test_record, "Missing echoai3_alerts"
        assert "echoai3_auto_actions" in test_record, "Missing echoai3_auto_actions"
        
        print(f"✓ Test record stored: {test_record['id']}")


class TestMegaStress:
    """Test POST /api/echoai3/stress/mega-stress endpoint"""
    
    def test_mega_stress_multiplier_5(self):
        """Test mega-stress with multiplier=5 (195 ops)"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/stress/mega-stress",
            params={"multiplier": 5}
        )
        assert response.status_code == 200, f"Mega stress failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "multiplier" in data, "Missing multiplier"
        assert data["multiplier"] == 5, f"Expected multiplier 5, got {data['multiplier']}"
        assert "total_operations" in data, "Missing total_operations"
        assert "total_time_seconds" in data, "Missing total_time_seconds"
        assert "ops_per_second" in data, "Missing ops_per_second"
        assert "echoai3_analysis_time_ms" in data, "Missing echoai3_analysis_time_ms"
        assert "echoai3_can_handle" in data, "Missing echoai3_can_handle"
        assert "limits" in data, "Missing limits"
        assert "verdict" in data["limits"], "Missing verdict in limits"
        
        # Expected ops: 5*(5+10+8+3+2+8+2+1) = 5*39 = 195
        expected_ops = 5 * 39
        assert data["total_operations"] == expected_ops, f"Expected {expected_ops} ops, got {data['total_operations']}"
        
        print(f"✓ Mega stress (x5): {data['total_operations']} ops in {data['total_time_seconds']}s")
        print(f"  Throughput: {data['ops_per_second']} ops/sec")
        print(f"  EchoAi³ analysis: {data['echoai3_analysis_time_ms']}ms")
        print(f"  Verdict: {data['limits']['verdict']}")
    
    def test_mega_stress_echoai3_response(self):
        """Verify echoai3 response in mega-stress"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/stress/mega-stress",
            params={"multiplier": 3}
        )
        data = response.json()
        echoai3 = data.get("echoai3", {})
        
        assert "score" in echoai3, "Missing score"
        assert "grade" in echoai3, "Missing grade"
        assert "health" in echoai3, "Missing health"
        assert "alerts" in echoai3, "Missing alerts"
        assert "recommendations" in echoai3, "Missing recommendations"
        assert "auto_actions" in echoai3, "Missing auto_actions"
        
        print(f"✓ EchoAi³ under load: score={echoai3['score']}, grade={echoai3['grade']}, health={echoai3['health']}")
    
    def test_mega_stress_collection_sizes(self):
        """Verify collection_sizes are returned"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/stress/mega-stress",
            params={"multiplier": 2}
        )
        data = response.json()
        sizes = data.get("collection_sizes", {})
        
        expected_collections = ["pms_reservations", "ird_orders", "guest_orders", "concierge_tickets", "eng_tickets", "spa_appointments", "purchase_orders"]
        for coll in expected_collections:
            assert coll in sizes, f"Missing collection size: {coll}"
        
        print(f"✓ Collection sizes: {sizes}")


class TestStressHistory:
    """Test GET /api/echoai3/stress/history endpoint"""
    
    def test_stress_history(self):
        """Verify stress test history is returned"""
        response = requests.get(f"{BASE_URL}/api/echoai3/stress/history")
        assert response.status_code == 200, f"History failed: {response.text}"
        data = response.json()
        
        assert "tests" in data, "Missing tests array"
        assert "total" in data, "Missing total count"
        assert isinstance(data["tests"], list), "tests should be a list"
        
        if data["tests"]:
            test = data["tests"][0]
            assert "id" in test, "Missing id in history record"
            assert "timestamp" in test, "Missing timestamp"
            assert "summary" in test, "Missing summary"
        
        print(f"✓ Stress history: {data['total']} total tests, showing {len(data['tests'])}")


class TestOpsPulseGuidanceRegression:
    """Regression: GET /api/echoai3/ops-pulse/guidance still works"""
    
    def test_guidance_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/guidance")
        assert response.status_code == 200, f"Guidance failed: {response.text}"
        data = response.json()
        
        assert "hotel_score" in data, "Missing hotel_score"
        assert "grade" in data, "Missing grade"
        assert "status" in data, "Missing status"
        assert "top_actions" in data, "Missing top_actions"
        assert "departments_needing_attention" in data, "Missing departments_needing_attention"
        
        print(f"✓ Guidance: score={data['hotel_score']}, grade={data['grade']}, status={data['status']}")
        print(f"  Departments needing attention: {data['departments_needing_attention']}")


class TestOpsPulseHistoryRegression:
    """Regression: GET /api/echoai3/ops-pulse/history still works"""
    
    def test_history_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/history")
        assert response.status_code == 200, f"History failed: {response.text}"
        data = response.json()
        
        assert "pulses" in data, "Missing pulses array"
        assert "total" in data, "Missing total count"
        
        print(f"✓ Ops Pulse history: {data['total']} total pulses")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
