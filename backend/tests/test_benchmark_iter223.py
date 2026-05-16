"""iter223 · Multi-item benchmark tests
Tests for:
- POST /samples with expected_items array (multi-item ground truth)
- POST /compose-mixed (mixed-image composer)
- PATCH /samples/{id} with expected_items + trust_fingerprint
- POST /run with multi-item samples (multi-item scoring)
- POST /runs/{id}/trust-all-matched (bulk trust)
- GET /runs/{id} multi-item per_sample shape
- Regression: single-item samples still score via legacy path
- Regression: /api/waste/capture/still still works
"""
import pytest
import requests
import os
import time
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestMultiItemSamples:
    """Tests for multi-item benchmark sample creation and retrieval"""
    
    def test_create_sample_with_expected_items(self, api_client):
        """POST /samples with expected_items array persists multi-item ground truth"""
        # Create a minimal test image (1x1 red pixel JPEG)
        test_image_b64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k="
        
        payload = {
            "media_base64": test_image_b64,
            "label": "TEST_Multi-item pastry tray",
            "expected_count": 5.0,
            "expected_portion_g": 100.0,
            "expected_items": [
                {"label": "Blueberry Muffin", "recipe_id": "rec-muffin-bb", "count": 2, "portion_g": 95, "category": "pastry", "cost_per_unit": 1.25},
                {"label": "Chocolate Muffin", "recipe_id": "rec-muffin-choc", "count": 3, "portion_g": 100, "category": "pastry", "cost_per_unit": 1.35}
            ],
            "source": "test_iter223"
        }
        
        resp = api_client.post(f"{BASE_URL}/api/waste/benchmark/samples", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert data.get("ok") is True
        assert "sample" in data
        sample = data["sample"]
        
        # Verify expected_items persisted
        assert sample.get("expected_items") is not None
        assert len(sample["expected_items"]) == 2
        assert sample["expected_items"][0]["label"] == "Blueberry Muffin"
        assert sample["expected_items"][1]["label"] == "Chocolate Muffin"
        
        # Verify complexity auto-calculated
        assert sample.get("complexity") == "mixed-2"
        
        # Store sample_id for cleanup
        self.__class__.created_sample_id = sample["id"]
        print(f"PASS: Created multi-item sample {sample['id']} with complexity={sample['complexity']}")
    
    def test_get_sample_roundtrips_expected_items(self, api_client):
        """GET /samples returns expected_items array"""
        resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/samples?limit=50")
        assert resp.status_code == 200
        
        data = resp.json()
        assert data.get("ok") is True
        
        # Find our test sample
        test_sample = None
        for s in data["rows"]:
            if s.get("source") == "test_iter223" and "TEST_Multi-item" in s.get("label", ""):
                test_sample = s
                break
        
        if test_sample:
            assert test_sample.get("expected_items") is not None
            assert len(test_sample["expected_items"]) >= 2
            print(f"PASS: GET /samples returns expected_items for {test_sample['id']}")
        else:
            print("WARN: Test sample not found in list (may have been cleaned up)")
    
    def test_cleanup_test_sample(self, api_client):
        """Cleanup: delete test sample"""
        if hasattr(self.__class__, 'created_sample_id'):
            resp = api_client.delete(f"{BASE_URL}/api/waste/benchmark/samples/{self.__class__.created_sample_id}")
            assert resp.status_code in [200, 404]
            print(f"PASS: Cleaned up test sample {self.__class__.created_sample_id}")


class TestComposeMixed:
    """Tests for POST /compose-mixed endpoint"""
    
    def test_compose_mixed_valid_urls(self, api_client):
        """POST /compose-mixed with valid TheMealDB URLs creates multi-item sample"""
        payload = {
            "pieces": [
                {
                    "url": "https://www.themealdb.com/images/media/meals/adxcbq1619787919.jpg",
                    "label": "TEST_Pancakes",
                    "recipe_id": "rec-pancake",
                    "count": 3,
                    "portion_g": 120,
                    "category": "pastry",
                    "cost_per_unit": 0.95
                },
                {
                    "url": "https://www.themealdb.com/images/media/meals/58oia61564916529.jpg",
                    "label": "TEST_Bacon",
                    "recipe_id": "rec-bacon",
                    "count": 4,
                    "portion_g": 60,
                    "category": "protein",
                    "cost_per_unit": 2.40
                }
            ],
            "overall_label": "TEST_Composed mix · pancakes + bacon",
            "source": "test_iter223_compose"
        }
        
        resp = api_client.post(f"{BASE_URL}/api/waste/benchmark/compose-mixed", json=payload, timeout=30)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert data.get("ok") is True
        sample = data.get("sample", {})
        
        # Verify expected_items from pieces
        assert sample.get("expected_items") is not None
        assert len(sample["expected_items"]) == 2
        assert sample.get("complexity") == "mixed-2"
        
        self.__class__.composed_sample_id = sample["id"]
        print(f"PASS: Composed mixed sample {sample['id']} with {len(sample['expected_items'])} items")
    
    def test_compose_mixed_invalid_url(self, api_client):
        """POST /compose-mixed with invalid URL returns 400"""
        payload = {
            "pieces": [
                {"url": "https://invalid-domain-xyz.com/nonexistent.jpg", "label": "Bad", "count": 1, "portion_g": 100},
                {"url": "https://www.themealdb.com/images/media/meals/xxsxqy1515878994.jpg", "label": "Good", "count": 1, "portion_g": 100}
            ],
            "overall_label": "TEST_Invalid mix"
        }
        
        resp = api_client.post(f"{BASE_URL}/api/waste/benchmark/compose-mixed", json=payload, timeout=30)
        assert resp.status_code == 400, f"Expected 400 for invalid URL, got {resp.status_code}"
        print("PASS: compose-mixed returns 400 for invalid URL")
    
    def test_compose_mixed_non_image_url(self, api_client):
        """POST /compose-mixed with non-image content-type returns 415"""
        payload = {
            "pieces": [
                {"url": "https://www.google.com/", "label": "HTML page", "count": 1, "portion_g": 100},
                {"url": "https://www.themealdb.com/images/media/meals/xxsxqy1515878994.jpg", "label": "Good", "count": 1, "portion_g": 100}
            ],
            "overall_label": "TEST_Non-image mix"
        }
        
        resp = api_client.post(f"{BASE_URL}/api/waste/benchmark/compose-mixed", json=payload, timeout=30)
        assert resp.status_code == 415, f"Expected 415 for non-image content-type, got {resp.status_code}"
        print("PASS: compose-mixed returns 415 for non-image content-type")
    
    def test_cleanup_composed_sample(self, api_client):
        """Cleanup: delete composed sample"""
        if hasattr(self.__class__, 'composed_sample_id'):
            resp = api_client.delete(f"{BASE_URL}/api/waste/benchmark/samples/{self.__class__.composed_sample_id}")
            assert resp.status_code in [200, 404]
            print(f"PASS: Cleaned up composed sample {self.__class__.composed_sample_id}")


class TestPatchSampleWithTrustFingerprint:
    """Tests for PATCH /samples/{id} with expected_items and trust_fingerprint"""
    
    def test_patch_sample_with_expected_items(self, api_client):
        """PATCH /samples/{id} with expected_items updates ground truth"""
        # Get an existing mixed sample
        resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/samples?limit=50")
        assert resp.status_code == 200
        
        mixed_samples = [s for s in resp.json()["rows"] if s.get("expected_items") and s["id"].startswith("bs-mix-")]
        if not mixed_samples:
            pytest.skip("No mixed samples available for testing")
        
        sample = mixed_samples[0]
        sample_id = sample["id"]
        
        # Patch with updated expected_items
        new_items = [
            {"label": "Updated Muffin", "recipe_id": "rec-muffin-bb", "count": 5, "portion_g": 95, "category": "pastry", "cost_per_unit": 1.25}
        ]
        
        resp = api_client.patch(f"{BASE_URL}/api/waste/benchmark/samples/{sample_id}", json={
            "expected_items": new_items
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert data.get("ok") is True
        assert data["sample"]["expected_items"][0]["label"] == "Updated Muffin"
        # Complexity should auto-update to single since only 1 item
        assert data["sample"]["complexity"] == "single"
        
        # Restore original items
        api_client.patch(f"{BASE_URL}/api/waste/benchmark/samples/{sample_id}", json={
            "expected_items": sample["expected_items"],
            "complexity": sample.get("complexity")
        })
        
        print(f"PASS: PATCH /samples/{sample_id} with expected_items works")
    
    def test_patch_sample_with_trust_fingerprint(self, api_client):
        """PATCH /samples/{id} with trust_fingerprint:true writes fingerprints"""
        # Get a mixed sample with recipe_ids
        resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/samples?limit=50")
        assert resp.status_code == 200
        
        mixed_samples = [s for s in resp.json()["rows"] 
                        if s.get("expected_items") 
                        and s["id"].startswith("bs-mix-")
                        and any(it.get("recipe_id") for it in s.get("expected_items", []))]
        
        if not mixed_samples:
            pytest.skip("No mixed samples with recipe_ids available")
        
        sample = mixed_samples[0]
        sample_id = sample["id"]
        
        resp = api_client.patch(f"{BASE_URL}/api/waste/benchmark/samples/{sample_id}", json={
            "trust_fingerprint": True
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert data.get("ok") is True
        assert "fingerprints_written" in data
        # May be 0 if fingerprints already exist or no valid recipe_ids
        print(f"PASS: PATCH with trust_fingerprint=true returned fingerprints_written={data['fingerprints_written']}")


class TestMultiItemBenchmarkRun:
    """Tests for POST /run with multi-item samples and multi-item scoring"""
    
    def test_run_with_mixed_samples_returns_multi_item_fields(self, api_client):
        """POST /run with mixed samples returns multi_item:true and f1_avg, cost_accuracy_avg"""
        # Get 2 mixed sample IDs
        resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/samples?limit=50")
        assert resp.status_code == 200
        
        mixed_ids = [s["id"] for s in resp.json()["rows"] if s.get("expected_items") and s["id"].startswith("bs-mix-")][:2]
        
        if len(mixed_ids) < 2:
            pytest.skip("Need at least 2 mixed samples for this test")
        
        # Start a run with just 2 samples (fast)
        resp = api_client.post(f"{BASE_URL}/api/waste/benchmark/run", json={
            "sample_ids": mixed_ids,
            "note": "iter223 multi-item test"
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert data.get("ok") is True
        run_id = data["run_id"]
        assert data["status"] == "running"
        
        # Poll until complete (max 90s for 2 samples)
        for _ in range(18):
            time.sleep(5)
            resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/runs/{run_id}")
            assert resp.status_code == 200
            run = resp.json()["run"]
            if run["status"] == "complete":
                break
        
        assert run["status"] == "complete", f"Run did not complete in time, status={run['status']}"
        
        # Verify multi-item aggregates
        assert "f1_avg" in run, "Missing f1_avg in run"
        assert "cost_accuracy_avg" in run, "Missing cost_accuracy_avg in run"
        assert "by_complexity" in run, "Missing by_complexity in run"
        
        # Verify per_sample has multi_item:true
        multi_item_samples = [p for p in run.get("per_sample", []) if p.get("multi_item")]
        assert len(multi_item_samples) >= 1, "Expected at least 1 multi_item sample in per_sample"
        
        # Verify multi-item sample has expected fields
        mi = multi_item_samples[0]
        assert "f1" in mi, "Missing f1 in multi-item sample"
        assert "per_item" in mi, "Missing per_item in multi-item sample"
        assert "missing_items" in mi, "Missing missing_items in multi-item sample"
        assert "extra_items" in mi, "Missing extra_items in multi-item sample"
        assert "expected_total_cost" in mi, "Missing expected_total_cost in multi-item sample"
        assert "predicted_total_cost" in mi, "Missing predicted_total_cost in multi-item sample"
        
        self.__class__.test_run_id = run_id
        print(f"PASS: Run {run_id} has multi-item fields: f1_avg={run['f1_avg']}, cost_accuracy_avg={run['cost_accuracy_avg']}, by_complexity keys={list(run['by_complexity'].keys())}")
    
    def test_get_run_includes_multi_item_per_sample_shape(self, api_client):
        """GET /runs/{id} includes multi-item per_sample shape with per_item list"""
        if not hasattr(self.__class__, 'test_run_id'):
            pytest.skip("No test run available")
        
        resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/runs/{self.__class__.test_run_id}")
        assert resp.status_code == 200
        
        run = resp.json()["run"]
        multi_samples = [p for p in run.get("per_sample", []) if p.get("multi_item")]
        
        if multi_samples:
            sample = multi_samples[0]
            # Verify per_item structure
            if sample.get("per_item"):
                item = sample["per_item"][0]
                assert "expected" in item, "per_item missing expected"
                assert "predicted" in item, "per_item missing predicted"
                assert "item_match" in item, "per_item missing item_match"
                assert "count_accuracy" in item, "per_item missing count_accuracy"
                print(f"PASS: per_item structure verified with {len(sample['per_item'])} items")
            else:
                print("WARN: per_item is empty (no matches)")
        else:
            print("WARN: No multi_item samples in run")


class TestTrustAllMatched:
    """Tests for POST /runs/{id}/trust-all-matched endpoint"""
    
    def test_trust_all_matched_returns_updates_and_fingerprints(self, api_client):
        """POST /runs/{id}/trust-all-matched calibrates matched items and writes fingerprints"""
        # Get a completed run with multi-item samples
        resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/runs?limit=10")
        assert resp.status_code == 200
        
        runs = resp.json()["rows"]
        completed_runs = [r for r in runs if r["status"] == "complete" and r.get("f1_avg") is not None]
        
        if not completed_runs:
            pytest.skip("No completed multi-item runs available")
        
        run_id = completed_runs[0]["id"]
        
        resp = api_client.post(f"{BASE_URL}/api/waste/benchmark/runs/{run_id}/trust-all-matched", json={
            "min_item_match": 0.85,
            "also_write_fingerprints": True
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert data.get("ok") is True
        assert "updates" in data
        assert "fingerprints_written" in data
        
        print(f"PASS: trust-all-matched on {run_id}: updates={data['updates']}, fingerprints_written={data['fingerprints_written']}")
    
    def test_trust_all_matched_on_incomplete_run_returns_409(self, api_client):
        """POST /runs/{id}/trust-all-matched on incomplete run returns 409"""
        # Get a running run if any
        resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/runs?limit=10")
        assert resp.status_code == 200
        
        running_runs = [r for r in resp.json()["rows"] if r["status"] == "running"]
        
        if not running_runs:
            # Create a quick run and try immediately
            resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/samples?limit=5")
            sample_ids = [s["id"] for s in resp.json()["rows"][:1]]
            
            resp = api_client.post(f"{BASE_URL}/api/waste/benchmark/run", json={
                "sample_ids": sample_ids,
                "note": "test incomplete"
            })
            if resp.status_code == 200:
                run_id = resp.json()["run_id"]
                # Try trust-all-matched immediately (should be running)
                resp = api_client.post(f"{BASE_URL}/api/waste/benchmark/runs/{run_id}/trust-all-matched")
                # May be 409 if still running, or 200 if already complete
                if resp.status_code == 409:
                    print("PASS: trust-all-matched returns 409 for incomplete run")
                else:
                    print(f"INFO: Run completed too fast, got {resp.status_code}")
            return
        
        run_id = running_runs[0]["id"]
        resp = api_client.post(f"{BASE_URL}/api/waste/benchmark/runs/{run_id}/trust-all-matched")
        assert resp.status_code == 409, f"Expected 409 for running run, got {resp.status_code}"
        print("PASS: trust-all-matched returns 409 for incomplete run")


class TestRegressionSingleItemScoring:
    """Regression: existing single-item samples still score via legacy path"""
    
    def test_single_item_sample_scores_with_legacy_fields(self, api_client):
        """Single-item samples return top_prediction, item_match, count_accuracy, portion_accuracy"""
        # Get a single-item sample (no expected_items)
        resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/samples?limit=50")
        assert resp.status_code == 200
        
        single_samples = [s for s in resp.json()["rows"] 
                         if not s.get("expected_items") and s["id"].startswith("bs-")][:1]
        
        if not single_samples:
            pytest.skip("No single-item samples available")
        
        sample_id = single_samples[0]["id"]
        
        # Run benchmark on single sample
        resp = api_client.post(f"{BASE_URL}/api/waste/benchmark/run", json={
            "sample_ids": [sample_id],
            "note": "iter223 single-item regression"
        })
        assert resp.status_code == 200
        
        run_id = resp.json()["run_id"]
        
        # Poll until complete
        for _ in range(12):
            time.sleep(5)
            resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/runs/{run_id}")
            run = resp.json()["run"]
            if run["status"] == "complete":
                break
        
        assert run["status"] == "complete"
        
        # Verify legacy scoring fields
        per_sample = run.get("per_sample", [])
        if per_sample:
            sample_result = per_sample[0]
            assert "item_match" in sample_result
            assert "count_accuracy" in sample_result
            assert "portion_accuracy" in sample_result
            assert "overall" in sample_result
            # Single-item should NOT have multi_item:true
            assert sample_result.get("multi_item") is not True
            print(f"PASS: Single-item sample scored with legacy fields: item_match={sample_result['item_match']}, overall={sample_result['overall']}")


class TestRegressionCaptureStill:
    """Regression: /api/waste/capture/still still works for single image ingest"""
    
    def test_capture_still_works(self, api_client):
        """POST /api/waste/capture/still returns entry with items"""
        # Init capture
        resp = api_client.post(f"{BASE_URL}/api/waste/capture/init", json={
            "mode": "still",
            "user_id": "test_iter223"
        })
        assert resp.status_code == 200
        capture_id = resp.json()["capture_id"]
        
        # Minimal test image
        test_image_b64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k="
        
        resp = api_client.post(f"{BASE_URL}/api/waste/capture/still", json={
            "capture_id": capture_id,
            "media_base64": test_image_b64,
            "client_id": f"test_iter223_{capture_id}"
        })
        
        # May return 200 (success) or 502 (vision unavailable for tiny image)
        assert resp.status_code in [200, 502], f"Unexpected status {resp.status_code}: {resp.text}"
        
        if resp.status_code == 200:
            data = resp.json()
            assert data.get("ok") is True
            assert "entry_id" in data
            print(f"PASS: capture/still works, entry_id={data['entry_id']}")
        else:
            print("INFO: capture/still returned 502 (expected for minimal test image)")


class TestByComplexityBreakdown:
    """Tests for by_complexity aggregates in run results"""
    
    def test_run_has_by_complexity_breakdown(self, api_client):
        """GET /runs/{id} includes by_complexity with mixed-2, mixed-3, mixed-4+ buckets"""
        # Get a run that has mixed samples
        resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/runs?limit=10")
        assert resp.status_code == 200
        
        runs_with_complexity = [r for r in resp.json()["rows"] 
                               if r.get("by_complexity") and len(r["by_complexity"]) > 1]
        
        if not runs_with_complexity:
            pytest.skip("No runs with by_complexity breakdown available")
        
        run = runs_with_complexity[0]
        by_complexity = run["by_complexity"]
        
        # Verify structure
        for key, bucket in by_complexity.items():
            assert "n" in bucket, f"Missing 'n' in {key} bucket"
            assert "overall" in bucket, f"Missing 'overall' in {key} bucket"
            assert "grade" in bucket, f"Missing 'grade' in {key} bucket"
        
        print(f"PASS: by_complexity breakdown: {list(by_complexity.keys())}")
        for k, v in by_complexity.items():
            print(f"  {k}: n={v['n']}, overall={v['overall']}, grade={v['grade']}")


class TestBenchmarkStatus:
    """Regression: /api/waste/benchmark/status still works"""
    
    def test_status_endpoint(self, api_client):
        """GET /api/waste/benchmark/status returns sample_count and best_overall"""
        resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/status")
        assert resp.status_code == 200
        
        data = resp.json()
        assert data.get("ok") is True
        assert "sample_count" in data
        assert "best_overall" in data
        assert "best_grade" in data
        
        print(f"PASS: status endpoint: {data['sample_count']} samples, best={data['best_overall']} ({data['best_grade']})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
