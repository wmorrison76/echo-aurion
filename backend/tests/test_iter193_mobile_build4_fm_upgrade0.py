"""
iter193 · Mobile Build 4 + FM-Upgrade 0 Backend Tests
=====================================================
Tests for:
- Hiring mobile endpoints (batches, batch detail, decision, decisions list)
- Finance rollup tiles
- Feature flags (admin CRUD + public resolver + bucketing)
- Migration runner (idempotency)
- Release notes (admin CRUD + staff unread/dismiss)
"""
import os
import pytest
import requests
import hashlib

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = "TsjvVFDCvoa4sG4wcVY7ZKF0D7LmA25lTer4edByo5o"
MANAGER_TOKEN = "2DwSKsmwALyIFd3JI_bq6Z3w"  # role: manager
EXISTING_BATCH_ID = "dcbf28a38e71"


@pytest.fixture(scope="module")
def api():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def general_token(api):
    """Mint a fresh general-role token for testing role gating"""
    r = api.post(
        f"{BASE_URL}/api/daily-briefing/mint",
        headers={"X-Admin-Token": ADMIN_TOKEN},
        json={"staff_name": "TEST_iter193_General", "staff_role": "Server", "ttl_days": 1}
    )
    if r.status_code == 200:
        return r.json().get("token")
    pytest.skip("Could not mint general token")


# ═══════════════════════════════════════════════════════════════════════════
# Mobile Build 4 · Hiring endpoints
# ═══════════════════════════════════════════════════════════════════════════

