# Mobile App Testing Guide - Week 3-4

## Overview

This guide provides comprehensive testing procedures for the Bar Liquor Inventory mobile app, focusing on offline mode, sync recovery, and core functionality.

## Environment Setup

### Prerequisites
```bash
# Install dependencies
npm install

# Install Expo CLI
npm install -g expo-cli

# Install native build tools
# iOS: Xcode Command Line Tools required
# Android: Android Studio SDK required
```

### Running Tests

```bash
# Start Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web (for quick testing)
npm run web
```

## Offline Mode Testing

### Test Case 1: Offline Count Recording

**Objective:** Verify that inventory counts can be recorded while offline

**Steps:**
1. Start the app in online mode
2. Enable airplane mode on device
3. Navigate to Inventory → Count Inventory
4. Select an item and record a quantity (e.g., 15 units)
5. Add a photo (optional)
6. Save the count
7. Verify the item appears in "Pending Counts"

**Expected Result:**
- Count is saved to local SQLite database
- Sync status shows "Pending"
- App remains fully functional
- No errors in console logs

**Verification:**
```javascript
// Check sync_queue table
const pending = await syncEngine.getPendingSyncItems();
console.log(pending); // Should show count entry with sync_status='pending'

// Check offline_counts table
const counts = await syncEngine.db.getAllAsync(
  `SELECT * FROM offline_counts WHERE synced = 0`
);
console.log(counts); // Should show recorded count
```

### Test Case 2: Multiple Offline Actions

**Objective:** Verify that multiple actions queue correctly while offline

**Steps:**
1. Airplane mode enabled
2. Record 3 inventory counts on different items
3. Request a transfer (from Venue A to Venue B)
4. Add notes and take photos for each
5. Verify all actions queue without errors

**Expected Result:**
- All 4 actions queued in sync_queue
- Each has sync_status='pending'
- No data loss
- App remains responsive

### Test Case 3: Return to Online Mode

**Objective:** Verify automatic sync when device returns online

**Steps:**
1. Complete offline actions (Test Case 2)
2. Disable airplane mode
3. Wait 10 seconds for network detection
4. Check sync status in Dashboard

**Expected Result:**
- Sync status changes to "Syncing"
- "Sync Now" button appears
- Tap "Sync Now" button
- All pending items sync to server
- Sync status returns to "Synced"
- Each item's synced_at timestamp updates

**Verification:**
```javascript
// Check after sync
const synced = await syncEngine.db.getAllAsync(
  `SELECT * FROM sync_queue WHERE sync_status = 'synced'`
);
console.log(synced); // All should show synced_at timestamp
```

### Test Case 4: Network Interruption During Sync

**Objective:** Verify graceful handling of sync failures

**Steps:**
1. Offline mode: Record inventory count
2. Go online and start sync
3. Enable airplane mode DURING sync (while syncing)
4. Wait for timeout
5. Go back online
6. Verify retry logic

**Expected Result:**
- Sync fails gracefully (no app crash)
- Failed items remain in sync_queue
- Sync status shows "Error"
- Alert displays: "Sync Issues: Synced: X, Failed: Y"
- Next sync retry attempts failed items again

### Test Case 5: Barcode Scanning Offline

**Objective:** Verify barcode scanner works offline

**Steps:**
1. Airplane mode enabled
2. Navigate to Count Inventory
3. Tap "Scan Barcode"
4. Point camera at product barcode
5. Select item and record count

**Expected Result:**
- Camera scans successfully offline
- Item found in local_inventory table
- Count recorded and queued for sync
- No API calls made

**Verification:**
```javascript
// Should use local inventory data
const localItems = await syncEngine.getLocalInventory(venueId);
console.log(localItems); // Should show scanned item
```

## Transfer Workflow Testing

### Test Case 6: Transfer Request Creation Offline

**Objective:** Verify transfer requests can be created offline

**Steps:**
1. Airplane mode enabled
2. Inventory → Transfer Items
3. Select destination venue
4. Select 3 items with quantities
5. Add reason
6. Submit transfer request

**Expected Result:**
- Transfer queued in sync_queue as "transfer_request" entity
- Status shows "requested"
- Appears in "Requests" tab
- No API errors

### Test Case 7: Transfer Approval Workflow

**Objective:** Verify transfer approval with digital signature

**Steps:**
1. Online mode
2. Create transfer request (Test Case 6)
3. Sync to server
4. Different user receives and approves
5. Sign digitally
6. Submit approval

**Expected Result:**
- Signature captured in canvas
- Transfer status updates to "approved"
- Signature stored in database
- Other venues receive update

### Test Case 8: Transfer Receipt Offline Then Sync

**Objective:** Verify transfer can be marked received offline

**Steps:**
1. Online: Create and approve transfer
2. Receiving venue: Go offline
3. Transfer Workflow → Approved tab
4. Select transfer
5. Mark as "Received"
6. Go online and sync

**Expected Result:**
- Receipt recorded offline
- Syncs when online
- Inventory updated on server
- Status shows "received"

## Sync Recovery Testing

### Test Case 9: Partial Sync Failure

**Objective:** Verify handling of partial failures during sync

**Steps:**
1. Queue 5 actions offline
2. Go online
3. Make API endpoint return 400 error for action #3
4. Sync all
5. Verify retry behavior

**Expected Result:**
- Actions 1, 2, 4, 5 sync successfully
- Action 3 fails and stays in queue
- Sync result: "Synced: 4, Failed: 1"
- Next sync retries action 3

### Test Case 10: Database Sync Cleanup

