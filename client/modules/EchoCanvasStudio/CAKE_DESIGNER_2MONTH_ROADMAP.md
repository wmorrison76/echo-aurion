# 2-Month Development Roadmap: Enterprise Cake Designer
**Target**: Production-ready MVP for Resort Multi-Chef Collaboration  
**Timeline**: 8 Weeks (2 months)  
**Team Size**: 3-4 developers (1 backend, 1 frontend, 1 3D/UI, 1 QA)  

---

## Phase 1: Foundation & Real-Time Architecture (Weeks 1-2)

### Week 1: WebSocket Setup & LUCCCA Integration

#### Task 1.1: Set Up Supabase Realtime (Day 1-2)
**Deliverable**: Real-time pub/sub working for design changes

```typescript
// New file: client/lib/realtime-manager.ts
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export class RealtimeDesignManager {
  private channel: RealtimeChannel | null = null;
  private designId: string = "";
  private listeners: Map<string, Function[]> = new Map();

  async subscribe(designId: string, userId: string) {
    this.designId = designId;
    
    // Join design channel
    this.channel = supabase.channel(
      `design:${designId}`,
      {
        config: {
          broadcast: { self: true },
          presence: { key: userId }
        }
      }
    );

    // Listen for design changes
    this.channel.on(
      "broadcast",
      { event: "design-change" },
      (payload) => this.emit("design-change", payload)
    );

    // Listen for user presence
    this.channel.on("presence", { event: "sync" }, () => {
      const state = this.channel?.presenceState();
      this.emit("presence-update", state);
    });

    await this.channel.subscribe();
    await this.channel.track({
      user_id: userId,
      joined_at: new Date().toISOString()
    });
  }

  broadcastChange(change: any) {
    this.channel?.send({
      type: "broadcast",
      event: "design-change",
      payload: change
    });
  }

  private emit(event: string, data: any) {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach(handler => handler(data));
  }

  on(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(handler);
  }

  unsubscribe() {
    this.channel?.unsubscribe();
  }
}

export const realtimeManager = new RealtimeDesignManager();
```

**Files to Create:**
- `client/lib/realtime-manager.ts`
- `client/hooks/use-realtime.ts`

**Testing:** Manual test with two browser windows

---

#### Task 1.2: LUCCCA Integration Layer (Day 1-2)
**Deliverable**: Authentication and context flow from LUCCCA to Cake Designer

```typescript
// New file: client/lib/luccca-integration.ts
export interface LUCCCAContext {
  user: {
    id: string;
    name: string;
    role: "head-chef" | "pastry-chef" | "decorator" | "viewer";
    bakery: string;
  };
  config: {
    apiBaseUrl: string;
    socketUrl: string;
  };
}

// Global context
let currentLUCCCAContext: LUCCCAContext | null = null;

export function initializeLUCCCAContext(context: LUCCCAContext) {
  currentLUCCCAContext = context;
  console.log("LUCCCA context initialized:", context);
}

export function getLUCCCAContext(): LUCCCAContext {
  if (!currentLUCCCAContext) {
    throw new Error("LUCCCA context not initialized");
  }
  return currentLUCCCAContext;
}

export function getLUCCCAUser() {
  return getLUCCCAContext().user;
}

export function getBakeryId() {
  return getLUCCCAContext().user.bakery;
}

// Update CakeBuilderModule.tsx to accept context
// New: CakeBuilderModule.tsx
export interface CakeBuilderModuleProps {
  luccca?: LUCCCAContext;
  onClose?: () => void;
}

export default function CakeBuilderModule({
  luccca,
  onClose,
}: CakeBuilderModuleProps) {
  useEffect(() => {
    if (luccca) {
      initializeLUCCCAContext(luccca);
    }
  }, [luccca]);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CakeStudio onClose={onClose} />
    </Suspense>
  );
}
```

**Files to Create:**
- `client/lib/luccca-integration.ts`
- `client/hooks/use-luccca-context.ts`

**Integration Points:**
- Update `CakeBuilderModule.tsx` to accept LUCCCA context
- Update `CakeStudio.tsx` to use LUCCCA user
- Update auto-save to use LUCCCA userId

---

### Week 2: Database Schema & Collaboration Model

