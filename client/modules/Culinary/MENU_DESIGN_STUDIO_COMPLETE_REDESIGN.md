# Menu Design Studio - Complete Redesign
## Professional SaaS Layout, Design System, & Implementation Guide

**Status**: Comprehensive specification for development  
**Target**: Production-grade, Apple-quality UX  
**Scope**: Layout restructuring + design system implementation + component refactoring  

---

# SECTION 1: COMPREHENSIVE FEATURE AUDIT
## What EchoRecipePro Menu Designer Has vs. Needs

### ✅ WHAT YOU HAVE (Current Implementation)

**Core Canvas & Editing** ✓
- [x] Drag-and-drop canvas
- [x] Select/deselect elements
- [x] Inline text editing
- [x] Element positioning (X, Y coordinates)
- [x] Element resizing
- [x] Rotation control
- [x] Opacity/transparency
- [x] Z-index management (bring forward/back)

**Typography** ✓ (Partial)
- [x] Font family selection (Google Fonts + basic library)
- [x] Font size control
- [x] Font weight selection
- [x] Line height adjustment
- [x] Letter spacing
- [x] Text alignment (left, center, right)
- [ ] ❌ Font pairing suggestions (MISSING)
- [ ] ❌ Typography presets/styles (MISSING)
- [ ] ❌ Kerning control (MISSING)

**Color & Branding** ✓ (Basic)
- [x] Color picker
- [x] Color palettes (pre-defined)
- [x] Text color
- [x] Shape fill color
- [ ] ❌ Brand color palette management (MISSING)
- [ ] ❌ CMYK conversion/export (MISSING - critical for print)
- [ ] ❌ RGB/Hex/CMYK toggle (MISSING)
- [ ] ❌ Gradient support (MISSING)
- [ ] ❌ Color accessibility checker (MISSING)

**Layers & Organization** ✓
- [x] Layers panel
- [x] Layer visibility toggle (hide/show)
- [x] Layer locking
- [x] Z-index ordering (bring forward/back)
- [x] Layer naming
- [x] Layer opacity control
- [ ] ❌ Group/ungroup (MISSING)
- [ ] ❌ Layer search (MISSING)
- [ ] ❌ Layer hierarchy visualization (MISSING)

**Templates** ✓ (Limited)
- [x] Seasonal template
- [x] Template application
- [ ] ❌ Template library (only 1 built-in)
- [ ] ❌ Multi-page templates
- [ ] ❌ Table tent templates
- [ ] ❌ Poster templates
- [ ] ❌ Food photography templates

**Elements/Objects** ✓
- [x] Text elements (heading, subheading, body, menu-item)
- [x] Image elements
- [x] Shapes (rectangle, ellipse)
- [x] Dividers
- [ ] ❌ Icons library (MISSING)
- [ ] ❌ Price columns (LUCCCA-specific, MISSING)
- [ ] ❌ Allergen icons (MISSING)
- [ ] ❌ Lines with style (dashed, dotted)
- [ ] ❌ Advanced shapes (rounded, polygon)

**Canvas Settings** ✓
- [x] Page size presets (8 presets: letter, legal, tabloid, A3, A4, etc.)
- [x] Custom page dimensions
- [x] Orientation flip
- [x] Zoom control (zoom in/out)
- [x] Grid toggle
- [x] Grid customization (columns, gutter)
- [x] Margins display
- [x] Bleed display
- [ ] ❌ Snap-to-grid precision control (PARTIAL)
- [ ] ❌ Smart guides (alignment guides, MISSING)
- [ ] ❌ Ruler display (MISSING)

**Alignment & Distribution** ✓ (Limited)
- [x] Align left
- [x] Align center
- [x] Align right
- [ ] ❌ Align top/bottom (MISSING)
- [ ] ❌ Distribute horizontally/vertically (MISSING)

**Undo/Redo** ✓
- [x] Undo (Ctrl+Z)
- [x] Redo (Ctrl+Shift+Z)
- [x] Visual feedback on undo/redo
- [x] 50-state history

**Save/Load** ✓
- [x] Auto-save to localStorage
- [x] Save design with name
- [x] Load saved designs
- [x] Delete saved designs
- [x] Rename designs
- [x] Last auto-save recovery
- [ ] ❌ Cloud save (MISSING - currently localStorage only)
- [ ] ❌ Version history/snapshots (MISSING)
- [ ] ❌ Collaborative editing (MISSING)

**Export** ✓ (Limited)
- [x] JSON export (technical handoff)
- [x] SVG export (vector)
- [x] PDF export (basic)
- [ ] ❌ PDF/X-1a format (print-ready, MISSING)
- [ ] ❌ CMYK export (print accuracy, MISSING)
- [ ] ❌ 300 DPI verification (MISSING)
- [ ] ❌ Bleed/trim marks (MISSING)
- [ ] ❌ Flattened vs. layers option (MISSING)
- [ ] ❌ Print preflight checklist (MISSING)
- [ ] ❌ Multi-output export (menu + table tent + poster from one design, MISSING)

**Photos & Assets** ✓
- [x] Image upload
- [x] Gallery image picker
- [x] Image positioning/resizing
- [ ] ❌ Crop tool (MISSING)
- [ ] ❌ Shape masks (circle, rounded rect, MISSING)
- [ ] ❌ Filters (brightness, contrast, MISSING)
- [ ] ❌ Color correction (MISSING)
- [ ] ❌ Built-in stock photos (Unsplash/Pexels, MISSING)

**Menu-Specific Features** ✓ (Limited)
- [x] Menu item element type (with price + description)
- [ ] ❌ Auto-sync price from EchoRecipePro (MISSING)
- [ ] ❌ Allergy icon insertion (MISSING)
- [ ] ❌ Auto-pull dish descriptions (MISSING)
- [ ] ❌ Category auto-layout (Appetizers, Entrées, etc., MISSING)
- [ ] ❌ Menu spacing balancer AI (MISSING)
- [ ] ❌ Photo-to-menu mapping (MISSING)

**Multi-Page Support** ✓ (Partial)
- [x] Page presets include table tent (but not fully implemented)
- [ ] ❌ Multi-page document support (MISSING)
- [ ] ❌ Auto-sync repeated elements (logo, footer, MISSING)
- [ ] ❌ Page naming (Page 1, Table Tent Side A, etc., MISSING)

**UI/UX Layout** ⚠️ (Current Issues)
- ⚠️ Left sidebar for tools (ToolSidebar)
- ⚠️ Floating toolbar (FloatingToolbarPanel) - takes up canvas space
- ⚠️ Floating layers panel (FloatingLayersPanel) - takes up canvas space
- ⚠️ Right sidebar for inspector (InspectorPanel)
- ⚠️ Header with controls mixed with title
- ❌ No top toolbar (WHERE EVERYTHING SHOULD GO)
- ❌ Canvas area not maximized
- ❌ "Homemade" visual design (not professional SaaS)
- ❌ No glassmorphism or modern design
- ❌ Inconsistent spacing/alignment
- ❌ Toolbar icons not cohesive

---

## ❌ CRITICAL GAPS (Blocks Professional Status)

| Category | Issue | Impact | Priority |
|----------|-------|--------|----------|
| **Layout** | Floating panels obscure canvas | 10% less working space | P0 |
| **Print** | No PDF/X-1a or CMYK | Can't submit to printers | P0 |
| **Design** | Homemade UI, not pro SaaS | Looks unfinished | P0 |
| **Menu** | No price auto-sync | Manual data entry required | P1 |
| **Templates** | Only 1 template | Limited productivity | P1 |
| **Export** | No multi-output | 3x re-work (menu, poster, tent) | P1 |
| **Assets** | No crop/filters | Limited photo control | P2 |
| **Alignment** | Missing distribution | Tedious manual alignment | P2 |

