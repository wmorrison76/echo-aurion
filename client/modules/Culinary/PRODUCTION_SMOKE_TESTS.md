# Production Smoke Tests Checklist

**Purpose**: Verify critical functionality before deploying to Luccca ecosystem  
**Duration**: ~30-45 minutes  
**Environment**: Staging (mirror of production)

---

## Test Setup

### Prerequisites

- [ ] Fresh browser (no cached data)
- [ ] Clear local storage: `localStorage.clear()`
- [ ] Open Developer Console (F12)
- [ ] Have test account credentials ready
- [ ] Have Sentry dashboard open in separate tab

### Test Data

- Create test recipe if needed
- Use sample images (already in app)
- Test with various file formats

---

## Core Functionality Tests

### 1. Authentication & Login

- [ ] Navigate to login page
- [ ] Login with valid credentials
- [ ] Verify session is created
- [ ] Verify JWT token in local storage
- [ ] Check Sentry shows no auth errors
- [ ] Logout and verify session cleared

**Expected**: No errors in console, smooth redirect to recipe search

### 2. Recipe Search & Browse

- [ ] Search recipes with text query
- [ ] Filter by category
- [ ] Filter by tags
- [ ] Export recipes (ZIP)
- [ ] Load from ZIP
- [ ] Favorite a recipe
- [ ] Rate a recipe

**Expected**: All operations complete without errors, UI remains responsive

### 3. Add Recipe

- [ ] Create new recipe with minimal data
- [ ] Upload image for recipe
- [ ] Save recipe
- [ ] Verify in recipe search
- [ ] Edit recipe
- [ ] Delete recipe

**Expected**: CRUD operations work smoothly

### 4. Gallery

- [ ] View gallery
- [ ] Upload images
- [ ] Tag images
- [ ] Create lookbook
- [ ] Add images to lookbook
- [ ] Delete lookbook

**Expected**: Image operations complete without errors

### 5. R&D Labs (Critical Path)

- [ ] Navigate to R&D Labs
- [ ] View experiments
- [ ] Create experiment
- [ ] Add ingredients
- [ ] Save experiment
- [ ] View results/insights

**Expected**: No TypeScript errors, smooth UX, Sentry clean

### 6. Error Boundaries (Test Error Handling)

- [ ] Trigger intentional error in console: `throw new Error("Test")`
- [ ] Verify error boundary catches error
- [ ] Verify error appears in Sentry
- [ ] Verify "Try Again" button works
- [ ] Verify user can navigate home

**Expected**: Error gracefully handled, user informed, Sentry receives error

### 7. Production Sections

- [ ] Production Dashboard loads
- [ ] Can create production plan
- [ ] Can assign items
- [ ] Can export production sheet

**Expected**: No performance issues, smooth rendering

---

## R&D Labs Specific Tests

Since R&D Labs is moving to Luccca, verify thoroughly:

### R&D Labs Core

- [ ] Discovery Panel loads
- [ ] Workbench Panel loads
- [ ] Can create experiment from template
- [ ] Ingredient selection works
- [ ] Light mode colors are correct
- [ ] Dark mode colors are correct
- [ ] Theme toggle works
- [ ] All icons render properly

### R&D Labs Data

- [ ] Experiments persist on refresh
- [ ] Can collaborate (if enabled)
- [ ] Global experiment search works
- [ ] Export/import works
- [ ] Batch operations work

### R&D Labs Edge Cases

- [ ] Try with 100+ experiments
- [ ] Try with large images
- [ ] Close and reopen browser
- [ ] Navigate away and back
- [ ] Rapid clicking on buttons

**Expected**: No crashes, data persists, performance acceptable

---

## Performance Tests

### Bundle Size

- [ ] Open Network tab in DevTools
- [ ] Refresh page
- [ ] Check main bundle < 500KB (gzip)
- [ ] Check CSS < 200KB (gzip)

**Expected**: Page loads in < 3 seconds on 4G

### Runtime Performance

- [ ] Open Performance tab
- [ ] Refresh page
- [ ] Check First Contentful Paint (FCP) < 2s
- [ ] Check Largest Contentful Paint (LCP) < 4s
- [ ] Check Cumulative Layout Shift (CLS) < 0.1

**Expected**: Smooth interactions, no jank

### Memory Usage

- [ ] Open Memory tab
- [ ] Take heap snapshot before actions
- [ ] Perform 50 recipe searches
- [ ] Create 10 experiments
- [ ] Take heap snapshot after actions
- [ ] Check memory growth < 100MB

**Expected**: No memory leaks

---

## Security Tests

### Authentication

