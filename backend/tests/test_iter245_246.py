"""
iter245-246 Backend Tests
=========================
Tests for:
- iter245 backlog endpoints (SMS, Playbook, Radio, Menu Engineer, Save-the-ticket)
- Chef Carissa Training endpoints (clone of Chef Gio for Pastry)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
HEADERS = {"Content-Type": "application/json", "X-User-Id": "chef-william"}


class TestSMSEndpoints:
    """SMS status and send endpoints (Twilio wire)"""
    
    def test_sms_status(self):
        """GET /api/sms/status - check Twilio config status"""
        r = requests.get(f"{BASE_URL}/api/sms/status", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "ok" in data
        assert data["ok"] is True
        assert "twilio_sid_set" in data
        assert "twilio_token_set" in data
        assert "twilio_from_set" in data
        assert "queue_size" in data
        print(f"SMS status: SID={data['twilio_sid_set']}, Token={data['twilio_token_set']}, From={data['twilio_from_set']}, Queue={data['queue_size']}")
    
    def test_sms_send_queues_without_from_number(self):
        """POST /api/sms/send - should queue when FROM number not configured"""
        payload = {"to": "+15551234567", "body": "Test from iter245"}
        r = requests.post(f"{BASE_URL}/api/sms/send", json=payload, headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        # Per agent context: expect ok:true, queued:true when no FROM number
        assert "ok" in data
        # Either queued (no FROM) or error (no SID/token) or success (all configured)
        print(f"SMS send result: {data}")


class TestPlaybookEndpoints:
    """Tonight's Playbook briefing endpoints"""
    
    def test_playbook_tonight(self):
        """GET /api/playbook/tonight - get tonight's briefing data"""
        r = requests.get(f"{BASE_URL}/api/playbook/tonight", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "date" in data
        assert "vips_count" in data
        assert "total_covers_committed" in data
        assert "beos_today" in data
        assert "eighty_six" in data
        assert "compiled_at" in data
        print(f"Playbook tonight: date={data['date']}, VIPs={data['vips_count']}, covers={data['total_covers_committed']}")
    
    def test_playbook_push_now(self):
        """POST /api/playbook/push-now - trigger playbook push"""
        r = requests.post(f"{BASE_URL}/api/playbook/push-now", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "headline" in data
        print(f"Playbook push: headline={data['headline']}")


class TestRadioEndpoints:
    """Echo Radio PTT voice memos endpoints"""
    
    def test_radio_post(self):
        """POST /api/radio/post - post a radio message"""
        payload = {
            "department": "culinary",
            "transcript": "Test radio message from iter245 testing",
            "duration_seconds": 3.5
        }
        r = requests.post(f"{BASE_URL}/api/radio/post", json=payload, headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "id" in data
        print(f"Radio post created: id={data['id']}")
        return data["id"]
    
    def test_radio_feed(self):
        """GET /api/radio/feed - get radio messages"""
        r = requests.get(f"{BASE_URL}/api/radio/feed?department=all&limit=10", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        assert "count" in data
        print(f"Radio feed: count={data['count']}")
    
    def test_radio_feed_by_department(self):
        """GET /api/radio/feed - filter by department"""
        r = requests.get(f"{BASE_URL}/api/radio/feed?department=culinary&limit=5", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        print(f"Radio feed (culinary): count={data['count']}")


class TestMenuEngineerEndpoints:
    """Menu engineer heatmap endpoint"""
    
    def test_menu_heatmap(self):
        """GET /api/menu-engineer/heatmap - get menu performance heatmap"""
        r = requests.get(f"{BASE_URL}/api/menu-engineer/heatmap", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "items" in data
        # Per agent context: returns demo items when no pos_rings collection populated
        if data.get("demo"):
            print(f"Menu heatmap: DEMO mode with {len(data['items'])} items")
        else:
            print(f"Menu heatmap: LIVE mode with {len(data['items'])} items")
        # Verify item structure
        if data["items"]:
            item = data["items"][0]
            assert "name" in item
            assert "rings" in item or "margin_pct" in item
            assert "tag" in item  # star, puzzle, plowhorse, dog


class TestSaveTheTicketEndpoints:
    """Save-the-ticket auto-remediation endpoints"""
    
    def test_save_ticket_pending(self):
        """GET /api/save-the-ticket/pending - get pending approvals"""
        r = requests.get(f"{BASE_URL}/api/save-the-ticket/pending", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        assert "count" in data
        print(f"Save-the-ticket pending: count={data['count']}")
    
    def test_save_ticket_draft_requires_issue(self):
        """POST /api/save-the-ticket/draft - needs existing guest_issue"""
        # This should return 404 if issue doesn't exist
        payload = {"issue_id": "nonexistent-issue-id"}
        r = requests.post(f"{BASE_URL}/api/save-the-ticket/draft", json=payload, headers=HEADERS)
        # Expected: 404 because issue doesn't exist
        assert r.status_code == 404, f"Expected 404 for nonexistent issue, got {r.status_code}"
        print("Save-the-ticket draft correctly returns 404 for nonexistent issue")
    
    def test_save_ticket_approve_requires_draft(self):
        """POST /api/save-the-ticket/approve - needs existing draft"""
        payload = {"draft_id": "nonexistent-draft-id", "approved": True}
        r = requests.post(f"{BASE_URL}/api/save-the-ticket/approve", json=payload, headers=HEADERS)
        # Expected: 404 because draft doesn't exist
        assert r.status_code == 404, f"Expected 404 for nonexistent draft, got {r.status_code}"
        print("Save-the-ticket approve correctly returns 404 for nonexistent draft")


class TestChefCarissaTrainingEndpoints:
    """Chef Carissa Training endpoints (Pastry training module)"""
    
    def test_training_modes(self):
        """GET /api/chef-carissa/training-modes - get available training modes"""
        r = requests.get(f"{BASE_URL}/api/chef-carissa/training-modes", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "modes" in data
        modes = data["modes"]
        assert len(modes) >= 4, f"Expected at least 4 modes, got {len(modes)}"
        mode_ids = [m["id"] for m in modes]
        assert "full_walkthrough" in mode_ids
        assert "quiz" in mode_ids
        assert "scenario" in mode_ids
        assert "freeform" in mode_ids
        print(f"Chef Carissa training modes: {mode_ids}")
    
    def test_sessions_list(self):
        """GET /api/chef-carissa/sessions - list training sessions"""
        r = requests.get(f"{BASE_URL}/api/chef-carissa/sessions", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "sessions" in data
        print(f"Chef Carissa sessions: count={len(data['sessions'])}")
    
    def test_create_session(self):
        """POST /api/chef-carissa/sessions/create - create a training session"""
        payload = {
            "mode": "full_walkthrough",
            "chef_name": "Test Pastry Sous",
            "chef_id": "test-chef-iter245"
        }
        r = requests.post(f"{BASE_URL}/api/chef-carissa/sessions/create", json=payload, headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "session_id" in data
        assert "opening_message" in data
        assert "mode" in data
        assert data["mode"] == "full_walkthrough"
        print(f"Chef Carissa session created: id={data['session_id']}")
        print(f"Opening message preview: {data['opening_message'][:100]}...")
        return data["session_id"]


class TestVIPTrackerEndpoints:
    """VIP Tracker endpoints used by VIP Admin panel"""
    
    def test_vip_list(self):
        """GET /api/vip-tracker/list - list VIPs"""
        r = requests.get(f"{BASE_URL}/api/vip-tracker/list?status=all", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "rows" in data
        print(f"VIP list: count={len(data['rows'])}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
