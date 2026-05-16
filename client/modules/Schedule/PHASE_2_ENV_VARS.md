# Phase 2.2: Environment Variables Documentation & Validation

## Executive Summary

✅ **Status**: NO ENVIRONMENT VARIABLES REQUIRED for core scheduler functionality

The Scheduler module is self-contained and operates entirely with:

- Browser localStorage for data persistence
- In-memory React state for UI management
- Relative URLs for optional API calls (to existing endpoints)

---

## Current Environment Configuration

### Project-Level Variables (`.env`)

```
VITE_PUBLIC_BUILDER_KEY=__BUILDER_PUBLIC_KEY__
PING_MESSAGE="ping pong"
```

**For Scheduler**: Neither of these variables is used.

### TypeScript Environment Type

Located in `client/vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />
```

This auto-detects `VITE_*` prefixed variables at build time.

---

## Scheduler Module: Environment Variable Audit

### Core Scheduler Components

**Files Audited**:

- `client/components/scheduler/WeekGrid.tsx`
- `client/components/scheduler/DayCell.tsx`
- `client/components/scheduler/TimeRangeInput.tsx`

**Environment Variable Usage**: ❌ NONE

**localStorage Keys Used**:

```
shiftflow:schedule              # Main schedule state
shiftflow:settings              # App settings
shiftflow:leave                 # Leave records (PTO/sick)
shiftflow:leave:req             # Leave requests
shiftflow:timesheet             # Timesheet pool
```

**Build-Time Constants**: None

---

### Library Utilities

**Files Audited**:

- `client/lib/schedule.ts`
- `client/lib/leave.ts`
- `client/lib/timesheet.ts`

**Environment Variable Usage**: ❌ NONE

All data operations are performed in-memory or via localStorage.

---

### Optional: PublishTogglePanel Component

**File**: `client/components/scheduler/PublishTogglePanel.tsx`

**API Endpoints Called**:

```javascript
fetch("/api/publish/status?schedule_id=${schedule_id}")
fetch("/api/publish/publish", { method: "POST", ... })
fetch("/api/publish/reopen", { method: "POST", ... })
```

**Environment Variables Required**: ❌ NONE

**Why**: Uses relative URLs (e.g., `/api/...`) which resolve to the same-origin server. No API key or URL configuration needed.

**Note**: These endpoints must exist on the backend server (`server/api/routes/`)

---

## localStorage Configuration

### Key Namespace

All localStorage keys use the `shiftflow:` prefix to avoid conflicts.

### Data Persistence Strategy

```typescript
// Example from client/lib/leave.ts
const KEY = "shiftflow:leave";
const REQ_KEY = "shiftflow:leave:req";

function loadAll(): Store {
  try {
    const s = localStorage.getItem(KEY);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}
```

**Error Handling**: Gracefully falls back to empty state if localStorage unavailable

---

## Future Environment Variables (Not Currently Used)

If the scheduler module needs to be extended with cloud sync or analytics, these could be added:

### Recommended Naming Convention

```
VITE_SCHEDULER_API_BASE=https://api.example.com
VITE_SCHEDULER_API_KEY=abc123...          # If API requires authentication
VITE_ANALYTICS_ENABLED=true               # Feature flag
VITE_SCHEDULE_SYNC_ENABLED=true          # Enable cloud sync
VITE_TIMESHEET_WEBHOOK_URL=https://...   # For external webhooks
```

**Implementation Pattern**:

```typescript
const API_BASE = import.meta.env.VITE_SCHEDULER_API_BASE || "";
const API_KEY = import.meta.env.VITE_SCHEDULER_API_KEY || "";

if (!API_BASE) {
  console.warn("Scheduler: Cloud sync not configured");
  // Provide graceful degradation
}
```

---

## Validation & Testing

### Checklist: Environment Variable Validation ✅

- ✅ No required environment variables for core functionality
- ✅ All external APIs accessed via relative URLs
- ✅ localStorage configured with namespace prefix
- ✅ Error handling in place for missing localStorage
- ✅ No hardcoded API keys or secrets
- ✅ No missing variable checks needed (no variables required)

### Build-Time Validation

**Vite Configuration** (`vite.config.ts`):

```typescript
// Automatically loads .env files
export default defineConfig({
  define: {
    // Any env vars would be substituted here
  },
  // ...
});
```

**TypeScript Check**:

```bash
npm run typecheck
# Result: ✅ No environment variable type errors
```

### Runtime Validation

The module performs no runtime checks for environment variables, as none are required.

**localStorage Availability Check** (built-in):