**Objective:** Verify old synced items are cleaned up

**Steps:**
1. Complete several syncs
2. Manually set synced_at to 8 days ago for some items
3. Call `clearOldSyncedItems(7)`
4. Check database

**Expected Result:**
- Items synced > 7 days ago deleted
- Recent items retained
- Database size managed efficiently

## Dashboard Testing

### Test Case 11: Real-time Stats Update

**Objective:** Verify dashboard stats refresh correctly

**Steps:**
1. Open Dashboard
2. Note: Total Items = 50, Low Stock = 3
3. Record a count offline
4. Go online and sync
5. Pull to refresh

**Expected Result:**
- Stats update after sync
- Pending counts decrease
- Last sync time updates
- All cards show correct data

### Test Case 12: Activity Feed

**Objective:** Verify recent activity displays correctly

**Steps:**
1. Record counts offline
2. Go online and sync
3. Check Dashboard → Recent Activity
4. Verify entries show timestamps and actions

**Expected Result:**
- Recent activity shows all synced actions
- Timestamps are accurate
- Shows entity_type and action
- Limited to 5 most recent

## Performance Testing

### Test Case 13: Large Dataset Sync

**Objective:** Verify app handles large inventory lists

**Steps:**
1. Load inventory with 500+ items
2. Record 50 counts offline
3. Sync all items
4. Measure performance

**Performance Criteria:**
- Load time < 2 seconds
- Sync time < 15 seconds (50 items)
- No UI freezing
- Memory usage < 200MB

**Monitoring:**
```javascript
console.time('sync');
const result = await syncEngine.syncPendingChanges();
console.timeEnd('sync');
```

### Test Case 14: Database Size Management

**Objective:** Verify database doesn't grow unbounded

**Steps:**
1. Perform 100 syncs over several weeks
2. Check database file size
3. Run cleanup procedures
4. Verify size reduction

**Expected Result:**
- Initial size: < 50MB
- After cleanup: < 25MB
- Synced items properly archived/deleted

## Error Handling Testing

### Test Case 15: Invalid Token/Authentication Error

**Objective:** Verify handling of auth errors during sync

**Steps:**
1. Queue action offline
2. Go online
3. Revoke API token (simulate expiration)
4. Try to sync
5. Verify error handling

**Expected Result:**
- Graceful error message
- Suggests user log in again
- Actions remain queued
- User can retry after login

### Test Case 16: Invalid Data Sync Error

**Objective:** Verify handling of validation errors

**Steps:**
1. Manually corrupt data in sync_queue
2. Try to sync (invalid JSON)
3. Verify error handling

**Expected Result:**
- Item marked as failed
- Error logged
- Sync continues with other items
- Failed item can be reviewed/cleared

## User Acceptance Testing

### Test Case 17: Complete Workflow - Count to Sync

**Objective:** Full user journey from count to server sync

**Scenario:** Staff member counts inventory at closing time

**Steps:**
1. App opens on lock screen
2. Tap Dashboard → Count Inventory
3. Scan 5 items with barcode
4. Record quantities
5. Take photos of 3 items
6. Add notes: "End of shift count"
7. Save all counts
8. Go to Transfer → Request transfer of 10 bottles to another venue
9. Add reason: "Overflow stock"
10. Submit
11. Review both actions in Dashboard
12. Observe sync status
13. Go online
14. Observe automatic sync or manual sync
15. Verify server received all data

**Success Criteria:**
- No crashes throughout
- All data preserved
- Sync completes successfully
- Counts visible in server-side dashboard
- Transfer request shows in other venue

## Regression Testing Checklist

- [ ] App starts without errors
- [ ] Database initializes correctly
- [ ] Offline mode activates properly
- [ ] Camera permission requests work
- [ ] Photo capture works
- [ ] Barcode scanning works
- [ ] Local inventory loads
- [ ] Counts record correctly
- [ ] Transfers create correctly
- [ ] Manual signature works
- [ ] Sync queues items
- [ ] Sync uploads correctly
- [ ] Failed items retry
- [ ] Network detection works
- [ ] Auto-sync on reconnect works
- [ ] Manual sync works
- [ ] Dashboard refreshes
- [ ] Activity feed updates
- [ ] No console errors
- [ ] No memory leaks

## Debugging Tips

### Check Sync Queue
```javascript
import { getPendingSyncItems } from './services/storage';
const items = await getPendingSyncItems();
console.log('Pending sync items:', items);
```

### Check Local Inventory
```javascript
import { getLocalInventory } from './services/storage';
const inventory = await getLocalInventory(venueId);
console.log('Local inventory:', inventory);
```

### Monitor Network Status
```javascript
// Add to SyncEngine initialization
setInterval(() => {
  axios.head(`${API_BASE_URL}/health`, { timeout: 5000 })
    .then(() => console.log('Online'))
    .catch(() => console.log('Offline'));
}, 10000);
```

### Clear Cache for Testing
```javascript
// Full reset between tests
import { clearDB } from './services/storage';
await clearDB();
await initDB();
```

## Known Issues & Workarounds

### Issue: Camera permission stuck
**Workaround:** Reinstall app and grant permissions in system settings

### Issue: Barcode scanning too slow
**Workaround:** Increase camera focus speed in InventoryCount.jsx camera settings

### Issue: Sync timeout on slow network
**Workaround:** Increase timeout value in sync.js (line ~150)

## Next Steps

After passing all tests:
1. Deploy to TestFlight (iOS)
2. Deploy to Google Play internal testing (Android)
3. Gather user feedback
4. Iterate based on real-world usage
