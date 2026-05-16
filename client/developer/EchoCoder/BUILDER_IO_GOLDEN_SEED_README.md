# BUILDER.IO GOLDEN SEED - Master Navigation Guide

**Your Complete Implementation Roadmap**

---

## 🎯 60-Second Pitch (What to Tell Builder.io)

> "We're building a comprehensive hospitality management suite with 15 fully integrated modules including a new developer studio (EchoCoder) with design canvas, code generation, and 3D Echo Orb visualization. The design features professional glass morphism throughout, 5 color schemes × 2 modes (10 total combinations), 5 languages (EN/ES/FR/PT/IT), draggable floating panels, and zero Excel dependencies. Complete technical specification is included in GOLDEN_SEED_BUILDER.IO.md."

---

## 📚 Documentation Structure

### 4 Core Documents (All Provided)

#### 1. **GOLDEN_SEED_BUILDER.IO.md** (760 lines)
   - **What it is:** Complete technical specification
   - **Use when:** You need detailed implementation guidance
   - **Sections:** 17 comprehensive sections covering architecture, design, data persistence, deployment
   - **Who reads it:** Architects, Senior Developers, Tech Leads
   - **Time to read:** 30-45 minutes

#### 2. **GOLDEN_SEED_QUICK_REFERENCE.md** (354 lines)
   - **What it is:** One-page cheat sheet for quick lookup
   - **Use when:** You need to quickly find module info, colors, or folder structure
   - **Sections:** Module table, folder structure, design specs, troubleshooting
   - **Who reads it:** All developers during implementation
   - **Time to read:** 10-15 minutes

