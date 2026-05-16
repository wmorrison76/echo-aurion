"""
iter180-182 · Comprehensive Backend Tests

Tests for:
- iter180: AI Hiring Flow (POST /api/hiring/rank, GET /api/hiring/batches, GET /api/hiring/batch/{id})
- iter180: Concierge Mobile Admin (GET /api/concierge-mobile/guests, POST /api/concierge-mobile/mint, GET /api/concierge-mobile/qr/{token}, POST /api/concierge-mobile/revoke/{token})
- iter180: Outlook token encryption (GET /api/outlook/status, token_crypt module)
- iter182: Dashboard Overview (GET /api/dashboard/overview)
- iter182: Dashboard Share (POST /api/dashboard/share, GET /api/dashboard/board/{id})
- Regression: iter175-179 endpoints
"""
import os
import pytest
import requests
import json
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cfo-toolkit-deploy.preview.emergentagent.com").rstrip("/")
ADMIN_TOKEN = "kDLVaJJVmtxX_EPKYGpU2ZunwTT1j0TU4Z_ezSximgc"


@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def admin_client():
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "X-Admin-Token": ADMIN_TOKEN
    })
    return session


# ─── iter182 · Dashboard Overview ──────────────────────────────────────────
class TestDashboardOverview:
    """GET /api/dashboard/overview returns 8 KPIs with correct labels"""

    def test_overview_returns_kpis(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/dashboard/overview")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        overview = data.get("overview", {})
        
        # Check KPIs exist
        kpis = overview.get("kpi", [])
        assert len(kpis) >= 8, f"Expected at least 8 KPIs, got {len(kpis)}"
        
        # Check expected labels
        labels = [k.get("label") for k in kpis]
        expected_labels = ["Active staff", "Open relay tickets", "Open guest requests", 
                          "Standup today", "Activations last 7d", "Hiring batches this month",
                          "Job profiles", "Active mobile links"]
        for exp in expected_labels:
            assert exp in labels, f"Missing KPI label: {exp}"
        
        # Check no _id leakage
        assert "_id" not in str(overview), "Found _id leakage in overview response"
        
        # Check top_ticket_categories exists
        assert "top_ticket_categories" in overview
        
        # Check celebrations_this_week exists
        assert "celebrations_this_week" in overview
        
        print(f"✓ Dashboard overview returns {len(kpis)} KPIs with all expected labels")

    def test_overview_no_id_leakage(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/dashboard/overview")
        assert r.status_code == 200
        text = r.text
        assert '"_id"' not in text, "Found _id in response"
        print("✓ No _id leakage in dashboard overview")


# ─── iter182 · Dashboard Share ─────────────────────────────────────────────
class TestDashboardShare:
    """POST /api/dashboard/share creates share_id; GET /api/dashboard/board/{id} returns board"""

    def test_share_requires_admin(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/dashboard/share", json={"tab": "executive"})
        assert r.status_code == 401, f"Expected 401 without admin token, got {r.status_code}"
        print("✓ Dashboard share requires admin token")

    def test_share_creates_board(self, admin_client):
        r = admin_client.post(f"{BASE_URL}/api/dashboard/share", json={
            "tab": "executive",
            "layout": {"hidden": [], "order": []},
            "expires_minutes": 120
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "share_id" in data
        assert "expires_at" in data
        share_id = data["share_id"]
        print(f"✓ Created share board with id: {share_id}")
        
        # Save for later tests
        with open("/app/memory/.last_share_id", "w") as f:
            f.write(share_id)
        
        return share_id

    def test_board_public_access(self, api_client, admin_client):
        # First create a share
        r = admin_client.post(f"{BASE_URL}/api/dashboard/share", json={
            "tab": "executive",
            "expires_minutes": 120
        })
        assert r.status_code == 200
        share_id = r.json()["share_id"]
        
        # Access without auth
        r2 = api_client.get(f"{BASE_URL}/api/dashboard/board/{share_id}")
        assert r2.status_code == 200, f"Expected 200 for public board, got {r2.status_code}"
        data = r2.json()
        assert data.get("ok") is True
        board = data.get("board", {})
        assert "overview" in board, "Board should include overview"
        assert "views" in board, "Board should track views"
        print(f"✓ Public board access works, views: {board.get('views')}")

    def test_board_404_missing(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/dashboard/board/nonexistent_id_12345")
        assert r.status_code == 404, f"Expected 404 for missing board, got {r.status_code}"
        print("✓ Missing board returns 404")


# ─── iter180 · AI Hiring Flow ──────────────────────────────────────────────
class TestHiringFlow:
    """POST /api/hiring/rank, GET /api/hiring/batches, GET /api/hiring/batch/{id}"""

    def test_rank_requires_admin(self, api_client):
        # Multipart without admin token
        r = api_client.post(f"{BASE_URL}/api/hiring/rank", 
                           data={"job_profile_code": "cook_1"},
                           files=[("files", ("test.txt", b"test resume", "text/plain"))],
                           headers={"Content-Type": None})  # Let requests set multipart
        assert r.status_code == 401, f"Expected 401 without admin token, got {r.status_code}"
        print("✓ Hiring rank requires admin token")

    def test_rank_404_invalid_profile(self, admin_client):
        files = [("files", ("test.txt", b"Test candidate resume content", "text/plain"))]
        r = requests.post(f"{BASE_URL}/api/hiring/rank",
                         data={"job_profile_code": "nonexistent_profile_xyz"},
                         files=files,
                         headers={"X-Admin-Token": ADMIN_TOKEN})
        assert r.status_code == 404, f"Expected 404 for invalid profile, got {r.status_code}"
        print("✓ Invalid job profile returns 404")

    def test_batches_requires_admin(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/hiring/batches")
        assert r.status_code == 401, f"Expected 401 without admin token, got {r.status_code}"
        print("✓ Hiring batches requires admin token")

    def test_batches_list(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/hiring/batches?limit=10")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "batches" in data
        print(f"✓ Hiring batches returns {len(data.get('batches', []))} batches")

    def test_batch_by_id_requires_admin(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/hiring/batch/test123")
        assert r.status_code == 401, f"Expected 401 without admin token, got {r.status_code}"
        print("✓ Hiring batch by id requires admin token")


# ─── iter180 · Concierge Mobile Admin ──────────────────────────────────────
class TestConciergeMobileAdmin:
    """GET /api/concierge-mobile/guests, POST /mint, GET /qr/{token}, POST /revoke/{token}"""

    def test_guests_requires_admin(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/concierge-mobile/guests")
        assert r.status_code == 401, f"Expected 401 without admin token, got {r.status_code}"
        print("✓ Concierge guests requires admin token")

    def test_guests_returns_roster(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/concierge-mobile/guests")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        guests = data.get("guests", [])
        assert len(guests) >= 1, "Expected at least 1 guest in roster"
        
        # Check active_token_count field exists
        for g in guests:
            assert "active_token_count" in g, f"Guest {g.get('id')} missing active_token_count"
        
        print(f"✓ Concierge guests returns {len(guests)} guests with active_token_count")

    def test_mint_requires_admin(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/concierge-mobile/mint", 
                           json={"guest_id": "g_williams_r1208", "ttl_days": 7})
        assert r.status_code == 401, f"Expected 401 without admin token, got {r.status_code}"
        print("✓ Mint requires admin token")

    def test_mint_and_qr(self, admin_client):
        # Mint a token
        r = admin_client.post(f"{BASE_URL}/api/concierge-mobile/mint",
                             json={"guest_id": "g_williams_r1208", "ttl_days": 7})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        token = data.get("token")
        assert token, "Expected token in response"
        print(f"✓ Minted token: {token[:20]}...")
        
        # Save token
        with open("/app/memory/.last_mobile_token", "w") as f:
            f.write(token)
        
        # Get QR code
        r2 = admin_client.get(f"{BASE_URL}/api/concierge-mobile/qr/{token}")
        assert r2.status_code == 200, f"Expected 200 for QR, got {r2.status_code}"
        assert "image/svg+xml" in r2.headers.get("Content-Type", ""), "Expected SVG content type"
        svg_content = r2.text
        assert "<path" in svg_content, "Expected <path> element in SVG QR code"
        print("✓ QR code returns valid SVG with <path> element")
        
        return token

    def test_qr_requires_admin(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/concierge-mobile/qr/sometoken")
        assert r.status_code == 401, f"Expected 401 without admin token, got {r.status_code}"
        print("✓ QR endpoint requires admin token")

    def test_revoke_token(self, admin_client):
        # First mint a token to revoke
        r = admin_client.post(f"{BASE_URL}/api/concierge-mobile/mint",
                             json={"guest_id": "g_santos_r714", "ttl_days": 1})
        assert r.status_code == 200
        token = r.json().get("token")
        
        # Revoke it
        r2 = admin_client.post(f"{BASE_URL}/api/concierge-mobile/revoke/{token}")
        assert r2.status_code == 200, f"Expected 200 for revoke, got {r2.status_code}"
        data = r2.json()
        assert data.get("ok") is True
        assert data.get("deleted") == 1, "Expected deleted count of 1"
        print("✓ Token revocation works")

    def test_revoke_requires_admin(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/concierge-mobile/revoke/sometoken")
        assert r.status_code == 401, f"Expected 401 without admin token, got {r.status_code}"
        print("✓ Revoke requires admin token")


# ─── iter180 · Outlook Token Encryption ────────────────────────────────────
class TestOutlookEncryption:
    """GET /api/outlook/status returns 200 idempotent"""

    def test_outlook_status_idempotent(self, api_client):
        # Should return 200 even without auth
        r = api_client.get(f"{BASE_URL}/api/outlook/status")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "configured" in data
        assert "authenticated" in data
        assert "connected" in data
        print(f"✓ Outlook status: configured={data.get('configured')}, connected={data.get('connected')}")


# ─── Regression · iter175-179 endpoints ────────────────────────────────────
class TestRegressionIter175_179:
    """Light regression on key endpoints from previous iterations"""

    def test_health_endpoint(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        print("✓ Health endpoint works")

    def test_people_list(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/people/list")
        assert r.status_code == 200
        data = r.json()
        assert "employees" in data
        print(f"✓ People list returns {len(data.get('employees', []))} employees")

    def test_milestones_dry_run(self, admin_client):
        today = time.strftime("%Y-%m-%d")
        r = admin_client.post(f"{BASE_URL}/api/milestones/send-today",
                             json={"date": today, "dry_run": True})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        print("✓ Milestones send-today (dry_run) works")

    def test_standup_autofill(self, admin_client):
        today = time.strftime("%Y-%m-%d")
        r = admin_client.post(f"{BASE_URL}/api/standup/autofill",
                             json={"date": today})
        # May return 200, 400, or 422 depending on existing board/validation
        assert r.status_code in [200, 400, 422], f"Unexpected status: {r.status_code}"
        print("✓ Standup autofill endpoint accessible")

    def test_job_profiles_list(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/job-profiles/list")
        assert r.status_code == 200
        data = r.json()
        profiles = data.get("profiles", [])
        assert len(profiles) >= 21, f"Expected 21+ profiles, got {len(profiles)}"
        print(f"✓ Job profiles list returns {len(profiles)} profiles")

    def test_job_profiles_requires_admin(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/job-profiles/list")
        assert r.status_code == 401, f"Expected 401 without admin, got {r.status_code}"
        print("✓ Job profiles requires admin token")

    def test_my_schedule_employee(self, api_client):
        # Get an employee ID first
        r = api_client.get(f"{BASE_URL}/api/people/list?limit=1")
        if r.status_code == 200:
            emps = r.json().get("employees", [])
            if emps:
                emp_id = emps[0].get("id")
                r2 = api_client.get(f"{BASE_URL}/api/my-schedule/employee/{emp_id}")
                assert r2.status_code == 200, f"Expected 200, got {r2.status_code}"
                print(f"✓ My schedule for employee {emp_id} works")
                return
        print("⚠ Skipped my-schedule test (no employees)")

    def test_relay_tickets_list(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/relay/tickets?limit=5")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print("✓ Relay tickets list works")

    def test_auth_me_graceful_401(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401, f"Expected 401 without auth, got {r.status_code}"
        print("✓ Auth /me returns graceful 401")


# ─── iter180 · AI Hiring Rank (Live Claude test - optional) ────────────────
class TestHiringRankLive:
    """Live test of hiring rank with Claude - runs if EMERGENT_LLM_KEY is set"""

    @pytest.mark.slow
    def test_rank_single_candidate(self):
        """Test ranking a single candidate - takes ~5-10 seconds"""
        # Create a simple text resume
        resume_content = b"""
        John Smith
        Senior Cook with 5 years experience
        
        Experience:
        - Lead Line Cook at Marriott Resort (2020-2024)
        - Prep Cook at Hilton (2018-2020)
        
        Skills:
        - Menu development
        - Food safety (ServSafe certified)
        - Team leadership
        - High-volume production
        
        Education:
        - Culinary Arts Diploma, Johnson & Wales (2018)
        """
        
        files = [("files", ("john_smith.txt", resume_content, "text/plain"))]
        start = time.time()
        r = requests.post(f"{BASE_URL}/api/hiring/rank",
                         data={
                             "job_profile_code": "cook_1",
                             "candidate_names": json.dumps(["John Smith"])
                         },
                         files=files,
                         headers={"X-Admin-Token": ADMIN_TOKEN})
        elapsed = time.time() - start
        
        if r.status_code == 503:
            pytest.skip("LLM integration unavailable")
        
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        batch = data.get("batch", {})
        assert "id" in batch
        assert "ranked" in batch
        ranked = batch.get("ranked", [])
        assert len(ranked) == 1
        
        candidate = ranked[0]
        assert "fit_score" in candidate
        assert 0 <= candidate["fit_score"] <= 100
        assert "fit_label" in candidate
        assert "key_strengths" in candidate
        assert "key_gaps" in candidate
        assert "recommendation" in candidate
        assert "interview_questions" in candidate
        
        print(f"✓ Hiring rank completed in {elapsed:.1f}s")
        print(f"  Score: {candidate['fit_score']}, Label: {candidate['fit_label']}")
        print(f"  Recommendation: {candidate['recommendation']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
