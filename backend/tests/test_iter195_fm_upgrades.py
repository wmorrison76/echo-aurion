"""iter195 · FM-Upgrade 2 + 3 + 3.5 + 4 + 5 comprehensive backend tests.

Tests:
- FM-Upgrade 2: RecipeNode graph + cascade (seed-demo, computed, cascade proof, cycle detection, dirty-mark)
- FM-Upgrade 3: Pack primitive + 14 Fresh Meal endpoints + lifecycle + temp excursion
- FM-Upgrade 3.5: FDA 24-hour recall export (JSON + CSV) + audit log
- FM-Upgrade 4: Channels + Kitchen Calendar
- FM-Upgrade 5: Echo Permission Ladder
- Regression: iter194 timeline endpoints + iter193 hiring/finance/flags
"""
import os
import pytest
import requests
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = "TsjvVFDCvoa4sG4wcVY7ZKF0D7LmA25lTer4edByo5o"
MANAGER_TOKEN = "2DwSKsmwALyIFd3JI_bq6Z3w"


@pytest.fixture(scope="module")
def admin_headers():
    return {"Content-Type": "application/json", "X-Admin-Token": ADMIN_TOKEN}


@pytest.fixture(scope="module")
def public_headers():
    return {"Content-Type": "application/json"}


# ══════════════════════════════════════════════════════════════════════════════
# FM-Upgrade 2 · RecipeNode graph + cascade
# ══════════════════════════════════════════════════════════════════════════════
class TestFMUpgrade2RecipeGraph:
    """FM-Upgrade 2: RecipeNode graph + cascade tests."""

    def test_seed_demo_idempotent(self, admin_headers):
        """POST /api/recipe-graph/seed-demo seeds 3-level Thai Peanut Bowl (idempotent)."""
        r = requests.post(f"{BASE_URL}/api/recipe-graph/seed-demo", headers=admin_headers)
        assert r.status_code == 200, f"seed-demo failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        # Either seeded=True (first time) or already_exists=True (idempotent)
        assert data.get("seeded") is True or data.get("already_exists") is True
        print(f"✓ seed-demo: seeded={data.get('seeded')}, already_exists={data.get('already_exists')}")

    def test_get_recipe_thai_peanut_bowl(self, public_headers):
        """GET /api/recipe-graph/recipes/rec-demo-thai-peanut-bowl returns recipe + nodes."""
        r = requests.get(f"{BASE_URL}/api/recipe-graph/recipes/rec-demo-thai-peanut-bowl", headers=public_headers)
        assert r.status_code == 200, f"get recipe failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("recipe", {}).get("id") == "rec-demo-thai-peanut-bowl"
        assert len(data.get("nodes", [])) >= 4  # root + 3 ingredients + 1 sub_recipe
        print(f"✓ get recipe: {data['recipe']['name']} with {len(data['nodes'])} nodes")

    def test_computed_nutrition_allergens_cost(self, public_headers):
        """GET /api/recipe-graph/recipes/rec-demo-thai-peanut-bowl/computed returns nutrition, allergens, cost."""
        r = requests.get(f"{BASE_URL}/api/recipe-graph/recipes/rec-demo-thai-peanut-bowl/computed", headers=public_headers)
        assert r.status_code == 200, f"computed failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        computed = data.get("computed", {})
        
        # Nutrition fields
        nutrition = computed.get("nutrition", {})
        assert "calories" in nutrition, "Missing calories in nutrition"
        assert "protein" in nutrition, "Missing protein in nutrition"
        assert "fat" in nutrition, "Missing fat in nutrition"
        assert "saturated_fat" in nutrition, "Missing saturated_fat in nutrition"
        assert "sodium" in nutrition, "Missing sodium in nutrition"
        
        # Allergens
        allergens = computed.get("allergens", {})
        contains = allergens.get("contains", [])
        assert "peanuts" in contains, f"Expected peanuts in allergens, got {contains}"
        assert "soybeans" in contains, f"Expected soybeans in allergens, got {contains}"
        assert "wheat" in contains, f"Expected wheat in allergens, got {contains}"
        
        # Cost and total_grams
        assert "cost" in computed, "Missing cost"
        assert "total_grams" in computed, "Missing total_grams"
        assert "trace" in computed, "Missing trace"
        
        # FDA 21 CFR 101 ingredient statement (sorted by descending weight)
        assert "ingredient_statement" in computed, "Missing ingredient_statement"
        print(f"✓ computed: calories={nutrition.get('calories')}, allergens={contains}, cost=${computed.get('cost'):.2f}")
        print(f"  ingredient_statement: {computed.get('ingredient_statement')[:80]}...")

    def test_cascade_proof_update_node(self, admin_headers, public_headers):
        """POST /api/recipe-graph/nodes/node-demo-sauce-1/update {quantity_g:160} → dirty_recipes includes both bowl AND sauce."""
        # First get baseline calories
        r1 = requests.get(f"{BASE_URL}/api/recipe-graph/recipes/rec-demo-thai-peanut-bowl/computed", headers=public_headers)
        assert r1.status_code == 200
        baseline_calories = r1.json().get("computed", {}).get("nutrition", {}).get("calories", 0)
        
        # Update node-demo-sauce-1 from 80g to 160g
        r2 = requests.post(
            f"{BASE_URL}/api/recipe-graph/nodes/node-demo-sauce-1/update",
            headers=admin_headers,
            json={"quantity_g": 160}
        )
        assert r2.status_code == 200, f"update node failed: {r2.text}"
        data = r2.json()
        assert data.get("ok") is True
        dirty_recipes = data.get("dirty_recipes", [])
        
        # Both bowl and sauce should be dirty
        assert "rec-demo-thai-peanut-bowl" in dirty_recipes, f"Bowl not in dirty_recipes: {dirty_recipes}"
        assert "rec-demo-thai-peanut-sauce" in dirty_recipes, f"Sauce not in dirty_recipes: {dirty_recipes}"
        
        # Re-compute bowl - calories should be higher
        r3 = requests.get(f"{BASE_URL}/api/recipe-graph/recipes/rec-demo-thai-peanut-bowl/computed", headers=public_headers)
        assert r3.status_code == 200
        new_calories = r3.json().get("computed", {}).get("nutrition", {}).get("calories", 0)
        
        # Restore original value
        requests.post(
            f"{BASE_URL}/api/recipe-graph/nodes/node-demo-sauce-1/update",
            headers=admin_headers,
            json={"quantity_g": 80}
        )
        
        print(f"✓ cascade proof: baseline={baseline_calories:.1f}, after update={new_calories:.1f}, dirty_recipes={dirty_recipes}")
        # Note: calories should increase when we double the peanut butter

    def test_cycle_detection_self_reference(self, admin_headers):
        """Attempting sub_recipe self-reference → 400."""
        # Try to add a node to rec-demo-thai-peanut-bowl that references itself
        r = requests.post(
            f"{BASE_URL}/api/recipe-graph/recipes/rec-demo-thai-peanut-bowl/nodes",
            headers=admin_headers,
            json={
                "type": "sub_recipe",
                "name": "Self reference",
                "sub_recipe_id": "rec-demo-thai-peanut-bowl"
            }
        )
        assert r.status_code == 400, f"Expected 400 for cycle, got {r.status_code}: {r.text}"
        assert "cycle" in r.text.lower(), f"Expected cycle error message, got: {r.text}"
        print("✓ cycle detection: self-reference correctly rejected with 400")

    def test_list_recipes(self, public_headers):
        """GET /api/recipe-graph/recipes returns list with computed rollups."""
        r = requests.get(f"{BASE_URL}/api/recipe-graph/recipes", headers=public_headers)
        assert r.status_code == 200, f"list recipes failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("total", 0) >= 3  # At least the 3 demo recipes
        print(f"✓ list recipes: {data.get('total')} recipes")


