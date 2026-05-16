"""
iter252 · Purchasing Approvals + Daily AI Briefing Tests
=========================================================
Tests for:
1. /api/approvals/limits - GET per-role purchasing limits
2. /api/approvals/requests - POST create, GET list
3. /api/approvals/requests/{id}/approve - POST approve
4. /api/approvals/requests/{id}/reject - POST reject
5. /api/approvals/banner - GET pending for user
6. /api/approvals/hierarchy - GET role chain
7. /api/briefing/standup-feed - GET mobile standup feed
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# User IDs from auth.py seed
ADMIN_ID = "admin"
DIRECTOR_ID = "director_user"
GM_ID = "general_manager_user"
EXEC_CHEF_ID = "executive_chef_user"
SOUS_CHEF_ID = "sous_chef_user"
FB_DIRECTOR_ID = "fb_director_user"
CONTROLLER_ID = "controller_user"


class TestApprovalLimits:
    """Test /api/approvals/limits endpoint"""

    def test_get_limits_returns_14_roles(self):
        """GET /api/approvals/limits returns 14 role rows with default limits"""
        r = requests.get(f"{BASE_URL}/api/approvals/limits")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "rows" in data
        assert "count" in data
        assert data["count"] == 14, f"Expected 14 roles, got {data['count']}"
        
        # Verify specific default limits
        limits_by_role = {row["role"]: row["limit"] for row in data["rows"]}
        assert limits_by_role.get("sous-chef") == 2000, f"sous-chef limit should be 2000, got {limits_by_role.get('sous-chef')}"
        assert limits_by_role.get("executive-chef") == 10000, f"exec-chef limit should be 10000, got {limits_by_role.get('executive-chef')}"
        assert limits_by_role.get("director") == 25000, f"director limit should be 25000, got {limits_by_role.get('director')}"
        assert limits_by_role.get("admin") == 10_000_000, f"admin limit should be 10M, got {limits_by_role.get('admin')}"
        print(f"✓ GET /api/approvals/limits returns {data['count']} roles with correct default limits")

    def test_update_limit_sous_chef(self):
        """PUT /api/approvals/limits/sous-chef updates limit"""
        # Update sous-chef limit to 3500
        r = requests.put(
            f"{BASE_URL}/api/approvals/limits/sous-chef",
            json={"limit": 3500}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("limit") == 3500
        
        # Verify GET reflects new value
        r2 = requests.get(f"{BASE_URL}/api/approvals/limits")
        limits_by_role = {row["role"]: row["limit"] for row in r2.json()["rows"]}
        assert limits_by_role.get("sous-chef") == 3500, f"sous-chef limit should be 3500 after update"
        
        # Reset back to 2000
        requests.put(f"{BASE_URL}/api/approvals/limits/sous-chef", json={"limit": 2000})
        print("✓ PUT /api/approvals/limits/sous-chef updates and GET reflects new value")


class TestApprovalHierarchy:
    """Test /api/approvals/hierarchy endpoint"""

    def test_get_hierarchy(self):
        """GET /api/approvals/hierarchy returns role/approver chain"""
        r = requests.get(f"{BASE_URL}/api/approvals/hierarchy")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "rows" in data
        
        # Verify chain structure
        chain_by_role = {row["role"]: row.get("approver_role") for row in data["rows"]}
        assert chain_by_role.get("sous-chef") == "executive-chef"
        assert chain_by_role.get("executive-chef") == "fb-director"
        assert chain_by_role.get("fb-director") == "general-manager"
        assert chain_by_role.get("general-manager") == "director"
        assert chain_by_role.get("director") == "admin"
        assert chain_by_role.get("admin") is None  # final
        print("✓ GET /api/approvals/hierarchy returns correct role chain")


class TestApprovalRequests:
    """Test /api/approvals/requests CRUD"""

    def test_create_request_sous_chef_4500_pending(self):
        """POST /api/approvals/requests with sous-chef $4500 → status='pending', current_approver_role='executive-chef'"""
        r = requests.post(
            f"{BASE_URL}/api/approvals/requests",
            json={
                "requested_by_id": SOUS_CHEF_ID,
                "requested_by_name": "Carlos Mendes",
                "requested_by_role": "sous-chef",
                "outlet": "Signature Italian",
                "company": "Test Company",
                "item_description": "Kitchen equipment upgrade",
                "amount": 4500,
                "notes": "Urgent need for new mixer"
            }
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("status") == "pending", f"Expected pending, got {data.get('status')}"
        assert data.get("current_approver_role") == "executive-chef", f"Expected executive-chef, got {data.get('current_approver_role')}"
        assert data.get("amount") == 4500
        assert "id" in data
        print(f"✓ POST /api/approvals/requests sous-chef $4500 → pending, approver=executive-chef, id={data['id']}")
        return data["id"]

    def test_create_request_sous_chef_18000_walks_chain(self):
        """POST /api/approvals/requests sous-chef $18000 → walks chain to general-manager"""
        r = requests.post(
            f"{BASE_URL}/api/approvals/requests",
            json={
                "requested_by_id": SOUS_CHEF_ID,
                "requested_by_name": "Carlos Mendes",
                "requested_by_role": "sous-chef",
                "outlet": "Pool Bar",
                "item_description": "Large equipment purchase",
                "amount": 18000
            }
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("status") == "pending"
        # $18000 exceeds exec-chef ($10k) and fb-director ($15k), so goes to GM ($20k)
        assert data.get("current_approver_role") == "general-manager", f"Expected general-manager for $18k, got {data.get('current_approver_role')}"
        print(f"✓ POST /api/approvals/requests sous-chef $18000 → pending, approver=general-manager")
        return data["id"]

    def test_create_request_auto_approved_within_limit(self):
        """POST /api/approvals/requests within own limit → auto-approved"""
        r = requests.post(
            f"{BASE_URL}/api/approvals/requests",
            json={
                "requested_by_id": EXEC_CHEF_ID,
                "requested_by_name": "Chef Gio",
                "requested_by_role": "executive-chef",
                "outlet": "Main Kitchen",
                "item_description": "Small supplies",
                "amount": 500  # Well within exec-chef's $10k limit
            }
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("status") == "auto-approved", f"Expected auto-approved, got {data.get('status')}"
        assert data.get("current_approver_role") is None
        print("✓ POST /api/approvals/requests within limit → auto-approved")


class TestApprovalActions:
    """Test approve/reject actions"""

    def test_approve_as_correct_approver(self):
        """POST /api/approvals/requests/{id}/approve as exec-chef → status='approved'"""
        # First create a request that needs exec-chef approval
        create_r = requests.post(
            f"{BASE_URL}/api/approvals/requests",
            json={
                "requested_by_id": SOUS_CHEF_ID,
                "requested_by_role": "sous-chef",
                "outlet": "Test Outlet",
                "item_description": "Test item for approval",
                "amount": 4500
            }
        )
        req_id = create_r.json()["id"]
        
        # Approve as exec-chef
        r = requests.post(
            f"{BASE_URL}/api/approvals/requests/{req_id}/approve",
            json={
                "approver_id": EXEC_CHEF_ID,
                "approver_name": "Chef Gio",
                "note": "Approved for kitchen needs"
            }
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("status") == "approved", f"Expected approved, got {data.get('status')}"
        print(f"✓ POST /api/approvals/requests/{req_id}/approve as exec-chef → approved")

    def test_approve_wrong_approver_403(self):
        """POST /api/approvals/requests/{id}/approve with WRONG approver role → 403"""
        # Create a request that needs exec-chef approval
        create_r = requests.post(
            f"{BASE_URL}/api/approvals/requests",
            json={
                "requested_by_id": SOUS_CHEF_ID,
                "requested_by_role": "sous-chef",
                "outlet": "Test Outlet",
                "item_description": "Test item for wrong approver",
                "amount": 4500
            }
        )
        req_id = create_r.json()["id"]
        
        # Try to approve as sous-chef (wrong role)
        r = requests.post(
            f"{BASE_URL}/api/approvals/requests/{req_id}/approve",
            json={
                "approver_id": SOUS_CHEF_ID,
                "approver_name": "Carlos Mendes"
            }
        )
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
        assert "current approver must be" in r.text.lower()
        print(f"✓ POST /api/approvals/requests/{req_id}/approve with wrong role → 403")

    def test_reject_with_reason(self):
        """POST /api/approvals/requests/{id}/reject with reason → status='rejected', has rejection_reason"""
        # Create a request
        create_r = requests.post(
            f"{BASE_URL}/api/approvals/requests",
            json={
                "requested_by_id": SOUS_CHEF_ID,
                "requested_by_role": "sous-chef",
                "outlet": "Test Outlet",
                "item_description": "Test item for rejection",
                "amount": 4500
            }
        )
        req_id = create_r.json()["id"]
        
        # Reject as exec-chef
        r = requests.post(
            f"{BASE_URL}/api/approvals/requests/{req_id}/reject",
            json={
                "approver_id": EXEC_CHEF_ID,
                "approver_name": "Chef Gio",
                "reason": "Budget constraints this quarter"
            }
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("status") == "rejected"
        
        # Verify rejection_reason in GET
        get_r = requests.get(f"{BASE_URL}/api/approvals/requests?status=rejected")
        rejected = [x for x in get_r.json()["rows"] if x["id"] == req_id]
        assert len(rejected) == 1
        assert rejected[0].get("rejection_reason") == "Budget constraints this quarter"
        print(f"✓ POST /api/approvals/requests/{req_id}/reject → rejected with reason")


class TestApprovalBanner:
    """Test /api/approvals/banner endpoint"""

    def test_banner_for_fb_director(self):
        """GET /api/approvals/banner?for_user=fb_director_user → returns pending list scoped to that role"""
        # First create a request that needs fb-director approval
        create_r = requests.post(
            f"{BASE_URL}/api/approvals/requests",
            json={
                "requested_by_id": EXEC_CHEF_ID,
                "requested_by_role": "executive-chef",
                "outlet": "Main Kitchen",
                "item_description": "Large equipment for banner test",
                "amount": 12000  # Exceeds exec-chef $10k, goes to fb-director
            }
        )
        req_id = create_r.json()["id"]
        
        # Get banner for fb-director
        r = requests.get(f"{BASE_URL}/api/approvals/banner?for_user={FB_DIRECTOR_ID}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "pending" in data
        assert "count" in data
        assert "user" in data
        
        # Should include our request
        pending_ids = [p["id"] for p in data["pending"]]
        assert req_id in pending_ids, f"Request {req_id} should be in fb-director's pending list"
        print(f"✓ GET /api/approvals/banner?for_user=fb_director_user returns pending scoped to role")

    def test_banner_for_admin(self):
        """GET /api/approvals/banner?for_user=admin → returns pending for admin role"""
        r = requests.get(f"{BASE_URL}/api/approvals/banner?for_user={ADMIN_ID}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "pending" in data
        assert data["user"]["role"] == "admin"
        print("✓ GET /api/approvals/banner?for_user=admin works")


class TestBriefingStandupFeed:
    """Test /api/briefing/standup-feed endpoint"""

    def test_standup_feed_returns_data(self):
        """GET /api/briefing/standup-feed → returns {bullets, narrative, role, data}"""
        r = requests.get(f"{BASE_URL}/api/briefing/standup-feed")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "role" in data
        assert "data" in data
        assert "bullets" in data
        assert "narrative" in data
        assert isinstance(data["bullets"], list)
        print(f"✓ GET /api/briefing/standup-feed returns ok=true, role={data['role']}, {len(data['bullets'])} bullets")

    def test_standup_feed_with_role_param(self):
        """GET /api/briefing/standup-feed?role=executive-chef → returns chef-specific data"""
        r = requests.get(f"{BASE_URL}/api/briefing/standup-feed?role=executive-chef")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("role") == "executive-chef"
        assert "data" in data
        # Chef data should have kitchen scope
        assert data["data"].get("scope") == "kitchen"
        print("✓ GET /api/briefing/standup-feed?role=executive-chef returns kitchen-scoped data")


class TestApprovalChainWalk:
    """Test approval chain walking logic"""

    def test_chain_walk_advances_on_partial_approval(self):
        """When approver's limit doesn't cover amount, chain advances to next approver"""
        # Create request for $22000 (exceeds GM's $20k, needs director)
        create_r = requests.post(
            f"{BASE_URL}/api/approvals/requests",
            json={
                "requested_by_id": FB_DIRECTOR_ID,
                "requested_by_role": "fb-director",
                "outlet": "Resort Wide",
                "item_description": "Major renovation",
                "amount": 22000
            }
        )
        req_id = create_r.json()["id"]
        assert create_r.json()["current_approver_role"] == "director", "Should route to director for $22k"
        
        # Director approves (within their $25k limit)
        r = requests.post(
            f"{BASE_URL}/api/approvals/requests/{req_id}/approve",
            json={"approver_id": DIRECTOR_ID, "approver_name": "William Reyes"}
        )
        assert r.status_code == 200
        assert r.json()["status"] == "approved"
        print("✓ Chain walk: $22k request routes to director, director approves → approved")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
