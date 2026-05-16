# Cake Designer & EchoCanvas Integration Guide for LUCCCA

## Overview

The **Cake Designer** is a standalone module that can be launched from LUCCCA's sidebar and runs alongside (or instead of) EchoCanvas as a floating panel. It provides a complete cake design, pricing, and order management system with:

- 5-step client intake form
- 3D cake visualization
- Tier/size management
- Flavor & frosting selection
- Pricing matrix with cost breakdowns
- Allergen & dietary management
- Delivery scheduling
- Yield calculation

## Architecture

### Current State (Editor Integration - Development)
```
EchoCanvas Editor
  └─ Right Panel
      └─ Cake Designer Button
          └─ Opens ResizableDraggablePanel
              └─ IntakePrescreen (first load)
              └─ CakeStudio (design interface)
```

### LUCCCA Integration (Production)
```
LUCCCA Sidebar
  ├─ Project Manager
  ├─ Design Studio
  └─ Cake Designer ← New
      └─ Opens ResizableDraggablePanel (floating)
          ├─ EchoCanvas runs in background (paused/minimal)
          └─ Cake Designer has full focus
```

## Files Involved

### Core Module
- `client/modules/cake-builder/` - Complete Cake Designer module
  - `CakeStudio.tsx` - Main design interface
  - `IntakePrescreen.tsx` - Client intake form (5 steps)
  - `AllergenManager.tsx` - Allergen/dietary tracking
  - `AdvancedPricing.tsx` - Cost breakdown & pricing matrix
  - `DeliveryScheduler.tsx` - Prep/delivery timeline
  - `YieldCalculator.tsx` - Guest count scaling
  - `types.ts` - Type definitions
  - `logic.ts` - Cake math (servings, pricing, tiers)
  - `settings.ts` - Settings management
  - And 8+ UI components

### Floating Panel Component
- `client/components/floating/ResizableDraggablePanel.tsx` - Draggable/resizable container
- `client/components/floating/CakeDesignerPanel.tsx` - Cake Designer wrapper with intake-first flow

### Editor Integration (Development)
- `client/pages/Editor.tsx` - Added button to launch floating panel

## How to Launch from LUCCCA

### Option 1: Sidebar Button (Recommended)
```tsx
// In LUCCCA's sidebar or menu component
import CakeDesignerPanel from "@/components/floating/CakeDesignerPanel";

export function LuccaaSidebar() {
  const [cakeDesignerOpen, setCakeDesignerOpen] = useState(false);

  return (
    <>
      <button onClick={() => setCakeDesignerOpen(true)}>
        🍰 Cake Designer
      </button>

      <CakeDesignerPanel
        isOpen={cakeDesignerOpen}
        onClose={() => setCakeDesignerOpen(false)}
        onMinimize={() => {
          // In LUCCCA: minimize to dock
          // setCakeDesignerMinimized(true);
          setCakeDesignerOpen(false);
        }}
      />
    </>
  );
}
```

### Option 2: Direct Component Import
```tsx
import CakeDesignerPanel from "@/components/floating/CakeDesignerPanel";

// In your LUCCCA page/module
<CakeDesignerPanel
  isOpen={true}
  onClose={handleClose}
  onMinimize={handleMinimize}
/>
```

## Key Features

### 1. Floating Panel Behavior
- **Draggable** by header (grab icon in header)
- **Resizable** from all 8 edges (N, S, E, W, NE, NW, SE, SW)
- **Minimize button** - minimizes the panel (in LUCCCA, this docks it)
- **Close button** - closes/returns to EchoCanvas
- **Backdrop** - semi-transparent overlay (dismissible by clicking)
- **Min size** - 500px × 400px (configurable)
- **Default position** - 200px from left, 100px from top

### 2. Intake-First UX
- Opens with 5-step intake form
- Form guides client through:
  1. Event basics (occasion, date, guest count)
  2. Cake preferences (shape, tiers, flavors)
  3. Dietary/allergies
  4. Delivery & order terms
  5. Summary review
- After completion → proceeds to CakeStudio
- "Back to Intake" button allows returning to form

### 3. Full Design Studio
Once intake is complete:
- Real-time 3D cake preview
- 4 main design tabs: General, Tiers, Frosting, Advanced
- Save designs to gallery
- Access to advanced features:
  - Allergen manager (severe allergy warnings)
  - Yield calculator (guest count → tier recommendations)
  - Advanced pricing (cost breakdown, complexity surcharges)
  - Delivery scheduler (auto-calculates prep dates)
  - Recipe manager
  - Order form

## Integration Checklist for Builders

- [ ] Import `CakeDesignerPanel` in LUCCCA sidebar/menu component
- [ ] Add state for `cakeDesignerOpen` (boolean)
- [ ] Create button/menu item that opens panel
- [ ] Wire up `onClose` to handle panel dismissal
- [ ] Wire up `onMinimize` to dock panel in LUCCCA (if applicable)
- [ ] Test floating panel behavior (drag, resize, minimize)
- [ ] Test intake form flow
- [ ] Test cake design interface
- [ ] Test that EchoCanvas remains accessible in background
- [ ] (Optional) Style button to match LUCCCA theme

