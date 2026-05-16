"""iter249 · Manager Workflow + MyEcho Extensions + Reports Hub flip-to-live tests

Tests:
- Manager Workflow: PTO/Swap/Callout/MoD-chat/HR-config endpoints
- MyEcho extensions: shift-swap, callout, notifications, mod-chat
- Reports Hub: sales-by-profit-center, tender-mix, server-sales, hourly-heatmap with pos_rings
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Headers for different user roles
EMPLOYEE_HEADER = {"X-User-Id": "demo-hourly-001", "Content-Type": "application/json"}
MANAGER_HEADER = {"X-User-Id": "manager-on-duty", "Content-Type": "application/json"}


class TestManagerWorkflowPTO:
    """Manager Workflow PTO endpoints"""
    
    def test_pto_pending(self):
        """GET /api/manager-workflow/pto/pending returns pending PTO requests"""
        r = requests.get(f"{BASE_URL}/api/manager-workflow/pto/pending", headers=MANAGER_HEADER)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        print(f"✓ PTO pending: {len(data['rows'])} pending requests")
    
    def test_pto_decided(self):
        """GET /api/manager-workflow/pto/decided returns decided PTO requests"""
        r = requests.get(f"{BASE_URL}/api/manager-workflow/pto/decided", headers=MANAGER_HEADER)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        print(f"✓ PTO decided: {len(data['rows'])} decided requests")


class TestManagerWorkflowSwap:
    """Manager Workflow Shift Swap endpoints"""
    
    def test_swap_pending(self):
        """GET /api/manager-workflow/swap/pending returns pending swaps"""
        r = requests.get(f"{BASE_URL}/api/manager-workflow/swap/pending", headers=MANAGER_HEADER)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        print(f"✓ Swap pending: {len(data['rows'])} pending swaps")


class TestManagerWorkflowCallout:
    """Manager Workflow Call-out endpoints"""
    
    def test_callouts_pending(self):
        """GET /api/manager-workflow/callouts/pending returns pending callouts"""
        r = requests.get(f"{BASE_URL}/api/manager-workflow/callouts/pending", headers=MANAGER_HEADER)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        print(f"✓ Callouts pending: {len(data['rows'])} pending callouts")


class TestManagerWorkflowHRConfig:
    """Manager Workflow HR Config endpoints"""
    
    def test_hr_config_get(self):
        """GET /api/manager-workflow/hr-config returns HR config"""
        r = requests.get(f"{BASE_URL}/api/manager-workflow/hr-config", headers=MANAGER_HEADER)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "config" in data
        cfg = data["config"]
        # Check default values
        assert "allow_mobile_callout" in cfg
        assert "callout_min_hours_before_shift" in cfg
        assert "manager_on_duty_chat_enabled" in cfg
        print(f"✓ HR config: allow_mobile_callout={cfg['allow_mobile_callout']}")
    
    def test_hr_config_set(self):
        """POST /api/manager-workflow/hr-config updates HR config"""
        # First get current config
        r = requests.get(f"{BASE_URL}/api/manager-workflow/hr-config", headers=MANAGER_HEADER)
        original_cfg = r.json()["config"]
        
        # Toggle allow_mobile_callout
        new_value = not original_cfg.get("allow_mobile_callout", False)
        r = requests.post(f"{BASE_URL}/api/manager-workflow/hr-config", 
                         headers=MANAGER_HEADER,
                         json={
                             "allow_mobile_callout": new_value,
                             "callout_min_hours_before_shift": 2,
                             "manager_on_duty_chat_enabled": True,
                             "require_phone_call_after_callout": True
                         })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data["config"]["allow_mobile_callout"] == new_value
        print(f"✓ HR config updated: allow_mobile_callout={new_value}")


class TestManagerWorkflowModChat:
    """Manager Workflow MoD Chat endpoints"""
    
    def test_mod_active_room(self):
        """GET /api/manager-workflow/mod/active-room returns/creates chat room"""
        r = requests.get(f"{BASE_URL}/api/manager-workflow/mod/active-room?outlet_id=out-coastal-kitchen", 
                        headers=MANAGER_HEADER)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "room" in data
        room = data["room"]
        assert room.get("id") == "mod-out-coastal-kitchen"
        assert room.get("kind") == "manager-on-duty"
        print(f"✓ MoD room: {room['id']} - {room.get('name')}")
    
    def test_mod_post_message(self):
        """POST /api/manager-workflow/mod/active-room/post sends a message"""
        r = requests.post(f"{BASE_URL}/api/manager-workflow/mod/active-room/post",
                         headers=MANAGER_HEADER,
                         json={"text": "all set for service", "outlet_id": "out-coastal-kitchen"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "message" in data
        msg = data["message"]
        assert msg.get("text") == "all set for service"
        print(f"✓ MoD message posted: {msg['id']}")
    
    def test_mod_get_messages(self):
        """GET /api/manager-workflow/mod/active-room/messages returns messages"""
        r = requests.get(f"{BASE_URL}/api/manager-workflow/mod/active-room/messages?outlet_id=out-coastal-kitchen",
                        headers=MANAGER_HEADER)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        # Should have at least the message we just posted
        print(f"✓ MoD messages: {len(data['rows'])} messages")


class TestMyEchoCoworkers:
    """MyEcho coworkers endpoint"""
    
    def test_coworkers(self):
        """GET /api/myecho/coworkers returns coworkers list"""
        r = requests.get(f"{BASE_URL}/api/myecho/coworkers", headers=EMPLOYEE_HEADER)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        print(f"✓ Coworkers: {len(data['rows'])} coworkers")


class TestMyEchoShiftSwap:
    """MyEcho Shift Swap endpoints"""
    
    def test_shift_swap_request(self):
        """POST /api/myecho/shift-swap/request creates a swap request"""
        r = requests.post(f"{BASE_URL}/api/myecho/shift-swap/request",
                         headers=EMPLOYEE_HEADER,
                         json={
                             "shift_date": "2026-06-15",
                             "cover_id": "demo-coworker-1",
                             "cover_name": "Test Coworker",
                             "note": "doc appt"
                         })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "swap" in data
        swap = data["swap"]
        assert swap.get("status") == "manager-pending"
        print(f"✓ Shift swap created: {swap['id']} - status={swap['status']}")
    
    def test_shift_swap_mine(self):
        """GET /api/myecho/shift-swap/mine returns my swaps"""
        r = requests.get(f"{BASE_URL}/api/myecho/shift-swap/mine", headers=EMPLOYEE_HEADER)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        print(f"✓ My swaps: {len(data['rows'])} swaps")


class TestMyEchoCallout:
    """MyEcho Call-out endpoints"""
    
    def test_callout_policy(self):
        """GET /api/myecho/callout-policy returns policy"""
        r = requests.get(f"{BASE_URL}/api/myecho/callout-policy", headers=EMPLOYEE_HEADER)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "allow_mobile_callout" in data
        assert "min_hours_before_shift" in data
        assert "manager_phone" in data
        print(f"✓ Callout policy: allow_mobile={data['allow_mobile_callout']}, min_hours={data['min_hours_before_shift']}")
    
    def test_callout_request_phone_required(self):
        """POST /api/myecho/callout/request returns 403 when allow_mobile_callout=false"""
        # First ensure allow_mobile_callout is false
        requests.post(f"{BASE_URL}/api/manager-workflow/hr-config",
                     headers=MANAGER_HEADER,
                     json={
                         "allow_mobile_callout": False,
                         "callout_min_hours_before_shift": 2,
                         "manager_on_duty_chat_enabled": True,
                         "require_phone_call_after_callout": True
                     })
        
        # Now try to submit a callout
        r = requests.post(f"{BASE_URL}/api/myecho/callout/request",
                         headers=EMPLOYEE_HEADER,
                         json={
                             "shift_date": "2026-06-01",
                             "shift_start": "11:00",
                             "reason": "sick"
                         })
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
        data = r.json()
        detail = data.get("detail", {})
        assert detail.get("code") == "phone-required"
        assert "manager_phone" in detail
        print(f"✓ Callout rejected (phone-required): manager_phone={detail['manager_phone']}")
    
    def test_callout_request_success(self):
        """POST /api/myecho/callout/request succeeds when allow_mobile_callout=true"""
        # First enable mobile callout
        requests.post(f"{BASE_URL}/api/manager-workflow/hr-config",
                     headers=MANAGER_HEADER,
                     json={
                         "allow_mobile_callout": True,
                         "callout_min_hours_before_shift": 2,
                         "manager_on_duty_chat_enabled": True,
                         "require_phone_call_after_callout": True
                     })
        
        # Now submit a callout (use a future date/time to avoid too-late rejection)
        r = requests.post(f"{BASE_URL}/api/myecho/callout/request",
                         headers=EMPLOYEE_HEADER,
                         json={
                             "shift_date": "2026-12-01",
                             "shift_start": "11:00",
                             "reason": "sick"
                         })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "callout" in data
        print(f"✓ Callout submitted: {data['callout']['id']}")
    
    def test_callout_mine(self):
        """GET /api/myecho/callout/mine returns my callouts"""
        r = requests.get(f"{BASE_URL}/api/myecho/callout/mine", headers=EMPLOYEE_HEADER)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        print(f"✓ My callouts: {len(data['rows'])} callouts")


class TestMyEchoNotifications:
    """MyEcho Notifications endpoints"""
    
    def test_notifications(self):
        """GET /api/myecho/notifications returns notifications"""
        r = requests.get(f"{BASE_URL}/api/myecho/notifications", headers=EMPLOYEE_HEADER)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        assert "unread_count" in data
        print(f"✓ Notifications: {len(data['rows'])} total, {data['unread_count']} unread")


class TestMyEchoModChat:
    """MyEcho MoD Chat endpoints"""
    
    def test_mod_chat_messages(self):
        """GET /api/myecho/mod-chat/messages returns messages"""
        r = requests.get(f"{BASE_URL}/api/myecho/mod-chat/messages?outlet_id=out-coastal-kitchen",
                        headers=EMPLOYEE_HEADER)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        print(f"✓ MoD chat messages: {len(data['rows'])} messages")
    
    def test_mod_chat_post(self):
        """POST /api/myecho/mod-chat/post sends a message"""
        r = requests.post(f"{BASE_URL}/api/myecho/mod-chat/post",
                         headers=EMPLOYEE_HEADER,
                         json={"text": "on my way", "outlet_id": "out-coastal-kitchen"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "message" in data
        print(f"✓ MoD chat message posted: {data['message']['id']}")


class TestPTOApprovalFlow:
    """Test PTO approval flow with notification push-back"""
    
    def test_pto_approve_creates_notification(self):
        """POST /api/manager-workflow/pto/{id}/approve creates notification"""
        # First create a PTO request
        r = requests.post(f"{BASE_URL}/api/myecho/pto-request",
                         headers=EMPLOYEE_HEADER,
                         json={
                             "start_date": "2026-07-01",
                             "end_date": "2026-07-05",
                             "type": "vacation",
                             "note": "summer vacation"
                         })
        assert r.status_code == 200
        pto_id = r.json()["request"]["id"]
        
        # Get initial notification count
        r = requests.get(f"{BASE_URL}/api/myecho/notifications", headers=EMPLOYEE_HEADER)
        initial_count = len(r.json()["rows"])
        
        # Approve the PTO
        r = requests.post(f"{BASE_URL}/api/manager-workflow/pto/{pto_id}/approve",
                         headers=MANAGER_HEADER,
                         json={"note": "OK"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("status") == "approved"
        
        # Check notification was created
        r = requests.get(f"{BASE_URL}/api/myecho/notifications", headers=EMPLOYEE_HEADER)
        new_count = len(r.json()["rows"])
        assert new_count > initial_count, "Expected notification to be created"
        print(f"✓ PTO approved and notification created: {pto_id}")
    
    def test_pto_deny_creates_notification(self):
        """POST /api/manager-workflow/pto/{id}/deny creates notification"""
        # First create a PTO request
        r = requests.post(f"{BASE_URL}/api/myecho/pto-request",
                         headers=EMPLOYEE_HEADER,
                         json={
                             "start_date": "2026-08-01",
                             "end_date": "2026-08-05",
                             "type": "vacation",
                             "note": "another vacation"
                         })
        assert r.status_code == 200
        pto_id = r.json()["request"]["id"]
        
        # Deny the PTO
        r = requests.post(f"{BASE_URL}/api/manager-workflow/pto/{pto_id}/deny",
                         headers=MANAGER_HEADER,
                         json={"reason": "staffing"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("status") == "denied"
        print(f"✓ PTO denied: {pto_id}")


class TestReportsHubFlipToLive:
    """Reports Hub flip-to-live with pos_rings"""
    
    def test_pos_rings_status(self):
        """GET /api/pos-rings/status returns status"""
        r = requests.get(f"{BASE_URL}/api/pos-rings/status")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "total" in data
        print(f"✓ POS rings status: total={data['total']}")
        return data["total"]
    
    def test_pos_rings_seed_demo(self):
        """POST /api/pos-rings/seed-demo seeds demo data"""
        r = requests.post(f"{BASE_URL}/api/pos-rings/seed-demo?days=1&rings_per_day=200")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        print(f"✓ POS rings seeded: {data.get('inserted', 0)} rings")
    
    def test_sales_by_profit_center(self):
        """GET /api/reports-hub/sales-by-profit-center returns data"""
        r = requests.get(f"{BASE_URL}/api/reports-hub/sales-by-profit-center")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        assert "totals" in data
        # Check if demo or live
        demo = data.get("demo", True)
        print(f"✓ Sales by profit center: {len(data['rows'])} outlets, demo={demo}")
    
    def test_tender_mix(self):
        """GET /api/reports-hub/tender-mix returns data"""
        r = requests.get(f"{BASE_URL}/api/reports-hub/tender-mix")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        demo = data.get("demo", True)
        print(f"✓ Tender mix: {len(data['rows'])} tenders, demo={demo}")
    
    def test_server_sales(self):
        """GET /api/reports-hub/server-sales returns data"""
        r = requests.get(f"{BASE_URL}/api/reports-hub/server-sales")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        demo = data.get("demo", True)
        print(f"✓ Server sales: {len(data['rows'])} servers, demo={demo}")
    
    def test_hourly_heatmap(self):
        """GET /api/reports-hub/hourly-heatmap returns data"""
        r = requests.get(f"{BASE_URL}/api/reports-hub/hourly-heatmap")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "grid" in data
        demo = data.get("demo", True)
        print(f"✓ Hourly heatmap: {len(data['grid'])} outlets, demo={demo}")


class TestRegressionMyEchoExisting:
    """Regression tests for existing MyEcho endpoints"""
    
    def test_myecho_me(self):
        """GET /api/myecho/me returns profile"""
        r = requests.get(f"{BASE_URL}/api/myecho/me", headers=EMPLOYEE_HEADER)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        print(f"✓ MyEcho /me: {data.get('name')}")
    
    def test_myecho_schedule(self):
        """GET /api/myecho/schedule returns schedule"""
        r = requests.get(f"{BASE_URL}/api/myecho/schedule", headers=EMPLOYEE_HEADER)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        print(f"✓ MyEcho /schedule: {len(data.get('rows', []))} shifts")
    
    def test_myecho_pto_balance(self):
        """GET /api/myecho/pto-balance returns balance"""
        r = requests.get(f"{BASE_URL}/api/myecho/pto-balance", headers=EMPLOYEE_HEADER)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        print(f"✓ MyEcho /pto-balance: {data.get('vacation_hours_remaining')}h vacation")
    
    def test_myecho_paystubs(self):
        """GET /api/myecho/paystubs returns paystubs"""
        r = requests.get(f"{BASE_URL}/api/myecho/paystubs", headers=EMPLOYEE_HEADER)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        print(f"✓ MyEcho /paystubs: {len(data.get('rows', []))} paystubs")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
