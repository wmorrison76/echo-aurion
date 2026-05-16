"""iter236 · Backend tests for new endpoints:
- POST /api/ecw-ops/orders/place (quick one-shot PO)
- POST /api/ecw-ops/inventory/audit-batch (offline voice audit)
- GET /api/ecw-ops/inventory/audit/{audit_id}
- POST /api/team-chat/rooms (create room)
- POST /api/team-chat/rooms/{room_id}/send (send message)
- GET /api/team-chat/rooms/{room_id}/messages (list messages)
- Regression: /api/echoaurium/outlets, /api/echo-voice/proactive-briefing, /api/ecw-ops/shift-notes
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
HEADERS = {"Content-Type": "application/json", "X-User-Id": "chef-william"}


class TestQuickPlaceOrder:
    """POST /api/ecw-ops/orders/place — mobile one-tap PO creation"""

    def test_place_order_success(self):
        """Valid order with items returns ok + po object"""
        payload = {
            "outlet_id": "outlet-rooftop",
            "vendor_name": "TEST_Supplier_236",
            "items": [
                {"name": "TEST_Tomatoes", "qty": 10, "unit": "lb", "unit_price": 2.50},
                {"name": "TEST_Onions", "qty": 5, "unit": "lb", "unit_price": 1.25},
            ],
            "note": "Test order from iter236",
        }
        r = requests.post(f"{BASE_URL}/api/ecw-ops/orders/place", json=payload, headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "po" in data
        po = data["po"]
        assert po.get("status") == "ordered"
        assert po.get("source") == "mobile-quick"
        assert po.get("total") == 31.25  # 10*2.50 + 5*1.25
        assert po.get("item_count") == 2
        assert "id" in po

    def test_place_order_empty_items_returns_400(self):
        """Empty items list returns 400"""
        payload = {
            "outlet_id": "outlet-rooftop",
            "vendor_name": "TEST_Supplier_236",
            "items": [],
        }
        r = requests.post(f"{BASE_URL}/api/ecw-ops/orders/place", json=payload, headers=HEADERS)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"


class TestInventoryAuditBatch:
    """POST /api/ecw-ops/inventory/audit-batch — offline voice audit ingestion"""

    def test_audit_batch_creates_entries(self):
        """Valid batch creates audit and entries"""
        audit_id = f"TEST_audit-{uuid.uuid4().hex[:8]}"
        payload = {
            "outlet_id": "outlet-rooftop",
            "audit_id": audit_id,
            "entries": [
                {"shelf": "shelf-1 · row-top", "item_name": "tomato", "qty": 2, "unit": "cs", "location_id": "walk-in-1", "spoken_raw": "two cases tomato"},
                {"shelf": "shelf-1 · row-middle", "item_name": "corn", "qty": 1, "unit": "cs", "location_id": "walk-in-1", "spoken_raw": "corn one case"},
            ],
            "device_id": "test-device-236",
        }
        r = requests.post(f"{BASE_URL}/api/ecw-ops/inventory/audit-batch", json=payload, headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("audit_id") == audit_id
        assert data.get("saved") == 2

    def test_audit_batch_auto_generates_audit_id(self):
        """If no audit_id provided, one is generated"""
        payload = {
            "outlet_id": "outlet-rooftop",
            "entries": [
                {"shelf": "shelf-2", "item_name": "spinach", "qty": 3, "unit": "cs"},
            ],
        }
        r = requests.post(f"{BASE_URL}/api/ecw-ops/inventory/audit-batch", json=payload, headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "audit_id" in data
        assert data["audit_id"].startswith("audit-")


class TestGetInventoryAudit:
    """GET /api/ecw-ops/inventory/audit/{audit_id}"""

    def test_get_audit_returns_entries(self):
        """Create audit then retrieve it"""
        audit_id = f"TEST_audit-get-{uuid.uuid4().hex[:8]}"
        # Create
        payload = {
            "outlet_id": "outlet-rooftop",
            "audit_id": audit_id,
            "entries": [
                {"shelf": "shelf-1", "item_name": "lettuce", "qty": 4, "unit": "cs"},
            ],
        }
        r1 = requests.post(f"{BASE_URL}/api/ecw-ops/inventory/audit-batch", json=payload, headers=HEADERS)
        assert r1.status_code == 200

        # Retrieve
        r2 = requests.get(f"{BASE_URL}/api/ecw-ops/inventory/audit/{audit_id}", headers=HEADERS)
        assert r2.status_code == 200, f"Expected 200, got {r2.status_code}: {r2.text}"
        data = r2.json()
        assert data.get("ok") is True
        assert "audit" in data
        assert "entries" in data
        assert data.get("count") >= 1
        # Verify entry data
        entries = data["entries"]
        assert any(e["item_name"] == "lettuce" for e in entries)

    def test_get_nonexistent_audit_returns_404(self):
        """Non-existent audit returns 404"""
        r = requests.get(f"{BASE_URL}/api/ecw-ops/inventory/audit/nonexistent-audit-xyz", headers=HEADERS)
        assert r.status_code == 404


class TestTeamChatRooms:
    """POST /api/team-chat/rooms — create chat room"""

    def test_create_room_success(self):
        """Create a new chat room"""
        payload = {
            "name": f"TEST_Room_{uuid.uuid4().hex[:6]}",
            "kind": "group",
            "members": ["chef-william", "sous-chef-maria"],
        }
        r = requests.post(f"{BASE_URL}/api/team-chat/rooms", json=payload, headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "room" in data
        room = data["room"]
        assert "id" in room
        assert room.get("name") == payload["name"]
        assert "chef-william" in room.get("members", [])


class TestTeamChatSendMessage:
    """POST /api/team-chat/rooms/{room_id}/send — send message"""

    def test_send_message_success(self):
        """Send a message to a room"""
        # First create a room
        room_payload = {"name": f"TEST_MsgRoom_{uuid.uuid4().hex[:6]}", "kind": "group", "members": []}
        r1 = requests.post(f"{BASE_URL}/api/team-chat/rooms", json=room_payload, headers=HEADERS)
        assert r1.status_code == 200
        room_id = r1.json()["room"]["id"]

        # Send message
        msg_payload = {"text": "Hello from iter236 test!"}
        r2 = requests.post(f"{BASE_URL}/api/team-chat/rooms/{room_id}/send", json=msg_payload, headers=HEADERS)
        assert r2.status_code == 200, f"Expected 200, got {r2.status_code}: {r2.text}"
        data = r2.json()
        assert data.get("ok") is True
        assert "message" in data
        msg = data["message"]
        assert msg.get("text") == "Hello from iter236 test!"
        assert msg.get("author_id") == "chef-william"
        assert "id" in msg

    def test_send_message_updates_last_message(self):
        """Sending a message updates room's last_message"""
        # Create room
        room_payload = {"name": f"TEST_LastMsg_{uuid.uuid4().hex[:6]}", "kind": "group", "members": []}
        r1 = requests.post(f"{BASE_URL}/api/team-chat/rooms", json=room_payload, headers=HEADERS)
        room_id = r1.json()["room"]["id"]

        # Send message
        msg_text = f"Test message {uuid.uuid4().hex[:6]}"
        r2 = requests.post(f"{BASE_URL}/api/team-chat/rooms/{room_id}/send", json={"text": msg_text}, headers=HEADERS)
        assert r2.status_code == 200

        # Verify by listing rooms
        r3 = requests.get(f"{BASE_URL}/api/team-chat/rooms?user_id=chef-william", headers=HEADERS)
        assert r3.status_code == 200
        rooms = r3.json().get("rows", [])
        room = next((r for r in rooms if r["id"] == room_id), None)
        assert room is not None
        assert room.get("last_message") == msg_text[:120]