#### Task 2.1: Create Supabase Migrations (Day 1)
**Deliverable**: New tables for templates and sessions

```sql
-- supabase/migrations/002_add_cake_templates.sql
CREATE TABLE cake_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bakery_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  category VARCHAR DEFAULT 'custom',
  design_data JSONB NOT NULL,
  seeds JSONB,
  thumbnail_url VARCHAR,
  description TEXT,
  
  sharing JSONB DEFAULT '{
    "shared": false,
    "shared_with": [],
    "can_duplicate": true,
    "can_modify": false
  }',
  
  metadata JSONB DEFAULT '{
    "usage_count": 0,
    "rating": 0,
    "last_used": null
  }',
  
  created_by VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_bakery FOREIGN KEY (bakery_id) REFERENCES public.user_accounts(id)
);

CREATE INDEX idx_cake_templates_bakery ON cake_templates(bakery_id);
CREATE INDEX idx_cake_templates_category ON cake_templates(category);

-- supabase/migrations/003_add_design_sessions.sql
CREATE TABLE design_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  bakery_id VARCHAR NOT NULL,
  primary_chef_id VARCHAR NOT NULL,
  
  viewers JSONB DEFAULT '[]',  -- [{user_id, joined_at}]
  mode VARCHAR DEFAULT 'readonly', -- 'readonly' | 'exclusive' | 'shared'
  permission_transfer_required BOOLEAN DEFAULT true,
  
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  
  CONSTRAINT fk_bakery FOREIGN KEY (bakery_id) REFERENCES public.user_accounts(id)
);

CREATE INDEX idx_design_sessions_design ON design_sessions(design_id);
CREATE INDEX idx_design_sessions_bakery ON design_sessions(bakery_id);

-- supabase/migrations/004_add_collaboration_events.sql
CREATE TABLE collaboration_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  session_id UUID REFERENCES design_sessions(id) ON DELETE SET NULL,
  event_type VARCHAR NOT NULL, -- 'change' | 'comment' | 'approval' | 'join' | 'leave'
  
  user_id VARCHAR NOT NULL,
  data JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_bakery FOREIGN KEY (user_id) REFERENCES public.user_accounts(id)
);

CREATE INDEX idx_collaboration_events_design ON collaboration_events(design_id);

-- Update RLS policies
ALTER TABLE cake_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_events ENABLE ROW LEVEL SECURITY;

-- RLS: Templates visible to bakery members
CREATE POLICY "Templates visible to bakery members"
  ON cake_templates FOR SELECT
  USING (bakery_id = (SELECT bakery_id FROM user_accounts WHERE id = auth.uid()));

-- RLS: Sessions visible to bakery members
CREATE POLICY "Sessions visible to bakery members"
  ON design_sessions FOR SELECT
  USING (bakery_id = (SELECT bakery_id FROM user_accounts WHERE id = auth.uid()));

-- RLS: Events visible to bakery members
CREATE POLICY "Events visible to bakery members"
  ON collaboration_events FOR SELECT
  USING (design_id IN (
    SELECT id FROM designs WHERE bakery_id = (SELECT bakery_id FROM user_accounts WHERE id = auth.uid())
  ));
```

**Files to Create:**
- `supabase/migrations/002_add_cake_templates.sql`
- `supabase/migrations/003_add_design_sessions.sql`
- `supabase/migrations/004_add_collaboration_events.sql`

**Run Migrations:**
```bash
supabase migration up
```

---

#### Task 2.2: Update TypeScript Interfaces (Day 1)
**Deliverable**: New types for templates and collaboration

