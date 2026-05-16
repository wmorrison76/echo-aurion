# Echo AURION · Purchasing & Receiving — Casino/Resort Capability Audit
**Date**: April 28, 2026 · **Auditor**: Echo AI · **Scope**: PurchRec module + supporting backend routes

This audit benchmarks the current Echo AURION P&R footprint against the typical capability stack required to operate a large multi-outlet casino/resort F&B procurement org (think Wynn, Bellagio, Borgata-scale: 10–25 outlets, 40+ vendors, $30–80M annual F&B spend, 3-shift 24/7 receiving dock, gaming compliance overlays).

---

## 1. CURRENTLY IN-PLACE ✅ (verified live)

### Procurement
| Capability | Status | File / Endpoint |
|---|---|---|
| Vendor master | ✅ Live | `/api/vendor-skus/all` · 33 SKUs across 3 vendors from real ingested invoices |
| Vendor Intel panel (Oracle UI) | ✅ Live | `client/modules/PurchRec/components/VendorIntelPanel.tsx` |
| Order guide | ✅ Live | `OrderGuidePanel.tsx`, `OrderFormDrawer.tsx` |
| Advanced ordering / forecasting | ✅ Live | `AdvancedOrderingPanel.tsx`, `purchasing_engine.py` |
| Walk-in vendor management | ✅ Live | `WalkInDesignPanel.tsx` |
| **Purchase approval hierarchy** | ✅ Live | `purchasing_approvals.py` · Sous Chef $2k → CDC $10k → F&B Dir $15k → GM $20k → Director $25k → Admin |
| Onboarding controls (live limit edit) | ✅ Live | `ApprovalHierarchyPanel.tsx` Tab 3 |
| Approval banner (top-screen "+" drawer with PDF preview) | ✅ Live | `ApprovalBanner.tsx` |
| **Invoice ingest + auto-PR** | ✅ Live | `invoice_ingest.py` · 3 William invoices seeded with auto-routed approvals |
| Invoice OCR | ✅ Live | `invoice_ocr.py`, `InvoiceHandlingPanel.tsx`, `DockScannerPanel.tsx` |
| **Vendor SKU autocomplete in recipes** | ✅ Live | `useVendorSkuLookup.ts` wired into Pastry + Culinary |

### Receiving
| Capability | Status | File / Endpoint |
|---|---|---|
| Receiving panel + lot capture | ✅ Live | `ReceivingPanel.tsx`, `inventory_receiving.py` |
| **Barcode / QR scanner** | ✅ Live | `BarcodeScanner.tsx`, `ReceivingPanelWithScanner.tsx` |
| Dock scanner (truck arrival, scan invoice → match PO) | ✅ Live | `DockScannerPanel.tsx` |
| HACCP receiving checks (temps, expirations) | ✅ Live | `ReceivingHaccpChecks.tsx` |
| Stock ledger / movement audit | ✅ Live | `StockLedgerPanel.tsx`, `inventory_receiving.py` |
| Inventory lots + expiration tracking | ✅ Live | `InventoryLotsPanel.tsx` |
| Ingredient categorization (allergens, kosher, etc.) | ✅ Live | `IngredientCategorizationPanel.tsx`, `data/categorization.ts` |

### Notifications + Background flow
| Capability | Status | File / Endpoint |
|---|---|---|
| Per-user notif prefs (email/text/push/in-app) | ✅ Live | `notif_prefs.py` · CDC PO-received cascade to sous-chef wired |
| Save-the-Ticket auto-remediation (Claude) | ✅ Live | `service_recovery.py` |
| Tonight's 4pm Playbook | ✅ Live | `service_recovery.py:playbook_router` |
| GL Sync stub (Oracle posting) | ✅ Live | `gl_sync.py`, `pos_gl_oauth.py` |

---

## 2. PARTIAL / SCAFFOLDED ⚠️ (endpoints exist; UI thin or data-only)

| Capability | Status | Gap |
|---|---|---|
| **Three-way match (PO ↔ Receipt ↔ Invoice)** | ⚠️ Partial | Approvals exist for invoices, but no "match exception" engine that auto-flags qty/price discrepancies between PO and receiving doc and invoice |
| **GR/IR clearing** (Goods Received / Invoice Received reconciliation) | ⚠️ Partial | `gl_sync.py` posts to GL but no aged GR/IR ledger or reconciliation worklist |
| Purchase requisition (pre-PO request) | ⚠️ Partial | We only have approval requests; missing the "I need this" requisition that managers raise BEFORE the PO is cut |
| Catalog import (vendor punchout / PunchOut2.0 / cXML) | ❌ Missing | Hard to operate at scale without Sysco / USFoods PunchOut |
| EDI (810 invoice / 856 ASN / 850 PO) feeds | ❌ Missing | Required for big food vendors (Sysco SY1100, US Foods iScan) |
| **Contract pricing compliance** | ⚠️ Partial | Vendor SKU price history captured per invoice but no contract-rate file to compare against; no "contract violation" alert |
| Volume rebate tracking | ❌ Missing | $10–30M vendors offer YTD rebates; need to track quarterly tiers |
| **Min/Max par levels per outlet** | ⚠️ Partial | Categorization has portion types but no explicit par/reorder point per outlet × SKU |
| Cycle count / blind count workflow | ❌ Missing | Casinos typically do weekly cycle counts on top-30 SKUs and full counts monthly |
| **Vendor performance scorecard** (on-time %, fill-rate, quality complaints) | ❌ Missing | Required for vendor reviews / contract renewals |
| RFQ / bid management | ❌ Missing | Sourcing module for new vendor solicitation |
| Allergen / dietary cross-reference (recipe → SKU → outlet menu) | ⚠️ Partial | Categorization has flags, but no "allergen impact report" if a SKU is flagged tainted |
| **Recall management** | ❌ Missing | FDA/USDA recall handling: trace lot → outlets affected → guests notified |
| Cigar / spirits / regulated-good handling | ❌ Missing | Casinos with retail need TTB/state regulator hooks |
| TIPS / TABC training compliance per receiver | ⚠️ Partial | `TrainingPanel.tsx` exists but not tied to who-can-receive-alcohol |
| Multi-property consolidation (chargebacks, IC transfers) | ❌ Missing | Multi-property casinos need internal transfer / chargeback ledger |

