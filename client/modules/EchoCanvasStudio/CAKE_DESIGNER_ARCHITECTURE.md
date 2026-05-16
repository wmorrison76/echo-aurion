# Enterprise Cake Designer: Technical Architecture & System Design

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    LUCCCA Framework (Main App)                  │
│  - Authentication                                               │
│  - User Management                                              │
│  - Bakery Context                                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │ (passes context via props)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Cake Designer Module (Self-Contained)              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                   CakeStudio.tsx                        │  │
│  │  (Main orchestrator for design flow)                    │  │
│  └────────┬────────────────────────┬──────────────┬────────┘  │
│           │                        │              │            │
│   ┌───────▼──────┐    ┌───────────▼────┐ ┌──────▼──────┐    │
│   │ Cake3DViewer │    │ LayersPanel    │ │ ControlPanel│    │
│   │ (Three.js)   │    │ (per-layer UI) │ │ (colors,    │    │
│   │ - Rotation   │    │ - Add/Delete   │ │  frosting)  │    │
│   │ - Slice view │    │ - Opacity      │ │             │    │
│   │ - 360° view  │    │ - Regenerate   │ │             │    │
│   └──────────────┘    └────────────────┘ └─────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │           AI Generation Pipeline                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │  │
│  │  │ DALL-E 3    │  │ SDXL (Trans) │  │ Leonardo.ai  │ │  │
│  │  │ (quick prev)│  │ (layers)     │  │ (fallback)   │ │  │
│  │  └───���──────────┘  └──────────────┘  └──────────────┘ │  │
│  │                       │                                │  │
│  │                  ┌────▼─────────────────┐              │  │
│  │                  │ LayerCompositor.ts   │              │  │
│  │                  │ (Combine trans images)              │  │
│  │                  └──────────────────────┘              │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │     Real-Time Collaboration & Sync                      │  │
│  │  ┌──────────────────┐  ┌────────────────────────────┐ │  │
│  │  │ RealtimeManager  │  │ CollaborationManager       │ │  │
│  │  │ (WebSocket/      │  │ - Session management      │ │  │
│  │  │  Supabase RT)    │  │ - Permission transfers    │ │  │
│  │  └──────────────────┘  │ - Event logging           │ │  │
│  │                        └────────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Cost Calculation & Template Management                 │  │
│  │  ┌────────────────────┐  ┌──────────────────────────┐  │  │
│  │  │ CostCalculator     │  │ TemplateGallery          │  │  │
│  │  │ - Ingredients      │  │ - Browse templates       │  │  │
│  │  │ - Labor rates      │  │ - Share with team        │  │  │
│  │  │ - Markup pricing   │  │ - Duplicate/modify       │  │  │
│  │  │ - Multi-cake order │  │ - Rating & usage stats   │  │  │
│  │  └────────────────────┘  └──────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Data Persistence Layer                                 │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │  Supabase (Database)                             │  │  │
│  │  │  - designs (cake specifications)                 │  │  │
│  │  │  - cake_templates (saved designs for reuse)      │  │  │
│  ��  │  - design_sessions (collab sessions)             │  │  │
│  │  │  - collaboration_events (audit log)              │  │  │
│  │  │  - design_versions (history/undo)                │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │  Cloud Storage (Images)                          │  │  │
│  │  │  - Layer images (PNG with transparency)          │  │  │
│  │  │  - Composite cake images                         │  │  │
│  │  │  - Template thumbnails                           │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Backend Services (Node.js)                    │
│                                                                 │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────┐  │
│  │ /generate-image  │ │ /generate-layer  │ │ /save-design │  │
│  │ (DALL-E 3)       │ │ (SDXL transparent)               │  │
│  └──────────────────┘ └──────────────────┘ └──────────────┘  │
│                                                                 │
│  ┌──────────────────┐ ┌──────────────────┐                    │
│  │ /templates       │ │ /collab-events   │                    │
│  │ (CRUD ops)       │ │ (logging)        │                    │
│  └──────────────────┘ └──────────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. Design Creation & Collaboration Flow

