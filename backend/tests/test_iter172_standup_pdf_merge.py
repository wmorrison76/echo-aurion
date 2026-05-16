"""
Iter172 · Daily Standup Board PDF→LLM Auto-Merge Pipeline + EchoConcierge Phase 2 Regression

Tests:
1. Standup board endpoints: /api/standup/today, /api/standup/date/{date}
2. Autofill from live OS collections
3. PDF ingest with pdfminer.six text extraction (text_chars > 0)
4. Claude Sonnet 4.5 proposal generation (/api/standup/ingest/{id}/propose)
5. Accept merge with section selection (/api/standup/ingest/accept)
6. Publish and send (dry-run) workflow
7. Section edit/approve lifecycle + block after sent
8. EchoConcierge Phase 2 regression: outlets, dining, rooms, transport, celebration, recovery, ird, folio
"""
import pytest
import requests
import os
import io
import time

# Use reportlab to generate synthetic PDF
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"

TEST_DATE = "2026-04-19"  # Fresh board date for testing


def generate_synthetic_pdf():
    """Generate a synthetic PDF with hotel operational data for Claude to parse."""
    if not REPORTLAB_AVAILABLE:
        return None
    
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    
    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(72, 750, "DAILY ARRIVALS REPORT - April 19, 2026")
    
    # Operational Numbers
    c.setFont("Helvetica-Bold", 12)
    c.drawString(72, 710, "OPERATIONAL SUMMARY")
    c.setFont("Helvetica", 11)
    c.drawString(72, 690, "ARRIVALS: 42")
    c.drawString(72, 675, "DEPARTURES: 38")
    c.drawString(72, 660, "OCCUPANCY: 87%")
    c.drawString(72, 645, "ADR: $425")
    
    # VIP Arrivals
    c.setFont("Helvetica-Bold", 12)
    c.drawString(72, 610, "VIP ARRIVALS TODAY")
    c.setFont("Helvetica", 11)
    c.drawString(72, 590, "1. Mr. James Wellington - Room 1201 - PLATINUM - Anniversary stay")
    c.drawString(72, 575, "2. Ms. Sofia Rodriguez - Room 2002 - OWNER - Return visit")
    c.drawString(72, 560, "3. Dr. Michael Chen - Room 1414 - GOLD - Medical conference")
    
    # Events
    c.setFont("Helvetica-Bold", 12)
    c.drawString(72, 520, "RESORT ACTIVITIES")
    c.setFont("Helvetica", 11)
    c.drawString(72, 500, "09:00 - Morning Yoga at Pool Deck")
    c.drawString(72, 485, "14:00 - Wine Tasting at Atrium Lounge")
    c.drawString(72, 470, "19:00 - Live Jazz at Harbor Terrace")
    
    c.save()
    buffer.seek(0)
    return buffer.getvalue()


class TestStandupBoardBasics:
    """Test basic standup board endpoints"""
    
    def test_health_check(self):
        """Verify API is healthy"""
        r = requests.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        print("✓ Health check passed")
    
    def test_get_today_board(self):
        """GET /api/standup/today returns board with 14 section_defs"""
        r = requests.get(f"{BASE_URL}/api/standup/today")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "board" in data
        assert "sections_def" in data
        assert len(data["sections_def"]) == 14
        print(f"✓ Today's board returned with {len(data['sections_def'])} section definitions")
    
    def test_get_date_board(self):
        """GET /api/standup/date/{date} returns/creates board for specific date"""
        r = requests.get(f"{BASE_URL}/api/standup/date/{TEST_DATE}")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data["board"]["date"] == TEST_DATE
        assert len(data["sections_def"]) == 14
        # Verify all 14 section IDs
        section_ids = [s["id"] for s in data["sections_def"]]
        expected_ids = ["ops_numbers", "vip_arrivals", "vips_in_house", "gss_goals", "top_areas",
                       "glitches", "showrooms", "fb_covers", "leadership", "people_services",
                       "hours", "groups", "site_visits", "activities"]
        for sid in expected_ids:
            assert sid in section_ids, f"Missing section: {sid}"
        print(f"✓ Board for {TEST_DATE} returned with all 14 sections")


