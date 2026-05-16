"""
iter222 Backend Tests - Benchmark Harness Enhancements

Tests:
1. POST /api/waste/benchmark/import-url - Import image from URL
2. POST /api/waste/benchmark/import-url - Invalid URL (400)
3. POST /api/waste/benchmark/import-url - Non-image URL (415)
4. PATCH /api/waste/benchmark/samples/{id} - Update ground truth
5. PATCH /api/waste/benchmark/samples/{id} - Empty body (400)
6. POST /api/waste/benchmark/run - Async run (returns immediately with status='running')
7. POST /api/waste/benchmark/run - Nonexistent samples (400)
8. GET /api/waste/benchmark/runs/{id} - Poll for completion
9. GET /api/waste/benchmark/samples - Verify sample count >= 20
10. Regression: GET /samples, DELETE /samples/{id}, GET /runs, GET /status
11. Regression: POST /api/waste/capture/still
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBenchmarkImportURL:
    """iter222: Import benchmark samples from web URLs"""
    
    def test_import_valid_url(self):
        """Import a real food image from TheMealDB"""
        response = requests.post(f"{BASE_URL}/api/waste/benchmark/import-url", json={
            "url": "https://www.themealdb.com/images/media/meals/wtsvxx1511296896.jpg",
            "label": "Test Imported Muffin",
            "expected_recipe_id": "rec-muffin-bb",
            "expected_count": 1,
            "expected_portion_g": 95,
            "expected_category": "pastry"
        })
        print(f"Import URL response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, f"Expected ok=true: {data}"
        assert "sample" in data, f"Expected sample in response: {data}"
        
        sample = data["sample"]
        assert sample["id"].startswith("bs-"), f"Sample ID should start with 'bs-': {sample['id']}"
        assert sample.get("blob_backend") == "local", f"Expected blob_backend='local': {sample}"
        assert sample["label"] == "Test Imported Muffin"
        assert sample["expected_count"] == 1
        assert sample["expected_portion_g"] == 95
        print(f"✓ Import URL success: {sample['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/waste/benchmark/samples/{sample['id']}")
    
    def test_import_invalid_url(self):
        """Import from invalid URL should return 400"""
        response = requests.post(f"{BASE_URL}/api/waste/benchmark/import-url", json={
            "url": "https://example.invalid/not-real.jpg",
            "label": "Invalid URL Test",
            "expected_count": 1,
            "expected_portion_g": 100
        })
        print(f"Invalid URL response: {response.status_code}")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✓ Invalid URL correctly returns 400")
    
    def test_import_non_image_url(self):
        """Import from non-image URL should return 415"""
        response = requests.post(f"{BASE_URL}/api/waste/benchmark/import-url", json={
            "url": "https://www.themealdb.com/api/json/v1/1/search.php?s=muffin",
            "label": "Non-image URL Test",
            "expected_count": 1,
            "expected_portion_g": 100
        })
        print(f"Non-image URL response: {response.status_code}")
        assert response.status_code == 415, f"Expected 415, got {response.status_code}: {response.text}"
        print("✓ Non-image URL correctly returns 415")


class TestBenchmarkPatchSample:
    """iter222: PATCH /samples/{id} for Trust button"""
    
    @pytest.fixture
    def sample_id(self):
        """Create a sample for testing"""
        # First get existing samples
        resp = requests.get(f"{BASE_URL}/api/waste/benchmark/samples?limit=1")
        if resp.status_code == 200 and resp.json().get("rows"):
            return resp.json()["rows"][0]["id"]
        pytest.skip("No samples available for PATCH test")
    
    def test_patch_sample_success(self, sample_id):
        """PATCH sample with new ground truth values"""
        response = requests.patch(f"{BASE_URL}/api/waste/benchmark/samples/{sample_id}", json={
            "expected_count": 5,
            "expected_portion_g": 120
        })
        print(f"PATCH sample response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, f"Expected ok=true: {data}"
        assert "sample" in data, f"Expected sample in response: {data}"
        
        sample = data["sample"]
        assert sample["expected_count"] == 5, f"Expected count=5: {sample}"
        assert sample["expected_portion_g"] == 120, f"Expected portion_g=120: {sample}"
        print(f"✓ PATCH sample success: count={sample['expected_count']}, portion_g={sample['expected_portion_g']}")
    
    def test_patch_sample_empty_body(self, sample_id):
        """PATCH with empty body should return 400"""
        response = requests.patch(f"{BASE_URL}/api/waste/benchmark/samples/{sample_id}", json={})
        print(f"PATCH empty body response: {response.status_code}")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✓ PATCH empty body correctly returns 400")
    
    def test_patch_sample_not_found(self):
        """PATCH nonexistent sample should return 404"""
        response = requests.patch(f"{BASE_URL}/api/waste/benchmark/samples/nonexistent-sample-id", json={
            "expected_count": 1
        })
        print(f"PATCH nonexistent response: {response.status_code}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ PATCH nonexistent sample correctly returns 404")


class TestBenchmarkAsyncRun:
    """iter222: Async benchmark run with background processing"""
    
    def test_run_returns_immediately(self):
        """POST /run should return immediately with status='running'"""
        response = requests.post(f"{BASE_URL}/api/waste/benchmark/run", json={
            "note": "iter222 async test"
        })
        print(f"Run response: {response.status_code}")
        
        # Should return 200 immediately (not timeout)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, f"Expected ok=true: {data}"
        assert "run_id" in data, f"Expected run_id in response: {data}"
        assert data.get("status") == "running", f"Expected status='running': {data}"
        assert "sample_count" in data, f"Expected sample_count in response: {data}"
        
        run_id = data["run_id"]
        print(f"✓ Run started immediately: {run_id}, status={data['status']}, samples={data['sample_count']}")
        
        # Poll for completion (up to 180s)
        max_polls = 60
        poll_interval = 3
        completed = False
        
        for i in range(max_polls):
            time.sleep(poll_interval)
            poll_resp = requests.get(f"{BASE_URL}/api/waste/benchmark/runs/{run_id}")
            if poll_resp.status_code != 200:
                continue
            
            run_data = poll_resp.json()
            if not run_data.get("ok"):
                continue
            
            run = run_data.get("run", {})
            status = run.get("status")
            scored = run.get("scored_count", 0)
            total = run.get("sample_count", 0)
            
            print(f"  Poll {i+1}: status={status}, scored={scored}/{total}")
            
            if status == "complete":
                completed = True
                assert "overall_accuracy" in run, f"Expected overall_accuracy: {run}"
                assert "grade" in run, f"Expected grade: {run}"
                assert "per_sample" in run, f"Expected per_sample: {run}"
                print(f"✓ Run completed: accuracy={run['overall_accuracy']}, grade={run['grade']}")
                break
        
        assert completed, f"Run did not complete within {max_polls * poll_interval}s"
    
    def test_run_nonexistent_samples(self):
        """POST /run with nonexistent sample_ids should return 400"""
        response = requests.post(f"{BASE_URL}/api/waste/benchmark/run", json={
            "sample_ids": ["nonexistent-sample-1", "nonexistent-sample-2"]
        })
        print(f"Run nonexistent samples response: {response.status_code}")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✓ Run with nonexistent samples correctly returns 400")


class TestBenchmarkSampleCount:
    """iter222: Verify sample count >= 20 (8 seed + 13 web imports)"""
    
    def test_sample_count_at_least_20(self):
        """GET /samples should return at least 20 samples"""
        response = requests.get(f"{BASE_URL}/api/waste/benchmark/samples?limit=200")
        print(f"Samples response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, f"Expected ok=true: {data}"
        
        count = data.get("count", 0)
        rows = data.get("rows", [])
        print(f"Sample count: {count}, rows returned: {len(rows)}")
        
        # Main agent imported 13 real food photos + 8 seed = 21 minimum
        assert count >= 20, f"Expected at least 20 samples, got {count}"
        print(f"✓ Sample count verified: {count} >= 20")


class TestBenchmarkRegression:
    """Regression tests for existing benchmark endpoints"""
    
    def test_get_status(self):
        """GET /status should return benchmark status"""
        response = requests.get(f"{BASE_URL}/api/waste/benchmark/status")
        print(f"Status response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        assert "sample_count" in data
        assert "runs_captured" in data
        assert "best_overall" in data
        assert "best_grade" in data
        print(f"✓ Status: samples={data['sample_count']}, runs={data['runs_captured']}, best={data['best_overall']}")
    
    def test_get_samples(self):
        """GET /samples should return sample list"""
        response = requests.get(f"{BASE_URL}/api/waste/benchmark/samples?limit=10")
        print(f"Samples response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") == True
        assert "rows" in data
        assert "count" in data
        
        # Verify media_base64 is NOT in list response
        for row in data.get("rows", []):
            assert "media_base64" not in row, "media_base64 should not be in list response"
        print(f"✓ Samples list: {data['count']} samples, no media_base64 in response")
    
    def test_get_runs(self):
        """GET /runs should return run list"""
        response = requests.get(f"{BASE_URL}/api/waste/benchmark/runs?limit=10")
        print(f"Runs response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") == True
        assert "rows" in data
        assert "count" in data
        
        # Verify per_sample is NOT in list response
        for row in data.get("rows", []):
            assert "per_sample" not in row, "per_sample should not be in list response"
        print(f"✓ Runs list: {data['count']} runs, no per_sample in response")
    
    def test_delete_sample(self):
        """DELETE /samples/{id} should work"""
        # First create a sample to delete
        import base64
        # Create a minimal valid JPEG
        jpeg_bytes = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
            0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
            0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
            0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
            0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
            0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
            0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
            0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
            0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
            0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
            0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
            0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
            0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
            0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
            0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
            0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
            0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
            0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
            0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
            0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5, 0xDB, 0x20, 0xA8, 0xA8, 0xA8, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0xFF, 0xD9
        ])
        b64 = base64.b64encode(jpeg_bytes).decode()
        
        create_resp = requests.post(f"{BASE_URL}/api/waste/benchmark/samples", json={
            "media_base64": b64,
            "label": "TEST_DELETE_SAMPLE",
            "expected_count": 1,
            "expected_portion_g": 100
        })
        
        if create_resp.status_code != 200:
            pytest.skip(f"Could not create sample for delete test: {create_resp.text}")
        
        sample_id = create_resp.json()["sample"]["id"]
        
        # Delete the sample
        delete_resp = requests.delete(f"{BASE_URL}/api/waste/benchmark/samples/{sample_id}")
        print(f"Delete response: {delete_resp.status_code}")
        assert delete_resp.status_code == 200, f"Expected 200, got {delete_resp.status_code}"
        
        # Verify it's gone
        delete_again = requests.delete(f"{BASE_URL}/api/waste/benchmark/samples/{sample_id}")
        assert delete_again.status_code == 404, f"Expected 404 on second delete, got {delete_again.status_code}"
        print("✓ Delete sample works correctly")


class TestCaptureStillRegression:
    """Regression: POST /api/waste/capture/still should still work"""
    
    def test_capture_still(self):
        """POST /api/waste/capture/still should work"""
        # Init capture
        init_resp = requests.post(f"{BASE_URL}/api/waste/capture/init", json={
            "mode": "still",
            "user_id": "test-iter222"
        })
        
        if init_resp.status_code != 200:
            pytest.skip(f"Could not init capture: {init_resp.text}")
        
        capture_id = init_resp.json().get("capture_id")
        
        # Capture still (without image - should use stub)
        capture_resp = requests.post(f"{BASE_URL}/api/waste/capture/still", json={
            "capture_id": capture_id,
            "telemetry": {"test": True}
        })
        
        print(f"Capture still response: {capture_resp.status_code}")
        assert capture_resp.status_code == 200, f"Expected 200, got {capture_resp.status_code}: {capture_resp.text}"
        
        data = capture_resp.json()
        assert data.get("ok") == True
        assert "entry_id" in data
        assert "items" in data
        print(f"✓ Capture still works: entry_id={data['entry_id']}, items={len(data.get('items', []))}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
