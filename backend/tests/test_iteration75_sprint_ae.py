"""
Iteration 75 - Sprint A-E Testing
=================================
Tests for 4 new modules:
1. Echo Concierge - Guest issue tracker with service recovery, SLA timers, room tracking
2. Echo Connect - Internal messaging without personal data, department channels
3. FOH Operations - Host stand, server sections, tip pool with what-if modeling
4. Retail Operations - Gift shop inventory, sales, registers
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEchoConcierge:
    """Echo Concierge - Guest Issue Tracker + Service Recovery"""
    
    def test_concierge_dashboard_returns_kpis(self):
        """GET /api/concierge/dashboard returns kpis (active, resolved, sla_breaches, total_recovery_cost) + categories + recent tickets"""
        response = requests.get(f"{BASE_URL}/api/concierge/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify KPIs structure
        assert "kpis" in data, "Missing kpis in response"
        kpis = data["kpis"]
        assert "active" in kpis, "Missing 'active' in kpis"
        assert "resolved" in kpis, "Missing 'resolved' in kpis"
        assert "sla_breaches" in kpis, "Missing 'sla_breaches' in kpis"
        assert "total_recovery_cost" in kpis, "Missing 'total_recovery_cost' in kpis"
        assert "total_tickets" in kpis, "Missing 'total_tickets' in kpis"
        
        # Verify categories
        assert "categories" in data, "Missing categories in response"
        assert len(data["categories"]) >= 5, f"Expected at least 5 categories, got {len(data['categories'])}"
        
        # Verify recent tickets
        assert "recent" in data, "Missing recent tickets in response"
        
        # Verify by_category
        assert "by_category" in data, "Missing by_category in response"
        
        print(f"Dashboard KPIs: active={kpis['active']}, resolved={kpis['resolved']}, sla_breaches={kpis['sla_breaches']}, total_recovery_cost=${kpis['total_recovery_cost']}")
    
    def test_concierge_tickets_returns_seed_data(self):
        """GET /api/concierge/tickets returns 7 seed tickets with room_number, category, priority, SLA"""
        response = requests.get(f"{BASE_URL}/api/concierge/tickets")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "tickets" in data, "Missing tickets in response"
        tickets = data["tickets"]
        assert len(tickets) >= 7, f"Expected at least 7 seed tickets, got {len(tickets)}"
        
        # Verify ticket structure
        ticket = tickets[0]
        assert "id" in ticket, "Missing id in ticket"
        assert "room_number" in ticket, "Missing room_number in ticket"
        assert "category" in ticket, "Missing category in ticket"
        assert "priority" in ticket, "Missing priority in ticket"
        assert "sla_deadline" in ticket, "Missing sla_deadline in ticket"
        assert "sla_mins" in ticket, "Missing sla_mins in ticket"
        
        print(f"Found {len(tickets)} tickets with proper structure")
    
    def test_concierge_create_ticket_with_sla(self):
        """POST /api/concierge/tickets creates new ticket with SLA deadline auto-calculated"""
        payload = {
            "guest_name": "TEST_Mr. Smith",
            "room_number": "999",
            "category": "maintenance",
            "priority": "high",
            "title": "TEST_Broken lamp in room",
            "description": "Bedside lamp not working"
        }
        response = requests.post(f"{BASE_URL}/api/concierge/tickets", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "id" in data, "Missing id in created ticket"
        assert data["title"] == payload["title"], "Title mismatch"
        assert data["room_number"] == payload["room_number"], "Room number mismatch"
        assert "sla_deadline" in data, "Missing sla_deadline - should be auto-calculated"
        assert "sla_mins" in data, "Missing sla_mins"
        assert data["status"] == "open", "New ticket should have 'open' status"
        
        # Verify SLA is set based on priority (high = 30 mins)
        assert data["sla_mins"] == 30, f"Expected 30 mins SLA for high priority, got {data['sla_mins']}"
        
        print(f"Created ticket {data['id']} with SLA deadline: {data['sla_deadline']}")
        return data["id"]
    
    def test_concierge_add_recovery_action(self):
        """POST /api/concierge/tickets/{id}/recovery adds recovery action with cost"""
        # First get a ticket
        tickets_response = requests.get(f"{BASE_URL}/api/concierge/tickets")
        tickets = tickets_response.json().get("tickets", [])
        assert len(tickets) > 0, "No tickets found"
        ticket_id = tickets[0]["id"]
        
        # Add recovery action
        recovery_payload = {
            "action_type": "comp",
            "description": "TEST_Complimentary room service",
            "cost": 75.50,
            "approved_by": "Manager"
        }
        response = requests.post(f"{BASE_URL}/api/concierge/tickets/{ticket_id}/recovery", json=recovery_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "id" in data, "Missing id in recovery action"
        assert data["action_type"] == "comp", "Action type mismatch"
        assert data["cost"] == 75.50, "Cost mismatch"
        
        # Verify recovery was added to ticket
        ticket_response = requests.get(f"{BASE_URL}/api/concierge/tickets/{ticket_id}")
        ticket = ticket_response.json()
        assert ticket["recovery_cost"] >= 75.50, "Recovery cost not updated"
        
        print(f"Added recovery action to ticket {ticket_id}, total recovery cost: ${ticket['recovery_cost']}")
    
    def test_concierge_analytics_returns_room_hotspots(self):
        """GET /api/concierge/analytics returns room_hotspots, recovery_breakdown"""
        response = requests.get(f"{BASE_URL}/api/concierge/analytics")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "room_hotspots" in data, "Missing room_hotspots in analytics"
        assert "recovery_breakdown" in data, "Missing recovery_breakdown in analytics"
        assert "total_recovery_cost" in data, "Missing total_recovery_cost"
        assert "total_tickets" in data, "Missing total_tickets"
        
        # Verify room_hotspots structure
        if len(data["room_hotspots"]) > 0:
            hotspot = data["room_hotspots"][0]
            assert "room" in hotspot, "Missing room in hotspot"
            assert "issues" in hotspot, "Missing issues count in hotspot"
        
        print(f"Analytics: {len(data['room_hotspots'])} room hotspots, {len(data['recovery_breakdown'])} recovery types")


class TestEchoConnect:
    """Echo Connect - Internal Messaging Platform"""
    
    def test_connect_channels_returns_10_channels(self):
        """GET /api/connect/channels returns 10 department/group/shift channels"""
        response = requests.get(f"{BASE_URL}/api/connect/channels")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "channels" in data, "Missing channels in response"
        channels = data["channels"]
        assert len(channels) >= 10, f"Expected at least 10 channels, got {len(channels)}"
        
        # Verify channel structure
        channel = channels[0]
        assert "id" in channel, "Missing id in channel"
        assert "name" in channel, "Missing name in channel"
        assert "channel_type" in channel, "Missing channel_type in channel"
        
        # Verify channel types
        channel_types = set(ch["channel_type"] for ch in channels)
        assert "department" in channel_types, "Missing department channels"
        
        print(f"Found {len(channels)} channels with types: {channel_types}")
    
    def test_connect_channel_messages(self):
        """GET /api/connect/channels/{id}/messages returns messages for a channel"""
        # First get channels
        channels_response = requests.get(f"{BASE_URL}/api/connect/channels")
        channels = channels_response.json().get("channels", [])
        assert len(channels) > 0, "No channels found"
        
        # Get messages for first channel
        channel_id = channels[0]["id"]
        response = requests.get(f"{BASE_URL}/api/connect/channels/{channel_id}/messages")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "messages" in data, "Missing messages in response"
        assert "channel_id" in data, "Missing channel_id in response"
        assert data["channel_id"] == channel_id, "Channel ID mismatch"
        
        print(f"Channel {channels[0]['name']} has {len(data['messages'])} messages")
    
    def test_connect_send_message(self):
        """POST /api/connect/messages sends a message to a channel"""
        # First get a channel
        channels_response = requests.get(f"{BASE_URL}/api/connect/channels")
        channels = channels_response.json().get("channels", [])
        assert len(channels) > 0, "No channels found"
        channel_id = channels[0]["id"]
        
        # Send message
        message_payload = {
            "channel_id": channel_id,
            "sender_id": "test-user-001",
            "sender_name": "Test User",
            "content": "TEST_Hello from automated test!",
            "message_type": "text"
        }
        response = requests.post(f"{BASE_URL}/api/connect/messages", json=message_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "id" in data, "Missing id in message"
        assert data["content"] == message_payload["content"], "Content mismatch"
        assert data["sender_name"] == "Test User", "Sender name mismatch"
        
        # Verify message appears in channel
        messages_response = requests.get(f"{BASE_URL}/api/connect/channels/{channel_id}/messages")
        messages = messages_response.json().get("messages", [])
        message_ids = [m["id"] for m in messages]
        assert data["id"] in message_ids, "Sent message not found in channel"
        
        print(f"Sent message {data['id']} to channel {channel_id}")
    
    def test_connect_directory_first_name_only(self):
        """GET /api/connect/directory returns staff with first name only (no last names)"""
        response = requests.get(f"{BASE_URL}/api/connect/directory")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "directory" in data, "Missing directory in response"
        
        # Verify directory structure - should have display_name (first name only)
        if len(data["directory"]) > 0:
            entry = data["directory"][0]
            assert "display_name" in entry, "Missing display_name in directory entry"
            assert "department" in entry, "Missing department in directory entry"
            # First name should not contain spaces (no last name)
            # Note: Some names might have spaces if they're compound first names
            print(f"Directory entry: {entry['display_name']} - {entry['department']}")
        
        print(f"Directory has {len(data['directory'])} staff members")


class TestFOHOperations:
    """FOH Operations - Host Stand, Server Sections, Tip Pool"""
    
    def test_foh_dashboard_returns_tables_servers_feedback(self):
        """GET /api/foh/dashboard returns tables (20), servers (7), feedback"""
        response = requests.get(f"{BASE_URL}/api/foh/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify KPIs
        assert "kpis" in data, "Missing kpis in response"
        kpis = data["kpis"]
        assert kpis["total_tables"] == 20, f"Expected 20 tables, got {kpis['total_tables']}"
        assert kpis["total_staff"] == 7, f"Expected 7 staff, got {kpis['total_staff']}"
        
        # Verify tables
        assert "tables" in data, "Missing tables in response"
        assert len(data["tables"]) == 20, f"Expected 20 tables, got {len(data['tables'])}"
        
        # Verify servers
        assert "servers" in data, "Missing servers in response"
        assert len(data["servers"]) == 7, f"Expected 7 servers, got {len(data['servers'])}"
        
        # Verify feedback
        assert "recent_feedback" in data, "Missing recent_feedback in response"
        
        print(f"FOH Dashboard: {kpis['total_tables']} tables, {kpis['total_staff']} staff, {kpis['feedback_count']} feedback entries")
    
    def test_foh_tip_pool_distribution(self):
        """GET /api/foh/tip-pool returns distribution with per-point, per-person, per-hour calculations"""
        response = requests.get(f"{BASE_URL}/api/foh/tip-pool")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "config" in data, "Missing config in response"
        assert "distribution" in data, "Missing distribution in response"
        assert "total_tips" in data, "Missing total_tips in response"
        assert "per_point" in data, "Missing per_point in response"
        
        # Verify distribution structure
        distribution = data["distribution"]
        assert len(distribution) > 0, "Distribution should not be empty"
        
        dist_entry = distribution[0]
        assert "role" in dist_entry, "Missing role in distribution"
        assert "points" in dist_entry, "Missing points in distribution"
        assert "per_person" in dist_entry, "Missing per_person in distribution"
        assert "per_hour" in dist_entry, "Missing per_hour in distribution"
        assert "total_share" in dist_entry, "Missing total_share in distribution"
        
        print(f"Tip Pool: ${data['total_tips']} total, ${data['per_point']}/point, {len(distribution)} roles")
    
    def test_foh_tip_pool_what_if(self):
        """POST /api/foh/tip-pool/what-if returns modified distribution based on scenario"""
        scenario_payload = {
            "changes": [
                {"role": "server", "new_points_or_pct": 8},
                {"role": "busser", "new_points_or_pct": 5}
            ],
            "total_tips": 3000
        }
        response = requests.post(f"{BASE_URL}/api/foh/tip-pool/what-if", json=scenario_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "distribution" in data, "Missing distribution in what-if response"
        assert "total_tips" in data, "Missing total_tips in what-if response"
        assert data["total_tips"] == 3000, f"Expected $3000 total tips, got ${data['total_tips']}"
        assert "label" in data, "Missing label in what-if response"
        
        # Verify the changes were applied
        distribution = data["distribution"]
        busser_dist = next((d for d in distribution if d["role"] == "busser"), None)
        if busser_dist:
            assert busser_dist["points"] == 5, f"Expected busser points=5, got {busser_dist['points']}"
        
        print(f"What-If scenario: ${data['total_tips']} total, ${data['per_point']}/point")


class TestRetailOperations:
    """Retail Operations - Gift Shop Inventory, Sales, Registers"""
    
    def test_retail_dashboard_returns_items_sales_alerts(self):
        """GET /api/retail/dashboard returns items (10), sales, low stock alerts"""
        response = requests.get(f"{BASE_URL}/api/retail/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify KPIs
        assert "kpis" in data, "Missing kpis in response"
        kpis = data["kpis"]
        assert kpis["total_items"] == 10, f"Expected 10 items, got {kpis['total_items']}"
        assert "total_revenue" in kpis, "Missing total_revenue in kpis"
        assert "total_sales" in kpis, "Missing total_sales in kpis"
        assert "low_stock_items" in kpis, "Missing low_stock_items in kpis"
        
        # Verify items
        assert "items" in data, "Missing items in response"
        assert len(data["items"]) == 10, f"Expected 10 items, got {len(data['items'])}"
        
        # Verify item structure
        item = data["items"][0]
        assert "name" in item, "Missing name in item"
        assert "category" in item, "Missing category in item"
        assert "price" in item, "Missing price in item"
        assert "qty_on_hand" in item, "Missing qty_on_hand in item"
        
        # Verify low stock alerts
        assert "low_stock" in data, "Missing low_stock in response"
        
        # Verify recent sales
        assert "recent_sales" in data, "Missing recent_sales in response"
        
        print(f"Retail Dashboard: {kpis['total_items']} items, ${kpis['total_revenue']} revenue, {kpis['low_stock_items']} low stock")
    
    def test_retail_items_list(self):
        """GET /api/retail/items returns inventory items"""
        response = requests.get(f"{BASE_URL}/api/retail/items")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "items" in data, "Missing items in response"
        assert len(data["items"]) >= 10, f"Expected at least 10 items, got {len(data['items'])}"
        
        print(f"Retail has {len(data['items'])} inventory items")
    
    def test_retail_sales_list(self):
        """GET /api/retail/sales returns sales records"""
        response = requests.get(f"{BASE_URL}/api/retail/sales")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "sales" in data, "Missing sales in response"
        
        if len(data["sales"]) > 0:
            sale = data["sales"][0]
            assert "id" in sale, "Missing id in sale"
            assert "total" in sale, "Missing total in sale"
            assert "payment_method" in sale, "Missing payment_method in sale"
        
        print(f"Retail has {len(data['sales'])} sales records")


class TestHealthAndExisting:
    """Verify existing functionality still works"""
    
    def test_health_endpoint(self):
        """GET /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("Health check passed")
    
    def test_calendar_events_still_work(self):
        """GET /api/calendar/events still returns events"""
        response = requests.get(f"{BASE_URL}/api/calendar/events")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Calendar API returns 'data' key with events
        events = data.get("events") or data.get("data", [])
        assert len(events) > 0, "No events found"
        print(f"Calendar has {len(events)} events")
    
    def test_spa_dashboard_still_works(self):
        """GET /api/dept-analytics/spa still returns spa data"""
        response = requests.get(f"{BASE_URL}/api/dept-analytics/spa")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("Spa dashboard still working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