---

# SECTION 2: NEW LAYOUT SPECIFICATION
## Professional Apple-Quality UX with Maximized Canvas

### Current Layout (Problems)
```
┌─────────────────────────────────────────────┐
│ HEADER (Title + Mixed Controls)             │
├─────────────────────────────────────────────┤
│              │         │                │    │
│   Sidebar    │ Canvas  │ Floating      │ Right
│   Tools      │ (70%)   │ Panels (30%)  │ Inspector
│              │         │               │
│              │         │               │
│              │         │               │
└─────────────────────────────────────────────┘

PROBLEMS:
- Floating panels obscure canvas (20-30% loss)
- Header too tall, mixes title with controls
- Sidebar takes 15-20% width
- Inspector takes 20% width
- Canvas only ~50% of available space
```

### NEW LAYOUT (Professional)
```
┌──────────────────────────────────────────────────────┐
│ TOP TOOLBAR (Clean, organized, all controls)         │
├──────────────────────────────────────────────────────┤
│                                                        │
│                   CANVAS AREA (95%)                   │
│                   (All panels integrated)              │
│                                                        │
│                                                        │
│                                                        │
│                                                        │
└─────────────────────────���────────────────────────────┘

BENEFITS:
- Canvas uses 95% of space (vs. 50% now)
- All controls in organized toolbar
- Tools accessible via icons/dropdowns
- Professional, clean aesthetic
- Follows Canva/Adobe pattern
```

---

## DETAILED TOP TOOLBAR SPECIFICATION

### Toolbar Structure (Left to Right)

```
┌────────────────────────────────────────────────────────────────────┐
│  ◀ Return │ FILE | EDIT | VIEW | INSERT | FORMAT | EXPORT | ? │  │
│                                                                    │
│  [Document Name] [Page Size] [Zoom] [Grid] [Snap] [More...]     │
└────────────────────────────────────────────────────────────────────┘
```

### Toolbar Sections (Detailed)

#### 1. **Top Left: Navigation & Title** (20% width)
```
[◀ Return to Menu Design Studio] | [Document Name Input]
```
- Back arrow → returns to menu design list/grid
- Editable document name
- Auto-saves as user types
- Shows unsaved indicator (orange dot)

#### 2. **Top Center-Left: Main Menu Bar** (40% width)
```
FILE | EDIT | VIEW | INSERT | FORMAT | EXPORT
```

**FILE Menu**:
- New Design (Blank Canvas)
- Open Design (Recent list, Browse)
- Save (Cmd+S)
- Save As...
- Duplicate
- Export > [PDF, SVG, JSON]
- Print

**EDIT Menu**:
- Undo (Cmd+Z)
- Redo (Cmd+Shift+Z)
- Duplicate (Cmd+D)
- Delete
- Select All
- Group / Ungroup

**VIEW Menu**:
- Zoom In / Out (Cmd++/Cmd+-)
- Zoom to Fit (Cmd+0)
- Zoom to Selection (Cmd+1)
- Show Grid (toggle)
- Show Guides (toggle)
- Show Rulers (toggle)
- Show Bleed (toggle)
- Show Margins (toggle)
- Snap to Grid (toggle)

**INSERT Menu**:
- Text > [Heading, Subheading, Body, Menu Item, Label]
- Image > [From Gallery, From Stock, Upload]
- Shape > [Rectangle, Circle, Ellipse, Line, Path]
- Icon > [Food Icons, Allergen Icons]
- Divider
- Price Column (LUCCCA-specific)
- Dish Auto-Insert (LUCCCA-specific)

**FORMAT Menu**:
- Typography > [Font, Size, Weight, Spacing]
- Color > [Fill, Stroke, Gradient]
- Alignment > [Left, Center, Right, Top, Bottom]
- Distribution > [Distribute H, Distribute V]
- Rotate / Flip
- Opacity / Effects

**EXPORT Menu**:
- PDF (Print-Ready)
- PDF/X-1a (Professional Print)
- SVG (Vector)
- JSON (Technical)
- PNG (Raster)
- Print Checklist

#### 3. **Top Center: Quick Controls** (30% width)
```
[Page Preset ▼] | [Zoom: 75% ▼] | [Grid toggle] | [Snap toggle] | [More tools ...]
```

**Page Preset Dropdown**:
- 8.5" × 11" (US Letter)
- 8.5" × 14" (Legal)
- 11" × 17" (Tabloid)
- A4, A3, Half Letter, etc.
- Custom...
- Flip Orientation button

**Zoom Dropdown**:
- Fit to Canvas
- Fit to Width
- Fit to Height
- 25%, 50%, 75%, 100%, 150%, 200%
- Custom %...

**Grid / Snap Toggles**:
- Grid icon (toggle on/off)
- Snap to Grid icon (toggle on/off)
- Smart Guides toggle
- Snap Distance input (px)

**More Tools Dropdown**:
- Keyboard Shortcuts (Cmd+?)
- Settings / Preferences
- Help & Tutorials

#### 4. **Top Right: Canvas State & Actions** (10% width)
```
[Undo] [Redo] | [Layers] [Inspector] [Toolkit] | ⋮ (More)
```

**These are COLLAPSIBLE PANELS** (not floating):
- Layers panel (icon)
- Inspector panel (icon)
- Toolkit panel (icon)
- More options (⋮)

---

## INSPECTOR PANEL: New Top Right Integration

**Currently**: Right sidebar (fixed)  
**New**: Icon in toolbar → slides in from right when clicked

### Inspector Sections (Collapsible)
```
┌─ INSPECTOR PANEL ───────────────────┐
│ [X]                                  │
├──────────────���───────────────────────┤
│ ▸ POSITION & SIZE                    │
│   X: [___]  Y: [___]                │
│   W: [___]  H: [___]                │
│   Rotation: [___]°                   │
│                                       │
│ ▸ FILL & STROKE                      │
│   Fill Color: [█ #00A8FF]           │
│   Stroke Color: [█ #000000]         │
│   Stroke Width: [2]                  │
│                                       │
│ ▸ EFFECTS                            │
│   Opacity: [======] 100%            │
│   Blur: [=] 0px                      │
│   Shadow: [toggle]                   │
│                                       │
│ ▸ TEXT PROPERTIES (if text)          │
│   Font: [Google Sans ▼]             │
│   Size: [16] px                      │
│   Weight: [400] ▼                    │
│   Color: [█ #000000]                │
│                                       │
│ ▸ IMAGE PROPERTIES (if image)        │
│   Width: [300] px                    │
│   Height: [200] px                   │
│   Object Fit: [cover ▼]             │
│   [Crop] [Filters] [Mask]           │
│                                       │
│ ▸ LAYERS                             │
│   [layers list here]                 │
│                                       │
│ ▸ CANVAS SETTINGS                    │
│   Grid: [toggle]                     │
│   Show Bleed: [toggle]               │
│   Grid Size: [20]px                  │
│                                       │
└──────────────────────────────────────┘
```

---

## TOOLBAR PANEL: New Integrated Panel

**Currently**: FloatingToolbarPanel (floats, obscures canvas)  
**New**: Collapsible panel in top toolbar or left sidebar

### When Collapsed
```
[T] [I] [S] [L] [⋮]
```
(Icons visible in top toolbar)

