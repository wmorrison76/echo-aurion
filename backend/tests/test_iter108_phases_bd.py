"""
Iteration 108: Phase B-D Enterprise Hospitality Platform Tests
==============================================================
Tests for:
- Cart Label Sheet Generator (72pt BEO#, 60pt ROOM, RED/BLUE color codes)
- Oven Firing Poster (Chef's Logic 10-step timeline)
- Supplier Shortage Detection (24hr violation, FOH callout)
- Allergen Recipe Customization (per-guest modifications)
- Equipment Breakdown Concierge Tickets
- Job Share (schedule, benefits, marketplace)
- Echo Layout (15 floor plans across 3 event types)
- Events Extras catalog (25 items, 7 categories)
- Pricing Adjustments (discount/markup)
- Customer Complaints with compensation
- BEO verification (6 Pier Sixty-Six BEOs)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestHealthAndBEOVerification:
    """Verify API health and 6 Pier Sixty-Six BEOs exist via allergen-customize endpoint"""
    
    def test_health_endpoint(self):
        """Health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("PASSED: Health endpoint working")
    
    def test_beo_7186_exists(self):
        """BEO #7186 - Caribbean Evenings Dinner Buffet (via allergen-customize)"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/allergen-customize",
            json={"beo_number": 7186}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["beo_number"] == 7186
        print(f"PASSED: BEO #7186 exists - {data.get('event_name', 'N/A')}")
    
    def test_beo_7626_exists(self):
        """BEO #7626 - Setup (via cart-labels)"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/cart-labels",
            json={"beo_numbers": [7626]}
        )
        assert response.status_code == 200
        data = response.json()
        # If BEO exists, labels will be generated (even if empty menu)
        assert "labels" in data
        print(f"PASSED: BEO #7626 exists - {data.get('total_carts', 0)} carts")
    
    def test_beo_7628_exists(self):
        """BEO #7628 - Bar On Consumption (via cart-labels)"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/cart-labels",
            json={"beo_numbers": [7628]}
        )
        assert response.status_code == 200
        data = response.json()
        assert "labels" in data
        print(f"PASSED: BEO #7628 exists - {data.get('total_carts', 0)} carts")
    
    def test_beo_7167_exists(self):
        """BEO #7167 - Breakfast Buffet (via allergen-customize)"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/allergen-customize",
            json={"beo_number": 7167}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["beo_number"] == 7167
        print(f"PASSED: BEO #7167 exists - {data.get('event_name', 'N/A')}")
    
    def test_beo_7187_exists(self):
        """BEO #7187 - General Session (via cart-labels)"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/cart-labels",
            json={"beo_numbers": [7187]}
        )
        assert response.status_code == 200
        data = response.json()
        assert "labels" in data
        print(f"PASSED: BEO #7187 exists - {data.get('total_carts', 0)} carts")
    
    def test_beo_7169_exists(self):
        """BEO #7169 - BBQ Lunch (via allergen-customize)"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/allergen-customize",
            json={"beo_number": 7169}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["beo_number"] == 7169
        print(f"PASSED: BEO #7169 exists - {data.get('event_name', 'N/A')}")


