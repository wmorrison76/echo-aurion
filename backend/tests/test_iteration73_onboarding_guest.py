"""
Iteration 73: Onboarding Wizard & Guest Spa Booking Tests
=========================================================
Tests for:
- Role-based onboarding wizard (3-step guided tour per department)
- Public guest-facing spa booking (treatment selection, availability, booking flow)
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOnboardingWizardSteps:
    """Test onboarding wizard step retrieval by role"""
    
    def test_exec_chef_steps(self):
        """GET /api/onboarding-wizard/steps?role=exec_chef returns 3 culinary-specific steps"""
        response = requests.get(f"{BASE_URL}/api/onboarding-wizard/steps?role=exec_chef")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "steps" in data, "Response should have 'steps' key"
        assert len(data["steps"]) == 3, f"Expected 3 steps, got {len(data['steps'])}"
        assert data["total_steps"] == 3
        
        # Verify culinary-specific content
        step_titles = [s["title"] for s in data["steps"]]
        assert "Your Kitchen Command" in step_titles, "Should have culinary-specific step"
        
        # Verify step structure
        for step in data["steps"]:
            assert "step" in step
            assert "title" in step
            assert "description" in step
            assert "highlight" in step
            assert "group" in step
        
        print(f"PASS: exec_chef gets 3 culinary steps: {step_titles}")
    
    def test_spa_manager_steps(self):
        """GET /api/onboarding-wizard/steps?role=spa_manager returns 3 spa-specific steps"""
        response = requests.get(f"{BASE_URL}/api/onboarding-wizard/steps?role=spa_manager")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["steps"]) == 3
        
        # Verify spa-specific content
        step_titles = [s["title"] for s in data["steps"]]
        assert "Spa Dashboard" in step_titles, "Should have spa-specific step"
        
        # Verify all steps are spa_wellness group
        for step in data["steps"]:
            assert step["group"] == "spa_wellness", f"Spa manager steps should be spa_wellness group, got {step['group']}"
        
        print(f"PASS: spa_manager gets 3 spa steps: {step_titles}")
    
    def test_owner_steps(self):
        """GET /api/onboarding-wizard/steps?role=owner returns 3 owner-specific steps"""
        response = requests.get(f"{BASE_URL}/api/onboarding-wizard/steps?role=owner")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["steps"]) == 3
        
        step_titles = [s["title"] for s in data["steps"]]
        assert "Welcome to LUCCCA" in step_titles
        print(f"PASS: owner gets 3 steps: {step_titles}")
    
    def test_default_role_steps(self):
        """GET /api/onboarding-wizard/steps with no role returns default steps"""
        response = requests.get(f"{BASE_URL}/api/onboarding-wizard/steps")
        assert response.status_code == 200
        
        data = response.json()
        assert data["role"] == "default"
        assert len(data["steps"]) == 3
        print("PASS: Default role returns 3 steps")


class TestOnboardingWizardStatus:
    """Test onboarding wizard status and completion tracking"""
    
    def test_new_user_shows_wizard(self):
        """GET /api/onboarding-wizard/status?user_id=test returns show_wizard=true for new user"""
        # Use unique user ID to ensure fresh state
        test_user = f"test-user-{datetime.now().timestamp()}"
        response = requests.get(f"{BASE_URL}/api/onboarding-wizard/status?user_id={test_user}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["show_wizard"] == True, "New user should see wizard"
        assert data["completed_steps"] == [], "New user should have no completed steps"
        assert data["dismissed"] == False
        print(f"PASS: New user {test_user} sees wizard")
    
    def test_complete_step_marks_completed(self):
        """POST /api/onboarding-wizard/complete-step marks step as completed"""
        test_user = f"test-complete-{datetime.now().timestamp()}"
        
        # Complete step 1
        response = requests.post(f"{BASE_URL}/api/onboarding-wizard/complete-step?user_id={test_user}&step=1")
        assert response.status_code == 200
        
        data = response.json()
        assert data["completed"] == 1
        
        # Verify status shows step completed
        status_response = requests.get(f"{BASE_URL}/api/onboarding-wizard/status?user_id={test_user}")
        status_data = status_response.json()
        assert 1 in status_data["completed_steps"], "Step 1 should be in completed_steps"
        print(f"PASS: Step 1 marked completed for {test_user}")
    
    def test_dismiss_wizard(self):
        """POST /api/onboarding-wizard/dismiss dismisses wizard"""
        test_user = f"test-dismiss-{datetime.now().timestamp()}"
        
        response = requests.post(f"{BASE_URL}/api/onboarding-wizard/dismiss?user_id={test_user}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["dismissed"] == True
        
        # Verify status shows dismissed
        status_response = requests.get(f"{BASE_URL}/api/onboarding-wizard/status?user_id={test_user}")
        status_data = status_response.json()
        assert status_data["dismissed"] == True
        assert status_data["show_wizard"] == False, "Dismissed user should not see wizard"
        print(f"PASS: Wizard dismissed for {test_user}")


class TestGuestBookingTreatments:
    """Test public guest booking treatment menu"""
    
    def test_get_treatments_returns_public_list(self):
        """GET /api/guest-booking/treatments returns public treatments (no internal fields)"""
        response = requests.get(f"{BASE_URL}/api/guest-booking/treatments")
        assert response.status_code == 200
        
        data = response.json()
        assert "treatments" in data
        treatments = data["treatments"]
        
        # Should have treatments (seeded data)
        assert len(treatments) >= 1, "Should have at least 1 treatment"
        
        # Verify public fields only
        for t in treatments:
            assert "id" in t
            assert "name" in t
            assert "category" in t
            assert "description" in t
            assert "duration_mins" in t
            assert "price" in t
            # Should NOT have internal fields
            assert "_id" not in t, "Should not expose MongoDB _id"
            assert "required_qualifications" not in t, "Should not expose internal qualifications"
        
        print(f"PASS: Got {len(treatments)} public treatments")
    
    def test_treatments_have_required_fields(self):
        """Treatments have all required booking fields"""
        response = requests.get(f"{BASE_URL}/api/guest-booking/treatments")
        data = response.json()
        
        if len(data["treatments"]) > 0:
            t = data["treatments"][0]
            assert isinstance(t["price"], (int, float)), "Price should be numeric"
            assert isinstance(t["duration_mins"], int), "Duration should be integer"
            print(f"PASS: Treatment '{t['name']}' has valid price ${t['price']} and duration {t['duration_mins']}min")


class TestGuestBookingAvailability:
    """Test public availability checking"""
    
    def test_get_availability_returns_slots(self):
        """GET /api/guest-booking/availability?date=YYYY-MM-DD returns time slots"""
        # Use tomorrow's date
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/guest-booking/availability?date={tomorrow}")
        assert response.status_code == 200
        
        data = response.json()
        assert "date" in data
        assert data["date"] == tomorrow
        assert "slots" in data
        
        # Should have slots (9am-8pm, every 30 min = 22 slots max)
        slots = data["slots"]
        assert len(slots) >= 1, "Should have at least 1 available slot"
        
        # Verify slot structure
        for slot in slots:
            assert "time" in slot
            assert "available_therapists" in slot
            assert slot["available_therapists"] >= 1
        
        print(f"PASS: Got {len(slots)} available slots for {tomorrow}")
    
    def test_availability_with_treatment_filter(self):
        """Availability can filter by treatment_id"""
        # First get a treatment ID
        treatments_response = requests.get(f"{BASE_URL}/api/guest-booking/treatments")
        treatments = treatments_response.json().get("treatments", [])
        
        if len(treatments) > 0:
            treatment_id = treatments[0]["id"]
            tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
            
            response = requests.get(f"{BASE_URL}/api/guest-booking/availability?date={tomorrow}&treatment_id={treatment_id}")
            assert response.status_code == 200
            
            data = response.json()
            assert data["treatment"] == treatments[0]["name"], "Should return treatment name"
            print(f"PASS: Availability filtered by treatment '{data['treatment']}'")
        else:
            pytest.skip("No treatments available to test filter")


class TestGuestBookingCreate:
    """Test guest booking creation"""
    
    def test_create_booking_success(self):
        """POST /api/guest-booking/book creates pending appointment"""
        # Get a treatment first
        treatments_response = requests.get(f"{BASE_URL}/api/guest-booking/treatments")
        treatments = treatments_response.json().get("treatments", [])
        
        if len(treatments) == 0:
            pytest.skip("No treatments available")
        
        treatment = treatments[0]
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Get available time
        avail_response = requests.get(f"{BASE_URL}/api/guest-booking/availability?date={tomorrow}&treatment_id={treatment['id']}")
        slots = avail_response.json().get("slots", [])
        
        if len(slots) == 0:
            pytest.skip("No available slots")
        
        booking_data = {
            "guest_name": "TEST_John Smith",
            "guest_email": "test.john@example.com",
            "guest_phone": "555-1234",
            "room_number": "412",
            "treatment_id": treatment["id"],
            "preferred_date": tomorrow,
            "preferred_time": slots[0]["time"],
            "notes": "Test booking from pytest"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/guest-booking/book",
            json=booking_data,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "booking_id" in data, "Should return booking_id"
        assert data["status"] == "pending", "New booking should be pending"
        assert data["treatment"] == treatment["name"]
        assert data["date"] == tomorrow
        assert data["time"] == slots[0]["time"]
        assert "therapist" in data, "Should auto-assign therapist"
        assert "price" in data
        
        print(f"PASS: Created booking {data['booking_id']} for {treatment['name']} at {data['time']}")
    
    def test_create_booking_invalid_treatment(self):
        """POST /api/guest-booking/book with invalid treatment returns 404"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        booking_data = {
            "guest_name": "TEST_Invalid",
            "guest_email": "invalid@example.com",
            "treatment_id": "invalid-treatment-id",
            "preferred_date": tomorrow,
            "preferred_time": "10:00"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/guest-booking/book",
            json=booking_data,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 404, f"Expected 404 for invalid treatment, got {response.status_code}"
        print("PASS: Invalid treatment returns 404")


class TestExistingEndpointsStillWork:
    """Verify existing endpoints still work after new features"""
    
    def test_health_endpoint(self):
        """GET /api/health still works"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("PASS: /api/health works")
    
    def test_spa_analytics_endpoint(self):
        """GET /api/dept-analytics/spa still works"""
        response = requests.get(f"{BASE_URL}/api/dept-analytics/spa")
        assert response.status_code == 200
        print("PASS: /api/dept-analytics/spa works")
    
    def test_integrations_status(self):
        """GET /api/integrations/status still works"""
        response = requests.get(f"{BASE_URL}/api/integrations/status")
        assert response.status_code == 200
        print("PASS: /api/integrations/status works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