### When Expanded (Toggles visibility)
```
┌─ TOOLBAR ────────────────────────┐
│ [X]  Tools                        │
├──────────────────────────────────┤
│ ▸ SELECT                          │
│   [Pointer icon] Select           │
│                                   │
│ ▸ ADD ELEMENTS                    │
│   [T] Text                        │
│   [I] Image                       │
│   [S] Shape                       │
│   [L] Line                        │
│   [...] More                      │
│                                   │
│ ▸ ALIGNMENT                       │
│   [< > | = | >]  Left/Center/Right│
│   [Distribute H/V]                │
│                                   │
│ ▸ ARRANGE                         │
│   [↑↓] Bring Forward / Send Back  │
│   [📌] Lock / Unlock              │
│                                   │
└──────────────────────────────────┘
```

---

## LAYERS PANEL: New Integrated Panel

**Currently**: FloatingLayersPanel (floats, obscures canvas)  
**New**: Collapsible panel, integrated into UI

### When Closed
```
[⊞] (small icon in top toolbar)
```

### When Open (Right side or slides in)
```
┌─ LAYERS ─────────────────────────┐
│ [X]  Layers                       │
├──────────────────────────────────┤
│ 🔍 [Search layers...]            │
│                                   │
│ ▸ Group 1                         │
│   • Heading "Menu Title"          │
│   • Image "chef_photo.jpg"        │
│ ▸ Appetizers                      │
│   • Shrimp Ceviche (locked 🔒)   │
│   • Tuna Tartare                  │
│   • Calamari Fritto               │
│ ▸ Entrées                         │
���   • Branzino (hidden 👁‍🗨)         │
│   • Lamb Chops                    │
│                                   │
│ ☐ Add Group                       │
└──────────────────────────────────┘
```

---

# SECTION 3: DESIGN SYSTEM & UI/UX SPECIFICATION
## Professional Apple-Quality Design Tokens

---

## Color Palette (Professional SaaS)

### Primary Colors
```
Cyan (Primary):
  Light:  #00C8FF (Bright working color)
  Medium: #00A8FF (Action buttons)
  Dark:   #0080CC (Hover states)

Emerald (Secondary):
  Light:  #00FF88 (Accents, positive actions)
  Medium: #00DD66
  Dark:   #00BB44

Neutral (Backgrounds & Text):
  Black:     #000000
  Gray-900:  #0F0F0F (Near black)
  Gray-800:  #1A1A1A
  Gray-700:  #2D2D2D
  Gray-600:  #404040
  Gray-500:  #666666
  Gray-400:  #999999
  Gray-300:  #CCCCCC
  Gray-200:  #E5E5E5
  Gray-100:  #F5F5F5
  White:     #FFFFFF
```

### Semantic Colors
```
Success:    #00DD66 (Emerald)
Warning:    #FFA500 (Amber)
Error:      #FF6B6B (Red)
Info:       #00A8FF (Cyan)

Canvas Background:
  Light:    #FAFAFA
  Dark:     #0F0F0F

Card/Panel Background:
  Light:    #FFFFFF
  Dark:     #1A1A1A

Hover Background:
  Light:    #F5F5F5
  Dark:     #2D2D2D
```

---

## Typography System

### Font Stack
```
Primary Font: "Inter" (Google Fonts)
  - Weights: 400, 500, 600, 700
  - Fallback: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif

Monospace: "Source Code Pro" (Google Fonts)
  - For code snippets, JSON export
  - Fallback: monospace
```

### Type Scale
```
Display:        48px, 700 weight, 56px line-height, -1.5px letter-spacing
Heading 1:      32px, 700 weight, 40px line-height, -1px letter-spacing
Heading 2:      24px, 600 weight, 32px line-height, -0.5px letter-spacing
Heading 3:      18px, 600 weight, 26px line-height, 0px letter-spacing
Body Large:     16px, 400 weight, 24px line-height, 0px letter-spacing
Body:           14px, 400 weight, 22px line-height, 0px letter-spacing
Caption:        12px, 500 weight, 18px line-height, 0.5px letter-spacing
Button:         14px, 600 weight, 20px line-height, 0.5px letter-spacing
Small:          11px, 400 weight, 16px line-height, 0.3px letter-spacing
Tiny:           10px, 500 weight, 14px line-height, 0.2px letter-spacing
```

---

## Spacing System (8px Base)

```
xs:   4px   (quarter)
sm:   8px   (1x base)
md:   16px  (2x base)
lg:   24px  (3x base)
xl:   32px  (4x base)
2xl:  48px  (6x base)
3xl:  64px  (8x base)
4xl:  96px  (12x base)

Usage:
- Padding inside components: md (16px)
- Gap between elements: sm/md (8-16px)
- Margin around sections: lg/xl (24-32px)
- Top toolbar height: 64px (or 60px)
- Sidebar width: 280px
- Inspector width: 320px
```

---

## Shadow System (Depth Layers)

```
Elevation 1 (Cards, dropdowns):
  0 1px 2px rgba(0, 0, 0, 0.04),
  0 1px 4px rgba(0, 0, 0, 0.06)

Elevation 2 (Floating panels, tooltips):
  0 2px 4px rgba(0, 0, 0, 0.08),
  0 4px 8px rgba(0, 0, 0, 0.12)

Elevation 3 (Modals, important UI):
  0 4px 8px rgba(0, 0, 0, 0.12),
  0 8px 16px rgba(0, 0, 0, 0.16)

Elevation 4 (Emphasis, hover states):
  0 8px 16px rgba(0, 0, 0, 0.16),
  0 16px 32px rgba(0, 0, 0, 0.20)
```

---

## Border Radius (Consistent)

```
None:      0px
xs:        2px   (tiny elements, inputs)
sm:        4px   (buttons, cards)
md:        8px   (panels, modals)
lg:        12px  (large elements, containers)
full:      9999px (pills, circles)

Usage:
- Toolbar buttons: sm (4px)
- Cards/panels: md (8px)
- Input fields: sm (4px)
- Large containers: lg (12px)
```

---

## Component Styling Guide

### Buttons
```
PRIMARY (Cyan - Main action):
  Background: #00A8FF
  Text: White
  Padding: 10px 16px (md height: 40px)
  Border Radius: 4px
  Font: 14px 600 weight
  Hover: #0080CC (darken)
  Active: #006699
  Disabled: Gray-400, opacity 50%

SECONDARY (Gray outline):
  Background: Transparent
  Text: Gray-700 (light) / Gray-300 (dark)
  Border: 1px Gray-400 (light) / Gray-600 (dark)
  Padding: 10px 16px
  Hover: Gray-100 (light) / Gray-800 (dark) background
  
TERTIARY (Ghost/text only):
  Background: Transparent
  Text: Gray-600 (light) / Gray-400 (dark)
  Hover: Underline or slight background

ICON BUTTON:
  Size: 36px (for toolbar icons)
  Border Radius: 4px
  Background: Transparent
  Hover: Gray-100 (light) / Gray-800 (dark)
  Active: Cyan-100 (light) / Cyan-900 (dark)

TOGGLE/SWITCH:
  Off: Gray-400
  On: #00DD66 (Emerald)
  Size: 48px × 28px
```

### Input Fields
```
Default:
  Background: White (light) / Gray-900 (dark)
  Border: 1px Gray-300 (light) / Gray-700 (dark)
  Padding: 8px 12px
  Font: 14px 400 weight
  Border Radius: 4px
  
Focus:
  Border: 2px #00A8FF
  Box Shadow: 0 0 0 3px rgba(0, 168, 255, 0.1)
  
Disabled:
  Background: Gray-100 (light) / Gray-800 (dark)
  Text: Gray-400
  Cursor: not-allowed
```

### Cards & Panels
```
Background: White (light) / Gray-900 (dark)
Border: 1px Gray-200 (light) / Gray-800 (dark)
Border Radius: 8px
Padding: 16px (md)
Box Shadow: Elevation 1
Hover: Elevation 2
```

