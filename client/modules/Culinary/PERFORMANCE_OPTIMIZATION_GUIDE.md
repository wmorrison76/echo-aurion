# ⚡ Performance Optimization Guide - Implementation Details

**Goal**: Reduce load times from 2-3s to <1.5s  
**Timeline**: 4 weeks  
**Team Size**: 2 engineers

---

## WEEK 1-2: IMAGE OPTIMIZATION

### Step 1: WebP Conversion Pipeline

#### 1.1 Install Dependencies
```bash
npm install sharp
npm install --save-dev @types/sharp
```

#### 1.2 Create WebP Converter Utility

Create `client/lib/image-optimization.ts`:

```typescript
import sharp from 'sharp';

export interface ImageOptimizationOptions {
  webpQuality?: number;
  jpgQuality?: number;
  width?: number;
  height?: number;
}

/**
 * Convert image to WebP format
 * Falls back to JPG for older browsers
 */
export async function convertToWebP(
  imagePath: string,
  options: ImageOptimizationOptions = {}
): Promise<{
  webp: Buffer;
  jpg: Buffer;
  width: number;
  height: number;
}> {
  const {
    webpQuality = 75,
    jpgQuality = 80,
    width,
    height
  } = options;

  let transform = sharp(imagePath);

  // Resize if dimensions provided
  if (width || height) {
    transform = transform.resize(width, height, {
      fit: 'cover',
      withoutEnlargement: true
    });
  }

  // Get metadata for dimensions
  const metadata = await transform.metadata();

  // Create WebP version
  const webp = await transform
    .webp({ quality: webpQuality })
    .toBuffer();

  // Create JPG fallback
  const jpg = await sharp(imagePath)
    .resize(width, height, {
      fit: 'cover',
      withoutEnlargement: true
    })
    .jpeg({ quality: jpgQuality })
    .toBuffer();

  return {
    webp,
    jpg,
    width: metadata.width || 0,
    height: metadata.height || 0
  };
}

/**
 * Generate blurhash from image for LQIP (Low Quality Image Placeholder)
 */
export async function generateBlurhash(imagePath: string): Promise<string> {
  const blurhash = await import('blurhash');
  
  const buffer = await sharp(imagePath)
    .resize(100, 100, { fit: 'cover' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = buffer;
  const hash = blurhash.encode(
    new Uint8ClampedArray(data),
    info.width,
    info.height,
    4,
    4
  );

  return hash;
}
```

#### 1.3 Create Server Endpoint for Image Serving

Update `server/routes/recipeImage.ts`:

```typescript
import { Router } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { convertToWebP } from '../lib/image-optimization';

const router = Router();

// GET /api/images/:recipeId/:imageName
// Accepts ?format=webp or ?format=jpg (defaults to auto-detect)
router.get('/api/images/:recipeId/:imageName', async (req, res) => {
  try {
    const { recipeId, imageName } = req.params;
    const { format = 'auto', width, height } = req.query;
    
    // Validate user has access to this recipe
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Build image path (adjust based on storage)
    const imagePath = path.join(
      process.env.UPLOADS_DIR || './uploads',
      recipeId,
      imageName
    );

    // Check if file exists
    try {
      await fs.access(imagePath);
    } catch {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Set cache headers for long-term caching
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('ETag', `"${recipeId}-${imageName}"`);

    // Determine which format to serve
    const acceptHeader = req.get('Accept') || '';
    const supportsWebP = acceptHeader.includes('image/webp');
    const requestedFormat = format === 'auto' 
      ? (supportsWebP ? 'webp' : 'jpg')
      : format;

    // Convert and serve
    const { webp, jpg } = await convertToWebP(imagePath, {
      width: width ? parseInt(width as string) : undefined,
      height: height ? parseInt(height as string) : undefined,
      webpQuality: 75,
      jpgQuality: 80
    });

    const buffer = requestedFormat === 'webp' ? webp : jpg;
    const contentType = requestedFormat === 'webp' 
      ? 'image/webp' 
      : 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.send(buffer);
  } catch (error) {
    console.error('Image serving error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

#### 1.4 Update Image Components

Update `client/pages/sections/Gallery.tsx`:

```typescript
interface ResponsiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  blurhash?: string;
  className?: string;
}