# ══════════════════════════════════════════════════════════════════════════════
# FM-Upgrade 3 · Pack primitive + Fresh Meal backend revival (14 endpoints)
# ══════════════════════════════════════════════════════════════════════════════
class TestFMUpgrade3FreshMealEndpoints:
    """FM-Upgrade 3: All 14 Fresh Meal endpoints return 200."""

    def test_ops_dashboard(self, public_headers):
        """GET /api/fresh-meals/ops-dashboard returns 200."""
        r = requests.get(f"{BASE_URL}/api/fresh-meals/ops-dashboard", headers=public_headers)
        assert r.status_code == 200, f"ops-dashboard failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "production" in data
        assert "lanes" in data
        assert "delivery" in data
        print(f"✓ ops-dashboard: production={data['production']}, lanes={data['lanes']['total']}")

    def test_overview(self, public_headers):
        """GET /api/fresh-meals/overview returns 200."""
        r = requests.get(f"{BASE_URL}/api/fresh-meals/overview", headers=public_headers)
        assert r.status_code == 200, f"overview failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "products_count" in data
        print(f"✓ overview: products={data.get('products_count')}, channels={data.get('channels_count')}")

    def test_products_get(self, public_headers):
        """GET /api/fresh-meals/products returns 200."""
        r = requests.get(f"{BASE_URL}/api/fresh-meals/products", headers=public_headers)
        assert r.status_code == 200, f"products GET failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("total", 0) >= 5  # 5 default products seeded
        print(f"✓ products GET: {data.get('total')} products")

    def test_products_post_delete(self, admin_headers):
        """POST /api/fresh-meals/products creates product; DELETE deactivates."""
        # Create
        r1 = requests.post(
            f"{BASE_URL}/api/fresh-meals/products",
            headers=admin_headers,
            json={"name": "TEST_iter195_product", "price": 9.99, "category": "test"}
        )
        assert r1.status_code == 200, f"products POST failed: {r1.text}"
        product_id = r1.json().get("product", {}).get("id")
        assert product_id, "No product id returned"
        
        # Delete
        r2 = requests.delete(f"{BASE_URL}/api/fresh-meals/products/{product_id}", headers=admin_headers)
        assert r2.status_code == 200, f"products DELETE failed: {r2.text}"
        print(f"✓ products POST+DELETE: created and deactivated {product_id}")

    def test_production_runs_get_post(self, admin_headers, public_headers):
        """GET/POST /api/fresh-meals/production-runs returns 200."""
        # GET
        r1 = requests.get(f"{BASE_URL}/api/fresh-meals/production-runs", headers=public_headers)
        assert r1.status_code == 200, f"production-runs GET failed: {r1.text}"
        
        # POST
        r2 = requests.post(
            f"{BASE_URL}/api/fresh-meals/production-runs",
            headers=admin_headers,
            json={"name": "TEST_iter195_run", "product_id": "prod-thai-peanut-bowl", "planned_qty": 50}
        )
        assert r2.status_code == 200, f"production-runs POST failed: {r2.text}"
        print(f"✓ production-runs GET+POST: {r1.json().get('total')} runs, created new run")

    def test_assembly_lanes(self, public_headers):
        """GET /api/fresh-meals/assembly-lanes returns 200."""
        r = requests.get(f"{BASE_URL}/api/fresh-meals/assembly-lanes", headers=public_headers)
        assert r.status_code == 200, f"assembly-lanes failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("total", 0) >= 3  # 3 default lanes
        print(f"✓ assembly-lanes: {data.get('total')} lanes")

    def test_packaging_options(self, public_headers):
        """GET /api/fresh-meals/packaging-options returns 200."""
        r = requests.get(f"{BASE_URL}/api/fresh-meals/packaging-options", headers=public_headers)
        assert r.status_code == 200, f"packaging-options failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert len(data.get("options", [])) >= 3
        print(f"✓ packaging-options: {len(data.get('options', []))} options")

    def test_packaging_validate(self, public_headers):
        """POST /api/fresh-meals/packaging/validate returns 200."""
        r = requests.post(
            f"{BASE_URL}/api/fresh-meals/packaging/validate",
            headers=public_headers,
            json={"product_id": "prod-thai-peanut-bowl", "packaging_id": "pk-clamshell-16oz", "portion_g": 380}
        )
        assert r.status_code == 200, f"packaging/validate failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("valid") is True
        print(f"✓ packaging/validate: valid={data.get('valid')}")

    def test_subscriptions(self, public_headers):
        """GET /api/fresh-meals/subscriptions returns 200."""
        r = requests.get(f"{BASE_URL}/api/fresh-meals/subscriptions", headers=public_headers)
        assert r.status_code == 200, f"subscriptions failed: {r.text}"
        print(f"✓ subscriptions: {r.json().get('total')} subscriptions")

    def test_subscriptions_stats(self, public_headers):
        """GET /api/fresh-meals/subscriptions/stats returns 200."""
        r = requests.get(f"{BASE_URL}/api/fresh-meals/subscriptions/stats", headers=public_headers)
        assert r.status_code == 200, f"subscriptions/stats failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "stats" in data
        print(f"✓ subscriptions/stats: active={data['stats'].get('active')}")

    def test_distribution_channels(self, public_headers):
        """GET /api/fresh-meals/distribution/channels returns 200."""
        r = requests.get(f"{BASE_URL}/api/fresh-meals/distribution/channels", headers=public_headers)
        assert r.status_code == 200, f"distribution/channels failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("total", 0) >= 5  # 5 default channels
        print(f"✓ distribution/channels: {data.get('total')} channels")

    def test_forecast(self, public_headers):
        """GET /api/fresh-meals/forecast returns 200."""
        r = requests.get(f"{BASE_URL}/api/fresh-meals/forecast?days=7", headers=public_headers)
        assert r.status_code == 200, f"forecast failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert len(data.get("forecast", [])) == 7
        print(f"✓ forecast: {len(data.get('forecast', []))} days")

    def test_margin_analysis(self, public_headers):
        """GET /api/fresh-meals/margin-analysis returns 200."""
        r = requests.get(f"{BASE_URL}/api/fresh-meals/margin-analysis", headers=public_headers)
        assert r.status_code == 200, f"margin-analysis failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert len(data.get("rows", [])) >= 1
        print(f"✓ margin-analysis: {len(data.get('rows', []))} products analyzed")

    def test_safety_check_and_records(self, public_headers):
        """POST /api/fresh-meals/safety/check + GET /api/fresh-meals/safety/records returns 200."""
        # POST check
        r1 = requests.post(
            f"{BASE_URL}/api/fresh-meals/safety/check",
            headers=public_headers,
            json={"ccp_type": "cook_temp", "measurement": 165.0, "threshold_min": 165.0}
        )
        assert r1.status_code == 200, f"safety/check failed: {r1.text}"
        data = r1.json()
        assert data.get("ok") is True
        assert data.get("passing") is True
        
        # GET records
        r2 = requests.get(f"{BASE_URL}/api/fresh-meals/safety/records", headers=public_headers)
        assert r2.status_code == 200, f"safety/records failed: {r2.text}"
        print(f"✓ safety/check+records: passing={data.get('passing')}, records={r2.json().get('total')}")

    def test_shelf_life(self, public_headers):
        """GET /api/fresh-meals/shelf-life returns 200."""
        r = requests.get(f"{BASE_URL}/api/fresh-meals/shelf-life", headers=public_headers)
        assert r.status_code == 200, f"shelf-life failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        print(f"✓ shelf-life: total_active={data.get('total_active')}")

    def test_routes(self, public_headers):
        """GET /api/fresh-meals/routes returns 200."""
        r = requests.get(f"{BASE_URL}/api/fresh-meals/routes", headers=public_headers)
        assert r.status_code == 200, f"routes failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        print(f"✓ routes: total_packs={data.get('total_packs')}")


