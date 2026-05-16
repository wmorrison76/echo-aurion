# Quick Start Testing Guide

## 🚀 Get Running in 5 Minutes

### Step 1: Start Dev Server
```bash
pnpm dev
```

You should see:
```
✓ VITE v7.1.2  ready in 476 ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: ...
```

Visit: **http://localhost:8080**

---

## ✅ Test Checklist

### 1. Light Mode (Apple Style)
**What to look for**: Clean, minimal, professional appearance

- [ ] Background is pure white
- [ ] Text is dark gray/black
- [ ] Buttons have blue accents
- [ ] Shadows are subtle
- [ ] No dark elements
- [ ] Rounded corners on components

### 2. Dark Mode (TRON Style)
**How to test**: Press `D` or toggle theme in your browser dev tools

**What to look for**: Neon cyberpunk aesthetic

- [ ] Background is very dark (almost black)
- [ ] Text is bright cyan/white
- [ ] Borders glow cyan
- [ ] Purple accents present
- [ ] Glowing shadows visible
- [ ] High contrast, sharp look
- [ ] Neon feel to buttons

**To toggle manually**:
```javascript
// In browser console
document.documentElement.classList.add('dark')    // Enable dark mode
document.documentElement.classList.remove('dark') // Disable dark mode
```

---

### 3. Settings Modal
**Location**: Any page with settings button

**Test Steps**:
1. Click "⚙️ Settings" button
2. Modal should appear as overlay
3. Workspace visible behind (semi-transparent)
4. Can see "Settings" title and subtitle

**Expected Behavior**:
- [ ] Modal opens without page navigation
- [ ] Workspace visible behind modal
- [ ] Close button (X) works
- [ ] Click outside doesn't close (modal-only)
- [ ] Settings button highlights when open

### 4. Profile Tab
**What to test**:

1. **Name Field**
   - [ ] Can type name
   - [ ] Field is not disabled
   - [ ] Shows current user name if logged in