function ResponsiveImage({
  src,
  alt,
  width = 400,
  height = 300,
  blurhash,
  className
}: ResponsiveImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Build image srcset for different sizes
  const imageSrcSet = `
    ${src}?format=auto&width=400 400w,
    ${src}?format=auto&width=800 800w,
    ${src}?format=auto&width=1200 1200w
  `;

  // Build fallback srcset
  const jpgSrcSet = `
    ${src}?format=jpg&width=400 400w,
    ${src}?format=jpg&width=800 800w
  `;

  return (
    <div
      className={cn('relative overflow-hidden bg-gray-100', className)}
      style={{
        aspectRatio: `${width}/${height}`,
        backgroundImage: blurhash 
          ? `url('data:image/svg+xml;base64,...')`
          : undefined
      }}
    >
      <picture>
        <source 
          srcSet={imageSrcSet} 
          type="image/webp"
        />
        <img
          src={src}
          srcSet={jpgSrcSet}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            imageLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      </picture>
    </div>
  );
}
```

Update `client/pages/sections/RecipeSearch.tsx`:

```typescript
// In recipe card rendering:
<ResponsiveImage
  src={recipe.imageUrl}
  alt={recipe.name}
  width={300}
  height={225}
  blurhash={recipe.blurhash}
  className="rounded-lg"
/>
```

### Step 2: Blur-up / LQIP (Low Quality Image Placeholder)

#### 2.1 Install Blurhash
```bash
npm install blurhash
npm install --save-dev @types/blurhash
```

#### 2.2 Create Blurhash Decoder

Update `client/lib/image-optimization.ts`:

```typescript
import { decode as decodeBlurhash } from 'blurhash';

/**
 * Decode blurhash to data URL for preview
 */