#### 3. **ECHOCODER_MODULE_SPEC.md** (614 lines)
   - **What it is:** Dedicated specification for the Developer Studio
   - **Use when:** Implementing the EchoCoder module (Module #12)
   - **Sections:** Component hierarchy, all 6 task panels, 3D visualization, translations, MCP integration
   - **Who reads it:** Developers implementing the studio features
   - **Time to read:** 20-30 minutes

#### 4. **BUILDER_IO_GOLDEN_SEED_README.md** (this file, 518 lines)
   - **What it is:** Master navigation and implementation guide
   - **Use when:** You're planning the implementation phase
   - **Sections:** 5-phase implementation sequence, file-by-file checklist, team roles
   - **Who reads it:** Project managers, implementation leads
   - **Time to read:** 15-25 minutes

---

## 🚀 Implementation Sequence (5 Phases)

### Phase 1: Core Infrastructure (Days 1-3)
**Focus:** Foundation and basic architecture

**Step 1.1 - App Router Setup**
- [ ] Review client/App.tsx in existing codebase
- [ ] Create routing structure with React Router 6
- [ ] Add 18 route entries (dashboard + 17 modules)
- [ ] Create catch-all route for 404
- **File:** `client/App.tsx`
- **Size:** ~200 lines
- **Reference:** GOLDEN_SEED_BUILDER.IO.md Section 11

**Step 1.2 - Layout Components**
- [ ] Create `client/components/Board.tsx` (main workspace)
- [ ] Create `client/components/Sidebar.tsx` (15-item navigation)
- [ ] Create `client/components/Toolbar.tsx` (theme + language)
- [ ] Create `client/components/FloatingPanel.tsx` (draggable wrapper)
- **Total:** ~600 lines
- **Reference:** GOLDEN_SEED_QUICK_REFERENCE.md Design Specifications

**Step 1.3 - Page Stubs**
- [ ] Create 18 page files in `client/pages/`
- [ ] Each page imports its corresponding module component
- [ ] Add basic structure: header, description, module content
- **Total:** ~20 lines per file × 18 files = ~360 lines

**Phase 1 Deliverable:** Working SPA with navigation framework

---

### Phase 2: Theme & Styling System (Days 4-5)
**Focus:** Visual design and customization

**Step 2.1 - CSS Variables**
- [ ] Define 5 color schemes in CSS variables
- [ ] Create light/dark mode overrides
- [ ] Test color transitions
- [ ] Add glass morphism utility classes
- **File:** `client/global.css`
- **Size:** ~300 lines
- **Reference:** GOLDEN_SEED_BUILDER.IO.md Section 6

**Step 2.2 - Theme Hook**
- [ ] Create `client/hooks/useTheme.ts`
- [ ] Implement color scheme switching logic
- [ ] Implement light/dark mode toggle
- [ ] Add localStorage persistence
- **Size:** ~150 lines

**Step 2.3 - Theme Toolbar**
- [ ] Implement color picker buttons in Toolbar
- [ ] Implement theme toggle (sun/moon icon)
- [ ] Wire up state management
- **Size:** ~200 lines

**Phase 2 Deliverable:** Fully themeable UI with 10 color combinations

---

### Phase 3: Internationalization (Days 6-7)
**Focus:** Multi-language support

**Step 3.1 - i18n Setup**
- [ ] Install i18next and react-i18next
- [ ] Create `client/i18n.tsx` configuration
- [ ] Set up language detection/persistence
- **Size:** ~100 lines
- **Reference:** GOLDEN_SEED_BUILDER.IO.md Section 7

**Step 3.2 - Translation Files**
- [ ] Create 5 JSON translation files
- [ ] `client/locales/en.json`
- [ ] `client/locales/es.json`
- [ ] `client/locales/fr.json`
- [ ] `client/locales/pt.json`
- [ ] `client/locales/it.json`
- **Size:** ~200 lines each × 5 = ~1,000 lines

**Step 3.3 - Language Selector**
- [ ] Create language dropdown in Toolbar
- [ ] Wire up language switching
- [ ] Test translation reloading
- **Size:** ~150 lines

**Step 3.4 - Component Translations**
- [ ] Add `const { t } = useTranslation()` to components
- [ ] Replace hardcoded strings with `t('key.path')`
- **Scope:** All UI components

**Phase 3 Deliverable:** Fully localized UI in 5 languages

---

### Phase 4: Floating Panels System (Days 8-9)
**Focus:** Core interactive feature

**Step 4.1 - Zustand Store**
- [ ] Create `client/hooks/usePanelStore.ts`
- [ ] Implement panel CRUD operations
- [ ] Add z-index management
- **Size:** ~250 lines
- **Reference:** GOLDEN_SEED_BUILDER.IO.md Section 5

**Step 4.2 - FloatingPanel Component**
- [ ] Already created in Phase 1, now enhance it
- [ ] Add drag functionality (mouse handlers)
- [ ] Add resize functionality (corner/edge handlers)
- [ ] Add minimize/maximize
- [ ] Add pin functionality
- **Size:** ~400 lines

**Step 4.3 - localStorage Persistence**
- [ ] Save panel positions on update
- [ ] Load panel positions on app start
- [ ] Handle responsive resizing
- **Size:** ~100 lines

**Step 4.4 - Test Floating Panels**
- [ ] Open multiple panels
- [ ] Drag panels around
- [ ] Resize panels
- [ ] Refresh page, verify positions persist
- [ ] Test on multiple screen sizes

**Phase 4 Deliverable:** Fully functional floating panel system

---

### Phase 5: Module Implementation (Days 10-20)
**Focus:** Core business logic

#### Priority: Implement incrementally

**Tier 1 (Days 10-12) - Dashboard & Core Modules**
- [ ] Dashboard (Index.tsx) - 6 floating panels demo
- [ ] Culinary (EchoRecipePro) - Recipe management
- [ ] Schedule - Timeline/Gantt chart
- **Total:** ~1,500 lines

**Tier 2 (Days 13-15) - Business Modules**
- [ ] CRM - Customer management
- [ ] ChefNet - Team collaboration
- [ ] Support - Help desk
- **Total:** ~1,500 lines

**Tier 3 (Days 16-18) - Collaboration Tools**
- [ ] Whiteboard - Drawing canvas
- [ ] VideoConference - Video interface
- [ ] StickyNotes - Note taking
- **Total:** ~1,200 lines

**Tier 4 (Days 19-20) - Developer Studio + Remaining**
- [ ] EchoCoder - Developer studio (detailed in ECHOCODER_MODULE_SPEC.md)
- [ ] Pastry, Inventory, Maestro, Mixology, Canvas, EchoAurum, EchoLayout
- **Total:** ~2,000+ lines
- **Reference:** ECHOCODER_MODULE_SPEC.md Sections 1-6

#### Module Implementation Pattern

For each module:

**1. Create Module Folder**
```
client/components/modules/ModuleName/
├── ModuleComponent.tsx
├── SubComponent.tsx
├── types.ts
└── index.ts (barrel export)
```

**2. Create Module Component**
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
      {/* Module content */}
    </div>
  );
};
```

**3. Create Page Component**
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

**4. Add Translation Keys**
```json
{
  "moduleName": {
    "title": "Module Title",
    "description": "Module Description"
  }
}
```

**5. Test Module**
- [ ] Navigate to route
- [ ] Verify component renders
- [ ] Check translations
- [ ] Test floating panel

**Phase 5 Deliverable:** All 15 modules + Dashboard + Settings

---

## 📋 Implementation Checklist

### Week 1: Foundation
- [ ] **Day 1-2: Core Infrastructure**
  - [ ] App.tsx routing (18 routes)
  - [ ] Board.tsx layout
  - [ ] Sidebar.tsx navigation
  - [ ] Toolbar.tsx controls
  - [ ] FloatingPanel.tsx

- [ ] **Day 3-4: Theme System**
  - [ ] CSS variables (5 colors)
  - [ ] Light/dark modes
  - [ ] Theme toggle
  - [ ] Color picker

- [ ] **Day 5: Internationalization**
  - [ ] i18next setup
  - [ ] 5 language files
  - [ ] Language selector
  - [ ] Component translations

### Week 2: Core Features
- [ ] **Day 6-7: Floating Panels**
  - [ ] Zustand store
  - [ ] Drag/resize logic
  - [ ] localStorage persistence
  - [ ] Full testing

- [ ] **Day 8-14: Module Implementation**
  - [ ] Dashboard (Day 8)
  - [ ] Tier 1 modules (Days 9-10)
  - [ ] Tier 2 modules (Days 11)
  - [ ] Tier 3 modules (Days 12)
  - [ ] Tier 4 modules (Days 13-14)

### Week 3: Polish & Deployment
- [ ] **Day 15-16: EchoCoder Studio**
  - [ ] Design Canvas
  - [ ] Code Generator
  - [ ] EchoOrb 3D
  - [ ] All 6 tasks

- [ ] **Day 17: Responsive Design**
  - [ ] Mobile sidebar
  - [ ] Touch events
  - [ ] Responsive panels
  - [ ] Mobile menu

- [ ] **Day 18: Quality Assurance**
  - [ ] Cross-browser testing
  - [ ] Accessibility audit
  - [ ] Performance optimization
  - [ ] SEO checks

- [ ] **Day 19-20: Deployment**
  - [ ] Build optimization
  - [ ] CDN setup
  - [ ] Environment variables
  - [ ] Monitoring setup

---

## 👥 Team Roles & Responsibilities

### Tech Lead / Architect
- **Primary:** Sections 1-3, 11, 16-17 of main spec
- **Deliverable:** Infrastructure, routing, deployment setup
- **Time:** 5-7 days
- **Files:** App.tsx, vite.config.ts, package.json scripts, .env setup

### Frontend Developers (2-3 people)
- **Primary:** Sections 4-10 of main spec
- **Deliverable:** Components, styling, i18n, panels
- **Time:** 10-14 days
- **Files:** 30+ component files, CSS, locale files

### UI/UX Designer
- **Primary:** Section 4 (Design System)
- **Deliverable:** Color palette, glass morphism, animations
- **Time:** 2-3 days (can work in parallel)
- **Deliverables:** CSS tokens, design guidelines, Figma (optional)

### Module Developers (3-4 people)
- **Primary:** Section 2 (Module Specs)
- **Deliverable:** 15 modules + Dashboard + Settings
- **Time:** 10-15 days
- **Distribution:**
  - Developer 1: Culinary, Pastry, Schedule
  - Developer 2: Inventory, Maestro, Mixology
  - Developer 3: CRM, ChefNet, Support
  - Developer 4: Whiteboard, Video, Canvas, StickyNotes, Echo* modules, EchoCoder

### QA / Testing
- **Primary:** Automated testing setup
- **Deliverable:** Unit tests, integration tests, e2e tests
- **Time:** Continuous throughout
- **Tools:** Vitest, React Testing Library

---

## 🔗 Cross-Reference Guide

### By Role

**Project Manager**
→ Implementation Sequence (above) + Checklist

**Architect**
→ GOLDEN_SEED_BUILDER.IO.md Sections 1, 3, 11, 16-17

**Frontend Developer**
→ GOLDEN_SEED_QUICK_REFERENCE.md + GOLDEN_SEED_BUILDER.IO.md Sections 4-10

**Module Developer**
→ GOLDEN_SEED_BUILDER.IO.md Section 2 + GOLDEN_SEED_QUICK_REFERENCE.md Module Table

**EchoCoder Developer**
→ ECHOCODER_MODULE_SPEC.md (Sections 1-6)

**QA Engineer**
→ GOLDEN_SEED_BUILDER.IO.md Section 17 (Security & Performance)

---

### By Task

**"How do I add a new module?"**
→ GOLDEN_SEED_BUILDER.IO.md Section 12 (Module Integration Pattern)

**"What are the colors?"**
→ GOLDEN_SEED_QUICK_REFERENCE.md Design Specifications (or GOLDEN_SEED_BUILDER.IO.md Section 6)

**"How do I set up floating panels?"**
→ GOLDEN_SEED_BUILDER.IO.md Section 5

**"What's the folder structure?"**
→ GOLDEN_SEED_QUICK_REFERENCE.md Folder Structure (or GOLDEN_SEED_BUILDER.IO.md Section 3)

**"How do I implement EchoCoder?"**
→ ECHOCODER_MODULE_SPEC.md

**"How do I set up translations?"**
→ GOLDEN_SEED_BUILDER.IO.md Section 7

**"What are the routes?"**
→ GOLDEN_SEED_BUILDER.IO.md Section 11 + GOLDEN_SEED_QUICK_REFERENCE.md Module Table

---

## 📊 Project Statistics

### Code Volume Estimates

| Component | Files | LOC | Est. Hours |
|-----------|-------|-----|-----------|
| Core Infrastructure | 4 | 600 | 6 |
| Theme System | 3 | 400 | 4 |
| i18n Setup | 6 | 1,000 | 5 |
| Floating Panels | 3 | 600 | 6 |
| Dashboard | 2 | 400 | 4 |
| 14 Modules | 56 | 8,000 | 50 |
| EchoCoder Studio | 10 | 2,000 | 12 |
| Testing | varies | varies | 20 |
| **TOTAL** | **84** | **~13,000** | **~107 hours** |

### Team Composition Recommendation

- **1 Tech Lead** (10-15 hours): Infrastructure, routing, deployment
- **2 Frontend Developers** (30-40 hours each): UI, components, i18n, panels
- **3-4 Module Developers** (25-35 hours each): Business logic modules
- **1 QA Engineer** (20-30 hours): Testing, quality assurance
- **1 UI/UX Designer** (15-20 hours, parallel): Design system, tokens, guidelines

**Total Team Size:** 8-10 people  
**Estimated Timeline:** 3-4 weeks (concurrent work)  
**Single Developer Timeline:** 20-25 weeks (sequential work)

---

## 🎯 Success Criteria

### Phase 1 Complete ✅
- SPA routes to all 18 pages
- Sidebar with 15 items + settings
- Toolbar with theme & language controls
- Pages render without errors

### Phase 2 Complete ✅
- 5 color schemes apply correctly
- Light/dark modes toggle
- Color picker works
- All colors persist on refresh

### Phase 3 Complete ✅
- All strings translated in 5 languages
- Language dropdown works
- Translations persist
- No untranslated UI strings

### Phase 4 Complete ✅
- Panels drag smoothly
- Panels resize correctly
- Positions persist on refresh
- Multiple panels stack properly
- Mobile panels responsive

### Phase 5 Complete ✅
- All 15 modules load and render
- Dashboard shows sample floating panels
- Each module has unique content
- Modules can be opened/closed as panels
- All modules translated

### Final Complete ✅
- EchoCoder fully functional
- `/embed/echo` route works
- 3D Echo Orb renders
- All 6 tasks working
- Performance Lighthouse > 90
- Accessibility Lighthouse > 95

---

## 🚀 Deployment Checklist

### Before Going Live
- [ ] All routes tested
- [ ] All modules functioning
- [ ] Dark/light modes verified
- [ ] All 5 languages working
- [ ] Floating panels persist
- [ ] Mobile responsive
- [ ] Performance optimized
- [ ] Accessibility compliant
- [ ] Security audit passed
- [ ] Environment variables set

### Deployment Options
- **Netlify:** Connect via MCP, auto-deploy on push
- **Vercel:** Connect via MCP, edge functions available
- **Self-hosted:** Docker container or traditional VPS

---

## 📞 Support & Resources

### Documentation
- GOLDEN_SEED_BUILDER.IO.md (technical spec)
- GOLDEN_SEED_QUICK_REFERENCE.md (cheat sheet)
- ECHOCODER_MODULE_SPEC.md (studio spec)
- DOWNLOAD_INSTRUCTIONS.txt (setup guide)

### External Resources
- React Router 6: https://reactrouter.com
- TailwindCSS: https://tailwindcss.com
- Radix UI: https://www.radix-ui.com
- i18next: https://www.i18next.com
- Zustand: https://github.com/pmndrs/zustand
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber

### Common Issues
See GOLDEN_SEED_QUICK_REFERENCE.md Troubleshooting section

---

**End of Master Navigation Guide**

Ready to build? Start with Phase 1: Core Infrastructure. Good luck! 🚀