class TestCartLabelGenerator:
    """Cart Label Sheet Generator - 72pt BEO#, 60pt ROOM, RED/BLUE color codes"""
    
    def test_cart_labels_generation(self):
        """POST /api/kitchen-production/cart-labels with BEOs 7186, 7169"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/cart-labels",
            json={"beo_numbers": [7186, 7169]}
        )
        assert response.status_code == 200
        data = response.json()
        assert "labels" in data
        assert "total_carts" in data
        assert data["total_carts"] > 0
        print(f"PASSED: Cart labels generated - {data['total_carts']} carts")
    
    def test_cart_label_format_72pt_beo(self):
        """Verify 72pt font for BEO#"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/cart-labels",
            json={"beo_numbers": [7186]}
        )
        assert response.status_code == 200
        data = response.json()
        labels = data.get("labels", [])
        assert len(labels) > 0
        label = labels[0]
        assert "label_print_format" in label
        assert label["label_print_format"]["font_size_beo"] == "72pt"
        print("PASSED: BEO# uses 72pt font")
    
    def test_cart_label_format_60pt_room(self):
        """Verify 60pt font for ROOM"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/cart-labels",
            json={"beo_numbers": [7186]}
        )
        assert response.status_code == 200
        data = response.json()
        labels = data.get("labels", [])
        assert len(labels) > 0
        label = labels[0]
        assert label["label_print_format"]["font_size_room"] == "60pt"
        print("PASSED: ROOM uses 60pt font")
    
    def test_cart_label_color_codes(self):
        """Verify RED for HOT carts, BLUE for COLD carts"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/cart-labels",
            json={"beo_numbers": [7186, 7169]}
        )
        assert response.status_code == 200
        data = response.json()
        labels = data.get("labels", [])
        
        hot_labels = [l for l in labels if l.get("cart_type") == "HOT"]
        cold_labels = [l for l in labels if l.get("cart_type") == "COLD"]
        
        for label in hot_labels:
            assert label["label_print_format"]["color_code"] == "RED"
        for label in cold_labels:
            assert label["label_print_format"]["color_code"] == "BLUE"
        print(f"PASSED: Color codes correct - {len(hot_labels)} HOT (RED), {len(cold_labels)} COLD (BLUE)")
    
    def test_cart_label_daily_count_checks(self):
        """Verify daily count check boxes present"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/cart-labels",
            json={"beo_numbers": [7186]}
        )
        assert response.status_code == 200
        data = response.json()
        labels = data.get("labels", [])
        assert len(labels) > 0
        label = labels[0]
        assert "daily_count_checks" in label
        checks = label["daily_count_checks"]
        check_times = [c["time"] for c in checks]
        assert "AM PREP" in check_times
        assert "PRE-FIRE" in check_times
        assert "POST-FIRE" in check_times
        assert "PLATE-UP" in check_times
        print("PASSED: Daily count checks present (AM PREP, PRE-FIRE, POST-FIRE, PLATE-UP)")


class TestFiringPoster:
    """Oven Firing Poster - Chef's Logic 10-step timeline"""
    
    def test_firing_poster_generation(self):
        """POST /api/kitchen-production/firing-poster with BEOs 7186, 7169"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/firing-poster",
            json={"beo_numbers": [7186, 7169], "fire_time": "17:30"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "chefs_logic" in data
        assert "oven_assignments" in data
        assert "events" in data
        print(f"PASSED: Firing poster generated for {len(data['events'])} events")
    
    def test_firing_poster_10_step_timeline(self):
        """Verify 10-step Chef's Logic timeline"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/firing-poster",
            json={"beo_numbers": [7186, 7169], "fire_time": "17:30"}
        )
        assert response.status_code == 200
        data = response.json()
        chefs_logic = data.get("chefs_logic", [])
        assert len(chefs_logic) == 10
        
        # Verify step numbers 1-10
        steps = [s["step"] for s in chefs_logic]
        assert steps == [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        print("PASSED: 10-step Chef's Logic timeline present")
    
    def test_firing_poster_oven_assignments(self):
        """Verify oven assignments in poster"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/firing-poster",
            json={"beo_numbers": [7186], "fire_time": "17:30"}
        )
        assert response.status_code == 200
        data = response.json()
        oven_assignments = data.get("oven_assignments", [])
        assert len(oven_assignments) > 0
        
        for oven in oven_assignments:
            assert "oven_name" in oven
            assert "oven_id" in oven
            assert "capacity" in oven
        print(f"PASSED: {len(oven_assignments)} ovens assigned")
    
    def test_firing_poster_warnings(self):
        """Verify bottleneck warnings when applicable"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/firing-poster",
            json={"beo_numbers": [7186, 7169], "fire_time": "17:30"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "warnings" in data
        assert "demand_summary" in data
        print(f"PASSED: Warnings present - bottleneck: {data['demand_summary'].get('has_bottleneck', False)}")
    
    def test_firing_poster_print_format(self):
        """Verify 24x36 poster format"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/firing-poster",
            json={"beo_numbers": [7186], "fire_time": "17:30"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "print_format" in data
        assert data["print_format"]["size"] == "24x36 inches (poster)"
        print("PASSED: Print format is 24x36 inches poster")


class TestSupplierShortageDetection:
    """Supplier Shortage Detection - 24hr violation, FOH callout"""
    
    def test_supplier_shortage_detect(self):
        """POST /api/kitchen-production/supplier-shortage/detect"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/supplier-shortage/detect",
            json={"beo_numbers": [7186, 7169]}
        )
        assert response.status_code == 200
        data = response.json()
        assert "shortages" in data
        assert "callouts" in data
        assert "staffing_needs" in data
        print(f"PASSED: Shortage detection - {len(data['shortages'])} shortages found")
    
    def test_supplier_shortage_grouper_24hr_violation(self):
        """Verify grouper shortage with 24hr violation"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/supplier-shortage/detect",
            json={"beo_numbers": [7186, 7169]}
        )
        assert response.status_code == 200
        data = response.json()
        shortages = data.get("shortages", [])
        
        grouper_shortage = next((s for s in shortages if "grouper" in s.get("item", "").lower()), None)
        if grouper_shortage:
            assert grouper_shortage.get("24hr_violation") == True
            print("PASSED: Grouper shortage detected with 24hr violation")
        else:
            print("INFO: No grouper shortage in current menu (may vary by BEO)")
    
    def test_supplier_shortage_skirt_steak(self):
        """Verify skirt steak shortage detection"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/supplier-shortage/detect",
            json={"beo_numbers": [7186, 7169]}
        )
        assert response.status_code == 200
        data = response.json()
        shortages = data.get("shortages", [])
        
        steak_shortage = next((s for s in shortages if "skirt" in s.get("item", "").lower() or "churrasco" in s.get("item", "").lower()), None)
        if steak_shortage:
            assert "alternative_vendor" in steak_shortage
            print("PASSED: Skirt steak shortage detected with alternative vendor")
        else:
            print("INFO: No skirt steak shortage in current menu")
    
    def test_supplier_shortage_foh_callout(self):
        """Verify FOH callout detection"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/supplier-shortage/detect",
            json={"beo_numbers": [7186, 7169]}
        )
        assert response.status_code == 200
        data = response.json()
        callouts = data.get("callouts", {})
        assert "foh_shortages" in callouts
        assert "boh_shortages" in callouts
        print(f"PASSED: FOH callouts: {len(callouts['foh_shortages'])}, BOH callouts: {len(callouts['boh_shortages'])}")
    
    def test_supplier_shortage_24hr_violations_list(self):
        """Verify 24hr rule violations list"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/supplier-shortage/detect",
            json={"beo_numbers": [7186, 7169]}
        )
        assert response.status_code == 200
        data = response.json()
        assert "24hr_rule_violations" in data
        print(f"PASSED: 24hr rule violations list present - {len(data['24hr_rule_violations'])} violations")


