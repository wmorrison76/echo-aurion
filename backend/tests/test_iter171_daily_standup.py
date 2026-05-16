"""
Iter171 · Daily Standup Board ("The Sailing Yacht") — Backend API Tests

Tests for the 14-section morning briefing board:
- GET /api/standup/today — returns board with today's date, status='draft', 14 section placeholders
- GET /api/standup/date/{YYYY-MM-DD} — returns/creates board for that date
- POST /api/standup/autofill — fills vips_in_house + hours + glitches (+ activities if events exist)
- POST /api/standup/section — updates section content, sets approved=false
- POST /api/standup/section/approve — sets approved=true
- POST /api/standup/publish — flips status='confirmed'
- POST /api/standup/send — returns dry-run when RESEND_API_KEY absent, 400 if not confirmed
- POST /api/standup/ingest — multipart PDF upload, stores in standup_ingested_pdfs

Regression tests for iter169 features (SolveBar, echo-concierge, foh-concierge-hub, seed/plant)
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"

TODAY = datetime.now().strftime("%Y-%m-%d")


class TestDailyStandupBoard:
    """Daily Standup Board API tests — iter171"""

    def test_health_check(self):
        """Verify backend is healthy"""
        r = requests.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "healthy"
        print("✓ Health check passed")

    def test_get_today_board(self):
        """GET /api/standup/today returns board with today's date, 14 sections"""
        r = requests.get(f"{BASE_URL}/api/standup/today")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        board = data.get("board")
        assert board is not None, "Board should be returned"
        assert board.get("date") == TODAY, f"Expected date {TODAY}, got {board.get('date')}"
        # Status can be draft, confirmed, or sent depending on prior test runs (upsert semantics)
        assert board.get("status") in ["draft", "confirmed", "sent"], f"Invalid status: {board.get('status')}"
        sections_def = data.get("sections_def", [])
        assert len(sections_def) == 14, f"Expected 14 section definitions, got {len(sections_def)}"
        # Verify section IDs
        expected_ids = ["ops_numbers", "vip_arrivals", "vips_in_house", "gss_goals", "top_areas",
                        "glitches", "showrooms", "fb_covers", "leadership", "people_services",
                        "hours", "groups", "site_visits", "activities"]
        actual_ids = [s["id"] for s in sections_def]
        assert actual_ids == expected_ids, f"Section IDs mismatch: {actual_ids}"
        print(f"✓ GET /api/standup/today returned board for {TODAY} with 14 sections (status: {board.get('status')})")

    def test_get_date_board(self):
        """GET /api/standup/date/{YYYY-MM-DD} returns/creates board for that date"""
        test_date = "2026-01-20"
        r = requests.get(f"{BASE_URL}/api/standup/date/{test_date}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        board = data.get("board")
        assert board.get("date") == test_date
        assert board.get("status") == "draft"
        assert "sections" in board
        assert len(board["sections"]) == 14
        print(f"✓ GET /api/standup/date/{test_date} returned board with 14 sections")

    def test_autofill_board(self):
        """POST /api/standup/autofill fills sections from live OS data"""
        # Use form data as per the endpoint definition
        r = requests.post(f"{BASE_URL}/api/standup/autofill", data={"date": TODAY})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        autofilled = data.get("autofilled_sections", [])
        # Should autofill at least vips_in_house and hours (from seeded data)
        print(f"✓ POST /api/standup/autofill returned autofilled_sections: {autofilled}")
        board = data.get("board")
        assert board is not None
        # Check that autofilled sections have autofilled=True
        for section_id in autofilled:
            sec = board["sections"].get(section_id, {})
            assert sec.get("autofilled") is True, f"Section {section_id} should have autofilled=True"
        print(f"✓ Autofilled {len(autofilled)} section(s)")

    def test_update_section(self):
        """POST /api/standup/section updates section content"""
        payload = {
            "date": TODAY,
            "section_id": "ops_numbers",
            "content": {
                "occupancy": 85,
                "arrivals": 42,
                "departures": 38,
                "in_house": 312
            },
            "edited_by": "TEST_concierge"
        }
        r = requests.post(f"{BASE_URL}/api/standup/section", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        board = data.get("board")
        sec = board["sections"]["ops_numbers"]
        assert sec["content"]["occupancy"] == 85
        assert sec["edited_by"] == "TEST_concierge"
        assert sec["approved"] is False, "Section should be unapproved after edit"
        assert sec["updated_at"] is not None
        print("✓ POST /api/standup/section updated ops_numbers content")

    def test_approve_section(self):
        """POST /api/standup/section/approve sets approved=true"""
        # First ensure section has content
        requests.post(f"{BASE_URL}/api/standup/section", json={
            "date": TODAY,
            "section_id": "vip_arrivals",
            "content": {"guests": [{"name": "TEST_VIP", "room": "1001", "tier": "platinum"}]}
        })
        # Now approve
        payload = {
            "date": TODAY,
            "section_id": "vip_arrivals",
            "approved_by": "TEST_front-office"
        }
        r = requests.post(f"{BASE_URL}/api/standup/section/approve", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        board = data.get("board")
        sec = board["sections"]["vip_arrivals"]
        assert sec["approved"] is True
        assert sec.get("approved_by") == "TEST_front-office"
        print("✓ POST /api/standup/section/approve set vip_arrivals to approved")

    def test_send_before_confirm_fails(self):
        """POST /api/standup/send returns 400 if board not confirmed"""
        # Create a fresh board for a different date to ensure it's draft
        test_date = "2026-01-21"
        requests.get(f"{BASE_URL}/api/standup/date/{test_date}")  # Create draft board
        r = requests.post(f"{BASE_URL}/api/standup/send", json={"date": test_date})
        assert r.status_code == 400, f"Expected 400 for unconfirmed board, got {r.status_code}"
        print("✓ POST /api/standup/send correctly returns 400 for unconfirmed board")

    def test_publish_board(self):
        """POST /api/standup/publish flips status='confirmed'"""
        payload = {
            "date": TODAY,
            "confirmed_by": "TEST_front-office"
        }
        r = requests.post(f"{BASE_URL}/api/standup/publish", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        board = data.get("board")
        assert board["status"] == "confirmed"
        assert board["confirmed_by"] == "TEST_front-office"
        assert board["confirmed_at"] is not None
        print("✓ POST /api/standup/publish set status to 'confirmed'")

    def test_send_board_dry_run(self):
        """POST /api/standup/send returns dry-run when RESEND_API_KEY absent"""
        # Board should be confirmed from previous test
        payload = {"date": TODAY, "to": []}
        r = requests.post(f"{BASE_URL}/api/standup/send", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("status") == "dry-run", f"Expected dry-run status, got {data.get('status')}"
        assert data.get("dry_run") is True
        assert data.get("html_preview_bytes", 0) > 0, "Should have HTML preview bytes"
        print(f"✓ POST /api/standup/send returned dry-run with {data.get('html_preview_bytes')} bytes HTML")

    def test_ingest_pdf(self):
        """POST /api/standup/ingest accepts multipart PDF and stores in standup_ingested_pdfs"""
        # Create a minimal PDF-like bytes (just for testing the endpoint accepts files)
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
        files = {"file": ("TEST_arrivals.pdf", pdf_content, "application/pdf")}
        data = {"date": TODAY, "section_hint": "vip_arrivals"}
        r = requests.post(f"{BASE_URL}/api/standup/ingest", files=files, data=data)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        result = r.json()
        assert result.get("ok") is True
        assert result.get("ingest_id") is not None
        assert result.get("filename") == "TEST_arrivals.pdf"
        assert result.get("size") > 0
        print(f"✓ POST /api/standup/ingest stored PDF: {result.get('filename')}, {result.get('size')} bytes")

    def test_list_ingested_pdfs(self):
        """GET /api/standup/ingested returns list of ingested PDFs for date"""
        r = requests.get(f"{BASE_URL}/api/standup/ingested", params={"date": TODAY})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "ingested" in data
        assert "total" in data
        print(f"✓ GET /api/standup/ingested returned {data.get('total')} ingested PDFs")


class TestRegressionIter169:
    """Regression tests for iter169 features"""

    def test_solve_bar_endpoint(self):
        """POST /api/concierge-v2/solve endpoint exists (LLM may 502 if budget exhausted)"""
        payload = {
            "query": "Guest needs late checkout",
            "guest_id": "g-101"
        }
        r = requests.post(f"{BASE_URL}/api/concierge-v2/solve", json=payload)
        # Accept 200 (success) or 502 (LLM budget exhausted) - both indicate endpoint exists
        assert r.status_code in [200, 502], f"Expected 200 or 502, got {r.status_code}"
        print(f"✓ POST /api/concierge-v2/solve endpoint exists (status: {r.status_code})")

    def test_echo_concierge_outlets(self):
        """GET /api/concierge-v2/outlets returns seeded outlets"""
        r = requests.get(f"{BASE_URL}/api/concierge-v2/outlets")
        assert r.status_code == 200
        data = r.json()
        outlets = data.get("outlets", data) if isinstance(data, dict) else data
        assert len(outlets) >= 5, f"Should have at least 5 seeded outlets, got {len(outlets)}"
        print(f"✓ GET /api/concierge-v2/outlets returned {len(outlets)} outlets")

    def test_foh_concierge_local_places(self):
        """GET /api/foh-concierge/local-places returns 200"""
        r = requests.get(f"{BASE_URL}/api/foh-concierge/local-places")
        assert r.status_code == 200
        print("✓ GET /api/foh-concierge/local-places returned 200")

    def test_seed_plant_pillars(self):
        """GET /api/seed/pillars returns 200"""
        r = requests.get(f"{BASE_URL}/api/seed/pillars")
        assert r.status_code == 200
        print("✓ GET /api/seed/pillars returned 200")

    def test_guest_profile(self):
        """GET /api/guest/profile returns seeded guests"""
        r = requests.get(f"{BASE_URL}/api/guest/profile")
        assert r.status_code == 200
        data = r.json()
        guests = data.get("guests", data) if isinstance(data, dict) else data
        assert len(guests) >= 5, f"Should have at least 5 seeded guests, got {len(guests)}"
        print(f"✓ GET /api/guest/profile returned {len(guests)} guests")


class TestSectionDefinitions:
    """Verify all 14 section definitions are correct"""

    def test_section_definitions_complete(self):
        """Verify all 14 sections have correct metadata"""
        r = requests.get(f"{BASE_URL}/api/standup/today")
        assert r.status_code == 200
        data = r.json()
        sections_def = data.get("sections_def", [])
        
        expected_sections = [
            {"id": "ops_numbers", "label": "Operational Numbers", "dept": "front-office"},
            {"id": "vip_arrivals", "label": "VIP Arrivals", "dept": "guest-services"},
            {"id": "vips_in_house", "label": "VIPs In-House", "dept": "guest-services"},
            {"id": "gss_goals", "label": "GSS Goals & Positioning", "dept": "quality"},
            {"id": "top_areas", "label": "Top Areas of Opportunity", "dept": "quality"},
            {"id": "glitches", "label": "Glitch Guests to Flag", "dept": "guest-services"},
            {"id": "showrooms", "label": "Showrooms", "dept": "housekeeping"},
            {"id": "fb_covers", "label": "F&B Covers", "dept": "fb"},
            {"id": "leadership", "label": "Leadership on Duty", "dept": "front-office"},
            {"id": "people_services", "label": "People Services · Recognition", "dept": "people-services"},
            {"id": "hours", "label": "Hours of Operation", "dept": "fb"},
            {"id": "groups", "label": "Groups In-House", "dept": "sales"},
            {"id": "site_visits", "label": "Site Visits", "dept": "sales"},
            {"id": "activities", "label": "Resort Activities", "dept": "activities"},
        ]
        
        for i, expected in enumerate(expected_sections):
            actual = sections_def[i]
            assert actual["id"] == expected["id"], f"Section {i} id mismatch"
            assert actual["label"] == expected["label"], f"Section {i} label mismatch"
            assert actual["dept"] == expected["dept"], f"Section {i} dept mismatch"
        
        print("✓ All 14 section definitions verified with correct id, label, and dept")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
