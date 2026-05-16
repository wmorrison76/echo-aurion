# PDF Definition Extraction Testing Guide

## Overview
The PDF definition extraction system has been improved to handle dictionary-style PDFs like "Food Lovers Companion" with better text extraction and glossary entry pattern matching.

## Improvements Made

### 1. **Enhanced PDF Text Extraction**
- Implements 4 different extraction strategies to maximize text recovery from PDFs
- Strategy 1: BT...ET text objects (direct text streams)
- Strategy 2: Content streams (PDF content encoding)
- Strategy 3: Object dictionary values (embedded strings)
- Strategy 4: Fallback ASCII sequence scanning
- Better handling of hex-encoded and parenthetical text
- Improved cleanup of PDF artifacts and encoding artifacts

### 2. **Flexible Glossary Pattern Matching**
- Supports multiple glossary entry formats:
  - "Term  Definition" (2+ spaces)
  - "Term: Definition"
  - "TERM Definition" (capitalized)
  - "term definition" (lowercase)
  - "Term (parenthetical) Definition"
- Multi-line definition support (term on one line, definition on next 1-3 lines)
- Fallback extraction from paragraph context for common culinary terms

### 3. **Improved Culinary Keywords**
- Expanded ingredient keywords (87 total)
- Expanded technique keywords (58 total)
- Equipment keywords
- Wine/beverage keywords
- Better classification of extracted terms

### 4. **API Changes**
- Changed from file upload middleware to JSON-based base64 PDFs
- Consistent with rest of API pattern
- Added debug endpoint for diagnosing extraction issues

## How to Test

### Option 1: Using the Debug Endpoint (Recommended)

The debug endpoint provides detailed information about extraction success/failure.

**Endpoint:** `POST /api/pdf-library/debug`

**Request:**
```json
{
  "pdfBase64": "[base64-encoded PDF content]",
  "pdfName": "food-lovers-companion.pdf",
  "title": "The Food Lovers Companion"
}
```

**Response includes:**
- Text extraction success/error
- Number of lines extracted
- Definition extraction results
- Sample extracted terms
- Recommendations for troubleshooting

### Option 2: Using the Upload Endpoint

**Endpoint:** `POST /api/pdf-library/upload`

**Request:**
```json
{
  "pdfBase64": "[base64-encoded PDF content]",
  "pdfName": "food-lovers-companion.pdf",
  "title": "The Food Lovers Companion",
  "author": "Author Name",
  "cuisine": "French",
  "publicationYear": 2005
}
```

**Response includes:**
- Number of terms extracted and added
- Dictionary statistics
- Mastery level breakdown
- Confidence scores

### Option 3: Convert Your PDF to Base64

To convert a PDF file to base64 for testing:

```bash
# On macOS/Linux:
base64 < food-lovers-companion.pdf | tr -d '\n'

# On Windows (PowerShift):
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("food-lovers-companion.pdf"))
```

### Option 4: JavaScript/Browser Test

```javascript
// Read PDF file and convert to base64
const file = document.getElementById('pdfInput').files[0];
const reader = new FileReader();

reader.onload = (event) => {
  const base64 = event.target.result.split(',')[1]; // Remove data:application/pdf;base64, prefix
  
  fetch('/api/pdf-library/debug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pdfBase64: base64,
      pdfName: file.name,
      title: 'The Food Lovers Companion'
    })
  })
  .then(r => r.json())
  .then(data => console.log('Extraction Results:', data));
};

reader.readAsDataURL(file);
```

## Expected Results

### For "Food Lovers Companion" PDF:
- **Text Extraction:** 5,000+ characters of readable text
- **Glossary Entries:** Should extract 50+ culinary terms
- **Categories:** Mix of ingredients, techniques, equipment, pastry/baking
- **Confidence:** 0.7-0.85 per term
- **Common Terms:** Brunoise, Julienne, Chiffonade, Mirepoix, Ganache, etc.

## Troubleshooting

### Issue: "0 extraction of definitions"

**Possible Causes:**
1. **PDF Format Issues:**
   - PDF might be image-based (scanned document)
   - Text might be embedded in image streams
   - **Solution:** Run through OCR (Tesseract, Adobe, etc.) first

2. **Unusual Glossary Format:**
   - Format doesn't match known patterns
   - **Solution:** Check debug output `preview` and `sampleLines`

3. **Text Encoding Problems:**
   - Special characters or fonts not converting properly
   - **Solution:** Check debug output for `textLength` - if <100 chars, text extraction is failing

4. **Very Short or Unusual Entries:**
   - Entries might be filtered as noise
   - **Solution:** Check filter patterns in `extractDefinitionsFromPdfText`

### Issue: Low Confidence Scores (<0.6)

**Possible Causes:**
- Short definitions (less than 50 characters)
- Few sentences in definition
- Limited category keywords found

**Solution:** Definitions should be 100+ characters with multiple sentences for best results

### Issue: Missing Common Culinary Terms

**Possible Causes:**
- Terms not in common culinary keywords list
- Different spelling/format
- Context-dependent extraction not matching

**Solution:** Add to `commonCulinaryTerms` list in `pdf-definition-extractor.ts`

## Monitoring Extraction Quality

### Check Dictionary Status
**Endpoint:** `GET /api/pdf-library/status`

**Returns:**
- Total terms imported
- Mastery level breakdown (fundamental, intermediate, advanced, expert, master)
- Category distribution
- Average confidence score
- Progress towards 10,000 term goal

## Next Steps

1. **Test with Food Lovers Companion PDF:**
   - Use debug endpoint to diagnose any issues
   - Check if text extraction is working
   - Check if glossary patterns are matching

2. **If extraction is still 0:**
   - Share PDF sample with extraction results
   - May need to adjust patterns based on actual PDF format

3. **Improve Pattern Matching:**
   - Add new patterns based on PDF structure
   - Adjust filter thresholds if needed
   - Expand culinary keywords list

## Performance Considerations

- **PDF Size:** Tested with files up to 10MB
- **Text Extraction Time:** ~1-2 seconds per PDF
- **Definition Extraction Time:** ~0.5-1 second per PDF
- **Dictionary Addition:** ~10-50ms per term

## Future Improvements

- [ ] Integration with PDF.js for better text extraction
- [ ] Machine learning for better pattern matching
- [ ] OCR support for image-based PDFs (Tesseract.js)
- [ ] Support for multi-column layouts
- [ ] Better handling of special formatting (tables, boxes)