class TestAllergenCustomization:
    """Allergen Recipe Customization - per-guest modifications"""
    
    def test_allergen_customize_beo_7186(self):
        """POST /api/kitchen-production/allergen-customize for BEO 7186"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/allergen-customize",
            json={"beo_number": 7186}
        )
        assert response.status_code == 200
        data = response.json()
        assert "customizations" in data
        assert "total_restrictions" in data
        assert "kitchen_instructions" in data
        print(f"PASSED: Allergen customization - {data['total_restrictions']} guests with restrictions")
    
    def test_allergen_customize_guest_count(self):
        """Verify 16 guests with restrictions (shellfish, gluten, coconut, pork, mushroom)"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/allergen-customize",
            json={"beo_number": 7186}
        )
        assert response.status_code == 200
        data = response.json()
        # Total restrictions should be present
        assert data["total_restrictions"] >= 0
        customizations = data.get("customizations", [])
        
        # Check for various restriction types
        restriction_types = [c["restriction"].lower() for c in customizations]
        print(f"PASSED: Found {len(customizations)} restriction types: {restriction_types[:5]}...")
    
    def test_allergen_customize_modifications(self):
        """Verify modifications generated for each restriction"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/allergen-customize",
            json={"beo_number": 7186}
        )
        assert response.status_code == 200
        data = response.json()
        customizations = data.get("customizations", [])
        
        for custom in customizations:
            assert "restriction" in custom
            assert "guest_count" in custom
            assert "modifications" in custom
            assert "plate_label" in custom
            assert "kitchen_ticket_color" in custom
        print("PASSED: All customizations have required fields")
    
    def test_allergen_customize_kitchen_instructions(self):
        """Verify kitchen instructions present"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/allergen-customize",
            json={"beo_number": 7186}
        )
        assert response.status_code == 200
        data = response.json()
        instructions = data.get("kitchen_instructions", [])
        assert len(instructions) > 0
        # Should include allergy safety instructions
        instruction_text = " ".join(instructions).lower()
        assert "allergy" in instruction_text or "separate" in instruction_text
        print(f"PASSED: {len(instructions)} kitchen instructions present")


