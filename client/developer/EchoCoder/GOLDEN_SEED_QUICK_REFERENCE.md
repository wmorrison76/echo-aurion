# GOLDEN SEED - Quick Reference Card

**One-page cheat sheet for implementation**

---

## 🎯 15-Module Overview

### Professional Operations
| # | Module | Icon | Route | Component |
|---|--------|------|-------|-----------|
| 1 | **Culinary** | 👨‍🍳 | `/culinary` | EchoRecipePro |
| 2 | **Pastry** | 🎂 | `/pastry` | CakeBuilder |
| 3 | **Schedule** | 📅 | `/schedule` | ProductionSchedule |
| 4 | **Inventory** | 📦 | `/inventory` | InventoryManager |

### Business Management
| # | Module | Icon | Route | Component |
|---|--------|------|-------|-----------|
| 5 | **CRM** | 👥 | `/crm` | CustomerRelationship |
| 6 | **ChefNet** | 🤝 | `/chefnet` | TeamCollaboration |
| 7 | **Support** | 🆘 | `/support` | HelpDesk |

### Collaboration Tools
| # | Module | Icon | Route | Component |
|---|--------|------|-------|-----------|
| 8 | **Whiteboard** | 🎨 | `/whiteboard` | WhiteboardCanvas |
| 9 | **Video** | 📹 | `/video` | VideoConference |
| 10 | **Canvas** | 🖼️ | `/canvas` | EchoCanvasStudio |
| 11 | **StickyNotes** | 📝 | `/notes` | StickyNotes |

### Developer Studio ✨
| # | Module | Icon | Route | Component |
|---|--------|------|-------|-----------|
| 12 | **EchoCoder** 🔧 | 💻 | `/echocoder` | EchoCoder |

### Other & Core
| # | Module | Icon | Route | Component |
|---|--------|------|-------|-----------|
| 13 | **Maestro** | 👑 | `/maestro` | MaestroKitchen |
| 14 | **Mixology** | 🍹 | `/mixology` | MixologyBar |
| 15 | **Echo Aurum** | ✨ | `/aurum` | EchoAurum |
| 16 | **Echo Layout** | 📐 | `/layout` | EchoLayout |
| 17 | **Dashboard** | 🏠 | `/` | Dashboard |
| 18 | **Settings** | ⚙️ | `/settings` | Settings |

---

## 📁 Folder Structure (Copy/Paste)

```
client/
├── pages/
│   ├── Index.tsx
│   ├── Culinary.tsx
│   ├── Pastry.tsx
│   ├── Schedule.tsx
│   ├── Inventory.tsx
│   ├── Maestro.tsx
│   ├── Mixology.tsx
│   ├── CRM.tsx
│   ├── ChefNet.tsx
│   ├── Support.tsx
│   ├── Whiteboard.tsx
│   ├── VideoConference.tsx
│   ├── Canvas.tsx
│   ├── StickyNotes.tsx
│   ├── EchoCoder.tsx
│   ├── EchoAurum.tsx
│   ├── EchoLayout.tsx
│   └── Settings.tsx
├── components/
│   ├── Board.tsx
│   ├── Sidebar.tsx
│   ├── Toolbar.tsx
│   ├── FloatingPanel.tsx
│   ├── modules/
│   │   ├── Culinary/
│   │   ├── Pastry/
│   │   ├── Schedule/
│   │   ├── Inventory/
│   │   ├── Maestro/
│   │   ├── Mixology/
│   │   ├── CRM/
│   │   ├── ChefNet/
│   │   ├── Support/
│   │   ├── Whiteboard/
│   │   ├── VideoConference/
│   │   ├── Canvas/
│   │   ├── StickyNotes/
│   │   ├── EchoAurum/
│   │   ├── EchoLayout/
│   │   └── index.ts (barrel export)
│   ├── studio/
│   │   ├── EchoCoder.tsx
│   │   ├── DesignCanvas.tsx
│   │   ├── CodeGenerator.tsx
│   │   ├── EchoOrb.tsx
│   │   ├── TaskPanel.tsx
│   │   └── index.ts (barrel export)
│   └── ui/
│       └── [Radix UI components...]
├── hooks/
├── lib/
├── global.css
├── i18n.tsx
└── App.tsx
```

---

## 🎨 Design Specifications

### Color Schemes (Pick One)
```
🔷 Cyan    → HSL(186, 100%, 56%)
🔵 Blue    → HSL(217, 92%, 60%)
💚 Emerald → HSL(160, 84%, 54%)
🟣 Violet  → HSL(259, 90%, 66%)
🌹 Rose    → HSL(347, 89%, 60%)
```

