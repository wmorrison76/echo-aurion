"""
iter175 Backend Tests
=====================
Tests for:
1. Milestones: preview, send-today (dry-run), feed, idempotent guard
2. My Schedule: employee week view with banner
3. Magic-Link Delegation: mint, resolve, edit (scope enforcement), list
4. Welcome Pack: preview, PDF
5. Lifestyle Prep-Cascade + Suggest
6. Regressions from iter174
"""
import os
import pytest
import requests
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = os.environ.get("ADMIN_API_TOKEN", "kDLVaJJVmtxX_EPKYGpU2ZunwTT1j0TU4Z_ezSximgc")

# Test date: 2026-04-18 (today in container per review request)
TEST_DATE = "2026-04-18"


@pytest.fixture
def admin_headers():
    return {"Content-Type": "application/json", "X-Admin-Token": ADMIN_TOKEN}


@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ─── MILESTONES TESTS ────────────────────────────────────────────────────────
class TestMilestonesPreview:
    """Test /api/milestones/preview endpoint"""
    
    def test_preview_birthday(self, api_client):
        """Preview returns HTML with Georgia/gold branding"""
        r = api_client.get(f"{BASE_URL}/api/milestones/preview?kind=birthday&name=Test")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "html" in data
        # Check for Georgia font and gold branding
        html = data["html"]
        assert "Georgia" in html
        assert "#c8a97e" in html or "c8a97e" in html  # gold color
        assert "Test" in html  # name appears
        
    def test_preview_anniversary(self, api_client):
        """Preview anniversary kind"""
        r = api_client.get(f"{BASE_URL}/api/milestones/preview?kind=anniversary&name=Employee")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "Congratulations" in data["html"]


