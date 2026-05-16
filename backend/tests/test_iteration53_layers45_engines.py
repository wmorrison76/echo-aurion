"""
Iteration 53: EchoAi³ Layers 4-5, Collective Intelligence, Ripple, Governance, Digital Twin
===========================================================================================
Tests for:
- Collective Intelligence Mesh (Borg-like anonymous pattern sharing)
- Layer 4: Simulation & Forecast Engine
- Layer 5: Adaptive Intelligence
- Event Ripple Engine
- Policy & Governance Engine
- Digital Twin Engine
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestCollectiveIntelligence:
    """Collective Intelligence Mesh - Anonymous pattern sharing"""
    
    def test_collective_status(self):
        """GET /api/echoai3/collective/status - mesh status and pattern counts"""
        r = requests.get(f"{BASE_URL}/api/echoai3/collective/status")
        assert r.status_code == 200
        data = r.json()
        assert "mesh_status" in data
        assert "settings" in data
        assert "categories" in data
        assert "isolation_level" in data
        assert data["isolation_level"] == "military-grade"
        print(f"✓ Collective status: {data['mesh_status']}, {len(data['categories'])} categories")
    
    def test_collective_enable_settings(self):
        """POST /api/echoai3/collective/settings - enable collective"""
        r = requests.post(f"{BASE_URL}/api/echoai3/collective/settings", json={
            "enabled": True,
            "contribute": True,
            "ingest": True
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("updated") == True
        assert data["settings"]["enabled"] == True
        assert data["settings"]["contribute"] == True
        print("✓ Collective enabled with contribute and ingest")
    
    def test_collective_contribute_patterns(self):
        """POST /api/echoai3/collective/contribute - extract and contribute anonymized patterns"""
        r = requests.post(f"{BASE_URL}/api/echoai3/collective/contribute")
        assert r.status_code == 200
        data = r.json()
        # Should have contributed patterns now that it's enabled
        assert "contributed" in data
        assert "batch_id" in data
        assert "isolation_verified" in data
        assert data.get("pii_check") == "passed"
        print(f"✓ Contributed {data['contributed']} patterns, batch: {data['batch_id']}")
    
    def test_collective_get_patterns(self):
        """GET /api/echoai3/collective/patterns - get collective patterns list"""
        r = requests.get(f"{BASE_URL}/api/echoai3/collective/patterns")
        assert r.status_code == 200
        data = r.json()
        assert "patterns" in data
        assert "count" in data
        assert "categories" in data
        print(f"✓ Retrieved {data['count']} patterns")
    
    def test_collective_insights(self):
        """GET /api/echoai3/collective/insights - get synthesized insights"""
        r = requests.get(f"{BASE_URL}/api/echoai3/collective/insights")
        assert r.status_code == 200
        data = r.json()
        assert "insights" in data
        # Should have insights now that collective is enabled
        print(f"✓ Retrieved {len(data.get('insights', []))} insights")
    
    def test_collective_audit(self):
        """GET /api/echoai3/collective/audit - get contribution audit trail"""
        r = requests.get(f"{BASE_URL}/api/echoai3/collective/audit")
        assert r.status_code == 200
        data = r.json()
        assert "contributions" in data
        assert "isolation_level" in data
        assert data["pii_status"] == "zero PII in any contribution"
        print(f"✓ Audit trail: {len(data['contributions'])} contributions")


class TestSimulationEngine:
    """Layer 4: Simulation & Forecast Engine"""
    
    def test_simulation_templates(self):
        """GET /api/echoai3/simulation/templates - returns 7 scenario templates"""
        r = requests.get(f"{BASE_URL}/api/echoai3/simulation/templates")
        assert r.status_code == 200
        data = r.json()
        assert "templates" in data
        templates = data["templates"]
        assert len(templates) == 7
        expected = ["banquet_change", "labor_adjustment", "menu_price_change", 
                    "vendor_substitution", "occupancy_shift", "event_cancellation", "overtime_cap"]
        for t in expected:
            assert t in templates, f"Missing template: {t}"
        print(f"✓ All 7 simulation templates present")
    
    def test_simulation_run_banquet_change(self):
        """POST /api/echoai3/simulation/run - run banquet_change simulation"""
        r = requests.post(f"{BASE_URL}/api/echoai3/simulation/run", json={
            "scenario_type": "banquet_change",
            "parameters": {
                "cover_delta": 100,
                "meal_type": "plated_dinner"
            }
        })
        assert r.status_code == 200
        data = r.json()
        assert "simulation_id" in data
        assert data["scenario_type"] == "banquet_change"
        assert "baseline" in data
        assert "result" in data
        result = data["result"]
        assert "deltas" in result
        assert "operational_impact" in result
        print(f"✓ Simulation {data['simulation_id']}: +100 covers, revenue delta: ${result['deltas']['revenue']['delta']:,.0f}")
    
    def test_simulation_forecast(self):
        """POST /api/echoai3/simulation/forecast - generate 30-day revenue forecast"""
        r = requests.post(f"{BASE_URL}/api/echoai3/simulation/forecast", json={
            "metric": "revenue",
            "horizon_days": 30
        })
        assert r.status_code == 200
        data = r.json()
        assert "forecast" in data
        forecast = data["forecast"]
        assert forecast["metric"] == "revenue"
        assert forecast["horizon_days"] == 30
        assert "daily_forecast" in forecast
        assert len(forecast["daily_forecast"]) == 30
        print(f"✓ 30-day revenue forecast: ${forecast['forecast_total']:,.0f} total")
    
    def test_simulation_history(self):
        """GET /api/echoai3/simulation/history - get simulation history"""
        r = requests.get(f"{BASE_URL}/api/echoai3/simulation/history")
        assert r.status_code == 200
        data = r.json()
        assert "simulations" in data
        assert "count" in data
        print(f"✓ Simulation history: {data['count']} entries")


class TestAdaptiveIntelligence:
    """Layer 5: Adaptive Intelligence & Learning"""
    
    def test_adaptive_accuracy(self):
        """GET /api/echoai3/adaptive/accuracy - get prediction accuracy stats"""
        r = requests.get(f"{BASE_URL}/api/echoai3/adaptive/accuracy")
        assert r.status_code == 200
        data = r.json()
        assert "accuracy" in data
        assert "timestamp" in data
        print(f"✓ Accuracy stats: {data['accuracy'].get('total_entries', 0)} calibration entries")
    
    def test_adaptive_calibrate(self):
        """POST /api/echoai3/adaptive/calibrate - submit calibration data"""
        r = requests.post(f"{BASE_URL}/api/echoai3/adaptive/calibrate", json={
            "metric": "revenue",
            "period": "2026-03",
            "forecast_value": 200000,
            "actual_value": 210000
        })
        assert r.status_code == 200
        data = r.json()
        assert "calibration_id" in data
        assert "error_pct" in data
        assert "accuracy_pct" in data
        # 210000 vs 200000 = 5% error
        assert data["error_pct"] == pytest.approx(4.76, rel=0.1)
        print(f"✓ Calibration {data['calibration_id']}: {data['accuracy_pct']}% accuracy")
    
    def test_adaptive_override(self):
        """POST /api/echoai3/adaptive/override - apply forecast override"""
        r = requests.post(f"{BASE_URL}/api/echoai3/adaptive/override", json={
            "metric": "revenue",
            "period": "2026-04",
            "original_forecast": 180000,
            "override_value": 195000,
            "source": "collective",
            "reason": "Seasonal adjustment based on collective patterns"
        })
        assert r.status_code == 200
        data = r.json()
        assert "override_id" in data
        assert "delta" in data
        assert data["delta"] == 15000
        assert data["status"] == "applied"
        print(f"✓ Override {data['override_id']}: +${data['delta']:,.0f} ({data['delta_pct']}%)")
    
    def test_adaptive_insights(self):
        """GET /api/echoai3/adaptive/insights - get learning insights"""
        r = requests.get(f"{BASE_URL}/api/echoai3/adaptive/insights")
        assert r.status_code == 200
        data = r.json()
        assert "insights" in data
        assert "summary" in data
        assert data["summary"]["learning_status"] == "active"
        print(f"✓ Adaptive insights: {len(data['insights'])} insights, {data['summary']['calibration_entries']} calibrations")
    
    def test_adaptive_feedback_summary(self):
        """GET /api/echoai3/adaptive/feedback-summary - get feedback analytics"""
        r = requests.get(f"{BASE_URL}/api/echoai3/adaptive/feedback-summary")
        assert r.status_code == 200
        data = r.json()
        assert "avg_rating" in data
        assert "total" in data
        assert "distribution" in data
        print(f"✓ Feedback summary: {data['total']} entries, avg rating {data['avg_rating']}")


class TestRippleEngine:
    """Event Ripple Engine - Cascading impact analysis"""
    
    def test_ripple_triggers(self):
        """GET /api/echoai3/ripple/triggers - returns 5 trigger types"""
        r = requests.get(f"{BASE_URL}/api/echoai3/ripple/triggers")
        assert r.status_code == 200
        data = r.json()
        assert "triggers" in data
        triggers = data["triggers"]
        assert len(triggers) == 5
        expected = ["cover_change", "menu_change", "timing_change", "venue_change", "dietary_change"]
        for t in expected:
            assert t in triggers, f"Missing trigger: {t}"
        print(f"✓ All 5 ripple triggers present")
    
    def test_ripple_propagate_cover_change(self):
        """POST /api/echoai3/ripple/propagate - propagate cover_change"""
        r = requests.post(f"{BASE_URL}/api/echoai3/ripple/propagate", json={
            "trigger_type": "cover_change",
            "trigger_params": {
                "cover_delta": 100,
                "meal_type": "plated_dinner",
                "lead_time_days": 2
            }
        })
        assert r.status_code == 200
        data = r.json()
        assert "ripple_id" in data
        assert data["trigger_type"] == "cover_change"
        assert "result" in data
        result = data["result"]
        assert "ripples" in result
        assert len(result["ripples"]) >= 4  # Should affect multiple modules
        assert "severity_summary" in data
        print(f"✓ Ripple {data['ripple_id']}: {result['total_modules_affected']} modules affected")
        print(f"  Severity: {data['severity_summary']}")


class TestGovernanceEngine:
    """Policy & Governance Engine"""
    
    def test_governance_authority_matrix(self):
        """GET /api/echoai3/governance/authority-matrix - returns 8 roles"""
        r = requests.get(f"{BASE_URL}/api/echoai3/governance/authority-matrix")
        assert r.status_code == 200
        data = r.json()
        assert "authority_matrix" in data
        matrix = data["authority_matrix"]
        assert len(matrix) == 8
        expected_roles = ["owner", "gm", "controller", "exec_chef", "director", "manager", "supervisor", "staff"]
        for role in expected_roles:
            assert role in matrix, f"Missing role: {role}"
        # Owner should have unlimited spending
        assert matrix["owner"]["spending_limit"] == "unlimited"
        print(f"✓ Authority matrix: {len(matrix)} roles defined")
    
    def test_governance_check_authority_denied(self):
        """POST /api/echoai3/governance/check-authority - manager denied for vendor_contracts at $10000"""
        r = requests.post(f"{BASE_URL}/api/echoai3/governance/check-authority", json={
            "role": "manager",
            "action_type": "vendor_contracts",
            "amount": 10000
        })
        assert r.status_code == 200
        data = r.json()
        assert data["approved"] == False
        assert "escalate_to" in data
        # Should escalate to owner or gm
        assert any(role in data["escalate_to"] for role in ["owner", "gm"])
        print(f"✓ Manager denied for $10K vendor_contracts, escalate to: {data['escalate_to']}")
    
    def test_governance_check_threshold_warning(self):
        """POST /api/echoai3/governance/check-threshold - food_cost_pct at 25 (warning)"""
        r = requests.post(f"{BASE_URL}/api/echoai3/governance/check-threshold", json={
            "metric": "food_cost_pct",
            "value": 25
        })
        assert r.status_code == 200
        data = r.json()
        assert data["metric"] == "food_cost_pct"
        assert data["value"] == 25
        assert data["status"] == "warning"  # 25% is above 22% warning threshold
        assert "recommended_action" in data
        print(f"✓ Food cost 25%: {data['status']} - {data['recommended_action'][:50]}...")
    
    def test_governance_compliance_audit(self):
        """GET /api/echoai3/governance/compliance-audit - run compliance audit"""
        r = requests.get(f"{BASE_URL}/api/echoai3/governance/compliance-audit")
        assert r.status_code == 200
        data = r.json()
        assert "compliance_score" in data
        assert "checks_performed" in data
        assert "violations" in data
        assert "brand_standards" in data
        print(f"✓ Compliance audit: {data['compliance_score']}% score, {data['violation_count']} violations")
    
    def test_governance_request_approval(self):
        """POST /api/echoai3/governance/request-approval - submit approval request"""
        r = requests.post(f"{BASE_URL}/api/echoai3/governance/request-approval", json={
            "requester_role": "manager",
            "requester_id": "mgr-001",
            "action_type": "vendor_contracts",
            "amount": 15000,
            "description": "New produce vendor contract",
            "urgency": "normal"
        })
        assert r.status_code == 200
        data = r.json()
        assert "approval_id" in data
        assert data["status"] == "pending_escalation"  # Manager can't approve $15K
        assert "authority_check" in data
        print(f"✓ Approval {data['approval_id']}: {data['status']}, approver: {data['approver']}")


class TestDigitalTwin:
    """Digital Twin Engine - Full property simulation"""
    
    def test_twin_subsystems(self):
        """GET /api/echoai3/twin/subsystems - returns 6 subsystems"""
        r = requests.get(f"{BASE_URL}/api/echoai3/twin/subsystems")
        assert r.status_code == 200
        data = r.json()
        assert "subsystems" in data
        subsystems = data["subsystems"]
        assert len(subsystems) == 6
        expected = ["kitchen", "inventory", "labor", "event", "revenue", "facility"]
        for s in expected:
            assert s in subsystems, f"Missing subsystem: {s}"
        print(f"✓ All 6 digital twin subsystems present")
    
    def test_twin_full_state(self):
        """GET /api/echoai3/twin/state - returns full twin state with health score"""
        r = requests.get(f"{BASE_URL}/api/echoai3/twin/state")
        assert r.status_code == 200
        data = r.json()
        assert "twin_state" in data
        assert "health_scores" in data
        assert "overall_health" in data
        assert "subsystem_count" in data
        assert data["subsystem_count"] == 6
        print(f"✓ Full twin state: overall health {data['overall_health']}%")
    
    def test_twin_kitchen_state(self):
        """GET /api/echoai3/twin/state/kitchen - returns kitchen twin with station utilization"""
        r = requests.get(f"{BASE_URL}/api/echoai3/twin/state/kitchen")
        assert r.status_code == 200
        data = r.json()
        assert "state" in data
        state = data["state"]
        assert state["subsystem"] == "kitchen"
        assert "stations" in state
        assert "overall_utilization" in state
        assert "active_recipes" in state
        print(f"✓ Kitchen twin: {len(state['stations'])} stations, {state['overall_utilization']}% utilization")
    
    def test_twin_stress_test(self):
        """POST /api/echoai3/twin/stress-test - run stress test on kitchen"""
        r = requests.post(f"{BASE_URL}/api/echoai3/twin/stress-test", json={
            "subsystem": "kitchen",
            "stress_type": "surge",
            "magnitude": 0.5,
            "duration_hours": 12
        })
        assert r.status_code == 200
        data = r.json()
        assert "test_id" in data
        assert data["subsystem"] == "kitchen"
        assert data["stress_type"] == "surge"
        assert "stress_impact" in data
        assert "resilience_score" in data
        assert "recommended_actions" in data
        print(f"✓ Stress test {data['test_id']}: resilience {data['resilience_score']}%")
        print(f"  Actions: {data['recommended_actions'][:2]}")


class TestEchoAi3ThinkEndpoint:
    """Test the main /think endpoint works end-to-end"""
    
    def test_think_endpoint(self):
        """POST /api/echoai3/think - full intelligence query"""
        r = requests.post(f"{BASE_URL}/api/echoai3/think", json={
            "query": "What is our current food cost percentage?",
            "user_id": "owner-001"
        })
        assert r.status_code == 200
        data = r.json()
        assert "message_id" in data
        assert "response" in data
        assert "session_id" in data
        assert "intent" in data
        assert "confidence" in data
        assert "data_sources" in data
        print(f"✓ Think endpoint: confidence {data['confidence']}%, sources: {data['data_sources'][:3]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
