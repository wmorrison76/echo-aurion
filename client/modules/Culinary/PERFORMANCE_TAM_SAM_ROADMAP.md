# 🚀 Performance + TAM/SAM Expansion Roadmap

**Focus**: Speed + Market Domination (Broad Culinary Market)  
**Timeline**: 12 weeks  
**Billing**: Deferred (Handled by Luccca Ecosystem)  
**Scope**: HIGH + MEDIUM priority items only

---

## 📊 Current State

| Category | Status | Impact |
|----------|--------|--------|
| **Performance** | ⚠️ Good but optimizable | Load time ~2-3s; can reach <1.5s |
| **TAM Coverage** | ❌ Niche (R&D only) | Only targets Michelin/high-end |
| **SAM/SOM** | ❌ Limited | Missing industry templates |
| **Module Maturity** | ✅ Good | Core features complete; needs polish |

---

## PHASE 1: PERFORMANCE OPTIMIZATION (Weeks 1-4)

### 🔴 HIGH PRIORITY - Load Speed

#### 1.1 Image Optimization (Week 1-2)
**Impact**: 30-50% bandwidth reduction  
**Effort**: Medium

- [ ] **WebP Conversion Pipeline**
  - Implement sharp.js for image processing
  - Add WebP format with JPG fallback
  - Update Gallery, RecipeSearch, Menu Studio image loaders
  - Target: 2 KB → 1.2 KB per recipe card image

- [ ] **Blur-Up / LQIP (Low Quality Image Placeholder)**
  - Use blurhash or dominant color extraction
  - Show placeholder while image loads
  - Impact: Perceived performance +40%

- [ ] **Image CDN Integration** (Optional: CloudFlare Images, Imgix)
  - If images stored on Supabase, add CDN layer
  - Auto-format conversion (WebP for Chrome, JPG for Safari)
  - Geolocation-based serving

**Files to modify**:
- client/lib/performance-utils.ts (add WebP converter)
- server/routes/recipeImage.ts (return WebP when available)
- client/pages/sections/Gallery.tsx (update img loading)
- client/pages/sections/RecipeSearch.tsx (update recipe cards)

**Expected Result**: Gallery load time 3s → 1.5s

#### 1.2 Server-Side Pagination (Week 2-3)
**Impact**: 40% reduction for large datasets  
**Effort**: High

- [ ] **API Pagination for Large Lists**
  - RecipeSearch: Currently loads all recipes; paginate at API level
  - Implement cursor-based or offset pagination
  - Limit: 50 items per page; lazy load on scroll

- [ ] **Database Query Optimization**
  - Add indexes for filtered searches (status, cuisine, difficulty)
  - Use LIMIT + OFFSET in Supabase queries
  - Implement query result caching

**Files to modify**:
- client/pages/sections/RecipeSearch.tsx (use pagination)
- server/routes/recipe.ts (add pagination params)
- client/hooks/use-recipe-search.ts (handle pagination state)

**Expected Result**: Load 1000 recipes → Load 50 initially; 0.5s per page

#### 1.3 Code Splitting Audit (Week 2)
**Impact**: 15% bundle size reduction  
**Effort**: Low-Medium

- [ ] **Analyze Current Bundles**
  - Run `npm run build` and analyze output
  - Identify unused dependencies
  - Check for duplicate chunks

- [ ] **Optimize Heavy Libraries**
  - Three.js (R&D Labs 3D): Already chunked ✅
  - Recharts (R&D Labs graphs): Already chunked ✅
  - JSZip (Export): Already chunked ✅
  - jsPDF (Nutrition labels): Verify chunking

- [ ] **Lazy Load Panels**
  - R&D Labs: Load only when tab clicked
  - Gallery: Load overlay only when opened
  - Approval Dialog: Load only when needed

**Files to modify**:
- vite.config.ts (review/optimize manualChunks)
- client/App.tsx (verify lazy routes)

**Expected Result**: Initial bundle 405 KB → 380 KB gzipped

#### 1.4 Caching Strategy Improvements (Week 3)
**Impact**: 50% reduction for repeat visits  
**Effort**: Medium

- [ ] **HTTP Cache Headers**
  - Extend image cache from 31536000s (current) to browser cache
  - Add Cache-Control for API responses (stale-while-revalidate)
  - Implement Etag for API responses