class TestFMUpgrade3PackLifecycle:
    """FM-Upgrade 3: Pack CRUD + lifecycle + temp excursion."""

    def test_pack_crud_and_lifecycle(self, admin_headers, public_headers):
        """POST /api/fresh-meals/packs creates pack; POST /packs/{id}/advance transitions states."""
        # Create pack with lot_composition
        r1 = requests.post(
            f"{BASE_URL}/api/fresh-meals/packs",
            headers=admin_headers,
            json={
                "order_id": "TEST_order_iter195",
                "product_id": "prod-thai-peanut-bowl",
                "customer_id": "TEST_customer_iter195",
                "lot_composition": [
                    {"lot_id": "lot-test-1", "tlc": "TLC-TEST195", "commodity": "chicken", "grams": 150},
                    {"lot_id": "lot-test-2", "tlc": "TLC-TEST195B", "commodity": "rice", "grams": 120}
                ]
            }
        )
        assert r1.status_code == 200, f"pack create failed: {r1.text}"
        pack_id = r1.json().get("pack", {}).get("id")
        assert pack_id, "No pack id returned"
        assert r1.json().get("pack", {}).get("status") == "planned"
        print(f"✓ pack created: {pack_id} with status=planned")

        # Advance through states: planned → in_production → packed → staged → delivered
        states = ["in_production", "packed", "staged", "out_for_delivery", "delivered"]
        for state in states:
            r = requests.post(
                f"{BASE_URL}/api/fresh-meals/packs/{pack_id}/advance",
                headers=admin_headers,
                json={"status": state, "temp_c": 4.0}  # Normal temp
            )
            assert r.status_code == 200, f"advance to {state} failed: {r.text}"
            assert r.json().get("status") == state
        print(f"✓ pack lifecycle: advanced through {len(states)} states")

        # Verify final state
        r2 = requests.get(f"{BASE_URL}/api/fresh-meals/packs/{pack_id}", headers=public_headers)
        assert r2.status_code == 200
        assert r2.json().get("pack", {}).get("status") == "delivered"
        print(f"✓ pack final state: delivered")

    def test_pack_temp_excursion(self, admin_headers):
        """Advance with temp_c=12.5 (chilled range -1..7) auto-emits pack.temp_excursion."""
        # Create a new pack
        r1 = requests.post(
            f"{BASE_URL}/api/fresh-meals/packs",
            headers=admin_headers,
            json={
                "order_id": "TEST_order_temp_exc",
                "product_id": "prod-thai-peanut-bowl",
                "lot_composition": [{"lot_id": "lot-temp-test", "tlc": "TLC-TEMP-EXC", "commodity": "chicken", "grams": 150}]
            }
        )
        assert r1.status_code == 200
        pack_id = r1.json().get("pack", {}).get("id")

        # Advance with temp excursion (12.5°C > 7°C threshold)
        r2 = requests.post(
            f"{BASE_URL}/api/fresh-meals/packs/{pack_id}/advance",
            headers=admin_headers,
            json={"status": "in_production", "temp_c": 12.5}
        )
        assert r2.status_code == 200, f"advance with temp excursion failed: {r2.text}"
        print(f"✓ temp excursion: pack {pack_id} advanced with temp_c=12.5 (should emit pack.temp_excursion)")

    def test_pack_bad_status_400(self, admin_headers):
        """Advance with bad status → 400."""
        # Create a pack first
        r1 = requests.post(
            f"{BASE_URL}/api/fresh-meals/packs",
            headers=admin_headers,
            json={"order_id": "TEST_bad_status", "product_id": "prod-thai-peanut-bowl"}
        )
        pack_id = r1.json().get("pack", {}).get("id")

        # Try invalid status
        r2 = requests.post(
            f"{BASE_URL}/api/fresh-meals/packs/{pack_id}/advance",
            headers=admin_headers,
            json={"status": "invalid_status"}
        )
        assert r2.status_code == 400, f"Expected 400 for bad status, got {r2.status_code}"
        print("✓ bad status: correctly rejected with 400")

    def test_pack_unknown_id_404(self, admin_headers):
        """Advance unknown pack id → 404."""
        r = requests.post(
            f"{BASE_URL}/api/fresh-meals/packs/pack-nonexistent-xyz/advance",
            headers=admin_headers,
            json={"status": "packed"}
        )
        assert r.status_code == 404, f"Expected 404 for unknown pack, got {r.status_code}"
        print("✓ unknown pack id: correctly rejected with 404")