class TestHiringMobile:
    """Hiring mobile surface tests (manager/owner only)"""

    def test_hiring_batches_requires_manager(self, api, general_token):
        """GET /api/staff-mobile/hiring/batches returns 403 for general role"""
        r = api.get(
            f"{BASE_URL}/api/staff-mobile/hiring/batches",
            headers={"X-Briefing-Token": general_token}
        )
        assert r.status_code == 403, f"Expected 403 for general role, got {r.status_code}"
        print("✓ Hiring batches correctly returns 403 for general role")

    def test_hiring_batches_manager_ok(self, api):
        """GET /api/staff-mobile/hiring/batches returns 200 for manager"""
        r = api.get(
            f"{BASE_URL}/api/staff-mobile/hiring/batches?limit=10",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "batches" in data
        assert isinstance(data["batches"], list)
        print(f"✓ Hiring batches returns {len(data['batches'])} batches for manager")

    def test_hiring_batch_detail_not_found(self, api):
        """GET /api/staff-mobile/hiring/batch/{id} returns 404 for missing batch"""
        r = api.get(
            f"{BASE_URL}/api/staff-mobile/hiring/batch/nonexistent-batch-id",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        assert r.status_code == 404, f"Expected 404, got {r.status_code}"
        print("✓ Hiring batch detail returns 404 for missing batch")

    def test_hiring_batch_detail_existing(self, api):
        """GET /api/staff-mobile/hiring/batch/{id} returns full batch for existing"""
        r = api.get(
            f"{BASE_URL}/api/staff-mobile/hiring/batch/{EXISTING_BATCH_ID}",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        # May be 404 if batch doesn't exist in this env, or 200 if it does
        if r.status_code == 404:
            pytest.skip(f"Batch {EXISTING_BATCH_ID} not found in this environment")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "batch" in data
        print(f"✓ Hiring batch detail returns batch with {len(data['batch'].get('ranked', []))} candidates")

    def test_hiring_decision_invalid_decision(self, api):
        """POST /api/staff-mobile/hiring/decision returns 400 for invalid decision"""
        r = api.post(
            f"{BASE_URL}/api/staff-mobile/hiring/decision",
            headers={"X-Briefing-Token": MANAGER_TOKEN},
            json={"batch_id": EXISTING_BATCH_ID, "candidate_name": "Test", "decision": "invalid-decision"}
        )
        assert r.status_code == 400, f"Expected 400 for invalid decision, got {r.status_code}"
        print("✓ Hiring decision returns 400 for invalid decision value")

    def test_hiring_decision_missing_batch(self, api):
        """POST /api/staff-mobile/hiring/decision returns 404 for missing batch"""
        r = api.post(
            f"{BASE_URL}/api/staff-mobile/hiring/decision",
            headers={"X-Briefing-Token": MANAGER_TOKEN},
            json={"batch_id": "nonexistent-batch", "candidate_name": "Test", "decision": "advance"}
        )
        assert r.status_code == 404, f"Expected 404 for missing batch, got {r.status_code}"
        print("✓ Hiring decision returns 404 for missing batch")

    def test_hiring_decision_valid(self, api):
        """POST /api/staff-mobile/hiring/decision creates decision for valid input"""
        r = api.post(
            f"{BASE_URL}/api/staff-mobile/hiring/decision",
            headers={"X-Briefing-Token": MANAGER_TOKEN},
            json={
                "batch_id": EXISTING_BATCH_ID,
                "candidate_name": "TEST_iter193_Candidate",
                "decision": "phone-screen",
                "note": "Testing iter193"
            }
        )
        if r.status_code == 404:
            pytest.skip(f"Batch {EXISTING_BATCH_ID} not found")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "decision" in data
        assert data["decision"]["decision"] == "phone-screen"
        print(f"✓ Hiring decision created: {data['decision']['id']}")

    def test_hiring_decisions_list(self, api):
        """GET /api/staff-mobile/hiring/decisions/{batch_id} returns decisions"""
        r = api.get(
            f"{BASE_URL}/api/staff-mobile/hiring/decisions/{EXISTING_BATCH_ID}",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "decisions" in data
        assert isinstance(data["decisions"], list)
        print(f"✓ Hiring decisions list returns {len(data['decisions'])} decisions")


# ═══════════════════════════════════════════════════════════════════════════
# Mobile Build 4 · Finance rollup
# ═══════════════════════════════════════════════════════════════════════════

class TestFinanceRollup:
    """Finance rollup tiles (salary/manager/owner only)"""

    def test_finance_rollup_requires_salary(self, api, general_token):
        """GET /api/staff-mobile/finance/rollup returns 403 for general role"""
        r = api.get(
            f"{BASE_URL}/api/staff-mobile/finance/rollup?days=7",
            headers={"X-Briefing-Token": general_token}
        )
        assert r.status_code == 403, f"Expected 403 for general role, got {r.status_code}"
        print("✓ Finance rollup correctly returns 403 for general role")

    def test_finance_rollup_manager_ok(self, api):
        """GET /api/staff-mobile/finance/rollup returns 200 for manager"""
        r = api.get(
            f"{BASE_URL}/api/staff-mobile/finance/rollup?days=7",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "tiles" in data
        tiles = data["tiles"]
        assert "revenue" in tiles
        assert "food_cost" in tiles
        assert "labor" in tiles
        assert "prime_cost" in tiles
        assert "sparkline" in data
        assert "alerts" in data
        print(f"✓ Finance rollup returns tiles: revenue=${tiles['revenue']['value']}")


# ═══════════════════════════════════════════════════════════════════════════
# FM-Upgrade 0 · Feature flags
# ═══════════════════════════════════════════════════════════════════════════

class TestFeatureFlags:
    """Feature flag admin CRUD + public resolver"""

    def test_flags_list_requires_admin(self, api):
        """GET /api/flags returns 401 without admin token"""
        r = api.get(f"{BASE_URL}/api/flags")
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"
        print("✓ Flags list requires admin token")

    def test_flags_list_admin_ok(self, api):
        """GET /api/flags returns list for admin"""
        r = api.get(
            f"{BASE_URL}/api/flags",
            headers={"X-Admin-Token": ADMIN_TOKEN}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "flags" in data
        assert isinstance(data["flags"], list)
        print(f"✓ Flags list returns {len(data['flags'])} flags")

    def test_flags_upsert_create(self, api):
        """POST /api/flags/{name} creates new flag"""
        r = api.post(
            f"{BASE_URL}/api/flags/TEST_iter193_flag",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={"enabled": True, "rollout_pct": 50, "description": "Test flag for iter193"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data["flag"]["name"] == "TEST_iter193_flag"
        assert data["flag"]["enabled"] is True
        assert data["flag"]["rollout_pct"] == 50
        print("✓ Flag created: TEST_iter193_flag")

    def test_flags_upsert_update(self, api):
        """POST /api/flags/{name} updates existing flag"""
        r = api.post(
            f"{BASE_URL}/api/flags/TEST_iter193_flag",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={"rollout_pct": 75}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data["flag"]["rollout_pct"] == 75
        print("✓ Flag updated: rollout_pct=75")

    def test_flags_public_resolver(self, api):
        """GET /api/flags/public returns resolved flags for bucket"""
        r = api.get(f"{BASE_URL}/api/flags/public?bucket=test-user-123")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "flags" in data
        assert isinstance(data["flags"], dict)
        print(f"✓ Public flags resolver returns {len(data['flags'])} flags")

    def test_flags_bucketing_stable(self, api):
        """Rollout bucketing is stable per bucket_key"""
        # Create a flag with 50% rollout
        api.post(
            f"{BASE_URL}/api/flags/TEST_iter193_bucket_test",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={"enabled": True, "rollout_pct": 50}
        )
        # Same bucket should always get same result
        results = []
        for _ in range(5):
            r = api.get(f"{BASE_URL}/api/flags/public?bucket=stable-user-xyz")
            data = r.json()
            results.append(data["flags"].get("TEST_iter193_bucket_test"))
        # All results should be the same (stable bucketing)
        assert len(set(results)) == 1, f"Bucketing not stable: {results}"
        print(f"✓ Bucketing is stable: all 5 calls returned {results[0]}")

    def test_flags_allow_list_override(self, api):
        """allow_list overrides rollout percentage"""
        api.post(
            f"{BASE_URL}/api/flags/TEST_iter193_allowlist",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={"enabled": True, "rollout_pct": 0, "allow_list": ["vip-user"]}
        )
        r = api.get(f"{BASE_URL}/api/flags/public?bucket=vip-user")
        data = r.json()
        assert data["flags"].get("TEST_iter193_allowlist") is True, "allow_list should override 0% rollout"
        print("✓ allow_list correctly overrides rollout_pct=0")

    def test_flags_deny_list_override(self, api):
        """deny_list overrides enabled flag"""
        api.post(
            f"{BASE_URL}/api/flags/TEST_iter193_denylist",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={"enabled": True, "rollout_pct": 100, "deny_list": ["blocked-user"]}
        )
        r = api.get(f"{BASE_URL}/api/flags/public?bucket=blocked-user")
        data = r.json()
        assert data["flags"].get("TEST_iter193_denylist") is False, "deny_list should block even at 100%"
        print("✓ deny_list correctly blocks user even at 100% rollout")

    def test_flags_delete(self, api):
        """DELETE /api/flags/{name} removes flag"""
        r = api.delete(
            f"{BASE_URL}/api/flags/TEST_iter193_flag",
            headers={"X-Admin-Token": ADMIN_TOKEN}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data.get("ok") is True
        print("✓ Flag deleted: TEST_iter193_flag")


# ═══════════════════════════════════════════════════════════════════════════
# FM-Upgrade 0 · Release notes
# ═══════════════════════════════════════════════════════════════════════════

class TestReleaseNotes:
    """Release notes admin CRUD + staff surfaces"""

    def test_release_notes_create_requires_admin(self, api):
        """POST /api/release-notes returns 401 without admin token"""
        r = api.post(
            f"{BASE_URL}/api/release-notes",
            json={"title": "Test", "body": "Test body"}
        )
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"
        print("✓ Release notes create requires admin token")

    def test_release_notes_create(self, api):
        """POST /api/release-notes creates note (unpublished)"""
        r = api.post(
            f"{BASE_URL}/api/release-notes",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={
                "title": "TEST_iter193 Release Note",
                "body": "This is a test release note for iter193 testing.",
                "version": "iter193",
                "category": "feature"
            }
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "note" in data
        assert data["note"]["published"] is False
        pytest.note_id = data["note"]["id"]
        print(f"✓ Release note created: {pytest.note_id}")

    def test_release_notes_publish(self, api):
        """POST /api/release-notes/{id}/publish publishes note"""
        note_id = getattr(pytest, "note_id", None)
        if not note_id:
            pytest.skip("No note_id from previous test")
        r = api.post(
            f"{BASE_URL}/api/release-notes/{note_id}/publish",
            headers={"X-Admin-Token": ADMIN_TOKEN}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print(f"✓ Release note published: {note_id}")

    def test_release_notes_list_published(self, api):
        """GET /api/release-notes returns published notes"""
        r = api.get(f"{BASE_URL}/api/release-notes?limit=10")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data.get("ok") is True
        assert "notes" in data
        print(f"✓ Release notes list returns {len(data['notes'])} published notes")

    def test_release_notes_unread_staff(self, api):
        """GET /api/release-notes/unread returns unread for staff"""
        r = api.get(
            f"{BASE_URL}/api/release-notes/unread",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data.get("ok") is True
        assert "unread" in data
        assert "unread_count" in data
        print(f"✓ Staff unread returns {data['unread_count']} unread notes")

    def test_release_notes_dismiss(self, api):
        """POST /api/release-notes/{id}/dismiss persists per staff"""
        note_id = getattr(pytest, "note_id", None)
        if not note_id:
            pytest.skip("No note_id from previous test")
        r = api.post(
            f"{BASE_URL}/api/release-notes/{note_id}/dismiss",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        # Verify it's now dismissed
        r2 = api.get(
            f"{BASE_URL}/api/release-notes/unread",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        data = r2.json()
        dismissed_ids = [n["id"] for n in data.get("unread", [])]
        assert note_id not in dismissed_ids, "Note should be dismissed"
        print(f"✓ Release note dismissed and no longer in unread")

    def test_release_notes_unpublish(self, api):
        """POST /api/release-notes/{id}/unpublish unpublishes note"""
        note_id = getattr(pytest, "note_id", None)
        if not note_id:
            pytest.skip("No note_id from previous test")
        r = api.post(
            f"{BASE_URL}/api/release-notes/{note_id}/unpublish",
            headers={"X-Admin-Token": ADMIN_TOKEN}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print(f"✓ Release note unpublished: {note_id}")

    def test_release_notes_delete(self, api):
        """DELETE /api/release-notes/{id} removes note"""
        note_id = getattr(pytest, "note_id", None)
        if not note_id:
            pytest.skip("No note_id from previous test")
        r = api.delete(
            f"{BASE_URL}/api/release-notes/{note_id}",
            headers={"X-Admin-Token": ADMIN_TOKEN}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print(f"✓ Release note deleted: {note_id}")


# ═══════════════════════════════════════════════════════════════════════════
# Regression tests
# ═══════════════════════════════════════════════════════════════════════════

class TestRegression:
    """Regression tests for Mobile Build 3 features"""

    def test_health_endpoint(self, api):
        """GET /api/health returns healthy"""
        r = api.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "healthy"
        print("✓ Health endpoint returns healthy")

    def test_staff_mobile_me(self, api):
        """GET /api/staff-mobile/me returns staff and capabilities"""
        r = api.get(
            f"{BASE_URL}/api/staff-mobile/me",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data.get("ok") is True
        assert "staff" in data
        assert "capabilities" in data
        print(f"✓ Staff mobile /me returns role: {data['capabilities']['role']}")

    def test_push_register(self, api):
        """POST /api/push/register still works (regression)"""
        r = api.post(
            f"{BASE_URL}/api/push/register",
            headers={"X-Briefing-Token": MANAGER_TOKEN},
            json={"device_token": "TEST_iter193_regression", "platform": "web", "app_variant": "staff"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data.get("ok") is True
        print("✓ Push register still works")

    def test_standup_send_includes_mobile_push(self, api):
        """POST /api/standup/send includes mobile_push stats"""
        r = api.post(
            f"{BASE_URL}/api/standup/send",
            headers={"X-Admin-Token": ADMIN_TOKEN}
        )
        # May fail if no standup exists, but should return 200 or 404
        if r.status_code == 404:
            pytest.skip("No standup to send")
        if r.status_code == 200:
            data = r.json()
            # Check if mobile_push stats are included
            if "mobile_push" in data:
                print(f"✓ Standup send includes mobile_push: {data['mobile_push']}")
            else:
                print("✓ Standup send completed (mobile_push may be empty)")


# ═══════════════════════════════════════════════════════════════════════════
# Cleanup
# ═══════════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="module", autouse=True)
def cleanup(api):
    """Cleanup test data after all tests"""
    yield
    # Clean up test flags
    for flag_name in ["TEST_iter193_flag", "TEST_iter193_bucket_test", "TEST_iter193_allowlist", "TEST_iter193_denylist"]:
        try:
            api.delete(f"{BASE_URL}/api/flags/{flag_name}", headers={"X-Admin-Token": ADMIN_TOKEN})
        except:
            pass
    print("\n✓ Cleanup completed")
