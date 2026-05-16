# System Integration Testing Guide

## Overview

This guide provides comprehensive testing procedures for all system components working together. The EchoMenuStudio system consists of multiple interconnected modules that must be tested together.

## Test Environment Setup

### 1. Local Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Dev server runs on http://localhost:8080
```

### 2. Staging Environment

Use staging Supabase project:

```env
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=staging-key
SUPABASE_SERVICE_ROLE_KEY=staging-service-key
```

### 3. Test Data

- Create test organizations with 3-5 outlets each
- Create test users with different roles
- Create test recipes (10-20 per outlet)
- Create test inventory items

## Core System Tests

### 1. Authentication System

#### Test 1.1: Sign Up Flow

1. Navigate to `/login`
2. Click "Sign up"
3. Enter email: `test@example.com`
4. Enter password: `TestPassword123!`
5. Enter username: `testuser`
6. Enter organization: `Test Restaurant`
7. Click "Create Account"
8. **Expected**: User account created, signed in, redirected to home

#### Test 1.2: Sign In Flow

1. Sign out from previous account
2. Navigate to `/login`
3. Enter credentials
4. Click "Sign In"
5. **Expected**: User signed in, redirected to home

#### Test 1.3: Password Reset Flow

1. Navigate to `/login`
2. Click "Forgot password?"
3. Enter email address
4. **Expected**: Email sent with reset link
5. Click link in email
6. Enter new password
7. **Expected**: Password updated, can sign in with new password

#### Test 1.4: Session Management

1. Sign in
2. Wait 5 minutes (observe token refresh)
3. **Expected**: Session stays active, no re-authentication needed
4. Close browser and reopen
5. Navigate to protected page
6. **Expected**: Automatically signed in using stored session

#### Test 1.5: Multi-Tab Session Consistency

1. Sign in on Tab A
2. Open application in Tab B
3. **Expected**: Tab B shows user as signed in
4. Sign out on Tab B
5. **Expected**: Tab A also signs out (real-time sync)

### 2. RBAC & Permission System

#### Test 2.1: Admin Permissions

1. Sign in as admin user
2. Test accessing all outlets
3. Create recipe in different outlets
4. Edit other users' recipes
5. Delete recipes
6. Access reports
7. **Expected**: All operations succeed

#### Test 2.2: Chef Permissions

1. Sign in as chef
2. Try to create recipe: **Should succeed**
3. Try to edit own recipe: **Should succeed**
4. Try to edit other chef's recipe in same outlet: **Should succeed if in same outlet**
5. Try to edit manager's recipe: **Should fail**
6. Try to approve global recipes: **Should succeed**
7. Try to manage users: **Should fail**

#### Test 2.3: Manager Permissions

1. Sign in as manager
2. Try to create recipe: **Should fail**
3. Try to view recipes: **Should succeed**
4. Try to approve purchasing: **Should succeed**
5. Try to manage outlet staff: **Should succeed**
6. Try to create global recipes: **Should fail**

#### Test 2.4: Staff Permissions

1. Sign in as staff
2. Try to view recipes: **Should succeed**
3. Try to create recipes: **Should fail**
4. Try to edit recipes: **Should fail**
5. Try to access inventory: **Should succeed (view only)**

#### Test 2.5: FOH Permissions

1. Sign in as FOH user
2. Try to view full recipes: **Should fail**
3. Try to view recipe summaries: **Should succeed**
4. Try to access any operational features: **Should fail**

#### Test 2.6: Outlet Isolation

1. Create User A in Outlet 1 only
2. Create User B in Outlet 2 only
3. Create recipe in Outlet 1
4. Sign in as User A: Can view recipe? **Yes**
5. Sign in as User B: Can view recipe? **No**

### 3. Recipe Management

#### Test 3.1: Local Recipe Workflow

1. Sign in as chef
2. Create recipe in Outlet 1
3. **Expected**: Recipe visible only to Outlet 1
4. Switch to Outlet 2
5. **Expected**: Recipe not visible

#### Test 3.2: Global Recipe Workflow

1. Sign in as chef in Outlet 1
2. Create recipe
3. Mark as global
4. **Expected**: Submitted for approval
5. Sign in as different chef
6. View approval queue
7. Approve recipe
8. **Expected**: Recipe visible in all outlets

#### Test 3.3: Recipe Editing

1. Create recipe
2. Edit name, description, ingredients
3. Add new ingredient
4. Remove ingredient
5. Save
6. **Expected**: Changes saved, version history updated

#### Test 3.4: Recipe Deletion

1. Create recipe
2. Delete recipe as owner
3. **Expected**: Recipe deleted
4. Create recipe as Chef A
5. Try to delete as Chef B (same outlet)
6. **Expected**: Can delete (outlet manager)
7. Try to delete as Staff
8. **Expected**: Cannot delete (insufficient permissions)

#### Test 3.5: Recipe Search & Filter

1. Create 10+ recipes with different names
2. Search by name
3. Filter by created date
4. Filter by outlet
5. Filter by ingredient
6. **Expected**: Correct results returned

### 4. Approval Workflow

#### Test 4.1: Approval Request

1. Chef A creates local recipe in Outlet 1
2. Submits for approval to Outlet 2
3. **Expected**: Request appears in approval queue

#### Test 4.2: Approval Review

1. Chef B reviews pending request
2. Add comment: "Please add more details"
3. Click "Request Changes"
4. **Expected**: Request status updated, Chef A notified

#### Test 4.3: Approval Rejection

1. Chef B reviews request
2. Add rejection reason
3. Click "Reject"
4. **Expected**: Status updated, Chef A notified

#### Test 4.4: Approval Acceptance

1. Chef B reviews request
2. Click "Approve"
3. **Expected**: Recipe copied to Outlet 2, requester notified

#### Test 4.5: Comment Thread

1. Multiple chefs add comments
2. Notification sent for each new comment
3. **Expected**: Full conversation visible in approval details

### 5. Inventory Integration

#### Test 5.1: Inventory Item Creation

1. Sign in as chef with inventory access
2. Go to Inventory section
3. Add item:
   - SKU: `SKU001`
   - Name: `Tomatoes`
   - Quantity: `50`
   - Unit: `pcs`
   - Cost: `$2.50`
4. **Expected**: Item saved, visible in inventory list

#### Test 5.2: Scanned Item Recording

1. Scan item into inventory
2. Enter quantity: `25`
3. **Expected**: Quantity added to total

#### Test 5.3: Ingredient Mapping

1. Create recipe with ingredient "Tomatoes (5 pcs)"
2. Map ingredient to inventory item `SKU001`
3. Set conversion factor: `1 inventory unit = 1 ingredient unit`
4. **Expected**: Mapping saved

#### Test 5.4: Recipe Costing

1. Recipe with 5 mapped ingredients
2. Calculate cost per serving for 10 servings
3. **Expected**: Cost calculated correctly using inventory prices

#### Test 5.5: Inventory Allocation

1. Create recipe needing 30 tomatoes
2. Allocate inventory for 50 servings
3. **Expected**: Inventory allocation recorded, remaining stock calculated

#### Test 5.6: Low Stock Alert

1. Set low stock threshold: `10 units`
2. Reduce inventory to `5 units`
3. **Expected**: Alert appears in inventory dashboard
4. Acknowledge alert
5. **Expected**: Alert marked as acknowledged

#### Test 5.7: Inter-Outlet Transfer

1. Outlet A has 100 units of item
2. Outlet B has 0 units of item
3. Create transfer: `50 units from A to B`
4. **Expected**: Transfer recorded, quantities updated in both outlets

#### Test 5.8: Inventory History

1. Make multiple inventory changes
2. View transaction history
3. **Expected**: All transactions visible with timestamps and details

### 6. Multi-Outlet Operations

#### Test 6.1: Outlet Switching

1. Sign in as user with access to 2 outlets
2. Current outlet shows "Outlet A"
3. Click outlet selector
4. Select "Outlet B"
5. **Expected**: UI updates, recipes/data for Outlet B shown

#### Test 6.2: Cross-Outlet Recipe Sharing

1. Chef A (Outlet 1) creates recipe
2. Submit for approval to Outlet 2
3. Chef B (Outlet 2) approves
4. **Expected**: Recipe now in both outlets' recipe lists

#### Test 6.3: Cross-Outlet Reporting

1. Manager views reports for all outlets
2. Filter by outlet
3. **Expected**: Correct data shown for selected outlet

#### Test 6.4: User Management Across Outlets

1. Admin user
2. Assign Chef A to Outlet 1 only
3. Chef A cannot access Outlet 2
4. Assign Chef A to Outlet 2 as well
5. Chef A can now access both
6. Remove Chef A from Outlet 1
7. Chef A can only access Outlet 2

### 7. UI & User Experience

#### Test 7.1: Route Protection

1. Sign out
2. Try to navigate to `/` directly
3. **Expected**: Redirected to `/login`
4. Sign in
5. Navigate to `/`
6. **Expected**: Home page loads

#### Test 7.2: Error Handling

1. Disconnect network (DevTools)
2. Try to perform action (create recipe)
3. **Expected**: Error message shown, no data loss
4. Reconnect network
5. Try again
6. **Expected**: Operation succeeds

#### Test 7.3: Loading States

1. Create slow network (DevTools throttling)
2. Sign in
3. **Expected**: Loading indicator shown while authenticating
4. Navigate to recipe list
5. **Expected**: Skeleton loaders shown while loading data

#### Test 7.4: Toast Notifications

1. Perform actions (create, edit, delete)
2. **Expected**: Success/error toast appears
3. Toast auto-dismisses after 3-5 seconds

#### Test 7.5: Modal Dialogs

1. Delete a recipe
2. Confirmation dialog appears
3. Click "Cancel"
4. **Expected**: Recipe not deleted, modal closes
5. Delete again
6. Click "Delete"
7. **Expected**: Recipe deleted

### 8. Performance Tests

#### Test 8.1: Page Load Time

1. Clear cache
2. Load home page
3. **Expected**: Loads in < 3 seconds
4. Measure with Chrome DevTools

#### Test 8.2: API Response Time

1. Create recipe (measure response time)
2. **Expected**: < 500ms
3. Load recipe list with 100 recipes
4. **Expected**: < 1 second

#### Test 8.3: Database Query Performance

1. View recipes with filters applied
2. Apply 5+ filters
3. **Expected**: Results returned in < 1 second

#### Test 8.4: Memory Usage

1. Open application
2. Create 50 recipes
3. Check memory usage
4. **Expected**: No memory leaks, < 100MB increase

#### Test 8.5: Bundle Size

1. Build for production: `npm run build`
2. Check bundle size
3. **Expected**: < 500KB gzipped

### 9. Security Tests

#### Test 9.1: SQL Injection

1. Try to inject SQL in search field
2. **Expected**: No error, query sanitized

#### Test 9.2: XSS Prevention

1. Create recipe with HTML in name: `<script>alert('xss')</script>`
2. Save recipe
3. View recipe
4. **Expected**: HTML escaped, no script executed

#### Test 9.3: CSRF Protection

1. Perform action (delete recipe)
2. Check request includes CSRF token
3. **Expected**: Token present and valid

#### Test 9.4: Unauthorized Access

1. Sign in as Staff
2. Modify browser local storage to add "admin" role
3. Try to access admin features
4. **Expected**: Access denied (server-side check)

#### Test 9.5: Session Hijacking Prevention

1. Copy session token from browser storage
2. Open incognito window
3. Paste token in local storage
4. Try to use app
5. **Expected**: Session invalid, redirected to login

### 10. Data Integrity

#### Test 10.1: Concurrent Edits

1. Open recipe in 2 browser windows
2. Edit same field in both
3. Save in window A
4. Save in window B
5. **Expected**: Last-write-wins or conflict resolution shown

#### Test 10.2: Orphaned Records

1. Delete outlet with recipes
2. **Expected**: All recipes deleted (cascade delete)
3. Delete user with approval requests
4. **Expected**: All records properly cleaned up

#### Test 10.3: Data Consistency

1. Create recipe with ingredients
2. Create costing record
3. Create approval request
4. Check all records created correctly
5. **Expected**: All related records consistent

#### Test 10.4: Backup/Restore

1. Create test data
2. Trigger backup
3. Delete test data
4. Restore backup
5. **Expected**: Test data recovered

## Automated Testing

### Unit Tests

```bash
npm run test
```

Run tests for:

- RBAC functions
- Recipe calculations
- Inventory logic
- Approval workflow

### Integration Tests

```bash
npm run test:integration
```

Test:

- Auth + RBAC
- Recipe + Approval
- Inventory + Costing
- Multi-outlet operations

### E2E Tests (if configured)

```bash
npm run test:e2e
```

Use Playwright or Cypress for:

- Full user workflows
- Cross-browser testing
- Real database testing

## Test Results Documentation

For each test, document:

- **Test ID**: Test 2.1
- **Objective**: Verify admin can create recipes
- **Steps**: 1. Sign in as admin 2. Create recipe...
- **Expected Result**: Recipe created successfully
- **Actual Result**: ✅ Pass / ❌ Fail
- **Duration**: 2 minutes
- **Tester**: [Name]
- **Date**: [Date]
- **Notes**: Any additional observations

## Sign-Off Template

```
System Integration Testing Summary
=====================================
Test Date: [Date]
Tester: [Name]
Environment: [Development/Staging/Production]

