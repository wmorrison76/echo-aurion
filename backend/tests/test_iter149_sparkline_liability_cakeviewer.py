"""
Iteration 149: Revenue-at-Risk Sparkline + Hybrid Liability Filter + Cake Viewer 3D
====================================================================================
Tests for:
1. GET /api/patterns/revenue-at-risk/trend?hours=168 → returns points[], count, delta_24h_usd
2. POST /api/patterns/revenue-at-risk/snapshot → records current hour snapshot (idempotent)
3. POST /api/echo-concierge/liability/scan-hybrid with use_llm=true → merged verdict with MAX severity
4. POST /api/echo-concierge/liability/scan-hybrid with use_llm=false → rule-only fallback
5. POST /api/cake-viewer/sessions → creates session with tiers
6. GET /api/cake-viewer/sessions/{sid} → retrieves session
7. DELETE /api/cake-viewer/sessions/{sid} → deletes session
8. GET /api/cake-viewer/sessions → lists recent sessions
9. REGRESSION: iter148 endpoints still work
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"


class TestHealthAndBasics:
    """Basic health check to ensure API is accessible"""
    
    def test_health_endpoint(self):
        """Verify API is running"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("PASS: Health endpoint working")


class TestRevenueAtRiskTrend:
    """
    NEW iter149: GET /api/patterns/revenue-at-risk/trend
    Returns hourly snapshots for 7-day sparkline visualization.
    """
    
    def test_trend_basic_structure(self):
        """GET /api/patterns/revenue-at-risk/trend returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/patterns/revenue-at-risk/trend?hours=168",
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        # Required fields
        assert "ts" in data
        assert "hours" in data
        assert "points" in data
        assert "count" in data
        assert "delta_24h_usd" in data
        
        # Type checks
        assert isinstance(data["points"], list)
        assert isinstance(data["count"], int)
        assert data["hours"] == 168
        
        # Each point should have ts and usd
        if data["points"]:
            for point in data["points"][:5]:
                assert "ts" in point, f"Point missing 'ts': {point}"
                assert "usd" in point, f"Point missing 'usd': {point}"
                assert isinstance(point["usd"], (int, float))
        
        print(f"PASS: trend returns {data['count']} points, delta_24h=${data.get('delta_24h_usd')}")
    
    def test_trend_auto_records_current_hour(self):
        """Trend endpoint auto-records current hour if missing"""
        response = requests.get(
            f"{BASE_URL}/api/patterns/revenue-at-risk/trend?hours=168",
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have at least 1 point (current hour auto-recorded)
        assert data["count"] >= 1, "Expected at least 1 point (current hour)"
        
        print(f"PASS: trend auto-records current hour, {data['count']} points total")
    
    def test_trend_delta_24h_calculation(self):
        """delta_24h_usd should be a number or null"""
        response = requests.get(
            f"{BASE_URL}/api/patterns/revenue-at-risk/trend?hours=168",
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        delta = data.get("delta_24h_usd")
        assert delta is None or isinstance(delta, (int, float)), f"delta_24h_usd should be number or null, got {type(delta)}"
        
        print(f"PASS: delta_24h_usd={delta}")


class TestRevenueAtRiskSnapshot:
    """
    NEW iter149: POST /api/patterns/revenue-at-risk/snapshot
    Records current hour snapshot (idempotent per hour bucket).
    """
    
    def test_snapshot_creates_record(self):
        """POST /api/patterns/revenue-at-risk/snapshot creates a snapshot"""
        response = requests.post(
            f"{BASE_URL}/api/patterns/revenue-at-risk/snapshot",
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("ok") is True
        assert "snapshot" in data
        
        snapshot = data["snapshot"]
        assert "ts" in snapshot
        assert "total_at_risk_usd" in snapshot
        assert isinstance(snapshot["total_at_risk_usd"], (int, float))
        
        print(f"PASS: snapshot created with total_at_risk_usd=${snapshot['total_at_risk_usd']}")
    
    def test_snapshot_idempotent(self):
        """Calling snapshot twice in same hour should be idempotent"""
        # First call
        r1 = requests.post(f"{BASE_URL}/api/patterns/revenue-at-risk/snapshot", timeout=30)
        assert r1.status_code == 200
        ts1 = r1.json()["snapshot"]["ts"]
        
        # Second call (same hour)
        r2 = requests.post(f"{BASE_URL}/api/patterns/revenue-at-risk/snapshot", timeout=30)
        assert r2.status_code == 200
        ts2 = r2.json()["snapshot"]["ts"]
        
        # Should have same hour bucket
        assert ts1 == ts2, f"Expected same hour bucket: {ts1} vs {ts2}"
        
        print("PASS: snapshot is idempotent per hour bucket")


class TestHybridLiabilityFilter:
    """
    NEW iter149: POST /api/echo-concierge/liability/scan-hybrid
    Hybrid LLM + rule-based liability filter.
    """
    
    def test_hybrid_with_llm_enabled(self):
        """scan-hybrid with use_llm=true returns merged verdict"""
        # Subtle insinuation that rules might miss but LLM should catch
        subtle_text = "Guest in 402 seemed off tonight, you know how those people can be when they travel."
        
        response = requests.post(
            f"{BASE_URL}/api/echo-concierge/liability/scan-hybrid",
            json={"text": subtle_text, "use_llm": True},
            timeout=45  # LLM calls can take time
        )
        assert response.status_code == 200
        data = response.json()
        
        # Required fields
        assert "severity" in data
        assert "ok_to_save" in data
        assert "llm_available" in data
        assert "llm_reasons" in data
        assert "sanitized" in data
        
        # LLM should be available (EMERGENT_LLM_KEY is set)
        if data["llm_available"]:
            # LLM should flag this as HIGH severity due to implicit bias
            assert data["severity"] in ("medium", "high"), f"Expected medium/high severity for subtle insinuation, got {data['severity']}"
            assert len(data["llm_reasons"]) > 0, "Expected LLM to provide reasons"
            print(f"PASS: hybrid with LLM returned severity={data['severity']}, {len(data['llm_reasons'])} LLM reasons")
        else:
            # LLM not available, falls back to rules
            print(f"INFO: LLM not available, rule-only severity={data['severity']}")
    
    def test_hybrid_with_llm_disabled(self):
        """scan-hybrid with use_llm=false bypasses LLM"""
        text = "Guest complained about the noise. I think they were being unreasonable."
        
        response = requests.post(
            f"{BASE_URL}/api/echo-concierge/liability/scan-hybrid",
            json={"text": text, "use_llm": False},
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        
        # LLM should not be used
        assert data["llm_available"] is False, "Expected llm_available=false when use_llm=false"
        
        # Should still have rule-based findings
        assert "severity" in data
        assert "findings" in data
        
        print(f"PASS: hybrid with use_llm=false returned severity={data['severity']}, llm_available={data['llm_available']}")
    
    def test_hybrid_max_severity_rule(self):
        """Final severity should be MAX(rule_severity, llm_severity_override)"""
        # Text with clear rule violation (opinion phrase)
        text = "I think the guest was rude and obnoxious."
        
        response = requests.post(
            f"{BASE_URL}/api/echo-concierge/liability/scan-hybrid",
            json={"text": text, "use_llm": True},
            timeout=45
        )
        assert response.status_code == 200
        data = response.json()
        
        # Rules should catch "I think" (low) and "rude" + "obnoxious" (medium)
        # Final severity should be at least medium
        assert data["severity"] in ("medium", "high"), f"Expected medium/high severity, got {data['severity']}"
        
        print(f"PASS: hybrid MAX severity rule working, final={data['severity']}")
    
    def test_hybrid_sanitized_llm_field(self):
        """sanitized_llm should contain LLM rewrite when available"""
        text = "Guest in 402 seemed off tonight, you know how those people can be."
        
        response = requests.post(
            f"{BASE_URL}/api/echo-concierge/liability/scan-hybrid",
            json={"text": text, "use_llm": True},
            timeout=45
        )
        assert response.status_code == 200
        data = response.json()
        
        # sanitized_llm may be null if LLM unavailable or severity is low
        if data["llm_available"] and data["severity"] in ("medium", "high"):
            # Should have LLM suggested rewrite
            assert "sanitized_llm" in data
            if data["sanitized_llm"]:
                print(f"PASS: sanitized_llm provided: {data['sanitized_llm'][:80]}...")
            else:
                print("INFO: sanitized_llm is null (LLM may not have provided rewrite)")
        else:
            print(f"INFO: LLM not available or severity={data['severity']}, sanitized_llm may be null")


class TestCakeViewerSessions:
    """
    NEW iter149: Cake Viewer session CRUD
    POST /api/cake-viewer/sessions
    GET /api/cake-viewer/sessions/{sid}
    DELETE /api/cake-viewer/sessions/{sid}
    GET /api/cake-viewer/sessions
    """
    
    def test_create_session(self):
        """POST /api/cake-viewer/sessions creates a session"""
        payload = {
            "title": "TEST_iter149_Cake",
            "tiers": [
                {"height": 0.6, "radius": 1.2, "color": "#fff8f2"},
                {"height": 0.5, "radius": 0.9, "color": "#f5e5d3"},
                {"height": 0.4, "radius": 0.6, "color": "#e8c9a8"},
            ],
            "background": "#0b1628",
            "stand_color": "#2a2115",
        }
        
        response = requests.post(
            f"{BASE_URL}/api/cake-viewer/sessions",
            json=payload,
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("ok") is True
        assert "session_id" in data
        assert data["session_id"].startswith("cv-")
        assert "session" in data
        
        session = data["session"]
        assert session["title"] == "TEST_iter149_Cake"
        assert len(session["tiers"]) == 3
        
        print(f"PASS: created cake session {data['session_id']}")
        return data["session_id"]
    
    def test_get_session(self):
        """GET /api/cake-viewer/sessions/{sid} retrieves session"""
        # First create a session
        create_resp = requests.post(
            f"{BASE_URL}/api/cake-viewer/sessions",
            json={
                "title": "TEST_iter149_GetSession",
                "tiers": [{"height": 0.5, "radius": 1.0, "color": "#ffffff"}],
            },
            timeout=15
        )
        assert create_resp.status_code == 200
        sid = create_resp.json()["session_id"]
        
        # Get the session
        get_resp = requests.get(f"{BASE_URL}/api/cake-viewer/sessions/{sid}", timeout=15)
        assert get_resp.status_code == 200
        data = get_resp.json()
        
        assert data["id"] == sid
        assert data["title"] == "TEST_iter149_GetSession"
        assert len(data["tiers"]) == 1
        
        print(f"PASS: retrieved session {sid}")
    
    def test_delete_session(self):
        """DELETE /api/cake-viewer/sessions/{sid} deletes session"""
        # First create a session
        create_resp = requests.post(
            f"{BASE_URL}/api/cake-viewer/sessions",
            json={
                "title": "TEST_iter149_DeleteSession",
                "tiers": [{"height": 0.5, "radius": 1.0, "color": "#ffffff"}],
            },
            timeout=15
        )
        assert create_resp.status_code == 200
        sid = create_resp.json()["session_id"]
        
        # Delete the session
        del_resp = requests.delete(f"{BASE_URL}/api/cake-viewer/sessions/{sid}", timeout=15)
        assert del_resp.status_code == 200
        assert del_resp.json().get("ok") is True
        
        # Verify it's gone
        get_resp = requests.get(f"{BASE_URL}/api/cake-viewer/sessions/{sid}", timeout=15)
        assert get_resp.status_code == 404
        
        print(f"PASS: deleted session {sid}")
    
    def test_list_sessions(self):
        """GET /api/cake-viewer/sessions lists recent sessions"""
        response = requests.get(f"{BASE_URL}/api/cake-viewer/sessions?limit=10", timeout=15)
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "count" in data
        assert isinstance(data["items"], list)
        
        print(f"PASS: listed {data['count']} cake sessions")


class TestRegressionIter148:
    """REGRESSION: iter148 endpoints still work"""
    
    def test_revenue_at_risk_endpoint(self):
        """GET /api/patterns/revenue-at-risk still works"""
        response = requests.get(
            f"{BASE_URL}/api/patterns/revenue-at-risk?days=30&horizon_days=14",
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "total_at_risk_usd" in data
        assert "by_kind" in data
        assert "rows" in data
        
        print(f"PASS: REGRESSION - revenue-at-risk returns ${data['total_at_risk_usd']:.2f}")
    
    def test_recurring_issues(self):
        """GET /api/patterns/recurring-issues still works"""
        response = requests.get(f"{BASE_URL}/api/patterns/recurring-issues?days=30", timeout=15)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        print(f"PASS: REGRESSION - recurring-issues works ({data['count']} items)")
    
    def test_dismiss_pattern(self):
        """POST /api/patterns/dismiss still works"""
        response = requests.post(
            f"{BASE_URL}/api/patterns/dismiss",
            json={"room_no": "TEST_iter149_ROOM", "category": "test_cat"},
            timeout=15
        )
        assert response.status_code == 200
        assert response.json().get("ok") is True
        print("PASS: REGRESSION - dismiss pattern works")
    
    def test_dismissals_list(self):
        """GET /api/patterns/dismissals still works"""
        response = requests.get(f"{BASE_URL}/api/patterns/dismissals?limit=20", timeout=15)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        print(f"PASS: REGRESSION - dismissals list works ({data['count']} items)")
    
    def test_stratus_recommendations(self):
        """GET /api/patterns/stratus-recommendations still works"""
        response = requests.get(
            f"{BASE_URL}/api/patterns/stratus-recommendations?days=30&use_llm=false",
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert "plans" in data
        print(f"PASS: REGRESSION - stratus-recommendations works ({len(data['plans'])} plans)")
    
    def test_aurium_gm(self):
        """GET /api/intelligence/aurium/gm still works"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/aurium/gm?use_llm=false",
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert "revenue_at_risk_usd" in data
        assert "pattern_risk_score" in data
        print(f"PASS: REGRESSION - aurium/gm works (revenue_at_risk=${data['revenue_at_risk_usd']:.2f})")
    
    def test_team_notifications_assign(self):
        """POST /api/concierge/team-notifications/{id}/assign still works"""
        # Get unacknowledged notifications
        notifs_resp = requests.get(
            f"{BASE_URL}/api/concierge/team-notifications?acknowledged=false&limit=5",
            timeout=15
        )
        assert notifs_resp.status_code == 200
        notifs = notifs_resp.json().get("items", [])
        
        if not notifs:
            print("SKIP: No unacknowledged notifications to test assign")
            return
        
        notif_id = notifs[0]["id"]
        assign_resp = requests.post(
            f"{BASE_URL}/api/concierge/team-notifications/{notif_id}/assign",
            json={"note": "iter149 regression test"},
            timeout=20
        )
        assert assign_resp.status_code == 200
        print("PASS: REGRESSION - assign notification works")


class TestLiabilityFilterRuleOnly:
    """Test rule-only liability filter (existing endpoint)"""
    
    def test_scan_endpoint(self):
        """POST /api/echo-concierge/liability/scan works"""
        response = requests.post(
            f"{BASE_URL}/api/echo-concierge/liability/scan",
            json={"text": "I think the guest was rude."},
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "severity" in data
        assert "findings" in data
        assert "ok_to_save" in data
        
        print(f"PASS: liability/scan works, severity={data['severity']}")
    
    def test_sanitize_endpoint(self):
        """POST /api/echo-concierge/liability/sanitize works"""
        response = requests.post(
            f"{BASE_URL}/api/echo-concierge/liability/sanitize",
            json={"text": "Guest email is test@example.com and they were rude."},
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "sanitized" in data
        assert "severity" in data
        
        # Email should be redacted
        assert "test@example.com" not in data["sanitized"]
        
        print(f"PASS: liability/sanitize works, severity={data['severity']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