---

## 3. MISSING — Casino-specific gaps ❌

| # | Missing Capability | Why Casinos Need It | Effort |
|---|---|---|---|
| 1 | **Gaming-floor F&B comp tracking** | Comp meals from casino host comp the cost back to specific player accounts | M (~1 day; requires casino comp system feed) |
| 2 | **Liquor pour cost reconciliation** | Banquet/bar GMs need actual pour vs theoretical (PourMyBeer, BarVision integrations) | L (~3 days; needs pour-meter feed) |
| 3 | **Chip-tracking-style lot-genealogy** for high-end items (caviar, A5 wagyu, white truffle) | Audit: where did that $3,500 truffle go? | M |
| 4 | **OFAC / SDN sanctions screening on vendors** | Federal compliance for casinos | S (~2 hours; integrate API) |
| 5 | **Title 31 BSA hooks** for spend over thresholds | Money-laundering surveillance | S |
| 6 | **Banquet-event allocation** (PO → BEO → recipe → outlet → guest count) | Banquet GMs need to know what was specifically allocated to a 250-person wedding vs daily walk-in covers | L (~4 days; ties to MaestroBQT) |
| 7 | **Forecast → PO automation** (auto-cut PO when daily covers + recipe BOM math says SOH < par) | The end-state of the chain William asked for | M (~1.5 days) |
| 8 | **Spend authority by cost center** (not just role) | Banquet manager has $5k authority for banquets only, not main kitchen | M (~1 day; extend approval engine) |
| 9 | **Chargeback to gaming/marketing/F&B comp accounts** | Director-of-Finance level | M |
| 10 | **VIP guest amenity loop** (pull vendor inventory for VIP welcome amenities) | Already partially in echo_vip_profiles | S (~3 hours) |

---

## 4. ORACLE-PARITY UI GAPS (visual / UX)

The new **Oracle ERP-style Dashboard** (iter255) and **Vendor Intel Panel** (iter255) match Oracle Cloud styling. Pages still on legacy styling:
- `ReceivingPanel` — old card layout, needs Oracle table + lot detail drawer
- `InventoryLotsPanel` — needs Oracle drilldown (SKU → all lots → expiration heatmap)
- `StockLedgerPanel` — needs Oracle journal view with reversing entries
- `OrderGuidePanel` — needs Oracle-style filter bar + bulk-action ribbon
- `InvoiceHandlingPanel` — needs Oracle-style 3-way-match workspace
- Sidebar collapse-state per group should persist (Oracle remembers)

---

## 5. RECOMMENDED 60-DAY ROADMAP (P0 / P1)

### Sprint 1 (next 10 working days) — P0
1. **3-way match engine** (PO ↔ Receipt ↔ Invoice) with auto-flag exceptions. ~2 days
2. **Min/max par + reorder-point** per outlet × SKU + auto-suggest PO. ~2 days
3. **Cycle count workflow** (mobile-first; ties to barcode scanner). ~1.5 days
4. **Oracle re-skin of Receiving + Inventory Lots panels**. ~1.5 days
5. **Vendor performance scorecard** (on-time %, fill-rate; 30/60/90 trend). ~1 day
6. **Banquet-event allocation** stitching (BEO → recipe BOM → SKU draw). ~2 days

### Sprint 2 (days 11–20) — P1
7. **Recall management** (lot trace → outlets → guest manifest). ~1.5 days
8. **EDI 810/856/850 inbound from Sysco** (ASN/PO/invoice EDI). ~3 days (heavy: needs Sysco trading-partner setup)
9. **Contract pricing compliance** alerts. ~1 day
10. **Spend-by-cost-center approval routing** (not just role). ~1 day
11. **Forecast→PO automation** (covers × BOM → SKU pull → SOH delta → auto-PO). ~1.5 days
12. **Oracle re-skin** Stock Ledger, Order Guide, Invoice Handling. ~2 days

### Sprint 3 (days 21–30) — P1/P2
13. Vendor PunchOut (Sysco / US Foods / Performance Foodservice). ~2 days
14. Allergen impact report. ~1 day
15. Comp-meal chargeback to gaming/marketing accounts. ~2 days

---

## 6. VERDICT

The **core P&R skeleton is robust and operating**: vendor master, approvals, invoice ingest, OCR, dock scanner, HACCP, lot tracking, GL stub. The **biggest gaps for a casino-grade rollout** are (in priority order):

1. **3-way matching** — the audit-trail backbone every CFO / internal-audit team will demand
2. **Par-driven auto-PO** — the closing of the loop William keeps asking about (PO → outlet → banquet → Oracle)
3. **Vendor scorecards** — for contract-renewal leverage
4. **Banquet-event allocation** — the missing link to MaestroBQT
5. **EDI feed from Sysco/US Foods** — required to operate at >$30M F&B spend without manual entry

If we ship Sprint 1 + Sprint 2 above, this becomes a true Oracle-Fusion-level F&B procurement stack tailored to casinos.
