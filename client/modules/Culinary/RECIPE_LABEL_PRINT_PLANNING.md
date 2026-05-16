# Recipe Label Print Feature - Comprehensive Planning Document

## Executive Summary

This document outlines the planning for a **Kitchen Tablet Label Printing System** that allows chefs and cooks to search recipes, view details, and print preparation labels with QR codes. This feature fills a gap in kitchen workflow management, as most competing systems (HACCP, production management tools) focus on compliance tracking rather than integrated recipe access + labeling.

---

## Part 1: Deep Dive Comparison with Competing Systems

### 1.1 Market Analysis - Similar Systems

#### A. Direct Competitors (Recipe Management + Printing)

**Marginally Relevant:**

- **MarginEdge, Toast, BlueCart**: Focus on inventory/ordering, minimal recipe integration
- **Cookspire, Plate IQ**: Cloud recipe management but no kitchen tablet interface for printing
- **ServSafe/HACCP Systems**: Compliance-focused, not kitchen workflow

**Key Finding:** No single system combines:

- Recipe search & display
- Integrated label printing with QR codes
- Multi-credential authentication options
- Admin-controlled feature toggles
- Persistent tablet accessibility

#### B. Partial Solutions We Could Integrate

1. **QR Code Libraries**: `qrcode.react`, `qr-scanner` (already available in ecosystem)
2. **Print Management**: Browser's native print API (simpler than external printing services)
3. **Authentication**: Employee ID systems (already exist in your app)
4. **Kitchen Display Systems (KDS)**: MarginEdge, Toast provide inspiration for tablet UI

#### C. Competitive Advantage

Your system will be **first-to-market** for this combination:

- ✅ Unified recipe access + prep labeling
- ✅ QR code generation with configurable data
- ✅ Flexible authentication (0-ID, camera, employee ID)
- ✅ Kitchen-optimized tablet interface

---

## Part 2: Tablet Setup & Deployment Strategy

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   KITCHEN TABLET(S)                     │
│  ┌──────────────────────────────────────────────────────┤
│  │  Browser (iOS Safari / Android Chrome)              │
│  │  ┌─────────────────────────────────────────────────┐ │
│  │  │ URL: https://app.example.com/kitchen/labels    │ │
│  │  │ OR: /tablet/labels (standalone route)          │ │
│  │  │                                                   │ │
│  │  │ ✓ Always Available                             │ │
│  │  │ ✓ Service Worker (offline fallback)             │ │
│  │  │ ✓ Persistent login with 30-day session          │ │
│  │  └──────────────────────��──────────────────────────┘ │
│  └──────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────┘
         ↓ (HTTPS - encrypted traffic)
┌─────────────────────────────────────────────────────────┐
│              Your Express.js Backend                   │
│  - Authentication API (/api/auth/tablet-login)         │
│  - Recipe API (/api/recipes)                           │
│  - Settings API (/api/admin/tablet-settings)           │
│  - Print History (/api/tablet/print-history)           │
│  - QR Code Generation (/api/qr-code)                   │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Tablet Setup Process

#### Step 1: Physical Setup

1. **Device**: iPad (preferred) or Android tablet, 7-10 inch
2. **Network**: Connect to reliable WiFi (or cellular as backup)
3. **Power**: Wall-mounted with auto-lock on AC adapter
4. **OS Settings**:
   - Disable auto-lock timeout
   - Enable full-screen mode / kiosk mode
   - Bookmark home URL on home screen

#### Step 2: Initial Credential Setup (Admin Does Once)

```
https://app.example.com/tablet/setup?token=ADMIN_TOKEN
├─ Admin scans QR code or enters setup code
├─ Creates tablet identifier (e.g., "Kitchen-Station-1")
├─ Sets credentials requirement (via radio buttons)
├─ Generates persistent device token
└─ Tablet redirects to /tablet/labels route
```

#### Step 3: Tablet Runtime

- **URL Bookmarked**: `https://app.example.com/tablet/labels`
- **Device Token**: Stored in `localStorage` (survives browser refresh)
- **Session Token**: Stored in httpOnly cookie (auto-renewed)
- **Offline Support**: Service Worker caches recipes locally

### 2.3 "Can't Get Into The System" Solution

**Problem**: Tablets need to work even when the internet is flaky or they lose signal.

**Solution Stack:**

1. **Service Worker Caching**
   - Cache all recipe data (names, images, allergens) locally
   - Update cache every 4 hours or on demand
   - QR codes generated client-side (no network needed)

