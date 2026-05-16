# EchoLayout Testing & Deployment Guide

## Pre-Deployment Checklist

- [x] All components created and code reviewed
- [x] Routing updated (App.tsx)
- [x] Navigation sidebar updated
- [x] Database schema created (db/schemas/echo-layout.sql)
- [ ] **DATABASE MIGRATION APPLIED** (see below)
- [ ] App runs without compilation errors
- [ ] End-to-end workflow testing passed
- [ ] Browser testing completed

---

## Step 1: Deploy Database Schema

### Via Supabase Dashboard (Recommended)

1. Go to https://app.supabase.com
2. Navigate to your project: `hzvbbmkocpdfarneclfk`
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire content from `db/schemas/echo-layout.sql`
6. Paste it into the SQL editor
7. Click **Run** (blue play button)
8. Verify: No red error messages appear

### Via CLI (Alternative)

```bash
# If you have Supabase CLI installed:
supabase migration new create_echo_layout_schema
# Then copy db/schemas/echo-layout.sql into the new migration file
supabase db push
```

### Verify Migration Success

After running the migration, verify tables were created:
1. Go to Supabase Dashboard → **Table Editor**
2. You should see these new tables:
   - `layout_sessions`
   - `existing_seating`
   - `custom_items`
   - `requisition_items`
   - `layout_exports`
   - `banquet_event_orders`

If all 6 tables appear, migration was successful ✅

---

## Step 2: Prepare Development Environment

```bash
# Install dependencies (if not already done)
npm install

# Or with yarn
yarn install

# Start development server
npm run dev
# or
yarn dev
```

The app will start at: `http://localhost:5173` (or similar port shown in terminal)

---

## Step 3: End-to-End Testing

### Test Scenario 1: Create New Session

**Steps:**
1. Navigate to `http://localhost:5173/layout`
2. You should see "EchoLayout" heading with "Create New Session" card
3. Enter session name: `"Test Gala - Ballroom A"`
4. Click **Create New Session**
5. You should be redirected to `/layout/{sessionId}` with Stage 1 visible

**Expected Result:** ✅ Session created, page shows "Stage 1: Setup"

---

### Test Scenario 2: Complete Stage 1 (Setup)

**Setup Page Elements:**
- Venue dropdown (or "New Venue" button)
- Room dropdown (or "New Room" button)
- Room summary card showing selected venue/room

**Steps:**
1. Create new venue: Click **New Venue**
   - Enter name: `"Grand Resort"`
   - Click **Create Venue**
2. Create new room: Click **New Room**
   - Name: `"Grand Ballroom"`
   - Type: `"Ballroom"`
   - Width: `120` ft
   - Depth: `100` ft
   - Capacity: `500` guests
   - Click **Create Room**
3. Verify room summary shows all details
4. Click **Continue to Next Stage**

**Expected Result:** ✅ Stage 1 marked complete (green checkmark), Stage 2 is now active

---

### Test Scenario 3: Complete Stage 2 (Existing Seating)

**Setup Page Elements:**
- "Add Seating Configuration" button
- Form with: Seating Type, Quantity, Size Category, Width/Depth/Height

**Steps:**
1. Click **+ Add Seating Configuration**
2. Select Seating Type: `"table_round"`
3. Quantity: `12`
4. Size Category: `"8-top"`
5. (Dimensions auto-fill: 5' × 5')
6. Click **Add Configuration**
7. Verify seating item appears in list
8. Click **Continue to Next Stage**

**Expected Result:** ✅ Stage 2 marked complete, Stage 3 is now active

---

### Test Scenario 4: Stage 3 (Capture/Build)

**Current State:** UI shows 3 tabs: Scan, Floor Plan, CAD Draw

**Test Scan Tab:**
1. Click **Scan Room** tab
2. See message about scan time
3. Click **Start Scanning**
4. See progress bar (simulated 0-100%)
5. When complete, see "Quality Issues?" card
6. Click **Continue to Next Stage**

**Expected Result:** ✅ Tab UI functional, can proceed to next stage

---

### Test Scenario 5: Stage 4 (Design) - Custom Item Upload

**Steps:**
1. See 2D Layout tab active
2. See "Asset Library" panel on left with Tables, Furniture, Custom Items
3. Click **Add from Photo** button
4. Choose option: **Take Photo** or **Upload Image**
5. If Upload: Select any image file from your computer
6. See image preview appear
7. Enter item name: `"LED Uplighter"`
8. Select category: `"Lighting"`
9. See estimated dimensions appear (e.g., Width: 2.5ft, Depth: 1.5ft, Height: 3ft)
10. Adjust dimensions if needed
11. Click **Create Item**

**Expected Result:** ✅ Item created, appears in custom items library, can see success toast

---

### Test Scenario 6: Complete Stages 5 & 6

**Stage 5 (Banquet Setup):**
1. Fill in event details:
   - Event Type: `"Wedding Reception"`
   - Guest Count: `250`
   - Event Date: Tomorrow's date
   - Service Style: `"Plated Service"`
2. Click **Continue to Next Stage**

**Stage 6 (Export):**
1. See 4 export options in grid
2. Click **Download BEO** → See success message
3. Click **Download Requisition List** → See success message
4. Click **Generate Link** (3D Walkthrough) → See success message
5. Click **Download JSON** → See success message
6. Click **Complete & Finish**

**Expected Result:** ✅ All exports appear as completed (green checkmarks)

---

## Step 4: Session Persistence Testing

**Steps:**
1. Create a new session: `"Test Persistence"`
2. Complete Stage 1
3. Refresh the page (F5 or Cmd+R)
4. Verify you're still on Stage 1 for the same session
5. Check that the venue and room you selected are still there

