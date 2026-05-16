# Cake Designer - Quick Start Developer Guide

## ⚡ Get Started in 5 Minutes

### 1. Setup Environment
```bash
# Clone and install
git clone <repo>
cd cake-designer
npm install

# Set environment variables
export VITE_SUPABASE_URL=https://rsjvmhdwjudtreomqikh.supabase.co
export VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
export SUPABASE_URL=https://rsjvmhdwjudtreomqikh.supabase.co
export SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
export REPLICATE_API_KEY=r8_...
export OPENAI_API_KEY=sk-proj-...
```

### 2. Start Dev Server
```bash
npm run dev
# Opens at http://localhost:5173
```

### 3. Test Everything Works
```bash
# In browser console:
import { runPhase1Tests } from '@/lib/phase1-test';
const results = await runPhase1Tests();
console.log(results); // Check all ✓
```

### 4. Open Editor and Test
- Go to `/Editor` page
- Open same URL in another tab (simulates 2-user scenario)
- Edit in one tab, see changes in other
- Try layer generation (LayerGeneratorPanel)
- Try 3D viewer (scroll to rotate)
- Browse templates (TemplateGalleryPanel)

---

## 🔧 Key Components Quick Reference

### Real-Time Collaboration
```typescript
import useDesignCollaboration from '@/hooks/use-design-collaboration';

// In your component
const {
  session,           // Current collaboration session
  remoteUsers,       // Array of other users in session
  isConnected,       // WebSocket connected?
  broadcastChange,   // Send change to others
  broadcastCursor,   // Send cursor position
  endSession,        // End the session
} = useDesignCollaboration(designId);

// Broadcast a change
broadcastChange({ color: '#ff0000' }, 'design_changed');

// Broadcast cursor
broadcastCursor(100, 200);
```

### Layer Generation
```typescript
import LayerGeneratorPanel from '@/modules/cake-builder/LayerGeneratorPanel';

<LayerGeneratorPanel
  designId={designId}
  onLayersChange={(layers) => console.log('Layers:', layers)}
  onComposedImage={(url) => console.log('Composed:', url)}
/>
```

### 3D Viewer
```typescript
import ThreeCakeViewer from '@/modules/cake-builder/ThreeCakeViewer';

<ThreeCakeViewer
  design={designData}
  width={600}
  height={600}
  showSliceView={true}
  onSliceChange={(angle) => console.log('Slice:', angle)}
/>
```

### Template Gallery
```typescript
import TemplateGalleryPanel from '@/components/editor/TemplateGalleryPanel';

<TemplateGalleryPanel
  bakeryId={bakeryId}
  isAdmin={userIsAdmin}
  onTemplateSelect={(template) => loadTemplate(template)}
  onTemplateLoad={(templateId) => navigateTo(templateId)}
/>
```

---

## 📡 API Endpoints

### Layer Generation
```bash
POST /api/generate-layer
Content-Type: application/json

{
  "tier": {
    "diameter": 10,      // inches
    "height": 4,         // inches
    "shape": "round"     // round|square|rectangular
  },
  "style": {
    "frosting": "buttercream",  // buttercream|fondant|ganache|cream-cheese
    "color": "#d4a373",         // hex color
    "texture": "smooth",        // smooth|ridged|rustic|piped|painted
    "pattern": "rose-piping"    // optional
  },
  "transparent": true,
  "seed": "optional-seed"       // for reproducibility
}

Response:
{
  "success": true,
  "imageUrl": "data:image/png;base64,...",
  "metadata": {
    "seed": "12345",
    "generatedAt": "2024-11-13T...",
    "width": 1024,
    "height": 1024,
    "hasAlpha": true
  }
}
```

### Batch Layer Generation
```bash
POST /api/generate-layer/batch

{
  "configs": [
    { tier: {...}, style: {...} },
    { tier: {...}, style: {...} },
    { tier: {...}, style: {...} }
  ]
}

Response:
{
  "success": true,
  "images": ["url1", "url2", "url3"],
  "metadata": {
    "requested": 3,
    "successful": 3,
    "failed": 0
  }
}
```

---

## 🗄️ Database Quick Queries

