# User-Profile vs Sidebar Audit · Iter 5.5

**Generated:** 2026-05-11
**Scope:** Compare what's reachable from the top-right avatar dropdown (`UserAvatarMenu`) against what's reachable from the left sidebar (`Sidebar.tsx`). Identify the "missing QR" and any duplicates / orphans.

---

## TOP-RIGHT · UserAvatarMenu actions (current state)

| testid | What it opens | Status |
|--------|---------------|--------|
| `topbar-avatar-btn` | Avatar dropdown | ✅ |
| `topbar-briefing-btn` | Daily briefing modal | ✅ |
| `topbar-notif-btn` | Notification drawer | ✅ |
| `topbar-review-pill` | Review pill (badge) | ✅ |
| `avatar-change` | Change avatar image | ✅ |
| `avatar-size-up` / `size-down` | Avatar size toggle | ✅ |
| `myecho-paystubs-link` | **NEW iter 5.4** — Paystubs panel (PIN-gated) | ✅ |
| `open-notif-prefs` | Notification preferences | ✅ |
| `topbar-logout` | Logout | ✅ |
| `topbar-signin-link` | Sign-in link (when anonymous) | ✅ |
| (top status pill) | online/offline · time · ⌘K | ✅ iter 5.3 |

---

## SIDEBAR · QR / Mobile features (what exists)

| sidebar id | label | what it does |
|------------|-------|--------------|
| `concierge-mobile-admin` | **Guest Companion · Mobile** | Mints magic-link tokens for guests, generates QR code, copy link, SMS/email share |
| `daily-briefing-admin` | **Daily Briefing · Mobile Links** | Per-manager mobile briefing links + QR |
| `spa-builder` | **Spa Menu Builder · QR Booking** | Spa booking with QR check-in |
| `purchrec-sprint1` | **PurchRec · 3-Way Match + Auto-PO** | Uses `ScanLine` icon for barcode receiving |

**The "missing QR" you mentioned is most likely the staff-side QR-scanner counterpart.** Today the QR features in the sidebar are all *generators* (mint a QR, hand it to a guest). There's no panel that scans an inbound QR (e.g. for staff to scan a guest's badge at check-in, or scan a delivery PO QR at receiving).

---

## Recommended fixes

### 🟢 Quick win (P1) — Surface "Guest Companion · Mobile" in the user profile dropdown
Today this panel only lives in the sidebar under "Hotel Operations → Front of House". An operator who's used to opening QR/companion tools from the avatar will miss it. Add a dropdown entry:

```tsx
<button data-testid="profile-companion-link" onClick={() => openPanel("concierge-mobile-admin")}>
  📱 Guest Companion · Mint QR / Magic-Link
</button>
```

### 🟡 P1 — Build a QR Scanner companion panel
Net-new module `client/modules/QrScanner/` reading the camera via `getUserMedia` + `BarcodeDetector` API. Routes:
- Guest QR scan → resolve magic-link token → open guest profile
- PO QR scan → open receiving wizard with PO pre-filled
- Asset/equipment QR scan → open eng-ops record

Backend already supports the magic-link side (`/api/concierge-magic/*`); just needs a route to resolve a scanned token → user context.

### 🟢 Already in place (verified)
- Profile-switch panel persistence works correctly (iter 5.1 fix).
- Mascot link to paystubs (`view_paystub` tour) resolves to the new PIN-gated panel (iter 5.4).
- Top-toolbar items render above all panels including expanded/maximized state (iter 5.5 fix).

---

## What's intentionally NOT in both surfaces

The avatar dropdown is the **personal/sensitive** surface (paystubs, prefs, logout). The sidebar is the **operational** surface (dashboards, builders, mobile admin). Avoid duplicating routine sidebar items into the avatar — keep avatar focused on the operator's own data + chrome controls. The one exception worth adding is `concierge-mobile-admin` because it's a personal tool ("here's a QR for my guest") rather than a department dashboard.
