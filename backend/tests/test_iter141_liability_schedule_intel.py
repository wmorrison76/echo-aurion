"""
Iteration 141: Echo Concierge Liability Filter + Spa Schedule Intelligence
==========================================================================
Tests for:
1. LIABILITY FILTER - Deterministic rule-based scanner for PII, medical claims, 
   defamation, harassment, guarantees, and opinion markers
2. SPA SCHEDULE INTELLIGENCE - Action-oriented scheduling recommendations

Endpoints tested:
- LIABILITY: /api/echo-concierge/liability/rules, /scan, /sanitize, /log, /summary
- SCHEDULE: /api/spa-schedule/gaps, /premium-slots, /upsell, /rebalance, /recommendations
- REGRESSION: spa-ops, spa-services, spa-booking, pos-adapter, cake-orders
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module", autouse=True)
def seed_spa_demo(api_client):
    """Seed spa demo data before running tests"""
    resp = api_client.post(f"{BASE_URL}/api/spa-ops/seed-demo")
    assert resp.status_code == 200, f"Failed to seed spa demo: {resp.text}"
    print(f"Spa demo seeded: {resp.json()}")
    return resp.json()


# ============================================================================
# LIABILITY FILTER TESTS
# ============================================================================

class TestLiabilityRules:
    """Test /api/echo-concierge/liability/rules endpoint"""
    
    def test_rules_returns_6_categories(self, api_client):
        """GET /rules returns 6 categories with rule_count each"""
        resp = api_client.get(f"{BASE_URL}/api/echo-concierge/liability/rules")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "categories" in data
        categories = data["categories"]
        assert len(categories) == 6, f"Expected 6 categories, got {len(categories)}"
        
        # Verify all expected categories exist
        cat_names = {c["name"] for c in categories}
        expected = {"privacy", "diagnostic", "defamation", "harassment", "guarantee", "opinion"}
        assert cat_names == expected, f"Missing categories: {expected - cat_names}"
        
        # Each category should have rule_count > 0
        for cat in categories:
            assert "rule_count" in cat, f"Category {cat['name']} missing rule_count"
            assert cat["rule_count"] > 0, f"Category {cat['name']} has 0 rules"
            assert "description" in cat
        
        # Verify severity_policy exists
        assert "severity_policy" in data
        assert "high" in data["severity_policy"]
        assert "medium" in data["severity_policy"]
        assert "low" in data["severity_policy"]
        assert "none" in data["severity_policy"]
        
        print(f"Rules endpoint returned {len(categories)} categories with severity policy")


class TestLiabilityScanClean:
    """Test /api/echo-concierge/liability/scan with clean text"""
    
    def test_scan_clean_text_returns_none_severity(self, api_client):
        """POST /scan with clean text returns severity='none', ok_to_save=true"""
        resp = api_client.post(f"{BASE_URL}/api/echo-concierge/liability/scan", json={
            "text": "Guest requested extra towels for room 412. Delivered at 3pm.",
            "source": "ticket",
            "author": "test_agent"
        })
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["severity"] == "none", f"Expected severity='none', got {data['severity']}"
        assert data["finding_count"] == 0, f"Expected 0 findings, got {data['finding_count']}"
        assert data["ok_to_save"] is True, "Clean text should be ok_to_save"
        assert data["requires_manager_approval"] is False
        assert data["categories"] == []
        assert "log_id" in data
        
        print(f"Clean text scan: severity={data['severity']}, ok_to_save={data['ok_to_save']}")


class TestLiabilityScanPrivacy:
    """Test privacy detection (PII: email, phone, CC, SSN)"""
    
    def test_scan_credit_card_high_severity(self, api_client):
        """POST /scan with credit card number detects high severity privacy violation"""
        resp = api_client.post(f"{BASE_URL}/api/echo-concierge/liability/scan", json={
            "text": "Guest left card number 4111-1111-1111-1111 for incidentals.",
            "source": "ticket"
        })
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["severity"] == "high", f"CC should be high severity, got {data['severity']}"
        assert "privacy" in data["categories"], f"Expected 'privacy' category, got {data['categories']}"
        assert data["ok_to_save"] is False, "High severity should block save"
        assert data["requires_manager_approval"] is True
        assert data["finding_count"] >= 1
        
        # Verify finding structure
        cc_finding = next((f for f in data["findings"] if "4111" in f.get("match", "")), None)
        assert cc_finding is not None, "Should find CC match"
        assert cc_finding["category"] == "privacy"
        assert cc_finding["severity"] == "high"
        assert "span" in cc_finding
        assert len(cc_finding["span"]) == 2
        assert "suggestion" in cc_finding
        
        print(f"CC detection: severity={data['severity']}, blocked={not data['ok_to_save']}")
    
    def test_scan_email_medium_severity(self, api_client):
        """POST /scan with email detects medium+ severity privacy"""
        resp = api_client.post(f"{BASE_URL}/api/echo-concierge/liability/scan", json={
            "text": "Contact guest at jane@example.com for follow-up.",
            "source": "concierge"
        })
        assert resp.status_code == 200
        data = resp.json()
        
        assert "privacy" in data["categories"], f"Expected 'privacy' category"
        # Email should be medium severity
        email_finding = next((f for f in data["findings"] if "@" in f.get("match", "")), None)
        assert email_finding is not None, "Should find email match"
        assert email_finding["severity"] in ["medium", "high"], f"Email should be medium+, got {email_finding['severity']}"
        
        print(f"Email detection: severity={data['severity']}, category={data['categories']}")
    
    def test_scan_ssn_high_severity(self, api_client):
        """POST /scan with SSN detects high severity"""
        resp = api_client.post(f"{BASE_URL}/api/echo-concierge/liability/scan", json={
            "text": "Guest SSN is 123-45-6789 for verification.",
            "source": "note"
        })
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["severity"] == "high"
        assert "privacy" in data["categories"]
        assert data["ok_to_save"] is False
        
        print(f"SSN detection: severity={data['severity']}")


class TestLiabilityScanDefamation:
    """Test defamation detection (stole, scammer, drunk, etc.)"""
    
    def test_scan_defamation_drunk_high_severity(self, api_client):
        """POST /scan with 'drunk' detects high severity defamation"""
        resp = api_client.post(f"{BASE_URL}/api/echo-concierge/liability/scan", json={
            "text": "Guest appeared drunk at the pool bar.",
            "source": "ticket"
        })
        assert resp.status_code == 200
        data = resp.json()
        
        # 'drunk' is in DIAGNOSTIC rules with high severity
        assert data["severity"] == "high", f"Expected high severity, got {data['severity']}"
        assert data["ok_to_save"] is False
        assert data["requires_manager_approval"] is True
        
        print(f"Drunk detection: severity={data['severity']}, categories={data['categories']}")
    
    def test_scan_defamation_stole_high_severity(self, api_client):
        """POST /scan with 'stole' detects high severity defamation"""
        resp = api_client.post(f"{BASE_URL}/api/echo-concierge/liability/scan", json={
            "text": "I think the guest stole towels from the room.",
            "source": "chat"
        })
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["severity"] == "high"
        assert "defamation" in data["categories"]
        assert data["ok_to_save"] is False
        
        print(f"Stole detection: severity={data['severity']}, categories={data['categories']}")
    
    def test_scan_defamation_scammer_high_severity(self, api_client):
        """POST /scan with 'scammer' detects high severity defamation"""
        resp = api_client.post(f"{BASE_URL}/api/echo-concierge/liability/scan", json={
            "text": "This guest is a known scammer.",
            "source": "note"
        })
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["severity"] == "high"
        assert "defamation" in data["categories"]
        
        print(f"Scammer detection: severity={data['severity']}")


class TestLiabilityScanDiagnostic:
    """Test diagnostic/medical detection"""
    
    def test_scan_allergic_high_severity(self, api_client):
        """POST /scan with 'allergic to peanuts' detects high severity diagnostic"""
        resp = api_client.post(f"{BASE_URL}/api/echo-concierge/liability/scan", json={
            "text": "Guest mentioned they are allergic to peanuts.",
            "source": "beo"
        })
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["severity"] == "high", f"Allergy should be high severity, got {data['severity']}"
        assert "diagnostic" in data["categories"]
        assert data["ok_to_save"] is False
        
        print(f"Allergy detection: severity={data['severity']}")
    
    def test_scan_medication_high_severity(self, api_client):
        """POST /scan with 'on medication' detects high severity"""
        resp = api_client.post(f"{BASE_URL}/api/echo-concierge/liability/scan", json={
            "text": "Guest is on medication and needs early breakfast.",
            "source": "concierge"
        })
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["severity"] == "high"
        assert "diagnostic" in data["categories"]
        
        print(f"Medication detection: severity={data['severity']}")
    
    def test_scan_diabetic_high_severity(self, api_client):
        """POST /scan with 'diabetic' detects high severity"""
        resp = api_client.post(f"{BASE_URL}/api/echo-concierge/liability/scan", json={
            "text": "Guest is diabetic, please provide sugar-free options.",
            "source": "ticket"
        })
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["severity"] == "high"
        assert "diagnostic" in data["categories"]
        
        print(f"Diabetic detection: severity={data['severity']}")


class TestLiabilityScanGuarantee:
    """Test guarantee/promise detection"""
    
    def test_scan_we_guarantee_high_severity(self, api_client):
        """POST /scan with 'we guarantee' detects high severity"""
        resp = api_client.post(f"{BASE_URL}/api/echo-concierge/liability/scan", json={
            "text": "We guarantee your room will be ready by 2pm.",
            "source": "concierge"
        })
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["severity"] == "high"
        assert "guarantee" in data["categories"]
        assert data["ok_to_save"] is False
        
        print(f"Guarantee detection: severity={data['severity']}")
    
    def test_scan_i_promise_high_severity(self, api_client):
        """POST /scan with 'I promise' detects high severity"""
        resp = api_client.post(f"{BASE_URL}/api/echo-concierge/liability/scan", json={
            "text": "I promise we will fix this issue immediately.",
            "source": "chat"
        })
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["severity"] == "high"
        assert "guarantee" in data["categories"]
        
        print(f"Promise detection: severity={data['severity']}")


class TestLiabilityScanOpinion:
    """Test opinion marker detection"""
    
    def test_scan_i_think_low_severity(self, api_client):
        """POST /scan with 'I think' detects low severity opinion"""
        resp = api_client.post(f"{BASE_URL}/api/echo-concierge/liability/scan", json={
            "text": "I think the guest would prefer a quiet room.",
            "source": "note"
        })
        assert resp.status_code == 200
        data = resp.json()
        
        assert "opinion" in data["categories"]
        # 'i think' is low severity
        opinion_finding = next((f for f in data["findings"] if f["category"] == "opinion"), None)
        assert opinion_finding is not None
        assert opinion_finding["severity"] in ["low", "medium"]
        
        print(f"Opinion 'I think' detection: severity={data['severity']}")
    
    def test_scan_in_my_opinion_medium_severity(self, api_client):
        """POST /scan with 'In my opinion' detects medium severity"""
        resp = api_client.post(f"{BASE_URL}/api/echo-concierge/liability/scan", json={
            "text": "In my opinion, this guest is difficult to please.",
            "source": "chat"
        })
        assert resp.status_code == 200
        data = resp.json()
        
        assert "opinion" in data["categories"]
        opinion_finding = next((f for f in data["findings"] if "opinion" in f.get("match", "").lower()), None)
        assert opinion_finding is not None
        assert opinion_finding["severity"] == "medium"
        
        print(f"Opinion 'In my opinion' detection: severity={data['severity']}")


class TestLiabilitySanitize:
    """Test /api/echo-concierge/liability/sanitize endpoint"""
    
    def test_sanitize_replaces_privacy_with_redacted(self, api_client):
        """POST /sanitize replaces PII with [redacted]"""
        original = "Contact guest at jane@example.com or call 555-123-4567."
        resp = api_client.post(f"{BASE_URL}/api/echo-concierge/liability/sanitize", json={
            "text": original,
            "source": "ticket"
        })
        assert resp.status_code == 200
        data = resp.json()
        
        assert "sanitized" in data
        assert "[redacted]" in data["sanitized"], f"Expected [redacted] in sanitized text"
        assert "jane@example.com" not in data["sanitized"], "Email should be redacted"
        assert "original_length" in data
        assert "sanitized_length" in data
        assert data["original_length"] == len(original)
        
        print(f"Sanitized: {data['sanitized'][:80]}...")
    
    def test_sanitize_replaces_defamation_with_rewrite_needed(self, api_client):
        """POST /sanitize replaces defamation with [objective-rewrite-needed]"""
        resp = api_client.post(f"{BASE_URL}/api/echo-concierge/liability/sanitize", json={
            "text": "The guest is a thief and stole items from the minibar.",
            "source": "note"
        })
        assert resp.status_code == 200
        data = resp.json()
        
        assert "[objective-rewrite-needed]" in data["sanitized"]
        
        print(f"Defamation sanitized: {data['sanitized']}")
    
    def test_sanitize_replaces_diagnostic_with_medical_note(self, api_client):
        """POST /sanitize replaces medical info with [medical-note-see-profile]"""
        resp = api_client.post(f"{BASE_URL}/api/echo-concierge/liability/sanitize", json={
            "text": "Guest is diabetic and needs special meals.",
            "source": "beo"
        })
        assert resp.status_code == 200
        data = resp.json()
        
        assert "[medical-note-see-profile]" in data["sanitized"]
        
        print(f"Diagnostic sanitized: {data['sanitized']}")
    
    def test_sanitize_idempotent(self, api_client):
        """Scanning sanitized output should return lower severity than original"""
        original = "Guest card 4111-1111-1111-1111 and is diabetic."
        
        # First sanitize
        resp1 = api_client.post(f"{BASE_URL}/api/echo-concierge/liability/sanitize", json={
            "text": original,
            "source": "test"
        })
        assert resp1.status_code == 200
        sanitized = resp1.json()["sanitized"]
        original_severity = resp1.json()["severity"]
        
        # Scan the sanitized output
        resp2 = api_client.post(f"{BASE_URL}/api/echo-concierge/liability/scan", json={
            "text": sanitized,
            "source": "test"
        })
        assert resp2.status_code == 200
        new_severity = resp2.json()["severity"]
        
        # Severity should be lower or equal
        sev_rank = {"none": 0, "low": 1, "medium": 2, "high": 3}
        assert sev_rank[new_severity] <= sev_rank[original_severity], \
            f"Sanitized severity {new_severity} should be <= original {original_severity}"
        
        print(f"Idempotent check: original={original_severity}, sanitized={new_severity}")


class TestLiabilityLog:
    """Test /api/echo-concierge/liability/log endpoint"""
    
    def test_log_returns_audit_entries(self, api_client):
        """GET /log returns audit entries with metadata only (no text content)"""
        resp = api_client.get(f"{BASE_URL}/api/echo-concierge/liability/log?limit=10")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "items" in data
        assert "total" in data
        
        if data["items"]:
            entry = data["items"][0]
            # Verify required fields
            assert "id" in entry
            assert "severity" in entry
            assert "categories" in entry
            assert "finding_count" in entry
            assert "created_at" in entry
            assert "text_length" in entry
            
            # CRITICAL: No raw text should be stored
            assert "text" not in entry, "Raw text should NOT be stored in audit log"
            
            # No _id leak
            assert "_id" not in entry, "_id should not be leaked"
        
        print(f"Audit log: {data['total']} entries, no text content stored")
    
    def test_log_filter_by_severity(self, api_client):
        """GET /log?severity=high filters by severity"""
        resp = api_client.get(f"{BASE_URL}/api/echo-concierge/liability/log?severity=high&limit=5")
        assert resp.status_code == 200
        data = resp.json()
        
        for entry in data["items"]:
            assert entry["severity"] == "high", f"Expected high severity, got {entry['severity']}"
        
        print(f"Filtered log: {len(data['items'])} high severity entries")


class TestLiabilitySummary:
    """Test /api/echo-concierge/liability/summary endpoint"""
    
    def test_summary_returns_counts(self, api_client):
        """GET /summary returns total_scans, by_severity, blocked_count"""
        resp = api_client.get(f"{BASE_URL}/api/echo-concierge/liability/summary")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "total_scans" in data
        assert "by_severity" in data
        assert "blocked_count" in data
        
        # by_severity should have all 4 levels
        assert "none" in data["by_severity"]
        assert "low" in data["by_severity"]
        assert "medium" in data["by_severity"]
        assert "high" in data["by_severity"]
        
        # blocked_count should equal high severity count
        assert data["blocked_count"] == data["by_severity"]["high"]
        
        print(f"Summary: total={data['total_scans']}, blocked={data['blocked_count']}")


class TestLiabilityFindingsStructure:
    """Test findings array structure"""
    
    def test_findings_contain_required_fields(self, api_client):
        """Findings array contains {category, severity, match, span:[start,end], suggestion}"""
        resp = api_client.post(f"{BASE_URL}/api/echo-concierge/liability/scan", json={
            "text": "Guest email is test@example.com and they are diabetic.",
            "source": "test"
        })
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["finding_count"] >= 2, "Should find at least 2 issues"
        
        for finding in data["findings"]:
            assert "category" in finding, "Finding missing category"
            assert "severity" in finding, "Finding missing severity"
            assert "match" in finding, "Finding missing match"
            assert "span" in finding, "Finding missing span"
            assert "suggestion" in finding, "Finding missing suggestion"
            
            # Span should be [start, end]
            assert isinstance(finding["span"], list)
            assert len(finding["span"]) == 2
            assert finding["span"][0] < finding["span"][1]
        
        print(f"Findings structure verified: {data['finding_count']} findings")


# ============================================================================
# SPA SCHEDULE INTELLIGENCE TESTS
# ============================================================================

class TestSpaScheduleGaps:
    """Test /api/spa-schedule/gaps endpoint"""
    
    def test_gaps_returns_required_fields(self, api_client):
        """GET /gaps returns open_slot_count, premium_open, non_premium_open, exposure_score, by_hour[], premium_hours"""
        resp = api_client.get(f"{BASE_URL}/api/spa-schedule/gaps")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "date" in data
        assert "open_slot_count" in data
        assert "premium_open" in data
        assert "non_premium_open" in data
        assert "exposure_score" in data
        assert "by_hour" in data
        assert "premium_hours" in data
        
        # Verify exposure_score formula: premium*3 + non_premium
        expected_score = data["premium_open"] * 3 + data["non_premium_open"]
        assert data["exposure_score"] == expected_score, \
            f"Exposure score mismatch: expected {expected_score}, got {data['exposure_score']}"
        
        # Premium hours should be [10, 11, 14, 15, 17, 18]
        assert data["premium_hours"] == [10, 11, 14, 15, 17, 18]
        
        # by_hour should be a list
        assert isinstance(data["by_hour"], list)
        
        print(f"Gaps: {data['open_slot_count']} open, {data['premium_open']} premium, score={data['exposure_score']}")
    
    def test_gaps_accepts_date_parameter(self, api_client):
        """GET /gaps?date=YYYY-MM-DD accepts date parameter"""
        test_date = "2025-01-15"
        resp = api_client.get(f"{BASE_URL}/api/spa-schedule/gaps?date={test_date}")
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["date"] == test_date
        
        print(f"Gaps for {test_date}: {data['open_slot_count']} open slots")


class TestSpaSchedulePremiumSlots:
    """Test /api/spa-schedule/premium-slots endpoint"""
    
    def test_premium_slots_returns_required_fields(self, api_client):
        """GET /premium-slots returns total_premium_slots, filled, open, fill_rate, protection_status, open_slots_sample"""
        resp = api_client.get(f"{BASE_URL}/api/spa-schedule/premium-slots")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "date" in data
        assert "total_premium_slots" in data
        assert "filled" in data
        assert "open" in data
        assert "fill_rate" in data
        assert "protection_status" in data
        assert "open_slots_sample" in data
        
        # fill_rate should be 0..1
        assert 0 <= data["fill_rate"] <= 1, f"fill_rate should be 0..1, got {data['fill_rate']}"
        
        # protection_status should be one of tight/ok/exposed
        assert data["protection_status"] in ["tight", "ok", "exposed"]
        
        # open_slots_sample should be list with max 12 items
        assert isinstance(data["open_slots_sample"], list)
        assert len(data["open_slots_sample"]) <= 12
        
        # Verify math: filled + open = total
        assert data["filled"] + data["open"] == data["total_premium_slots"]
        
        print(f"Premium slots: {data['filled']}/{data['total_premium_slots']} filled, status={data['protection_status']}")


class TestSpaScheduleUpsell:
    """Test /api/spa-schedule/upsell endpoint"""
    
    def test_upsell_returns_required_fields(self, api_client):
        """GET /upsell returns recommendations[] with booking_id, guest, current, suggested, uplift_usd, rationale"""
        resp = api_client.get(f"{BASE_URL}/api/spa-schedule/upsell")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "date" in data
        assert "recommendations" in data
        assert "count" in data
        assert "potential_revenue" in data
        
        # If there are recommendations, verify structure
        if data["recommendations"]:
            rec = data["recommendations"][0]
            assert "booking_id" in rec
            assert "guest" in rec
            assert "current" in rec
            assert "suggested" in rec
            assert "uplift_usd" in rec
            assert "rationale" in rec
            
            # current and suggested should have id, name, price
            assert "id" in rec["current"]
            assert "name" in rec["current"]
            assert "price" in rec["current"]
            assert "id" in rec["suggested"]
            assert "name" in rec["suggested"]
            assert "price" in rec["suggested"]
            
            # uplift_usd should be > 0
            assert rec["uplift_usd"] > 0
            
            # Should be sorted by uplift_usd desc
            uplifts = [r["uplift_usd"] for r in data["recommendations"]]
            assert uplifts == sorted(uplifts, reverse=True), "Should be sorted by uplift desc"
        
        print(f"Upsell: {data['count']} opportunities, ${data['potential_revenue']} potential")


class TestSpaScheduleRebalance:
    """Test /api/spa-schedule/rebalance endpoint"""
    
    def test_rebalance_returns_required_fields(self, api_client):
        """GET /rebalance returns moves[], under_requested_therapists[], over/under_utilized_count"""
        resp = api_client.get(f"{BASE_URL}/api/spa-schedule/rebalance")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "date" in data
        assert "moves" in data
        assert "under_requested_therapists" in data
        assert "over_utilized_count" in data
        assert "under_utilized_count" in data
        
        # If there are moves, verify structure
        if data["moves"]:
            move = data["moves"][0]
            assert "from_therapist" in move
            assert "to_therapist" in move
            assert "compatible_categories" in move
            assert "suggestion" in move
            
            # from/to therapist should have id, name, util
            assert "id" in move["from_therapist"]
            assert "name" in move["from_therapist"]
            assert "util" in move["from_therapist"]
        
        print(f"Rebalance: {len(data['moves'])} moves, {data['over_utilized_count']} over, {data['under_utilized_count']} under")


class TestSpaScheduleRecommendations:
    """Test /api/spa-schedule/recommendations endpoint"""
    
    def test_recommendations_returns_prioritized_actions(self, api_client):
        """GET /recommendations returns prioritized actions[] with kind, severity, title, action"""
        resp = api_client.get(f"{BASE_URL}/api/spa-schedule/recommendations")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "date" in data
        assert "recommendations" in data
        assert "count" in data
        assert "summary" in data
        
        # Should always have at least 1 recommendation
        assert data["count"] >= 1, "Should have at least 1 recommendation"
        
        # Verify recommendation structure
        for rec in data["recommendations"]:
            assert "kind" in rec
            assert "severity" in rec
            assert "title" in rec
            assert "action" in rec
            
            # severity should be one of high/warn/info
            assert rec["severity"] in ["high", "warn", "info"]
        
        # Summary should have key metrics
        assert "open_slots" in data["summary"]
        assert "premium_open" in data["summary"]
        assert "upsell_potential" in data["summary"]
        assert "rebalance_moves" in data["summary"]
        
        print(f"Recommendations: {data['count']} actions, summary={data['summary']}")
    
    def test_recommendations_accepts_date_parameter(self, api_client):
        """GET /recommendations?date=YYYY-MM-DD accepts date parameter"""
        test_date = "2025-01-15"
        resp = api_client.get(f"{BASE_URL}/api/spa-schedule/recommendations?date={test_date}")
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["date"] == test_date
        
        print(f"Recommendations for {test_date}: {data['count']} actions")


# ============================================================================
# REGRESSION TESTS
# ============================================================================

class TestRegressionSpaOps:
    """Regression tests for spa-ops endpoints"""
    
    def test_spa_ops_kpis_today(self, api_client):
        """GET /api/spa-ops/kpis/today still works"""
        resp = api_client.get(f"{BASE_URL}/api/spa-ops/kpis/today")
        assert resp.status_code == 200
        data = resp.json()
        assert "bookings" in data
        assert "revenue" in data
        print("REGRESSION: spa-ops/kpis/today PASS")
    
    def test_spa_ops_utilization(self, api_client):
        """GET /api/spa-ops/utilization still works"""
        resp = api_client.get(f"{BASE_URL}/api/spa-ops/utilization")
        assert resp.status_code == 200
        data = resp.json()
        assert "rooms" in data or "therapists" in data
        print("REGRESSION: spa-ops/utilization PASS")


class TestRegressionSpaServices:
    """Regression tests for spa-services endpoints"""
    
    def test_spa_services_list(self, api_client):
        """GET /api/spa-services/ still works"""
        resp = api_client.get(f"{BASE_URL}/api/spa-services/")
        assert resp.status_code == 200
        print("REGRESSION: spa-services PASS")


class TestRegressionSpaBooking:
    """Regression tests for spa-booking endpoints"""
    
    def test_spa_booking_services(self, api_client):
        """GET /api/spa-booking/services/{slug} still works"""
        resp = api_client.get(f"{BASE_URL}/api/spa-booking/services/pier-sixty-six")
        assert resp.status_code == 200
        print("REGRESSION: spa-booking/services PASS")


class TestRegressionPosAdapter:
    """Regression tests for pos-adapter endpoints"""
    
    def test_pos_adapter_providers(self, api_client):
        """GET /api/pos-adapter/providers still works"""
        resp = api_client.get(f"{BASE_URL}/api/pos-adapter/providers")
        assert resp.status_code == 200
        data = resp.json()
        assert "providers" in data
        print("REGRESSION: pos-adapter/providers PASS")
    
    def test_pos_adapter_summary(self, api_client):
        """GET /api/pos-adapter/summary still works"""
        resp = api_client.get(f"{BASE_URL}/api/pos-adapter/summary")
        assert resp.status_code == 200
        print("REGRESSION: pos-adapter/summary PASS")


class TestRegressionCakeOrders:
    """Regression tests for cake-orders endpoints"""
    
    def test_cake_orders_list(self, api_client):
        """GET /api/cake-orders/ still works"""
        resp = api_client.get(f"{BASE_URL}/api/cake-orders/")
        assert resp.status_code == 200
        print("REGRESSION: cake-orders PASS")


class TestRegressionHealth:
    """Regression test for health endpoint"""
    
    def test_health(self, api_client):
        """GET /api/health still works"""
        resp = api_client.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        print("REGRESSION: health PASS")


# ============================================================================
# SECURITY TESTS
# ============================================================================

class TestSecurityNoIdLeak:
    """Test that no _id is leaked in responses"""
    
    def test_liability_log_no_id_leak(self, api_client):
        """Liability log should not leak _id"""
        resp = api_client.get(f"{BASE_URL}/api/echo-concierge/liability/log?limit=5")
        assert resp.status_code == 200
        data = resp.json()
        
        for item in data.get("items", []):
            assert "_id" not in item, "_id leaked in liability log"
        
        print("SECURITY: No _id leak in liability log")
    
    def test_spa_schedule_no_id_leak(self, api_client):
        """Spa schedule endpoints should not leak _id"""
        endpoints = [
            "/api/spa-schedule/gaps",
            "/api/spa-schedule/premium-slots",
            "/api/spa-schedule/upsell",
            "/api/spa-schedule/rebalance",
            "/api/spa-schedule/recommendations"
        ]
        
        for endpoint in endpoints:
            resp = api_client.get(f"{BASE_URL}{endpoint}")
            assert resp.status_code == 200
            text = resp.text
            assert '"_id"' not in text, f"_id leaked in {endpoint}"
        
        print("SECURITY: No _id leak in spa-schedule endpoints")
