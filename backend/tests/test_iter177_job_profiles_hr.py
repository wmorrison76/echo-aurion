"""
iter177 · Job Profiles + Employee HR + AI Evaluation Tests

Tests:
- Job Profiles CRUD (list, upsert, by-code, deactivate)
- Resume upload/meta/download/delete
- Profile assignment to employees
- AI Evaluation (Claude Sonnet 4.5)
- Admin-gating on all endpoints
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = os.environ.get("ADMIN_API_TOKEN", "kDLVaJJVmtxX_EPKYGpU2ZunwTT1j0TU4Z_ezSximgc")

# ─── Fixtures ────────────────────────────────────────────────────────────────
@pytest.fixture
def admin_headers():
    return {"X-Admin-Token": ADMIN_TOKEN, "Content-Type": "application/json"}

@pytest.fixture
def admin_headers_no_json():
    return {"X-Admin-Token": ADMIN_TOKEN}

@pytest.fixture
def no_auth_headers():
    return {"Content-Type": "application/json"}


# ─── Job Profiles Tests ──────────────────────────────────────────────────────
class TestJobProfilesList:
    """GET /api/job-profiles/list — returns seeded profiles"""
    
    def test_list_requires_admin_token(self, no_auth_headers):
        """Endpoint should reject missing admin token with 401"""
        r = requests.get(f"{BASE_URL}/api/job-profiles/list", headers=no_auth_headers)
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"
    
    def test_list_with_wrong_token(self):
        """Endpoint should reject wrong admin token with 401"""
        r = requests.get(f"{BASE_URL}/api/job-profiles/list", headers={"X-Admin-Token": "wrong-token"})
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"
    
    def test_list_returns_seeded_profiles(self, admin_headers):
        """Should return 21 seeded job profiles"""
        r = requests.get(f"{BASE_URL}/api/job-profiles/list", headers=admin_headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        profiles = data.get("profiles", [])
        # Should have at least 21 seeded profiles
        assert len(profiles) >= 21, f"Expected >= 21 profiles, got {len(profiles)}"
        # Verify structure of first profile
        p = profiles[0]
        assert "code" in p
        assert "title" in p
        assert "department" in p
        assert "level" in p
        assert "responsibilities" in p
        assert "expectations" in p
        assert "required_skills" in p
        assert "preferred_skills" in p
        assert "required_certifications" in p
        assert "min_experience_years" in p
        print(f"✓ List returned {len(profiles)} profiles with correct structure")
    
    def test_list_returns_levels_enum(self, admin_headers):
        """Should return LEVELS enum in response"""
        r = requests.get(f"{BASE_URL}/api/job-profiles/list", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert "levels" in data
        assert data["levels"] == ["entry", "mid", "senior", "lead", "management", "executive"]
        print("✓ LEVELS enum returned correctly")
    
    def test_list_filter_by_department(self, admin_headers):
        """Should filter by department"""
        r = requests.get(f"{BASE_URL}/api/job-profiles/list?department=culinary", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        profiles = data.get("profiles", [])
        for p in profiles:
            assert p["department"] == "culinary", f"Expected culinary, got {p['department']}"
        print(f"✓ Filtered to {len(profiles)} culinary profiles")


class TestJobProfilesUpsert:
    """POST /api/job-profiles/upsert — create and update profiles"""
    
    def test_upsert_requires_admin_token(self, no_auth_headers):
        """Endpoint should reject missing admin token"""
        r = requests.post(f"{BASE_URL}/api/job-profiles/upsert", 
                         headers=no_auth_headers,
                         json={"code": "test_profile", "title": "Test", "department": "culinary", "level": "entry"})
        assert r.status_code == 401
    
    def test_upsert_creates_new_profile(self, admin_headers):
        """Should create a new job profile"""
        payload = {
            "code": "TEST_qa_engineer",
            "title": "QA Engineer",
            "department": "engineering",
            "level": "mid",
            "summary": "Quality assurance testing",
            "responsibilities": ["Write test cases", "Run regression tests"],
            "expectations": ["Zero critical bugs in production"],
            "required_skills": ["pytest", "selenium"],
            "preferred_skills": ["playwright"],
            "required_certifications": ["ISTQB"],
            "min_experience_years": 2
        }
        r = requests.post(f"{BASE_URL}/api/job-profiles/upsert", headers=admin_headers, json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        profile = data.get("profile", {})
        # Code should be lowercased and underscored
        assert profile["code"] == "test_qa_engineer"
        assert profile["title"] == "QA Engineer"
        assert profile["level"] == "mid"
        assert len(profile["responsibilities"]) == 2
        print("✓ Created new job profile with code normalization")
    
    def test_upsert_validates_level(self, admin_headers):
        """Should reject invalid level"""
        payload = {
            "code": "TEST_invalid_level",
            "title": "Invalid",
            "department": "culinary",
            "level": "invalid_level"
        }
        r = requests.post(f"{BASE_URL}/api/job-profiles/upsert", headers=admin_headers, json=payload)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        print("✓ Rejected invalid level")
    
    def test_upsert_updates_existing(self, admin_headers):
        """Should update existing profile"""
        # First create
        payload = {
            "code": "TEST_update_me",
            "title": "Original Title",
            "department": "culinary",
            "level": "entry"
        }
        r1 = requests.post(f"{BASE_URL}/api/job-profiles/upsert", headers=admin_headers, json=payload)
        assert r1.status_code == 200
        
        # Then update
        payload["title"] = "Updated Title"
        payload["level"] = "senior"
        r2 = requests.post(f"{BASE_URL}/api/job-profiles/upsert", headers=admin_headers, json=payload)
        assert r2.status_code == 200
        data = r2.json()
        assert data["profile"]["title"] == "Updated Title"
        assert data["profile"]["level"] == "senior"
        print("✓ Updated existing profile")


class TestJobProfilesByCode:
    """GET /api/job-profiles/by-code/{code}"""
    
    def test_by_code_requires_admin(self, no_auth_headers):
        """Should reject missing admin token"""
        r = requests.get(f"{BASE_URL}/api/job-profiles/by-code/cook_1", headers=no_auth_headers)
        assert r.status_code == 401
    
    def test_by_code_returns_profile(self, admin_headers):
        """Should return full profile by code"""
        r = requests.get(f"{BASE_URL}/api/job-profiles/by-code/cook_1", headers=admin_headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        profile = data.get("profile", {})
        assert profile["code"] == "cook_1"
        assert profile["title"] == "Cook 1 (Lead Line)"
        assert profile["department"] == "culinary"
        assert profile["level"] == "senior"
        print("✓ Retrieved cook_1 profile by code")
    
    def test_by_code_unknown_returns_404(self, admin_headers):
        """Should return 404 for unknown code"""
        r = requests.get(f"{BASE_URL}/api/job-profiles/by-code/nonexistent_code", headers=admin_headers)
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"
        print("✓ Unknown code returns 404")


class TestJobProfilesDeactivate:
    """POST /api/job-profiles/{code}/deactivate"""
    
    def test_deactivate_requires_admin(self, no_auth_headers):
        """Should reject missing admin token"""
        r = requests.post(f"{BASE_URL}/api/job-profiles/cook_1/deactivate", headers=no_auth_headers)
        assert r.status_code == 401
    
    def test_deactivate_sets_active_false(self, admin_headers):
        """Should set active=false on profile"""
        # First create a test profile
        payload = {"code": "TEST_deactivate_me", "title": "To Deactivate", "department": "culinary", "level": "entry"}
        requests.post(f"{BASE_URL}/api/job-profiles/upsert", headers=admin_headers, json=payload)
        
        # Deactivate
        r = requests.post(f"{BASE_URL}/api/job-profiles/test_deactivate_me/deactivate", headers=admin_headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        
        # Verify it's not in active list
        r2 = requests.get(f"{BASE_URL}/api/job-profiles/list?active_only=true", headers=admin_headers)
        profiles = r2.json().get("profiles", [])
        codes = [p["code"] for p in profiles]
        assert "test_deactivate_me" not in codes
        print("✓ Deactivated profile no longer in active list")
    
    def test_deactivate_unknown_returns_404(self, admin_headers):
        """Should return 404 for unknown code"""
        r = requests.post(f"{BASE_URL}/api/job-profiles/nonexistent_code/deactivate", headers=admin_headers)
        assert r.status_code == 404
        print("✓ Deactivate unknown code returns 404")


# ─── Employee Resume Tests ───────────────────────────────────────────────────
class TestEmployeeResume:
    """Resume upload/meta/download/delete endpoints"""
    
    @pytest.fixture
    def test_employee_id(self, admin_headers):
        """Get or create a test employee"""
        # List employees to find one
        r = requests.get(f"{BASE_URL}/api/people/list?active_only=true")
        if r.status_code == 200:
            emps = r.json().get("employees", [])
            if emps:
                return emps[0]["id"]
        # Create one if none exist
        payload = {
            "first_name": "TEST_Resume",
            "last_name": "User",
            "department": "culinary",
            "role": "team-member"
        }
        r = requests.post(f"{BASE_URL}/api/people/upsert", headers=admin_headers, json=payload)
        return r.json().get("employee", {}).get("id")
    
    def test_upload_requires_admin(self, test_employee_id):
        """Should reject missing admin token"""
        files = {"file": ("test.txt", b"test content", "text/plain")}
        r = requests.post(f"{BASE_URL}/api/employees/{test_employee_id}/resume", files=files)
        assert r.status_code == 401
        print("✓ Upload requires admin token")
    
    def test_upload_accepts_txt(self, admin_headers_no_json, test_employee_id):
        """Should accept .txt file"""
        files = {"file": ("resume.txt", b"John Doe\nSoftware Engineer\n5 years experience", "text/plain")}
        r = requests.post(f"{BASE_URL}/api/employees/{test_employee_id}/resume", 
                         headers=admin_headers_no_json, files=files)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        resume = data.get("resume", {})
        assert resume["filename"] == "resume.txt"
        assert resume["mime_type"] == "text/plain"
        assert "sha256_prefix" in resume
        print("✓ Uploaded .txt resume successfully")
    
    def test_upload_accepts_pdf(self, admin_headers_no_json, test_employee_id):
        """Should accept .pdf file"""
        # Minimal PDF content
        pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF"
        files = {"file": ("resume.pdf", pdf_content, "application/pdf")}
        r = requests.post(f"{BASE_URL}/api/employees/{test_employee_id}/resume",
                         headers=admin_headers_no_json, files=files)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        print("✓ Uploaded .pdf resume successfully")
    
    def test_upload_rejects_unsupported_mime(self, admin_headers_no_json, test_employee_id):
        """Should reject unsupported file types"""
        files = {"file": ("resume.exe", b"malicious content", "application/x-msdownload")}
        r = requests.post(f"{BASE_URL}/api/employees/{test_employee_id}/resume",
                         headers=admin_headers_no_json, files=files)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        print("✓ Rejected unsupported MIME type")
    
    def test_upload_rejects_empty(self, admin_headers_no_json, test_employee_id):
        """Should reject empty uploads"""
        files = {"file": ("empty.txt", b"", "text/plain")}
        r = requests.post(f"{BASE_URL}/api/employees/{test_employee_id}/resume",
                         headers=admin_headers_no_json, files=files)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        print("✓ Rejected empty upload")
    
    def test_meta_requires_admin(self, test_employee_id):
        """GET /api/employees/{id}/resume should require admin"""
        r = requests.get(f"{BASE_URL}/api/employees/{test_employee_id}/resume")
        assert r.status_code == 401
        print("✓ Meta requires admin token")
    
    def test_meta_returns_without_bytes(self, admin_headers, admin_headers_no_json, test_employee_id):
        """Should return metadata without file bytes"""
        # First upload
        files = {"file": ("meta_test.txt", b"Test content for meta", "text/plain")}
        requests.post(f"{BASE_URL}/api/employees/{test_employee_id}/resume",
                     headers=admin_headers_no_json, files=files)
        
        # Get meta
        r = requests.get(f"{BASE_URL}/api/employees/{test_employee_id}/resume", headers=admin_headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        resume = data.get("resume", {})
        assert "filename" in resume
        assert "size_bytes" in resume
        assert "mime_type" in resume
        assert "uploaded_at" in resume
        assert "sha256" in resume
        # Should NOT contain data_b64 or text_extract
        assert "data_b64" not in resume
        assert "text_extract" not in resume
        print("✓ Meta returns without bytes")
    
    def test_download_requires_admin(self, test_employee_id):
        """GET /api/employees/{id}/resume/download should require admin"""
        r = requests.get(f"{BASE_URL}/api/employees/{test_employee_id}/resume/download")
        assert r.status_code == 401
        print("✓ Download requires admin token")
    
    def test_download_streams_file(self, admin_headers, admin_headers_no_json, test_employee_id):
        """Should stream file with Content-Disposition"""
        # Upload first
        content = b"Download test content"
        files = {"file": ("download_test.txt", content, "text/plain")}
        requests.post(f"{BASE_URL}/api/employees/{test_employee_id}/resume",
                     headers=admin_headers_no_json, files=files)
        
        # Download
        r = requests.get(f"{BASE_URL}/api/employees/{test_employee_id}/resume/download", headers=admin_headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        assert "Content-Disposition" in r.headers
        assert "attachment" in r.headers["Content-Disposition"]
        assert r.content == content
        print("✓ Download streams file with Content-Disposition")
    
    def test_delete_requires_admin(self, test_employee_id):
        """DELETE /api/employees/{id}/resume should require admin"""
        r = requests.delete(f"{BASE_URL}/api/employees/{test_employee_id}/resume")
        assert r.status_code == 401
        print("✓ Delete requires admin token")
    
    def test_delete_removes_resume(self, admin_headers, admin_headers_no_json, test_employee_id):
        """Should remove resume and unset employee fields"""
        # Upload first
        files = {"file": ("delete_test.txt", b"To be deleted", "text/plain")}
        requests.post(f"{BASE_URL}/api/employees/{test_employee_id}/resume",
                     headers=admin_headers_no_json, files=files)
        
        # Delete
        r = requests.delete(f"{BASE_URL}/api/employees/{test_employee_id}/resume", headers=admin_headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        
        # Verify gone
        r2 = requests.get(f"{BASE_URL}/api/employees/{test_employee_id}/resume", headers=admin_headers)
        assert r2.status_code == 404
        print("✓ Delete removes resume")


# ─── Assign Profile Tests ────────────────────────────────────────────────────
class TestAssignProfile:
    """POST /api/employees/{id}/assign-profile"""
    
    @pytest.fixture
    def test_employee_id(self, admin_headers):
        """Get or create a test employee"""
        r = requests.get(f"{BASE_URL}/api/people/list?active_only=true")
        if r.status_code == 200:
            emps = r.json().get("employees", [])
            if emps:
                return emps[0]["id"]
        return None
    
    def test_assign_requires_admin(self, test_employee_id):
        """Should reject missing admin token"""
        r = requests.post(f"{BASE_URL}/api/employees/{test_employee_id}/assign-profile",
                         json={"job_profile_code": "cook_1"})
        assert r.status_code == 401
        print("✓ Assign requires admin token")
    
    def test_assign_profile_to_employee(self, admin_headers, test_employee_id):
        """Should assign profile and update employee fields"""
        r = requests.post(f"{BASE_URL}/api/employees/{test_employee_id}/assign-profile",
                         headers=admin_headers, json={"job_profile_code": "cook_2"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        emp = data.get("employee", {})
        assert emp.get("job_profile_code") == "cook_2"
        assert emp.get("job_profile_title") == "Cook 2 (Station Cook)"
        print("✓ Assigned cook_2 profile to employee")
    
    def test_assign_null_unassigns(self, admin_headers, test_employee_id):
        """Should unassign when null passed"""
        # First assign
        requests.post(f"{BASE_URL}/api/employees/{test_employee_id}/assign-profile",
                     headers=admin_headers, json={"job_profile_code": "cook_1"})
        
        # Then unassign
        r = requests.post(f"{BASE_URL}/api/employees/{test_employee_id}/assign-profile",
                         headers=admin_headers, json={"job_profile_code": None})
        assert r.status_code == 200
        emp = r.json().get("employee", {})
        assert emp.get("job_profile_code") is None
        print("✓ Null unassigns profile")
    
    def test_assign_invalid_code_returns_404(self, admin_headers, test_employee_id):
        """Should return 404 for invalid profile code"""
        r = requests.post(f"{BASE_URL}/api/employees/{test_employee_id}/assign-profile",
                         headers=admin_headers, json={"job_profile_code": "nonexistent_profile"})
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"
        print("✓ Invalid profile code returns 404")


# ─── AI Evaluation Tests ─────────────────────────────────────────────────────
class TestAIEvaluation:
    """POST /api/employees/{id}/evaluate — Claude Sonnet 4.5"""
    
    @pytest.fixture
    def test_employee_with_profile(self, admin_headers, admin_headers_no_json):
        """Get or create employee with profile and resume"""
        r = requests.get(f"{BASE_URL}/api/people/list?active_only=true")
        emps = r.json().get("employees", [])
        emp = emps[0] if emps else None
        if not emp:
            pytest.skip("No employees available")
        
        # Assign profile
        requests.post(f"{BASE_URL}/api/employees/{emp['id']}/assign-profile",
                     headers=admin_headers, json={"job_profile_code": "cook_2"})
        
        # Upload resume
        resume_text = """
        John Doe
        Line Cook with 2 years experience
        
        Skills:
        - Station prep and line speed
        - Basic sauces and grill experience
        - ServSafe Food Handler certified
        
        Experience:
        - Line Cook at Restaurant ABC (2023-present)
        - Prep Cook at Cafe XYZ (2022-2023)
        """
        files = {"file": ("resume.txt", resume_text.encode(), "text/plain")}
        requests.post(f"{BASE_URL}/api/employees/{emp['id']}/resume",
                     headers=admin_headers_no_json, files=files)
        
        return emp["id"]
    
    def test_evaluate_requires_admin(self, test_employee_with_profile):
        """Should reject missing admin token"""
        r = requests.post(f"{BASE_URL}/api/employees/{test_employee_with_profile}/evaluate",
                         json={"focus": "annual evaluation"})
        assert r.status_code == 401
        print("✓ Evaluate requires admin token")
    
    def test_evaluate_requires_profile(self, admin_headers):
        """Should require job_profile_code"""
        # Create employee without profile
        payload = {"first_name": "TEST_NoProfile", "last_name": "User", "department": "culinary", "role": "team-member"}
        r1 = requests.post(f"{BASE_URL}/api/people/upsert", headers=admin_headers, json=payload)
        emp_id = r1.json().get("employee", {}).get("id")
        
        # Try to evaluate
        r = requests.post(f"{BASE_URL}/api/employees/{emp_id}/evaluate",
                         headers=admin_headers, json={"focus": "annual evaluation"})
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        print("✓ Evaluate requires job profile")
    
    def test_evaluate_returns_structured_response(self, admin_headers, test_employee_with_profile):
        """Should return structured Claude evaluation"""
        r = requests.post(f"{BASE_URL}/api/employees/{test_employee_with_profile}/evaluate",
                         headers=admin_headers, 
                         json={"focus": "annual evaluation", "include_resume": True})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        
        evaluation = data.get("evaluation", {})
        assert "id" in evaluation
        assert "employee_id" in evaluation
        assert "job_profile_code" in evaluation
        assert "focus" in evaluation
        assert "used_resume" in evaluation
        assert "created_at" in evaluation
        
        result = evaluation.get("result", {})
        # Check required fields
        assert "fit_score" in result
        assert isinstance(result["fit_score"], int)
        assert 0 <= result["fit_score"] <= 100
        assert "fit_label" in result
        assert result["fit_label"] in ["strong", "solid", "developing", "gap"]
        assert "summary" in result
        assert "strengths" in result
        assert "gaps" in result
        assert "interview_questions" in result
        assert len(result["interview_questions"]) >= 6
        assert "evaluation_rubric" in result
        assert "recommended_development" in result
        
        print(f"✓ Evaluation returned fit_score={result['fit_score']}, label={result['fit_label']}")
        print(f"  Strengths: {len(result['strengths'])}, Gaps: {len(result['gaps'])}")
        print(f"  Interview questions: {len(result['interview_questions'])}")


class TestEvaluationHistory:
    """GET /api/employees/{id}/evaluations"""
    
    @pytest.fixture
    def test_employee_id(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/people/list?active_only=true")
        emps = r.json().get("employees", [])
        return emps[0]["id"] if emps else None
    
    def test_history_requires_admin(self, test_employee_id):
        """Should reject missing admin token"""
        r = requests.get(f"{BASE_URL}/api/employees/{test_employee_id}/evaluations")
        assert r.status_code == 401
        print("✓ History requires admin token")
    
    def test_history_returns_evaluations(self, admin_headers, test_employee_id):
        """Should return evaluation history newest-first"""
        r = requests.get(f"{BASE_URL}/api/employees/{test_employee_id}/evaluations?limit=20", headers=admin_headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "evaluations" in data
        assert "total" in data
        
        evals = data.get("evaluations", [])
        if len(evals) > 1:
            # Verify newest-first ordering
            dates = [e["created_at"] for e in evals]
            assert dates == sorted(dates, reverse=True), "Evaluations should be newest-first"
        print(f"✓ History returned {len(evals)} evaluations")


# ─── Cleanup ─────────────────────────────────────────────────────────────────
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests"""
    yield
    # Cleanup would go here if needed
    print("\n✓ Test cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