### Top Toolbar
```
Height: 60px (top section) + 28px (quick controls) = 88px total
Background: White (light) / Gray-950 (dark)
Border-bottom: 1px Gray-200 (light) / Gray-800 (dark)
Box Shadow: Elevation 1

Top Bar Layout:
  Left 20%:   [◀ Return] [Document Name]
  Center 50%: [FILE | EDIT | VIEW | INSERT | FORMAT | EXPORT]
  Right 30%:  [Page Preset] [Zoom] [Grid] [More]
  
Quick Controls Bar:
  All icons/buttons at 36px height
  Icons at 18px
  Gaps between groups: 16px (md)
```

---

## Dark Mode Implementation

```
In light mode:
  - Background: White
  - Text: Gray-900
  - Accents: Cyan-600, Emerald-600

In dark mode:
  - Background: Gray-950 (#0F0F0F)
  - Text: Gray-100
  - Accents: Cyan-400, Emerald-400
  - Panels: Gray-900
  
All Tailwind classes use:
  light:dark: variant for automatic switching
  
Examples:
  bg-white dark:bg-gray-950
  text-gray-900 dark:text-gray-100
  border-gray-200 dark:border-gray-800
```

---

## Glassmorphism & Modern Effects

```
Glass Card (for floating panels if needed):
  Background: rgba(255, 255, 255, 0.7) light / rgba(0, 0, 0, 0.3) dark
  Backdrop Filter: blur(10px)
  Border: 1px rgba(255, 255, 255, 0.5) light / rgba(255, 255, 255, 0.1) dark
  
Hover Effects:
  - Transition: all 150ms ease-out
  - Scale: 102% on interactive elements
  - Shadow increase on hover
  
Focus Indicators:
  - 2px colored outline (Cyan)
  - Visible at all times (accessibility)
  
Loading States:
  - Spinner: Cyan color, 2px stroke
  - Fade to 60% opacity
  - Disable pointer-events
```

---

# SECTION 4: REACT COMPONENT ARCHITECTURE & REFACTORING
## New Modular Structure

---

## Current Component Structure (Problems)

```
EchoMenuStudio.tsx (3,700+ lines) ← TOO LARGE
├── ToolSidebar
├── DesignerCanvas
├── InspectorPanel
├── FloatingToolbarPanel
├── FloatingLayersPanel
├── SaveLoadDialog
└── GalleryImagePicker

PROBLEMS:
- Single 3,700-line file (unmaintainable)
- Components tightly coupled
- State management scattered
- Difficult to test
- Hard to extend
- Floating panels obscure canvas
```

---

## NEW Recommended Architecture (Professional)

```
components/
├── MenuDesignStudio/
│   ├── MenuDesignStudio.tsx          ← Main container (400 lines)
│   ├── hooks/
│   │   ├── useDesignerState.ts       ← State management
│   │   ├── useCanvasOperations.ts    ← Canvas actions
│   │   ├── useHistory.ts             ← Undo/redo (moved here)
│   │   ├── useKeyboardShortcuts.ts   ← Keyboard handlers
│   │   └── useAutoSave.ts            ← Auto-save logic
│   ├── layout/
│   │   ├── TopToolbar.tsx            ← Top toolbar (NEW)
│   │   ├── ToolSidebar.tsx           ← Left sidebar (REFACTORED)
│   │   ├── InspectorPanel.tsx        ← Right panel (REFACTORED)
│   │   └── StatusBar.tsx             ← Bottom status (NEW)
│   ├── toolbar/
│   │   ├── FileMenu.tsx              ← FILE menu
│   │   ├── EditMenu.tsx              ← EDIT menu
│   │   ├── ViewMenu.tsx              ← VIEW menu
│   │   ├── InsertMenu.tsx            ← INSERT menu
│   │   ├── FormatMenu.tsx            ← FORMAT menu
│   │   ├── ExportMenu.tsx            ← EXPORT menu
│   │   └── QuickControls.tsx         ← Page size, zoom, grid
│   ├── canvas/
│   │   ├── DesignerCanvas.tsx        ← Canvas (REFACTORED)
│   │   ├── CanvasElement.tsx         ← Element rendering
│   │   ├── ElementSelector.tsx       ← Selection UI
│   │   └── Grid.tsx                  ← Grid/guides overlay
│   ├── panels/
│   │   ├── LayersPanel.tsx           ← Layers (REFACTORED)
│   │   ├── LayerItem.tsx             ← Single layer
│   │   ├── InspectorTabs.tsx         ← Inspector tabs
│   │   ├── ColorPickerSection.tsx    ← Colors
│   │   ├── TypographySection.tsx     ← Typography
│   │   └── ImageEditorSection.tsx    ← Image editing
│   └── dialogs/
│       ├── SaveLoadDialog.tsx        ← Save/load
│       ├── GalleryImagePicker.tsx    ← Gallery picker
│       ├── NewDesignDialog.tsx       ← New design (NEW)
│       ├── PrintChecklist.tsx        ← Print verification (NEW)
│       └── ExportDialog.tsx          ← Export options (NEW)
├── menu-studio/
│   ├── GalleryImagePicker.tsx        ← (MOVED from here)
│   └── SaveLoadDialog.tsx            ← (MOVED from here)
└── ui/
    ├── ColorPicker.tsx               ← Reusable color picker
    ├── FontSelector.tsx              ← Reusable font selector
    └── SizeInput.tsx                 ← Reusable size input
```

---

## State Management Refactoring

### Current (Scattered State)
```typescript
// In EchoMenuStudio.tsx
const [elements, setElements] = useState<DesignerElement[]>(...);
const [selectedId, setSelectedId] = useState<string | null>(...);
const [pageSize, setPageSize] = useState<PageSize>(...);
const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>(...);
const [floatingToolbar, setFloatingToolbar] = useState<FloatingPanelState>(...);
const [floatingLayersPanel, setFloatingLayersPanel] = useState<FloatingPanelState>(...);
// ... 20+ more state variables
```

### NEW (Centralized Hooks)
```typescript
// hooks/useDesignerState.ts
export function useDesignerState() {
  const [state, dispatch] = useReducer(designerReducer, initialState);
  
  return {
    // Data
    elements: state.elements,
    selectedId: state.selectedId,
    pageSize: state.pageSize,
    canvasSettings: state.canvasSettings,
    documentName: state.documentName,
    
    // Actions
    addElement: (element: DesignerElement) => dispatch({ type: 'ADD_ELEMENT', payload: element }),
    updateElement: (id: string, changes: Partial<DesignerElement>) => dispatch({ type: 'UPDATE_ELEMENT', payload: { id, changes } }),
    deleteElement: (id: string) => dispatch({ type: 'DELETE_ELEMENT', payload: id }),
    selectElement: (id: string | null) => dispatch({ type: 'SELECT_ELEMENT', payload: id }),
    setPageSize: (size: PageSize) => dispatch({ type: 'SET_PAGE_SIZE', payload: size }),
    // ... etc
  };
}
```

---

## New Toolbar Component Structure