2. **Email Field**
   - [ ] Shows user's email
   - [ ] Field is disabled (can't change)
   - [ ] Helpful message below

3. **Save Button**
   - [ ] Is enabled and clickable
   - [ ] Shows "Saving..." while working
   - [ ] Shows success toast when done
   - [ ] Updates user name in system

### 5. Security Tab
**What to test**:

1. **Password Fields**
   - [ ] Current password field (empty)
   - [ ] New password field (empty)
   - [ ] Confirm password field (empty)
   - [ ] Type is "password" (shows dots)

2. **Update Button**
   - [ ] Can submit form
   - [ ] Shows "Updating..." while working
   - [ ] Validates passwords match
   - [ ] Validates password length >= 6
   - [ ] Shows error toasts for validation failures
   - [ ] Shows success toast when updated

3. **Validation**
   - [ ] Try empty fields → error
   - [ ] Try mismatched passwords → error
   - [ ] Try password < 6 chars → error
   - [ ] All fields required → error

---

### 6. Event Creation (if Events page works)
**Test Steps**:
1. Navigate to `/events`
2. Click "Create Event"
3. Fill in: Name, Date, Session
4. Click "Save"

**Expected**:
- [ ] Event appears in list immediately
- [ ] Event saved to Supabase (check in dashboard)
- [ ] Can delete event
- [ ] List refreshes without page reload

---

### 7. Camera Bookmarks (in 3D scenes)
**Test Steps** (in Planner or Studio):
1. Position camera in 3D view
2. Click "Save Bookmark" slot 1
3. Move camera elsewhere
4. Click "Load Bookmark" slot 1
5. Camera returns to saved position

**Expected**:
- [ ] Bookmark saves without error
- [ ] Toast confirmation appears
- [ ] Bookmark persists on page reload
- [ ] Can save multiple bookmarks (slots 1-4)
- [ ] Can delete bookmarks

---

### 8. Asset Picker
**Test Steps**:
1. Open Asset Picker panel
2. Type "chair" in search
3. Click category badge
4. Click "Place" button

**Expected**:
- [ ] Search filters results
- [ ] Categories filter correctly
- [ ] Asset cards display with icons
- [ ] Cost shown on card
- [ ] Place button triggers event
- [ ] Can see GL code and dimensions

---

### 9. Icons Quality Check
**Look for these high-quality icons**:
- [ ] Settings ⚙️
- [ ] Menu ☰
- [ ] X (close) ✕
- [ ] ChevronDown ▼
- [ ] Table/Chair/Utensils icons
- [ ] All icons consistent size

---

### 10. Responsive Design
**Test on different screen sizes**:

**Desktop (1920x1080)**:
- [ ] Full sidebar visible
- [ ] All buttons visible
- [ ] No horizontal scrolling

**Tablet (768x1024)**:
- [ ] Sidebar collapses or hides
- [ ] Touch targets adequate (>44px)
- [ ] Readable text

**Mobile (375x667)**:
- [ ] Optimized layout
- [ ] Touch-friendly buttons
- [ ] No overflow
- [ ] Modal still works

---

### 11. Performance Check
**In browser DevTools (F12)**:

**Network Tab**:
- [ ] Total bundle < 500KB
- [ ] No failed requests
- [ ] API calls show 200 status

**Performance Tab**:
- [ ] First Contentful Paint < 2s
- [ ] Largest Contentful Paint < 3s
- [ ] No long tasks (>50ms)

**Console**:
- [ ] No red errors
- [ ] No warnings about missing props
- [ ] No console.logs in production code

---

### 12. Theme Persistence
**Test Steps**:
1. Set dark mode
2. Reload page
3. Should stay in dark mode

OR

1. Set light mode
2. Reload page
3. Should stay in light mode

---

### 13. CSS Classes Applied Correctly
**Inspect element with DevTools (F12)**:

**Light Mode Elements**:
```html
<div class="panel-light">...</div>  <!-- Has glass effect -->
<div class="card-apple">...</div>   <!-- Apple styled -->
<button class="btn-apple-primary">...</button>
```

**Dark Mode Elements**:
```html
<div class="dark .panel-dark">...</div>  <!-- Has cyan glow -->
<div class="dark .card-tron">...</div>    <!-- TRON styled -->
<button class="dark .btn-tron">...</button>
```

---

### 14. Accessibility Check
**Keyboard Navigation**:
- [ ] Tab through buttons works
- [ ] Enter activates buttons
- [ ] Settings modal keyboard accessible
- [ ] Can close modal with Escape key

**Screen Reader (optional)**:
- [ ] Buttons have proper aria labels
- [ ] Modal has proper role attributes
- [ ] Focus visible on all elements

---

## 🧪 Testing Scenarios

### Scenario 1: Create Event Flow
```
1. Navigate to /events
2. Click "Create Event"
3. Fill form:
   - Name: "Wedding Reception"
   - Date: "2024-12-25"
   - Session: "p66-dining"
4. Click Save
5. Event appears in list
6. Refresh page
7. Event still there ✓ (persisted)
8. Delete event
9. Confirm deletion
10. Event gone from list ✓
```

### Scenario 2: Settings Update
```
1. Click Settings
2. Type new name: "John Smith"
3. Click "Save Changes"
4. See success toast
5. Refresh page
6. Name still "John Smith" ✓
7. Click Security tab
8. Try empty password field
9. See error ✓
10. Enter mismatched passwords
11. See error ✓
12. Enter matching 6+ char passwords
13. Click Update
14. See success toast ✓
```

### Scenario 3: Dark Mode Toggle
```
1. Open DevTools console
2. Paste: document.documentElement.classList.add('dark')
3. Page turns dark
4. All text readable ✓
5. Cyan/purple accents visible ✓
6. Glowing borders visible ✓
7. No broken layouts ✓
8. Paste: document.documentElement.classList.remove('dark')
9. Page turns light again ✓
```

### Scenario 4: Asset Picker
```
1. Asset Picker loads
2. No errors in console ✓
3. Can search: "round table"
4. Results show round tables ✓
5. Click category "Tables"
6. Only tables show ✓
7. Click "Place" on table
8. Event dispatched or callback called ✓
9. Close panel
10. Panel closes smoothly ✓
```

---

## 🐛 Common Issues & Fixes

### Issue: Dark mode not applying
**Check**:
1. Is `<html>` element in DOM?
2. Does it have `class="dark"`?
3. Are Tailwind colors working?

**Fix**:
```javascript
// In console:
document.documentElement.classList.add('dark')
// Check if styles apply
```

### Issue: Settings modal not opening
**Check**:
1. Is button clickable?
2. Any console errors?
3. Is Settings component imported?

**Fix**:
```bash
# Check imports in App.tsx
grep -n "useSettingsModal" client/App.tsx

# Restart dev server
pkill -f "pnpm dev"
pnpm dev
```

### Issue: Events not saving
**Check**:
1. Are Supabase env vars set?
2. Does studio_events table exist?
3. Check browser console for errors

**Fix**:
```bash
# Verify env vars
cat .env.local | grep SUPABASE

# Restart server
pkill -f "pnpm dev"
pnpm dev
```

### Issue: Icons not showing
**Check**:
1. Is lucide-react installed?
2. Are imports correct?
3. Check console for import errors

**Fix**:
```bash
# Reinstall dependencies
pnpm install

# Restart dev server
pnpm dev
```

---

## 📸 Visual Checklist

### Light Mode (Apple)
Expected appearance:
```
┌─────────────────────────────────────┐
│ ⚙️  Settings              ✕          │  ← Header
├─────────────────────────────────────┤
│ Profile      Security               │  ← Tabs
├─────────────────────────────────────┤
│                                     │
│  Full Name                          │
│  [John Doe_____________]            │  ← Input (blue focus)
│                                     │
│  Email                              │
│  [john@example.com    ] (disabled)  │
│                                     │
│         [Save Changes]              │  ← Button
│                                     │
└───────────���─────────────────────────┘
```

### Dark Mode (TRON)
Expected appearance:
```
┌═══════════════════════════════════════╗  ← Cyan glow
│ ⚙️  Settings              ✕          │
├═══════════════════════════════════════╣
│ Profile      Security               │
├═══════════════════════════════════════╣
│                                     │
│  Full Name                          │
│  [_____________] ✨ (cyan glow)    │
│                                     │
│  Email                              │
│  [john@example.com    ]             │
│                                     │
│         [S a v e]  ← Neon button   │
│                                     │
└═══════════════════════════════════════╘
```

---

## ✨ Success Criteria

**You'll know everything works when**:

✅ Light mode looks clean and professional  
✅ Dark mode looks futuristic and neon  
✅ Settings modal opens and closes smoothly  
✅ Profile updates are saved  
✅ Password validation works  
✅ Events persist to Supabase  
✅ Camera bookmarks save/load  
✅ Asset picker filters work  
✅ Icons are crisp and clear  
✅ No console errors  
✅ Touch targets are adequate  
✅ Performance is good  

**If all these pass, you're ready for production!** 🚀

---

## 🎯 Next Steps After Testing

If everything passes:
1. ✅ Commit changes: `git add . && git commit -m "Production ready UI/UX"`
2. ✅ Push to GitHub: `git push origin main`
3. ✅ Deploy to staging
4. ✅ Get stakeholder feedback
5. ✅ Deploy to production

If something fails:
1. ❌ Check console for errors: F12 → Console
2. ❌ Check network tab for API errors
3. ❌ Verify environment variables are set
4. ❌ Restart dev server
5. ❌ Check docs (FINAL_IMPLEMENTATION_SUMMARY.md)

---

**Total Testing Time**: ~30 minutes  
**Difficulty**: Easy (mostly visual checks)  
**Prerequisites**: Dev server running  

Good luck! 🎉
