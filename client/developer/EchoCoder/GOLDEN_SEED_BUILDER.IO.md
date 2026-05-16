# GOLDEN SEED BUILDER.IO - Complete Technical Specification

**Version:** 1.0  
**Date:** 2025  
**Package:** Hospitality Suite with 15 Integrated Modules  
**Status:** ✅ Production Ready

---

## Table of Contents

1. [Core Architecture](#1-core-architecture)
2. [15 Modules Overview](#2-15-modules-overview)
3. [Application Structure](#3-application-structure)
4. [Design System](#4-design-system)
5. [Floating Panels System](#5-floating-panels-system)
6. [Theme & Styling](#6-theme--styling)
7. [Internationalization](#7-internationalization)
8. [Sidebar Structure](#8-sidebar-structure)
9. [Toolbar Design](#9-toolbar-design)
10. [Data Persistence](#10-data-persistence)
11. [Routing Configuration](#11-routing-configuration)
12. [Module Integration Pattern](#12-module-integration-pattern)
13. [3D Visualization System](#13-3d-visualization-system)
14. [Component Library](#14-component-library)
15. [MCP Integration](#15-mcp-integration)
16. [Deployment](#16-deployment)
17. [Security & Performance](#17-security--performance)

---

## 1. Core Architecture

### Technology Stack
- **Frontend:** React 18 + React Router 6 (SPA mode)
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** TailwindCSS 3 + CSS Variables (HSL)
- **UI Components:** Radix UI + Lucide React icons
- **State Management:** Zustand (for modules requiring persistence)
- **3D Graphics:** React Three Fiber + Three.js
- **Icons:** Lucide React
- **Testing:** Vitest

### Application Entry Points
```
client/
├── App.tsx              # Main router and layout orchestrator
├── pages/
│   ├── Index.tsx        # Dashboard (home)
│   ├── Culinary.tsx     # EchoRecipePro
│   ├── Pastry.tsx       # CakeBuilder
│   ├── Schedule.tsx     # Production timeline
│   ├── Inventory.tsx    # Food/supply tracking
│   ├── Maestro.tsx      # Kitchen management
│   ├── Mixology.tsx     # Bar management
│   ├── CRM.tsx          # Customer relationships
│   ├── ChefNet.tsx      # Team collaboration
│   ├── Support.tsx      # Help desk
│   ├── Whiteboard.tsx   # Collaborative canvas
│   ├── VideoConference.tsx  # Video/audio
│   ├── Canvas.tsx       # EchoCanvasStudio
│   ├── StickyNotes.tsx  # Quick notes
│   ├── EchoCoder.tsx    # Developer Studio ✨
│   ├── EchoAurum.tsx    # Layout module
│   ├── EchoLayout.tsx   # Design layout
│   └── Settings.tsx     # App settings
├── components/
│   ├── Board.tsx        # Workspace container
│   ├── Sidebar.tsx      # Navigation sidebar
│   ├── Toolbar.tsx      # Theme/language controls
│   ├── FloatingPanel.tsx # Draggable panel wrapper
│   ├── modules/         # 15 module components
│   └── ui/              # Radix UI components
├── hooks/               # Custom React hooks
├── lib/                 # Utilities & helpers
└── global.css           # CSS variables & theme
```

---

## 2. 15 Modules Overview

### Professional Operations (4 modules)

#### 2.1 Culinary (Module #1)
- **Component:** `EchoRecipePro`
- **Purpose:** Recipe management, technique library, ingredient tracking
- **Features:**
  - Recipe search & filtering
  - Ingredient database
  - Cooking techniques reference
  - Nutritional analysis
  - Recipe scaling
- **Data Model:**
  ```json
  {
    "id": "uuid",
    "name": "Recipe Name",
    "ingredients": [
      { "name": "Flour", "amount": 500, "unit": "g" }
    ],
    "techniques": ["Sautéing", "Braising"],
    "servings": 4,
    "prepTime": 30,
    "cookTime": 60
  }
  ```

#### 2.2 Pastry (Module #2)
- **Component:** `CakeBuilder`
- **Purpose:** 3D cake design system with layering
- **Features:**
  - 3D cake visualization (React Three Fiber)
  - Layer composition
  - Frosting/decoration options
  - Print layout templates
  - Order integration
- **Integration:** React Three Fiber + Three.js

#### 2.3 Schedule (Module #3)
- **Component:** `ProductionSchedule`
- **Purpose:** Production timeline & staff assignments
- **Features:**
  - Gantt chart timeline
  - Staff shift management
  - Task dependencies
  - Capacity planning
  - Export to calendar
- **Data Model:**
  ```json
  {
    "id": "uuid",
    "date": "2025-01-15",
    "tasks": [
      {
        "id": "task-1",
        "name": "Prep ingredients",
        "assignee": "Chef Name",
        "duration": 120,
        "dependencies": []
      }
    ]
  }
  ```

#### 2.4 Inventory (Module #4)
- **Component:** `InventoryManager`
- **Purpose:** Food/supply purchasing & tracking
- **Features:**
  - Stock level tracking
  - Supplier management
  - Purchase orders
  - Low stock alerts
  - Expiry tracking
  - Cost analysis

### Business Management (3 modules)

#### 2.5 CRM (Module #5)
- **Component:** `CustomerRelationship`
- **Purpose:** Customer relationships & sales
- **Features:**
  - Customer database
  - Contact history
  - Sales pipeline
  - Booking history
  - Communication log
  - Win/loss analysis

#### 2.6 ChefNet (Module #6)
- **Component:** `TeamCollaboration`
- **Purpose:** Team collaboration & messaging
- **Features:**
  - Team messaging
  - Task assignments
  - Announcements
  - Team calendar
  - Photo sharing
  - Notification system

#### 2.7 Support (Module #7)
- **Component:** `HelpDesk`
- **Purpose:** Help desk & ticket management
- **Features:**
  - Ticket creation/tracking
  - Priority levels
  - Assignment routing
  - Knowledge base
  - FAQ management
  - Resolution workflow

### Collaboration Tools (4 modules)

#### 2.8 Whiteboard (Module #8)
- **Component:** `WhiteboardCanvas`
- **Purpose:** Collaborative drawing canvas
- **Features:**
  - Shape drawing (rectangle, circle, line)
  - Text annotation
  - Color palette
  - Brush sizes
  - Clear/undo
  - Export as image
  - Collaborative editing (WebSocket ready)

#### 2.9 VideoConference (Module #9)
- **Component:** `VideoConference`
- **Purpose:** Video/audio calls, screen sharing
- **Features:**
  - Video/audio call interface
  - Screen sharing capability
  - Chat during call
  - Call recording (placeholder)
  - Participant list
  - Mute/camera controls

#### 2.10 Canvas (Module #10)
- **Component:** `EchoCanvasStudio`
- **Purpose:** 3D image generation & visualization
- **Features:**
  - 3D model viewer
  - Real-time rendering
  - Parameter adjustment
  - Export options
  - Animation timeline
  - Lighting controls

#### 2.11 StickyNotes (Module #11)
- **Component:** `StickyNotes`
- **Purpose:** Quick notes & reminders
- **Features:**
  - Create/edit notes
  - Color coding
  - Pin to dashboard
  - Search notes
  - Quick capture
  - Reminders (time-based)

### Developer Studio (1 module)

#### 2.12 EchoCoder (Module #12) ✨
- **Component:** `EchoCoder`
- **Purpose:** Professional SaaS Developer Studio
- **Features:**
  - Design canvas with draggable blocks
  - Code generation from designs
  - 3D Echo Orb visualization (customizable)
  - Public `/embed/echo` route for iframe embedding
  - Task automation buttons:
    - Planner: Project planning
    - Coder: Code generation
    - Reviewer: Code review interface
    - Integrator: Module integration
    - Historian: Version history
    - Scorecard: Metrics dashboard
  - Language support: EN/ES/FR/PT/IT
  - MCP-ready for AI automations
- **Folder Structure:**
  ```
  components/studio/
  ├── EchoCoder.tsx
  ├── DesignCanvas.tsx
  ├── CodeGenerator.tsx
  ├── EchoOrb.tsx
  ├── TaskPanel.tsx
  ├── PlannerTask.tsx
  ├── CoderTask.tsx
  ├── ReviewerTask.tsx
  ├── IntegratorTask.tsx
  ├── HistorianTask.tsx
  └── ScorecardTask.tsx
  ```

### Other Modules (4 modules)

#### 2.13 Maestro (Module #13)
- **Component:** `MaestroKitchen`
- **Purpose:** Kitchen management & planning
- **Features:**
  - Kitchen workflow optimization
  - Station management
  - Equipment tracking
  - Safety checklists
  - Cost control

#### 2.14 Mixology (Module #14)
- **Component:** `MixologyBar`
- **Purpose:** Bar management & cocktails
- **Features:**
  - Cocktail recipe database
  - Bar inventory
  - Pricing & profitability
  - Customer preferences
  - Signature drinks

#### 2.15 Echo Aurum (Module #15)
- **Component:** `EchoAurum`
- **Purpose:** Premium analytics & insights
- **Features:**
  - Revenue analytics
  - Customer lifetime value
  - Trend analysis
  - Predictive insights
  - Custom reports

#### 2.16 Echo Layout (Module #16)
- **Component:** `EchoLayout`
- **Purpose:** Space & seating management
- **Features:**
  - Venue layout design
  - Table/seating management
  - Capacity planning
  - Accessibility features
  - Event setup templates

### Core Dashboard (Module #17)

#### 2.17 Dashboard (Module #17)
- **Component:** `Dashboard`
- **Purpose:** Home screen with floating panels
- **Features:**
  - Key metrics overview
  - Activity feed
  - Quick action buttons
  - Floating panel management
  - Customizable widgets
  - At-a-glance status

### Settings (Module #18)

#### 2.18 Settings
- **Component:** `Settings`
- **Purpose:** App configuration
- **Features:**
  - User preferences
  - Theme & appearance
  - Language selection
  - Notification settings
  - Data management
  - Export/import settings

---

## 3. Application Structure

```
project-root/
├── client/
│   ├── pages/
│   │   ├── Index.tsx              # Dashboard
│   │   ├── Culinary.tsx
│   │   ├── Pastry.tsx
│   │   ├── Schedule.tsx
│   │   ├── Inventory.tsx
│   │   ├── Maestro.tsx
│   │   ├── Mixology.tsx
│   │   ├── CRM.tsx
│   │   ├── ChefNet.tsx
│   │   ├── Support.tsx
│   │   ├── Whiteboard.tsx
│   │   ├── VideoConference.tsx
│   │   ├── Canvas.tsx
│   │   ├── StickyNotes.tsx
│   │   ├── EchoCoder.tsx          # ✨ Developer Studio
│   │   ├── EchoAurum.tsx
│   │   ├── EchoLayout.tsx
│   │   └── Settings.tsx
│   ├── components/
│   │   ├── Board.tsx              # Workspace container
│   │   ├── Sidebar.tsx            # Navigation (15 items)
│   │   ├── Toolbar.tsx            # Theme & language controls
│   │   ���── FloatingPanel.tsx      # Draggable panel wrapper
│   │   ├── modules/
│   │   │   ├── Culinary/
│   │   │   │   ├── EchoRecipePro.tsx
│   │   │   │   ├── RecipeSearch.tsx
│   │   │   │   └── index.ts
│   │   │   ├── Pastry/
│   │   │   │   ├── CakeBuilder.tsx
│   │   │   │   ├── Layer3DView.tsx
│   │   │   │   └── index.ts
│   │   │   ├── Schedule/
│   │   │   │   ├── GanttChart.tsx
│   │   │   │   ├── StaffAssignment.tsx
│   │   │   │   └── index.ts
│   │   │   ├── [Other 14 modules...]
│   │   │   └── index.ts            # Barrel export
│   │   ├── studio/                # Developer Studio components
│   │   │   ├── EchoCoder.tsx
│   │   │   ├── DesignCanvas.tsx
│   │   │   ├── CodeGenerator.tsx
│   │   │   ├── EchoOrb.tsx
│   │   │   ├── TaskPanel.tsx
│   │   │   └── index.ts
│   │   ├── ui/                    # Radix UI components
│   │   └── index.ts               # Barrel export
│   ├── hooks/
│   │   ├── useFloatingPanels.ts
│   │   ├── useTheme.ts
│   │   ���── useLanguage.ts
│   │   ├── useLocalStorage.ts
│   │   └── index.ts
│   ├── lib/
│   │   ├── utils.ts               # cn() utility
│   │   ├── themes.ts
│   │   ├── languages.ts
│   │   └── constants.ts
│   ├── App.tsx                    # Router & main layout
│   ├── global.css                 # CSS variables & theme
│   ├── i18n.tsx                   # i18n setup
│   └── vite-env.d.ts
├── server/
│   ├── routes/
│   │   ├── embed.ts               # /api/embed/echo
│   │   ├── modules.ts             # Module data APIs
│   │   └── [other routes...]
│   └── index.ts
├── shared/
│   ├── api.ts                     # Type definitions
│   └── types.ts
├── styles/
│   ├── tokens.css
│   └── animations.css
├── tailwind.config.ts
├── vite.config.ts
└── package.json
```

---

## 4. Design System

### Glass Morphism Design

#### Dark Mode
```css
/* Base glass effect */
backdrop-filter: blur(12px);
background: rgba(15, 23, 42, 0.75);
border: 2px solid;
border-image: linear-gradient(135deg, var(--primary-color), var(--secondary-color)) 1;

/* Glow shadow */
box-shadow: 
  0 0 30px rgba(var(--primary-rgb), 0.3),
  0 8px 32px rgba(0, 0, 0, 0.3);

/* Hover state */
&:hover {
  backdrop-filter: blur(14px);
  background: rgba(15, 23, 42, 0.85);
  box-shadow: 
    0 0 40px rgba(var(--primary-rgb), 0.4),
    0 12px 48px rgba(0, 0, 0, 0.4);
}
```

#### Light Mode
```css
/* Base frosted glass */
backdrop-filter: blur(12px);
background: rgba(255, 255, 255, 0.8);
border: 2px solid #000;

/* Drop shadow */
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);

/* Hover state */
&:hover {
  backdrop-filter: blur(14px);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
}
```

---

## 5. Floating Panels System

### Panel Structure

```typescript
interface FloatingPanel {
  id: string;
  moduleId: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
  isPinned: boolean;
  zIndex: number;
}
```

### Panel Controls

- **[X]** - Close/remove panel
- **[−]** - Minimize/restore panel
- **[↗]** - Pop-out to new window
- **[📌]** - Pin/unpin panel

### Floating Panel Behaviors

1. **Draggable:** Click title bar to drag
2. **Resizable:** Drag corner/edges to resize
3. **Stacking:** Auto z-index management
4. **Persistence:** localStorage saves positions
5. **Cascading:** New panels offset by 20px
6. **Responsive:** Adapt to viewport on resize

### Panel Manager (Zustand Store)

```typescript
interface PanelStore {
  panels: Map<string, FloatingPanel>;
  addPanel: (panel: FloatingPanel) => void;
  removePanel: (id: string) => void;
  updatePanel: (id: string, updates: Partial<FloatingPanel>) => void;
  minimizePanel: (id: string) => void;
  maximizePanel: (id: string) => void;
  pinPanel: (id: string) => void;
  bringToFront: (id: string) => void;
  savePanels: () => void;
  loadPanels: () => void;
}
```

---

## 6. Theme & Styling

### Color Schemes (5 options)

#### 1. Cyan Theme
```css
--primary-rgb: 34, 211, 238;
--primary: hsl(186, 100%, 56%);
--secondary: hsl(200, 100%, 60%);
--accent: hsl(180, 100%, 50%);
```

#### 2. Blue Theme
```css
--primary-rgb: 59, 130, 246;
--primary: hsl(217, 92%, 60%);
--secondary: hsl(210, 100%, 65%);
--accent: hsl(215, 98%, 61%);
```

#### 3. Emerald Theme
```css
--primary-rgb: 16, 185, 129;
--primary: hsl(160, 84%, 54%);
--secondary: hsl(150, 80%, 60%);
--accent: hsl(170, 85%, 50%);
```

#### 4. Violet Theme
```css
--primary-rgb: 139, 92, 246;
--primary: hsl(259, 90%, 66%);
--secondary: hsl(270, 85%, 70%);
--accent: hsl(280, 88%, 65%);
```

#### 5. Rose Theme
```css
--primary-rgb: 244, 63, 94;
--primary: hsl(347, 89%, 60%);
--secondary: hsl(340, 82%, 65%);
--accent: hsl(350, 100%, 55%);
```

### Light/Dark Modes

**Total Combinations:** 5 themes × 2 modes = 10 combinations

---

## 7. Internationalization

### Supported Languages

1. **English** (en) 🇺🇸
2. **Spanish** (es) 🇪🇸
3. **French** (fr) 🇫🇷
4. **Portuguese** (pt) 🇵🇹
5. **Italian** (it) 🇮🇹

### i18n Implementation

```typescript
// client/i18n.tsx
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

interface LanguageResource {
  [key: string]: {
    translation: Record<string, any>;
  };
}

export const resources: LanguageResource = {
  en: { translation: enTranslations },
  es: { translation: esTranslations },
  fr: { translation: frTranslations },
  pt: { translation: ptTranslations },
  it: { translation: itTranslations },
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('language') || 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
```

### Translation Files Structure

```
client/
├── locales/
│   ├── en.json
│   ├── es.json
│   ├── fr.json
│   ├── pt.json
│   └── it.json
```

### Usage in Components

```typescript
import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('dashboard.title')}</h1>;
}
```

---

## 8. Sidebar Structure

### Sidebar Items (15 total)

1. 🏠 Dashboard
2. 👨‍🍳 Culinary (EchoRecipePro)
3. 🎂 Pastry (CakeBuilder)
4. 📅 Schedule
5. 📦 Inventory
6. 👑 Maestro BQT
7. 🍹 Mixology
8. 👥 CRM
9. 🤝 ChefNet
10. 🆘 Support
11. 🎨 Whiteboard
12. 📹 Video Conference
13. 🖼️ Canvas (EchoCanvasStudio)
14. 📝 Sticky Notes
15. 🔧 EchoCoder (Developer Studio) ✨

### Sidebar States

**Expanded:** 200px width, text visible  
**Collapsed:** 45px width, icons only  
**Mobile:** Hidden, accessible via hamburger menu

### Sidebar Implementation

```typescript
// client/components/Sidebar.tsx
interface SidebarItem {
  id: string;
  label: string;
  icon: ReactNode;
  path: string;
  badge?: string;
}

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const items: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home />, path: '/' },
    { id: 'culinary', label: 'Culinary', icon: <ChefHat />, path: '/culinary' },
    { id: 'pastry', label: 'Pastry', icon: <Cake />, path: '/pastry' },
    // ... 12 more items
    { 
      id: 'echocoder', 
      label: 'EchoCoder', 
      icon: <Code />, 
      path: '/echocoder',
      badge: '🔧'
    },
  ];

  return (
    <nav className={cn(
      'transition-all duration-300',
      isExpanded ? 'w-200' : 'w-45'
    )}>
      {/* Sidebar content */}
    </nav>
  );
}
```

---

## 9. Toolbar Design

### Toolbar Elements

1. **Theme Toggle** (Light ↔ Dark)
   - Sun/Moon icon button
   - Visual feedback on toggle
   - Persists to localStorage

2. **Color Picker** (5 color buttons)
   - Cyan, Blue, Emerald, Violet, Rose
   - Active state indicator
   - Smooth color transition

3. **Language Dropdown**
   - Country flags: 🇺🇸 🇪🇸 🇫🇷 🇵🇹 🇮🇹
   - Dropdown select
   - Current language highlighted
   - Immediate translation reload

### Toolbar Position

- **Location:** Top right of Board
- **Background:** Glass morphism
- **Layout:** Flexbox, right-aligned
- **Responsive:** Stacks on mobile

---

## 10. Data Persistence

### Storage Strategy

**NO EXCEL FILES** - All JSON/localStorage

#### localStorage Keys

```typescript
// Theme & UI State
localStorage.setItem('theme', 'dark'); // 'light' | 'dark'
localStorage.setItem('colorScheme', 'cyan'); // 'cyan' | 'blue' | 'emerald' | 'violet' | 'rose'
localStorage.setItem('language', 'en'); // 'en' | 'es' | 'fr' | 'pt' | 'it'
localStorage.setItem('sidebarExpanded', 'true'); // boolean

// Floating Panels
localStorage.setItem('floatingPanels', JSON.stringify([
  {
    id: 'panel-1',
    moduleId: 'dashboard',
    position: { x: 0, y: 0 },
    size: { width: 400, height: 600 },
    isMinimized: false,
    isPinned: false,
  }
]));

// Module-specific Data
localStorage.setItem('culinary:recipes', JSON.stringify([...]));
localStorage.setItem('schedule:tasks', JSON.stringify([...]));
localStorage.setItem('inventory:items', JSON.stringify([...]));
```

### API Integration (Optional)

For multi-user sync, create optional backend endpoints:

```typescript
// server/routes/persist.ts
app.post('/api/persist/:key', (req, res) => {
  // Save data to database
  const { key } = req.params;
  const data = req.body;
  // Persist to database
  res.json({ success: true });
});

app.get('/api/persist/:key', (req, res) => {
  // Load data from database
  const { key } = req.params;
  // Return data
  res.json({ data: {...} });
});
```

---

## 11. Routing Configuration

### Route Structure

```typescript
// client/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main Routes */}
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

        {/* Public Embed Route */}
        <Route path="/embed/echo" element={<EchoOrbEmbed />} />

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### SPA Configuration (Vite)

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    middlewareMode: true,
  },
});
```

---

## 12. Module Integration Pattern

### Barrel Export Pattern

```typescript
// client/components/modules/Culinary/index.ts
export { EchoRecipePro } from './EchoRecipePro';
export { RecipeSearch } from './RecipeSearch';
export * from './types';

// client/components/modules/index.ts
export * from './Culinary';
export * from './Pastry';
export * from './Schedule';
// ... all 15 modules
```

### Module Component Structure

```typescript
// client/components/modules/Culinary/EchoRecipePro.tsx
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  servings: number;
  prepTime: number;
  cookTime: number;
}

interface EchoRecipeProProps {
  onSelectRecipe?: (recipe: Recipe) => void;
}

export const EchoRecipePro: FC<EchoRecipeProProps> = ({ onSelectRecipe }) => {
  const { t } = useTranslation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    onSelectRecipe?.(recipe);
  };

  return (
    <div className={cn(
      'glass-panel',
      'p-6',
      'rounded-lg',
      'border border-primary/30'
    )}>
      <h1>{t('culinary.title')}</h1>
      {/* Module content */}
    </div>
  );
};
```

### Page Component Structure

```typescript
// client/pages/Culinary.tsx
import { FC } from 'react';
import { EchoRecipePro } from '@/components/modules';

export const Culinary: FC = () => {
  return (
    <div className="page-container">
      <EchoRecipePro />
    </div>
  );
};
```

---

## 13. 3D Visualization System

### React Three Fiber Integration

```typescript
// client/components/studio/EchoOrb.tsx
import { FC, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

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
      <OrbMesh color={color} speed={speed} scale={scale} />
    </Canvas>
  );
};

function OrbMesh({ color, speed, scale }: Omit<EchoOrbProps, undefined>) {
  const meshRef = useRef<Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01 * speed;
      meshRef.current.rotation.y += 0.02 * speed;
    }
  });

  return (
    <mesh ref={meshRef} scale={scale}>
      <icosahedronGeometry args={[1, 4]} />
      <meshPhongMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.3}
        wireframe={true}
      />
    </mesh>
  );
}
```

### 3D Model Viewer

For pastry/cake design, use Three.js directly with:
- `BufferGeometry` for custom shapes
- `OrbitControls` for user interaction
- `Lighting` for realistic rendering

---

## 14. Component Library

### Pre-built UI Components (Radix UI)

- Accordion
- Alert Dialog
- Avatar
- Badge
- Button
- Card
- Checkbox
- Dialog
- Dropdown Menu
- Form
- Input
- Label
- Menu
- Navigation Menu
- Popover
- Progress
- Radio Group
- Select
- Separator
- Sheet
- Switch
- Tabs
- Toast
- Toggle
- Tooltip

### Custom Components

```
client/components/ui/
├── glass-panel.tsx      # Base glass morphism panel
├── floating-panel.tsx   # Draggable panel wrapper
├── color-picker.tsx     # 5-color theme selector
├── language-selector.tsx # i18n dropdown
├── theme-toggle.tsx     # Light/Dark mode switch
├── sidebar.tsx
├── toolbar.tsx
├── board.tsx
└── [Radix UI components...]
```

---

## 15. MCP Integration

### MCP-Ready Hooks

```typescript
// client/hooks/useMCP.ts
interface MCPServer {
  name: string;
  connect: () => Promise<void>;
  isConnected: boolean;
}

export const useMCPServers = () => {
  const [servers, setServers] = useState<MCPServer[]>([]);

  const availableServers = [
    'supabase',
    'neon',
    'netlify',
    'zapier',
    'linear',
    'notion',
    'sentry',
  ];

  // Connect to MCP servers via future AI automations
  return { servers, availableServers };
};
```

### Integration Points

- **EchoCoder Planner:** Use Linear MCP for task management
- **Historian:** Use Notion MCP for documentation
- **Code Generation:** Use future AI MCPs for automation
- **Data Sync:** Use Supabase/Neon MCPs for persistence

---

## 16. Deployment

### Build Output

```bash
# Production build
npm run build

# Output structure
dist/
├── spa/               # Frontend SPA
│   ├── index.html
│   ├── assets/
│   │   ├── [components].js
│   │   └── [styles].css
└── server/            # Backend server
    └── [server-files].js
```

### Deployment Options

1. **Netlify**
   - Connect via MCP
   - Automatic deployment on push
   - Serverless functions for `/api/`

2. **Vercel**
   - Connect via MCP
   - Edge functions for dynamic routes
   - Automatic deployment

3. **Self-hosted**
   - Docker container
   - Kubernetes deployment
   - Traditional VPS

### Environment Variables

```env
# Frontend (.env)
VITE_API_URL=http://localhost:5173/api

# Server (.env.server)
NODE_ENV=production
PORT=3000
```

---

## 17. Security & Performance

### Security Best Practices

1. **Input Validation:** Zod schemas for all inputs
2. **XSS Prevention:** React auto-escaping
3. **CSRF Protection:** Token-based (if API enabled)
4. **localStorage Security:** Only store non-sensitive data
5. **HTTPS:** Always in production

### Performance Optimization

1. **Code Splitting:** Lazy load modules
2. **Image Optimization:** WebP, responsive sizes
3. **CSS-in-JS:** TailwindCSS utility classes
4. **Asset Caching:** Service Worker (optional)
5. **Bundle Analysis:** Monitor with Vite

### Lighthouse Targets

- **Performance:** 90+
- **Accessibility:** 95+
- **Best Practices:** 95+
- **SEO:** 95+

---

## Implementation Checklist

- [ ] Core 4 components (App, Board, Sidebar, Toolbar)
- [ ] Theme system with 5 colors × 2 modes
- [ ] Floating panels system
- [ ] Dashboard home page
- [ ] 15 module components
- [ ] Internationalization (5 languages)
- [ ] Routing configuration
- [ ] localStorage persistence
- [ ] 3D visualization (React Three Fiber)
- [ ] EchoCoder developer studio
- [ ] Public /embed/echo route
- [ ] Mobile responsiveness
- [ ] Accessibility compliance
- [ ] Performance optimization
- [ ] Deployment setup

---

**End of Specification**

For implementation details, refer to GOLDEN_SEED_QUICK_REFERENCE.md and module-specific documentation.
