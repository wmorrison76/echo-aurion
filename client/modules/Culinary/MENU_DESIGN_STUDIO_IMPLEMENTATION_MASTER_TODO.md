# Menu Design Studio - Master Implementation Todo
## Production-Ready Builds (Largest First, No Stubs)

**Status**: Ready for implementation  
**Owner**: William Morrison + AI Developer  
**Total Effort**: 668 hours (estimated)  
**Timeline**: Sequential implementation, checked off as complete

---

# MASTER TODO LIST (Prioritized by Effort)

## ⭐ BUILD 1: LAYOUT REDESIGN & REFACTORING
**Priority**: P0 (Blocks all other work)  
**Effort**: 144 hours  
**Timeline**: ~3-4 weeks (full-time)  
**Status**: 🔴 NOT STARTED

### Task 1.1: Extract State Management Hooks
**Effort**: 40 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/hooks/useDesignerState.ts`
- `client/components/MenuDesignStudio/hooks/useCanvasOperations.ts`
- `client/components/MenuDesignStudio/hooks/useHistory.ts`
- `client/components/MenuDesignStudio/hooks/useKeyboardShortcuts.ts`
- `client/components/MenuDesignStudio/hooks/useAutoSave.ts`

**Acceptance Criteria**:
- [ ] All state centralized in hooks (no prop drilling)
- [ ] DesignerState reducer fully implemented
- [ ] Undo/redo working for all operations
- [ ] Keyboard shortcuts functional (Cmd+Z, Cmd+D, etc.)
- [ ] Auto-save to localStorage every 30 seconds
- [ ] All tests pass (>80% coverage)
- [ ] No regression in existing functionality
- [ ] Zero console errors

---

### Task 1.2: Create New Component Architecture
**Effort**: 48 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/MenuDesignStudio.tsx` (refactored, <500 lines)
- `client/components/MenuDesignStudio/layout/TopToolbar.tsx`
- `client/components/MenuDesignStudio/layout/ToolSidebar.tsx`
- `client/components/MenuDesignStudio/layout/StatusBar.tsx`
- `client/components/MenuDesignStudio/canvas/DesignerCanvas.tsx` (refactored)
- `client/components/MenuDesignStudio/canvas/CanvasElement.tsx`
- `client/components/MenuDesignStudio/canvas/ElementSelector.tsx`
- `client/components/MenuDesignStudio/canvas/Grid.tsx`
- `client/components/MenuDesignStudio/panels/LayersPanel.tsx`
- `client/components/MenuDesignStudio/panels/InspectorPanel.tsx`

**Acceptance Criteria**:
- [ ] Main file <500 lines (was 3,700+)
- [ ] Each component <300 lines
- [ ] All components reusable and testable
- [ ] Props properly typed with TypeScript
- [ ] Error boundaries implemented
- [ ] Performance optimized (memoization where needed)
- [ ] No visual regression from current design
- [ ] Canvas still renders all elements correctly
- [ ] Zero console errors

---

### Task 1.3: Implement Top Toolbar (Menu Bar)
**Effort**: 32 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/toolbar/TopToolbar.tsx` (main container)
- `client/components/MenuDesignStudio/toolbar/MenuBar.tsx`
- `client/components/MenuDesignStudio/toolbar/FileMenu.tsx`
- `client/components/MenuDesignStudio/toolbar/EditMenu.tsx`
- `client/components/MenuDesignStudio/toolbar/ViewMenu.tsx`
- `client/components/MenuDesignStudio/toolbar/InsertMenu.tsx`
- `client/components/MenuDesignStudio/toolbar/FormatMenu.tsx`
- `client/components/MenuDesignStudio/toolbar/ExportMenu.tsx`
- `client/components/MenuDesignStudio/toolbar/QuickControls.tsx`

**Acceptance Criteria**:
- [ ] Top toolbar at 60px height
- [ ] Document name editable (auto-saves)
- [ ] All menu sections visible and organized
- [ ] Menu icons professional and consistent
- [ ] Hover/active states clearly indicated
- [ ] Professional SaaS appearance (no "homemade" feel)
- [ ] Dark mode fully functional
- [ ] Glassmorphism effects applied
- [ ] Responsive (collapse menus on small screens)
- [ ] Keyboard accessible (Tab navigation works)
- [ ] No toolbar obscures canvas

---

### Task 1.4: Refactor Inspector Panel (Collapsible)
**Effort**: 32 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/panels/InspectorPanel.tsx` (main)
- `client/components/MenuDesignStudio/panels/sections/PositionAndSizeSection.tsx`
- `client/components/MenuDesignStudio/panels/sections/FillAndStrokeSection.tsx`
- `client/components/MenuDesignStudio/panels/sections/EffectsSection.tsx`
- `client/components/MenuDesignStudio/panels/sections/TypographySection.tsx`
- `client/components/MenuDesignStudio/panels/sections/ImageEditorSection.tsx`
- `client/components/MenuDesignStudio/panels/sections/CanvasSettingsSection.tsx`

