"""
Iteration 140: Spa Command Dashboard (SPA-OPS) + POS Connector Adapter
======================================================================
Tests for:
1. SPA-OPS: 10 endpoints - seed-demo, kpis/today, kpis/trends, utilization, guest-intel, staff, retail, memberships, reputation, actions
2. POS-ADAPTER: 7 endpoints - providers, config (GET/PUT), drain, test-connection, summary, delivery-log
3. REGRESSION: Previous iteration endpoints (production-schedules, cake-orders, cake-assets, spa-services, spa-booking, pamphlet)
4. SECURITY: No _id field leaked in any response
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# ─────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────
@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ─────────────────────────────────────────────
# SPA-OPS: SEED DEMO
# ─────────────────────────────────────────────
class TestSpaOpsSeedDemo:
    """SPA-OPS seed-demo endpoint tests"""
    
    def test_seed_demo_creates_data(self, api_client):
        """POST /api/spa-ops/seed-demo seeds therapists(5+), rooms(8), members(10), retail(5), feedback(30). Idempotent."""
        resp = api_client.post(f"{BASE_URL}/api/spa-ops/seed-demo")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "seeded" in data
        assert "state" in data
        state = data["state"]
        
        # Verify minimum counts
        assert state["therapists"] >= 5, f"Expected at least 5 therapists, got {state['therapists']}"
        assert state["rooms"] >= 8, f"Expected at least 8 rooms, got {state['rooms']}"
        assert state["members"] >= 10, f"Expected at least 10 members, got {state['members']}"
        assert state["retail_items"] >= 5, f"Expected at least 5 retail items, got {state['retail_items']}"
        assert state["feedback"] >= 30, f"Expected at least 30 feedback entries, got {state['feedback']}"
        
        print(f"PASS: seed-demo state: {state}")
    
    def test_seed_demo_idempotent(self, api_client):
        """Subsequent calls don't duplicate data"""
        # First call
        resp1 = api_client.post(f"{BASE_URL}/api/spa-ops/seed-demo")
        state1 = resp1.json()["state"]
        
        # Second call
        resp2 = api_client.post(f"{BASE_URL}/api/spa-ops/seed-demo")
        state2 = resp2.json()["state"]
        
        # Counts should be the same (idempotent)
        assert state1["therapists"] == state2["therapists"], "Therapists count should not increase on second call"
        assert state1["rooms"] == state2["rooms"], "Rooms count should not increase on second call"
        assert state1["members"] == state2["members"], "Members count should not increase on second call"
        
        print(f"PASS: seed-demo is idempotent, counts unchanged: {state2}")


# ─────────────────────────────────────────────
# SPA-OPS: KPIs TODAY
# ─────────────────────────────────────────────
class TestSpaOpsKpisToday:
    """SPA-OPS kpis/today endpoint tests"""
    
    def test_kpis_today_structure(self, api_client):
        """GET /api/spa-ops/kpis/today returns correct structure"""
        resp = api_client.get(f"{BASE_URL}/api/spa-ops/kpis/today")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        # Check top-level keys
        assert "date" in data
        assert "bookings" in data
        assert "revenue" in data
        assert "utilization" in data
        assert "rates" in data
        
        # Check bookings structure
        bookings = data["bookings"]
        assert "total" in bookings
        assert "completed" in bookings
        assert "no_show" in bookings
        assert "cancelled" in bookings
        assert "upcoming_today" in bookings
        assert "vip_today" in bookings
        assert "in_house_today" in bookings
        
        # Check revenue structure
        revenue = data["revenue"]
        assert "total" in revenue
        assert "services" in revenue
        assert "retail" in revenue
        assert "tips" in revenue
        assert "avg_treatment_rate" in revenue
        assert "revenue_per_guest" in revenue
        
        # Check utilization structure
        util = data["utilization"]
        assert "treatment_room" in util
        assert "therapist" in util
        assert "rooms_total" in util
        assert "therapists_total" in util
        
        # Check rates structure
        rates = data["rates"]
        assert "retail_attachment" in rates
        assert "no_show_rate" in rates
        assert "cancellation_rate" in rates
        
        # Verify utilization values are 0..1
        assert 0 <= util["treatment_room"] <= 1, f"treatment_room utilization should be 0..1, got {util['treatment_room']}"
        assert 0 <= util["therapist"] <= 1, f"therapist utilization should be 0..1, got {util['therapist']}"
        
        # Verify rates are 0..1
        assert 0 <= rates["retail_attachment"] <= 1, f"retail_attachment should be 0..1, got {rates['retail_attachment']}"
        assert 0 <= rates["no_show_rate"] <= 1, f"no_show_rate should be 0..1, got {rates['no_show_rate']}"
        assert 0 <= rates["cancellation_rate"] <= 1, f"cancellation_rate should be 0..1, got {rates['cancellation_rate']}"
        
        print(f"PASS: kpis/today structure valid, date: {data['date']}, bookings: {bookings['total']}, revenue: ${revenue['total']}")


