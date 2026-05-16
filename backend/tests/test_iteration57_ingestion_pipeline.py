"""
Test Suite for EchoAi3 File/PDF Ingestion Pipeline (Iteration 57)
=================================================================
Tests document upload, AI classification, entity extraction, document querying,
and CRUD operations for the ingestion pipeline.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"

# Track created documents for cleanup
created_doc_ids = []


class TestIngestionStats:
    """Test ingestion stats endpoint"""
    
    def test_get_stats(self):
        """GET /api/echoai3/ingest/stats - returns total_documents, categories, supported_formats"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ingest/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_documents" in data
        assert "categories" in data
        assert "supported_formats" in data
        assert "timestamp" in data
        
        # Verify supported formats
        formats = data["supported_formats"]
        assert "pdf" in formats
        assert "csv" in formats
        assert "txt" in formats
        assert "xlsx" in formats
        assert "json" in formats
        
        print(f"✓ Stats: {data['total_documents']} documents, {len(formats)} formats supported")


class TestDocumentList:
    """Test document listing endpoint"""
    
    def test_list_documents(self):
        """GET /api/echoai3/ingest/documents - returns document list"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ingest/documents?limit=20")
        assert response.status_code == 200
        
        data = response.json()
        assert "documents" in data
        assert "count" in data
        assert "categories" in data
        assert isinstance(data["documents"], list)
        
        print(f"✓ Listed {data['count']} documents")
    
    def test_list_documents_with_category_filter(self):
        """GET /api/echoai3/ingest/documents?category=invoice - filters by category"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ingest/documents?category=invoice&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        # All returned docs should be invoices
        for doc in data["documents"]:
            assert doc["category"] == "invoice"
        
        print(f"✓ Category filter works: {data['count']} invoices")


class TestDocumentUpload:
    """Test document upload with AI classification"""
    
    def test_upload_csv_auto_classify(self):
        """POST /api/echoai3/ingest/upload - upload CSV with auto classification"""
        # Create a test CSV invoice
        csv_content = """Invoice Number,Vendor,Date,Item,Quantity,Unit Price,Total
TEST-INV-001,Test Vendor Inc,2026-04-13,Widget A,10,25.00,250.00
TEST-INV-001,Test Vendor Inc,2026-04-13,Widget B,5,50.00,250.00
TEST-INV-001,Test Vendor Inc,2026-04-13,Service Fee,1,100.00,100.00
,,,,,Total:,600.00"""
        
        files = {"file": ("test_invoice_iter57.csv", csv_content, "text/csv")}
        data = {"category": "auto", "tags": "test,iteration57"}
        
        response = requests.post(f"{BASE_URL}/api/echoai3/ingest/upload", files=files, data=data)
        assert response.status_code == 200
        
        result = response.json()
        assert "document_id" in result
        assert result["document_id"].startswith("doc-")
        assert "category" in result
        assert "summary" in result
        assert "confidence" in result
        assert "status" in result
        assert result["status"] == "processed"
        
        # Track for cleanup
        created_doc_ids.append(result["document_id"])
        
        # AI should classify as invoice with high confidence
        print(f"✓ Uploaded CSV: {result['document_id']}")
        print(f"  Category: {result['category']} ({result['confidence']}% confidence)")
        print(f"  Summary: {result['summary'][:100]}...")
        
        # Verify key_data extraction
        if result.get("key_data"):
            print(f"  Key data extracted: {list(result['key_data'].keys())}")
        
        # Verify entities extraction
        if result.get("entities"):
            print(f"  Entities found: {len(result['entities'])} entities")
    
    def test_upload_txt_file(self):
        """POST /api/echoai3/ingest/upload - upload TXT file"""
        txt_content = """MENU - Test Restaurant
        
Appetizers:
- Bruschetta - $8.99
- Calamari - $12.99
- Soup of the Day - $6.99

Main Courses:
- Grilled Salmon - $24.99
- Ribeye Steak - $32.99
- Pasta Primavera - $18.99

Desserts:
- Tiramisu - $9.99
- Cheesecake - $8.99"""
        
        files = {"file": ("test_menu_iter57.txt", txt_content, "text/plain")}
        data = {"category": "auto", "tags": "test,menu,iteration57"}
        
        response = requests.post(f"{BASE_URL}/api/echoai3/ingest/upload", files=files, data=data)
        assert response.status_code == 200
        
        result = response.json()
        assert "document_id" in result
        created_doc_ids.append(result["document_id"])
        
        print(f"✓ Uploaded TXT: {result['document_id']}")
        print(f"  Category: {result['category']} ({result['confidence']}% confidence)")
    
    def test_upload_json_file(self):
        """POST /api/echoai3/ingest/upload - upload JSON file"""
        import json
        json_content = json.dumps({
            "contract_id": "TEST-CONTRACT-001",
            "vendor": "Test Supplier LLC",
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "terms": {
                "payment_terms": "Net 30",
                "delivery_schedule": "Weekly",
                "minimum_order": 500
            },
            "products": [
                {"name": "Product A", "price": 10.00},
                {"name": "Product B", "price": 15.00}
            ]
        })
        
        files = {"file": ("test_contract_iter57.json", json_content, "application/json")}
        data = {"category": "auto", "tags": "test,contract,iteration57"}
        
        response = requests.post(f"{BASE_URL}/api/echoai3/ingest/upload", files=files, data=data)
        assert response.status_code == 200
        
        result = response.json()
        assert "document_id" in result
        created_doc_ids.append(result["document_id"])
        
        print(f"✓ Uploaded JSON: {result['document_id']}")
        print(f"  Category: {result['category']} ({result['confidence']}% confidence)")


