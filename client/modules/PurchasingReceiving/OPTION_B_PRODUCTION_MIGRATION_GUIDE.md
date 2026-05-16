# Option B: Production Data Migration Testing Guide

## Overview

You're proceeding with production data migration testing using ~100 invoices from your company's image vault. This guide walks you through the process with real-time tracking to hit your 92% auto-processing target.

## System Status

✅ **Ready for Testing:**

- Bulk invoice uploader with drag-and-drop support
- Real-time progress tracking (processing, confidence, vendor detection)
- Automatic performance monitoring with 92% target tracking
- Confidence calibration system for improved accuracy
- ML-based vendor/document type classification
- Anomaly detection for problematic invoices
- Progressive improvement cycle (learns from each batch)

## Getting Started

### Step 1: Access Migration Mode

1. Navigate to **Invoices** page in the left sidebar
2. Click the **"Migrate"** tab at the top
3. You'll see the Invoice Migration Mode interface with two sections:
   - **Left:** Upload & Configuration
   - **Right:** Progress & Results

### Step 2: Configure Your First Batch (Food Vendors)

These settings control how the system processes your invoices:

```
Batch Name: "Food First Batch - [Date]"
  → Identifies this batch in reports

Confidence Threshold: 85-90%
  → Only auto-process invoices matching templates with ≥85% confidence
  → Higher threshold = fewer auto-processed, more manual review
  → Lower threshold = more auto-processed, potential errors

Auto-Process: ✓ Enabled
  → Automatically marks high-confidence matches for GL processing
```

**Recommendation:** Start with 85% confidence to maximize auto-processing while staying safe.

### Step 3: Upload Your First ~100 Invoices (Food Vendors)

The system accepts PNG, JPG, and PDF formats. You have two options:

**Option A: Drag & Drop**

- Drag invoice images from your image vault into the dotted upload area
- The system groups multiple files together

**Option B: Select Files Button**

- Click "Select Files"
- Navigate to your image vault folder
- Select up to 1,000 files per batch
- Click "Open"

**Pro tip:** Start with food vendor invoices first. These typically have consistent layouts, which helps the system learn patterns for other vendors later.

### Step 4: Start Migration

1. Click **"Start Migration"** button
2. You'll see real-time progress:
   - Current file being processed
   - Percentage complete
   - Successful/failed counts
   - Estimated time remaining

The system is simultaneously:

- Scanning each invoice with Google Vision OCR
- Detecting vendor and document type
- Matching against known templates
- Calculating confidence scores
- Flagging anomalies

### Step 5: Monitor Real-Time Results

After processing completes, you'll see:

#### **Session Testing Results Panel** (Top)

Shows cumulative progress toward your 92% target:

- **Total Invoices:** Running count across all batches
- **Auto-Processed:** Count of invoices processed without manual review
- **Current Rate:** Your auto-processing percentage
- **Status Badge:** "ON TARGET" (green) or "BELOW TARGET" (red)

This updates as you upload each batch, so you can track progress toward the goal.

#### **Batch Specific Results** (Middle)

Detailed breakdown for the current batch:

- Auto-processed invoices (green)
- Invoices flagged for manual review (yellow)
- Failed invoices (red)
- Average confidence score
- Processing time per invoice

#### **Vendor Performance** (Bottom)

If you upload invoices from multiple vendors:

- Success rate by vendor
- Confidence scores by vendor
- Identify which vendors perform well vs. need retraining

## Understanding Your Results

### Auto-Processing Rate Calculation

```
Rate = Auto-Processed Invoices / Total Invoices Processed

Example: 92 invoices auto-processed out of 100 = 92%
Your target: ≥92% (at or above this rate)
```

### What "Auto-Processed" Means

The invoice was:
✓ Scanned successfully (OCR worked)
✓ Vendor identified with ≥85% confidence
✓ Document type detected (invoice, PO, credit memo, etc.)
✓ Marked ready for GL processing (not requiring manual correction)

### What "Manual Review" Means

Invoice requires human attention because:

