"""
Iteration 8 - Allergen Matrix PDF Export Feature Tests
Tests for the new allergen matrix PDF export functionality in Menu Design Studio
"""
import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint_returns_200(self):
        """Verify backend is running"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("PASS: Health endpoint returns 200")


class TestAllergenMatrixCodeVerification:
    """Verify the allergen matrix PDF export code is correctly implemented"""
    
    def test_export_allergen_matrix_pdf_function_exists(self):
        """Verify exportAllergenMatrixPDF function exists in menu-studio-export.ts"""
        file_path = "/app/client/modules/Culinary/client/lib/menu-studio-export.ts"
        with open(file_path, 'r') as f:
            content = f.read()
        
        assert "export async function exportAllergenMatrixPDF" in content, \
            "exportAllergenMatrixPDF function not found"
        print("PASS: exportAllergenMatrixPDF function exists")
    
    def test_export_function_uses_jspdf(self):
        """Verify the export function uses jsPDF library"""
        file_path = "/app/client/modules/Culinary/client/lib/menu-studio-export.ts"
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Check for jsPDF import within the function
        assert 'import("jspdf")' in content, "jsPDF dynamic import not found"
        print("PASS: exportAllergenMatrixPDF uses jsPDF")
    
    def test_export_function_imports_allergen_tag_map(self):
        """Verify the export function imports ALLERGEN_TAG_MAP"""
        file_path = "/app/client/modules/Culinary/client/lib/menu-studio-export.ts"
        with open(file_path, 'r') as f:
            content = f.read()
        
        assert 'import { ALLERGEN_TAG_MAP }' in content, \
            "ALLERGEN_TAG_MAP import not found in menu-studio-export.ts"
        print("PASS: ALLERGEN_TAG_MAP is imported in menu-studio-export.ts")
    
    def test_echo_menu_studio_imports_export_function(self):
        """Verify EchoMenuStudio.tsx imports exportAllergenMatrixPDF"""
        file_path = "/app/client/modules/Culinary/client/pages/sections/EchoMenuStudio.tsx"
        with open(file_path, 'r') as f:
            content = f.read()
        
        assert "exportAllergenMatrixPDF" in content, \
            "exportAllergenMatrixPDF not imported in EchoMenuStudio.tsx"
        print("PASS: EchoMenuStudio.tsx imports exportAllergenMatrixPDF")
    
    def test_echo_menu_studio_imports_shield_alert(self):
        """Verify EchoMenuStudio.tsx imports ShieldAlert icon"""
        file_path = "/app/client/modules/Culinary/client/pages/sections/EchoMenuStudio.tsx"
        with open(file_path, 'r') as f:
            content = f.read()
        
        assert "ShieldAlert" in content, \
            "ShieldAlert icon not imported in EchoMenuStudio.tsx"
        print("PASS: EchoMenuStudio.tsx imports ShieldAlert icon")
    
    def test_handle_export_allergen_matrix_handler_exists(self):
        """Verify handleExportAllergenMatrix handler exists"""
        file_path = "/app/client/modules/Culinary/client/pages/sections/EchoMenuStudio.tsx"
        with open(file_path, 'r') as f:
            content = f.read()
        
        assert "handleExportAllergenMatrix" in content, \
            "handleExportAllergenMatrix handler not found"
        # Check it's a useCallback
        assert "const handleExportAllergenMatrix = useCallback" in content, \
            "handleExportAllergenMatrix should be a useCallback"
        print("PASS: handleExportAllergenMatrix handler exists as useCallback")
    
    def test_allergen_button_has_data_testid(self):
        """Verify Allergen button has correct data-testid"""
        file_path = "/app/client/modules/Culinary/client/pages/sections/EchoMenuStudio.tsx"
        with open(file_path, 'r') as f:
            content = f.read()
        
        assert 'data-testid="export-allergen-matrix-btn"' in content, \
            "Allergen button missing data-testid='export-allergen-matrix-btn'"
        print("PASS: Allergen button has data-testid='export-allergen-matrix-btn'")
    
    def test_allergen_button_uses_shield_alert_icon(self):
        """Verify Allergen button uses ShieldAlert icon"""
        file_path = "/app/client/modules/Culinary/client/pages/sections/EchoMenuStudio.tsx"
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Find the button section with export-allergen-matrix-btn
        button_pattern = r'data-testid="export-allergen-matrix-btn"[\s\S]{0,200}ShieldAlert'
        match = re.search(button_pattern, content)
        assert match, "ShieldAlert icon not found near the allergen button"
        print("PASS: Allergen button uses ShieldAlert icon")
    
    def test_handler_shows_toast_error_for_no_menu_items(self):
        """Verify handler shows toast error when no menu items exist"""
        file_path = "/app/client/modules/Culinary/client/pages/sections/EchoMenuStudio.tsx"
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Check for the error handling logic
        assert 'menuItems.length === 0' in content, \
            "No check for empty menu items in handler"
        assert 'No menu items' in content, \
            "Toast message for no menu items not found"
        print("PASS: Handler shows toast error when no menu items exist")


class TestAllergenTagMapIntegrity:
    """Verify ALLERGEN_TAG_MAP is intact in taxonomy.ts"""
    
    def test_allergen_tag_map_exists(self):
        """Verify ALLERGEN_TAG_MAP export exists"""
        file_path = "/app/client/modules/Culinary/client/lib/taxonomy.ts"
        with open(file_path, 'r') as f:
            content = f.read()
        
        assert "export const ALLERGEN_TAG_MAP" in content, \
            "ALLERGEN_TAG_MAP export not found"
        print("PASS: ALLERGEN_TAG_MAP export exists")
    
    def test_allergen_tag_map_has_required_allergens(self):
        """Verify ALLERGEN_TAG_MAP has all required allergen entries"""
        file_path = "/app/client/modules/Culinary/client/lib/taxonomy.ts"
        with open(file_path, 'r') as f:
            content = f.read()
        
        required_allergens = ['dairy', 'gluten', 'eggs', 'soy', 'peanuts', 
                             'tree-nuts', 'fish', 'shellfish', 'sesame']
        
        for allergen in required_allergens:
            assert f"'{allergen}'" in content or f'"{allergen}"' in content, \
                f"Allergen '{allergen}' not found in ALLERGEN_TAG_MAP"
        
        print(f"PASS: All {len(required_allergens)} required allergens present in ALLERGEN_TAG_MAP")
    
    def test_allergen_tag_map_has_diet_entries(self):
        """Verify ALLERGEN_TAG_MAP has diet entries"""
        file_path = "/app/client/modules/Culinary/client/lib/taxonomy.ts"
        with open(file_path, 'r') as f:
            content = f.read()
        
        required_diets = ['vegetarian', 'vegan', 'keto', 'kosher', 'halal']
        
        for diet in required_diets:
            assert f"'{diet}'" in content or f'"{diet}"' in content, \
                f"Diet '{diet}' not found in ALLERGEN_TAG_MAP"
        
        print(f"PASS: All {len(required_diets)} required diets present in ALLERGEN_TAG_MAP")


class TestPDFExportFunctionStructure:
    """Verify the PDF export function has correct structure"""
    
    def test_pdf_uses_landscape_letter_format(self):
        """Verify PDF is generated in landscape letter format"""
        file_path = "/app/client/modules/Culinary/client/lib/menu-studio-export.ts"
        with open(file_path, 'r') as f:
            content = f.read()
        
        assert 'orientation: "landscape"' in content, \
            "PDF should use landscape orientation"
        assert 'format: "letter"' in content, \
            "PDF should use letter format"
        print("PASS: PDF uses landscape letter format")
    
    def test_pdf_has_title_and_legend(self):
        """Verify PDF includes title and legend"""
        file_path = "/app/client/modules/Culinary/client/lib/menu-studio-export.ts"
        with open(file_path, 'r') as f:
            content = f.read()
        
        assert "ALLERGEN MATRIX REPORT" in content, \
            "PDF title 'ALLERGEN MATRIX REPORT' not found"
        assert "Legend:" in content, \
            "PDF legend not found"
        print("PASS: PDF has title and legend")
    
    def test_pdf_has_alternating_row_colors(self):
        """Verify PDF has alternating row colors"""
        file_path = "/app/client/modules/Culinary/client/lib/menu-studio-export.ts"
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Check for alternating row logic
        assert "ri % 2" in content or "isAlt" in content, \
            "Alternating row color logic not found"
        print("PASS: PDF has alternating row colors")
    
    def test_pdf_has_rotated_column_headers(self):
        """Verify PDF has rotated column headers"""
        file_path = "/app/client/modules/Culinary/client/lib/menu-studio-export.ts"
        with open(file_path, 'r') as f:
            content = f.read()
        
        assert "angle:" in content, \
            "Rotated column headers (angle property) not found"
        print("PASS: PDF has rotated column headers")
    
    def test_pdf_renders_bold_x_marks(self):
        """Verify PDF renders bold X marks for allergens"""
        file_path = "/app/client/modules/Culinary/client/lib/menu-studio-export.ts"
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Check for bold font and X text
        assert 'setFont("helvetica", "bold")' in content, \
            "Bold font setting not found"
        assert 'text("X"' in content, \
            "X mark rendering not found"
        print("PASS: PDF renders bold X marks for allergens")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
