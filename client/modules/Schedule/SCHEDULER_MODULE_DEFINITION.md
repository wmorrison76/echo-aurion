# Scheduler Module Pre-Migration Definition & Architecture

## Phase 1.1: Module Definition

### Purpose & Scope

The Scheduler module is a comprehensive workforce scheduling and timesheet management system for the LUCCCA ecosystem. It enables managers to create, track, and manage employee schedules on a weekly basis, including shift times, positions, break times, and leave requests.

### Key Features

1. **Weekly Schedule Grid** - Visual 7-day schedule view with all employees
2. **Shift Management** - Clock in/out times, flexible time parsing (9-5, 09:30-17:15, etc.)
3. **Position Tracking** - Job position/role per shift
4. **Break Management** - Unpaid break time tracking
5. **Tip Tracking** - Shift-level tip amounts
6. **Leave Request System** - PTO and sick leave requests with approval workflow
7. **Employee Roster** - Add/remove employees, manage roles and hourly rates
8. **Timesheet Integration** - Add employees to timesheet pool for processing
9. **Forecast Access Control** - Conditional access to forecast data
10. **Drag-and-drop Reordering** - Reorder employees in the grid
11. **Context Menus** - Quick actions for onboarding, reports, and LMS
12. **Week Navigation** - Previous/next week navigation

### Module Files

```
client/components/scheduler/
  ├── WeekGrid.tsx          # Main weekly schedule grid component
  ├── DayCell.tsx           # Individual day shift cell component
  ├── TimeRangeInput.tsx    # Time range input helper
  └── PublishTogglePanel.tsx # Publish control

client/lib/
  ├── schedule.ts           # Schedule data structures and utilities
  ├── leave.ts              # Leave management (PTO/sick)
  ├── timesheet.ts          # Timesheet pool management
  └── compliance.ts         # Audit logging

client/features/
  ├── standalone/
  │   ├── settings.ts       # Settings/configuration
  │   ├── SettingsGear.tsx  # Settings UI
  │   └── Toolbar.tsx       # Week navigation toolbar
  └── manager/
      ├── EmployeeOnboarding.tsx      # Employee onboarding modal
      └── EmployeeReportDialog.tsx    # Employee report viewer

client/components/schedule/
  └── ForecastAccessControl.tsx # Access control wrapper
```

---

## Phase 1.2: Architecture Review

### Module Structure Organization

✅ **Directory Structure**: `client/components/scheduler/` (PascalCase naming)
✅ **Component Organization**: Follows single-responsibility principle

- Main component: WeekGrid (container)
- Presentational component: DayCell (display)
- Helpers: TimeRangeInput, PublishTogglePanel

### Dependencies

#### External NPM Packages (from package.json)

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "lucide-react": "^0.539.0", // Icons
  "date-fns": "^4.1.0", // Date/time utilities
  "react-hook-form": "^7.62.0", // Form management (if needed)
  "@radix-ui/react-*": "^1.x.x", // UI component primitives
  "tailwindcss": "^3.4.17", // Styling
  "zod": "^3.25.76", // Type validation
  "@tanstack/react-query": "^5.84.2", // Data fetching (optional)
  "next-themes": "^0.4.6" // Theme management
}
```

#### Internal Module Dependencies

```
WeekGrid.tsx
├── @/components/ui/card (Card wrapper)
├── @/components/ui/table (Table structure)
├── @/components/ui/context-menu (Context menus)
├── @/components/scheduler/DayCell (Child component)
├── @/lib/schedule (Core data structures)
├── @/lib/leave (Leave request management)
├── @/lib/timesheet (Timesheet pool)
├── @/lib/compliance (Audit logging)
├── @/features/standalone/settings (App settings)
├── @/features/manager/EmployeeOnboarding (Modal dialog)
├── @/features/manager/EmployeeReportDialog (Modal dialog)
└── @/components/schedule/ForecastAccessControl (Access control)