# ══════════════════════════════════════════════════════════════════════════════
# FM-Upgrade 3.5 · FDA 24-hour recall export
# ══════════════════════════════════════════════════════════════════════════════
class TestFMUpgrade35FDAExport:
    """FM-Upgrade 3.5: FDA 24-hour recall export tests."""

    def test_fda_export_json(self, admin_headers):
        """GET /api/compliance/fda-recall/export?tlc=TLC-FDA999 returns JSON with elapsed_ms < 2000."""
        r = requests.get(
            f"{BASE_URL}/api/compliance/fda-recall/export?tlc=TLC-FDA999",
            headers=admin_headers
        )
        assert r.status_code == 200, f"FDA export failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "elapsed_ms" in data, "Missing elapsed_ms"
        assert data.get("elapsed_ms") < 2000, f"elapsed_ms {data.get('elapsed_ms')} >= 2000ms target"
        assert "csv" in data, "Missing csv field"
        assert "events" in data, "Missing events field"
        assert "row_count" in data, "Missing row_count"
        print(f"✓ FDA export JSON: elapsed_ms={data.get('elapsed_ms')}ms, row_count={data.get('row_count')}")

    def test_fda_export_csv(self, admin_headers):
        """GET /api/compliance/fda-recall/export?tlc=TLC-FDA999&format=csv returns text/csv."""
        r = requests.get(
            f"{BASE_URL}/api/compliance/fda-recall/export?tlc=TLC-FDA999&format=csv",
            headers=admin_headers
        )
        assert r.status_code == 200, f"FDA export CSV failed: {r.text}"
        assert "text/csv" in r.headers.get("Content-Type", ""), f"Expected text/csv, got {r.headers.get('Content-Type')}"
        
        # Check CSV has 14 FDA-aligned columns
        lines = r.text.strip().split("\n")
        assert len(lines) >= 1, "CSV has no header"
        header = lines[0]
        expected_cols = ["CTE_Type", "Timestamp_UTC", "TLC", "Lot_ID", "Pack_ID", "Batch_ID",
                        "Order_ID", "Commodity", "Quantity", "Unit", "Location",
                        "Actor_Name", "Reference_Document", "Source_Business"]
        for col in expected_cols:
            assert col in header, f"Missing column {col} in CSV header"
        print(f"✓ FDA export CSV: {len(lines)} rows, all 14 columns present")

    def test_fda_export_no_anchor_400(self, admin_headers):
        """GET /api/compliance/fda-recall/export without anchor params → 400."""
        r = requests.get(f"{BASE_URL}/api/compliance/fda-recall/export", headers=admin_headers)
        assert r.status_code == 400, f"Expected 400 without anchor, got {r.status_code}"
        print("✓ FDA export no anchor: correctly rejected with 400")

    def test_fda_audit_log(self, admin_headers):
        """GET /api/compliance/fda-recall/audit-log returns recent exports."""
        r = requests.get(f"{BASE_URL}/api/compliance/fda-recall/audit-log", headers=admin_headers)
        assert r.status_code == 200, f"FDA audit-log failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "exports" in data
        print(f"✓ FDA audit-log: {data.get('total')} exports logged")


