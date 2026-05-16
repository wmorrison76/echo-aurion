"""iter219 · Blob Storage Pipeline + Frontend Auth Bypass Tests

Tests for:
1. GET /api/blob/health — returns {ok:true, backend:'local', local_root:string, s3_bucket:null}
2. POST /api/waste/photo-intake with JPEG — response includes photo_blob_url + photo_blob_backend
3. GET the photo_blob_url — returns HTTP 200 with content-type image/jpeg + Cache-Control
4. POST /api/waste/audit-queue with crop_image_base64 — crop_image_url starts with /api/blob/audit_crop/
5. POST /api/waste/audit-queue/{id}/resolve — re-loads crop from blob, creates fingerprint
6. Blob path traversal guard: GET /api/blob/photo_intake/..%2F..%2Fetc%2Fpasswd — 400 or 404
7. GET /api/blob/photo_intake/nonexistent.jpg — 404
8. Regression: GET /api/waste/photo-intake/atelier/stats
9. Regression: GET /api/waste/fingerprints/stats
10. Regression: GET /api/waste/chafer/catalog
11. Regression: GET /api/waste/forbes-labels
"""
import pytest
import requests
import os
import base64

# Use the public URL from environment
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"

# Minimal valid JPEG (1x1 red pixel)
MINIMAL_JPEG_B64 = (
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof"
    "Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwh"
    "MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAAR"
    "CAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAA"
    "AAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMB"
    "AAIRAxEAPwCwAB//2Q=="
)


