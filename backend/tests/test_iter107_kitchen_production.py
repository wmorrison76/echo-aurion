"""
Iteration 107: Kitchen Production Intelligence Tests
=====================================================
Tests for:
- Equipment status (3 working ovens, 1 in repair)
- Firing sequence engine with bottleneck detection
- Tip Pool management (4 departments)
- Guest Recovery with EchoAi3 three-lobe logic
- BEO verification (6 real Pier Sixty-Six BEOs)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestHealthCheck:
    """Basic health check"""
    
    def test_health(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("PASSED: Health check")


class TestEquipment:
    """Equipment status tests - 3 working ovens, 1 in repair"""
    
    def test_get_equipment_list(self):
        """GET /api/kitchen-production/equipment - returns all equipment with status"""
        response = requests.get(f"{BASE_URL}/api/kitchen-production/equipment")
        assert response.status_code == 200
        data = response.json()
        
        # Verify equipment list exists
        assert "equipment" in data
        assert "summary" in data
        assert len(data["equipment"]) > 0
        print(f"PASSED: Equipment list returned {len(data['equipment'])} items")
        
    def test_equipment_summary_counts(self):
        """Verify 3 working ovens, 1 in repair"""
        response = requests.get(f"{BASE_URL}/api/kitchen-production/equipment")
        assert response.status_code == 200
        data = response.json()
        
        summary = data["summary"]
        assert summary["working_ovens"] == 3, f"Expected 3 working ovens, got {summary['working_ovens']}"
        assert summary["in_repair"] == 1, f"Expected 1 in repair, got {summary['in_repair']}"
        print(f"PASSED: 3 working ovens, 1 in repair confirmed")
        
    def test_equipment_oven_capacity(self):
        """Verify total oven sheet pan capacity"""
        response = requests.get(f"{BASE_URL}/api/kitchen-production/equipment")
        assert response.status_code == 200
        data = response.json()
        
        # 3 working Rational ovens x 5 sheet pans each = 15 total
        summary = data["summary"]
        assert summary["total_oven_sheet_pan_capacity"] == 15, f"Expected 15 sheet pan capacity, got {summary['total_oven_sheet_pan_capacity']}"
        print(f"PASSED: Total oven capacity is 15 sheet pans")
        
    def test_equipment_types_present(self):
        """Verify equipment types: Rational ovens, Winston CVAP, hot boxes, CresCorr, Jade range, speed racks"""
        response = requests.get(f"{BASE_URL}/api/kitchen-production/equipment")
        assert response.status_code == 200
        data = response.json()
        
        equipment_types = set(e["type"] for e in data["equipment"])
        expected_types = {"combi_oven", "holding_cabinet", "hot_box", "insulated_cabinet", "range", "speed_rack"}
        
        for t in expected_types:
            assert t in equipment_types, f"Missing equipment type: {t}"
        print(f"PASSED: All equipment types present: {equipment_types}")


class TestBEOVerification:
    """Verify 6 real Pier Sixty-Six BEOs exist via beo-engine list endpoint"""
    
    def _get_beo_by_number(self, beo_number):
        """Helper to get BEO by number from list endpoint"""
        response = requests.get(f"{BASE_URL}/api/beo-engine/beos?limit=200")
        if response.status_code != 200:
            return None
        beos = response.json().get("beos", [])
        for beo in beos:
            if beo.get("beo_number") == beo_number:
                return beo
        return None
    
    def test_beo_7186_exists(self):
        """BEO #7186 - Caribbean Dinner with dietary restrictions"""
        beo = self._get_beo_by_number(7186)
        assert beo is not None, "BEO #7186 not found"
        assert beo["beo_number"] == 7186
        print(f"PASSED: BEO #7186 exists - {beo.get('event_name', 'N/A')}")
        
    def test_beo_7626_exists(self):
        """BEO #7626"""
        beo = self._get_beo_by_number(7626)
        assert beo is not None, "BEO #7626 not found"
        assert beo["beo_number"] == 7626
        print(f"PASSED: BEO #7626 exists - {beo.get('event_name', 'N/A')}")
        
    def test_beo_7628_exists(self):
        """BEO #7628 - late_beo with beverage consumption bar"""
        beo = self._get_beo_by_number(7628)
        assert beo is not None, "BEO #7628 not found"
        assert beo["beo_number"] == 7628
        print(f"PASSED: BEO #7628 exists - {beo.get('event_name', 'N/A')}")
        
    def test_beo_7167_exists(self):
        """BEO #7167 - Breakfast"""
        beo = self._get_beo_by_number(7167)
        assert beo is not None, "BEO #7167 not found"
        assert beo["beo_number"] == 7167
        print(f"PASSED: BEO #7167 exists - {beo.get('event_name', 'N/A')}")
        
    def test_beo_7187_exists(self):
        """BEO #7187"""
        beo = self._get_beo_by_number(7187)
        assert beo is not None, "BEO #7187 not found"
        assert beo["beo_number"] == 7187
        print(f"PASSED: BEO #7187 exists - {beo.get('event_name', 'N/A')}")
        
    def test_beo_7169_exists(self):
        """BEO #7169 - BBQ Lunch with full sections"""
        beo = self._get_beo_by_number(7169)
        assert beo is not None, "BEO #7169 not found"
        assert beo["beo_number"] == 7169
        print(f"PASSED: BEO #7169 exists - {beo.get('event_name', 'N/A')}")
        
    def test_beo_7186_has_menu_sections(self):
        """BEO #7186 has Caribbean Dinner menu with dietary restrictions"""
        beo = self._get_beo_by_number(7186)
        assert beo is not None, "BEO #7186 not found"
        
        menu = beo.get("menu", {})
        sections = menu.get("sections", [])
        assert len(sections) > 0, "BEO #7186 should have menu sections"
        print(f"PASSED: BEO #7186 has {len(sections)} menu sections")
        
    def test_beo_7169_has_bbq_menu(self):
        """BEO #7169 has BBQ Lunch menu with full sections"""
        beo = self._get_beo_by_number(7169)
        assert beo is not None, "BEO #7169 not found"
        
        menu = beo.get("menu", {})
        sections = menu.get("sections", [])
        assert len(sections) > 0, "BEO #7169 should have menu sections"
        print(f"PASSED: BEO #7169 has {len(sections)} menu sections")