## EchoCanvas Background Behavior

### In Editor (Current)
- EchoCanvas remains fully functional
- Cake Designer is an overlay on the right panel
- User can switch between Editor and Cake Designer

### In LUCCCA (Recommended)
- EchoCanvas is **paused/idle** (no editing while Cake Designer is open)
- User can click "Close" to return to EchoCanvas
- Cake Designer panel is the primary interface

To implement:
```tsx
// In LUCCCA, optionally disable EchoCanvas when Cake Designer opens
<div style={{ opacity: cakeDesignerOpen ? 0.5 : 1, pointerEvents: cakeDesignerOpen ? "none" : "auto" }}>
  <EchoCanvas />
</div>

<CakeDesignerPanel isOpen={cakeDesignerOpen} />
```

## Data Flow

### Intake Form → Design Studio
```
IntakePrescreen (form submission)
  ↓
handleIntakeComplete(answers)
  ↓
setIntakeData(answers)
  ↓
setScreen("studio")
  ↓
CakeStudio renders with context from intake
```

### Design Studio → Save
```
CakeStudio (user designs cake)
  ↓
handleSaveDesign()
  ↓
onSave(design, name) callback
  ↓
Send to backend / save to user account
```

## Configuration

### Resizable Panel Props
```tsx
<ResizableDraggablePanel
  title="🍰 Cake Designer"
  onClose={handleClose}
  onMinimize={handleMinimize}
  defaultPosition={{ x: 200, y: 100, width: 800, height: 700 }}
  minWidth={500}  // Minimum width in pixels
  minHeight={400} // Minimum height in pixels
>
  {children}
</ResizableDraggablePanel>
```

### Customization Points
- **Position**: Adjust `defaultPosition` values
- **Size**: Adjust `minWidth` / `minHeight`
- **Title**: Customize `title` prop
- **Colors**: Edit ResizableDraggablePanel.tsx header styling (#00f0ff cyan theme)
- **Initial screen**: Change `useState("intake")` to `useState("studio")` to skip intake

## Performance Considerations

- **Lazy loading**: CakeStudio uses React.lazy for code splitting
- **Canvas rendering**: 3D preview uses HTML5 canvas (optimized)
- **State management**: All state is local to component (no Redux needed)
- **localStorage**: Persists orders, recipes, settings locally

## Future Enhancements

- [ ] Dock to LUCCCA taskbar when minimized
- [ ] Full-screen toggle (expand to max viewport)
- [ ] Save designs to cloud (Supabase integration)
- [ ] Sync with EchoCanvas canvas
- [ ] Export design as image/PDF
- [ ] Share design via link
- [ ] Real-time order status tracking
- [ ] Payment integration

## Support & Debugging

### Common Issues

**Panel won't open:**
- Ensure `cakeDesignerOpen` state is true
- Check browser console for import errors
- Verify all module imports are correct

**IntakePrescreen doesn't submit:**
- Check form validation (all required fields filled)
- Ensure `onComplete` callback is wired correctly
- Check browser console for errors

**Cake preview blank:**
- Ensure ThreeCake.tsx canvas is rendering
- Check browser DevTools → Elements → Canvas
- Verify CSS isn't hiding the canvas

**Performance issues:**
- Reduce refresh rate on 3D preview
- Profile with Chrome DevTools → Performance
- Consider lazy loading CakeStudio

## Code Example

```tsx
// LUCCCA Integration Template
import React, { useState } from "react";
import CakeDesignerPanel from "@/components/floating/CakeDesignerPanel";

export default function LuccaaDashboard() {
  const [cakeDesignerOpen, setCakeDesignerOpen] = useState(false);

  return (
    <div className="luccaa-dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <nav>
          <button>📁 Projects</button>
          <button>🎨 Design Studio</button>
          <button 
            onClick={() => setCakeDesignerOpen(true)}
            style={{ color: cakeDesignerOpen ? "#00f0ff" : "#666" }}
          >
            🍰 Cake Designer
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <main>
        {/* EchoCanvas or other content */}
      </main>

      {/* Floating Cake Designer Panel */}
      <CakeDesignerPanel
        isOpen={cakeDesignerOpen}
        onClose={() => setCakeDesignerOpen(false)}
        onMinimize={() => {
          console.log("Minimize triggered - dock to taskbar");
          setCakeDesignerOpen(false);
        }}
      />
    </div>
  );
}
```

## Questions?

For integration support:
1. Check this README
2. Review `client/components/floating/CakeDesignerPanel.tsx` comments
3. Check `client/modules/cake-builder/index.ts` exports
4. Review `client/pages/Editor.tsx` for implementation example

---

**Last Updated:** 2024  
**Status:** Production Ready
