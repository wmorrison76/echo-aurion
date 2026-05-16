# ⚡ Performance Week 1 - WebP Image Optimization

**Timeline**: Week 1-2  
**Goal**: 50% image size reduction, implement LQIP placeholders  
**Expected Load Time Improvement**: Gallery 3s → 1.5s

---

## ✅ COMPLETED

### 1. Image Optimization Library
✅ Created `client/lib/image-optimization.ts`
- WebP format detection
- Responsive image srcset generation
- LQIP (Low Quality Image Placeholder) utilities
- Intersection Observer hook for lazy loading
- Image preloading utilities

### 2. Responsive Image Component
✅ Created `client/components/ResponsiveImage.tsx`
- Automatic WebP with JPG fallback
- Blur-up effect support
- Lazy loading with intersection observer
- Multiple variants (RecipeCardImage, GalleryImage, HeroImage, ThumbnailImage)

### 3. Server Image Processing
✅ Created `server/routes/images.ts`
- WebP conversion using sharp.js
- Automatic format negotiation based on browser support
- Caching headers configuration
- Image metadata endpoints

---

## 🚀 IMPLEMENTATION STEPS

### Step 1: Install Dependencies

```bash
npm install sharp
npm install --save-dev @types/sharp
```

**Estimated time**: 2 minutes

### Step 2: Register Image Routes

Update `server/index.ts`:

```typescript
import { 
  proxyRecipeImage, 
  serveRecipeImage,
  generateBlurhash,
  getImageMetadata 
} from './routes/images';

// ... in app setup ...

// Image serving routes
app.get('/api/images/proxy', proxyRecipeImage);
app.get('/api/images/recipes/:recipeId/:imageId', serveRecipeImage);
app.post('/api/images/blurhash', generateBlurhash);
app.get('/api/images/metadata', getImageMetadata);
```

**Estimated time**: 5 minutes

### Step 3: Update RecipeCard Component

Update lines 117-128 in `client/pages/sections/RecipeSearch.tsx`:

**Before:**
```typescript
{cover ? (
  <img
    src={cover}
    alt={r.title}
    className="h-full w-full rounded object-cover"
    loading="lazy"
  />
) : (
  <div className="flex h-full w-full items-center justify-center rounded bg-muted text-muted-foreground">
    No Image
  </div>
)}
```

**After:**
```typescript
{cover ? (
  <ResponsiveImage
    src={cover}
    alt={r.title}
    width={110}
    height={110}
    aspectRatio="1/1"
    blurhash={r.blurhash}
    className="rounded"
    objectFit="cover"
  />
) : (
  <div className="flex h-full w-full items-center justify-center rounded bg-muted text-muted-foreground">
    No Image
  </div>
)}
```

**Add import at top of file:**
```typescript
import { ResponsiveImage } from '@/components/ResponsiveImage';
```

**Estimated time**: 10 minutes

### Step 4: Update Gallery Component Images

Locate all `<img>` tags in `client/pages/sections/Gallery.tsx` around lines 2606, 2714, 2876.

**Example update:**

**Before:**
```typescript
<img
  src={r.imageDataUrls[0]}
  alt={r.title}
/>
```

**After:**
```typescript
<GalleryImage
  src={r.imageDataUrls[0]}
  alt={r.title}
  blurhash={r.blurhash}
/>
```

**Add import:**
```typescript
import { GalleryImage } from '@/components/ResponsiveImage';
```

**Estimated time**: 15 minutes

### Step 5: Test WebP Serving

1. Open DevTools Network tab
2. Navigate to recipes page
3. Check image requests:
   - Chrome/Edge: Should see `image/webp` in Content-Type
   - Firefox/Safari: Should see `image/jpeg` in Content-Type
4. Check image sizes:
   - WebP images should be 30-50% smaller
   - File sizes visible in Network tab

**Estimated time**: 10 minutes

### Step 6: Performance Testing

Run Lighthouse audit:

```bash
# Build production bundle
npm run build

# Test locally
npm run preview
```

Then use DevTools Lighthouse or:

```bash
npx lighthouse http://localhost:4173 --view
```

**Expected improvements:**
- Image loading: Faster
- Largest Contentful Paint (LCP): <2.5s
- Performance score: 75+ → 85+

**Estimated time**: 15 minutes

---

## 🔧 FILE CHANGES SUMMARY

### New Files Created
- ✅ `client/lib/image-optimization.ts` (250 lines)
- ✅ `client/components/ResponsiveImage.tsx` (233 lines)
- ✅ `server/routes/images.ts` (235 lines)

### Files to Modify
- `server/index.ts` (add image routes)
- `client/pages/sections/RecipeSearch.tsx` (update RecipeCard image)
- `client/pages/sections/Gallery.tsx` (update gallery images)

### Total Changes
- ~50 lines changed across 2 files
- All changes are additions/replacements (no breaking changes)

---

## 📊 EXPECTED RESULTS

### Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|------------|
| Recipe Card Image | 100KB JPG | 45KB WebP | 55% smaller |
| Gallery Load | 3s | 1.5s | 50% faster |
| Initial Load | 2-3s | <1.5s | 25-50% faster |
| Lighthouse Performance | 75 | 85+ | +10 |

### Browser Support

| Browser | Support | Format Served |
|---------|---------|--------------|
| Chrome 23+ | ✅ | WebP |
| Edge 18+ | ✅ | WebP |
| Firefox 65+ | ✅ | WebP |
| Safari 16+ | ✅ | WebP |
| Safari <16 | ✅ Fallback | JPG |
| IE 11 | ✅ Fallback | JPG |

---

## 🚨 TROUBLESHOOTING

### Images not loading?
- Check Network tab for failed requests
- Verify server routes registered correctly
- Check browser console for errors
- Ensure `sharp` module is installed

### WebP not being served?
- Check `Accept` header includes `image/webp`
- Verify browser version supports WebP
- Check server logs for conversion errors
- Try forcing format: `?format=webp`

### Blur-up not showing?
- Ensure `blurhash` property is passed to component
- Check CSS opacity transitions
- Verify placeholder URL is valid data URI

---

## 📋 WEEK 1 CHECKLIST

- [ ] Install sharp dependency
- [ ] Register image routes in server
- [ ] Update RecipeCard component
- [ ] Update Gallery component images
- [ ] Test WebP serving in DevTools
- [ ] Run Lighthouse audit
- [ ] Verify performance improvement
- [ ] Commit changes to git
- [ ] Mark task complete

---

## 🎯 NEXT STEPS

Once Week 1 is complete:
1. **Week 2**: Add blur-up LQIP with blurhash library
2. **Week 2-3**: Implement server-side pagination
3. **Week 3**: Database query optimization

**Estimated total performance improvement by Week 4**: 50% faster load times

---

## 📚 RESOURCES

- [Sharp.js Documentation](https://sharp.pixelplumbing.com/)
- [WebP Format](https://developers.google.com/speed/webp)
- [React Picture Element](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)
- [Lighthouse Performance](https://developers.google.com/web/tools/lighthouse/audits/speed-index)

**Ready to start implementing? Follow the steps above in order.**
