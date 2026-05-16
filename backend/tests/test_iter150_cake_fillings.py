"""
Iteration 150: Cake Fillings + Pastry Context Fix + Theme CSS Variables
========================================================================
Tests for:
1. NEW: POST /api/cake-viewer/sessions with fillings[] in tiers → persists fillings
2. NEW: GET /api/cake-viewer/sessions/{sid} → returns fillings intact
3. REGRESSION: Cake Viewer CRUD without fillings (backward compat)
4. REGRESSION: iter149 endpoints - /api/patterns/revenue-at-risk/trend, /snapshot
5. REGRESSION: /api/echo-concierge/liability/scan-hybrid
6. REGRESSION: /api/intelligence/aurium/gm (revenue_at_risk_usd + pattern_risk_score)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """Verify API is running"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("PASS: Health endpoint working")


class TestCakeViewerFillings:
    """
    NEW iter150: CakeFilling model added to CakeTier
    POST /api/cake-viewer/sessions with tiers[{..., fillings:[{name,color,height}...]}]
    """
    
    def test_create_session_with_fillings(self):
        """POST /api/cake-viewer/sessions accepts fillings field and persists it"""
        payload = {
            "title": "TEST_iter150_CakeWithFillings",
            "tiers": [
                {
                    "height": 0.6,
                    "radius": 1.2,
                    "color": "#fff8f2",
                    "fillings": [
                        {"name": "Sponge", "color": "#f5d9a7", "height": 0.18},
                        {"name": "Raspberry", "color": "#c73a5b", "height": 0.04},
                        {"name": "Sponge", "color": "#f5d9a7", "height": 0.18},
                    ]
                },
                {
                    "height": 0.5,
                    "radius": 0.9,
                    "color": "#f5e5d3",
                    "fillings": [
                        {"name": "Chocolate sponge", "color": "#3d2414", "height": 0.16},
                        {"name": "Ganache", "color": "#2a1408", "height": 0.06},
                    ]
                },
                {
                    "height": 0.4,
                    "radius": 0.6,
                    "color": "#e8c9a8",
                    # No fillings for this tier - should be optional
                }
            ],
            "background": "#0b1628",
            "stand_color": "#2a2115",
        }
        
        response = requests.post(
            f"{BASE_URL}/api/cake-viewer/sessions",
            json=payload,
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("ok") is True
        assert "session_id" in data
        assert data["session_id"].startswith("cv-")
        
        session = data["session"]
        assert session["title"] == "TEST_iter150_CakeWithFillings"
        assert len(session["tiers"]) == 3
        
        # Verify fillings persisted in tier 0
        tier0 = session["tiers"][0]
        assert "fillings" in tier0
        assert len(tier0["fillings"]) == 3
        assert tier0["fillings"][0]["name"] == "Sponge"
        assert tier0["fillings"][0]["color"] == "#f5d9a7"
        assert tier0["fillings"][0]["height"] == 0.18
        assert tier0["fillings"][1]["name"] == "Raspberry"
        
        # Verify fillings persisted in tier 1
        tier1 = session["tiers"][1]
        assert "fillings" in tier1
        assert len(tier1["fillings"]) == 2
        assert tier1["fillings"][0]["name"] == "Chocolate sponge"
        
        # Tier 2 should have no fillings (or null)
        tier2 = session["tiers"][2]
        assert tier2.get("fillings") is None or tier2.get("fillings") == []
        
        print(f"PASS: created cake session {data['session_id']} with fillings")
        return data["session_id"]
    
    def test_get_session_returns_fillings_intact(self):
        """GET /api/cake-viewer/sessions/{sid} returns fillings intact"""
        # First create a session with fillings
        payload = {
            "title": "TEST_iter150_GetFillings",
            "tiers": [
                {
                    "height": 0.5,
                    "radius": 1.0,
                    "color": "#ffffff",
                    "fillings": [
                        {"name": "Vanilla Bean", "color": "#fff2d8", "height": 0.12},
                        {"name": "Strawberry Jam", "color": "#e63946", "height": 0.05},
                        {"name": "Vanilla Bean", "color": "#fff2d8", "height": 0.12},
                    ]
                }
            ],
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/cake-viewer/sessions",
            json=payload,
            timeout=15
        )
        assert create_resp.status_code == 200
        sid = create_resp.json()["session_id"]
        
        # Get the session
        get_resp = requests.get(f"{BASE_URL}/api/cake-viewer/sessions/{sid}", timeout=15)
        assert get_resp.status_code == 200
        data = get_resp.json()
        
        assert data["id"] == sid
        assert data["title"] == "TEST_iter150_GetFillings"
        
        # Verify fillings returned intact
        tier0 = data["tiers"][0]
        assert "fillings" in tier0
        assert len(tier0["fillings"]) == 3
        assert tier0["fillings"][0]["name"] == "Vanilla Bean"
        assert tier0["fillings"][0]["color"] == "#fff2d8"
        assert tier0["fillings"][0]["height"] == 0.12
        assert tier0["fillings"][1]["name"] == "Strawberry Jam"
        assert tier0["fillings"][1]["color"] == "#e63946"
        
        print(f"PASS: GET session {sid} returns fillings intact")
    
    def test_fillings_field_validation(self):
        """Fillings should validate name, color, height fields"""
        payload = {
            "title": "TEST_iter150_FillingsValidation",
            "tiers": [
                {
                    "height": 0.5,
                    "radius": 1.0,
                    "color": "#ffffff",
                    "fillings": [
                        {"name": "Test Layer", "color": "#abcdef", "height": 0.1}
                    ]
                }
            ],
        }
        
        response = requests.post(
            f"{BASE_URL}/api/cake-viewer/sessions",
            json=payload,
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        
        tier = data["session"]["tiers"][0]
        filling = tier["fillings"][0]
        
        # Verify all fields present
        assert "name" in filling
        assert "color" in filling
        assert "height" in filling
        assert isinstance(filling["name"], str)
        assert isinstance(filling["color"], str)
        assert isinstance(filling["height"], (int, float))
        
        print("PASS: fillings field validation working")


class TestCakeViewerBackwardCompat:
    """
    REGRESSION: Cake Viewer CRUD still works without fillings (backward compat)
    """
    
    def test_create_session_without_fillings(self):
        """POST /api/cake-viewer/sessions works without fillings field"""
        payload = {
            "title": "TEST_iter150_NoFillings",
            "tiers": [
                {"height": 0.6, "radius": 1.2, "color": "#fff8f2"},
                {"height": 0.5, "radius": 0.9, "color": "#f5e5d3"},
            ],
            "background": "#0b1628",
            "stand_color": "#2a2115",
        }
        
        response = requests.post(
            f"{BASE_URL}/api/cake-viewer/sessions",
            json=payload,
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("ok") is True
        assert "session_id" in data
        
        session = data["session"]
        assert len(session["tiers"]) == 2
        
        # Fillings should be null or empty (not required)
        for tier in session["tiers"]:
            fillings = tier.get("fillings")
            assert fillings is None or fillings == [], f"Expected null/empty fillings, got {fillings}"
        
        print(f"PASS: created session {data['session_id']} without fillings (backward compat)")
    
    def test_list_sessions_still_works(self):
        """GET /api/cake-viewer/sessions lists sessions"""
        response = requests.get(f"{BASE_URL}/api/cake-viewer/sessions?limit=10", timeout=15)
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "count" in data
        assert isinstance(data["items"], list)
        
        print(f"PASS: listed {data['count']} cake sessions")
    
    def test_delete_session_still_works(self):
        """DELETE /api/cake-viewer/sessions/{sid} still works"""
        # Create a session
        create_resp = requests.post(
            f"{BASE_URL}/api/cake-viewer/sessions",
            json={
                "title": "TEST_iter150_DeleteTest",
                "tiers": [{"height": 0.5, "radius": 1.0, "color": "#ffffff"}],
            },
            timeout=15
        )
        assert create_resp.status_code == 200
        sid = create_resp.json()["session_id"]
        
        # Delete it
        del_resp = requests.delete(f"{BASE_URL}/api/cake-viewer/sessions/{sid}", timeout=15)
        assert del_resp.status_code == 200
        assert del_resp.json().get("ok") is True
        
        # Verify gone
        get_resp = requests.get(f"{BASE_URL}/api/cake-viewer/sessions/{sid}", timeout=15)
        assert get_resp.status_code == 404
        
        print(f"PASS: deleted session {sid}")


class TestRegressionIter149Endpoints:
    """
    REGRESSION: iter149 endpoints still work
    """
    
    def test_revenue_at_risk_trend(self):
        """GET /api/patterns/revenue-at-risk/trend still works"""
        response = requests.get(
            f"{BASE_URL}/api/patterns/revenue-at-risk/trend?hours=168",
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "points" in data
        assert "count" in data
        assert "delta_24h_usd" in data
        
        print(f"PASS: REGRESSION - revenue-at-risk/trend returns {data['count']} points")
    
    def test_revenue_at_risk_snapshot(self):
        """POST /api/patterns/revenue-at-risk/snapshot still works"""
        response = requests.post(
            f"{BASE_URL}/api/patterns/revenue-at-risk/snapshot",
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("ok") is True
        assert "snapshot" in data
        assert "total_at_risk_usd" in data["snapshot"]
        
        print(f"PASS: REGRESSION - snapshot created with ${data['snapshot']['total_at_risk_usd']}")
    
    def test_liability_scan_hybrid(self):
        """POST /api/echo-concierge/liability/scan-hybrid still works"""
        response = requests.post(
            f"{BASE_URL}/api/echo-concierge/liability/scan-hybrid",
            json={"text": "Guest complained about noise.", "use_llm": False},
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "severity" in data
        assert "ok_to_save" in data
        
        print(f"PASS: REGRESSION - scan-hybrid works, severity={data['severity']}")
    
    def test_aurium_gm_fields(self):
        """GET /api/intelligence/aurium/gm returns revenue_at_risk_usd + pattern_risk_score"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/aurium/gm?use_llm=false",
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        # Required fields from iter148/149
        assert "revenue_at_risk_usd" in data, "Missing revenue_at_risk_usd field"
        assert "pattern_risk_score" in data, "Missing pattern_risk_score field"
        
        # Type checks
        assert isinstance(data["revenue_at_risk_usd"], (int, float))
        assert isinstance(data["pattern_risk_score"], (int, float))
        
        print(f"PASS: REGRESSION - aurium/gm has revenue_at_risk_usd=${data['revenue_at_risk_usd']:.2f}, pattern_risk_score={data['pattern_risk_score']}")
    
    def test_revenue_at_risk_base(self):
        """GET /api/patterns/revenue-at-risk still works"""
        response = requests.get(
            f"{BASE_URL}/api/patterns/revenue-at-risk?days=30&horizon_days=14",
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "total_at_risk_usd" in data
        assert "by_kind" in data
        assert "rows" in data
        
        print(f"PASS: REGRESSION - revenue-at-risk returns ${data['total_at_risk_usd']:.2f}")


class TestCakeViewerDefaultFillings:
    """Test that default fillings work correctly"""
    
    def test_default_fillings_structure(self):
        """Verify CakeFilling model defaults work"""
        # Create session with minimal filling data (rely on defaults)
        payload = {
            "title": "TEST_iter150_DefaultFillings",
            "tiers": [
                {
                    "height": 0.5,
                    "radius": 1.0,
                    "color": "#ffffff",
                    "fillings": [
                        {}  # Empty object - should use defaults
                    ]
                }
            ],
        }
        
        response = requests.post(
            f"{BASE_URL}/api/cake-viewer/sessions",
            json=payload,
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        
        tier = data["session"]["tiers"][0]
        filling = tier["fillings"][0]
        
        # Should have default values
        assert filling.get("name") == "Sponge", f"Expected default name 'Sponge', got {filling.get('name')}"
        assert filling.get("color") == "#f5d9a7", f"Expected default color '#f5d9a7', got {filling.get('color')}"
        assert filling.get("height") == 0.15, f"Expected default height 0.15, got {filling.get('height')}"
        
        print("PASS: CakeFilling defaults work correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
