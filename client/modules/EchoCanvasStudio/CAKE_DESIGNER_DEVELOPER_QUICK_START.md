# Cake Designer Development: Quick Start Guide

---

## Pre-Development Checklist

- [ ] Review `CAKE_DESIGNER_ENTERPRISE_AUDIT.md` (understand current state)
- [ ] Read `CAKE_DESIGNER_2MONTH_ROADMAP.md` (know your tasks)
- [ ] Study `CAKE_DESIGNER_ARCHITECTURE.md` (understand design)
- [ ] Get API keys: OPENAI_API_KEY, REPLICATE_API_KEY
- [ ] Supabase project created and configured
- [ ] LUCCCA framework access on main branch
- [ ] Access to Figma design specs (if available)

---

## Development Environment Setup

```bash
# Clone repo (if not already)
git clone <repo-url>
cd cake-designer

# Install dependencies
pnpm install

# Create .env.local
cat > .env.local << EOF
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-anon-key>
OPENAI_API_KEY=sk-...
REPLICATE_API_KEY=<your-replicate-key>
NODE_ENV=development
EOF

# Run dev server
pnpm run dev

# In another terminal, start Supabase (if using local)
supabase start

# Run migrations
supabase migration up
```

---

## File Structure Reference

```
client/
├── modules/cake-builder/          ← Main module
│   ├── CakeStudio.tsx             ← Main orchestrator (start here)
│   ├── Cake3DViewer.tsx           ← 3D visualization (add in Phase 3)
│   ├── TemplateGallery.tsx        ← Templates (add in Phase 4)
│   ├── types.ts                   ← Interfaces (update as needed)
│   ├── logic.ts                   ← Calculations
│   └── index.ts                   ← Module export
│
├── components/editor/              ← Existing editor components
│   ├── LayersPanel.tsx
│   ├── GraphicGeneratorPanel.tsx
│   └── ...
│
├── lib/
│   ├── realtime-manager.ts        ← NEW (Phase 1, Week 1)
│   ├── collaboration-manager.ts   ← NEW (Phase 1, Week 2)
│   ├── luccca-integration.ts      ← NEW (Phase 1, Week 1)
│   ├── layer-composition.ts       ← NEW (Phase 2, Week 3)
│   ├── auto-save.ts               ← Existing
│   └── supabase.ts                ← Existing
│
└── hooks/
    ├── use-luccca-context.ts      ← NEW (Phase 1, Week 1)
    ├── use-realtime.ts            ← NEW (Phase 1, Week 1)
    └── use-design-collaboration.ts← NEW (Phase 4, Week 7)

server/
├── routes/
│   ├── generate-image.ts          ← Existing
│   ├── generate-layer.ts          ← NEW (Phase 2, Week 3)
│   ├── save-design.ts             ← Existing
│   └── ...other endpoints
│
└── lib/
    ├── ai-providers.ts            ← NEW (helper for SDXL)
    └── ...

shared/
└── types.ts                        ← Shared TypeScript interfaces
```

---

## Phase 1: Foundation (Weeks 1-2)

### Week 1: WebSocket & LUCCCA

**Day 1-2: Create RealtimeManager**
- File: `client/lib/realtime-manager.ts`
- Use Supabase Realtime channel API
- Implement subscribe/broadcast methods
- Export singleton instance

**Day 1-2: Create LUCCCA Integration**
- File: `client/lib/luccca-integration.ts`
- Store context in global variable
- Export helper functions
- Update `CakeBuilderModule.tsx` to accept context

**Day 2: Test WebSocket**
```bash
# In two browser tabs:
# Tab 1: http://localhost:5173 (chef 1)
# Tab 2: http://localhost:5173?user=chef2 (chef 2)
# Make change in Tab 1, verify it appears in Tab 2 in 1-2 seconds
```

**Deliverable**: WebSocket working, LUCCCA context passed through

---

### Week 2: Database & Sessions

**Day 1: Run Migrations**
```bash
# Create and run migrations
supabase migration new add_cake_templates
supabase migration new add_design_sessions
supabase migration new add_collaboration_events

# Run locally
supabase migration up

# Push to production
supabase db push --linked
```

**Day 1-2: Update TypeScript Types**
- File: `client/modules/cake-builder/types.ts`
- Add `CakeTemplate`, `DesignSession`, `CollaborationEvent` interfaces
- Update `DesignData` to include layers array

**Day 2: Build CollaborationManager**
- File: `client/lib/collaboration-manager.ts`
- Implement `createSession`, `joinSession`, `leaveSession`, `transferControl`
- Add error handling
- Test CRUD operations

**Day 2: Integration Testing**
```typescript
// Test in browser console:
import { collaborationManager } from '@/lib/collaboration-manager';

const session = await collaborationManager.createSession(
  'design-123',
  'chef-1',
  'resort-main',
  'readonly'
);
console.log(session);
```

**Deliverable**: Database tables created, session management working

