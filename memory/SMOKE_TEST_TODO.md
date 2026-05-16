# LUCCCA Module-by-Module Smoke Test TODO & Enhancements
Generated: 2026-04-09 (Updated)

## Module 1: Dashboard (Enterprise Command Center)
### Status: COMPLETED + TESTED (Iteration 19, 20)
- [x] Weather widget added to header (75°F, clickable to Weather panel)
- [x] Revenue KPI ($777.15) clickable -> opens POS Connector
- [x] Labor Cost % fixed (36.4% vs 2327.7%) -> opens Schedule
- [x] Events KPI clickable -> opens Echo Events
- [x] Inventory KPI clickable -> opens Inventory panel
- [x] Forecast KPI clickable -> opens Forecast Hub
- [x] "Click for details" hint on all clickable cards

### Enhancements TODO
- [ ] Add top 5 selling items below revenue chart
- [ ] Show labor cost breakdown chart (FOH/BOH pie)
- [ ] Add quick-action buttons (New Event, Run Payroll, Order Inventory)
- [ ] Dashboard date range selector (Today/Week/Month)

---

## Module 4: EchoLayout
### Status: MAJOR ENHANCEMENT COMPLETE + TESTED (Iteration 20)
- [x] Professional 2D Floor Plan Designer (SVG-based)
- [x] 5 layout presets (Banquet, Theatre, Classroom, Cocktail, U-Shape)
- [x] Table numbering and section management (A-F zones)
- [x] 12 element types with drag-and-drop
- [x] Capacity auto-calculation per section and total
- [x] Room dimensions in feet
- [x] PNG export
- [x] Room Scanner backend (Gemini Vision)
- [x] 3D Immersive Designer (existing)

### Remaining Enhancements
- [ ] Guest/seat assignment integration
- [ ] PDF export with event headers
- [ ] Template save/load from MongoDB
- [ ] Real-time collaboration
- [ ] Photo-to-3D reconstruction

---

## Module 5: POS Connector
### Status: FUNCTIONAL (Mocked)
- [x] 5 POS systems available (Toast, Aloha, Micros, Square, Clover)
- [x] Dashboard endpoint returns data
- [ ] Connection creation works
- [ ] Sync simulation works
- NOTE: Real API integration deferred pending keys

## Module 6: GL Sync
### Status: FUNCTIONAL (Mocked)
- [x] 3 platforms (QuickBooks, Sage, Xero)
- [x] Dashboard returns data
- NOTE: Real OAuth integration deferred pending keys

## Module 7: Echo Events
### Status: FUNCTIONAL
- [x] 8 events in pipeline
- [x] Report endpoint returns definite/pending
- [ ] Event detail view loads
- [ ] Stage progression works

## Module 8: Waste Sheet
### Status: FUNCTIONAL
- [x] 9 entries with GL posting
- [x] Credit/vendor return tracking
- [x] Dashboard endpoint works

## Module 9: Menu Engineering
### Status: FUNCTIONAL
- [x] Matrix with 11 items
- [ ] Star/Plowhorse/Puzzle/Dog categorization visible

## Module 10: Purchasing & Receiving
### Status: NEEDS TESTING
- [ ] Dashboard loads with KPIs
- [ ] Purchase order flow

## Module 11: Schedule
### Status: NEEDS TESTING
- [ ] Schedule view loads
- [ ] Labor cost display connects to dashboard

## Module 12: Maestro BQT
### Status: NEEDS TESTING
- [ ] Dashboard tab with 4 KPI cards
- [ ] Event management