### Get Active Design Sessions
```sql
SELECT * FROM design_sessions
WHERE design_id = 'your-design-id'
AND ended_at IS NULL;
```

### Get Collaboration Events
```sql
SELECT * FROM collaboration_events
WHERE design_id = 'your-design-id'
ORDER BY created_at DESC
LIMIT 100;
```

### Get Templates for Bakery
```sql
SELECT * FROM cake_templates
WHERE bakery_id = 'your-bakery-id'
ORDER BY created_at DESC;
```

### Get User's Templates
```sql
SELECT * FROM cake_templates
WHERE created_by = 'user-id'
ORDER BY metadata->>'usage_count' DESC;
```

---

## 🐛 Debugging Tips

### WebSocket Issues
```javascript
// Check connection status
window.__realtimeManager?.isConnected // true/false

// View active subscriptions
window.__realtimeManager?.subscriptions

// Force reconnect
window.__realtimeManager?.disconnect()
window.__realtimeManager?.connect(designId, sessionId)
```

### Supabase Issues
```javascript
// Test connection
import { testSupabaseConnection } from '@/lib/supabase';
await testSupabaseConnection(); // true/false

// Check current user
import { supabase } from '@/lib/supabase';
const { data } = await supabase.auth.getUser();
console.log(data);
```

### Performance Issues
```javascript
// Detect device tier
import { detectPerformanceTier } from '@/lib/three-performance';
console.log(detectPerformanceTier()); // 'low'|'medium'|'high'

// Monitor FPS
import { RendererStats } from '@/lib/three-performance';
const stats = new RendererStats();
// record frame times in animation loop
console.log('FPS:', stats.getAverageFPS());
```

### Layer Generation Issues
```bash
# Check Replicate API
curl https://api.replicate.com/v1/predictions/<prediction-id> \
  -H "Authorization: Token $REPLICATE_API_KEY"

# Check OpenAI API
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

---

## 📋 Common Tasks

### Add a New Layer Type
```typescript
// In LayerGeneratorPanel.tsx
// Add to type dropdown:
<SelectItem value="frosting-swirl">Frosting Swirl</SelectItem>

// Add handling in config
if (type === "frosting-swirl") {
  // Custom generation logic
}
```

### Add a New Cake Category Template
```typescript
// In Supabase:
INSERT INTO cake_templates (
  bakery_id, name, category, design_data, created_by
) VALUES (
  'bakery-1',
  'Modern Geometric Wedding',
  'wedding',
  '{"tiers": [...], "colors": [...]}',
  'user-1'
);
```

### Customize 3D Viewer Colors
```typescript
// In ThreeCakeViewer.tsx
const tierColor = design.color || '#c7a16d'; // Change default

// Add custom material
const material = new THREE.MeshPhongMaterial({
  color: new THREE.Color(tierColor),
  shininess: 100, // Increase for more glossy
});
```

### Enable More Decorations
```typescript
// In ThreeCakeViewer.tsx
// Increase decoration density:
design.decorations.forEach((_, idx) => {
  const angle = (idx / Math.max(design.decorations.length, 1)) * Math.PI * 2;
  const radius = 10 + idx * 2; // Vary radius
  // ... create decoration
});
```

---

## ✅ Pre-Commit Checklist

Before pushing code:
- [ ] `npm run build` succeeds
- [ ] No console errors in dev
- [ ] Tests pass (if applicable)
- [ ] Environment variables are not committed
- [ ] API keys are in `.env.local` only
- [ ] Code follows project style

---

## 📞 Useful Links

- **Supabase Dashboard**: https://rsjvmhdwjudtreomqikh.supabase.co
- **Replicate API Docs**: https://replicate.com/docs
- **Three.js Docs**: https://threejs.org/docs
- **React Three Fiber**: https://docs.pmnd.rs/react-three-fiber

---

## 🚀 Next Steps

1. **First Time?** Run the Phase 1 test suite (see "Test Everything Works")
2. **Adding Features?** Check the relevant component (Layers, 3D, Templates, etc.)
3. **Debugging?** Use the debugging tips above
4. **Deploying?** See `DEPLOYMENT_CHECKLIST.md`

---

**Last Updated**: November 13, 2024  
**Status**: Production Ready ✅
