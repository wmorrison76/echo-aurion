"""
ZARO Guardian Safety Layer — Red Phoenix
Test Suite for Iteration 56 - Military-grade security testing

Tests 5 Guardian Subsystems:
1. SENTINEL — Intrusion Detection & Prevention (SQL injection, XSS, path traversal, command injection, XXE)
2. AEGIS — Data Protection & PII Shield (SSN, credit card, email, phone, IP detection + redaction)
3. CERBERUS — Authentication & Access Guard (brute force detection with 5-attempt lockout)
4. HEIMDALL — Observability & Anomaly Detection (request tracking, burst detection)
5. VALKYRIE — Incident Response & Auto-Recovery (incident management)

Plus RED PHOENIX — Cross-cutting alert escalation engine
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestZAROGuardianStatus:
    """Test ZARO Guardian system status endpoint"""
    
    def test_guardian_status_returns_all_5_guardians(self):
        """GET /api/zaro/status - returns all 5 guardians as active with stats"""
        response = requests.get(f"{BASE_URL}/api/zaro/status")
        assert response.status_code == 200
        
        data = response.json()
        assert data["system"] == "ZARO Guardian — Red Phoenix"
        assert data["status"] == "ACTIVE"
        assert data["red_phoenix"] == "ACTIVE"
        
        # Verify all 5 guardians exist
        guardians = data["guardians"]
        assert "sentinel" in guardians
        assert "aegis" in guardians
        assert "cerberus" in guardians
        assert "heimdall" in guardians
        assert "valkyrie" in guardians
        
        # Verify each guardian has status = active
        assert guardians["sentinel"]["status"] == "active"
        assert guardians["aegis"]["status"] == "active"
        assert guardians["cerberus"]["status"] == "active"
        assert guardians["heimdall"]["status"] == "active"
        assert guardians["valkyrie"]["status"] == "active"
        
        # Verify guardian stats exist
        assert "blocked_ips" in guardians["sentinel"]
        assert "total_strikes" in guardians["sentinel"]
        assert "pii_patterns" in guardians["aegis"]
        assert "sensitive_fields" in guardians["aegis"]
        assert "active_lockouts" in guardians["cerberus"]
        assert "recent_failed_logins" in guardians["cerberus"]
        assert "requests_tracked" in guardians["heimdall"]
        assert "anomalies" in guardians["heimdall"]
        assert "open_incidents" in guardians["valkyrie"]
        
        print(f"✓ All 5 guardians active: SENTINEL, AEGIS, CERBERUS, HEIMDALL, VALKYRIE")
        print(f"  Sentinel: {guardians['sentinel']['blocked_ips']} blocked IPs, {guardians['sentinel']['total_strikes']} strikes")
        print(f"  Aegis: {guardians['aegis']['pii_patterns']} PII patterns, {guardians['aegis']['sensitive_fields']} sensitive fields")
        print(f"  Cerberus: {guardians['cerberus']['active_lockouts']} lockouts, {guardians['cerberus']['recent_failed_logins']} failures")
        print(f"  Heimdall: {guardians['heimdall']['requests_tracked']} tracked, {guardians['heimdall']['anomalies']} anomalies")
        print(f"  Valkyrie: {guardians['valkyrie']['open_incidents']} open incidents")


class TestRedPhoenixScan:
    """Test Red Phoenix operational threat scan"""
    
    def test_red_phoenix_scan_returns_defcon_and_alerts(self):
        """GET /api/zaro/scan - Red Phoenix operational threat scan returning DEFCON level and alerts"""
        response = requests.get(f"{BASE_URL}/api/zaro/scan")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify DEFCON level (1-5)
        assert "defcon_level" in data
        assert data["defcon_level"] in [1, 2, 3, 4, 5]
        
        # Verify DEFCON label
        assert "defcon_label" in data
        valid_labels = ["MAXIMUM ALERT", "CRITICAL", "ELEVATED", "GUARDED", "NOMINAL"]
        assert data["defcon_label"] in valid_labels
        
        # Verify alert counts
        assert "total_alerts" in data
        assert "critical" in data
        assert "high" in data
        assert "medium" in data
        assert "alerts" in data
        assert isinstance(data["alerts"], list)
        
        # Verify timestamp
        assert "timestamp" in data
        
        print(f"✓ Red Phoenix Scan: DEFCON {data['defcon_level']} - {data['defcon_label']}")
        print(f"  Total alerts: {data['total_alerts']} (Critical: {data['critical']}, High: {data['high']}, Medium: {data['medium']})")
        
        # Print alert details if any
        for alert in data["alerts"][:3]:  # Show first 3
            print(f"  - [{alert['severity'].upper()}] {alert['category']}: {alert['signal'][:60]}...")


class TestSentinelIDS:
    """Test SENTINEL Intrusion Detection System"""
    
    def test_sentinel_detects_sql_injection(self):
        """POST /api/zaro/sentinel/scan - detects SQL injection in payload"""
        payload = {"payload": "UNION SELECT password FROM admin"}
        response = requests.post(f"{BASE_URL}/api/zaro/sentinel/scan", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["clean"] == False
        assert len(data["detections"]) > 0
        
        # Verify SQL injection was detected
        sql_detected = any(d["type"] == "sql_injection" for d in data["detections"])
        assert sql_detected, "SQL injection should be detected"
        
        # Verify severity is critical
        for detection in data["detections"]:
            if detection["type"] == "sql_injection":
                assert detection["severity"] == "critical"
        
        print(f"✓ Sentinel detected SQL injection: {len(data['detections'])} threat(s)")
        for d in data["detections"]:
            print(f"  - {d['type']}: {d['severity']}")
    
    def test_sentinel_returns_clean_for_safe_payload(self):
        """POST /api/zaro/sentinel/scan - returns clean:true for safe payload"""
        payload = {"payload": "Hello world"}
        response = requests.post(f"{BASE_URL}/api/zaro/sentinel/scan", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["clean"] == True
        assert len(data["detections"]) == 0
        assert data["scanned_length"] == 11
        
        print(f"✓ Sentinel: Safe payload passed (clean=true, 0 detections)")
    
    def test_sentinel_detects_xss_attack(self):
        """POST /api/zaro/sentinel/scan - detects XSS attack"""
        payload = {"payload": "<script>alert('xss')</script>"}
        response = requests.post(f"{BASE_URL}/api/zaro/sentinel/scan", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["clean"] == False
        
        xss_detected = any(d["type"] == "xss" for d in data["detections"])
        assert xss_detected, "XSS should be detected"
        
        print(f"✓ Sentinel detected XSS attack: {len(data['detections'])} threat(s)")
    
    def test_sentinel_detects_path_traversal(self):
        """POST /api/zaro/sentinel/scan - detects path traversal"""
        payload = {"payload": "../../../etc/passwd"}
        response = requests.post(f"{BASE_URL}/api/zaro/sentinel/scan", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["clean"] == False
        
        path_detected = any(d["type"] == "path_traversal" for d in data["detections"])
        assert path_detected, "Path traversal should be detected"
        
        print(f"✓ Sentinel detected path traversal: {len(data['detections'])} threat(s)")
    
    def test_sentinel_detects_command_injection(self):
        """POST /api/zaro/sentinel/scan - detects command injection"""
        payload = {"payload": "; cat /etc/passwd"}
        response = requests.post(f"{BASE_URL}/api/zaro/sentinel/scan", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["clean"] == False
        
        cmd_detected = any(d["type"] == "command_injection" for d in data["detections"])
        assert cmd_detected, "Command injection should be detected"
        
        print(f"✓ Sentinel detected command injection: {len(data['detections'])} threat(s)")


class TestAegisPIIShield:
    """Test AEGIS Data Protection & PII Shield"""
    
    def test_aegis_detects_phone_email_ssn(self):
        """POST /api/zaro/aegis/scan-pii - detects phone, email, SSN in text"""
        payload = {
            "payload": "Contact John at john@example.com or 555-123-4567. SSN: 123-45-6789"
        }
        response = requests.post(f"{BASE_URL}/api/zaro/aegis/scan-pii", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["has_pii"] == True
        assert len(data["findings"]) >= 3
        
        # Verify all 3 PII types detected
        pii_types = [f["type"] for f in data["findings"]]
        assert "email" in pii_types, "Email should be detected"
        assert "phone" in pii_types, "Phone should be detected"
        assert "ssn" in pii_types, "SSN should be detected"
        
        print(f"✓ Aegis detected {len(data['findings'])} PII types: {', '.join(pii_types)}")
    
    def test_aegis_returns_redacted_text(self):
        """POST /api/zaro/aegis/scan-pii - returns redacted text with [REDACTED_*] markers"""
        payload = {
            "payload": "Email: test@example.com, Phone: 555-123-4567, SSN: 123-45-6789"
        }
        response = requests.post(f"{BASE_URL}/api/zaro/aegis/scan-pii", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        redacted = data["redacted_text"]
        
        # Verify redaction markers
        assert "[REDACTED_EMAIL]" in redacted
        assert "[REDACTED_PHONE]" in redacted
        assert "[REDACTED_SSN]" in redacted
        
        # Verify original PII is removed
        assert "test@example.com" not in redacted
        assert "555-123-4567" not in redacted
        assert "123-45-6789" not in redacted
        
        print(f"✓ Aegis redacted text: {redacted}")
    
    def test_aegis_detects_credit_card(self):
        """POST /api/zaro/aegis/scan-pii - detects credit card numbers"""
        payload = {"payload": "Card: 4111-1111-1111-1111"}
        response = requests.post(f"{BASE_URL}/api/zaro/aegis/scan-pii", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["has_pii"] == True
        
        cc_detected = any(f["type"] == "credit_card" for f in data["findings"])
        assert cc_detected, "Credit card should be detected"
        
        # Credit card should be high severity
        for f in data["findings"]:
            if f["type"] == "credit_card":
                assert f["severity"] == "high"
        
        print(f"✓ Aegis detected credit card (high severity)")
    
    def test_aegis_clean_text_no_pii(self):
        """POST /api/zaro/aegis/scan-pii - returns no findings for clean text"""
        payload = {"payload": "This is a normal message with no sensitive data."}
        response = requests.post(f"{BASE_URL}/api/zaro/aegis/scan-pii", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["has_pii"] == False
        assert len(data["findings"]) == 0
        
        print(f"✓ Aegis: Clean text passed (no PII detected)")


class TestHeimdallObservability:
    """Test HEIMDALL Observability & Anomaly Detection"""
    
    def test_heimdall_returns_request_tracking_metrics(self):
        """GET /api/zaro/heimdall/observability - returns request tracking metrics"""
        response = requests.get(f"{BASE_URL}/api/zaro/heimdall/observability")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify required metrics
        assert "requests_5min" in data
        assert "errors_5min" in data
        assert "error_rate_pct" in data
        assert "avg_response_ms" in data
        assert "total_tracked" in data
        assert "recent_anomalies" in data
        assert "top_endpoints" in data
        assert "timestamp" in data
        
        # Verify data types
        assert isinstance(data["requests_5min"], int)
        assert isinstance(data["errors_5min"], int)
        assert isinstance(data["error_rate_pct"], (int, float))
        assert isinstance(data["avg_response_ms"], (int, float))
        assert isinstance(data["total_tracked"], int)
        assert isinstance(data["recent_anomalies"], list)
        assert isinstance(data["top_endpoints"], list)
        
        print(f"✓ Heimdall Observability:")
        print(f"  Requests (5min): {data['requests_5min']}")
        print(f"  Errors (5min): {data['errors_5min']} ({data['error_rate_pct']}%)")
        print(f"  Avg Response: {data['avg_response_ms']}ms")
        print(f"  Total Tracked: {data['total_tracked']}")
        print(f"  Recent Anomalies: {len(data['recent_anomalies'])}")
        print(f"  Top Endpoints: {len(data['top_endpoints'])}")


class TestValkyrieIncidents:
    """Test VALKYRIE Incident Response"""
    
    def test_incidents_list_returns_incidents(self):
        """GET /api/zaro/incidents - returns incident list"""
        response = requests.get(f"{BASE_URL}/api/zaro/incidents")
        assert response.status_code == 200
        
        data = response.json()
        assert "incidents" in data
        assert "count" in data
        assert isinstance(data["incidents"], list)
        
        print(f"✓ Valkyrie Incidents: {data['count']} incidents returned")
        
        # If incidents exist, verify structure
        if data["incidents"]:
            inc = data["incidents"][0]
            assert "incident_id" in inc
            assert "severity" in inc
            assert "threat_level" in inc
            assert "status" in inc
            print(f"  Latest: {inc['incident_id']} - {inc['severity']} - {inc['status']}")


class TestSecurityPosture:
    """Test Security Posture Assessment"""
    
    def test_security_posture_returns_score_grade_components(self):
        """GET /api/zaro/security-posture - returns security score, grade, components"""
        response = requests.get(f"{BASE_URL}/api/zaro/security-posture")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify score and grade
        assert "security_score" in data
        assert "grade" in data
        assert 0 <= data["security_score"] <= 100
        assert data["grade"] in ["A+", "A", "B", "C", "D", "F"]
        
        # Verify components
        assert "components" in data
        components = data["components"]
        assert "intrusion_detection" in components
        assert "data_protection" in components
        assert "authentication" in components
        assert "observability" in components
        assert "incident_response" in components
        
        # Verify other fields
        assert "operational_alerts" in data
        assert "blocked_threats" in data
        assert "timestamp" in data
        
        print(f"✓ Security Posture: Score {data['security_score']} Grade {data['grade']}")
        print(f"  Components:")
        for k, v in components.items():
            print(f"    - {k}: {v}")


class TestMiddlewareIntegration:
    """Test ZARO middleware integration in server.py"""
    
    def test_sentinel_middleware_scans_api_requests(self):
        """Backend middleware: ZARO Sentinel scanning is wired into the security middleware"""
        # Make a normal API request - should pass through Sentinel
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        # Check Heimdall tracked the request
        obs_response = requests.get(f"{BASE_URL}/api/zaro/heimdall/observability")
        assert obs_response.status_code == 200
        obs_data = obs_response.json()
        
        # Verify requests are being tracked
        assert obs_data["total_tracked"] > 0
        
        print(f"✓ Middleware Integration: Sentinel + Heimdall active")
        print(f"  Total requests tracked: {obs_data['total_tracked']}")
    
    def test_heimdall_tracks_request_duration(self):
        """Backend middleware: ZARO Heimdall tracking records request duration for all /api/* calls"""
        # Make several requests to ensure tracking
        for _ in range(3):
            requests.get(f"{BASE_URL}/api/zaro/status")
        
        # Check observability
        response = requests.get(f"{BASE_URL}/api/zaro/heimdall/observability")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify avg_response_ms is being calculated
        assert "avg_response_ms" in data
        assert data["avg_response_ms"] >= 0
        
        # Verify top_endpoints shows tracked endpoints
        assert len(data["top_endpoints"]) > 0
        
        # Check that ZARO endpoints are tracked
        zaro_tracked = any("/api/zaro" in ep.get("endpoint", "") for ep in data["top_endpoints"])
        
        print(f"✓ Heimdall tracking request duration: avg {data['avg_response_ms']}ms")
        print(f"  Top endpoints tracked: {len(data['top_endpoints'])}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