# ─────────────────────────────────────────────
# SPA-OPS: KPIs TRENDS
# ─────────────────────────────────────────────
class TestSpaOpsKpisTrends:
    """SPA-OPS kpis/trends endpoint tests"""
    
    def test_kpis_trends_14_days(self, api_client):
        """GET /api/spa-ops/kpis/trends?days=14 returns 14 point time-series"""
        resp = api_client.get(f"{BASE_URL}/api/spa-ops/kpis/trends?days=14")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert "days" in data
        assert "points" in data
        assert data["days"] == 14
        assert len(data["points"]) == 14, f"Expected 14 points, got {len(data['points'])}"
        
        # Check each point structure
        for point in data["points"]:
            assert "date" in point
            assert "bookings" in point
            assert "completed" in point
            assert "revenue" in point
            assert "atr" in point  # avg treatment rate
            assert "no_shows" in point
        
        print(f"PASS: kpis/trends returned {len(data['points'])} points")
    
    def test_kpis_trends_custom_days(self, api_client):
        """GET /api/spa-ops/kpis/trends?days=7 returns 7 points"""
        resp = api_client.get(f"{BASE_URL}/api/spa-ops/kpis/trends?days=7")
        assert resp.status_code == 200
        data = resp.json()
        assert data["days"] == 7
        assert len(data["points"]) == 7
        print(f"PASS: kpis/trends with days=7 returned 7 points")


# ─────────────────────────────────────────────
# SPA-OPS: UTILIZATION
# ─────────────────────────────────────────────
class TestSpaOpsUtilization:
    """SPA-OPS utilization endpoint tests"""
    
    def test_utilization_structure(self, api_client):
        """GET /api/spa-ops/utilization returns rooms[], therapists[], daypart_mix"""
        resp = api_client.get(f"{BASE_URL}/api/spa-ops/utilization")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert "rooms" in data
        assert "therapists" in data
        assert "daypart_mix" in data
        
        # Check rooms structure
        for room in data["rooms"]:
            assert "id" in room
            assert "name" in room
            assert "utilization" in room
            assert 0 <= room["utilization"] <= 1, f"Room utilization should be 0..1, got {room['utilization']}"
        
        # Check therapists structure
        for th in data["therapists"]:
            assert "id" in th
            assert "name" in th
            assert "utilization" in th
            assert 0 <= th["utilization"] <= 1, f"Therapist utilization should be 0..1, got {th['utilization']}"
        
        # Check daypart_mix structure
        daypart = data["daypart_mix"]
        assert "morning" in daypart
        assert "midday" in daypart
        assert "afternoon" in daypart
        assert "evening" in daypart
        
        print(f"PASS: utilization returned {len(data['rooms'])} rooms, {len(data['therapists'])} therapists")


