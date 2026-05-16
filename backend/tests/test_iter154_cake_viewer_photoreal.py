"""
Test iter154 A+/A++ — Photorealistic rendering upgrade + Entremet Internal Layer Studio
======================================================================================
Tests:
1. POST /api/cake-viewer/sessions accepts tiers with fillings having new fields:
   kind (15 element types), flavor, aeration, inclusions[]
2. GET /api/cake-viewer/sessions/{id} returns all new filling fields intact (no _id leak)
3. Regression: sizing, cut-guide, portion-estimator, templates all still work
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# 15 entremet element kinds
ENTREMET_KINDS = [
    "sponge", "genoise", "joconde", "dacquoise",
    "streusel", "feuilletine", "praline", "financier",
    "cremeux", "curd", "gelee", "compote",
    "mousse", "ganache", "glaze"
]


class TestIter154FillingKinds:
    """Test new filling fields: kind, flavor, aeration, inclusions"""
    
    def test_create_session_with_all_15_filling_kinds(self):
        """POST /api/cake-viewer/sessions accepts all 15 entremet element kinds"""
        # Create a tier with multiple fillings using different kinds
        fillings = [
            {"name": f"TEST_{kind}", "color": "#f5d9a7", "height": 0.05, 
             "kind": kind, "flavor": f"{kind} flavor", "cost_per_serving_usd": 0.5}
            for kind in ENTREMET_KINDS[:6]  # First 6 kinds
        ]
        
        payload = {
            "title": "TEST_iter154_all_kinds",
            "tiers": [{
                "height": 0.6,
                "radius": 1.0,
                "color": "#fff8f2",
                "roughness": 0.7,
                "metalness": 0,
                "texture_repeat_x": 1,
                "texture_repeat_y": 1,
                "wrap_style": "cylinder",
                "fillings": fillings,
                "tilt_x": 0,
                "tilt_z": 0,
                "offset_x": 0,
                "offset_z": 0,
                "finish": "buttercream",
                "shape": "round"
            }]
        }
        
        response = requests.post(f"{BASE_URL}/api/cake-viewer/sessions", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True
        assert "session_id" in data
        
        # Cleanup
        session_id = data["session_id"]
        requests.delete(f"{BASE_URL}/api/cake-viewer/sessions/{session_id}")
        print(f"PASS: Created session with 6 filling kinds")
    
    def test_create_session_with_mousse_aeration(self):
        """POST accepts mousse/ganache with aeration field"""
        payload = {
            "title": "TEST_iter154_aeration",
            "tiers": [{
                "height": 0.5,
                "radius": 0.9,
                "color": "#f5e5d3",
                "roughness": 0.7,
                "metalness": 0,
                "texture_repeat_x": 1,
                "texture_repeat_y": 1,
                "wrap_style": "cylinder",
                "fillings": [
                    {"name": "Chocolate Mousse", "color": "#5a3420", "height": 0.12, 
                     "kind": "mousse", "aeration": 0.6, "flavor": "Valrhona 70%", "cost_per_serving_usd": 0.75},
                    {"name": "Dark Ganache", "color": "#2a1408", "height": 0.06, 
                     "kind": "ganache", "aeration": 0.3, "cost_per_serving_usd": 0.72}
                ],
                "tilt_x": 0,
                "tilt_z": 0,
                "offset_x": 0,
                "offset_z": 0,
                "finish": "buttercream",
                "shape": "round"
            }]
        }
        
        response = requests.post(f"{BASE_URL}/api/cake-viewer/sessions", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        session_id = data["session_id"]
        
        # Verify GET returns aeration
        get_response = requests.get(f"{BASE_URL}/api/cake-viewer/sessions/{session_id}")
        assert get_response.status_code == 200
        session = get_response.json()
        
        fillings = session["tiers"][0]["fillings"]
        assert fillings[0]["aeration"] == 0.6, "Mousse aeration not preserved"
        assert fillings[1]["aeration"] == 0.3, "Ganache aeration not preserved"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/cake-viewer/sessions/{session_id}")
        print(f"PASS: Aeration field preserved for mousse/ganache")
    
    def test_create_session_with_inclusions(self):
        """POST accepts fillings with inclusions array"""
        payload = {
            "title": "TEST_iter154_inclusions",
            "tiers": [{
                "height": 0.5,
                "radius": 0.9,
                "color": "#f5e5d3",
                "roughness": 0.7,
                "metalness": 0,
                "texture_repeat_x": 1,
                "texture_repeat_y": 1,
                "wrap_style": "cylinder",
                "fillings": [
                    {"name": "Praline Feuilletine", "color": "#a0622a", "height": 0.04, 
                     "kind": "feuilletine", "flavor": "Piedmont hazelnut",
                     "inclusions": ["praline crumbs", "feuilletine flakes"], "cost_per_serving_usd": 0.95}
                ],
                "tilt_x": 0,
                "tilt_z": 0,
                "offset_x": 0,
                "offset_z": 0,
                "finish": "buttercream",
                "shape": "round"
            }]
        }
        
        response = requests.post(f"{BASE_URL}/api/cake-viewer/sessions", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        session_id = data["session_id"]
        
        # Verify GET returns inclusions
        get_response = requests.get(f"{BASE_URL}/api/cake-viewer/sessions/{session_id}")
        assert get_response.status_code == 200
        session = get_response.json()
        
        fillings = session["tiers"][0]["fillings"]
        assert fillings[0]["inclusions"] == ["praline crumbs", "feuilletine flakes"], "Inclusions not preserved"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/cake-viewer/sessions/{session_id}")
        print(f"PASS: Inclusions array preserved")
    
    def test_get_session_no_id_leak(self):
        """GET /api/cake-viewer/sessions/{id} returns no _id field"""
        # Create a session first
        payload = {
            "title": "TEST_iter154_no_id_leak",
            "tiers": [{
                "height": 0.5,
                "radius": 0.9,
                "color": "#f5e5d3",
                "roughness": 0.7,
                "metalness": 0,
                "texture_repeat_x": 1,
                "texture_repeat_y": 1,
                "wrap_style": "cylinder",
                "fillings": [
                    {"name": "Genoise", "color": "#f5d9a7", "height": 0.14, 
                     "kind": "genoise", "flavor": "Madagascar vanilla", "cost_per_serving_usd": 0.55}
                ],
                "tilt_x": 0,
                "tilt_z": 0,
                "offset_x": 0,
                "offset_z": 0,
                "finish": "buttercream",
                "shape": "round"
            }]
        }
        
        create_response = requests.post(f"{BASE_URL}/api/cake-viewer/sessions", json=payload)
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]
        
        # GET and check for _id leak
        get_response = requests.get(f"{BASE_URL}/api/cake-viewer/sessions/{session_id}")
        assert get_response.status_code == 200
        session = get_response.json()
        
        assert "_id" not in session, "MongoDB _id leaked in response"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/cake-viewer/sessions/{session_id}")
        print(f"PASS: No _id leak in GET response")
    
    def test_all_15_kinds_accepted_no_422(self):
        """Verify all 15 entremet kinds are accepted without 422 validation error"""
        for kind in ENTREMET_KINDS:
            payload = {
                "title": f"TEST_iter154_kind_{kind}",
                "tiers": [{
                    "height": 0.5,
                    "radius": 0.9,
                    "color": "#f5e5d3",
                    "roughness": 0.7,
                    "metalness": 0,
                    "texture_repeat_x": 1,
                    "texture_repeat_y": 1,
                    "wrap_style": "cylinder",
                    "fillings": [
                        {"name": f"Test {kind}", "color": "#f5d9a7", "height": 0.1, 
                         "kind": kind, "cost_per_serving_usd": 0.5}
                    ],
                    "tilt_x": 0,
                    "tilt_z": 0,
                    "offset_x": 0,
                    "offset_z": 0,
                    "finish": "buttercream",
                    "shape": "round"
                }]
            }
            
            response = requests.post(f"{BASE_URL}/api/cake-viewer/sessions", json=payload)
            assert response.status_code == 200, f"Kind '{kind}' rejected with {response.status_code}: {response.text}"
            
            # Cleanup
            session_id = response.json()["session_id"]
            requests.delete(f"{BASE_URL}/api/cake-viewer/sessions/{session_id}")
        
        print(f"PASS: All 15 entremet kinds accepted without 422")


class TestIter151Iter153Regression:
    """Regression tests for iter151/iter153 features"""
    
    def test_sizing_calculator_still_works(self):
        """GET /api/cake-viewer/sizing-calculator returns valid response"""
        response = requests.get(f"{BASE_URL}/api/cake-viewer/sizing-calculator?guests=100&slice_size=wedding")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "recommended" in data
        assert "guests" in data
        assert data["guests"] == 100
        print(f"PASS: Sizing calculator works - recommended {data['recommended']}")
    
    def test_cut_guide_still_works(self):
        """GET /api/cake-viewer/cut-guide returns valid response"""
        response = requests.get(f"{BASE_URL}/api/cake-viewer/cut-guide?diameter_in=10&slice_size=wedding")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "rings" in data
        assert "total_slices" in data
        assert "instructions" in data
        print(f"PASS: Cut guide works - {data['total_slices']} slices")
    
    def test_portion_estimator_still_works(self):
        """GET /api/cake-viewer/portion-estimator returns valid response"""
        # First create a session
        payload = {
            "title": "TEST_iter154_portion_test",
            "tiers": [
                {"height": 0.6, "radius": 1.2, "color": "#fff8f2", "roughness": 0.7, "metalness": 0,
                 "texture_repeat_x": 1, "texture_repeat_y": 1, "wrap_style": "cylinder",
                 "fillings": [{"name": "Sponge", "color": "#f5d9a7", "height": 0.18, "cost_per_serving_usd": 0.55}],
                 "tilt_x": 0, "tilt_z": 0, "offset_x": 0, "offset_z": 0, "finish": "buttercream", "shape": "round"}
            ]
        }
        create_response = requests.post(f"{BASE_URL}/api/cake-viewer/sessions", json=payload)
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]
        
        # Test portion estimator
        response = requests.get(f"{BASE_URL}/api/cake-viewer/portion-estimator?session_id={session_id}&slice_size=wedding")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_servings" in data
        assert "total_cost_usd" in data
        assert "tiers" in data
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/cake-viewer/sessions/{session_id}")
        print(f"PASS: Portion estimator works - {data['total_servings']} servings")
    
    def test_templates_list_still_works(self):
        """GET /api/cake-viewer/templates returns all templates"""
        response = requests.get(f"{BASE_URL}/api/cake-viewer/templates")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "templates" in data
        assert len(data["templates"]) >= 9, f"Expected at least 9 templates, got {len(data['templates'])}"
        print(f"PASS: Templates list works - {len(data['templates'])} templates")
    
    def test_template_detail_still_works(self):
        """GET /api/cake-viewer/templates/{id} returns template details"""
        response = requests.get(f"{BASE_URL}/api/cake-viewer/templates/classic_wedding")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "title" in data
        assert "tiers" in data
        assert len(data["tiers"]) >= 1
        print(f"PASS: Template detail works - {data['title']}")
    
    def test_session_crud_with_iter153_fields(self):
        """Session CRUD preserves iter153 fields (shape, taper, wave, piping)"""
        payload = {
            "title": "TEST_iter154_iter153_regression",
            "tiers": [{
                "height": 0.55,
                "radius": 1.0,
                "color": "#fff8f2",
                "roughness": 0.7,
                "metalness": 0,
                "texture_repeat_x": 1,
                "texture_repeat_y": 1,
                "wrap_style": "cylinder",
                "fillings": [
                    {"name": "Genoise", "color": "#f5d9a7", "height": 0.14, 
                     "kind": "genoise", "flavor": "vanilla", "cost_per_serving_usd": 0.55}
                ],
                "tilt_x": 0.1,
                "tilt_z": 0.05,
                "offset_x": 0.1,
                "offset_z": 0,
                "finish": "fondant",
                "shape": "mad_hatter",
                "taper": 0.3,
                "piping": [
                    {"kind": "bead", "band": "bottom", "color": "#c8a97e", "scale": 1.0}
                ]
            }],
            "flowers": [
                {"arrangement_id": "romantic_cascade", "placement": "top", "scale": 1.0}
            ],
            "stand_kind": "gold_ornate"
        }
        
        # Create
        create_response = requests.post(f"{BASE_URL}/api/cake-viewer/sessions", json=payload)
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]
        
        # Read and verify
        get_response = requests.get(f"{BASE_URL}/api/cake-viewer/sessions/{session_id}")
        assert get_response.status_code == 200
        session = get_response.json()
        
        tier = session["tiers"][0]
        assert tier["shape"] == "mad_hatter", "Shape not preserved"
        assert tier["taper"] == 0.3, "Taper not preserved"
        assert len(tier.get("piping", [])) == 1, "Piping not preserved"
        assert len(session.get("flowers", [])) == 1, "Flowers not preserved"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/cake-viewer/sessions/{session_id}")
        print(f"PASS: iter153 fields preserved in CRUD")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