- [ ] **Service Worker / PWA**
  - Cache critical routes (Index, RecipeSearch, Gallery)
  - Enable offline mode for cached recipes
  - Background sync for offline edits

- [ ] **React Query Optimization**
  - Ensure QueryClient cache is configured
  - Set staleTime appropriately (5min for recipes, 1hr for suppliers)
  - Implement query invalidation on mutations

**Files to modify**:
- client/App.tsx (verify QueryClient config)
- server/index.ts (add cache headers)
- client/service-worker.ts (create if missing)

**Expected Result**: Return visitor load time 1.5s → 0.8s

---

### 🟡 MEDIUM PRIORITY - Mobile Performance

#### 2.1 Mobile Bundle Optimization (Week 4)
**Impact**: 25% reduction for mobile  
**Effort**: Medium

- [ ] **React Native / Expo Optimization**
  - Review mobile/package.json for duplicate deps
  - Tree-shake unused code for mobile
  - Optimize Expo bundle size

- [ ] **Mobile-Specific Images**
  - Reduce image resolution on mobile (serve smaller versions)
  - Use responsive images (srcset) for web
  - Lazy load below-the-fold images on mobile

- [ ] **Mobile Layout Optimization**
  - Simplify gallery grid for mobile (1-2 columns vs 4)
  - Hide non-essential panels on mobile
  - Reduce animation complexity on low-end devices

**Files to modify**:
- mobile/app.config.ts (optimize Expo config)
- client/pages/sections/Gallery.tsx (responsive grid)
- client/lib/performance-utils.ts (mobile image loader)

**Expected Result**: Mobile load time 3-4s → 1.5-2s

#### 2.2 Mobile Touch & Interaction (Week 4)
**Impact**: UX improvement  
**Effort**: Low

- [ ] **Touch Target Sizing**
  - Ensure all buttons/links are 44x44px minimum
  - Add touch-friendly spacing between interactive elements
  - Test with real devices

- [ ] **Mobile Gestures**
  - Swipe to navigate between recipe tabs
  - Long-press context menu for actions
  - Double-tap to zoom recipe images

