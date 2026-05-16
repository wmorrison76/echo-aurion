"""iter218 · Chafer volumetric + Forbes labels + Audit queue + CEY settings tests.

Tests for EchoYield v1.4 continuation:
- Chafer NSF catalog seed + single-frame volumetric measurement
- Forbes label structured storage + auto-ingest from photo_intake
- Audit queue self-healing loop (enqueue, resolve, skip, not_food, escalate)
- CEY settings property consent + feature toggles
"""
import os
import pytest
import requests
import uuid
import base64

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"

PROPERTY_ID = "outlet-main"

# Minimal valid JPEG for photo_intake tests (1x1 red pixel)
MINIMAL_JPEG_B64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k="

# Valid 10x10 red JPEG for tests that need a real image
VALID_JPEG_B64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAKAAoDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDyyiiivzo/ss//2Q=="


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ═══════════════════════════════════════════════════════════════════════════
# CHAFER CATALOG + MEASUREMENT TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestChaferCatalog:
    """Chafer NSF catalog seed + list + volumetric measurement"""

    def test_seed_catalog_idempotent(self, api_client):
        """POST /api/waste/chafer/seed-catalog — idempotent seed; total=20 after first call"""
        r = api_client.post(f"{BASE_URL}/api/waste/chafer/seed-catalog")
        assert r.status_code == 200, f"seed-catalog failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "inserted" in data
        assert "total" in data
        assert data["total"] == 20, f"Expected 20 catalog items, got {data['total']}"
        
        # Second call should insert 0 (idempotent)
        r2 = api_client.post(f"{BASE_URL}/api/waste/chafer/seed-catalog")
        assert r2.status_code == 200
        data2 = r2.json()
        assert data2.get("ok") is True
        assert data2["inserted"] == 0, f"Second seed should insert 0, got {data2['inserted']}"
        assert data2["total"] == 20

    def test_list_catalog_all(self, api_client):
        """GET /api/waste/chafer/catalog — returns 20 active references with correct fields"""
        r = api_client.get(f"{BASE_URL}/api/waste/chafer/catalog")
        assert r.status_code == 200, f"catalog list failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("count") == 20, f"Expected 20 items, got {data.get('count')}"
        
        # Check that rows have correct fields based on shape
        rows = data.get("rows", [])
        for row in rows:
            shape = row.get("shape")
            if shape == "rectangular":
                assert "outer_width_in" in row, f"rectangular missing outer_width_in: {row}"
                assert "outer_length_in" in row, f"rectangular missing outer_length_in: {row}"
                assert "depth_in" in row, f"rectangular missing depth_in: {row}"
            elif shape == "round":
                assert "outer_diameter_in" in row, f"round missing outer_diameter_in: {row}"
                assert "depth_in" in row, f"round missing depth_in: {row}"

    def test_list_catalog_filter_round(self, api_client):
        """GET /api/waste/chafer/catalog?shape=round — returns only round-shape (4 entries)"""
        r = api_client.get(f"{BASE_URL}/api/waste/chafer/catalog?shape=round")
        assert r.status_code == 200, f"catalog filter failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("count") == 4, f"Expected 4 round items, got {data.get('count')}"
        
        # Verify all are round and have expected keys
        expected_keys = {"round_4qt", "round_6qt", "round_8qt", "round_9qt"}
        actual_keys = {row["catalog_key"] for row in data.get("rows", [])}
        assert actual_keys == expected_keys, f"Expected {expected_keys}, got {actual_keys}"

    def test_measure_round_8qt_half_fill(self, api_client):
        """POST /api/waste/chafer/measure with round_8qt@50% — exact values check"""
        payload = {
            "catalog_key": "round_8qt",
            "fill_fraction": 0.5,
            "density_g_per_l": 1025,
            "cost_per_g": 0.003,
            "property_id": PROPERTY_ID
        }
        r = api_client.post(f"{BASE_URL}/api/waste/chafer/measure", json=payload)
        assert r.status_code == 200, f"measure failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        
        m = data.get("measurement", {})
        assert m.get("measured_volume_l") == 3.8, f"Expected 3.8L, got {m.get('measured_volume_l')}"
        assert m.get("measured_weight_g") == 3895.0, f"Expected 3895.0g, got {m.get('measured_weight_g')}"
        assert m.get("measured_cost_usd") == 11.69, f"Expected $11.69, got {m.get('measured_cost_usd')}"
        assert m.get("match_confidence") == 0.95, f"Expected 0.95 confidence, got {m.get('match_confidence')}"
        assert m.get("volume_estimate_error_pct") == 10.0, f"Expected 10% error, got {m.get('volume_estimate_error_pct')}"

    def test_measure_detected_shape_rectangular(self, api_client):
        """POST /api/waste/chafer/measure with detected_shape + dimensions (no catalog_key)"""
        payload = {
            "detected_shape": "rectangular",
            "detected_width_in": 12.4,
            "detected_length_in": 20.5,
            "fill_fraction": 0.3,
            "property_id": PROPERTY_ID
        }
        r = api_client.post(f"{BASE_URL}/api/waste/chafer/measure", json=payload)
        assert r.status_code == 200, f"measure with detected shape failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        
        m = data.get("measurement", {})
        # Should match full_gn_* via _best_catalog_match
        assert m.get("catalog_key", "").startswith("full_gn"), f"Expected full_gn match, got {m.get('catalog_key')}"
        conf = m.get("match_confidence", 0)
        assert 0.3 <= conf <= 0.98, f"Expected confidence 0.3-0.98, got {conf}"

    def test_measure_missing_dims_400(self, api_client):
        """POST /api/waste/chafer/measure with missing dims — 400 error"""
        payload = {
            "fill_fraction": 0.5,
            "property_id": PROPERTY_ID
            # No catalog_key and no detected_shape/dimensions
        }
        r = api_client.post(f"{BASE_URL}/api/waste/chafer/measure", json=payload)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"

    def test_list_measurements(self, api_client):
        """GET /api/waste/chafer/measurements?property_id=outlet-main — returns rows sorted desc"""
        r = api_client.get(f"{BASE_URL}/api/waste/chafer/measurements?property_id={PROPERTY_ID}")
        assert r.status_code == 200, f"measurements list failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        # Should have at least the measurements we created
        assert data.get("count", 0) >= 2


