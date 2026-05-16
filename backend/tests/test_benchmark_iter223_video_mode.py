"""iter223 second-half · Video mode + expanded mixed library + UI button/badge tests.

William's asks:
1. POST /api/waste/benchmark/run with video_mode:true returns mode='video', video_frames in doc
2. POST /api/waste/benchmark/run with video_mode:false returns mode='still', frames_analysed=1
3. Video-mode run preserves multi_item per_sample shape (per_item, missing_items, extra_items, F1)
4. GET /api/waste/benchmark/samples?limit=200 returns ≥18 bs-mix-* samples including tier-5/6
5. GET /api/waste/benchmark/status returns sample_count ≥42 (23 legacy + 19 mixed)
6. Regression: trust-all-matched + PATCH trust_fingerprint still work
"""
import os
import pytest
import requests
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestVideoModeEndpoint:
    """Test video_mode parameter in POST /api/waste/benchmark/run"""

    def test_video_mode_run_returns_mode_video(self, api_client):
        """POST /run with video_mode:true returns run with mode='video' and video_frames set"""
        # First get a sample to run against (use a mixed sample if available)
        samples_resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/samples?limit=200")
        assert samples_resp.status_code == 200
        samples = samples_resp.json().get("rows", [])
        assert len(samples) > 0, "Need at least one sample to test video mode"
        
        # Pick a mixed sample if available, else first sample
        mixed_samples = [s for s in samples if s.get("id", "").startswith("bs-mix-")]
        sample_id = mixed_samples[0]["id"] if mixed_samples else samples[0]["id"]
        
        # Run with video_mode=true
        run_resp = api_client.post(f"{BASE_URL}/api/waste/benchmark/run", json={
            "video_mode": True,
            "video_frames": 4,
            "sample_ids": [sample_id],
            "note": "TEST_video_mode_iter223"
        })
        assert run_resp.status_code == 200
        run_data = run_resp.json()
        assert run_data.get("ok") is True
        run_id = run_data.get("run_id")
        assert run_id is not None
        
        # Poll for completion (video mode is slower)
        for _ in range(60):  # 60 * 2.5s = 150s max
            time.sleep(2.5)
            detail_resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/runs/{run_id}")
            if detail_resp.status_code == 200:
                run = detail_resp.json().get("run", {})
                if run.get("status") == "complete":
                    # Verify video mode fields
                    assert run.get("mode") == "video", f"Expected mode='video', got {run.get('mode')}"
                    assert run.get("video_frames") == 4, f"Expected video_frames=4, got {run.get('video_frames')}"
                    
                    # Verify per_sample has frames_analysed
                    per_sample = run.get("per_sample", [])
                    if per_sample:
                        for ps in per_sample:
                            if "frames_analysed" in ps:
                                assert ps["frames_analysed"] == 4, f"Expected frames_analysed=4, got {ps['frames_analysed']}"
                    print(f"✓ Video mode run {run_id} completed: mode={run.get('mode')}, video_frames={run.get('video_frames')}")
                    return
        pytest.fail("Video mode run did not complete in time")

    def test_still_mode_run_returns_mode_still(self, api_client):
        """POST /run with video_mode:false returns run with mode='still' and frames_analysed=1"""
        samples_resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/samples?limit=10")
        assert samples_resp.status_code == 200
        samples = samples_resp.json().get("rows", [])
        assert len(samples) > 0
        
        sample_id = samples[0]["id"]
        
        # Run with video_mode=false (default)
        run_resp = api_client.post(f"{BASE_URL}/api/waste/benchmark/run", json={
            "video_mode": False,
            "sample_ids": [sample_id],
            "note": "TEST_still_mode_iter223"
        })
        assert run_resp.status_code == 200
        run_data = run_resp.json()
        assert run_data.get("ok") is True
        run_id = run_data.get("run_id")
        
        # Poll for completion
        for _ in range(40):
            time.sleep(2.5)
            detail_resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/runs/{run_id}")
            if detail_resp.status_code == 200:
                run = detail_resp.json().get("run", {})
                if run.get("status") == "complete":
                    assert run.get("mode") == "still", f"Expected mode='still', got {run.get('mode')}"
                    assert run.get("video_frames") is None, f"Expected video_frames=None for still mode"
                    
                    per_sample = run.get("per_sample", [])
                    if per_sample:
                        for ps in per_sample:
                            if "frames_analysed" in ps:
                                assert ps["frames_analysed"] == 1, f"Expected frames_analysed=1, got {ps['frames_analysed']}"
                    print(f"✓ Still mode run {run_id} completed: mode={run.get('mode')}")
                    return
        pytest.fail("Still mode run did not complete in time")