Results:
- Authentication: ✅ Pass
- RBAC: ✅ Pass
- Recipes: ✅ Pass
- Approvals: ✅ Pass
- Inventory: ✅ Pass
- Multi-Outlet: ✅ Pass
- UI/UX: ✅ Pass
- Performance: ✅ Pass
- Security: ✅ Pass
- Data Integrity: ✅ Pass

Critical Issues: None
Non-Critical Issues: 2 (documented separately)

Recommendation: ✅ APPROVED FOR DEPLOYMENT

Signed: _______________  Date: _______________
```

## Known Issues & Limitations

### Known Issues

- [Document any known issues here]
- Session refresh may take up to 10 minutes
- Large recipe imports (1000+) may take several minutes

### Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Limitations

- Maximum 1000 recipes per outlet
- Maximum 5000 inventory items per organization
- Maximum 500 users per organization

## Regression Testing

After each deployment:

1. Run smoke tests (10-15 minutes)
2. Run critical path tests (30 minutes)
3. Run full integration suite (2-3 hours)

## Continuous Integration

Set up CI/CD pipeline to:

1. Run tests on every commit
2. Block merges if tests fail
3. Auto-deploy to staging on main branch
4. Require manual approval for production

## Support & Issue Reporting

Report issues with:

- **Title**: Descriptive issue title
- **Environment**: Development/Staging/Production
- **Steps to Reproduce**: Detailed steps
- **Expected vs Actual**: What should happen vs what happened
- **Screenshots/Videos**: Visual evidence
- **Browser/OS**: Environment details
- **Severity**: Critical/High/Medium/Low

---

**Testing Owner**: [Your Name/Team]
**Last Updated**: [Current Date]
**Status**: Testing Complete ✅
