"""
Backend regression tests for Phase 3 — help-agent endpoints + brand-icon static assets + sanity checks
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cfo-toolkit-deploy.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

EXPECTED_TOURS = {
    "post_first_recipe_voice",
    "approve_pending_action",
    "borrow_employee_cross_dept",
    "menu_proposal_for_event",
    "view_paystub",
}


# ----- help-agent tours -----
class TestHelpAgentTours:
    def test_list_tours(self):
        r = requests.get(f"{API}/help-agent/tours", timeout=15)
        assert r.status_code == 200
        data = r.json()
        # Accept either {tours:[..]} or list directly
        tours = data.get("tours", data) if isinstance(data, dict) else data
        assert isinstance(tours, list)
        ids = {t.get("id") or t.get("tour_id") for t in tours}
        assert EXPECTED_TOURS.issubset(ids), f"Missing tours: {EXPECTED_TOURS - ids}"

    def test_tour_detail_full(self):
        r = requests.get(f"{API}/help-agent/tours/post_first_recipe_voice", timeout=15)
        assert r.status_code == 200
        data = r.json()
        steps = data.get("steps")
        assert isinstance(steps, list)
        assert len(steps) == 4, f"Expected 4 steps, got {len(steps)}"
        for s in steps:
            assert "target" in s and "title" in s and "body" in s

    def test_tour_not_found(self):
        r = requests.get(f"{API}/help-agent/tours/does_not_exist", timeout=15)
        assert r.status_code == 404


# ----- help-agent sessions (shared session across tests) -----
@pytest.fixture(scope="class")
def session_state():
    return {}


class TestHelpAgentSession:
    def test_create_session(self, session_state):
        r = requests.post(f"{API}/help-agent/sessions", json={"tour_id": "view_paystub"}, timeout=15)
        assert r.status_code in (200, 201), r.text
        d = r.json()
        assert d.get("status") == "active"
        assert d.get("step_index") == 0
        assert d.get("total_steps") == 3
        sid = d.get("id") or d.get("session_id")
        assert sid
        session_state["id"] = sid

    def test_advance_step(self, session_state):
        sid = session_state["id"]
        r = requests.post(f"{API}/help-agent/sessions/{sid}/advance", timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("step_index") == 1
        assert d.get("status") == "active"

    def test_advance_to_completion(self, session_state):
        sid = session_state["id"]
        # advance to index 2, then past last
        r2 = requests.post(f"{API}/help-agent/sessions/{sid}/advance", timeout=15)
        assert r2.status_code == 200
        assert r2.json().get("step_index") == 2
        r3 = requests.post(f"{API}/help-agent/sessions/{sid}/advance", timeout=15)
        assert r3.status_code == 200
        assert r3.json().get("status") == "completed"

    def test_skip_session(self):
        r = requests.post(f"{API}/help-agent/sessions", json={"tour_id": "view_paystub"}, timeout=15)
        sid = r.json().get("id") or r.json().get("session_id")
        rs = requests.post(f"{API}/help-agent/sessions/{sid}/skip", timeout=15)
        assert rs.status_code == 200, rs.text
        assert rs.json().get("status") == "skipped"

    def test_abandon_session(self):
        r = requests.post(f"{API}/help-agent/sessions", json={"tour_id": "view_paystub"}, timeout=15)
        sid = r.json().get("id") or r.json().get("session_id")
        ra = requests.post(f"{API}/help-agent/sessions/{sid}/abandon", timeout=15)
        assert ra.status_code == 200, ra.text
        assert ra.json().get("status") == "abandoned"


# ----- help-agent /ask -----
class TestHelpAgentAsk:
    def test_ask_suggests_paystub(self):
        r = requests.post(f"{API}/help-agent/ask", json={"question": "how do I view my paystub"}, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("reply") and isinstance(d["reply"], str) and len(d["reply"]) > 0
        assert d.get("suggested_tour") == "view_paystub"

    def test_ask_unrelated_no_suggestion(self):
        r = requests.post(f"{API}/help-agent/ask", json={"question": "what is the weather on mars right now"}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d.get("reply") and isinstance(d["reply"], str)
        assert d.get("suggested_tour") in (None, "", "null")


# ----- regression: existing endpoints -----
class TestRegression:
    def test_health(self):
        r = requests.get(f"{API}/health", timeout=15)
        assert r.status_code == 200

    def test_pace_property(self):
        r = requests.get(f"{API}/pace/property/demo-hotel", timeout=20)
        # endpoint should exist - 200 or 404 acceptable for unknown id, but no 5xx
        assert r.status_code < 500, r.text

    def test_exception_review(self):
        r = requests.get(f"{API}/exception-review/demo", timeout=20)
        assert r.status_code < 500, r.text


# ----- static brand-icon assets via preview server -----
class TestBrandIconAssets:
    def test_echo_aurum_png(self):
        r = requests.get(f"{BASE_URL}/brand-icons/tier1/EchoAurum.png", timeout=15)
        assert r.status_code == 200, f"Got {r.status_code}"
        assert r.headers.get("content-type", "").startswith("image/")

    def test_my_echo_png(self):
        r = requests.get(f"{BASE_URL}/brand-icons/tier3/MyEcho.png", timeout=15)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/")