**Files to modify**:
- mobile/screens/*/**: Increase touch targets
- client/components/GestureHandler.tsx (create if missing)

---

## PHASE 2: TAM EXPANSION - VERTICAL TEMPLATES (Weeks 5-8)

### 🔴 HIGH PRIORITY - Industry-Specific Features

#### 3.1 Recipe Type Filtering & Templates (Week 5)
**Impact**: Opens 3 new vertical markets  
**Effort**: High

**Current State**: Recipe system is generic (works for all types)

**Expansion Needed**:

- [ ] **Fine Dining Template**
  - Features: Tasting menus, mise-en-place tracking, plating instructions
  - Fields: Plating diagram, dish presentation, technique notes
  - Workflows: Chef approval, execution checklist
  - UI: Premium dark mode, high-quality image display

- [ ] **Casual Dining Template**
  - Features: Standard recipes, cost-per-plate focus, portion control
  - Fields: Prep time, execution steps, yield optimization
  - Workflows: Simple approval, prep schedule
  - UI: Clean, efficient navigation

- [ ] **Fast Casual / QSR Template**
  - Features: Simplified recipes, speed-focused, consistency metrics
  - Fields: Assembly time, standardized portions, quality checkpoints
  - Workflows: Quick approval, assembly checklist
  - UI: Compact, mobile-friendly

**Implementation**:
- Add `recipe.type` field to filter templates
- Create template library with pre-filled fields by type
- Update UI components to show/hide fields by type

**Files to modify**:
- client/pages/RecipeTemplate.tsx (create/update)
- client/types/ingredients.ts (add template types)
- client/pages/sections/RecipeSearch.tsx (filter by type)
- client/i18n/dictionaries.ts (add template strings)

**Expected Result**: Support 3 new market segments

#### 3.2 Bakery Module (Week 6)
**Impact**: $500M+ bakery market  
**Effort**: Very High

**New Features**:
- [ ] **Dough Fermentation Tracking**
  - Temperature curves over time
  - Hydration ratio calculator (baker's math)
  - Autolyse time tracking
  - Bulk fermentation schedule

- [ ] **Oven Management**
  - Bake schedule (temps, timing, steam)
  - Multiple oven tracking
  - Load management

- [ ] **Lamination & Shaping**
  - Layer count (croissants, danish)
  - Turn schedule and timing
  - Shaping instructions with diagrams

- [ ] **Specialty Calculations**
  - Baker's percentages (flour = 100%)
  - Ingredient scaling
  - Conversion: weight ↔ volume

**New Pages**:
- Bakery Dashboard (fermentation timeline, oven schedule)
- Dough Manager (track multiple doughs in progress)
- Lamination Tracker (visualize laminated doughs)

**Files to create**:
- client/pages/sections/BakeryWorkspace.tsx
- client/components/Bakery/FermentationTracker.tsx
- client/components/Bakery/OvenScheduler.tsx
- client/lib/bakery-calculations.ts
- client/i18n/ (add bakery strings)

**Expected Result**: Enter bakery market; support professional bakers

#### 3.3 Pastry & Dessert Module (Week 7)
**Impact**: Premium dessert market  
**Effort**: High

**New Features**:
- [ ] **Chocolate Tempering**
  - Temperature curve tracking
  - Chocolate type database
  - Crystallization notes

- [ ] **Precision Baking**
  - Exact temperature requirements
  - Humidity tracking
  - Altitude adjustments

- [ ] **Advanced Techniques**
  - Mousse formulations (air incorporation %)
  - Gelatin/hydrocolloid calculations
  - Sugar work temperature guides

- [ ] **Component Assembly**
  - Layer stacking guide
  - Assembly time tracking
  - Storage instructions per component

**New Pages**:
- Pastry Recipe Editor (enhanced with precision fields)
- Component Library (assemblies, creams, custards)
- Technique Library (tempering, sugar work, etc.)

**Files to create**:
- client/pages/sections/PastryWorkspace.tsx
- client/components/Pastry/TemperingGuide.tsx
- client/lib/pastry-formulations.ts

**Expected Result**: Premium pastry chefs adopt tool

#### 3.4 Catering & Large Format (Week 8)
**Impact**: $1B+ catering market  
**Effort**: High

**New Features**:
- [ ] **Batch Cooking**
  - Scale recipes to 50, 100, 500 servings
  - Batch size calculator
  - Prep schedule by ingredient

- [ ] **Equipment Planning**
  - Equipment needed by batch size
  - Setup time estimator
  - Multiple kitchen coordination

- [ ] **Transport & Holding**
  - Cold chain tracking (temp/time)
  - Reheating instructions
  - Shelf-life calculator

- [ ] **Event Management**
  - Multiple events in calendar
  - Guest count tracking
  - Dietary restriction summary

- [ ] **Team Scheduling**
  - Assign prep tasks by role
  - Timeline with dependencies
  - Coordination dashboard

**New Pages**:
- Catering Dashboard (events calendar, team schedule)
- Batch Calculator (scale recipes, equipment planning)
- Event Execution Checklist (real-time tracking)

**Files to create**:
- client/pages/sections/CateringWorkspace.tsx
- client/components/Catering/BatchCalculator.tsx
- client/components/Catering/EventPlanner.tsx
- client/lib/catering-scaling.ts

**Expected Result**: Enterprise catering adoption

---

### 🟡 MEDIUM PRIORITY - Compliance & Standards

#### 4.1 Allergen Management Enhancement (Week 5-6)
**Impact**: Legal compliance + safety  
**Effort**: Medium

**Current State**: Basic allergen list

**Expand**:
- [ ] **Allergen Cross-Contamination Tracking**
  - Shared equipment alerts
  - Cleaning protocol per allergen
  - Staff training documentation

- [ ] **Labels & Declaration**
  - Generate FDA allergen labels
  - EU Top 14 allergen compliance
  - Custom allergen rules by region

- [ ] **Supplier Allergen Verification**
  - Track allergen certifications per supplier
  - Batch-level allergen testing
  - Traceability by allergen

**Files to modify**:
- client/pages/sections/NutritionLabel.tsx (add allergen labels)
- client/lib/allergens.ts (expand allergen database)
- client/components/AllergenSheetExportDialog.tsx (update)

**Expected Result**: Comply with FDA, EU, and regional requirements

#### 4.2 Nutritional Labeling (FDA/EU) (Week 7)
**Impact**: Retail/packaged food market  
**Effort**: High

**Current State**: Basic nutrition per recipe

**Expand**:
- [ ] **FDA Nutrition Facts Panel**
  - Generate compliant label format
  - Serving size calculator
  - Daily value (%DV) calculations

- [ ] **EU Nutrition Declaration**
  - Allergen declaration (Top 14)
  - Color-coded nutrients
  - GDA per serving

- [ ] **USDA Integration**
  - Pull ingredient nutrition from USDA
  - Batch updates for ingredient changes
  - Accuracy tracking

**Files to modify**:
- client/lib/usda-nutrition-enhanced.ts (already started)
- client/components/NutritionLabel.tsx (update labels)

**Expected Result**: Sell packaged products with compliant labels

---

## PHASE 3: MODULE MATURITY & POLISH (Weeks 9-10)

### 🔴 HIGH PRIORITY - First-Time User Experience

#### 5.1 Onboarding Flow (Week 9)
**Impact**: 20-30% improvement in day-7 retention  
**Effort**: High

**Current State**: No onboarding; users land on recipes page

**Create**:
- [ ] **Signup → First Recipe Flow**
  - Step 1: Welcome + choose vertical (Fine Dining, Casual, Bakery, Catering)
  - Step 2: Create first recipe (guided form)
  - Step 3: Add team members (invite email)
  - Step 4: Explore key features (help tour)
  - Step 5: Confirm integration (connect suppliers if applicable)

- [ ] **Onboarding Checklist Widget**
  - Sticky widget during first 7 days
  - Track completion (recipes created, team invited, etc.)
  - Dismiss option; resume later

- [ ] **In-App Guidance**
  - Tooltips on key UI elements first 5 times used
  - "Did you know?" tips in help center
  - Video tutorials for complex features

**Files to create**:
- client/components/Onboarding/OnboardingFlow.tsx
- client/components/Onboarding/ChecklistWidget.tsx
- client/lib/onboarding-config.ts

**Expected Result**: 70%+ day-7 retention

#### 5.2 Mobile Onboarding (Week 9)
**Impact**: Mobile user retention  
**Effort**: Medium

- [ ] **Touch-Optimized Onboarding**
  - Larger buttons and text
  - Simplified flow (3 steps instead of 5)
  - Video intro instead of text

**Files to create**:
- mobile/screens/onboarding/OnboardingFlow.tsx

---

### 🟡 MEDIUM PRIORITY - Feature Completeness

#### 6.1 R&D Labs Stabilization (Week 10)
**Impact**: Differentiation vs competitors  
**Effort**: Medium

**Current State**: Fully implemented; needs polish

- [ ] **Performance Tuning**
  - Optimize 3D rendering (WebGL culling)
  - Lazy load experiment history
  - Cache 3D models

- [ ] **UX Polish**
  - Keyboard shortcuts for 3D controls
  - Export experiment to recipe
  - Batch experiment comparison

- [ ] **Documentation**
  - In-app guide for 3D controls
  - Best practices for molecular techniques
  - Video tutorials

**Files to modify**:
- client/pages/sections/RDLabs.tsx
- client/components/RDLab/*.tsx
- RDLAB documentation

**Expected Result**: Professional R&D tool

---

## PHASE 4: MARKET LAUNCH (Weeks 11-12)

### 🔴 HIGH PRIORITY - GTM (Go-To-Market)

#### 7.1 Industry Landing Pages (Week 11)
**Impact**: SEO + conversion  
**Effort**: Medium

- [ ] **Vertical-Specific Pages**
  - `/fine-dining` - Premium positioning
  - `/bakery` - Technical features focus
  - `/catering` - Scale & efficiency focus
  - `/casual-dining` - Simplicity & cost focus

**Files to create**:
- client/pages/LandingPages/FineDiningPage.tsx
- client/pages/LandingPages/BakeryPage.tsx
- etc.

#### 7.2 Competitive Positioning (Week 11)
**Impact**: Market differentiation  
**Effort**: Low

- [ ] **Messaging Framework**
  - "Professional Recipe Intelligence" (vs commodity recipe managers)
  - "R&D Innovation Lab" (unique 3D, molecular gastronomy)
  - "Cost Control & Compliance" (AI-powered suggestions)

- [ ] **Case Studies**
  - Interview 2-3 pilot customers
  - Document results (cost savings %, time saved)
  - Create 1-page case studies

#### 7.3 Integration & Partnerships (Week 12)
**Impact**: Distribution  
**Effort**: High

- [ ] **POS Integration**
  - Toast: Recipe → menu item linking
  - Square: Cost sync
  - TouchBistro: iPad support

- [ ] **Supplier APIs**
  - Sysco: Ingredient pricing sync
  - US Foods: Catalog sync
  - Local suppliers: Spreadsheet import

**Files to create**:
- server/routes/integrations/toast.ts
- server/routes/integrations/square.ts
- server/routes/integrations/sysco.ts

---

## 📈 Success Metrics

### Performance Targets
| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Page Load | 2-3s | <1.5s | Week 4 |
| Mobile Load | 3-4s | <2s | Week 4 |
| Recipe Search | 2s | <500ms | Week 3 |
| Gallery Load | 3s | <1.5s | Week 2 |
| Lighthouse Score | 75 | 90+ | Week 4 |

### Market Expansion Targets
| Metric | Y1 Goal | Timeline |
|--------|---------|----------|
| Verticals Supported | 4 (Fine, Casual, Bakery, Catering) | Week 8 |
| Professional Users | 500+ | Month 3 |
| Bakery Users | 100+ | Month 4 |
| TAM Coverage | $5B+ | Month 6 |
| MRR Revenue | $10K | Month 6 |

### Retention & Engagement
| Metric | Target | Method |
|--------|--------|--------|
| Day-7 Retention | 70% | Onboarding flow |
| Day-30 Retention | 50% | Feature engagement |
| Feature Discovery | 80% | In-app guidance |
| Mobile Adoption | 30% | Improve mobile perf |

---

## 🎯 Weekly Breakdown

### Weeks 1-2: Image Optimization
- Mon: WebP pipeline setup
- Wed: Blur-up implementation
- Fri: Testing & optimization

### Weeks 3-4: Pagination + Caching
- Mon: Server-side pagination
- Wed: Database optimization
- Fri: Cache implementation

### Weeks 5-6: Vertical Templates + Allergens
- Mon: Fine Dining template
- Wed: Casual Dining template
- Fri: Allergen enhancement

### Weeks 7-8: Bakery + Catering
- Mon: Bakery workspace
- Wed: Catering dashboard
- Fri: Integration testing

### Weeks 9-10: Onboarding + R&D Labs
- Mon: Onboarding flow
- Wed: R&D optimization
- Fri: Documentation

### Weeks 11-12: Market Launch
- Mon: Landing pages
- Wed: Case studies
- Fri: Partnerships + integration

---

## 🚀 Estimated ROI

### Phase 1 (Performance) - ROI: Immediate
- **Cost**: 2 engineers × 4 weeks
- **Benefit**: 50% faster load times
- **Impact**: Better SEO, higher conversion (3-5% improvement)

### Phase 2 (Verticals) - ROI: High
- **Cost**: 3 engineers × 4 weeks
- **Benefit**: Enter 3 new markets
- **Impact**: 3x market size; $2-5M revenue potential

### Phase 3 (Onboarding) - ROI: Very High
- **Cost**: 2 engineers × 2 weeks
- **Benefit**: 70%+ retention
- **Impact**: Reduce churn 50%; LTV +200%

### Total 12-Week Investment
- **Resources**: 3-4 engineers
- **Duration**: 12 weeks
- **Expected Outcome**: 
  - 50% faster performance
  - 4 verticals supported
  - $10K+ MRR potential
  - Market leadership position

---

## 📋 Next Actions

1. **Confirm timeline & team size** (this week)
2. **Start Phase 1 Week 1** (image optimization)
3. **Set up performance monitoring** (Sentry, Lighthouse)
4. **Create vertical templates** (design spec)
5. **Launch landing pages** (SEO-ready)

**Ready to execute. What's the first priority?**