**Acceptance Criteria**:
- [ ] Slides in from right without blocking canvas
- [ ] Smooth 200ms animation
- [ ] All sections work identically to floating panel
- [ ] Collapse/expand animation smooth (60fps)
- [ ] Dark mode styling correct
- [ ] Keyboard shortcut (Cmd+I) works
- [ ] Zero console errors
- [ ] All form inputs responsive
- [ ] Color picker working
- [ ] Font selector with 50+ fonts loaded

---

### Task 1.5: Refactor Layers Panel (Collapsible)
**Effort**: 24 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/panels/LayersPanel.tsx` (main)
- `client/components/MenuDesignStudio/panels/LayerItem.tsx`
- `client/components/MenuDesignStudio/panels/LayerGroup.tsx`

**Acceptance Criteria**:
- [ ] Slides in from right without blocking canvas
- [ ] Smooth 200ms animation
- [ ] Layer search/filter functional
- [ ] Group/ungroup UI present
- [ ] Lock/unlock/visibility toggles work
- [ ] Drag-to-reorder implemented (optional)
- [ ] Dark mode styling correct
- [ ] Keyboard shortcut (Cmd+L) works
- [ ] Displays all elements correctly
- [ ] Layer names editable

---

## ⭐ BUILD 2: PROFESSIONAL PRINT & EXPORT
**Priority**: P0 (Competitive requirement)  
**Effort**: 80 hours  
**Timeline**: ~2 weeks  
**Depends on**: Build 1 (layout done)

### Task 2.1: PDF/X-1a Print-Ready Export
**Effort**: 32 hours  
**Files to Create/Modify**:
- `client/components/MenuDesignStudio/export/PDFExporter.ts`
- `client/components/MenuDesignStudio/dialogs/ExportDialog.tsx`
- `client/components/MenuDesignStudio/dialogs/PrintPreflightChecklist.tsx`

**Acceptance Criteria**:
- [ ] Exports to PDF/X-1a format (not just PDF)
- [ ] CMYK color space supported
- [ ] Flatten all layers option
- [ ] Bleed and trim marks included
- [ ] 300 DPI for print
- [ ] Validation before export (all checks pass)
- [ ] File names customizable
- [ ] Downloads work reliably
- [ ] No data loss in conversion
- [ ] Professional quality output (passes printer requirements)

---

### Task 2.2: CMYK Color Support
**Effort**: 20 hours  
**Files to Create/Modify**:
- `client/components/MenuDesignStudio/ui/ColorPicker.tsx` (enhanced)
- `client/lib/color-utils.ts` (new file)

**Acceptance Criteria**:
- [ ] RGB/Hex/CMYK toggle in color picker
- [ ] CMYK conversion algorithm accurate
- [ ] Color values display correctly
- [ ] Brand palette supports CMYK
- [ ] CMYK exports correctly in PDFs
- [ ] No color shift between RGB and CMYK
- [ ] All existing colors still work
- [ ] Dark mode color picker functional

---

### Task 2.3: Multi-Output Export (Menu → Poster → Table Tent)
**Effort**: 28 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/export/MultiOutputExporter.ts`
- `client/components/MenuDesignStudio/dialogs/MultiOutputExportDialog.tsx`

**Acceptance Criteria**:
- [ ] Auto-generates 5 formats from one design:
  - [ ] Full Menu (8.5" × 11")
  - [ ] Table Tent (3.5" × 5.5" folded)
  - [ ] Poster (11" × 17")
  - [ ] Instagram (1080 × 1080px)
  - [ ] Email Header (600px wide)