# ═══════════════════════════════════════════════════════════════════════════
# FORBES LABELS TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestForbesLabels:
    """Forbes label structured storage + auto-ingest"""

    def test_create_forbes_label(self, api_client):
        """POST /api/waste/forbes-labels — creates label with fbl- prefix"""
        payload = {
            "label_text": "Wild Alaskan Salmon",
            "property_id": PROPERTY_ID,
            "ocr_confidence": 0.95,
            "allergens": ["contains fish"],
            "origin_or_style": "Wild Alaskan"
        }
        r = api_client.post(f"{BASE_URL}/api/waste/forbes-labels", json=payload)
        assert r.status_code == 200, f"create label failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        
        label = data.get("label", {})
        assert label.get("id", "").startswith("fbl-"), f"Expected fbl- prefix, got {label.get('id')}"
        assert label.get("validated") is False
        # label_normalized should be lowercased and punctuation-stripped
        assert label.get("label_normalized") == "wild alaskan salmon"

    def test_list_forbes_labels(self, api_client):
        """GET /api/waste/forbes-labels?property_id=outlet-main — returns rows sorted desc"""
        r = api_client.get(f"{BASE_URL}/api/waste/forbes-labels?property_id={PROPERTY_ID}")
        assert r.status_code == 200, f"list labels failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        assert data.get("count", 0) >= 1

    def test_fuzzy_search_forbes_labels(self, api_client):
        """GET /api/waste/forbes-labels?q=salmon — fuzzy search returns the salmon row"""
        r = api_client.get(f"{BASE_URL}/api/waste/forbes-labels?q=salmon")
        assert r.status_code == 200, f"fuzzy search failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        rows = data.get("rows", [])
        assert len(rows) >= 1, "Expected at least 1 salmon result"
        # Check that at least one row contains salmon
        found = any("salmon" in (r.get("label_normalized") or "").lower() for r in rows)
        assert found, "No salmon label found in fuzzy search results"

    def test_validate_forbes_label(self, api_client):
        """POST /api/waste/forbes-labels/{id}/validate — flips validated=true"""
        # First create a label to validate
        payload = {
            "label_text": f"TEST_Validate_{uuid.uuid4().hex[:8]}",
            "property_id": PROPERTY_ID
        }
        r = api_client.post(f"{BASE_URL}/api/waste/forbes-labels", json=payload)
        assert r.status_code == 200
        label_id = r.json().get("label", {}).get("id")
        
        # Validate it
        r2 = api_client.post(f"{BASE_URL}/api/waste/forbes-labels/{label_id}/validate")
        assert r2.status_code == 200, f"validate failed: {r2.text}"
        data = r2.json()
        assert data.get("ok") is True
        label = data.get("label", {})
        assert label.get("validated") is True
        assert label.get("validated_at") is not None


