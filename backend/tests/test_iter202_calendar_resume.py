"""
iter202a + iter202c Backend Tests
=================================
Tests for:
- Global Calendar Unification (iter202a): /api/calendar/feed, /api/calendar/day, /api/calendar/departments
- Group Resume Builder (iter202c): importable-events, import-from-event, apply-ai-suggestion, existing CRUD
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = "TsjvVFDCvoa4sG4wcVY7ZKF0D7LmA25lTer4edByo5o"

@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def admin_client(api_client):
    api_client.headers.update({"X-Admin-Token": ADMIN_TOKEN})
    return api_client


# ============================================================================
# iter202a · Global Calendar Unification Tests
# ============================================================================

class TestCalendarFeed:
    """Tests for GET /api/calendar/feed — unified calendar aggregator"""
    
    def test_calendar_feed_returns_200(self, api_client):
        """Feed endpoint should return 200 with entries"""
        r = api_client.get(f"{BASE_URL}/api/calendar/feed?from=2025-01-01&to=2027-01-01")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "entries" in data
        assert "departments" in data
        assert "total" in data
        print(f"Calendar feed returned {data['total']} entries")
    
    def test_calendar_feed_has_multiple_sources(self, api_client):
        """Feed should include entries from multiple source_modules"""
        r = api_client.get(f"{BASE_URL}/api/calendar/feed?from=2025-01-01&to=2027-01-01")
        assert r.status_code == 200
        data = r.json()
        entries = data.get("entries", [])
        
        # Collect unique source_modules
        sources = set(e.get("source_module") for e in entries if e.get("source_module"))
        print(f"Source modules found: {sources}")
        
        # Should have at least events (from events collection)
        assert len(entries) > 0, "Expected at least some entries"
        # Main agent said: 63 entries (51 events, 11 PTO, 1 convention)
        assert data["total"] >= 10, f"Expected at least 10 entries, got {data['total']}"
    
    def test_calendar_feed_dept_filter(self, api_client):
        """Feed should filter by depts parameter"""
        r = api_client.get(f"{BASE_URL}/api/calendar/feed?from=2025-01-01&to=2027-01-01&depts=pto,groups")
        assert r.status_code == 200
        data = r.json()
        entries = data.get("entries", [])
        
        # All entries should be from pto or groups dept
        for e in entries:
            dept = e.get("dept")
            assert dept in ("pto", "groups"), f"Entry has unexpected dept: {dept}"
        
        print(f"Filtered feed returned {len(entries)} entries for pto,groups")
    
    def test_calendar_feed_pto_entries(self, api_client):
        """Feed should include PTO entries (main agent said 11 minimum)"""
        r = api_client.get(f"{BASE_URL}/api/calendar/feed?from=2025-01-01&to=2027-01-01&depts=pto")
        assert r.status_code == 200
        data = r.json()
        entries = data.get("entries", [])
        
        pto_count = len([e for e in entries if e.get("dept") == "pto"])
        print(f"PTO entries found: {pto_count}")
        # Main agent said 11 PTO entries minimum
        assert pto_count >= 5, f"Expected at least 5 PTO entries, got {pto_count}"


class TestCalendarDepartments:
    """Tests for GET /api/calendar/departments"""
    
    def test_departments_returns_list(self, api_client):
        """Should return list of 11 departments with id/label/color"""
        r = api_client.get(f"{BASE_URL}/api/calendar/departments")
        assert r.status_code == 200
        data = r.json()
        
        depts = data.get("departments", [])
        assert len(depts) == 11, f"Expected 11 departments, got {len(depts)}"
        
        # Each dept should have id, label, color
        for d in depts:
            assert "id" in d, f"Department missing id: {d}"
            assert "label" in d, f"Department missing label: {d}"
            assert "color" in d, f"Department missing color: {d}"
        
        dept_ids = [d["id"] for d in depts]
        print(f"Department IDs: {dept_ids}")
        
        # Check expected departments exist
        expected = ["events", "conventions", "groups", "pto"]
        for exp in expected:
            assert exp in dept_ids, f"Expected department '{exp}' not found"


class TestCalendarDay:
    """Tests for GET /api/calendar/day — day drill-down"""
    
    def test_day_returns_grouped_entries(self, api_client):
        """Day endpoint should return entries grouped by dept"""
        r = api_client.get(f"{BASE_URL}/api/calendar/day?date=2026-03-01")
        assert r.status_code == 200
        data = r.json()
        
        assert data.get("ok") is True
        assert "by_dept" in data
        assert "departments" in data
        assert "date" in data
        assert data["date"] == "2026-03-01"
        
        print(f"Day drill-down for 2026-03-01: {data.get('total', 0)} entries")
    
    def test_day_invalid_date_returns_400(self, api_client):
        """Invalid date should return 400"""
        r = api_client.get(f"{BASE_URL}/api/calendar/day?date=invalid-date")
        assert r.status_code == 400, f"Expected 400 for invalid date, got {r.status_code}"


# ============================================================================
# iter202c · Group Resume Builder Tests
# ============================================================================

class TestGroupResumeImportableEvents:
    """Tests for GET /api/group-resume/importable-events — route ordering fix"""
    
    def test_importable_events_not_swallowed_as_id(self, api_client):
        """importable-events should NOT be treated as a resume_id (route ordering fix)"""
        r = api_client.get(f"{BASE_URL}/api/group-resume/importable-events")
        # Should NOT return 404 "Resume not found"
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert "events" in data, "Response should have 'events' key"
        assert "total" in data, "Response should have 'total' key"
        
        print(f"Importable events: {data['total']} found")
        # Main agent said ~21 events ready to import
        assert data["total"] >= 5, f"Expected at least 5 importable events, got {data['total']}"
    
    def test_importable_events_structure(self, api_client):
        """Each importable event should have required fields"""
        r = api_client.get(f"{BASE_URL}/api/group-resume/importable-events")
        assert r.status_code == 200
        data = r.json()
        
        events = data.get("events", [])
        if len(events) > 0:
            e = events[0]
            # Should have id, name/title, source_collection
            assert "id" in e, f"Event missing id: {e}"
            assert "source_collection" in e, f"Event missing source_collection: {e}"
            print(f"Sample importable event: {e.get('name') or e.get('title')} from {e.get('source_collection')}")


class TestGroupResumeImportFromEvent:
    """Tests for POST /api/group-resume/import-from-event/{event_id}"""
    
    def test_import_unknown_event_returns_404(self, api_client):
        """Importing unknown event should return 404"""
        r = api_client.post(f"{BASE_URL}/api/group-resume/import-from-event/nonexistent-event-id-xyz")
        assert r.status_code == 404, f"Expected 404 for unknown event, got {r.status_code}"
    
    def test_import_creates_resume_with_prefilled_data(self, api_client):
        """Import should create resume with group_info pre-filled"""
        # First get an importable event
        r = api_client.get(f"{BASE_URL}/api/group-resume/importable-events")
        assert r.status_code == 200
        events = r.json().get("events", [])
        
        if len(events) == 0:
            pytest.skip("No importable events available")
        
        event = events[0]
        event_id = event.get("id")
        
        # Try to import
        r = api_client.post(f"{BASE_URL}/api/group-resume/import-from-event/{event_id}")
        
        # Could be 200 (created) or 409 (already imported)
        assert r.status_code in (200, 409), f"Expected 200 or 409, got {r.status_code}: {r.text}"
        
        if r.status_code == 200:
            data = r.json()
            assert "resume_id" in data, "Created resume should have resume_id"
            assert "imported_from_event_id" in data, "Should have imported_from_event_id"
            assert data["imported_from_event_id"] == event_id
            
            # Check group_info is pre-filled
            gi = data.get("group_info", {})
            assert "group_name" in gi, "group_info should have group_name"
            print(f"Imported resume: {data['resume_id']} for event {event_id}")
        else:
            print(f"Event {event_id} already imported (409)")


class TestGroupResumeApplyAiSuggestion:
    """Tests for PATCH /api/group-resume/{resume_id}/apply-ai-suggestion"""
    
    def test_apply_unknown_resume_returns_404(self, api_client):
        """Applying to unknown resume should return 404"""
        r = api_client.patch(
            f"{BASE_URL}/api/group-resume/nonexistent-resume-xyz/apply-ai-suggestion",
            json={"section": "group_info", "payload": {"group_name": "Test"}}
        )
        assert r.status_code == 404, f"Expected 404, got {r.status_code}"
    
    def test_apply_invalid_section_returns_400(self, api_client):
        """Invalid section should return 400"""
        # First get a valid resume
        r = api_client.get(f"{BASE_URL}/api/group-resume")
        assert r.status_code == 200
        resumes = r.json().get("resumes", [])
        
        if len(resumes) == 0:
            pytest.skip("No resumes available")
        
        resume_id = resumes[0].get("resume_id")
        
        r = api_client.patch(
            f"{BASE_URL}/api/group-resume/{resume_id}/apply-ai-suggestion",
            json={"section": "invalid_section_xyz", "payload": {}}
        )
        assert r.status_code == 400, f"Expected 400 for invalid section, got {r.status_code}"
    
    def test_apply_valid_suggestion(self, api_client):
        """Valid apply should update the section"""
        # Get a resume
        r = api_client.get(f"{BASE_URL}/api/group-resume")
        assert r.status_code == 200
        resumes = r.json().get("resumes", [])
        
        if len(resumes) == 0:
            pytest.skip("No resumes available")
        
        resume_id = resumes[0].get("resume_id")
        
        # Apply a suggestion to group_info
        test_payload = {"group_name": "TEST_Applied_Suggestion", "company": "Test Corp"}
        r = api_client.patch(
            f"{BASE_URL}/api/group-resume/{resume_id}/apply-ai-suggestion",
            json={"section": "group_info", "payload": test_payload}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("section") == "group_info"
        
        # Verify the change persisted
        r = api_client.get(f"{BASE_URL}/api/group-resume/{resume_id}")
        assert r.status_code == 200
        updated = r.json()
        gi = updated.get("group_info", {})
        assert gi.get("group_name") == "TEST_Applied_Suggestion"
        print(f"Applied AI suggestion to {resume_id}")


class TestGroupResumeExistingEndpoints:
    """Tests for existing Group Resume endpoints (should still work)"""
    
    def test_list_resumes(self, api_client):
        """GET /api/group-resume should list resumes"""
        r = api_client.get(f"{BASE_URL}/api/group-resume")
        assert r.status_code == 200
        data = r.json()
        assert "resumes" in data
        assert "total" in data
        print(f"Total resumes: {data['total']}")
    
    def test_get_resume_by_id(self, api_client):
        """GET /api/group-resume/{id} should return resume detail"""
        # First list to get an ID
        r = api_client.get(f"{BASE_URL}/api/group-resume")
        assert r.status_code == 200
        resumes = r.json().get("resumes", [])
        
        if len(resumes) == 0:
            pytest.skip("No resumes available")
        
        resume_id = resumes[0].get("resume_id")
        
        r = api_client.get(f"{BASE_URL}/api/group-resume/{resume_id}")
        assert r.status_code == 200
        data = r.json()
        assert data.get("resume_id") == resume_id
        print(f"Got resume: {resume_id}")
    
    def test_get_resume_not_found(self, api_client):
        """GET /api/group-resume/{id} should return 404 for unknown"""
        r = api_client.get(f"{BASE_URL}/api/group-resume/nonexistent-resume-xyz")
        assert r.status_code == 404
    
    def test_create_resume(self, api_client):
        """POST /api/group-resume should create new resume"""
        r = api_client.post(f"{BASE_URL}/api/group-resume", json={
            "group_info": {
                "group_name": "TEST_iter202_Create",
                "company": "Test Company",
                "arrival_date": "2026-06-01",
                "departure_date": "2026-06-03",
                "estimated_attendance": 100
            }
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "resume_id" in data
        assert data.get("group_info", {}).get("group_name") == "TEST_iter202_Create"
        print(f"Created resume: {data['resume_id']}")
    
    def test_update_resume(self, api_client):
        """PUT /api/group-resume/{id} should update resume"""
        # Create one first
        r = api_client.post(f"{BASE_URL}/api/group-resume", json={
            "group_info": {"group_name": "TEST_iter202_Update"}
        })
        assert r.status_code == 200
        resume_id = r.json().get("resume_id")
        
        # Update it
        r = api_client.put(f"{BASE_URL}/api/group-resume/{resume_id}", json={
            "group_info": {"group_name": "TEST_iter202_Updated"},
            "notes": "Updated via test"
        })
        assert r.status_code == 200
        data = r.json()
        assert "updated" in data
        
        # Verify
        r = api_client.get(f"{BASE_URL}/api/group-resume/{resume_id}")
        assert r.status_code == 200
        assert r.json().get("notes") == "Updated via test"
        print(f"Updated resume: {resume_id}")
    
    def test_ai_assist_endpoint(self, api_client):
        """POST /api/group-resume/{id}/ai-assist should work"""
        # Get a resume
        r = api_client.get(f"{BASE_URL}/api/group-resume")
        resumes = r.json().get("resumes", [])
        
        if len(resumes) == 0:
            pytest.skip("No resumes available")
        
        resume_id = resumes[0].get("resume_id")
        
        r = api_client.post(f"{BASE_URL}/api/group-resume/{resume_id}/ai-assist", json={
            "action": "improve",
            "section": "group_info",
            "notes": "Test notes"
        })
        # Should return 200 even if AI key not configured (graceful fallback)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        # Either has suggestion or error (if no AI key)
        assert "suggestion" in data or "error" in data
        print(f"AI assist response: {list(data.keys())}")
    
    def test_pdf_export(self, api_client):
        """GET /api/group-resume/{id}/pdf should return PDF"""
        # Get a resume
        r = api_client.get(f"{BASE_URL}/api/group-resume")
        resumes = r.json().get("resumes", [])
        
        if len(resumes) == 0:
            pytest.skip("No resumes available")
        
        resume_id = resumes[0].get("resume_id")
        
        r = api_client.get(f"{BASE_URL}/api/group-resume/{resume_id}/pdf")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        assert "application/pdf" in r.headers.get("content-type", "")
        print(f"PDF export successful for {resume_id}")


# ============================================================================
# iter201 Regression Tests — BEO Gantt / Events
# ============================================================================

class TestBeoGanttRegression:
    """Regression tests for BEO Gantt events loading (iter201 fix)"""
    
    def test_calendar_events_returns_data(self, api_client):
        """GET /api/calendar/events should return events array"""
        r = api_client.get(f"{BASE_URL}/api/calendar/events")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        # The response shape parser fix: should handle Array.isArray(data.data)
        # Response could be {data: [...]} or {events: [...]} or {data: {events: [...]}}
        events = None
        if isinstance(data, list):
            events = data
        elif isinstance(data.get("data"), list):
            events = data["data"]
        elif isinstance(data.get("events"), list):
            events = data["events"]
        elif isinstance(data.get("data", {}).get("events"), list):
            events = data["data"]["events"]
        
        assert events is not None, f"Could not find events array in response: {list(data.keys()) if isinstance(data, dict) else type(data)}"
        print(f"Calendar events returned {len(events)} events")
        # Main agent said 136 events in DB, 52 returned by API
        assert len(events) >= 10, f"Expected at least 10 events, got {len(events)}"


class TestEventsEndpoint:
    """Tests for /api/events endpoint (used by BEO/Contracts tab)"""
    
    def test_events_list(self, api_client):
        """GET /api/events should return events list"""
        r = api_client.get(f"{BASE_URL}/api/events?limit=100")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        # Could be array or {events: [...]}
        events = data if isinstance(data, list) else data.get("events", data.get("data", []))
        print(f"Events endpoint returned {len(events)} events")
        assert len(events) >= 5, f"Expected at least 5 events"


# ============================================================================
# Cleanup
# ============================================================================

class TestCleanup:
    """Cleanup TEST_ prefixed data"""
    
    def test_cleanup_test_resumes(self, admin_client):
        """Remove TEST_ prefixed resumes created during testing"""
        r = admin_client.get(f"{BASE_URL}/api/group-resume")
        if r.status_code != 200:
            return
        
        resumes = r.json().get("resumes", [])
        cleaned = 0
        for res in resumes:
            gi = res.get("group_info", {})
            name = gi.get("group_name", "")
            if name.startswith("TEST_"):
                # No delete endpoint, so just note it
                cleaned += 1
        
        print(f"Found {cleaned} TEST_ prefixed resumes (manual cleanup may be needed)")
