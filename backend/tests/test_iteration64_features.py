"""
Iteration 64 - Feature Tests
=============================
Tests for:
1. LUCCCA Dashboard command-center with simulation data (revenue ~$279K, labor ~$232K)
2. Weekly P&L digest with this_week/last_week comparison and AI narrative
3. Access request admin approval panel (list, approve, deny)
4. Notifications endpoint
5. EchoAi³ role-filtered responses (manager, exec_chef)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cfo-toolkit-deploy.preview.emergentagent.com').rstrip('/')


class TestCommandCenter:
    """Test LUCCCA Dashboard command-center endpoint with simulation data"""
    
    def test_command_center_returns_revenue(self):
        """GET /api/enterprise/command-center should return revenue ~$279K from simulation data"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200
        
        data = response.json()
        assert "pos" in data
        assert "revenue_today" in data["pos"]
        
        revenue = data["pos"]["revenue_today"]
        # Revenue should be around $279K from simulation data
        assert revenue > 200000, f"Revenue {revenue} should be > $200K"
        assert revenue < 350000, f"Revenue {revenue} should be < $350K"
        print(f"✓ Revenue: ${revenue:,.2f}")
    
    def test_command_center_returns_labor_cost(self):
        """GET /api/enterprise/command-center should return labor cost ~$232K from GL entries"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200
        
        data = response.json()
        assert "labor" in data
        assert "total_cost" in data["labor"]
        
        labor_cost = data["labor"]["total_cost"]
        # Labor cost should be around $232K from GL entries
        assert labor_cost > 180000, f"Labor cost {labor_cost} should be > $180K"
        assert labor_cost < 280000, f"Labor cost {labor_cost} should be < $280K"
        print(f"✓ Labor Cost: ${labor_cost:,.2f}")
    
    def test_command_center_returns_labor_pct(self):
        """GET /api/enterprise/command-center should return labor % (GL labor / POS revenue)"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200
        
        data = response.json()
        labor_pct = data["labor"]["labor_pct"]
        # Labor % should be around 83.5% (GL total labor / total POS revenue)
        assert labor_pct > 70, f"Labor % {labor_pct} should be > 70%"
        assert labor_pct < 100, f"Labor % {labor_pct} should be < 100%"
        print(f"✓ Labor %: {labor_pct:.1f}%")
    
    def test_command_center_returns_events(self):
        """GET /api/enterprise/command-center should return events data"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200
        
        data = response.json()
        assert "events" in data
        assert "total" in data["events"]
        print(f"✓ Events total: {data['events']['total']}")


class TestWeeklyDigest:
    """Test weekly P&L digest endpoint"""
    
    def test_weekly_digest_returns_comparison(self):
        """POST /api/admin-ops/weekly-digest should return this_week/last_week comparison"""
        response = requests.post(f"{BASE_URL}/api/admin-ops/weekly-digest")
        assert response.status_code == 200
        
        data = response.json()
        assert "this_week" in data
        assert "last_week" in data
        assert "revenue" in data["this_week"]
        assert "revenue" in data["last_week"]
        
        print(f"✓ This week revenue: ${data['this_week']['revenue']:,.2f}")
        print(f"✓ Last week revenue: ${data['last_week']['revenue']:,.2f}")
    
    def test_weekly_digest_has_ai_narrative(self):
        """POST /api/admin-ops/weekly-digest should return AI narrative"""
        response = requests.post(f"{BASE_URL}/api/admin-ops/weekly-digest")
        assert response.status_code == 200
        
        data = response.json()
        assert "narrative" in data
        assert len(data["narrative"]) > 50, "Narrative should be substantial"
        print(f"✓ AI Narrative length: {len(data['narrative'])} chars")
    
    def test_weekly_digest_has_outlet_comparison(self):
        """POST /api/admin-ops/weekly-digest should return per-outlet wins/concerns"""
        response = requests.post(f"{BASE_URL}/api/admin-ops/weekly-digest")
        assert response.status_code == 200
        
        data = response.json()
        assert "outlet_comparison" in data
        assert len(data["outlet_comparison"]) > 0, "Should have outlet comparisons"
        
        # Check that outlets have wins/concerns
        has_wins_or_concerns = any(
            o.get("wins") or o.get("concerns") 
            for o in data["outlet_comparison"]
        )
        assert has_wins_or_concerns, "At least one outlet should have wins or concerns"
        
        for outlet in data["outlet_comparison"]:
            print(f"✓ Outlet {outlet['outlet_id']}: wins={outlet.get('wins', [])}, concerns={outlet.get('concerns', [])}")


class TestAccessRequests:
    """Test access request admin approval panel"""
    
    def test_list_access_requests(self):
        """GET /api/admin-ops/access-requests should list pending requests"""
        response = requests.get(f"{BASE_URL}/api/admin-ops/access-requests")
        assert response.status_code == 200
        
        data = response.json()
        assert "requests" in data
        assert "total" in data
        assert "pending" in data
        assert "approved" in data
        assert "denied" in data
        
        print(f"✓ Total: {data['total']}, Pending: {data['pending']}, Approved: {data['approved']}, Denied: {data['denied']}")
    
    def test_access_request_structure(self):
        """GET /api/admin-ops/access-requests should return proper request structure"""
        response = requests.get(f"{BASE_URL}/api/admin-ops/access-requests")
        assert response.status_code == 200
        
        data = response.json()
        if data["requests"]:
            req = data["requests"][0]
            assert "request_id" in req
            assert "user_id" in req
            assert "status" in req
            print(f"✓ Request structure valid: {req.get('request_id')}")


class TestNotifications:
    """Test notifications endpoint"""
    
    def test_list_notifications(self):
        """GET /api/admin-ops/notifications should list notifications"""
        response = requests.get(f"{BASE_URL}/api/admin-ops/notifications")
        assert response.status_code == 200
        
        data = response.json()
        assert "notifications" in data
        assert "total" in data
        assert "unread" in data
        
        print(f"✓ Total: {data['total']}, Unread: {data['unread']}")


class TestEchoAi3RoleFiltered:
    """Test EchoAi³ role-filtered responses"""
    
    def test_manager_food_cost_query(self):
        """POST /api/echoai3/think with manager asking about food cost should return role-appropriate response"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={
                "query": "What is our food cost percentage?",
                "user_id": "usr-mgr-001"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "user" in data
        assert data["user"]["role"] == "manager"
        assert "confidence" in data
        assert data["confidence"] > 50
        
        # Response should contain financial data
        response_text = data["response"].lower()
        assert "food cost" in response_text or "%" in response_text
        
        print(f"✓ Manager query - Role: {data['user']['role']}, Confidence: {data['confidence']}")
        print(f"✓ Data sources: {data.get('data_sources', [])[:5]}...")
    
    def test_chef_kitchen_operations_query(self):
        """POST /api/echoai3/think with exec_chef asking about kitchen should include waste and labor data"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={
                "query": "What are our kitchen operations like? Tell me about waste and labor schedules",
                "user_id": "usr-chef-001"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "user" in data
        assert data["user"]["role"] == "exec_chef"
        
        # Check that waste_tracking and labor_schedules are in data sources
        data_sources = data.get("data_sources", [])
        assert "waste_tracking" in data_sources, "Should include waste_tracking data"
        assert "labor_schedules" in data_sources, "Should include labor_schedules data"
        
        # Response should mention waste or labor
        response_text = data["response"].lower()
        has_waste = "waste" in response_text
        has_labor = "labor" in response_text or "schedule" in response_text
        assert has_waste or has_labor, "Response should mention waste or labor"
        
        print(f"✓ Chef query - Role: {data['user']['role']}, Confidence: {data['confidence']}")
        print(f"✓ Has waste_tracking: {'waste_tracking' in data_sources}")
        print(f"✓ Has labor_schedules: {'labor_schedules' in data_sources}")
    
    def test_echoai3_health(self):
        """GET /api/echoai3/health should return operational status"""
        response = requests.get(f"{BASE_URL}/api/echoai3/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "operational"
        assert "domains" in data
        assert len(data["domains"]) > 5
        
        print(f"✓ EchoAi³ status: {data['status']}, Domains: {len(data['domains'])}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
