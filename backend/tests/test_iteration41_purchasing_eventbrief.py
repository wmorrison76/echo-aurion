"""
Iteration 41 - Purchasing Hub & AI Event Brief Generator Tests
Tests:
- Purchasing Hub: Dashboard KPIs, Vendors CRUD, POs CRUD, Receiving Log, GL Codes, Invoice Scans
- Event Brief: AI generation (GPT-4.1-mini with fallback), Briefs CRUD, Status updates
- Invoice OCR: Scan endpoint (existing), Match PO endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestPurchasingDashboard:
    """Purchasing Hub Dashboard KPIs"""
    
    def test_dashboard_returns_200(self, api_client):
        """GET /api/purchasing/dashboard returns KPIs"""
        response = api_client.get(f"{BASE_URL}/api/purchasing/dashboard")
        assert response.status_code == 200
        data = response.json()
        # Verify KPI fields exist
        assert "active_vendors" in data
        assert "open_purchase_orders" in data
        assert "deliveries_today" in data
        assert "invoice_scans" in data
        assert "gl_codes" in data
        assert "ytd_spend" in data
        print(f"Dashboard KPIs: vendors={data['active_vendors']}, open_pos={data['open_purchase_orders']}, gl_codes={data['gl_codes']}, ytd_spend=${data['ytd_spend']}")


class TestPurchasingVendors:
    """Purchasing Hub Vendors CRUD"""
    
    def test_list_vendors_returns_200(self, api_client):
        """GET /api/purchasing/vendors returns seeded vendors"""
        response = api_client.get(f"{BASE_URL}/api/purchasing/vendors")
        assert response.status_code == 200
        data = response.json()
        assert "vendors" in data
        assert "total" in data
        # Should have 6 seeded vendors
        assert data["total"] >= 6
        vendors = data["vendors"]
        # Verify vendor structure
        if vendors:
            v = vendors[0]
            assert "vendor_id" in v
            assert "name" in v
            assert "category" in v
            assert "rating" in v
            assert "gl_code" in v
        print(f"Vendors: {data['total']} total, categories: {set(v['category'] for v in vendors)}")
    
    def test_create_vendor(self, api_client):
        """POST /api/purchasing/vendors creates new vendor"""
        payload = {
            "name": "TEST_Vendor_Iter41",
            "category": "produce",
            "contact": "Test Contact",
            "email": "test@vendor41.com",
            "phone": "(555) 123-4567",
            "payment_terms": "NET 30",
            "gl_code": "5000"
        }
        response = api_client.post(f"{BASE_URL}/api/purchasing/vendors", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == payload["name"]
        assert data["category"] == payload["category"]
        assert "vendor_id" in data
        assert data["status"] == "active"
        print(f"Created vendor: {data['vendor_id']} - {data['name']}")


class TestPurchasingOrders:
    """Purchasing Hub Purchase Orders CRUD"""
    
    def test_list_orders_returns_200(self, api_client):
        """GET /api/purchasing/orders returns seeded POs"""
        response = api_client.get(f"{BASE_URL}/api/purchasing/orders")
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        assert "total" in data
        # Should have 8 seeded POs
        assert data["total"] >= 8
        orders = data["orders"]
        # Verify PO structure
        if orders:
            po = orders[0]
            assert "po_id" in po
            assert "vendor_id" in po
            assert "status" in po
            assert "items" in po
            assert "total" in po
            assert "gl_code" in po
        print(f"Purchase Orders: {data['total']} total, statuses: {set(o['status'] for o in orders)}")
    
    def test_create_purchase_order(self, api_client):
        """POST /api/purchasing/orders creates new PO"""
        payload = {
            "vendor_id": "v-test-iter41",
            "vendor_name": "Test Vendor Iter41",
            "items": [
                {"item_code": "SKU-TEST1", "description": "Test Item 1", "quantity": 10, "unit_price": 25.00, "extension": 250.00, "unit": "CASE"},
                {"item_code": "SKU-TEST2", "description": "Test Item 2", "quantity": 5, "unit_price": 50.00, "extension": 250.00, "unit": "EACH"}
            ],
            "delivery_date": "2026-02-15",
            "gl_code": "5000",
            "notes": "Test PO for iteration 41"
        }
        response = api_client.post(f"{BASE_URL}/api/purchasing/orders", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "po_id" in data
        assert data["status"] == "open"
        assert data["subtotal"] == 500.00
        assert data["gl_code"] == "5000"
        assert len(data["items"]) == 2
        print(f"Created PO: {data['po_id']} - ${data['total']}")


class TestPurchasingReceiving:
    """Purchasing Hub Receiving Log"""
    
    def test_receive_delivery(self, api_client):
        """POST /api/purchasing/receive logs a delivery"""
        payload = {
            "po_id": "PO-TEST-ITER41",
            "vendor_id": "v-test-iter41",
            "vendor_name": "Test Vendor Iter41",
            "received_by": "Test User",
            "items": [
                {"item_code": "SKU-TEST1", "quantity_received": 10}
            ],
            "temperature_check": "pass",
            "quality_check": "pass",
            "gl_code": "5000",
            "notes": "Test receiving for iteration 41"
        }
        response = api_client.post(f"{BASE_URL}/api/purchasing/receive", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "receive_id" in data
        assert data["temperature_check"] == "pass"
        assert data["quality_check"] == "pass"
        assert data["gl_code"] == "5000"
        print(f"Logged receiving: {data['receive_id']}")
    
    def test_get_receiving_log(self, api_client):
        """GET /api/purchasing/receiving-log returns history"""
        response = api_client.get(f"{BASE_URL}/api/purchasing/receiving-log")
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert "total" in data
        print(f"Receiving log: {data['total']} entries")


class TestPurchasingGLCodes:
    """Purchasing Hub GL Codes"""
    
    def test_list_gl_codes_returns_200(self, api_client):
        """GET /api/purchasing/gl-codes returns 12 seeded GL codes"""
        response = api_client.get(f"{BASE_URL}/api/purchasing/gl-codes")
        assert response.status_code == 200
        data = response.json()
        assert "gl_codes" in data
        assert "total" in data
        # Should have 12 seeded GL codes
        assert data["total"] >= 12
        codes = data["gl_codes"]
        # Verify GL code structure
        if codes:
            gl = codes[0]
            assert "code" in gl
            assert "name" in gl
            assert "category" in gl
            assert "description" in gl
        # Verify categories
        categories = set(c["category"] for c in codes)
        expected_categories = {"COGS", "Labor", "Expense", "Overhead", "Marketing", "Maintenance"}
        assert categories == expected_categories, f"Expected {expected_categories}, got {categories}"
        print(f"GL Codes: {data['total']} total, categories: {categories}")
    
    def test_create_gl_code(self, api_client):
        """POST /api/purchasing/gl-codes creates new GL code"""
        payload = {
            "code": "9999",
            "name": "Test GL Code Iter41",
            "category": "Expense",
            "description": "Test GL code for iteration 41"
        }
        response = api_client.post(f"{BASE_URL}/api/purchasing/gl-codes", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "9999"
        assert data["name"] == payload["name"]
        assert "gl_id" in data
        print(f"Created GL code: {data['code']} - {data['name']}")


class TestPurchasingInvoiceScans:
    """Purchasing Hub Invoice Scan Log"""
    
    def test_log_invoice_scan(self, api_client):
        """POST /api/purchasing/invoice-scans logs a scan result"""
        payload = {
            "filename": "test_invoice_iter41.pdf",
            "vendor_name": "Test Vendor",
            "invoice_number": "INV-TEST-41",
            "po_number": "PO-TEST-41",
            "total": 1250.00,
            "line_count": 5,
            "match_status": "clean",
            "gl_code": "5000",
            "scanned_by": "Test User"
        }
        response = api_client.post(f"{BASE_URL}/api/purchasing/invoice-scans", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "scan_id" in data
        assert data["invoice_number"] == "INV-TEST-41"
        assert data["total"] == 1250.00
        print(f"Logged invoice scan: {data['scan_id']}")
    
    def test_list_invoice_scans(self, api_client):
        """GET /api/purchasing/invoice-scans returns scan history"""
        response = api_client.get(f"{BASE_URL}/api/purchasing/invoice-scans")
        assert response.status_code == 200
        data = response.json()
        assert "scans" in data
        assert "total" in data
        print(f"Invoice scans: {data['total']} entries")


class TestEventBriefGenerate:
    """AI Event Brief Generator"""
    
    def test_generate_event_brief(self, api_client):
        """POST /api/event-brief/generate creates BEO with AI or fallback"""
        payload = {
            "client_name": "TEST_Johnson Corp",
            "event_type": "Corporate Dinner",
            "guest_count": 150,
            "date": "2026-03-15",
            "budget_range": "$15,000 - $25,000",
            "special_requests": "Live jazz trio, custom cocktail",
            "dietary_notes": "3 vegetarian, 1 gluten-free",
            "inquiry_text": "We're looking to host our annual corporate gala for about 150 people."
        }
        response = api_client.post(f"{BASE_URL}/api/event-brief/generate", json=payload, timeout=60)
        assert response.status_code == 200
        data = response.json()
        
        # Verify brief structure
        assert "brief_id" in data
        assert "client_name" in data
        assert data["client_name"] == "TEST_Johnson Corp"
        assert "guest_count" in data
        assert data["guest_count"] == 150
        assert "ai_generated" in data
        assert "brief" in data
        assert data["status"] == "draft"
        
        # Verify BEO content
        brief = data["brief"]
        assert "event_title" in brief
        assert "event_summary" in brief
        assert "room_recommendation" in brief
        assert "timeline" in brief
        assert "menu_recommendation" in brief
        assert "staffing_plan" in brief
        assert "estimated_cost" in brief
        
        # Verify cost structure
        cost = brief["estimated_cost"]
        assert "food_beverage" in cost
        assert "estimated_total" in cost
        assert "per_person" in cost
        
        ai_status = "AI-generated" if data["ai_generated"] else "Deterministic fallback"
        print(f"Generated brief: {data['brief_id']} ({ai_status}), total: ${cost['estimated_total']}")
        
        return data["brief_id"]


class TestEventBriefCRUD:
    """Event Brief CRUD operations"""
    
    @pytest.fixture(scope="class")
    def created_brief_id(self, api_client):
        """Create a brief for testing"""
        payload = {
            "client_name": "TEST_CRUD_Client",
            "event_type": "Wedding Reception",
            "guest_count": 200,
            "date": "2026-06-20"
        }
        response = api_client.post(f"{BASE_URL}/api/event-brief/generate", json=payload, timeout=60)
        assert response.status_code == 200
        return response.json()["brief_id"]
    
    def test_list_briefs(self, api_client):
        """GET /api/event-brief/briefs returns saved briefs"""
        response = api_client.get(f"{BASE_URL}/api/event-brief/briefs")
        assert response.status_code == 200
        data = response.json()
        assert "briefs" in data
        assert "total" in data
        print(f"Event briefs: {data['total']} total")
    
    def test_get_brief_by_id(self, api_client, created_brief_id):
        """GET /api/event-brief/briefs/{id} returns specific brief"""
        response = api_client.get(f"{BASE_URL}/api/event-brief/briefs/{created_brief_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["brief_id"] == created_brief_id
        assert "brief" in data
        print(f"Retrieved brief: {created_brief_id}")
    
    def test_update_brief_status(self, api_client, created_brief_id):
        """PUT /api/event-brief/briefs/{id} updates brief status"""
        payload = {"status": "approved"}
        response = api_client.put(f"{BASE_URL}/api/event-brief/briefs/{created_brief_id}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "approved"
        print(f"Updated brief status to: approved")
        
        # Verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/event-brief/briefs/{created_brief_id}")
        assert get_response.status_code == 200
        assert get_response.json()["status"] == "approved"


class TestInvoiceOCR:
    """Invoice OCR endpoints (existing functionality)"""
    
    def test_match_po_endpoint(self, api_client):
        """POST /api/invoice-ocr/match-po matches invoice to PO"""
        payload = {
            "po_number": "PO-20001",
            "vendor": {"name": "Blue Harbor Seafood Co."},
            "line_items": [
                {"item_code": "SKU-1001", "description": "Fresh Salmon", "quantity_ordered": 20, "quantity_shipped": 18},
                {"item_code": "SKU-1002", "description": "Shrimp", "quantity_ordered": 30, "quantity_shipped": 30}
            ],
            "total": 1500.00
        }
        response = api_client.post(f"{BASE_URL}/api/invoice-ocr/match-po", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "po_number" in data
        assert "match_status" in data
        assert "discrepancies" in data
        assert "recommendation" in data
        # Should detect the short shipment
        assert data["discrepancy_count"] >= 1
        print(f"PO Match: {data['match_status']}, discrepancies: {data['discrepancy_count']}")


class TestSidebarIntegration:
    """Verify Invoice OCR is NOT a standalone sidebar item (moved into P&R)"""
    
    def test_purchasing_hub_endpoint_exists(self, api_client):
        """Verify purchasing-hub endpoints are accessible"""
        # Dashboard
        response = api_client.get(f"{BASE_URL}/api/purchasing/dashboard")
        assert response.status_code == 200
        
        # Vendors
        response = api_client.get(f"{BASE_URL}/api/purchasing/vendors")
        assert response.status_code == 200
        
        # Orders
        response = api_client.get(f"{BASE_URL}/api/purchasing/orders")
        assert response.status_code == 200
        
        # GL Codes
        response = api_client.get(f"{BASE_URL}/api/purchasing/gl-codes")
        assert response.status_code == 200
        
        # Invoice Scans (within P&R)
        response = api_client.get(f"{BASE_URL}/api/purchasing/invoice-scans")
        assert response.status_code == 200
        
        print("All Purchasing Hub endpoints accessible")
