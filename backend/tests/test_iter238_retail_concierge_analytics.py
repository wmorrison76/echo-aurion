"""iter238 · Retail outlets + employees + schedule + concierge v2 + analytics tests.

Tests:
- Retail outlet seeding (6 outlets, 18 employees)
- Employee search with availability filters
- Employee messaging
- Hours of operation (base + seasonal overrides)
- Schedule platform (save/get/push)
- Concierge amenity dispatch
- Guest issue logging with severity emoji
- Issue elevation
- Valet and housekeeping requests
- Off-property suggestions
- Maestro BEO recent
- Purchasing groups and price comparison
- Outlet analytics (kind-aware KPIs)
- Regression tests for prior endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
HEADERS = {"Content-Type": "application/json", "X-User-Id": "chef-william"}


class TestRetailOutletSeeding:
    """Test retail outlet and employee seeding"""

    def test_seed_retail_outlets(self):
        """POST /api/outlets/seed-retail returns ok with 6 outlets and 18 employees"""
        r = requests.post(f"{BASE_URL}/api/outlets/seed-retail", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("outlets_added") == 6
        assert data.get("employees_seeded") == 18
        print(f"✓ Seeded {data['outlets_added']} outlets, {data['employees_seeded']} employees")

    def test_list_retail_outlets(self):
        """GET /api/outlets/retail returns 6 rows including third-party outlet"""
        r = requests.get(f"{BASE_URL}/api/outlets/retail", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("count") == 6
        rows = data.get("rows", [])
        
        # Check for Everything But Water (third-party)
        swim_outlet = next((o for o in rows if o.get("id") == "outlet-swim"), None)
        assert swim_outlet is not None, "outlet-swim not found"
        assert swim_outlet.get("owned_by") == "third-party"
        assert swim_outlet.get("revenue_share_pct") == 15.0
        print(f"✓ Found 6 retail outlets including third-party 'Everything But Water'")

    def test_list_all_outlets(self):
        """GET /api/outlets/all returns F&B + retail outlets"""
        r = requests.get(f"{BASE_URL}/api/outlets/all", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        # Should have at least 6 retail + existing F&B outlets
        assert data.get("count") >= 6
        print(f"✓ All outlets list has {data['count']} outlets")


class TestEmployeeDirectory:
    """Test employee search and messaging"""

    def test_list_employees_by_outlet(self):
        """GET /api/employees?outlet_id=outlet-salon returns 3 employees"""
        r = requests.get(f"{BASE_URL}/api/employees?outlet_id=outlet-salon", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("count") == 3
        rows = data.get("rows", [])
        
        # Check positions
        positions = {e.get("position") for e in rows}
        assert "Stylist" in positions or "Colorist" in positions or "Nail Technician" in positions
        
        # Check color_tag is set
        for emp in rows:
            assert emp.get("color_tag") is not None
        print(f"✓ Found 3 employees for outlet-salon with positions and color_tags")

    def test_filter_employees_by_availability(self):
        """GET /api/employees?available_day=fri&available_slot=evening filters correctly"""
        r = requests.get(
            f"{BASE_URL}/api/employees?available_day=fri&available_slot=evening",
            headers=HEADERS
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        # All returned employees should have fri.evening = true
        for emp in data.get("rows", []):
            avail = emp.get("availability", {})
            assert avail.get("fri", {}).get("evening") is True
        print(f"✓ Availability filter works, found {data['count']} employees available Fri evening")

    def test_message_employee(self):
        """POST /api/employees/{id}/message returns ok with message_id"""
        # First get an employee
        r = requests.get(f"{BASE_URL}/api/employees?outlet_id=outlet-salon&limit=1", headers=HEADERS)
        assert r.status_code == 200
        emp = r.json().get("rows", [{}])[0]
        emp_id = emp.get("id")
        assert emp_id, "No employee found"
        
        # Send message
        r = requests.post(
            f"{BASE_URL}/api/employees/{emp_id}/message",
            headers=HEADERS,
            json={"text": "TEST_message from iter238 test"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("message_id") is not None
        assert "sms_queued" in data
        print(f"✓ Message sent to employee {emp_id}, message_id={data['message_id']}")


class TestHoursOfOperation:
    """Test hours of operation endpoints"""

    def test_get_outlet_hours_default(self):
        """GET /api/outlets/{id}/hours returns default when no doc exists"""
        r = requests.get(f"{BASE_URL}/api/outlets/outlet-salon/hours", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("outlet_id") == "outlet-salon"
        assert "base_hours" in data
        # Check default hours structure
        base = data.get("base_hours", {})
        assert "mon" in base
        assert base["mon"].get("open") == "09:00"
        print(f"✓ Got default hours for outlet-salon")

    def test_update_base_hours(self):
        """PATCH /api/outlets/{id}/hours with base_hours updates and persists"""
        new_hours = {
            "mon": {"open": "10:00", "close": "20:00", "closed": False},
            "tue": {"open": "10:00", "close": "20:00", "closed": False},
            "wed": {"open": "10:00", "close": "20:00", "closed": False},
            "thu": {"open": "10:00", "close": "20:00", "closed": False},
            "fri": {"open": "10:00", "close": "22:00", "closed": False},
            "sat": {"open": "10:00", "close": "22:00", "closed": False},
            "sun": {"open": "11:00", "close": "19:00", "closed": False},
        }
        r = requests.patch(
            f"{BASE_URL}/api/outlets/outlet-menswear/hours",
            headers=HEADERS,
            json={"base_hours": new_hours}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        
        # Verify persistence
        r2 = requests.get(f"{BASE_URL}/api/outlets/outlet-menswear/hours", headers=HEADERS)
        assert r2.status_code == 200
        data = r2.json()
        assert data.get("base_hours", {}).get("mon", {}).get("open") == "10:00"
        print(f"✓ Base hours updated and persisted for outlet-menswear")

    def test_update_seasonal_overrides(self):
        """PATCH /api/outlets/{id}/hours with seasonal_overrides persists the array"""
        overrides = [
            {
                "name": "Spring Break 2026",
                "start_date": "2026-03-15",
                "end_date": "2026-04-15",
                "hours": {
                    "mon": {"open": "08:00", "close": "23:00", "closed": False},
                    "tue": {"open": "08:00", "close": "23:00", "closed": False},
                }
            }
        ]
        r = requests.patch(
            f"{BASE_URL}/api/outlets/outlet-kids/hours",
            headers=HEADERS,
            json={"seasonal_overrides": overrides}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        
        # Verify persistence
        r2 = requests.get(f"{BASE_URL}/api/outlets/outlet-kids/hours", headers=HEADERS)
        assert r2.status_code == 200
        data = r2.json()
        saved_overrides = data.get("seasonal_overrides", [])
        assert len(saved_overrides) == 1
        assert saved_overrides[0].get("name") == "Spring Break 2026"
        print(f"✓ Seasonal overrides persisted for outlet-kids")


class TestSchedulePlatform:
    """Test schedule save/get/push"""

    def test_save_schedule_week(self):
        """POST /api/schedules/week saves a week's schedule"""
        # Get an employee ID first
        r = requests.get(f"{BASE_URL}/api/employees?outlet_id=outlet-salon&limit=1", headers=HEADERS)
        emp_id = r.json().get("rows", [{}])[0].get("id", "emp-test")
        
        schedule_data = {
            "outlet_id": "outlet-salon",
            "week_start": "2026-04-20",
            "shifts": [
                {"employee_id": emp_id, "start": "2026-04-20T09:00:00", "end": "2026-04-20T17:00:00", "role": "Stylist"},
                {"employee_id": emp_id, "start": "2026-04-21T09:00:00", "end": "2026-04-21T17:00:00", "role": "Stylist"},
            ]
        }
        r = requests.post(f"{BASE_URL}/api/schedules/week", headers=HEADERS, json=schedule_data)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("schedule_id") is not None
        assert data.get("shift_count") == 2
        print(f"✓ Schedule saved: {data['schedule_id']} with {data['shift_count']} shifts")

    def test_get_schedule_week(self):
        """GET /api/schedules/week returns the saved week"""
        r = requests.get(
            f"{BASE_URL}/api/schedules/week?outlet_id=outlet-salon&week_start=2026-04-20",
            headers=HEADERS
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert len(data.get("shifts", [])) >= 2
        print(f"✓ Retrieved schedule with {len(data.get('shifts', []))} shifts")

    def test_push_schedule(self):
        """POST /api/schedules/{schedule_id}/push queues messages"""
        schedule_id = "sched-outlet-salon-2026-04-20"
        r = requests.post(
            f"{BASE_URL}/api/schedules/{schedule_id}/push",
            headers=HEADERS,
            json={"mode": "sms"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("twilio_live") is False  # Stub mode
        assert data.get("queued_count") >= 0
        print(f"✓ Schedule push queued {data['queued_count']} messages (twilio_live={data['twilio_live']})")


class TestConciergeAmenity:
    """Test concierge amenity dispatch"""

    def test_dispatch_amenity(self):
        """POST /api/concierge/amenity creates amenity + guest profile + 3 activity events"""
        amenity_data = {
            "guest_room": "TEST_2104",
            "guest_first": "TEST_John",
            "guest_last": "TEST_Doe",
            "amenity": "champagne",
            "dollar_value": 150.0,
            "reason": "Service recovery",
            "notes": "iter238 test"
        }
        r = requests.post(f"{BASE_URL}/api/concierge/amenity", headers=HEADERS, json=amenity_data)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("amenity_id") is not None
        print(f"✓ Amenity dispatched: {data['amenity_id']}")


class TestConciergeGuestIssue:
    """Test guest issue logging and elevation"""

    def test_log_guest_issue_angry(self):
        """POST /api/concierge/guest-issue with severity='angry' returns emoji and creates ticket"""
        issue_data = {
            "guest_room": "TEST_3001",
            "guest_first": "TEST_Jane",
            "guest_last": "TEST_Smith",
            "severity": "angry",
            "department": "dining",
            "description": "TEST_iter238 - Cold food served",
            "table_number": "17"
        }
        r = requests.post(f"{BASE_URL}/api/concierge/guest-issue", headers=HEADERS, json=issue_data)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("severity_emoji") == "😠"
        assert data.get("guest_issue_id") is not None
        assert data.get("ticket_id") is not None
        print(f"✓ Guest issue logged: {data['guest_issue_id']}, emoji={data['severity_emoji']}, ticket={data['ticket_id']}")
        return data.get("guest_issue_id")

    def test_elevate_issue(self):
        """POST /api/concierge/guest-issue/{id}/elevate updates status to elevated"""
        # First create an issue
        issue_data = {
            "guest_room": "TEST_3002",
            "guest_first": "TEST_Bob",
            "guest_last": "TEST_Wilson",
            "severity": "sad",
            "department": "room",
            "description": "TEST_iter238 - AC not working"
        }
        r = requests.post(f"{BASE_URL}/api/concierge/guest-issue", headers=HEADERS, json=issue_data)
        assert r.status_code == 200
        issue_id = r.json().get("guest_issue_id")
        
        # Elevate it
        r2 = requests.post(
            f"{BASE_URL}/api/concierge/guest-issue/{issue_id}/elevate",
            headers=HEADERS,
            json={"to_manager_id": "gm-001", "note": "Escalating per guest request"}
        )
        assert r2.status_code == 200, f"Expected 200, got {r2.status_code}: {r2.text}"
        data = r2.json()
        assert data.get("ok") is True
        assert data.get("elevated_to") == "gm-001"
        print(f"✓ Issue {issue_id} elevated to gm-001")


class TestConciergeValetHousekeeping:
    """Test valet and housekeeping requests"""

    def test_valet_request(self):
        """POST /api/concierge/valet returns request_id and eta"""
        r = requests.post(
            f"{BASE_URL}/api/concierge/valet",
            headers=HEADERS,
            json={"guest_room": "TEST_1501", "guest_name": "TEST_Michael Brown"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("request_id") is not None
        assert data.get("eta") is not None
        print(f"✓ Valet request: {data['request_id']}, ETA={data['eta']}")

    def test_housekeeping_request(self):
        """POST /api/concierge/housekeeping returns request_id"""
        r = requests.post(
            f"{BASE_URL}/api/concierge/housekeeping",
            headers=HEADERS,
            json={"guest_room": "TEST_1502", "item": "towels", "qty": 4}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("request_id") is not None
        print(f"✓ Housekeeping request: {data['request_id']}")


class TestOffPropertySuggestions:
    """Test off-property suggestions"""

    def test_list_off_property(self):
        """GET /api/concierge/off-property returns 5 rows"""
        r = requests.get(f"{BASE_URL}/api/concierge/off-property", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("count") == 5
        rows = data.get("rows", [])
        categories = {s.get("category") for s in rows}
        assert "restaurant" in categories
        assert "activity" in categories
        assert "nightlife" in categories
        print(f"✓ Off-property suggestions: {data['count']} items across {categories}")


class TestMaestroBEO:
    """Test Maestro BEO recent endpoint"""

    def test_list_recent_beos(self):
        """GET /api/maestro/beo/recent returns ok (may be empty)"""
        r = requests.get(f"{BASE_URL}/api/maestro/beo/recent", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        print(f"✓ Maestro BEO recent: {data.get('count', len(data.get('rows', [])))} BEOs")


class TestPurchasingGroups:
    """Test purchasing groups and price comparison"""

    def test_list_purchasing_groups(self):
        """GET /api/purchasing/groups returns 4 groups"""
        r = requests.get(f"{BASE_URL}/api/purchasing/groups", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("count") == 4
        rows = data.get("rows", [])
        logos = {g.get("logo_letter") for g in rows}
        assert logos == {"A", "F", "E", "D"}
        print(f"✓ Purchasing groups: {data['count']} groups with logos {logos}")

    def test_price_compare(self):
        """GET /api/purchasing/item/cucumber/price-compare returns 4 quotes with one cheapest"""
        r = requests.get(f"{BASE_URL}/api/purchasing/item/cucumber/price-compare", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        quotes = data.get("quotes", [])
        assert len(quotes) == 4
        
        # Exactly one should be cheapest
        cheapest_count = sum(1 for q in quotes if q.get("is_cheapest"))
        assert cheapest_count == 1
        
        # All should have group_logo_letter and group_color
        for q in quotes:
            assert q.get("group_logo_letter") is not None
            assert q.get("group_color") is not None
            assert q.get("next_delivery") is not None
        print(f"✓ Price compare for cucumber: 4 quotes, cheapest={data.get('cheapest', {}).get('vendor')}")


class TestOutletAnalytics:
    """Test outlet analytics with kind-aware KPIs"""

    def test_analytics_service_outlet(self):
        """GET /api/outlets/outlet-salon/analytics returns service KPIs"""
        r = requests.get(f"{BASE_URL}/api/outlets/outlet-salon/analytics", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("category") == "service"
        
        kpis = data.get("kpis", [])
        kpi_labels = {k.get("label") for k in kpis}
        assert "Appointments" in kpi_labels
        assert "Avg ticket" in kpi_labels
        assert "Rebook rate" in kpi_labels
        print(f"✓ Salon analytics: service KPIs {kpi_labels}")

    def test_analytics_third_party_outlet(self):
        """GET /api/outlets/outlet-swim/analytics returns third_party_split"""
        r = requests.get(f"{BASE_URL}/api/outlets/outlet-swim/analytics", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        
        split = data.get("third_party_split")
        assert split is not None
        assert split.get("revenue_share_pct") == 15.0
        assert split.get("property_portion_pct") == 85.0
        print(f"✓ Swim outlet analytics: third_party_split with {split['revenue_share_pct']}% share")

    def test_analytics_retail_outlet(self):
        """GET /api/outlets/outlet-menswear/analytics returns retail KPIs"""
        r = requests.get(f"{BASE_URL}/api/outlets/outlet-menswear/analytics", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("category") == "apparel"
        
        kpis = data.get("kpis", [])
        kpi_labels = {k.get("label") for k in kpis}
        # Retail should have units sold, avg transaction, conversion, returns
        assert "Units sold" in kpi_labels
        assert "Avg transaction" in kpi_labels
        print(f"✓ Menswear analytics: retail KPIs {kpi_labels}")


class TestRegressionEndpoints:
    """Regression tests for prior endpoints"""

    def test_echoaurium_outlets(self):
        """GET /api/echoaurium/outlets still works"""
        r = requests.get(f"{BASE_URL}/api/echoaurium/outlets", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True or "rows" in data
        print(f"✓ Regression: /api/echoaurium/outlets works")

    def test_ecw_ops_recipes(self):
        """GET /api/ecw-ops/recipes still works"""
        r = requests.get(f"{BASE_URL}/api/ecw-ops/recipes?outlet_id=outlet-rooftop", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        print(f"✓ Regression: /api/ecw-ops/recipes works")

    def test_ecw_ops_tickets(self):
        """GET /api/ecw-ops/tickets still works"""
        r = requests.get(f"{BASE_URL}/api/ecw-ops/tickets?outlet_id=outlet-rooftop", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        print(f"✓ Regression: /api/ecw-ops/tickets works")

    def test_inventory_audit_start(self):
        """POST /api/ecw-ops/inventory/audit/start still works"""
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/inventory/audit/start",
            headers=HEADERS,
            json={"outlet_id": "outlet-rooftop", "location": "walk-in-1", "auditor_name": "TEST_iter238"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        print(f"✓ Regression: /api/ecw-ops/inventory/audit/start works")

    def test_team_chat_rooms(self):
        """GET /api/team-chat/rooms still works"""
        r = requests.get(f"{BASE_URL}/api/team-chat/rooms?user_id=chef-william", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        print(f"✓ Regression: /api/team-chat/rooms works")

    def test_echo_voice_proactive_briefing(self):
        """GET /api/echo-voice/proactive-briefing still works"""
        r = requests.get(
            f"{BASE_URL}/api/echo-voice/proactive-briefing?outlet_id=outlet-rooftop",
            headers=HEADERS
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "speech" in data
        print(f"✓ Regression: /api/echo-voice/proactive-briefing works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