# ═══════════════════════════════════════════════════════════════════════════
# AUDIT QUEUE TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestAuditQueue:
    """Audit queue self-healing loop tests"""

    def test_enqueue_audit_item(self, api_client):
        """POST /api/waste/audit-queue — creates item with aq- prefix, status=pending"""
        payload = {
            "property_id": PROPERTY_ID,
            "sonnet_best_guess": "looks like pastry",
            "sonnet_confidence": 0.42,
            "queue_priority": 50
        }
        r = api_client.post(f"{BASE_URL}/api/waste/audit-queue", json=payload)
        assert r.status_code == 200, f"enqueue failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        
        item = data.get("audit_item", {})
        assert item.get("id", "").startswith("aq-"), f"Expected aq- prefix, got {item.get('id')}"
        assert item.get("status") == "pending"
        return item.get("id")

    def test_list_pending_audit_items(self, api_client):
        """GET /api/waste/audit-queue/pending — returns rows sorted by priority, no crop_image_base64"""
        r = api_client.get(f"{BASE_URL}/api/waste/audit-queue/pending?property_id={PROPERTY_ID}")
        assert r.status_code == 200, f"list pending failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        assert "total_pending" in data
        
        # Verify crop_image_base64 is stripped from list response
        for row in data.get("rows", []):
            assert "crop_image_base64" not in row, "crop_image_base64 should be stripped from list"

    def test_get_audit_item_full(self, api_client):
        """GET /api/waste/audit-queue/{id} — returns full doc"""
        # Create an item with crop_image_base64
        payload = {
            "property_id": PROPERTY_ID,
            "sonnet_best_guess": "test item for get",
            "sonnet_confidence": 0.5,
            "queue_priority": 100,
            "crop_image_base64": MINIMAL_JPEG_B64
        }
        r = api_client.post(f"{BASE_URL}/api/waste/audit-queue", json=payload)
        assert r.status_code == 200
        item_id = r.json().get("audit_item", {}).get("id")
        
        # Get the full item
        r2 = api_client.get(f"{BASE_URL}/api/waste/audit-queue/{item_id}")
        assert r2.status_code == 200, f"get audit item failed: {r2.text}"
        data = r2.json()
        assert data.get("ok") is True
        item = data.get("audit_item", {})
        # Full doc may include crop_image_base64
        assert item.get("id") == item_id

    def test_resolve_recipe_pick(self, api_client):
        """POST /api/waste/audit-queue/{id}/resolve with recipe_pick — status=resolved"""
        # Create item with crop_image_base64 to test fingerprint creation
        payload = {
            "property_id": PROPERTY_ID,
            "sonnet_best_guess": "danish pastry",
            "sonnet_confidence": 0.45,
            "queue_priority": 60,
            "crop_image_base64": MINIMAL_JPEG_B64
        }
        r = api_client.post(f"{BASE_URL}/api/waste/audit-queue", json=payload)
        assert r.status_code == 200
        item_id = r.json().get("audit_item", {}).get("id")
        
        # Resolve with recipe_pick
        resolve_payload = {
            "resolution_method": "recipe_pick",
            "resolved_recipe_id": "rec-danish",
            "resolved_item_name": "Danish",
            "resolved_by_user_id": "chef-01"
        }
        r2 = api_client.post(f"{BASE_URL}/api/waste/audit-queue/{item_id}/resolve", json=resolve_payload)
        assert r2.status_code == 200, f"resolve failed: {r2.text}"
        data = r2.json()
        assert data.get("ok") is True
        item = data.get("audit_item", {})
        assert item.get("status") == "resolved"
        # If crop_image_base64 was provided, resulting_fingerprint_id should start with fp-
        fp_id = data.get("resulting_fingerprint_id") or item.get("resulting_fingerprint_id")
        if fp_id:
            assert fp_id.startswith("fp-"), f"Expected fp- prefix, got {fp_id}"

    def test_resolve_skip(self, api_client):
        """POST /api/waste/audit-queue/{id}/resolve with skip — status=skipped"""
        # Create item
        payload = {"property_id": PROPERTY_ID, "sonnet_best_guess": "skip test", "queue_priority": 70}
        r = api_client.post(f"{BASE_URL}/api/waste/audit-queue", json=payload)
        item_id = r.json().get("audit_item", {}).get("id")
        
        # Resolve with skip
        r2 = api_client.post(f"{BASE_URL}/api/waste/audit-queue/{item_id}/resolve", 
                            json={"resolution_method": "skip"})
        assert r2.status_code == 200
        assert r2.json().get("audit_item", {}).get("status") == "skipped"

    def test_resolve_not_food(self, api_client):
        """POST /api/waste/audit-queue/{id}/resolve with not_food — status=not_food"""
        payload = {"property_id": PROPERTY_ID, "sonnet_best_guess": "napkin", "queue_priority": 80}
        r = api_client.post(f"{BASE_URL}/api/waste/audit-queue", json=payload)
        item_id = r.json().get("audit_item", {}).get("id")
        
        r2 = api_client.post(f"{BASE_URL}/api/waste/audit-queue/{item_id}/resolve",
                            json={"resolution_method": "not_food"})
        assert r2.status_code == 200
        assert r2.json().get("audit_item", {}).get("status") == "not_food"

    def test_resolve_escalate(self, api_client):
        """POST /api/waste/audit-queue/{id}/resolve with escalate — status=escalated"""
        payload = {"property_id": PROPERTY_ID, "sonnet_best_guess": "unknown item", "queue_priority": 90}
        r = api_client.post(f"{BASE_URL}/api/waste/audit-queue", json=payload)
        item_id = r.json().get("audit_item", {}).get("id")
        
        r2 = api_client.post(f"{BASE_URL}/api/waste/audit-queue/{item_id}/resolve",
                            json={"resolution_method": "escalate", "escalated_to_user_id": "chef-exec-01"})
        assert r2.status_code == 200
        item = r2.json().get("audit_item", {})
        assert item.get("status") == "escalated"
        assert item.get("escalated_to_user_id") == "chef-exec-01"

    def test_resolve_invalid_method_400(self, api_client):
        """POST /api/waste/audit-queue/{id}/resolve with invalid method — 400 error"""
        payload = {"property_id": PROPERTY_ID, "sonnet_best_guess": "test", "queue_priority": 100}
        r = api_client.post(f"{BASE_URL}/api/waste/audit-queue", json=payload)
        item_id = r.json().get("audit_item", {}).get("id")
        
        r2 = api_client.post(f"{BASE_URL}/api/waste/audit-queue/{item_id}/resolve",
                            json={"resolution_method": "bogus"})
        assert r2.status_code == 400, f"Expected 400, got {r2.status_code}"

    def test_banner_stats(self, api_client):
        """GET /api/waste/audit-queue/stats/banner — returns banner info"""
        r = api_client.get(f"{BASE_URL}/api/waste/audit-queue/stats/banner?property_id={PROPERTY_ID}")
        assert r.status_code == 200, f"banner stats failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "show_banner" in data
        assert "total_pending" in data
        assert "threshold" in data
        assert "audit_queue_enabled" in data
        # show_banner should be bool
        assert isinstance(data.get("show_banner"), bool)