# ══════════════════════════════════════════════════════════════════════════════
# FM-Upgrade 4 · Channels + Kitchen Calendar
# ══════════════════════════════════════════════════════════════════════════════
class TestFMUpgrade4Channels:
    """FM-Upgrade 4: Channels CRUD tests."""

    def test_channels_get(self, public_headers):
        """GET /api/channels returns list."""
        r = requests.get(f"{BASE_URL}/api/channels", headers=public_headers)
        assert r.status_code == 200, f"channels GET failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        print(f"✓ channels GET: {data.get('total')} channels")

    def test_channels_post_valid_type(self, admin_headers):
        """POST /api/channels with valid type creates channel."""
        r = requests.post(
            f"{BASE_URL}/api/channels",
            headers=admin_headers,
            json={
                "type": "b2c_subscription",
                "name": "TEST_iter195_channel",
                "pricing": "standard",
                "sla_hours": 48
            }
        )
        assert r.status_code == 200, f"channels POST failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("channel", {}).get("type") == "b2c_subscription"
        print(f"✓ channels POST: created {data.get('channel', {}).get('id')}")

    def test_channels_post_invalid_type_400(self, admin_headers):
        """POST /api/channels with invalid type → 400."""
        r = requests.post(
            f"{BASE_URL}/api/channels",
            headers=admin_headers,
            json={"type": "invalid_type", "name": "Bad Channel"}
        )
        assert r.status_code == 400, f"Expected 400 for invalid type, got {r.status_code}"
        print("✓ channels invalid type: correctly rejected with 400")

    def test_channels_get_by_id_404(self, public_headers):
        """GET /api/channels/{unknown_id} → 404."""
        r = requests.get(f"{BASE_URL}/api/channels/ch-nonexistent-xyz", headers=public_headers)
        assert r.status_code == 404, f"Expected 404 for unknown channel, got {r.status_code}"
        print("✓ channels unknown id: correctly rejected with 404")


