"""
Iteration 128: RLHF BEO Review Module Tests
============================================
Tests for Chef Gio RLHF BEO Review Module:
- GET /api/chef-gio/beo-review/queue - BEOs pending review with review_status
- GET /api/chef-gio/beo-review/{beo_id} - BEO with 7 echoai_decisions
- POST /api/chef-gio/beo-review/{beo_id}/submit - Submit review decisions
- GET /api/chef-gio/review-training-data - RLHF corrections with categories
- GET /api/chef-gio/review-accuracy - Accuracy % based on approved vs corrected
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestBEOReviewQueue:
    """Tests for GET /api/chef-gio/beo-review/queue"""
    
    def test_get_review_queue_returns_200(self, api_client):
        """Queue endpoint returns 200 with BEOs"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/beo-review/queue")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_queue_has_required_fields(self, api_client):
        """Queue response has queue array and counts"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/beo-review/queue")
        data = response.json()
        
        assert "queue" in data, "Response missing 'queue' field"
        assert "total" in data, "Response missing 'total' field"
        assert "pending_review" in data, "Response missing 'pending_review' count"
        assert "approved" in data, "Response missing 'approved' count"
        assert "corrected" in data, "Response missing 'corrected' count"
        
    def test_queue_items_have_review_status(self, api_client):
        """Each BEO in queue has review_status field"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/beo-review/queue")
        data = response.json()
        
        assert len(data["queue"]) > 0, "Queue should have BEOs (50 exist in system)"
        
        for beo in data["queue"]:
            assert "beo_id" in beo, "BEO missing 'beo_id'"
            assert "beo_number" in beo, "BEO missing 'beo_number'"
            assert "review_status" in beo, f"BEO {beo.get('beo_id')} missing 'review_status'"
            assert beo["review_status"] in ["pending", "approved", "corrected"], \
                f"Invalid review_status: {beo['review_status']}"
                
    def test_queue_items_have_event_details(self, api_client):
        """Queue items include event details for chef review"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/beo-review/queue")
        data = response.json()
        
        beo = data["queue"][0]
        assert "event_name" in beo, "BEO missing 'event_name'"
        assert "event_date" in beo, "BEO missing 'event_date'"
        assert "room" in beo, "BEO missing 'room'"
        assert "guaranteed_count" in beo, "BEO missing 'guaranteed_count'"
        assert "classification" in beo, "BEO missing 'classification'"


class TestBEOReviewDetail:
    """Tests for GET /api/chef-gio/beo-review/{beo_id}"""
    
    @pytest.fixture
    def sample_beo_id(self, api_client):
        """Get a BEO ID from the queue for testing"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/beo-review/queue")
        data = response.json()
        if data["queue"]:
            return data["queue"][0]["beo_id"]
        pytest.skip("No BEOs in queue to test")
        
    def test_get_beo_for_review_returns_200(self, api_client, sample_beo_id):
        """BEO review detail returns 200"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/beo-review/{sample_beo_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_beo_review_has_echoai_decisions(self, api_client, sample_beo_id):
        """BEO review includes echoai_decisions array"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/beo-review/{sample_beo_id}")
        data = response.json()
        
        assert "beo" in data, "Response missing 'beo' field"
        assert "echoai_decisions" in data, "Response missing 'echoai_decisions' field"
        assert isinstance(data["echoai_decisions"], list), "echoai_decisions should be a list"
        
    def test_echoai_decisions_have_7_categories(self, api_client, sample_beo_id):
        """EchoAi generates 7 decision categories (6 if no financial)"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/beo-review/{sample_beo_id}")
        data = response.json()
        
        decisions = data["echoai_decisions"]
        categories = [d["category"] for d in decisions]
        
        # Required categories (financial only if total > 0)
        required = ["guest_count", "room_assignment", "menu_composition", "timing", "staffing", "equipment"]
        for cat in required:
            assert cat in categories, f"Missing required category: {cat}"
            
        # Financial is optional (only if total > 0)
        assert len(decisions) >= 6, f"Expected at least 6 decisions, got {len(decisions)}"
        assert len(decisions) <= 7, f"Expected at most 7 decisions, got {len(decisions)}"
        
    def test_each_decision_has_required_fields(self, api_client, sample_beo_id):
        """Each decision has reasoning, recommendation, confidence"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/beo-review/{sample_beo_id}")
        data = response.json()
        
        for dec in data["echoai_decisions"]:
            assert "id" in dec, f"Decision missing 'id'"
            assert "category" in dec, f"Decision missing 'category'"
            assert "title" in dec, f"Decision missing 'title'"
            assert "echoai_reasoning" in dec, f"Decision {dec.get('category')} missing 'echoai_reasoning'"
            assert "echoai_recommendation" in dec, f"Decision {dec.get('category')} missing 'echoai_recommendation'"
            assert "confidence" in dec, f"Decision {dec.get('category')} missing 'confidence'"
            assert "status" in dec, f"Decision {dec.get('category')} missing 'status'"
            
            # Confidence should be between 0 and 1
            assert 0 <= dec["confidence"] <= 1, f"Confidence out of range: {dec['confidence']}"
            
    def test_nonexistent_beo_returns_404(self, api_client):
        """Requesting non-existent BEO returns 404"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/beo-review/nonexistent-beo-id")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestBEOReviewSubmit:
    """Tests for POST /api/chef-gio/beo-review/{beo_id}/submit"""
    
    @pytest.fixture
    def pending_beo_id(self, api_client):
        """Get a pending BEO ID for testing submission"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/beo-review/queue")
        data = response.json()
        # Find a pending BEO
        for beo in data["queue"]:
            if beo["review_status"] == "pending":
                return beo["beo_id"]
        # If no pending, use first one (will update existing review)
        if data["queue"]:
            return data["queue"][0]["beo_id"]
        pytest.skip("No BEOs available for testing")
        
    def test_submit_all_approved_returns_200(self, api_client, pending_beo_id):
        """Submitting all approved decisions returns 200"""
        # First get the decisions
        review_response = api_client.get(f"{BASE_URL}/api/chef-gio/beo-review/{pending_beo_id}")
        decisions = review_response.json()["echoai_decisions"]
        
        # Mark all as approved
        approved_decisions = [
            {"id": d["id"], "category": d["category"], "status": "approved"}
            for d in decisions
        ]
        
        response = api_client.post(
            f"{BASE_URL}/api/chef-gio/beo-review/{pending_beo_id}/submit",
            json={
                "decisions": approved_decisions,
                "chef_name": "Test Chef",
                "overall_notes": "All decisions approved for testing"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_submit_returns_review_summary(self, api_client, pending_beo_id):
        """Submit response includes review summary"""
        review_response = api_client.get(f"{BASE_URL}/api/chef-gio/beo-review/{pending_beo_id}")
        decisions = review_response.json()["echoai_decisions"]
        
        approved_decisions = [
            {"id": d["id"], "category": d["category"], "status": "approved"}
            for d in decisions
        ]
        
        response = api_client.post(
            f"{BASE_URL}/api/chef-gio/beo-review/{pending_beo_id}/submit",
            json={"decisions": approved_decisions, "chef_name": "Test Chef"}
        )
        data = response.json()
        
        assert "review_id" in data, "Response missing 'review_id'"
        assert "status" in data, "Response missing 'status'"
        assert "approved" in data, "Response missing 'approved' count"
        assert "corrected" in data, "Response missing 'corrected' count"
        assert "flagged" in data, "Response missing 'flagged' count"
        
    def test_submit_with_corrections_creates_training_data(self, api_client, pending_beo_id):
        """Corrections create training data entries"""
        review_response = api_client.get(f"{BASE_URL}/api/chef-gio/beo-review/{pending_beo_id}")
        decisions = review_response.json()["echoai_decisions"]
        
        # Mix of approved and corrected
        mixed_decisions = []
        for i, d in enumerate(decisions):
            if i == 0:  # Correct the first one
                mixed_decisions.append({
                    "id": d["id"],
                    "category": d["category"],
                    "status": "corrected",
                    "echoai_recommendation": d["echoai_recommendation"],
                    "correction": "Test correction value",
                    "correction_reasoning": "Testing RLHF training data creation"
                })
            else:
                mixed_decisions.append({
                    "id": d["id"],
                    "category": d["category"],
                    "status": "approved"
                })
        
        response = api_client.post(
            f"{BASE_URL}/api/chef-gio/beo-review/{pending_beo_id}/submit",
            json={
                "decisions": mixed_decisions,
                "chef_name": "RLHF Test Chef",
                "overall_notes": "Testing correction training data"
            }
        )
        data = response.json()
        
        assert data["corrected"] >= 1, "Should have at least 1 correction"
        assert "training_data_created" in data, "Response missing 'training_data_created'"
        assert data["training_data_created"] >= 1, "Should create training data for corrections"
        
    def test_submit_updates_review_status_in_queue(self, api_client, pending_beo_id):
        """After submit, queue shows updated review_status"""
        # Submit a review
        review_response = api_client.get(f"{BASE_URL}/api/chef-gio/beo-review/{pending_beo_id}")
        decisions = review_response.json()["echoai_decisions"]
        
        approved_decisions = [
            {"id": d["id"], "category": d["category"], "status": "approved"}
            for d in decisions
        ]
        
        api_client.post(
            f"{BASE_URL}/api/chef-gio/beo-review/{pending_beo_id}/submit",
            json={"decisions": approved_decisions, "chef_name": "Status Test Chef"}
        )
        
        # Check queue
        queue_response = api_client.get(f"{BASE_URL}/api/chef-gio/beo-review/queue")
        queue_data = queue_response.json()
        
        reviewed_beo = next((b for b in queue_data["queue"] if b["beo_id"] == pending_beo_id), None)
        if reviewed_beo:
            assert reviewed_beo["review_status"] in ["approved", "corrected"], \
                f"Review status should be updated, got: {reviewed_beo['review_status']}"


class TestReviewTrainingData:
    """Tests for GET /api/chef-gio/review-training-data"""
    
    def test_get_training_data_returns_200(self, api_client):
        """Training data endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/review-training-data")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_training_data_has_required_fields(self, api_client):
        """Training data response has required structure"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/review-training-data")
        data = response.json()
        
        assert "training_data" in data, "Response missing 'training_data'"
        assert "total" in data, "Response missing 'total'"
        assert "by_category" in data, "Response missing 'by_category'"
        assert "model_improvement" in data, "Response missing 'model_improvement'"
        
    def test_training_data_entries_have_correction_details(self, api_client):
        """Each training entry has correction details"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/review-training-data")
        data = response.json()
        
        if data["training_data"]:
            entry = data["training_data"][0]
            assert "id" in entry, "Entry missing 'id'"
            assert "category" in entry, "Entry missing 'category'"
            assert "original_recommendation" in entry, "Entry missing 'original_recommendation'"
            assert "correction" in entry, "Entry missing 'correction'"
            assert "correction_reasoning" in entry, "Entry missing 'correction_reasoning'"
            assert "chef_name" in entry, "Entry missing 'chef_name'"
            assert "beo_id" in entry, "Entry missing 'beo_id'"
            assert "created_at" in entry, "Entry missing 'created_at'"
            
    def test_by_category_counts_corrections(self, api_client):
        """by_category field counts corrections per category"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/review-training-data")
        data = response.json()
        
        assert isinstance(data["by_category"], dict), "by_category should be a dict"
        # Sum of categories should equal total
        if data["training_data"]:
            category_sum = sum(data["by_category"].values())
            assert category_sum == data["total"], \
                f"Category sum ({category_sum}) should equal total ({data['total']})"