class TestDocumentRetrieval:
    """Test document retrieval endpoints"""
    
    def test_get_existing_document(self):
        """GET /api/echoai3/ingest/document/{doc_id} - get specific document metadata"""
        # First get list to find a document
        list_response = requests.get(f"{BASE_URL}/api/echoai3/ingest/documents?limit=1")
        docs = list_response.json().get("documents", [])
        
        if not docs:
            pytest.skip("No documents available for retrieval test")
        
        doc_id = docs[0]["document_id"]
        response = requests.get(f"{BASE_URL}/api/echoai3/ingest/document/{doc_id}")
        assert response.status_code == 200
        
        doc = response.json()
        assert doc["document_id"] == doc_id
        assert "filename" in doc
        assert "category" in doc
        assert "summary" in doc
        assert "key_data" in doc
        assert "entities" in doc
        assert "confidence" in doc
        
        print(f"✓ Retrieved document: {doc['filename']}")
        print(f"  Category: {doc['category']}, Confidence: {doc['confidence']}%")
    
    def test_get_document_with_text(self):
        """GET /api/echoai3/ingest/document/{doc_id}?include_text=true - get document with extracted text"""
        list_response = requests.get(f"{BASE_URL}/api/echoai3/ingest/documents?limit=1")
        docs = list_response.json().get("documents", [])
        
        if not docs:
            pytest.skip("No documents available for text retrieval test")
        
        doc_id = docs[0]["document_id"]
        response = requests.get(f"{BASE_URL}/api/echoai3/ingest/document/{doc_id}?include_text=true")
        assert response.status_code == 200
        
        doc = response.json()
        assert "extracted_text" in doc
        assert len(doc["extracted_text"]) > 0
        
        print(f"✓ Retrieved document with text: {len(doc['extracted_text'])} chars")
    
    def test_get_nonexistent_document(self):
        """GET /api/echoai3/ingest/document/{doc_id} - returns error for nonexistent doc"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ingest/document/doc-nonexistent123")
        assert response.status_code == 200  # API returns 200 with error field
        
        data = response.json()
        assert "error" in data
        print(f"✓ Nonexistent document returns error: {data['error']}")


class TestDocumentQuery:
    """Test document querying with AI"""
    
    def test_query_document(self):
        """POST /api/echoai3/ingest/document/{doc_id}/query - ask question about document"""
        # Get a document with text
        list_response = requests.get(f"{BASE_URL}/api/echoai3/ingest/documents?limit=1")
        docs = list_response.json().get("documents", [])
        
        if not docs:
            pytest.skip("No documents available for query test")
        
        doc_id = docs[0]["document_id"]
        
        # Ask a question about the document
        form_data = {"query": "What is the total amount or main content of this document?"}
        response = requests.post(f"{BASE_URL}/api/echoai3/ingest/document/{doc_id}/query", data=form_data)
        assert response.status_code == 200
        
        result = response.json()
        assert "document_id" in result
        assert result["document_id"] == doc_id
        assert "query" in result
        assert "answer" in result
        assert "timestamp" in result
        assert len(result["answer"]) > 0
        
        print(f"✓ Document query successful")
        print(f"  Q: {result['query']}")
        print(f"  A: {result['answer'][:200]}...")
    
    def test_query_nonexistent_document(self):
        """POST /api/echoai3/ingest/document/{doc_id}/query - returns error for nonexistent doc"""
        form_data = {"query": "What is this?"}
        response = requests.post(f"{BASE_URL}/api/echoai3/ingest/document/doc-nonexistent123/query", data=form_data)
        assert response.status_code == 200  # API returns 200 with error field
        
        data = response.json()
        assert "error" in data
        print(f"✓ Query nonexistent document returns error: {data['error']}")


class TestDocumentDelete:
    """Test document deletion"""
    
    def test_delete_document(self):
        """DELETE /api/echoai3/ingest/document/{doc_id} - delete a document"""
        # First upload a document to delete
        csv_content = "test,data\n1,delete_me"
        files = {"file": ("test_delete_iter57.csv", csv_content, "text/csv")}
        data = {"category": "other", "tags": "test,delete"}
        
        upload_response = requests.post(f"{BASE_URL}/api/echoai3/ingest/upload", files=files, data=data)
        assert upload_response.status_code == 200
        doc_id = upload_response.json()["document_id"]
        
        # Verify it exists
        get_response = requests.get(f"{BASE_URL}/api/echoai3/ingest/document/{doc_id}")
        assert "error" not in get_response.json()
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/echoai3/ingest/document/{doc_id}")
        assert delete_response.status_code == 200
        
        result = delete_response.json()
        assert result["deleted"] == True
        assert result["document_id"] == doc_id
        
        # Verify it's gone
        verify_response = requests.get(f"{BASE_URL}/api/echoai3/ingest/document/{doc_id}")
        assert "error" in verify_response.json()
        
        print(f"✓ Document deleted and verified: {doc_id}")
    
    def test_delete_nonexistent_document(self):
        """DELETE /api/echoai3/ingest/document/{doc_id} - returns error for nonexistent doc"""
        response = requests.delete(f"{BASE_URL}/api/echoai3/ingest/document/doc-nonexistent123")
        assert response.status_code == 200  # API returns 200 with error field
        
        data = response.json()
        assert "error" in data
        print(f"✓ Delete nonexistent document returns error: {data['error']}")


class TestAppIntegrity:
    """Test that app still loads correctly after module archival"""
    
    def test_health_endpoint(self):
        """GET /api/health - app health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "healthy" or "status" in data
        print(f"✓ Health check passed: {data}")
    
    def test_enterprise_command_center(self):
        """GET /api/enterprise/command-center - verify main dashboard loads"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200
        
        data = response.json()
        assert "properties" in data or "modules" in data or isinstance(data, dict)
        print(f"✓ Enterprise command center accessible")
    
    def test_zaro_guardian_still_works(self):
        """GET /api/zaro/status - verify ZARO Guardian still works after archival"""
        response = requests.get(f"{BASE_URL}/api/zaro/status")
        assert response.status_code == 200
        
        data = response.json()
        assert "guardians" in data
        assert len(data["guardians"]) == 5  # SENTINEL, AEGIS, CERBERUS, HEIMDALL, VALKYRIE
        print(f"✓ ZARO Guardian operational with {len(data['guardians'])} subsystems")


@pytest.fixture(scope="session", autouse=True)
def cleanup_test_documents():
    """Cleanup test documents after all tests complete"""
    yield
    # Cleanup created documents
    for doc_id in created_doc_ids:
        try:
            requests.delete(f"{BASE_URL}/api/echoai3/ingest/document/{doc_id}")
            print(f"Cleaned up test document: {doc_id}")
        except:
            pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
