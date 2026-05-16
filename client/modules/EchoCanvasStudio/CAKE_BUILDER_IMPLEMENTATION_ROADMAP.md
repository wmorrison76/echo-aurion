# Cake Builder Implementation Roadmap
**Build Order: Hardest & Most Critical First**

---

## Build Architecture (Modules for LUCCCA Integration)

```
EchoCanvas/
├── src/
│   ├── modules/
│   │   └── cakeBuilder/
│   │       ├── index.ts (exports module interface)
│   │       ├── CakeBuilderModule.tsx (main component for LUCCCA)
│   │       ├── CakeBuilderStandalone.tsx (works alone or in EchoCanvas)
│   │       ├── types/
│   │       │   ├── allergens.ts (CRITICAL)
│   │       │   ├── cakeMath.ts (CRITICAL)
│   │       │   ├── components.ts
│   │       │   └── metadata.ts
│   │       ├── services/
│   │       │   ├── allergenService.ts (CRITICAL)
│   │       │   ├── cakeMathService.ts (CRITICAL)
│   │       │   ├── generationService.ts
│   │       │   ├── metadataService.ts
│   │       │   └── templateService.ts
│   │       ├── components/
│   │       │   ├── AllergenProfile.tsx (CRITICAL)
│   │       │   ├── CakeMathCalculator.tsx (CRITICAL)
│   │       │   ├── CakeBuilder.tsx (main UI)
│   │       │   ├── ComponentGenerator.tsx
│   │       │   ├── TemplateSelector.tsx
│   │       │   ├── ChefInterface.tsx
│   │       │   ├── RotationViewer.tsx
│   │       │   ├── MetadataViewer.tsx
│   │       │   └── FloatingPanel.tsx (LUCCCA wrapper)
│   │       ├── hooks/
│   │       │   ├── useCakeBuilder.ts
│   │       │   ├── useAllergens.ts
│   │       │   └── useCakeMath.ts
│   │       └── utils/
│   │           ├── allergenUtils.ts
│   │           ├── mathUtils.ts
│   │           └── seedUtils.ts
│   └── pages/
│       ├── Editor.tsx (EchoCanvas main)
│       └── CakeBuilderPage.tsx (standalone view)
└── package.json
```

---

## BUILD ORDER: Hardest First (8 Phases)

### **PHASE 1: CRITICAL FOUNDATION** (Week 1)
**Why First**: Legal requirement, safety-critical, everything else depends on it

#### **1.1 Allergen & Food Safety System** 🔴 CRITICAL
**Files to Create**:
- `src/modules/cakeBuilder/types/allergens.ts`
- `src/modules/cakeBuilder/services/allergenService.ts`
- `src/modules/cakeBuilder/components/AllergenProfile.tsx`

**What It Does**:
```typescript
// User enters allergen info
// System validates & tracks
// Generates compliance warnings
// Stores for future reference
// Prevents cross-contamination

interface CakeAllergenData {
  contains: { nuts: boolean; dairy: boolean; ... };
  certifications: { glutenFree: boolean; ... };
  warnings: string[];
}
```

**Output**: 
- Type definitions (allergens.ts)
- Service layer (allergenService.ts)
- React component (AllergenProfile.tsx)

---

#### **1.2 Cake Mathematics Engine** 🔴 CRITICAL
**Files to Create**:
- `src/modules/cakeBuilder/types/cakeMath.ts`
- `src/modules/cakeBuilder/services/cakeMathService.ts`
- `src/modules/cakeBuilder/components/CakeMathCalculator.tsx`

**What It Does**:
```typescript
// Input: Guest count (50 people)
// Output: 
// - Recommended cake sizes (10" + 8" round OR full sheet + half sheet)
// - Servings per tier
// - Structural support specs (dowel count, placement, length)
// - Weight distribution calculations
// - Frosting needed (oz)
// - Baking time/cooling time

// Everything geometry-based & mathematically sound
```

**Output**:
- Type definitions (cakeMath.ts)
- Service with all formulas (cakeMathService.ts)
- Calculator UI component (CakeMathCalculator.tsx)

---

#### **1.3 Module Export Interface** (for LUCCCA)
**File to Create**:
- `src/modules/cakeBuilder/index.ts`

**What It Does**:
```typescript
export const CakeBuilderModule = {
  name: "Cake Builder",
  description: "AI-powered professional cake design",
  version: "1.0.0",
  icon: "🎂",
  component: CakeBuilderModule,
  permissions: ["orders", "kitchen", "gallery"],
  metadata: {
    floatingPanel: {
      defaultWidth: "90vw",
      defaultHeight: "90vh",
      resizable: true,
      closeable: true
    },
    requiredServices: ["ai", "database", "storage"]
  }
}
```

**Output**: Module interface that LUCCCA can lazy-load

---

### **PHASE 2: CAKE STRUCTURE & COMPOSITION** (Week 2)
**Why Second**: Core feature, builds on math foundation

#### **2.1 Component Types & Interface**
**Files to Create**:
- `src/modules/cakeBuilder/types/components.ts`

