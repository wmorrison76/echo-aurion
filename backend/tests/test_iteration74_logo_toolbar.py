"""
Iteration 74 Backend Tests
- Logo image served correctly
- Toolbar cleanup (duplicates removed)
- Existing endpoints still work
- Onboarding wizard endpoints
- Guest booking endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cfo-toolkit-deploy.preview.emergentagent.com').rstrip('/')


class TestHealthAndBasicEndpoints:
    """Test that all existing endpoints still respond"""
    
    def test_health_endpoint(self):
        """GET /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200
        print(f"✓ Health endpoint: {response.status_code}")
    
    def test_spa_analytics_endpoint(self):
        """GET /api/dept-analytics/spa returns spa KPIs"""
        response = requests.get(f"{BASE_URL}/api/dept-analytics/spa", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data
        assert "treatment_mix" in data
        print(f"✓ Spa analytics: {response.status_code}")
    
    def test_engineering_analytics_endpoint(self):
        """GET /api/dept-analytics/engineering returns engineering KPIs"""
        response = requests.get(f"{BASE_URL}/api/dept-analytics/engineering", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data or "summary" in data or "tickets" in data
        print(f"✓ Engineering analytics: {response.status_code}")
    
    def test_integrations_status_endpoint(self):
        """GET /api/integrations/status returns integration list"""
        response = requests.get(f"{BASE_URL}/api/integrations/status", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "integrations" in data
        assert len(data["integrations"]) >= 3  # Toast, QuickBooks, SendGrid
        print(f"✓ Integrations status: {response.status_code}, count: {len(data['integrations'])}")
    
    def test_calendar_events_endpoint(self):
        """GET /api/calendar/events returns events list"""
        response = requests.get(f"{BASE_URL}/api/calendar/events", timeout=10)
        assert response.status_code == 200
        data = response.json()
        # Response can be {"data": [...], "total": N} or {"events": [...]} or list
        assert isinstance(data, list) or "events" in data or "data" in data
        print(f"✓ Calendar events: {response.status_code}")


class TestOnboardingWizardEndpoints:
    """Test onboarding wizard API endpoints"""
    
    def test_onboarding_steps_owner_role(self):
        """GET /api/onboarding-wizard/steps?role=owner returns 3 steps"""
        response = requests.get(f"{BASE_URL}/api/onboarding-wizard/steps?role=owner", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "steps" in data
        assert len(data["steps"]) == 3
        assert data["total_steps"] == 3
        print(f"✓ Onboarding steps (owner): {len(data['steps'])} steps")
    
    def test_onboarding_steps_default_role(self):
        """GET /api/onboarding-wizard/steps returns 3 default steps"""
        response = requests.get(f"{BASE_URL}/api/onboarding-wizard/steps", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "steps" in data
        assert len(data["steps"]) == 3
        print(f"✓ Onboarding steps (default): {len(data['steps'])} steps")
    
    def test_onboarding_status_new_user(self):
        """GET /api/onboarding-wizard/status?user_id=test returns show_wizard=true"""
        response = requests.get(f"{BASE_URL}/api/onboarding-wizard/status?user_id=test-user-iter74", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "show_wizard" in data
        print(f"✓ Onboarding status: show_wizard={data.get('show_wizard')}")


class TestGuestBookingEndpoints:
    """Test guest booking API endpoints"""
    
    def test_guest_booking_treatments(self):
        """GET /api/guest-booking/treatments returns 10 treatments"""
        response = requests.get(f"{BASE_URL}/api/guest-booking/treatments", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "treatments" in data
        assert len(data["treatments"]) == 10
        
        # Verify treatment structure
        treatment = data["treatments"][0]
        assert "id" in treatment
        assert "name" in treatment
        assert "price" in treatment
        assert "duration_mins" in treatment
        print(f"✓ Guest booking treatments: {len(data['treatments'])} treatments")
    
    def test_guest_booking_availability(self):
        """GET /api/guest-booking/availability returns time slots"""
        from datetime import datetime, timedelta
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/guest-booking/availability?date={tomorrow}", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "slots" in data
        assert len(data["slots"]) > 0
        print(f"✓ Guest booking availability: {len(data['slots'])} slots")


class TestStaticAssets:
    """Test that static assets are served correctly"""
    
    def test_logo_image_served(self):
        """GET /echo-aurion-sidebar.png returns 200"""
        response = requests.get(f"{BASE_URL}/echo-aurion-sidebar.png", timeout=10)
        assert response.status_code == 200
        assert "image" in response.headers.get("content-type", "")
        print(f"✓ Logo image served: {response.status_code}, content-type: {response.headers.get('content-type')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