**Expected Result:** ✅ Session data persists after page refresh

---

## Step 5: Multiple Sessions Management

**Steps:**
1. Navigate to `http://localhost:5173/layout` (without sessionId)
2. You should see all previously created sessions in a grid
3. Each session shows:
   - Session name
   - Created date
   - Progress indicator
   - "Continue →" button
4. Create another session: `"Test Session 2"`
5. Verify it appears in the list

**Expected Result:** ✅ Session list works, can manage multiple sessions

---

## Step 6: Navigation Testing

**Sidebar Tests:**
1. Open app
2. Look at left sidebar
3. Verify "EchoLayout" is the first/primary nav item (with "UNIFIED" badge if visible)
4. Verify Studio, Events, Analytics, Settings follow

**Global Nav Test:**
1. Navigate to `/` (home) → Should redirect to `/layout`
2. Navigate to `/layout` → Should show sessions list
3. Navigate to `/layout/{sessionId}` → Should show workflow
4. Navigate to `/studio` → Global nav should hide
5. Navigate to `/layout/{sessionId}` → Global nav should hide

**Expected Result:** ✅ All navigation working correctly

---

## Browser Compatibility Testing

Test in multiple browsers:
- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

**Key Things to Check:**
- Forms are usable and responsive
- Images display correctly
- Buttons are clickable
- Progress bars animate smoothly
- Dialog modals appear correctly

---

## Performance Testing

**Large Form Test:**
1. Create session
2. Go to Stage 2
3. Add 20+ seating configurations
4. Verify form doesn't lag or freeze
5. Check that list scrolls smoothly

**Expected Result:** ✅ No noticeable lag with multiple items

---

## Error Handling Testing

### Test Missing Venue
1. Go to Stage 1
2. Try clicking "Continue" without selecting venue
3. Should see error toast: "Please select a venue and room"

**Expected Result:** ✅ Form validation working

### Test Custom Item Without Name
1. Go to Stage 4
2. Try to upload photo without entering item name
3. Should see error: "Please enter item name and select an image"

**Expected Result:** ✅ Form validation working

---

## Data Integrity Testing

### Test Session Update
1. Create session
2. Complete Stage 1 (select venue/room)
3. Open browser DevTools → Application → Supabase tables
4. Verify `layout_sessions` row shows:
   - `current_stage`: "setup"
   - `stage_progress`: {"setup": true, "existing_seating": false, ...}

**Expected Result:** ✅ Data correctly stored in Supabase

---

## Troubleshooting

### Issue: Blank page at `/layout`

**Solution:**
- Check browser console for errors (F12)
- Verify Supabase is connected (check .env.local)
- Verify auth is working (should see user in localStorage)

### Issue: "Failed to load sessions"

**Solution:**
- Check network tab in DevTools
- Verify Supabase URL and key are correct
- Check that `layout_sessions` table exists in Supabase

### Issue: Custom item upload not working

**Solution:**
- Check browser permissions for camera/file access
- Verify Supabase Storage bucket exists and is writable
- Check file size (should be under 50MB)

### Issue: Styling looks broken

**Solution:**
- Run `npm run dev` to rebuild with latest CSS
- Clear browser cache (Cmd+Shift+Delete)
- Restart dev server

---

## Testing Sign-Off

Once all tests pass, fill in this section:

**Tested By:** ________________  
**Date:** ________________  
**Environment:** Development / Staging / Production  
**Browser:** ________________  
**Approved:** ✅ / ❌  

**Notes:**
```
[Add any observations, bugs found, or improvements needed]
```

---

## Deployment Readiness Checklist

- [ ] All database tables created
- [ ] No console errors on app startup
- [ ] All 6 stages UI functional
- [ ] Custom item upload working
- [ ] Session persistence working
- [ ] Navigation complete
- [ ] All forms validate input
- [ ] Mobile responsive
- [ ] No performance issues detected
- [ ] Error messages display correctly
- [ ] Supabase queries working
- [ ] Authentication working

**When all boxes are checked, ready for production deployment.**

---

## Known Limitations (Session 3)

These features are scaffolded but need additional work:

1. **CAD Drawing** (Stage 3) - Placeholder UI, needs canvas drawing library
2. **3D Walkthrough Export** (Stage 6) - Link generation, needs viewer setup
3. **Email Sharing** (Stage 6) - UI present, needs email service integration
4. **Scan Quality Feedback** (Stage 3) - Progress tracking, needs actual scan service
5. **Floor Plan Import** (Stage 3) - Upload UI works, needs image processing
6. **BEO PDF Generation** - Endpoint exists at `/api/beo/export`, needs testing

---

## Next Steps After Testing

1. **Fix any bugs** found during testing
2. **Implement CAD drawing** module if needed
3. **Wire up email service** (Sendgrid, Mailgun, etc.)
4. **Connect POS systems** for live sync (if needed)
5. **Set up 3D walkthrough viewer** for Stage 6 export
6. **Add analytics tracking** for user behavior
7. **Set up monitoring** and error tracking (Sentry, etc.)
8. **Deploy to staging** for UAT
9. **Deploy to production** when approved

---

## Support & Documentation

- **Main Documentation:** `ECHOULAYOUT_UNIFIED_MODULE.md`
- **Database Schema:** `db/schemas/echo-layout.sql`
- **Components:** `client/components/echoulayout/*.tsx`
- **Main Page:** `client/pages/EchoLayout.tsx`
- **Custom Item Upload:** `client/components/CustomItemUpload.tsx`

For questions or issues, refer to the relevant documentation file.
