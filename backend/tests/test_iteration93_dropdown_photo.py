"""
Iteration 93: Test Dropdown Text Visibility Fix and Photo Upload Feature
=========================================================================
Tests:
1. Photo upload endpoint (POST /api/concierge/upload-photo)
2. Photo serving endpoint (GET /api/concierge/photos/{filename})
3. Guest report with photos array (POST /api/concierge/guest-report)
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPhotoUpload:
    """Test photo upload functionality for Echo Concierge"""
    
    def test_upload_photo_endpoint_exists(self):
        """Test that upload-photo endpoint accepts file uploads"""
        # Create a simple test image (1x1 pixel PNG)
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,  # bit depth, color type
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,  # compressed data
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  # IEND chunk
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {'file': ('test_image.png', io.BytesIO(png_data), 'image/png')}
        response = requests.post(f"{BASE_URL}/api/concierge/upload-photo", files=files)
        
        assert response.status_code == 200, f"Upload failed with status {response.status_code}: {response.text}"
        data = response.json()
        assert "url" in data, "Response should contain 'url' field"
        assert "filename" in data, "Response should contain 'filename' field"
        assert data["url"].startswith("/api/concierge/photos/"), f"URL should start with /api/concierge/photos/, got: {data['url']}"
        print(f"✓ Photo upload successful: {data['url']}")
        return data["url"]
    
    def test_upload_photo_returns_valid_url(self):
        """Test that uploaded photo URL is accessible"""
        # Upload a test image
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {'file': ('test_serve.png', io.BytesIO(png_data), 'image/png')}
        upload_response = requests.post(f"{BASE_URL}/api/concierge/upload-photo", files=files)
        assert upload_response.status_code == 200
        
        photo_url = upload_response.json()["url"]
        
        # Now try to fetch the uploaded photo
        serve_response = requests.get(f"{BASE_URL}{photo_url}")
        assert serve_response.status_code == 200, f"Photo serve failed with status {serve_response.status_code}"
        assert len(serve_response.content) > 0, "Photo content should not be empty"
        print(f"✓ Photo serving works: {photo_url} returned {len(serve_response.content)} bytes")
    
    def test_serve_nonexistent_photo_returns_404(self):
        """Test that serving a non-existent photo returns 404"""
        response = requests.get(f"{BASE_URL}/api/concierge/photos/nonexistent-photo-12345.jpg")
        assert response.status_code == 404, f"Expected 404 for non-existent photo, got {response.status_code}"
        print("✓ Non-existent photo correctly returns 404")


class TestGuestReportWithPhotos:
    """Test guest report endpoint with photos array"""
    
    def test_guest_report_accepts_photos_array(self):
        """Test that guest-report endpoint accepts photos array in payload"""
        payload = {
            "guest_name": "TEST_Photo_Guest",
            "room_number": "999",
            "category": "room",
            "priority": "medium",
            "title": "TEST_Photo_Attachment_Test",
            "description": "Testing photo attachment feature",
            "photos": ["/api/concierge/photos/test1.jpg", "/api/concierge/photos/test2.jpg"],
            "reported_by": "staff",
            "reporter_id": ""
        }
        
        response = requests.post(
            f"{BASE_URL}/api/concierge/guest-report",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Guest report failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain ticket id"
        assert "photos" in data, "Response should contain photos field"
        assert len(data["photos"]) == 2, f"Expected 2 photos, got {len(data.get('photos', []))}"
        print(f"✓ Guest report with photos created: {data['id']} with {len(data['photos'])} photos")
    
    def test_guest_report_with_empty_photos_array(self):
        """Test that guest-report works with empty photos array"""
        payload = {
            "guest_name": "TEST_No_Photo_Guest",
            "room_number": "888",
            "category": "maintenance",
            "priority": "low",
            "title": "TEST_No_Photo_Test",
            "description": "Testing without photos",
            "photos": [],
            "reported_by": "guest",
            "reporter_id": ""
        }
        
        response = requests.post(
            f"{BASE_URL}/api/concierge/guest-report",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Guest report failed: {response.status_code}"
        data = response.json()
        assert data.get("photos") == [], "Photos should be empty array"
        print(f"✓ Guest report without photos created: {data['id']}")


class TestDropdownEndpoints:
    """Test endpoints that populate dropdowns - verify data is returned correctly"""
    
    def test_outlets_endpoint_returns_data(self):
        """Test that outlets endpoint returns data for dropdown"""
        response = requests.get(f"{BASE_URL}/api/concierge/outlets")
        assert response.status_code == 200
        data = response.json()
        assert "outlets" in data
        assert len(data["outlets"]) > 0, "Should have at least one outlet"
        
        # Verify outlet structure
        outlet = data["outlets"][0]
        assert "outlet_id" in outlet
        assert "name" in outlet
        assert "type" in outlet
        print(f"✓ Outlets endpoint returns {len(data['outlets'])} outlets")
    
    def test_equipment_endpoint_returns_data(self):
        """Test that equipment endpoint returns data for dropdown"""
        response = requests.get(f"{BASE_URL}/api/concierge/equipment")
        assert response.status_code == 200
        data = response.json()
        assert "equipment" in data
        assert len(data["equipment"]) > 0, "Should have at least one equipment item"
        
        # Verify equipment structure
        eq = data["equipment"][0]
        assert "equipment_id" in eq
        assert "name" in eq
        assert "outlet_id" in eq
        print(f"✓ Equipment endpoint returns {len(data['equipment'])} items")


class TestFullPhotoUploadFlow:
    """Test complete photo upload and ticket creation flow"""
    
    def test_upload_then_create_ticket_with_photo(self):
        """Test uploading a photo and then creating a ticket with it"""
        # Step 1: Upload photo
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {'file': ('full_flow_test.png', io.BytesIO(png_data), 'image/png')}
        upload_response = requests.post(f"{BASE_URL}/api/concierge/upload-photo", files=files)
        assert upload_response.status_code == 200
        photo_url = upload_response.json()["url"]
        print(f"  Step 1: Photo uploaded to {photo_url}")
        
        # Step 2: Create ticket with the uploaded photo
        payload = {
            "guest_name": "TEST_Full_Flow_Guest",
            "room_number": "777",
            "category": "room",
            "priority": "high",
            "title": "TEST_Full_Photo_Flow",
            "description": "Testing complete photo upload flow",
            "photos": [photo_url],
            "reported_by": "staff",
            "reporter_id": ""
        }
        
        ticket_response = requests.post(
            f"{BASE_URL}/api/concierge/guest-report",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert ticket_response.status_code == 200
        ticket = ticket_response.json()
        assert photo_url in ticket.get("photos", []), "Ticket should contain the uploaded photo URL"
        print(f"  Step 2: Ticket created with photo: {ticket['id']}")
        
        # Step 3: Verify photo is still accessible
        serve_response = requests.get(f"{BASE_URL}{photo_url}")
        assert serve_response.status_code == 200
        print(f"  Step 3: Photo still accessible after ticket creation")
        
        print(f"✓ Full photo upload flow completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