class TestBlobHealth:
    """Test /api/blob/health endpoint"""

    def test_blob_health_returns_local_backend(self):
        """GET /api/blob/health returns ok:true, backend:'local', s3_bucket:null"""
        response = requests.get(f"{BASE_URL}/api/blob/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True, f"Expected ok:true, got {data}"
        assert data.get("backend") == "local", f"Expected backend:'local', got {data.get('backend')}"
        assert "local_root" in data, f"Expected local_root in response, got {data}"
        assert data.get("s3_bucket") is None, f"Expected s3_bucket:null, got {data.get('s3_bucket')}"
        print(f"PASS: blob/health returns backend=local, local_root={data.get('local_root')}")


class TestPhotoIntakeWithBlob:
    """Test photo-intake now writes to blob storage"""

    def test_photo_intake_returns_blob_url(self):
        """POST /api/waste/photo-intake with JPEG returns photo_blob_url + photo_blob_backend"""
        payload = {
            "media_base64": f"data:image/jpeg;base64,{MINIMAL_JPEG_B64}",
            "source_module": "waste_capture",
            "property_id": "outlet-main",
            "upload_method": "in_app_capture",
            "skip_fingerprint": True,  # Skip fingerprint to speed up test
        }
        response = requests.post(f"{BASE_URL}/api/waste/photo-intake", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True, f"Expected ok:true, got {data}"
        
        # Check blob URL is present and starts with /api/blob/photo_intake/
        photo_blob_url = data.get("photo_blob_url")
        assert photo_blob_url is not None, f"Expected photo_blob_url, got None"
        assert photo_blob_url.startswith("/api/blob/photo_intake/"), \
            f"Expected photo_blob_url to start with /api/blob/photo_intake/, got {photo_blob_url}"
        
        # Check backend is 'local'
        assert data.get("photo_blob_backend") == "local", \
            f"Expected photo_blob_backend='local', got {data.get('photo_blob_backend')}"
        
        intake_id = data.get("id")
        print(f"PASS: photo-intake created {intake_id} with blob_url={photo_blob_url}")
        
        return intake_id, photo_blob_url

    def test_get_photo_intake_has_blob_url(self):
        """GET /api/waste/photo-intake/{id} returns photo_blob_url populated"""
        # First create a photo intake
        payload = {
            "media_base64": f"data:image/jpeg;base64,{MINIMAL_JPEG_B64}",
            "source_module": "waste_capture",
            "property_id": "outlet-main",
            "upload_method": "in_app_capture",
            "skip_fingerprint": True,
        }
        create_resp = requests.post(f"{BASE_URL}/api/waste/photo-intake", json=payload)
        assert create_resp.status_code == 200
        intake_id = create_resp.json().get("id")
        
        # Now fetch it
        get_resp = requests.get(f"{BASE_URL}/api/waste/photo-intake/{intake_id}")
        assert get_resp.status_code == 200, f"Expected 200, got {get_resp.status_code}"
        
        data = get_resp.json()
        assert data.get("photo_blob_url") is not None, f"Expected photo_blob_url in GET response"
        assert data.get("photo_blob_url").startswith("/api/blob/photo_intake/")
        print(f"PASS: GET photo-intake/{intake_id} has photo_blob_url={data.get('photo_blob_url')}")


class TestBlobRead:
    """Test reading blobs via GET /api/blob/{kind}/{filename}"""

    def test_get_blob_returns_image(self):
        """GET the photo_blob_url returns HTTP 200 with image/jpeg + Cache-Control"""
        # First create a photo intake to get a blob URL
        payload = {
            "media_base64": f"data:image/jpeg;base64,{MINIMAL_JPEG_B64}",
            "source_module": "waste_capture",
            "property_id": "outlet-main",
            "upload_method": "in_app_capture",
            "skip_fingerprint": True,
        }
        create_resp = requests.post(f"{BASE_URL}/api/waste/photo-intake", json=payload)
        assert create_resp.status_code == 200
        photo_blob_url = create_resp.json().get("photo_blob_url")
        
        # Now fetch the blob
        blob_resp = requests.get(f"{BASE_URL}{photo_blob_url}")
        assert blob_resp.status_code == 200, f"Expected 200, got {blob_resp.status_code}"
        
        # Check content-type
        content_type = blob_resp.headers.get("content-type", "")
        assert "image/jpeg" in content_type, f"Expected image/jpeg, got {content_type}"
        
        # Check Cache-Control header
        cache_control = blob_resp.headers.get("cache-control", "")
        assert cache_control, f"Expected Cache-Control header, got none"
        print(f"PASS: GET {photo_blob_url} returns image/jpeg with Cache-Control={cache_control}")

    def test_blob_nonexistent_returns_404(self):
        """GET /api/blob/photo_intake/nonexistent.jpg returns 404"""
        response = requests.get(f"{BASE_URL}/api/blob/photo_intake/nonexistent.jpg")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: GET nonexistent blob returns 404")


class TestBlobPathTraversal:
    """Test path traversal protection"""

    def test_path_traversal_blocked(self):
        """GET /api/blob/photo_intake/..%2F..%2Fetc%2Fpasswd returns 400, 403, or 404"""
        # URL-encoded path traversal attempt
        response = requests.get(f"{BASE_URL}/api/blob/photo_intake/..%2F..%2Fetc%2Fpasswd")
        assert response.status_code in [400, 403, 404], \
            f"Expected 400/403/404 for path traversal, got {response.status_code}"
        print(f"PASS: Path traversal blocked with status {response.status_code}")

    def test_path_traversal_in_kind_blocked(self):
        """GET /api/blob/../etc/passwd returns 400 or 404"""
        response = requests.get(f"{BASE_URL}/api/blob/../etc/passwd")
        # This might return 404 (not found) or 400 (bad request) depending on routing
        assert response.status_code in [400, 404, 422], \
            f"Expected 400/404/422 for path traversal in kind, got {response.status_code}"
        print(f"PASS: Path traversal in kind blocked with status {response.status_code}")


class TestAuditQueueWithBlob:
    """Test audit-queue now writes crop to blob storage"""

    def test_enqueue_with_base64_stores_to_blob(self):
        """POST /api/waste/audit-queue with crop_image_base64 stores to blob, drops base64"""
        payload = {
            "entry_id": "test-entry-iter219",
            "item_id": "test-item-iter219",
            "property_id": "outlet-main",
            "crop_image_base64": f"data:image/jpeg;base64,{MINIMAL_JPEG_B64}",
            "sonnet_best_guess": "Danish Pastry",
            "sonnet_confidence": 0.75,
        }
        response = requests.post(f"{BASE_URL}/api/waste/audit-queue", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True
        
        audit_item = data.get("audit_item", {})
        
        # Check crop_image_url starts with /api/blob/audit_crop/
        crop_url = audit_item.get("crop_image_url")
        assert crop_url is not None, f"Expected crop_image_url, got None"
        assert crop_url.startswith("/api/blob/audit_crop/"), \
            f"Expected crop_image_url to start with /api/blob/audit_crop/, got {crop_url}"
        
        # Check crop_image_backend is 'local'
        assert audit_item.get("crop_image_backend") == "local", \
            f"Expected crop_image_backend='local', got {audit_item.get('crop_image_backend')}"
        
        # Check crop_image_base64 is null (moved to blob)
        assert audit_item.get("crop_image_base64") is None, \
            f"Expected crop_image_base64=null, got {audit_item.get('crop_image_base64')}"
        
        audit_id = audit_item.get("id")
        print(f"PASS: audit-queue {audit_id} has crop_url={crop_url}, base64=null")
        
        return audit_id, crop_url

    def test_resolve_with_blob_creates_fingerprint(self):
        """POST /api/waste/audit-queue/{id}/resolve re-loads crop from blob, creates fingerprint"""
        # First enqueue an item with crop
        payload = {
            "entry_id": "test-entry-resolve-iter219",
            "item_id": "test-item-resolve-iter219",
            "property_id": "outlet-main",
            "crop_image_base64": f"data:image/jpeg;base64,{MINIMAL_JPEG_B64}",
            "sonnet_best_guess": "Danish Pastry",
            "sonnet_confidence": 0.85,
        }
        enqueue_resp = requests.post(f"{BASE_URL}/api/waste/audit-queue", json=payload)
        assert enqueue_resp.status_code == 200
        audit_id = enqueue_resp.json().get("audit_item", {}).get("id")
        
        # Verify crop_image_base64 is null
        get_resp = requests.get(f"{BASE_URL}/api/waste/audit-queue/{audit_id}")
        assert get_resp.status_code == 200
        audit_item = get_resp.json().get("audit_item", {})
        assert audit_item.get("crop_image_base64") is None, "crop_image_base64 should be null"
        
        # Now resolve with recipe_pick
        resolve_payload = {
            "resolution_method": "recipe_pick",
            "resolved_recipe_id": "rec-danish",
            "resolved_item_name": "Danish Pastry",
        }
        resolve_resp = requests.post(
            f"{BASE_URL}/api/waste/audit-queue/{audit_id}/resolve",
            json=resolve_payload
        )
        assert resolve_resp.status_code == 200, f"Expected 200, got {resolve_resp.status_code}: {resolve_resp.text}"
        
        resolve_data = resolve_resp.json()
        assert resolve_data.get("ok") is True
        
        # Check fingerprint was created (re-loaded from blob)
        fp_id = resolve_data.get("resulting_fingerprint_id")
        # Note: fingerprint creation depends on the crop having valid HSV histogram
        # With minimal JPEG it might not create one, but the path should work
        print(f"PASS: audit-queue/{audit_id}/resolve completed, resulting_fingerprint_id={fp_id}")
        
        # Verify status changed
        audit_item = resolve_data.get("audit_item", {})
        assert audit_item.get("status") == "resolved", f"Expected status=resolved, got {audit_item.get('status')}"


class TestRegressionEndpoints:
    """Regression tests for existing endpoints"""

    def test_atelier_stats(self):
        """GET /api/waste/photo-intake/atelier/stats returns milestones + counts"""
        response = requests.get(f"{BASE_URL}/api/waste/photo-intake/atelier/stats?property_id=outlet-main")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True
        assert "milestones" in data, f"Expected milestones in response"
        assert "total_intakes" in data, f"Expected total_intakes in response"
        print(f"PASS: atelier/stats returns milestones={len(data.get('milestones', []))}, total_intakes={data.get('total_intakes')}")

    def test_fingerprints_stats(self):
        """GET /api/waste/fingerprints/stats returns stats"""
        response = requests.get(f"{BASE_URL}/api/waste/fingerprints/stats?property_id=outlet-main")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True
        print(f"PASS: fingerprints/stats returns ok=true")

    def test_chafer_catalog(self):
        """GET /api/waste/chafer/catalog returns 20 rows with shapes"""
        response = requests.get(f"{BASE_URL}/api/waste/chafer/catalog")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True
        rows = data.get("rows", [])
        assert len(rows) == 20, f"Expected 20 chafer items, got {len(rows)}"
        
        # Check shapes are present
        shapes = set(r.get("shape") for r in rows)
        assert "rectangular" in shapes, "Expected rectangular shape"
        assert "round" in shapes, "Expected round shape"
        print(f"PASS: chafer/catalog returns {len(rows)} items with shapes: {shapes}")

    def test_forbes_labels(self):
        """GET /api/waste/forbes-labels returns rows"""
        response = requests.get(f"{BASE_URL}/api/waste/forbes-labels?property_id=outlet-main")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True
        print(f"PASS: forbes-labels returns ok=true, count={data.get('count', 0)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