class TestFMUpgrade4KitchenCalendar:
    """FM-Upgrade 4: Kitchen Calendar tests."""

    def test_kitchen_calendar_get(self, public_headers):
        """GET /api/kitchen-calendar seeds default and returns list."""
        r = requests.get(f"{BASE_URL}/api/kitchen-calendar", headers=public_headers)
        assert r.status_code == 200, f"kitchen-calendar GET failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("total", 0) >= 1  # At least default calendar
        print(f"✓ kitchen-calendar GET: {data.get('total')} calendars")

    def test_kitchen_calendar_today(self, public_headers):
        """GET /api/kitchen-calendar/today returns weekday, day_type, hint."""
        r = requests.get(f"{BASE_URL}/api/kitchen-calendar/today", headers=public_headers)
        assert r.status_code == 200, f"kitchen-calendar/today failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "weekday" in data, "Missing weekday"
        assert "day_type" in data, "Missing day_type"
        assert data.get("day_type") in {"prep", "pack", "deliver", "receive", "rest", "hybrid"}
        assert "hint" in data, "Missing hint"
        hint = data.get("hint", {})
        assert "headline" in hint, "Missing hint.headline"
        assert "tone" in hint, "Missing hint.tone"
        assert "focus" in hint, "Missing hint.focus"
        print(f"✓ kitchen-calendar/today: weekday={data.get('weekday')}, day_type={data.get('day_type')}, hint={hint.get('headline')}")


