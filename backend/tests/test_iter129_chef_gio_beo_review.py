"""
Iteration 129: Chef Gio BEO Review UI & Backend Tests
Tests the RLHF BEO Review module - queue, review, submit, accuracy endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDevAuth:
    """Test dev authentication endpoint"""
    
    def test_dev_login_returns_token(self):
        """POST /api/auth/dev/login returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/dev/login", json={})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data or "access_token" in data, f"No token in response: {data}"
        print(f"Dev login successful: {data}")


class TestChefGioBEOReviewQueue:
    """Test BEO Review Queue endpoint"""
    
    def test_get_review_queue(self):
        """GET /api/chef-gio/beo-review/queue returns BEOs with review_status"""
        response = requests.get(f"{BASE_URL}/api/chef-gio/beo-review/queue")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "queue" in data, f"No queue in response: {data}"
        assert "total" in data, f"No total in response: {data}"
        assert "pending_review" in data, f"No pending_review in response: {data}"
        
        # Verify queue items have required fields
        if data["queue"]:
            item = data["queue"][0]
            assert "beo_id" in item, f"No beo_id in queue item: {item}"
            assert "beo_number" in item, f"No beo_number in queue item: {item}"
            assert "review_status" in item, f"No review_status in queue item: {item}"
            assert item["review_status"] in ["pending", "approved", "corrected"], f"Invalid review_status: {item['review_status']}"
            print(f"Queue item: BEO #{item['beo_number']} - {item['review_status']}")
        
        print(f"Review queue: {data['total']} total, {data['pending_review']} pending")