- Confidence below threshold (borderline match)
- Unusual format or vendor layout
- Conflicting data (totals don't match)
- Anomalies detected (unusual amounts, color issues, orientation)

**Action:** Review these manually, correct data if needed. These inform the system for future improvements.

### What "Failed" Means

Invoice processing couldn't complete:

- Image too blurry/unreadable
- Corrupted file
- Unusual format (not a standard invoice)
- Critical OCR errors

**Action:** Click "Retry Failed" after uploading more files, or review to determine root cause.

## Sequencing Your Upload (Recommended)

### Phase 1: Food Vendors (Your Priority)

- **Target:** 92%+ auto-processing
- **Invoices:** ~50-70 from food vendors
- **Expected:** These have consistent layouts, should hit target
- **Timeline:** 10-15 minutes processing

### Phase 2: Mixed Vendors (Amazon + Others)

- **Target:** Maintain or improve 92%
- **Invoices:** ~30-50 from diverse vendors
- **Expected:** May dip initially (new vendor layouts), then improve
- **Timeline:** 15-20 minutes processing

### Phase 3: Assess & Repeat (if needed)

- If you're at 92%: Celebrate! Complete with "Save to Storage"
- If below 92%: Review failed/manual invoices, upload another batch
- If consistently below 92%: Check confidence threshold, review OCR issues

## Real-Time Features During Upload

### Progress Tracking

```
Processing in Progress:
├─ Current file: [filename]
├─ Progress: 45% (45/100 processed)
├─ Successful: 42 ✓
├─ Failed: 2 ✕
└─ ETA: 30 seconds remaining
```

### After Batch Completes

The system automatically:

1. **Calculates metrics** - Confidence, success rate, vendor breakdown
2. **Checks for anomalies** - Flags unusual invoices for review
3. **Updates vendor profiles** - Learns vendor-specific patterns
4. **Triggers progressive improvement** - May improve accuracy on next batch

## Actions After Results

### If You Hit 92% Target ✓

1. Review the "Batch Testing Results" panel
2. Look at vendor breakdown - ensure all vendors acceptable
3. Click **"Save to Storage"** to mark invoices for GL processing
4. Click **"Export Results"** to download CSV of results
5. You can now upload more vendors' invoices to build on success

### If Below 92% Target ⚠

1. Check the "Manual Review" count - these are candidates for fixes
2. Review failed invoices - identify patterns
3. Consider adjusting confidence threshold:
   - Lower 85% → 80% to auto-process more (higher risk)
   - Raise 85% → 90% to be more conservative (more manual review)
4. Upload another batch, starting with different vendor priority

### Always Do This

- **Export Results** (blue "Export Results" button) saves metrics to CSV
- **Review Vendor Breakdown** to see which vendors perform best
- **Check Processing Errors** for patterns (all from same vendor? specific doc type?)

## Monitoring Dashboard Integration

The system provides a real-time dashboard showing:

- **Current session metrics** - Cumulative across all batches today
- **Per-batch breakdown** - Each upload's specific results
- **Vendor comparison** - Side-by-side performance metrics
- **Target progress** - Visual indicator of progress to 92%

This updates automatically as you upload each batch, so you don't need to refresh.

## Expected Performance Timeline

Based on system optimization:

- **Food vendors:** 92-96% auto-processing (consistent layouts)
- **Known vendors (Amazon, etc.):** 85-90% (slight layout variations)
- **Mixed/unknown vendors:** 70-80% (first time seeing them)

**System learning:** After each batch, the progressive improvement cycle kicks in:

- ML classifier trains on new examples
- Vendor profiles update with new patterns
- Confidence calibration adjusts thresholds
- Next batch typically performs 2-5% better

## Troubleshooting

### Processing Seems Slow

- Google Vision OCR takes 2-3 seconds per invoice
- 100 invoices = 5-8 minutes normal
- If >10 minutes, check network connection

### Consistently Below 92%

- Check invoice quality (blurry/poor scans = lower OCR accuracy)
- Verify vendor templates exist (first time seeing vendor = more manual review)
- Try raising confidence threshold to catch only high-quality matches

### Specific Vendor Failing

- Look at "Vendor Performance" breakdown
- These vendors may have unusual layouts
- Try uploading 5-10 examples to let system learn
- Use ML training mode to manually train on a few examples

## Advanced Options

### Manually Save to Storage

After reviewing results, click **"Save to Storage"** to:

- Mark processed invoices for GL integration
- Generate audit report
- Trigger vendor profile learning
- Feed successful examples to ML classifier

### Retry Failed Invoices

Click **"Retry Failed"** to:

- Reprocess invoices that failed first time
- May succeed if OCR improved or confidence threshold adjusted

### Review in Invoice Queue

After saving, check the **"Queue"** tab to:

- See processed invoices awaiting GL posting
- Manually correct any issues
- Complete the accounting integration

## Today's Goal

- Upload ~100 invoices
- Achieve ≥92% auto-processing
- Identify top-performing vendor layouts
- Set baseline for continued improvement

**Expected completion:** 30-45 minutes (processing) + 15 minutes (review) = 1 hour total

## Next Steps (After Today)

### Short Term (Days 1-3)

- Run daily batches of 100+ invoices
- Track trending auto-processing rate
- Identify vendors needing retraining

### Medium Term (Week 1)

- Expand to full production volume
- Trigger progressive improvement cycles daily
- Build comprehensive vendor profiles

### Long Term (Weeks 2-4)

- System approaches 95%+ auto-processing
- Rare manual reviews (exception handling only)
- ML models mature with diverse invoice examples

---

**Need help?** Check [WEEK1_WEEK2_IMPLEMENTATION_GUIDE.md](WEEK1_WEEK2_IMPLEMENTATION_GUIDE.md) for technical details about the AI training system powering this migration.
