# Photo Upload Queue System - Complete Guide

## Overview

The Gallery has been enhanced with a **Photo Upload Queue System** that allows you to:
- ✅ Drop multiple photos at once (up to 50 files)
- ✅ Hold photos temporarily in a queue until ready to upload
- ✅ Categorize and label photos before uploading
- ✅ Edit filenames and add tags to each photo
- ✅ Monitor upload progress and status
- ✅ Remove individual photos or clear the entire queue

## How It Works

### 1. **Adding Photos to the Queue**

There are three ways to add photos:

#### Option A: Drag & Drop
- Drag photos from your computer onto any drop zone in the Gallery
- The **Drop photos to edit instantly** area in the Photo Studio panel
- The main dropzone in the gallery grid area
- GallerySidebar drop zones

#### Option B: Click to Upload
- Click the "Upload" button in the Gallery Toolbar
- Select multiple photos from your file browser
- All selected photos are added to the queue

#### Option C: File Input
- Use the hidden file input (`accept="image/jpeg,image/png,image/webp,image/gif"`)
- Supports JPEG, PNG, WebP, and GIF formats

### 2. **Queue Capacity & Limits**

**File Limits:**
- Maximum 50 files per queue session
- Maximum 50MB per individual file
- Maximum 500MB total size per upload batch

**Supported Formats:**
- JPEG (image/jpeg)
- PNG (image/png)
- WebP (image/webp)
- GIF (image/gif)

**Size Validation:**
- Files exceeding 50MB are rejected automatically
- Unsupported formats are rejected automatically
- You'll see error messages for any invalid files

### 3. **Managing the Queue**

When photos are in the queue, the **Photo Queue Panel** appears on the right side, replacing the Photo Studio Panel.

#### Queue Panel Features:

**Header Information:**
- Total number of files in queue
- Total size of all files in MB

**Photo Cards:**
Each photo in the queue shows:
- **Preview Thumbnail**: Visual preview of the photo
- **Filename**: Current name (editable)
- **File Size**: Size in MB
- **Status Badge**: Shows upload status (pending/uploading/success/error)
- **Progress Bar**: During upload (uploading only)
- **Remove Button**: Delete individual photos

**Expand/Collapse:**
- Click any photo card to expand/collapse details
- Expanded view shows editing options

#### Editing Photos:

When you expand a photo card, you can:

**Edit Filename:**
- Change the name before upload
- Disabled after upload starts

**Add Tags:**
- Add comma-separated tags
- Tags appear as blue chips for easy identification
- Example: "appetizer, seafood, seasonal"
- Disabled after upload starts

#### Queue Status Bar:

Shows real-time statistics:
- 🔵 **Pending**: Photos waiting to be uploaded
- 🟡 **Uploading**: Photos currently being uploaded
- 🟢 **Done**: Successfully uploaded photos
- 🔴 **Errors**: Photos that failed to upload (if any)

### 4. **Processing the Queue**

**Upload Button:**
- Located at bottom of Photo Queue Panel
- Shows: "Upload [N] Files"
- Disabled if no pending photos
- Disabled while already uploading

**Process:**
1. Click "Upload Files" button
2. All pending photos start uploading with progress bars
3. Each photo displays upload progress (0-100%)
4. Status changes automatically: pending → uploading → success/error
5. Successful uploads are added to your gallery
6. Failed uploads show error messages

**What Happens to Tags:**
- Tags you added are applied to the uploaded images
- Tags are saved with the images in your gallery
- You can view/edit tags in the Photo Studio Panel

### 5. **Error Handling**

**Common Errors & Solutions:**

| Error | Cause | Solution |
|-------|-------|----------|
| "File exceeds 50MB limit" | File too large | Compress the image or use a smaller file |
| "Unsupported format" | Wrong file type | Convert to JPEG, PNG, WebP, or GIF |
| "Queue is full" | 50 file limit reached | Upload pending files first, then add more |
| "Total size would exceed 500MB" | Batch too large | Upload in smaller batches |

