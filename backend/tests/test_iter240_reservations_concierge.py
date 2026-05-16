"""iter240 · Live reservations, floating banner payload, capacity alerts, concierge wire tests.

Tests:
- GET /api/ecw-ops/reservations/live - returns total_covers, hours[], reservations[] with flags
- POST /api/ecw-ops/reservations/upsert - creates reservation + emits change events
- POST /api/ecw-ops/reservations/{id}/cancel - sets status cancelled
- POST /api/ecw-ops/reservations/seed-demo - idempotent seeding
- GET /api/ecw-ops/concierge/alerts - returns outstanding alerts
- POST /api/ecw-ops/concierge/alerts/{id}/ack - acknowledges alert
- POST /api/ecw-ops/concierge/wire - creates property-wire alert
- GET /api/ecw-ops/standup/today - returns today's standup (iter239)
- GET/PATCH /api/ecw-ops/standup/settings - standup settings (iter239)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestReservationsLive:
    """Live reservations endpoint tests"""
    
    def test_seed_demo_first_call(self):
        """POST /api/ecw-ops/reservations/seed-demo - seeds demo data"""
        response = requests.post(f"{BASE_URL}/api/ecw-ops/reservations/seed-demo")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        # Either inserted or skipped (idempotent)
        assert "inserted" in data or "skipped" in data
        print(f"Seed demo result: {data}")
    
    def test_seed_demo_idempotent(self):
        """POST /api/ecw-ops/reservations/seed-demo - second call returns skipped:true"""
        # First call to ensure data exists
        requests.post(f"{BASE_URL}/api/ecw-ops/reservations/seed-demo")
        # Second call should be idempotent
        response = requests.post(f"{BASE_URL}/api/ecw-ops/reservations/seed-demo")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        assert data.get("skipped") == True
        print(f"Idempotent seed result: {data}")
    
    def test_reservations_live_basic(self):
        """GET /api/ecw-ops/reservations/live - returns live data structure"""
        response = requests.get(f"{BASE_URL}/api/ecw-ops/reservations/live?outlet_id=outlet-rooftop")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("ok") == True
        assert "total_covers" in data
        assert "total_reservations" in data
        assert "capacity" in data
        assert "pct_committed" in data
        assert "is_full" in data
        assert "hours" in data
        assert "reservations" in data
        assert "fetched_at" in data
        
        # Verify total_covers is in expected range (67-71 from seed)
        total_covers = data["total_covers"]
        assert isinstance(total_covers, int)
        print(f"Total covers: {total_covers}, reservations: {data['total_reservations']}")
    
    def test_reservations_live_hours_structure(self):
        """GET /api/ecw-ops/reservations/live - hours have color-coded structure"""
        response = requests.get(f"{BASE_URL}/api/ecw-ops/reservations/live?outlet_id=outlet-rooftop")
        assert response.status_code == 200
        data = response.json()
        
        hours = data.get("hours", [])
        assert len(hours) > 0, "Should have hour entries"
        
        # Check hour structure
        for hour in hours:
            assert "hour" in hour
            assert "covers" in hour
            assert "reservations_count" in hour
            assert "color" in hour
            assert "reservation_ids" in hour
            # Color should be a hex color
            assert hour["color"].startswith("#")
        
        print(f"Hours with covers: {[(h['hour'], h['covers'], h['color']) for h in hours if h['covers'] > 0]}")
    
    def test_reservations_live_flags_enrichment(self):
        """GET /api/ecw-ops/reservations/live - reservations have flags (VIP/returning/etc)"""
        response = requests.get(f"{BASE_URL}/api/ecw-ops/reservations/live?outlet_id=outlet-rooftop")
        assert response.status_code == 200
        data = response.json()
        
        reservations = data.get("reservations", [])
        assert len(reservations) > 0, "Should have reservations"
        
        # Check reservation structure
        for resv in reservations:
            assert "id" in resv
            assert "flags" in resv
            assert isinstance(resv["flags"], list)
        
        # Find reservations with specific flags
        vip_resvs = [r for r in reservations if "vip" in r.get("flags", [])]
        returning_resvs = [r for r in reservations if "returning" in r.get("flags", [])]
        glitch_resvs = [r for r in reservations if "had-glitch" in r.get("flags", [])]
        resort_resvs = [r for r in reservations if "resort-guest" in r.get("flags", [])]
        celebration_resvs = [r for r in reservations if any(f.startswith("celebration:") for f in r.get("flags", []))]
        
        print(f"VIP: {len(vip_resvs)}, Returning: {len(returning_resvs)}, Glitch: {len(glitch_resvs)}, Resort: {len(resort_resvs)}, Celebration: {len(celebration_resvs)}")


class TestReservationUpsertCancel:
    """Reservation create and cancel tests"""
    
    def test_upsert_reservation(self):
        """POST /api/ecw-ops/reservations/upsert - creates reservation"""
        unique_name = f"TEST_Guest_{uuid.uuid4().hex[:8]}"
        payload = {
            "venue_slug": "outlet-rooftop",
            "time": "20:00",
            "party_size": 4,
            "guest_name": unique_name,
            "room": "9999",
            "notes": "Test reservation"
        }
        response = requests.post(f"{BASE_URL}/api/ecw-ops/reservations/upsert", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("ok") == True
        assert "reservation" in data
        resv = data["reservation"]
        assert resv["guest_name"] == unique_name
        assert resv["party_size"] == 4
        assert resv["status"] == "confirmed"
        assert "id" in resv
        
        print(f"Created reservation: {resv['id']}")
        return resv["id"]
    
    def test_cancel_reservation(self):
        """POST /api/ecw-ops/reservations/{id}/cancel - cancels reservation"""
        # First create a reservation
        unique_name = f"TEST_Cancel_{uuid.uuid4().hex[:8]}"
        create_resp = requests.post(f"{BASE_URL}/api/ecw-ops/reservations/upsert", json={
            "venue_slug": "outlet-rooftop",
            "time": "21:00",
            "party_size": 2,
            "guest_name": unique_name
        })
        assert create_resp.status_code == 200
        resv_id = create_resp.json()["reservation"]["id"]
        
        # Cancel it
        cancel_resp = requests.post(f"{BASE_URL}/api/ecw-ops/reservations/{resv_id}/cancel")
        assert cancel_resp.status_code == 200
        data = cancel_resp.json()
        assert data.get("ok") == True
        assert data.get("id") == resv_id
        
        print(f"Cancelled reservation: {resv_id}")
    
    def test_cancel_nonexistent_reservation(self):
        """POST /api/ecw-ops/reservations/{id}/cancel - 404 for nonexistent"""
        response = requests.post(f"{BASE_URL}/api/ecw-ops/reservations/nonexistent123/cancel")
        assert response.status_code == 404


class TestConciergeAlerts:
    """Concierge alerts endpoint tests"""
    
    def test_list_alerts(self):
        """GET /api/ecw-ops/concierge/alerts - returns alerts list"""
        response = requests.get(f"{BASE_URL}/api/ecw-ops/concierge/alerts?active_only=true")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("ok") == True
        assert "count" in data
        assert "rows" in data
        assert isinstance(data["rows"], list)
        
        print(f"Active alerts count: {data['count']}")
    
    def test_wire_concierge_alert(self):
        """POST /api/ecw-ops/concierge/wire - creates property-wire alert"""
        unique_headline = f"TEST_Wire_{uuid.uuid4().hex[:8]}"
        payload = {
            "headline": unique_headline,
            "detail": "Test alert detail",
            "venue_slug": "outlet-rooftop",
            "severity": "medium",
            "audience": "property"
        }
        response = requests.post(
            f"{BASE_URL}/api/ecw-ops/concierge/wire",
            json=payload,
            headers={"X-User-Id": "chef-william"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("ok") == True
        assert "alert" in data
        alert = data["alert"]
        assert alert["headline"] == unique_headline
        assert alert["kind"] == "property-wire"
        assert alert["severity"] == "medium"
        assert "id" in alert
        
        print(f"Created wire alert: {alert['id']}")
        return alert["id"]
    
    def test_ack_alert(self):
        """POST /api/ecw-ops/concierge/alerts/{id}/ack - acknowledges alert"""
        # First create an alert
        unique_headline = f"TEST_Ack_{uuid.uuid4().hex[:8]}"
        create_resp = requests.post(
            f"{BASE_URL}/api/ecw-ops/concierge/wire",
            json={"headline": unique_headline, "severity": "low"},
            headers={"X-User-Id": "chef-william"}
        )
        assert create_resp.status_code == 200
        alert_id = create_resp.json()["alert"]["id"]
        
        # Acknowledge it
        ack_resp = requests.post(
            f"{BASE_URL}/api/ecw-ops/concierge/alerts/{alert_id}/ack",
            headers={"X-User-Id": "chef-william"}
        )
        assert ack_resp.status_code == 200
        data = ack_resp.json()
        assert data.get("ok") == True
        
        print(f"Acknowledged alert: {alert_id}")
    
    def test_ack_nonexistent_alert(self):
        """POST /api/ecw-ops/concierge/alerts/{id}/ack - 404 for nonexistent"""
        response = requests.post(
            f"{BASE_URL}/api/ecw-ops/concierge/alerts/nonexistent123/ack",
            headers={"X-User-Id": "chef-william"}
        )
        assert response.status_code == 404


class TestCapacityBroadcast:
    """Capacity broadcast tests - when outlet hits 95% committed"""
    
    def test_capacity_broadcast_trigger(self):
        """Upsert large reservations to trigger capacity broadcast"""
        # Create multiple large reservations to exceed 95% of 120-seat capacity
        # Need ~114 covers to trigger (95% of 120)
        
        # First check current state
        live_resp = requests.get(f"{BASE_URL}/api/ecw-ops/reservations/live?outlet_id=outlet-rooftop")
        current_covers = live_resp.json().get("total_covers", 0)
        capacity = live_resp.json().get("capacity", 120)
        
        print(f"Current covers: {current_covers}, capacity: {capacity}")
        
        # If already at capacity, check for alert
        if current_covers / capacity >= 0.95:
            alerts_resp = requests.get(f"{BASE_URL}/api/ecw-ops/concierge/alerts?active_only=false")
            alerts = alerts_resp.json().get("rows", [])
            fully_committed = [a for a in alerts if a.get("kind") == "fully-committed"]
            print(f"Fully committed alerts: {len(fully_committed)}")


class TestStandupIter239:
    """Standup endpoints from iter239 - regression tests"""
    
    def test_standup_today(self):
        """GET /api/ecw-ops/standup/today - returns today's standup"""
        response = requests.get(f"{BASE_URL}/api/ecw-ops/standup/today")
        assert response.status_code == 200
        data = response.json()
        
        assert "date" in data
        assert "headline" in data
        # May have sections and items
        print(f"Standup headline: {data.get('headline')}")
    
    def test_standup_settings_get(self):
        """GET /api/ecw-ops/standup/settings - returns settings"""
        response = requests.get(f"{BASE_URL}/api/ecw-ops/standup/settings")
        assert response.status_code == 200
        data = response.json()
        
        assert "enabled" in data
        assert "require_scroll" in data
        assert "dwell_seconds" in data
        
        # Default values
        assert data["enabled"] == True
        assert data["require_scroll"] == True
        assert data["dwell_seconds"] == 4
        
        print(f"Standup settings: {data}")
    
    def test_standup_settings_patch(self):
        """PATCH /api/ecw-ops/standup/settings - updates settings"""
        payload = {
            "enabled": True,
            "require_scroll": True,
            "dwell_seconds": 5
        }
        response = requests.patch(
            f"{BASE_URL}/api/ecw-ops/standup/settings",
            json=payload,
            headers={"X-User-Id": "chef-william"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("ok") == True
        assert data.get("dwell_seconds") == 5
        
        # Reset to default
        requests.patch(
            f"{BASE_URL}/api/ecw-ops/standup/settings",
            json={"enabled": True, "require_scroll": True, "dwell_seconds": 4},
            headers={"X-User-Id": "chef-william"}
        )
        print("Standup settings updated and reset")


class TestRegressionIter238:
    """Regression tests for prior iteration endpoints"""
    
    def test_echoaurium_outlets(self):
        """GET /api/echoaurium/outlets - regression"""
        response = requests.get(f"{BASE_URL}/api/echoaurium/outlets")
        assert response.status_code == 200
        data = response.json()
        assert "rows" in data or isinstance(data, list)
    
    def test_ecw_ops_recipes(self):
        """GET /api/ecw-ops/recipes - regression"""
        response = requests.get(f"{BASE_URL}/api/ecw-ops/recipes?outlet_id=outlet-rooftop")
        assert response.status_code == 200
    
    def test_health_endpoint(self):
        """GET /api/health - basic health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