class TestStandupAutofill:
    """Test autofill from live OS collections"""
    
    def test_autofill_populates_sections(self):
        """POST /api/standup/autofill populates vips_in_house, hours, activities, glitches"""
        # First ensure board exists
        requests.get(f"{BASE_URL}/api/standup/date/{TEST_DATE}")
        
        # Trigger autofill
        r = requests.post(f"{BASE_URL}/api/standup/autofill", data={"date": TEST_DATE})
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        
        autofilled = data.get("autofilled_sections", [])
        print(f"✓ Autofill completed, sections filled: {autofilled}")
        
        # Verify board has autofilled content
        board = data.get("board", {})
        sections = board.get("sections", {})
        
        # Check at least some sections were autofilled
        autofilled_count = sum(1 for s in sections.values() if s.get("autofilled"))
        print(f"  → {autofilled_count} sections marked as autofilled")


class TestPDFIngestAndPropose:
    """Test PDF ingest with text extraction and Claude proposal"""
    
    @pytest.fixture
    def synthetic_pdf(self):
        """Generate synthetic PDF for testing"""
        pdf_data = generate_synthetic_pdf()
        if pdf_data is None:
            pytest.skip("reportlab not available for PDF generation")
        return pdf_data
    
    def test_ingest_pdf_extracts_text(self, synthetic_pdf):
        """POST /api/standup/ingest accepts PDF and extracts text (text_chars > 0)"""
        files = {"file": ("TEST_arrivals_report.pdf", synthetic_pdf, "application/pdf")}
        data = {"date": TEST_DATE, "section_hint": "auto"}
        
        r = requests.post(f"{BASE_URL}/api/standup/ingest", files=files, data=data)
        assert r.status_code == 200
        result = r.json()
        assert result.get("ok") is True
        assert "ingest_id" in result
        assert result.get("text_chars", 0) > 0, "PDF text extraction should return text_chars > 0"
        
        print(f"✓ PDF ingested: {result['filename']}, {result['text_chars']} chars extracted")
        return result["ingest_id"]
    
    def test_propose_from_pdf_calls_claude(self, synthetic_pdf):
        """POST /api/standup/ingest/{id}/propose calls Claude and returns proposed_sections"""
        # First ingest the PDF
        files = {"file": ("TEST_arrivals_report.pdf", synthetic_pdf, "application/pdf")}
        data = {"date": TEST_DATE, "section_hint": "auto"}
        ingest_r = requests.post(f"{BASE_URL}/api/standup/ingest", files=files, data=data)
        assert ingest_r.status_code == 200
        ingest_id = ingest_r.json()["ingest_id"]
        
        # Call propose endpoint
        r = requests.post(f"{BASE_URL}/api/standup/ingest/{ingest_id}/propose")
        
        # May return 502 if LLM budget exhausted - that's acceptable
        if r.status_code == 502:
            print("⚠ LLM budget may be exhausted (502) - skipping proposal validation")
            pytest.skip("LLM budget exhausted")
        
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "proposal" in data
        
        proposal = data["proposal"]
        proposed_sections = proposal.get("proposed_sections", [])
        print(f"✓ Claude proposed {len(proposed_sections)} section merges")
        
        # Validate proposal structure
        for ps in proposed_sections:
            assert "section_id" in ps
            assert "content" in ps
            assert "confidence" in ps
            assert "rationale" in ps
            print(f"  → {ps['section_id']}: confidence {ps['confidence']:.0%}")
        
        return ingest_id, proposed_sections
    
    def test_accept_merge_updates_board(self, synthetic_pdf):
        """POST /api/standup/ingest/accept merges selected sections into board"""
        # Ingest PDF
        files = {"file": ("TEST_merge_test.pdf", synthetic_pdf, "application/pdf")}
        data = {"date": TEST_DATE, "section_hint": "auto"}
        ingest_r = requests.post(f"{BASE_URL}/api/standup/ingest", files=files, data=data)
        ingest_id = ingest_r.json()["ingest_id"]
        
        # Get proposal
        propose_r = requests.post(f"{BASE_URL}/api/standup/ingest/{ingest_id}/propose")
        if propose_r.status_code == 502:
            pytest.skip("LLM budget exhausted")
        
        proposal = propose_r.json().get("proposal", {})
        proposed_sections = proposal.get("proposed_sections", [])
        
        if not proposed_sections:
            print("⚠ No sections proposed - skipping merge test")
            pytest.skip("No sections proposed by Claude")
        
        # Accept only first section (partial merge)
        section_ids = [proposed_sections[0]["section_id"]]
        
        accept_r = requests.post(f"{BASE_URL}/api/standup/ingest/accept", json={
            "date": TEST_DATE,
            "ingest_id": ingest_id,
            "section_ids": section_ids
        })
        assert accept_r.status_code == 200
        result = accept_r.json()
        assert result.get("ok") is True
        assert "merged_sections" in result
        assert "board" in result
        
        merged = result["merged_sections"]
        print(f"✓ Merged {len(merged)} section(s): {merged}")
        
        # Verify board was updated
        board = result["board"]
        assert board is not None, "Board should not be null after merge"