class TestTeamChatMessages:
    """GET /api/team-chat/rooms/{room_id}/messages — list messages"""

    def test_list_messages_chronological(self):
        """Messages are returned in chronological order"""
        # Create room
        room_payload = {"name": f"TEST_ListMsg_{uuid.uuid4().hex[:6]}", "kind": "group", "members": []}
        r1 = requests.post(f"{BASE_URL}/api/team-chat/rooms", json=room_payload, headers=HEADERS)
        room_id = r1.json()["room"]["id"]

        # Send multiple messages
        for i in range(3):
            requests.post(f"{BASE_URL}/api/team-chat/rooms/{room_id}/send", json={"text": f"Message {i}"}, headers=HEADERS)

        # List messages
        r2 = requests.get(f"{BASE_URL}/api/team-chat/rooms/{room_id}/messages", headers=HEADERS)
        assert r2.status_code == 200, f"Expected 200, got {r2.status_code}: {r2.text}"
        data = r2.json()
        assert data.get("ok") is True
        assert "rows" in data
        rows = data["rows"]
        assert len(rows) >= 3
        # Verify chronological order (first message should be earliest)
        texts = [r["text"] for r in rows[-3:]]
        assert texts == ["Message 0", "Message 1", "Message 2"]


class TestRegressionOutlets:
    """Regression: /api/echoaurium/outlets still returns 8 neutral names"""

    def test_outlets_returns_8_neutral_names(self):
        r = requests.get(f"{BASE_URL}/api/echoaurium/outlets", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True or data.get("count") == 8
        rows = data.get("rows", [])
        assert len(rows) == 8
        # Verify neutral names (no branded resort names)
        names = [o["name"] for o in rows]
        assert "Rooftop Lounge" in names
        assert "Garden Room" in names


class TestRegressionProactiveBriefing:
    """Regression: /api/echo-voice/proactive-briefing still works"""

    def test_proactive_briefing_returns_speech(self):
        r = requests.get(f"{BASE_URL}/api/echo-voice/proactive-briefing?outlet_id=outlet-rooftop", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "speech" in data
        assert len(data["speech"]) > 0


class TestRegressionShiftNotes:
    """Regression: /api/ecw-ops/shift-notes POST/GET still work"""

    def test_create_and_list_shift_notes(self):
        # Create
        payload = {
            "outlet_id": "outlet-rooftop",
            "shift": "pm",
            "text": f"TEST_iter236 shift note {uuid.uuid4().hex[:6]}",
        }
        r1 = requests.post(f"{BASE_URL}/api/ecw-ops/shift-notes", json=payload, headers=HEADERS)
        assert r1.status_code == 200, f"Expected 200, got {r1.status_code}: {r1.text}"
        data1 = r1.json()
        assert data1.get("ok") is True
        assert "note" in data1

        # List
        r2 = requests.get(f"{BASE_URL}/api/ecw-ops/shift-notes?outlet_id=outlet-rooftop&limit=5", headers=HEADERS)
        assert r2.status_code == 200
        data2 = r2.json()
        assert data2.get("ok") is True
        assert "rows" in data2
        assert len(data2["rows"]) > 0