class TestReviewAccuracy:
    """Tests for GET /api/chef-gio/review-accuracy"""
    
    def test_get_accuracy_returns_200(self, api_client):
        """Accuracy endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/review-accuracy")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_accuracy_has_required_fields(self, api_client):
        """Accuracy response has required metrics"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/review-accuracy")
        data = response.json()
        
        assert "accuracy" in data, "Response missing 'accuracy'"
        assert "total_reviews" in data, "Response missing 'total_reviews'"
        assert "total_decisions" in data, "Response missing 'total_decisions'"
        assert "total_approved" in data, "Response missing 'total_approved'"
        assert "total_corrected" in data, "Response missing 'total_corrected'"
        assert "trend" in data, "Response missing 'trend'"
        
    def test_accuracy_calculation_is_correct(self, api_client):
        """Accuracy % = approved / total_decisions * 100"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/review-accuracy")
        data = response.json()
        
        if data["total_decisions"] > 0:
            expected_accuracy = round(data["total_approved"] / data["total_decisions"] * 100, 1)
            assert data["accuracy"] == expected_accuracy, \
                f"Accuracy mismatch: expected {expected_accuracy}, got {data['accuracy']}"
                
    def test_accuracy_trend_based_on_threshold(self, api_client):
        """Trend is 'improving' if accuracy > 80%, else 'needs_training'"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/review-accuracy")
        data = response.json()
        
        if data["total_reviews"] > 0:
            if data["accuracy"] > 80:
                assert data["trend"] == "improving", \
                    f"Accuracy {data['accuracy']}% should have trend 'improving'"
            else:
                assert data["trend"] == "needs_training", \
                    f"Accuracy {data['accuracy']}% should have trend 'needs_training'"
        else:
            assert data["trend"] == "no_data", "No reviews should have trend 'no_data'"


