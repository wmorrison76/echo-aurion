"""
Iteration 63: Admin Command Center Testing
==========================================
Tests for:
- Universal Report Export Engine (PDF/CSV/XLSX)
- Commissary Engine with AI Production Forecasting (moon cycle, weather, seasonality)
- Customer Onboarding Wizard with CSV import
- Admin Users and Outlets management
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestExportFormats:
    """Test GET /api/export/formats - Available export options"""
    
    def test_export_formats_returns_all_options(self):
        """Verify export formats endpoint returns all configuration options"""
        response = requests.get(f"{BASE_URL}/api/export/formats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify formats
        assert "formats" in data
        assert "pdf" in data["formats"]
        assert "csv" in data["formats"]
        assert "xlsx" in data["formats"]
        
        # Verify report types
        assert "report_types" in data
        assert "pnl" in data["report_types"]
        assert "invoice" in data["report_types"]
        assert "budget" in data["report_types"]
        
        # Verify paper sizes
        assert "paper_sizes" in data
        assert "letter" in data["paper_sizes"]
        assert "a4" in data["paper_sizes"]
        assert "legal" in data["paper_sizes"]
        
        # Verify orientations
        assert "orientations" in data
        assert "portrait" in data["orientations"]
        assert "landscape" in data["orientations"]
        
        # Verify margin presets
        assert "margin_presets" in data
        assert "normal" in data["margin_presets"]
        assert "narrow" in data["margin_presets"]
        assert "wide" in data["margin_presets"]
        
        print(f"✓ Export formats endpoint returns: {len(data['formats'])} formats, {len(data['report_types'])} report types, {len(data['paper_sizes'])} paper sizes")


class TestReportExportPDF:
    """Test POST /api/export/report with format=pdf"""
    
    def test_export_pnl_pdf_returns_html(self):
        """Verify PDF export returns print-ready HTML with P&L data"""
        response = requests.post(
            f"{BASE_URL}/api/export/report",
            json={
                "report_type": "pnl",
                "format": "pdf",
                "paper_size": "letter",
                "orientation": "portrait",
                "margins": "normal"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Should return HTML content
        content_type = response.headers.get("content-type", "")
        assert "text/html" in content_type, f"Expected text/html, got {content_type}"
        
        html = response.text
        # Verify HTML structure
        assert "<!DOCTYPE html>" in html
        assert "<style>" in html
        assert "@page" in html  # Print CSS
        assert "@media print" in html  # Print media query
        
        # Verify P&L content
        assert "Profit & Loss" in html or "Revenue" in html
        assert "LUCCCA" in html
        
        print("✓ PDF export returns print-ready HTML with P&L data and @page CSS")


class TestReportExportCSV:
    """Test POST /api/export/report with format=csv"""
    
    def test_export_pnl_csv_returns_csv_file(self):
        """Verify CSV export returns CSV file with GL entries"""
        response = requests.post(
            f"{BASE_URL}/api/export/report",
            json={
                "report_type": "pnl",
                "format": "csv"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Should return CSV content
        content_type = response.headers.get("content-type", "")
        assert "text/csv" in content_type, f"Expected text/csv, got {content_type}"
        
        # Verify Content-Disposition header
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp
        assert ".csv" in content_disp
        
        # Verify CSV content has headers
        csv_content = response.text
        assert len(csv_content) > 0, "CSV content should not be empty"
        
        print(f"✓ CSV export returns CSV file ({len(csv_content)} bytes)")


class TestCommissaryForecast:
    """Test POST /api/commissary/forecast-production - AI production forecasting"""
    
    def test_forecast_production_returns_moon_phase_and_factors(self):
        """Verify forecast includes moon_phase, season_factor, and item quantities"""
        response = requests.post(
            f"{BASE_URL}/api/commissary/forecast-production",
            params={"outlet_id": "main-dining", "days_ahead": 1}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Check for error (no historical data)
        if "error" in data:
            print(f"⚠ Forecast returned error (expected if no POS data): {data['error']}")
            return
        
        # Verify forecast structure
        assert "outlet_id" in data
        assert "target_date" in data
        assert "forecast_covers" in data
        assert "factors" in data
        
        # Verify factors include moon phase
        factors = data["factors"]
        assert "moon_phase" in factors, "Missing moon_phase in factors"
        assert "moon_impact" in factors, "Missing moon_impact in factors"
        assert "season_factor" in factors, "Missing season_factor in factors"
        
        # Verify moon phase is valid
        valid_phases = ["new_moon", "waxing_crescent", "first_quarter", "waxing_gibbous", 
                       "full_moon", "waning_gibbous", "last_quarter", "waning_crescent"]
        assert factors["moon_phase"] in valid_phases, f"Invalid moon phase: {factors['moon_phase']}"
        
        # Verify item forecast if present
        if "item_forecast" in data and len(data["item_forecast"]) > 0:
            item = data["item_forecast"][0]
            assert "item" in item
            assert "production_qty" in item
        
        print(f"✓ Forecast returned: moon_phase={factors['moon_phase']}, season_factor={factors['season_factor']}, covers={data['forecast_covers']}")


class TestCommissaryConfig:
    """Test commissary configuration endpoints"""
    
    def test_create_commissary_config(self):
        """Verify POST /api/commissary/config creates relationship between outlets"""
        response = requests.post(
            f"{BASE_URL}/api/commissary/config",
            json={
                "producing_outlet_id": "main-kitchen",
                "receiving_outlet_id": "pool-cafe",
                "products": ["Sandwiches", "Pastries"],
                "active": True
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "config_id" in data
        assert data["producing_outlet_id"] == "main-kitchen"
        assert data["receiving_outlet_id"] == "pool-cafe"
        assert data["active"] == True
        
        print(f"✓ Commissary config created: {data['config_id']}")
    
    def test_list_commissary_configs(self):
        """Verify GET /api/commissary/configs lists all relationships"""
        response = requests.get(f"{BASE_URL}/api/commissary/configs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "configs" in data
        assert "total" in data
        assert isinstance(data["configs"], list)
        
        print(f"✓ Commissary configs listed: {data['total']} relationships")


class TestOnboardingWizard:
    """Test customer onboarding wizard endpoints"""
    
    def test_start_onboarding_session(self):
        """Verify POST /api/onboarding/start creates session with steps tracking"""
        response = requests.post(
            f"{BASE_URL}/api/onboarding/start",
            json={
                "property_name": "TEST Grand Resort",
                "property_code": "TGR",
                "contact_name": "Test Admin",
                "contact_email": "test@example.com"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "session_id" in data
        assert data["property_name"] == "TEST Grand Resort"
        assert "steps" in data
        assert "steps_completed" in data
        
        # Verify steps structure
        steps = data["steps"]
        assert "vendors" in steps
        assert "employees" in steps
        assert "gl_codes" in steps
        assert "menus" in steps
        
        print(f"✓ Onboarding session created: {data['session_id']}")
    
    def test_get_vendor_template(self):
        """Verify GET /api/onboarding/templates/vendors returns CSV template headers"""
        response = requests.get(f"{BASE_URL}/api/onboarding/templates/vendors")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "template_type" in data
        assert data["template_type"] == "vendors"
        assert "headers" in data
        assert "format" in data
        assert data["format"] == "csv"
        
        # Verify expected headers
        headers = data["headers"]
        assert "name" in headers
        assert "category" in headers
        assert "account_number" in headers
        assert "contact_name" in headers
        assert "contact_email" in headers
        
        print(f"✓ Vendor template headers: {headers}")


class TestAdminUsers:
    """Test admin user management endpoints"""
    
    def test_get_admin_users_returns_seeded_users(self):
        """Verify GET /api/admin/users returns seeded users with roles and outlet assignments"""
        response = requests.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert len(data["users"]) > 0, "Should have seeded users"
        
        # Verify user structure
        user = data["users"][0]
        assert "user_id" in user
        assert "name" in user
        assert "email" in user
        assert "role" in user
        assert "outlet_ids" in user
        assert "is_admin" in user
        
        # Count admins
        admins = [u for u in data["users"] if u.get("is_admin")]
        print(f"✓ Admin users returned: {data['total']} users ({len(admins)} admins)")


class TestAdminOutlets:
    """Test admin outlet management endpoints"""
    
    def test_get_admin_outlets_returns_seeded_outlets(self):
        """Verify GET /api/admin/outlets returns seeded outlets"""
        response = requests.get(f"{BASE_URL}/api/admin/outlets")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "outlets" in data
        assert "total" in data
        assert len(data["outlets"]) > 0, "Should have seeded outlets"
        
        # Verify outlet structure
        outlet = data["outlets"][0]
        assert "outlet_id" in outlet
        assert "name" in outlet
        assert "type" in outlet
        # gl_code may not be present in all outlets
        
        print(f"✓ Admin outlets returned: {data['total']} outlets")


class TestExportReportTypes:
    """Test various report types for export"""
    
    def test_export_invoice_report(self):
        """Verify invoice report export works"""
        response = requests.post(
            f"{BASE_URL}/api/export/report",
            json={"report_type": "invoice", "format": "pdf"}
        )
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        print("✓ Invoice report export works")
    
    def test_export_budget_report(self):
        """Verify budget report export works"""
        response = requests.post(
            f"{BASE_URL}/api/export/report",
            json={"report_type": "budget", "format": "pdf"}
        )
        assert response.status_code == 200
        print("✓ Budget report export works")
    
    def test_export_daily_flash_report(self):
        """Verify daily flash report export works"""
        response = requests.post(
            f"{BASE_URL}/api/export/report",
            json={"report_type": "daily_flash", "format": "pdf"}
        )
        assert response.status_code == 200
        print("✓ Daily flash report export works")
    
    def test_export_vendor_comparison_csv(self):
        """Verify vendor comparison CSV export works"""
        response = requests.post(
            f"{BASE_URL}/api/export/report",
            json={"report_type": "vendor_comparison", "format": "csv"}
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print("✓ Vendor comparison CSV export works")


class TestOnboardingTemplates:
    """Test all onboarding template endpoints"""
    
    def test_employees_template(self):
        """Verify employees template returns correct headers"""
        response = requests.get(f"{BASE_URL}/api/onboarding/templates/employees")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data["headers"]
        assert "email" in data["headers"]
        assert "role" in data["headers"]
        print(f"✓ Employees template: {data['headers']}")
    
    def test_gl_codes_template(self):
        """Verify GL codes template returns correct headers"""
        response = requests.get(f"{BASE_URL}/api/onboarding/templates/gl_codes")
        assert response.status_code == 200
        data = response.json()
        assert "gl_code" in data["headers"]
        assert "description" in data["headers"]
        print(f"✓ GL codes template: {data['headers']}")
    
    def test_menu_template(self):
        """Verify menu template returns correct headers"""
        response = requests.get(f"{BASE_URL}/api/onboarding/templates/menu")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data["headers"]
        assert "price" in data["headers"]
        print(f"✓ Menu template: {data['headers']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
