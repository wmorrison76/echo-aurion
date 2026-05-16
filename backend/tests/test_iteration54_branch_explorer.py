"""
Test Suite for Iteration 54: Scenario Branch Explorer
=====================================================
Tests the new multi-step decision tree analysis tool that chains scenarios
and computes compounding impacts.

Features tested:
- POST /api/echoai3/simulation/branch - Run multi-step branch with various scenarios
- POST /api/echoai3/simulation/branch - Verify compounding effects
- POST /api/echoai3/simulation/branch - Verify summary contains verdict, ebitda_change_pct, cumulative_deltas
- POST /api/echoai3/simulation/branch - Verify nodes contain step_deltas and cumulative_state
- GET /api/echoai3/simulation/branches - List saved branch explorations
- GET /api/echoai3/simulation/branch/{branch_id} - Retrieve specific branch result
- Error handling: empty steps list, unknown scenario type
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cfo-toolkit-deploy.preview.emergentagent.com').rstrip('/')


class TestBranchExplorerEndpoints:
    """Test the Branch Explorer API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_branch_ids = []
        yield
        # Cleanup is not needed as branches are stored for history
    
    # ─── Test 1: Run multi-step branch with 3 steps ───
    def test_run_branch_with_three_steps(self):
        """Test running a branch with banquet_change, labor_adjustment, menu_price_change"""
        payload = {
            "steps": [
                {
                    "scenario_type": "banquet_change",
                    "parameters": {"cover_delta": 50, "meal_type": "plated_dinner"},
                    "label": "Add 50 covers for plated dinner"
                },
                {
                    "scenario_type": "labor_adjustment",
                    "parameters": {"headcount_delta": 2, "department": "kitchen", "shift_type": "full_time", "period_days": 30},
                    "label": "Add 2 kitchen staff"
                },
                {
                    "scenario_type": "menu_price_change",
                    "parameters": {"price_change_pct": 5, "item_category": "entrees", "demand_elasticity": -0.3},
                    "label": "Increase entree prices 5%"
                }
            ],
            "name": "TEST_Three_Step_Branch"
        }
        
        response = self.session.post(f"{BASE_URL}/api/echoai3/simulation/branch", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify branch_id is returned
        assert "branch_id" in data, "Response should contain branch_id"
        assert data["branch_id"].startswith("branch-"), f"branch_id should start with 'branch-', got {data['branch_id']}"
        self.created_branch_ids.append(data["branch_id"])
        
        # Verify name
        assert data.get("name") == "TEST_Three_Step_Branch", f"Name mismatch: {data.get('name')}"
        
        # Verify nodes
        assert "nodes" in data, "Response should contain nodes"
        assert len(data["nodes"]) == 3, f"Expected 3 nodes, got {len(data['nodes'])}"
        
        # Verify summary
        assert "summary" in data, "Response should contain summary"
        summary = data["summary"]
        assert "total_steps" in summary, "Summary should contain total_steps"
        assert summary["total_steps"] == 3, f"Expected 3 total_steps, got {summary['total_steps']}"
        
        # Verify timestamp
        assert "timestamp" in data, "Response should contain timestamp"
        
        print(f"✓ Branch created with ID: {data['branch_id']}")
        print(f"✓ Total steps: {summary['total_steps']}")
        print(f"✓ Verdict: {summary.get('verdict')}")
    
    # ─── Test 2: Verify compounding effects ───
    def test_compounding_effects(self):
        """Verify each step builds on modified baseline from previous step"""
        payload = {
            "steps": [
                {
                    "scenario_type": "banquet_change",
                    "parameters": {"cover_delta": 100, "meal_type": "buffet_dinner"},
                    "label": "Step 1: Add 100 buffet covers"
                },
                {
                    "scenario_type": "banquet_change",
                    "parameters": {"cover_delta": 50, "meal_type": "plated_lunch"},
                    "label": "Step 2: Add 50 plated lunch covers"
                }
            ],
            "name": "TEST_Compounding_Effects"
        }
        
        response = self.session.post(f"{BASE_URL}/api/echoai3/simulation/branch", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        nodes = data["nodes"]
        
        # Verify step 1 cumulative state
        step1 = nodes[0]
        assert "cumulative_state" in step1, "Step 1 should have cumulative_state"
        step1_revenue = step1["cumulative_state"]["revenue"]
        
        # Verify step 2 cumulative state builds on step 1
        step2 = nodes[1]
        assert "cumulative_state" in step2, "Step 2 should have cumulative_state"
        step2_revenue = step2["cumulative_state"]["revenue"]
        
        # Step 2 revenue should be different from step 1 (compounding)
        assert step2_revenue != step1_revenue, "Step 2 should have different revenue than step 1 (compounding effect)"
        
        # Verify cumulative_deltas in summary
        summary = data["summary"]
        assert "cumulative_deltas" in summary, "Summary should contain cumulative_deltas"
        
        # The cumulative delta should be the sum of both steps
        total_revenue_delta = summary["cumulative_deltas"]["revenue"]
        step1_delta = step1.get("step_deltas", {}).get("revenue", 0)
        step2_delta = step2.get("step_deltas", {}).get("revenue", 0)
        
        # Allow small floating point differences
        expected_total = step1_delta + step2_delta
        assert abs(total_revenue_delta - expected_total) < 1, f"Cumulative delta {total_revenue_delta} should equal sum of step deltas {expected_total}"
        
        print(f"✓ Step 1 revenue: ${step1_revenue:,.2f}")
        print(f"✓ Step 2 revenue: ${step2_revenue:,.2f}")
        print(f"✓ Cumulative revenue delta: ${total_revenue_delta:,.2f}")
    
    # ─── Test 3: Verify summary contains verdict and ebitda_change_pct ───
    def test_summary_verdict_and_ebitda(self):
        """Verify summary contains verdict (FAVORABLE/UNFAVORABLE), ebitda_change_pct, cumulative_deltas"""
        # Test FAVORABLE scenario (adding revenue)
        payload_favorable = {
            "steps": [
                {
                    "scenario_type": "banquet_change",
                    "parameters": {"cover_delta": 200, "meal_type": "plated_dinner"},
                    "label": "Add 200 high-margin covers"
                }
            ],
            "name": "TEST_Favorable_Verdict"
        }
        
        response = self.session.post(f"{BASE_URL}/api/echoai3/simulation/branch", json=payload_favorable)
        assert response.status_code == 200
        
        data = response.json()
        summary = data["summary"]
        
        # Verify verdict exists and is valid
        assert "verdict" in summary, "Summary should contain verdict"
        assert summary["verdict"] in ["FAVORABLE", "UNFAVORABLE", "NEUTRAL"], f"Invalid verdict: {summary['verdict']}"
        
        # Verify ebitda_change_pct exists
        assert "ebitda_change_pct" in summary, "Summary should contain ebitda_change_pct"
        assert isinstance(summary["ebitda_change_pct"], (int, float)), "ebitda_change_pct should be numeric"
        
        # Verify cumulative_deltas exists with expected keys
        assert "cumulative_deltas" in summary, "Summary should contain cumulative_deltas"
        deltas = summary["cumulative_deltas"]
        expected_keys = ["revenue", "food_cost", "labor_cost", "ebitda", "total_covers"]
        for key in expected_keys:
            assert key in deltas, f"cumulative_deltas should contain {key}"
        
        # Verify baseline and final_state
        assert "baseline" in summary, "Summary should contain baseline"
        assert "final_state" in summary, "Summary should contain final_state"
        
        print(f"✓ Verdict: {summary['verdict']}")
        print(f"✓ EBITDA change: {summary['ebitda_change_pct']}%")
        print(f"✓ Cumulative deltas: {deltas}")
    
    # ─── Test 4: Verify nodes contain step_deltas and cumulative_state ───
    def test_nodes_structure(self):
        """Verify each node contains step_deltas and cumulative_state"""
        payload = {
            "steps": [
                {
                    "scenario_type": "vendor_substitution",
                    "parameters": {"cost_change_pct": -10, "ingredient_category": "proteins", "quality_impact": "neutral"},
                    "label": "Switch to cheaper protein vendor"
                },
                {
                    "scenario_type": "overtime_cap",
                    "parameters": {"max_weekly_ot_hours": 8},
                    "label": "Cap overtime at 8 hours"
                }
            ],
            "name": "TEST_Node_Structure"
        }
        
        response = self.session.post(f"{BASE_URL}/api/echoai3/simulation/branch", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        nodes = data["nodes"]
        
        for i, node in enumerate(nodes):
            # Verify required fields
            assert "step" in node, f"Node {i} should have step number"
            assert node["step"] == i + 1, f"Node {i} step should be {i + 1}"
            
            assert "label" in node, f"Node {i} should have label"
            assert "scenario_type" in node, f"Node {i} should have scenario_type"
            
            # Verify step_deltas
            assert "step_deltas" in node, f"Node {i} should have step_deltas"
            step_deltas = node["step_deltas"]
            assert isinstance(step_deltas, dict), f"step_deltas should be a dict"
            
            # Verify cumulative_state
            assert "cumulative_state" in node, f"Node {i} should have cumulative_state"
            cumulative_state = node["cumulative_state"]
            assert isinstance(cumulative_state, dict), f"cumulative_state should be a dict"
            
            # Verify cumulative_state has expected financial metrics
            expected_metrics = ["revenue", "food_cost", "labor_cost", "ebitda"]
            for metric in expected_metrics:
                assert metric in cumulative_state, f"cumulative_state should contain {metric}"
            
            print(f"✓ Node {i + 1}: {node['label']}")
            print(f"  - step_deltas: {step_deltas}")
            print(f"  - cumulative_state: revenue=${cumulative_state['revenue']:,.0f}, ebitda=${cumulative_state['ebitda']:,.0f}")
    
    # ─── Test 5: List saved branch explorations ───
    def test_list_branches(self):
        """Test GET /api/echoai3/simulation/branches returns list of branches"""
        response = self.session.get(f"{BASE_URL}/api/echoai3/simulation/branches")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "branches" in data, "Response should contain branches array"
        assert "count" in data, "Response should contain count"
        
        branches = data["branches"]
        assert isinstance(branches, list), "branches should be a list"
        
        # Verify count matches
        assert data["count"] == len(branches), f"Count {data['count']} should match branches length {len(branches)}"
        
        # If there are branches, verify structure
        if len(branches) > 0:
            branch = branches[0]
            assert "branch_id" in branch, "Branch should have branch_id"
            assert "name" in branch, "Branch should have name"
            assert "created_at" in branch, "Branch should have created_at"
            
            # Summary should be included
            if "summary" in branch:
                assert "verdict" in branch["summary"], "Summary should have verdict"
        
        print(f"✓ Found {data['count']} branches")
    
    # ─── Test 6: Retrieve specific branch result ───
    def test_get_specific_branch(self):
        """Test GET /api/echoai3/simulation/branch/{branch_id}"""
        # First create a branch
        payload = {
            "steps": [
                {
                    "scenario_type": "occupancy_shift",
                    "parameters": {"occupancy_delta_pct": 15, "capture_rate": 0.7, "period_days": 30},
                    "label": "15% occupancy increase"
                }
            ],
            "name": "TEST_Retrieve_Branch"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/echoai3/simulation/branch", json=payload)
        assert create_response.status_code == 200
        
        branch_id = create_response.json()["branch_id"]
        
        # Now retrieve it
        get_response = self.session.get(f"{BASE_URL}/api/echoai3/simulation/branch/{branch_id}")
        assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}: {get_response.text}"
        
        data = get_response.json()
        
        # Verify it's the same branch
        assert data.get("branch_id") == branch_id, f"branch_id mismatch"
        assert data.get("name") == "TEST_Retrieve_Branch", f"name mismatch"
        
        # Verify full structure is returned
        assert "nodes" in data, "Should contain nodes"
        assert "summary" in data, "Should contain summary"
        assert "steps" in data, "Should contain original steps"
        
        print(f"✓ Retrieved branch: {branch_id}")
        print(f"✓ Name: {data['name']}")
        print(f"✓ Verdict: {data['summary']['verdict']}")
    
    # ─── Test 7: Error handling - empty steps list ───
    def test_error_empty_steps(self):
        """Test error handling when steps list is empty"""
        payload = {
            "steps": [],
            "name": "TEST_Empty_Steps"
        }
        
        response = self.session.post(f"{BASE_URL}/api/echoai3/simulation/branch", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Should return error message
        assert "error" in data, "Should return error for empty steps"
        assert "at least one" in data["error"].lower() or "required" in data["error"].lower(), f"Error message should mention steps required: {data['error']}"
        
        print(f"✓ Empty steps error: {data['error']}")
    
    # ─── Test 8: Error handling - unknown scenario type ───
    def test_error_unknown_scenario_type(self):
        """Test error handling when scenario type is unknown"""
        payload = {
            "steps": [
                {
                    "scenario_type": "unknown_scenario_xyz",
                    "parameters": {"foo": "bar"},
                    "label": "Unknown scenario"
                }
            ],
            "name": "TEST_Unknown_Scenario"
        }
        
        response = self.session.post(f"{BASE_URL}/api/echoai3/simulation/branch", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # The branch should still be created but the node should have an error
        assert "nodes" in data, "Should still return nodes"
        
        if len(data["nodes"]) > 0:
            node = data["nodes"][0]
            # Node should contain error about unknown scenario
            assert "error" in node, f"Node should contain error for unknown scenario: {node}"
            assert "unknown" in node["error"].lower(), f"Error should mention unknown scenario: {node['error']}"
        
        print(f"✓ Unknown scenario handled gracefully")
    
    # ─── Test 9: Test all scenario types work in branch ───
    def test_all_scenario_types(self):
        """Test that all 7 scenario types work in a branch"""
        payload = {
            "steps": [
                {"scenario_type": "banquet_change", "parameters": {"cover_delta": 25, "meal_type": "reception"}, "label": "Banquet"},
                {"scenario_type": "labor_adjustment", "parameters": {"headcount_delta": 1, "department": "bar", "shift_type": "part_time", "period_days": 14}, "label": "Labor"},
                {"scenario_type": "menu_price_change", "parameters": {"price_change_pct": 3, "item_category": "beverages", "demand_elasticity": -0.2}, "label": "Menu"},
                {"scenario_type": "vendor_substitution", "parameters": {"cost_change_pct": -5, "ingredient_category": "produce", "quality_impact": "positive"}, "label": "Vendor"},
                {"scenario_type": "occupancy_shift", "parameters": {"occupancy_delta_pct": 10, "capture_rate": 0.6, "period_days": 7}, "label": "Occupancy"},
                {"scenario_type": "overtime_cap", "parameters": {"max_weekly_ot_hours": 12}, "label": "Overtime"},
            ],
            "name": "TEST_All_Scenarios"
        }
        
        response = self.session.post(f"{BASE_URL}/api/echoai3/simulation/branch", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        nodes = data["nodes"]
        
        # Verify all 6 nodes were created without errors
        assert len(nodes) == 6, f"Expected 6 nodes, got {len(nodes)}"
        
        for i, node in enumerate(nodes):
            assert "error" not in node, f"Node {i + 1} should not have error: {node.get('error')}"
            assert "cumulative_state" in node, f"Node {i + 1} should have cumulative_state"
        
        print(f"✓ All 6 scenario types executed successfully")
        print(f"✓ Final verdict: {data['summary']['verdict']}")
        print(f"✓ EBITDA change: {data['summary']['ebitda_change_pct']}%")
    
    # ─── Test 10: Verify narrative is generated ───
    def test_narrative_generation(self):
        """Test that AI narrative is generated for branch results"""
        payload = {
            "steps": [
                {
                    "scenario_type": "banquet_change",
                    "parameters": {"cover_delta": 75, "meal_type": "plated_dinner"},
                    "label": "Add 75 plated dinner covers"
                }
            ],
            "name": "TEST_Narrative"
        }
        
        response = self.session.post(f"{BASE_URL}/api/echoai3/simulation/branch", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Narrative may be empty if LLM fails (deterministic fallback)
        assert "narrative" in data, "Response should contain narrative field"
        
        # If narrative is present, it should be a string
        if data["narrative"]:
            assert isinstance(data["narrative"], str), "Narrative should be a string"
            print(f"✓ Narrative generated: {data['narrative'][:100]}...")
        else:
            print("✓ Narrative field present (empty - LLM fallback)")


class TestBranchExplorerIntegration:
    """Integration tests for Branch Explorer with other simulation endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        yield
    
    def test_branch_uses_same_baseline_as_simulation(self):
        """Verify branch uses same baseline as individual simulation"""
        # Run individual simulation
        sim_payload = {
            "scenario_type": "banquet_change",
            "parameters": {"cover_delta": 50, "meal_type": "plated_dinner"}
        }
        
        sim_response = self.session.post(f"{BASE_URL}/api/echoai3/simulation/run", json=sim_payload)
        assert sim_response.status_code == 200
        sim_data = sim_response.json()
        sim_baseline = sim_data.get("baseline", {})
        
        # Run branch with same scenario
        branch_payload = {
            "steps": [
                {
                    "scenario_type": "banquet_change",
                    "parameters": {"cover_delta": 50, "meal_type": "plated_dinner"},
                    "label": "Same as individual sim"
                }
            ],
            "name": "TEST_Baseline_Comparison"
        }
        
        branch_response = self.session.post(f"{BASE_URL}/api/echoai3/simulation/branch", json=branch_payload)
        assert branch_response.status_code == 200
        branch_data = branch_response.json()
        branch_baseline = branch_data.get("summary", {}).get("baseline", {})
        
        # Baselines should match (same data source)
        if sim_baseline and branch_baseline:
            # Allow for small timing differences in data
            assert abs(sim_baseline.get("revenue", 0) - branch_baseline.get("revenue", 0)) < 100, "Baselines should be similar"
        
        print("✓ Branch uses consistent baseline with individual simulations")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