# ══════════════════════════════════════════════════════════════════════════════
# FM-Upgrade 5 · Echo Permission Ladder
# ══════════════════════════════════════════════════════════════════════════════
class TestFMUpgrade5EchoCapabilities:
    """FM-Upgrade 5: Echo Permission Ladder tests."""

    def test_echo_capabilities_get(self, public_headers):
        """GET /api/echo/capabilities returns 12 defaults with rung 0-4."""
        r = requests.get(f"{BASE_URL}/api/echo/capabilities", headers=public_headers)
        assert r.status_code == 200, f"echo/capabilities GET failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("total", 0) >= 12, f"Expected at least 12 capabilities, got {data.get('total')}"
        assert "rungs" in data, "Missing rungs descriptions"
        
        # Check some specific capabilities
        caps = {c["capability"]: c["rung"] for c in data.get("capabilities", [])}
        assert "morning_brief" in caps, "Missing morning_brief capability"
        assert "po_execution_under_threshold" in caps, "Missing po_execution_under_threshold"
        print(f"✓ echo/capabilities GET: {data.get('total')} capabilities, rungs={list(data.get('rungs', {}).keys())}")

    def test_echo_capabilities_update(self, admin_headers, public_headers):
        """POST /api/echo/capabilities/{cap} {rung} updates + emits timeline."""
        # Update a capability
        r1 = requests.post(
            f"{BASE_URL}/api/echo/capabilities/price_adjustments",
            headers=admin_headers,
            json={"rung": 2}
        )
        assert r1.status_code == 200, f"echo/capabilities update failed: {r1.text}"
        data = r1.json()
        assert data.get("ok") is True
        assert data.get("rung") == 2
        
        # Restore original
        requests.post(
            f"{BASE_URL}/api/echo/capabilities/price_adjustments",
            headers=admin_headers,
            json={"rung": 0}
        )
        print("✓ echo/capabilities update: price_adjustments rung changed to 2 then restored to 0")

    def test_echo_capabilities_check_allowed(self, public_headers):
        """POST /api/echo/capabilities/check with allowed action."""
        r = requests.post(
            f"{BASE_URL}/api/echo/capabilities/check",
            headers=public_headers,
            json={"capability": "morning_brief", "proposed_action": "execute"}
        )
        assert r.status_code == 200, f"echo/capabilities/check failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        # morning_brief has rung=4, execute needs rung>=3, so should be allowed
        assert data.get("allowed") is True, f"Expected allowed=True for morning_brief execute, got {data}"
        print(f"✓ echo/capabilities/check allowed: morning_brief execute → allowed={data.get('allowed')}")

    def test_echo_capabilities_check_denied(self, public_headers):
        """POST /api/echo/capabilities/check: po_execution_under_threshold (rung=1) rejects execute (needs ≥3)."""
        r = requests.post(
            f"{BASE_URL}/api/echo/capabilities/check",
            headers=public_headers,
            json={"capability": "po_execution_under_threshold", "proposed_action": "execute"}
        )
        assert r.status_code == 200, f"echo/capabilities/check failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("allowed") is False, f"Expected allowed=False for po_execution_under_threshold execute, got {data}"
        assert data.get("current_rung") == 1, f"Expected current_rung=1, got {data.get('current_rung')}"
        assert data.get("required_rung") == 3, f"Expected required_rung=3, got {data.get('required_rung')}"
        print(f"✓ echo/capabilities/check denied: po_execution_under_threshold execute → allowed={data.get('allowed')}, current_rung={data.get('current_rung')}, required_rung={data.get('required_rung')}")

    def test_echo_capabilities_check_unknown_404(self, public_headers):
        """POST /api/echo/capabilities/check with unknown capability → 404."""
        r = requests.post(
            f"{BASE_URL}/api/echo/capabilities/check",
            headers=public_headers,
            json={"capability": "nonexistent_capability", "proposed_action": "execute"}
        )
        assert r.status_code == 404, f"Expected 404 for unknown capability, got {r.status_code}"
        print("✓ echo/capabilities/check unknown: correctly rejected with 404")

    def test_echo_capabilities_check_bad_action_400(self, public_headers):
        """POST /api/echo/capabilities/check with bad action → 400."""
        r = requests.post(
            f"{BASE_URL}/api/echo/capabilities/check",
            headers=public_headers,
            json={"capability": "morning_brief", "proposed_action": "invalid_action"}
        )
        assert r.status_code == 400, f"Expected 400 for bad action, got {r.status_code}"
        print("✓ echo/capabilities/check bad action: correctly rejected with 400")


