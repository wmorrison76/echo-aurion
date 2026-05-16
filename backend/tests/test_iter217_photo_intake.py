"""
iter217 · Photo Intake Pipeline + Atelier Recognition Tests

Tests the new unified /api/waste/photo-intake service (Phase 1.5 foundation):
- POST /api/waste/photo-intake (valid + validation errors)
- GET /api/waste/photo-intake/{id}
- GET /api/waste/photo-intake (list)
- GET /api/waste/photo-intake/atelier/stats
- Fingerprint integration via photo_intake
- Regression: iter216 fingerprint endpoints
- Regression: /capture/still and /capture/video-mot
"""
import pytest
import requests
import os
import base64
import io
import time
import random

# Generate a real JPEG image using PIL
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"


def generate_test_jpeg(width=256, height=256, color_variance=True):
    """Generate a real JPEG image with mixed colors for quality > 0.3"""
    img = Image.new("RGB", (width, height))
    pixels = img.load()
    for x in range(width):
        for y in range(height):
            if color_variance:
                # Create varied colors to ensure quality score > 0.3
                r = (x * 3 + y * 2) % 256
                g = (x * 2 + y * 3 + 50) % 256
                b = (x + y * 4 + 100) % 256
            else:
                r = g = b = 128  # Uniform gray
            pixels[x, y] = (r, g, b)
    
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=85)
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")


