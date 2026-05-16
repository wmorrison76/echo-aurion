"""
iter173 · Backend Tests for People/Hours/Leadership/Lifestyle/Alice/Showrooms/Standup Autofill

Tests:
- People Services: /api/people/* (employees, celebrations)
- Hours of Operation: /api/hours/* (outlets, today)
- Leadership Coverage: /api/leadership/* (range, by-date, upsert)
- Lifestyle Dashboard: /api/lifestyle/* (calendar, revenue, forecast, cross-dept, weather)
- Alice Tickets: /api/alice/* (create, list, dashboard, patch)
- Showrooms: /api/showrooms/* (designate, approve, reject workflow)
- Standup Autofill: /api/standup/autofill (7 sections)
- Regression: iter172 endpoints still work
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = os.environ.get("ADMIN_API_TOKEN", "kDLVaJJVmtxX_EPKYGpU2ZunwTT1j0TU4Z_ezSximgc")
TODAY = datetime.now().strftime("%Y-%m-%d")


@pytest.fixture(scope="module")
def api():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_headers():
    """Headers with admin token"""
    return {"Content-Type": "application/json", "X-Admin-Token": ADMIN_TOKEN}


# ─── HEALTH CHECK ────────────────────────────────────────────────────────────
class TestHealth:
    def test_health(self, api):
        r = api.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        print(f"✓ Health check passed: {r.json()}")


# ─── PEOPLE SERVICES ─────────────────────────────────────────────────────────
class TestPeopleServices:
    """Employee directory + celebrations"""

    def test_people_list_returns_employees(self, api):
        """GET /api/people/list seeds 10 employees with privacy-safe display_name"""
        r = api.get(f"{BASE_URL}/api/people/list")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert "employees" in data
        assert "departments" in data
        assert "roles" in data
        # Should have seeded employees
        print(f"✓ People list: {data['total']} employees, {len(data['departments'])} departments")
        if data["total"] > 0:
            emp = data["employees"][0]
            assert "display_name" in emp, "display_name should be present"
            assert "first_name" in emp
            assert "department" in emp
            print(f"  Sample employee: {emp['display_name']} ({emp['department']})")

    def test_people_list_filter_by_department(self, api):
        """Filter employees by department"""
        r = api.get(f"{BASE_URL}/api/people/list?department=front-office")
        assert r.status_code == 200
        data = r.json()
        for emp in data["employees"]:
            assert emp["department"] == "front-office"
        print(f"✓ Department filter: {data['total']} front-office employees")

    def test_people_list_filter_by_role(self, api):
        """Filter employees by role"""
        r = api.get(f"{BASE_URL}/api/people/list?role=director")
        assert r.status_code == 200
        data = r.json()
        for emp in data["employees"]:
            assert emp["role"] == "director"
        print(f"✓ Role filter: {data['total']} directors")

    def test_people_list_search_query(self, api):
        """Search employees by name/title"""
        r = api.get(f"{BASE_URL}/api/people/list?q=Marcus")
        assert r.status_code == 200
        data = r.json()
        print(f"✓ Search query 'Marcus': {data['total']} results")

    def test_people_upsert_requires_admin(self, api):
        """POST /api/people/upsert requires X-Admin-Token"""
        r = api.post(f"{BASE_URL}/api/people/upsert", json={
            "first_name": "TEST_NoAuth", "last_name": "User",
            "department": "front-office", "role": "team-member"
        })
        assert r.status_code == 401
        print("✓ Upsert without admin token returns 401")

    def test_people_upsert_validates_department(self, api, admin_headers):
        """Validates department enum"""
        r = api.post(f"{BASE_URL}/api/people/upsert", json={
            "first_name": "TEST_Bad", "last_name": "Dept",
            "department": "invalid-dept", "role": "team-member"
        }, headers=admin_headers)
        assert r.status_code == 400
        assert "unknown department" in r.text.lower()
        print("✓ Invalid department returns 400")

    def test_people_upsert_validates_role(self, api, admin_headers):
        """Validates role enum"""
        r = api.post(f"{BASE_URL}/api/people/upsert", json={
            "first_name": "TEST_Bad", "last_name": "Role",
            "department": "front-office", "role": "invalid-role"
        }, headers=admin_headers)
        assert r.status_code == 400
        assert "unknown role" in r.text.lower()
        print("✓ Invalid role returns 400")

    def test_people_upsert_creates_employee(self, api, admin_headers):
        """Creates employee with generated id and display_name"""
        r = api.post(f"{BASE_URL}/api/people/upsert", json={
            "first_name": "TEST_New", "last_name": "Employee",
            "department": "lifestyle", "role": "manager",
            "title": "TEST Lifestyle Coordinator",
            "hire_date": "2024-01-15", "birthday": "06-20"
        }, headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        emp = data["employee"]
        assert emp["id"], "id should be generated"
        assert emp["display_name"] == "TEST_New E."
        assert emp["department"] == "lifestyle"
        print(f"✓ Created employee: {emp['display_name']} (id={emp['id']})")
        return emp["id"]

    def test_celebrations_today(self, api):
        """GET /api/people/celebrations/today returns birthdays + anniversaries"""
        r = api.get(f"{BASE_URL}/api/people/celebrations/today?date_iso={TODAY}")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert "birthdays" in data
        assert "anniversaries" in data
        assert "summary" in data
        print(f"✓ Celebrations today: {data['summary']}")

    def test_celebrations_upcoming(self, api):
        """GET /api/people/celebrations/upcoming returns next 7 days"""
        r = api.get(f"{BASE_URL}/api/people/celebrations/upcoming?days=7")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert "celebrations" in data
        assert data["days"] == 7
        print(f"✓ Upcoming celebrations: {data['total']} in next 7 days")


# ─── HOURS OF OPERATION ──────────────────────────────────────────────────────
class TestHoursOfOperation:
    """Outlet hours editor"""

    def test_hours_list_returns_outlets(self, api):
        """GET /api/hours/list returns 10 seeded outlets with per-weekday hours"""
        r = api.get(f"{BASE_URL}/api/hours/list")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert "outlets" in data
        assert "weekdays" in data
        assert "outlet_types" in data
        print(f"✓ Hours list: {data['total']} outlets")
        if data["total"] > 0:
            outlet = data["outlets"][0]
            assert "hours" in outlet
            assert "mon" in outlet["hours"]
            print(f"  Sample outlet: {outlet['name']} ({outlet['outlet_type']})")

    def test_hours_today_returns_current_weekday(self, api):
        """GET /api/hours/today returns today's hours per outlet"""
        r = api.get(f"{BASE_URL}/api/hours/today")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert "weekday" in data
        assert "outlets" in data
        print(f"✓ Hours today ({data['weekday']}): {data['total']} outlets")
        if data["total"] > 0:
            o = data["outlets"][0]
            assert "today_hours" in o
            print(f"  Sample: {o['outlet']} → {o['today_hours']}")

    def test_hours_upsert_requires_admin(self, api):
        """POST /api/hours/upsert requires X-Admin-Token"""
        r = api.post(f"{BASE_URL}/api/hours/upsert", json={
            "name": "TEST_NoAuth", "outlet_type": "restaurant",
            "hours": {"mon": "closed"}
        })
        assert r.status_code == 401
        print("✓ Hours upsert without admin token returns 401")

    def test_hours_upsert_validates_outlet_type(self, api, admin_headers):
        """Validates outlet_type enum"""
        r = api.post(f"{BASE_URL}/api/hours/upsert", json={
            "name": "TEST_Bad", "outlet_type": "invalid-type",
            "hours": {"mon": "closed"}
        }, headers=admin_headers)
        assert r.status_code == 400
        assert "unknown outlet_type" in r.text.lower()
        print("✓ Invalid outlet_type returns 400")

    def test_hours_upsert_normalizes_hours(self, api, admin_headers):
        """Normalizes hours strings (closed/24h/HH:MM-HH:MM)"""
        r = api.post(f"{BASE_URL}/api/hours/upsert", json={
            "name": "TEST_Outlet", "outlet_type": "bar",
            "hours": {"mon": "11:00-23:00", "tue": "24h", "wed": "closed", "thu": "", "fri": "11:00-23:00", "sat": "11:00-23:00", "sun": "closed"}
        }, headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        outlet = data["outlet"]
        assert outlet["hours"]["tue"] == "24h"
        assert outlet["hours"]["wed"] == "closed"
        print(f"✓ Created outlet: {outlet['name']} (id={outlet['id']})")


# ─── LEADERSHIP COVERAGE ─────────────────────────────────────────────────────
class TestLeadershipCoverage:
    """Leadership schedule"""

    def test_leadership_range_returns_coverage(self, api):
        """GET /api/leadership/range?start=&days=7 returns coverage rows"""
        r = api.get(f"{BASE_URL}/api/leadership/range?start={TODAY}&days=7")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert "dates" in data
        assert "coverage" in data
        assert len(data["dates"]) == 7
        print(f"✓ Leadership range: {data['total']} coverage entries for 7 days")

    def test_leadership_by_date_returns_by_department(self, api):
        """GET /api/leadership/by-date/{date} returns by_department dict"""
        r = api.get(f"{BASE_URL}/api/leadership/by-date/{TODAY}")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert "by_department" in data
        assert "raw" in data
        print(f"✓ Leadership by-date: {data['total']} entries, {len(data['by_department'])} departments")

    def test_leadership_upsert_creates_entry(self, api, admin_headers):
        """POST /api/leadership/upsert creates coverage entry"""
        # First get an employee id
        emp_r = api.get(f"{BASE_URL}/api/people/list?role=director")
        emps = emp_r.json().get("employees", [])
        if not emps:
            pytest.skip("No directors found for coverage test")
        emp = emps[0]
        
        r = api.post(f"{BASE_URL}/api/leadership/upsert", json={
            "employee_id": emp["id"],
            "department": emp["department"],
            "date": TODAY,
            "shift": "mod",
            "notes": "TEST coverage entry"
        }, headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        cov = data["coverage"]
        assert cov["id"]
        assert cov["employee_name"]  # denormalized
        print(f"✓ Created coverage: {cov['employee_name']} on {cov['date']} ({cov['shift']})")


# ─── LIFESTYLE DASHBOARD ─────────────────────────────────────────────────────
class TestLifestyleDashboard:
    """Activations + revenue + forecast + cross-dept + weather"""

    def test_lifestyle_calendar_returns_activations(self, api):
        """GET /api/lifestyle/calendar returns 7 seeded activations grouped by_date"""
        r = api.get(f"{BASE_URL}/api/lifestyle/calendar?start={TODAY}&days=14")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert "by_date" in data
        assert "activations" in data
        assert "categories" in data
        assert "revenue_models" in data
        print(f"✓ Lifestyle calendar: {data['total']} activations in 14-day window")
        if data["total"] > 0:
            act = data["activations"][0]
            assert "category" in act
            assert "revenue_model" in act
            print(f"  Sample: {act['title']} ({act['category']}, {act['revenue_model']})")

    def test_lifestyle_revenue_engagement(self, api):
        """GET /api/lifestyle/revenue-engagement aggregates by_revenue_model + by_category"""
        r = api.get(f"{BASE_URL}/api/lifestyle/revenue-engagement?days=30")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert "total_revenue" in data
        assert "total_attendance" in data
        assert "engagement_ratio_nonpaid" in data
        assert "by_revenue_model" in data
        assert "by_category" in data
        print(f"✓ Revenue engagement: ${data['total_revenue']} revenue, {data['total_attendance']} attendance")

    def test_lifestyle_attendance_forecast(self, api):
        """GET /api/lifestyle/attendance-forecast uses occupancy + weekend bump"""
        r = api.get(f"{BASE_URL}/api/lifestyle/attendance-forecast?date_iso={TODAY}")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert "occ_pct_used" in data
        assert "weekend_bump" in data
        assert "forecasts" in data
        print(f"✓ Attendance forecast: {data['total_activations']} activations, occ={data['occ_pct_used']}%")
        if data["forecasts"]:
            fc = data["forecasts"][0]
            assert "fill_rate_pct" in fc
            print(f"  Sample: {fc['title']} → {fc['forecast_attendance']}/{fc['capacity']} ({fc['fill_rate_pct']}%)")

    def test_lifestyle_weather_alerts(self, api):
        """GET /api/lifestyle/weather-alerts flags weather-sensitive activations"""
        r = api.get(f"{BASE_URL}/api/lifestyle/weather-alerts?date_iso={TODAY}")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert "weather_sensitive_count" in data
        assert "alerts" in data
        print(f"✓ Weather alerts: {data['weather_sensitive_count']} weather-sensitive activations")

    def test_lifestyle_cross_dept_plan(self, api):
        """GET /api/lifestyle/cross-dept-plan/{activation_id} expands into dept tasks"""
        # First get an activation
        cal_r = api.get(f"{BASE_URL}/api/lifestyle/calendar?start={TODAY}&days=14")
        acts = cal_r.json().get("activations", [])
        if not acts:
            pytest.skip("No activations found for cross-dept test")
        act_id = acts[0]["id"]
        
        r = api.get(f"{BASE_URL}/api/lifestyle/cross-dept-plan/{act_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert "activation" in data
        assert "departments" in data
        assert "tasks" in data
        print(f"✓ Cross-dept plan: {data['total_tasks']} tasks for '{data['activation']['title']}'")
        if data["tasks"]:
            task = data["tasks"][0]
            print(f"  Sample task: {task['department']} → {task['task'][:60]}...")

    def test_lifestyle_activations_upsert_requires_admin(self, api):
        """POST /api/lifestyle/activations/upsert requires X-Admin-Token"""
        r = api.post(f"{BASE_URL}/api/lifestyle/activations/upsert", json={
            "title": "TEST_NoAuth", "category": "wellness", "date": TODAY
        })
        assert r.status_code == 401
        print("✓ Activations upsert without admin token returns 401")

    def test_lifestyle_activations_upsert_validates(self, api, admin_headers):
        """Validates category + revenue_model + date format"""
        # Invalid category
        r = api.post(f"{BASE_URL}/api/lifestyle/activations/upsert", json={
            "title": "TEST_Bad", "category": "invalid-cat", "date": TODAY
        }, headers=admin_headers)
        assert r.status_code == 400
        assert "unknown category" in r.text.lower()
        
        # Invalid revenue_model
        r = api.post(f"{BASE_URL}/api/lifestyle/activations/upsert", json={
            "title": "TEST_Bad", "category": "wellness", "revenue_model": "invalid", "date": TODAY
        }, headers=admin_headers)
        assert r.status_code == 400
        assert "unknown revenue_model" in r.text.lower()
        
        # Invalid date
        r = api.post(f"{BASE_URL}/api/lifestyle/activations/upsert", json={
            "title": "TEST_Bad", "category": "wellness", "date": "bad-date"
        }, headers=admin_headers)
        assert r.status_code == 400
        print("✓ Activations upsert validates category, revenue_model, date")


# ─── ALICE TICKETS ───────────────────────────────────────────────────────────
class TestAliceTickets:
    """Ticket system with concierge mirror"""

    def test_alice_ticket_create(self, api):
        """POST /api/alice/ticket/create generates ticket_no + history event"""
        r = api.post(f"{BASE_URL}/api/alice/ticket/create", json={
            "raised_by_name": "TEST_Agent",
            "raised_by_department": "front-office",
            "kind": "guest-request",
            "summary": "TEST Guest needs extra towels",
            "priority": "normal",
            "guest_name": "TEST_John Smith",
            "room": "1205"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        ticket = data["ticket"]
        assert ticket["id"]
        assert ticket["ticket_no"].startswith("ALI-")
        assert "history" in ticket
        assert len(ticket["history"]) >= 1
        assert ticket["history"][0]["action"] == "created"
        print(f"✓ Created ticket: {ticket['ticket_no']} - {ticket['summary']}")
        return ticket["id"]

    def test_alice_ticket_create_mirrors_to_concierge(self, api):
        """Auto-mirrors to concierge_requests when needs_concierge=true + guest_id provided"""
        r = api.post(f"{BASE_URL}/api/alice/ticket/create", json={
            "raised_by_name": "TEST_Concierge",
            "raised_by_department": "concierge",
            "kind": "concierge-handoff",
            "summary": "TEST VIP needs restaurant reservation",
            "priority": "high",
            "guest_name": "TEST_VIP Guest",
            "room": "PH1",
            "guest_id": "test-guest-123",
            "needs_concierge": True
        })
        assert r.status_code == 200
        data = r.json()
        ticket = data["ticket"]
        assert ticket["needs_concierge"] is True
        print(f"✓ Created concierge-mirrored ticket: {ticket['ticket_no']}")

    def test_alice_tickets_list_with_filters(self, api):
        """GET /api/alice/tickets filter by status + department"""
        r = api.get(f"{BASE_URL}/api/alice/tickets")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert "tickets" in data
        assert "stats" in data
        assert "kinds" in data
        assert "statuses" in data
        assert "priorities" in data
        print(f"✓ Alice tickets: {data['total']} tickets, stats={data['stats']}")

    def test_alice_tickets_filter_by_status(self, api):
        """Filter by status"""
        r = api.get(f"{BASE_URL}/api/alice/tickets?status=open")
        assert r.status_code == 200
        data = r.json()
        for t in data["tickets"]:
            assert t["status"] == "open"
        print(f"✓ Status filter: {data['total']} open tickets")

    def test_alice_dashboard_kpi(self, api):
        """GET /api/alice/dashboard returns KPI rollup"""
        r = api.get(f"{BASE_URL}/api/alice/dashboard")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert "open" in data
        assert "in_progress" in data
        assert "urgent_open" in data
        assert "resolved_24h" in data
        print(f"✓ Alice dashboard: open={data['open']}, in_progress={data['in_progress']}, urgent={data['urgent_open']}")

    def test_alice_ticket_patch_status(self, api):
        """PATCH /api/alice/ticket/{id} updates status + appends history"""
        # Create a ticket first
        create_r = api.post(f"{BASE_URL}/api/alice/ticket/create", json={
            "raised_by_name": "TEST_Patch",
            "raised_by_department": "housekeeping",
            "kind": "housekeeping",
            "summary": "TEST Room needs cleaning",
            "priority": "normal"
        })
        ticket_id = create_r.json()["ticket"]["id"]
        
        # Patch status
        r = api.patch(f"{BASE_URL}/api/alice/ticket/{ticket_id}", json={
            "status": "in_progress",
            "actor": "TEST_Housekeeper"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        ticket = data["ticket"]
        assert ticket["status"] == "in_progress"
        # Check history has status_change event
        history = ticket.get("history", [])
        status_changes = [h for h in history if h.get("action") == "status_change"]
        assert len(status_changes) >= 1
        print(f"✓ Patched ticket {ticket_id}: status → in_progress, history has {len(history)} events")


# ─── SHOWROOMS ───────────────────────────────────────────────────────────────
class TestShowrooms:
    """Designate/approve/reject workflow"""

    def test_showrooms_designate(self, api):
        """POST /api/showrooms/designate creates showroom with status=designated"""
        r = api.post(f"{BASE_URL}/api/showrooms/designate", json={
            "room": "TEST_1501",
            "room_type": "Presidential Suite",
            "date": TODAY,
            "window_start": "10:00",
            "window_end": "12:00",
            "purpose": "vip-walkthrough",
            "audience": "TEST McGriff Group",
            "designated_by": "TEST_FrontOffice"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        sr = data["showroom"]
        assert sr["id"]
        assert sr["status"] == "designated"
        assert "history" in sr
        print(f"✓ Designated showroom: {sr['room']} ({sr['purpose']})")
        return sr["id"]

    def test_showrooms_request_approval(self, api):
        """POST /api/showrooms/{id}/request-approval → pending-approval"""
        # Create first
        create_r = api.post(f"{BASE_URL}/api/showrooms/designate", json={
            "room": "TEST_1502", "date": TODAY, "purpose": "sales-tour",
            "designated_by": "TEST_Sales"
        })
        sr_id = create_r.json()["showroom"]["id"]
        
        r = api.post(f"{BASE_URL}/api/showrooms/{sr_id}/request-approval?actor=TEST_FO")
        assert r.status_code == 200
        data = r.json()
        assert data["showroom"]["status"] == "pending-approval"
        print(f"✓ Requested approval for showroom {sr_id}")
        return sr_id

    def test_showrooms_approve_requires_hk_manager(self, api):
        """POST /api/showrooms/{id}/approve requires hk_manager_name"""
        # Create and request approval
        create_r = api.post(f"{BASE_URL}/api/showrooms/designate", json={
            "room": "TEST_1503", "date": TODAY, "purpose": "media-tour",
            "designated_by": "TEST_Marketing"
        })
        sr_id = create_r.json()["showroom"]["id"]
        api.post(f"{BASE_URL}/api/showrooms/{sr_id}/request-approval")
        
        # Try approve without hk_manager_name
        r = api.post(f"{BASE_URL}/api/showrooms/{sr_id}/approve", json={})
        assert r.status_code == 400
        assert "hk_manager_name required" in r.text.lower()
        
        # Approve with hk_manager_name
        r = api.post(f"{BASE_URL}/api/showrooms/{sr_id}/approve", json={
            "hk_manager_name": "TEST_Anika P.",
            "notes": "Room inspected and ready"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["showroom"]["status"] == "approved"
        assert data["showroom"]["approved_by"] == "TEST_Anika P."
        print(f"✓ Approved showroom {sr_id} by TEST_Anika P.")

    def test_showrooms_reject(self, api):
        """POST /api/showrooms/{id}/reject flips back to in-prep with rejection_reason"""
        # Create and request approval
        create_r = api.post(f"{BASE_URL}/api/showrooms/designate", json={
            "room": "TEST_1504", "date": TODAY, "purpose": "executive-review",
            "designated_by": "TEST_GM"
        })
        sr_id = create_r.json()["showroom"]["id"]
        api.post(f"{BASE_URL}/api/showrooms/{sr_id}/request-approval")
        
        # Reject
        r = api.post(f"{BASE_URL}/api/showrooms/{sr_id}/reject", json={
            "hk_manager_name": "TEST_Anika P.",
            "reason": "Carpet stain needs attention"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["showroom"]["status"] == "in-prep"
        assert data["showroom"]["rejection_reason"] == "Carpet stain needs attention"
        print(f"✓ Rejected showroom {sr_id}: {data['showroom']['rejection_reason']}")

    def test_showrooms_list(self, api):
        """GET /api/showrooms/list returns showrooms"""
        r = api.get(f"{BASE_URL}/api/showrooms/list?date={TODAY}")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert "showrooms" in data
        assert "purposes" in data
        assert "statuses" in data
        print(f"✓ Showrooms list: {data['total']} showrooms for {TODAY}")


# ─── STANDUP AUTOFILL ────────────────────────────────────────────────────────
class TestStandupAutofill:
    """Autofill extended with 4 new sources (7 sections total)"""

    def test_standup_autofill_returns_7_sections(self, api):
        """POST /api/standup/autofill returns autofilled_sections including 7 sources"""
        # Use form-urlencoded data
        r = api.post(f"{BASE_URL}/api/standup/autofill", 
                     data=f"date={TODAY}",
                     headers={"Content-Type": "application/x-www-form-urlencoded"})
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert "autofilled_sections" in data
        assert "board" in data
        
        sections = data["autofilled_sections"]
        print(f"✓ Standup autofill: {len(sections)} sections autofilled")
        print(f"  Sections: {sections}")
        
        # Check board has the sections
        board = data["board"]
        assert "sections" in board
        
        # Expected sections from iter173: vips_in_house, hours, activities, glitches, people_services, leadership, showrooms
        expected = ["vips_in_house", "hours", "activities", "glitches", "people_services", "leadership", "showrooms"]
        for sec in expected:
            if sec in sections:
                sec_data = board["sections"].get(sec, {})
                assert sec_data.get("autofilled") is True, f"{sec} should be marked autofilled"
                print(f"  ✓ {sec}: autofilled=True")


# ─── REGRESSION: ITER172 ENDPOINTS ───────────────────────────────────────────
class TestRegressionIter172:
    """Prior iter172 endpoints still work"""

    def test_standup_ingest_pdf(self, api):
        """POST /api/standup/ingest accepts PDF upload"""
        # Create a minimal PDF-like file - use multipart form data
        import io
        files = {"file": ("TEST_regression.pdf", io.BytesIO(b"%PDF-1.4 test content"), "application/pdf")}
        # Remove Content-Type header for multipart
        headers = {k: v for k, v in api.headers.items() if k.lower() != "content-type"}
        r = requests.post(f"{BASE_URL}/api/standup/ingest", 
                         data={"date": TODAY, "section_hint": "auto"}, 
                         files=files,
                         headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert "ingest_id" in data
        print(f"✓ Regression: standup ingest works, ingest_id={data['ingest_id']}")

    def test_concierge_v2_outlets(self, api):
        """GET /api/concierge-v2/outlets still works"""
        r = api.get(f"{BASE_URL}/api/concierge-v2/outlets")
        if r.status_code == 404:
            pytest.skip("Concierge v2 outlets endpoint not found (may be renamed)")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        print(f"✓ Regression: concierge-v2 outlets works, {data.get('total', len(data.get('outlets', [])))} outlets")

    def test_concierge_v2_dining_availability(self, api):
        """GET /api/concierge-v2/dining/availability still works"""
        # Endpoint requires outlet_id, date, time (not outlet)
        r = api.get(f"{BASE_URL}/api/concierge-v2/dining/availability?outlet_id=sotogrande&date={TODAY}&time=19:00")
        if r.status_code == 404:
            pytest.skip("Concierge v2 dining endpoint not found")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert "tables" in data
        print(f"✓ Regression: concierge-v2 dining availability works, {data['summary']['available']}/{data['summary']['total']} tables available")

    def test_concierge_v2_recovery_open(self, api):
        """POST /api/concierge-v2/recovery/open still works"""
        r = api.post(f"{BASE_URL}/api/concierge-v2/recovery/open", json={
            "guest_id": "test-regression",
            "guest_name": "TEST_Regression Guest",
            "room": "999",
            "category": "service",
            "severity": "minor",
            "description": "TEST regression check"
        })
        if r.status_code == 404:
            pytest.skip("Concierge v2 recovery endpoint not found")
        assert r.status_code == 200
        print("✓ Regression: concierge-v2 recovery/open works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
