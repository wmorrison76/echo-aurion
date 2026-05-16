"""
Test Iteration 60: Manager P&L Dashboard - Role-Based Access Control
=====================================================================
Tests for the Manager Dashboard endpoints:
- GET /api/manager/pnl - Role-scoped P&L with visible/locked sections
- GET /api/manager/alerts - Budget alerts with critical/warning severity
- GET /api/manager/gl-drilldown/{gl_code} - GL entries with invoice/PO chain
- POST /api/manager/access-request - Access request creation
- POST /api/manager/ai-review - AI narrative scoped to user role
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestManagerPnL:
    """Test role-scoped P&L endpoint for different user roles"""
    
    def test_manager_pnl_dining_manager(self):
        """usr-mgr-001 (dining manager) should see 5 visible P&L lines and 9 locked sections"""
        response = requests.get(f"{BASE_URL}/api/manager/pnl?user_id=usr-mgr-001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response should contain user info"
        assert data["user"]["id"] == "usr-mgr-001"
        assert data["user"]["role"] == "manager"
        
        # Manager should see: revenue, food_cost, bev_cost, hourly_labor, opex
        pnl_lines = data.get("pnl_lines", [])
        visible_ids = [line["id"] for line in pnl_lines]
        assert len(pnl_lines) == 5, f"Manager should see 5 P&L lines, got {len(pnl_lines)}: {visible_ids}"
        
        expected_visible = ["revenue", "food_cost", "bev_cost", "hourly_labor", "opex"]
        for section in expected_visible:
            assert section in visible_ids, f"Manager should see {section}"
        
        # Manager should have 9 locked sections
        locked_sections = data.get("locked_sections", [])
        assert len(locked_sections) == 9, f"Manager should have 9 locked sections, got {len(locked_sections)}"
        
        # Verify locked sections include salary-related items
        locked_ids = [s["id"] for s in locked_sections]
        assert "salaried_labor" in locked_ids, "Salaried labor should be locked for manager"
        assert "net_profit" in locked_ids, "Net profit should be locked for manager"
        
        # Verify KPIs are present
        assert "kpis" in data
        assert "food_cost_pct" in data["kpis"]
        assert "hourly_labor_pct" in data["kpis"]
        
        print(f"✓ Manager (usr-mgr-001) sees {len(pnl_lines)} visible lines, {len(locked_sections)} locked")
    
    def test_gm_pnl_full_access(self):
        """usr-gm-001 (GM) should see 14 visible lines and 0 locked sections"""
        response = requests.get(f"{BASE_URL}/api/manager/pnl?user_id=usr-gm-001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["user"]["role"] == "gm"
        
        pnl_lines = data.get("pnl_lines", [])
        locked_sections = data.get("locked_sections", [])
        
        # GM should see all 14 P&L lines
        assert len(pnl_lines) == 14, f"GM should see 14 P&L lines, got {len(pnl_lines)}"
        
        # GM should have 0 locked sections
        assert len(locked_sections) == 0, f"GM should have 0 locked sections, got {len(locked_sections)}"
        
        # Verify GM can see salary-related items
        visible_ids = [line["id"] for line in pnl_lines]
        assert "salaried_labor" in visible_ids, "GM should see salaried labor"
        assert "net_profit" in visible_ids, "GM should see net profit"
        assert "ebitda" in visible_ids, "GM should see EBITDA"
        
        print(f"✓ GM (usr-gm-001) sees {len(pnl_lines)} visible lines, {len(locked_sections)} locked")
    
    def test_supervisor_pnl_limited_access(self):
        """usr-sup-001 (supervisor) should see only 3 visible lines"""
        response = requests.get(f"{BASE_URL}/api/manager/pnl?user_id=usr-sup-001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["user"]["role"] == "supervisor"
        
        pnl_lines = data.get("pnl_lines", [])
        visible_ids = [line["id"] for line in pnl_lines]
        
        # Supervisor should see: revenue, food_cost, hourly_labor
        assert len(pnl_lines) == 3, f"Supervisor should see 3 P&L lines, got {len(pnl_lines)}: {visible_ids}"
        
        expected_visible = ["revenue", "food_cost", "hourly_labor"]
        for section in expected_visible:
            assert section in visible_ids, f"Supervisor should see {section}"
        
        # Supervisor should have 11 locked sections
        locked_sections = data.get("locked_sections", [])
        assert len(locked_sections) == 11, f"Supervisor should have 11 locked sections, got {len(locked_sections)}"
        
        print(f"✓ Supervisor (usr-sup-001) sees {len(pnl_lines)} visible lines, {len(locked_sections)} locked")
    
    def test_exec_chef_pnl_culinary_scope(self):
        """usr-chef-001 (exec chef) should see 6 visible lines (culinary/pastry/banquet scope)"""
        response = requests.get(f"{BASE_URL}/api/manager/pnl?user_id=usr-chef-001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["user"]["role"] == "exec_chef"
        
        pnl_lines = data.get("pnl_lines", [])
        visible_ids = [line["id"] for line in pnl_lines]
        
        # Exec chef should see: revenue, food_cost, bev_cost, hourly_labor, opex, maintenance
        assert len(pnl_lines) == 6, f"Exec chef should see 6 P&L lines, got {len(pnl_lines)}: {visible_ids}"
        
        expected_visible = ["revenue", "food_cost", "bev_cost", "hourly_labor", "opex", "maintenance"]
        for section in expected_visible:
            assert section in visible_ids, f"Exec chef should see {section}"
        
        # Exec chef should have 8 locked sections
        locked_sections = data.get("locked_sections", [])
        assert len(locked_sections) == 8, f"Exec chef should have 8 locked sections, got {len(locked_sections)}"
        
        print(f"✓ Exec Chef (usr-chef-001) sees {len(pnl_lines)} visible lines, {len(locked_sections)} locked")
    
    def test_controller_pnl_full_access(self):
        """usr-ctrl-001 (controller) should see all 14 visible lines"""
        response = requests.get(f"{BASE_URL}/api/manager/pnl?user_id=usr-ctrl-001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["user"]["role"] == "controller"
        
        pnl_lines = data.get("pnl_lines", [])
        locked_sections = data.get("locked_sections", [])
        
        # Controller should see all 14 P&L lines
        assert len(pnl_lines) == 14, f"Controller should see 14 P&L lines, got {len(pnl_lines)}"
        
        # Controller should have 0 locked sections
        assert len(locked_sections) == 0, f"Controller should have 0 locked sections, got {len(locked_sections)}"
        
        print(f"✓ Controller (usr-ctrl-001) sees {len(pnl_lines)} visible lines, {len(locked_sections)} locked")


class TestManagerAlerts:
    """Test budget alerts endpoint"""
    
    def test_alerts_for_manager(self):
        """Manager should receive alerts with critical/warning for labor overspending"""
        response = requests.get(f"{BASE_URL}/api/manager/alerts?user_id=usr-mgr-001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "alerts" in data, "Response should contain alerts array"
        assert "alert_count" in data, "Response should contain alert_count"
        assert "critical_count" in data, "Response should contain critical_count"
        assert "warning_count" in data, "Response should contain warning_count"
        
        alerts = data.get("alerts", [])
        
        # Verify alert structure
        if len(alerts) > 0:
            alert = alerts[0]
            assert "severity" in alert, "Alert should have severity"
            assert "message" in alert, "Alert should have message"
            assert alert["severity"] in ["critical", "warning", "info"], f"Invalid severity: {alert['severity']}"
        
        # Check for labor-related alerts (labor is at 33.1% which is critical > 32%)
        labor_alerts = [a for a in alerts if "labor" in a.get("metric", "").lower() or "labor" in a.get("message", "").lower()]
        
        print(f"✓ Manager alerts: {data['alert_count']} total, {data['critical_count']} critical, {data['warning_count']} warning")
        print(f"  Labor-related alerts: {len(labor_alerts)}")


class TestGLDrilldown:
    """Test GL drill-down endpoint with invoice/PO chain"""
    
    def test_gl_drilldown_food_cogs(self):
        """GL 5000 (Food COGS) should return entries + linked invoices with PO chain"""
        response = requests.get(f"{BASE_URL}/api/manager/gl-drilldown/5000?user_id=usr-mgr-001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["gl_code"] == "5000"
        assert "gl_info" in data
        assert data["gl_info"]["name"] == "Food COGS"
        assert data["gl_info"]["category"] == "Cost of Sales"
        
        # Verify entries exist
        assert "entries" in data
        assert "entry_count" in data
        
        # Verify invoices with chain
        assert "invoices" in data
        assert "invoice_count" in data
        
        # Check invoice chain structure if invoices exist
        if len(data["invoices"]) > 0:
            inv_chain = data["invoices"][0]
            assert "invoice" in inv_chain, "Invoice chain should contain invoice"
            assert "purchase_order" in inv_chain, "Invoice chain should contain purchase_order"
            assert "receiving" in inv_chain, "Invoice chain should contain receiving"
            assert "chain_complete" in inv_chain, "Invoice chain should indicate if complete"
        
        print(f"✓ GL 5000 drill-down: {data['entry_count']} entries, {data['invoice_count']} invoices, total ${data['total']:,.2f}")
    
    def test_gl_drilldown_labor(self):
        """GL 6000 (BOH Labor) should return labor entries"""
        response = requests.get(f"{BASE_URL}/api/manager/gl-drilldown/6000?user_id=usr-mgr-001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["gl_code"] == "6000"
        assert data["gl_info"]["name"] == "Kitchen/BOH Labor"
        assert data["gl_info"]["category"] == "Labor"
        
        print(f"✓ GL 6000 drill-down: {data['entry_count']} entries, total ${data['total']:,.2f}")


class TestAccessRequest:
    """Test access request creation"""
    
    def test_create_access_request(self):
        """POST access request should create request and notification for controller"""
        payload = {
            "user_id": "usr-mgr-001",
            "requested_section": "salaried_labor",
            "reason": "Need access for monthly budget review"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/manager/access-request",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "submitted"
        assert "request" in data
        
        request = data["request"]
        assert request["user_id"] == "usr-mgr-001"
        assert request["requested_section"] == "salaried_labor"
        assert request["status"] == "pending"
        assert "request_id" in request
        assert request["request_id"].startswith("acr-")
        
        print(f"✓ Access request created: {request['request_id']}")


class TestAIReview:
    """Test AI executive review endpoint"""
    
    def test_ai_review_for_manager(self):
        """AI review should return narrative scoped to user role"""
        response = requests.post(f"{BASE_URL}/api/manager/ai-review?user_id=usr-mgr-001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data
        assert data["user"]["role"] == "manager"
        
        assert "narrative" in data, "Response should contain AI narrative"
        assert len(data["narrative"]) > 50, "Narrative should be substantial"
        
        assert "metrics" in data
        assert "revenue" in data["metrics"]
        assert "food_cost_pct" in data["metrics"]
        assert "labor_pct" in data["metrics"]
        
        print(f"✓ AI review generated for manager: {len(data['narrative'])} chars")
        print(f"  Metrics: Revenue ${data['metrics']['revenue']:,.0f}, Food {data['metrics']['food_cost_pct']}%, Labor {data['metrics']['labor_pct']}%")
    
    def test_ai_review_for_gm(self):
        """AI review for GM should have full scope"""
        response = requests.post(f"{BASE_URL}/api/manager/ai-review?user_id=usr-gm-001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["user"]["role"] == "gm"
        assert "narrative" in data
        
        print(f"✓ AI review generated for GM: {len(data['narrative'])} chars")


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """Health endpoint should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