**What It Does**:
```typescript
interface CakeComponent {
  id: string;
  type: "base-layer" | "middle-layer" | "top-layer" | "frosting" | "decoration";
  diameter?: number;
  flavor: string;
  color: string;
  seed: string; // For reproducibility
  imageUrl: string;
}
```

---

#### **2.2 Component Generation Service**
**Files to Create**:
- `src/modules/cakeBuilder/services/generationService.ts`

**What It Does**:
- Generate individual cake layers from specifications
- Use seeds for reproducibility
- Call AI generator with layer-specific prompts
- Cache generated images

---

#### **2.3 Template System**
**Files to Create**:
- `src/modules/cakeBuilder/types/templates.ts`
- `src/modules/cakeBuilder/services/templateService.ts`
- `src/modules/cakeBuilder/components/TemplateSelector.tsx`

**What It Does**:
```typescript
// Pre-built templates:
// - "Classic Wedding" (12"+10"+8" with roses)
// - "Modern Minimalist" (same size tiers, gold accents)
// - "Floral Garden" (colorful, many decorations)
// etc.

// Customer selects → auto-calculates math → customizes colors
```

---

### **PHASE 3: METADATA & REPRODUCIBILITY** (Week 3)
**Why Third**: Enables gallery & reordering

#### **3.1 Metadata Types**
**Files to Create**:
- `src/modules/cakeBuilder/types/metadata.ts`

**What It Does**:
```typescript
interface EmbeddedCakeMetadata {
  cakeId: string;
  masterSeed: string;
  structure: { tiers: [...], servings: number };
  frosting: { type: string; color: string; pattern: string };
  supportStructure: { dowelCount: number; ... };
  allergens: CakeAllergenData;
  cost: { materials: number; labor: number; total: number };
}
```

---

#### **3.2 Metadata Service**
**Files to Create**:
- `src/modules/cakeBuilder/services/metadataService.ts`

**What It Does**:
- Embed metadata in image files (PNG EXIF, sidecar JSON)
- Extract metadata from saved cakes
- Validate metadata integrity
- Version control metadata

---

### **PHASE 4: USER INTERFACE - CHEF WORKFLOW** (Week 4)
**Why Fourth**: Core interface for bakers

#### **4.1 Chef Interface Component**
**Files to Create**:
- `src/modules/cakeBuilder/components/ChefInterface.tsx`

**What It Does**:
```
Step 1: Review Order
  ├─ Guest count, date, dietary, style
  └─ Auto-calculate size & structure

Step 2: Quick Preview
  ├─ Generate 2-3 second preview
  └─ Show math calculations

Step 3: Detailed Version
  ├─ Generate detailed image (10-15 sec)
  └─ Show frosting texture detail

Step 4: 360° Rotation
  ├─ Generate 8 angles
  └─ Interactive viewer

Step 5: Approve with Client
  ├─ Share link
  └─ Get approval

Step 6: Assign to Baker
  ├─ Select baker
  └─ Print instructions
```

---

#### **4.2 Quality Control Documentation**
**Files to Create**:
- `src/modules/cakeBuilder/components/QualityControl.tsx`
- `src/modules/cakeBuilder/services/qualityService.ts`

**What It Does**:
- Photo documentation (before/after delivery)
- Quality metrics (frosting smoothness, structure, etc.)
- Compare design vs reality
- Feedback loop for improvement

---

### **PHASE 5: 3D VISUALIZATION** (Week 5)
**Why Fifth**: Premium feature, improves customer experience

#### **5.1 360° Rotation Viewer**
**Files to Create**:
- `src/modules/cakeBuilder/components/RotationViewer.tsx`
- `src/modules/cakeBuilder/services/rotationService.ts`

**What It Does**:
- Display 8-angle cake images
- Interactive drag-to-rotate
- Preset angle buttons (Front, Right, Back, Left)
- Touch-optimized mobile support

---

### **PHASE 6: GALLERY & REORDERING** (Week 6)
**Why Sixth**: Drives repeat business

#### **6.1 Gallery Component**
**Files to Create**:
- `src/modules/cakeBuilder/components/Gallery.tsx`
- `src/modules/cakeBuilder/services/galleryService.ts`

**What It Does**:
- Show all previous cakes
- Customer can select "Make this cake again"
- Load metadata automatically
- Allow modifications (colors, decorations)
- Regenerate with changes

---

### **PHASE 7: FINANCIAL & OPERATIONAL** (Week 7)
**Why Seventh**: Business critical but not as time-sensitive

#### **7.1 Costing Engine**
**Files to Create**:
- `src/modules/cakeBuilder/services/costingService.ts`
- `src/modules/cakeBuilder/components/CostBreakdown.tsx`

**What It Does**:
- Calculate material costs (per-serving)
- Calculate labor costs (by complexity)
- Suggest markup pricing
- Track profitability

---