export function blurhashToDataUrl(hash: string, width = 32, height = 24): string {
  const pixels = decodeBlurhash(hash, width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imageData = ctx.createImageData(width, height);
  imageData.data.set(pixels);
  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL();
}

/**
 * React hook for lazy loading images with blurhash
 */
export function useLazyImage(blurhash?: string) {
  const [placeholder, setPlaceholder] = useState<string>('');

  useEffect(() => {
    if (blurhash) {
      const dataUrl = blurhashToDataUrl(blurhash);
      setPlaceholder(dataUrl);
    }
  }, [blurhash]);

  return placeholder;
}
```

#### 2.3 Update Image Components with Placeholder

```typescript
function RecipeCard({ recipe }: { recipe: Recipe }) {
  const placeholder = useLazyImage(recipe.blurhash);

  return (
    <div className="recipe-card">
      <ResponsiveImage
        src={recipe.imageUrl}
        alt={recipe.name}
        blurhash={recipe.blurhash}
        placeholderSrc={placeholder}
      />
      {/* ... rest of card */}
    </div>
  );
}
```

---

## WEEK 2-3: SERVER-SIDE PAGINATION

### Step 1: Create Pagination API

Update `server/routes/recipe.ts`:

```typescript
interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  filter?: Record<string, any>;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// GET /api/recipes?page=1&limit=50&sort=name&filter[status]=published
router.get('/recipes', async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const sort = (req.query.sort as string) || 'created_at';
    const offset = (page - 1) * limit;

    // Build filter
    const filters: Record<string, any> = {
      user_id: userId,
      ...req.query.filter
    };

    // Execute count query
    const countResult = await supabase
      .from('recipes')
      .select('count()', { count: 'exact' })
      .match(filters);

    const total = countResult.count || 0;

    // Execute data query
    const { data: items, error } = await supabase
      .from('recipes')
      .select('*')
      .match(filters)
      .order(sort, { ascending: sort.startsWith('-') ? false : true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const response: PaginatedResponse<any> = {
      items: items || [],
      total,
      page,
      limit,
      hasNextPage: offset + limit < total,
      hasPreviousPage: page > 1
    };

    res.json(response);
  } catch (error) {
    console.error('Recipe fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Step 2: Create React Pagination Hook

Create `client/hooks/use-paginated-recipes.ts`:

```typescript
interface UsePaginatedRecipesOptions {
  limit?: number;
  sort?: string;
  filter?: Record<string, any>;
}

export function usePaginatedRecipes(options: UsePaginatedRecipesOptions = {}) {
  const [page, setPage] = useState(1);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const limit = options.limit || 50;

  const fetchRecipes = async (pageNum: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(limit),
        sort: options.sort || 'created_at'
      });

      // Add filters
      if (options.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          params.append(`filter[${key}]`, String(value));
        });
      }

      const response = await fetch(`/api/recipes?${params}`);
      const data = await response.json();

      setRecipes(data.items);
      setTotal(data.total);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    recipes,
    loading,
    page,
    total,
    limit,
    hasNextPage: (page - 1) * limit + limit < total,
    hasPreviousPage: page > 1,
    goToPage: fetchRecipes,
    nextPage: () => fetchRecipes(page + 1),
    previousPage: () => fetchRecipes(page - 1),
    refetch: () => fetchRecipes(page)
  };
}
```

### Step 3: Update RecipeSearch Component

Update `client/pages/sections/RecipeSearch.tsx`:

```typescript
export default function RecipeSearch() {
  const { recipes, loading, page, hasNextPage, goToPage, nextPage } = 
    usePaginatedRecipes({
      limit: 50,
      sort: 'created_at'
    });

  return (
    <div>
      {/* Recipes grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {recipes.map(recipe => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex gap-4 mt-8 justify-center">
        <button 
          onClick={() => goToPage(page - 1)} 
          disabled={page === 1}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button 
          onClick={nextPage} 
          disabled={!hasNextPage}
        >
          Next
        </button>
      </div>

      {/* Infinite scroll alternative */}
      <InfiniteScroll
        dataLength={recipes.length}
        next={nextPage}
        hasMore={hasNextPage}
        loader={<LoadingSpinner />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {recipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      </InfiniteScroll>
    </div>
  );
}
```

---

## WEEK 3: DATABASE OPTIMIZATION

### Step 1: Add Database Indexes

Create migration `supabase/migrations/004_add_performance_indexes.sql`:

```sql
-- Index for recipe searches by status
CREATE INDEX idx_recipes_user_status 
ON recipes(user_id, status) 
WHERE is_deleted = false;

-- Index for recipe searches by creation date
CREATE INDEX idx_recipes_user_created 
ON recipes(user_id, created_at DESC) 
WHERE is_deleted = false;

-- Index for recipe searches by cuisine
CREATE INDEX idx_recipes_user_cuisine 
ON recipes(user_id, cuisine_type) 
WHERE is_deleted = false;

-- Index for ingredient searches
CREATE INDEX idx_ingredients_recipe 
ON ingredients(recipe_id, is_active);

-- Index for gallery images
CREATE INDEX idx_gallery_images_recipe 
ON gallery_images(recipe_id, created_at DESC);

-- Composite index for common filters
CREATE INDEX idx_recipes_filter_composite 
ON recipes(user_id, status, cuisine_type, created_at DESC) 
WHERE is_deleted = false;

-- Analyze table to update statistics
ANALYZE recipes;
ANALYZE ingredients;
ANALYZE gallery_images;
```

### Step 2: Optimize Common Queries

Update `client/lib/recipe-queries.ts`:

```typescript
/**
 * Optimized query for recipe search with filters
 */
export async function searchRecipes(
  userId: string,
  options: {
    status?: 'draft' | 'published' | 'archived';
    cuisine?: string;
    difficulty?: string;
    limit?: number;
    offset?: number;
  }
) {
  let query = supabase
    .from('recipes')
    .select('id, name, description, cuisine_type, difficulty, created_at, image_url')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  // Apply filters only if provided
  if (options.status) query = query.eq('status', options.status);
  if (options.cuisine) query = query.eq('cuisine_type', options.cuisine);
  if (options.difficulty) query = query.eq('difficulty', options.difficulty);

  // Apply pagination
  const limit = options.limit || 50;
  const offset = options.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return { data, total: count || 0 };
}

/**
 * Get recipe with minimal joins (avoid N+1 queries)
 */
export async function getRecipeOptimized(recipeId: string) {
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select(`
      *,
      ingredients:ingredients(
        id, 
        name, 
        quantity, 
        unit, 
        cost, 
        yield_percent
      ),
      gallery_images:gallery_images(
        id,
        url,
        blurhash,
        created_at
      )
    `)
    .eq('id', recipeId)
    .single();

  if (error) throw error;
  return recipe;
}
```

---

## WEEK 3-4: CACHING & SERVICE WORKER

### Step 1: Create Service Worker

Create `client/service-worker.ts`:

```typescript
const CACHE_NAME = 'echo-recipe-pro-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/app.css'
];

// Install event - cache static assets
self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Fetch event - serve from cache, update in background
self.addEventListener('fetch', (event: any) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API requests for now (handle separately)
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful API responses for offline
          if (response.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Serve static assets from cache, update in background
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      const fetchPromise = fetch(request).then(response => {
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, response.clone());
        });
        return response;
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// Cleanup old caches
self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
```

### Step 2: Register Service Worker

Update `client/App.tsx`:

```typescript
// Register service worker on app load
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered:', registration);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  }
}, []);
```

### Step 3: Configure HTTP Cache Headers

Update `server/index.ts`:

```typescript
// Add cache headers for static assets
app.use(express.static('dist/spa', {
  maxAge: '1d', // Browser cache for 1 day
  etag: false, // Disable ETag for immutable assets
  setHeaders: (res, path) => {
    if (path.endsWith('.js') || path.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

// API response caching
app.get('/api/recipes', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  // ... handler
});
```

---

## WEEK 4: MOBILE OPTIMIZATION

### Step 1: Mobile-Specific Image Handling

Update `client/lib/image-optimization.ts`:

```typescript
/**
 * Get appropriate image size based on device
 */
export function getResponsiveImageSizes() {
  const isMobile = window.innerWidth < 768;
  return {
    small: isMobile ? 200 : 400,
    medium: isMobile ? 400 : 800,
    large: isMobile ? 600 : 1200
  };
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(baseUrl: string) {
  const sizes = getResponsiveImageSizes();
  return `
    ${baseUrl}?format=auto&width=200 200w,
    ${baseUrl}?format=auto&width=400 400w,
    ${baseUrl}?format=auto&width=800 800w,
    ${baseUrl}?format=auto&width=1200 1200w
  `;
}
```

### Step 2: Mobile-Specific Bundle Optimization

Update `vite.config.ts`:

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep existing chunks
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
          
          // Mobile-specific: lazy load heavy libs
          'charts': ['recharts'],
          'graphics': ['three'],
          
          // Split vendor code
          'vendor-ui': ['@radix-ui/react-dialog'],
          'vendor-forms': ['react-hook-form'],
        }
      }
    }
  }
});
```

### Step 3: Mobile Gallery Optimization

Update `client/pages/sections/Gallery.tsx`:

```typescript
export default function Gallery() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const columns = isMobile ? 1 : 4;

  return (
    <div className={cn(
      'grid gap-4',
      isMobile && 'grid-cols-1',
      !isMobile && 'md:grid-cols-2 lg:grid-cols-4'
    )}>
      {/* Gallery items */}
    </div>
  );
}
```

---

## PERFORMANCE MONITORING

### Setup Lighthouse CI

Create `.github/workflows/lighthouse.yml`:

```yaml
name: Lighthouse CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          configPath: './lighthouserc.json'
          uploadArtifacts: true
          temporaryPublicStorage: true
