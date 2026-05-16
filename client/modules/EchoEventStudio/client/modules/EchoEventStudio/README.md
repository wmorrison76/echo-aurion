# EchoEventStudio Module (LUCCCA)

Professional event layout design module for the LUCCCA Framework.

## Quick Start

### 1. Installation

This module is already placed in `client/modules/EchoEventStudio/`.

### 2. Register in Host App

Edit `client/lib/panel-registry.ts`:

```typescript
// Add to PanelKey type
export type PanelKey =
  | "dashboard"
  | "echo-event-studio"  // ← Add this
  | "other-panels"

// Add to PANEL_REGISTRY
export const PANEL_REGISTRY: PanelRegistry = {
  "echo-event-studio": () => import("@/modules/EchoEventStudio"),  // ← Add this
  // ... other panels
};

// Add to PANEL_METADATA
export const PANEL_METADATA: Record<PanelKey, PanelMetadata> = {
  "echo-event-studio": {
    key: "echo-event-studio",
    label: "Echo Event Studio",
    description: "Professional event layout design with 3D visualization, compliance checking, and BEO export",
    icon: "🎨",
    defaultWidth: 1400,
    defaultHeight: 900,
  },
  // ... other panels
};
```

### 3. Launch the Module

From any component in your app:

```tsx
import { usePanel } from '@/hooks/usePanel'; // or your panel hook

export function MyComponent() {
  const { openPanel } = usePanel();
  
  return (
    <button onClick={() => openPanel('echo-event-studio')}>
      Open Event Studio
    </button>
  );
}
```

---

## Features

### 6-Stage Workflow
1. **Setup** — Venue and room configuration
2. **Existing Seating** — Inventory pre-existing furniture
3. **Capture/Build** — Import floor plans or 3D scans
4. **Design** — Create layout with drag-drop interface
5. **Banquet Setup** — Configure event and equipment
6. **Export** — Generate BEO PDF, requisitions, and more

### Professional Tools
- **3D Visualization** — Real-time 3D rendering with Three.js
- **Collision Detection** — Smart placement with auto-nudge
- **Compliance Checking** — ADA validation and egress checking
- **Real KPI Metrics** — Seating density, throughput, efficiency
- **Custom Items** — Upload photos/videos, auto-scale to items
- **Camera Bookmarks** — Save 4 camera positions per session
- **Presenter Annotations** — Add notes to key positions
- **PDF Export** — Generate professional BEO documents

---

## Architecture

### Module Structure
```
client/modules/EchoEventStudio/
├── index.tsx                    # Entry point (required for LUCCCA)
├── luccca-module.json          # Module manifest
├── README.md                    # This file
└── (All other files reference existing code in client/)
```

### Component Hierarchy
```
EchoEventStudioModule (index.tsx)
└── EchoLayout (pages/EchoLayout.tsx)
    ├── Stage1Setup
    ├── Stage2ExistingSeating
    ├── Stage3CaptureOrBuild
    ├── Stage4Design
    ├── Stage5BanquetSetup
    └── Stage6Export
```

### Dependencies
- **React 18+** — UI framework
- **React Router** — Navigation
- **Supabase** — Database and auth
- **Three.js + React Three Fiber** — 3D rendering
- **Tailwind CSS** — Styling
- **shadcn/ui** — Component library

---

## Configuration

### Environment Variables

Required in host app's `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:5174  # For local backend
```

### Database Setup

The module requires these Supabase tables:

```sql
-- Core tables
- layout_sessions
- existing_seating
- custom_items
- requisition_items
- layout_exports
- banquet_event_orders

-- Supporting tables
- camera_bookmarks
- annotations
- studio_events
```

Run migrations from `db/schemas/echo-layout.sql`:

```bash
# In Supabase SQL editor:
$(cat db/schemas/echo-layout.sql)
```

---

## API Integration

The module communicates with:

### Backend Endpoints
- `POST /api/studio/events` — Create event
- `GET /api/studio/events/:session` — List events
- `POST /api/studio/bookmarks` — Save camera position
- `POST /api/studio/annotations` — Save annotation
- `POST /api/beo/export` — Generate PDF
- `GET /api/scope/kpis` — Get metrics

### Supabase Client
- Direct Supabase queries for session management
- RLS policies for multi-tenant data isolation
- Real-time subscriptions (optional)

---

## Customization

### Theming

The module uses Tailwind CSS and respects host app's color scheme:

```tsx
// Modify in host app's tailwind.config.ts
extend: {
  colors: {
    primary: '#your-color',
    accent: '#your-color',
  }
}
```

### Feature Flags

In the host app, you can enable/disable features:

```tsx
// client/lib/featureFlags.ts
export const ECHO_FEATURES = {
  use3D: true,
  useCompliance: true,
  useBEOExport: true,
  useCustomItems: true,
};
```

### Layout & Sizing

Default panel dimensions can be overridden:

```tsx
// In PANEL_METADATA
{
  defaultWidth: 1600,  // Adjust as needed
  defaultHeight: 1000,
}
```

---

## Troubleshooting

### Module Not Loading
1. Check `panel-registry.ts` has correct import path
2. Verify `luccca-module.json` exists in module directory
3. Check browser console for import errors
4. Restart dev server: `pnpm dev`

### Database Errors
1. Verify tables created: Run `echo-layout.sql` in Supabase
2. Check RLS policies enable access
3. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set
4. Check Supabase dashboard for permission errors

### 3D Rendering Issues
1. Verify WebGL support in browser
2. Check Three.js version compatibility
3. Try different browser (Chrome/Firefox work best)
4. Check console for WebGL errors

### Session Not Saving
1. Verify auth is configured (if required)
2. Check Supabase logs for SQL errors
3. Verify RLS policies allow INSERT/UPDATE
4. Check browser's IndexedDB for offline cache

---

## Performance Tuning

### Large Layouts (100+ items)
- Use InstancedMesh for chairs (enabled by default)
- Disable real-time collision checking during drag
- Use Layout variants for A/B testing

### Network Optimization
- Enable gzip compression on backend
- Use Supabase CDN for assets
- Cache API responses (100+ KPIs)
- Lazy-load 3D models

### Memory Management
- Dispose Three.js geometries when not in use
- Clear unused sessions periodically
- Monitor WebGL context usage
- Profile with DevTools Performance tab

---

## Support & Documentation

- **Full Docs**: See `README_SCOPE_AND_PROGRESS.md`
- **Deployment**: See `DEPLOYMENT_GUIDE.md`
- **API Docs**: See `COMPLETE_IMPLEMENTATION_SUMMARY.md`
- **Module Pack Details**:
  - Module Pack 1 (EchoReality): `ECHOREALITY_INTEGRATION_GUIDE.md`
  - Module Pack 2 (Compliance): See compliance components
  - Module Pack 3 (Tools): `MODULEPACK3_SUMMARY.md`
  - Module Pack 4 (Precision): `MODULEPACK4_INTEGRATION_GUIDE.md`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024 | Initial LUCCCA module release |

---

## License

Proprietary — All rights reserved

---

**Ready to use? Just register in `panel-registry.ts` and launch!** 🚀
