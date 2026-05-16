"""
LUCCCA Enterprise Platform - Phase 1-5 Backend Tests
=====================================================
Tests for:
- Health check with all 10 engines
- Enterprise Command Center API
- Dashboard widget endpoints
- Auth dev login
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')

class TestHealthAndEngines:
    """Test health endpoint and all 10 enterprise engines"""
    
    def test_health_endpoint_returns_200(self):
        """Health endpoint should return 200 with all engines active"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["platform"] == "LUCCCA Enterprise"
        print(f"✓ Health check passed - Platform: {data['platform']}, Version: {data['version']}")
    
    def test_all_10_engines_active(self):
        """All 10 enterprise engines should be active"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        engines = data.get("engines", {})
        
        expected_engines = [
            "operations_core", "ai_forecasting", "pos_integration",
            "event_lifecycle", "labor_cost", "event_bus", "payroll",
            "workflow", "notifications", "tamper_audit"
        ]
        
        for engine in expected_engines:
            assert engine in engines, f"Engine {engine} not found in health response"
            assert engines[engine] == "active", f"Engine {engine} is not active"
        
        print(f"✓ All 10 engines active: {list(engines.keys())}")


class TestEnterpriseCommandCenter:
    """Test the Enterprise Command Center API endpoint"""
    
    def test_command_center_returns_200(self):
        """Command center endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200
        data = response.json()
        assert "timestamp" in data
        print(f"✓ Command center returned data at {data['timestamp']}")
    
    def test_command_center_has_all_sections(self):
        """Command center should have data from all engines"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200
        data = response.json()
        
        required_sections = [
            "operations", "pos", "labor", "events", "forecasting",
            "event_bus", "payroll", "workflows", "notifications",
            "audit", "system_health"
        ]
        
        for section in required_sections:
            assert section in data, f"Section {section} missing from command center"
        
        print(f"✓ Command center has all {len(required_sections)} sections")
    
    def test_command_center_operations_data(self):
        """Operations section should have inventory and recipe data"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        data = response.json()
        ops = data.get("operations", {})
        
        assert "ingredients" in ops
        assert "recipes" in ops
        assert "inventory_value" in ops
        assert "low_stock" in ops
        print(f"✓ Operations: {ops['ingredients']} ingredients, {ops['recipes']} recipes, ${ops['inventory_value']} inventory value")
    
    def test_command_center_pos_data(self):
        """POS section should have transaction and revenue data"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        data = response.json()
        pos = data.get("pos", {})
        
        assert "transactions_today" in pos
        assert "revenue_today" in pos
        assert "hourly_trend" in pos
        assert isinstance(pos["hourly_trend"], list)
        print(f"✓ POS: {pos['transactions_today']} transactions, ${pos['revenue_today']} revenue")
    
    def test_command_center_labor_data(self):
        """Labor section should have cost and department breakdown"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        data = response.json()
        labor = data.get("labor", {})
        
        assert "total_cost" in labor
        assert "labor_pct" in labor
        assert "target_pct" in labor
        assert "by_department" in labor
        print(f"✓ Labor: {labor['labor_pct']}% (target: {labor['target_pct']}%)")
    
    def test_command_center_events_data(self):
        """Events section should have pipeline and upcoming events"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        data = response.json()
        events = data.get("events", {})
        
        assert "total" in events
        assert "pipeline" in events
        assert "upcoming" in events
        print(f"✓ Events: {events['total']} total events in pipeline")
    
    def test_command_center_system_health(self):
        """System health should show all 10 engines active"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        data = response.json()
        health = data.get("system_health", {})
        
        assert health.get("engines_active") == 10
        assert health.get("engines_total") == 10
        assert health.get("db_status") == "connected"
        print(f"✓ System health: {health['engines_active']}/{health['engines_total']} engines active")


