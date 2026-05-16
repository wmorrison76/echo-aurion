# Quick Test Checklist for Invoice Scanning

**Use this checklist after uploading each invoice**

---

## UPLOAD A TEST INVOICE

### Step 1: Prepare Invoice

- [ ] Select ONE invoice from your image vault
- [ ] Ensure it's a PDF or clear image
- [ ] Remember the vendor name
- [ ] Remember approximate total ($)
- [ ] Approximate line item count (you estimate based on visual inspection)

### Step 2: Upload

- [ ] Go to **Invoices** → **Scan** tab
- [ ] Click **Upload Invoice**
- [ ] Select your test file
- [ ] Wait for "Processing complete" message
- [ ] DO NOT close the page

---

## VERIFY EXTRACTION (Frontend)

### Check Invoice Details Panel

- [ ] **Vendor** field populated?
  - YES ✅ → OCR working, vendor detection working
  - NO ❌ → Check console logs for "extractVendorName" errors

- [ ] **Invoice #** field populated?
  - YES ✅ → Header parsing working
  - NO ⚠️ → Not critical, check logs

- [ ] **Total** field populated?
  - YES ✅ → Header parsing working
  - NO ❌ → Check logs for "totalLine not found"

- [ ] **Line Items Table** showing rows?
  - YES ✅ → Extraction working! Count the rows.
  - NO ❌ → CRITICAL - Check console for extraction errors

### Check Confidence Badge

- [ ] See "XX% Training Confidence" badge?
  - 70%+ ✅ → Good extraction
  - 50-70% ⚠️ → Marginal, may need review
  - <50% ❌ → Poor extraction, check logs

---

## COUNT LINE ITEMS

**Record for each invoice**:

```
Invoice: ________________
Vendor: ________________
Estimated Items (visual): ____
Extracted Items (system): ____
Match? YES / NO

Items Found:
□ Qty populated: YES / NO
□ Descriptions readable: YES / NO / PARTIALLY
□ Prices populated: YES / NO
□ Total matches sum: YES / NO / CLOSE
```

---

## DIAGNOSE FAILURES

### If NO line items extracted:

1. **Check Browser Console** (F12)
   - Look for errors with keywords:
     - "Skipped line"
     - "Failed to extract"
     - "parseInvoiceText"
     - "table detection"

2. **Check Processing Flow**:

   ```
   Is OCR text showing up?
   → YES: Table detection failing
   → NO: OCR failing (Google Vision issue)
   ```

3. **Take Screenshot** of:
   - Invoice image in BoundingBoxEditor
   - Line items table (empty or partial)
   - Browser console errors
   - Send to team with notes

### If SOME line items extracted:

1. **Check which are missing**:
   - Missing first few lines? → Header detection wrong
   - Missing last few lines? → Summary detection wrong
   - Missing middle lines? → Pattern matching issue

