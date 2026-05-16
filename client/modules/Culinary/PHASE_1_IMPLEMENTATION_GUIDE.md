# Phase 1 Implementation Guide: Make All Systems Functional

**Duration:** 7 days
**Priority:** CRITICAL - Makes all training modules callable and functional
**Outcome:** Users can initiate crawler, upload PDFs, and see real progress

---

## Status: ✅ COMPLETED

The following implementations are **COMPLETE** and ready to use:

### ✅ Phase 1.1: Training Orchestrator Wiring
- **File:** `server/routes/training-orchestration.ts`
- **Status:** DONE
- **What Changed:**
  - Added imports for `webRecipeCrawler`, `uploadedTermsStore`, `masterCulinaryDictionary`
  - Replaced "pending" stubs with actual crawler invocations
  - Web crawler now calls `webRecipeCrawler.crawlRecipes()` with proper progress tracking
  - PDF library now loads uploaded terms and adds them to master dictionary
  - Both track real progress and completion counts

**Key Changes:**
```typescript
// BEFORE: Just marked as pending
trainingOrchestrator.updateSourceProgress("web-crawler", {
  status: "pending",
  message: "Crawler module pending implementation",
});

// AFTER: Actually calls the crawler
const crawlResult = await webRecipeCrawler.crawlRecipes({
  limit: 5000,
  includeRegions: ["global"],
});
trainingOrchestrator.completeSource("web-crawler", recipesFound, 0);
```

### ✅ Phase 1.3: PDF Batch Upload Component
- **File:** `client/components/panels/PDFBatchUploader.tsx`
- **Status:** DONE
- **What It Does:**
  - Drag & drop PDF interface
  - File selection input
  - Individual file progress tracking
  - Overall batch progress bar
  - Error handling with detailed messages
  - Success/error/pending badges
  - Base64 conversion and upload
  - Clear completed files
  - Real-time status updates

**Features:**
- ✅ Drag & drop multiple PDFs
- ✅ Batch upload with sequential processing
- ✅ Progress tracking (individual + overall)
- ✅ Error messages and retry capability
- ✅ Success/failure statistics
- ✅ File removal
- ✅ Base64 encoding

---

## REMAINING ITEMS (To Complete)

### Phase 1.2: Add Crawler Invocation to EchoTrainingCenter UI
**File:** `client/components/panels/EchoTrainingCenter.tsx`

**What to do:**
Add a "Start Web Crawler" button that triggers `/api/echo/crawler/start-crawl` directly.

**Code to add:**
```typescript
// Inside EchoTrainingCenter component

const handleStartCrawler = async () => {
  setIsLoading(true);
  try {
    const response = await fetch("/api/echo/crawler/start-crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sources: ["recipes", "hospitality"],
        limit: 5000,
      }),
    });
    
    const data = await response.json();
    toast.success(`Crawler started: ${data.sessionId}`);
    
    // Connect to crawler progress stream
    const eventSource = new EventSource("/api/echo/crawler/progress");
    eventSource.onmessage = (event) => {
      const progress = JSON.parse(event.data);
      setCrawlerProgress(progress);
    };
  } catch (error) {
    toast.error("Failed to start crawler");
  } finally {
    setIsLoading(false);
  }
};

// Add button to render:
<Button 
  onClick={handleStartCrawler}
  disabled={isLoading}
  className="w-full"
>
  {isLoading ? "Starting Crawler..." : "Start Web Crawler"}
</Button>
```

**Integration point:** Add to the "Training Sources" section alongside other source buttons.

### Phase 1.4: Multipart PDF Upload Endpoint
**File:** `server/routes/pdf-library-import.ts`

**What to add:**
Replace/enhance existing base64-only PDF endpoint with proper multipart support.

**Installation:** Add to package.json if not present:
```bash
npm install multer @types/multer
```

**Code to add:**
```typescript
import multer from "multer";

// Configure multer for in-memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files allowed"));
    }
  }
});

/**
 * POST /api/pdf-library/upload-multipart
 * Accept multipart PDF upload (alternative to base64)
 */
router.post(
  "/upload-multipart",
  upload.single("pdf"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No PDF file provided",
        });
      }

      const buffer = req.file.buffer;
      const fileName = req.file.originalname;

      console.log(`[PDF Import] Processing uploaded file: ${fileName}`);

      // Extract text from PDF
      const text = await extractTextFromPDFBuffer(buffer);

      if (text.length < 100) {
        return res.status(400).json({
          success: false,
          error: "PDF extraction returned too little text. Try OCR endpoint.",
          recommendation: "Use /api/pdf-library/upload-ocr for scanned PDFs",
        });
      }

      // Convert to terms
      const terms = await convertPDFToMasterTerms(text, fileName);

      // Store in uploaded terms
      const termEntries = terms.map((t) => [
        t.term.toLowerCase().replace(/\s+/g, "-"),
        t,
      ] as const);
      await uploadedTermsStore.addTermsBatch(termEntries);

      return res.json({
        success: true,
        fileName,
        termsExtracted: terms.length,
        message: `Extracted ${terms.length} terms from ${fileName}`,
      });
    } catch (error) {
      console.error("[PDF Import] Multipart upload error:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  }
);
```

