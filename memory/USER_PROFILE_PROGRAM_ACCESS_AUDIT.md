# User-PROFILE → Program Access Matrix · Iter 5.6

**Generated:** 2026-05-11
**Source:** `ROLE_SIDEBAR_ACCESS` in `/app/client/components/site/Sidebar.tsx` + `getModuleAccessForRole()` per-module check.

This is what was actually missing from my prior audit — a real matrix of which roles see which sidebar groups, plus an inventory of the QR / scanner modules that already exist in the repo so they're not "missing".

---

## Sidebar group access by role

Groups: `administration` · `culinary_ops` · `pastry_ops` · `menu_engineering_grp` · `daily` · `intelligence` · `events_catering` · `financial` · `hotel_ops` · `guest_concierge` · `admin_system`.

| Role | Admin | Culinary | Pastry | Menu Eng | Daily | Intel | Events | Financial | Hotel | Concierge | Admin Sys |
|------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `owner` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `regional-director` | — | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| `director` | — | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| `exec-dir-finance` | — | — | — | — | ✅ | ✅ | — | ✅ | — | — | ✅ |
| `general-manager` | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `dir-banquets` | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — |
| `executive-chef` | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |
| `sous-chef` | — | ✅ | — | ✅ | ✅ | — | — | — | — | ✅ | — |
| `pastry-chef` | — | ✅ | ✅ | ✅ | ✅ | — | — | — | — | ✅ | — |
| `fb-director` | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| `events-manager` | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | — | ✅ | — |
| `dining-room-manager` | — | ✅ | — | — | ✅ | ✅ | — | — | — | ✅ | — |
| `spa-manager` | — | — | — | — | ✅ | — | — | — | ✅ | ✅ | ✅ |
| `dir-engineering` | — | — | — | — | ✅ | — | — | — | ✅ | — | ✅ |
| `purchasing-manager` | — | ✅ | — | — | ✅ | — | — | ✅ | — | — | — |
| `controller` | — | — | — | — | ✅ | ✅ | — | ✅ | — | — | ✅ |
| `default` (fallback) | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |

**Findings:**
- 🔴 **`spa-manager` is missing `daily` revenue/exception** access today — they get `daily` but no `intelligence` (so they can't see SLA / exceptions for their outlet).
- 🔴 **`dir-engineering` has no access to `financial`** — they can't see Cash Runway / Pace MTD even though engineering CapEx decisions need both.
- 🟡 **`sous-chef` appears twice in the role table** with different group lists (lines `"sous-chef":` × 2). The second definition wins. Fix: dedupe.
- 🟡 **`purchasing-manager` has no `intelligence` access** — they can't see Vendor Pareto. That's the panel they need most.

---

## Per-module fine-grained access

Beyond the group filter, `getModuleAccessForRole(userRoleId, moduleKey)` runs against `modules` from `useUnifiedSidebar()`. When a module is NOT registered, the sidebar allows it through (dev-safe). When registered, the matrix is enforced. This means: an entry can exist in `NAV_ITEMS` but be hidden per-user via the module registry — that's how partner modules and feature flags toggle off.

`backend/routes/module_registry.py` is the source of truth. Check there to add a new module to per-role gating.

---

## QR / Scanner modules that ALREADY exist (you said "the QR was in repo")

The QR side of the app is more extensive than the previous audit credited. **All of these are present and wired** — they're just scattered:

| Module | Location | Role |
|--------|----------|------|
| **ConciergeMobileAdmin** | `client/modules/ConciergeMobileAdmin/` | Mints guest magic-link QRs (in sidebar as "Guest Companion · Mobile") |
| **Culinary InvoiceScanner** | `client/modules/Culinary/components/InvoiceScanner.tsx` | OCR + scan invoice PDFs into recipes; also `InvoiceScannerNew.tsx` |
| **PurchasingReceiving BarcodeScanner** | `client/modules/PurchasingReceiving/client/components/scanner/BarcodeScanner.tsx` | Camera barcode scan for 3-way-match receiving |
| **PurchasingReceiving DockScannerCamera** | `client/modules/PurchasingReceiving/client/components/dock-flow/DockScannerCamera.tsx` | Receiving dock camera companion |
| **PurchasingReceiving ContractAnalyzerScanner** | `client/modules/PurchasingReceiving/client/components/contract-analyzer/ContractAnalyzerScanner.tsx` | Scan vendor contracts |
| **EchoEventStudio QrShare** | `client/modules/EchoEventStudio/client/components/eco/QrShare.tsx` | Share event QRs with guests |
| **Concierge MagicQR** | `client/modules/Concierge/client/components/share/MagicQR.tsx` | Concierge magic-link QR |
| **BEOQRTrack** | `client/components/maestro/BEOQRTrack.tsx` | BEO menu QR for guests |

The "missing" QR was the **scanner**, not the generator — and `BarcodeScanner.tsx` / `DockScannerCamera.tsx` already exist inside `PurchasingReceiving`. They just aren't surfaced as their OWN sidebar entries.

**Recommended P1:** Add a top-level Sidebar entry inside `daily` group:
```
{ id: "qr-scanner", label: "QR / Barcode Scanner", icon: ScanLine, panelId: "purchrec-sprint1" }
```
That points at the existing PurchasingReceiving panel which already wraps the scanner.

---

## Avatar dropdown audit (iter 5.5 ➜ iter 5.6)

Iter 5.6 surfaced one missing personal tool in the avatar dropdown:
- **`profile-companion-link`** — opens `concierge-mobile-admin` panel from the avatar (one click instead of navigating the sidebar). Test-id added.

Avatar dropdown today (post iter 5.6):
- `topbar-avatar-btn` (open dropdown)
- `topbar-briefing-btn` (daily briefing)
- `topbar-notif-btn` (notifications)
- `myecho-paystubs-link` (PIN-gated paystubs · iter 5.4)
- `profile-companion-link` (guest QR mint · NEW iter 5.6)
- `open-notif-prefs`
- `avatar-change / size-up / size-down`
- `topbar-logout`

Top status pill (gold-on-black, iter 5.3+ iter 5.6 restyle): online/offline · time · clickable ⌘K shortcut.