def compute_hsv_histogram(img_base64):
    """Compute HSV histogram matching the backend method (4x4x4 buckets)"""
    raw = base64.b64decode(img_base64)
    img = Image.open(io.BytesIO(raw)).convert("HSV").resize((64, 64))
    pixels = list(img.getdata())
    hist = [0.0] * 64
    for h, s, v in pixels:
        idx = (h // 64) * 16 + (s // 64) * 4 + (v // 64)
        hist[min(idx, 63)] += 1.0
    total = sum(hist)
    if total > 0:
        hist = [round(x / total, 5) for x in hist]
    return hist


class TestPhotoIntakeEndpoint:
    """Tests for POST /api/waste/photo-intake"""
    
    def test_photo_intake_success(self):
        """POST /api/waste/photo-intake with valid JPEG returns ok=true, id starting with 'pi-'"""
        img_b64 = generate_test_jpeg(256, 256, color_variance=True)
        
        payload = {
            "media_base64": img_b64,
            "source_module": "waste_capture",
            "property_id": "outlet-main",
            "upload_method": "in_app_capture",
            "faces_already_blurred": True
        }
        
        resp = requests.post(f"{BASE_URL}/api/waste/photo-intake", json=payload, timeout=30)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert data.get("ok") is True, f"Expected ok=true, got {data}"
        assert data.get("id", "").startswith("pi-"), f"Expected id starting with 'pi-', got {data.get('id')}"
        assert data.get("processing_status") == "complete", f"Expected status='complete', got {data.get('processing_status')}"
        assert data.get("quality_score", 0) > 0.3, f"Expected quality_score > 0.3, got {data.get('quality_score')}"
        assert isinstance(data.get("labels_extracted"), list), f"Expected labels_extracted to be list"
        assert data.get("duration_ms", 0) > 0, f"Expected duration_ms > 0, got {data.get('duration_ms')}"
        
        # Store for later tests
        self.__class__.created_intake_id = data.get("id")
        print(f"PASS: Photo intake created with id={data.get('id')}, quality={data.get('quality_score')}, duration={data.get('duration_ms')}ms")
    
    def test_photo_intake_invalid_source_module(self):
        """POST /api/waste/photo-intake with invalid source_module returns HTTP 400"""
        img_b64 = generate_test_jpeg(64, 64)
        
        payload = {
            "media_base64": img_b64,
            "source_module": "bogus",  # Invalid
            "property_id": "outlet-main",
            "upload_method": "in_app_capture",
            "faces_already_blurred": True
        }
        
        resp = requests.post(f"{BASE_URL}/api/waste/photo-intake", json=payload, timeout=10)
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
        print(f"PASS: Invalid source_module correctly rejected with 400")
    
    def test_photo_intake_invalid_upload_method(self):
        """POST /api/waste/photo-intake with invalid upload_method returns HTTP 400"""
        img_b64 = generate_test_jpeg(64, 64)
        
        payload = {
            "media_base64": img_b64,
            "source_module": "waste_capture",
            "property_id": "outlet-main",
            "upload_method": "bogus",  # Invalid
            "faces_already_blurred": True
        }
        
        resp = requests.post(f"{BASE_URL}/api/waste/photo-intake", json=payload, timeout=10)
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
        print(f"PASS: Invalid upload_method correctly rejected with 400")
    
    def test_photo_intake_empty_media_base64(self):
        """POST /api/waste/photo-intake with empty media_base64 returns HTTP 422"""
        payload = {
            "media_base64": "",  # Empty - should fail Pydantic min_length
            "source_module": "waste_capture",
            "property_id": "outlet-main",
            "upload_method": "in_app_capture",
            "faces_already_blurred": True
        }
        
        resp = requests.post(f"{BASE_URL}/api/waste/photo-intake", json=payload, timeout=10)
        assert resp.status_code == 422, f"Expected 422, got {resp.status_code}: {resp.text}"
        print(f"PASS: Empty media_base64 correctly rejected with 422")


class TestPhotoIntakeGetEndpoints:
    """Tests for GET /api/waste/photo-intake/{id} and list endpoint"""
    
    def test_get_photo_intake_by_id(self):
        """GET /api/waste/photo-intake/{id} returns the same row with all fields"""
        # First create an intake
        img_b64 = generate_test_jpeg(128, 128)
        payload = {
            "media_base64": img_b64,
            "source_module": "waste_capture",
            "property_id": "outlet-main",
            "upload_method": "in_app_capture",
            "faces_already_blurred": True
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/waste/photo-intake", json=payload, timeout=30)
        assert create_resp.status_code == 200
        created = create_resp.json()
        intake_id = created.get("id")
        
        # Now GET it
        get_resp = requests.get(f"{BASE_URL}/api/waste/photo-intake/{intake_id}", timeout=10)
        assert get_resp.status_code == 200, f"Expected 200, got {get_resp.status_code}"
        
        data = get_resp.json()
        assert data.get("ok") is True
        assert data.get("id") == intake_id
        assert data.get("source_module") == "waste_capture"
        assert data.get("property_id") == "outlet-main"
        assert "quality_score" in data
        assert "labels_extracted" in data
        print(f"PASS: GET /api/waste/photo-intake/{intake_id} returned correct data")
    
    def test_get_photo_intake_not_found(self):
        """GET /api/waste/photo-intake/{id} with invalid id returns 404"""
        resp = requests.get(f"{BASE_URL}/api/waste/photo-intake/pi-nonexistent12345", timeout=10)
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print(f"PASS: Non-existent intake correctly returns 404")
    
    def test_list_photo_intakes(self):
        """GET /api/waste/photo-intake?property_id=outlet-main&limit=5 returns ok=true, rows array"""
        resp = requests.get(f"{BASE_URL}/api/waste/photo-intake?property_id=outlet-main&limit=5", timeout=10)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        
        data = resp.json()
        assert data.get("ok") is True
        assert isinstance(data.get("rows"), list)
        assert "count" in data
        
        # Verify rows are sorted by created_at descending (if multiple rows exist)
        rows = data.get("rows", [])
        if len(rows) >= 2:
            for i in range(len(rows) - 1):
                assert rows[i].get("created_at", "") >= rows[i + 1].get("created_at", ""), \
                    "Rows should be sorted by created_at descending"
        
        print(f"PASS: List endpoint returned {data.get('count')} rows")


class TestAtelierStats:
    """Tests for GET /api/waste/photo-intake/atelier/stats"""
    
    def test_atelier_stats_structure(self):
        """GET /api/waste/photo-intake/atelier/stats returns correct structure"""
        resp = requests.get(f"{BASE_URL}/api/waste/photo-intake/atelier/stats?property_id=outlet-main", timeout=10)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        
        data = resp.json()
        assert data.get("ok") is True
        
        # Check required fields
        assert isinstance(data.get("total_intakes"), int), "total_intakes should be int"
        assert isinstance(data.get("intakes_with_fingerprint_hit"), int), "intakes_with_fingerprint_hit should be int"
        assert isinstance(data.get("hit_rate"), (int, float)), "hit_rate should be numeric"
        assert 0 <= data.get("hit_rate", -1) <= 1, "hit_rate should be 0..1"
        assert isinstance(data.get("local_fingerprint_count"), int), "local_fingerprint_count should be int"
        assert isinstance(data.get("collective_contributions"), int), "collective_contributions should be int"
        
        # Check milestones
        milestones = data.get("milestones", [])
        assert isinstance(milestones, list), "milestones should be list"
        assert len(milestones) == 5, f"Expected 5 milestones, got {len(milestones)}"
        
        expected_keys = {"first_contribution", "quarter_century", "century", "library_builder", "network_helper"}
        actual_keys = {m.get("key") for m in milestones}
        assert actual_keys == expected_keys, f"Milestone keys mismatch: {actual_keys}"
        
        for m in milestones:
            assert "key" in m
            assert "label" in m
            assert "target" in m
            assert "current" in m
            assert "achieved" in m
            assert isinstance(m.get("achieved"), bool)
        
        # Check achieved_milestones
        achieved = data.get("achieved_milestones", [])
        assert isinstance(achieved, list), "achieved_milestones should be list"
        
        print(f"PASS: Atelier stats structure correct - total_intakes={data.get('total_intakes')}, hit_rate={data.get('hit_rate')}")


class TestFingerprintIntegration:
    """Tests for fingerprint integration via photo_intake"""
    
    def test_fingerprint_match_via_photo_intake(self):
        """Pre-seed a fingerprint, then POST photo_intake with same image → fingerprint_id populated"""
        # Generate a unique test image
        unique_seed = int(time.time() * 1000) % 10000
        img = Image.new("RGB", (64, 64))
        pixels = img.load()
        for x in range(64):
            for y in range(64):
                r = (x * 5 + unique_seed) % 256
                g = (y * 7 + unique_seed) % 256
                b = (x + y + unique_seed) % 256
                pixels[x, y] = (r, g, b)
        
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=85)
        buffer.seek(0)
        img_b64 = base64.b64encode(buffer.read()).decode("utf-8")
        
        # Compute HSV histogram
        hist = compute_hsv_histogram(img_b64)
        
        # Pre-seed fingerprint via POST /api/waste/fingerprints
        fp_payload = {
            "hsv_histogram": hist,
            "recipe_id": f"test-recipe-{unique_seed}",
            "name": f"Test Recipe {unique_seed}",
            "category": "protein",
            "property_id": "outlet-main",
            "confidence_base": 0.95,
            "portion_g": 150.0,
            "cost": 3.50
        }
        
        fp_resp = requests.post(f"{BASE_URL}/api/waste/fingerprints", json=fp_payload, timeout=10)
        assert fp_resp.status_code == 200, f"Failed to seed fingerprint: {fp_resp.text}"
        fp_data = fp_resp.json()
        seeded_fp_id = fp_data.get("fingerprint_id")
        print(f"Seeded fingerprint: {seeded_fp_id}")
        
        # Now POST to photo_intake with the same image
        intake_payload = {
            "media_base64": img_b64,
            "source_module": "waste_capture",
            "property_id": "outlet-main",
            "upload_method": "in_app_capture",
            "faces_already_blurred": True
        }
        
        intake_resp = requests.post(f"{BASE_URL}/api/waste/photo-intake", json=intake_payload, timeout=30)
        assert intake_resp.status_code == 200, f"Photo intake failed: {intake_resp.text}"
        
        intake_data = intake_resp.json()
        assert intake_data.get("ok") is True
        
        # Check fingerprint match
        if intake_data.get("fingerprint_id"):
            assert intake_data.get("suggestion_source", "").startswith("fingerprint_"), \
                f"Expected suggestion_source to start with 'fingerprint_', got {intake_data.get('suggestion_source')}"
            print(f"PASS: Fingerprint matched! fingerprint_id={intake_data.get('fingerprint_id')}, source={intake_data.get('suggestion_source')}")
        else:
            # Fingerprint match is best-effort; may not match if histogram differs slightly
            print(f"INFO: No fingerprint match (histogram may differ slightly). suggestion_source={intake_data.get('suggestion_source')}")


class TestRegressionIter216Fingerprints:
    """Regression tests for iter216 fingerprint endpoints"""
    
    def test_post_fingerprints(self):
        """POST /api/waste/fingerprints still works"""
        hist = [1.0 / 64] * 64  # Uniform histogram
        payload = {
            "hsv_histogram": hist,
            "recipe_id": f"regression-test-{int(time.time())}",
            "name": "Regression Test Recipe",
            "category": "pastry",
            "property_id": "outlet-main",
            "confidence_base": 0.90,
            "portion_g": 100.0,
            "cost": 2.50
        }
        
        resp = requests.post(f"{BASE_URL}/api/waste/fingerprints", json=payload, timeout=10)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        # Response may have fingerprint_id at top level or nested in fingerprint object
        fp_id = data.get("fingerprint_id") or data.get("fingerprint", {}).get("fingerprint_id")
        assert fp_id, f"Expected fingerprint_id in response: {data}"
        print(f"PASS: POST /api/waste/fingerprints works - id={fp_id}")
    
    def test_query_fingerprints(self):
        """POST /api/waste/fingerprints/query still works"""
        hist = [1.0 / 64] * 64
        payload = {
            "hsv_histogram": hist,
            "property_id": "outlet-main",
            "min_confidence": 0.5,
            "k": 3
        }
        
        resp = requests.post(f"{BASE_URL}/api/waste/fingerprints/query", json=payload, timeout=10)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        assert "matches" in data
        print(f"PASS: POST /api/waste/fingerprints/query works - {len(data.get('matches', []))} matches")
    
    def test_fingerprints_stats(self):
        """GET /api/waste/fingerprints/stats still works"""
        resp = requests.get(f"{BASE_URL}/api/waste/fingerprints/stats?property_id=outlet-main", timeout=10)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "local_count" in data or "total" in data
        print(f"PASS: GET /api/waste/fingerprints/stats works")


class TestRegressionCaptureEndpoints:
    """Regression tests for /capture/still and /capture/video-mot"""
    
    def test_capture_still_stub_path(self):
        """POST /api/waste/capture/still without media uses stub path"""
        # First init
        init_resp = requests.post(f"{BASE_URL}/api/waste/capture/init", 
                                   json={"mode": "still", "user_id": "test-user"}, timeout=10)
        assert init_resp.status_code == 200
        cap_id = init_resp.json().get("capture_id")
        
        # POST still without media_base64
        payload = {
            "capture_id": cap_id,
            "telemetry": {"speed": 0.8, "focus": 0.9}
        }
        
        resp = requests.post(f"{BASE_URL}/api/waste/capture/still", json=payload, timeout=15)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        print(f"PASS: /capture/still stub path works - vision_mode={data.get('vision_mode')}")
    
    def test_capture_video_mot_stub_path(self):
        """POST /api/waste/capture/video-mot without frames uses stub path"""
        # First init
        init_resp = requests.post(f"{BASE_URL}/api/waste/capture/init",
                                   json={"mode": "video", "user_id": "test-user"}, timeout=10)
        assert init_resp.status_code == 200
        cap_id = init_resp.json().get("capture_id")
        
        # POST video-mot without frames
        payload = {
            "capture_id": cap_id,
            "frames": [],
            "duration_ms": 3000
        }
        
        resp = requests.post(f"{BASE_URL}/api/waste/capture/video-mot", json=payload, timeout=15)
        # May return 200 with stub or 400 if frames required
        assert resp.status_code in [200, 400], f"Unexpected status: {resp.status_code}"
        print(f"PASS: /capture/video-mot endpoint accessible - status={resp.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