### Light/Dark Modes
- **Dark:** Dark background + neon glow borders
- **Light:** Light background + black borders + drop shadows

### Glass Morphism
```css
backdrop-filter: blur(12px);
border: 2px solid;
box-shadow: 0 0 30px rgba(var(--primary-rgb), 0.3);
```

---

## 🌍 Internationalization

### Languages (5 Total)
- 🇺🇸 English (en)
- 🇪🇸 Spanish (es)
- 🇫🇷 French (fr)
- 🇵🇹 Portuguese (pt)
- 🇮🇹 Italian (it)

### Translation Files
```
client/locales/
├── en.json
├── es.json
├── fr.json
├── pt.json
└── it.json
```

### Usage
```typescript
import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('dashboard.title')}</h1>;
}
```

---

## 📐 Sidebar Navigation

### 15 Menu Items (In Order)
1. 🏠 Dashboard → `/`
2. 👨‍🍳 Culinary → `/culinary`
3. 🎂 Pastry → `/pastry`
4. 📅 Schedule → `/schedule`
5. 📦 Inventory → `/inventory`
6. 👑 Maestro → `/maestro`
7. 🍹 Mixology → `/mixology`
8. 👥 CRM → `/crm`
9. 🤝 ChefNet → `/chefnet`
10. 🆘 Support → `/support`
11. 🎨 Whiteboard → `/whiteboard`
12. 📹 Video → `/video`
13. 🖼️ Canvas → `/canvas`
14. 📝 StickyNotes → `/notes`
15. 🔧 EchoCoder → `/echocoder` (Badge: 🔧)

### States
- **Expanded:** 200px, text visible
- **Collapsed:** 45px, icons only

---

## 🎛️ Toolbar Controls

### Position
Top-right of Board

### Elements (Left to Right)
1. **Theme Toggle** (Sun/Moon)
   - Dark ↔ Light
   - Persists to localStorage

2. **Color Picker** (5 buttons)
   - Cyan | Blue | Emerald | Violet | Rose
   - Shows active color

3. **Language Dropdown**
   - 🇺🇸 English
   - 🇪🇸 Spanish
   - 🇫🇷 French
   - 🇵🇹 Portuguese
   - 🇮🇹 Italian

---

## 🎪 Floating Panels

### Control Buttons
- **[X]** Close
- **[−]** Minimize
- **[↗]** Pop-out
- **[📌]** Pin

### Features
✅ Draggable (title bar)
✅ Resizable (corners/edges)
✅ Auto z-index stacking
✅ Persistent positions (localStorage)
✅ Cascade on open (+20px offset)

### Zustand Store Keys
```
panels: Map<id, FloatingPanel>
addPanel(panel)
removePanel(id)
updatePanel(id, updates)
minimizePanel(id)
maximizePanel(id)
pinPanel(id)
bringToFront(id)
```

---

## 💾 Data Persistence

### NO Excel Files ✅
- localStorage only
- All JSON format
- Optional backend API

### localStorage Keys
```typescript
'theme'           // 'dark' | 'light'
'colorScheme'     // 'cyan' | 'blue' | 'emerald' | 'violet' | 'rose'
'language'        // 'en' | 'es' | 'fr' | 'pt' | 'it'
'sidebarExpanded' // 'true' | 'false'
'floatingPanels'  // JSON array
'module:data'     // Module-specific data
```

---

## 🔗 Routing (React Router 6)

```typescript
// client/App.tsx
<Routes>
  <Route path="/" element={<Index />} />
  <Route path="/culinary" element={<Culinary />} />
  <Route path="/pastry" element={<Pastry />} />
  <Route path="/schedule" element={<Schedule />} />
  <Route path="/inventory" element={<Inventory />} />
  <Route path="/maestro" element={<Maestro />} />
  <Route path="/mixology" element={<Mixology />} />
  <Route path="/crm" element={<CRM />} />
  <Route path="/chefnet" element={<ChefNet />} />
  <Route path="/support" element={<Support />} />
  <Route path="/whiteboard" element={<Whiteboard />} />
  <Route path="/video" element={<VideoConference />} />
  <Route path="/canvas" element={<Canvas />} />
  <Route path="/notes" element={<StickyNotes />} />
  <Route path="/echocoder" element={<EchoCoder />} />
  <Route path="/aurum" element={<EchoAurum />} />
  <Route path="/layout" element={<EchoLayout />} />
  <Route path="/settings" element={<Settings />} />
  <Route path="/embed/echo" element={<EchoOrbEmbed />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

---

## 🔧 EchoCoder Developer Studio (Module #12) ✨

### Task Buttons
1. **Planner** → Project planning interface
2. **Coder** → Code generation engine
3. **Reviewer** → Code review tools
4. **Integrator** → Module integration helpers
5. **Historian** → Version history viewer
6. **Scorecard** → Metrics & scoring dashboard

### Features
- Design canvas (draggable blocks)
- Code generation from designs
- 3D Echo Orb visualization
- Public `/embed/echo` route
- 5 languages: EN/ES/FR/PT/IT
- MCP-ready for AI automations

### Folder Structure
```
components/studio/
├── EchoCoder.tsx
├── DesignCanvas.tsx
├── CodeGenerator.tsx
├── EchoOrb.tsx
├── TaskPanel.tsx
├── tasks/
│   ├── PlannerTask.tsx
│   ├── CoderTask.tsx
│   ├── ReviewerTask.tsx
│   ├── IntegratorTask.tsx
│   ├── HistorianTask.tsx
│   └── ScorecardTask.tsx
└── index.ts
```

---

## 📚 Component Pattern

### Barrel Export (index.ts)
```typescript
export { ModuleComponent } from './ModuleComponent';
export { SubComponent } from './SubComponent';
export * from './types';
```

### Module Component
```typescript
import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface ModuleProps {
  onAction?: () => void;
}