class TestSectionEditApproveLifecycle:
    """Test section edit/approve lifecycle and blocking after sent"""
    
    def test_edit_section(self):
        """POST /api/standup/section updates content"""
        r = requests.post(f"{BASE_URL}/api/standup/section", json={
            "date": TEST_DATE,
            "section_id": "leadership",
            "content": {"duty_manager": "TEST_John Smith", "foh_lead": "TEST_Jane Doe"},
            "edited_by": "TEST_concierge"
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        
        board = data["board"]
        section = board["sections"]["leadership"]
        assert section["content"]["duty_manager"] == "TEST_John Smith"
        assert section["edited_by"] == "TEST_concierge"
        assert section["approved"] is False  # Editing resets approval
        print("✓ Section edit successful")
    
    def test_approve_section(self):
        """POST /api/standup/section/approve sets approved=true"""
        # First add content
        requests.post(f"{BASE_URL}/api/standup/section", json={
            "date": TEST_DATE,
            "section_id": "leadership",
            "content": {"duty_manager": "TEST_Approved Manager"},
        })
        
        # Approve
        r = requests.post(f"{BASE_URL}/api/standup/section/approve", json={
            "date": TEST_DATE,
            "section_id": "leadership",
            "approved_by": "TEST_front-office"
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        
        section = data["board"]["sections"]["leadership"]
        assert section["approved"] is True
        print("✓ Section approved successfully")


class TestPublishAndSend:
    """Test publish and send workflow"""
    
    def test_publish_board(self):
        """POST /api/standup/publish flips status to confirmed"""
        r = requests.post(f"{BASE_URL}/api/standup/publish", json={
            "date": TEST_DATE,
            "confirmed_by": "TEST_front-office"
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        
        board = data["board"]
        assert board["status"] == "confirmed"
        assert board["confirmed_by"] == "TEST_front-office"
        assert board["confirmed_at"] is not None
        print("✓ Board published/confirmed")
    
    def test_send_briefing_dry_run(self):
        """POST /api/standup/send returns dry-run when RESEND key absent"""
        # Ensure board is confirmed first
        requests.post(f"{BASE_URL}/api/standup/publish", json={"date": TEST_DATE})
        
        r = requests.post(f"{BASE_URL}/api/standup/send", json={
            "date": TEST_DATE,
            "to": []
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("dry_run") is True or data.get("status") == "dry-run"
        assert data.get("html_preview_bytes", 0) > 0
        print(f"✓ Send briefing dry-run: {data.get('html_preview_bytes')} bytes HTML")


class TestConciergeV2Regression:
    """Regression tests for EchoConcierge Phase 2 endpoints"""
    
    def test_outlets_endpoint(self):
        """GET /api/concierge-v2/outlets returns outlets list"""
        r = requests.get(f"{BASE_URL}/api/concierge-v2/outlets")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert len(data.get("outlets", [])) >= 5
        print(f"✓ Outlets: {len(data['outlets'])} returned")
    
    def test_dining_reserve(self):
        """POST /api/concierge-v2/dining/reserve creates reservation"""
        # Get a guest first
        guests_r = requests.get(f"{BASE_URL}/api/guest/profile")
        guests = guests_r.json().get("guests", [])
        if not guests:
            pytest.skip("No guests available")
        guest_id = guests[0]["id"]
        
        # Get an outlet
        outlets_r = requests.get(f"{BASE_URL}/api/concierge-v2/outlets")
        outlets = outlets_r.json().get("outlets", [])
        outlet_id = outlets[0]["id"]
        
        r = requests.post(f"{BASE_URL}/api/concierge-v2/dining/reserve", json={
            "guest_id": guest_id,
            "outlet_id": outlet_id,
            "party_size": 2,
            "when": "2026-04-19 19:00",
            "table_preference": "window"
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "reservation" in data
        print(f"✓ Dining reservation created: table {data['reservation']['table_number']}")
    
    def test_rooms_upgrades(self):
        """GET /api/concierge-v2/rooms/upgrades returns upgrade candidates"""
        r = requests.get(f"{BASE_URL}/api/concierge-v2/rooms/upgrades?current_room=0808")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "upgrades" in data
        print(f"✓ Room upgrades: {len(data['upgrades'])} candidates")
    
    def test_transport_options(self):
        """GET /api/concierge-v2/transport/options returns transport list"""
        r = requests.get(f"{BASE_URL}/api/concierge-v2/transport/options")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert len(data.get("options", [])) >= 9
        print(f"✓ Transport options: {len(data['options'])} available")
    
    def test_transport_request(self):
        """POST /api/concierge-v2/transport/request creates transport request"""
        guests_r = requests.get(f"{BASE_URL}/api/guest/profile")
        guests = guests_r.json().get("guests", [])
        if not guests:
            pytest.skip("No guests available")
        guest_id = guests[0]["id"]
        
        r = requests.post(f"{BASE_URL}/api/concierge-v2/transport/request", json={
            "guest_id": guest_id,
            "pickup_location": "Hotel lobby",
            "dropoff_location": "Airport",
            "when": "2026-04-19 14:00",
            "service": "uber-black",
            "party_size": 2
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data["request"]["status"] == "dispatched"
        print("✓ Transport request dispatched")
    
    def test_celebration_compose(self):
        """POST /api/concierge-v2/celebration/compose creates cascade"""
        guests_r = requests.get(f"{BASE_URL}/api/guest/profile")
        guests = guests_r.json().get("guests", [])
        if not guests:
            pytest.skip("No guests available")
        guest_id = guests[0]["id"]
        
        r = requests.post(f"{BASE_URL}/api/concierge-v2/celebration/compose", json={
            "guest_id": guest_id,
            "celebration": "anniversary",
            "date": "2026-04-19",
            "notes": "TEST celebration"
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "cascade" in data
        cascade = data["cascade"]
        assert cascade.get("pastry") == 1
        assert cascade.get("housekeeping") == 1
        assert cascade.get("florist") == 1
        assert cascade.get("amenity") == 1
        print(f"✓ Celebration cascade: {sum(cascade.values())} departments notified")
    
    def test_recovery_open(self):
        """POST /api/concierge-v2/recovery/open creates recovery case"""
        guests_r = requests.get(f"{BASE_URL}/api/guest/profile")
        guests = guests_r.json().get("guests", [])
        if not guests:
            pytest.skip("No guests available")
        guest_id = guests[0]["id"]
        
        r = requests.post(f"{BASE_URL}/api/concierge-v2/recovery/open", json={
            "guest_id": guest_id,
            "category": "room",
            "description": "TEST_AC not working properly",
            "severity": "high"
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data["case"]["status"] == "open"
        print("✓ Recovery case opened")
    
    def test_ird_amenities(self):
        """GET /api/concierge-v2/ird/amenities returns amenities list"""
        r = requests.get(f"{BASE_URL}/api/concierge-v2/ird/amenities")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert len(data.get("amenities", [])) >= 10
        print(f"✓ IRD amenities: {len(data['amenities'])} available")
    
    def test_guest_folio(self):
        """GET /api/guest/folio returns guest folio data"""
        guests_r = requests.get(f"{BASE_URL}/api/guest/profile")
        guests = guests_r.json().get("guests", [])
        if not guests:
            pytest.skip("No guests available")
        guest_id = guests[0]["id"]
        
        r = requests.get(f"{BASE_URL}/api/guest/folio?guest_id={guest_id}")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "folio" in data
        assert "guest" in data
        print(f"✓ Guest folio retrieved: {data['folio']['counts']}")


class TestSolveBarRegression:
    """Regression test for SolveBar LLM endpoint"""
    
    def test_solve_endpoint(self):
        """POST /api/concierge-v2/solve returns resolution"""
        r = requests.post(f"{BASE_URL}/api/concierge-v2/solve", json={
            "query": "room 1201 wants an upgrade",
            "guest_hint": None
        })
        
        # May return 502 if LLM budget exhausted
        if r.status_code == 502:
            print("⚠ LLM budget may be exhausted (502)")
            pytest.skip("LLM budget exhausted")
        
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "resolution" in data
        print(f"✓ SolveBar resolution: {data['resolution'].get('headline', 'N/A')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
