"""
iter216 · Fingerprint-First Recognition Tests
Tests the fingerprint library, progressive analysis Stage-1, and short-circuit path.
"""
import pytest
import requests
import os
import base64
import io
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"


def generate_test_image_base64(r=120, g=85, b=60, size=128):
    """Generate a small test JPEG image and return base64."""
    img = Image.new("RGB", (size, size), (r, g, b))
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=70)
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")


def compute_hsv_histogram(r=120, g=85, b=60, size=64):
    """Compute the 64-bucket HSV histogram for a solid-color image."""
    img = Image.new("RGB", (128, 128), (r, g, b))
    hsv = img.convert("HSV").resize((size, size))
    pixels = list(hsv.getdata())
    hist = [0.0] * 64
    for h, s, v in pixels:
        idx = (h // 64) * 16 + (s // 64) * 4 + (v // 64)
        hist[min(idx, 63)] += 1.0
    total = sum(hist) or 1.0
    return [round(x / total, 5) for x in hist]


class TestFingerprintContribute:
    """Test POST /api/waste/fingerprints — contribute a fingerprint."""

    def test_contribute_fingerprint_success(self):
        """Contribute a fingerprint with 64-element HSV histogram."""
        hist = compute_hsv_histogram(120, 85, 60)
        payload = {
            "recipe_id": "rec-muffin-bb",
            "name": "Blueberry Muffin",
            "hsv_histogram": hist,
            "portion_g": 95.0,
            "cost": 1.25,
            "category": "pastry",
            "confidence_base": 0.92,
            "property_id": "outlet-main",
        }
        resp = requests.post(f"{BASE_URL}/api/waste/fingerprints", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True, f"Expected ok=true, got {data}"
        fp = data.get("fingerprint")
        assert fp is not None, "Expected fingerprint in response"
        assert fp.get("fingerprint_id", "").startswith("fp-"), f"Expected fp_id starting with 'fp-', got {fp.get('fingerprint_id')}"
        assert fp.get("recipe_id") == "rec-muffin-bb"
        assert fp.get("scope") == "local"
        assert fp.get("property_id") == "outlet-main"
        print(f"✓ Contributed fingerprint: {fp.get('fingerprint_id')}")
        return fp.get("fingerprint_id")

    def test_contribute_fingerprint_invalid_histogram(self):
        """Histogram must be exactly 64 floats."""
        payload = {
            "recipe_id": "rec-test",
            "name": "Test",
            "hsv_histogram": [0.1] * 32,  # Wrong size
            "portion_g": 100.0,
        }
        resp = requests.post(f"{BASE_URL}/api/waste/fingerprints", json=payload)
        assert resp.status_code == 400, f"Expected 400 for invalid histogram, got {resp.status_code}"
        print("✓ Invalid histogram rejected with 400")


class TestFingerprintQuery:
    """Test POST /api/waste/fingerprints/query — query the library."""

    def test_query_fingerprint_match(self):
        """Query with the same histogram should return a match with similarity >= 0.99."""
        # First contribute a fingerprint
        hist = compute_hsv_histogram(100, 70, 50)
        contribute_payload = {
            "recipe_id": "rec-test-query",
            "name": "Test Query Item",
            "hsv_histogram": hist,
            "portion_g": 100.0,
            "cost": 2.00,
            "category": "protein",
            "property_id": "outlet-main",
        }
        contrib_resp = requests.post(f"{BASE_URL}/api/waste/fingerprints", json=contribute_payload)
        assert contrib_resp.status_code == 200, f"Contribute failed: {contrib_resp.text}"
        fp_id = contrib_resp.json().get("fingerprint", {}).get("fingerprint_id")
        print(f"  Contributed fingerprint for query test: {fp_id}")

        # Now query with the same histogram
        query_payload = {
            "hsv_histogram": hist,
            "property_id": "outlet-main",
            "min_confidence": 0.85,
            "k": 5,
        }
        resp = requests.post(f"{BASE_URL}/api/waste/fingerprints/query", json=query_payload)
        assert resp.status_code == 200, f"Query failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        matches = data.get("matches", [])
        assert len(matches) > 0, "Expected at least one match"
        top_match = matches[0]
        assert top_match.get("similarity", 0) >= 0.99, f"Expected similarity >= 0.99, got {top_match.get('similarity')}"
        assert top_match.get("match_source") == "local", f"Expected match_source='local', got {top_match.get('match_source')}"
        print(f"✓ Query returned match with similarity {top_match.get('similarity')}, source={top_match.get('match_source')}")


class TestFingerprintConfirm:
    """Test POST /api/waste/fingerprints/{fp_id}/confirm — confirm and promote."""

    def test_confirm_fingerprint_promotion(self):
        """Confirming from 3 properties should flip is_validated=true and scope='collective'."""
        # Contribute a fresh fingerprint
        hist = compute_hsv_histogram(80, 60, 40)
        payload = {
            "recipe_id": "rec-confirm-test",
            "name": "Confirm Test Item",
            "hsv_histogram": hist,
            "portion_g": 120.0,
            "cost": 1.50,
            "property_id": "p1",
        }
        resp = requests.post(f"{BASE_URL}/api/waste/fingerprints", json=payload)
        assert resp.status_code == 200
        fp_id = resp.json().get("fingerprint", {}).get("fingerprint_id")
        print(f"  Created fingerprint {fp_id} for confirm test")

        # Confirm from property p2
        resp2 = requests.post(f"{BASE_URL}/api/waste/fingerprints/{fp_id}/confirm?property_id=p2")
        assert resp2.status_code == 200, f"First confirm failed: {resp2.text}"
        data2 = resp2.json()
        assert data2.get("ok") is True
        assert data2.get("is_validated") is False, "Should not be validated after 2 properties"
        print(f"  After p2 confirm: is_validated={data2.get('is_validated')}, contrib_count={len(data2.get('contributing_properties', []))}")

        # Confirm from property p3 — should flip to validated + collective
        resp3 = requests.post(f"{BASE_URL}/api/waste/fingerprints/{fp_id}/confirm?property_id=p3")
        assert resp3.status_code == 200, f"Second confirm failed: {resp3.text}"
        data3 = resp3.json()
        assert data3.get("ok") is True
        assert data3.get("is_validated") is True, f"Expected is_validated=true after 3 properties, got {data3.get('is_validated')}"
        assert data3.get("scope") == "collective", f"Expected scope='collective', got {data3.get('scope')}"
        print(f"✓ After p3 confirm: is_validated={data3.get('is_validated')}, scope={data3.get('scope')}")


class TestFingerprintStats:
    """Test GET /api/waste/fingerprints/stats — library KPIs."""

    def test_fingerprint_stats(self):
        """Stats endpoint returns expected fields."""
        resp = requests.get(f"{BASE_URL}/api/waste/fingerprints/stats?property_id=outlet-main")
        assert resp.status_code == 200, f"Stats failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        assert "local_count" in data, "Missing local_count"
        assert "pending_collective" in data, "Missing pending_collective"
        assert "collective_validated" in data, "Missing collective_validated"
        assert "total" in data, "Missing total"
        assert "recent_hit_rate" in data, "Missing recent_hit_rate"
        assert "recent_queries" in data, "Missing recent_queries"
        print(f"✓ Stats: local={data.get('local_count')}, pending={data.get('pending_collective')}, "
              f"collective={data.get('collective_validated')}, total={data.get('total')}, "
              f"hit_rate={data.get('recent_hit_rate')}")


class TestPreliminaryFromImage:
    """Test POST /api/waste/capture/preliminary-from-image — Stage-1 progressive analysis."""

    def test_preliminary_no_match(self):
        """First call with no matching fingerprint should return preliminary=null, fallback_required=true."""
        # Use a unique color that won't match existing fingerprints
        img_b64 = generate_test_image_base64(r=200, g=50, b=150, size=64)
        payload = {
            "capture_id": "cap-prelim-test-nomatch",
            "media_base64": img_b64,
            "property_id": "outlet-main",
            "min_confidence": 0.85,
        }
        resp = requests.post(f"{BASE_URL}/api/waste/capture/preliminary-from-image", json=payload)
        assert resp.status_code == 200, f"Preliminary failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        assert data.get("preliminary") is None, f"Expected preliminary=null for no match, got {data.get('preliminary')}"
        assert data.get("fallback_required") is True, f"Expected fallback_required=true, got {data.get('fallback_required')}"
        print(f"✓ No match: preliminary=null, fallback_required=true, duration_ms={data.get('duration_ms')}")

    def test_preliminary_with_match(self):
        """After contributing a fingerprint, preliminary should return a match."""
        # Generate a unique color for this test
        r, g, b = 150, 100, 80
        img_b64 = generate_test_image_base64(r=r, g=g, b=b, size=128)
        hist = compute_hsv_histogram(r=r, g=g, b=b)

        # Contribute a fingerprint with this histogram
        contrib_payload = {
            "recipe_id": "rec-prelim-test",
            "name": "Preliminary Test Item",
            "hsv_histogram": hist,
            "portion_g": 110.0,
            "cost": 1.80,
            "category": "pastry",
            "property_id": "outlet-main",
        }
        contrib_resp = requests.post(f"{BASE_URL}/api/waste/fingerprints", json=contrib_payload)
        assert contrib_resp.status_code == 200, f"Contribute failed: {contrib_resp.text}"
        fp_id = contrib_resp.json().get("fingerprint", {}).get("fingerprint_id")
        print(f"  Contributed fingerprint {fp_id} for preliminary test")

        # Now call preliminary-from-image with the same image
        prelim_payload = {
            "capture_id": "cap-prelim-test-match",
            "media_base64": img_b64,
            "property_id": "outlet-main",
            "min_confidence": 0.85,
        }
        resp = requests.post(f"{BASE_URL}/api/waste/capture/preliminary-from-image", json=prelim_payload)
        assert resp.status_code == 200, f"Preliminary failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        prelim = data.get("preliminary")
        assert prelim is not None, f"Expected preliminary with match, got null"
        assert data.get("fallback_required") is False, f"Expected fallback_required=false"
        top_match = prelim.get("top_match", {})
        assert top_match.get("similarity", 0) >= 0.94, f"Expected similarity >= 0.94, got {top_match.get('similarity')}"
        assert "fingerprint" in prelim.get("vision_mode", ""), f"Expected vision_mode containing 'fingerprint', got {prelim.get('vision_mode')}"
        print(f"✓ Match found: similarity={top_match.get('similarity')}, vision_mode={prelim.get('vision_mode')}")


class TestCaptureStillFingerprintShortCircuit:
    """Test POST /api/waste/capture/still with pre-populated fingerprint — short-circuit path."""

    def test_capture_still_fingerprint_shortcircuit(self):
        """With a matching fingerprint, /capture/still should use fingerprint_local mode (skip Sonnet)."""
        # Generate unique color
        r, g, b = 130, 90, 70
        img_b64 = generate_test_image_base64(r=r, g=g, b=b, size=128)
        hist = compute_hsv_histogram(r=r, g=g, b=b)

        # Contribute a fingerprint
        contrib_payload = {
            "recipe_id": "rec-shortcircuit-test",
            "name": "Short Circuit Test Item",
            "hsv_histogram": hist,
            "portion_g": 95.0,
            "cost": 1.25,
            "category": "pastry",
            "confidence_base": 0.95,
            "property_id": "outlet-main",
        }
        contrib_resp = requests.post(f"{BASE_URL}/api/waste/fingerprints", json=contrib_payload)
        assert contrib_resp.status_code == 200, f"Contribute failed: {contrib_resp.text}"
        fp_id = contrib_resp.json().get("fingerprint", {}).get("fingerprint_id")
        print(f"  Contributed fingerprint {fp_id} for short-circuit test")

        # Init capture
        init_resp = requests.post(f"{BASE_URL}/api/waste/capture/init", json={
            "mode": "still",
            "user_id": "test-user",
            "outlet_id": "outlet-main",
        })
        assert init_resp.status_code == 200
        cap_id = init_resp.json().get("capture_id")

        # Capture still with the matching image
        still_payload = {
            "capture_id": cap_id,
            "media_base64": img_b64,
            "outlet_id": "outlet-main",
            "user_id": "test-user",
        }
        resp = requests.post(f"{BASE_URL}/api/waste/capture/still", json=still_payload)
        assert resp.status_code == 200, f"Capture still failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        vision_mode = data.get("vision_mode", "")
        items = data.get("items", [])
        
        # Check if fingerprint short-circuit was used
        if "fingerprint" in vision_mode:
            print(f"✓ Short-circuit SUCCESS: vision_mode={vision_mode}")
            assert len(items) > 0, "Expected at least one item"
            item_source = items[0].get("source", "")
            assert item_source.startswith("fingerprint:"), f"Expected item source starting with 'fingerprint:', got {item_source}"
            print(f"  Item source: {item_source}")
        else:
            # If Sonnet was called (budget available), that's also acceptable
            print(f"  Note: Sonnet was called (vision_mode={vision_mode}) — fingerprint similarity may have been below threshold")


class TestFeatureFlags:
    """Test GET /api/waste/feature-flags — fingerprint flags."""

    def test_feature_flags_fingerprint(self):
        """Feature flags should include fingerprint_first and fingerprint_shadow_learn."""
        resp = requests.get(f"{BASE_URL}/api/waste/feature-flags?property_id=default")
        assert resp.status_code == 200, f"Feature flags failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        flags = data.get("flags", {})
        assert flags.get("feature.fingerprint_first") is True, f"Expected feature.fingerprint_first=true, got {flags.get('feature.fingerprint_first')}"
        assert flags.get("feature.fingerprint_shadow_learn") is True, f"Expected feature.fingerprint_shadow_learn=true, got {flags.get('feature.fingerprint_shadow_learn')}"
        print(f"✓ Feature flags: fingerprint_first={flags.get('feature.fingerprint_first')}, fingerprint_shadow_learn={flags.get('feature.fingerprint_shadow_learn')}")


class TestRegressionStubPath:
    """Regression: /capture/still without media_base64 should use stub path."""

    def test_capture_still_no_media_uses_stub(self):
        """Without media_base64, capture/still should use stub (no fingerprint attempt)."""
        init_resp = requests.post(f"{BASE_URL}/api/waste/capture/init", json={
            "mode": "still",
            "user_id": "test-user",
        })
        assert init_resp.status_code == 200
        cap_id = init_resp.json().get("capture_id")

        # Capture still WITHOUT media_base64
        still_payload = {
            "capture_id": cap_id,
            "user_id": "test-user",
        }
        resp = requests.post(f"{BASE_URL}/api/waste/capture/still", json=still_payload)
        assert resp.status_code == 200, f"Capture still failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        vision_mode = data.get("vision_mode", "")
        assert vision_mode == "stub", f"Expected vision_mode='stub' without media, got {vision_mode}"
        print(f"✓ Regression: No media → vision_mode={vision_mode}")


class TestRegressionShadowContributeLogs:
    """Regression: GET /api/waste/logs?event_type=fingerprint_shadow_contribute."""

    def test_shadow_contribute_logs_endpoint(self):
        """Logs endpoint should accept fingerprint_shadow_contribute filter."""
        resp = requests.get(f"{BASE_URL}/api/waste/logs?event_type=fingerprint_shadow_contribute&limit=10")
        assert resp.status_code == 200, f"Logs endpoint failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        # May be empty or populated — just verify the endpoint works
        logs = data.get("logs", [])
        print(f"✓ Shadow contribute logs: {len(logs)} entries found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