```

Create `lighthouserc.json`:

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000"],
      "numberOfRuns": 3,
      "settings": {
        "chromeFlags": "--headless"
      }
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

---

## PERFORMANCE CHECKLIST

- [ ] Week 1-2: WebP pipeline + blur-up implemented
- [ ] Week 1-2: Images loading optimized (Gallery: 3s → 1.5s)
- [ ] Week 2: Code splitting audit completed
- [ ] Week 2-3: Server pagination API created
- [ ] Week 3: Database indexes created + analyzed
- [ ] Week 3-4: Service worker installed
- [ ] Week 4: Mobile bundle optimized
- [ ] Week 4: Lighthouse score: 75 → 90+
- [ ] All: Performance monitoring (Lighthouse CI) active

---

## EXPECTED RESULTS

| Metric | Before | After | Improvement |
|--------|--------|-------|------------|
| Page Load | 2-3s | <1.5s | 50% |
| Mobile Load | 3-4s | <2s | 40-50% |
| Recipe Search | 2s | <500ms | 75% |
| Gallery Load | 3s | <1.5s | 50% |
| Image Size | 100KB | 30-50KB | 50-70% |
| Bundle Size (gzip) | 405KB | 380KB | 6% |
| Lighthouse Score | 75 | 90+ | +15 |

---

## ROLLOUT PLAN

1. **Week 1-2**: Deploy WebP + blur-up
2. **Week 2-3**: Deploy pagination + database indexes
3. **Week 3-4**: Deploy service worker + caching
4. **Week 4**: Monitor performance improvements; iterate

**All changes deployed behind feature flags for safe rollout**