class TestFiringSequence:
    """Firing sequence engine tests with bottleneck detection"""
    
    def test_firing_sequence_multi_beo_bottleneck(self):
        """POST /api/kitchen-production/firing-sequence with {beo_numbers:[7186,7169]} - detects bottleneck"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/firing-sequence",
            json={"beo_numbers": [7186, 7169], "fire_time": "17:30"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify bottleneck detection
        demand = data.get("demand", {})
        assert demand.get("has_bottleneck") == True, "Should detect bottleneck with 2 large BEOs"
        
        utilization = demand.get("utilization_pct", 0)
        assert utilization > 100, f"Utilization should exceed 100%, got {utilization}%"
        print(f"PASSED: Bottleneck detected - {utilization}% utilization")
        
    def test_firing_sequence_echostratus_solutions(self):
        """Verify EchoStratus solutions provided for bottleneck"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/firing-sequence",
            json={"beo_numbers": [7186, 7169], "fire_time": "17:30"}
        )
        assert response.status_code == 200
        data = response.json()
        
        solutions = data.get("echostratus_solutions", [])
        assert len(solutions) >= 3, f"Expected at least 3 solutions, got {len(solutions)}"
        
        solution_ids = [s["id"] for s in solutions]
        expected_solutions = ["preplated_rational", "staggered_firing", "winston_cvap_hold"]
        for sol in expected_solutions:
            assert sol in solution_ids, f"Missing solution: {sol}"
        print(f"PASSED: EchoStratus solutions provided: {solution_ids}")
        
    def test_firing_sequence_single_beo_returns_valid_response(self):
        """POST /api/kitchen-production/firing-sequence with {beo_numbers:[7167]} - single BEO returns valid firing sequence"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/firing-sequence",
            json={"beo_numbers": [7167], "fire_time": "08:00"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "demand" in data
        assert "firing_timeline" in data
        assert "equipment_status" in data
        assert "beos_firing" in data
        
        demand = data.get("demand", {})
        utilization = demand.get("utilization_pct", 0)
        
        # BEO #7167 is a 210-cover breakfast - may or may not bottleneck depending on menu
        # Just verify the calculation is reasonable
        assert utilization > 0, "Utilization should be calculated"
        
        # If bottleneck, solutions should be provided
        if demand.get("has_bottleneck"):
            solutions = data.get("echostratus_solutions", [])
            assert len(solutions) > 0, "Bottleneck should have solutions"
            print(f"PASSED: Single BEO #7167 - {utilization}% utilization (bottleneck detected, {len(solutions)} solutions provided)")
        else:
            print(f"PASSED: Single BEO #7167 - {utilization}% utilization (no bottleneck)")
        
    def test_firing_sequence_timeline_structure(self):
        """Verify firing timeline has proper structure"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/firing-sequence",
            json={"beo_numbers": [7186], "fire_time": "18:00"}
        )
        assert response.status_code == 200
        data = response.json()
        
        timeline = data.get("firing_timeline", [])
        assert len(timeline) > 0, "Should have firing timeline entries"
        
        # Check timeline entry structure
        entry = timeline[0]
        assert "wave" in entry
        assert "offset_min" in entry
        assert "action" in entry
        assert "detail" in entry
        print(f"PASSED: Firing timeline has {len(timeline)} entries with proper structure")
        
    def test_firing_sequence_equipment_status(self):
        """Verify equipment status in firing sequence response"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/firing-sequence",
            json={"beo_numbers": [7186], "fire_time": "18:00"}
        )
        assert response.status_code == 200
        data = response.json()
        
        equip = data.get("equipment_status", {})
        assert equip.get("working_ovens") == 3
        assert equip.get("total_oven_slots") == 15
        assert len(equip.get("in_repair", [])) == 1
        print(f"PASSED: Equipment status shows 3 working ovens, 15 slots, 1 in repair")


class TestTipPool:
    """Tip Pool management tests"""
    
    def test_tip_pool_departments(self):
        """GET /api/kitchen-production/tip-pool/departments - returns 4 department tip pools"""
        response = requests.get(f"{BASE_URL}/api/kitchen-production/tip-pool/departments")
        assert response.status_code == 200
        data = response.json()
        
        pools = data.get("pools", [])
        assert len(pools) == 4, f"Expected 4 tip pools, got {len(pools)}"
        
        departments = [p["department"] for p in pools]
        expected_depts = ["banquet_foh", "restaurant_foh", "ird", "pool_bar"]
        for dept in expected_depts:
            assert dept in departments, f"Missing department: {dept}"
        print(f"PASSED: 4 tip pools returned: {departments}")
        
    def test_tip_pool_positions(self):
        """Verify tipped positions in each pool"""
        response = requests.get(f"{BASE_URL}/api/kitchen-production/tip-pool/departments")
        assert response.status_code == 200
        data = response.json()
        
        for pool in data["pools"]:
            positions = pool.get("tipped_positions", [])
            assert len(positions) > 0, f"Pool {pool['department']} should have tipped positions"
            
            # Verify position structure
            pos = positions[0]
            assert "role" in pos
            assert "share_pct" in pos
            assert "hourly_min" in pos
        print(f"PASSED: All tip pools have tipped positions with proper structure")
        
    def test_tip_pool_calculate_with_comp(self):
        """POST /api/kitchen-production/tip-pool/calculate with {beo_number:7186, comp_pct:50} - tip pool stays on original BEO pricing"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/tip-pool/calculate",
            json={"beo_number": 7186, "comp_pct": 50, "department": "banquet_foh"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify tip pool based on original revenue
        assert data["beo_number"] == 7186
        assert data["comp_pct"] == 50
        assert data["original_revenue"] > 0
        assert data["comp_amount"] > 0
        assert data["total_tip_pool"] > 0
        
        # Tip pool should be based on original, not comped amount
        assert "tip_pool_note" in data
        assert "original" in data["tip_pool_note"].lower()
        
        # GL impact should show comp loss
        gl = data.get("gl_impact", {})
        assert gl.get("comp_loss") > 0
        print(f"PASSED: Tip pool ${data['total_tip_pool']:.2f} based on original ${data['original_revenue']:.2f}, comp loss ${data['comp_amount']:.2f}")
        
    def test_tip_pool_calculate_no_comp(self):
        """POST /api/kitchen-production/tip-pool/calculate with {beo_number:7169, comp_pct:0} - no comp, normal tip distribution"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/tip-pool/calculate",
            json={"beo_number": 7169, "comp_pct": 0, "department": "banquet_foh"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["beo_number"] == 7169
        assert data["comp_pct"] == 0
        assert data["comp_amount"] == 0
        assert data["original_revenue"] == data["revenue_after_comp"]
        
        # Verify distribution
        distribution = data.get("distribution", [])
        assert len(distribution) > 0
        total_share = sum(d["share_pct"] for d in distribution)
        assert total_share == 100, f"Distribution shares should sum to 100%, got {total_share}%"
        print(f"PASSED: No comp - tip pool ${data['total_tip_pool']:.2f} distributed to {len(distribution)} positions")
        
    def test_tip_pool_distribution_amounts(self):
        """Verify tip distribution amounts match percentages"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/tip-pool/calculate",
            json={"beo_number": 7186, "comp_pct": 0, "department": "banquet_foh"}
        )
        assert response.status_code == 200
        data = response.json()
        
        total_pool = data["total_tip_pool"]
        distribution = data["distribution"]
        
        for pos in distribution:
            expected_amount = round(total_pool * pos["share_pct"] / 100, 2)
            assert abs(pos["amount"] - expected_amount) < 0.02, f"Amount mismatch for {pos['role']}"
        print(f"PASSED: Distribution amounts match percentages")