#### **7.2 Staffing & Scheduling**
**Files to Create**:
- `src/modules/cakeBuilder/services/schedulingService.ts`
- `src/modules/cakeBuilder/components/ProductionSchedule.tsx`

**What It Does**:
- Auto-assign to available baker
- Build production timeline
- Resource planning (ovens, fridge space)
- Integration with LUCCCA calendar

---

### **PHASE 8: ADVANCED FEATURES** (Week 8)
**Why Eighth**: Nice-to-have, can be added later

- Real-time Chef-Customer collaboration
- Offline support (mobile kitchen)
- Regional variations
- Supply chain tracking
- Analytics & learning system

---

## File Creation Checklist

### Phase 1 (Critical Foundation)
- [ ] `src/modules/cakeBuilder/types/allergens.ts` (150 lines)
- [ ] `src/modules/cakeBuilder/services/allergenService.ts` (200 lines)
- [ ] `src/modules/cakeBuilder/components/AllergenProfile.tsx` (300 lines)
- [ ] `src/modules/cakeBuilder/types/cakeMath.ts` (200 lines)
- [ ] `src/modules/cakeBuilder/services/cakeMathService.ts` (400 lines)
- [ ] `src/modules/cakeBuilder/components/CakeMathCalculator.tsx` (350 lines)
- [ ] `src/modules/cakeBuilder/index.ts` (50 lines - module export)

**Total**: ~1,650 lines for foundation

### Phase 2 (Composition)
- [ ] `src/modules/cakeBuilder/types/components.ts` (150 lines)
- [ ] `src/modules/cakeBuilder/services/generationService.ts` (300 lines)
- [ ] `src/modules/cakeBuilder/types/templates.ts` (200 lines)
- [ ] `src/modules/cakeBuilder/services/templateService.ts` (300 lines)
- [ ] `src/modules/cakeBuilder/components/TemplateSelector.tsx` (250 lines)

**Total**: ~1,200 lines for composition

### Phase 3 (Metadata)
- [ ] `src/modules/cakeBuilder/types/metadata.ts` (300 lines)
- [ ] `src/modules/cakeBuilder/services/metadataService.ts` (400 lines)

**Total**: ~700 lines for metadata

### Phase 4 (Chef UI)
- [ ] `src/modules/cakeBuilder/components/ChefInterface.tsx` (500 lines)
- [ ] `src/modules/cakeBuilder/components/QualityControl.tsx` (300 lines)
- [ ] `src/modules/cakeBuilder/services/qualityService.ts` (250 lines)

**Total**: ~1,050 lines for chef interface

### Phase 5 (3D)
- [ ] `src/modules/cakeBuilder/components/RotationViewer.tsx` (400 lines)
- [ ] `src/modules/cakeBuilder/services/rotationService.ts` (200 lines)

**Total**: ~600 lines for rotation

### Phase 6 (Gallery)
- [ ] `src/modules/cakeBuilder/components/Gallery.tsx` (300 lines)
- [ ] `src/modules/cakeBuilder/services/galleryService.ts` (250 lines)

**Total**: ~550 lines for gallery

### Phase 7 (Financial)
- [ ] `src/modules/cakeBuilder/services/costingService.ts` (300 lines)
- [ ] `src/modules/cakeBuilder/components/CostBreakdown.tsx` (250 lines)
- [ ] `src/modules/cakeBuilder/services/schedulingService.ts` (300 lines)
- [ ] `src/modules/cakeBuilder/components/ProductionSchedule.tsx` (250 lines)

**Total**: ~1,100 lines for financial

### Phase 8 (Advanced)
- [ ] Additional features as needed

---

## GRAND TOTAL: ~6,850 lines of production code

**Timeline**: 8 weeks of focused development

---

## Integration Points

### With EchoCanvas:
```typescript
// In Editor.tsx
import { CakeBuilderModule } from '../modules/cakeBuilder'

// Use as panel in right sidebar
<RightPanel>
  <CakeBuilderPanel />
</RightPanel>
```

### With LUCCCA:
```typescript
// LUCCCA lazy-loads from EchoCanvas
const CakeBuilder = lazy(() => import('echocanvas/modules/cakeBuilder'))

// Click sidebar → opens floating panel
<FloatingPanel>
  <CakeBuilder />
</FloatingPanel>
```

---

## Progress Tracking

As we build, we'll mark completion:
- ✅ Phase 1 (Allergen + Math): Foundation complete
- ⏳ Phase 2 (Composition): In progress
- ⏳ Phase 3 (Metadata): Pending
- ... etc

---

## Next Steps

1. **Create directory structure** for `src/modules/cakeBuilder/`
2. **Start Phase 1**: Build allergen & food safety system
3. **Then Phase 2**: Component types and generation
4. **Continue through Phase 8**

Each phase builds on the previous, so we complete them in order for maximum efficiency.

---

**Ready to start?** 

Please unzip and upload the cake_builder.zip contents, and I'll:
1. Integrate the 50% completed components
2. Build the missing 50%
3. Wire everything together
4. Make it work in both EchoCanvas and LUCCCA