### 6. **Queue Management Actions**

**Clear Button:**
- Located in the queue header
- Removes all files from queue
- Disabled during upload
- Use if you want to start fresh

**Remove Individual Photo:**
- Click the X button on any photo card
- Photo is removed from queue immediately
- Can be done during or after upload

**Clearing After Upload:**
- Successfully uploaded photos remain visible in queue
- You can remove them or clear the entire queue
- Queue automatically clears when you switch tabs

### 7. **User Feedback**

**Status Messages:**
The Gallery shows contextual messages:
- ✓ Added 5 files to queue. 45 more can be added.
- ⚠️ File exceeds 50MB limit
- ✓ Uploading 10 files...
- ✓ Added 10 images (1 file failed)
- ❌ Error uploading images: [details]

**Visual Indicators:**
- 🔵 Pulse: Photo pending upload
- 🟡 Spinner: Photo uploading
- 🟢 Checkmark: Photo successfully uploaded
- 🔴 Warning icon: Photo failed to upload

## Implementation Details

### New Files Created

1. **`client/hooks/use-photo-upload-queue.ts`**
   - Hook managing queue state and operations
   - Handles file validation and constraints
   - Provides `addPhotos()`, `removePhoto()`, `updatePhoto()`, `clearQueue()` methods
   - Calculates queue statistics

2. **`client/components/gallery/PhotoQueuePanel.tsx`**
   - UI component displaying queue and managing uploads
   - Shows photo cards with preview and status
   - Allows editing filenames and tags
   - Displays upload progress

3. **`client/components/gallery/index.ts`**
   - Export barrel for gallery components

### Modified Files

1. **`client/pages/sections/Gallery.tsx`**
   - Integrated `usePhotoUploadQueue` hook
   - Updated `handleFiles()` to add photos to queue instead of showing dialog
   - Implemented `handleProcessQueue()` for uploading
   - Fixed `Dropzone` to include `accept` attribute for image files
   - Conditional rendering: shows PhotoQueuePanel when queue has items, PhotoStudioPanel otherwise

### API Compatibility

The system works with existing:
- `addImages()` from AppDataContext
- `Dropzone` component
- Photo metadata (name, tags, favorite)
- Gallery filtering and sorting

## Configuration

All limits are configurable in `client/hooks/use-photo-upload-queue.ts`:

```typescript
export const MAX_QUEUE_SIZE = 50;                    // Maximum files per queue
export const MAX_FILE_SIZE = 50 * 1024 * 1024;      // 50MB per file
export const MAX_TOTAL_SIZE = 500 * 1024 * 1024;    // 500MB per batch
export const SUPPORTED_FORMATS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
];
```

To modify limits, update these constants and redeploy.

## UX/Flow Diagram

```
User drops/selects photos
         ↓
PhotoQueuePanel appears
         ↓
User edits filenames & tags
         ↓
User clicks "Upload Files"
         ↓
Photos upload with progress
         ↓
Status updates automatically
         ↓
Successful photos added to gallery
         ↓
User can remove queue items or clear
```

## Troubleshooting

### Queue won't accept files
- Check file format (must be JPEG, PNG, WebP, or GIF)
- Check file size (must be under 50MB)
- Check queue capacity (max 50 files)

### Photos won't upload
- Check your internet connection
- Check file permissions
- Try clearing the queue and re-adding files

### Queue panel not showing
- Add a photo using drag-and-drop or file input
- Check that photos are in "pending" status
- Refresh page if needed

### Progress bars stuck
- This shouldn't happen; contact support if it does
- Try clearing the queue and starting fresh

## Future Enhancements

Potential improvements for future versions:
- Batch edit: Apply same tags to multiple photos at once
- Photo preview: Click to see full-size preview before upload
- Drag to reorder: Change upload order by dragging
- Retry failed: One-click retry for failed uploads
- Resume upload: Continue interrupted uploads
- Compression: Auto-compress large files
- Smart tagging: AI-suggested tags based on image content