class TestGuestRecovery:
    """Guest Recovery with EchoAi3 three-lobe logic tests"""
    
    def test_guest_recovery_irate_server_drops_table(self):
        """POST /api/kitchen-production/guest-recovery/evaluate with irate guest server_drops_table - three-lobe analysis"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/guest-recovery/evaluate",
            json={
                "incident_type": "server_drops_table",
                "severity": "high",
                "guest_reaction": "irate",
                "description": "Server dropped entire tray of entrees on guest table"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify three-lobe analysis
        three_lobe = data.get("three_lobe_analysis", {})
        assert "logical" in three_lobe
        assert "guest_satisfaction" in three_lobe
        assert "financial" in three_lobe
        
        # Each lobe should have comp_pct and reasoning
        for lobe in ["logical", "guest_satisfaction", "financial"]:
            assert "comp_pct" in three_lobe[lobe]
            assert "reasoning" in three_lobe[lobe]
        
        # Verify recovery actions
        recommendation = data.get("echoai3_recommendation", {})
        actions = recommendation.get("recovery_actions", [])
        assert len(actions) > 0, "Should have recovery actions"
        print(f"PASSED: Three-lobe analysis - Logical: {three_lobe['logical']['comp_pct']}%, Guest: {three_lobe['guest_satisfaction']['comp_pct']}%, Financial: {three_lobe['financial']['comp_pct']}%")
        
    def test_guest_recovery_disappointed_food_quality(self):
        """POST /api/kitchen-production/guest-recovery/evaluate with disappointed guest food_quality - lower comp recommendation"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/guest-recovery/evaluate",
            json={
                "incident_type": "food_quality",
                "severity": "medium",
                "guest_reaction": "disappointed",
                "description": "Steak overcooked"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        recommendation = data.get("echoai3_recommendation", {})
        comp_pct = recommendation.get("comp_pct", 0)
        
        # Disappointed + medium severity should have lower comp than irate + high
        assert comp_pct < 30, f"Disappointed guest should have lower comp, got {comp_pct}%"
        
        # Verify recovery probability
        probs = data.get("recovery_probability", {})
        assert probs.get("recovery_pct", 0) > 80, "Disappointed guest should have high recovery probability"
        print(f"PASSED: Disappointed guest - {comp_pct}% comp, {probs.get('recovery_pct')}% recovery probability")
        
    def test_guest_recovery_wont_return_food_allergy(self):
        """POST /api/kitchen-production/guest-recovery/evaluate with wont_return guest food_allergy - CRITICAL severity"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/guest-recovery/evaluate",
            json={
                "incident_type": "food_allergy",
                "severity": "critical",
                "guest_reaction": "wont_return",
                "description": "Guest with nut allergy served dish containing nuts"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        incident = data.get("incident", {})
        assert incident.get("severity") == "critical"
        assert incident.get("guest_reaction") == "wont_return"
        
        # Critical allergy incident should have specific recovery actions
        recommendation = data.get("echoai3_recommendation", {})
        actions = recommendation.get("recovery_actions", [])
        
        # Should include medical assistance and documentation
        actions_text = " ".join(actions).lower()
        assert "medical" in actions_text or "critical" in actions_text, "Food allergy should mention medical assistance"
        
        # Recovery probability should be low for wont_return
        probs = data.get("recovery_probability", {})
        assert probs.get("recovery_pct", 100) < 50, "wont_return guest should have low recovery probability"
        print(f"PASSED: Critical food allergy - {recommendation.get('comp_pct')}% comp, {probs.get('recovery_pct')}% recovery probability")
        
    def test_guest_recovery_scoring(self):
        """Verify scoring metrics in guest recovery response"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/guest-recovery/evaluate",
            json={
                "incident_type": "late_service",
                "severity": "low",
                "guest_reaction": "disappointed"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        scoring = data.get("scoring", {})
        assert "success_likelihood" in scoring
        assert "guest_return_likelihood" in scoring
        assert "referral_likelihood" in scoring
        print(f"PASSED: Scoring metrics present - Success: {scoring.get('success_likelihood')}, Return: {scoring.get('guest_return_likelihood')}")
        
    def test_guest_recovery_with_beo(self):
        """Test guest recovery with BEO number for financial context"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/guest-recovery/evaluate",
            json={
                "incident_type": "service_failure",
                "severity": "medium",
                "guest_reaction": "upset",
                "beo_number": 7186,
                "description": "Delayed service during dinner event"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        incident = data.get("incident", {})
        assert incident.get("beo_number") == 7186
        assert incident.get("event_revenue", 0) > 0, "Should have event revenue from BEO"
        
        recommendation = data.get("echoai3_recommendation", {})
        assert recommendation.get("comp_amount", 0) > 0, "Should calculate comp amount based on event revenue"
        print(f"PASSED: Guest recovery with BEO #7186 - Event revenue ${incident.get('event_revenue'):.2f}, Comp ${recommendation.get('comp_amount'):.2f}")


class TestEdgeCases:
    """Edge case tests"""
    
    def test_firing_sequence_invalid_beo(self):
        """Test firing sequence with non-existent BEO"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/firing-sequence",
            json={"beo_numbers": [99999], "fire_time": "18:00"}
        )
        assert response.status_code == 404
        print("PASSED: Invalid BEO returns 404")
        
    def test_tip_pool_invalid_beo(self):
        """Test tip pool calculation with non-existent BEO"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/tip-pool/calculate",
            json={"beo_number": 99999, "comp_pct": 0}
        )
        assert response.status_code == 404
        print("PASSED: Invalid BEO for tip pool returns 404")
        
    def test_tip_pool_invalid_department(self):
        """Test tip pool calculation with non-existent department"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/tip-pool/calculate",
            json={"beo_number": 7186, "comp_pct": 0, "department": "invalid_dept"}
        )
        assert response.status_code == 404
        print("PASSED: Invalid department returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