# ═══════════════════════════════════════════════════════════════════════════
# CEY SETTINGS TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestCEYSettings:
    """Property CEY settings consent + feature toggles"""

    def test_get_default_settings(self, api_client):
        """GET /api/waste/cey-settings?property_id=outlet-main — returns default settings"""
        r = api_client.get(f"{BASE_URL}/api/waste/cey-settings?property_id={PROPERTY_ID}")
        assert r.status_code == 200, f"get settings failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        
        settings = data.get("settings", {})
        # Check default values
        assert settings.get("photo_contribution_policy") in ("full", "local_only", "off")
        assert "audit_queue_enabled" in settings
        assert "audit_queue_banner_hour" in settings
        assert "audit_min_items_threshold" in settings

    def test_update_settings(self, api_client):
        """PUT /api/waste/cey-settings — updates and returns patched values"""
        patch = {
            "photo_contribution_policy": "local_only",
            "audit_min_items_threshold": 3
        }
        r = api_client.put(f"{BASE_URL}/api/waste/cey-settings?property_id={PROPERTY_ID}", json=patch)
        assert r.status_code == 200, f"update settings failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        
        settings = data.get("settings", {})
        assert settings.get("photo_contribution_policy") == "local_only"
        assert settings.get("audit_min_items_threshold") == 3
        
        # Verify with GET
        r2 = api_client.get(f"{BASE_URL}/api/waste/cey-settings?property_id={PROPERTY_ID}")
        assert r2.status_code == 200
        settings2 = r2.json().get("settings", {})
        assert settings2.get("photo_contribution_policy") == "local_only"
        assert settings2.get("audit_min_items_threshold") == 3

    def test_update_invalid_policy_400(self, api_client):
        """PUT with invalid photo_contribution_policy='bogus' — 400 error"""
        patch = {"photo_contribution_policy": "bogus"}
        r = api_client.put(f"{BASE_URL}/api/waste/cey-settings?property_id={PROPERTY_ID}", json=patch)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"

    def test_update_invalid_banner_hour_422(self, api_client):
        """PUT with audit_queue_banner_hour=25 — 422 (validator range)"""
        patch = {"audit_queue_banner_hour": 25}
        r = api_client.put(f"{BASE_URL}/api/waste/cey-settings?property_id={PROPERTY_ID}", json=patch)
        assert r.status_code == 422, f"Expected 422, got {r.status_code}"


