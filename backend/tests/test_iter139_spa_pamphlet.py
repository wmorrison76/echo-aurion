"""
Iteration 139: Spa Services, Spa Booking, Pamphlet Designer + Cake Order Reminder Regression
=============================================================================================
Tests for:
1. SPA SERVICES: CRUD + POS sync queue (kind='spa_service')
2. SPA BOOKING: Public catalog, QR code (SVG + PNG), booking creation
3. PAMPHLET DESIGNER: CRUD, auto-generate, asset upload, PDF export
4. CAKE ORDER REGRESSION: reminder_id in response + production-schedules summary
"""
import pytest
import requests
import os
import base64
import io

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# ─────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────
@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ─────────────────────────────────────────────
# SPA SERVICES TESTS
# ─────────────────────────────────────────────
class TestSpaServices:
    """Spa Services CRUD + POS sync queue tests"""
    
    def test_spa_services_list_auto_seeds(self, api_client):
        """GET /api/spa-services/ auto-seeds 7 services on first call"""
        resp = api_client.get(f"{BASE_URL}/api/spa-services/")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "services" in data
        assert "total" in data
        assert "categories" in data
        # Should have at least 7 seeded services
        assert data["total"] >= 7, f"Expected at least 7 services, got {data['total']}"
        # Check no _id leak
        for svc in data["services"]:
            assert "_id" not in svc, "_id leaked in spa service"
            assert "id" in svc
            assert "sku" in svc
            # SKU format: SPA-{6-char-base}-{4-char-hex}
            assert svc["sku"].startswith("SPA-"), f"SKU should start with SPA-, got {svc['sku']}"
        print(f"PASS: Listed {data['total']} spa services, categories: {data['categories']}")
    
    def test_spa_services_active_only_filter(self, api_client):
        """GET /api/spa-services/?active_only=true filters to active ones"""
        resp = api_client.get(f"{BASE_URL}/api/spa-services/?active_only=true")
        assert resp.status_code == 200
        data = resp.json()
        for svc in data["services"]:
            assert svc.get("active") == True, f"Service {svc['id']} should be active"
        print(f"PASS: active_only filter returned {data['total']} active services")
    
    def test_spa_services_create_enqueues_pos(self, api_client):
        """POST /api/spa-services/ creates service and enqueues 'create' to pos_outbound"""
        payload = {
            "name": "TEST_Aromatherapy Massage",
            "category": "massage",
            "description": "Test service for iteration 139",
            "duration_min": 75,
            "price": 185.00,
            "active": True
        }
        resp = api_client.post(f"{BASE_URL}/api/spa-services/", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "_id" not in data
        assert data["name"] == payload["name"]
        assert data["price"] == payload["price"]
        assert "id" in data
        assert "sku" in data
        assert data["sku"].startswith("SPA-")
        
        # Verify POS queue has the create action
        pos_resp = api_client.get(f"{BASE_URL}/api/spa-services/pos/sync-queue?status=pending")
        assert pos_resp.status_code == 200
        pos_data = pos_resp.json()
        # Find our service in the queue
        found = any(
            item.get("service_id") == data["id"] and item.get("action") == "create"
            for item in pos_data.get("items", [])
        )
        assert found, f"Service {data['id']} not found in POS queue with 'create' action"
        print(f"PASS: Created service {data['id']} with SKU {data['sku']}, enqueued to POS")
        return data["id"]
    
    def test_spa_services_update_enqueues_pos(self, api_client):
        """PATCH /api/spa-services/{id} updates and enqueues 'update' action"""
        # First create a service
        create_resp = api_client.post(f"{BASE_URL}/api/spa-services/", json={
            "name": "TEST_Update Service",
            "category": "facial",
            "price": 150.00
        })
        assert create_resp.status_code == 200
        svc_id = create_resp.json()["id"]
        
        # Update it
        patch_resp = api_client.patch(f"{BASE_URL}/api/spa-services/{svc_id}", json={
            "price": 175.00,
            "description": "Updated description"
        })
        assert patch_resp.status_code == 200
        updated = patch_resp.json()
        assert updated["price"] == 175.00
        assert updated["description"] == "Updated description"
        
        # Verify POS queue has update action
        pos_resp = api_client.get(f"{BASE_URL}/api/spa-services/pos/sync-queue?status=pending")
        pos_data = pos_resp.json()
        found = any(
            item.get("service_id") == svc_id and item.get("action") == "update"
            for item in pos_data.get("items", [])
        )
        assert found, f"Service {svc_id} not found in POS queue with 'update' action"
        print(f"PASS: Updated service {svc_id}, enqueued 'update' to POS")
    
    def test_spa_services_toggle_active(self, api_client):
        """POST /api/spa-services/{id}/toggle-active flips active flag and enqueues action"""
        # Create a service
        create_resp = api_client.post(f"{BASE_URL}/api/spa-services/", json={
            "name": "TEST_Toggle Service",
            "category": "body",
            "price": 120.00,
            "active": True
        })
        assert create_resp.status_code == 200
        svc_id = create_resp.json()["id"]
        
        # Toggle to inactive
        toggle_resp = api_client.post(f"{BASE_URL}/api/spa-services/{svc_id}/toggle-active")
        assert toggle_resp.status_code == 200
        toggle_data = toggle_resp.json()
        assert toggle_data["success"] == True
        assert toggle_data["active"] == False
        
        # Verify POS queue has 'deactivate' action
        pos_resp = api_client.get(f"{BASE_URL}/api/spa-services/pos/sync-queue?status=pending")
        pos_data = pos_resp.json()
        found = any(
            item.get("service_id") == svc_id and item.get("action") == "deactivate"
            for item in pos_data.get("items", [])
        )
        assert found, f"Service {svc_id} not found in POS queue with 'deactivate' action"
        
        # Toggle back to active
        toggle_resp2 = api_client.post(f"{BASE_URL}/api/spa-services/{svc_id}/toggle-active")
        assert toggle_resp2.status_code == 200
        assert toggle_resp2.json()["active"] == True
        print(f"PASS: Toggled service {svc_id} active/inactive, POS actions enqueued")
    
    def test_spa_services_delete_enqueues_deactivate(self, api_client):
        """DELETE /api/spa-services/{id} removes service and enqueues 'deactivate'"""
        # Create a service
        create_resp = api_client.post(f"{BASE_URL}/api/spa-services/", json={
            "name": "TEST_Delete Service",
            "category": "nails",
            "price": 65.00
        })
        assert create_resp.status_code == 200
        svc_id = create_resp.json()["id"]
        
        # Delete it
        del_resp = api_client.delete(f"{BASE_URL}/api/spa-services/{svc_id}")
        assert del_resp.status_code == 200
        del_data = del_resp.json()
        assert del_data["success"] == True
        
        # Verify service is gone
        get_resp = api_client.get(f"{BASE_URL}/api/spa-services/{svc_id}")
        assert get_resp.status_code == 404
        
        # Verify POS queue has 'deactivate' action
        pos_resp = api_client.get(f"{BASE_URL}/api/spa-services/pos/sync-queue?status=pending")
        pos_data = pos_resp.json()
        found = any(
            item.get("service_id") == svc_id and item.get("action") == "deactivate"
            for item in pos_data.get("items", [])
        )
        assert found, f"Deleted service {svc_id} not found in POS queue with 'deactivate' action"
        print(f"PASS: Deleted service {svc_id}, enqueued 'deactivate' to POS")
    
    def test_spa_services_pos_sync_queue_kind_filter(self, api_client):
        """GET /api/spa-services/pos/sync-queue returns only kind='spa_service' pending items"""
        resp = api_client.get(f"{BASE_URL}/api/spa-services/pos/sync-queue?status=pending")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        for item in data["items"]:
            assert item.get("kind") == "spa_service", f"Expected kind='spa_service', got {item.get('kind')}"
            assert "_id" not in item
        print(f"PASS: POS sync queue returned {data['total']} spa_service items")


# ─────────────────────────────────────────────
# SPA BOOKING TESTS
# ─────────────────────────────────────────────
class TestSpaBooking:
    """Spa Booking public catalog, QR code, and booking tests"""
    
    def test_spa_booking_public_services(self, api_client):
        """GET /api/spa-booking/services/{hotel-slug} returns only active services (no therapists/rooms/tax_code)"""
        resp = api_client.get(f"{BASE_URL}/api/spa-booking/services/echo-ai-framework")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["hotel_slug"] == "echo-ai-framework"
        assert "services" in data
        assert "total" in data
        assert "categories" in data
        
        for svc in data["services"]:
            assert "_id" not in svc
            # Should NOT include therapists, rooms, tax_code (private fields)
            assert "therapists" not in svc, "therapists should be excluded from public catalog"
            assert "rooms" not in svc, "rooms should be excluded from public catalog"
            assert "tax_code" not in svc, "tax_code should be excluded from public catalog"
            # Should include public fields
            assert "id" in svc
            assert "name" in svc
            assert "price" in svc
        print(f"PASS: Public catalog for echo-ai-framework has {data['total']} services")
    
    def test_spa_booking_qr_svg(self, api_client):
        """GET /api/spa-booking/qr/{hotel-slug} returns SVG content with media_type=image/svg+xml"""
        resp = api_client.get(f"{BASE_URL}/api/spa-booking/qr/echo-ai-framework")
        assert resp.status_code == 200
        assert "image/svg+xml" in resp.headers.get("content-type", "")
        content = resp.text
        assert "<svg" in content.lower(), "Response should contain <svg tag"
        assert "X-Booking-URL" in resp.headers, "Should have X-Booking-URL header"
        booking_url = resp.headers.get("X-Booking-URL", "")
        assert "/book/echo-ai-framework" in booking_url
        print(f"PASS: QR SVG returned, booking URL: {booking_url}")
    
    def test_spa_booking_qr_meta(self, api_client):
        """GET /api/spa-booking/qr/{hotel-slug}/meta returns { url, png_base64, hotel_slug }"""
        resp = api_client.get(f"{BASE_URL}/api/spa-booking/qr/echo-ai-framework/meta")
        assert resp.status_code == 200
        data = resp.json()
        assert "url" in data
        assert "png_base64" in data
        assert "hotel_slug" in data
        assert data["hotel_slug"] == "echo-ai-framework"
        assert "/book/echo-ai-framework" in data["url"]
        
        # Verify PNG base64 decodes
        try:
            png_bytes = base64.b64decode(data["png_base64"])
            # PNG magic bytes: 89 50 4E 47
            assert png_bytes[:4] == b'\x89PNG', "Decoded bytes should be valid PNG"
        except Exception as e:
            pytest.fail(f"Failed to decode png_base64: {e}")
        print(f"PASS: QR meta returned, URL: {data['url']}, PNG decodes correctly")
    
    def test_spa_booking_create_booking(self, api_client):
        """POST /api/spa-booking/book creates booking with unique confirmation_code (SPA-XXXXXX)"""
        # First get an active service
        services_resp = api_client.get(f"{BASE_URL}/api/spa-booking/services/test-hotel")
        assert services_resp.status_code == 200
        services = services_resp.json()["services"]
        assert len(services) > 0, "Need at least one service to book"
        service_id = services[0]["id"]
        
        payload = {
            "hotel_slug": "test-hotel",
            "service_id": service_id,
            "guest": {
                "name": "TEST_Jane Doe",
                "email": "test.jane@example.com",
                "phone": "+1-555-0139",
                "room_number": "412"
            },
            "preferred_date": "2026-05-01",
            "preferred_time": "14:00",
            "notes": "Test booking for iteration 139"
        }
        resp = api_client.post(f"{BASE_URL}/api/spa-booking/book", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["success"] == True
        assert "booking" in data
        booking = data["booking"]
        assert "_id" not in booking
        assert "id" in booking
        assert "confirmation_code" in booking
        # Confirmation code format: SPA-XXXXXX
        assert booking["confirmation_code"].startswith("SPA-"), f"Expected SPA- prefix, got {booking['confirmation_code']}"
        assert len(booking["confirmation_code"]) == 10, f"Expected 10 chars (SPA-XXXXXX), got {len(booking['confirmation_code'])}"
        assert booking["status"] == "requested"
        print(f"PASS: Created booking {booking['id']} with confirmation {booking['confirmation_code']}")
        return booking["id"]
    
    def test_spa_booking_enqueues_pos(self, api_client):
        """Booking creation enqueues kind='spa_booking' to pos_outbound"""
        # Create a booking
        services_resp = api_client.get(f"{BASE_URL}/api/spa-booking/services/pos-test-hotel")
        services = services_resp.json()["services"]
        service_id = services[0]["id"]
        
        book_resp = api_client.post(f"{BASE_URL}/api/spa-booking/book", json={
            "hotel_slug": "pos-test-hotel",
            "service_id": service_id,
            "guest": {"name": "TEST_POS Guest", "email": "pos.guest@test.com"},
            "preferred_date": "2026-05-02",
            "preferred_time": "10:00"
        })
        assert book_resp.status_code == 200
        booking_id = book_resp.json()["booking"]["id"]
        
        # Check POS outbound for spa_booking kind
        # Note: We need to check the general pos_outbound, not the spa-services specific one
        # The spa_booking kind is in the same pos_outbound collection
        pos_resp = api_client.get(f"{BASE_URL}/api/cake-orders/pos/outbound?status=pending")
        assert pos_resp.status_code == 200
        pos_data = pos_resp.json()
        found = any(
            item.get("kind") == "spa_booking" and item.get("booking_id") == booking_id
            for item in pos_data.get("items", [])
        )
        assert found, f"Booking {booking_id} not found in POS outbound with kind='spa_booking'"
        print(f"PASS: Booking {booking_id} enqueued to POS outbound")
    
    def test_spa_booking_list_with_filters(self, api_client):
        """GET /api/spa-booking/bookings lists bookings; filter by hotel_slug + status works"""
        resp = api_client.get(f"{BASE_URL}/api/spa-booking/bookings")
        assert resp.status_code == 200
        data = resp.json()
        assert "bookings" in data
        assert "total" in data
        for b in data["bookings"]:
            assert "_id" not in b
        
        # Filter by hotel_slug
        filter_resp = api_client.get(f"{BASE_URL}/api/spa-booking/bookings?hotel_slug=test-hotel")
        assert filter_resp.status_code == 200
        filter_data = filter_resp.json()
        for b in filter_data["bookings"]:
            assert b["hotel_slug"] == "test-hotel"
        
        # Filter by status
        status_resp = api_client.get(f"{BASE_URL}/api/spa-booking/bookings?status=requested")
        assert status_resp.status_code == 200
        for b in status_resp.json()["bookings"]:
            assert b["status"] == "requested"
        print(f"PASS: Booking list and filters work, total: {data['total']}")
    
    def test_spa_booking_status_update(self, api_client):
        """POST /api/spa-booking/bookings/{id}/status changes status with validation"""
        # Create a booking first
        services_resp = api_client.get(f"{BASE_URL}/api/spa-booking/services/status-test")
        services = services_resp.json()["services"]
        book_resp = api_client.post(f"{BASE_URL}/api/spa-booking/book", json={
            "hotel_slug": "status-test",
            "service_id": services[0]["id"],
            "guest": {"name": "TEST_Status Guest", "email": "status@test.com"},
            "preferred_date": "2026-05-03",
            "preferred_time": "11:00"
        })
        booking_id = book_resp.json()["booking"]["id"]
        
        # Update to confirmed
        update_resp = api_client.post(f"{BASE_URL}/api/spa-booking/bookings/{booking_id}/status", json={"status": "confirmed"})
        assert update_resp.status_code == 200
        assert update_resp.json()["status"] == "confirmed"
        
        # Invalid status should return 400
        invalid_resp = api_client.post(f"{BASE_URL}/api/spa-booking/bookings/{booking_id}/status", json={"status": "invalid_status"})
        assert invalid_resp.status_code == 400
        print(f"PASS: Status update works, invalid status returns 400")


# ─────────────────────────────────────────────
# PAMPHLET DESIGNER TESTS
# ─────────────────────────────────────────────
class TestPamphletDesigner:
    """Pamphlet Designer CRUD, auto-generate, asset upload, PDF export tests"""
    
    def test_pamphlet_create(self, api_client):
        """POST /api/pamphlet/ creates a pamphlet doc"""
        payload = {
            "doc": {
                "name": "TEST_Spa Menu Pamphlet",
                "page_size": "LETTER",
                "orientation": "portrait",
                "bleed_mm": 3,
                "pages": [[
                    {"id": "el-001", "type": "text", "x": 20, "y": 20, "w": 100, "h": 20,
                     "text": "Spa Services", "font_size": 24, "font_weight": "bold"}
                ]],
                "theme": "enterprise"
            }
        }
        resp = api_client.post(f"{BASE_URL}/api/pamphlet/", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "_id" not in data
        assert "id" in data
        assert data["id"].startswith("pmp-")
        assert data["name"] == "TEST_Spa Menu Pamphlet"
        assert "created_at" in data
        print(f"PASS: Created pamphlet {data['id']}")
        return data["id"]
    
    def test_pamphlet_auto_generate(self, api_client):
        """POST /api/pamphlet/auto-generate builds pamphlet from active services with spa_service_card elements"""
        resp = api_client.post(f"{BASE_URL}/api/pamphlet/auto-generate", json={
            "name": "TEST_Auto Generated Pamphlet",
            "page_size": "LETTER",
            "theme": "luxury"
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "_id" not in data
        assert "id" in data
        assert "pages" in data
        assert len(data["pages"]) >= 1, "Should have at least 1 page"
        
        # Check for spa_service_card elements
        has_service_card = False
        for page in data["pages"]:
            for el in page:
                if el.get("type") == "spa_service_card":
                    has_service_card = True
                    assert "service_id" in el
                    break
        assert has_service_card, "Auto-generated pamphlet should have spa_service_card elements"
        assert "spa_services_included" in data
        assert len(data["spa_services_included"]) > 0
        print(f"PASS: Auto-generated pamphlet {data['id']} with {len(data['spa_services_included'])} services")
        return data["id"]
    
    def test_pamphlet_list(self, api_client):
        """GET /api/pamphlet/ lists pamphlets"""
        resp = api_client.get(f"{BASE_URL}/api/pamphlet/")
        assert resp.status_code == 200
        data = resp.json()
        assert "pamphlets" in data
        assert "total" in data
        for p in data["pamphlets"]:
            assert "_id" not in p
        print(f"PASS: Listed {data['total']} pamphlets")
    
    def test_pamphlet_get_single(self, api_client):
        """GET /api/pamphlet/{id} fetches one pamphlet"""
        # Create one first
        create_resp = api_client.post(f"{BASE_URL}/api/pamphlet/", json={
            "doc": {"name": "TEST_Get Single Pamphlet", "pages": [[]]}
        })
        pmp_id = create_resp.json()["id"]
        
        resp = api_client.get(f"{BASE_URL}/api/pamphlet/{pmp_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert "_id" not in data
        assert data["id"] == pmp_id
        assert data["name"] == "TEST_Get Single Pamphlet"
        print(f"PASS: Fetched pamphlet {pmp_id}")
    
    def test_pamphlet_update(self, api_client):
        """PUT /api/pamphlet/{id} updates pamphlet"""
        # Create one first
        create_resp = api_client.post(f"{BASE_URL}/api/pamphlet/", json={
            "doc": {"name": "TEST_Update Pamphlet", "pages": [[]]}
        })
        pmp_id = create_resp.json()["id"]
        
        # Update it
        update_resp = api_client.put(f"{BASE_URL}/api/pamphlet/{pmp_id}", json={
            "doc": {
                "name": "TEST_Updated Pamphlet Name",
                "pages": [[{"id": "el-new", "type": "text", "x": 10, "y": 10, "w": 50, "h": 10, "text": "New"}]],
                "theme": "playful"
            }
        })
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data["name"] == "TEST_Updated Pamphlet Name"
        assert data["theme"] == "playful"
        print(f"PASS: Updated pamphlet {pmp_id}")
    
    def test_pamphlet_export_pdf(self, api_client):
        """GET /api/pamphlet/{id}/export-pdf returns valid PDF (media_type=application/pdf, starts with %PDF-)"""
        # Create a pamphlet with content
        create_resp = api_client.post(f"{BASE_URL}/api/pamphlet/", json={
            "doc": {
                "name": "TEST_PDF Export Pamphlet",
                "pages": [[
                    {"id": "el-title", "type": "text", "x": 20, "y": 20, "w": 150, "h": 20,
                     "text": "Spa Menu", "font_size": 28, "font_weight": "bold", "color": "#c8a97e"}
                ]]
            }
        })
        pmp_id = create_resp.json()["id"]
        
        # Export PDF
        resp = api_client.get(f"{BASE_URL}/api/pamphlet/{pmp_id}/export-pdf")
        assert resp.status_code == 200
        assert "application/pdf" in resp.headers.get("content-type", "")
        # Check PDF magic bytes
        pdf_bytes = resp.content
        assert pdf_bytes[:5] == b'%PDF-', f"PDF should start with %PDF-, got {pdf_bytes[:10]}"
        print(f"PASS: Exported PDF for pamphlet {pmp_id}, size: {len(pdf_bytes)} bytes")
    
    def test_pamphlet_asset_upload_png(self, api_client):
        """POST /api/pamphlet/assets/upload with PNG file succeeds"""
        # Create a simple 1x1 red PNG
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
        )
        files = {"file": ("test_image.png", io.BytesIO(png_data), "image/png")}
        data = {"tag": "test_upload"}
        
        resp = requests.post(f"{BASE_URL}/api/pamphlet/assets/upload", files=files, data=data)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        asset = resp.json()
        assert "_id" not in asset
        assert "id" in asset
        assert asset["id"].startswith("ast-")
        assert asset["original_ext"] == ".png"
        assert "size_bytes" in asset
        print(f"PASS: Uploaded PNG asset {asset['id']}, size: {asset['size_bytes']} bytes")
        return asset["id"]
    
    def test_pamphlet_asset_list(self, api_client):
        """GET /api/pamphlet/assets lists uploaded assets"""
        resp = api_client.get(f"{BASE_URL}/api/pamphlet/assets")
        assert resp.status_code == 200
        data = resp.json()
        assert "assets" in data
        assert "total" in data
        for a in data["assets"]:
            assert "_id" not in a
            # path should be excluded from list response
            assert "path" not in a
        print(f"PASS: Listed {data['total']} assets")
    
    def test_pamphlet_asset_raw(self, api_client):
        """GET /api/pamphlet/assets/{id}/raw returns file bytes with correct media type"""
        # Upload an asset first
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
        )
        files = {"file": ("raw_test.png", io.BytesIO(png_data), "image/png")}
        upload_resp = requests.post(f"{BASE_URL}/api/pamphlet/assets/upload", files=files, data={"tag": "raw_test"})
        asset_id = upload_resp.json()["id"]
        
        # Get raw
        resp = api_client.get(f"{BASE_URL}/api/pamphlet/assets/{asset_id}/raw")
        assert resp.status_code == 200
        assert "image/png" in resp.headers.get("content-type", "")
        # Check PNG magic bytes
        assert resp.content[:4] == b'\x89PNG'
        print(f"PASS: Retrieved raw asset {asset_id}")
    
    def test_pamphlet_asset_unsupported_type_400(self, api_client):
        """Unsupported file type (e.g. .exe) upload returns 400"""
        exe_data = b"MZ" + b"\x00" * 100  # Fake EXE header
        files = {"file": ("malware.exe", io.BytesIO(exe_data), "application/octet-stream")}
        
        resp = requests.post(f"{BASE_URL}/api/pamphlet/assets/upload", files=files, data={"tag": "test"})
        assert resp.status_code == 400, f"Expected 400 for .exe, got {resp.status_code}"
        print(f"PASS: Unsupported file type .exe rejected with 400")


# ─────────────────────────────────────────────
# CAKE ORDER REGRESSION: reminder_id
# ─────────────────────────────────────────────
class TestCakeOrderReminder:
    """Cake order creates dashboard reminder, response contains reminder_id"""
    
    def test_cake_order_creates_reminder(self, api_client):
        """POST /api/cake-orders/ creates reminder in pastry_production_reminders, response has reminder_id"""
        # Get initial production schedules summary
        summary_before = api_client.get(f"{BASE_URL}/api/production-schedules/summary").json()
        total_before = summary_before.get("total_open", 0)
        
        # Create a cake order
        payload = {
            "design_name": "TEST_Reminder Cake",
            "client": {
                "name": "TEST Reminder Client",
                "email": "reminder@test.com"
            },
            "pickup_date": "2026-05-10",
            "pickup_time": "14:00",
            "tiers": [{"tier": 1, "diameter": 10, "shape": "round", "flavor": "Chocolate"}],
            "total_servings": 20,
            "costing": {"suggested_price": 350.00},
            "send_email": False
        }
        resp = api_client.post(f"{BASE_URL}/api/cake-orders/", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["success"] == True
        order = data["order"]
        
        # Check reminder_id is present
        assert "reminder_id" in order, "Order response should contain reminder_id"
        assert order["reminder_id"] is not None, "reminder_id should not be None"
        assert order["reminder_id"].startswith("sched-"), f"reminder_id should start with sched-, got {order['reminder_id']}"
        
        # Check production schedules summary increased
        summary_after = api_client.get(f"{BASE_URL}/api/production-schedules/summary").json()
        total_after = summary_after.get("total_open", 0)
        assert total_after > total_before, f"total_open should increase after cake order (before: {total_before}, after: {total_after})"
        
        print(f"PASS: Cake order created reminder {order['reminder_id']}, total_open: {total_before} -> {total_after}")


# ─────────────────────────────────────────────
# REGRESSION TESTS
# ─────────────────────────────────────────────
class TestRegression:
    """Regression tests for previous iteration endpoints"""
    
    def test_production_schedules_summary(self, api_client):
        """GET /api/production-schedules/summary still works"""
        resp = api_client.get(f"{BASE_URL}/api/production-schedules/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_open" in data
        assert "buckets" in data
        print(f"PASS: production-schedules/summary works, total_open: {data['total_open']}")
    
    def test_cake_assets_advanced_tools(self, api_client):
        """GET /api/cake-assets/advanced-tools still works"""
        resp = api_client.get(f"{BASE_URL}/api/cake-assets/advanced-tools")
        assert resp.status_code == 200
        data = resp.json()
        assert "tools" in data
        assert len(data["tools"]) == 10
        print(f"PASS: cake-assets/advanced-tools returns 10 tools")
    
    def test_cake_assets_airbrush_nozzles(self, api_client):
        """GET /api/cake-assets/airbrush-nozzles still works"""
        resp = api_client.get(f"{BASE_URL}/api/cake-assets/airbrush-nozzles")
        assert resp.status_code == 200
        data = resp.json()
        assert "nozzles" in data
        assert len(data["nozzles"]) == 4
        print(f"PASS: cake-assets/airbrush-nozzles returns 4 nozzles")
    
    def test_health_endpoint(self, api_client):
        """GET /api/health still works"""
        resp = api_client.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        print(f"PASS: health endpoint works")