class TestChefGioBEOReviewDetail:
    """Test BEO Review Detail endpoint"""
    
    def test_get_beo_for_review(self):
        """GET /api/chef-gio/beo-review/{id} returns echoai_decisions with 7 categories"""
        # First get a BEO ID from queue
        queue_response = requests.get(f"{BASE_URL}/api/chef-gio/beo-review/queue")
        assert queue_response.status_code == 200
        queue_data = queue_response.json()
        
        if not queue_data["queue"]:
            pytest.skip("No BEOs in queue to test")
        
        beo_id = queue_data["queue"][0]["beo_id"]
        
        # Get BEO review detail
        response = requests.get(f"{BASE_URL}/api/chef-gio/beo-review/{beo_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "beo" in data, f"No beo in response: {data}"
        assert "echoai_decisions" in data, f"No echoai_decisions in response: {data}"
        
        # Verify echoai_decisions structure
        decisions = data["echoai_decisions"]
        assert len(decisions) >= 5, f"Expected at least 5 decisions, got {len(decisions)}"
        
        # Check decision categories
        categories = [d["category"] for d in decisions]
        expected_categories = ["guest_count", "room_assignment", "menu_composition", "timing", "staffing", "equipment"]
        for cat in expected_categories:
            assert cat in categories, f"Missing category {cat} in decisions"
        
        # Verify decision structure
        for dec in decisions:
            assert "id" in dec, f"No id in decision: {dec}"
            assert "category" in dec, f"No category in decision: {dec}"
            assert "title" in dec, f"No title in decision: {dec}"
            assert "echoai_reasoning" in dec, f"No echoai_reasoning in decision: {dec}"
            assert "echoai_recommendation" in dec, f"No echoai_recommendation in decision: {dec}"
            assert "confidence" in dec, f"No confidence in decision: {dec}"
            assert 0 <= dec["confidence"] <= 1, f"Invalid confidence: {dec['confidence']}"
        
        print(f"BEO {beo_id} has {len(decisions)} decisions: {categories}")


class TestChefGioBEOReviewSubmit:
    """Test BEO Review Submit endpoint"""
    
    def test_submit_review(self):
        """POST /api/chef-gio/beo-review/{id}/submit stores review and training data"""
        # First get a BEO ID and its decisions
        queue_response = requests.get(f"{BASE_URL}/api/chef-gio/beo-review/queue")
        assert queue_response.status_code == 200
        queue_data = queue_response.json()
        
        if not queue_data["queue"]:
            pytest.skip("No BEOs in queue to test")
        
        beo_id = queue_data["queue"][0]["beo_id"]
        
        # Get BEO review detail
        detail_response = requests.get(f"{BASE_URL}/api/chef-gio/beo-review/{beo_id}")
        assert detail_response.status_code == 200
        detail_data = detail_response.json()
        
        # Build review submission - approve most, correct one
        decisions = []
        for i, dec in enumerate(detail_data["echoai_decisions"]):
            if i == 0:
                # Correct the first decision
                decisions.append({
                    "id": dec["id"],
                    "category": dec["category"],
                    "status": "corrected",
                    "echoai_recommendation": dec["echoai_recommendation"],
                    "correction": "TEST_correction_value",
                    "correction_reasoning": "TEST_correction_reasoning"
                })
            else:
                # Approve the rest
                decisions.append({
                    "id": dec["id"],
                    "category": dec["category"],
                    "status": "approved",
                    "echoai_recommendation": dec["echoai_recommendation"],
                    "correction": "",
                    "correction_reasoning": ""
                })
        
        # Submit review
        response = requests.post(f"{BASE_URL}/api/chef-gio/beo-review/{beo_id}/submit", json={
            "chef_name": "TEST_Chef",
            "decisions": decisions,
            "overall_notes": "TEST_overall_notes"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response
        assert "review_id" in data, f"No review_id in response: {data}"
        assert "status" in data, f"No status in response: {data}"
        assert "approved" in data, f"No approved count in response: {data}"
        assert "corrected" in data, f"No corrected count in response: {data}"
        assert data["corrected"] >= 1, f"Expected at least 1 correction: {data}"
        
        print(f"Review submitted: {data['approved']} approved, {data['corrected']} corrected")


class TestChefGioReviewAccuracy:
    """Test Review Accuracy endpoint"""
    
    def test_get_review_accuracy(self):
        """GET /api/chef-gio/review-accuracy returns accuracy metrics"""
        response = requests.get(f"{BASE_URL}/api/chef-gio/review-accuracy")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "accuracy" in data, f"No accuracy in response: {data}"
        assert "total_reviews" in data, f"No total_reviews in response: {data}"
        assert "trend" in data, f"No trend in response: {data}"
        
        # Verify values
        assert 0 <= data["accuracy"] <= 100, f"Invalid accuracy: {data['accuracy']}"
        assert data["trend"] in ["improving", "needs_training", "no_data"], f"Invalid trend: {data['trend']}"
        
        print(f"Accuracy: {data['accuracy']}%, trend: {data['trend']}")


class TestMajorEndpoints:
    """Test major endpoints are responding"""
    
    def test_yields_endpoint(self):
        """GET /api/yields responds"""
        response = requests.get(f"{BASE_URL}/api/yields")
        assert response.status_code == 200, f"Yields endpoint failed: {response.status_code}"
        print("Yields endpoint OK")
    
    def test_pos_analytics_endpoint(self):
        """GET /api/pos-analytics responds"""
        response = requests.get(f"{BASE_URL}/api/pos-analytics")
        assert response.status_code == 200, f"POS Analytics endpoint failed: {response.status_code}"
        print("POS Analytics endpoint OK")
    
    def test_weather_endpoint(self):
        """GET /api/weather responds"""
        response = requests.get(f"{BASE_URL}/api/weather")
        assert response.status_code == 200, f"Weather endpoint failed: {response.status_code}"
        print("Weather endpoint OK")
    
    def test_beo_engine_endpoint(self):
        """GET /api/beo-engine/beos responds"""
        response = requests.get(f"{BASE_URL}/api/beo-engine/beos")
        assert response.status_code == 200, f"BEO Engine endpoint failed: {response.status_code}"
        print("BEO Engine endpoint OK")
    
    def test_echo_events_endpoint(self):
        """GET /api/echo-events responds"""
        response = requests.get(f"{BASE_URL}/api/echo-events")
        assert response.status_code == 200, f"Echo Events endpoint failed: {response.status_code}"
        print("Echo Events endpoint OK")
    
    def test_calendar_endpoint(self):
        """GET /api/calendar responds"""
        response = requests.get(f"{BASE_URL}/api/calendar")
        assert response.status_code == 200, f"Calendar endpoint failed: {response.status_code}"
        print("Calendar endpoint OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