**ALSO add this endpoint for base64 (keep existing for backward compatibility):**
```typescript
/**
 * POST /api/pdf-library/upload
 * Accept base64-encoded PDF (existing endpoint)
 */
router.post("/upload", async (req: Request, res: Response) => {
  // Existing implementation continues
});
```

### Phase 1.5: Configure External APIs
**File:** `.env` or environment variables in deployment

**What to add:**
```bash
# Recipe Crawling APIs
SPOONACULAR_API_KEY=your_key_here
EDAMAM_API_ID=your_id_here
EDAMAM_API_KEY=your_key_here

# Scraping Proxy (for AllRecipes, Food Network, etc.)
# Option A: Use a proxy service URL
SCRAPE_PROXY_URL=http://proxy-service.example.com/

# Option B: Use bright data / other proxy provider
BRIGHTDATA_PROXY=http://bdc.user:pass@proxy.provider.com:port

# Web Crawler Configuration
WEB_CRAWLER_TIMEOUT=30000
WEB_CRAWLER_RATE_LIMIT=3
WEB_CRAWLER_USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
```

**How to get these:**
1. **Spoonacular API:**
   - Visit https://spoonacular.com/food-api
   - Sign up for free tier (5000 requests/month)
   - Copy API key

2. **Edamam Recipe Search:**
   - Visit https://www.edamam.com/food-api
   - Sign up for API access
   - Get ID and Key from dashboard

3. **Proxy Service (Optional):**
   - For scraping AllRecipes, Food Network, etc.
   - Options:
     - Bright Data: https://brightdata.com/
     - Oxylabs: https://oxylabs.io/
     - ScraperAPI: https://www.scraperapi.com/
   - Start with free tier

### Phase 1.6: Wire PDF Uploader to EchoTrainingCenter
**File:** `client/components/panels/EchoTrainingCenter.tsx`

**What to add:**
```typescript
import { PDFBatchUploader } from "@/components/panels/PDFBatchUploader";

// Inside render:
<div className="space-y-4">
  <h3 className="font-semibold">Upload PDFs</h3>
  <PDFBatchUploader />
</div>
```

---

## Testing Checklist

After completing all Phase 1 items, verify:

### ✅ Orchestrator → Crawler
- [ ] POST `/api/training/start` with `sources: ["web-crawler"]`
- [ ] Crawler actually runs (not just "pending")
- [ ] Returns recipe count > 0
- [ ] Session status shows crawler progress

### ✅ PDF Upload
- [ ] Drag & drop PDFs onto PDFBatchUploader
- [ ] Files queue up
- [ ] Click "Start Upload"
- [ ] Progress bars show real progress
- [ ] Files successfully upload
- [ ] Terms extracted shown in message

### ✅ Training Center Integration
- [ ] "Start Web Crawler" button visible in Echo Training Center
- [ ] Clicking starts crawl session
- [ ] Progress updates in real-time
- [ ] Crawler completes with recipe count

### ✅ Overall Training Session
- [ ] Initialize session: `POST /api/training/session/initialize`
- [ ] Start training: `POST /api/training/start` with all sources
- [ ] Web crawler actually runs
- [ ] PDF library processes uploaded terms
- [ ] Master dictionary gets updated
- [ ] Final summary shows all sources completed

---

## Deployment Notes

### For Local Development
```bash
# Install multer if not present
npm install multer

# Set environment variables in .env.local
SPOONACULAR_API_KEY=xxx
EDAMAM_API_ID=xxx
EDAMAM_API_KEY=xxx

# Restart dev server
npm run dev
```

### For Production
1. Set all environment variables in your deployment platform
2. Ensure API keys have sufficient quota
3. Monitor crawler logs for rate limiting
4. Consider proxy service for web scraping
5. Test with sample PDF batch before going live

---

## What This Enables

Once Phase 1 is complete:

✅ **Crawler actually works** - Not just "pending" status
✅ **PDF uploads work** - Drag & drop, batch processing
✅ **Real progress tracking** - See what's happening
✅ **All training modules callable** - From UI and API
✅ **Foundation for Phase 2** - Ready to scale to 180K terms

---

## Next Steps After Phase 1

Once Phase 1 is verified working:
1. Run load testing with 1,000 terms
2. Verify both Supabase and Pinecone receive data
3. Test "what is fond" query works
4. Then proceed to Phase 2 (database migration + embedding queue)

---

## Quick Reference: Files to Modify/Create

| Phase | File | Status | Type |
|-------|------|--------|------|
| 1.1 | server/routes/training-orchestration.ts | ✅ DONE | Edit |
| 1.2 | client/components/panels/EchoTrainingCenter.tsx | ⏳ TODO | Edit |
| 1.3 | client/components/panels/PDFBatchUploader.tsx | ✅ DONE | Create |
| 1.4 | server/routes/pdf-library-import.ts | ⏳ TODO | Edit |
| 1.5 | .env / deployment vars | ⏳ TODO | Config |
| 1.6 | client/components/panels/EchoTrainingCenter.tsx | ⏳ TODO | Edit |

**Total Implementation Time:** ~4-5 hours for remaining items
**Difficulty:** Medium (mostly plumbing, no complex logic)
**Risk:** Low (isolated changes, backward compatible)