# ─────────────────────────────────────────────
# SPA-OPS: GUEST INTEL
# ─────────────────────────────────────────────
class TestSpaOpsGuestIntel:
    """SPA-OPS guest-intel endpoint tests"""
    
    def test_guest_intel_structure(self, api_client):
        """GET /api/spa-ops/guest-intel returns vip_today[], in_house_today[], rebook_prompts[], counts"""
        resp = api_client.get(f"{BASE_URL}/api/spa-ops/guest-intel")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert "vip_today" in data
        assert "in_house_today" in data
        assert "rebook_prompts" in data
        assert "counts" in data
        
        # Check counts structure
        counts = data["counts"]
        assert "vip" in counts
        assert "in_house" in counts
        assert "rebook_candidates" in counts
        
        # Verify arrays
        assert isinstance(data["vip_today"], list)
        assert isinstance(data["in_house_today"], list)
        assert isinstance(data["rebook_prompts"], list)
        
        print(f"PASS: guest-intel counts: VIP={counts['vip']}, in_house={counts['in_house']}, rebook={counts['rebook_candidates']}")


# ─────────────────────────────────────────────
# SPA-OPS: STAFF
# ─────────────────────────────────────────────
class TestSpaOpsStaff:
    """SPA-OPS staff endpoint tests"""
    
    def test_staff_structure(self, api_client):
        """GET /api/spa-ops/staff returns rows[] with required fields + totals"""
        resp = api_client.get(f"{BASE_URL}/api/spa-ops/staff")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert "rows" in data
        assert "totals" in data
        
        # Check rows structure
        for row in data["rows"]:
            assert "bookings_today" in row
            assert "utilization" in row
            assert "revenue_today" in row
            assert "labor_cost_today" in row
            assert "specialties" in row
            assert "request_ratio" in row
            assert 0 <= row["utilization"] <= 1, f"Staff utilization should be 0..1, got {row['utilization']}"
        
        # Check totals structure
        totals = data["totals"]
        assert "revenue_today" in totals
        assert "labor_cost_today" in totals
        assert "labor_to_revenue_ratio" in totals
        
        print(f"PASS: staff returned {len(data['rows'])} rows, totals: revenue=${totals['revenue_today']}, labor=${totals['labor_cost_today']}")


# ─────────────────────────────────────────────
# SPA-OPS: RETAIL
# ─────────────────────────────────────────────
class TestSpaOpsRetail:
    """SPA-OPS retail endpoint tests"""
    
    def test_retail_structure(self, api_client):
        """GET /api/spa-ops/retail returns items[], low_stock[], attachment_rate_today, retail_revenue_today"""
        resp = api_client.get(f"{BASE_URL}/api/spa-ops/retail")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert "items" in data
        assert "low_stock" in data
        assert "attachment_rate_today" in data
        assert "retail_revenue_today" in data
        
        # Check items structure
        for item in data["items"]:
            assert "margin_pct" in item, f"Item should have margin_pct: {item}"
            assert "low_stock" in item, f"Item should have low_stock boolean: {item}"
            assert "revenue_30d" in item, f"Item should have revenue_30d: {item}"
            assert isinstance(item["low_stock"], bool), f"low_stock should be boolean, got {type(item['low_stock'])}"
        
        # Verify attachment_rate is 0..1
        assert 0 <= data["attachment_rate_today"] <= 1, f"attachment_rate should be 0..1, got {data['attachment_rate_today']}"
        
        print(f"PASS: retail returned {len(data['items'])} items, {len(data['low_stock'])} low stock, attachment_rate={data['attachment_rate_today']}")


