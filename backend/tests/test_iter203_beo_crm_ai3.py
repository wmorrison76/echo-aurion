"""
iter203 Backend Tests — BEO Builder, Dept Slices, CRM Lifecycle, Echo AI³
Tests all new endpoints from iter203a, iter202b, iter203c, iter204
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_TOKEN = "TsjvVFDCvoa4sG4wcVY7ZKF0D7LmA25lTer4edByo5o"

# Test menu ID from the spec
TEST_MENU_ID = "bm-4c10fe11"

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "X-Admin-Token": ADMIN_TOKEN
    })
    return session


# ═══════════════════════════════════════════════════════════════════════════════
# iter203a · BEO Builder CRUD Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestBeoBuilderCrud:
    """BEO Builder draft CRUD operations"""
    
    draft_id = None
    
    def test_create_draft(self, api_client):
        """POST /api/beo-builder/drafts creates a new draft"""
        # First check if test menu exists, if not use any available menu
        menus_r = api_client.get(f"{BASE_URL}/api/banquet-menus")
        assert menus_r.status_code == 200, f"Failed to get menus: {menus_r.text}"
        menus = menus_r.json().get("menus", [])
        
        menu_id = TEST_MENU_ID
        if not any(m.get("menu_id") == TEST_MENU_ID for m in menus):
            # Use first available menu
            if menus:
                menu_id = menus[0].get("menu_id")
            else:
                pytest.skip("No banquet menus available")
        
        response = api_client.post(f"{BASE_URL}/api/beo-builder/drafts", json={
            "menu_id": menu_id,
            "name": "TEST_iter203_Wedding_Reception",
            "guest_count": 150,
            "client": "TEST_Smith_Family"
        })
        assert response.status_code == 200, f"Create draft failed: {response.text}"
        data = response.json()
        assert "draft_id" in data
        assert data["name"] == "TEST_iter203_Wedding_Reception"
        assert data["guest_count"] == 150
        assert data["status"] == "draft"
        TestBeoBuilderCrud.draft_id = data["draft_id"]
        print(f"Created draft: {data['draft_id']}")
    
    def test_get_draft(self, api_client):
        """GET /api/beo-builder/drafts/{draft_id} returns draft with totals"""
        if not TestBeoBuilderCrud.draft_id:
            pytest.skip("No draft created")
        
        response = api_client.get(f"{BASE_URL}/api/beo-builder/drafts/{TestBeoBuilderCrud.draft_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["draft_id"] == TestBeoBuilderCrud.draft_id
        assert "totals" in data
        assert "selections" in data
        print(f"Draft totals: {data.get('totals')}")
    
    def test_patch_draft_selections(self, api_client):
        """PATCH /api/beo-builder/drafts/{draft_id} applies selections and notes"""
        if not TestBeoBuilderCrud.draft_id:
            pytest.skip("No draft created")
        
        # Add a selection with adjustment
        response = api_client.patch(f"{BASE_URL}/api/beo-builder/drafts/{TestBeoBuilderCrud.draft_id}", json={
            "selections": [{
                "item_id": "test-item-1",
                "name": "Test Appetizer",
                "section": "Food",
                "base_price": 50.0,
                "qty": 1,
                "adjustment_pct": 3.0,
                "show_on_beo": True,
                "note": "Extra sauce on side"
            }],
            "beo_notes": "VIP event - extra attention needed",
            "internal_justification": "Repeat client discount applied"
        })
        assert response.status_code == 200, f"Patch failed: {response.text}"
        data = response.json()
        assert len(data.get("selections", [])) == 1
        assert data["beo_notes"] == "VIP event - extra attention needed"
        assert data["internal_justification"] == "Repeat client discount applied"
        print(f"Updated draft with {len(data['selections'])} selections")
    
    def test_list_drafts(self, api_client):
        """GET /api/beo-builder/drafts returns list of drafts"""
        response = api_client.get(f"{BASE_URL}/api/beo-builder/drafts")
        assert response.status_code == 200
        data = response.json()
        assert "drafts" in data
        assert isinstance(data["drafts"], list)
        print(f"Found {len(data['drafts'])} drafts")


class TestBeoBuilderAudit:
    """BEO Builder self-audit functionality"""
    
    def test_audit_clean_draft(self, api_client):
        """POST /api/beo-builder/drafts/{id}/audit returns issues_found and auto_fixes"""
        # Create a clean draft first
        menus_r = api_client.get(f"{BASE_URL}/api/banquet-menus")
        menus = menus_r.json().get("menus", [])
        menu_id = menus[0].get("menu_id") if menus else "bm-pier66-v1"
        
        create_r = api_client.post(f"{BASE_URL}/api/beo-builder/drafts", json={
            "menu_id": menu_id,
            "name": "TEST_iter203_Audit_Clean",
            "guest_count": 50
        })
        assert create_r.status_code == 200
        draft_id = create_r.json()["draft_id"]
        
        # Run audit on clean draft
        response = api_client.post(f"{BASE_URL}/api/beo-builder/drafts/{draft_id}/audit")
        assert response.status_code == 200
        data = response.json()
        assert "issues_found" in data
        assert "auto_fixes" in data
        assert data["ok"] == True
        print(f"Audit result: {data['issues_found']} issues, {data['auto_fixes']} fixes")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/beo-builder/drafts/{draft_id}")
    
    def test_patch_clamps_adjustment(self, api_client):
        """PATCH clamps adjustment_pct > 5% to 5% at save time"""
        menus_r = api_client.get(f"{BASE_URL}/api/banquet-menus")
        menus = menus_r.json().get("menus", [])
        menu_id = menus[0].get("menu_id") if menus else "bm-pier66-v1"
        
        create_r = api_client.post(f"{BASE_URL}/api/beo-builder/drafts", json={
            "menu_id": menu_id,
            "name": "TEST_iter203_Clamp_Test",
            "guest_count": 50
        })
        draft_id = create_r.json()["draft_id"]
        
        # Add selection with >5% adjustment - should be clamped at save time
        patch_r = api_client.patch(f"{BASE_URL}/api/beo-builder/drafts/{draft_id}", json={
            "selections": [{
                "item_id": "test-clamp-item",
                "name": "Test Item",
                "section": "Food",
                "base_price": 100.0,
                "qty": 1,
                "adjustment_pct": 10.0,  # Should be clamped to 5%
                "show_on_beo": True
            }]
        })
        assert patch_r.status_code == 200
        data = patch_r.json()
        
        # Verify adjustment was clamped to 5%
        selections = data.get("selections", [])
        assert len(selections) == 1
        assert selections[0]["adjustment_pct"] == 5.0, f"Expected 5.0, got {selections[0]['adjustment_pct']}"
        print(f"Adjustment clamped from 10% to {selections[0]['adjustment_pct']}%")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/beo-builder/drafts/{draft_id}")


class TestBeoBuilderFinalize:
    """BEO Builder finalize functionality"""
    
    def test_finalize_creates_beo(self, api_client):
        """POST /api/beo-builder/drafts/{id}/finalize creates beo_id in beos collection"""
        menus_r = api_client.get(f"{BASE_URL}/api/banquet-menus")
        menus = menus_r.json().get("menus", [])
        menu_id = menus[0].get("menu_id") if menus else "bm-pier66-v1"
        
        create_r = api_client.post(f"{BASE_URL}/api/beo-builder/drafts", json={
            "menu_id": menu_id,
            "name": "TEST_iter203_Finalize",
            "guest_count": 75,
            "client": "TEST_Finalize_Client"
        })
        draft_id = create_r.json()["draft_id"]
        
        # Finalize
        response = api_client.post(f"{BASE_URL}/api/beo-builder/drafts/{draft_id}/finalize")
        assert response.status_code == 200, f"Finalize failed: {response.text}"
        data = response.json()
        assert "beo_id" in data
        assert data["status"] == "issued"
        print(f"Finalized to BEO: {data['beo_id']}")
        
        # Verify draft status changed
        draft_r = api_client.get(f"{BASE_URL}/api/beo-builder/drafts/{draft_id}")
        if draft_r.status_code == 200:
            draft_data = draft_r.json()
            assert draft_data.get("status") == "finalized"


class TestBeoBuilderDelete:
    """BEO Builder delete functionality"""
    
    def test_delete_draft(self, api_client):
        """DELETE /api/beo-builder/drafts/{draft_id} works"""
        menus_r = api_client.get(f"{BASE_URL}/api/banquet-menus")
        menus = menus_r.json().get("menus", [])
        menu_id = menus[0].get("menu_id") if menus else "bm-pier66-v1"
        
        create_r = api_client.post(f"{BASE_URL}/api/beo-builder/drafts", json={
            "menu_id": menu_id,
            "name": "TEST_iter203_Delete",
            "guest_count": 25
        })
        draft_id = create_r.json()["draft_id"]
        
        # Delete
        response = api_client.delete(f"{BASE_URL}/api/beo-builder/drafts/{draft_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        assert data["deleted"] == draft_id
        
        # Verify deleted
        get_r = api_client.get(f"{BASE_URL}/api/beo-builder/drafts/{draft_id}")
        assert get_r.status_code == 404
        print(f"Deleted draft: {draft_id}")


# ═══════════════════════════════════════════════════════════════════════════════
# iter202b · Department Slices Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestDeptSlices:
    """Department slice endpoints for HVAC/Banquet/AV"""
    
    def test_engineering_slice(self, api_client):
        """GET /api/dept-slices/engineering returns rooms with event_count and safe_work_windows"""
        response = api_client.get(f"{BASE_URL}/api/dept-slices/engineering")
        assert response.status_code == 200, f"Engineering slice failed: {response.text}"
        data = response.json()
        assert data["ok"] == True
        assert "rooms" in data
        assert "total_rooms" in data
        
        # Verify room structure
        if data["rooms"]:
            room = data["rooms"][0]
            assert "room" in room
            assert "event_count" in room
            assert "safe_work_windows" in room
        print(f"Engineering: {data['total_rooms']} rooms")
    
    def test_banquet_setup_slice(self, api_client):
        """GET /api/dept-slices/banquet-setup returns rows with equipment checklist"""
        response = api_client.get(f"{BASE_URL}/api/dept-slices/banquet-setup")
        assert response.status_code == 200, f"Banquet setup slice failed: {response.text}"
        data = response.json()
        assert data["ok"] == True
        assert "rows" in data
        assert "total" in data
        
        # Verify row structure if any
        if data["rows"]:
            row = data["rows"][0]
            assert "equipment" in row
            assert isinstance(row["equipment"], list)
        print(f"Banquet setup: {data['total']} rows")
    
    def test_av_slice(self, api_client):
        """GET /api/dept-slices/av returns AV-required events including implied-by-title"""
        response = api_client.get(f"{BASE_URL}/api/dept-slices/av")
        assert response.status_code == 200, f"AV slice failed: {response.text}"
        data = response.json()
        assert data["ok"] == True
        assert "rows" in data
        assert "total" in data
        
        # Verify AV flag structure
        if data["rows"]:
            row = data["rows"][0]
            assert "av_flag_reason" in row
            assert row["av_flag_reason"] in ["explicit", "implied_by_title"]
        print(f"AV: {data['total']} AV-required events")


# ═══════════════════════════════════════════════════════════════════════════════
# iter203c · CRM Lifecycle Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestCrmMetrics:
    """CRM metrics and forecast endpoints"""
    
    def test_crm_metrics(self, api_client):
        """GET /api/crm/metrics returns dashboard roll-up"""
        response = api_client.get(f"{BASE_URL}/api/crm/metrics")
        assert response.status_code == 200, f"CRM metrics failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        
        metrics = data["data"]
        assert "warm_leads" in metrics
        assert "contacts_total" in metrics
        assert "contacts_by_stage" in metrics
        assert "events_total" in metrics
        assert "invoices_sum" in metrics
        print(f"CRM metrics: {metrics['contacts_total']} contacts, ${metrics['invoices_sum']} invoices")
    
    def test_crm_forecast(self, api_client):
        """GET /api/crm/forecast?months=12 returns months array with value"""
        response = api_client.get(f"{BASE_URL}/api/crm/forecast?months=12")
        assert response.status_code == 200, f"CRM forecast failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "months" in data["data"]
        
        months = data["data"]["months"]
        assert len(months) == 12
        assert all("month" in m and "value" in m for m in months)
        print(f"CRM forecast: {len(months)} months")


class TestCrmContacts:
    """CRM contacts CRUD"""
    
    contact_id = None
    
    def test_create_contact(self, api_client):
        """POST /api/crm/contacts creates contact with valid stage"""
        response = api_client.post(f"{BASE_URL}/api/crm/contacts", json={
            "name": "TEST_iter203_John_Doe",
            "company": "TEST_Acme_Corp",
            "email": "test.john@acme.com",
            "phone": "+1-555-0123",
            "lifecycle_stage": "lead",
            "expected_value": 15000.0
        })
        assert response.status_code == 200, f"Create contact failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert data["data"]["name"] == "TEST_iter203_John_Doe"
        assert data["data"]["lifecycle_stage"] == "lead"
        TestCrmContacts.contact_id = data["data"]["id"]
        print(f"Created contact: {TestCrmContacts.contact_id}")
    
    def test_create_contact_invalid_stage(self, api_client):
        """POST /api/crm/contacts with invalid stage returns 400"""
        response = api_client.post(f"{BASE_URL}/api/crm/contacts", json={
            "name": "TEST_Invalid_Stage",
            "lifecycle_stage": "invalid_stage"
        })
        assert response.status_code == 400
        print("Invalid stage correctly rejected")
    
    def test_list_contacts_search(self, api_client):
        """GET /api/crm/contacts?search= filters contacts"""
        response = api_client.get(f"{BASE_URL}/api/crm/contacts?search=TEST_iter203")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "contacts" in data["data"]
        print(f"Search found {len(data['data']['contacts'])} contacts")
    
    def test_get_contact_hydrated(self, api_client):
        """GET /api/crm/contacts/{id} hydrates with event/beo/invoices"""
        if not TestCrmContacts.contact_id:
            pytest.skip("No contact created")
        
        response = api_client.get(f"{BASE_URL}/api/crm/contacts/{TestCrmContacts.contact_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["data"]["id"] == TestCrmContacts.contact_id
        print(f"Got contact: {data['data']['name']}")
    
    def test_update_contact(self, api_client):
        """PUT /api/crm/contacts/{id} updates contact"""
        if not TestCrmContacts.contact_id:
            pytest.skip("No contact created")
        
        response = api_client.put(f"{BASE_URL}/api/crm/contacts/{TestCrmContacts.contact_id}", json={
            "lifecycle_stage": "qualified",
            "expected_value": 25000.0
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["data"]["lifecycle_stage"] == "qualified"
        assert data["data"]["expected_value"] == 25000.0
        print(f"Updated contact to stage: qualified")
    
    def test_crm_pipeline(self, api_client):
        """GET /api/crm/pipeline returns stages grouped"""
        response = api_client.get(f"{BASE_URL}/api/crm/pipeline")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "stages" in data["data"]
        assert "pipeline" in data["data"]
        
        stages = data["data"]["stages"]
        expected_stages = ["lead", "qualified", "proposed", "contracted", "deposited", "in_event", "billed", "complete"]
        assert stages == expected_stages
        print(f"Pipeline stages: {stages}")
    
    def test_delete_contact(self, api_client):
        """DELETE /api/crm/contacts/{id} works"""
        if not TestCrmContacts.contact_id:
            pytest.skip("No contact created")
        
        response = api_client.delete(f"{BASE_URL}/api/crm/contacts/{TestCrmContacts.contact_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"Deleted contact: {TestCrmContacts.contact_id}")


# ═══════════════════════════════════════════════════════════════════════════════
# iter204 · Echo AI³ Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestEchoAi3Wisdom:
    """Echo AI³ wisdom rules seeding and retrieval"""
    
    def test_wisdom_seed_idempotent(self, api_client):
        """POST /api/echo-ai3/wisdom/seed is idempotent (added=0 if already seeded)"""
        # First seed
        response1 = api_client.post(f"{BASE_URL}/api/echo-ai3/wisdom/seed")
        assert response1.status_code == 200
        data1 = response1.json()
        assert data1["ok"] == True
        assert "added" in data1
        assert "total" in data1
        
        # Second seed should add 0
        response2 = api_client.post(f"{BASE_URL}/api/echo-ai3/wisdom/seed")
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["added"] == 0
        assert data2["total"] == 17
        print(f"Wisdom seed: added={data1['added']}, total={data2['total']}")
    
    def test_wisdom_rules_returns_17(self, api_client):
        """GET /api/echo-ai3/wisdom/rules returns 17 rules"""
        response = api_client.get(f"{BASE_URL}/api/echo-ai3/wisdom/rules")
        assert response.status_code == 200
        data = response.json()
        assert "rules" in data
        assert data["total"] == 17
        
        # Verify categories coverage
        categories = set(r["category"] for r in data["rules"])
        expected_categories = {"av", "banquet", "compliance", "engineering", "events", 
                              "finance", "forecast", "guest", "inventory", "labor", 
                              "menu", "network", "purchasing", "safety", "scheduling"}
        assert categories >= expected_categories, f"Missing categories: {expected_categories - categories}"
        print(f"Wisdom rules: {data['total']} rules, {len(categories)} categories")


class TestEchoAi3Actions:
    """Echo AI³ pending actions with human gate"""
    
    action_id = None
    
    def test_submit_action(self, api_client):
        """POST /api/echo-ai3/actions submits pending action"""
        response = api_client.post(f"{BASE_URL}/api/echo-ai3/actions", json={
            "kind": "po_draft",
            "title": "TEST_iter204_Draft_PO",
            "summary": "Auto-generated PO for produce order",
            "reversible": True,
            "risk_level": "medium",
            "payload": {"vendor": "Fresh Farms", "amount": 1500},
            "money_amount": 1500.0
        })
        assert response.status_code == 200, f"Submit action failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["status"] == "pending"
        TestEchoAi3Actions.action_id = data["id"]
        print(f"Submitted action: {TestEchoAi3Actions.action_id}")
    
    def test_list_pending_actions(self, api_client):
        """GET /api/echo-ai3/actions/pending lists pending only"""
        response = api_client.get(f"{BASE_URL}/api/echo-ai3/actions/pending")
        assert response.status_code == 200
        data = response.json()
        assert "actions" in data
        
        # All should be pending
        for action in data["actions"]:
            assert action["status"] == "pending"
        print(f"Pending actions: {data['total']}")
    
    def test_approve_action(self, api_client):
        """POST /api/echo-ai3/actions/{id}/approve flips to approved"""
        if not TestEchoAi3Actions.action_id:
            pytest.skip("No action created")
        
        response = api_client.post(
            f"{BASE_URL}/api/echo-ai3/actions/{TestEchoAi3Actions.action_id}/approve",
            headers={"X-User": "test_user"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        assert data["status"] == "approved"
        print(f"Approved action: {TestEchoAi3Actions.action_id}")
    
    def test_approve_already_approved_returns_409(self, api_client):
        """POST /api/echo-ai3/actions/{id}/approve on already-approved returns 409"""
        if not TestEchoAi3Actions.action_id:
            pytest.skip("No action created")
        
        response = api_client.post(
            f"{BASE_URL}/api/echo-ai3/actions/{TestEchoAi3Actions.action_id}/approve"
        )
        assert response.status_code == 409
        print("Double-approve correctly returns 409")
    
    def test_reject_action(self, api_client):
        """POST /api/echo-ai3/actions/{id}/reject flips to rejected"""
        # Create a new action to reject
        create_r = api_client.post(f"{BASE_URL}/api/echo-ai3/actions", json={
            "kind": "menu_change",
            "title": "TEST_iter204_Reject_Test",
            "summary": "Test action for rejection",
            "reversible": True,
            "risk_level": "low",
            "payload": {}
        })
        action_id = create_r.json()["id"]
        
        response = api_client.post(
            f"{BASE_URL}/api/echo-ai3/actions/{action_id}/reject",
            headers={"X-User": "test_user"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        assert data["status"] == "rejected"
        print(f"Rejected action: {action_id}")


# ═══════════════════════════════════════════════════════════════════════════════
# Cleanup
# ═══════════════════════════════════════════════════════════════════════════════

class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_drafts(self, api_client):
        """Clean up TEST_ prefixed BEO drafts"""
        response = api_client.get(f"{BASE_URL}/api/beo-builder/drafts?limit=100")
        if response.status_code == 200:
            drafts = response.json().get("drafts", [])
            deleted = 0
            for d in drafts:
                if d.get("name", "").startswith("TEST_"):
                    api_client.delete(f"{BASE_URL}/api/beo-builder/drafts/{d['draft_id']}")
                    deleted += 1
            print(f"Cleaned up {deleted} test drafts")
    
    def test_cleanup_test_contacts(self, api_client):
        """Clean up TEST_ prefixed CRM contacts"""
        response = api_client.get(f"{BASE_URL}/api/crm/contacts?search=TEST_&limit=100")
        if response.status_code == 200:
            data = response.json()
            contacts = data.get("data", {}).get("contacts", [])
            deleted = 0
            for c in contacts:
                if c.get("name", "").startswith("TEST_"):
                    api_client.delete(f"{BASE_URL}/api/crm/contacts/{c['id']}")
                    deleted += 1
            print(f"Cleaned up {deleted} test contacts")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