```typescript
try {
  localStorage.setItem("test", "test");
  localStorage.removeItem("test");
  // localStorage available
} catch {
  // localStorage unavailable or full
  // Falls back to in-memory state
}
```

---

## localStorage Quota & Management

### Estimated Data Size

```
Schedule data per week:
- ~5 employees × 7 days × ~50 bytes/day = ~1.75 KB per week
- Stored weeks: 4-8 weeks = ~7-14 KB
- Leave records: ~2 KB
- Settings: ~100 bytes
- Total estimate: ~10-20 KB per user

localStorage quota:
- Chrome/Firefox: ~5-10 MB
- Safari: ~5 MB
- Edge: ~10 MB
```

✅ **Well within quota limits**

### Data Cleanup Strategy (Recommended)

```typescript
// Optional: Clean up schedules older than 12 weeks
const RETENTION_WEEKS = 12;
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - RETENTION_WEEKS * 7);
```

---

## Third-Party Service Integration

### Current Integrations

None - the module is fully self-contained.

### Optional Future Integrations

If integrated with external services:

**Supabase** (for cloud sync):

```
VITE_SUPABASE_URL=https://project.supabase.co
VITE_SUPABASE_ANON_KEY=abc123...
```

**Analytics** (e.g., Sentry):

```
VITE_SENTRY_DSN=https://key@sentry.io/project
```

**Timesheet Service** (e.g., Guidepoint):

```
VITE_TIMESHEET_API_URL=https://api.timesheet.example.com
VITE_TIMESHEET_API_KEY=...
```

---

## Configuration Management

### Environment-Specific Configs

Currently, no environment-specific configuration is needed.

**If needed in future**:

```typescript
// client/lib/config.ts (future enhancement)
export const CONFIG = {
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  apiBase: import.meta.env.VITE_SCHEDULER_API_BASE || "/api",
  // ... other settings
};
```

---

## Security Considerations

### ✅ No Secrets Exposed

- No API keys stored in component code
- No hardcoded URLs in components
- localStorage uses namespace prefix to avoid collisions
- All data is local to user's browser (not synced to server by default)

### Data Privacy

- Schedule data stays in user's browser localStorage
- No personal data sent to external services (unless user opts in via future cloud sync)
- Recommend implementing local data encryption for sensitive info (future enhancement)

### Recommended Security Enhancements

```typescript
// If implementing cloud sync:
1. Use HTTPS only for API calls
2. Implement authentication tokens
3. Add CORS validation
4. Encrypt sensitive localStorage data
5. Implement rate limiting on API calls
```

---

## Deployment Considerations

### Development Build

```bash
npm run dev
# No env vars needed
# localStorage data persists across dev sessions
```

### Production Build

```bash
npm run build
# No env vars needed
# All VITE_* vars compiled away (none used)
```

### Environment File (.env.example)

**Create for documentation only**:

```
# Scheduler Module - Environment Variables
# Note: No environment variables required for core functionality

# Future: If integrating with cloud services
# VITE_SCHEDULER_API_BASE=https://api.example.com
# VITE_SCHEDULER_API_KEY=your-api-key-here
# VITE_SCHEDULER_ENABLE_CLOUD_SYNC=false
```

---

## .env.local vs .env

### Development Setup

```bash
# .env (committed, public vars only)
VITE_PUBLIC_BUILDER_KEY=__BUILDER_PUBLIC_KEY__

# .env.local (NOT committed, sensitive vars - none for scheduler)
# (Empty - no sensitive vars needed)
```

### CI/CD Setup

No environment variables need to be configured for the scheduler module in CI/CD pipelines.

---

## Migration Checklist: Phase 2.2 ✅

- ✅ All environment variables documented (none required)
- ✅ localStorage keys documented
- ✅ Future variables recommended with naming convention
- ✅ No hardcoded secrets in code
- ✅ Error handling for missing localStorage
- ✅ Build-time configuration validated
- ✅ Runtime validation strategy defined
- ✅ Security considerations documented
- ✅ Deployment instructions clear

---

## Summary

### Current Status

The Scheduler module requires **ZERO environment variables** for operation.

### Advantages

✅ No environment configuration needed
✅ Works immediately after cloning
✅ No secrets to manage
✅ Smaller deployment footprint
✅ Easier testing and development

### If Future Enhancement Needed

Recommends using `VITE_SCHEDULER_*` prefix and following the pattern documented above.

---

## Next Steps

✅ Phase 2.2 Complete

Proceed to **Phase 3: Theme & Styling Integration** - Verify light/dark mode compatibility.
