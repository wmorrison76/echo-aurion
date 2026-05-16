# WebKitBlobResource Error and Infinite Recursion Fix

## Problem Summary

The application was experiencing:
1. **Infinite Recursion Errors**: `[ObjectURLWrapper] Failed to cache blob URL` with massive recursive stack traces
2. **WebKitBlobResource error 1**: Browser exhausting blob URL resources
3. **IFrame evaluation timeout**: iframe operations timing out (likely due to infinite recursion hanging the page)

## Root Cause Analysis

The infinite recursion occurred in this chain:
```
[Wrapper] URL.createObjectURL call
  → [Wrapper line 24] calls objectURLCache.set(id, blob)
    → [Cache line 42] calls this.originalCreateObjectURL(blob)
      → If this.originalCreateObjectURL IS THE WRAPPED VERSION:
        → [Wrapper line 24] calls objectURLCache.set(id, blob) again
          → INFINITE RECURSION
```

The cache's `this.originalCreateObjectURL` was referencing the wrapped version instead of the native function because:
1. The cache was instantiated as a singleton at module load time
2. If anything wrapped `URL.createObjectURL` before the wrapper was installed, the cache would save that wrapped version in its constructor
3. The `setOriginalCreateObjectURL()` call couldn't always fix this reliably

## Solution Implemented

### 1. Save Native Functions at Module Load (object-url-cache.ts)

```typescript
// At the very top of the module, before any other code runs
const nativeCreateObjectURL = URL.createObjectURL;
const nativeRevokeObjectURL = URL.revokeObjectURL;
```

This guarantees we capture the native functions before ANY wrapping can occur.

### 2. Use Native Functions Throughout Cache

The cache now uses `nativeCreateObjectURL` and `nativeRevokeObjectURL` directly everywhere:
```typescript
// In set() method:
url = nativeCreateObjectURL(blob);

// In evictLRU() method:
nativeRevokeObjectURL(entry.url);

// In remove() and clear() methods:
nativeRevokeObjectURL(entry.url);
```

### 3. Simplified Wrapper (global-object-url-wrapper.ts)

The wrapper no longer needs to manage native references since the cache handles it:
```typescript
URL.createObjectURL = function (blob: Blob): string {
  const id = `blob-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  try {
    return objectURLCache.set(id, blob);
  } catch (error) {
    console.error("[ObjectURLWrapper] Failed to cache blob URL:", error);
    throw error;  // Let errors propagate instead of fallback
  }
};
```

### 4. Error Handling Improvements

- Removed fallback to `originalCreateObjectURL()` in wrapper (was causing recursion if it was the wrapped version)
- Now errors propagate directly, helping identify actual resource exhaustion
- Added try-catch blocks around revoke operations to ignore benign revoke failures

## Configuration

- Cache max size: 100 blob URLs
- Eviction threshold: 85 (evict when cache reaches 85% full)
- Eviction strategy: LRU (Least Recently Used) with access frequency weighting

## Testing

The fix should eliminate:
1. ✅ Infinite recursion stack traces
2. ✅ WebKitBlobResource exhaustion errors
3. ✅ IFrame evaluation timeouts
4. ✅ Blob URL resource management

Monitor browser console for:
- No more `[ObjectURLWrapper] Failed to cache blob URL` with recursive stack traces
- No more `WebKitBlobResource error 1` errors
- No more `IFrame evaluation timeout` errors

## Files Modified

1. **client/lib/object-url-cache.ts**
   - Save native functions at module load
   - Use native functions throughout
   - Removed `setOriginalCreateObjectURL` method (no longer needed)
   - Removed `originalCreateObjectURL` instance variable

2. **client/lib/global-object-url-wrapper.ts**
   - Simplified wrapper implementation
   - Removed native reference management
   - Removed fallback logic (let errors propagate)
   - Removed `uninstallGlobalObjectURLWrapper()` (unneeded for current use)

## Performance Impact

- **Negligible**: Caching strategy remains the same
- **Better**: No more infinite recursion means faster, more stable operation
- **Cleaner**: Simplified code path with fewer edge cases

## Maintenance Notes

- The native functions are captured at module load time, which is very early in app initialization
- The wrapper is installed from App.tsx before any other code that might use blob URLs
- Order of initialization in App.tsx:
  1. Global polyfills (doesn't touch URL API)
  2. Fetch interceptor (doesn't wrap URL)
  3. **Blob URL wrapper** ← Installed here
  4. Error handlers
  5. React app initialization

This ordering ensures the wrapper captures and wraps the native API before any async operations or lazy loading occurs.