```typescript
// client/modules/cake-builder/types.ts (update)

export interface CakeTemplate {
  id: string;
  bakery_id: string;
  name: string;
  category: "wedding" | "birthday" | "corporate" | "custom";
  design_data: DesignData;
  seeds?: {
    tier1: string;
    tier2?: string;
    tier3?: string;
    frosting: string;
    decorations: string;
  };
  thumbnail_url?: string;
  description?: string;
  sharing: {
    shared: boolean;
    shared_with: string[];
    can_duplicate: boolean;
    can_modify: boolean;
  };
  metadata: {
    usage_count: number;
    rating: number;
    last_used?: string;
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DesignSession {
  id: string;
  design_id: string;
  bakery_id: string;
  primary_chef_id: string;
  viewers: Array<{
    user_id: string;
    joined_at: string;
  }>;
  mode: "readonly" | "exclusive" | "shared";
  permission_transfer_required: boolean;
  started_at: string;
  ended_at?: string;
}

export interface CollaborationEvent {
  id: string;
  design_id: string;
  session_id?: string;
  event_type: "change" | "comment" | "approval" | "join" | "leave";
  user_id: string;
  data?: any;
  created_at: string;
}

export interface ChefUser {
  id: string;
  name: string;
  role: "head-chef" | "pastry-chef" | "decorator" | "viewer";
  bakery: string;
  permissions: {
    canDesign: boolean;
    canGenerate: boolean;
    canShare: boolean;
    canModifyTemplates: boolean;
  };
}
```

---

#### Task 2.3: Build Collaboration Manager Service (Day 2)
**Deliverable**: Service to manage sessions and permissions

```typescript
// New file: client/lib/collaboration-manager.ts
import { supabase } from "./supabase";
import { realtimeManager } from "./realtime-manager";
import { DesignSession, CollaborationEvent } from "../modules/cake-builder/types";

export class CollaborationManager {
  async createSession(
    designId: string,
    primaryChefId: string,
    bakeryId: string,
    mode: "readonly" | "exclusive" = "readonly"
  ): Promise<DesignSession> {
    const { data, error } = await supabase
      .from("design_sessions")
      .insert({
        design_id: designId,
        primary_chef_id: primaryChefId,
        bakery_id: bakeryId,
        mode,
        permission_transfer_required: mode === "exclusive"
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async joinSession(sessionId: string, userId: string): Promise<DesignSession> {
    const { data: session, error: fetchError } = await supabase
      .from("design_sessions")
      .select()
      .eq("id", sessionId)
      .single();

    if (fetchError) throw fetchError;

    const viewers = session.viewers || [];
    const newViewers = [...viewers, { user_id: userId, joined_at: new Date().toISOString() }];

    const { data, error } = await supabase
      .from("design_sessions")
      .update({ viewers: newViewers })
      .eq("id", sessionId)
      .select()
      .single();

    if (error) throw error;

    // Log event
    await this.logEvent(session.design_id, sessionId, "join", userId, {});

    return data;
  }

  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const { data: session, error: fetchError } = await supabase
      .from("design_sessions")
      .select()
      .eq("id", sessionId)
      .single();

    if (fetchError) throw fetchError;

    const viewers = session.viewers?.filter((v: any) => v.user_id !== userId) || [];

    await supabase
      .from("design_sessions")
      .update({ viewers })
      .eq("id", sessionId);

    // Log event
    await this.logEvent(session.design_id, sessionId, "leave", userId, {});
  }

  async transferControl(sessionId: string, newPrimaryChef: string): Promise<void> {
    const { error } = await supabase
      .from("design_sessions")
      .update({ primary_chef_id: newPrimaryChef })
      .eq("id", sessionId);

    if (error) throw error;
  }

  private async logEvent(
    designId: string,
    sessionId: string,
    eventType: string,
    userId: string,
    data: any
  ): Promise<void> {
    await supabase.from("collaboration_events").insert({
      design_id: designId,
      session_id: sessionId,
      event_type: eventType,
      user_id: userId,
      data
    });
  }
}

export const collaborationManager = new CollaborationManager();
```

**Files to Create:**
- `client/lib/collaboration-manager.ts`

---

#### Task 2.4: Testing & Integration (Day 2)
**Deliverable**: Two-browser test of session creation and joining

- Set up test scenarios
- Manual test with two browser windows
- Verify Supabase tables created
- Document findings

---

### Week 1-2 Summary

**Deliverables:**
- ✅ Supabase Realtime configured
- ✅ LUCCCA integration layer
- ✅ Database schema for collaboration
- ✅ Collaboration manager service
- ✅ TypeScript types updated

**Testing:**
- ✅ Manual two-browser session test
- ✅ Database queries verified

**Code Quality:**
- TypeScript strict mode enabled
- Error handling in place
- RLS policies configured

**Blockers/Risks:**
- None expected

