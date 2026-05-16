"""
Iteration 110: Beverage Operations Intelligence Module Tests
============================================================
Tests for:
- Bottle scanning for monthly inventory audits
- Consumption bar before/after event tracking
- Toast & arrival beverages with GL routing (non-alcoholic → 4100, alcoholic → 4200)
- Pricing accuracy metrics
- FOH training module (mixology/sommelier) with LLM
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestHealthCheck:
    """Verify API is accessible"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")


class TestBottleScanning:
    """Bottle scanning for monthly inventory audits"""
    
    def test_scan_bottle_full(self):
        """POST /api/beverage-ops/bottle-scan - scan full bottle"""
        payload = {
            "item_id": "TEST-VODKA-001",
            "item_name": "Grey Goose Vodka",
            "volume_level": "full",
            "bottle_size": "750ml",
            "location": "main_bar",
            "bottle_cost": 35.00,
            "scanned_by": "test_user"
        }
        response = requests.post(f"{BASE_URL}/api/beverage-ops/bottle-scan", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert data["id"].startswith("scan-")
        assert data["item_name"] == "Grey Goose Vodka"
        assert data["volume_level"] == "full"
        assert data["volume_pct"] == 1.0
        assert data["remaining_oz"] == 25.4  # 750ml = 25.4oz
        assert data["remaining_pours"] == 16  # 25.4oz / 1.5oz = 16 pours
        assert data["value_remaining"] == 35.00  # full bottle = full cost
        print(f"✓ Bottle scan (full): {data['remaining_oz']}oz, {data['remaining_pours']} pours, ${data['value_remaining']}")
        return data["id"]
    
    def test_scan_bottle_half(self):
        """POST /api/beverage-ops/bottle-scan - scan half bottle"""
        payload = {
            "item_id": "TEST-RUM-001",
            "item_name": "Bacardi Superior",
            "volume_level": "half",
            "bottle_size": "1L",
            "location": "service_bar",
            "bottle_cost": 28.00,
            "scanned_by": "test_user"
        }
        response = requests.post(f"{BASE_URL}/api/beverage-ops/bottle-scan", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["volume_pct"] == 0.5
        assert data["remaining_oz"] == 16.9  # 33.8oz * 0.5 = 16.9oz
        assert data["value_remaining"] == 14.00  # 28 * 0.5 = 14
        print(f"✓ Bottle scan (half): {data['remaining_oz']}oz, ${data['value_remaining']}")
    
    def test_scan_bottle_3_10(self):
        """POST /api/beverage-ops/bottle-scan - scan 3/10 bottle"""
        payload = {
            "item_id": "TEST-WHISKEY-001",
            "item_name": "Jack Daniels",
            "volume_level": "3/10",
            "bottle_size": "1.75L",
            "location": "banquet_bar",
            "bottle_cost": 45.00,
            "scanned_by": "test_user"
        }
        response = requests.post(f"{BASE_URL}/api/beverage-ops/bottle-scan", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["volume_pct"] == 0.3
        assert data["remaining_oz"] == 17.8  # 59.2oz * 0.3 = 17.76 rounded
        # Value calculation: (vol_pct * bottle_cost) = 0.3 * 45 = 13.5, but actual uses remaining_oz/bottle_oz ratio
        assert abs(data["value_remaining"] - 13.50) < 0.1  # Allow small rounding difference
        print(f"✓ Bottle scan (3/10): {data['remaining_oz']}oz, ${data['value_remaining']}")
    
    def test_list_bottle_scans(self):
        """GET /api/beverage-ops/bottle-scans - list all scans"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/bottle-scans")
        assert response.status_code == 200
        data = response.json()
        
        assert "scans" in data
        assert "total_scans" in data
        assert "total_value_remaining" in data
        assert isinstance(data["scans"], list)
        print(f"✓ List bottle scans: {data['total_scans']} scans, total value ${data['total_value_remaining']}")
    
    def test_list_bottle_scans_by_location(self):
        """GET /api/beverage-ops/bottle-scans?location=main_bar"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/bottle-scans?location=main_bar")
        assert response.status_code == 200
        data = response.json()
        
        # All returned scans should be from main_bar
        for scan in data["scans"]:
            assert scan["location"] == "main_bar"
        print(f"✓ List bottle scans by location: {data['total_scans']} scans at main_bar")


class TestMonthlyAudit:
    """Monthly beverage inventory audit tests"""
    
    audit_id = None
    
    def test_start_monthly_audit(self):
        """POST /api/beverage-ops/audit/start - create monthly audit"""
        payload = {
            "month": 1,
            "year": 2026,
            "type": "monthly",
            "locations": ["main_bar", "service_bar", "banquet_bar"],
            "started_by": "test_auditor"
        }
        response = requests.post(f"{BASE_URL}/api/beverage-ops/audit/start", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["id"].startswith("audit-")
        assert data["month"] == 1
        assert data["year"] == 2026
        assert data["status"] == "in_progress"
        assert data["type"] == "monthly"
        assert "main_bar" in data["locations"]
        
        TestMonthlyAudit.audit_id = data["id"]
        print(f"✓ Started monthly audit: {data['id']}")
        return data["id"]
    
    def test_add_scans_to_audit(self):
        """Add bottle scans to the audit"""
        if not TestMonthlyAudit.audit_id:
            pytest.skip("No audit ID available")
        
        # Add multiple scans to the audit
        bottles = [
            {"item_name": "Tito's Vodka", "volume_level": "7/10", "bottle_cost": 30.00},
            {"item_name": "Hendrick's Gin", "volume_level": "half", "bottle_cost": 45.00},
            {"item_name": "Don Julio Blanco", "volume_level": "9/10", "bottle_cost": 55.00},
        ]
        
        for bottle in bottles:
            payload = {
                "item_name": bottle["item_name"],
                "volume_level": bottle["volume_level"],
                "bottle_size": "750ml",
                "location": "main_bar",
                "bottle_cost": bottle["bottle_cost"],
                "audit_id": TestMonthlyAudit.audit_id,
                "scanned_by": "test_auditor"
            }
            response = requests.post(f"{BASE_URL}/api/beverage-ops/bottle-scan", json=payload)
            assert response.status_code == 200
        
        print(f"✓ Added {len(bottles)} scans to audit {TestMonthlyAudit.audit_id}")
    
    def test_complete_audit(self):
        """POST /api/beverage-ops/audit/{id}/complete - complete audit with totals"""
        if not TestMonthlyAudit.audit_id:
            pytest.skip("No audit ID available")
        
        response = requests.post(f"{BASE_URL}/api/beverage-ops/audit/{TestMonthlyAudit.audit_id}/complete")
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "completed"
        assert data["completed_at"] is not None
        assert "total_value" in data
        assert "variance_from_pos" in data
        assert "variance_pct" in data
        assert "summary_by_location" in data
        print(f"✓ Completed audit: {data['total_bottles']} bottles, ${data['total_value']}, variance {data['variance_pct']}%")
    
    def test_complete_audit_not_found(self):
        """POST /api/beverage-ops/audit/invalid-id/complete - 404 for invalid audit"""
        response = requests.post(f"{BASE_URL}/api/beverage-ops/audit/invalid-audit-id/complete")
        assert response.status_code == 404
        print("✓ Complete audit returns 404 for invalid ID")
    
    def test_list_audits(self):
        """GET /api/beverage-ops/audits - list all audits"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/audits")
        assert response.status_code == 200
        data = response.json()
        
        assert "audits" in data
        assert isinstance(data["audits"], list)
        assert len(data["audits"]) > 0
        print(f"✓ List audits: {len(data['audits'])} audits found")


class TestConsumptionBarTracking:
    """Consumption bar before/after event tracking"""
    
    def test_event_snap_before(self):
        """POST /api/beverage-ops/consumption/event-snap with snap_type=before"""
        payload = {
            "beo_number": 7626,
            "snap_type": "before",
            "bottles": [
                {"name": "Grey Goose Vodka", "volume_level": "full", "bottle_size": "750ml", "unit_cost": 35.00, "category": "spirits"},
                {"name": "Hendrick's Gin", "volume_level": "9/10", "bottle_size": "750ml", "unit_cost": 45.00, "category": "spirits"},
                {"name": "Patron Silver", "volume_level": "full", "bottle_size": "750ml", "unit_cost": 55.00, "category": "spirits"},
                {"name": "Kendall Jackson Chardonnay", "volume_level": "full", "bottle_size": "750ml", "unit_cost": 18.00, "category": "wine"},
            ],
            "snapped_by": "test_bartender"
        }
        response = requests.post(f"{BASE_URL}/api/beverage-ops/consumption/event-snap", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["id"].startswith("snap-")
        assert data["beo_number"] == 7626
        assert data["snap_type"] == "before"
        assert data["total_bottles"] == 4
        assert data["total_value"] > 0
        assert data["total_oz"] > 0
        print(f"✓ Before snap: {data['total_bottles']} bottles, {data['total_oz']}oz, ${data['total_value']}")
    
    def test_event_snap_after(self):
        """POST /api/beverage-ops/consumption/event-snap with snap_type=after"""
        payload = {
            "beo_number": 7626,
            "snap_type": "after",
            "bottles": [
                {"name": "Grey Goose Vodka", "volume_level": "3/10", "bottle_size": "750ml", "unit_cost": 35.00, "category": "spirits"},
                {"name": "Hendrick's Gin", "volume_level": "half", "bottle_size": "750ml", "unit_cost": 45.00, "category": "spirits"},
                {"name": "Patron Silver", "volume_level": "6/10", "bottle_size": "750ml", "unit_cost": 55.00, "category": "spirits"},
                {"name": "Kendall Jackson Chardonnay", "volume_level": "2/10", "bottle_size": "750ml", "unit_cost": 18.00, "category": "wine"},
            ],
            "snapped_by": "test_bartender"
        }
        response = requests.post(f"{BASE_URL}/api/beverage-ops/consumption/event-snap", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["snap_type"] == "after"
        assert data["total_bottles"] == 4
        print(f"✓ After snap: {data['total_bottles']} bottles, {data['total_oz']}oz, ${data['total_value']}")
    
    def test_event_usage_calculation(self):
        """GET /api/beverage-ops/consumption/event-usage?beo_number=7626 - calculate actual usage"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/consumption/event-usage?beo_number=7626")
        assert response.status_code == 200
        data = response.json()
        
        # Check if we have complete data
        if data.get("status") == "incomplete":
            print(f"⚠ Event usage incomplete: {data.get('message')}")
            return
        
        assert data["status"] == "complete"
        assert data["beo_number"] == 7626
        assert "usage" in data
        assert "totals" in data
        assert "pricing_accuracy" in data
        
        totals = data["totals"]
        assert "total_usage_oz" in totals
        assert "total_pours" in totals
        assert "total_cost" in totals
        assert "estimated_revenue" in totals
        assert "cost_pct" in totals
        assert "drinks_per_guest" in totals  # Critical field per requirements
        
        pricing = data["pricing_accuracy"]
        assert "menu_prices_align" in pricing
        assert "note" in pricing
        assert "recommendation" in pricing
        
        print(f"✓ Event usage: {totals['total_pours']} pours, ${totals['total_cost']} cost, {totals['drinks_per_guest']} drinks/guest")
        print(f"  Pricing accuracy: {totals['cost_pct']}% cost, aligned={pricing['menu_prices_align']}")
    
    def test_event_usage_incomplete(self):
        """GET /api/beverage-ops/consumption/event-usage - incomplete when missing snaps"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/consumption/event-usage?beo_number=99999")
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "incomplete"
        assert "message" in data
        print(f"✓ Event usage returns incomplete status for missing snaps")


class TestToastArrivalBeverages:
    """Toast & arrival beverages with GL routing"""
    
    def test_log_toast_arrival_mixed(self):
        """POST /api/beverage-ops/toast-arrival/log - mixed alcoholic and non-alcoholic"""
        payload = {
            "beo_number": 7186,
            "type": "arrival",
            "covers": 150,
            "items": [
                {"name": "Champagne Toast", "is_alcoholic": True, "cost_per_unit": 8.00, "price_per_unit": 24.00, "quantity": 150},
                {"name": "Sparkling Cider", "is_alcoholic": False, "cost_per_unit": 3.00, "price_per_unit": 12.00, "quantity": 30},
                {"name": "Fresh Lemonade", "is_alcoholic": False, "cost_per_unit": 1.50, "price_per_unit": 8.00, "quantity": 20},
            ]
        }
        response = requests.post(f"{BASE_URL}/api/beverage-ops/toast-arrival/log", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["id"].startswith("toast-")
        assert data["beo_number"] == 7186
        assert data["service_type"] == "arrival"
        # Covers comes from BEO document if available, otherwise from payload
        assert data["covers"] > 0
        
        # Verify GL routing
        assert "gl_summary" in data
        gl = data["gl_summary"]
        assert "4100_food_cost" in gl  # Non-alcoholic
        assert "4200_beverage_cost" in gl  # Alcoholic
        
        # Verify non-alcoholic items route to GL 4100 (Food Cost)
        assert gl["4100_food_cost"] > 0  # Sparkling Cider + Lemonade costs
        # Verify alcoholic items route to GL 4200 (Beverage Cost)
        assert gl["4200_beverage_cost"] > 0  # Champagne costs
        
        # Verify individual item GL assignments
        for item in data["items"]:
            if item["is_alcoholic"]:
                assert item["gl_account"] == "4200 - Beverage Cost"
                assert item["cost_category"] == "beverage"
            else:
                assert item["gl_account"] == "4100 - Food Cost"
                assert item["cost_category"] == "food"
        
        print(f"✓ Toast/arrival logged: GL 4100 (Food)=${gl['4100_food_cost']}, GL 4200 (Bev)=${gl['4200_beverage_cost']}")
    
    def test_log_toast_all_non_alcoholic(self):
        """POST /api/beverage-ops/toast-arrival/log - all non-alcoholic → GL 4100"""
        payload = {
            "beo_number": 7200,
            "type": "welcome_drink",
            "covers": 100,
            "items": [
                {"name": "Virgin Mojito", "is_alcoholic": False, "cost_per_unit": 2.50, "price_per_unit": 10.00, "quantity": 50},
                {"name": "Fruit Punch", "is_alcoholic": False, "cost_per_unit": 1.00, "price_per_unit": 6.00, "quantity": 50},
            ]
        }
        response = requests.post(f"{BASE_URL}/api/beverage-ops/toast-arrival/log", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        gl = data["gl_summary"]
        # All costs should go to GL 4100 (Food Cost)
        assert gl["4100_food_cost"] > 0
        assert gl["4200_beverage_cost"] == 0
        
        # Verify all items have food cost GL
        for item in data["items"]:
            assert item["gl_account"] == "4100 - Food Cost"
        
        print(f"✓ All non-alcoholic → GL 4100: ${gl['4100_food_cost']}")
    
    def test_log_toast_all_alcoholic(self):
        """POST /api/beverage-ops/toast-arrival/log - all alcoholic → GL 4200"""
        payload = {
            "beo_number": 7201,
            "type": "toast",
            "covers": 80,
            "items": [
                {"name": "Prosecco", "is_alcoholic": True, "cost_per_unit": 6.00, "price_per_unit": 18.00, "quantity": 80},
            ]
        }
        response = requests.post(f"{BASE_URL}/api/beverage-ops/toast-arrival/log", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        gl = data["gl_summary"]
        # All costs should go to GL 4200 (Beverage Cost)
        assert gl["4100_food_cost"] == 0
        assert gl["4200_beverage_cost"] > 0
        
        print(f"✓ All alcoholic → GL 4200: ${gl['4200_beverage_cost']}")
    
    def test_toast_arrival_history(self):
        """GET /api/beverage-ops/toast-arrival/history - list all logs"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/toast-arrival/history")
        assert response.status_code == 200
        data = response.json()
        
        assert "logs" in data
        assert "total" in data
        assert isinstance(data["logs"], list)
        assert len(data["logs"]) > 0
        print(f"✓ Toast/arrival history: {data['total']} logs")
    
    def test_toast_arrival_history_by_beo(self):
        """GET /api/beverage-ops/toast-arrival/history?beo_number=7186"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/toast-arrival/history?beo_number=7186")
        assert response.status_code == 200
        data = response.json()
        
        for log in data["logs"]:
            assert log["beo_number"] == 7186
        print(f"✓ Toast/arrival history by BEO: {data['total']} logs for BEO 7186")


class TestPricingAccuracy:
    """Pricing accuracy metrics over time"""
    
    def test_pricing_accuracy_report(self):
        """GET /api/beverage-ops/pricing-accuracy - returns pricing accuracy report"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/pricing-accuracy")
        assert response.status_code == 200
        data = response.json()
        
        assert "periods" in data
        assert "benchmarks" in data
        assert "recommendation" in data
        
        benchmarks = data["benchmarks"]
        assert "avg_menu_spirit_price" in benchmarks
        assert "target_pour_cost" in benchmarks
        assert "target_cost_pct" in benchmarks
        assert "industry_avg_cost_pct" in benchmarks
        
        # Verify benchmark values
        assert benchmarks["target_cost_pct"] == 20
        assert benchmarks["industry_avg_cost_pct"] == 22
        
        print(f"✓ Pricing accuracy report: avg spirit price ${benchmarks['avg_menu_spirit_price']}, target cost ${benchmarks['target_pour_cost']}")
        print(f"  Periods tracked: {len(data['periods'])}")
    
    def test_pricing_accuracy_with_months(self):
        """GET /api/beverage-ops/pricing-accuracy?months=3"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/pricing-accuracy?months=3")
        assert response.status_code == 200
        data = response.json()
        
        assert "periods" in data
        assert "benchmarks" in data
        print(f"✓ Pricing accuracy (3 months): {len(data['periods'])} periods")


class TestFOHTraining:
    """FOH training module for mixology/sommelier"""
    
    session_id = None
    
    def test_create_foh_training_session_general(self):
        """POST /api/beverage-ops/foh-training/session - create general session"""
        payload = {
            "topic": "general",
            "trainee_name": "Test Trainee"
        }
        response = requests.post(f"{BASE_URL}/api/beverage-ops/foh-training/session", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "session_id" in data
        assert data["session_id"].startswith("foh-")
        assert "opening_message" in data
        assert data["topic"] == "general"
        
        TestFOHTraining.session_id = data["session_id"]
        print(f"✓ Created FOH training session: {data['session_id']}")
        print(f"  Opening: {data['opening_message'][:80]}...")
    
    def test_create_foh_training_session_wine(self):
        """POST /api/beverage-ops/foh-training/session - create wine session"""
        payload = {
            "topic": "wine",
            "trainee_name": "Wine Trainee"
        }
        response = requests.post(f"{BASE_URL}/api/beverage-ops/foh-training/session", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["topic"] == "wine"
        assert "wine" in data["opening_message"].lower() or "decant" in data["opening_message"].lower()
        print(f"✓ Created wine training session: {data['session_id']}")
    
    def test_create_foh_training_session_cocktails(self):
        """POST /api/beverage-ops/foh-training/session - create cocktails session"""
        payload = {
            "topic": "cocktails",
            "trainee_name": "Cocktail Trainee"
        }
        response = requests.post(f"{BASE_URL}/api/beverage-ops/foh-training/session", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["topic"] == "cocktails"
        print(f"✓ Created cocktails training session: {data['session_id']}")
    
    def test_create_foh_training_session_consumption_bar(self):
        """POST /api/beverage-ops/foh-training/session - create consumption_bar session"""
        payload = {
            "topic": "consumption_bar",
            "trainee_name": "Bar Trainee"
        }
        response = requests.post(f"{BASE_URL}/api/beverage-ops/foh-training/session", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["topic"] == "consumption_bar"
        assert "consumption" in data["opening_message"].lower() or "banquet" in data["opening_message"].lower()
        print(f"✓ Created consumption_bar training session: {data['session_id']}")
    
    def test_send_foh_training_message(self):
        """POST /api/beverage-ops/foh-training/{id}/message - send message (uses LLM)"""
        if not TestFOHTraining.session_id:
            pytest.skip("No session ID available")
        
        payload = {
            "message": "What are the 6 base spirits I should know?"
        }
        response = requests.post(
            f"{BASE_URL}/api/beverage-ops/foh-training/{TestFOHTraining.session_id}/message",
            json=payload,
            timeout=30  # LLM can take 10-15 seconds
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "response" in data
        assert "message_count" in data
        assert len(data["response"]) > 0
        print(f"✓ FOH training message sent, response received ({len(data['response'])} chars)")
        print(f"  Response preview: {data['response'][:100]}...")
    
    def test_send_foh_training_message_not_found(self):
        """POST /api/beverage-ops/foh-training/invalid-id/message - 404 for invalid session"""
        payload = {"message": "test"}
        response = requests.post(
            f"{BASE_URL}/api/beverage-ops/foh-training/invalid-session-id/message",
            json=payload
        )
        assert response.status_code == 404
        print("✓ FOH training message returns 404 for invalid session")
    
    def test_list_foh_training_sessions(self):
        """GET /api/beverage-ops/foh-training/sessions - list all sessions"""
        response = requests.get(f"{BASE_URL}/api/beverage-ops/foh-training/sessions")
        assert response.status_code == 200
        data = response.json()
        
        assert "sessions" in data
        assert isinstance(data["sessions"], list)
        assert len(data["sessions"]) > 0
        print(f"✓ List FOH training sessions: {len(data['sessions'])} sessions")


class TestVolumeCalculations:
    """Verify volume level calculations are accurate"""
    
    def test_volume_levels_750ml(self):
        """Verify all volume levels for 750ml bottle"""
        levels = {
            "full": (1.0, 25.4),
            "9/10": (0.9, 22.9),  # 25.4 * 0.9 = 22.86 rounded
            "8/10": (0.8, 20.3),
            "7/10": (0.7, 17.8),
            "6/10": (0.6, 15.2),
            "half": (0.5, 12.7),
            "4/10": (0.4, 10.2),
            "3/10": (0.3, 7.6),
            "2/10": (0.2, 5.1),
            "1/10": (0.1, 2.5),
            "empty": (0.0, 0.0),
        }
        
        for level, (expected_pct, expected_oz) in levels.items():
            payload = {
                "item_name": f"Test Bottle {level}",
                "volume_level": level,
                "bottle_size": "750ml",
                "bottle_cost": 25.00
            }
            response = requests.post(f"{BASE_URL}/api/beverage-ops/bottle-scan", json=payload)
            assert response.status_code == 200
            data = response.json()
            
            assert data["volume_pct"] == expected_pct, f"Level {level}: expected pct {expected_pct}, got {data['volume_pct']}"
            assert abs(data["remaining_oz"] - expected_oz) < 0.1, f"Level {level}: expected oz {expected_oz}, got {data['remaining_oz']}"
        
        print("✓ All volume levels verified for 750ml bottle")
    
    def test_bottle_sizes(self):
        """Verify different bottle sizes"""
        sizes = {
            "750ml": 25.4,
            "1L": 33.8,
            "1.75L": 59.2,
        }
        
        for size, expected_oz in sizes.items():
            payload = {
                "item_name": f"Test {size}",
                "volume_level": "full",
                "bottle_size": size,
                "bottle_cost": 30.00
            }
            response = requests.post(f"{BASE_URL}/api/beverage-ops/bottle-scan", json=payload)
            assert response.status_code == 200
            data = response.json()
            
            assert data["remaining_oz"] == expected_oz, f"Size {size}: expected {expected_oz}oz, got {data['remaining_oz']}oz"
        
        print("✓ All bottle sizes verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
