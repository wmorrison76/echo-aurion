"""
Iteration 151 - Cake Viewer Full Feature Test Suite
====================================================
Tests all 10 new features:
- Sessions CRUD with tilt/offset/finish/toppers/intake
- Sizing calculator (guests → recommended tiers)
- Cut guide (ring-cut math)
- Portion estimator (cost/margin breakdown)
- Templates (4 templates)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCakeViewerSessionsCRUD:
    """Test sessions CRUD with iter151 payload (tilt, offset, finish, toppers, intake)"""
    
    created_session_id = None
    
    def test_create_session_full_iter151_payload(self):
        """POST /api/cake-viewer/sessions with full iter151 payload"""
        payload = {
            "title": "TEST_iter151_full_payload",
            "tiers": [
                {
                    "height": 0.6, "radius": 1.2, "color": "#fff8f2",
                    "roughness": 0.7, "metalness": 0,
                    "tilt_x": 0.1, "tilt_z": -0.05, "offset_x": 0.15, "offset_z": 0.1,
                    "finish": "fondant",
                    "fillings": [
                        {"name": "Vanilla sponge", "color": "#f5d9a7", "height": 0.18, "cost_per_serving_usd": 0.55}
                    ]
                },
                {
                    "height": 0.5, "radius": 0.9, "color": "#f5e5d3",
                    "tilt_x": -0.12, "tilt_z": 0.08, "offset_x": -0.1, "offset_z": 0.05,
                    "finish": "drip"
                },
                {
                    "height": 0.4, "radius": 0.6, "color": "#e8c9a8",
                    "tilt_x": 0.0, "tilt_z": 0.0, "offset_x": 0.0, "offset_z": 0.0,
                    "finish": "mirror"
                }
            ],
            "toppers": [
                {"kind": "monogram", "label": "A&E", "color": "#c8a97e", "x": 0, "z": 0, "scale": 1.0},
                {"kind": "candle", "color": "#ff7e5f", "x": -0.3, "z": 0.2, "scale": 1.0}
            ],
            "intake": {
                "client_name": "TEST_Client",
                "client_email": "test@example.com",
                "event_type": "wedding",
                "guest_count": 150,
                "slice_size": "wedding",
                "beo_number": "BEO-12345",
                "delivery_required": True,
                "delivery_address": "123 Test St",
                "price_quote_usd": 1500.00
            },
            "background": "#0b1628",
            "stand_color": "#2a2115"
        }
        
        response = requests.post(f"{BASE_URL}/api/cake-viewer/sessions", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        assert "session_id" in data
        assert data["session_id"].startswith("cv-")
        
        # Store for subsequent tests
        TestCakeViewerSessionsCRUD.created_session_id = data["session_id"]
        
        # Verify session data returned
        session = data.get("session", {})
        assert session.get("title") == "TEST_iter151_full_payload"
        assert len(session.get("tiers", [])) == 3
        assert len(session.get("toppers", [])) == 2
        assert session.get("intake", {}).get("client_name") == "TEST_Client"
        
        # Verify tilt/offset/finish in tiers
        tier0 = session["tiers"][0]
        assert tier0.get("tilt_x") == 0.1
        assert tier0.get("offset_x") == 0.15
        assert tier0.get("finish") == "fondant"
        
        print(f"Created session: {data['session_id']}")
    
    def test_get_session_no_id(self):
        """GET /api/cake-viewer/sessions/{sid} - retrieves without _id"""
        sid = TestCakeViewerSessionsCRUD.created_session_id
        if not sid:
            pytest.skip("No session created in previous test")
        
        response = requests.get(f"{BASE_URL}/api/cake-viewer/sessions/{sid}")
        assert response.status_code == 200
        
        data = response.json()
        # Verify no MongoDB _id in response
        assert "_id" not in data, "Response should not contain MongoDB _id"
        assert data.get("id") == sid
        
        # Verify iter151 fields persisted
        assert len(data.get("tiers", [])) == 3
        assert data["tiers"][0].get("tilt_x") == 0.1
        assert data["tiers"][0].get("finish") == "fondant"
        assert len(data.get("toppers", [])) == 2
        assert data.get("intake", {}).get("beo_number") == "BEO-12345"
        
        print(f"Retrieved session {sid} without _id")
    
    def test_update_session_tilt_finish_intake(self):
        """PUT /api/cake-viewer/sessions/{sid} - updates tilt, finish, intake"""
        sid = TestCakeViewerSessionsCRUD.created_session_id
        if not sid:
            pytest.skip("No session created in previous test")
        
        update_payload = {
            "title": "TEST_iter151_updated",
            "tiers": [
                {
                    "height": 0.65, "radius": 1.3, "color": "#fffcf5",
                    "tilt_x": 0.2, "tilt_z": -0.1, "offset_x": 0.25, "offset_z": 0.15,
                    "finish": "mirror"
                }
            ],
            "toppers": [{"kind": "flower", "color": "#ffffff", "x": 0, "z": 0, "scale": 1.2}],
            "intake": {
                "client_name": "TEST_Updated_Client",
                "guest_count": 200,
                "beo_number": "BEO-99999"
            }
        }
        
        response = requests.put(f"{BASE_URL}/api/cake-viewer/sessions/{sid}", json=update_payload)
        assert response.status_code == 200
        assert response.json().get("ok") == True
        
        # Verify update persisted
        get_response = requests.get(f"{BASE_URL}/api/cake-viewer/sessions/{sid}")
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data.get("title") == "TEST_iter151_updated"
        assert len(data.get("tiers", [])) == 1
        assert data["tiers"][0].get("tilt_x") == 0.2
        assert data["tiers"][0].get("finish") == "mirror"
        assert data.get("intake", {}).get("client_name") == "TEST_Updated_Client"
        assert data.get("intake", {}).get("guest_count") == 200
        
        print(f"Updated session {sid} with new tilt/finish/intake")
    
    def test_list_sessions(self):
        """GET /api/cake-viewer/sessions - lists sessions"""
        response = requests.get(f"{BASE_URL}/api/cake-viewer/sessions")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert "count" in data
        assert isinstance(data["items"], list)
        
        # Should have at least our test session
        assert data["count"] >= 1
        
        # Verify no _id in any item
        for item in data["items"]:
            assert "_id" not in item
        
        print(f"Listed {data['count']} sessions")


class TestSizingCalculator:
    """Test sizing calculator for guests=50, 150, 300"""
    
    def test_sizing_50_guests_wedding(self):
        """GET /api/cake-viewer/sizing-calculator?guests=50&slice_size=wedding"""
        response = requests.get(f"{BASE_URL}/api/cake-viewer/sizing-calculator?guests=50&slice_size=wedding")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("guests") == 50
        assert data.get("slice_size") == "wedding"
        assert "recommended" in data
        assert "tiers_in" in data["recommended"]
        assert "servings" in data["recommended"]
        assert data["recommended"]["servings"] >= 50
        assert "alternatives" in data
        
        print(f"50 guests: recommended {data['recommended']['tiers_in']} = {data['recommended']['servings']} servings")
    
    def test_sizing_150_guests_wedding(self):
        """GET /api/cake-viewer/sizing-calculator?guests=150&slice_size=wedding"""
        response = requests.get(f"{BASE_URL}/api/cake-viewer/sizing-calculator?guests=150&slice_size=wedding")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("guests") == 150
        assert data["recommended"]["servings"] >= 150
        
        print(f"150 guests: recommended {data['recommended']['tiers_in']} = {data['recommended']['servings']} servings")
    
    def test_sizing_300_guests_exceeds_capacity(self):
        """GET /api/cake-viewer/sizing-calculator?guests=300 - exceeds single cake capacity, returns 400"""
        response = requests.get(f"{BASE_URL}/api/cake-viewer/sizing-calculator?guests=300&slice_size=wedding")
        # 300 guests exceeds max single-unit cake capacity (~186 servings for 4-tier)
        # API correctly returns 400 with suggestion for multiple cakes
        assert response.status_code == 400
        data = response.json()
        assert "multiple cakes" in data.get("detail", "").lower()
        print(f"300 guests: correctly returns 400 - {data.get('detail')}")
    
    def test_sizing_invalid_guests(self):
        """GET /api/cake-viewer/sizing-calculator?guests=0 - should return 400"""
        response = requests.get(f"{BASE_URL}/api/cake-viewer/sizing-calculator?guests=0&slice_size=wedding")
        assert response.status_code == 400


class TestCutGuide:
    """Test cut guide ring-cut math"""
    
    def test_cut_guide_12_inch_wedding(self):
        """GET /api/cake-viewer/cut-guide?diameter_in=12&slice_size=wedding"""
        response = requests.get(f"{BASE_URL}/api/cake-viewer/cut-guide?diameter_in=12&slice_size=wedding")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("diameter_in") == 12
        assert data.get("slice_size") == "wedding"
        assert "rings" in data
        assert "total_slices" in data
        assert "instructions" in data
        
        # Verify rings structure
        assert len(data["rings"]) > 0
        for ring in data["rings"]:
            assert "outer_r" in ring
            assert "inner_r" in ring
            assert "slices" in ring
        
        # Verify instructions
        assert len(data["instructions"]) >= 3
        
        print(f"12\" cake: {data['total_slices']} total slices, {len(data['rings'])} rings")
    
    def test_cut_guide_8_inch_party(self):
        """GET /api/cake-viewer/cut-guide?diameter_in=8&slice_size=party"""
        response = requests.get(f"{BASE_URL}/api/cake-viewer/cut-guide?diameter_in=8&slice_size=party")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("diameter_in") == 8
        assert data.get("slice_size") == "party"
        assert data["total_slices"] > 0
        
        print(f"8\" party cake: {data['total_slices']} total slices")
    
    def test_cut_guide_invalid_diameter(self):
        """GET /api/cake-viewer/cut-guide?diameter_in=2 - should return 400"""
        response = requests.get(f"{BASE_URL}/api/cake-viewer/cut-guide?diameter_in=2&slice_size=wedding")
        assert response.status_code == 400


class TestPortionEstimator:
    """Test portion estimator with cost/margin breakdown"""
    
    session_id = None
    
    def test_create_session_for_portions(self):
        """Create a session to test portion estimator"""
        payload = {
            "title": "TEST_portions_session",
            "tiers": [
                {
                    "height": 0.6, "radius": 1.2, "color": "#fff8f2",
                    "finish": "fondant",
                    "fillings": [
                        {"name": "Vanilla sponge", "color": "#f5d9a7", "height": 0.18, "cost_per_serving_usd": 0.55},
                        {"name": "Raspberry jam", "color": "#c73a5b", "height": 0.04, "cost_per_serving_usd": 0.22}
                    ]
                },
                {
                    "height": 0.5, "radius": 0.9, "color": "#f5e5d3",
                    "finish": "buttercream"
                }
            ],
            "intake": {
                "price_quote_usd": 800.00
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/cake-viewer/sessions", json=payload)
        assert response.status_code == 200
        TestPortionEstimator.session_id = response.json()["session_id"]
        print(f"Created session for portions: {TestPortionEstimator.session_id}")
    
    def test_portion_estimator_with_session(self):
        """GET /api/cake-viewer/portion-estimator?session_id=X&slice_size=wedding"""
        sid = TestPortionEstimator.session_id
        if not sid:
            pytest.skip("No session created")
        
        response = requests.get(f"{BASE_URL}/api/cake-viewer/portion-estimator?session_id={sid}&slice_size=wedding")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("session_id") == sid
        assert "tiers" in data
        assert "total_servings" in data
        assert "total_cost_usd" in data
        assert "cost_per_serving_usd" in data
        
        # Verify tiers breakdown
        assert len(data["tiers"]) == 2
        for tier in data["tiers"]:
            assert "tier" in tier
            assert "diameter_in" in tier
            assert "servings" in tier
            assert "tier_cost_usd" in tier
            assert "finish" in tier
        
        # Verify margin calculation (since we set price_quote_usd)
        assert data.get("revenue_usd") is not None
        assert data.get("margin_usd") is not None
        assert data.get("margin_pct") is not None
        
        print(f"Portions: {data['total_servings']} servings, ${data['total_cost_usd']} cost, {data.get('margin_pct')}% margin")
    
    def test_portion_estimator_invalid_session(self):
        """GET /api/cake-viewer/portion-estimator?session_id=invalid - should return 404"""
        response = requests.get(f"{BASE_URL}/api/cake-viewer/portion-estimator?session_id=invalid-session-id&slice_size=wedding")
        assert response.status_code == 404


class TestTemplates:
    """Test templates listing and retrieval"""
    
    def test_list_templates(self):
        """GET /api/cake-viewer/templates - lists 4 templates"""
        response = requests.get(f"{BASE_URL}/api/cake-viewer/templates")
        assert response.status_code == 200
        
        data = response.json()
        assert "templates" in data
        templates = data["templates"]
        
        # Should have 4 templates
        assert len(templates) == 4
        
        # Verify expected template IDs
        template_ids = [t["id"] for t in templates]
        assert "classic_wedding" in template_ids
        assert "mad_hatter" in template_ids
        assert "birthday" in template_ids
        assert "naked_rustic" in template_ids
        
        print(f"Listed {len(templates)} templates: {template_ids}")
    
    def test_get_mad_hatter_template(self):
        """GET /api/cake-viewer/templates/mad_hatter - returns 5 tiers with tilt values"""
        response = requests.get(f"{BASE_URL}/api/cake-viewer/templates/mad_hatter")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("title") == "Mad Hatter — Whimsical Tilted"
        assert "tiers" in data
        
        # Mad Hatter should have 5 tiers
        tiers = data["tiers"]
        assert len(tiers) == 5, f"Expected 5 tiers, got {len(tiers)}"
        
        # Verify tilt/offset values exist on tiers (at least some should be non-zero)
        has_tilt = False
        has_offset = False
        for tier in tiers:
            if tier.get("tilt_x", 0) != 0 or tier.get("tilt_z", 0) != 0:
                has_tilt = True
            if tier.get("offset_x", 0) != 0 or tier.get("offset_z", 0) != 0:
                has_offset = True
        
        assert has_tilt, "Mad Hatter template should have tilted tiers"
        assert has_offset, "Mad Hatter template should have offset tiers"
        
        print(f"Mad Hatter template: {len(tiers)} tiers with tilt/offset values")
    
    def test_get_classic_wedding_template(self):
        """GET /api/cake-viewer/templates/classic_wedding"""
        response = requests.get(f"{BASE_URL}/api/cake-viewer/templates/classic_wedding")
        assert response.status_code == 200
        
        data = response.json()
        assert "Classic Wedding" in data.get("title", "")
        assert len(data.get("tiers", [])) >= 3
        
        # Verify fillings in classic wedding
        tier0 = data["tiers"][0]
        assert "fillings" in tier0
        assert len(tier0["fillings"]) > 0
        
        print(f"Classic Wedding template: {len(data['tiers'])} tiers with fillings")
    
    def test_get_invalid_template(self):
        """GET /api/cake-viewer/templates/invalid - should return 404"""
        response = requests.get(f"{BASE_URL}/api/cake-viewer/templates/invalid_template")
        assert response.status_code == 404


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_sessions(self):
        """Delete TEST_ prefixed sessions"""
        # List all sessions
        response = requests.get(f"{BASE_URL}/api/cake-viewer/sessions?limit=100")
        if response.status_code != 200:
            return
        
        sessions = response.json().get("items", [])
        deleted = 0
        for session in sessions:
            title = session.get("title", "")
            if title.startswith("TEST_"):
                sid = session.get("id")
                if sid:
                    del_response = requests.delete(f"{BASE_URL}/api/cake-viewer/sessions/{sid}")
                    if del_response.status_code == 200:
                        deleted += 1
        
        print(f"Cleaned up {deleted} test sessions")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