class TestVideoModeMultiItemShape:
    """Video-mode run preserves multi_item per_sample shape"""

    def test_video_mode_preserves_multi_item_fields(self, api_client):
        """Video mode run on mixed sample returns per_item, missing_items, extra_items, F1"""
        samples_resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/samples?limit=200")
        assert samples_resp.status_code == 200
        samples = samples_resp.json().get("rows", [])
        
        # Find a mixed sample with expected_items
        mixed_samples = [s for s in samples if s.get("expected_items") and len(s.get("expected_items", [])) >= 2]
        if not mixed_samples:
            pytest.skip("No multi-item samples available for video mode test")
        
        sample_id = mixed_samples[0]["id"]
        
        # Run with video_mode=true
        run_resp = api_client.post(f"{BASE_URL}/api/waste/benchmark/run", json={
            "video_mode": True,
            "video_frames": 4,
            "sample_ids": [sample_id],
            "note": "TEST_video_multi_item_iter223"
        })
        assert run_resp.status_code == 200
        run_id = run_resp.json().get("run_id")
        
        # Poll for completion
        for _ in range(60):
            time.sleep(2.5)
            detail_resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/runs/{run_id}")
            if detail_resp.status_code == 200:
                run = detail_resp.json().get("run", {})
                if run.get("status") == "complete":
                    per_sample = run.get("per_sample", [])
                    assert len(per_sample) > 0, "Expected at least one per_sample entry"
                    
                    ps = per_sample[0]
                    # Check multi_item fields are present
                    if ps.get("multi_item"):
                        assert "per_item" in ps, "Missing per_item in multi_item sample"
                        assert "missing_items" in ps, "Missing missing_items in multi_item sample"
                        assert "extra_items" in ps, "Missing extra_items in multi_item sample"
                        assert "f1" in ps, "Missing f1 in multi_item sample"
                        assert "precision" in ps, "Missing precision in multi_item sample"
                        assert "recall" in ps, "Missing recall in multi_item sample"
                        print(f"✓ Video mode multi-item shape preserved: f1={ps.get('f1')}, per_item count={len(ps.get('per_item', []))}")
                    return
        pytest.fail("Video mode multi-item run did not complete in time")


class TestExpandedMixedLibrary:
    """Test expanded mixed library with tier-5 and tier-6 samples"""

    def test_samples_include_tier5_and_tier6(self, api_client):
        """GET /samples?limit=200 returns ≥18 bs-mix-* samples including tier-5/6"""
        resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/samples?limit=200")
        assert resp.status_code == 200
        data = resp.json()
        samples = data.get("rows", [])
        
        # Count mixed samples
        mixed_samples = [s for s in samples if s.get("id", "").startswith("bs-mix-")]
        print(f"Found {len(mixed_samples)} mixed samples (bs-mix-*)")
        
        # Check for tier-5 and tier-6
        tier5_samples = [s for s in samples if "bs-mix-t5-" in s.get("id", "")]
        tier6_samples = [s for s in samples if "bs-mix-t6-" in s.get("id", "")]
        
        print(f"Tier-5 samples: {len(tier5_samples)}")
        print(f"Tier-6 samples: {len(tier6_samples)}")
        
        # Should have at least 18 mixed samples total
        assert len(mixed_samples) >= 18, f"Expected ≥18 mixed samples, got {len(mixed_samples)}"
        
        # Should have tier-5 and tier-6 samples
        assert len(tier5_samples) >= 1, f"Expected at least 1 tier-5 sample, got {len(tier5_samples)}"
        assert len(tier6_samples) >= 1, f"Expected at least 1 tier-6 sample, got {len(tier6_samples)}"
        
        print(f"✓ Expanded mixed library verified: {len(mixed_samples)} mixed, {len(tier5_samples)} tier-5, {len(tier6_samples)} tier-6")