2. **Check descriptions**:
   - [ ] Descriptions complete?
   - [ ] Special characters preserved (& % # /)?
   - [ ] Product codes intact?

### If WRONG values extracted:

1. **Check quantities**:
   - [ ] Are numbers in correct positions?
   - [ ] Are units being captured?

2. **Check prices**:
   - [ ] Match original invoice amounts?
   - [ ] Currency symbols handled?
   - [ ] Decimals correct?

3. **Check total**:
   - [ ] Sum of line items ≈ invoice total?
   - [ ] Within 1% tolerance?

---

## DETAILED DIAGNOSTIC

**If problems persist, add these to your report**:

### Invoice Details

```
Vendor: ________________________
Supplier Format: ________________________
  (e.g., "Sysco", "US Foods", "Restaurant Depot", etc.)

Invoice Date: ________________________
Invoice Number: ________________________
Approximate Total: $ ________________________
```

### Visual Structure

```
Table or List? TABLE / LIST / MIXED
Column Headers Visible? YES / NO
Are rows aligned? YES / NO / PARTIALLY
Any merged cells? YES / NO
Multiple sections? YES / NO
```

### What Extracted Correctly

```
Line Items: ____ out of ____ visible (____%)
Descriptions: COMPLETE / PARTIAL / MISSING
Quantities: YES / NO / PARTIAL
Unit Prices: YES / NO / PARTIAL
Total Amounts: YES / NO / PARTIAL
```

### Error Messages (if any)

```
Error 1: _________________________________
Error 2: _________________________________
Error 3: _________________________________
```

---

## QUICK WIN TESTS

### Test 1: Structured Table Invoice (Easiest)

**Vendor**: Sysco or US Foods or similar  
**Format**: Columns with headers (QTY | ITEM | PRICE | AMOUNT)  
**Expected**: 95%+ success

**Checklist**:

- [ ] Headers detected
- [ ] All columns extracted
- [ ] Descriptions intact
- [ ] No "Skipped line" logs

### Test 2: Mixed Format Invoice (Medium)

**Vendor**: Amazon or others  
**Format**: Some tables, some paragraphs  
**Expected**: 70-80% success

**Checklist**:

- [ ] Item list found
- [ ] At least 5 items extracted
- [ ] Descriptions reasonable
- [ ] Total populated

### Test 3: Freeform Invoice (Hardest)

**Vendor**: Small vendor, handwritten, unusual format  
**Format**: No clear table structure  
**Expected**: 50-60% success (may need manual review)

**Checklist**:

- [ ] Any items extracted?
- [ ] Vendor detected?
- [ ] Total found?

---

## SUCCESS CRITERIA

**Mark invoice as SUCCESS if**:

- ✅ Vendor name populated
- ✅ Invoice total populated
- ✅ Line items: at least 70% of visual count extracted
- ✅ Descriptions: 90%+ readable
- ✅ Confidence: 70%+

**Mark as PARTIAL if**:

- ⚠️ Some fields missing but extractable
- ⚠️ Line items found but incomplete
- ⚠️ Confidence: 50-70%

**Mark as FAILED if**:

- ❌ No line items extracted
- ❌ Vendor or total missing
- ❌ Descriptions heavily corrupted

---

## EXPECTED RESULTS

### After Fixes Applied:

| Invoice Type            | Expected Items | Confidence | Time |
| ----------------------- | -------------- | ---------- | ---- |
| Sysco/US Foods          | 8-15           | 85%+       | 2-3s |
| Amazon/Restaurant Depot | 5-10           | 75%+       | 2-3s |
| Small vendor            | 2-5            | 60%+       | 2-3s |
| Handwritten             | 1-3            | <50%       | 2-3s |

**If your results match above**: ✅ System working!  
**If below expectations**: Report to team with diagnostic info

---

## WHAT TO DO NEXT

### If SUCCESS:

1. Test 5 more diverse invoices
2. Verify database inserts
3. Check accuracy rate (> 90%?)
4. Proceed to Option B testing

### If PARTIAL:

1. Identify which fields are missing
2. Check console logs for specific errors
3. Report pattern (e.g., "always missing qty", "descriptions stripped")
4. Team can add new pattern or tweak thresholds

### If FAILED:

1. Gather 3 example invoices that fail
2. Screenshot the error logs
3. Note vendor/format common factor
4. Team analyzes failure pattern

---

## SHARE THIS WHEN REPORTING

Please include when reporting results:

```
RESULTS SUMMARY
===============

Test Date: ____________________
Invoices Tested: ____
Success Rate: ____%
Confidence Average: _____%

Vendor(s) Tested:
- _____________ (SUCCESS/PARTIAL/FAILED)
- _____________ (SUCCESS/PARTIAL/FAILED)
- _____________ (SUCCESS/PARTIAL/FAILED)

Key Findings:
1. ___________________________________
2. ___________________________________
3. ___________________________________

Blockers:
[ ] None
[ ] Describe: ________________________

Screenshots Attached: YES / NO
Console Logs Saved: YES / NO
```

---

**Ready to test?** Pick your first invoice and go! ✨