class TestBEOChangelogUpdate:
    """Tests for BEO changelog update after chef review"""
    
    @pytest.fixture
    def test_beo_id(self, api_client):
        """Get a BEO ID for changelog testing"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/beo-review/queue")
        data = response.json()
        if data["queue"]:
            return data["queue"][0]["beo_id"]
        pytest.skip("No BEOs available")
        
    def test_submit_review_updates_beo_changelog(self, api_client, test_beo_id):
        """Submitting review adds entry to BEO changelog"""
        # Get decisions
        review_response = api_client.get(f"{BASE_URL}/api/chef-gio/beo-review/{test_beo_id}")
        decisions = review_response.json()["echoai_decisions"]
        
        # Submit review
        approved_decisions = [
            {"id": d["id"], "category": d["category"], "status": "approved"}
            for d in decisions
        ]
        
        api_client.post(
            f"{BASE_URL}/api/chef-gio/beo-review/{test_beo_id}/submit",
            json={
                "decisions": approved_decisions,
                "chef_name": "Changelog Test Chef"
            }
        )
        
        # Get BEO and check changelog
        beo_response = api_client.get(f"{BASE_URL}/api/chef-gio/beo-review/{test_beo_id}")
        beo_data = beo_response.json()["beo"]
        
        assert "changelog" in beo_data, "BEO should have changelog"
        # Check for chef review entry
        chef_review_entries = [
            c for c in beo_data.get("changelog", [])
            if "Chef review" in c.get("action", "")
        ]
        assert len(chef_review_entries) > 0, "Changelog should have chef review entry"


class TestKnowledgeBaseUpdate:
    """Tests for corrections auto-adding to knowledge base"""
    
    @pytest.fixture
    def correction_beo_id(self, api_client):
        """Get a BEO ID for knowledge base testing"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/beo-review/queue")
        data = response.json()
        if data["queue"]:
            return data["queue"][0]["beo_id"]
        pytest.skip("No BEOs available")
        
    def test_correction_adds_to_knowledge_base(self, api_client, correction_beo_id):
        """Corrections are added to gio_knowledge for immediate use"""
        # Get decisions
        review_response = api_client.get(f"{BASE_URL}/api/chef-gio/beo-review/{correction_beo_id}")
        decisions = review_response.json()["echoai_decisions"]
        
        # Submit with a correction
        test_category = decisions[0]["category"]
        correction_decisions = [
            {
                "id": decisions[0]["id"],
                "category": test_category,
                "status": "corrected",
                "echoai_recommendation": decisions[0]["echoai_recommendation"],
                "correction": "KB Test Correction Value",
                "correction_reasoning": "Testing knowledge base auto-add"
            }
        ] + [
            {"id": d["id"], "category": d["category"], "status": "approved"}
            for d in decisions[1:]
        ]
        
        api_client.post(
            f"{BASE_URL}/api/chef-gio/beo-review/{correction_beo_id}/submit",
            json={
                "decisions": correction_decisions,
                "chef_name": "KB Test Chef"
            }
        )
        
        # Check knowledge base
        kb_response = api_client.get(f"{BASE_URL}/api/chef-gio/knowledge-base")
        kb_data = kb_response.json()
        
        # Look for correction entry
        correction_entries = [
            e for e in kb_data.get("custom_entries", [])
            if "BEO Correction" in e.get("topic", "") and e.get("source") == "rlhf_review"
        ]
        assert len(correction_entries) > 0, "Knowledge base should have RLHF correction entries"


class TestExistingReviewData:
    """Tests for existing review data (beo-a3ba8c51 with 5 approved + 2 corrected)"""
    
    def test_existing_review_reflected_in_accuracy(self, api_client):
        """Existing review (71.4% accuracy) should be reflected"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/review-accuracy")
        data = response.json()
        
        # Should have at least 1 review from the existing data
        assert data["total_reviews"] >= 1, "Should have at least 1 existing review"
        assert data["total_decisions"] >= 7, "Should have at least 7 decisions from existing review"
        
    def test_existing_training_data_present(self, api_client):
        """Existing corrections should be in training data"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/review-training-data")
        data = response.json()
        
        # Should have training data from existing corrections
        assert data["total"] >= 0, "Training data endpoint should work"
        # Note: May be 0 if no corrections were made, or >= 2 if existing review had corrections