- [ ] Elements auto-rearrange per format
- [ ] Maintains design intent
- [ ] Batch download as ZIP
- [ ] File names appropriate
- [ ] No data loss
- [ ] All formats export correctly

---

## ⭐ BUILD 3: LUCCCA INTEGRATION (Recipes & Data)
**Priority**: P0 (Differentiator vs. Canva)  
**Effort**: 72 hours  
**Timeline**: ~2 weeks  
**Depends on**: Build 1 (UI architecture done)

### Task 3.1: Price Auto-Sync from EchoRecipePro
**Effort**: 16 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/hooks/useRecipePrice.ts`
- `client/components/MenuDesignStudio/dialogs/InsertDishDialog.tsx`

**Acceptance Criteria**:
- [ ] Fetches price from EchoRecipePro API
- [ ] Real-time updates when recipe changes
- [ ] Currency formatting correct
- [ ] Manual override possible (user can edit)
- [ ] Efficient caching (no API spam)
- [ ] Fallback if API down
- [ ] Zero console errors
- [ ] Works with all currencies

---

### Task 3.2: Allergen Icons & Auto-Insert
**Effort**: 12 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/hooks/useRecipeAllergens.ts`
- `client/components/MenuDesignStudio/assets/allergen-icons.tsx`
- `client/components/MenuDesignStudio/dialogs/AllergenInsertDialog.tsx`

**Acceptance Criteria**:
- [ ] Icon library complete (8+ allergens)
- [ ] Professional icon design
- [ ] Auto-detect from recipe allergens
- [ ] Insert individually or all at once
- [ ] Icons position correctly next to price/name
- [ ] Auto-sizing to element size
- [ ] Works in dark mode
- [ ] Zero console errors

---

### Task 3.3: Dish Description Auto-Pull
**Effort**: 8 hours  
**Files to Create/Modify**:
- `client/components/MenuDesignStudio/hooks/useRecipeDescription.ts`

**Acceptance Criteria**:
- [ ] Fetches description from EchoRecipePro
- [ ] Real-time updates
- [ ] Character limit warnings for menu fit
- [ ] Optional ingredients list display
- [ ] Truncation works and looks good
- [ ] Falls back if API unavailable
- [ ] No console errors

---

### Task 3.4: Category Auto-Layout (Appetizers, Entrées, etc.)
**Effort**: 20 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/hooks/useRecipeCategories.ts`
- `client/components/MenuDesignStudio/layout/CategoryAutoLayout.tsx`
- `client/components/MenuDesignStudio/ai/SpacingBalancer.ts`

**Acceptance Criteria**:
- [ ] Fetches dishes by category from EchoRecipePro
- [ ] Auto-arranges with section headers
- [ ] AI-powered spacing balancer
- [ ] Prevents orphan lines
- [ ] Manual override works
- [ ] Reorder items possible
- [ ] Move between categories possible
- [ ] No overlapping text
- [ ] Professional layout

---

### Task 3.5: Recipe Search & Insert Dialog
**Effort**: 16 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/dialogs/RecipeSearchDialog.tsx`

**Acceptance Criteria**:
- [ ] Search recipes by name
- [ ] Select recipe from results
- [ ] Auto-populate name, price, description, allergens
- [ ] Insert as menu item element
- [ ] Link to original recipe (for updates)
- [ ] Display recipe image if available
- [ ] Works with all recipe types
- [ ] No console errors

---

## ⭐ BUILD 4: ADVANCED DESIGN FEATURES
**Priority**: P1 (Competitive advantage)  
**Effort**: 120 hours  
**Timeline**: ~3 weeks  
**Depends on**: Build 1 (layout done)

### Task 4.1: Smart Guides & Snap-to-Grid
**Effort**: 24 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/canvas/SmartGuides.tsx`
- `client/lib/guide-utils.ts`

**Acceptance Criteria**:
- [ ] Visual alignment lines show when dragging
- [ ] Show distance between elements
- [ ] Show alignment with canvas edges
- [ ] Snap distance configurable
- [ ] Smart guides appear at correct positions
- [ ] Snapping smooth and predictable
- [ ] Guides don't interfere with other features
- [ ] Works with zoom
- [ ] Performance optimized

---

### Task 4.2: Image Editing Tools (Crop, Filters, Masks)
**Effort**: 40 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/tools/CropTool.tsx`
- `client/components/MenuDesignStudio/tools/FilterPanel.tsx`
- `client/components/MenuDesignStudio/tools/MaskTool.tsx`