- [ ] JWT tokens in secure storage
- [ ] Session timeout works
- [ ] Can't access protected routes without auth
- [ ] CORS headers present

**Expected**: No security warnings in console

### Error Messages

- [ ] Error messages don't expose sensitive data
- [ ] Stack traces only in development
- [ ] API error messages are generic in production

**Expected**: No sensitive data leaks

### Sentry Integration

- [ ] Sentry DSN not exposed in console
- [ ] No PII in regular logs
- [ ] Session replay doesn't capture passwords
- [ ] Text is masked in replays

**Expected**: Privacy preserved

---

## Browser Compatibility

Test on:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

For each browser:

- [ ] Page loads correctly
- [ ] All buttons clickable
- [ ] Forms work properly
- [ ] No console errors

**Expected**: Consistent behavior across browsers

---

## Mobile Tests (if applicable)

- [ ] Responsive layout works
- [ ] Touch interactions work
- [ ] Mobile menu works
- [ ] Images scale properly

**Expected**: Mobile experience is usable

---

## Error Scenario Tests

Intentionally trigger errors to test error handling:

### Test 1: Async Error

```javascript
setTimeout(() => {
  throw new Error("Async error test");
}, 2000);
```

- [ ] Error boundary catches error
- [ ] Sentry receives error with correct context
- [ ] User sees error message
- [ ] User can retry

### Test 2: Component Error

Add to any component: `throw new Error("Component test")`

- [ ] Error caught by nearest boundary
- [ ] Sentry receives error with component stack
- [ ] Component fallback UI shows

### Test 3: Network Error

Simulate in DevTools: Network tab → Offline

- [ ] App gracefully handles offline
- [ ] Error messages are helpful
- [ ] Retry functionality works

### Test 4: Large Data Operations

- [ ] Export 1000 recipes (ZIP)
- [ ] Import large ZIP file
- [ ] Verify no timeout errors
- [ ] Verify Sentry has no unhandled rejections

**Expected**: All errors are caught, logged to Sentry, and handled gracefully

---

## Data Consistency Tests

- [ ] Create recipe → refresh → recipe still exists
- [ ] Upload image → refresh → image still exists
- [ ] Favorite recipe → refresh → still favorited
- [ ] Rate recipe → refresh → rating persists
- [ ] Create experiment → refresh → experiment exists

**Expected**: Data persists across page refreshes

---

## Integration Tests

- [ ] Authentication with Supabase works
- [ ] All API calls succeed
- [ ] Database queries return expected data
- [ ] Cache is working (if applicable)

**Expected**: No API errors, fast response times

---

## Sentry Integration Verification

- [ ] Errors appear in Sentry dashboard
- [ ] Error grouping works correctly
- [ ] Session replays are captured
- [ ] Breadcrumbs show user actions
- [ ] Environment tags are correct

**To verify**:

1. Open Sentry dashboard
2. Go to Issues
3. Look for test errors
4. Click on error to see:
   - [ ] Component stack trace
   - [ ] Session replay
   - [ ] Breadcrumbs
   - [ ] User information

**Expected**: Complete error context available

---

## Sign-Off Checklist

After completing all tests:

- [ ] No critical errors found
- [ ] All critical paths work
- [ ] Performance is acceptable
- [ ] Security is verified
- [ ] R&D Labs is production ready
- [ ] Sentry is capturing errors
- [ ] Ready for production deployment

---

## Issues Found

Use this section to document any issues during testing:

| Issue                       | Severity | Reproduction             | Status   |
| --------------------------- | -------- | ------------------------ | -------- |
| Example: Button unclickable | High     | Click button in R&D Labs | RESOLVED |

---

## Test Results Summary

**Date**: ****\_\_\_****  
**Tester**: ****\_\_\_****  
**Environment**: Staging  
**Browser**: ****\_\_\_****

**Overall Status**: ☐ PASS ☐ FAIL ☐ PASS WITH ISSUES

**Critical Issues Found**: 0  
**High Priority Issues**: **_  
**Medium Priority Issues**: _**

**Notes**:

```
[Add any notes or observations here]
```

**Sign-off**: **********\_\_********** Date: ****\_\_****

---

## Quick Test Command

For automated smoke tests (if available):

```bash
npm run test:smoke
```

---

## Production Deployment Readiness

After passing smoke tests:

- [ ] All tests passed
- [ ] No critical issues
- [ ] Team approved
- [ ] Sentry configured
- [ ] Monitoring alerts set
- [ ] Runbook prepared
- [ ] Team trained

**Status**: ✅ READY FOR PRODUCTION

---

_Smoke Tests Created: Production Readiness Implementation_  
_Last Updated: Session Continuation_