### TopToolbar.tsx (Main Container)
```typescript
interface TopToolbarProps {
  documentName: string;
  onDocumentNameChange: (name: string) => void;
  pagePreset: string;
  onPagePresetChange: (preset: string) => void;
  selectedElement: DesignerElement | null;
  onAddHeading: () => void;
  onAddBody: () => void;
  // ... pass all menu callbacks
}

export function TopToolbar(props: TopToolbarProps) {
  return (
    <div className="flex flex-col bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
      {/* Top Section: Back + Title + Quick Menus */}
      <div className="flex h-16 items-center gap-4 px-6 border-b border-gray-100 dark:border-gray-900">
        {/* Return Button */}
        <button className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Return to Menu Design Studio</span>
        </button>
        
        {/* Document Name (Editable) */}
        <input 
          value={documentName}
          onChange={(e) => onDocumentNameChange(e.target.value)}
          className="flex-1 px-3 py-2 text-sm font-semibold bg-transparent border border-gray-200 dark:border-gray-800 rounded-md"
          placeholder="Untitled Design"
        />
        
        {/* Main Menu Bar */}
        <FileMenu {...props} />
        <EditMenu {...props} />
        <ViewMenu {...props} />
        <InsertMenu {...props} />
        <FormatMenu {...props} />
        <ExportMenu {...props} />
      </div>
      
      {/* Quick Controls Section */}
      <div className="flex h-14 items-center gap-3 px-6">
        <QuickControls {...props} />
      </div>
    </div>
  );
}
```

---

## Inspector Panel Refactoring

