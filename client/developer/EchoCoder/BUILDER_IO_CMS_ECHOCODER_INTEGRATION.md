# Builder.io CMS + EchoCoder Integration

**Version:** 1.0  
**Status:** ✅ Complete and Ready for Production  
**Date:** 2025

---

## Overview

This integration enables EchoCoder to generate React components that are powered by Builder.io CMS content. Instead of static components, you can now create dynamic, content-managed modules that pull data directly from Builder.io.

## Key Features

✅ **Dynamic Content Generation** - Generate components that fetch from Builder.io CMS  
✅ **TypeScript Support** - Auto-generated TypeScript interfaces from CMS models  
✅ **Custom Hooks** - Built-in React hooks for managing CMS data  
✅ **Loading States** - Automatic loading and error handling  
✅ **Publishing Workflow** - Publish/unpublish content with version control  
✅ **Search & Filter** - Query Builder.io content with filtering  
✅ **No Builder.io Account Required** - Works with OpenAI API key + Builder.io API key

---

## Architecture

### Client-Side Components

#### 1. **Builder.io CMS Service** (`client/ecosystem/builder-io-cms.ts`)

```typescript
class BuilderIOCMSIntegration {
  - getContentModels()          // Fetch all content models
  - getContent(modelId)         // Get content entries
  - generateTypeDefinitions()   // Create TypeScript interfaces
  - generateFetchFunction()     // Create data fetching function
  - generateUseContentHook()    // Create custom React hook
  - generateCMSComponent()      // Full component generation
  - generateCMSPage()           // Full page generation
  - validateConnection()        // Test API connection
}
```

#### 2. **EchoCoder Service Updates** (`client/services/echocoderAI.ts`)

```typescript
-generateCMSModuleWithAI() - // Generate CMS-backed modules
  getBuilderIOModels() - // List available models
  getBuilderIOContent() - // Fetch content
  validateBuilderIOKey(); // Validate API connection
```

### Server-Side Routes

#### **Builder.io CMS API Routes** (`server/routes/builder-cms.ts`)

**Validation**

- `GET /api/builder-cms/validate` - Validate API key

**Models**

- `GET /api/builder-cms/models` - List all content models

**Content Operations**

- `GET /api/builder-cms/content/:modelId` - Get content entries (paginated)
- `GET /api/builder-cms/content/:modelId/:contentId` - Get single entry
- `POST /api/builder-cms/content/:modelId` - Create new entry
- `PATCH /api/builder-cms/content/:modelId/:contentId` - Update entry
- `DELETE /api/builder-cms/content/:modelId/:contentId` - Delete entry

**Publishing**

- `GET /api/builder-cms/content/:modelId/:contentId/status` - Publishing status
- `POST /api/builder-cms/content/:modelId/:contentId/publish` - Publish
- `POST /api/builder-cms/content/:modelId/:contentId/unpublish` - Unpublish

**Search**

- `GET /api/builder-cms/search?q=query&modelId=id` - Search content

#### **EchoCoder with CMS** (`server/routes/echocoder.ts`)

- `POST /api/echocoder/generate-cms` - Generate CMS-backed module

---

## Usage Guide

### Step 1: Set Up Builder.io API Key

Get your Builder.io API key from your Builder.io account dashboard:

1. Go to [Builder.io Dashboard](https://builder.io)
2. Navigate to Organization Settings
3. Copy your API key
4. Use it in EchoCoder or environment variables

### Step 2: Connect Builder.io CMS to EchoCoder

#### Option A: Direct Integration

```typescript
import { initBuilderIOCMS } from "@/ecosystem/builder-io-cms";

const cms = initBuilderIOCMS({
  apiKey: "YOUR_BUILDER_IO_API_KEY",
  spaceId: "YOUR_SPACE_ID", // Optional
});

// Validate connection
const isValid = await cms.validateConnection();
```

#### Option B: Via EchoCoder Service

```typescript
import {
  getBuilderIOModels,
  validateBuilderIOKey,
} from "@/services/echocoderAI";

// Validate connection
const isValid = await validateBuilderIOKey("YOUR_API_KEY");

// Get available models
const models = await getBuilderIOModels("YOUR_API_KEY");
```

### Step 3: Generate CMS-Backed Components

#### Using the Service

```typescript
import { generateCMSModuleWithAI } from "@/services/echocoderAI";

const module = await generateCMSModuleWithAI({
  description: "Blog post listing with featured image and metadata",
  moduleName: "BlogPosts",
  useBuilderCMS: true,
  cmsModelId: "blog-post-model-id",
});

console.log(module.componentCode); // Full component code
console.log(module.typeDefinitions); // TypeScript interfaces
console.log(module.fetchFunction); // Data fetching function
```

#### Generated Component Structure

```typescript
// Auto-generated TypeScript types
interface BlogPost {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  title: string;
  content: string;
  featuredImage: { url: string; altText?: string };
  author: string;
  publishedAt: Date;
}

// Auto-generated fetch function
async function fetchBlogPost(limit: number = 50) {
  const response = await fetch(`/api/builder-cms/content/blog-post-model-id?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch BlogPost');
  return await response.json() as BlogPostList;
}

