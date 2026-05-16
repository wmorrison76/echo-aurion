"""
Iteration 70: Spa Module Enhancements Testing
==============================================
Tests for:
- Room assignments for treatments (9 rooms)
- Therapist qualifications (20 qualification types)
- Qualification flag when booking unqualified therapist
- Employee credentials (licenses, certifications, insurance)
- Employee type tracking (in_house vs outsourced)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSpaRooms:
    """Test spa rooms endpoint - 9 rooms with room_type, capacity, equipment, status"""
    
    def test_get_rooms_returns_9_rooms(self):
        response = requests.get(f"{BASE_URL}/api/spa/rooms")
        assert response.status_code == 200
        data = response.json()
        assert "rooms" in data
        rooms = data["rooms"]
        assert len(rooms) == 9, f"Expected 9 rooms, got {len(rooms)}"
    
    def test_rooms_have_required_fields(self):
        response = requests.get(f"{BASE_URL}/api/spa/rooms")
        assert response.status_code == 200
        rooms = response.json()["rooms"]
        for room in rooms:
            assert "id" in room
            assert "name" in room
            assert "room_type" in room
            assert "capacity" in room
            assert "equipment" in room
            assert "status" in room
            assert isinstance(room["equipment"], list)
            assert room["capacity"] >= 1
    
    def test_rooms_have_correct_types(self):
        response = requests.get(f"{BASE_URL}/api/spa/rooms")
        rooms = response.json()["rooms"]
        room_types = [r["room_type"] for r in rooms]
        # Should have treatment, wet, nail, couples, sauna, steam
        expected_types = {"treatment", "wet", "nail", "couples", "sauna", "steam"}
        actual_types = set(room_types)
        assert actual_types.issubset(expected_types) or expected_types.issubset(actual_types), f"Room types: {actual_types}"


class TestSpaTherapists:
    """Test therapists with qualifications, credentials, employee_type"""
    
    def test_get_therapists_returns_list(self):
        response = requests.get(f"{BASE_URL}/api/spa/therapists")
        assert response.status_code == 200
        data = response.json()
        assert "therapists" in data
        assert "qualification_catalog" in data
        assert len(data["therapists"]) >= 6
    
    def test_therapists_have_qualifications_array(self):
        response = requests.get(f"{BASE_URL}/api/spa/therapists")
        therapists = response.json()["therapists"]
        for th in therapists:
            assert "qualifications" in th
            assert isinstance(th["qualifications"], list)
            assert len(th["qualifications"]) > 0, f"Therapist {th['name']} has no qualifications"
    
    def test_therapists_have_credentials_array(self):
        response = requests.get(f"{BASE_URL}/api/spa/therapists")
        therapists = response.json()["therapists"]
        for th in therapists:
            assert "credentials" in th
            assert isinstance(th["credentials"], list)
    
    def test_therapists_have_employee_type(self):
        response = requests.get(f"{BASE_URL}/api/spa/therapists")
        therapists = response.json()["therapists"]
        employee_types = set()
        for th in therapists:
            assert "employee_type" in th
            assert th["employee_type"] in ["in_house", "outsourced", "contractor"]
            employee_types.add(th["employee_type"])
        # Should have both in_house and outsourced
        assert "in_house" in employee_types
        assert "outsourced" in employee_types
    
    def test_therapist_detail_has_qualification_labels(self):
        # Get therapist list first
        response = requests.get(f"{BASE_URL}/api/spa/therapists")
        therapists = response.json()["therapists"]
        therapist_id = therapists[0]["id"]
        
        # Get detail
        detail_response = requests.get(f"{BASE_URL}/api/spa/therapists/{therapist_id}")
        assert detail_response.status_code == 200
        detail = detail_response.json()
        assert "qualification_labels" in detail
        assert isinstance(detail["qualification_labels"], list)
        assert len(detail["qualification_labels"]) > 0
    
    def test_therapist_detail_has_credentials_with_expiry(self):
        response = requests.get(f"{BASE_URL}/api/spa/therapists")
        therapists = response.json()["therapists"]
        # Find therapist with credentials
        therapist_with_creds = next((t for t in therapists if len(t.get("credentials", [])) > 0), None)
        assert therapist_with_creds is not None, "No therapist with credentials found"
        
        detail_response = requests.get(f"{BASE_URL}/api/spa/therapists/{therapist_with_creds['id']}")
        detail = detail_response.json()
        assert "credentials" in detail
        for cred in detail["credentials"]:
            assert "credential_type" in cred
            assert "name" in cred
            assert "expiry_date" in cred or "issue_date" in cred
    
    def test_therapist_detail_has_recent_appointments(self):
        response = requests.get(f"{BASE_URL}/api/spa/therapists")
        therapists = response.json()["therapists"]
        therapist_id = therapists[0]["id"]
        
        detail_response = requests.get(f"{BASE_URL}/api/spa/therapists/{therapist_id}")
        detail = detail_response.json()
        assert "recent_appointments" in detail
        assert isinstance(detail["recent_appointments"], list)


class TestQualificationCheck:
    """Test qualification check endpoint and booking blocks"""
    
    def test_check_qualification_qualified_therapist(self):
        # Get therapists and treatments
        therapists_resp = requests.get(f"{BASE_URL}/api/spa/therapists")
        treatments_resp = requests.get(f"{BASE_URL}/api/spa/treatments")
        
        therapists = therapists_resp.json()["therapists"]
        treatments = treatments_resp.json()["treatments"]
        
        # Find Maria Santos (massage specialist) and Swedish Massage
        maria = next((t for t in therapists if "Maria" in t["name"]), None)
        swedish = next((t for t in treatments if "Swedish" in t["name"]), None)
        
        if maria and swedish:
            response = requests.get(f"{BASE_URL}/api/spa/therapists/{maria['id']}/check-qualification?treatment_id={swedish['id']}")
            assert response.status_code == 200
            data = response.json()
            assert "qualified" in data
            assert data["qualified"] == True
    
    def test_check_qualification_unqualified_therapist(self):
        # Get therapists and treatments
        therapists_resp = requests.get(f"{BASE_URL}/api/spa/therapists")
        treatments_resp = requests.get(f"{BASE_URL}/api/spa/treatments")
        
        therapists = therapists_resp.json()["therapists"]
        treatments = treatments_resp.json()["treatments"]
        
        # Find Aisha Patel (nail tech) and Deep Tissue Massage
        aisha = next((t for t in therapists if "Aisha" in t["name"]), None)
        deep_tissue = next((t for t in treatments if "Deep Tissue" in t["name"]), None)
        
        if aisha and deep_tissue:
            response = requests.get(f"{BASE_URL}/api/spa/therapists/{aisha['id']}/check-qualification?treatment_id={deep_tissue['id']}")
            assert response.status_code == 200
            data = response.json()
            assert "qualified" in data
            assert data["qualified"] == False
            assert "missing_qualifications" in data
            assert len(data["missing_qualifications"]) > 0


class TestQualifications:
    """Test qualifications catalog endpoint"""
    
    def test_get_qualifications_returns_20(self):
        response = requests.get(f"{BASE_URL}/api/spa/qualifications")
        assert response.status_code == 200
        data = response.json()
        assert "qualifications" in data
        quals = data["qualifications"]
        assert len(quals) == 20, f"Expected 20 qualifications, got {len(quals)}"
    
    def test_qualifications_have_required_fields(self):
        response = requests.get(f"{BASE_URL}/api/spa/qualifications")
        quals = response.json()["qualifications"]
        for q in quals:
            assert "id" in q
            assert "label" in q
            assert "category" in q


class TestSpaDashboard:
    """Test dashboard with new KPIs"""
    
    def test_dashboard_has_room_kpis(self):
        response = requests.get(f"{BASE_URL}/api/spa/dashboard")
        assert response.status_code == 200
        data = response.json()
        kpis = data["kpis"]
        assert "total_rooms" in kpis
        assert "available_rooms" in kpis
        assert kpis["total_rooms"] == 9
    
    def test_dashboard_has_flagged_bookings(self):
        response = requests.get(f"{BASE_URL}/api/spa/dashboard")
        kpis = response.json()["kpis"]
        assert "flagged_bookings" in kpis
        assert isinstance(kpis["flagged_bookings"], int)
    
    def test_dashboard_has_expiring_credentials(self):
        response = requests.get(f"{BASE_URL}/api/spa/dashboard")
        kpis = response.json()["kpis"]
        assert "expiring_credentials" in kpis
        assert isinstance(kpis["expiring_credentials"], int)
    
    def test_dashboard_today_schedule_has_room(self):
        response = requests.get(f"{BASE_URL}/api/spa/dashboard")
        data = response.json()
        if data.get("today_schedule"):
            for apt in data["today_schedule"]:
                assert "room_name" in apt or "room_id" in apt


class TestAppointmentQualificationBlock:
    """Test appointment booking blocks unqualified therapist"""
    
    def test_booking_unqualified_therapist_returns_409(self):
        # Get Aisha (nail tech) and Deep Tissue treatment
        therapists_resp = requests.get(f"{BASE_URL}/api/spa/therapists")
        treatments_resp = requests.get(f"{BASE_URL}/api/spa/treatments")
        clients_resp = requests.get(f"{BASE_URL}/api/spa/clients")
        
        therapists = therapists_resp.json()["therapists"]
        treatments = treatments_resp.json()["treatments"]
        clients = clients_resp.json()["clients"]
        
        aisha = next((t for t in therapists if "Aisha" in t["name"]), None)
        deep_tissue = next((t for t in treatments if "Deep Tissue" in t["name"]), None)
        client = clients[0] if clients else None
        
        if aisha and deep_tissue and client:
            response = requests.post(f"{BASE_URL}/api/spa/appointments", json={
                "client_id": client["id"],
                "treatment_id": deep_tissue["id"],
                "therapist_id": aisha["id"],
                "date": "2026-04-20",
                "time": "10:00",
                "override_qualification": False
            })
            assert response.status_code == 409, f"Expected 409, got {response.status_code}"
            data = response.json()
            assert "detail" in data
            detail = data["detail"]
            assert detail.get("error") == "qualification_mismatch"
            assert "missing" in detail
    
    def test_booking_with_override_sets_flag(self):
        # Get Aisha (nail tech) and Deep Tissue treatment
        therapists_resp = requests.get(f"{BASE_URL}/api/spa/therapists")
        treatments_resp = requests.get(f"{BASE_URL}/api/spa/treatments")
        clients_resp = requests.get(f"{BASE_URL}/api/spa/clients")
        
        therapists = therapists_resp.json()["therapists"]
        treatments = treatments_resp.json()["treatments"]
        clients = clients_resp.json()["clients"]
        
        aisha = next((t for t in therapists if "Aisha" in t["name"]), None)
        deep_tissue = next((t for t in treatments if "Deep Tissue" in t["name"]), None)
        client = clients[0] if clients else None
        
        if aisha and deep_tissue and client:
            response = requests.post(f"{BASE_URL}/api/spa/appointments", json={
                "client_id": client["id"],
                "treatment_id": deep_tissue["id"],
                "therapist_id": aisha["id"],
                "date": "2026-04-21",
                "time": "11:00",
                "override_qualification": True
            })
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            data = response.json()
            assert "qualification_flag" in data
            assert data["qualification_flag"] is not None
    
    def test_appointment_has_room_fields(self):
        # Get any appointment
        response = requests.get(f"{BASE_URL}/api/spa/appointments")
        assert response.status_code == 200
        apts = response.json()["appointments"]
        if apts:
            apt = apts[0]
            assert "room_id" in apt or "room_name" in apt
            assert "qualification_flag" in apt


class TestCredentialTypes:
    """Test credential types in therapist data"""
    
    def test_credentials_have_correct_types(self):
        response = requests.get(f"{BASE_URL}/api/spa/therapists")
        therapists = response.json()["therapists"]
        
        credential_types = set()
        for th in therapists:
            for cred in th.get("credentials", []):
                credential_types.add(cred.get("credential_type"))
        
        # Should have license, certification, insurance
        expected = {"license", "certification", "insurance"}
        assert len(credential_types.intersection(expected)) >= 2, f"Found credential types: {credential_types}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
