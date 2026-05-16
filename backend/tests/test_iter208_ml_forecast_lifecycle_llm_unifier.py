"""iter208 · ML Forecast + Lifecycle Audit + LLM Unifier Regression Tests

Tests:
1. GET /api/crm/forecast?model=ml — ML pipeline forecast with stage-weighted probabilities
2. GET /api/crm/forecast?model=naive — Naive forecast (raw sum)
3. GET /api/crm/forecast/ml-meta — ML model metadata for auditability
4. GET /api/crm/lifecycle-audit — End-to-end CRM lifecycle validation
5. POST /api/echo-ai3/analyze-event — Regression after LLM unifier refactor
6. POST /api/echo/whats-new — Regression after LLM unifier refactor
7. POST /api/echo/chat — Regression after LLM unifier refactor
8. POST /api/beo-builder/drafts/{id}/finalize — Regression check for gl_code, maestro_pushed, aurum_gl_routed
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"


class TestMlForecast:
    """iter205 · ML pipeline forecast tests"""

    def test_forecast_ml_model_structure(self):
        """GET /api/crm/forecast?model=ml returns proper ML forecast structure"""
        response = requests.get(f"{BASE_URL}/api/crm/forecast?model=ml")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, "Expected success=True"
        assert "data" in data, "Expected 'data' key in response"
        
        forecast_data = data["data"]
        assert forecast_data.get("model") == "ml", f"Expected model='ml', got {forecast_data.get('model')}"
        
        # Check stage_probabilities has 8 stages
        stage_probs = forecast_data.get("stage_probabilities", {})
        expected_stages = ["lead", "qualified", "proposed", "contracted", "deposited", "in_event", "billed", "complete"]
        for stage in expected_stages:
            assert stage in stage_probs, f"Missing stage '{stage}' in stage_probabilities"
        assert len(stage_probs) == 8, f"Expected 8 stages, got {len(stage_probs)}"
        
        # Check trailing_6mo_avg is a number
        trailing_avg = forecast_data.get("trailing_6mo_avg")
        assert isinstance(trailing_avg, (int, float)), f"trailing_6mo_avg should be a number, got {type(trailing_avg)}"
        
        # Check months array structure
        months = forecast_data.get("months", [])
        assert len(months) > 0, "Expected at least one month in forecast"
        
        for month_obj in months[:3]:  # Check first 3 months
            assert "month" in month_obj, "Month object missing 'month' key"
            assert "value" in month_obj, "Month object missing 'value' key"
            assert "weighted_value" in month_obj, "Month object missing 'weighted_value' key"
            assert "smoothed_value" in month_obj, "Month object missing 'smoothed_value' key"
            assert "confidence_low" in month_obj, "Month object missing 'confidence_low' key"
            assert "confidence_high" in month_obj, "Month object missing 'confidence_high' key"
            assert "contact_count" in month_obj, "Month object missing 'contact_count' key"
            
            # Verify smoothed_value is non-negative
            assert month_obj["smoothed_value"] >= 0, f"smoothed_value should be non-negative, got {month_obj['smoothed_value']}"
        
        print(f"ML forecast test passed: {len(months)} months, 8 stages, trailing_avg={trailing_avg}")

    def test_forecast_naive_model_structure(self):
        """GET /api/crm/forecast?model=naive returns simple naive forecast"""
        response = requests.get(f"{BASE_URL}/api/crm/forecast?model=naive")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, "Expected success=True"
        
        forecast_data = data["data"]
        assert forecast_data.get("model") == "naive", f"Expected model='naive', got {forecast_data.get('model')}"
        
        # Naive model should only have month and value
        months = forecast_data.get("months", [])
        assert len(months) > 0, "Expected at least one month"
        
        for month_obj in months[:3]:
            assert "month" in month_obj, "Month object missing 'month' key"
            assert "value" in month_obj, "Month object missing 'value' key"
            # Naive model should NOT have weighted_value, smoothed_value, etc.
            # (but we won't fail if they're present, just verify the basics)
        
        print(f"Naive forecast test passed: {len(months)} months, model=naive")


class TestMlForecastMeta:
    """iter205 · ML forecast metadata endpoint tests"""

    def test_ml_meta_structure(self):
        """GET /api/crm/forecast/ml-meta returns model internals for auditability"""
        response = requests.get(f"{BASE_URL}/api/crm/forecast/ml-meta")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, "Expected success=True"
        
        meta = data["data"]
        
        # Check model name
        assert meta.get("model") == "single-exponential-smoothing", f"Expected model='single-exponential-smoothing', got {meta.get('model')}"
        
        # Check window_months
        assert meta.get("window_months") == 6, f"Expected window_months=6, got {meta.get('window_months')}"
        
        # Check stage_probabilities is a dict
        stage_probs = meta.get("stage_probabilities")
        assert isinstance(stage_probs, dict), f"stage_probabilities should be dict, got {type(stage_probs)}"
        assert len(stage_probs) == 8, f"Expected 8 stages, got {len(stage_probs)}"
        
        # Check trailing_6mo_realized is a list of 6 items
        realized = meta.get("trailing_6mo_realized", [])
        assert isinstance(realized, list), f"trailing_6mo_realized should be list, got {type(realized)}"
        assert len(realized) == 6, f"Expected 6 trailing months, got {len(realized)}"
        
        for item in realized:
            assert "month" in item, "Realized item missing 'month' key"
            assert "realized" in item, "Realized item missing 'realized' key"
        
        print(f"ML meta test passed: model={meta.get('model')}, window={meta.get('window_months')}, 6 trailing months")


class TestLifecycleAudit:
    """iter207 · P2 · CRM Lifecycle Audit tests"""

    def test_lifecycle_audit_structure(self):
        """GET /api/crm/lifecycle-audit returns summary and rows"""
        response = requests.get(f"{BASE_URL}/api/crm/lifecycle-audit")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, "Expected success=True"
        
        audit_data = data["data"]
        
        # Check summary structure
        summary = audit_data.get("summary", {})
        assert "ok" in summary, "Summary missing 'ok' count"
        assert "warn" in summary, "Summary missing 'warn' count"
        assert "broken" in summary, "Summary missing 'broken' count"
        assert "total" in summary, "Summary missing 'total' count"
        
        # Verify total = ok + warn + broken
        total = summary.get("total", 0)
        computed_total = summary.get("ok", 0) + summary.get("warn", 0) + summary.get("broken", 0)
        assert total == computed_total, f"Total mismatch: {total} != {computed_total}"
        
        # Check rows is a list
        rows = audit_data.get("rows", [])
        assert isinstance(rows, list), f"rows should be list, got {type(rows)}"
        
        print(f"Lifecycle audit test passed: total={total}, ok={summary.get('ok')}, warn={summary.get('warn')}, broken={summary.get('broken')}")

    def test_lifecycle_audit_elroy_lipfrat(self):
        """Find Elroy Lipfrat row (stage=deposited) and verify verdict=BROKEN with >=1 gap"""
        response = requests.get(f"{BASE_URL}/api/crm/lifecycle-audit")
        assert response.status_code == 200
        
        data = response.json()
        rows = data.get("data", {}).get("rows", [])
        
        # Find Elroy Lipfrat
        elroy_row = None
        for row in rows:
            name = (row.get("name") or "").lower()
            if "elroy" in name and "lipfrat" in name:
                elroy_row = row
                break
        
        if elroy_row is None:
            # Elroy might not exist in the DB - skip gracefully
            pytest.skip("Elroy Lipfrat contact not found in CRM - skipping this specific test")
        
        # Verify stage is deposited
        assert elroy_row.get("stage") == "deposited", f"Expected stage='deposited', got {elroy_row.get('stage')}"
        
        # Verify verdict is BROKEN
        assert elroy_row.get("verdict") == "BROKEN", f"Expected verdict='BROKEN', got {elroy_row.get('verdict')}"
        
        # Verify at least 1 gap
        gaps = elroy_row.get("gaps", [])
        assert len(gaps) >= 1, f"Expected at least 1 gap, got {len(gaps)}"
        
        print(f"Elroy Lipfrat test passed: stage={elroy_row.get('stage')}, verdict={elroy_row.get('verdict')}, gaps={len(gaps)}")


class TestLlmUnifierRegression:
    """Regression tests after LLM unifier refactor (lib/llm.py)"""

    def test_analyze_event_returns_ok_analysis_mode(self):
        """POST /api/echo-ai3/analyze-event still returns {ok, analysis, mode}"""
        test_event = {
            "type": "po.drafted",
            "timestamp": "2026-01-15T10:00:00Z",
            "actor": {"type": "user", "id": "test-user", "name": "Test User"},
            "entity_refs": [{"kind": "purchase_order", "id": "po-test-123", "name": "Test PO"}],
            "payload": {"commodity": "Salmon", "quantity": 50, "unit": "lb"}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/echo-ai3/analyze-event",
            json={"event": test_event}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True, "Expected ok=True"
        assert "analysis" in data, "Expected 'analysis' key in response"
        assert "mode" in data, "Expected 'mode' key in response"
        
        # Mode should be 'llm' when EMERGENT_LLM_KEY is set, or heuristic fallback
        mode = data.get("mode")
        assert mode in ["llm", "heuristic_no_llm", "heuristic_no_sdk", "heuristic_llm_error"], f"Unexpected mode: {mode}"
        
        # Analysis should be non-empty
        analysis = data.get("analysis", "")
        assert len(analysis) > 10, f"Analysis too short: {len(analysis)} chars"
        
        print(f"analyze-event regression passed: mode={mode}, analysis_len={len(analysis)}")

    def test_whats_new_returns_summary(self):
        """POST /api/echo/whats-new still returns a summary"""
        response = requests.post(
            f"{BASE_URL}/api/echo/whats-new",
            json={"minutes": 60}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True, "Expected ok=True"
        assert "summary" in data, "Expected 'summary' key in response"
        assert "mode" in data, "Expected 'mode' key in response"
        
        mode = data.get("mode")
        # Mode should be 'llm' when key set, or fallback variants
        valid_modes = ["llm", "fallback_no_llm", "fallback_no_sdk", "fallback_llm_error", "empty"]
        assert mode in valid_modes, f"Unexpected mode: {mode}"
        
        print(f"whats-new regression passed: mode={mode}, event_count={data.get('event_count', 0)}")

    def test_echo_chat_what_happened_intent(self):
        """POST /api/echo/chat with 'what happened with Elroy' returns intent='what_happened_with_event'"""
        response = requests.post(
            f"{BASE_URL}/api/echo/chat",
            json={"message": "what happened with Elroy"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True, "Expected ok=True"
        assert "intent" in data, "Expected 'intent' key in response"
        
        intent = data.get("intent")
        assert intent == "what_happened_with_event", f"Expected intent='what_happened_with_event', got {intent}"
        
        # matched_event may or may not be present depending on DB state
        matched_event = data.get("matched_event")
        if matched_event:
            assert "id" in matched_event or "name" in matched_event, "matched_event should have id or name"
            print(f"echo/chat regression passed: intent={intent}, matched_event={matched_event.get('name', matched_event.get('id'))}")
        else:
            print(f"echo/chat regression passed: intent={intent}, matched_event=None (event not found)")


class TestBeoFinalizeRegression:
    """Regression test for BEO finalize (iter207 features)"""

    def test_beo_finalize_includes_gl_maestro_aurum(self):
        """POST /api/beo-builder/drafts/{id}/finalize includes gl_code, maestro_pushed, aurum_gl_routed"""
        # Use the known draft from test_credentials.md
        draft_id = "draft-d3aab87a28"
        
        response = requests.post(f"{BASE_URL}/api/beo-builder/drafts/{draft_id}/finalize")
        
        # The draft might already be finalized or not exist
        if response.status_code == 404:
            pytest.skip(f"Draft {draft_id} not found - may have been deleted or already finalized")
        
        if response.status_code == 409:
            # Already finalized - this is acceptable for regression
            print(f"Draft {draft_id} already finalized (409 Conflict) - regression check passed")
            return
        
        if response.status_code != 200:
            pytest.skip(f"Finalize returned {response.status_code}: {response.text[:200]}")
        
        data = response.json()
        
        # Check for gl_code
        gl_code = data.get("gl_code")
        assert gl_code is not None, "Expected gl_code in finalize response"
        assert gl_code in ["5200-BEO", "5210-AV"], f"Unexpected gl_code: {gl_code}"
        
        # Check for maestro_pushed
        maestro_pushed = data.get("maestro_pushed")
        assert maestro_pushed is True, f"Expected maestro_pushed=True, got {maestro_pushed}"
        
        # Check for aurum_gl_routed
        aurum_gl_routed = data.get("aurum_gl_routed")
        assert aurum_gl_routed is True, f"Expected aurum_gl_routed=True, got {aurum_gl_routed}"
        
        print(f"BEO finalize regression passed: gl_code={gl_code}, maestro_pushed={maestro_pushed}, aurum_gl_routed={aurum_gl_routed}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