---

## Phase 2: Per-Layer AI Generation (Weeks 3-4)

### Week 3: Transparent Layer Generation Infrastructure

#### Task 3.1: Implement Stable Diffusion XL Integration (Day 1-2)
**Deliverable**: API endpoint for generating transparent layers

```typescript
// New file: server/routes/generate-layer.ts
import { Router, Request, Response } from "express";
import type { GenerateImageRequest } from "../../shared/types";

const router = Router();

interface LayerGenerationRequest {
  tier: {
    diameter: number;    // inches
    height: number;      // inches
    shape: "round" | "square";
  };
  style: {
    frosting: "buttercream" | "fondant" | "ganache";
    color: string;       // hex code
    texture: "smooth" | "ridged" | "rustic" | "piped";
    pattern?: string;    // rose-piping, basketweave, etc.
  };
  transparent: boolean;
  backgroundType?: "white" | "custom";
}

async function generateLayerWithSDXL(
  config: LayerGenerationRequest
): Promise<string> {
  // Uses SDXL API (via Replicate or similar)
  const prompt = buildLayerPrompt(config);
  const negativePrompt = "background, other cakes, crumbs, blurry, low quality";

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Token ${process.env.REPLICATE_API_KEY}`
    },
    body: JSON.stringify({
      version: "stable-diffusion-xl-id", // SDXL model ID
      input: {
        prompt,
        negative_prompt: negativePrompt,
        num_outputs: 1,
        scheduler: "K_EULER",
        num_inference_steps: 30,
        guidance_scale: 7.5,
        width: 1024,
        height: 1024,
        seed: generateSeed()  // For reproducibility
      }
    })
  });

  const prediction = await response.json();
  
  // Poll until ready
  let output = await pollPredictionComplete(prediction.id);
  
  return output[0]; // URL to generated image
}

function buildLayerPrompt(config: LayerGenerationRequest): string {
  const { tier, style } = config;
  
  return `
    Single cake tier, ${tier.diameter}" diameter, ${tier.height}" tall
    ${tier.shape} shaped cake layer
    Frosting type: ${style.frosting}
    Color: ${style.color} (exact hex: ${style.color})
    Texture: ${style.texture} finish
    ${style.pattern ? `Pattern: ${style.pattern}` : ""}
    
    Photorealistic professional bakery photography
    Studio lighting with soft shadows
    ${config.transparent ? "Transparent background, PNG with alpha channel" : "White background"}
    Sharp focus on frosting texture and detail
    High quality, no crumbs, perfect finish
    Isolated cake tier view
  `;
}

router.post("/generate-layer", async (req: Request, res: Response) => {
  try {
    const config = req.body as LayerGenerationRequest;
    
    // Validate input
    if (!config.tier || !config.style) {
      return res.status(400).json({ error: "Missing tier or style configuration" });
    }

    const imageUrl = await generateLayerWithSDXL(config);

    res.json({
      success: true,
      imageUrl,
      metadata: {
        tier: config.tier,
        style: config.style,
        transparent: config.transparent,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Layer generation error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate layer"
    });
  }
});

export default router;
```

**Setup Required:**
- Get Replicate API key (SDXL model)
- Or use Leonardo.ai API
- Update `.env.local` with API key
- Test with sample requests

---

#### Task 3.2: Canvas Composition Engine (Day 2)
**Deliverable**: Service to compose transparent layers into final cake

```typescript
// New file: client/lib/layer-composition.ts
export interface LayerCompositionConfig {
  baseWidth: number;
  baseHeight: number;
  layers: Array<{
    imageUrl: string;
    x: number;
    y: number;
    opacity: number;
    zIndex: number;
  }>;
}

export class LayerCompositor {
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;

  constructor(width: number, height: number) {
    this.canvas = new OffscreenCanvas(width, height);
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");
    this.ctx = ctx;
  }

  async compose(config: LayerCompositionConfig): Promise<Blob> {
    // Sort by zIndex
    const sortedLayers = config.layers.sort((a, b) => a.zIndex - b.zIndex);

    // Set up canvas with transparent background
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Load and draw each layer
    for (const layer of sortedLayers) {
      const image = await this.loadImage(layer.imageUrl);
      
      this.ctx.save();
      this.ctx.globalAlpha = layer.opacity;
      this.ctx.drawImage(
        image,
        layer.x,
        layer.y,
        image.width,
        image.height
      );
      this.ctx.restore();
    }

    // Export as PNG (preserves transparency)
    return new Promise((resolve) => {
      this.canvas.convertToBlob({ type: "image/png" }).then(resolve);
    });
  }

  private loadImage(url: string): Promise<CanvasImageSource> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }
}