DayCell.tsx
├── @/components/ui/input (Input component)
└── @/lib/leave (LeaveRequest type)
```

### Import Paths

Current implementation uses **absolute imports** (`@/...` paths):

- `@/components/ui/*` - Shadcn UI components
- `@/components/scheduler/*` - Scheduler-specific components
- `@/lib/*` - Shared utilities and data access
- `@/features/*` - Feature-specific components

**Status**: All absolute imports are properly resolved through TypeScript path aliases in `tsconfig.json` (alias `@/` maps to `client/`)

### TypeScript Types & Interfaces

**Core Data Structures** (from `client/lib/schedule.ts`):

```typescript
export type EmployeeId = string;
export type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export interface TimeRange {
  start: number; // minutes from 00:00
  end: number; // minutes from 00:00
}

export interface ShiftCell {
  value: string; // legacy raw input (e.g., "9-5")
  range: TimeRange | null; // derived parsed range
  in?: string; // explicit clock in
  out?: string; // explicit clock out
  position?: string; // job position
  breakMin?: number; // unpaid break minutes
  tip?: number; // shift tips
}

export interface EmployeeRow {
  id: EmployeeId;
  name: string;
  role?: string;
  rate?: number; // hourly rate for cost calculation
  shifts: Record<DayKey, ShiftCell>;
}

export interface ScheduleState {
  weekStartISO: string; // Monday ISO date
  employees: EmployeeRow[];
}
```

**Leave Structures** (from `client/lib/leave.ts`):

```typescript
export interface LeaveRecord {
  pto: number;
  sick: number;
}

export type LeaveType = "pto" | "sick";
export type LeaveStatus = "pending" | "approved" | "denied";

export interface LeaveRequest {
  type: LeaveType;
  hours: number;
  status: LeaveStatus;
  reason?: string;
}
```

### Zod Validation Schema

Located in `client/lib/schedule.ts`:

```typescript
export const ScheduleSchema = z.object({
  weekStartISO: z.string(),
  employees: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: z.string().optional(),
      rate: z.number().optional(),
      shifts: z.record(
        z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
        z.object({
          value: z.string(),
          range: z.object({ start: z.number(), end: z.number() }).nullable(),
        }),
      ),
    }),
  ),
});
```

---

## Environment Variables

### Current Configuration

Located in `.env`:

```
VITE_PUBLIC_BUILDER_KEY=__BUILDER_PUBLIC_KEY__
PING_MESSAGE="ping pong"
```

### Required for Scheduler Module

**None explicitly required** - The scheduler operates entirely with localStorage and in-memory state.

However, for future integrations:

```
# Potential future needs (not currently used):
# VITE_API_BASE_URL          # For cloud schedule sync
# VITE_TIMESHEET_API_KEY     # For timesheet processing
# VITE_PAYROLL_API_URL       # For payroll integration
```

### localStorage Keys Used

The module uses these localStorage keys:

```
shiftflow:schedule              # Main schedule state (all weeks)
shiftflow:settings              # User settings
shiftflow:leave                 # Leave records (PTO/sick balances)
shiftflow:leave:req             # Leave requests (pending/approved/denied)
shiftflow:timesheet             # Timesheet pool (employee IDs)
```

**Note**: These use the `shiftflow:` prefix to avoid conflicts with other modules.

---

## Potential Dependencies & Conflicts

### No Known Conflicts ✅

- No version conflicts with existing dependencies
- All imports use unique namespace (`shiftflow:` for localStorage)
- No global variable pollution
- No CSS class naming conflicts (uses Tailwind utilities)

### External Dependencies

1. **Browser localStorage** - Required for data persistence
2. **React Router** - For navigation (indirect)
3. **Tailwind CSS** - For styling
4. **Radix UI primitives** - For accessible components
5. **Lucide React** - For icons

### Optional Future Dependencies

- **API client** (axios/fetch) - For cloud sync
- **Zod** - Already imported for validation
- **Date-fns** - Already imported for date utilities

---

## Module-Specific Configuration

### Styling Constants

Located in components:

```typescript
// Zoom-aware sizing (accounts for --app-zoom: 1.5)
Input className: "!h-4 !text-[9px]"  // IN/OUT times
Input className: "!h-3 !text-[4px]"  // Position field

// Grid layout
TableCell: "min-w-12 p-0.5"           // Day columns
TableCell: "w-14 min-w-14 px-0.5"     // Employee column
```

### Feature Flags

No feature flags currently implemented.

### Theme Variables

Uses Tailwind/next-themes:

```css
text-foreground
bg-background
border-border
text-muted-foreground
```

---

## Summary: Ready for Phase 2 ✅

Phase 1 Analysis Complete:

- ✅ Module purpose clearly defined
- ✅ All dependencies documented
- ✅ No environment variables required (self-contained)
- ✅ No naming conflicts or collision issues
- ✅ Proper TypeScript types and interfaces
- ✅ Clear file organization and structure

**Status**: Ready to proceed to Phase 2 - Import Path Resolution and further integration checks.
