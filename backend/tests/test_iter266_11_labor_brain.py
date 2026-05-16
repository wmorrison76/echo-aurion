"""Tests for iter266.11 Labor Brain Advisory Rail.

Covers:
  - GET  /api/echo-schedule/labor-brain (no filter, by outlet, by department)
  - POST /api/echo-schedule/labor-brain/accept (write + idempotency)
  - GET  /api/echo-schedule/labor-brain/decisions
  - Regression: /api/echo-schedule/dashboard and /api/echo-schedule/shifts
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fall back to frontend .env on disk (loaded once at import)
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.strip().split("=", 1)[1].rstrip("/")
                    break
    except Exception:
        pass

API = f"{BASE_URL}/api/echo-schedule"
VALID_SEVERITIES = {"urgent", "warn", "optimize", "info"}
REQUIRED_REC_KEYS = {
    "id", "outlet_id", "outlet_name", "severity", "title",
    "rationale", "action_type", "action_label", "confidence", "payload",
}
SEVERITY_WEIGHT = {"urgent": 100, "warn": 60, "optimize": 30, "info": 10}


@pytest.fixture(scope="module")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Regression checks (run first) ----------

class TestRegressionDashboardAndShifts:
    def test_dashboard_no_regression(self, http):
        r = http.get(f"{API}/dashboard", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "generated_at" in data
        assert "tiles" in data and isinstance(data["tiles"], list)
        assert "portfolio" in data and isinstance(data["portfolio"], dict)
        assert "scope" in data and "outlet_ids" in data["scope"]
        # tiles[].labor_pct_of_sales must still exist
        for tile in data["tiles"]:
            assert "labor_pct_of_sales" in tile
            assert "outlet_id" in tile
            assert "outlet_name" in tile
            assert "coverage_pct" in tile
            assert "approaching_ot" in tile
            assert "compliance_flags" in tile

    def test_dashboard_filter_by_outlet(self, http):
        r = http.get(f"{API}/dashboard", params={"outlets": "out-pier66-rest"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["scope"]["outlet_ids"] == ["out-pier66-rest"]
        assert all(t["outlet_id"] == "out-pier66-rest" for t in data["tiles"])

    def test_shifts_endpoint(self, http):
        r = http.get(f"{API}/shifts", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        # Should be a dict containing a list or a list directly
        assert isinstance(data, (dict, list))


# ---------- Labor Brain GET ----------

class TestLaborBrainList:
    def _validate_rec_shape(self, rec):
        missing = REQUIRED_REC_KEYS - set(rec.keys())
        assert not missing, f"Missing rec keys: {missing}"
        assert rec["severity"] in VALID_SEVERITIES
        assert isinstance(rec["confidence"], (int, float))
        assert 0 <= rec["confidence"] <= 1
        assert isinstance(rec["payload"], dict)
        assert isinstance(rec["id"], str) and rec["id"]
        assert isinstance(rec["outlet_id"], str) and rec["outlet_id"]
        assert isinstance(rec["outlet_name"], str)
        assert isinstance(rec["title"], str) and rec["title"]
        assert isinstance(rec["rationale"], str) and rec["rationale"]
        assert isinstance(rec["action_type"], str) and rec["action_type"]
        assert isinstance(rec["action_label"], str) and rec["action_label"]

    def test_no_filter_returns_envelope(self, http):
        r = http.get(f"{API}/labor-brain", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        # envelope
        for key in ("generated_at", "recommendations", "totals", "scope"):
            assert key in data, f"missing envelope key: {key}"
        assert isinstance(data["recommendations"], list)
        assert isinstance(data["totals"], dict)
        assert "all_recs" in data["totals"]
        assert data["totals"]["all_recs"] >= 0
        # max 5 ranked
        assert len(data["recommendations"]) <= 5
        # severity buckets
        for k in ("urgent", "warn", "optimize"):
            assert k in data["totals"]
        # validate shape of each rec
        for rec in data["recommendations"]:
            self._validate_rec_shape(rec)
        # sorted by severity weight desc (then confidence desc)
        weights = [SEVERITY_WEIGHT[r["severity"]] for r in data["recommendations"]]
        assert weights == sorted(weights, reverse=True), (
            f"Recommendations not sorted by severity weight: {weights}"
        )

    def test_filter_by_outlet(self, http):
        r = http.get(f"{API}/labor-brain",
                     params={"outlets": "out-pier66-rest"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["scope"]["outlet_ids"] == ["out-pier66-rest"]
        # All recs should belong to the scoped outlet
        for rec in data["recommendations"]:
            assert rec["outlet_id"] == "out-pier66-rest", (
                f"Outlet leak: {rec['outlet_id']}"
            )

    def test_filter_by_department(self, http):
        r = http.get(f"{API}/labor-brain",
                     params={"department": "foh-restaurant"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["scope"]["department"] == "foh-restaurant"
        assert isinstance(data["recommendations"], list)
        assert len(data["recommendations"]) <= 5


# ---------- Labor Brain POST (accept) + idempotency ----------

class TestLaborBrainAcceptAndDecisions:
    def test_accept_writes_paf_then_idempotent(self, http):
        # use a unique rec_id so we don't collide with prior runs on the same day
        rec_id = f"TEST_lb_rec_{uuid.uuid4().hex[:10]}"
        body = {
            "rec_id": rec_id,
            "outlet_id": "out-pier66-rest",
            "action_type": "call_in",
            "rationale": "TEST_ pytest accept",
            "payload": {"target_coverage_pct": 95},
            "accepted_by": "TEST_pytest",
        }

        # First call: should create
        r1 = http.post(f"{API}/labor-brain/accept", json=body, timeout=30)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1.get("ok") is True
        assert d1.get("idempotent") is False
        paf = d1.get("paf")
        assert isinstance(paf, dict)
        assert paf.get("id"), "PAF row must have id"
        assert paf.get("source") == "labor-brain"
        assert paf.get("status") == "pending"
        assert paf.get("rec_id") == rec_id
        assert paf.get("outlet_id") == "out-pier66-rest"
        assert paf.get("action_type") == "call_in"
        # No raw mongo _id leakage
        assert "_id" not in paf

        # Second call with same rec_id same day: idempotent
        r2 = http.post(f"{API}/labor-brain/accept", json=body, timeout=30)
        assert r2.status_code == 200, r2.text
        d2 = r2.json()
        assert d2.get("ok") is True
        assert d2.get("idempotent") is True, (
            f"Expected idempotent=true on second call, got {d2}"
        )
        # PAF id should remain stable
        assert d2["paf"]["id"] == paf["id"]

        # Decisions feed should contain this rec
        r3 = http.get(f"{API}/labor-brain/decisions", timeout=30)
        assert r3.status_code == 200, r3.text
        d3 = r3.json()
        assert "decisions" in d3 and "count" in d3
        assert isinstance(d3["decisions"], list)
        assert d3["count"] == len(d3["decisions"])
        assert d3["count"] >= 1
        # our rec should be there
        matching = [x for x in d3["decisions"] if x.get("rec_id") == rec_id]
        assert matching, (
            f"Inserted rec_id={rec_id} not found in decisions feed "
            f"(count={d3['count']})"
        )
        # No mongo _id leakage in decisions
        for row in d3["decisions"]:
            assert "_id" not in row

    def test_accept_missing_required_fields_rejected(self, http):
        # Missing rec_id should fail Pydantic validation
        r = http.post(f"{API}/labor-brain/accept", json={
            "outlet_id": "out-pier66-rest",
            "action_type": "call_in",
            "rationale": "missing rec_id",
        }, timeout=30)
        assert r.status_code in (400, 422), (
            f"Expected 4xx for missing rec_id, got {r.status_code} {r.text}"
        )