// Auto-generated custom hook
function useBlogPost(limit: number = 50) {
  const [content, setContent] = useState<BlogPostList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchBlogPost(limit)
      .then(data => setContent(data))
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, [limit]);

  return { content, loading, error };
}

// Main component
export default function BlogPostsContent() {
  const { content, loading, error } = useBlogPost();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!content?.results.length) return <div>No content</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {content.results.map((post) => (
        <div key={post.id} className="p-4 border rounded">
          <h3 className="font-semibold">{post.title}</h3>
          <p className="text-sm text-gray-600">{post.content}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## API Reference

### Client API

#### `initBuilderIOCMS(config)`

Initialize the Builder.io CMS integration.

```typescript
interface BuilderIOConfig {
  apiKey: string; // Required: Your Builder.io API key
  spaceId?: string; // Optional: Specific space ID
  organization?: string; // Optional: Organization ID
}
```

#### `getBuilderIOModels(apiKey)`

Fetch all available content models from Builder.io.

**Returns:** `ContentModel[]`

```typescript
interface ContentModel {
  id: string;
  name: string;
  displayName: string;
  fields: ModelField[];
  description?: string;
}
```

#### `getBuilderIOContent(apiKey, modelId, limit)`

Fetch content entries from a specific model.

**Parameters:**

- `apiKey: string` - Builder.io API key
- `modelId: string` - Content model ID
- `limit?: number` - Number of entries to fetch (default: 50)

**Returns:** `BuilderContent[]`

#### `generateCMSModuleWithAI(request)`

Generate a CMS-backed module using AI.

**Parameters:**

```typescript
interface CMSModuleRequest {
  description: string; // What the module should do
  moduleName: string; // Name of the module
  useBuilderCMS: true; // Flag for CMS usage
  cmsModelId: string; // Builder.io model ID
}
```

**Returns:** `CMSGeneratedModule`

```typescript
interface CMSGeneratedModule {
  componentCode: string; // Full component code
  pageCode: string; // Page wrapper code
  moduleName: string; // Generated module name
  route: string; // Route path
  usesBuilderCMS: true; // Confirms CMS usage
  typeDefinitions: string; // TypeScript interfaces
  fetchFunction: string; // Data fetching function
  hooks: string[]; // Custom hooks
}
```

### Server API

#### `GET /api/builder-cms/validate`

Validate Builder.io API key.

**Headers:** `X-Builder-API-Key: YOUR_KEY`

**Response:** `{ valid: boolean; spaces?: any[] }`

#### `GET /api/builder-cms/models`

List all content models.

**Headers:** `X-Builder-API-Key: YOUR_KEY`

**Query:**

- `spaceId?: string` - Filter by space (optional)

**Response:** `ContentModel[]`

#### `GET /api/builder-cms/content/:modelId`

Get paginated content entries.

**Headers:** `X-Builder-API-Key: YOUR_KEY`

**Query:**

- `limit?: number` - Items per page (default: 50)
- `offset?: number` - Pagination offset (default: 0)

**Response:**

```typescript
{
  results: BuilderContent[];
  total: number;
  limit: number;
  offset: number;
}
```

#### `POST /api/builder-cms/content/:modelId`

Create new content entry.

**Headers:**

- `X-Builder-API-Key: YOUR_KEY`
- `Content-Type: application/json`

**Body:**

```json
{
  "data": {
    "title": "My Content",
    "description": "Content details"
  }
}
```

#### `PATCH /api/builder-cms/content/:modelId/:contentId`

Update existing content entry.

**Headers:**

- `X-Builder-API-Key: YOUR_KEY`
- `Content-Type: application/json`

**Body:**

```json
{
  "data": {
    "title": "Updated Title"
  }
}
```

#### `DELETE /api/builder-cms/content/:modelId/:contentId`

Delete content entry.

**Headers:** `X-Builder-API-Key: YOUR_KEY`

#### `POST /api/builder-cms/content/:modelId/:contentId/publish`

Publish content entry.

**Headers:** `X-Builder-API-Key: YOUR_KEY`

#### `POST /api/builder-cms/content/:modelId/:contentId/unpublish`

Unpublish content entry.

**Headers:** `X-Builder-API-Key: YOUR_KEY`

#### `GET /api/builder-cms/search`

Search content across models.

**Headers:** `X-Builder-API-Key: YOUR_KEY`

**Query:**

- `q: string` - Search query (required)
- `modelId?: string` - Limit to specific model

---

## Examples

### Example 1: Product Listing Module

```typescript
// Generate product listing that uses Builder.io CMS
const module = await generateCMSModuleWithAI({
  description:
    "Display products with images, prices, and add to cart functionality",
  moduleName: "ProductListing",
  useBuilderCMS: true,
  cmsModelId: "product",
});
```

**Generated Component:**

- Auto-fetches products from Builder.io CMS
- Displays with images, prices, descriptions
- Handles loading/error states
- Fully typed with TypeScript
- Production-ready

### Example 2: Blog Posts with Search

```typescript
const module = await generateCMSModuleWithAI({
  description:
    "Blog posts listing with featured image, author, publication date, and search",
  moduleName: "BlogArchive",
  useBuilderCMS: true,
  cmsModelId: "blog-post",
});
```

**Generated Component:**

- Lists blog posts from CMS
- Shows featured images and metadata
- Implements search functionality
- Paginated content loading
- Full TypeScript support

### Example 3: Team Members Directory

```typescript
const module = await generateCMSModuleWithAI({
  description:
    "Team members directory with profiles, roles, contact info, and social links",
  moduleName: "TeamDirectory",
  useBuilderCMS: true,
  cmsModelId: "team-member",
});
```

**Generated Component:**

- Grid/card layout for team members
- Profile images and bios
- Role and contact information
- Social media links
- Search/filter functionality

---

## Best Practices

### 1. **Error Handling**

Always handle loading and error states in generated components:

```typescript
if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
```

### 2. **Performance**

- Use pagination for large datasets
- Implement caching strategies
- Lazy load images

### 3. **Type Safety**

- Always use TypeScript interfaces for CMS data
- Validate data before rendering
- Handle missing/null values

### 4. **SEO**

- Include meta tags for CMS content
- Use semantic HTML
- Implement proper heading hierarchy

### 5. **Security**

- Keep API key in environment variables
- Never expose API key in client code
- Use CORS appropriately

---

## Troubleshooting

### Issue: "API key required" Error

**Solution:** Ensure API key is passed in `X-Builder-API-Key` header:

```typescript
fetch("/api/builder-cms/models", {
  headers: {
    "X-Builder-API-Key": "YOUR_KEY",
  },
});
```

### Issue: "Failed to fetch content" Error

**Solution:** Check that:

1. API key is valid
2. Model ID exists
3. Model is published
4. Space/organization is correct

### Issue: TypeScript compilation errors

**Solution:** Regenerate component to ensure TypeScript interfaces match latest CMS model schema:

```typescript
const module = await generateCMSModuleWithAI({
  description: "Regenerate to sync types",
  moduleName: "UpdatedModule",
  useBuilderCMS: true,
  cmsModelId: "model-id",
});
```

### Issue: Content not updating in component

**Solution:** Ensure fetch function includes proper cache busting:

```typescript
useEffect(() => {
  fetch(`/api/builder-cms/content/${modelId}`)
    .then(...)
}, [modelId]); // Re-fetch when modelId changes
```

---

## Migration Guide

### From Static Components to CMS-Backed

**Before (Static):**

```typescript
export default function Products() {
  const [products] = useState([
    { id: 1, name: "Product 1", price: 99 }
  ]);
  return <div>{products.map(p => <div>{p.name}</div>)}</div>;
}
```

**After (CMS-Backed):**

```typescript
export default function Products() {
  const { content, loading, error } = useProduct();
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage />;
  return <div>{content?.results.map(p => <div>{p.name}</div>)}</div>;
}
```

### Benefits of Migration

��� Content managed centrally in Builder.io  
✅ No code deployment for content updates  
✅ Real-time content publishing  
✅ Better SEO with dynamic content  
✅ Reduced component maintenance

---

## Environment Variables

```bash
# Builder.io API Key
BUILDER_IO_API_KEY="your_api_key_here"

# OpenAI API Key (for EchoCoder)
ECHO_OPENAI_API_KEY="your_openai_key_here"

# Optional: Builder.io Space ID
BUILDER_IO_SPACE_ID="your_space_id"
```

---

## Support & Resources

- **Builder.io Docs**: https://www.builder.io/c/docs
- **EchoCoder Guide**: See ECHOCODER_IMPLEMENTATION.md
- **API Reference**: See API Reference section above
- **Examples**: See Examples section above

---

## Version History

### v1.0 (Current)

- ✅ Complete Builder.io CMS integration
- ✅ EchoCoder module generation with CMS support
- ✅ Full API endpoints for content management
- ✅ TypeScript support and type generation
- ✅ Publishing workflow integration
- ✅ Search and filtering capabilities
- ✅ Comprehensive documentation

---

## Next Steps

1. **Set up Builder.io account** and get API key
2. **Create content models** in Builder.io
3. **Generate CMS-backed modules** using EchoCoder
4. **Deploy** to your production server
5. **Manage content** directly in Builder.io

---

_This integration is production-ready and fully tested. Start generating content-managed modules with EchoCoder today!_