---

## Phase 2: Per-Layer AI (Weeks 3-4)

### Week 3: SDXL Integration

**Day 1-2: Build /api/generate-layer Endpoint**
- File: `server/routes/generate-layer.ts`
- Register in `server/index.ts`
- Get Replicate API key
- Test with Postman

**Example Test Request:**
```bash
curl -X POST http://localhost:5173/api/generate-layer \
  -H "Content-Type: application/json" \
  -d '{
    "tier": {"diameter": 10, "height": 4, "shape": "round"},
    "style": {
      "frosting": "buttercream",
      "color": "#d4a373",
      "texture": "smooth"
    },
    "transparent": true
  }'
```

**Day 2: Create LayerCompositor**
- File: `client/lib/layer-composition.ts`
- Implement `LayerCompositor` class
- Test composition with 2-3 layer images
- Verify transparency preserved

**Day 2: Test Composition**
```typescript
const compositor = new LayerCompositor(1024, 1024);
const blob = await compositor.compose({
  baseWidth: 1024,
  baseHeight: 1024,
  layers: [
    {
      imageUrl: '/tier1.png',
      x: 0, y: 0, opacity: 1, zIndex: 0
    },
    {
      imageUrl: '/frosting.png',
      x: 0, y: 0, opacity: 1, zIndex: 1
    }
  ]
});

// Download blob to verify
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'composed-cake.png';
a.click();
```

**Deliverable**: Per-layer generation + composition working

---

### Week 4: Integration

**Day 1: Update CakeStudio UI**
- Add button: "Generate Layer"
- Show loading state during generation
- Display generated layer images
- Add "Regenerate" and "Delete" buttons

**Day 2: Wire Everything Together**
- Verify end-to-end: UI → API → SDXL → Composition → Display
- Test error handling
- Test with different tiers/styles

**Deliverable**: Full per-layer workflow working end-to-end

---

## Phase 3: 3D Visualization (Weeks 5-6)

### Week 5: Three.js Setup

**Day 1-2: Create Cake3DViewer Component**
- File: `client/modules/cake-builder/Cake3DViewer.tsx`
- Import Three.js from `node_modules`
- Create basic scene, camera, renderer
- Render cake tiers as cylinders
- Add lighting

**Day 2: Add Rotation Controls**
- Mouse drag to rotate
- Touch swipe to rotate
- Keyboard arrow keys optional

**Testing Rotation:**
```typescript
// In CakeStudio, render both 2D and 3D:
<>
  <ThreeCake design={design} />      {/* Old 2D */}
  <Cake3DViewer design={design} />   {/* New 3D */}
</>

// Verify they both update when design changes
```

**Deliverable**: 3D viewer with rotation

---

### Week 6: Slice View & Polish

**Day 1: Add Slice View Mode**
- Toggle checkbox: "Show Slice"
- Slider: "Slice Angle" (0-360)
- Cut geometry to show internal layers

**Day 2: Performance & Polish**
- Profile with DevTools (Performance tab)
- Target: 60 FPS
- Use requestAnimationFrame properly
- Test on low-end devices

**Deliverable**: Full 3D experience, smooth animation

---

## Phase 4: Enterprise (Weeks 7-8)

### Week 7: Templates & Real-Time

**Day 1: Create TemplateGallery**
- File: `client/modules/cake-builder/TemplateGallery.tsx`
- Load templates from Supabase
- Show filter tabs: All / Shared / Mine
- Display thumbnails
- Add "Use Template" button

**Day 2: Implement Real-Time Sync Hook**
- File: `client/hooks/use-design-collaboration.ts`
- useEffect to subscribe to changes
- Broadcast local changes
- Update local state when remote changes received

**Testing Real-Time:**
```typescript
// Two windows, same design
window1: broadcastChange({ color: "#ff0000" })
// After 1-2 seconds:
window2: should see color change
```

**Deliverable**: Templates shareable, real-time sync working

---

### Week 8: Final Polish & Docs

**Day 1: Integration Testing**
- Test complete workflow:
  1. Chef A creates design
  2. Chef B joins as viewer
  3. Chef A generates layers
  4. Chef B sees updates
  5. Chef A saves as template
  6. Chef B can use template

**Day 2: Documentation**
- Update README.md
- Create DEPLOYMENT.md
- Write API docs
- Document LUCCCA integration steps

**Deliverable**: Production-ready MVP

---

## Common Tasks

### Adding a New Feature

1. **Create the file**
   ```bash
   touch client/lib/my-feature.ts
   ```

2. **Add TypeScript interface** to `types.ts`
   ```typescript
   export interface MyFeature {
     // ...
   }
   ```

3. **Implement the feature**
   ```typescript
   // client/lib/my-feature.ts
   export class MyFeature {
     async doSomething() { }
   }
   
   export const myFeature = new MyFeature();
   ```

4. **Export from main module**
   ```typescript
   // client/modules/cake-builder/index.ts
   export { myFeature } from '@/lib/my-feature';
   ```