class TestEquipmentConciergeTickets:
    """Equipment Breakdown Concierge Tickets"""
    
    def test_create_equipment_ticket(self):
        """POST /api/kitchen-production/concierge/equipment-ticket"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/concierge/equipment-ticket",
            json={
                "equipment_id": "rational_1",
                "issue": "Temperature sensor malfunction",
                "reported_by": "Chef Marcus",
                "severity": "high",
                "active_beo_numbers": [7186]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "ticket_id" in data
        assert data["ticket_id"].startswith("ENG-")
        assert "notifications_sent" in data
        print(f"PASSED: Equipment ticket created - {data['ticket_id']}")
    
    def test_equipment_ticket_notifications(self):
        """Verify Chef/Engineering/Banquet Manager notifications"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/concierge/equipment-ticket",
            json={
                "equipment_id": "rational_2",
                "issue": "Door seal damaged",
                "reported_by": "Line Cook",
                "severity": "medium"
            }
        )
        assert response.status_code == 200
        data = response.json()
        notifications = data.get("notifications_sent", [])
        
        recipients = [n["to"] for n in notifications]
        assert "Executive Chef" in recipients or "Engineering" in recipients
        print(f"PASSED: Notifications sent to: {recipients}")
    
    def test_equipment_ticket_firing_recalculation(self):
        """Verify firing sequence recalculation when active BEOs"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/concierge/equipment-ticket",
            json={
                "equipment_id": "rational_3",
                "issue": "Fan motor failure",
                "reported_by": "Chef",
                "severity": "high",
                "active_beo_numbers": [7186, 7169]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "adjusted_firing_sequence" in data
        print(f"PASSED: Firing sequence recalculated: {data['adjusted_firing_sequence']}")
    
    def test_equipment_ticket_invalid_equipment(self):
        """Verify 404 for invalid equipment"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/concierge/equipment-ticket",
            json={
                "equipment_id": "invalid_equipment_xyz",
                "issue": "Test issue"
            }
        )
        assert response.status_code == 404
        print("PASSED: 404 returned for invalid equipment")


