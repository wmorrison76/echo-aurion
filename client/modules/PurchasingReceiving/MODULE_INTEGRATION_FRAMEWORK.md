# Module Integration Framework

A standardized framework for integrating complex feature modules (like Waste, IoT, Maestro, echoCoder) into the LUCCCA Ecosystem without requiring extensive rework.

**Status**: Proven methodology based on fixing Waste, IoT, Purchasing, and Maestro integrations.

---

## Quick Integration Checklist (30 minutes)

Use this before integrating any new module:

### Phase 1: Module Structure Validation (5 min)

- [ ] Module has a main entry point (`src/modules/{ModuleName}/index.tsx` or `index.ts`)
- [ ] All imports use correct path aliases (`@modules/`, `@shared/`, `@/`)
- [ ] No circular dependencies between module files
- [ ] No hardcoded paths or relative imports across module boundaries

### Phase 2: Context & Multi-Tenant Setup (10 min)

- [ ] Module **NEVER** imports from `useAuth()` for organization/outlet data
  - ❌ `const { organization } = useAuth()` (AuthContext doesn't have org data)
  - ✅ `const { organization, currentOutlet } = useMultiOutlet()`
- [ ] Pages/components check for both `organization` AND `currentOutlet` before rendering
- [ ] Module doesn't bypass MultiOutletContext initialization
- [ ] All API calls include both `organizationId` and `outletId` parameters

### Phase 3: Route & Page Integration (5 min)

- [ ] Page is added to `client/App.tsx` routes (check imports are lazy)
- [ ] Page is added to navigation config in `AppLayout.tsx` (if user-facing)
- [ ] Page component is named correctly: `{ModuleName}Page` or `{ModuleName}` in default export
- [ ] No naming conflicts with existing routes

### Phase 4: Sidebar/Navigation Check (5 min)

- [ ] If module needs sidebar: explicitly mentioned in requirements
- [ ] Current AppLayout uses horizontal navigation only (no left sidebar)
- [ ] If sidebar needed: coordinate with design system first
- [ ] Update AppLayout navigation config if adding new menu items

### Phase 5: Testing & Validation (5 min)

- [ ] Module loads without "Organization not found" error
- [ ] Module renders with default organization/outlet initialized
- [ ] Hard refresh clears any stale state
- [ ] Check browser console for import/type errors

---

## Common Integration Issues & Fixes

### Issue 1: "Organization not found" Error

**Root Cause**: Module page checks `useAuth().organization` instead of `useMultiOutlet().organization`

**Fix**:

```typescript
// ❌ WRONG
const { organization } = useAuth();

// ✅ CORRECT
const { organization, currentOutlet } = useMultiOutlet();

// Always check BOTH
if (!organization || !currentOutlet) {
  return <LoadingOrErrorState />;
}
```

**Why**:

- `AuthContext` only manages user/role state
- `MultiOutletContext` manages organization/outlet hierarchy
- MultiOutletContext auto-initializes with defaults on first load

---

### Issue 2: Module Doesn't Load on Fresh Install

**Root Cause**: No default organization/outlets in localStorage

**Fix**: Already implemented in `MultiOutletContext.tsx`

The provider now auto-creates:

```typescript
{
  id: "luccca-main",
  name: "LUCCCA Ecosystem",
  tier: "enterprise",
  outlets: [
    {
      id: "outlet-flagship",
      name: "Flagship Location",
      type: "restaurant",
      // ... location, seats, covers, status
    }
  ]
}
```

**No additional code needed** - just use `useMultiOutlet()` correctly.

---

### Issue 3: Import Path Resolution Failures

**Root Cause**: Incorrect path aliases or circular imports

**Check these**:

```typescript
// ✅ Correct imports
import { useMultiOutlet } from "@/context/MultiOutletContext";
import { OrderGuidePanel } from "@modules/PurchRec/components/OrderGuidePanel";
import type { Organization } from "@/context/MultiOutletContext";

// ❌ Wrong imports (will fail)
import { Organization } from "@context/MultiOutletContext"; // Missing @ prefix
import OrderGuidePanel from "@modules/PurchRec/components"; // Missing full path
```

**Vite aliases in use**:

- `@/` → `./client/`
- `@shared/` → `./shared/`
- `@modules/` → `./src/modules/`

---

### Issue 4: Fast Refresh / HMR Errors During Development

**Message**: "Could not Fast Refresh - 'true' export is incompatible"

**Why**: Vite React SWC plugin limitation with module-level `createRoot()` calls

**Solution**: Just restart the dev server (`npm run dev`)

```bash
# This error is cosmetic during development
# Just hard-refresh the browser after restart
```

---

## Module Architecture Pattern

### Recommended File Structure

```
src/modules/{ModuleName}/
  ├── index.tsx                    # Main entry point (REQUIRED)
  ├── components/
  │   ├── PanelA.tsx
  │   ├── PanelB.tsx
  │   └── index.ts                 # Barrel export
  ├── hooks/
  │   ├── useModuleData.ts
  │   └── index.ts
  ├── services/
  │   ├── api.ts
  │   └── index.ts
  ├── types/
  │   ├── models.ts
  │   └── index.ts
  └── utils/
      └── helpers.ts
```

### Minimal Module Entry Point

```typescript
// src/modules/{ModuleName}/index.tsx
export { ModulePanel } from "./components/ModulePanel";
export type { ModuleConfig } from "./types/models";
```

### How to Use the Module

```typescript
// client/pages/{ModuleName}.tsx
import { useMultiOutlet } from "@/context/MultiOutletContext";
import { ModulePanel } from "@modules/{ModuleName}";

export default function ModulePage() {
  const { organization, currentOutlet } = useMultiOutlet();

  if (!organization || !currentOutlet) {
    return <AppLayout><div>Loading...</div></AppLayout>;
  }

  return (
    <AppLayout>
      <ModulePanel
        organizationId={organization.id}
        outletId={currentOutlet.id}
      />
    </AppLayout>
  );
}
```

---

## Pre-Integration Questions

Ask these questions BEFORE starting integration:

1. **Does the module need organization/outlet data?**
   - YES → Use `useMultiOutlet()` hook
   - NO → Still use it for consistency

2. **Does the module have a left sidebar?**
   - YES → This is NOT supported in current AppLayout (coordinate redesign first)
   - NO → Can integrate immediately

3. **Does the module have external dependencies?**
   - YES → Check if they're already in package.json
   - NO → Good to go

4. **Does the module make API calls?**
   - YES → Ensure all calls include `organizationId` and `outletId` for row-level security
   - NO → Good to go

5. **Is the module dev tool or user-facing?**
   - Dev tool (like echoCoder) → May need special UI/UX treatment
   - User-facing → Standard integration path

---

## Integration Workflow

### Step 1: Pre-Flight Check (5 min)

```bash
# Clone module into src/modules/{ModuleName}
# Review answers to "Pre-Integration Questions" above
# Check module's index.tsx exports
```

### Step 2: Add Route (2 min)

```typescript
// In client/App.tsx
const {ModuleName} = lazy(() => import("./pages/{ModuleName}"));

// In <Routes> section
<Route path="/{module-path}" element={<{ModuleName} />} />
```

### Step 3: Create Page (3 min)

```typescript
// client/pages/{ModuleName}.tsx (copy template from Waste or IoT pages)
export default function {ModuleName}Page() {
  const { organization, currentOutlet } = useMultiOutlet();

  if (!organization || !currentOutlet) {
    return <AppLayout><div>Loading...</div></AppLayout>;
  }

  return <AppLayout>/* Module UI */</AppLayout>;
}
```

### Step 4: Add Navigation (1 min)

```typescript
// In client/components/AppLayout.tsx navConfig
{
  type: "link",
  to: "/{module-path}",
  label: "{Module Name}",
  pill: true
}
```

### Step 5: Test (5 min)

- [ ] Navigate to route
- [ ] Check console for errors
- [ ] Verify data loads
- [ ] Hard refresh browser

---

## Success Criteria

✅ Module is considered successfully integrated when:

1. Route loads without console errors
2. Organization and outlet data are available
3. All API calls work with organization/outlet context
4. Hard refresh shows no stale state
5. Navigation item is accessible (if user-facing)
6. No "Organization not found" errors on first load

---

## Post-Integration Maintenance

### If module shows "Organization not found":

1. Check: Is page importing from `useAuth()` or `useMultiOutlet()`?
2. Check: Does page check for `currentOutlet` in addition to `organization`?
3. Fix and test

### If module has import errors:

1. Verify all imports use correct path aliases
2. Check for circular dependencies with `npm ls` or manual review
3. Verify module's index.tsx exports all required components

### If sidebar/special UI is needed:

1. Current AppLayout doesn't support sidebars (only horizontal nav)
2. Coordinate with design system before building UI
3. May need AppLayout refactor (estimate: 4-6 hours)

---

## Modules Integrated Using This Framework

✅ **Waste Tracking** - 2024, no rework needed
✅ **IoT/RFID Pilot** - 2024, no rework needed  
✅ **Purchasing/PurchRec** - 2024, working correctly
✅ **Maestro Committee** - 2024, working correctly

**Next modules eligible**: echoCoder, (4 others pending requirements)

---

## Questions & Troubleshooting

**Q: Can I store org/outlet data in a different context?**
A: No. MultiOutletContext is the single source of truth. All modules must use it.

**Q: What if my module needs sidebar navigation?**
A: Current AppLayout doesn't support sidebars. Open an issue for design review first.

**Q: Can I import directly from AuthContext for organization?**
A: No. AuthContext doesn't have organization data. Use MultiOutletContext.

**Q: How do I test without being logged in?**
A: MultiOutletContext auto-initializes with default organization on app load. No login needed.

**Q: Can modules be lazily loaded?**
A: Yes, use React.lazy() in the page. See example in Purchasing.tsx.

---

## Quick Reference Card

```typescript
// DON'T DO THIS
❌ const { organization } = useAuth();

// DO THIS INSTEAD
✅ const { organization, currentOutlet } = useMultiOutlet();

// ALWAYS CHECK BOTH
✅ if (!organization || !currentOutlet) return <LoadingState />;

// PASS BOTH TO COMPONENTS
✅ <Component
     organizationId={organization.id}
     outletId={currentOutlet.id}
   />
```

---

**Last Updated**: 2024
**Maintained by**: Development Team
**Questions?** Check existing module integrations (Waste, IoT) for real-world examples.