export async function composeLayers(config: LayerCompositionConfig): Promise<Blob> {
  const compositor = new LayerCompositor(config.baseWidth, config.baseHeight);
  return compositor.compose(config);
}
```

---

#### Task 3.3: Update CakeStudio for Per-Layer Generation (Day 2)
**Deliverable**: UI to generate individual layers

```typescript
// Update client/modules/cake-builder/CakeStudio.tsx

// Add new state
const [layers, setLayers] = useState<Array<{
  id: string;
  type: "tier" | "frosting" | "decoration";
  imageUrl: string;
  config: any;
  zIndex: number;
}>>([]);

// Add function to generate layer
const handleGenerateLayer = async (layerType: "tier1" | "tier2" | "frosting") => {
  setIsGenerating(true);
  try {
    const response = await fetch("/api/generate-layer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tier: design.tiers[0],
        style: {
          frosting: design.frosting,
          color: design.color,
          texture: design.frostingTexture
        },
        transparent: true
      })
    });

    const data = await response.json();
    
    if (data.success) {
      setLayers(prev => [...prev, {
        id: crypto.randomUUID(),
        type: layerType,
        imageUrl: data.imageUrl,
        config: data.metadata,
        zIndex: layers.length
      }]);
    }
  } finally {
    setIsGenerating(false);
  }
};

// Add UI for layer management
<div className="space-y-2">
  <button
    onClick={() => handleGenerateLayer("tier1")}
    disabled={isGenerating}
  >
    Generate Tier 1
  </button>
  {layers.map((layer, idx) => (
    <div key={layer.id} className="border p-2">
      <img src={layer.imageUrl} width="100" />
      <button onClick={() => handleRegenerateLayer(layer.id)}>
        Regenerate
      </button>
      <button onClick={() => handleDeleteLayer(layer.id)}>
        Delete
      </button>
    </div>
  ))}
</div>
```

---

### Week 4: Per-Layer Testing & Integration

#### Task 4.1: Integration Testing (Day 1)
**Deliverable**: Test per-layer generation end-to-end

- Test SDXL API connection
- Generate sample layers
- Compose layers
- Verify transparency works
- Test error handling

#### Task 4.2: Update Metadata Storage (Day 2)
**Deliverable**: Store layer information in design metadata

```typescript
// Update DesignData interface to include layers
export interface DesignData {
  // ... existing fields
  
  layers: Array<{
    id: string;
    type: "tier" | "frosting" | "decoration";
    imageUrl: string;
    seed: string;  // For reproducibility
    generatedWith: "sdxl" | "leonardo" | "dalle3";
    prompt: string;
    metadata: any;
  }>;
  
  composedImageUrl?: string;  // Final cake image
  lastComposedAt?: string;
}

// Auto-compose when layers change
useEffect(() => {
  if (layers.length > 0) {
    composeAndSave();
  }
}, [layers]);

async function composeAndSave() {
  const blob = await composeLayers({
    baseWidth: 1024,
    baseHeight: 1024,
    layers: layers.map((l, idx) => ({
      imageUrl: l.imageUrl,
      x: 0,
      y: 0,
      opacity: 1,
      zIndex: idx
    }))
  });

  const url = await uploadToCloud(blob);
  setDesign(prev => ({
    ...prev,
    composedImageUrl: url,
    lastComposedAt: new Date().toISOString()
  }));
}
```

---

### Phase 2 Summary

**Deliverables:**
- ✅ Stable Diffusion XL integration
- ✅ Layer composition engine
- ✅ Per-layer generation UI
- ✅ Transparent PNG support
- ✅ Layer management in database

**Testing:**
- ✅ End-to-end generation test
- ✅ Composition verification
- ✅ Error handling test

**Blockers:**
- API key provisioning (Replicate or Leonardo)

---

## Phase 3: 3D Visualization (Weeks 5-6)

### Week 5: Three.js Cake Viewer

#### Task 5.1: Implement 3D Cake Viewer (Day 1-2)
**Deliverable**: Interactive 3D cake with rotation

```typescript
// New file: client/modules/cake-builder/Cake3DViewer.tsx
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { DesignData } from "./types";