# ─────────────────────────────────────────────
# SPA-OPS: MEMBERSHIPS
# ─────────────────────────────────────────────
class TestSpaOpsMemberships:
    """SPA-OPS memberships endpoint tests"""
    
    def test_memberships_structure(self, api_client):
        """GET /api/spa-ops/memberships returns members[] + totals with required fields"""
        resp = api_client.get(f"{BASE_URL}/api/spa-ops/memberships")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert "members" in data
        assert "totals" in data
        
        # Check totals structure
        totals = data["totals"]
        assert "active" in totals
        assert "renewing_soon" in totals
        assert "overdue" in totals
        assert "liability_credits" in totals
        assert "monthly_recurring_revenue" in totals
        assert "redemption_rate" in totals
        
        # Verify redemption_rate is 0..1
        assert 0 <= totals["redemption_rate"] <= 1, f"redemption_rate should be 0..1, got {totals['redemption_rate']}"
        
        print(f"PASS: memberships returned {len(data['members'])} members, totals: active={totals['active']}, MRR=${totals['monthly_recurring_revenue']}")


# ─────────────────────────────────────────────
# SPA-OPS: REPUTATION
# ─────────────────────────────────────────────
class TestSpaOpsReputation:
    """SPA-OPS reputation endpoint tests"""
    
    def test_reputation_structure(self, api_client):
        """GET /api/spa-ops/reputation returns nps, responses, promoters, passives, detractors, feedback[], recovery_queue[]"""
        resp = api_client.get(f"{BASE_URL}/api/spa-ops/reputation")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert "nps" in data
        assert "responses" in data
        assert "promoters" in data
        assert "passives" in data
        assert "detractors" in data
        assert "feedback" in data
        assert "recovery_queue" in data
        
        # Verify NPS formula: (promoters - detractors) / responses * 100
        if data["responses"] > 0:
            expected_nps = round((data["promoters"] / data["responses"] - data["detractors"] / data["responses"]) * 100, 1)
            assert abs(data["nps"] - expected_nps) < 0.2, f"NPS formula mismatch: expected {expected_nps}, got {data['nps']}"
        
        # NPS should be between -100 and 100
        if data["nps"] is not None:
            assert -100 <= data["nps"] <= 100, f"NPS should be -100..100, got {data['nps']}"
        
        print(f"PASS: reputation NPS={data['nps']}, responses={data['responses']}, promoters={data['promoters']}, detractors={data['detractors']}")


# ─────────────────────────────────────────────
# SPA-OPS: ACTIONS
# ─────────────────────────────────────────────
class TestSpaOpsActions:
    """SPA-OPS actions endpoint tests"""
    
    def test_actions_structure(self, api_client):
        """GET /api/spa-ops/actions returns actions[] with kind, severity, msg. Count >= 1."""
        resp = api_client.get(f"{BASE_URL}/api/spa-ops/actions")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert "actions" in data
        assert "count" in data
        assert data["count"] >= 1, f"Should have at least 1 action, got {data['count']}"
        
        # Check each action structure
        valid_kinds = {"alert", "recommend", "info"}
        valid_severities = {"high", "warn", "info"}
        
        for action in data["actions"]:
            assert "kind" in action
            assert "severity" in action
            assert "msg" in action
            assert action["kind"] in valid_kinds, f"Invalid kind: {action['kind']}"
            assert action["severity"] in valid_severities, f"Invalid severity: {action['severity']}"
            assert len(action["msg"]) > 0, "Action msg should not be empty"
        
        print(f"PASS: actions returned {data['count']} actions")
        for a in data["actions"][:3]:
            print(f"  - [{a['severity']}] {a['kind']}: {a['msg'][:60]}...")


# ─────────────────────────────────────────────
# POS-ADAPTER: PROVIDERS
# ─────────────────────────────────────────────
class TestPosAdapterProviders:
    """POS-ADAPTER providers endpoint tests"""
    
    def test_providers_returns_4(self, api_client):
        """GET /api/pos-adapter/providers returns 4 providers (mock, webhook, micros, toast)"""
        resp = api_client.get(f"{BASE_URL}/api/pos-adapter/providers")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert "providers" in data
        assert len(data["providers"]) == 4, f"Expected 4 providers, got {len(data['providers'])}"
        
        provider_ids = {p["id"] for p in data["providers"]}
        expected_ids = {"mock", "webhook", "micros", "toast"}
        assert provider_ids == expected_ids, f"Expected providers {expected_ids}, got {provider_ids}"
        
        print(f"PASS: providers returned 4 providers: {provider_ids}")