```
User A starts design
    │
    ├─→ CakeStudio loads (initialize design state)
    │
    ├─→ Auto-save to Supabase:
    │   POST /api/save-design
    │       → designs table
    │       → design_versions table
    │
    ├─→ Initialize RealtimeManager:
    │   subscribe("design:123", userA_id)
    │       → Supabase Realtime channel
    │
    └─→ Create session:
        CollaborationManager.createSession()
            → design_sessions table
            → mode: "readonly" (if inviting viewer)


User B joins to view
    │
    ├─→ Loads same design ID
    │
    ├─→ CollaborationManager.joinSession(sessionId, userB_id)
    │   → Updates viewers array in design_sessions
    │   → Logs "join" event in collaboration_events
    │
    └─→ RealtimeManager.subscribe(designId, userB_id)
        → Listens for broadcast changes
        → Receives updates every 2 seconds


User A makes changes (e.g., changes frosting color)
    │
    ├─→ handleDesignChange("color", "#ff0000")
    │
    ├─→ setDesign state updates locally (instant UI update)
    │
    ├─→ broadcastChange({ color: "#ff0000" })
    │   → Sends to Supabase Realtime channel
    │
    ├─→ Auto-save timer triggers (5 seconds)
    │   → POST /api/save-design
    │   → Updates designs table
    │   → Creates new design_versions entry
    │
    └─→ User B's RealtimeManager receives broadcast
        → Calls onDesignChange listener
        → Updates User B's local state
        → User B sees change in real-time (1-2 second latency)
```

---

### 2. Per-Layer AI Generation Flow

```
User clicks "Generate Layer" for Tier 1
    │
    ├─→ Gathers config:
    │   {
    │     tier: { diameter: 10, height: 4 },
    │     style: { frosting: "buttercream", color: "#d4a373" },
    │     transparent: true
    │   }
    │
    ├─→ POST /api/generate-layer
    │   └─→ Server calls SDXL API (Replicate)
    │       ├─→ Prompt: "Buttercream frosting, 10 inch round cake tier..."
    │       ├─→ Negative: "background, other cakes, crumbs"
    │       ├─→ Response: Prediction ID (async)
    │       └─→ Poll for completion (30-60 seconds)
    │
    ├─→ Returns imageUrl (PNG with alpha channel)
    │
    ├─→ Frontend stores in layers array:
    │   {
    │     id: "uuid",
    │     type: "tier",
    │     imageUrl: "/api/proxy-image?...",
    │     seed: "abc123",
    │     transparency: true
    │   }
    │
    ├─→ User can:
    │   ├─→ Regenerate (same or different style)
    │   ├─→ Delete
    │   └─→ Adjust opacity/position
    │
    └─→ Layer composition triggers automatically:
        LayerCompositor.compose()
            ├─→ Creates OffscreenCanvas
            ├─→ Loads each layer image
            ├─→ Composites in order (base to top)
            ├─→ Exports as PNG (preserves transparency)
            └─→ Uploads to cloud storage
                → Saves URL to design.composedImageUrl
                → Broadcasts change to collaborators
```

---

### 3. Template Sharing Flow

```
User A saves a design as template
    │
    ├─→ Clicks "Save as Template"
    │
    ├─→ Creates CakeTemplate:
    │   {
    │     id: "uuid",
    │     bakery_id: "resort-main",
    │     name: "Classic Wedding Blush",
    │     category: "wedding",
    │     design_data: { ...full design },
    │     sharing: { shared: false, shared_with: [] },
    │     created_by: userA_id
    │   }
    │
    ├─→ INSERT into cake_templates
    │
    └─→ Template now in User A's personal gallery


User A shares with User B
    │
    ├─→ Clicks share button on template
    │
    ├─→ Updates template.sharing:
    │   { shared: true, shared_with: [userB_id], can_duplicate: true }
    │
    ├─→ User B sees notification "Template shared with you"
    │
    └─→ User B's TemplateGallery updates:
        ├─→ User B can click "Use Template"
        ├─→ Creates new DesignData from template
        ├─→ Opens in CakeStudio for customization
        └─→ Can save as independent design (doesn't modify original)


User B modifies template and wants to save as variant
    │
    ├─→ Makes changes (different colors, decorations)
    │
    ├─→ Clicks "Save as New Template"
    │
    ├─→ Creates separate template entry:
    │   {
    │     id: "new-uuid",
    │     name: "Wedding Blush - Gold Accents",
    │     parent_template: "original-uuid",
    │     ...modified design
    │   }
    │
    └─→ Now both templates exist independently
        - Original unchanged
        - New variant available for reuse
```