class TestDashboardWidgets:
    """Test dashboard widget API endpoints"""
    
    def test_ops_metrics_endpoint(self):
        """Ops metrics widget endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard/ops-metrics")
        assert response.status_code == 200
        data = response.json()
        assert "revenue" in data
        assert "covers" in data
        assert "laborPct" in data
        print(f"✓ Ops metrics: revenue=${data['revenue']}, covers={data['covers']}, laborPct={data['laborPct']}%")
    
    def test_staff_status_endpoint(self):
        """Staff status widget endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard/staff-status")
        assert response.status_code == 200
        data = response.json()
        assert "staff" in data
        assert isinstance(data["staff"], list)
        print(f"✓ Staff status: {len(data['staff'])} staff members")
    
    def test_satisfaction_endpoint(self):
        """Satisfaction widget endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard/satisfaction")
        assert response.status_code == 200
        data = response.json()
        assert "score" in data
        assert "target" in data
        print(f"✓ Satisfaction: score={data['score']}, target={data['target']}")
    
    def test_orders_endpoint(self):
        """Orders widget endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard/orders")
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        assert isinstance(data["orders"], list)
        print(f"✓ Orders: {len(data['orders'])} orders")
    
    def test_labor_cost_endpoint(self):
        """Labor cost widget endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard/labor-cost")
        assert response.status_code == 200
        data = response.json()
        assert "laborPct" in data
        assert "targetPct" in data
        print(f"✓ Labor cost: {data['laborPct']}% (target: {data['targetPct']}%)")
    
    def test_sales_trend_endpoint(self):
        """Sales trend widget endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard/sales-trend")
        assert response.status_code == 200
        data = response.json()
        assert "hours" in data
        assert isinstance(data["hours"], list)
        print(f"✓ Sales trend: {len(data['hours'])} hourly data points")
    
    def test_vip_alerts_endpoint(self):
        """VIP alerts widget endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard/vip-alerts")
        assert response.status_code == 200
        data = response.json()
        assert "alerts" in data
        print(f"✓ VIP alerts: {len(data['alerts'])} alerts")
    
    def test_financial_health_endpoint(self):
        """Financial health widget endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard/financial/health")
        assert response.status_code == 200
        data = response.json()
        assert "grade" in data
        assert "score" in data
        print(f"✓ Financial health: grade={data['grade']}, score={data['score']}")


class TestAuthDevLogin:
    """Test dev authentication endpoint"""
    
    def test_dev_login_post_returns_user_and_token(self):
        """POST /api/auth/dev/login should return user and token"""
        response = requests.post(f"{BASE_URL}/api/auth/dev/login")
        assert response.status_code == 200
        data = response.json()
        
        assert "user" in data
        assert "token" in data
        assert data["user"]["id"] == "dev-user"
        assert data["user"]["email"] == "dev@example.com"
        assert data["user"]["name"] == "William Morrison"
        assert data["user"]["role"] == "admin"
        print(f"✓ Dev login: user={data['user']['name']}, role={data['user']['role']}")
    
    def test_dev_login_get_returns_user_and_token(self):
        """GET /api/auth/dev/login should also return user and token"""
        response = requests.get(f"{BASE_URL}/api/auth/dev/login")
        assert response.status_code == 200
        data = response.json()
        
        assert "user" in data
        assert "token" in data
        print(f"✓ Dev login GET: token present")


class TestAdditionalEndpoints:
    """Test additional API endpoints for completeness"""
    
    def test_weather_endpoint(self):
        """Weather endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/weather")
        assert response.status_code == 200
        data = response.json()
        assert "current" in data
        assert "forecast" in data
        print(f"✓ Weather: {data['current']['temp']}°F, {data['current']['description']}")
    
    def test_user_preferences_endpoint(self):
        """User preferences endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/user-preferences")
        assert response.status_code == 200
        data = response.json()
        assert "preferences" in data
        print(f"✓ User preferences endpoint working")
    
    def test_white_label_config_endpoint(self):
        """White label config endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/white-label/config")
        assert response.status_code == 200
        data = response.json()
        assert "colors" in data
        assert "typography" in data
        print(f"✓ White label config: primary color={data['colors']['primary']}")
    
    def test_recipes_endpoint(self):
        """Recipes endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/recipes")
        assert response.status_code == 200
        data = response.json()
        assert "recipes" in data
        print(f"✓ Recipes: {data['total']} recipes")
    
    def test_inventory_endpoint(self):
        """Inventory endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/inventory")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        print(f"✓ Inventory: {len(data['items'])} items")
    
    def test_events_endpoint(self):
        """Events endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        print(f"✓ Events: {len(data['events'])} events")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