**Acceptance Criteria**:
- [ ] Crop tool with visual region selection
- [ ] Aspect ratio lock option
- [ ] Brightness, contrast, saturation controls
- [ ] Hue rotation, blur, grayscale, sepia filters
- [ ] Shape masks (circle, rounded rect, polygon)
- [ ] Feathering for masks
- [ ] Real-time preview
- [ ] Undo/redo works
- [ ] No performance degradation
- [ ] Professional quality output

---

### Task 4.3: Typography System (Fonts, Presets, Pairing)
**Effort**: 32 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/ui/FontSelector.tsx` (enhanced)
- `client/components/MenuDesignStudio/ui/TypographyPresets.tsx`
- `client/lib/font-pairing.ts`

**Acceptance Criteria**:
- [ ] 50+ Google Fonts available
- [ ] Custom font upload
- [ ] Font preview in dropdown
- [ ] Heading 1, Heading 2, Body, Caption presets
- [ ] Save custom presets
- [ ] Font pairing suggestions (curated for menus)
- [ ] Kerning, tracking, all spacing controls
- [ ] Apply preset to selected text
- [ ] All fonts load without lag
- [ ] Dark mode font colors correct

---

### Task 4.4: Brand Palette Manager
**Effort**: 20 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/panels/BrandPaletteManager.tsx`
- `client/lib/brand-utils.ts`

**Acceptance Criteria**:
- [ ] Save up to 10 custom colors
- [ ] Named swatches (Primary, Secondary, etc.)
- [ ] Save/load palettes
- [ ] Color accessibility checker (contrast ratio warnings)
- [ ] Apply palette to entire design (one-click)
- [ ] Theme application without data loss
- [ ] All colors update automatically
- [ ] Dark mode palette support

---

### Task 4.5: Color Correction & Filters
**Effort**: 24 hours  
**Files to Create**:
- `client/lib/image-filters.ts`
- `client/components/MenuDesignStudio/tools/ImageFilterTool.tsx`

**Acceptance Criteria**:
- [ ] Brightness, contrast, saturation controls
- [ ] Exposure, highlights, shadows
- [ ] Temperature (warm/cool)
- [ ] Blur, grayscale, sepia
- [ ] Real-time preview
- [ ] Slider controls responsive
- [ ] Undo/redo works
- [ ] No performance loss
- [ ] Export preserves filters

---

## ⭐ BUILD 5: MENU-SPECIFIC INTELLIGENCE
**Priority**: P1 (Unique differentiator)  
**Effort**: 96 hours  
**Timeline**: ~2.5 weeks  
**Depends on**: Build 1, 3, 4

### Task 5.1: Alignment & Distribution Tools
**Effort**: 16 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/toolbar/AlignmentTools.tsx`
- `client/lib/alignment-utils.ts`

**Acceptance Criteria**:
- [ ] Align left, center, right
- [ ] Align top, center, bottom
- [ ] Distribute horizontally, vertically
- [ ] Works on multiple selections
- [ ] Buttons in toolbar menu
- [ ] Keyboard shortcuts (Cmd+[])
- [ ] Visual feedback
- [ ] Performance on many elements

---

### Task 5.2: Menu Item Intelligence (Price Columns)
**Effort**: 24 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/elements/PriceColumnElement.tsx`
- `client/lib/menu-layout-utils.ts`

**Acceptance Criteria**:
- [ ] Auto-formatted price columns
- [ ] Dollar sign formatting
- [ ] Decimal places correct
- [ ] Price right-aligned
- [ ] Dot leaders optional
- [ ] Currency symbols customizable
- [ ] Updates from recipe price
- [ ] All price types supported
- [ ] Scales with text size

---