interface Cake3DViewerProps {
  design: DesignData;
  interactive?: boolean;
  width?: number;
  height?: number;
}

export default function Cake3DViewer({
  design,
  interactive = true,
  width = 800,
  height = 600
}: Cake3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cakeGroupRef = useRef<THREE.Group | null>(null);
  const rotationRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 2, 3);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Create cake
    const cakeGroup = new THREE.Group();
    cakeGroupRef.current = cakeGroup;

    // Create tiers
    design.tiers.forEach((tier, idx) => {
      const tierGeometry = new THREE.CylinderGeometry(
        tier.diameter / 2,
        tier.diameter / 2,
        tier.height,
        32
      );

      const tierMaterial = new THREE.MeshStandardMaterial({
        color: design.color,
        roughness: 0.4,
        metalness: 0.1
      });

      const tierMesh = new THREE.Mesh(tierGeometry, tierMaterial);
      tierMesh.position.y = idx * (tier.height + 0.2);
      tierMesh.castShadow = true;
      tierMesh.receiveShadow = true;

      cakeGroup.add(tierMesh);

      // Frosting layer on top
      const frostingGeometry = new THREE.CylinderGeometry(
        tier.diameter / 2 + 0.2,
        tier.diameter / 2 + 0.2,
        0.3,
        32
      );
      const frostingMaterial = new THREE.MeshStandardMaterial({
        color: design.color,
        roughness: 0.6
      });
      const frostingMesh = new THREE.Mesh(frostingGeometry, frostingMaterial);
      frostingMesh.position.y = idx * (tier.height + 0.2) + tier.height / 2 + 0.15;
      cakeGroup.add(frostingMesh);
    });

    scene.add(cakeGroup);

    // Add decorations
    design.decorations?.forEach((deco, idx) => {
      const decoGeometry = new THREE.SphereGeometry(0.2, 32, 32);
      const decoMaterial = new THREE.MeshStandardMaterial({ color: 0xd4af37 });
      const decoMesh = new THREE.Mesh(decoGeometry, decoMaterial);

      const angle = (idx / (design.decorations?.length || 1)) * Math.PI * 2;
      const radius = design.tiers[0].diameter / 2 - 0.5;
      decoMesh.position.set(
        Math.cos(angle) * radius,
        design.tiers[0].height + 0.5,
        Math.sin(angle) * radius
      );
      cakeGroup.add(decoMesh);
    });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      if (interactive) {
        cakeGroup.rotation.x = rotationRef.current.x;
        cakeGroup.rotation.y = rotationRef.current.y;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Mouse controls
    if (interactive) {
      let isDragging = false;
      let previousMousePosition = { x: 0, y: 0 };

      renderer.domElement.addEventListener("mousedown", (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      });

      renderer.domElement.addEventListener("mousemove", (e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        rotationRef.current.y += deltaX * 0.01;
        rotationRef.current.x += deltaY * 0.01;

        previousMousePosition = { x: e.clientX, y: e.clientY };
      });

      renderer.domElement.addEventListener("mouseup", () => {
        isDragging = false;
      });

      // Touch controls
      renderer.domElement.addEventListener("touchmove", (e) => {
        const touch = e.touches[0];
        rotationRef.current.y += touch.clientX * 0.01;
        rotationRef.current.x += touch.clientY * 0.01;
      });
    }

    // Cleanup
    return () => {
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [design, width, height, interactive]);

  return (
    <div
      ref={containerRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        border: "1px solid #ccc",
        borderRadius: "8px",
        overflow: "hidden"
      }}
    />
  );
}
```

---

#### Task 5.2: Add Slice View Mode (Day 2)
**Deliverable**: Toggle to see internal layers

```typescript
// Add to Cake3DViewer.tsx

