"""
Iteration 39 - Phase 3A Features Testing
Tests for:
1. Communications Hub (Outlook, Gmail, Teams integration APIs)
2. Yield Alerts (automated threshold monitoring)
3. District Benchmarking (enterprise-wide site comparison)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ═══════════════════════════════════════════════════════
# COMMUNICATIONS HUB - Integration Status
# ═══════════════════════════════════════════════════════

class TestCommunicationsHubStatus:
    """Test integration status endpoint"""
    
    def test_integration_status_returns_200(self, api_client):
        """GET /api/integrations/status returns 200"""
        response = api_client.get(f"{BASE_URL}/api/integrations/status")
        assert response.status_code == 200
        
    def test_integration_status_has_3_services(self, api_client):
        """Status returns outlook, gmail, teams"""
        response = api_client.get(f"{BASE_URL}/api/integrations/status")
        data = response.json()
        assert "integrations" in data
        assert len(data["integrations"]) == 3
        services = [i["service"] for i in data["integrations"]]
        assert "outlook" in services
        assert "gmail" in services
        assert "teams" in services
        
    def test_integration_status_structure(self, api_client):
        """Each integration has required fields"""
        response = api_client.get(f"{BASE_URL}/api/integrations/status")
        data = response.json()
        for integration in data["integrations"]:
            assert "service" in integration
            assert "status" in integration
            assert "label" in integration
            assert "features" in integration
            assert isinstance(integration["features"], list)


# ═══════════════════════════════════════════════════════
# COMMUNICATIONS HUB - Outlook Endpoints
# ═══════════════════════════════════════════════════════

class TestOutlookIntegration:
    """Test Outlook email and calendar endpoints"""
    
    def test_outlook_emails_returns_200(self, api_client):
        """GET /api/integrations/outlook/emails returns 200"""
        response = api_client.get(f"{BASE_URL}/api/integrations/outlook/emails")
        assert response.status_code == 200
        
    def test_outlook_emails_has_7_emails(self, api_client):
        """Returns 7 hospitality-themed demo emails"""
        response = api_client.get(f"{BASE_URL}/api/integrations/outlook/emails")
        data = response.json()
        assert "emails" in data
        assert len(data["emails"]) == 7
        assert "unreadCount" in data
        assert "total" in data
        assert data["total"] == 7
        
    def test_outlook_email_structure(self, api_client):
        """Each email has required fields"""
        response = api_client.get(f"{BASE_URL}/api/integrations/outlook/emails")
        data = response.json()
        for email in data["emails"]:
            assert "id" in email
            assert "from" in email
            assert "subject" in email
            assert "timestamp" in email
            assert "isUnread" in email
            assert "bodyPreview" in email
            
    def test_outlook_calendar_returns_200(self, api_client):
        """GET /api/integrations/outlook/calendar returns 200"""
        response = api_client.get(f"{BASE_URL}/api/integrations/outlook/calendar")
        assert response.status_code == 200
        
    def test_outlook_calendar_has_events(self, api_client):
        """Returns calendar events"""
        response = api_client.get(f"{BASE_URL}/api/integrations/outlook/calendar")
        data = response.json()
        assert "events" in data
        assert len(data["events"]) >= 1
        assert "total" in data
        
    def test_outlook_send_returns_success(self, api_client):
        """POST /api/integrations/outlook/send returns success"""
        response = api_client.post(
            f"{BASE_URL}/api/integrations/outlook/send",
            json={"to": "test@example.com", "subject": "Test", "body": "Test body"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "message_id" in data


# ═══════════════════════════════════════════════════════
# COMMUNICATIONS HUB - Gmail Endpoints
# ═══════════════════════════════════════════════════════

class TestGmailIntegration:
    """Test Gmail email and labels endpoints"""
    
    def test_gmail_emails_returns_200(self, api_client):
        """GET /api/integrations/gmail/emails returns 200"""
        response = api_client.get(f"{BASE_URL}/api/integrations/gmail/emails")
        assert response.status_code == 200
        
    def test_gmail_emails_has_5_emails(self, api_client):
        """Returns 5 demo emails"""
        response = api_client.get(f"{BASE_URL}/api/integrations/gmail/emails")
        data = response.json()
        assert "emails" in data
        assert len(data["emails"]) == 5
        assert "unreadCount" in data
        assert "total" in data
        
    def test_gmail_labels_returns_200(self, api_client):
        """GET /api/integrations/gmail/labels returns 200"""
        response = api_client.get(f"{BASE_URL}/api/integrations/gmail/labels")
        assert response.status_code == 200
        
    def test_gmail_labels_structure(self, api_client):
        """Returns labels with proper structure"""
        response = api_client.get(f"{BASE_URL}/api/integrations/gmail/labels")
        data = response.json()
        assert "labels" in data
        assert len(data["labels"]) >= 3
        for label in data["labels"]:
            assert "id" in label
            assert "name" in label


# ═══════════════════════════════════════════════════════
# COMMUNICATIONS HUB - Teams Endpoints
# ═══════════════════════════════════════════════════════

class TestTeamsIntegration:
    """Test Teams chat and channel endpoints"""
    
    def test_teams_chats_returns_200(self, api_client):
        """GET /api/integrations/teams/chats returns 200"""
        response = api_client.get(f"{BASE_URL}/api/integrations/teams/chats")
        assert response.status_code == 200
        
    def test_teams_chats_has_6_chats(self, api_client):
        """Returns 6 demo chats"""
        response = api_client.get(f"{BASE_URL}/api/integrations/teams/chats")
        data = response.json()
        assert "chats" in data
        assert len(data["chats"]) == 6
        assert "totalUnread" in data
        assert "total" in data
        
    def test_teams_chat_structure(self, api_client):
        """Each chat has required fields"""
        response = api_client.get(f"{BASE_URL}/api/integrations/teams/chats")
        data = response.json()
        for chat in data["chats"]:
            assert "id" in chat
            assert "name" in chat
            assert "lastMessage" in chat
            assert "timestamp" in chat
            assert "unreadCount" in chat
            
    def test_teams_channels_returns_200(self, api_client):
        """GET /api/integrations/teams/channels returns 200"""
        response = api_client.get(f"{BASE_URL}/api/integrations/teams/channels")
        assert response.status_code == 200
        
    def test_teams_channels_structure(self, api_client):
        """Returns channels with proper structure"""
        response = api_client.get(f"{BASE_URL}/api/integrations/teams/channels")
        data = response.json()
        assert "channels" in data
        assert len(data["channels"]) >= 3
        for channel in data["channels"]:
            assert "id" in channel
            assert "displayName" in channel
            
    def test_teams_send_returns_success(self, api_client):
        """POST /api/integrations/teams/send returns success"""
        response = api_client.post(
            f"{BASE_URL}/api/integrations/teams/send",
            json={"chatId": "tc-1", "message": "Test message"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "message_id" in data


# ═══════════════════════════════════════════════════════
# YIELD ALERTS - Rules CRUD
# ═══════════════════════════════════════════════════════

class TestYieldAlertRules:
    """Test alert rules CRUD operations"""
    
    def test_rules_returns_200(self, api_client):
        """GET /api/alerts/rules returns 200"""
        response = api_client.get(f"{BASE_URL}/api/alerts/rules")
        assert response.status_code == 200
        
    def test_rules_has_default_rules(self, api_client):
        """Returns at least 4 default rules"""
        response = api_client.get(f"{BASE_URL}/api/alerts/rules")
        data = response.json()
        assert "rules" in data
        assert len(data["rules"]) >= 4
        assert "total" in data
        
    def test_rules_have_severity_levels(self, api_client):
        """Rules have critical, warning, info severity"""
        response = api_client.get(f"{BASE_URL}/api/alerts/rules")
        data = response.json()
        severities = [r["severity"] for r in data["rules"]]
        assert "critical" in severities or "warning" in severities or "info" in severities
        
    def test_rule_structure(self, api_client):
        """Each rule has required fields"""
        response = api_client.get(f"{BASE_URL}/api/alerts/rules")
        data = response.json()
        for rule in data["rules"]:
            assert "rule_id" in rule
            assert "name" in rule
            assert "metric" in rule
            assert "operator" in rule
            assert "threshold" in rule
            assert "severity" in rule
            assert "enabled" in rule
            
    def test_create_rule(self, api_client):
        """POST /api/alerts/rules creates new rule"""
        response = api_client.post(
            f"{BASE_URL}/api/alerts/rules",
            json={
                "name": "TEST_Custom Alert Rule",
                "metric": "food_cost_pct",
                "operator": "gt",
                "threshold": 0.45,
                "severity": "warning",
                "description": "Test rule for iteration 39"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "rule_id" in data
        assert data["name"] == "TEST_Custom Alert Rule"
        assert data["threshold"] == 0.45
        return data["rule_id"]
        
    def test_update_rule_toggle_enabled(self, api_client):
        """PUT /api/alerts/rules/{id} toggles enabled"""
        # First get a rule
        rules_response = api_client.get(f"{BASE_URL}/api/alerts/rules")
        rules = rules_response.json()["rules"]
        test_rule = next((r for r in rules if "TEST_" in r.get("name", "")), rules[0])
        rule_id = test_rule["rule_id"]
        original_enabled = test_rule["enabled"]
        
        # Toggle enabled
        response = api_client.put(
            f"{BASE_URL}/api/alerts/rules/{rule_id}",
            json={"enabled": not original_enabled}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] == (not original_enabled)
        
        # Toggle back
        api_client.put(
            f"{BASE_URL}/api/alerts/rules/{rule_id}",
            json={"enabled": original_enabled}
        )
        
    def test_delete_rule(self, api_client):
        """DELETE /api/alerts/rules/{id} deletes rule"""
        # Create a rule to delete
        create_response = api_client.post(
            f"{BASE_URL}/api/alerts/rules",
            json={"name": "TEST_ToDelete", "metric": "food_cost_pct", "threshold": 0.5}
        )
        rule_id = create_response.json()["rule_id"]
        
        # Delete it
        response = api_client.delete(f"{BASE_URL}/api/alerts/rules/{rule_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["deleted"] is True


# ═══════════════════════════════════════════════════════
# YIELD ALERTS - Evaluation & History
# ═══════════════════════════════════════════════════════

class TestYieldAlertEvaluation:
    """Test alert evaluation and history"""
    
    def test_evaluate_returns_200(self, api_client):
        """POST /api/alerts/evaluate returns 200"""
        response = api_client.post(f"{BASE_URL}/api/alerts/evaluate")
        assert response.status_code == 200
        
    def test_evaluate_returns_results(self, api_client):
        """Evaluation returns rules checked and alerts triggered"""
        response = api_client.post(f"{BASE_URL}/api/alerts/evaluate")
        data = response.json()
        assert "evaluated_rules" in data
        assert "alerts_triggered" in data
        assert "alerts" in data
        assert data["evaluated_rules"] >= 1
        
    def test_history_returns_200(self, api_client):
        """GET /api/alerts/history returns 200"""
        response = api_client.get(f"{BASE_URL}/api/alerts/history")
        assert response.status_code == 200
        
    def test_history_structure(self, api_client):
        """History returns alerts array"""
        response = api_client.get(f"{BASE_URL}/api/alerts/history")
        data = response.json()
        assert "alerts" in data
        assert "total" in data
        
    def test_summary_returns_200(self, api_client):
        """GET /api/alerts/summary returns 200"""
        response = api_client.get(f"{BASE_URL}/api/alerts/summary")
        assert response.status_code == 200
        
    def test_summary_has_counts(self, api_client):
        """Summary has active/acknowledged/resolved counts"""
        response = api_client.get(f"{BASE_URL}/api/alerts/summary")
        data = response.json()
        assert "total" in data
        assert "active" in data
        assert "acknowledged" in data
        assert "resolved" in data
        assert "by_severity" in data
        assert "critical" in data["by_severity"]
        assert "warning" in data["by_severity"]
        assert "info" in data["by_severity"]


class TestYieldAlertActions:
    """Test alert acknowledge and resolve actions"""
    
    def test_acknowledge_alert(self, api_client):
        """PUT /api/alerts/history/{id}/acknowledge works"""
        # Get an active alert
        history = api_client.get(f"{BASE_URL}/api/alerts/history?status=active").json()
        if history["alerts"]:
            alert_id = history["alerts"][0]["alert_id"]
            response = api_client.put(f"{BASE_URL}/api/alerts/history/{alert_id}/acknowledge")
            assert response.status_code == 200
            data = response.json()
            assert data["acknowledged"] is True
        else:
            pytest.skip("No active alerts to acknowledge")
            
    def test_resolve_alert(self, api_client):
        """PUT /api/alerts/history/{id}/resolve works"""
        # Get an acknowledged alert
        history = api_client.get(f"{BASE_URL}/api/alerts/history?status=acknowledged").json()
        if history["alerts"]:
            alert_id = history["alerts"][0]["alert_id"]
            response = api_client.put(f"{BASE_URL}/api/alerts/history/{alert_id}/resolve")
            assert response.status_code == 200
            data = response.json()
            assert data["resolved"] is True
        else:
            pytest.skip("No acknowledged alerts to resolve")


# ═══════════════════════════════════════════════════════
# DISTRICT BENCHMARKING - Sites
# ═══════════════════════════════════════════════════════

class TestDistrictBenchmarkingSites:
    """Test site benchmarking endpoint"""
    
    def test_sites_returns_200(self, api_client):
        """GET /api/benchmarking/sites returns 200"""
        response = api_client.get(f"{BASE_URL}/api/benchmarking/sites")
        assert response.status_code == 200
        
    def test_sites_has_properties(self, api_client):
        """Returns multiple properties"""
        response = api_client.get(f"{BASE_URL}/api/benchmarking/sites")
        data = response.json()
        assert "sites" in data
        assert len(data["sites"]) >= 5
        assert "total_properties" in data
        assert "total_outlets" in data
        
    def test_sites_has_enterprise_summary(self, api_client):
        """Returns enterprise-wide summary"""
        response = api_client.get(f"{BASE_URL}/api/benchmarking/sites")
        data = response.json()
        assert "enterprise_summary" in data
        summary = data["enterprise_summary"]
        assert "total_revenue" in summary
        assert "avg_gross_margin" in summary
        assert "avg_food_cost_pct" in summary
        assert "avg_satisfaction" in summary
        
    def test_site_metrics_structure(self, api_client):
        """Each site has required metrics"""
        response = api_client.get(f"{BASE_URL}/api/benchmarking/sites")
        data = response.json()
        for site in data["sites"]:
            assert "property_id" in site
            assert "name" in site
            assert "metrics" in site
            metrics = site["metrics"]
            assert "monthly_revenue" in metrics
            assert "food_cost_pct" in metrics
            assert "gross_margin" in metrics
            assert "daily_covers" in metrics
            assert "guest_satisfaction" in metrics
            
    def test_sites_have_rankings(self, api_client):
        """Sites have ranking data"""
        response = api_client.get(f"{BASE_URL}/api/benchmarking/sites")
        data = response.json()
        for site in data["sites"]:
            assert "rankings" in site
            rankings = site["rankings"]
            assert "revenue" in rankings
            assert "margin" in rankings


# ═══════════════════════════════════════════════════════
# DISTRICT BENCHMARKING - Heatmap
# ═══════════════════════════════════════════════════════

class TestDistrictBenchmarkingHeatmap:
    """Test heatmap endpoint"""
    
    def test_heatmap_returns_200(self, api_client):
        """GET /api/benchmarking/heatmap returns 200"""
        response = api_client.get(f"{BASE_URL}/api/benchmarking/heatmap?metric=food_cost_pct")
        assert response.status_code == 200
        
    def test_heatmap_has_cells(self, api_client):
        """Returns heat map cells"""
        response = api_client.get(f"{BASE_URL}/api/benchmarking/heatmap?metric=food_cost_pct")
        data = response.json()
        assert "cells" in data
        assert len(data["cells"]) >= 5
        assert "metric" in data
        assert "min" in data
        assert "max" in data
        assert "enterprise_avg" in data
        
    def test_heatmap_cell_structure(self, api_client):
        """Each cell has required fields"""
        response = api_client.get(f"{BASE_URL}/api/benchmarking/heatmap?metric=food_cost_pct")
        data = response.json()
        for cell in data["cells"]:
            assert "property_id" in cell
            assert "name" in cell
            assert "value" in cell
            assert "heat" in cell
            assert 0 <= cell["heat"] <= 1
            
    def test_heatmap_different_metrics(self, api_client):
        """Heatmap works with different metrics"""
        metrics = ["food_cost_pct", "gross_margin", "waste_pct", "guest_satisfaction"]
        for metric in metrics:
            response = api_client.get(f"{BASE_URL}/api/benchmarking/heatmap?metric={metric}")
            assert response.status_code == 200
            data = response.json()
            assert data["metric"] == metric


# ═══════════════════════════════════════════════════════
# DISTRICT BENCHMARKING - Snapshots
# ═══════════════════════════════════════════════════════

class TestDistrictBenchmarkingSnapshots:
    """Test snapshot and history endpoints"""
    
    def test_snapshot_creates_record(self, api_client):
        """POST /api/benchmarking/snapshot creates snapshot"""
        response = api_client.post(f"{BASE_URL}/api/benchmarking/snapshot")
        assert response.status_code == 200
        data = response.json()
        assert "snapshot_id" in data
        assert "date" in data
        assert "total_properties" in data
        assert "enterprise_summary" in data
        assert "sites" in data
        
    def test_history_returns_200(self, api_client):
        """GET /api/benchmarking/history returns 200"""
        response = api_client.get(f"{BASE_URL}/api/benchmarking/history")
        assert response.status_code == 200
        
    def test_history_has_snapshots(self, api_client):
        """History returns snapshots array"""
        response = api_client.get(f"{BASE_URL}/api/benchmarking/history")
        data = response.json()
        assert "snapshots" in data
        assert "total" in data
        # Should have at least 1 from our test
        assert len(data["snapshots"]) >= 1


# ═══════════════════════════════════════════════════════
# CLEANUP
# ═══════════════════════════════════════════════════════

class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_rules(self, api_client):
        """Remove TEST_ prefixed rules"""
        rules_response = api_client.get(f"{BASE_URL}/api/alerts/rules")
        rules = rules_response.json()["rules"]
        for rule in rules:
            if "TEST_" in rule.get("name", ""):
                api_client.delete(f"{BASE_URL}/api/alerts/rules/{rule['rule_id']}")
        assert True  # Cleanup complete