### Task 5.3: Menu Spacing Balancer (AI-powered)
**Effort**: 32 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/ai/MenuSpacingBalancer.ts`
- `client/components/MenuDesignStudio/panels/SpacingBalancerPanel.tsx`

**Acceptance Criteria**:
- [ ] Analyzes text height per item
- [ ] Adjusts spacing to balance menu
- [ ] Prevents orphan lines
- [ ] Suggests optimal line spacing
- [ ] One-click application
- [ ] Manual adjustment possible
- [ ] Works with all menu layouts
- [ ] No collisions
- [ ] Professional appearance

---

### Task 5.4: Photo-to-Menu Mapping
**Effort**: 20 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/features/PhotoToMenuMapping.tsx`
- `client/lib/menu-photo-utils.ts`

**Acceptance Criteria**:
- [ ] Select menu item → highlights associated photos
- [ ] Photo library shows matching images
- [ ] Drag photo to menu item
- [ ] Auto-link photos to dishes
- [ ] Browse dishes by photo
- [ ] Visual connection between photo and text
- [ ] Works with all image types

---

### Task 5.5: Multi-Page Document Support
**Effort**: 24 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/pages/PageManager.tsx`
- `client/components/MenuDesignStudio/pages/PageNavigation.tsx`
- `client/lib/page-management.ts`

**Acceptance Criteria**:
- [ ] Create multiple pages (front/back, table tent sides, etc.)
- [ ] Auto-sync repeated elements (logo, footer)
- [ ] Page naming (Page 1, Table Tent Side A, etc.)
- [ ] Navigate between pages
- [ ] Copy page layouts
- [ ] Auto-sync option for headers/footers
- [ ] All pages export correctly
- [ ] No data loss between pages

---

## ⭐ BUILD 6: TEMPLATES & ASSET LIBRARY
**Priority**: P2 (Speed to value)  
**Effort**: 88 hours  
**Timeline**: ~2 weeks  
**Depends on**: Build 1

### Task 6.1: Expand Template Library
**Effort**: 32 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/templates/TemplateLibrary.tsx`
- `client/data/menu-templates.ts` (expand)
- `client/components/MenuDesignStudio/templates/TemplatePicker.tsx`

**Acceptance Criteria**:
- [ ] 20+ professional templates
  - [ ] Full menus (5+ styles)
  - [ ] Table tents (5+ styles)
  - [ ] Posters (5+ styles)
  - [ ] Seasonal (5+ templates)
  - [ ] Food photography layouts (5+)
- [ ] Preview before applying
- [ ] All templates production-ready
- [ ] Apply to existing design
- [ ] Customize applied template
- [ ] Save as custom template

---

### Task 6.2: Stock Photo Integration (Unsplash/Pexels)
**Effort**: 20 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/dialogs/StockPhotoDialog.tsx`
- `client/lib/stock-photo-service.ts`

**Acceptance Criteria**:
- [ ] Search food/restaurant photos
- [ ] Insert directly into design
- [ ] Attribution automatic
- [ ] Preview available
- [ ] Download/insert one-click
- [ ] No API key exposure
- [ ] Caching for performance
- [ ] Error handling if service down

---

### Task 6.3: Icon Library (Food + Allergen Icons)
**Effort**: 24 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/elements/IconElement.tsx`
- `client/data/icon-library.ts`
- `client/components/MenuDesignStudio/dialogs/IconPickerDialog.tsx`

**Acceptance Criteria**:
- [ ] 50+ food icons
- [ ] 8+ allergen icons
- [ ] Customizable size
- [ ] Color customizable
- [ ] Professional design
- [ ] Insert into design
- [ ] All icons SVG (scalable)
- [ ] Search by name

---