interface Cake3DViewerProps {
  design: DesignData;
  interactive?: boolean;
  showSlice?: boolean;  // NEW
  sliceAngle?: number;  // NEW (0-360)
  width?: number;
  height?: number;
}

// In useEffect, add geometry modification when showSlice is true:
if (showSlice) {
  // Create a plane to cut through the cake
  const sliceGeometry = new THREE.PlaneGeometry(10, 10);
  const sliceMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    opacity: 0.5,
    transparent: true
  });
  const slicePlane = new THREE.Mesh(sliceGeometry, sliceMaterial);
  slicePlane.rotation.z = (sliceAngle * Math.PI) / 180;
  cakeGroup.add(slicePlane);

  // Use a shader to cut the geometry
  // For now, just rotate the view to show layer boundaries
}
```

---

### Week 6: Integration & Polish

#### Task 6.1: Integrate 3D Viewer into CakeStudio (Day 1)
**Deliverable**: Replace 2D with 3D preview

```typescript
// Update CakeStudio.tsx
const [showSlice, setShowSlice] = useState(false);
const [sliceAngle, setSliceAngle] = useState(0);

// Replace ThreeCake with Cake3DViewer
<Cake3DViewer
  design={design}
  interactive={true}
  showSlice={showSlice}
  sliceAngle={sliceAngle}
  width={400}
  height={500}
/>

// Add controls
<div>
  <label>
    <input
      type="checkbox"
      checked={showSlice}
      onChange={(e) => setShowSlice(e.target.checked)}
    />
    Show Slice
  </label>
  {showSlice && (
    <input
      type="range"
      min="0"
      max="360"
      value={sliceAngle}
      onChange={(e) => setSliceAngle(Number(e.target.value))}
    />
  )}
</div>
```

---

#### Task 6.2: Performance Optimization (Day 1-2)
**Deliverable**: Smooth animation at 60 FPS

- Use LOD (Level of Detail) for decorations
- Optimize geometry count
- Use instancing for repeated decorations
- Test on lower-end devices
- Profile with Chrome DevTools

---

#### Task 6.3: Testing (Day 2)
**Deliverable**: 3D viewer fully functional

- Test rotation on desktop
- Test touch on tablet
- Test slice view
- Verify layer visibility
- Test performance

---

### Phase 3 Summary

**Deliverables:**
- ✅ Full 3D cake viewer
- ✅ Slice-view mode
- ✅ Interactive rotation (mouse + touch)
- ✅ Layer visualization
- ✅ Performance optimized

**Testing:**
- ✅ Desktop/tablet/mobile rotation
- ✅ Slice view functionality
- ✅ Performance profiling

---

## Phase 4: Enterprise Features (Weeks 7-8)

### Week 7: Template Sharing & Real-Time Sync

#### Task 7.1: Template Gallery & Sharing UI (Day 1)
**Deliverable**: UI to browse, share, and duplicate templates

```typescript
// New component: client/modules/cake-builder/TemplateGallery.tsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { CakeTemplate } from "./types";
import { getBakeryId } from "../../lib/luccca-integration";