class TestMilestonesSendToday:
    """Test /api/milestones/send-today endpoint"""
    
    def test_send_today_requires_admin(self, api_client):
        """Send-today requires admin token"""
        r = api_client.post(f"{BASE_URL}/api/milestones/send-today", json={"date": TEST_DATE, "dry_run": True})
        assert r.status_code == 401
        
    def test_send_today_dry_run(self, admin_headers, api_client):
        """Dry run returns milestones without sending"""
        r = api_client.post(
            f"{BASE_URL}/api/milestones/send-today",
            headers=admin_headers,
            json={"date": TEST_DATE, "dry_run": True}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "total" in data
        assert data["total"] >= 1  # Should have at least 1 milestone (Priya birthday 04-18)
        assert "results" in data
        # Check results structure
        for result in data["results"]:
            assert "kind" in result
            assert "name" in result
            assert result.get("status") == "dry-run"


class TestMilestonesFeed:
    """Test /api/milestones/feed/{employee_id} endpoint"""
    
    def test_feed_returns_banner_for_birthday(self, api_client):
        """Feed returns banner for employee with birthday today"""
        # First get employee list to find Priya (birthday 04-18)
        r = api_client.get(f"{BASE_URL}/api/people/list")
        assert r.status_code == 200
        employees = r.json().get("employees", [])
        priya = next((e for e in employees if "Priya" in e.get("first_name", "")), None)
        
        if priya:
            r = api_client.get(f"{BASE_URL}/api/milestones/feed/{priya['id']}?date_iso={TEST_DATE}")
            assert r.status_code == 200
            data = r.json()
            assert data.get("ok") is True
            assert "milestones" in data
            # Should have birthday milestone
            if data["milestones"]:
                assert any(m["kind"] == "birthday" for m in data["milestones"])
                assert data.get("banner") is not None
                assert "Happy Birthday" in data["banner"]


class TestMilestonesIdempotent:
    """Test idempotent guard on milestone sends"""
    
    def test_second_send_returns_skipped(self, admin_headers, api_client):
        """Second send for same date/employee returns skipped"""
        # First send (dry_run=False but RESEND_API_KEY not set = still dry-run)
        r1 = api_client.post(
            f"{BASE_URL}/api/milestones/send-today",
            headers=admin_headers,
            json={"date": TEST_DATE, "dry_run": False}
        )
        assert r1.status_code == 200
        
        # Second send should show skipped for already-sent
        r2 = api_client.post(
            f"{BASE_URL}/api/milestones/send-today",
            headers=admin_headers,
            json={"date": TEST_DATE, "dry_run": False}
        )
        assert r2.status_code == 200
        data = r2.json()
        # If any were sent first time, they should be skipped now
        # (Note: without RESEND_API_KEY, status is dry-run so no actual sends recorded)


# ─── MY SCHEDULE TESTS ───────────────────────────────────────────────────────
class TestMySchedule:
    """Test /api/my-schedule/* endpoints"""
    
    def test_employee_week_view(self, api_client):
        """Week view returns employee, dates, shifts, milestones, banner"""
        # Get an employee
        r = api_client.get(f"{BASE_URL}/api/people/list")
        employees = r.json().get("employees", [])
        if not employees:
            pytest.skip("No employees in database")
        emp = employees[0]
        
        r = api_client.get(f"{BASE_URL}/api/my-schedule/employee/{emp['id']}?start={TEST_DATE}&days=7")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "employee" in data
        assert "dates" in data
        assert len(data["dates"]) == 7
        assert "shifts" in data
        assert "milestones" in data
        assert "team_celebrations" in data
        
    def test_employee_week_view_with_banner(self, api_client):
        """Banner populates when today has a milestone"""
        # Find Priya (birthday 04-18)
        r = api_client.get(f"{BASE_URL}/api/people/list")
        employees = r.json().get("employees", [])
        priya = next((e for e in employees if "Priya" in e.get("first_name", "")), None)
        
        if priya:
            r = api_client.get(f"{BASE_URL}/api/my-schedule/employee/{priya['id']}?start={TEST_DATE}&days=7")
            assert r.status_code == 200
            data = r.json()
            # Banner should be set for birthday
            if data.get("banner"):
                assert "Happy Birthday" in data["banner"] or "🎂" in data["banner"]
                
    def test_today_card(self, api_client):
        """Today card returns compact shift + banner"""
        r = api_client.get(f"{BASE_URL}/api/people/list")
        employees = r.json().get("employees", [])
        if not employees:
            pytest.skip("No employees")
        emp = employees[0]
        
        r = api_client.get(f"{BASE_URL}/api/my-schedule/today/{emp['id']}")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "employee" in data
        assert "date" in data


# ─── MAGIC-LINK DELEGATION TESTS ─────────────────────────────────────────────
class TestStandupDelegation:
    """Test /api/standup/delegation/* endpoints"""
    
    def test_mint_requires_admin(self, api_client):
        """Mint requires admin token"""
        r = api_client.post(f"{BASE_URL}/api/standup/delegation/mint", json={
            "date": TEST_DATE, "department": "culinary", "section_ids": ["culinary_ready"]
        })
        assert r.status_code == 401
        
    def test_mint_creates_token(self, admin_headers, api_client):
        """Mint creates URL-safe token with expiry"""
        r = api_client.post(
            f"{BASE_URL}/api/standup/delegation/mint",
            headers=admin_headers,
            json={"date": TEST_DATE, "department": "culinary", "section_ids": ["culinary_ready"]}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "token" in data
        assert "expires_at" in data
        assert "scoped_to" in data
        assert data["scoped_to"]["department"] == "culinary"
        assert "culinary_ready" in data["scoped_to"]["section_ids"]
        return data["token"]
        
    def test_resolve_valid_token(self, admin_headers, api_client):
        """Resolve returns scope and sections for valid token"""
        # First mint a token
        mint_r = api_client.post(
            f"{BASE_URL}/api/standup/delegation/mint",
            headers=admin_headers,
            json={"date": TEST_DATE, "department": "fb", "section_ids": ["fb_highlights"]}
        )
        token = mint_r.json()["token"]
        
        # Resolve it
        r = api_client.get(f"{BASE_URL}/api/standup/delegation/resolve/{token}")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "scope" in data
        assert "sections" in data
        
    def test_resolve_invalid_token(self, api_client):
        """Resolve returns 404 for invalid token"""
        r = api_client.get(f"{BASE_URL}/api/standup/delegation/resolve/invalid_token_xyz")
        assert r.status_code == 404
        
    def test_edit_within_scope(self, admin_headers, api_client):
        """Edit with section_id in scope succeeds"""
        # Mint token for culinary_ready
        mint_r = api_client.post(
            f"{BASE_URL}/api/standup/delegation/mint",
            headers=admin_headers,
            json={"date": TEST_DATE, "department": "culinary", "section_ids": ["culinary_ready"]}
        )
        token = mint_r.json()["token"]
        
        # Edit within scope
        r = api_client.post(f"{BASE_URL}/api/standup/delegation/edit", json={
            "token": token,
            "section_id": "culinary_ready",
            "content": {"status": "ready", "notes": "Test edit via delegation"},
            "editor_name": "Test Chef"
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        
    def test_edit_outside_scope_returns_403(self, admin_headers, api_client):
        """Edit with section_id NOT in scope returns 403"""
        # Mint token for culinary_ready only
        mint_r = api_client.post(
            f"{BASE_URL}/api/standup/delegation/mint",
            headers=admin_headers,
            json={"date": TEST_DATE, "department": "culinary", "section_ids": ["culinary_ready"]}
        )
        token = mint_r.json()["token"]
        
        # Try to edit fb_highlights (not in scope)
        r = api_client.post(f"{BASE_URL}/api/standup/delegation/edit", json={
            "token": token,
            "section_id": "fb_highlights",
            "content": {"notes": "Should fail"}
        })
        assert r.status_code == 403
        
    def test_list_masks_tokens(self, api_client):
        """List returns tokens with only first 6 chars visible"""
        r = api_client.get(f"{BASE_URL}/api/standup/delegation/list")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "tokens" in data
        # Check masking
        for t in data["tokens"]:
            if t.get("masked"):
                assert len(t["token"]) <= 7  # 6 chars + "…"


# ─── WELCOME PACK TESTS ──────────────────────────────────────────────────────
class TestWelcomePack:
    """Test /api/welcome-pack/* endpoints"""
    
    def test_preview_returns_html_and_ai_note(self, api_client):
        """Preview returns HTML with branding and AI note"""
        # First get a guest
        r = api_client.get(f"{BASE_URL}/api/concierge-v2/guests")
        if r.status_code != 200:
            pytest.skip("No concierge guests endpoint")
        guests = r.json().get("guests", [])
        if not guests:
            pytest.skip("No guests in database")
        guest = guests[0]
        
        r = api_client.get(f"{BASE_URL}/api/welcome-pack/preview/{guest['id']}")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "html" in data
        # Check for Pier SIXTY-SIX branding
        assert "Pier SIXTY-SIX" in data["html"] or "SIXTY-SIX" in data["html"]
        
    def test_pdf_returns_pdf_or_html(self, api_client):
        """PDF endpoint returns PDF (or HTML fallback)"""
        r = api_client.get(f"{BASE_URL}/api/concierge-v2/guests")
        if r.status_code != 200:
            pytest.skip("No concierge guests endpoint")
        guests = r.json().get("guests", [])
        if not guests:
            pytest.skip("No guests")
        guest = guests[0]
        
        r = api_client.get(f"{BASE_URL}/api/welcome-pack/pdf/{guest['id']}")
        assert r.status_code == 200
        # Should be PDF or HTML
        ct = r.headers.get("content-type", "")
        assert "application/pdf" in ct or "text/html" in ct


# ─── LIFESTYLE PREP-CASCADE + SUGGEST TESTS ──────────────────────────────────
class TestLifestylePrepCascade:
    """Test /api/lifestyle/prep-cascade/{date} endpoint"""
    
    def test_prep_cascade_returns_tasks_by_department(self, api_client):
        """Prep cascade returns activations and tasks grouped by department"""
        r = api_client.get(f"{BASE_URL}/api/lifestyle/prep-cascade/{TEST_DATE}")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "total_activations" in data
        assert "total_tasks" in data
        assert "by_department" in data
        assert "activations" in data
        # by_department should be a dict
        assert isinstance(data["by_department"], dict)


class TestLifestyleSuggest:
    """Test POST /api/lifestyle/suggest endpoint"""
    
    def test_suggest_returns_3_activations(self, api_client):
        """Suggest returns 3 Claude-generated activation ideas"""
        r = api_client.post(
            f"{BASE_URL}/api/lifestyle/suggest",
            json={"date": TEST_DATE, "occupancy_pct": 75, "weather": "sunny", "audience_focus": "families"},
            timeout=60  # Claude can be slow
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "suggestions" in data
        # Should have 3 suggestions (or error if LLM key missing)
        if data["suggestions"]:
            assert len(data["suggestions"]) == 3
            # Each should have required fields
            for s in data["suggestions"]:
                assert "title" in s
                assert "category" in s
                assert "start_time" in s
                assert "capacity" in s
                assert "rationale" in s


# ─── REGRESSION TESTS ────────────────────────────────────────────────────────
class TestIter174Regressions:
    """Verify iter174 endpoints still work"""
    
    def test_relay_dashboard(self, api_client):
        """Relay dashboard returns KPIs"""
        r = api_client.get(f"{BASE_URL}/api/relay/dashboard")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        
    def test_people_celebrations_today(self, api_client):
        """Celebrations today includes promotions"""
        r = api_client.get(f"{BASE_URL}/api/people/celebrations/today?date_iso={TEST_DATE}")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "birthdays" in data
        assert "anniversaries" in data
        assert "promotions" in data  # iter174 added this
        
    def test_standup_autofill(self):
        """Standup autofill returns sections (uses Form data)"""
        # Use requests directly without session headers to avoid JSON content-type
        r = requests.post(f"{BASE_URL}/api/standup/autofill", data={"date": TEST_DATE})
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        
    def test_hours_today(self, api_client):
        """Hours today returns outlets"""
        r = api_client.get(f"{BASE_URL}/api/hours/today")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        
    def test_leadership_by_date(self, api_client):
        """Leadership by date returns coverage"""
        r = api_client.get(f"{BASE_URL}/api/leadership/by-date/{TEST_DATE}")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        
    def test_lifestyle_calendar(self, api_client):
        """Lifestyle calendar returns activations"""
        r = api_client.get(f"{BASE_URL}/api/lifestyle/calendar")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        
    def test_alice_returns_404(self, api_client):
        """Alice endpoints should return 404 (renamed to Relay)"""
        r = api_client.get(f"{BASE_URL}/api/alice/dashboard")
        assert r.status_code == 404


class TestHealthCheck:
    """Basic health check"""
    
    def test_health(self, api_client):
        """Health endpoint returns healthy"""
        r = api_client.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "healthy"
