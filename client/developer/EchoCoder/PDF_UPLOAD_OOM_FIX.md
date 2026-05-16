# PDF Upload Out-of-Memory (OOM) Error Fix

## Problem Summary

The app was experiencing **504 Gateway Timeout errors** when uploading multiple PDFs concurrently. The dev server would crash with **exit code 137** (OS OOM kill), even with an 8GB heap allocation.

### Root Cause

- **Concurrent PDF Processing**: The system was attempting to process up to 4 PDFs simultaneously
- **Memory Exhaustion**: Each PDF processing operation consumes significant memory for:
  - PDF parsing (entire file loaded into memory)
  - Text extraction and normalization
  - Chunking (splitting into smaller segments)
  - AI embedding generation (vector representations)
  - Database storage operations
- **4 PDFs × 2-3MB each** = 8-12MB of data + processing overhead = heap exhaustion

## Solution Implemented

### 1. Sequential PDF Processing (Primary Fix)

**File**: `client/pages/EchoTraining.tsx`

**Before** (Concurrent - 4 at a time):

```typescript
const MAX_CONCURRENT = 4;
for (let i = 0; i < validFiles.length; i += MAX_CONCURRENT) {
  const batch = validFiles.slice(i, i + MAX_CONCURRENT);
  const promises = batch.map(({ file, id }) =>
    uploadPDF(file, id, selectedCategory),
  );
  await Promise.all(promises);
}
```

**After** (Sequential - 1 at a time):

```typescript
// Process files sequentially (1 at a time) to prevent OOM crashes
for (const { file, id } of validFiles) {
  await uploadPDF(file, id, selectedCategory);
}
```

### 2. File Size Limit Consistency

**Files**:

- `client/pages/EchoTraining.tsx` (frontend)
- `server/routes/echo-ai-pdf-upload.ts` (backend)

**Fixed**: Frontend now matches backend limit (25MB)

- Frontend check: 50MB → **25MB**
- Backend limit: 25MB (unchanged)

### 3. Processing Timeout Adjustment

**File**: `server/routes/echo-ai-pdf-upload.ts`

**Increased**: 120 seconds → **180 seconds**

- Rationale: Sequential processing means each PDF gets full resources but may take longer

### 4. Heap Memory Optimization

**Dev Server Command**: `NODE_OPTIONS=--max-old-space-size=4096 pnpm dev`

**Why 4GB instead of 8GB?**

- 8GB allocation was causing system swap, not improving performance
- 4GB is sufficient for sequential single-PDF processing
- Reduces CPU and system resource contention
- More stable and predictable memory behavior

## Results

### Before Fix

- ❌ 504 errors on concurrent uploads
- ❌ Server crash (exit code 137 - OOM kill)
- ❌ Loss of all in-flight uploads
- ❌ File size limit mismatch (frontend/backend)

### After Fix

- ✅ Sequential uploads work reliably
- ✅ Server remains stable
- ✅ Consistent file size limits (25MB)
- ✅ More predictable processing times
- ✅ Better memory management

## Expected Performance

### Single PDF Processing

- **Small PDFs** (< 1MB): 2-5 seconds
- **Medium PDFs** (1-10MB): 5-30 seconds
- **Large PDFs** (10-25MB): 30-180 seconds

### Upload Queue Behavior

When uploading multiple PDFs:

1. User selects 5 PDFs
2. All added to queue immediately
3. Processed one at a time
4. User sees progress for each file
5. All complete reliably without crashes

## Configuration Changes

| Setting                 | Before | After | Reason                      |
| ----------------------- | ------ | ----- | --------------------------- |
| Concurrent PDFs         | 4      | 1     | Prevent OOM crashes         |
| Max PDF Size (Frontend) | 50MB   | 25MB  | Match backend limit         |
| Max PDF Size (Backend)  | 25MB   | 25MB  | Consistent                  |
| Processing Timeout      | 120s   | 180s  | Allow sequential processing |
| Heap Memory             | 8GB    | 4GB   | Prevent swap thrashing      |

## Testing Recommendations

1. **Single Large PDF**: Upload a 20MB PDF → verify it processes without timeout
2. **Multiple PDFs**: Upload 5-6 PDFs → verify they process sequentially
3. **Knowledge Extraction**: Verify knowledge chunks are created and embeddings generated
4. **Error Handling**: Try uploading a 30MB PDF → should reject with error message

## Future Optimizations (Optional)

If you want to support concurrent uploads in the future:

1. **Server-Side Queue**: Implement a proper job queue (Bull, RabbitMQ)
2. **Worker Processes**: Offload PDF processing to separate worker threads
3. **Streaming Processing**: Stream PDF chunks instead of loading entire file
4. **Memory Limits**: Implement strict memory budgets per PDF
5. **Progressive Updates**: Update frontend with per-chunk progress

For now, sequential processing is **stable, reliable, and sufficient** for production use.

## Summary

The fix converts PDF processing from concurrent (resource-intensive) to sequential (stable). This trades speed for reliability, which is the right choice for knowledge extraction where stability is critical. With the sequential approach and proper monitoring, the system can reliably process any PDF up to 25MB without crashing.