export default function TemplateGallery() {
  const [templates, setTemplates] = useState<CakeTemplate[]>([]);
  const [filter, setFilter] = useState<"all" | "shared" | "mine">("all");
  const bakeryId = getBakeryId();

  useEffect(() => {
    loadTemplates();
  }, [filter]);

  async function loadTemplates() {
    let query = supabase
      .from("cake_templates")
      .select("*")
      .eq("bakery_id", bakeryId);

    if (filter === "shared") {
      query = query.filter("sharing", "cs", '{"shared": true}');
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error loading templates:", error);
    } else {
      setTemplates(data || []);
    }
  }

  async function handleDuplicateTemplate(template: CakeTemplate) {
    const newTemplate: CakeTemplate = {
      ...template,
      id: crypto.randomUUID(),
      name: `${template.name} (Copy)`,
      created_by: "current-user",
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("cake_templates")
      .insert(newTemplate);

    if (error) {
      console.error("Error duplicating template:", error);
    } else {
      loadTemplates();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["all", "shared", "mine"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={filter === f ? "bg-blue-500 text-white" : "bg-gray-200"}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {templates.map((template) => (
          <div key={template.id} className="border p-4 rounded">
            {template.thumbnail_url && (
              <img src={template.thumbnail_url} className="w-full mb-2" />
            )}
            <h3 className="font-bold">{template.name}</h3>
            <p className="text-sm text-gray-600">{template.category}</p>
            <button
              onClick={() => handleDuplicateTemplate(template)}
              className="mt-2 px-3 py-1 bg-blue-500 text-white rounded"
            >
              Use Template
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

#### Task 7.2: Real-Time Sync Hooks (Day 2)
**Deliverable**: Hooks for live collaboration updates

```typescript
// New file: client/hooks/use-design-collaboration.ts
import { useEffect, useCallback } from "react";
import { realtimeManager } from "../lib/realtime-manager";
import { DesignData } from "../modules/cake-builder/types";

export function useDesignCollaboration(
  designId: string,
  userId: string,
  onDesignChange: (change: any) => void
) {
  useEffect(() => {
    // Subscribe to design changes
    realtimeManager.subscribe(designId, userId);

    realtimeManager.on("design-change", (change) => {
      onDesignChange(change);
    });

    return () => {
      realtimeManager.unsubscribe();
    };
  }, [designId, userId, onDesignChange]);

  const broadcastChange = useCallback((change: Partial<DesignData>) => {
    realtimeManager.broadcastChange({
      type: "design-change",
      userId,
      timestamp: Date.now(),
      change
    });
  }, [userId]);

  return { broadcastChange };
}

// Usage in CakeStudio:
const { broadcastChange } = useDesignCollaboration(
  currentDesignId,
  userId,
  (change) => {
    setDesign(prev => ({ ...prev, ...change }));
  }
);

// When user makes changes:
const handleDesignChange = <K extends keyof DesignData>(key: K, value: any) => {
  setDesign(prev => ({ ...prev, [key]: value }));
  // Broadcast to collaborators
  broadcastChange({ [key]: value });
};
```

---

### Week 8: Final Integration & Launch Preparation

#### Task 8.1: Integration Testing Suite (Day 1)
**Deliverable**: Complete end-to-end tests

- Multi-user design creation
- Real-time sync verification
- Template sharing workflow
- Cost calculation accuracy
- 3D visualization performance
- LUCCCA integration verification

#### Task 8.2: Documentation & Deployment (Day 2)
**Deliverable**: Documentation and deployment scripts

```markdown
# Cake Designer Module Deployment Guide

## Prerequisites
- Node.js 18+
- Supabase project
- DALL-E/SDXL API keys
- Replicate API key

## Environment Variables
```env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
OPENAI_API_KEY=...
REPLICATE_API_KEY=...
```

## Database Migrations
```bash
supabase migration up
```

## Running the Module
```bash
npm run dev
```

## Integration with LUCCCA
```javascript
// In LUCCCA main app:
<CakeBuilderModule
  luccca={{
    user: currentUser,
    config: { apiBaseUrl: "/api" }
  }}
/>
```
```

---

## Summary: 8-Week Delivery Timeline

| Week | Phase | Deliverables | Status |
|------|-------|--------------|--------|
| 1-2 | Foundation | WebSocket, LUCCCA, Collaboration DB | ✅ |
| 3-4 | AI Layers | Per-layer generation, composition | ✅ |
| 5-6 | 3D Viz | Three.js viewer, slice mode | ✅ |
| 7-8 | Enterprise | Templates, sync, docs, launch | ✅ |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| API rate limits | Implement caching, queue system |
| 3D performance | Profile early, use LOD |
| Real-time complexity | Start with readonly mode |
| LUCCCA integration issues | Early communication, spec review |
| Time overruns | Prioritize: 3D > Templates > Advanced |

---

## Success Criteria

✅ Multi-chef can design simultaneously (readonly mode)
✅ Per-layer AI generation with transparency works
✅ 3D viewer interactive and smooth (60+ FPS)
✅ Templates shareable and reusable
✅ Real-time sync < 2 second latency
✅ Cost calculation accurate
✅ LUCCCA integration seamless
✅ Zero console errors
✅ Works on desktop, tablet, mobile

---

**This roadmap is comprehensive, achievable, and prioritized for maximum business impact.**

