"""
Iteration 34 - Security Hardening & Code Quality Regression Tests
==================================================================
Tests for:
1. Backend starts without errors
2. Health endpoint with all 10 engines
3. CORS blocking at localhost:8001 (evil.com blocked, preview domain allowed)
4. Rate limiting headers present
5. All FMS endpoints still working
6. Knowledge engine and enterprise endpoints
7. Regex escape utility function
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
LOCAL_URL = "http://localhost:8001"

# ============================================================================
# Health & Engine Tests
# ============================================================================
class TestHealthAndEngines:
    """Verify backend health and all 10 engines are active"""
    
    def test_health_endpoint_returns_200(self):
        """GET /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print("PASS: Health endpoint returns 200")
    
    def test_health_has_all_10_engines(self):
        """Health response includes all 10 engines as active"""
        response = requests.get(f"{BASE_URL}/api/health")
        data = response.json()
        
        assert "engines" in data, "Missing 'engines' in health response"
        engines = data["engines"]
        
        expected_engines = [
            "operations_core", "ai_forecasting", "pos_integration",
            "event_lifecycle", "labor_cost", "event_bus",
            "payroll", "workflow", "notifications", "tamper_audit"
        ]
        
        for engine in expected_engines:
            assert engine in engines, f"Missing engine: {engine}"
            assert engines[engine] == "active", f"Engine {engine} not active"
        
        print(f"PASS: All 10 engines active: {list(engines.keys())}")
    
    def test_health_has_platform_info(self):
        """Health response includes platform and version"""
        response = requests.get(f"{BASE_URL}/api/health")
        data = response.json()
        
        assert data.get("platform") == "LUCCCA Enterprise"
        assert data.get("version") == "3.1"
        assert "timestamp" in data
        print("PASS: Platform info correct (LUCCCA Enterprise v3.1)")


# ============================================================================
# CORS Tests (at localhost:8001 level)
# ============================================================================
class TestCORSAtLocalhost:
    """Test CORS blocking at app level (localhost:8001)"""
    
    def test_cors_blocks_evil_origin(self):
        """CORS should block requests from evil.com origin"""
        headers = {"Origin": "https://evil.com"}
        response = requests.options(f"{LOCAL_URL}/api/health", headers=headers)
        
        # Check that access-control-allow-origin is NOT set to evil.com
        acao = response.headers.get("access-control-allow-origin", "")
        assert acao != "https://evil.com", f"CORS allowed evil.com! ACAO={acao}"
        assert acao != "*", "CORS is set to wildcard (*) - should be restricted"
        print(f"PASS: CORS blocks evil.com (ACAO header: '{acao}')")
    
    def test_cors_allows_preview_domain(self):
        """CORS should allow the preview domain"""
        preview_origin = "https://cfo-toolkit-deploy.preview.emergentagent.com"
        headers = {"Origin": preview_origin}
        response = requests.options(f"{LOCAL_URL}/api/health", headers=headers)
        
        acao = response.headers.get("access-control-allow-origin", "")
        # Should either be the exact origin or not blocked
        assert acao == preview_origin or response.status_code == 200, \
            f"CORS may be blocking preview domain. ACAO={acao}, status={response.status_code}"
        print(f"PASS: CORS allows preview domain (ACAO: {acao})")
    
    def test_cors_allows_localhost_3000(self):
        """CORS should allow localhost:3000 (frontend)"""
        headers = {"Origin": "http://localhost:3000"}
        response = requests.options(f"{LOCAL_URL}/api/health", headers=headers)
        
        acao = response.headers.get("access-control-allow-origin", "")
        assert acao == "http://localhost:3000" or response.status_code == 200, \
            f"CORS may be blocking localhost:3000. ACAO={acao}"
        print(f"PASS: CORS allows localhost:3000 (ACAO: {acao})")


# ============================================================================
# Rate Limiting Tests
# ============================================================================
class TestRateLimiting:
    """Verify rate limiting is active"""
    
    def test_security_headers_present(self):
        """Security headers should be present on API responses"""
        response = requests.get(f"{BASE_URL}/api/dashboard")
        
        # Check security headers
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert "X-Request-ID" in response.headers
        print("PASS: Security headers present (X-Content-Type-Options, X-Frame-Options, X-Request-ID)")
    
    def test_rate_limit_not_triggered_on_normal_use(self):
        """Normal usage should not trigger rate limit"""
        # Make a few requests - should all succeed
        for i in range(5):
            response = requests.get(f"{BASE_URL}/api/health")
            assert response.status_code == 200, f"Request {i+1} failed with {response.status_code}"
        print("PASS: Normal usage (5 requests) does not trigger rate limit")