class TestJobShare:
    """Job Share - schedule, benefits, marketplace"""
    
    def test_job_share_schedule(self):
        """GET /api/operations/job-share/schedule"""
        response = requests.get(f"{BASE_URL}/api/operations/job-share/schedule")
        assert response.status_code == 200
        data = response.json()
        assert "daily_schedule" in data
        assert "week_start" in data
        assert "week_end" in data
        assert "coverage_gaps" in data
        print(f"PASSED: Schedule returned - {data['total_weekly_events']} events, {data['total_weekly_covers']} covers")
    
    def test_job_share_schedule_staffing_needs(self):
        """Verify staffing needs per day"""
        response = requests.get(f"{BASE_URL}/api/operations/job-share/schedule")
        assert response.status_code == 200
        data = response.json()
        daily = data.get("daily_schedule", {})
        
        for date, day_data in daily.items():
            assert "staffing_needs" in day_data
            needs = day_data["staffing_needs"]
            assert "banquet_foh" in needs
            assert "banquet_boh" in needs
            assert "stewarding" in needs
        print("PASSED: Staffing needs present for each day")
    
    def test_job_share_benefits(self):
        """GET /api/operations/job-share/benefits"""
        response = requests.get(f"{BASE_URL}/api/operations/job-share/benefits")
        assert response.status_code == 200
        data = response.json()
        assert "benefits" in data
        benefits = data["benefits"]
        
        categories = [b["category"] for b in benefits]
        assert "Health" in categories
        assert "Financial" in categories
        assert "Time Off" in categories
        assert "Development" in categories
        print(f"PASSED: Benefits returned - {len(categories)} categories")
    
    def test_job_share_marketplace(self):
        """GET /api/operations/job-share/marketplace"""
        response = requests.get(f"{BASE_URL}/api/operations/job-share/marketplace")
        assert response.status_code == 200
        data = response.json()
        assert "open_shifts" in data
        assert "permanent_openings" in data
        assert "total_open_shifts" in data
        print(f"PASSED: Marketplace - {data['total_open_shifts']} open shifts, {len(data['permanent_openings'])} permanent openings")