2. **Persistent Authentication**
   - Device token + httpOnly cookie = 30-day sessions
   - No re-login needed after power loss
   - Admin can revoke tokens remotely

3. **Print Queue**
   - Failed prints stored locally
   - Auto-retry when connection restored
   - Print history syncs with backend

4. **Network Status Indicator**
   - Green dot = online, blue dot = offline (cached), red = error
   - Users always know the system state

### 2.4 URL Access Strategy

#### Public URLs

```
/tablet/labels           → Main tablet interface (requires device token)
/tablet/login            → Initial login page
/tablet/settings         → Settings (admin-only)
```

#### Why Not `/kitchen/labels`?

- Keeps tablet route separate from main app
- Simplifies analytics and access control
- Reduces risk of accidental tablet data exposure

#### Deep Link Strategy

```
https://app.example.com/tablet/labels?recipe=beef-bourguignon
├─ Pre-selects recipe on load
├─ Useful for QR codes pointing to label print
└─ Single-tap reorder workflow
```

---

## Part 3: Detailed Feature Specification

### 3.1 UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    KITCHEN LABEL PRINT                      │
│                    [Online] [Settings ⚙️]                   │
├─────────────────────┬─────────────────────────────────────┤
│                     │                                       │
│  SEARCH PANEL       │      RECIPE DISPLAY PANEL             │
│  [Search...]        │                                       │
│                     │   ┌─────────────────────────────────┐ │
│  Recent Recipes:    │   │ Image (if available)  [Print ]  │ │
│  ☐ Beef Stew        │   │ (smaller thumbnail)              │ │
│  ☐ Pasta Carbonara  │   │                                  │ │
│  ☐ Salmon Fillet    │   │ Recipe Name: Beef Stew          │ │
│                     │   │ Portions: 4 | Time: 45 min      │ │
│  All Recipes:       │   │ Ingredients: [scrollable]        │ │
│  ☐ Appetizers       │   │ - Beef (2kg)                     │ │
│  ☐ Mains            │   │ - Carrots (500g)                 │ │
│  ☐ Desserts         │   │ - ...                            │ ��
│                     │   │                                  │ │
│  PRINT PREP LABEL   │   │ ALLERGENS:                       │ │
│  ─────────────────  │   │ ┌──────────────────────────────┐│ │
│  # Labels: [1] + -  │   │ │ ⚠️ Contains: Beef, Alcohol   ││ │
│  [PRINT] [CANCEL]   │   │ │ May contain: Celery          ││ │
│                     │   │ └──────────────────────────────┘│ │
│                     │   │                                  │ │
│                     │   │ Instructions: [scrollable]       │ │
│                     │   │ 1. Heat oil...                  │ │
│                     │   │ 2. Brown beef...                │ │
│                     │   └─────────────────────────────────┘ │
└─────────────────────┴─────────────────────────────────────┘
```

### 3.2 Print Label Design

```
┌──────────────��───────────────────┐
│                                  │
│     BEEF STEW                    │
│                                  │
│     Born on: 2024-01-15         │
│     Expires: 2024-01-17         │
│                                  │
│  ┌──────────────────────────────┐│
│  │ ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄  ││
│  │ █ ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀ █  ││
│  │ █  [QR Code]         █  ││
│  │ █  Recipe: Beef Stew █  ││
│  │ █  Allergen: Beef    █  ││
│  │ █  Chef: John Smith  █  ││
│  │ █ ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀ █  ││
│  │ ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄  ││
│  └──────────────────────────────┘│
│                                  │
└──────────────────────────────────┘
```

### 3.3 Authentication Options

| Option             | Flow                                                        | When to Use                      |
| ------------------ | ----------------------------------------------------------- | -------------------------------- |
| **No Credentials** | Tablet opens directly to search                             | Testing, open kitchen            |
| **Camera/Photo**   | Tablet prompts "Smile for the camera", takes photo on print | Insurance/accountability         |
| **Employee ID**    | Badge scan or manual ID entry                               | Compliance-required, large teams |
| **Disabled**       | Settings unavailable, feature hidden                        | Offline kitchen or emergency     |

---

## Part 4: Technical Architecture

### 4.1 Frontend Stack

- **React** (existing)
- **TailwindCSS** (existing)
- **QR Code**: `qrcode.react` library
- **Print**: Native browser Print API (`window.print()`)
- **Service Worker**: PWA offline support
- **Storage**: `localStorage` + `indexedDB` for recipe cache

### 4.2 Backend Endpoints (to create)

```typescript
// Authentication
POST   /api/tablet/setup           → Admin setup with token
POST   /api/tablet/login           → Employee ID or camera login
POST   /api/tablet/validate-token  → Refresh session