### Task 6.4: Asset Manager (Upload, Organize, Search)
**Effort**: 24 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/panels/AssetManager.tsx`
- `client/lib/asset-management.ts`

**Acceptance Criteria**:
- [ ] Upload photos to library
- [ ] Organize by folder
- [ ] Tag assets
- [ ] Search by name/tag
- [ ] Preview thumbnails
- [ ] Drag-drop into canvas
- [ ] Delete unused assets
- [ ] Auto-generate thumbnails
- [ ] No storage limits enforced (cloud-ready)

---

## ⭐ BUILD 7: DESIGN SYSTEM & UI/UX POLISH
**Priority**: P2 (Professional appearance)  
**Effort**: 104 hours  
**Timeline**: ~2.5 weeks  
**Depends on**: Build 1 (baseline)

### Task 7.1: Tailwind Design Tokens Implementation
**Effort**: 20 hours  
**Files to Create/Modify**:
- `tailwind.config.ts` (update with all tokens)
- `client/styles/design-tokens.css`

**Acceptance Criteria**:
- [ ] All colors applied (Cyan, Emerald, Grayscale, Semantics)
- [ ] Typography scale applied (Display → Tiny)
- [ ] Spacing system (xs → 4xl)
- [ ] Shadow/elevation system (4 levels)
- [ ] Border radius consistent
- [ ] All components use tokens
- [ ] No hardcoded colors
- [ ] Dark mode fully functional
- [ ] Contrast ratios verified (WCAG AA)

---

### Task 7.2: Glassmorphism & Modern Effects
**Effort**: 16 hours  
**Files to Create**:
- `client/styles/glassmorphism.css`

**Acceptance Criteria**:
- [ ] Glass cards implemented
- [ ] Backdrop blur applied
- [ ] Smooth transitions (150ms)
- [ ] Hover effects professional
- [ ] Focus indicators visible (2px cyan)
- [ ] Loading states with spinner
- [ ] No jarring transitions
- [ ] Performance optimized (no lag)

---

### Task 7.3: Dark Mode Complete Implementation
**Effort**: 20 hours  
**Depends on**: 7.1, 7.2

**Acceptance Criteria**:
- [ ] All components have dark variants
- [ ] No white text on white
- [ ] Proper contrast ratios
- [ ] Colors appropriate for dark theme
- [ ] Backgrounds (Gray-950) correct
- [ ] Toggle switch functional
- [ ] Persists across sessions
- [ ] No console errors in dark mode

---

### Task 7.4: Animations & Transitions
**Effort**: 24 hours  
**Files to Create**:
- `client/styles/animations.css`

**Acceptance Criteria**:
- [ ] 150ms default transition
- [ ] 200ms for slide-in (panels)
- [ ] Zoom effect on selection
- [ ] Fade-in for loading
- [ ] 60+ FPS all animations
- [ ] No jank on low-end devices
- [ ] Smooth ease-out function
- [ ] Respects prefers-reduced-motion

---

### Task 7.5: Accessibility (A11y) Implementation
**Effort**: 20 hours  
**Depends on**: All UI components

**Acceptance Criteria**:
- [ ] WCAG 2.1 Level AA compliance
- [ ] Keyboard navigation complete (Tab, Shift+Tab)
- [ ] All buttons have aria-labels
- [ ] Form inputs have labels
- [ ] Focus indicators visible (always)
- [ ] Screen reader compatible
- [ ] Color not only indicator
- [ ] Test with NVDA/JAWS
- [ ] Test with VoiceOver
- [ ] All interactive elements accessible

---

### Task 7.6: Responsive Design
**Effort**: 24 hours  
**Depends on**: All components

**Acceptance Criteria**:
- [ ] Desktop (1920px+) fully featured
- [ ] Tablet (768px) menus collapse
- [ ] Mobile (375px) essential features only
- [ ] Touch targets ≥48px
- [ ] No horizontal scroll
- [ ] Canvas resizes appropriately
- [ ] Menus adapt for small screens
- [ ] Mobile-optimized toolbar

---

## ⭐ BUILD 8: TESTING & QUALITY ASSURANCE
**Priority**: P1 (Production readiness)  
**Effort**: 80 hours  
**Timeline**: ~2 weeks (parallel with other builds)

### Task 8.1: Unit Tests (All Components & Hooks)
**Effort**: 40 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/**/__tests__/*.test.tsx`
- `client/components/MenuDesignStudio/hooks/__tests__/*.test.ts`

**Acceptance Criteria**:
- [ ] >80% code coverage
- [ ] All hooks tested
- [ ] All components tested
- [ ] All utils tested
- [ ] Edge cases covered
- [ ] Tests pass reliably
- [ ] Fast test execution (<5s)
- [ ] No flaky tests

---

### Task 8.2: Integration Tests (E2E Workflows)
**Effort**: 24 hours  
**Files to Create**:
- `e2e/menu-design-studio.spec.ts` (Playwright)

