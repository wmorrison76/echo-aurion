"""
Iteration 10 - RBAC, Procurement, Compliance & Intelligence Testing
====================================================================
Tests for:
- RBAC engine with 9 roles, 5 clearance levels, 28 data classifications
- AI³ omniscient query engine with role-based response filtering
- Procurement intelligence (3-way matching, vendor scorecards, AP aging, budgets, spend analytics)
- HACCP compliance engine (7 templates, checklists, corrective actions, temperature logs, inspection readiness)
- Supplier network (catalog, price comparison, RFQs)
- Multi-property management
- Guest CRM
- Finance intelligence (real-time P&L, food cost trending, GL summary)
- Waste tracking
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"PASS: Health check - status: {data['status']}, version: {data.get('version')}")


class TestRBACRolesAndUsers:
    """RBAC roles, clearances, and user management"""
    
    def test_list_roles_returns_9_roles_and_28_classifications(self):
        """GET /api/rbac/roles returns 9 roles and 28 data classifications"""
        response = requests.get(f"{BASE_URL}/api/rbac/roles")
        assert response.status_code == 200
        data = response.json()
        
        # Verify 9 roles
        roles = data.get("roles", [])
        assert len(roles) == 9, f"Expected 9 roles, got {len(roles)}"
        expected_roles = ["owner", "gm", "director", "exec_chef", "controller", "manager", "supervisor", "staff", "vendor"]
        for role in expected_roles:
            assert role in roles, f"Missing role: {role}"
        
        # Verify 28 data classifications
        classifications = data.get("data_classifications", {})
        assert len(classifications) == 28, f"Expected 28 data classifications, got {len(classifications)}"
        
        # Verify clearance levels
        clearance_levels = data.get("clearance_levels", {})
        assert len(clearance_levels) == 9, f"Expected 9 clearance levels, got {len(clearance_levels)}"
        
        print(f"PASS: Roles endpoint - {len(roles)} roles, {len(classifications)} classifications")
    
    def test_list_users_returns_10_seeded_users(self):
        """GET /api/rbac/users returns 10 seeded users"""
        response = requests.get(f"{BASE_URL}/api/rbac/users")
        assert response.status_code == 200
        data = response.json()
        
        users = data.get("users", [])
        assert len(users) >= 10, f"Expected at least 10 users, got {len(users)}"
        
        # Verify key users exist
        user_ids = [u.get("user_id") for u in users]
        expected_users = ["usr-owner-001", "usr-gm-001", "usr-staff-001", "usr-ctrl-001", "usr-vendor-001"]
        for uid in expected_users:
            assert uid in user_ids, f"Missing user: {uid}"
        
        print(f"PASS: Users endpoint - {len(users)} users returned")


class TestRBACAccessControl:
    """RBAC access control checks"""
    
    def test_staff_denied_payroll_data(self):
        """GET /api/rbac/access-check denies staff access to payroll_data"""
        response = requests.get(f"{BASE_URL}/api/rbac/access-check", params={
            "user_id": "usr-staff-001",
            "data_category": "payroll_data"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["allowed"] == False, "Staff should NOT have access to payroll_data"
        assert data["role"] == "staff"
        assert data["classification"] == "RESTRICTED"
        
        print(f"PASS: Staff denied payroll_data access - allowed: {data['allowed']}")
    
    def test_controller_granted_payroll_data(self):
        """GET /api/rbac/access-check grants controller access to payroll_data"""
        response = requests.get(f"{BASE_URL}/api/rbac/access-check", params={
            "user_id": "usr-ctrl-001",
            "data_category": "payroll_data"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["allowed"] == True, "Controller SHOULD have access to payroll_data"
        assert data["role"] == "controller"
        
        print(f"PASS: Controller granted payroll_data access - allowed: {data['allowed']}")
    
    def test_gm_denied_owner_compensation(self):
        """GET /api/rbac/access-check denies GM access to owner_compensation"""
        response = requests.get(f"{BASE_URL}/api/rbac/access-check", params={
            "user_id": "usr-gm-001",
            "data_category": "owner_compensation"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["allowed"] == False, "GM should NOT have access to owner_compensation (clearance 3, owner_comp is level 4)"
        assert data["role"] == "gm"
        assert data["classification"] == "TOP_SECRET"
        
        print(f"PASS: GM denied owner_compensation access - allowed: {data['allowed']}")
    
    def test_owner_granted_owner_compensation(self):
        """GET /api/rbac/access-check grants owner access to owner_compensation"""
        response = requests.get(f"{BASE_URL}/api/rbac/access-check", params={
            "user_id": "usr-owner-001",
            "data_category": "owner_compensation"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["allowed"] == True, "Owner SHOULD have access to owner_compensation"
        assert data["role"] == "owner"
        
        print(f"PASS: Owner granted owner_compensation access - allowed: {data['allowed']}")


class TestAIQueryFiltering:
    """AI³ omniscient query with role-based filtering"""
    
    def test_staff_ai_query_redacts_financial_fields(self):
        """POST /api/rbac/ai-query as staff redacts financial fields"""
        response = requests.post(f"{BASE_URL}/api/rbac/ai-query", json={
            "user_id": "usr-staff-001",
            "query": "Show me financial data and labor costs"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["user"]["role"] == "staff"
        assert data["clearance_level"] == 0
        assert data["redacted_fields"] > 0, "Staff should have redacted fields"
        
        print(f"PASS: Staff AI query - redacted_fields: {data['redacted_fields']}")
    
    def test_owner_ai_query_returns_all_unredacted(self):
        """POST /api/rbac/ai-query as owner returns all fields unredacted"""
        response = requests.post(f"{BASE_URL}/api/rbac/ai-query", json={
            "user_id": "usr-owner-001",
            "query": "Show me financial data and labor costs"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["user"]["role"] == "owner"
        assert data["clearance_level"] == 4
        assert data["redacted_fields"] == 0, "Owner should have 0 redacted fields"
        
        print(f"PASS: Owner AI query - redacted_fields: {data['redacted_fields']}")


class TestProcurement:
    """Procurement intelligence endpoints"""
    
    def test_ap_aging_returns_buckets(self):
        """GET /api/procurement/ap-aging returns aging buckets"""
        response = requests.get(f"{BASE_URL}/api/procurement/ap-aging")
        assert response.status_code == 200
        data = response.json()
        
        assert "buckets" in data
        buckets = data["buckets"]
        expected_buckets = ["current", "30_day", "60_day", "90_day", "90_plus"]
        for bucket in expected_buckets:
            assert bucket in buckets, f"Missing bucket: {bucket}"
        
        assert "total_payable" in data
        assert "invoice_count" in data
        
        print(f"PASS: AP Aging - total_payable: {data['total_payable']}, invoice_count: {data['invoice_count']}")
    
    def test_spend_analytics_returns_by_vendor_outlet(self):
        """GET /api/procurement/spend-analytics returns spend by vendor/outlet"""
        response = requests.get(f"{BASE_URL}/api/procurement/spend-analytics")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_spend" in data
        assert "by_vendor" in data
        assert "by_outlet" in data
        assert "order_count" in data
        
        print(f"PASS: Spend Analytics - total_spend: {data['total_spend']}, order_count: {data['order_count']}")
    
    def test_vendor_scorecards_returns_5_vendors(self):
        """GET /api/procurement/vendor-scorecards returns 5 vendor scorecards"""
        response = requests.get(f"{BASE_URL}/api/procurement/vendor-scorecards")
        assert response.status_code == 200
        data = response.json()
        
        scorecards = data.get("scorecards", [])
        assert len(scorecards) >= 5, f"Expected at least 5 vendor scorecards, got {len(scorecards)}"
        
        # Verify scorecard structure
        if scorecards:
            sc = scorecards[0]
            assert "vendor_id" in sc
            assert "name" in sc
            assert "total_spend" in sc
        
        print(f"PASS: Vendor Scorecards - {len(scorecards)} scorecards returned")
    
    def test_three_way_match_validates_po(self):
        """POST /api/procurement/three-way-match validates PO matching"""
        # First get a valid PO ID from vendor_orders
        orders_response = requests.get(f"{BASE_URL}/api/ordering/orders")
        if orders_response.status_code == 200:
            orders = orders_response.json().get("orders", [])
            if orders:
                po_id = orders[0].get("id")
                response = requests.post(f"{BASE_URL}/api/procurement/three-way-match", json={
                    "po_id": po_id
                })
                assert response.status_code == 200
                data = response.json()
                
                assert "po_id" in data
                assert "po_total" in data
                assert "status" in data
                assert "issues" in data
                
                print(f"PASS: Three-way match - po_id: {data['po_id']}, status: {data['status']}")
                return
        
        # If no orders, test with a non-existent PO (should return 404)
        response = requests.post(f"{BASE_URL}/api/procurement/three-way-match", json={
            "po_id": "non-existent-po"
        })
        assert response.status_code == 404
        print("PASS: Three-way match - correctly returns 404 for non-existent PO")
    
    def test_budgets_returns_list(self):
        """GET /api/procurement/budgets returns budget list"""
        response = requests.get(f"{BASE_URL}/api/procurement/budgets")
        assert response.status_code == 200
        data = response.json()
        
        assert "budgets" in data
        assert "total" in data
        
        print(f"PASS: Budgets - {data['total']} budgets returned")


class TestCompliance:
    """HACCP compliance engine endpoints"""
    
    def test_haccp_templates_returns_7(self):
        """GET /api/compliance/haccp-templates returns 7 templates"""
        response = requests.get(f"{BASE_URL}/api/compliance/haccp-templates")
        assert response.status_code == 200
        data = response.json()
        
        templates = data.get("templates", [])
        assert len(templates) == 7, f"Expected 7 HACCP templates, got {len(templates)}"
        
        # Verify template structure
        expected_templates = ["haccp-receiving", "haccp-cooling", "haccp-cooking", 
                            "haccp-holding", "haccp-sanitation", "haccp-walkin", "haccp-allergen"]
        template_ids = [t.get("id") for t in templates]
        for tid in expected_templates:
            assert tid in template_ids, f"Missing template: {tid}"
        
        print(f"PASS: HACCP Templates - {len(templates)} templates returned")
    
    def test_submit_checklist_returns_score(self):
        """POST /api/compliance/checklists submits checklist and returns score"""
        response = requests.post(f"{BASE_URL}/api/compliance/checklists", json={
            "template_id": "haccp-sanitation",
            "outlet_id": "main-kitchen",
            "completed_by": "TEST_inspector",
            "items": [
                {"item_id": "sn-1", "passed": True, "value": "clean", "notes": ""},
                {"item_id": "sn-2", "passed": True, "value": "75 ppm", "notes": ""},
                {"item_id": "sn-3", "passed": True, "value": "stocked", "notes": ""},
                {"item_id": "sn-4", "passed": True, "value": "clean", "notes": ""},
                {"item_id": "sn-5", "passed": True, "value": "emptied", "notes": ""},
                {"item_id": "sn-6", "passed": True, "value": "no evidence", "notes": ""}
            ]
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert "score" in data
        assert "status" in data
        assert data["score"] == 100.0, f"Expected 100% score for all passed items, got {data['score']}"
        assert data["status"] == "passed"
        
        print(f"PASS: Checklist submission - score: {data['score']}, status: {data['status']}")
    
    def test_create_corrective_action(self):
        """POST /api/compliance/corrective-actions creates action"""
        response = requests.post(f"{BASE_URL}/api/compliance/corrective-actions", json={
            "checklist_id": "chk-test-001",
            "item_id": "sn-6",
            "description": "TEST_Found pest evidence near storage area",
            "assigned_to": "maintenance_manager",
            "due_date": "2026-01-20",
            "priority": "high"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["status"] == "open"
        assert data["priority"] == "high"
        
        print(f"PASS: Corrective action created - id: {data['id']}, status: {data['status']}")
    
    def test_log_temperature(self):
        """POST /api/compliance/temperature-logs logs temperature"""
        response = requests.post(f"{BASE_URL}/api/compliance/temperature-logs", json={
            "location": "walk-in-cooler-1",
            "outlet_id": "main-kitchen",
            "temperature": 38.5,
            "unit": "F",
            "recorded_by": "TEST_chef",
            "notes": "Normal operating temperature"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["temperature"] == 38.5
        assert data["alert"] == False  # 38.5F is within safe range
        
        print(f"PASS: Temperature logged - id: {data['id']}, temp: {data['temperature']}F, alert: {data['alert']}")
    
    def test_inspection_readiness_returns_grade(self):
        """GET /api/compliance/inspection-readiness returns grade and score"""
        response = requests.get(f"{BASE_URL}/api/compliance/inspection-readiness")
        assert response.status_code == 200
        data = response.json()
        
        assert "readiness_score" in data
        assert "grade" in data
        assert data["grade"] in ["A", "B", "C", "F"]
        assert "recommendations" in data
        
        print(f"PASS: Inspection readiness - score: {data['readiness_score']}, grade: {data['grade']}")


class TestFinanceIntelligence:
    """Finance intelligence endpoints"""
    
    def test_real_time_pl_returns_revenue_expenses(self):
        """GET /api/finance/real-time-pl returns P&L with revenue and expenses"""
        response = requests.get(f"{BASE_URL}/api/finance/real-time-pl")
        assert response.status_code == 200
        data = response.json()
        
        assert "revenue" in data
        assert "expenses" in data
        assert "net_operating_income" in data
        assert "margins" in data
        
        # Verify revenue structure
        revenue = data["revenue"]
        assert "dining" in revenue
        assert "events" in revenue
        assert "total" in revenue
        
        # Verify expenses structure
        expenses = data["expenses"]
        assert "food_cost" in expenses
        assert "labor" in expenses
        
        print(f"PASS: Real-time P&L - revenue: {revenue['total']}, NOI: {data['net_operating_income']}")
    
    def test_food_cost_trending_returns_status(self):
        """GET /api/finance/food-cost-trending returns trending data with status"""
        response = requests.get(f"{BASE_URL}/api/finance/food-cost-trending")
        assert response.status_code == 200
        data = response.json()
        
        assert "current_food_cost_pct" in data
        assert "target" in data
        assert "status" in data
        assert data["status"] in ["on_target", "warning", "critical"]
        assert "trending" in data
        
        print(f"PASS: Food cost trending - current: {data['current_food_cost_pct']}%, status: {data['status']}")
    
    def test_gl_summary_returns_10_accounts(self):
        """GET /api/finance/gl-summary returns 10 GL accounts"""
        response = requests.get(f"{BASE_URL}/api/finance/gl-summary")
        assert response.status_code == 200
        data = response.json()
        
        accounts = data.get("accounts", [])
        assert len(accounts) == 10, f"Expected 10 GL accounts, got {len(accounts)}"
        
        # Verify account structure
        if accounts:
            acc = accounts[0]
            assert "code" in acc
            assert "name" in acc
            assert "type" in acc
            assert "balance" in acc
        
        assert "recent_journal_entries" in data
        
        print(f"PASS: GL Summary - {len(accounts)} accounts returned")


class TestMultiProperty:
    """Multi-property management endpoints"""
    
    def test_properties_returns_3_seeded(self):
        """GET /api/properties returns 3 seeded properties"""
        response = requests.get(f"{BASE_URL}/api/properties")
        assert response.status_code == 200
        data = response.json()
        
        properties = data.get("properties", [])
        assert len(properties) >= 3, f"Expected at least 3 properties, got {len(properties)}"
        
        # Verify property structure
        if properties:
            prop = properties[0]
            assert "id" in prop
            assert "name" in prop
            assert "property_type" in prop
        
        print(f"PASS: Properties - {len(properties)} properties returned")


class TestGuestCRM:
    """Guest CRM endpoints"""
    
    def test_create_guest_profile(self):
        """POST /api/crm/guests creates guest profile"""
        response = requests.post(f"{BASE_URL}/api/crm/guests", json={
            "name": "TEST_John Smith",
            "email": "test.john@example.com",
            "phone": "+1-555-0123",
            "company": "Acme Corp",
            "vip_level": "gold",
            "dietary_preferences": ["vegetarian"],
            "allergies": ["shellfish"],
            "notes": "Prefers quiet rooms"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["name"] == "TEST_John Smith"
        assert data["vip_level"] == "gold"
        
        print(f"PASS: Guest created - id: {data['id']}, vip_level: {data['vip_level']}")
    
    def test_list_guests(self):
        """GET /api/crm/guests returns guest list"""
        response = requests.get(f"{BASE_URL}/api/crm/guests")
        assert response.status_code == 200
        data = response.json()
        
        assert "guests" in data
        assert "total" in data
        
        print(f"PASS: Guests list - {data['total']} guests returned")
    
    def test_crm_analytics_returns_vip_breakdown(self):
        """GET /api/crm/analytics returns VIP breakdown"""
        response = requests.get(f"{BASE_URL}/api/crm/analytics")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_profiles" in data
        assert "vip_breakdown" in data
        assert "repeat_rate" in data
        assert "avg_spend_per_visit" in data
        
        print(f"PASS: CRM Analytics - total_profiles: {data['total_profiles']}, repeat_rate: {data['repeat_rate']}%")


class TestSupplierNetwork:
    """Supplier network endpoints"""
    
    def test_add_catalog_item(self):
        """POST /api/supplier-network/catalog-items adds catalog item"""
        response = requests.post(f"{BASE_URL}/api/supplier-network/catalog-items", json={
            "vendor_id": "vendor-sysco",
            "sku": "TEST-SKU-001",
            "name": "TEST_Premium Olive Oil",
            "category": "oils",
            "unit": "gal",
            "pack_size": "6/1gal",
            "price": 45.99,
            "contract_price": 42.50,
            "min_order_qty": 2
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["name"] == "TEST_Premium Olive Oil"
        assert data["price"] == 45.99
        
        print(f"PASS: Catalog item added - id: {data['id']}, price: ${data['price']}")
    
    def test_search_catalog(self):
        """GET /api/supplier-network/catalog returns items"""
        response = requests.get(f"{BASE_URL}/api/supplier-network/catalog")
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        
        print(f"PASS: Catalog search - {data['total']} items returned")
    
    def test_price_compare(self):
        """GET /api/supplier-network/price-compare returns vendor comparison"""
        response = requests.get(f"{BASE_URL}/api/supplier-network/price-compare", params={
            "item_name": "olive"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "item" in data
        assert "comparisons" in data
        assert "vendor_count" in data
        
        print(f"PASS: Price compare - {data['vendor_count']} vendors compared")
    
    def test_create_rfq(self):
        """POST /api/supplier-network/rfq creates RFQ"""
        response = requests.post(f"{BASE_URL}/api/supplier-network/rfq", json={
            "title": "TEST_Q1 2026 Produce RFQ",
            "items": [
                {"name": "Organic Tomatoes", "quantity": 500, "unit": "lb", "specs": "Roma, Grade A"},
                {"name": "Fresh Basil", "quantity": 50, "unit": "bunch", "specs": "Local preferred"}
            ],
            "due_date": "2026-02-01",
            "invited_vendors": ["vendor-sysco", "vendor-usfoods"],
            "notes": "Quarterly produce contract"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["status"] == "open"
        assert len(data["items"]) == 2
        
        print(f"PASS: RFQ created - id: {data['id']}, status: {data['status']}")


class TestWasteTracking:
    """Waste tracking endpoints"""
    
    def test_log_waste_entry(self):
        """POST /api/inventory/waste logs waste entry"""
        response = requests.post(f"{BASE_URL}/api/inventory/waste", json={
            "item_name": "TEST_Expired Lettuce",
            "quantity": 5.5,
            "unit": "lb",
            "reason": "expired",
            "cost_estimate": 12.50,
            "outlet_id": "main-kitchen",
            "recorded_by": "TEST_chef"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["reason"] == "expired"
        assert data["quantity"] == 5.5
        
        print(f"PASS: Waste logged - id: {data['id']}, reason: {data['reason']}, qty: {data['quantity']} {data['unit']}")
    
    def test_waste_analytics(self):
        """GET /api/inventory/waste-analytics returns waste stats"""
        response = requests.get(f"{BASE_URL}/api/inventory/waste-analytics")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_waste_cost" in data
        assert "entry_count" in data
        assert "by_reason" in data
        assert "waste_as_pct_of_cogs" in data
        
        print(f"PASS: Waste analytics - total_cost: ${data['total_waste_cost']}, entries: {data['entry_count']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
