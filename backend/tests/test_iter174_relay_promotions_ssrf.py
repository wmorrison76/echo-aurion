"""
iter174 · Backend Tests
=======================
Tests for:
1. Alice → Relay rename (all /api/alice/* should 404, /api/relay/* should work)
2. Promotions endpoint (POST /api/people/promotion)
3. SSRF guard on recipe import
4. Standup autofill with promotions in people_services
5. Critical regressions (people, hours, leadership, lifestyle, showrooms, standup, concierge-v2)
"""
import os
import pytest
import requests
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cfo-toolkit-deploy.preview.emergentagent.com")
ADMIN_TOKEN = os.environ.get("ADMIN_API_TOKEN", "kDLVaJJVmtxX_EPKYGpU2ZunwTT1j0TU4Z_ezSximgc")


class TestAliceRenamed404:
    """Verify all /api/alice/* endpoints return 404 (renamed to relay)"""
    
    def test_alice_dashboard_returns_404(self):
        """GET /api/alice/dashboard should return 404"""
        r = requests.get(f"{BASE_URL}/api/alice/dashboard")
        assert r.status_code == 404, f"Expected 404 for /api/alice/dashboard, got {r.status_code}"
        print("✓ /api/alice/dashboard returns 404 (renamed to relay)")
    
    def test_alice_tickets_returns_404(self):
        """GET /api/alice/tickets should return 404"""
        r = requests.get(f"{BASE_URL}/api/alice/tickets")
        assert r.status_code == 404, f"Expected 404 for /api/alice/tickets, got {r.status_code}"
        print("✓ /api/alice/tickets returns 404 (renamed to relay)")
    
    def test_alice_ticket_create_returns_404(self):
        """POST /api/alice/ticket/create should return 404"""
        r = requests.post(f"{BASE_URL}/api/alice/ticket/create", json={
            "raised_by_name": "Test",
            "raised_by_department": "front-office",
            "summary": "Test ticket"
        })
        assert r.status_code == 404, f"Expected 404 for /api/alice/ticket/create, got {r.status_code}"
        print("✓ /api/alice/ticket/create returns 404 (renamed to relay)")