**Acceptance Criteria**:
- [ ] Create design workflow
- [ ] Edit elements workflow
- [ ] Save/load workflow
- [ ] Export PDF/SVG workflow
- [ ] Multi-page workflow
- [ ] Recipe integration workflow
- [ ] All tests pass
- [ ] Fast execution (<30s per test)

---

### Task 8.3: Performance & Load Testing
**Effort**: 16 hours  
**Files to Create**:
- `client/components/MenuDesignStudio/__tests__/performance.test.tsx`

**Acceptance Criteria**:
- [ ] 100+ elements on canvas smoothly
- [ ] Large image handling
- [ ] Zoom performance (60+ FPS)
- [ ] Memory usage reasonable
- [ ] Export time <5 seconds
- [ ] No memory leaks
- [ ] Lighthouse score >90

---

## ⭐ BUILD 9: DOCUMENTATION & DEPLOYMENT
**Priority**: P2 (Final touches)  
**Effort**: 52 hours  
**Timeline**: ~1 week

### Task 9.1: Code Documentation
**Effort**: 12 hours  
**Files to Create**:
- `docs/MENU_DESIGN_STUDIO.md` (User guide)
- `docs/ARCHITECTURE.md` (Technical guide)
- `docs/API.md` (Component & hook APIs)

**Acceptance Criteria**:
- [ ] All components documented
- [ ] All hooks documented
- [ ] Usage examples provided
- [ ] Props documented
- [ ] Return types documented
- [ ] Edge cases documented

---

### Task 9.2: User Documentation & Tutorials
**Effort**: 20 hours  
**Files to Create**:
- Video tutorials (5-8 videos, 2-5 min each)
- FAQ document
- Keyboard shortcuts cheat sheet

**Acceptance Criteria**:
- [ ] "Getting Started" video (5 min)
- [ ] "Create First Menu" tutorial (5 min)
- [ ] "Export & Print" tutorial (3 min)
- [ ] "Advanced Features" tutorial (5 min)
- [ ] FAQ covers common issues
- [ ] Shortcuts printable

---

### Task 9.3: Deployment & Final QA
**Effort**: 20 hours  
**Files to Create**:
- `scripts/pre-deploy-checklist.ts`
- `.github/workflows/deploy.yml` (update)

**Acceptance Criteria**:
- [ ] All tests pass
- [ ] No console errors
- [ ] Lighthouse >90 all pages
- [ ] Performance targets met
- [ ] Accessibility verified
- [ ] All browsers tested (Chrome, Firefox, Safari, Edge)
- [ ] Mobile tested
- [ ] Staging deployment successful
- [ ] Production deployment successful

---

---

# SUMMARY

## Total Scope
- **9 Major Builds**
- **73 Individual Tasks**
- **668 Total Hours**
- **0 Stubs or Placeholders**

## Prioritization by Size
1. **Build 3** (LUCCCA) - 72 hours (differentiator)
2. **Build 4** (Advanced Design) - 120 hours (competitive)
3. **Build 5** (Menu Intelligence) - 96 hours (unique)
4. **Build 6** (Templates/Assets) - 88 hours (speed)
5. **Build 7** (UI/UX Polish) - 104 hours (professional)
6. **Build 1** (Layout) - 144 hours (foundation)
7. **Build 2** (Print) - 80 hours (required)
8. **Build 8** (Testing) - 80 hours (quality)
9. **Build 9** (Docs) - 52 hours (final)

## Recommended Execution Order
1. **Start with Build 1** (Layout) - Required foundation
2. **Parallel: Build 7** (UI/UX) - Works alongside layout
3. **Then Build 2** (Print) - Blocks competitiveness
4. **Then Build 3** (LUCCCA) - Your differentiator
5. **Then Build 4-5** (Design Features) - Competitive advantage
6. **Then Build 6** (Templates) - Speed to value
7. **Parallel: Build 8** (Testing) - Continuous
8. **Final: Build 9** (Docs) - After everything works

## Success Criteria
✅ All tasks completed  
✅ No stubs/placeholders  
✅ Production-ready code  
✅ >80% test coverage  
✅ WCAG 2.1 AA accessible  
✅ 60+ FPS performance  
✅ Professional UI/UX  
✅ Zero console errors  

---

**Ready to start Build 1 (Layout Redesign)?**  
**Approve and I'll begin implementing immediately.**
