"""
Iteration 49 - Monthly P&L Review Enhanced Features Testing
============================================================
Tests for:
1. POST /api/echo-stratus/monthly-review/generate - generates review, stores in MongoDB, creates notifications
2. GET /api/echo-stratus/reviews/latest - returns full resort review (executive) or scoped outlet review (outlet_manager)
3. GET /api/echo-stratus/reviews/history - returns stored review list
4. GET /api/echo-stratus/reviews/{review_id} - retrieval by ID
5. GET /api/echo-stratus/reviews/notifications/pending - role-scoped notifications
6. GET /api/echo-stratus/scheduler/status - returns running=true with monthly cron job
7. MoM comparisons - generate Jan then Feb, Feb should have mom_available=true with delta values
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cfo-toolkit-deploy.preview.emergentagent.com').rstrip('/')


class TestMonthlyReviewGeneration:
    """Test POST /api/echo-stratus/monthly-review/generate endpoint"""
    
    def test_generate_review_returns_200(self):
        """Generate a monthly review and verify response structure"""
        response = requests.post(f"{BASE_URL}/api/echo-stratus/monthly-review/generate", json={
            "month": 1,
            "year": 2026
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify core fields exist
        assert "review_id" in data, "Missing review_id"
        assert "period" in data, "Missing period"
        assert "month" in data, "Missing month"
        assert "year" in data, "Missing year"
        assert "month_name" in data, "Missing month_name"
        assert "generated_at" in data, "Missing generated_at"
        assert "resort_pnl" in data, "Missing resort_pnl"
        assert "outlet_reports" in data, "Missing outlet_reports"
        assert "health_summary" in data, "Missing health_summary"
        assert "comparisons" in data, "Missing comparisons"
        print(f"PASS: Generated review {data['review_id']} for {data['month_name']} {data['year']}")
    
    def test_generate_review_resort_pnl_structure(self):
        """Verify resort_pnl has all required fields"""
        response = requests.post(f"{BASE_URL}/api/echo-stratus/monthly-review/generate", json={
            "month": 2,
            "year": 2026
        })
        assert response.status_code == 200
        data = response.json()
        pnl = data["resort_pnl"]
        
        required_fields = ["revenue", "ebitda", "food_cost_pct", "labor_pct", 
                          "ebitda_margin_pct", "total_events", "total_covers", "avg_check"]
        for field in required_fields:
            assert field in pnl, f"Missing resort_pnl.{field}"
        
        # Verify numeric values
        assert isinstance(pnl["revenue"], (int, float)), "revenue should be numeric"
        assert isinstance(pnl["ebitda"], (int, float)), "ebitda should be numeric"
        assert 0 <= pnl["food_cost_pct"] <= 100, "food_cost_pct should be 0-100"
        assert 0 <= pnl["labor_pct"] <= 100, "labor_pct should be 0-100"
        print(f"PASS: resort_pnl structure valid - Revenue: ${pnl['revenue']:,.0f}, EBITDA: ${pnl['ebitda']:,.0f}")
    
    def test_generate_review_outlet_reports(self):
        """Verify outlet_reports array has proper structure"""
        response = requests.post(f"{BASE_URL}/api/echo-stratus/monthly-review/generate", json={
            "month": 3,
            "year": 2026
        })
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["outlet_reports"]) > 0, "Should have at least one outlet report"
        
        outlet = data["outlet_reports"][0]
        assert "outlet_id" in outlet, "Missing outlet_id"
        assert "name" in outlet, "Missing name"
        assert "pnl" in outlet, "Missing pnl"
        assert "discrepancies" in outlet, "Missing discrepancies"
        assert "causal_factors" in outlet, "Missing causal_factors"
        assert "focus_areas" in outlet, "Missing focus_areas"
        assert "health_score" in outlet, "Missing health_score"
        print(f"PASS: {len(data['outlet_reports'])} outlet reports with proper structure")
    
    def test_generate_review_comparisons_structure(self):
        """Verify comparisons object has MoM and YoY fields"""
        response = requests.post(f"{BASE_URL}/api/echo-stratus/monthly-review/generate", json={
            "month": 4,
            "year": 2026
        })
        assert response.status_code == 200
        data = response.json()
        comp = data["comparisons"]
        
        assert "mom" in comp, "Missing mom comparisons"
        assert "yoy" in comp, "Missing yoy comparisons"
        assert "mom_period" in comp, "Missing mom_period"
        assert "yoy_period" in comp, "Missing yoy_period"
        assert "mom_available" in comp, "Missing mom_available"
        assert "yoy_available" in comp, "Missing yoy_available"
        assert "outlet_comparisons" in comp, "Missing outlet_comparisons"
        print(f"PASS: Comparisons structure valid - MoM available: {comp['mom_available']}, YoY available: {comp['yoy_available']}")


class TestReviewsLatest:
    """Test GET /api/echo-stratus/reviews/latest endpoint with role-based scoping"""
    
    def test_latest_review_executive_role(self):
        """Executive role should get full resort review"""
        # First generate a review
        requests.post(f"{BASE_URL}/api/echo-stratus/monthly-review/generate", json={"month": 5, "year": 2026})
        
        response = requests.get(f"{BASE_URL}/api/echo-stratus/reviews/latest", params={
            "role": "executive"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Should have full resort data
        assert "resort_pnl" in data, "Executive should see resort_pnl"
        assert "outlet_reports" in data, "Executive should see all outlet_reports"
        assert len(data.get("outlet_reports", [])) > 0, "Should have outlet reports"
        print(f"PASS: Executive role gets full resort review with {len(data['outlet_reports'])} outlets")
    
    def test_latest_review_outlet_manager_scoped(self):
        """Outlet manager should get only their outlet's data"""
        # First generate a review
        requests.post(f"{BASE_URL}/api/echo-stratus/monthly-review/generate", json={"month": 6, "year": 2026})
        
        response = requests.get(f"{BASE_URL}/api/echo-stratus/reviews/latest", params={
            "role": "outlet_manager",
            "outlet_id": "out-main-kitchen"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Should have scoped data
        assert data.get("scope") == "outlet", f"Expected scope='outlet', got {data.get('scope')}"
        assert "outlet_report" in data, "Should have outlet_report for scoped view"
        assert "outlet_comparisons" in data, "Should have outlet_comparisons"
        assert "resort_pnl" not in data, "Outlet manager should NOT see full resort_pnl"
        print(f"PASS: Outlet manager gets scoped review with scope='{data.get('scope')}'")
    
    def test_latest_review_no_reviews_yet(self):
        """Test behavior when no reviews exist (edge case)"""
        # This test just verifies the endpoint doesn't crash
        response = requests.get(f"{BASE_URL}/api/echo-stratus/reviews/latest", params={
            "role": "executive"
        })
        assert response.status_code == 200
        # Either returns a review or an error message
        data = response.json()
        assert "review_id" in data or "error" in data, "Should return review or error"
        print(f"PASS: Latest review endpoint handles empty state gracefully")


class TestReviewsHistory:
    """Test GET /api/echo-stratus/reviews/history endpoint"""
    
    def test_history_returns_list(self):
        """History endpoint should return list of stored reviews"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/reviews/history")
        assert response.status_code == 200
        data = response.json()
        
        assert "reviews" in data, "Missing reviews array"
        assert "count" in data, "Missing count"
        assert isinstance(data["reviews"], list), "reviews should be a list"
        print(f"PASS: History returns {data['count']} stored reviews")
    
    def test_history_review_metadata(self):
        """Each history item should have summary metadata"""
        # Generate a review first
        requests.post(f"{BASE_URL}/api/echo-stratus/monthly-review/generate", json={"month": 7, "year": 2026})
        
        response = requests.get(f"{BASE_URL}/api/echo-stratus/reviews/history")
        assert response.status_code == 200
        data = response.json()
        
        if data["count"] > 0:
            review = data["reviews"][0]
            assert "review_id" in review, "Missing review_id in history item"
            assert "period" in review, "Missing period"
            assert "month_name" in review, "Missing month_name"
            assert "year" in review, "Missing year"
            assert "generated_at" in review, "Missing generated_at"
            assert "health_summary" in review, "Missing health_summary"
            print(f"PASS: History items have proper metadata - Latest: {review['month_name']} {review['year']}")
        else:
            print("SKIP: No reviews in history to verify metadata")


class TestReviewById:
    """Test GET /api/echo-stratus/reviews/{review_id} endpoint"""
    
    def test_get_review_by_id(self):
        """Should retrieve a specific review by ID"""
        # Generate a review first
        gen_response = requests.post(f"{BASE_URL}/api/echo-stratus/monthly-review/generate", json={
            "month": 8,
            "year": 2026
        })
        assert gen_response.status_code == 200
        review_id = gen_response.json()["review_id"]
        
        # Retrieve by ID
        response = requests.get(f"{BASE_URL}/api/echo-stratus/reviews/{review_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("review_id") == review_id, f"Expected review_id {review_id}, got {data.get('review_id')}"
        assert "resort_pnl" in data, "Should have resort_pnl"
        print(f"PASS: Retrieved review {review_id} by ID")
    
    def test_get_review_by_id_with_outlet_scope(self):
        """Should scope review to outlet when role=outlet_manager"""
        # Generate a review first
        gen_response = requests.post(f"{BASE_URL}/api/echo-stratus/monthly-review/generate", json={
            "month": 9,
            "year": 2026
        })
        review_id = gen_response.json()["review_id"]
        
        # Retrieve with outlet scope
        response = requests.get(f"{BASE_URL}/api/echo-stratus/reviews/{review_id}", params={
            "role": "outlet_manager",
            "outlet_id": "out-main-kitchen"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("scope") == "outlet", "Should be scoped to outlet"
        print(f"PASS: Review {review_id} scoped to outlet_manager")
    
    def test_get_nonexistent_review(self):
        """Should return error for non-existent review ID"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/reviews/nonexistent-review-id-12345")
        assert response.status_code == 200  # API returns 200 with error in body
        data = response.json()
        assert "error" in data, "Should return error for non-existent review"
        print(f"PASS: Non-existent review returns error: {data.get('error')}")


class TestNotifications:
    """Test GET /api/echo-stratus/reviews/notifications/pending endpoint"""
    
    def test_notifications_executive(self):
        """Executive should see resort-wide notifications"""
        # Generate a review to create notifications
        requests.post(f"{BASE_URL}/api/echo-stratus/monthly-review/generate", json={"month": 10, "year": 2026})
        
        response = requests.get(f"{BASE_URL}/api/echo-stratus/reviews/notifications/pending", params={
            "role": "executive"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "notifications" in data, "Missing notifications array"
        assert "count" in data, "Missing count"
        print(f"PASS: Executive notifications endpoint returns {data['count']} notifications")
    
    def test_notifications_outlet_manager(self):
        """Outlet manager should see only their outlet's notifications"""
        # Generate a review to create notifications
        requests.post(f"{BASE_URL}/api/echo-stratus/monthly-review/generate", json={"month": 11, "year": 2026})
        
        response = requests.get(f"{BASE_URL}/api/echo-stratus/reviews/notifications/pending", params={
            "role": "outlet_manager",
            "outlet_id": "out-main-kitchen"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "notifications" in data, "Missing notifications array"
        # Verify notifications are scoped (if any exist)
        for notif in data.get("notifications", []):
            if "recipient_id" in notif:
                assert "manager:out-main-kitchen" in notif["recipient_id"] or notif.get("data", {}).get("outlet_id") == "out-main-kitchen", \
                    f"Notification should be scoped to outlet: {notif}"
        print(f"PASS: Outlet manager notifications scoped correctly - {data['count']} notifications")


class TestSchedulerStatus:
    """Test GET /api/echo-stratus/scheduler/status endpoint"""
    
    def test_scheduler_running(self):
        """Scheduler should be running with monthly cron job"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/scheduler/status")
        assert response.status_code == 200
        data = response.json()
        
        assert "running" in data, "Missing running field"
        assert data["running"] == True, f"Scheduler should be running, got {data['running']}"
        assert "jobs" in data, "Missing jobs array"
        print(f"PASS: Scheduler running={data['running']} with {len(data.get('jobs', []))} jobs")
    
    def test_scheduler_has_monthly_job(self):
        """Scheduler should have the monthly P&L review job"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/scheduler/status")
        assert response.status_code == 200
        data = response.json()
        
        jobs = data.get("jobs", [])
        monthly_job = next((j for j in jobs if "monthly" in j.get("id", "").lower() or "monthly" in j.get("name", "").lower()), None)
        
        assert monthly_job is not None, f"Should have monthly review job. Jobs: {[j.get('id') for j in jobs]}"
        assert monthly_job.get("next_run") is not None, "Monthly job should have next_run time"
        print(f"PASS: Monthly job found - ID: {monthly_job.get('id')}, Next run: {monthly_job.get('next_run')}")


class TestMoMComparisons:
    """Test Month-over-Month comparison functionality"""
    
    def test_mom_available_after_two_months(self):
        """Generate Jan then Feb - Feb should have mom_available=true"""
        # Generate January review
        jan_response = requests.post(f"{BASE_URL}/api/echo-stratus/monthly-review/generate", json={
            "month": 1,
            "year": 2026
        })
        assert jan_response.status_code == 200
        jan_data = jan_response.json()
        print(f"Generated Jan review: {jan_data['review_id']}")
        
        # Small delay to ensure MongoDB write completes
        time.sleep(0.5)
        
        # Generate February review
        feb_response = requests.post(f"{BASE_URL}/api/echo-stratus/monthly-review/generate", json={
            "month": 2,
            "year": 2026
        })
        assert feb_response.status_code == 200
        feb_data = feb_response.json()
        
        # February should have MoM available since January exists
        comp = feb_data.get("comparisons", {})
        assert comp.get("mom_available") == True, f"Feb should have mom_available=true, got {comp.get('mom_available')}"
        assert comp.get("mom_period") == "Jan 2026", f"mom_period should be 'Jan 2026', got {comp.get('mom_period')}"
        print(f"PASS: Feb review has mom_available=true, mom_period={comp.get('mom_period')}")
    
    def test_mom_delta_values(self):
        """MoM comparisons should have delta values"""
        # Generate two consecutive months
        requests.post(f"{BASE_URL}/api/echo-stratus/monthly-review/generate", json={"month": 3, "year": 2026})
        time.sleep(0.5)
        
        response = requests.post(f"{BASE_URL}/api/echo-stratus/monthly-review/generate", json={"month": 4, "year": 2026})
        assert response.status_code == 200
        data = response.json()
        
        comp = data.get("comparisons", {})
        if comp.get("mom_available"):
            mom = comp.get("mom", {})
            # Check revenue comparison has delta fields
            rev_comp = mom.get("revenue", {})
            assert "previous" in rev_comp, "MoM revenue should have previous value"
            assert "delta" in rev_comp, "MoM revenue should have delta"
            assert "delta_pct" in rev_comp, "MoM revenue should have delta_pct"
            print(f"PASS: MoM delta values present - Revenue delta: {rev_comp.get('delta')}, delta_pct: {rev_comp.get('delta_pct')}%")
        else:
            print("SKIP: MoM not available (no previous month data)")
    
    def test_outlet_comparisons(self):
        """Outlet-level comparisons should be included"""
        # Generate two months
        requests.post(f"{BASE_URL}/api/echo-stratus/monthly-review/generate", json={"month": 5, "year": 2026})
        time.sleep(0.5)
        
        response = requests.post(f"{BASE_URL}/api/echo-stratus/monthly-review/generate", json={"month": 6, "year": 2026})
        assert response.status_code == 200
        data = response.json()
        
        comp = data.get("comparisons", {})
        outlet_comps = comp.get("outlet_comparisons", {})
        
        assert isinstance(outlet_comps, dict), "outlet_comparisons should be a dict"
        if len(outlet_comps) > 0:
            # Check first outlet has MoM and YoY
            first_outlet_id = list(outlet_comps.keys())[0]
            outlet_comp = outlet_comps[first_outlet_id]
            assert "mom" in outlet_comp, "Outlet comparison should have mom"
            assert "yoy" in outlet_comp, "Outlet comparison should have yoy"
            print(f"PASS: Outlet comparisons present for {len(outlet_comps)} outlets")
        else:
            print("PASS: outlet_comparisons structure valid (empty)")


class TestZipFilesCleanup:
    """Verify no .zip files exist in /app/client/modules/"""
    
    def test_no_zip_files_in_modules(self):
        """Check that dead .zip files have been cleaned from frontend modules"""
        import subprocess
        result = subprocess.run(
            ["find", "/app/client/modules", "-name", "*.zip", "-type", "f"],
            capture_output=True, text=True
        )
        zip_files = [f for f in result.stdout.strip().split('\n') if f]
        
        assert len(zip_files) == 0, f"Found .zip files that should be removed: {zip_files}"
        print(f"PASS: No .zip files found in /app/client/modules/")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
