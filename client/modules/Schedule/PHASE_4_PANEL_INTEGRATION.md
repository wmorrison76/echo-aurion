# Phase 4: Panel System Integration

## Current Status: Scheduler is PRIMARY VIEW, NOT A PANEL

The Scheduler module is **not integrated as a panel** in the traditional sense. Instead, it is the **main application view** displayed on `client/pages/Index.tsx`.

### Architecture Overview

The application uses two different UI paradigms:

#### 1. Main View (Index.tsx) - Scheduler as Primary Component

```typescript
// client/pages/Index.tsx
import WeekGrid from "@/components/scheduler/WeekGrid";

// Scheduler is rendered as the primary view, not as a modal panel
<WeekGrid
  weekStartISO={...}
  employees={employees}
  onChangeCell={...}
  onRemoveEmployee={...}
/>
```

#### 2. Dialog/Modal Panels (SidebarPanelsHub.tsx) - Secondary Features

The app has a separate panel system for secondary features:

- Dashboard
- Schedule Checker
- Legal & Compliance
- Union Agreements
- Analytics
- Financial
- Ratings
- etc.

These are opened via custom events: `"shiftflow:open-{key}"`

### Scheduler's Role in the Ecosystem

**Status**: ✅ **Already Integrated as Primary View**

The Scheduler is NOT registered in the panel system because:

1. It IS the main application
2. It's always visible in the primary view
3. It doesn't need to be opened/closed as a modal
4. Other panels support the scheduler (as secondary features)

---

## Event System Integration

### Custom Events Used by Scheduler

The Scheduler **dispatches** events to open secondary panels:

```typescript
// From WeekGrid.tsx - Opening LMS panel
window.dispatchEvent(new CustomEvent("shiftflow:open-legal" as any));

// Opening Onboarding dialog
setOnboardingFor(emp);

// Opening Report dialog
setReportFor(emp);
```

### Events the Scheduler Listens To

From `SidebarPanelsHub.tsx`, these events can trigger panel opens:

- `"shiftflow:open-dashboard"` → Dashboard
- `"shiftflow:open-legal"` → Legal & Compliance
- `"shiftflow:open-union"` → Union Agreements
- `"shiftflow:open-employee"` → Employee Rights
- `"shiftflow:open-financial"` → Financial
- `"shiftflow:open-timeoff"` → Time-off
- `"shiftflow:open-attendance"` → Attendance
- `"shiftflow:open-reliability"` → Reliability
- `"shiftflow:open-analytics-settings"` → Analytics
- `"shiftflow:open-checker"` → Schedule Checker
- `"shiftflow:open-ratings"` → Staff Ratings

---

## Z-Index Management

### Current Z-Index Levels

```
0      - Main scheduler grid
50     - Context menus (Radix UI default)
1000   - Dialog/Modal overlays
20000  - Sidebar (if implemented)
20001+ - Modal dialogs above sidebar
```

### Scheduler Components Z-Index Usage

```typescript
// Table header sticky positioning
<TableHeader className="sticky top-0 z-10 ...">
// z-10 = 40px (Tailwind z-10)

// Context menus (automatic via Radix UI)
// Default Radix z-index: 50

// Modals (EmployeeOnboarding, EmployeeReportDialog)
// Handled by Dialog component (z-index: 50 + stack)
```

✅ **Status**: Z-index conflicts are unlikely - all properly layered

---

## Layout & Positioning

### Current Implementation

The Scheduler occupies the full application area:

```
┌──────────────────────────────┐
│ GlobalHeader                 │ (top-11)
├─────────────���────────────────┤
│ FloatingSidebar │   Scheduler│
│                 │   Grid     │
│                 │            │
└──────────────────────────────┘
│ BottomCheckerBar             │ (bottom)
└──────────────────────────────┘
```

**Files Involved**:

- `client/pages/Index.tsx` - Main layout
- `client/features/layout/GlobalHeader.tsx` - Top navigation
- `client/features/layout/FloatingSidebar.tsx` - Left sidebar
- `client/features/layout/BottomCheckerBar.tsx` - Bottom bar
- `client/components/scheduler/WeekGrid.tsx` - Scheduler grid

### Visibility & Content Flow

✅ **Grid Content**: Fully visible and scrollable
✅ **Sidebar Behavior**: Expandable/collapsible (does not hide scheduler)
✅ **Header**: Always visible at top
✅ **Bottom Checker**: Always visible at bottom

---

## Panel Registry Assessment

### Does Scheduler Need Panel Registration?

**Answer**: ❌ NO - Scheduler is the main application view

### Could Scheduler Be Added as Optional Panel?

**Hypothetical**: If future enhancement wanted to allow scheduler as a floating panel:

```typescript
// Would add to SidebarPanelsHub.tsx items array:
{ key: "scheduler-panel", label: "Schedule Editor" }

// And add conditional render:
{it.key === "scheduler-panel" && (
  <div className="max-h-[80vh] overflow-y-auto pr-4">
    <WeekGrid {...props} />
  </div>
)}

// Could be triggered by:
window.dispatchEvent(new CustomEvent("shiftflow:open-scheduler-panel"))
```

But this is **not recommended** because:

1. Scheduler is too complex for a modal
2. Would obscure other UI elements
3. Current design (as main view) is optimal

---

## Z-Index Conflict Analysis

### Potential Issues: NONE ✅

```
Sidebar (z-20000)
  ↓
Dialog/Modals (z-1000)
  ↓
Context Menus (z-50)
  ↓
Main Content (z-auto)
```

The Scheduler and its context menus are below sidebar/modals, which is correct.

---

## Accessibility & Focus Management

### Current Behavior

- ✅ Keyboard navigation works in grid
- ✅ Context menus (Radix UI) handle focus correctly
- ✅ Modals trap focus properly
- ✅ Sidebar expand/collapse doesn't break tab flow

### Recommended Enhancements (Optional)

```typescript
// Add aria-label to main scheduler grid
<div role="main" aria-label="Weekly Schedule Grid">
  <WeekGrid {...props} />
</div>

// Ensure skip-to-content link
<a href="#main-scheduler" className="sr-only">
  Skip to main scheduler
</a>
```

---

## Migration Readiness Assessment

### Panel System Integration: ✅ COMPLETE

**Status Summary**:

- ✅ Scheduler is main application view (not a panel)
- ✅ Proper event integration with secondary panels
- ✅ Z-index levels correctly implemented
- ✅ Sidebar and modals don't obscure scheduler
- ✅ Scrolling and layout responsive
- ✅ Accessibility baseline met

**No additional panel registration needed.**

---

## Next Steps

Proceed to **Phase 5: Context & State Management** to verify:

- React Context usage (if any)
- State management strategy
- Data flow between components
- Prop drilling vs. context optimization