# ─────────────────────────────────────────────
# POS-ADAPTER: CONFIG
# ─────────────────────────────────────────────
class TestPosAdapterConfig:
    """POS-ADAPTER config endpoint tests"""
    
    def test_config_put_masks_token(self, api_client):
        """PUT /api/pos-adapter/config saves config. Response auth_token is masked (contains •) and raw token NOT leaked."""
        payload = {
            "provider": "webhook",
            "endpoint": "https://example.com/pos-webhook",
            "auth_token": "secret_token_12345678",
            "active": True
        }
        resp = api_client.put(f"{BASE_URL}/api/pos-adapter/config", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        # Should have masked token
        assert "auth_token_masked" in data, "Response should have auth_token_masked"
        assert "•" in data["auth_token_masked"], f"Masked token should contain •, got {data['auth_token_masked']}"
        
        # Should NOT have raw token
        assert "auth_token" not in data, "Response should NOT contain raw auth_token"
        assert "secret_token_12345678" not in str(data), "Raw token should not appear anywhere in response"
        
        assert data["configured"] == True
        print(f"PASS: config PUT masks token: {data['auth_token_masked']}")
    
    def test_config_get_excludes_raw_token(self, api_client):
        """GET /api/pos-adapter/config returns configured=true, masked auth_token_masked, excludes raw auth_token"""
        # First set a config
        api_client.put(f"{BASE_URL}/api/pos-adapter/config", json={
            "provider": "mock",
            "auth_token": "test_secret_token_xyz",
            "active": True
        })
        
        # Now GET
        resp = api_client.get(f"{BASE_URL}/api/pos-adapter/config")
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["configured"] == True
        assert "auth_token_masked" in data
        assert "auth_token" not in data, "GET should not return raw auth_token"
        assert "test_secret_token_xyz" not in str(data), "Raw token should not appear in GET response"
        
        print(f"PASS: config GET excludes raw token, masked: {data.get('auth_token_masked')}")


# ─────────────────────────────────────────────
# POS-ADAPTER: DRAIN
# ─────────────────────────────────────────────
class TestPosAdapterDrain:
    """POS-ADAPTER drain endpoint tests"""
    
    def test_drain_mock_delivers_all(self, api_client):
        """POST /api/pos-adapter/drain with provider=mock marks all pending items delivered"""
        # First configure mock provider
        api_client.put(f"{BASE_URL}/api/pos-adapter/config", json={
            "provider": "mock",
            "active": True
        })
        
        # Create a spa service to generate a pending pos_outbound item
        svc_resp = api_client.post(f"{BASE_URL}/api/spa-services/", json={
            "name": "TEST_Drain Mock Service",
            "category": "massage",
            "price": 100.00
        })
        assert svc_resp.status_code == 200
        
        # Now drain
        drain_resp = api_client.post(f"{BASE_URL}/api/pos-adapter/drain")
        assert drain_resp.status_code == 200, f"Expected 200, got {drain_resp.status_code}: {drain_resp.text}"
        data = drain_resp.json()
        
        assert "provider" in data
        assert "attempted" in data
        assert "delivered" in data
        assert "failed" in data
        assert data["provider"] == "mock"
        
        # With mock provider, all attempted should be delivered
        if data["attempted"] > 0:
            assert data["delivered"] == data["attempted"], f"Mock should deliver all: attempted={data['attempted']}, delivered={data['delivered']}"
            assert data["failed"] == 0
        
        print(f"PASS: drain mock: attempted={data['attempted']}, delivered={data['delivered']}, failed={data['failed']}")
    
    def test_drain_webhook_unreachable_fails(self, api_client):
        """POST /api/pos-adapter/drain with provider=webhook to unreachable endpoint marks items as failed"""
        # Configure webhook to unreachable endpoint
        api_client.put(f"{BASE_URL}/api/pos-adapter/config", json={
            "provider": "webhook",
            "endpoint": "https://unreachable-endpoint-12345.invalid/webhook",
            "auth_token": "test_token",
            "active": True
        })
        
        # Create a spa service to generate a pending pos_outbound item
        svc_resp = api_client.post(f"{BASE_URL}/api/spa-services/", json={
            "name": "TEST_Drain Webhook Fail Service",
            "category": "facial",
            "price": 150.00
        })
        assert svc_resp.status_code == 200
        
        # Now drain - should fail
        drain_resp = api_client.post(f"{BASE_URL}/api/pos-adapter/drain")
        assert drain_resp.status_code == 200
        data = drain_resp.json()
        
        # With unreachable webhook, items should fail
        if data["attempted"] > 0:
            assert data["failed"] > 0, f"Unreachable webhook should have failures: {data}"
        
        print(f"PASS: drain webhook unreachable: attempted={data['attempted']}, failed={data['failed']}")


# ─────────────────────────────────────────────
# POS-ADAPTER: TEST CONNECTION
# ─────────────────────────────────────────────
class TestPosAdapterTestConnection:
    """POS-ADAPTER test-connection endpoint tests"""
    
    def test_connection_returns_log_entry(self, api_client):
        """POST /api/pos-adapter/test-connection returns log entry with status, http_status, duration_ms"""
        # Configure mock provider for successful test
        api_client.put(f"{BASE_URL}/api/pos-adapter/config", json={
            "provider": "mock",
            "active": True
        })
        
        resp = api_client.post(f"{BASE_URL}/api/pos-adapter/test-connection")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert "status" in data
        assert "http_status" in data
        assert "duration_ms" in data
        assert "_id" not in data, "_id should not be leaked"
        
        # Mock provider should succeed
        assert data["status"] == "delivered"
        assert data["http_status"] == 200
        assert data["duration_ms"] >= 0
        
        print(f"PASS: test-connection status={data['status']}, http_status={data['http_status']}, duration={data['duration_ms']}ms")


# ─────────────────────────────────────────────
# POS-ADAPTER: SUMMARY
# ─────────────────────────────────────────────
class TestPosAdapterSummary:
    """POS-ADAPTER summary endpoint tests"""
    
    def test_summary_structure(self, api_client):
        """GET /api/pos-adapter/summary returns provider, active, queue{pending,delivered,dead}, last_attempt"""
        resp = api_client.get(f"{BASE_URL}/api/pos-adapter/summary")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert "provider" in data
        assert "active" in data
        assert "queue" in data
        assert "last_attempt" in data
        
        queue = data["queue"]
        assert "pending" in queue
        assert "delivered" in queue
        assert "dead" in queue
        
        print(f"PASS: summary provider={data['provider']}, queue: pending={queue['pending']}, delivered={queue['delivered']}, dead={queue['dead']}")


# ─────────────────────────────────────────────
# POS-ADAPTER: DELIVERY LOG
# ─────────────────────────────────────────────
class TestPosAdapterDeliveryLog:
    """POS-ADAPTER delivery-log endpoint tests"""
    
    def test_delivery_log_structure(self, api_client):
        """GET /api/pos-adapter/delivery-log returns items[] with required fields"""
        resp = api_client.get(f"{BASE_URL}/api/pos-adapter/delivery-log")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert "items" in data
        assert "total" in data
        
        # Check items structure (if any exist)
        for item in data["items"]:
            assert "_id" not in item, "_id should not be leaked"
            assert "provider" in item
            assert "kind" in item
            assert "action" in item
            assert "status" in item
            assert "http_status" in item
            assert "duration_ms" in item
        
        print(f"PASS: delivery-log returned {data['total']} items")


# ─────────────────────────────────────────────
# SECURITY: NO _id LEAK
# ─────────────────────────────────────────────
class TestSecurityNoIdLeak:
    """Verify no _id field leaked in any spa-ops or pos-adapter response"""
    
    def test_spa_ops_no_id_leak(self, api_client):
        """All spa-ops endpoints should not leak _id"""
        endpoints = [
            "/api/spa-ops/kpis/today",
            "/api/spa-ops/kpis/trends",
            "/api/spa-ops/utilization",
            "/api/spa-ops/guest-intel",
            "/api/spa-ops/staff",
            "/api/spa-ops/retail",
            "/api/spa-ops/memberships",
            "/api/spa-ops/reputation",
            "/api/spa-ops/actions",
        ]
        
        for endpoint in endpoints:
            resp = api_client.get(f"{BASE_URL}{endpoint}")
            assert resp.status_code == 200, f"{endpoint} failed: {resp.status_code}"
            data_str = resp.text
            assert '"_id"' not in data_str, f"_id leaked in {endpoint}"
        
        print(f"PASS: No _id leak in {len(endpoints)} spa-ops endpoints")
    
    def test_pos_adapter_no_id_leak(self, api_client):
        """All pos-adapter endpoints should not leak _id"""
        endpoints = [
            "/api/pos-adapter/providers",
            "/api/pos-adapter/config",
            "/api/pos-adapter/summary",
            "/api/pos-adapter/delivery-log",
        ]
        
        for endpoint in endpoints:
            resp = api_client.get(f"{BASE_URL}{endpoint}")
            assert resp.status_code == 200, f"{endpoint} failed: {resp.status_code}"
            data_str = resp.text
            assert '"_id"' not in data_str, f"_id leaked in {endpoint}"
        
        print(f"PASS: No _id leak in {len(endpoints)} pos-adapter endpoints")


# ─────────────────────────────────────────────
# REGRESSION TESTS
# ─────────────────────────────────────────────
class TestRegression:
    """Regression tests for previous iteration endpoints"""
    
    def test_production_schedules_summary(self, api_client):
        """GET /api/production-schedules/summary still works"""
        resp = api_client.get(f"{BASE_URL}/api/production-schedules/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_open" in data
        print(f"PASS: production-schedules/summary works")
    
    def test_cake_orders_list(self, api_client):
        """GET /api/cake-orders/ still works"""
        resp = api_client.get(f"{BASE_URL}/api/cake-orders/")
        assert resp.status_code == 200
        data = resp.json()
        assert "orders" in data
        print(f"PASS: cake-orders list works")
    
    def test_cake_assets_advanced_tools(self, api_client):
        """GET /api/cake-assets/advanced-tools still works"""
        resp = api_client.get(f"{BASE_URL}/api/cake-assets/advanced-tools")
        assert resp.status_code == 200
        data = resp.json()
        assert "tools" in data
        print(f"PASS: cake-assets/advanced-tools works")
    
    def test_spa_services_list(self, api_client):
        """GET /api/spa-services/ still works"""
        resp = api_client.get(f"{BASE_URL}/api/spa-services/")
        assert resp.status_code == 200
        data = resp.json()
        assert "services" in data
        print(f"PASS: spa-services list works")
    
    def test_spa_booking_services(self, api_client):
        """GET /api/spa-booking/services/{slug} still works"""
        resp = api_client.get(f"{BASE_URL}/api/spa-booking/services/test-hotel")
        assert resp.status_code == 200
        data = resp.json()
        assert "services" in data
        print(f"PASS: spa-booking/services works")
    
    def test_pamphlet_list(self, api_client):
        """GET /api/pamphlet/ still works"""
        resp = api_client.get(f"{BASE_URL}/api/pamphlet/")
        assert resp.status_code == 200
        data = resp.json()
        assert "pamphlets" in data
        print(f"PASS: pamphlet list works")
    
    def test_health_endpoint(self, api_client):
        """GET /api/health still works"""
        resp = api_client.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        print(f"PASS: health endpoint works")