// Recipes (read-only for tablets)
GET    /api/tablet/recipes         → Search & list
GET    /api/tablet/recipes/:id     → Single recipe
GET    /api/tablet/recipes/:id/allergens → Allergen details

// Settings
GET    /api/tablet/settings        → Current config (credential mode, etc.)
PUT    /api/admin/tablet/settings  → Admin update (requires admin token)

// Print Tracking (optional)
POST   /api/tablet/print-history   → Log print action
GET    /api/tablet/print-history   → View past prints

// QR Code (optional - can be client-side too)
POST   /api/tablet/qr-code         → Generate QR data
```

### 4.3 Data Models

```typescript
// Tablet Configuration (stored in Supabase)
interface TabletConfig {
  id: string;
  device_id: string; // Unique identifier
  device_name: string; // "Kitchen-1", "Pastry-A"
  credential_mode: "none" | "camera" | "employee_id" | "disabled";
  include_chef_name: boolean;
  enabled: boolean;
  last_sync: timestamp;
  created_at: timestamp;
}

// Tablet Session
interface TabletSession {
  device_token: string; // Stored in localStorage
  session_token: string; // httpOnly cookie
  expires_at: timestamp;
  last_activity: timestamp;
}

// Print Label Data
interface PrintLabel {
  recipe_id: string;
  recipe_name: string;
  born_on: date;
  expires_on: date;
  allergens: string[];
  chef_name?: string;
  quantity: number;
  printed_at: timestamp;
  printed_by_device: string;
}
```

### 4.4 Database Schema (Supabase)

```sql
-- Tablet configurations
CREATE TABLE tablet_configs (
  id UUID PRIMARY KEY,
  device_id VARCHAR(100) UNIQUE,
  device_name VARCHAR(255),
  credential_mode VARCHAR(20),
  include_chef_name BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Tablet sessions (for tracking active devices)
CREATE TABLE tablet_sessions (
  id UUID PRIMARY KEY,
  device_token VARCHAR(500) UNIQUE,
  tablet_config_id UUID REFERENCES tablet_configs(id),
  created_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- Print history for compliance
CREATE TABLE tablet_print_history (
  id UUID PRIMARY KEY,
  device_id VARCHAR(100),
  recipe_id VARCHAR(255),
  recipe_name VARCHAR(255),
  born_on DATE,
  expires_on DATE,
  quantity INT,
  printed_at TIMESTAMP
);
```

---

## Part 5: User Experience Flow

### 5.1 First-Time Setup (Admin)

```
1. Admin navigates to /tablet/setup?token=ADMIN_SECRET
2. Creates device: "Kitchen-Station-1"
3. Selects credential mode:
   ☐ No credentials (immediate access)
   ☐ Camera photo (saves accountability image)
   ☐ Employee ID (requires ID scan/entry)
   ☐ Disabled (feature off)
4. Sets option: "Include chef name in QR code?" [Toggle]
5. System generates QR code linking to /tablet/labels
6. QR is printed and mounted on tablet stand
7. Chefs scan QR or bookmark URL
```

### 5.2 Daily Usage (Chef/Cook)

```
SCENARIO A: No Credentials Required
1. Open browser, tap bookmark: /tablet/labels
2. Recipe list loads (cached if offline)
3. Search for "beef stew"
4. Tap recipe, view full details on right
5. Set label quantity to 3
6. Tap PRINT
7. Browser print dialog opens, chef prints to label printer
8. Labels stack on counter

SCENARIO B: Employee ID Required
1. Open /tablet/labels
2. See login screen: "Scan your badge or enter ID"
3. Scan badge with USB reader
4. Session created, proceed to step 2 above

SCENARIO C: Camera/Photo
1. Open /tablet/labels
2. No login needed initially
3. Select recipe & set quantity
4. Tap PRINT
5. Alert: "📸 This will take your photo. Continue?"
6. Camera activates (front-facing on tablet)
7. Photo snapped
8. Labels print with timestamp & photo reference
9. Photo stored in print history
```

### 5.3 Admin Settings Flow

```
1. Admin logs into main app (not tablet)
2. Navigate to Settings → Tablet Configuration
3. See list of tablets:
   └─ Kitchen-Station-1 (Online, Last sync: 2 min ago)
   └─ Pastry-A (Offline, Last sync: 4 hours ago)
4. Click settings ⚙️:
   - Toggle credential requirement
   - Toggle "include chef name"
   - Disable/enable device
   - View print history
   - Remote logout (invalidate all sessions)
```

---

## Part 6: Network Resilience & Offline Support

### 6.1 Service Worker Strategy

```
Network Request Pattern:
┌─────────────────────────────────────────┐
│   User makes request (search recipe)    │
└────────────────────┬────────────────────┘
                     ↓
        ┌────────────────────────┐
        │ Service Worker Cache   │
        │ Available Offline?     │
        └────┬──────────────────┤
             │ YES              NO
             ↓                  ↓
        ┌────────┐      ┌──────────────┐
        │ Return │      │ Fetch from   │
        │ Cache  │      │ Network      │
        └────────┘      │ + Cache      │
                        └──────────────┘
```

### 6.2 Offline Features

- ✅ Search cached recipes
- ✅ View recipe details
- ✅ Generate QR codes (all client-side)
- ✅ Preview print layout
- ❌ Cannot authenticate (requires server)
- ⚠️ Print history limited to device storage

### 6.3 Sync on Reconnect

```
Interval: Every 5 minutes or on manual sync
├─ Refresh recipe list from server
├─ Sync print history (POST queued prints)
├─ Update allergen data
└─ Clear old cached data (>7 days)
```

---

## Part 7: Security Considerations

### 7.1 Authentication Security

- **Device Token**: 256-bit random, stored in `localStorage` (accessible to JavaScript)
- **Session Token**: httpOnly cookie (not accessible to JavaScript, prevents XSS attacks)
- **Expiration**: 30-day sliding window (renewed on each request)
- **Revocation**: Admin can revoke via device dashboard

### 7.2 API Security

```
Every tablet request includes:
├─ Device-Token header (from localStorage)
├─ Authorization: Bearer {session_token} (from cookie)
└─ Server validates both before returning recipe data
```

### 7.3 Data Privacy

- ✅ Print history NOT stored on tablet
- ✅ Camera photos (if enabled) encrypted in transit
- ✅ No personal data in QR codes (only recipe/allergen)
- ✅ Audit trail available to admin

---

## Part 8: Implementation Roadmap

### Phase 1: Core (Week 1)

- [ ] New route: `/tablet/labels` (landing page)
- [ ] Setup page: `/tablet/setup?token=ADMIN_TOKEN`
- [ ] Recipe search & display (read-only)
- [ ] Database schema for tablet_configs
- [ ] Device token generation & validation

### Phase 2: Printing (Week 2)

- [ ] Print label template design
- [ ] QR code generation (configurable content)
- [ ] Browser print dialog integration
- [ ] Print history logging

### Phase 3: Authentication (Week 3)

- [ ] Credential mode selection (0/camera/ID)
- [ ] Camera capture + storage (optional)
- [ ] Employee ID scanner integration
- [ ] Session token management

### Phase 4: Admin Dashboard (Week 4)

- [ ] Tablet settings page in main app
- [ ] Print history viewer
- [ ] Device enable/disable
- [ ] Remote session management

### Phase 5: Offline & Polish (Week 5)

- [ ] Service Worker caching
- [ ] Offline fallback UI
- [ ] Network status indicator
- [ ] Print queue on reconnect

---

## Part 9: Recommended Next Steps

1. **Approve this architecture** - Do these design decisions align with your vision?
2. **Confirm credential default** - Should tablets default to "No credentials" or "Employee ID"?
3. **Database connection** - Should we use Supabase (existing) or another solution?
4. **Printer type** - Label printer specifics (thermal, inkjet)? Affects print template.
5. **QR code content** - Exactly what should be encoded?
   - Option A: `Recipe|Allergen1,Allergen2|Chef`
   - Option B: `https://app.example.com/recipe/beef-stew`
   - Option C: Both + metadata

---

## Questions for You

Before we code:

1. ✏️ **Tablet Credential Default**: No credentials or Employee ID?
2. ✏️ **QR Code Scanning**: Will chefs scan QR codes on printed labels (to what end)?
3. ✏️ **Print Audit**: Do you need to track WHO printed WHAT and WHEN (for compliance)?
4. ✏️ **Multiple Tablets**: Will you have 1 tablet or 5+ in different kitchen stations?
5. ✏️ **Printer Hardware**: Label thermal printer (zebra, brother), or regular printer?
6. ✏️ **Allergen Display**: Should allergens be sorted by allergen type (dairy, nut, etc.)?
7. ✏️ **Recipe Image**: Smaller thumbnail or hide image entirely on tablet view?