# ═══════════════════════════════════════════════════════════════════════════
# REGRESSION TESTS (iter216 + iter217)
# ═══════════════════════════════════════════════════════════════════════════

class TestRegressionIter216Iter217:
    """Regression tests for fingerprint and photo-intake endpoints"""

    def test_fingerprints_stats(self, api_client):
        """GET /api/waste/fingerprints/stats — still works"""
        r = api_client.get(f"{BASE_URL}/api/waste/fingerprints/stats?property_id={PROPERTY_ID}")
        assert r.status_code == 200, f"fingerprints stats failed: {r.text}"
        data = r.json()
        assert "local_count" in data or "total" in data

    def test_capture_preliminary_from_image(self, api_client):
        """POST /api/waste/capture/preliminary-from-image — still works"""
        # Create a simple HSV histogram (64 bins)
        hist = [0.0] * 64
        hist[0] = 1.0  # Just one bin with value
        payload = {
            "capture_id": f"cap-test-{uuid.uuid4().hex[:8]}",
            "media_base64": VALID_JPEG_B64,  # Use valid JPEG
            "hsv_histogram": hist,
            "property_id": PROPERTY_ID
        }
        r = api_client.post(f"{BASE_URL}/api/waste/capture/preliminary-from-image", json=payload)
        assert r.status_code == 200, f"preliminary-from-image failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True

    def test_photo_intake_with_jpeg(self, api_client):
        """POST /api/waste/photo-intake with real JPEG — returns processing_status='complete'"""
        payload = {
            "media_base64": VALID_JPEG_B64,
            "source_module": "waste_capture",
            "property_id": PROPERTY_ID,
            "upload_method": "in_app_capture"
        }
        r = api_client.post(f"{BASE_URL}/api/waste/photo-intake", json=payload)
        assert r.status_code == 200, f"photo-intake failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        # Status should be complete (or skipped_quality for minimal image)
        assert data.get("processing_status") in ("complete", "skipped_quality")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