---

## State Management Architecture

```
┌─────────────────────────────────────────────────────────┐
│           Local Component State (React Hooks)           │
│                                                         │
│  CakeStudio:                                           │
│  - design: DesignData (current cake)                  │
│  - layers: LayerData[] (per-tier images)              │
│  - selectedLayer: string (active layer)               │
│  - isGenerating: boolean (AI processing)              │
│                                                         │
│  Cake3DViewer:                                         │
│  - rotation: { x, y }                                 │
│  - sliceAngle: number                                 │
│  - showSlice: boolean                                 │
│                                                         │
└────────────────────────────────────────��────────────────┘
         │ Auto-save (debounced 5 sec)
         │ Real-time broadcast (2 sec)
         ▼
┌─────────────────────────────────────────────────────────┐
│            Supabase (Backend State Source)             │
│                                                         │
│  designs table:                                        │
│  - id, user_id, title, data (JSONB)                   │
│  - created_at, updated_at                             │
│                                                         │
│  design_versions table:                                │
│  - id, design_id, data (JSONB), version_number        │
│  - created_at, change_description                      │
│                                                         │
│  design_sessions table:                                │
│  - id, design_id, primary_chef_id, viewers (JSONB)    │
│  - mode (readonly/exclusive)                          │
│                                                         │
│  collaboration_events table:                           │
│  - id, design_id, event_type, user_id, data           │
│  - created_at (audit log)                             │
│                                                         │
│  cake_templates table:                                 │
│  - id, name, design_data (JSONB), sharing (JSONB)     │
│  - created_by, bakery_id                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
         │ Real-time pub/sub
         ▼
┌─────────────────────────────────────────────────────────┐
│   Supabase Realtime Channel (design:123)               │
│                                                         │
│   Broadcasts to all subscribers:                       │
│   - event: "design-change"                             │
│   - payload: { userId, change, timestamp }             │
│                                                         │
│   Updates propagate to other browsers in 1-2 sec      │
└────────────────────────────────��────────────────────────┘
```

---

## API Endpoints Specification

### 1. Image Generation

**POST /api/generate-image** (Existing - DALL-E 3)
```typescript
Request:
{
  prompt: string;
  size?: "1024x1024" | "1024x1792";
  quality?: "standard" | "hd";
}

Response:
{
  success: boolean;
  imageUrl: string;
  error?: string;
}
```

**POST /api/generate-layer** (NEW - SDXL with transparency)
```typescript
Request:
{
  tier: { diameter: number; height: number; shape: "round" | "square" };
  style: {
    frosting: "buttercream" | "fondant" | "ganache";
    color: string;        // hex
    texture: "smooth" | "ridged" | "rustic" | "piped";
    pattern?: string;
  };
  transparent: boolean;
  seed?: string;         // For reproducibility
}

Response:
{
  success: boolean;
  imageUrl: string;
  metadata: {
    tier: object;
    style: object;
    hasAlpha: boolean;
    width: number;
    height: number;
    seed: string;
  };
  error?: string;
}
```

### 2. Design Management

**GET /api/designs** (Existing)
```typescript
Returns: Design[] for current user
```

**POST /api/save-design** (Existing)
```typescript
Request: { designData, layers, metadata }
Response: { success, designId, version }
```

**GET /api/templates** (NEW)
```typescript
Query: { bakery_id, category?, search? }
Returns: CakeTemplate[]
```

