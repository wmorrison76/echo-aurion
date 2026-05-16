# Option B Quick Start Checklist - 5 Minute Setup

## Pre-Test Checklist ✓

- [ ] You have access to your company's image vault
- [ ] You have ~100 invoices ready (start with food vendors)
- [ ] You're aiming for 92% auto-processing minimum
- [ ] You want to complete testing today

## Launch Migration Mode (30 seconds)

1. Click **Invoices** in left sidebar
2. Click **Migrate** tab at top
3. You're ready to upload

## Configure Batch (1 minute)

```
Batch Name:       "Food First Batch - [Today's Date]"
Confidence:       85% (slider)
Auto-Process:     ✓ Checked
```

## Upload Invoices (2 minutes)

Choose one:

- **Drag & drop:** Drag images from vault → drop in upload area
- **Select Files:** Click button → navigate → select up to 1000 files

**Start with:** Food vendor invoices (most consistent layouts)

## Start & Monitor (3-10 minutes)

1. Click **"Start Migration"** button
2. Watch progress bar (shows % complete)
3. Monitor real-time stats:
   - Files processed / total
   - Auto-processed count
   - Failed count
   - Time remaining

## Check Results (1 minute)

When complete, you'll see:

**TOP PANEL: "Session Testing Results"**

```
Current Rate:  [92.3%]  ← YOUR TARGET: ≥92%
Auto-Processed: [92]
Total Invoices: [100]
Status: ✓ ON TARGET (green) or ⚠ BELOW TARGET (red)
```

**MIDDLE PANEL: Batch Details**

- Auto-processed (green box)
- Manual review (yellow box)
- Failed (red box)
- Average confidence score

**BOTTOM PANEL: Vendor Breakdown** (if multiple vendors)

- Performance by vendor
- Which vendors succeeded/struggled

## Success Criteria

- ✓ **At or above 92%:** Click "Save to Storage" → Done!
- ⚠ **Below 92%:** Review results, upload another batch

## Buttons Available

```
Refresh            → Updates monitoring dashboard
Export Results     → Downloads CSV of this batch
Save to Storage    → Marks invoices for GL processing
Export CSV         → Detailed results export
Retry Failed       → Reprocesses failed invoices
Complete           → Closes migration mode
```

## Real-Time Monitoring

The dashboard automatically tracks:

- Running total across all batches today
- Progress toward 92% target
- Vendor-specific performance
- Auto-processing rate trending

No manual refresh needed—updates as batches complete.

## Example Timeline

```
10:00 AM - Start uploading food vendor batch (50 invoices)
10:15 AM - Results: 48/50 = 96% ✓ Above target!
10:15 AM - Click "Save to Storage"
10:20 AM - Upload second batch (Amazon + others, 50 invoices)
10:35 AM - Results: 46/50 = 92% ✓ At target!
10:35 AM - Click "Save to Storage"
10:35 AM - Session Summary: 94/100 = 94% ✓ COMPLETE
```

## What Happens Behind the Scenes

For each invoice, the system:

1. **Scans** with Google Vision (extracts text)
2. **Detects vendor** (matches to known vendors)
3. **Identifies document type** (invoice vs PO vs credit memo)
4. **Matches template** (finds matching invoice layout)
5. **Calculates confidence** (0-100% probability of correct match)
6. **Checks for anomalies** (detects unusual patterns)
7. **Auto-processes if confident** (if ≥85% threshold)
8. **Flags for review if uncertain** (if <85% confidence)

## After Completion

```
IF ≥92%: Success!
├─ Session complete
├─ Invoices ready for GL posting
└─ System learned from this batch

IF <92%: Review & retry
├─ Check what failed
├─ Upload another batch of same/different vendors
├─ System improves automatically
└─ Repeat until ≥92%
```

## Key Numbers

- **92%:** Your target (minimum acceptable)
- **85%:** Confidence threshold (auto-process if ≥85%)
- **100:** Invoices per batch (rough target)
- **30 min:** Typical time for full batch processing + review

## Troubleshooting Quick Fixes

**"It's taking too long"**
→ Normal: 2-3 seconds per invoice. 100 invoices = 5-10 minutes

**"Results below 92%"**
→ Check vendor breakdown. Different vendors may need different approaches

**"Specific invoices failing"**
→ Look at "Failed" count. Blurry/unusual formats may need manual handling

**"Confidence too low"**
→ Try different vendor or check if image quality is affecting OCR

## Success Signal

When you see this in "Session Testing Results":

```
┌─────────────────────────────────┐
│  Current Rate: 92.5%            │
│  Status: ✓ ON TARGET            │
└─────────────────────────────────┘
```

→ You've succeeded! Click "Save to Storage" and move forward.

---

**Ready?**

1. Click Invoices → Migrate tab
2. Upload ~100 food vendor invoices
3. Watch the magic happen ✨
4. Aim for 92%+ auto-processing
5. Click "Save to Storage" when done

**Questions?** See [OPTION_B_PRODUCTION_MIGRATION_GUIDE.md](OPTION_B_PRODUCTION_MIGRATION_GUIDE.md) for full details.