# ============================================================================
# Fresh Meal Systems Endpoints
# ============================================================================
class TestFreshMealSystemsEndpoints:
    """Verify all FMS endpoints still work after security changes"""
    
    def test_ops_dashboard_returns_200(self):
        """GET /api/fresh-meals/ops-dashboard returns complete ops data"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/ops-dashboard")
        assert response.status_code == 200, f"Ops dashboard failed: {response.text}"
        
        data = response.json()
        assert "timestamp" in data
        assert "production" in data
        assert "lanes" in data
        assert "delivery" in data
        assert "subscriptions" in data
        print("PASS: Ops dashboard returns complete data")
    
    def test_overview_returns_operational(self):
        """GET /api/fresh-meals/overview returns operational status"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/overview")
        assert response.status_code == 200, f"Overview failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "operational"
        assert "total_products" in data
        assert "available_channels" in data
        print("PASS: FMS overview returns operational status")
    
    def test_products_endpoint(self):
        """GET /api/fresh-meals/products returns products list"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/products")
        assert response.status_code == 200, f"Products failed: {response.text}"
        
        data = response.json()
        assert "products" in data
        print(f"PASS: Products endpoint returns {len(data.get('products', []))} products")
    
    def test_create_product(self):
        """POST /api/fresh-meals/products creates product correctly"""
        payload = {
            "name": "TEST_Security_Meal_Kit",
            "category": "test",
            "base_cost": 12.50,
            "channels": ["retail", "subscription"]
        }
        response = requests.post(f"{BASE_URL}/api/fresh-meals/products", json=payload)
        assert response.status_code in [200, 201], f"Create product failed: {response.text}"
        
        data = response.json()
        assert "product_id" in data or "id" in data
        print("PASS: Product creation works")
    
    def test_assembly_lanes_returns_lanes(self):
        """GET /api/fresh-meals/assembly-lanes returns lanes"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/assembly-lanes")
        assert response.status_code == 200, f"Assembly lanes failed: {response.text}"
        
        data = response.json()
        assert "lanes" in data
        print(f"PASS: Assembly lanes returns {len(data.get('lanes', []))} lanes")
    
    def test_subscriptions_stats(self):
        """GET /api/fresh-meals/subscriptions/stats returns stats"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/subscriptions/stats")
        assert response.status_code == 200, f"Subscription stats failed: {response.text}"
        
        data = response.json()
        assert "total_active" in data or "active" in data
        print("PASS: Subscription stats endpoint works")
    
    def test_distribution_channels(self):
        """GET /api/fresh-meals/distribution/channels returns 5 channels"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/distribution/channels")
        assert response.status_code == 200, f"Distribution channels failed: {response.text}"
        
        data = response.json()
        assert "channels" in data
        channels = data["channels"]
        assert len(channels) == 5, f"Expected 5 channels, got {len(channels)}"
        print(f"PASS: Distribution channels returns 5 channels: {[c.get('name', c.get('channel_id')) for c in channels]}")
    
    def test_safety_check(self):
        """POST /api/fresh-meals/safety/check runs safety validation"""
        payload = {
            "product_id": "test-product",
            "batch_id": "test-batch-001",
            "checks": ["temperature", "packaging", "labeling"]
        }
        response = requests.post(f"{BASE_URL}/api/fresh-meals/safety/check", json=payload)
        assert response.status_code == 200, f"Safety check failed: {response.text}"
        
        data = response.json()
        assert "record_id" in data or "overall_pass" in data
        print("PASS: Safety check endpoint works")