**POST /api/templates** (NEW)
```typescript
Request: { name, category, design_data, thumbnail_url }
Response: { success, templateId }
```

**POST /api/templates/:id/share** (NEW)
```typescript
Request: { share_with: string[], permissions: object }
Response: { success, shared_with: string[] }
```

### 3. Collaboration

**WS /api/collab/:designId** (Real-time via Supabase)
```
Subscribe: design changes broadcast in real-time
Publish: broadcastChange(data)
```

**POST /api/designs/:id/session** (NEW)
```typescript
Request: { mode: "readonly" | "exclusive", viewers?: string[] }
Response: { success, sessionId }
```

**POST /api/sessions/:id/join** (NEW)
```typescript
Request: { userId }
Response: { success, viewers: string[] }
```

---

## Database Schema Details

### designs Table
```sql
CREATE TABLE designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR NOT NULL,           -- Who created it
  bakery_id VARCHAR NOT NULL,         -- Which resort
  title VARCHAR,
  description TEXT,
  
  -- Full design snapshot
  data JSONB NOT NULL,
  
  -- Metadata for quick lookup
  thumbnail_url VARCHAR,
  color_palette VARCHAR[],            -- Primary colors
  has_allergens BOOLEAN,
  allergen_list VARCHAR[],
  estimated_price NUMERIC,
  
  -- Status tracking
  is_published BOOLEAN DEFAULT false,
  is_trashed BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) 
    REFERENCES user_accounts(id),
  CONSTRAINT fk_bakery FOREIGN KEY (bakery_id)
    REFERENCES user_accounts(id)
);

CREATE INDEX idx_designs_user ON designs(user_id);
CREATE INDEX idx_designs_bakery ON designs(bakery_id);
CREATE INDEX idx_designs_updated ON designs(updated_at DESC);
```

### design_versions Table
```sql
CREATE TABLE design_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  version_number BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint,
  
  -- Complete design state at this version
  data JSONB NOT NULL,
  
  -- What changed
  change_description VARCHAR,
  changed_fields VARCHAR[],
  
  -- Who made the change
  changed_by VARCHAR NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_design FOREIGN KEY (design_id)
    REFERENCES designs(id)
);

CREATE INDEX idx_design_versions_design ON design_versions(design_id);
CREATE INDEX idx_design_versions_created ON design_versions(created_at DESC);
```

### cake_templates Table
```sql
CREATE TABLE cake_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bakery_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR NOT NULL,
  
  -- Full design snapshot
  design_data JSONB NOT NULL,
  
  -- AI seeds for reproducibility
  seeds JSONB,
  
  -- Visual
  thumbnail_url VARCHAR,
  
  -- Sharing & permissions
  sharing JSONB DEFAULT '{
    "shared": false,
    "shared_with": [],
    "can_duplicate": true,
    "can_modify": false
  }',
  
  -- Usage analytics
  metadata JSONB DEFAULT '{
    "usage_count": 0,
    "rating": 0,
    "cost_estimate": null,
    "last_used": null,
    "popular_variations": []
  }',
  
  created_by VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_bakery FOREIGN KEY (bakery_id)
    REFERENCES user_accounts(id)
);

CREATE INDEX idx_cake_templates_bakery ON cake_templates(bakery_id);
CREATE INDEX idx_cake_templates_category ON cake_templates(category);
```

### design_sessions Table
```sql
CREATE TABLE design_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  bakery_id VARCHAR NOT NULL,
  
  -- Collaboration info
  primary_chef_id VARCHAR NOT NULL,
  viewers JSONB DEFAULT '[]',  -- [{user_id, joined_at}]
  mode VARCHAR DEFAULT 'readonly',  -- readonly, exclusive, shared
  permission_transfer_required BOOLEAN DEFAULT true,
  
  -- Session tracking
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  
  CONSTRAINT fk_bakery FOREIGN KEY (bakery_id)
    REFERENCES user_accounts(id)
);

CREATE INDEX idx_design_sessions_design ON design_sessions(design_id);
CREATE INDEX idx_design_sessions_bakery ON design_sessions(bakery_id);
CREATE INDEX idx_design_sessions_status ON design_sessions(ended_at)
  WHERE ended_at IS NULL;
```

