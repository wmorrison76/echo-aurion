#!/bin/bash

# PDF Extraction Testing Script
# This script tests the PDF extraction endpoints with sample data

API_BASE="http://localhost:5173/api"  # Change to your API endpoint

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================"
echo "PDF Extraction Testing Script"
echo "================================"
echo ""

# Function to test debug endpoint
test_debug_endpoint() {
  echo -e "${YELLOW}Testing Debug Endpoint...${NC}"
  echo ""
  
  # Check if PDF file is provided
  if [ -z "$1" ]; then
    echo -e "${RED}Error: No PDF file provided${NC}"
    echo "Usage: ./TEST_PDF_EXTRACTION.sh <pdf_file> [title]"
    exit 1
  fi
  
  PDF_FILE="$1"
  PDF_TITLE="${2:-The Food Lovers Companion}"
  
  if [ ! -f "$PDF_FILE" ]; then
    echo -e "${RED}Error: File not found: $PDF_FILE${NC}"
    exit 1
  fi
  
  echo "Converting PDF to base64..."
  PDF_BASE64=$(base64 < "$PDF_FILE" | tr -d '\n')
  
  if [ -z "$PDF_BASE64" ]; then
    echo -e "${RED}Error: Failed to encode PDF${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✓ PDF encoded to base64${NC}"
  echo "File size: $(wc -c < "$PDF_FILE") bytes"
  echo ""
  
  echo -e "${YELLOW}Sending debug request to API...${NC}"
  
  # Create temporary file with JSON payload
  TEMP_JSON=$(mktemp)
  cat > "$TEMP_JSON" <<EOF
{
  "pdfBase64": "$PDF_BASE64",
  "pdfName": "$(basename "$PDF_FILE")",
  "title": "$PDF_TITLE"
}
EOF
  
  # Send request
  RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d @"$TEMP_JSON" \
    "$API_BASE/pdf-library/debug")
  
  # Clean up temp file
  rm -f "$TEMP_JSON"
  
  echo ""
  echo -e "${YELLOW}API Response:${NC}"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
  
  echo ""
  echo -e "${YELLOW}Analysis:${NC}"
  
  # Extract key metrics
  TEXT_SUCCESS=$(echo "$RESPONSE" | jq -r '.textExtraction.success' 2>/dev/null)
  TEXT_LENGTH=$(echo "$RESPONSE" | jq -r '.textExtraction.textLength' 2>/dev/null)
  TERMS_EXTRACTED=$(echo "$RESPONSE" | jq -r '.definitionExtraction.termsExtracted' 2>/dev/null)
  AVERAGE_CONFIDENCE=$(echo "$RESPONSE" | jq -r '.definitionExtraction.averageConfidence' 2>/dev/null)
  
  echo "Text Extraction: $TEXT_SUCCESS (extracted: $TEXT_LENGTH characters)"
  echo "Terms Extracted: $TERMS_EXTRACTED"
  echo "Average Confidence: $AVERAGE_CONFIDENCE"
  echo ""
  
  # Show recommendations
  echo -e "${YELLOW}Recommendations:${NC}"
  echo "$RESPONSE" | jq -r '.recommendations[]' 2>/dev/null
}

# Function to test upload endpoint
test_upload_endpoint() {
  echo -e "${YELLOW}Testing Upload Endpoint...${NC}"
  echo ""
  
  PDF_FILE="$1"
  PDF_TITLE="${2:-The Food Lovers Companion}"
  
  if [ ! -f "$PDF_FILE" ]; then
    echo -e "${RED}Error: File not found: $PDF_FILE${NC}"
    exit 1
  fi
  
  echo "Converting PDF to base64..."
  PDF_BASE64=$(base64 < "$PDF_FILE" | tr -d '\n')
  
  echo -e "${GREEN}✓ PDF encoded${NC}"
  echo ""
  
  echo -e "${YELLOW}Sending upload request to API...${NC}"
  
  # Create temporary file with JSON payload
  TEMP_JSON=$(mktemp)
  cat > "$TEMP_JSON" <<EOF
{
  "pdfBase64": "$PDF_BASE64",
  "pdfName": "$(basename "$PDF_FILE")",
  "title": "$PDF_TITLE",
  "author": "Unknown Author",
  "cuisine": "General"
}
EOF
  
  # Send request
  RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d @"$TEMP_JSON" \
    "$API_BASE/pdf-library/upload")
  
  # Clean up temp file
  rm -f "$TEMP_JSON"
  
  echo ""
  echo -e "${YELLOW}API Response:${NC}"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
}

# Function to check dictionary status
check_status() {
  echo -e "${YELLOW}Checking Dictionary Status...${NC}"
  echo ""
  
  RESPONSE=$(curl -s -X GET "$API_BASE/pdf-library/status")
  
  echo -e "${YELLOW}Status Response:${NC}"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
}

# Main script logic
if [ "$1" = "--status" ]; then
  check_status
elif [ "$1" = "--upload" ]; then
  shift
  test_upload_endpoint "$@"
else
  test_debug_endpoint "$@"
fi

echo ""
echo -e "${GREEN}Test complete!${NC}"