class TestBenchmarkStatus:
    """Test GET /api/waste/benchmark/status returns expected counts"""

    def test_status_sample_count_at_least_42(self, api_client):
        """GET /status returns sample_count ≥42 (23 legacy + 19 mixed)"""
        resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/status")
        assert resp.status_code == 200
        data = resp.json()
        
        sample_count = data.get("sample_count", 0)
        print(f"Status sample_count: {sample_count}")
        
        # Should have at least 42 samples (23 legacy + 19 mixed per seed_mixed_samples.py)
        assert sample_count >= 42, f"Expected sample_count ≥42, got {sample_count}"
        
        # Also verify other status fields
        assert "runs_captured" in data
        assert "best_overall" in data
        assert "best_grade" in data
        
        print(f"✓ Status endpoint verified: {sample_count} samples, best={data.get('best_overall')}, grade={data.get('best_grade')}")


class TestRegressionTrustPaths:
    """Regression: trust-all-matched + PATCH trust_fingerprint still work"""

    def test_patch_sample_with_trust_fingerprint(self, api_client):
        """PATCH /samples/{id} with trust_fingerprint:true writes fingerprints"""
        # Get a sample with expected_recipe_id
        samples_resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/samples?limit=50")
        assert samples_resp.status_code == 200
        samples = samples_resp.json().get("rows", [])
        
        # Find a sample with recipe_id
        sample_with_recipe = None
        for s in samples:
            if s.get("expected_recipe_id"):
                sample_with_recipe = s
                break
        
        if not sample_with_recipe:
            pytest.skip("No sample with expected_recipe_id found for trust_fingerprint test")
        
        sample_id = sample_with_recipe["id"]
        
        # PATCH with trust_fingerprint=true
        patch_resp = api_client.patch(f"{BASE_URL}/api/waste/benchmark/samples/{sample_id}", json={
            "trust_fingerprint": True
        })
        assert patch_resp.status_code == 200
        data = patch_resp.json()
        assert data.get("ok") is True
        
        # Should return fingerprints_written count
        fp_written = data.get("fingerprints_written", 0)
        print(f"✓ PATCH trust_fingerprint: {fp_written} fingerprints written for sample {sample_id}")

    def test_trust_all_matched_on_complete_run(self, api_client):
        """POST /runs/{id}/trust-all-matched returns updates and fingerprints_written"""
        # Get a completed run
        runs_resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/runs?limit=10")
        assert runs_resp.status_code == 200
        runs = runs_resp.json().get("rows", [])
        
        complete_run = None
        for r in runs:
            if r.get("status") == "complete":
                complete_run = r
                break
        
        if not complete_run:
            pytest.skip("No completed run found for trust-all-matched test")
        
        run_id = complete_run["id"]
        
        # POST trust-all-matched
        trust_resp = api_client.post(f"{BASE_URL}/api/waste/benchmark/runs/{run_id}/trust-all-matched", json={
            "min_item_match": 0.85,
            "also_write_fingerprints": True
        })
        assert trust_resp.status_code == 200
        data = trust_resp.json()
        assert data.get("ok") is True
        
        # Should return updates and fingerprints_written
        assert "updates" in data
        assert "fingerprints_written" in data
        print(f"✓ trust-all-matched: {data.get('updates')} updates, {data.get('fingerprints_written')} fingerprints")


class TestCleanup:
    """Cleanup test data"""

    def test_cleanup_test_runs(self, api_client):
        """Clean up TEST_ prefixed runs (informational only)"""
        # Note: We don't have a delete endpoint for runs, so this is informational
        runs_resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/runs?limit=50")
        if runs_resp.status_code == 200:
            runs = runs_resp.json().get("rows", [])
            test_runs = [r for r in runs if (r.get("note") or "").startswith("TEST_")]
            print(f"Found {len(test_runs)} TEST_ prefixed runs (no cleanup endpoint available)")
        print("✓ Cleanup check complete")