### collaboration_events Table
```sql
CREATE TABLE collaboration_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  session_id UUID REFERENCES design_sessions(id) ON DELETE SET NULL,
  
  event_type VARCHAR NOT NULL,  -- join, leave, change, comment, approval
  user_id VARCHAR NOT NULL,
  
  -- Event data
  data JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_user FOREIGN KEY (user_id)
    REFERENCES user_accounts(id)
);

CREATE INDEX idx_collaboration_events_design ON collaboration_events(design_id);
CREATE INDEX idx_collaboration_events_session ON collaboration_events(session_id);
CREATE INDEX idx_collaboration_events_created ON collaboration_events(created_at DESC);
```

---

## Performance Considerations

### 1. Auto-Save Optimization
```typescript
// Debounce: Wait 5 seconds after last change
// Only save if state actually changed
// Batch multiple changes into one request

const debouncedSave = useMemo(
  () => debounce(async (data) => {
    const hash = calculateHash(data);
    if (hash !== lastSaveHash) {
      await saveToSupabase(data);
      lastSaveHash = hash;
    }
  }, 5000),
  []
);
```

### 2. Real-Time Broadcast Optimization
```typescript
// Don't broadcast every keystroke
// Queue changes and broadcast every 2 seconds
// Only broadcast fields that changed

const broadcastQueue = useRef<Partial<DesignData>>({});

useEffect(() => {
  const interval = setInterval(() => {
    if (Object.keys(broadcastQueue.current).length > 0) {
      realtimeManager.broadcastChange(broadcastQueue.current);
      broadcastQueue.current = {};
    }
  }, 2000);
  return () => clearInterval(interval);
}, []);
```

### 3. Image Optimization
```typescript
// Compress layer images before upload
// Use WebP for smaller file sizes
// Cache in IndexedDB for offline support

const compressImage = async (blob: Blob): Promise<Blob> => {
  const canvas = await createImageBitmap(blob);
  const ctx = new OffscreenCanvas(canvas.width, canvas.height).getContext("2d");
  ctx?.drawImage(canvas, 0, 0);
  return new Promise(resolve => {
    canvas.convertToBlob({ type: "image/webp", quality: 0.8 }).then(resolve);
  });
};
```

### 4. Three.js Performance
```typescript
// Use LOD for distant objects
// Instancing for repeated decorations
// Geometry caching
// Texture atlasing

// Example: LOD for cake tiers
const tier1 = new THREE.LOD();
tier1.addLevel(highPolyMesh, 0);
tier1.addLevel(medPolyMesh, 5);
tier1.addLevel(lowPolyMesh, 20);
```

---

## Security Considerations

### 1. Row Level Security (RLS)
```sql
-- Only users from same bakery can see each other's designs
CREATE POLICY "Designs visible to bakery members"
  ON designs FOR SELECT
  USING (
    bakery_id = (
      SELECT bakery_id 
      FROM user_accounts 
      WHERE id = auth.uid()
    )
  );

-- Only design creator can modify
CREATE POLICY "Only creator can update"
  ON designs FOR UPDATE
  USING (user_id = auth.uid());
```

### 2. API Authentication
```typescript
// All API endpoints verify LUCCCA auth token
// Check user belongs to correct bakery
// Verify permissions (can design, can share, etc.)

app.post("/api/save-design", authenticateUser, async (req, res) => {
  const { user, bakery } = req.user;
  
  // Verify user can design
  if (!hasPermission(user, "can-design")) {
    return res.status(403).json({ error: "Permission denied" });
  }
  
  // Verify design belongs to their bakery
  const design = req.body;
  if (design.bakery_id !== bakery) {
    return res.status(403).json({ error: "Invalid bakery" });
  }
  
  // ... save
});
```