export const ModuleComponent: FC<ModuleProps> = ({ onAction }) => {
  const { t } = useTranslation();

  return (
    <div className={cn('glass-panel', 'p-6', 'rounded-lg')}>
      <h1>{t('module.title')}</h1>
      {/* Content */}
    </div>
  );
};
```

### Page Component
```typescript
import { ModuleComponent } from '@/components/modules';

export const ModulePage: FC = () => {
  return (
    <div className="page-container">
      <ModuleComponent />
    </div>
  );
};
```

---

## 🎬 3D Visualization (React Three Fiber)

### EchoOrb Component
```typescript
import { Canvas } from '@react-three/fiber';

interface EchoOrbProps {
  color?: string;
  speed?: number;
  scale?: number;
}

export const EchoOrb: FC<EchoOrbProps> = ({
  color = '#00d4ff',
  speed = 1,
  scale = 1,
}) => {
  return (
    <Canvas camera={{ position: [0, 0, 5] }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      {/* Mesh rendering */}
    </Canvas>
  );
};
```

---

## 🚀 Deployment Options

### Netlify (via MCP)
- Auto-deploy on push
- Serverless `/api/` functions
- CDN distribution

### Vercel (via MCP)
- Edge functions
- Automatic deployment
- Analytics included

### Self-hosted
- Docker container
- Kubernetes/VPS
- Traditional server

---

## ✅ Implementation Checklist

**Phase 1: Core (Days 1-2)**
- [ ] App.tsx with routing
- [ ] Board.tsx workspace
- [ ] Sidebar.tsx (15 items)
- [ ] Toolbar.tsx (theme + language)

**Phase 2: Theme (Days 3-4)**
- [ ] CSS variables (5 colors × 2 modes)
- [ ] Glass morphism styling
- [ ] Theme toggle logic
- [ ] Color picker logic

**Phase 3: Panels (Days 5-6)**
- [ ] FloatingPanel component
- [ ] Zustand panel store
- [ ] Dragging logic
- [ ] localStorage persistence

**Phase 4: Modules (Days 7-14)**
- [ ] Implement 15 modules incrementally
- [ ] Each module: component + page
- [ ] Test each module
- [ ] Wire into PANEL_REGISTRY

**Phase 5: Polish (Days 15+)**
- [ ] Responsive design (mobile)
- [ ] Accessibility (a11y)
- [ ] Performance optimization
- [ ] SEO & metadata

---

## 🐛 Troubleshooting

### "Module not found"
→ Check barrel export (index.ts) exists in module folder

### "Colors not applying"
→ Verify CSS variables format: `hsl(h, s%, l%)`

### "Sidebar not expanding"
→ Check state management for `sidebarExpanded`

### "Panels not saving"
→ Check localStorage keys and JSON serialization

### "Translations not updating"
→ Run i18n reload after language change

---

## 📖 Documentation Files

1. **GOLDEN_SEED_BUILDER.IO.md** (760 lines) → Full technical spec
2. **GOLDEN_SEED_QUICK_REFERENCE.md** (this file) → Quick lookup
3. **ECHOCODER_MODULE_SPEC.md** (614 lines) → Developer studio details
4. **BUILDER_IO_GOLDEN_SEED_README.md** (518 lines) → Navigation guide
5. **DOWNLOAD_INSTRUCTIONS.txt** (224 lines) → Download & setup guide

---

**End of Quick Reference**

For detailed implementation, see GOLDEN_SEED_BUILDER.IO.md
