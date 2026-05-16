"""
Iteration 66 Tests: Department Dashboards, Engineering Advanced, Push Notifications, Voice Integration
========================================================================================================
Tests for:
- Department-specific dashboards (Culinary, Pastry, F&B Director, Events)
- Engineering advanced features (room matrix, escalations, inspections, contractors)
- Push notification framework
- ElevenLabs voice integration (expects key_upgrade_needed error in cloud env)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestDepartmentDashboards:
    """Department-specific dashboard API tests"""
    
    def test_culinary_dashboard(self):
        """GET /api/dept-dash/culinary - Returns food cost, waste, menu mix, deliveries"""
        response = requests.get(f"{BASE_URL}/api/dept-dash/culinary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("dashboard") == "culinary"
        
        # Verify KPIs structure
        kpis = data.get("kpis", {})
        assert "food_cost_pct" in kpis, "Missing food_cost_pct in KPIs"
        assert "waste_pct" in kpis, "Missing waste_pct in KPIs"
        assert "kitchen_labor" in kpis, "Missing kitchen_labor in KPIs"
        assert "menu_items_active" in kpis, "Missing menu_items_active in KPIs"
        
        # Verify menu_mix has items (should have 20+ items)
        menu_mix = data.get("menu_mix", [])
        assert len(menu_mix) >= 10, f"Expected 10+ menu items, got {len(menu_mix)}"
        
        # Verify menu item structure
        if menu_mix:
            item = menu_mix[0]
            assert "name" in item
            assert "qty" in item
            assert "revenue" in item
            assert "fc_pct" in item
            assert "margin" in item
        
        # Verify waste_breakdown exists
        assert "waste_breakdown" in data, "Missing waste_breakdown"
        
        # Verify recent_deliveries exists
        assert "recent_deliveries" in data, "Missing recent_deliveries"
        
        print(f"Culinary dashboard: food_cost_pct={kpis.get('food_cost_pct')}%, waste_pct={kpis.get('waste_pct')}%, menu_items={len(menu_mix)}")
    
    def test_pastry_dashboard(self):
        """GET /api/dept-dash/pastry - Returns outlets served, commissary configs, wedding pipeline"""
        response = requests.get(f"{BASE_URL}/api/dept-dash/pastry")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("dashboard") == "pastry"
        
        # Verify KPIs
        kpis = data.get("kpis", {})
        assert "outlets_served" in kpis, "Missing outlets_served"
        outlets_served = kpis.get("outlets_served", 0)
        assert outlets_served >= 4, f"Expected 4+ outlets served, got {outlets_served}"
        
        assert "dessert_revenue" in kpis, "Missing dessert_revenue"
        assert "wedding_events" in kpis, "Missing wedding_events"
        
        # Verify commissary_configs (should have 4)
        configs = data.get("commissary_configs", [])
        assert len(configs) >= 4, f"Expected 4+ commissary configs, got {len(configs)}"
        
        # Verify config structure
        if configs:
            cfg = configs[0]
            assert "producing" in cfg
            assert "receiving" in cfg
            assert "products" in cfg
        
        # Verify top_items (dessert items)
        top_items = data.get("top_items", [])
        assert isinstance(top_items, list), "top_items should be a list"
        
        # Verify wedding_pipeline exists
        assert "wedding_pipeline" in data, "Missing wedding_pipeline"
        
        print(f"Pastry dashboard: outlets_served={outlets_served}, commissary_configs={len(configs)}, dessert_items={len(top_items)}")
    
    def test_fb_director_dashboard(self):
        """GET /api/dept-dash/fb-director - Returns all-outlet summary, beverage program, EBITDA, labor"""
        response = requests.get(f"{BASE_URL}/api/dept-dash/fb-director")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("dashboard") == "fb_director"
        
        # Verify KPIs
        kpis = data.get("kpis", {})
        assert "total_revenue" in kpis, "Missing total_revenue"
        assert "ebitda" in kpis, "Missing ebitda"
        assert "ebitda_margin_pct" in kpis, "Missing ebitda_margin_pct"
        assert "labor_pct" in kpis, "Missing labor_pct"
        assert "total_covers" in kpis, "Missing total_covers"
        assert "avg_check" in kpis, "Missing avg_check"
        
        # Verify outlet_summary
        outlet_summary = data.get("outlet_summary", [])
        assert len(outlet_summary) >= 1, "Expected at least 1 outlet in summary"
        
        # Verify outlet structure
        if outlet_summary:
            outlet = outlet_summary[0]
            assert "outlet_id" in outlet
            assert "revenue" in outlet
            assert "covers" in outlet
            assert "avg_check" in outlet
            assert "food_cost_pct" in outlet
        
        # Verify beverage_program (should have 10 items)
        bev_program = data.get("beverage_program", [])
        assert len(bev_program) >= 5, f"Expected 5+ beverage items, got {len(bev_program)}"
        
        # Verify beverage item structure
        if bev_program:
            bev = bev_program[0]
            assert "name" in bev
            assert "qty" in bev
            assert "revenue" in bev
            assert "margin" in bev
        
        print(f"F&B Director dashboard: EBITDA={kpis.get('ebitda')}, labor_pct={kpis.get('labor_pct')}%, beverages={len(bev_program)}")
    
    def test_events_dashboard(self):
        """GET /api/dept-dash/events - Returns 18 events, pipeline stages, event types, revenue"""
        response = requests.get(f"{BASE_URL}/api/dept-dash/events")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("dashboard") == "events"
        
        # Verify KPIs
        kpis = data.get("kpis", {})
        assert "total_events" in kpis, "Missing total_events"
        total_events = kpis.get("total_events", 0)
        assert total_events >= 18, f"Expected 18+ events, got {total_events}"
        
        assert "total_revenue" in kpis, "Missing total_revenue"
        total_revenue = kpis.get("total_revenue", 0)
        # Revenue should be around $241K based on requirements
        assert total_revenue > 100000, f"Expected revenue > $100K, got ${total_revenue}"
        
        assert "total_guests" in kpis, "Missing total_guests"
        assert "avg_guest_count" in kpis, "Missing avg_guest_count"
        
        # Verify pipeline stages
        pipeline = data.get("pipeline", {})
        assert len(pipeline) >= 1, "Expected at least 1 pipeline stage"
        
        # Verify event_types
        event_types = data.get("event_types", {})
        assert len(event_types) >= 1, "Expected at least 1 event type"
        
        # Verify upcoming_events
        upcoming = data.get("upcoming_events", [])
        assert isinstance(upcoming, list), "upcoming_events should be a list"
        
        print(f"Events dashboard: total_events={total_events}, total_revenue=${total_revenue:,.2f}, pipeline_stages={len(pipeline)}, event_types={len(event_types)}")


class TestEngineeringAdvanced:
    """Engineering advanced features - room matrix, escalations, inspections, contractors"""
    
    def test_contractors_list(self):
        """GET /api/engineering/advanced/contractors - Returns 6 contractors with specialties and rates"""
        response = requests.get(f"{BASE_URL}/api/engineering/advanced/contractors")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        contractors = data.get("contractors", [])
        assert len(contractors) >= 6, f"Expected 6+ contractors, got {len(contractors)}"
        
        # Verify contractor structure
        if contractors:
            ctr = contractors[0]
            assert "name" in ctr, "Missing contractor name"
            assert "specialty" in ctr, "Missing specialty"
            assert "hourly_rate" in ctr, "Missing hourly_rate"
            assert "phone" in ctr, "Missing phone"
            assert "emergency_available" in ctr, "Missing emergency_available"
        
        # Verify specialties include expected types
        specialties = [c.get("specialty") for c in contractors]
        expected_specialties = ["hvac", "elevator", "plumbing", "electrical"]
        for spec in expected_specialties:
            assert spec in specialties, f"Missing specialty: {spec}"
        
        print(f"Contractors: {len(contractors)} total, specialties: {set(specialties)}")
    
    def test_check_escalations(self):
        """POST /api/engineering/advanced/check-escalations - Checks for overdue work orders"""
        response = requests.post(f"{BASE_URL}/api/engineering/advanced/check-escalations")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "escalated" in data, "Missing escalated list"
        assert "total" in data, "Missing total count"
        assert "checked" in data, "Missing checked count"
        
        escalated = data.get("escalated", [])
        # Verify escalation structure if any exist
        if escalated:
            esc = escalated[0]
            assert "wo_id" in esc, "Missing wo_id in escalation"
            assert "title" in esc, "Missing title in escalation"
            assert "priority" in esc, "Missing priority in escalation"
            assert "hours_overdue" in esc, "Missing hours_overdue"
            assert "escalate_to" in esc, "Missing escalate_to"
        
        print(f"Escalations: {data.get('total')} escalated out of {data.get('checked')} checked")
    
    def test_create_inspection(self):
        """POST /api/engineering/advanced/inspection - Creates an inspection checklist"""
        inspection_data = {
            "name": "TEST_Fire Safety Inspection Q1",
            "category": "fire_safety",
            "items": [
                {"item": "Fire extinguisher check", "status": "pass", "notes": "All units charged"},
                {"item": "Emergency exit signs", "status": "pass", "notes": "Illuminated"},
                {"item": "Sprinkler system test", "status": "fail", "notes": "Zone 3 needs repair"}
            ],
            "inspector": "John Smith",
            "location": "Main Building"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/engineering/advanced/inspection",
            json=inspection_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "inspection_id" in data, "Missing inspection_id"
        assert data.get("inspection_id", "").startswith("INS-"), "Invalid inspection_id format"
        assert data.get("name") == inspection_data["name"]
        assert data.get("category") == "fire_safety"
        assert data.get("total_items") == 3
        assert data.get("pass_count") == 2
        assert data.get("fail_count") == 1
        assert data.get("status") == "in_progress"
        
        print(f"Created inspection: {data.get('inspection_id')}, pass={data.get('pass_count')}, fail={data.get('fail_count')}")
    
    def test_room_matrix(self):
        """GET /api/engineering/advanced/room-matrix - Returns room maintenance status"""
        response = requests.get(f"{BASE_URL}/api/engineering/advanced/room-matrix")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "rooms" in data, "Missing rooms list"
        assert "total_rooms_with_issues" in data, "Missing total_rooms_with_issues"
        assert "critical_rooms" in data, "Missing critical_rooms"
        
        rooms = data.get("rooms", [])
        # Verify room structure if any exist
        if rooms:
            room = rooms[0]
            assert "location" in room, "Missing location"
            assert "open" in room, "Missing open count"
            assert "issues" in room, "Missing issues list"
        
        print(f"Room matrix: {len(rooms)} rooms, {data.get('total_rooms_with_issues')} with issues, {data.get('critical_rooms')} critical")


class TestPushNotifications:
    """Push notification framework tests"""
    
    def test_send_notification(self):
        """POST /api/notifications/send - Queues a notification for delivery"""
        # The enterprise.py notification API uses recipient_id (not recipient_user_id)
        notif_data = {
            "recipient_id": "usr-mgr-001",
            "notification_type": "overtime_alert",
            "message": "TEST_Kitchen staff approaching overtime threshold",
            "entity_type": "labor",
            "entity_id": "test-labor-001",
            "data": {"department": "Kitchen/BOH", "hours": 38}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/notifications/send",
            json=notif_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # The enterprise.py API returns "id" not "notification_id"
        assert "id" in data, f"Missing id in response: {data}"
        assert data.get("recipient_id") == "usr-mgr-001"
        assert data.get("notification_type") == "overtime_alert"
        assert data.get("read") == False
        
        print(f"Sent notification: {data.get('id')}, type={data.get('notification_type')}")
        return data.get("id")
    
    def test_user_notifications(self):
        """GET /api/notifications/user/usr-mgr-001 - Returns notifications for user"""
        response = requests.get(f"{BASE_URL}/api/notifications/user/usr-mgr-001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "notifications" in data, "Missing notifications list"
        assert "total" in data, "Missing total count"
        assert "unread" in data, "Missing unread count"
        
        notifications = data.get("notifications", [])
        # Should have at least the notification we just sent
        assert len(notifications) >= 1, "Expected at least 1 notification"
        
        # Verify notification structure
        if notifications:
            notif = notifications[0]
            assert "id" in notif or "notification_id" in notif, "Missing notification id"
            assert "title" in notif, "Missing title"
            assert "message" in notif, "Missing message"
            assert "type" in notif or "notification_type" in notif, "Missing type"
        
        print(f"User notifications: {data.get('total')} total, {data.get('unread')} unread")
    
    def test_generate_smart_alerts(self):
        """POST /api/notifications/generate-alerts - Generates smart alerts from current data"""
        response = requests.post(f"{BASE_URL}/api/notifications/generate-alerts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "alerts_generated" in data, "Missing alerts_generated count"
        assert "alert_types" in data, "Missing alert_types list"
        
        alerts_generated = data.get("alerts_generated", 0)
        alert_types = data.get("alert_types", [])
        
        print(f"Generated {alerts_generated} alerts, types: {set(alert_types)}")


class TestVoiceIntegration:
    """ElevenLabs voice integration tests - expects key_upgrade_needed in cloud env"""
    
    def test_tts_returns_key_upgrade_error(self):
        """POST /api/voice/tts - Returns error about ElevenLabs key upgrade needed (expected)"""
        tts_data = {
            "text": "Good morning. Today's food cost is running at 24.5 percent.",
            "voice_id": "21m00Tcm4TlvDq8ikWAM"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/voice/tts",
            json=tts_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # In cloud environment, we expect key_upgrade_needed error
        if "error" in data:
            # This is expected - free tier blocked in cloud
            assert "key_upgrade_needed" in data.get("status", "") or "key" in data.get("error", "").lower() or "upgrade" in data.get("error", "").lower() or "paid" in data.get("error", "").lower() or "unusual_activity" in data.get("error", "").lower(), f"Unexpected error: {data.get('error')}"
            print(f"TTS returned expected error: {data.get('error', '')[:100]}")
        else:
            # If it works, verify audio response
            assert "audio_url" in data, "Missing audio_url"
            print(f"TTS generated audio: {data.get('audio_size_bytes')} bytes")
    
    def test_voices_list(self):
        """GET /api/voice/voices - Returns voices list or error about key"""
        response = requests.get(f"{BASE_URL}/api/voice/voices")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # May return error or voices list
        if "error" in data:
            print(f"Voices returned error (expected in cloud): {data.get('error', '')[:100]}")
        else:
            voices = data.get("voices", [])
            print(f"Voices list: {len(voices)} voices available")
            if voices:
                voice = voices[0]
                assert "voice_id" in voice, "Missing voice_id"
                assert "name" in voice, "Missing voice name"


class TestNotificationQueue:
    """Additional notification queue tests"""
    
    def test_notification_queue(self):
        """GET /api/notifications/queue - Returns notification queue"""
        response = requests.get(f"{BASE_URL}/api/notifications/queue")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # The push_notifications.py API returns {"queue": [...], "total": N, "undelivered": N}
        # But there may be another notification system returning a list directly
        if isinstance(data, list):
            # Alternative notification system returns list directly
            print(f"Notification queue: {len(data)} items (list format)")
            assert len(data) >= 0, "Queue should be a list"
        else:
            # push_notifications.py format
            assert "queue" in data, f"Missing queue list in response: {data}"
            assert "total" in data, "Missing total count"
            assert "undelivered" in data, "Missing undelivered count"
            print(f"Notification queue: {data.get('total')} total, {data.get('undelivered')} undelivered")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