### 3. Image Security
```typescript
// Validate image URLs before serving
// Use signed URLs for cloud storage
// Implement rate limiting on generation

const validateImageUrl = (url: string): boolean => {
  const allowedDomains = ["cdn.example.com", "api.replicate.com"];
  const urlObj = new URL(url);
  return allowedDomains.includes(urlObj.hostname);
};
```

---

## Scalability Strategy

### Current (Phase 1-4): Single Resort
- Supabase free tier sufficient
- Redis not needed yet
- WebSocket via Supabase Realtime
- Image storage: ~5MB per design

### Future (Phase 5+): Multi-Resort
```
┌──────────────────────────────────────────┐
│  Multiple Supabase Projects (per resort)  │
│  or Supabase RLS with org separation      │
└──────────────────────────────────────────┘
         │
         ├─→ API Gateway (Kong/Nginx)
         │   - Rate limiting per bakery
         │   - Request routing
         │   - Auth verification
         │
         ├─→ Redis Cluster
         │   - Session caching
         │   - Real-time broadcast optimization
         │   - Job queue for image generation
         │
         ├─→ CDN (CloudFlare)
         │   - Image caching
         │   - Geographic distribution
         │   - DDoS protection
         │
         └─→ Message Queue (Bull/RabbitMQ)
             - Async image generation
             - Email notifications
             - Webhook delivery
```

---

## Deployment Architecture

```
Development:
├─ npm run dev
├─ Local Supabase (via Docker)
└─ Hot reload

Staging:
├─ Netlify preview deployment
├─ Staging Supabase project
└─ Test real-time features

Production:
├─ Netlify main deployment
├─ Production Supabase
├─ CloudFlare CDN
└─ Monitoring (Sentry, LogRocket)
```

---

## Testing Strategy

### Unit Tests
```typescript
// LayerCompositor.test.ts
describe("LayerCompositor", () => {
  it("should compose layers in correct order", () => {
    const compositor = new LayerCompositor(1024, 1024);
    const result = compositor.compose({...});
    expect(result).toMatchSnapshot();
  });
});
```

### Integration Tests
```typescript
// Collaboration.integration.test.ts
describe("Multi-user collaboration", () => {
  it("should sync changes in real-time", async () => {
    const session = await createSession();
    const user1 = subscribeToSession(session);
    const user2 = subscribeToSession(session);
    
    user1.broadcastChange({ color: "#ff0000" });
    
    await wait(2000);
    expect(user2.design.color).toBe("#ff0000");
  });
});
```

### E2E Tests
```typescript
// Cake designer full workflow
describe("Cake Designer E2E", () => {
  it("should complete full design-share-approve workflow", () => {
    cy.login("chef@resort.com");
    cy.visitCakeDesigner();
    cy.generateCake();
    cy.shareTemplate("pastry-chef@resort.com");
    cy.logout();
    
    cy.login("pastry-chef@resort.com");
    cy.acceptSharedTemplate();
    cy.modifyTemplate();
    cy.saveAsNew();
  });
});
```

---

## Monitoring & Logging

```typescript
// client/lib/monitoring.ts
export class DesignAnalytics {
  // Track important events
  static trackDesignCreated(bakery: string) {
    analytics.track("design_created", { bakery });
  }
  
  static trackLayerGenerated(generator: string, duration: number) {
    analytics.track("layer_generated", { generator, duration_ms: duration });
  }
  
  static trackCollaborationSession(chefs: number, duration: number) {
    analytics.track("collaboration_session", { 
      chef_count: chefs, 
      duration_minutes: duration / 60000 
    });
  }
}

// server/lib/error-tracking.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Attach to API handlers
app.use(Sentry.Handlers.errorHandler());
```

---

## Summary

This architecture provides:
- ✅ **Scalability**: Designed for single resort, can expand to multi-resort
- ✅ **Real-time**: WebSocket-based collaboration
- ✅ **Security**: RLS policies, auth verification, input validation
- ✅ **Performance**: Debouncing, caching, optimization
- ✅ **Maintainability**: Clear separation of concerns, well-documented APIs
- ✅ **Reliability**: Error handling, logging, monitoring

**The architecture is production-ready and can support 2-month delivery timeline.**