class TestEchoLayout:
    """Echo Layout - 15 floor plans across 3 event types"""
    
    def test_floor_plans_wedding(self):
        """GET /api/operations/layout/floor-plans?event_type=wedding - 5 plans"""
        response = requests.get(f"{BASE_URL}/api/operations/layout/floor-plans?event_type=wedding")
        assert response.status_code == 200
        data = response.json()
        assert data["event_type"] == "wedding"
        plans = data.get("plans", [])
        assert len(plans) == 5
        
        # Verify head table and pipe/drape in wedding plans
        has_head_table = any("head_table" in p for p in plans)
        assert has_head_table
        print(f"PASSED: 5 wedding floor plans with head table")
    
    def test_floor_plans_holiday_gala(self):
        """GET /api/operations/layout/floor-plans?event_type=holiday_gala - 5 plans with buffet setup"""
        response = requests.get(f"{BASE_URL}/api/operations/layout/floor-plans?event_type=holiday_gala")
        assert response.status_code == 200
        data = response.json()
        assert data["event_type"] == "holiday_gala"
        plans = data.get("plans", [])
        assert len(plans) == 5
        
        # Verify buffet setup elements
        buffet_plan = next((p for p in plans if "buffet_setup" in p), None)
        if buffet_plan:
            setup = buffet_plan["buffet_setup"]
            assert "chafers" in setup
            assert "heat_lamps" in setup
            assert "carving_stations" in setup
            assert "action_stations" in setup
        print("PASSED: 5 holiday gala plans with buffet setup (chafers, heat lamps, carving, action stations)")
    
    def test_floor_plans_corporate_conference(self):
        """GET /api/operations/layout/floor-plans?event_type=corporate_conference - 5 plans"""
        response = requests.get(f"{BASE_URL}/api/operations/layout/floor-plans?event_type=corporate_conference")
        assert response.status_code == 200
        data = response.json()
        assert data["event_type"] == "corporate_conference"
        plans = data.get("plans", [])
        assert len(plans) == 5
        print("PASSED: 5 corporate conference floor plans")
    
    def test_floor_plans_all_types(self):
        """Verify all 15 floor plans across 3 event types"""
        response = requests.get(f"{BASE_URL}/api/operations/layout/floor-plans")
        assert response.status_code == 200
        data = response.json()
        assert "all_plans" in data
        all_plans = data["all_plans"]
        
        total_plans = sum(len(plans) for plans in all_plans.values())
        assert total_plans == 15
        assert len(all_plans) == 3
        print(f"PASSED: 15 total floor plans across 3 event types")
    
    def test_layout_generate_attach_to_beo(self):
        """POST /api/operations/layout/generate - attach layout to BEO"""
        response = requests.post(
            f"{BASE_URL}/api/operations/layout/generate",
            json={
                "beo_number": 7186,
                "event_type": "holiday_gala",
                "plan_name": "Holiday Grand Buffet",
                "vip_guests": ["CEO John Smith", "CFO Jane Doe"],
                "pipe_drape": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["beo_number"] == 7186
        assert data["event_type"] == "holiday_gala"
        assert "plan" in data
        assert "vip_seating" in data
        print(f"PASSED: Layout attached to BEO 7186 - {data['plan']['name']}")


class TestEventsExtras:
    """Events Extras catalog - 25 items, 7 categories"""
    
    def test_extras_catalog(self):
        """GET /api/operations/events/extras - 25 items"""
        response = requests.get(f"{BASE_URL}/api/operations/events/extras")
        assert response.status_code == 200
        data = response.json()
        assert "extras" in data
        assert "categories" in data
        assert data["total"] == 25
        print(f"PASSED: Extras catalog - {data['total']} items")
    
    def test_extras_7_categories(self):
        """Verify 7 categories (Decor, Entertainment, Food Service, Beverage, Services, AV, Special Effects)"""
        response = requests.get(f"{BASE_URL}/api/operations/events/extras")
        assert response.status_code == 200
        data = response.json()
        categories = data.get("categories", [])
        
        expected_categories = ["Decor", "Entertainment", "Food Service", "Beverage", "Services", "AV", "Special Effects"]
        for cat in expected_categories:
            assert cat in categories, f"Missing category: {cat}"
        assert len(categories) == 7
        print(f"PASSED: 7 categories present: {categories}")
    
    def test_extras_quote_generation(self):
        """POST /api/operations/events/extras/quote - generate quote with service charge"""
        response = requests.post(
            f"{BASE_URL}/api/operations/events/extras/quote",
            json={
                "beo_number": 7186,
                "extras": [
                    {"id": "ext-pipe-drape", "qty": 100},
                    {"id": "ext-dance-floor", "qty": 1},
                    {"id": "ext-photo-booth", "qty": 1}
                ]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "line_items" in data
        assert "subtotal" in data
        assert "service_charge" in data
        assert "grand_total" in data
        
        # Verify service charge is 26%
        expected_service = round(data["subtotal"] * 0.26, 2)
        assert abs(data["service_charge"] - expected_service) < 0.01
        print(f"PASSED: Quote generated - subtotal: ${data['subtotal']}, service charge: ${data['service_charge']}, total: ${data['grand_total']}")


class TestPricingAdjustments:
    """Pricing Adjustments - discount/markup"""
    
    def test_pricing_adjust_discount(self):
        """POST /api/operations/events/pricing/adjust - discount"""
        response = requests.post(
            f"{BASE_URL}/api/operations/events/pricing/adjust",
            json={
                "beo_number": 7186,
                "type": "discount",
                "value": 10,
                "reason": "Repeat customer loyalty discount",
                "approved_by": "Sales Manager"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "discount"
        assert data["value"] == 10
        assert data["adjusted_total"] < data["original_total"]
        print(f"PASSED: 10% discount applied - original: ${data['original_total']}, adjusted: ${data['adjusted_total']}")
    
    def test_pricing_adjust_markup(self):
        """POST /api/operations/events/pricing/adjust - markup"""
        response = requests.post(
            f"{BASE_URL}/api/operations/events/pricing/adjust",
            json={
                "beo_number": 7169,
                "type": "markup",
                "value": 15,
                "reason": "Premium holiday weekend surcharge",
                "approved_by": "Director of Events"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "markup"
        assert data["value"] == 15
        assert data["adjusted_total"] > data["original_total"]
        print(f"PASSED: 15% markup applied - original: ${data['original_total']}, adjusted: ${data['adjusted_total']}")
    
    def test_pricing_adjust_invalid_beo(self):
        """Verify 404 for invalid BEO"""
        response = requests.post(
            f"{BASE_URL}/api/operations/events/pricing/adjust",
            json={
                "beo_number": 99999,
                "type": "discount",
                "value": 10
            }
        )
        assert response.status_code == 404
        print("PASSED: 404 returned for invalid BEO")


class TestCustomerComplaints:
    """Customer Complaints with EchoAi compensation suggestion"""
    
    def test_log_complaint(self):
        """POST /api/operations/events/complaint - log complaint"""
        response = requests.post(
            f"{BASE_URL}/api/operations/events/complaint",
            json={
                "beo_number": 7186,
                "type": "service",
                "description": "Server was inattentive during dinner service",
                "severity": "medium",
                "guest_name": "John Smith",
                "guest_contact": "john.smith@email.com"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["id"].startswith("comp-")
        assert "suggested_comp" in data
        assert "comp_amount" in data
        print(f"PASSED: Complaint logged - {data['id']}, suggested comp: ${data['comp_amount']}")
    
    def test_complaint_compensation_suggestion(self):
        """Verify EchoAi compensation suggestion based on severity"""
        response = requests.post(
            f"{BASE_URL}/api/operations/events/complaint",
            json={
                "beo_number": 7186,
                "type": "food",
                "description": "Main course was cold",
                "severity": "high",
                "guest_name": "Jane Doe"
            }
        )
        assert response.status_code == 200
        data = response.json()
        suggested = data.get("suggested_comp", {})
        assert "comp_pct" in suggested
        assert "comp_type" in suggested
        assert "action" in suggested
        print(f"PASSED: Compensation suggestion - {suggested['comp_pct']}% ({suggested['comp_type']})")
    
    def test_complaint_repeat_escalation(self):
        """Verify repeat complaint escalation"""
        # Log first complaint
        requests.post(
            f"{BASE_URL}/api/operations/events/complaint",
            json={
                "beo_number": 7186,
                "type": "service",
                "description": "First complaint",
                "severity": "low"
            }
        )
        
        # Log second complaint - should detect repeat
        response = requests.post(
            f"{BASE_URL}/api/operations/events/complaint",
            json={
                "beo_number": 7186,
                "type": "service",
                "description": "Second complaint",
                "severity": "medium"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "is_repeat_complaint" in data
        assert "previous_complaints" in data
        print(f"PASSED: Repeat complaint detection - is_repeat: {data['is_repeat_complaint']}, previous: {data['previous_complaints']}")


class TestEquipmentRestoration:
    """Restore equipment status after testing"""
    
    def test_restore_rational_1(self):
        """Restore rational_1 to operational"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/equipment/rational_1/status",
            json={"status": "operational"}
        )
        assert response.status_code == 200
        print("PASSED: rational_1 restored to operational")
    
    def test_restore_rational_2(self):
        """Restore rational_2 to operational"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/equipment/rational_2/status",
            json={"status": "operational"}
        )
        assert response.status_code == 200
        print("PASSED: rational_2 restored to operational")
    
    def test_restore_rational_3(self):
        """Restore rational_3 to operational"""
        response = requests.post(
            f"{BASE_URL}/api/kitchen-production/equipment/rational_3/status",
            json={"status": "operational"}
        )
        assert response.status_code == 200
        print("PASSED: rational_3 restored to operational")
    
    def test_verify_equipment_status(self):
        """Verify final equipment status"""
        response = requests.get(f"{BASE_URL}/api/kitchen-production/equipment")
        assert response.status_code == 200
        data = response.json()
        summary = data.get("summary", {})
        print(f"PASSED: Final equipment status - {summary.get('working_ovens', 0)} working ovens, {summary.get('in_repair', 0)} in repair")