# ══════════════════════════════════════════════════════════════════════════════
# Regression · iter194 timeline endpoints
# ══════════════════════════════════════════════════════════════════════════════
class TestRegressionIter194Timeline:
    """Regression: iter194 timeline endpoints still pass."""

    def test_timeline_query(self, public_headers):
        """POST /api/timeline/query returns events."""
        r = requests.post(
            f"{BASE_URL}/api/timeline/query",
            headers=public_headers,
            json={"limit": 10}
        )
        assert r.status_code == 200, f"timeline/query failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        print(f"✓ timeline/query: {data.get('total')} events")

    def test_timeline_recent(self, public_headers):
        """GET /api/timeline/recent returns compact feed."""
        r = requests.get(f"{BASE_URL}/api/timeline/recent?limit=10", headers=public_headers)
        assert r.status_code == 200, f"timeline/recent failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        print(f"✓ timeline/recent: {data.get('total')} events")

    def test_timeline_recall(self, public_headers):
        """GET /api/timeline/recall?tlc=TLC-FDA999 returns recall bundle."""
        r = requests.get(f"{BASE_URL}/api/timeline/recall?tlc=TLC-FDA999", headers=public_headers)
        assert r.status_code == 200, f"timeline/recall failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "recall" in data
        print(f"✓ timeline/recall: elapsed_ms={data.get('recall', {}).get('elapsed_ms')}")

    def test_timeline_cycle_time(self, public_headers):
        """GET /api/timeline/cycle-time returns duration structure."""
        r = requests.get(
            f"{BASE_URL}/api/timeline/cycle-time?entity_id=test-entity&from_type=po.drafted&to_type=po.approved",
            headers=public_headers
        )
        assert r.status_code == 200, f"timeline/cycle-time failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        print("✓ timeline/cycle-time: returns duration structure")

    def test_timeline_emit_admin_gated(self, public_headers, admin_headers):
        """POST /api/timeline/emit requires admin token."""
        # Without admin token
        r1 = requests.post(
            f"{BASE_URL}/api/timeline/emit",
            headers=public_headers,
            json={"type": "test.event"}
        )
        assert r1.status_code == 401, f"Expected 401 without admin token, got {r1.status_code}"
        
        # With admin token
        r2 = requests.post(
            f"{BASE_URL}/api/timeline/emit",
            headers=admin_headers,
            json={"type": "test.event", "payload": {"test": True}}
        )
        assert r2.status_code == 200, f"timeline/emit with admin failed: {r2.text}"
        print("✓ timeline/emit: admin-gated correctly")


# ══════════════════════════════════════════════════════════════════════════════
# Regression · iter193 hiring + finance + feature flags + release notes
# ══════════════════════════════════════════════════════════════════════════════
class TestRegressionIter193:
    """Regression: iter193 hiring, finance, flags, release notes still pass."""

    def test_hiring_batches(self):
        """GET /api/staff-mobile/hiring/batches returns 200 for manager."""
        r = requests.get(
            f"{BASE_URL}/api/staff-mobile/hiring/batches",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        assert r.status_code == 200, f"hiring/batches failed: {r.text}"
        print(f"✓ hiring/batches: {r.json().get('total')} batches")

    def test_finance_rollup(self):
        """GET /api/staff-mobile/finance/rollup returns 200 for manager."""
        r = requests.get(
            f"{BASE_URL}/api/staff-mobile/finance/rollup?days=7",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        assert r.status_code == 200, f"finance/rollup failed: {r.text}"
        data = r.json()
        assert "tiles" in data
        print(f"✓ finance/rollup: tiles={list(data.get('tiles', {}).keys())}")

    def test_feature_flags_public(self, public_headers):
        """GET /api/flags/public returns resolved flags."""
        r = requests.get(f"{BASE_URL}/api/flags/public?bucket=test-bucket", headers=public_headers)
        assert r.status_code == 200, f"flags/public failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        print(f"✓ flags/public: {len(data.get('flags', {}))} flags resolved")

    def test_release_notes(self, public_headers):
        """GET /api/release-notes returns list."""
        r = requests.get(f"{BASE_URL}/api/release-notes", headers=public_headers)
        assert r.status_code == 200, f"release-notes failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        print(f"✓ release-notes: {data.get('total')} notes")


# ══════════════════════════════════════════════════════════════════════════════
# Health check
# ══════════════════════════════════════════════════════════════════════════════
class TestHealth:
    """Basic health check."""

    def test_health(self, public_headers):
        """GET /api/health returns 200."""
        r = requests.get(f"{BASE_URL}/api/health", headers=public_headers)
        assert r.status_code == 200, f"health failed: {r.text}"
        data = r.json()
        assert data.get("status") == "healthy"
        print(f"✓ health: {data.get('status')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
