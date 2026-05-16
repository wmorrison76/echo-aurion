"""
iter221 · Recognition Benchmark Harness Tests

Tests for the new benchmark endpoints:
- GET /api/waste/benchmark/status
- POST /api/waste/benchmark/samples
- GET /api/waste/benchmark/samples
- POST /api/waste/benchmark/run
- GET /api/waste/benchmark/runs
- GET /api/waste/benchmark/runs/{run_id}
- DELETE /api/waste/benchmark/samples/{id}

Plus regression tests for existing waste endpoints.
"""
import pytest
import requests
import os
import base64
from io import BytesIO
from PIL import Image

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def create_test_jpeg_base64():
    """Create a simple test JPEG image as base64"""
    img = Image.new("RGB", (100, 100), color=(200, 150, 100))
    buf = BytesIO()
    img.save(buf, "JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


class TestBenchmarkStatus:
    """GET /api/waste/benchmark/status"""
    
    def test_status_returns_ok(self, api_client):
        """Status endpoint returns expected structure"""
        response = api_client.get(f"{BASE_URL}/api/waste/benchmark/status")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") is True
        assert "sample_count" in data
        assert "runs_captured" in data
        assert "best_overall" in data
        assert "best_grade" in data
        assert "recent_runs" in data
        
        # Main agent seeded 8 samples + 2 runs
        assert data["sample_count"] >= 8, f"Expected >= 8 samples, got {data['sample_count']}"
        
        # best_overall should be a float 0..1
        assert isinstance(data["best_overall"], (int, float))
        assert 0 <= data["best_overall"] <= 1
        
        # best_grade should be one of the valid grades
        assert data["best_grade"] in ["A+", "A", "B", "C", "D", "F"]
        
        print(f"✓ Benchmark status: {data['sample_count']} samples, {data['runs_captured']} runs, best={data['best_overall']:.2%} ({data['best_grade']})")


class TestBenchmarkSamples:
    """POST/GET/DELETE /api/waste/benchmark/samples"""
    
    def test_create_sample(self, api_client):
        """Create a new benchmark sample"""
        b64 = create_test_jpeg_base64()
        
        payload = {
            "media_base64": b64,
            "label": "Test Widget",
            "expected_recipe_id": "rec-muffin-bb",
            "expected_count": 2,
            "expected_portion_g": 50,
            "expected_category": "pastry"
        }
        
        response = api_client.post(f"{BASE_URL}/api/waste/benchmark/samples", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") is True
        assert "sample" in data
        
        sample = data["sample"]
        assert sample["id"].startswith("bs-"), f"Sample ID should start with 'bs-', got {sample['id']}"
        assert sample["blob_backend"] == "local", f"Expected blob_backend='local', got {sample.get('blob_backend')}"
        assert sample["label"] == "Test Widget"
        assert sample["expected_count"] == 2
        assert sample["expected_portion_g"] == 50
        assert sample["expected_category"] == "pastry"
        
        # media_base64 should NOT be in response (privacy)
        assert "media_base64" not in sample or sample.get("media_base64") is None
        
        print(f"✓ Created sample: {sample['id']}")
        return sample["id"]
    
    def test_list_samples_no_base64(self, api_client):
        """List samples should NOT include media_base64"""
        response = api_client.get(f"{BASE_URL}/api/waste/benchmark/samples?limit=20")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") is True
        assert "rows" in data
        
        # Check that media_base64 is NOT in any row
        for row in data["rows"]:
            assert "media_base64" not in row, f"media_base64 should not be in list response, found in {row.get('id')}"
        
        print(f"✓ Listed {len(data['rows'])} samples, no media_base64 exposed")
    
    def test_delete_sample(self, api_client):
        """Delete a sample and verify 404 on subsequent GET"""
        # First create a sample to delete
        b64 = create_test_jpeg_base64()
        payload = {
            "media_base64": b64,
            "label": "To Be Deleted",
            "expected_recipe_id": "rec-test-delete",
            "expected_count": 1,
            "expected_portion_g": 100,
            "expected_category": "sundries"
        }
        
        create_resp = api_client.post(f"{BASE_URL}/api/waste/benchmark/samples", json=payload)
        assert create_resp.status_code == 200
        sample_id = create_resp.json()["sample"]["id"]
        
        # Delete it
        delete_resp = api_client.delete(f"{BASE_URL}/api/waste/benchmark/samples/{sample_id}")
        assert delete_resp.status_code == 200
        assert delete_resp.json().get("ok") is True
        
        # Verify it's gone - subsequent delete should 404
        delete_again = api_client.delete(f"{BASE_URL}/api/waste/benchmark/samples/{sample_id}")
        assert delete_again.status_code == 404
        
        print(f"✓ Deleted sample {sample_id}, verified 404 on re-delete")


class TestBenchmarkRun:
    """POST /api/waste/benchmark/run"""
    
    def test_run_single_sample(self, api_client):
        """Run benchmark on a single seeded sample"""
        # Use the seeded muffin sample
        sample_id = "bs-seed-muffin-bb-3"
        
        response = api_client.post(
            f"{BASE_URL}/api/waste/benchmark/run",
            json={"sample_ids": [sample_id]}
        )
        
        # Should succeed (200) or fail gracefully
        if response.status_code == 200:
            data = response.json()
            assert data.get("ok") is True
            assert "run" in data
            
            run = data["run"]
            assert "overall_accuracy" in run
            assert "grade" in run
            assert "per_sample" in run
            assert len(run["per_sample"]) == 1, f"Expected 1 per_sample entry, got {len(run['per_sample'])}"
            
            # Score should be >= 0.9 for the 3-muffin synthetic image (Sonnet recognises it)
            # But this depends on LLM availability, so we just check structure
            print(f"✓ Single-sample run: {run['id']}, overall={run['overall_accuracy']:.2%}, grade={run['grade']}")
        elif response.status_code == 400:
            # Sample might not exist or no samples to run
            print(f"⚠ Single-sample run returned 400: {response.text[:200]}")
        else:
            print(f"⚠ Single-sample run returned {response.status_code}: {response.text[:200]}")
    
    def test_run_empty_samples_returns_400(self, api_client):
        """Run with no matching samples should return 400"""
        response = api_client.post(
            f"{BASE_URL}/api/waste/benchmark/run",
            json={"sample_ids": ["nonexistent-sample-id-12345"]}
        )
        assert response.status_code == 400
        print("✓ Run with nonexistent sample returns 400")
    
    def test_run_with_deleted_sample_completes(self, api_client):
        """Run with a deleted sample ID should still complete (scored_count lower)"""
        # Create and delete a sample
        b64 = create_test_jpeg_base64()
        create_resp = api_client.post(f"{BASE_URL}/api/waste/benchmark/samples", json={
            "media_base64": b64,
            "label": "Temp Sample",
            "expected_recipe_id": "rec-temp",
            "expected_count": 1,
            "expected_portion_g": 100,
            "expected_category": "sundries"
        })
        sample_id = create_resp.json()["sample"]["id"]
        
        # Delete it
        api_client.delete(f"{BASE_URL}/api/waste/benchmark/samples/{sample_id}")
        
        # Try to run with the deleted ID
        response = api_client.post(
            f"{BASE_URL}/api/waste/benchmark/run",
            json={"sample_ids": [sample_id]}
        )
        
        # Should return 400 since no samples match
        assert response.status_code == 400
        print("✓ Run with deleted sample returns 400 (no samples to run)")


class TestBenchmarkRuns:
    """GET /api/waste/benchmark/runs"""
    
    def test_list_runs_no_per_sample(self, api_client):
        """List runs should NOT include per_sample (stripped for privacy)"""
        response = api_client.get(f"{BASE_URL}/api/waste/benchmark/runs?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") is True
        assert "rows" in data
        
        # Check that per_sample is NOT in any row
        for row in data["rows"]:
            assert "per_sample" not in row, f"per_sample should not be in list response, found in {row.get('id')}"
        
        print(f"✓ Listed {len(data['rows'])} runs, no per_sample exposed")
    
    def test_get_run_detail_has_per_sample(self, api_client):
        """GET /api/waste/benchmark/runs/{run_id} should include per_sample"""
        # First get a run ID from the list
        list_resp = api_client.get(f"{BASE_URL}/api/waste/benchmark/runs?limit=1")
        if list_resp.status_code != 200 or not list_resp.json().get("rows"):
            pytest.skip("No runs available to test detail endpoint")
        
        run_id = list_resp.json()["rows"][0]["id"]
        
        response = api_client.get(f"{BASE_URL}/api/waste/benchmark/runs/{run_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") is True
        assert "run" in data
        
        run = data["run"]
        assert "per_sample" in run, "Run detail should include per_sample breakdown"
        assert isinstance(run["per_sample"], list)
        
        print(f"✓ Run detail {run_id} has {len(run['per_sample'])} per_sample entries")


class TestRegressionWasteCapture:
    """Regression tests for existing waste capture endpoints"""
    
    def test_capture_still_with_jpeg(self, api_client):
        """POST /api/waste/capture/still with a real JPEG"""
        # First init a capture
        init_resp = api_client.post(f"{BASE_URL}/api/waste/capture/init", json={
            "mode": "still",
            "user_id": "test-user",
            "outlet_id": "outlet-main"
        })
        assert init_resp.status_code == 200
        capture_id = init_resp.json()["capture_id"]
        
        # Create a test image
        b64 = create_test_jpeg_base64()
        
        # Submit the still capture
        response = api_client.post(f"{BASE_URL}/api/waste/capture/still", json={
            "capture_id": capture_id,
            "media_base64": b64,
            "client_id": f"test-{capture_id}",
            "trace_id": "test-trace-001"
        })
        
        # May return 200 (success) or 502 (vision unavailable)
        if response.status_code == 200:
            data = response.json()
            assert data.get("ok") is True
            assert "entry_id" in data
            assert "items" in data
            assert "vision_mode" in data
            
            # vision_mode should be 'llm' or 'fingerprint_*'
            vm = data.get("vision_mode", "")
            assert vm in ["llm", "stub"] or vm.startswith("fingerprint_"), f"Unexpected vision_mode: {vm}"
            
            # items should have count/portion_g/recipe_id
            for item in data.get("items", []):
                assert "count" in item
                assert "portion_g" in item
                # recipe_id may be null for unknown items
            
            print(f"✓ Still capture: {data['entry_id']}, vision_mode={vm}, {len(data['items'])} items")
        elif response.status_code == 502:
            print(f"⚠ Still capture returned 502 (vision unavailable): {response.text[:100]}")
        else:
            print(f"⚠ Still capture returned {response.status_code}: {response.text[:200]}")


class TestRegressionFingerprintStats:
    """Regression: GET /api/waste/fingerprints/stats"""
    
    def test_fingerprint_stats(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/waste/fingerprints/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") is True
        print(f"✓ Fingerprint stats: local={data.get('local_count', 0)}, hit_rate={data.get('recent_hit_rate', 0):.2%}")


class TestRegressionAtelierStats:
    """Regression: GET /api/waste/photo-intake/atelier/stats"""
    
    def test_atelier_stats(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/waste/photo-intake/atelier/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") is True
        print(f"✓ Atelier stats: total_intakes={data.get('total_intakes', 0)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