5. **Use in component**
   ```typescript
   import { myFeature } from '@/modules/cake-builder';
   
   useEffect(() => {
     myFeature.doSomething();
   }, []);
   ```

### Debugging Real-Time

```typescript
// Add logging to see broadcasts
// client/lib/realtime-manager.ts
broadcastChange(change: any) {
  console.log("Broadcasting:", change);
  this.channel?.send({...});
}

// Monitor Supabase Realtime in browser console
supabase.channel('design:123').on('broadcast', (e) => {
  console.log("Received broadcast:", e.payload);
}).subscribe();
```

### Testing Performance

```typescript
// Measure composition time
const start = performance.now();
const blob = await compositor.compose(config);
const end = performance.now();
console.log(`Composition took ${end - start}ms`);
```

### Checking Database

```bash
# Access Supabase dashboard
# Or via supabase CLI:
supabase db execute "SELECT * FROM designs LIMIT 5"
```

---

## Key Decision Points

### 1. When to Use SDXL vs Leonardo?
- **SDXL**: Reproducible with seeds, transparent backgrounds
- **Leonardo**: Better quality, faster, less control
- **Recommendation**: SDXL for layers, Leonardo as fallback

### 2. How Often to Broadcast Changes?
- Not every keystroke (too much traffic)
- Every 2 seconds batching changes (good balance)
- Every save (too infrequent)
- **Recommendation**: 2-second batch with debouncing

### 3. Should Viewers See Real-Time Changes?
- **Yes**: Makes collaboration feel interactive
- **No**: Simpler implementation, less server load
- **Recommendation**: Yes, with 2-second delay

### 4. How to Handle Conflicts?
- Last-write-wins (simplest)
- Operational transformation (complex)
- **Recommendation**: Last-write-wins for MVP

---

## Troubleshooting

### Issue: WebSocket not connecting
```typescript
// Check 1: Is Supabase realtime enabled?
// Check 2: Are you calling .subscribe() after .on()?
// Check 3: Check browser console for connection errors
```

### Issue: Images not loading
```typescript
// Check 1: CORS headers on image URLs?
// Check 2: Is image generation actually completing?
// Check 3: Are you using signed URLs for cloud storage?
```

### Issue: 3D viewer is laggy
```typescript
// Check 1: Chrome DevTools → Performance tab
// Check 2: Reduce geometry complexity
// Check 3: Check for memory leaks (dispose resources in cleanup)
```

### Issue: State not syncing between tabs
```typescript
// Check 1: Is broadcastChange being called?
// Check 2: Is subscription active?
// Check 3: Check Supabase Realtime logs
```

---

## Resources

- **Supabase Docs**: https://supabase.com/docs
- **Three.js Docs**: https://threejs.org/docs/
- **React Hooks**: https://react.dev/reference/react/hooks
- **TypeScript**: https://www.typescriptlang.org/docs/
- **DALL-E API**: https://platform.openai.com/docs/guides/images
- **Replicate (SDXL)**: https://replicate.com/stability-ai/sdxl

---

## Getting Help

1. **Check docs first** (above)
2. **Check existing code** (similar implementations)
3. **Ask in team Slack/Discord**
4. **Create GitHub issue** for blockers
5. **Pair programming** for complex features

---

## Code Review Checklist

Before submitting PR:

- [ ] TypeScript compiles without errors
- [ ] No `any` types (unless unavoidable)
- [ ] Error handling present
- [ ] Loading states handled
- [ ] Mobile responsive
- [ ] Works in Firefox and Chrome
- [ ] No console errors/warnings
- [ ] Functions are <100 lines
- [ ] Comments for complex logic
- [ ] Tests added (if applicable)

---

## Definition of Done

Each task is "done" when:

1. ✅ Code written and tested locally
2. ✅ Error cases handled
3. ✅ TypeScript strict mode passes
4. ✅ Code reviewed by at least one peer
5. ✅ Tests pass (manual at minimum)
6. ✅ Works on staging environment
7. ✅ Documentation updated
8. ✅ PR merged to main

---

## Timeline Reminders

- **Phase 1 ends**: End of Week 2 (WebSocket + Sessions working)
- **Phase 2 ends**: End of Week 4 (Per-layer generation working)
- **Phase 3 ends**: End of Week 6 (3D viewer working)
- **Phase 4 ends**: End of Week 8 (Everything integrated)

**If behind schedule:**
- Cut: Advanced features first
- Keep: Core workflows (design → generate → 3D)
- Accelerate: Pair programming, extend hours if needed

---

## Questions Before Starting?

- What SDXL model ID should we use?
- What's the expected latency for real-time updates?
- Should we implement versioning/undo in Phase 1?
- Multi-cake order: same window or separate?
- Who owns the designs: chef or resort?

**Ask now, not mid-development!**

---

**Good luck! You've got this! 🚀**