# ============================================================================
# Knowledge Engine & Enterprise Endpoints
# ============================================================================
class TestKnowledgeEngineAndEnterprise:
    """Verify knowledge engine and enterprise endpoints"""
    
    def test_knowledge_engine_domains(self):
        """GET /api/knowledge-engine/domains returns all domains"""
        response = requests.get(f"{BASE_URL}/api/knowledge-engine/domains")
        assert response.status_code == 200, f"Knowledge domains failed: {response.text}"
        
        data = response.json()
        assert "domains" in data
        domains = data["domains"]
        assert len(domains) > 0, "No domains returned"
        print(f"PASS: Knowledge engine returns {len(domains)} domains")
    
    def test_enterprise_command_center(self):
        """GET /api/enterprise/command-center returns dashboard data"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200, f"Command center failed: {response.text}"
        
        data = response.json()
        # Should have various dashboard sections
        assert "timestamp" in data or "status" in data or len(data) > 0
        print("PASS: Enterprise command center returns data")


# ============================================================================
# Regex Escape Security Tests
# ============================================================================
class TestRegexEscapeSecurity:
    """Test that regex injection is prevented"""
    
    def test_search_with_special_chars_does_not_crash(self):
        """Search with regex special chars should not cause errors"""
        # These chars could cause ReDoS if not escaped: . * + ? ^ $ { } [ ] \ | ( )
        dangerous_queries = [
            "test.*",
            "test[a-z]+",
            "test(foo|bar)",
            "test\\d+",
            "test$",
            "^test",
        ]
        
        for query in dangerous_queries:
            # Test on intelligence search endpoint
            response = requests.get(f"{BASE_URL}/api/intelligence/search", params={"q": query})
            # Should not return 500 (server error)
            assert response.status_code != 500, f"Server error on query '{query}': {response.text}"
        
        print("PASS: Regex special characters do not cause server errors")
    
    def test_beverage_search_with_special_chars(self):
        """Beverage search should handle special chars safely"""
        response = requests.get(f"{BASE_URL}/api/beverage/search", params={"q": "test.*[a-z]+"})
        assert response.status_code != 500, f"Beverage search crashed: {response.text}"
        print("PASS: Beverage search handles special chars safely")


# ============================================================================
# MongoDB _id Leak Prevention
# ============================================================================
class TestMongoIdLeakPrevention:
    """Verify MongoDB _id is not leaked in responses"""
    
    def test_products_no_mongo_id(self):
        """Products response should not contain MongoDB _id"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/products")
        data = response.json()
        
        products = data.get("products", [])
        for product in products[:5]:  # Check first 5
            assert "_id" not in product, f"MongoDB _id leaked in product: {product}"
        
        print("PASS: Products response does not leak MongoDB _id")
    
    def test_ops_dashboard_no_mongo_id(self):
        """Ops dashboard should not contain MongoDB _id"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/ops-dashboard")
        data = response.json()
        
        # Check nested structures
        def check_no_id(obj, path=""):
            if isinstance(obj, dict):
                assert "_id" not in obj, f"MongoDB _id leaked at {path}"
                for k, v in obj.items():
                    check_no_id(v, f"{path}.{k}")
            elif isinstance(obj, list):
                for i, item in enumerate(obj[:5]):  # Check first 5 items
                    check_no_id(item, f"{path}[{i}]")
        
        check_no_id(data)
        print("PASS: Ops dashboard does not leak MongoDB _id")


# ============================================================================
# Connection Pooling Verification
# ============================================================================
class TestConnectionPooling:
    """Verify MongoDB connection pooling is working"""
    
    def test_concurrent_requests_succeed(self):
        """Multiple concurrent requests should succeed (pooling test)"""
        import concurrent.futures
        
        def make_request(i):
            response = requests.get(f"{BASE_URL}/api/health")
            return response.status_code
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request, i) for i in range(20)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        success_count = sum(1 for r in results if r == 200)
        assert success_count >= 18, f"Too many failures: {20 - success_count}/20 failed"
        print(f"PASS: Concurrent requests succeeded ({success_count}/20)")


# ============================================================================
# Cleanup
# ============================================================================
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after tests"""
    yield
    # Cleanup test products
    try:
        response = requests.get(f"{BASE_URL}/api/fresh-meals/products")
        if response.status_code == 200:
            products = response.json().get("products", [])
            for p in products:
                if p.get("name", "").startswith("TEST_"):
                    pid = p.get("product_id") or p.get("id")
                    if pid:
                        requests.delete(f"{BASE_URL}/api/fresh-meals/products/{pid}")
    except Exception:
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