### InspectorPanel.tsx (NEW - Collapsible)
```typescript
interface InspectorPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedElement: DesignerElement | null;
  onUpdateElement: (id: string, changes: Partial<DesignerElement>) => void;
  canvasSettings: CanvasSettings;
  onCanvasSettingsChange: (changes: Partial<CanvasSettings>) => void;
}

export function InspectorPanel({
  isOpen,
  onToggle,
  selectedElement,
  onUpdateElement,
  canvasSettings,
  onCanvasSettingsChange,
}: InspectorPanelProps) {
  return (
    <div className={`
      fixed top-32 right-0 w-80 h-[calc(100vh-132px)]
      bg-white dark:bg-gray-900
      border-l border-gray-200 dark:border-gray-800
      shadow-lg rounded-l-lg
      overflow-y-auto
      transition-transform duration-200
      ${isOpen ? 'translate-x-0' : 'translate-x-full'}
    `}>
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Inspector</h3>
        <button onClick={onToggle} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        {selectedElement ? (
          <>
            <PositionAndSizeSection element={selectedElement} onUpdate={onUpdateElement} />
            <FillAndStrokeSection element={selectedElement} onUpdate={onUpdateElement} />
            <EffectsSection element={selectedElement} onUpdate={onUpdateElement} />
            {selectedElement.type.includes('text') && (
              <TypographySection element={selectedElement} onUpdate={onUpdateElement} />
            )}
            {selectedElement.type === 'image' && (
              <ImageEditorSection element={selectedElement} onUpdate={onUpdateElement} />
            )}
          </>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p className="text-sm">Select an element to inspect</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Layers Panel Refactoring

### LayersPanel.tsx (NEW - Collapsible)
```typescript
export function LayersPanel({
  isOpen,
  onToggle,
  layers,
  selectedId,
  onSelectLayer,
  onLayerShift,
  onToggleLock,
  onToggleVisibility,
}: LayersPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredLayers = layers.filter(layer =>
    layer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className={`
      fixed top-32 right-80 w-72 h-[calc(100vh-132px)]
      bg-white dark:bg-gray-900
      border-l border-gray-200 dark:border-gray-800
      shadow-lg rounded-l-lg
      overflow-y-auto
      transition-transform duration-200
      ${isOpen ? 'translate-x-0' : 'translate-x-full'}
    `}>
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Layers</h3>
          <button onClick={onToggle}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <input
          type="text"
          placeholder="Search layers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
        />
      </div>
      
      <div className="p-2 space-y-1">
        {filteredLayers.map((layer) => (
          <LayerItem
            key={layer.id}
            layer={layer}
            isSelected={selectedId === layer.id}
            onSelect={() => onSelectLayer(layer.id)}
            onLockToggle={() => onToggleLock(layer.id)}
            onVisibilityToggle={() => onToggleVisibility(layer.id)}
            onMoveUp={() => onLayerShift(layer.id, 'up')}
            onMoveDown={() => onLayerShift(layer.id, 'down')}
          />
        ))}
      </div>
    </div>
  );
}
```

---

# SECTION 5: IMPLEMENTATION TODO LIST (NO STUBS)

---

## PHASE 1: Foundation & Refactoring (Weeks 1-3)
### Priority: Complete app functionality, no breaking changes

### Task 1.1: Create New Hook Structure
**Component**: `hooks/useDesignerState.ts`, `hooks/useCanvasOperations.ts`, etc.  
**Effort**: 40 hours  
**Dependencies**: None  
**Complexity**: Medium  

**Deliverables**:
- [ ] Extract all state from EchoMenuStudio into useDesignerState hook
- [ ] Create useCanvasOperations hook for add/update/delete operations
- [ ] Create useKeyboardShortcuts hook
- [ ] Create useAutoSave hook
- [ ] Create useHistory hook (move existing logic)
- [ ] Unit test all hooks
- [ ] Update EchoMenuStudio to use new hooks (verify no regression)
- [ ] Document hook APIs

**Acceptance Criteria**:
- All functionality works identically to before
- State is fully centralized in hooks
- No prop drilling needed in child components
- All tests pass

---

### Task 1.2: Extract & Refactor DesignerCanvas
**Component**: `canvas/DesignerCanvas.tsx`  
**Effort**: 24 hours  
**Dependencies**: Task 1.1  
**Complexity**: Medium  

**Deliverables**:
- [ ] Create CanvasElement sub-component for rendering individual elements
- [ ] Create ElementSelector sub-component for selection UI
- [ ] Create Grid sub-component for grid/guide overlay
- [ ] Refactor DesignerCanvas to use composition
- [ ] Update event handlers to use new hook-based state
- [ ] Add error boundaries
- [ ] Unit test all sub-components
- [ ] Performance optimization (memoization where needed)

**Acceptance Criteria**:
- Canvas renders identically to before
- No performance regression
- Components are testable in isolation
- All edge cases handled (no elements, many elements, etc.)

---

### Task 1.3: Create TopToolbar Layout (Without Functionality Yet)
**Component**: `layout/TopToolbar.tsx`, Menu components  
**Effort**: 32 hours  
**Dependencies**: None  
**Complexity**: Medium  

**Deliverables**:
- [ ] Create TopToolbar.tsx main container (60px + 40px height)
- [ ] Create MenuBar.tsx with FILE | EDIT | VIEW | INSERT | FORMAT | EXPORT sections
- [ ] Create QuickControls.tsx with Page Preset, Zoom, Grid toggles
- [ ] Create StyledButton, StyledDropdown reusable components
- [ ] Implement professional styling (colors, spacing, shadows from design system)
- [ ] Add glassmorphism effects
- [ ] Responsive design (collapse menus on small screens)
- [ ] Unit test all components

**Acceptance Criteria**:
- Toolbar is professional and matches Apple design standards
- All sections visible and accessible
- Dark mode works correctly
- Responsive on tablets (hide less important menus)
- No functional menus yet (just UI)

---

### Task 1.4: Create New Inspector Panel (Collapsible)
**Component**: `panels/InspectorPanel.tsx`, `panels/*Section.tsx`  
**Effort**: 48 hours  
**Dependencies**: Task 1.1, 1.2, 1.3  
**Complexity**: High  

**Deliverables**:
- [ ] Create InspectorPanel.tsx with slide-in animation
- [ ] Create PositionAndSizeSection.tsx
- [ ] Create FillAndStrokeSection.tsx with color picker
- [ ] Create EffectsSection.tsx (opacity, blur, shadow)
- [ ] Create TypographySection.tsx (full typography controls)
- [ ] Create ImageEditorSection.tsx (crop, filters, mask)
- [ ] Create CanvasSettingsSection.tsx
- [ ] Implement collapse/expand animation (smooth transition)
- [ ] Add keyboard shortcut to toggle (Cmd+I or Option+I)
- [ ] All sections fully functional with hooks
- [ ] Unit test all sections
- [ ] Add prop validation

**Acceptance Criteria**:
- Panel slides in from right without blocking canvas
- All sections work identically to floating panel
- Performance is smooth (60fps animations)
- Dark mode styling correct
- Keyboard accessible

---

### Task 1.5: Create New Layers Panel (Collapsible)
**Component**: `panels/LayersPanel.tsx`, `panels/LayerItem.tsx`  
**Effort**: 32 hours  
**Dependencies**: Task 1.1, 1.2  
**Complexity**: Medium  

**Deliverables**:
- [ ] Create LayersPanel.tsx with slide-in animation
- [ ] Create LayerItem.tsx with edit name, lock, visibility toggles
- [ ] Create layer search/filter functionality
- [ ] Create group/ungroup UI (collapse layer groups)
- [ ] Implement drag-to-reorder (optional for phase 1)
- [ ] Add keyboard shortcuts (Cmd+L or Option+L)
- [ ] Unit test all components
- [ ] Verify all existing functionality works

**Acceptance Criteria**:
- Panel slides in from right without blocking canvas
- Layer operations work identically to floating panel
- Search filters correctly
- Smooth animations
- Keyboard shortcuts work

---

## PHASE 2: Menu Functionality (Weeks 4-6)
### Priority: Make all menus functional

### Task 2.1: FILE Menu
**Components**: `toolbar/FileMenu.tsx`  
**Effort**: 24 hours  
**Dependencies**: Task 1.1, 1.3  
**Complexity**: Medium  

**Deliverables**:
- [ ] FILE > New Design
  - Opens dialog to create blank canvas
  - Confirms if unsaved changes
- [ ] FILE > Open Recent
  - Lists 5 most recent designs
  - Quick load
- [ ] FILE > Save (Cmd+S)
  - Opens save dialog or saves to current name
  - Shows confirmation
- [ ] FILE > Save As...
  - Save with new name
- [ ] FILE > Duplicate
  - Creates copy of current design
- [ ] FILE > Export
  - Submenu: PDF, SVG, JSON, PNG
  - Each has own export logic
- [ ] FILE > Print
  - Opens native print dialog
  - Shows print-ready preview
- [ ] FILE > Close
  - Closes editor, returns to menu list

**Acceptance Criteria**:
- All menu items functional
- Dialogs properly displayed
- Confirm dialogs for destructive actions
- Proper error handling
- UX matches design system

---

### Task 2.2: EDIT Menu
**Components**: `toolbar/EditMenu.tsx`  
**Effort**: 16 hours  
**Dependencies**: Task 1.1, 1.3  
**Complexity**: Low  

**Deliverables**:
- [ ] EDIT > Undo (Cmd+Z)
- [ ] EDIT > Redo (Cmd+Shift+Z)
- [ ] EDIT > Duplicate (Cmd+D)
- [ ] EDIT > Delete
- [ ] EDIT > Select All (Cmd+A)
- [ ] EDIT > Group (Cmd+G)
- [ ] EDIT > Ungroup (Cmd+Shift+G)

**Acceptance Criteria**:
- All keyboard shortcuts work
- Menu items disabled when not applicable
- Visual feedback on actions

---

### Task 2.3: VIEW Menu
**Components**: `toolbar/ViewMenu.tsx`  
**Effort**: 20 hours  
**Dependencies**: Task 1.1, 1.3  
**Complexity**: Low  

**Deliverables**:
- [ ] VIEW > Zoom In (Cmd++)
- [ ] VIEW > Zoom Out (Cmd+-)
- [ ] VIEW > Zoom to Fit (Cmd+0)
- [ ] VIEW > Zoom to Selection (Cmd+1)
- [ ] VIEW > Show Grid (toggle)
- [ ] VIEW > Show Guides (toggle)
- [ ] VIEW > Show Rulers (toggle)
- [ ] VIEW > Show Bleed (toggle)
- [ ] VIEW > Show Margins (toggle)
- [ ] VIEW > Snap to Grid (toggle)
- [ ] VIEW > Developer Tools (optional)

**Acceptance Criteria**:
- All zoom levels work smoothly
- Grid/guide toggles update canvas immediately
- Keyboard shortcuts work
- Visual indicators for toggle states

---

### Task 2.4: INSERT Menu
**Components**: `toolbar/InsertMenu.tsx`  
**Effort**: 40 hours  
**Dependencies**: Task 1.1, 1.3  
**Complexity**: Medium  

**Deliverables**:
- [ ] INSERT > Text
  - Submenu: Heading, Subheading, Body, Menu Item, Label
  - Each adds element to canvas with default styling
- [ ] INSERT > Image
  - Submenu: From Gallery, From Stock (Unsplash/Pexels), Upload
  - Opens image picker or upload dialog
- [ ] INSERT > Shape
  - Submenu: Rectangle, Circle, Ellipse, Line
  - Creates shape on canvas with default style
- [ ] INSERT > Icon
  - Submenu: Food Icons, Allergen Icons, More
  - (Implement basic icon library first)
- [ ] INSERT > Divider
  - Creates horizontal divider line
- [ ] INSERT > Price Column (LUCCCA-specific)
  - Creates auto-formatted price column
- [ ] INSERT > Dish Auto-Insert (LUCCCA-specific)
  - Modal to select dish from EchoRecipePro
  - Auto-populates name, price, description

**Acceptance Criteria**:
- All insert operations add elements correctly
- Elements have sensible defaults
- Icon library functional (at least food + allergen icons)
- LUCCCA features integrate with real data
- Undo/redo works for all inserts

---

### Task 2.5: FORMAT Menu
**Components**: `toolbar/FormatMenu.tsx`  
**Effort**: 32 hours  
**Dependencies**: Task 1.1, 1.3, 1.4  
**Complexity**: Medium  

**Deliverables**:
- [ ] FORMAT > Typography
  - Opens submenu: Font, Size, Weight, Line Height, Letter Spacing
  - Uses ColorPicker and FontSelector components
- [ ] FORMAT > Color
  - Submenu: Fill Color, Stroke Color, Gradient
  - Opens color picker
- [ ] FORMAT > Alignment
  - Submenu: Left, Center, Right, Top, Bottom
  - Updates selected element
- [ ] FORMAT > Distribution
  - Submenu: Distribute Horizontally, Distribute Vertically
  - Works on multiple selected elements
- [ ] FORMAT > Rotate / Flip
  - Submenu: Rotate 90°, Flip Horizontal, Flip Vertical
- [ ] FORMAT > Opacity
  - Slider or input (0-100%)

**Acceptance Criteria**:
- All format operations apply to selected element
- Multiple selections supported where applicable
- Color picker works with RGB, Hex
- Keyboard shortcuts for common operations
- Real-time preview on canvas

---

### Task 2.6: EXPORT Menu & Export Dialogs
**Components**: `toolbar/ExportMenu.tsx`, `dialogs/ExportDialog.tsx`  
**Effort**: 48 hours  
**Dependencies**: Task 1.1, 1.3  
**Complexity**: High  

**Deliverables**:
- [ ] EXPORT > PDF (Print-Ready)
  - Uses existing exportDesignAsPDF function
  - Dialog with options: page size, DPI, bleed, trim marks
  - (Enhance existing export if needed)
- [ ] EXPORT > PDF/X-1a (Professional Print)
  - Convert to PDF/X-1a format
  - CMYK color space
  - Flatten all layers
  - Validation before export
- [ ] EXPORT > SVG
  - Vector format for editing
  - Preserves all properties
- [ ] EXPORT > JSON
  - Technical handoff format
  - All design data
- [ ] EXPORT > PNG
  - Raster format at specified DPI
  - Transparent background option
- [ ] Export Dialog
  - Shows file name input
  - Shows format options
  - Shows quality/DPI settings
  - Preview of output

**Acceptance Criteria**:
- All export formats work correctly
- PDF/X-1a passes professional print requirements
- CMYK colors convert correctly
- File names are customizable
- Error handling for large files

---

## PHASE 3: Design Features (Weeks 7-9)
### Priority: Advanced features that differentiate

### Task 3.1: Smart Guides & Alignment
**Effort**: 24 hours  
**Dependencies**: Task 1.2  
**Complexity**: Medium  

**Deliverables**:
- [ ] Smart guides (visual alignment lines)
  - Show when dragging near other elements
  - Show distance between elements
  - Show alignment with canvas edges
- [ ] Snap distance control
  - Default 8px
  - Configurable in settings
- [ ] Align menu in FORMAT (Task 2.5)
  - Align Left, Center, Right
  - Align Top, Center, Bottom
- [ ] Distribute evenly (multiple selections)
  - Distribute H evenly
  - Distribute V evenly

**Acceptance Criteria**:
- Smart guides appear at correct positions
- Snapping is smooth and predictable
- All alignment operations work
- Guides don't interfere with other functionality

---

### Task 3.2: Color System & Brand Palette
**Effort**: 20 hours  
**Dependencies**: Task 1.4  
**Complexity**: Low  

**Deliverables**:
- [ ] Create brand palette manager
  - Save up to 10 custom colors
  - Named swatches (Primary, Secondary, Accent, etc.)
  - Color picker with save-to-palette
- [ ] CMYK color support
  - Toggle between RGB/Hex and CMYK
  - CMYK conversion algorithm
  - CMYK export in PDFs
- [ ] Color accessibility checker
  - Warn if contrast ratio < 4.5:1 for text
  - Suggest adjustments
- [ ] Apply palette to entire design
  - One-click theme application
  - All compatible colors update

**Acceptance Criteria**:
- Brand palette saves/loads correctly
- CMYK conversions accurate
- Color accessibility warnings display
- No data loss on theme switch

---

### Task 3.3: Typography System
**Effort**: 32 hours  
**Dependencies**: Task 1.4, 2.5  
**Complexity**: Medium  

**Deliverables**:
- [ ] Expand font library
  - Add 50+ Google Fonts
  - Custom font upload capability
  - Font preview in dropdown
- [ ] Typography presets
  - Heading 1, Heading 2, Body, Caption
  - Save custom presets
  - Apply preset to selected text
- [ ] Font pairing suggestions
  - When selecting font, suggest complementary fonts
  - Pairings curated for food/menu design
- [ ] Advanced typography controls
  - Kerning adjustments
  - Tracking (letter spacing)
  - All existing controls

**Acceptance Criteria**:
- 50+ fonts load without lag
- Custom fonts work properly
- Presets save and apply correctly
- Font pairing suggestions are sensible
- Typography controls responsive

---

### Task 3.4: Image Editing Tools
**Effort**: 40 hours  
**Dependencies**: Task 1.4  
**Complexity**: High  

**Deliverables**:
- [ ] Crop tool
  - Click crop button on image
  - Draw crop region
  - Accept/cancel
  - Aspect ratio lock (optional)
- [ ] Image filters
  - Brightness, Contrast, Saturation
  - Hue rotation
  - Blur
  - Grayscale
  - Sepia (optional)
- [ ] Color correction
  - Exposure
  - Highlights/Shadows
  - Temperature (warm/cool)
- [ ] Mask tool (shape masks)
  - Circle mask
  - Rounded rectangle mask
  - Custom polygon mask
  - Feathering
- [ ] Image library integration
  - Search gallery by name
  - Upload new images to gallery

**Acceptance Criteria**:
- All tools work smoothly
- Changes preview in real-time
- Undo/redo works for all changes
- No performance degradation
- Library integration seamless

---

### Task 3.5: Multi-Output Export (Menu → Poster → Table Tent)
**Effort**: 48 hours  
**Dependencies**: Task 2.6, 3.1  
**Complexity**: High  

**Deliverables**:
- [ ] Multi-output export dialog
  - Checkbox: Full Menu
  - Checkbox: Table Tent
  - Checkbox: Poster
  - Checkbox: Social Media (Instagram, Facebook)
  - Checkbox: Email Header
- [ ] Auto-resize layouts
  - Full menu: 8.5" × 11"
  - Table tent: 3.5" × 5.5" (folded)
  - Poster: 11" × 17"
  - Instagram: 1080 × 1080px
  - Email: 600px wide
- [ ] Auto-rearrange elements
  - Remove/adjust elements for each format
  - Maintain key branding/typography
  - Option to customize per format
- [ ] Batch export
  - Download all formats as ZIP
  - Named appropriately (menu.pdf, poster.pdf, etc.)

**Acceptance Criteria**:
- All formats export correctly
- Element rearrangement preserves design intent
- ZIP download works
- No data loss in conversion
- File names sensible

---

## PHASE 4: LUCCCA Integration (Weeks 10-11)
### Priority: Connect to EchoRecipePro data

### Task 4.1: Price Auto-Sync from EchoRecipePro
**Effort**: 16 hours  
**Dependencies**: Task 2.4  
**Complexity**: Medium  

**Deliverables**:
- [ ] Create API hook: `useRecipePrice(dishId)`
  - Fetches price from EchoRecipePro
  - Real-time updates
  - Caching
- [ ] Menu-item element enhancement
  - Bind to recipe/dish
  - Auto-fetch price
  - Currency formatting
  - Update when recipe price changes
- [ ] INSERT > Dish Auto-Insert dialog
  - Search recipes by name
  - Select recipe
  - Auto-populate name, price, description
  - Insert as menu item
- [ ] Settings to disable auto-sync (allow manual override)

**Acceptance Criteria**:
- Prices sync correctly from EchoRecipePro
- Manual override works
- Updates in real-time
- No API spam (efficient caching)

---

### Task 4.2: Allergen Icons & Auto-Insert
**Effort**: 12 hours  
**Dependencies**: Task 2.4, 4.1  
**Complexity**: Low  

**Deliverables**:
- [ ] Create allergen icon library
  - Tree nuts, peanuts, dairy, gluten, shellfish, soy, sesame, fish
  - Small icon set (16px, 24px, 32px)
- [ ] Auto-detect from recipe allergens
  - Hook: `useRecipeAllergens(dishId)`
  - Fetch from EchoRecipePro
- [ ] INSERT > Allergen Icons menu
  - Show checklist of all allergens
  - Icon preview
  - Insert selected icons
- [ ] Auto-insert on menu item
  - Optional setting: "Auto-add allergen icons"
  - Positions icons next to price/name

**Acceptance Criteria**:
- Icon library complete and professional
- Auto-detection works
- Icons position correctly
- Manual selection works

---

### Task 4.3: Dish Description Auto-Pull
**Effort**: 8 hours  
**Dependencies**: Task 4.1  
**Complexity**: Low  

**Deliverables**:
- [ ] Hook: `useRecipeDescription(dishId)`
  - Fetches description from EchoRecipePro
  - Real-time updates
- [ ] Menu item enhancement
  - Auto-fill description field
  - Show dish notes from recipe
  - Optional: show ingredients list
- [ ] Character limit for menu fit
  - Warn if too long for space
  - Suggest truncation

**Acceptance Criteria**:
- Descriptions pull correctly
- Updates in real-time
- Truncation works and looks good

---

### Task 4.4: Category Auto-Layout (Appetizers, Entrées, etc.)
**Effort**: 20 hours  
**Dependencies**: Task 3.1, 4.1  
**Complexity**: Medium  

**Deliverables**:
- [ ] Create category templates
  - Appetizers
  - Soups & Salads
  - Entrées
  - Desserts
  - Beverages
- [ ] Auto-section layout
  - Fetch dishes by category from EchoRecipePro
  - Auto-arrange with section headers
  - Spacing and alignment
- [ ] AI-powered spacing balancer
  - Analyze text height per item
  - Adjust spacing to balance menu
  - Prevent orphan lines
- [ ] Manual override
  - Reorder items
  - Move between categories
  - Adjust spacing

**Acceptance Criteria**:
- Categories organize correctly
- Spacing is balanced
- Manual edits work
- No overlapping text

---

## PHASE 5: UI Polish & Testing (Weeks 12-13)
### Priority: Professional finish

### Task 5.1: Design System Implementation
**Effort**: 24 hours  
**Dependencies**: All previous tasks  
**Complexity**: Medium  

**Deliverables**:
- [ ] Apply design tokens throughout
  - Colors: all components updated
  - Spacing: consistent padding/margins
  - Typography: size scale applied
  - Shadows: elevation system implemented
  - Border radius: rounded corners consistent
- [ ] Dark mode fully functional
  - All components have dark variants
  - No white text on white (accessibility)
  - Proper contrast ratios
- [ ] Glassmorphism effects
  - Floating panels (if any remain)
  - Modals
  - Tooltips
- [ ] Animations
  - 150ms transitions on hover
  - Smooth slide-in for panels
  - Zoom effect on selection
  - Loading spinner animation

**Acceptance Criteria**:
- Design system consistently applied
- Dark mode passes WCAG AA
- All animations smooth (60fps)
- No jarring color changes

---

### Task 5.2: Accessibility (A11y) Audit
**Effort**: 16 hours  
**Dependencies**: Task 5.1  
**Complexity**: Medium  

**Deliverables**:
- [ ] Keyboard navigation
  - Tab through all interactive elements
  - Shift+Tab for reverse
  - Enter/Space to activate buttons
  - Escape to close modals
- [ ] Focus indicators
  - 2px cyan outline on all focusable elements
  - Visible at all times
- [ ] Color contrast
  - All text > 4.5:1 ratio for normal text
  - > 3:1 for large text
  - Verify with accessibility checker
- [ ] ARIA labels
  - All buttons have aria-label
  - Form inputs have labels
  - Modals have aria-modal
- [ ] Screen reader support
  - Test with NVDA/JAWS on Windows
  - Test with VoiceOver on Mac
  - All content accessible

**Acceptance Criteria**:
- WCAG 2.1 Level AA compliance
- All keyboard shortcuts discoverable
- Focus indicators visible
- Screen reader testing passes

---

### Task 5.3: Comprehensive Testing
**Effort**: 40 hours  
**Dependencies**: All components complete  
**Complexity**: Medium  

**Deliverables**:
- [ ] Unit tests
  - All hooks (useDesignerState, etc.)
  - All components (>80% coverage)
  - All utility functions
- [ ] Integration tests
  - Create design workflow
  - Edit elements
  - Save/load
  - Export PDF, SVG, JSON
  - Undo/redo
- [ ] E2E tests (Playwright)
  - Full design workflow
  - All menu operations
  - All keyboard shortcuts
  - All export formats
- [ ] Performance tests
  - 100+ elements on canvas
  - Large image handling
  - Zoom performance
  - Memory usage
- [ ] Browser testing
  - Chrome, Firefox, Safari, Edge
  - Latest 2 versions
  - Mobile browsers

**Acceptance Criteria**:
- >80% code coverage
- All E2E tests pass
- Performance > 60fps
- All browsers pass
- No console errors

---

### Task 5.4: Documentation & Onboarding
**Effort**: 20 hours  
**Dependencies**: All complete  
**Complexity**: Low  

**Deliverables**:
- [ ] User documentation
  - Features guide (PDF)
  - Video tutorials (5-8 videos)
  - FAQ
  - Troubleshooting guide
- [ ] Developer documentation
  - Component API docs
  - Hook usage examples
  - Extension guide
  - Architecture overview
- [ ] Keyboard shortcuts reference
  - Print-friendly cheat sheet
  - In-app help (Cmd+?)
  - Tooltip on hover
- [ ] Onboarding flow
  - First-time user walkthrough
  - Tutorial on key features
  - Template suggestions

**Acceptance Criteria**:
- All documentation complete
- Videos professional quality
- FAQs cover common issues
- Developer docs are clear

---

# SECTION 6: TIMELINE & RESOURCE ALLOCATION

## Estimated Timeline

```
PHASE 1 (Weeks 1-3):    Foundation                 144 hours
PHASE 2 (Weeks 4-6):    Menu Functionality         168 hours
PHASE 3 (Weeks 7-9):    Advanced Features          200 hours
PHASE 4 (Weeks 10-11):  LUCCCA Integration          56 hours
PHASE 5 (Weeks 12-13):  Polish & Testing           100 hours
─────────────────────────────────────────────
TOTAL:                                             668 hours

At 40 hours/week per engineer:
- 1 engineer: 16.7 weeks (4+ months)
- 2 engineers: 8.4 weeks (2+ months) ← RECOMMENDED
- 3 engineers: 5.6 weeks (1.5+ months)
```

## Recommended Team

```
1. Senior React Engineer (50% allocation)
   - Component architecture
   - Performance optimization
   - Design system implementation
   - Lead code review

2. Full-Stack Engineer (100% allocation)
   - Most feature development
   - LUCCCA API integration
   - Testing infrastructure
   - Documentation

3. QA/Testing Engineer (50% allocation, starting Week 5)
   - Test planning
   - E2E testing
   - Browser testing
   - Accessibility audit
```

## Milestone Breakdown

```
Week 3:   Phase 1 complete - all refactoring done
Week 6:   Phase 2 complete - all menus functional
Week 9:   Phase 3 complete - smart features working
Week 11:  Phase 4 complete - LUCCCA fully integrated
Week 13:  Phase 5 complete - ready for production
```

---

# SECTION 7: SUCCESS CRITERIA & LAUNCH CHECKLIST

## Before Production Launch

```
☐ Design System
  ☐ All design tokens applied (colors, spacing, typography)
  ☐ Dark mode fully functional
  ☐ Glassmorphism effects implemented
  ☐ Animations smooth and professional

☐ Functionality
  ☐ All menu items functional (FILE, EDIT, VIEW, INSERT, FORMAT, EXPORT)
  ☐ Canvas operations smooth (drag, resize, rotate, etc.)
  ☐ Undo/redo working for all operations
  ☐ Save/load reliable
  ☐ All export formats working
  ☐ LUCCCA integration complete

☐ Performance
  ☐ Canvas smooth with 100+ elements
  ☐ 60+ FPS animations
  ☐ <500ms response to user actions
  ☐ Zoom/pan responsive
  ☐ Memory usage reasonable

☐ Accessibility
  ☐ WCAG 2.1 Level AA compliance
  ☐ Keyboard navigation complete
  ☐ Screen reader compatible
  ☐ Color contrast verified
  ☐ Focus indicators visible

☐ Testing
  ☐ >80% code coverage
  ☐ All E2E tests pass
  ☐ All browsers tested
  ☐ No console errors
  ☐ Mobile responsiveness verified

☐ Documentation
  ☐ User guide complete
  ☐ Video tutorials created
  ☐ FAQ written
  ☐ Keyboard shortcuts documented
  ☐ Developer docs complete
```

---

**This comprehensive specification is ready to hand to your engineering team or Builder.io. All tasks are concrete, measurable, and have no stubs or placeholders.**