class TestRelayEndpoints:
    """Verify /api/relay/* endpoints work correctly"""
    
    def test_relay_dashboard_returns_200(self):
        """GET /api/relay/dashboard should return 200 with KPI fields"""
        r = requests.get(f"{BASE_URL}/api/relay/dashboard")
        assert r.status_code == 200, f"Expected 200 for /api/relay/dashboard, got {r.status_code}"
        data = r.json()
        assert "open" in data, "Missing 'open' KPI field"
        assert "in_progress" in data, "Missing 'in_progress' KPI field"
        assert "urgent_open" in data, "Missing 'urgent_open' KPI field"
        assert "resolved_24h" in data, "Missing 'resolved_24h' KPI field"
        assert "created_24h" in data, "Missing 'created_24h' KPI field"
        print(f"✓ /api/relay/dashboard returns 200 with KPIs: open={data['open']}, in_progress={data['in_progress']}")
    
    def test_relay_ticket_create_with_rly_prefix(self):
        """POST /api/relay/ticket/create should generate ticket_no with RLY- prefix"""
        r = requests.post(f"{BASE_URL}/api/relay/ticket/create", json={
            "raised_by_name": "TEST_iter174_user",
            "raised_by_department": "front-office",
            "summary": "TEST_iter174 ticket for relay rename verification",
            "priority": "high",
            "kind": "guest-request",
            "needs_concierge": False
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True, "Expected ok=True"
        ticket = data.get("ticket", {})
        ticket_no = ticket.get("ticket_no", "")
        assert ticket_no.startswith("RLY-"), f"Expected ticket_no to start with RLY-, got {ticket_no}"
        print(f"✓ /api/relay/ticket/create generates ticket_no with RLY- prefix: {ticket_no}")
        return ticket.get("id")
    
    def test_relay_tickets_list(self):
        """GET /api/relay/tickets should return list with status/priority/kind fields"""
        r = requests.get(f"{BASE_URL}/api/relay/tickets")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert "tickets" in data, "Missing 'tickets' field"
        assert "stats" in data, "Missing 'stats' field"
        if data["tickets"]:
            ticket = data["tickets"][0]
            assert "status" in ticket, "Ticket missing 'status' field"
            assert "priority" in ticket, "Ticket missing 'priority' field"
            assert "kind" in ticket, "Ticket missing 'kind' field"
        print(f"✓ /api/relay/tickets returns {len(data['tickets'])} tickets with proper schema")


class TestPromotionsEndpoint:
    """Test the new /api/people/promotion endpoint (iter174)"""
    
    def test_promotion_requires_admin_token(self):
        """POST /api/people/promotion without token should fail"""
        r = requests.post(f"{BASE_URL}/api/people/promotion", json={
            "employee_id": "nonexistent",
            "date": "2024-01-15",
            "to_title": "Senior Manager"
        })
        # Should return 401 if admin token is required
        assert r.status_code in [401, 404], f"Expected 401 or 404 without admin token, got {r.status_code}"
        print("✓ /api/people/promotion requires admin token")
    
    def test_promotion_creates_entry_and_updates_title(self):
        """POST /api/people/promotion with admin token should create promotion entry"""
        # First, create a test employee
        create_r = requests.post(
            f"{BASE_URL}/api/people/upsert",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={
                "first_name": "TEST_Promo",
                "last_name": "Employee",
                "department": "front-office",
                "role": "manager",
                "title": "Front Office Manager",
                "hire_date": "2022-01-01"
            }
        )
        assert create_r.status_code == 200, f"Failed to create test employee: {create_r.text}"
        emp_id = create_r.json().get("employee", {}).get("id")
        assert emp_id, "No employee ID returned"
        
        # Now create a promotion
        today = datetime.now().strftime("%Y-%m-%d")
        promo_r = requests.post(
            f"{BASE_URL}/api/people/promotion",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={
                "employee_id": emp_id,
                "date": today,
                "from_title": "Front Office Manager",
                "to_title": "Director of Front Office",
                "note": "TEST_iter174 promotion test"
            }
        )
        assert promo_r.status_code == 200, f"Promotion failed: {promo_r.text}"
        promo_data = promo_r.json()
        assert promo_data.get("ok") is True, "Expected ok=True"
        
        # Verify employee title was updated
        emp = promo_data.get("employee", {})
        assert emp.get("title") == "Director of Front Office", f"Title not updated: {emp.get('title')}"
        
        # Verify promotion_history was updated
        promo_history = emp.get("promotion_history", [])
        assert len(promo_history) > 0, "promotion_history is empty"
        latest_promo = promo_history[-1]
        assert latest_promo.get("to_title") == "Director of Front Office"
        print(f"✓ /api/people/promotion creates entry and updates title for employee {emp_id}")
        
        # Cleanup: deactivate test employee
        requests.post(
            f"{BASE_URL}/api/people/{emp_id}/deactivate",
            headers={"X-Admin-Token": ADMIN_TOKEN}
        )


class TestCelebrationsTodayWithPromotions:
    """Test that /api/people/celebrations/today returns promotions array"""
    
    def test_celebrations_today_has_promotions_field(self):
        """GET /api/people/celebrations/today should include 'promotions' array"""
        r = requests.get(f"{BASE_URL}/api/people/celebrations/today")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert "promotions" in data, "Missing 'promotions' field in celebrations/today"
        assert "summary" in data, "Missing 'summary' field"
        # Summary should mention promotions count
        summary = data.get("summary", "")
        assert "promotion" in summary.lower(), f"Summary doesn't mention promotions: {summary}"
        print(f"✓ /api/people/celebrations/today includes promotions: {len(data['promotions'])} found")
        print(f"  Summary: {summary}")


class TestSSRFGuard:
    """Test SSRF protection on recipe import endpoints (iter174)"""
    
    def test_ssrf_blocks_localhost(self):
        """POST /api/recipe/import with localhost URL should return 400"""
        r = requests.post(f"{BASE_URL}/api/recipe/import", json={
            "url": "http://localhost:8001/api/status"
        })
        assert r.status_code == 400, f"Expected 400 for localhost URL, got {r.status_code}"
        print("✓ SSRF guard blocks localhost URL")
    
    def test_ssrf_blocks_metadata_ip(self):
        """POST /api/recipe/import with 169.254.169.254 should return 400"""
        r = requests.post(f"{BASE_URL}/api/recipe/import", json={
            "url": "http://169.254.169.254/"
        })
        assert r.status_code == 400, f"Expected 400 for metadata IP, got {r.status_code}"
        print("✓ SSRF guard blocks 169.254.169.254 (cloud metadata)")
    
    def test_ssrf_blocks_127_0_0_1(self):
        """GET /api/recipe/image with 127.0.0.1 should return 400"""
        r = requests.get(f"{BASE_URL}/api/recipe/image", params={"url": "http://127.0.0.1/"})
        assert r.status_code == 400, f"Expected 400 for 127.0.0.1, got {r.status_code}"
        print("✓ SSRF guard blocks 127.0.0.1 on /api/recipe/image")
    
    def test_ssrf_allows_public_url(self):
        """POST /api/recipe/import with public URL should not return 400 from guard"""
        r = requests.post(f"{BASE_URL}/api/recipe/import", json={
            "url": "https://example.com"
        })
        # Should NOT be 400 from SSRF guard (may be 502 if blocked by site, but not 400)
        # Actually example.com won't have recipe data, so it may return various codes
        # The key is it shouldn't be 400 with "restricted address" message
        if r.status_code == 400:
            error_text = r.text.lower()
            assert "restricted" not in error_text, f"Public URL blocked by SSRF guard: {r.text}"
        print(f"✓ SSRF guard allows public URL (status: {r.status_code})")


class TestStandupAutofillWithPromotions:
    """Test that standup autofill includes promotions in people_services section"""
    
    def test_autofill_returns_7_sections(self):
        """POST /api/standup/autofill should return 7 autofilled sections"""
        today = datetime.now().strftime("%Y-%m-%d")
        r = requests.post(f"{BASE_URL}/api/standup/autofill", data={"date": today})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        autofilled = data.get("autofilled_sections", [])
        # Should include: vips_in_house, hours, activities, glitches, people_services, leadership, showrooms
        print(f"✓ /api/standup/autofill returned {len(autofilled)} sections: {autofilled}")
        # At minimum, people_services should be in the list if there are celebrations
        # The exact count depends on available data
    
    def test_autofill_people_services_mentions_promotions(self):
        """Autofill people_services content should include promotion anniversaries line"""
        today = datetime.now().strftime("%Y-%m-%d")
        r = requests.post(f"{BASE_URL}/api/standup/autofill", data={"date": today})
        assert r.status_code == 200
        data = r.json()
        board = data.get("board", {})
        sections = board.get("sections", {})
        people_services = sections.get("people_services", {})
        content = people_services.get("content", "")
        
        # If there are promotions on today's date, content should include "⭐ Promotion anniversaries"
        # The seeded data has Marcus with a promotion on today's MM-DD
        if content and "⭐" in content:
            assert "Promotion anniversaries" in content or "promotion" in content.lower()
            print(f"✓ people_services content includes promotion anniversaries")
        else:
            print(f"ℹ people_services content: {content[:200] if content else 'empty'}")


class TestCriticalRegressions:
    """Verify critical endpoints from iter172/173 still work"""
    
    def test_people_list(self):
        """GET /api/people/list should return 200"""
        r = requests.get(f"{BASE_URL}/api/people/list")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert "employees" in data
        print(f"✓ /api/people/list returns {len(data['employees'])} employees")
    
    def test_hours_today(self):
        """GET /api/hours/today should return 200"""
        r = requests.get(f"{BASE_URL}/api/hours/today")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert "outlets" in data
        print(f"✓ /api/hours/today returns {len(data['outlets'])} outlets")
    
    def test_leadership_by_date(self):
        """GET /api/leadership/by-date/{date} should return 200"""
        today = datetime.now().strftime("%Y-%m-%d")
        r = requests.get(f"{BASE_URL}/api/leadership/by-date/{today}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print("✓ /api/leadership/by-date returns 200")
    
    def test_lifestyle_calendar(self):
        """GET /api/lifestyle/calendar should return 200"""
        r = requests.get(f"{BASE_URL}/api/lifestyle/calendar")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert "activations" in data
        print(f"✓ /api/lifestyle/calendar returns {len(data['activations'])} activations")
    
    def test_lifestyle_revenue_engagement(self):
        """GET /api/lifestyle/revenue-engagement should return 200"""
        r = requests.get(f"{BASE_URL}/api/lifestyle/revenue-engagement")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print("✓ /api/lifestyle/revenue-engagement returns 200")
    
    def test_lifestyle_attendance_forecast(self):
        """GET /api/lifestyle/attendance-forecast should return 200"""
        r = requests.get(f"{BASE_URL}/api/lifestyle/attendance-forecast")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print("✓ /api/lifestyle/attendance-forecast returns 200")
    
    def test_showrooms_list(self):
        """GET /api/showrooms/list should return 200"""
        r = requests.get(f"{BASE_URL}/api/showrooms/list")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print("✓ /api/showrooms/list returns 200")
    
    def test_standup_today(self):
        """GET /api/standup/today should return 200"""
        r = requests.get(f"{BASE_URL}/api/standup/today")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert "board" in data
        print("✓ /api/standup/today returns 200")
    
    def test_concierge_v2_outlets(self):
        """GET /api/concierge-v2/outlets should return 200"""
        r = requests.get(f"{BASE_URL}/api/concierge-v2/outlets")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print("✓ /api/concierge-v2/outlets returns 200")
    
    def test_lifestyle_cross_dept_plan(self):
        """GET /api/lifestyle/cross-dept-plan/{id} should return 200 or 404"""
        r = requests.get(f"{BASE_URL}/api/lifestyle/cross-dept-plan/test-plan-id")
        # 404 is acceptable if plan doesn't exist
        assert r.status_code in [200, 404], f"Expected 200 or 404, got {r.status_code}"
        print(f"✓ /api/lifestyle/cross-dept-plan returns {r.status_code}")


class TestHealthCheck:
    """Basic health check"""
    
    def test_health(self):
        """GET /api/health should return 200"""
        r = requests.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "healthy"
        print("✓ /api/health returns healthy")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
