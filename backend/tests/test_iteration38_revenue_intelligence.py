"""
Iteration 38 - Revenue Intelligence Module Tests
Tests for Cross-Module Analytics Dashboard and Dynamic Yield Variance Benchmarking

Features tested:
1. Cross-Module Dashboard - GET /api/analytics/cross-module
   - Unified summary across Fix My Menu, Micro-Market, Mobile Order, Cafeteria
   - Channel mix with 4 channels
   - Recovery opportunities with strategies
   
2. Yield Variance Benchmarking - GET /api/analytics/yield-variance
   - Actual vs projected yields
   - Worst/best performers
   - Category aggregation
   - Industry benchmarks
   
3. Yield Variance Snapshots - POST/GET /api/analytics/yield-variance/snapshot|history
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCrossModuleDashboard:
    """Cross-Module Analytics Dashboard tests"""
    
    def test_cross_module_endpoint_returns_200(self):
        """GET /api/analytics/cross-module returns 200"""
        response = requests.get(f"{BASE_URL}/api/analytics/cross-module?days=30")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Cross-module endpoint returns 200")
    
    def test_cross_module_summary_fix_menu_fields(self):
        """Summary contains Fix My Menu fields: total_menu_items, flagged_margin_items, revenue_at_risk, total_ai_fixes"""
        response = requests.get(f"{BASE_URL}/api/analytics/cross-module?days=30")
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data, "Missing 'summary' in response"
        summary = data["summary"]
        
        # Fix My Menu fields
        assert "total_menu_items" in summary, "Missing total_menu_items"
        assert "flagged_margin_items" in summary, "Missing flagged_margin_items"
        assert "revenue_at_risk" in summary, "Missing revenue_at_risk"
        assert "total_ai_fixes" in summary, "Missing total_ai_fixes"
        
        # Validate values are reasonable
        assert summary["total_menu_items"] >= 0, "total_menu_items should be >= 0"
        assert summary["flagged_margin_items"] >= 0, "flagged_margin_items should be >= 0"
        assert isinstance(summary["revenue_at_risk"], (int, float)), "revenue_at_risk should be numeric"
        
        print(f"PASS: Fix My Menu fields present - {summary['total_menu_items']} items, {summary['flagged_margin_items']} flagged, ${summary['revenue_at_risk']} at risk")
    
    def test_cross_module_summary_micro_market_fields(self):
        """Summary contains Micro-Market fields: mm_kiosks, mm_revenue, mm_sales, mm_low_stock"""
        response = requests.get(f"{BASE_URL}/api/analytics/cross-module?days=30")
        assert response.status_code == 200
        data = response.json()
        summary = data["summary"]
        
        # Micro-Market fields
        assert "mm_kiosks" in summary, "Missing mm_kiosks"
        assert "mm_revenue" in summary, "Missing mm_revenue"
        assert "mm_sales" in summary, "Missing mm_sales"
        assert "mm_low_stock" in summary, "Missing mm_low_stock"
        
        assert summary["mm_kiosks"] >= 0, "mm_kiosks should be >= 0"
        assert isinstance(summary["mm_revenue"], (int, float)), "mm_revenue should be numeric"
        
        print(f"PASS: Micro-Market fields present - {summary['mm_kiosks']} kiosks, ${summary['mm_revenue']} revenue, {summary['mm_sales']} sales")
    
    def test_cross_module_summary_mobile_order_fields(self):
        """Summary contains Mobile Order fields: mo_lockers, mo_today_orders, mo_today_revenue, mo_pickup_rate"""
        response = requests.get(f"{BASE_URL}/api/analytics/cross-module?days=30")
        assert response.status_code == 200
        data = response.json()
        summary = data["summary"]
        
        # Mobile Order fields
        assert "mo_lockers" in summary, "Missing mo_lockers"
        assert "mo_today_orders" in summary, "Missing mo_today_orders"
        assert "mo_today_revenue" in summary, "Missing mo_today_revenue"
        assert "mo_pickup_rate" in summary, "Missing mo_pickup_rate"
        
        assert summary["mo_lockers"] >= 0, "mo_lockers should be >= 0"
        assert 0 <= summary["mo_pickup_rate"] <= 1, "mo_pickup_rate should be between 0 and 1"
        
        print(f"PASS: Mobile Order fields present - {summary['mo_lockers']} lockers, {summary['mo_today_orders']} orders, ${summary['mo_today_revenue']} revenue")
    
    def test_cross_module_summary_cafeteria_fields(self):
        """Summary contains Cafeteria fields: caf_today_revenue, caf_today_transactions, caf_waste_lbs"""
        response = requests.get(f"{BASE_URL}/api/analytics/cross-module?days=30")
        assert response.status_code == 200
        data = response.json()
        summary = data["summary"]
        
        # Cafeteria fields
        assert "caf_today_revenue" in summary, "Missing caf_today_revenue"
        assert "caf_today_transactions" in summary, "Missing caf_today_transactions"
        assert "caf_waste_lbs" in summary, "Missing caf_waste_lbs"
        
        assert isinstance(summary["caf_today_revenue"], (int, float)), "caf_today_revenue should be numeric"
        
        print(f"PASS: Cafeteria fields present - ${summary['caf_today_revenue']} revenue, {summary['caf_today_transactions']} transactions, {summary['caf_waste_lbs']} lbs waste")
    
    def test_cross_module_channel_mix_has_4_channels(self):
        """channel_mix returns 4 channels with revenue and pct"""
        response = requests.get(f"{BASE_URL}/api/analytics/cross-module?days=30")
        assert response.status_code == 200
        data = response.json()
        
        assert "channel_mix" in data, "Missing channel_mix"
        channels = data["channel_mix"]
        
        assert len(channels) == 4, f"Expected 4 channels, got {len(channels)}"
        
        expected_sources = {"fix-menu", "micro-market", "mobile-order", "cafeteria"}
        actual_sources = {c["source"] for c in channels}
        assert expected_sources == actual_sources, f"Expected sources {expected_sources}, got {actual_sources}"
        
        for ch in channels:
            assert "channel" in ch, "Missing channel name"
            assert "revenue" in ch, "Missing revenue"
            assert "pct" in ch, "Missing pct"
            assert isinstance(ch["revenue"], (int, float)), "revenue should be numeric"
            assert 0 <= ch["pct"] <= 1, f"pct should be between 0 and 1, got {ch['pct']}"
        
        print(f"PASS: 4 channels present with revenue and pct - {[c['channel'] for c in channels]}")
    
    def test_cross_module_recovery_opportunities_with_strategies(self):
        """recovery_opportunities returns flagged items with 3 strategies each"""
        response = requests.get(f"{BASE_URL}/api/analytics/cross-module?days=30")
        assert response.status_code == 200
        data = response.json()
        
        assert "recovery_opportunities" in data, "Missing recovery_opportunities"
        opps = data["recovery_opportunities"]
        
        # Should have some opportunities if there are flagged items
        if len(opps) > 0:
            opp = opps[0]
            assert "item_name" in opp, "Missing item_name"
            assert "category" in opp, "Missing category"
            assert "current_food_cost_pct" in opp, "Missing current_food_cost_pct"
            assert "strategies" in opp, "Missing strategies"
            
            strategies = opp["strategies"]
            assert len(strategies) == 3, f"Expected 3 strategies, got {len(strategies)}"
            
            strategy_types = {s["strategy"] for s in strategies}
            expected_types = {"price_optimize", "micro_market_bundle", "portion_resize"}
            assert strategy_types == expected_types, f"Expected strategies {expected_types}, got {strategy_types}"
            
            for st in strategies:
                assert "label" in st, "Missing strategy label"
                assert "monthly_impact" in st, "Missing monthly_impact"
            
            print(f"PASS: {len(opps)} recovery opportunities with 3 strategies each")
        else:
            print("PASS: No recovery opportunities (all items within target)")
    
    def test_cross_module_total_channel_revenue(self):
        """total_channel_revenue is sum of all channel revenues"""
        response = requests.get(f"{BASE_URL}/api/analytics/cross-module?days=30")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_channel_revenue" in data, "Missing total_channel_revenue"
        assert "channel_mix" in data, "Missing channel_mix"
        
        calculated_total = sum(c["revenue"] for c in data["channel_mix"])
        assert abs(data["total_channel_revenue"] - calculated_total) < 0.01, \
            f"total_channel_revenue mismatch: {data['total_channel_revenue']} vs calculated {calculated_total}"
        
        print(f"PASS: total_channel_revenue ${data['total_channel_revenue']} matches sum of channels")


class TestYieldVariance:
    """Dynamic Yield Variance Benchmarking tests"""
    
    def test_yield_variance_endpoint_returns_200(self):
        """GET /api/analytics/yield-variance returns 200"""
        response = requests.get(f"{BASE_URL}/api/analytics/yield-variance")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Yield variance endpoint returns 200")
    
    def test_yield_variance_totals_present(self):
        """Response contains total_projected_yield, total_actual_yield, total_variance, total_variance_pct"""
        response = requests.get(f"{BASE_URL}/api/analytics/yield-variance")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_projected_yield" in data, "Missing total_projected_yield"
        assert "total_actual_yield" in data, "Missing total_actual_yield"
        assert "total_variance" in data, "Missing total_variance"
        assert "total_variance_pct" in data, "Missing total_variance_pct"
        
        # Validate variance calculation
        calculated_variance = data["total_actual_yield"] - data["total_projected_yield"]
        assert abs(data["total_variance"] - calculated_variance) < 0.01, \
            f"Variance mismatch: {data['total_variance']} vs calculated {calculated_variance}"
        
        print(f"PASS: Yield totals - Projected: ${data['total_projected_yield']}, Actual: ${data['total_actual_yield']}, Variance: ${data['total_variance']} ({data['total_variance_pct']*100:.1f}%)")
    
    def test_yield_variance_worst_performers_sorted(self):
        """worst_performers sorted by variance (most negative first)"""
        response = requests.get(f"{BASE_URL}/api/analytics/yield-variance")
        assert response.status_code == 200
        data = response.json()
        
        assert "worst_performers" in data, "Missing worst_performers"
        worst = data["worst_performers"]
        
        if len(worst) > 1:
            # Check sorted by variance ascending (most negative first)
            for i in range(len(worst) - 1):
                assert worst[i]["variance"] <= worst[i+1]["variance"], \
                    f"worst_performers not sorted: {worst[i]['variance']} > {worst[i+1]['variance']}"
        
        # All worst performers should have negative variance
        for item in worst:
            assert item["variance"] < 0, f"worst_performer {item['item_name']} has positive variance {item['variance']}"
            assert "item_name" in item
            assert "category" in item
            assert "projected_yield" in item
            assert "actual_yield" in item
            assert "industry_target_fc" in item
        
        print(f"PASS: {len(worst)} worst performers sorted correctly")
    
    def test_yield_variance_best_performers_sorted(self):
        """best_performers sorted by variance (most positive first)"""
        response = requests.get(f"{BASE_URL}/api/analytics/yield-variance")
        assert response.status_code == 200
        data = response.json()
        
        assert "best_performers" in data, "Missing best_performers"
        best = data["best_performers"]
        
        if len(best) > 1:
            # Check sorted by variance descending (most positive first)
            for i in range(len(best) - 1):
                assert best[i]["variance"] >= best[i+1]["variance"], \
                    f"best_performers not sorted: {best[i]['variance']} < {best[i+1]['variance']}"
        
        # All best performers should have non-negative variance
        for item in best:
            assert item["variance"] >= 0, f"best_performer {item['item_name']} has negative variance {item['variance']}"
        
        print(f"PASS: {len(best)} best performers sorted correctly")
    
    def test_yield_variance_by_category_aggregation(self):
        """by_category aggregation with items, projected, actual, variance, flagged"""
        response = requests.get(f"{BASE_URL}/api/analytics/yield-variance")
        assert response.status_code == 200
        data = response.json()
        
        assert "by_category" in data, "Missing by_category"
        categories = data["by_category"]
        
        assert len(categories) > 0, "by_category should have at least one category"
        
        for cat in categories:
            assert "category" in cat, "Missing category name"
            assert "items" in cat, "Missing items count"
            assert "projected" in cat, "Missing projected"
            assert "actual" in cat, "Missing actual"
            assert "variance" in cat, "Missing variance"
            assert "flagged" in cat, "Missing flagged count"
            
            # Validate variance calculation
            calculated_variance = cat["actual"] - cat["projected"]
            assert abs(cat["variance"] - calculated_variance) < 0.01, \
                f"Category {cat['category']} variance mismatch"
        
        print(f"PASS: {len(categories)} categories with proper aggregation - {[c['category'] for c in categories]}")
    
    def test_yield_variance_industry_benchmarks(self):
        """industry_benchmarks reference data (Entree 32%, Appetizer 28%, etc.)"""
        response = requests.get(f"{BASE_URL}/api/analytics/yield-variance")
        assert response.status_code == 200
        data = response.json()
        
        assert "industry_benchmarks" in data, "Missing industry_benchmarks"
        benchmarks = data["industry_benchmarks"]
        
        # Check expected categories
        expected_categories = ["Entree", "Appetizer", "Dessert", "Beverage", "Salad", "Side"]
        for cat in expected_categories:
            assert cat in benchmarks, f"Missing benchmark for {cat}"
            assert 0 < benchmarks[cat] < 1, f"Benchmark for {cat} should be between 0 and 1"
        
        # Verify specific values
        assert benchmarks["Entree"] == 0.32, f"Entree benchmark should be 0.32, got {benchmarks['Entree']}"
        assert benchmarks["Appetizer"] == 0.28, f"Appetizer benchmark should be 0.28, got {benchmarks['Appetizer']}"
        assert benchmarks["Dessert"] == 0.25, f"Dessert benchmark should be 0.25, got {benchmarks['Dessert']}"
        assert benchmarks["Beverage"] == 0.20, f"Beverage benchmark should be 0.20, got {benchmarks['Beverage']}"
        
        print(f"PASS: Industry benchmarks present - Entree: {benchmarks['Entree']*100}%, Appetizer: {benchmarks['Appetizer']*100}%")
    
    def test_yield_variance_item_structure(self):
        """Each item has required fields: item_name, category, sell_price, food_cost, food_cost_pct, etc."""
        response = requests.get(f"{BASE_URL}/api/analytics/yield-variance")
        assert response.status_code == 200
        data = response.json()
        
        # Check worst_performers structure
        if data["worst_performers"]:
            item = data["worst_performers"][0]
            required_fields = [
                "item_name", "category", "sell_price", "food_cost", "food_cost_pct",
                "monthly_volume", "projected_yield", "actual_yield", "variance",
                "variance_pct", "industry_target_fc", "vs_industry", "status"
            ]
            for field in required_fields:
                assert field in item, f"Missing field {field} in item"
            
            # Validate status values
            assert item["status"] in ["above_target", "on_target"], f"Invalid status: {item['status']}"
        
        print("PASS: Item structure validated with all required fields")


class TestYieldVarianceSnapshots:
    """Yield Variance Snapshot and History tests"""
    
    def test_yield_variance_snapshot_creates_record(self):
        """POST /api/analytics/yield-variance/snapshot saves historical data"""
        response = requests.post(f"{BASE_URL}/api/analytics/yield-variance/snapshot")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        assert "snapshot_id" in data, "Missing snapshot_id"
        assert data["snapshot_id"].startswith("ys-"), f"snapshot_id should start with 'ys-', got {data['snapshot_id']}"
        assert "date" in data, "Missing date"
        assert "total_items" in data, "Missing total_items"
        assert "total_projected_yield" in data, "Missing total_projected_yield"
        assert "total_actual_yield" in data, "Missing total_actual_yield"
        assert "total_variance" in data, "Missing total_variance"
        assert "total_variance_pct" in data, "Missing total_variance_pct"
        assert "negative_count" in data, "Missing negative_count"
        assert "positive_count" in data, "Missing positive_count"
        assert "by_category" in data, "Missing by_category"
        assert "created_at" in data, "Missing created_at"
        
        print(f"PASS: Snapshot created - {data['snapshot_id']} with {data['total_items']} items")
        return data["snapshot_id"]
    
    def test_yield_variance_history_returns_snapshots(self):
        """GET /api/analytics/yield-variance/history returns snapshots"""
        # First create a snapshot to ensure there's data
        requests.post(f"{BASE_URL}/api/analytics/yield-variance/snapshot")
        
        response = requests.get(f"{BASE_URL}/api/analytics/yield-variance/history?limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        assert "snapshots" in data, "Missing snapshots"
        assert "total" in data, "Missing total"
        assert isinstance(data["snapshots"], list), "snapshots should be a list"
        assert data["total"] >= 1, "Should have at least 1 snapshot"
        
        # Verify snapshot structure
        if data["snapshots"]:
            snapshot = data["snapshots"][0]
            assert "snapshot_id" in snapshot
            assert "date" in snapshot
            assert "total_variance" in snapshot
            assert "by_category" in snapshot
        
        print(f"PASS: History returns {data['total']} snapshots")
    
    def test_yield_variance_history_limit_parameter(self):
        """History respects limit parameter"""
        response = requests.get(f"{BASE_URL}/api/analytics/yield-variance/history?limit=2")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["snapshots"]) <= 2, f"Expected max 2 snapshots, got {len(data['snapshots'])}"
        
        print(f"PASS: History limit parameter works - returned {len(data['snapshots'])} snapshots")


class TestCrossModuleDataIntegrity:
    """Data integrity tests for cross-module analytics"""
    
    def test_cross_module_days_parameter(self):
        """days parameter affects the period_days in response"""
        response = requests.get(f"{BASE_URL}/api/analytics/cross-module?days=7")
        assert response.status_code == 200
        data = response.json()
        
        assert data["period_days"] == 7, f"Expected period_days=7, got {data['period_days']}"
        
        response2 = requests.get(f"{BASE_URL}/api/analytics/cross-module?days=90")
        assert response2.status_code == 200
        data2 = response2.json()
        
        assert data2["period_days"] == 90, f"Expected period_days=90, got {data2['period_days']}"
        
        print("PASS: days parameter correctly affects period_days")
    
    def test_cross_module_date_present(self):
        """Response includes current date"""
        response = requests.get(f"{BASE_URL}/api/analytics/cross-module?days=30")
        assert response.status_code == 200
        data = response.json()
        
        assert "date" in data, "Missing date"
        # Date should be in YYYY-MM-DD format
        import re
        assert re.match(r"\d{4}-\d{2}-\d{2}", data["date"]), f"Invalid date format: {data['date']}"
        
        print(f"PASS: Date present in response - {data['date']}")
    
    def test_yield_variance_counts_match(self):
        """negative_variance_count + positive_variance_count = total_items"""
        response = requests.get(f"{BASE_URL}/api/analytics/yield-variance")
        assert response.status_code == 200
        data = response.json()
        
        total = data["negative_variance_count"] + data["positive_variance_count"]
        assert total == data["total_items"], \
            f"Count mismatch: {data['negative_variance_count']} + {data['positive_variance_count']} != {data['total_items']}"
        
        print(f"PASS: Variance counts match - {data['negative_variance_count']} negative + {data['positive_variance_count']} positive = {data['total_items']} total")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
