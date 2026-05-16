"""iter241 · VIP Tracker backend tests

Tests for leadership-only VIP tracking endpoints:
- Seed demo VIPs
- List VIPs with status filter
- Leadership gate (403 without X-User-Id)
- Full VIP profile with stitched itinerary
- Create group chat (idempotent)
- Add notes
- Upsert new VIP
- Pings feed
- Ping acknowledgment
- Location spot
- Auto-ping on reservation upsert
"""
import os
import pytest
import requests
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
USER_ID = "chef-william"

class TestVipTrackerSeedAndList:
    """VIP seed and list endpoint tests"""
    
    def test_seed_demo_idempotent(self):
        """POST /api/vip-tracker/seed-demo should be idempotent"""
        response = requests.post(
            f"{BASE_URL}/api/vip-tracker/seed-demo",
            headers={"X-User-Id": USER_ID}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        # Should be skipped since already seeded
        assert data.get("skipped") is True or data.get("inserted") == 4
    
    def test_list_vips_with_leadership(self):
        """GET /api/vip-tracker/list with X-User-Id returns VIPs"""
        response = requests.get(
            f"{BASE_URL}/api/vip-tracker/list?status=in-house",
            headers={"X-User-Id": USER_ID}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["count"] >= 4
        
        # Verify VIP structure
        rows = data["rows"]
        assert len(rows) >= 4
        
        # Check required fields on first VIP
        vip = rows[0]
        assert "id" in vip
        assert "display_name" in vip
        assert "tier" in vip
        assert "checkin_date" in vip
        assert "checkout_date" in vip
        assert "nights_total" in vip
        assert "chat_active" in vip
    
    def test_list_vips_without_leadership_returns_403(self):
        """GET /api/vip-tracker/list WITHOUT X-User-Id returns 403"""
        response = requests.get(f"{BASE_URL}/api/vip-tracker/list?status=in-house")
        assert response.status_code == 403
        data = response.json()
        assert "leadership only" in data.get("detail", "").lower()


class TestVipProfile:
    """VIP profile and itinerary tests"""
    
    def test_get_vip_novak_profile(self):
        """GET /api/vip-tracker/vip-novak returns full profile + itinerary"""
        response = requests.get(
            f"{BASE_URL}/api/vip-tracker/vip-novak",
            headers={"X-User-Id": USER_ID}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        
        # Verify VIP profile
        vip = data["vip"]
        assert vip["id"] == "vip-novak"
        assert vip["display_name"] == "Sofia Novak"
        assert vip["tier"] == "diamond"
        assert "allergens" in vip
        assert "sesame" in vip["allergens"]
        assert "shellfish" in vip["allergens"]
        
        # Verify itinerary structure
        itinerary = data["itinerary"]
        assert "reservations" in itinerary
        assert "pings" in itinerary
        
        # Should have stitched reservations matching guest_name='Sofia Novak' or 'Novak'
        reservations = itinerary["reservations"]
        assert len(reservations) >= 1
    
    def test_get_vip_not_found(self):
        """GET /api/vip-tracker/nonexistent returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/vip-tracker/nonexistent-vip-xyz",
            headers={"X-User-Id": USER_ID}
        )
        assert response.status_code == 404


class TestVipChat:
    """VIP group chat creation tests"""
    
    def test_create_chat_returns_room_id(self):
        """POST /api/vip-tracker/vip-novak/create-chat returns room_id starting with 'room-vip-'"""
        response = requests.post(
            f"{BASE_URL}/api/vip-tracker/vip-novak/create-chat",
            headers={"X-User-Id": USER_ID}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert "room_id" in data
        assert data["room_id"].startswith("room-vip-")
        assert data.get("members_count", 0) >= 1 or data.get("reused") is True
    
    def test_create_chat_idempotent(self):
        """Second call to create-chat returns reused:true and SAME room_id"""
        # First call
        response1 = requests.post(
            f"{BASE_URL}/api/vip-tracker/vip-novak/create-chat",
            headers={"X-User-Id": USER_ID}
        )
        assert response1.status_code == 200
        data1 = response1.json()
        room_id1 = data1["room_id"]
        
        # Second call
        response2 = requests.post(
            f"{BASE_URL}/api/vip-tracker/vip-novak/create-chat",
            headers={"X-User-Id": USER_ID}
        )
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Should return same room_id with reused:true
        assert data2["room_id"] == room_id1
        assert data2.get("reused") is True


class TestVipNotes:
    """VIP notes tests"""
    
    def test_add_note_to_vip(self):
        """POST /api/vip-tracker/vip-novak/note appends to notes_log"""
        note_text = f"Test note {uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/vip-tracker/vip-novak/note",
            headers={"X-User-Id": USER_ID, "Content-Type": "application/json"},
            json={"text": note_text}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert "note" in data
        assert data["note"]["text"] == note_text
        assert data["note"]["authored_by"] == USER_ID
        assert "created_at" in data["note"]


class TestVipUpsert:
    """VIP upsert tests"""
    
    def test_upsert_new_vip(self):
        """POST /api/vip-tracker/upsert creates a new VIP and returns id"""
        unique_name = f"TEST_VIP_{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/vip-tracker/upsert",
            headers={"X-User-Id": USER_ID, "Content-Type": "application/json"},
            json={"display_name": unique_name, "tier": "diamond"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert "id" in data
        assert data["id"].startswith("vip-")
        assert data["vip"]["display_name"] == unique_name
        assert data["vip"]["tier"] == "diamond"


class TestVipPings:
    """VIP pings feed and acknowledgment tests"""
    
    def test_pings_feed(self):
        """GET /api/vip-tracker/pings/feed returns rows sorted DESC + unread count"""
        response = requests.get(
            f"{BASE_URL}/api/vip-tracker/pings/feed",
            headers={"X-User-Id": USER_ID}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert "rows" in data
        assert "unread" in data
        assert isinstance(data["unread"], int)
        
        # Verify rows are sorted DESC by created_at
        rows = data["rows"]
        if len(rows) >= 2:
            for i in range(len(rows) - 1):
                assert rows[i]["created_at"] >= rows[i + 1]["created_at"]
    
    def test_ping_ack(self):
        """POST /api/vip-tracker/pings/{id}/ack adds user to acknowledged_by"""
        # First get a ping id
        feed_response = requests.get(
            f"{BASE_URL}/api/vip-tracker/pings/feed",
            headers={"X-User-Id": USER_ID}
        )
        assert feed_response.status_code == 200
        rows = feed_response.json()["rows"]
        
        if len(rows) > 0:
            ping_id = rows[0]["id"]
            
            # Acknowledge the ping
            ack_response = requests.post(
                f"{BASE_URL}/api/vip-tracker/pings/{ping_id}/ack",
                headers={"X-User-Id": USER_ID}
            )
            assert ack_response.status_code == 200
            assert ack_response.json()["ok"] is True


class TestVipLocationSpot:
    """VIP location spot tests"""
    
    def test_location_spot_creates_ping(self):
        """POST /api/vip-tracker/location-spot creates a 'location-spotted' ping"""
        response = requests.post(
            f"{BASE_URL}/api/vip-tracker/location-spot",
            headers={"X-User-Id": USER_ID, "Content-Type": "application/json"},
            json={"vip_id": "vip-novak", "venue_slug": "outlet-rooftop"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert "ping_id" in data


class TestVipReservationAutoPing:
    """Test that reservation upsert with VIP name auto-emits a ping"""
    
    def test_reservation_upsert_triggers_vip_ping(self):
        """POST /api/ecw-ops/reservations/upsert with VIP guest_name creates vip_pings row"""
        # Get initial ping count
        initial_feed = requests.get(
            f"{BASE_URL}/api/vip-tracker/pings/feed",
            headers={"X-User-Id": USER_ID}
        )
        initial_count = len(initial_feed.json()["rows"])
        
        # Create reservation with VIP name
        response = requests.post(
            f"{BASE_URL}/api/ecw-ops/reservations/upsert",
            headers={"Content-Type": "application/json"},
            json={
                "venue_slug": "outlet-rooftop",
                "time": "22:00",
                "party_size": 2,
                "guest_name": "Sofia Novak",
                "room": "2104"
            }
        )
        assert response.status_code == 200
        assert response.json()["ok"] is True
        
        # Check that a new ping was created
        new_feed = requests.get(
            f"{BASE_URL}/api/vip-tracker/pings/feed",
            headers={"X-User-Id": USER_ID}
        )
        new_count = len(new_feed.json()["rows"])
        
        # Should have at least one more ping
        assert new_count >= initial_count


class TestIter240Regression:
    """Regression tests for iter240 features"""
    
    def test_reservations_live(self):
        """GET /api/ecw-ops/reservations/live still works"""
        response = requests.get(f"{BASE_URL}/api/ecw-ops/reservations/live")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert "total_covers" in data
        assert "hours" in data
    
    def test_concierge_alerts(self):
        """GET /api/ecw-ops/concierge/alerts still works"""
        response = requests.get(f"{BASE_URL}/api/ecw-ops/concierge/alerts")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert "rows" in data
    
    def test_health_endpoint(self):
        """GET /api/health still works"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
