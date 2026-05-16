# 12-Month Aggressive Production Roadmap
## Echo Ops v2.0 - Hotels/Casinos (25+ Outlets Segment)

**Timeline:** 12 months (48 weeks)  
**Team:** 6 developers (organized in 3 parallel teams)  
**Sprint Cadence:** 4-week sprints with strict dependencies  
**Target Segment:** Hotels, casinos, mega-resorts with 25+ properties  
**Model:** McDonald's-style hub & spoke with approved supplier lists, regional distribution centers, franchisee/outlet ordering

---

## EXECUTIVE SUMMARY

This roadmap delivers a **production-ready, best-in-class purchasing & supply chain system** for hospitality groups with multiple outlets. It incorporates:

1. **McDonald's multi-unit model** (centralized ASL, regional DCs, franchisee ordering independence with group consolidation)
2. **Top 5-7 supplier integrations** (Sysco, US Foods, GFS, Shamrock, Reinhart, Restaurant Depot) via EDI + punchout
3. **Accounting system support** (QuickBooks, Xero, NetSuite)
4. **Advanced ML forecasting, waste automation, dynamic pricing**
5. **Hotel/casino specific features** (gaming/housekeeping/F&B categories, multi-property consolidation, per-property invoicing)
6. **Production-ready quality gates** (security audits, compliance, load testing, SLA validation)

**By month 12:** Go-live with 3-5 pilot customers (hotels/casinos 25+ outlets), proven cost savings metrics, supplier marketplace live, best-in-class forecasting accuracy.

---

## TEAM STRUCTURE (6 DEVELOPERS)

### **Team A: Analytics & Intelligence (2 devs + 1 data scientist)**
- **Lead:** Advanced ML Forecasting, recipe costing, analytics
- **Focus:** Ensemble forecasting, root-cause analysis, scenario planning, supplier scorecards
- **Sprints 1, 3, 4, 7, 8, 10, 11:** Primary ownership

### **Team B: Procurement & Automation (2 devs + 1 EDI specialist)**
- **Lead:** Closed-loop automation, supplier integrations, three-way matching, marketplace
- **Focus:** EDI/punchout, PO automation, ASN receipt, invoice matching, RFQ workflows, all supplier connectors
- **Sprints 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12:** Primary ownership

### **Team C: UI/UX & Mobile (2 devs + 1 hardware engineer)**
- **Lead:** Ordering portal, mobile app, waste capture, RFID/IoT
- **Focus:** Franchisee portal, hotel-specific UI, waste tracking, RFID integration, voice ordering, mobile sync
- **Sprints 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12:** Primary ownership

**Specialists (shared across sprints):**
- QA lead (testing, security audits)
- EDI coordinator (supplier certification, trading partner setup)
- Product manager (roadmap, metrics, customer success)
- Customer success lead (pilots, feedback, issue resolution)

---

## SPRINT BREAKDOWN (12 SPRINTS × 4 WEEKS = 48 WEEKS)

### **SPRINT 1 (Weeks 1-4): FOUNDATION**
**Goal:** Database schema, ASL, supplier registry, EDI framework ready

**Key deliverables:**
- Supabase schema extension for multi-unit chains
  - `organizations` (parent company)
  - `outlet_groups` (regions or franchisee entities)
  - `outlets` (individual properties 25+)
  - `approved_suppliers` (ASL per region + outlet type)
  - `products` (3-tier categories: Tier1/2/3)
  - `supplier_contracts` (pricing tiers, rebates)
  - `gl_accounts` (chart of accounts mapping)
- Database indexing for scale (multi-tenant queries optimized)
- Data partitioning strategy (by organization + outlet for fast queries)
- EDI framework integration with certified gateway (TrueCommerce/Infoconn)
  - 850 PO outbound handler
  - 810 Invoice inbound parser
  - 856 ASN inbound handler
- Supplier onboarding workflow (docs, certifications, risk levels)

**Team assignments:**
- **Team A:** Supplier registry, audit scheduling
- **Team B:** EDI framework, EDI gateway partnership
- **Team C:** Database schema design, data modeling
- **All:** 2-day involvement in schema review & optimization

**Quality gates:**
- [ ] Schema review & approval (arch team)
- [ ] EDI gateway contract signed, test environment live
- [ ] Supplier onboarding UI tested with 2-3 mock suppliers
- [ ] Database tested for 25+ outlet queries (< 200ms latency)

---

### **SPRINT 2 (Weeks 5-8): MULTI-UNIT ARCHITECTURE & ORDERING**
**Goal:** Organizations can manage groups of outlets; outlets can order independently

**Key deliverables:**
- Multi-unit chain data model
  - Organization > Outlet Groups > Outlets hierarchy
  - Per-outlet inventory isolation + shared ASL/SKU master
  - RBAC (group admin, outlet manager, staff roles)
- Franchisee/outlet ordering portal
  - Web + mobile interface
  - ASL-filtered SKU search
  - Saved favorites + order templates
  - One-click reorder + suggested replenishment
- Contract & pricing engine
  - Master contracts (supplier, region, effective dates)
  - Volume tiering, promotional pricing
  - Price enforcement in ordering (prevent non-approved prices)
  - GL code mappings per line item
- QuickBooks Online integration (OAuth2)
  - Bill import (vendor invoice → QBO)
  - GL auto-coding
  - Reconciliation workflow

**Team assignments:**
- **Team A:** Multi-unit architecture, RBAC, QuickBooks integration
- **Team B:** EDI pricing feed ingestion
- **Team C:** Ordering portal UI (web + mobile)

**Quality gates:**
- [ ] Multi-outlet queries verified for performance
- [ ] Ordering portal tested by 3-5 internal outlets
- [ ] QB OAuth tested with real QBO sandbox account
- [ ] ASL enforcement validated (no non-approved SKUs orderable)

---

### **SPRINT 3 (Weeks 9-12): ADVANCED ML & CLOSED-LOOP AUTOMATION**
**Goal:** Forecasting is production-quality; procurement is automated end-to-end

**Key deliverables:**
- Advanced ML forecasting engine
  - Ensemble: XGBoost + LSTM + ARIMA
  - Multi-source signals: historical sales (from POS) + reservations + weather + events + local trends
  - Online learning (continuous retraining weekly)
  - Probabilistic outputs: P10/P50/P90 quantiles
  - Explainability dashboard ("why did forecast change?")
- Closed-loop procurement automation
  - Auto-PO creation from forecasts (with approval workflow)
  - Punchout support (cXML for buyers using procurement systems)
  - ASN receipt integration (auto-creates receiving tasks)
  - Three-way match: PO → ASN → Invoice
  - Reconciliation dashboard for exceptions
- Hotel/casino group purchasing
  - Group consolidation workflows (aggregate orders across outlets)
  - Master account support (one bill for group, allocate to properties)
  - Hotel-specific categories (gaming supplies, housekeeping, F&B)
  - Per-property par level optimization (group discounts applied)
- **SUPPLIER #1: Sysco**
  - EDI certification (trading partner registration)
  - Test 850/810/856 flows
  - Catalog feed ingestion
  - Punchout URLs (if available for large accounts)
  - Pricing feed ingestion
  - Pilot: 1-2 Sysco customers live testing

**Team assignments:**
- **Team A:** ML forecasting engine, ensemble training
- **Team B:** Closed-loop automation, three-way match, Sysco EDI certification
- **Team C:** Hotel group purchasing UI, PO approval workflow

**Quality gates:**
- [ ] Forecasting: backtest MAPE/RMSE on historical data (target: < 10%)
- [ ] Closed-loop: end-to-end PO→ASN→Invoice tested with mock supplier
- [ ] Sysco EDI: test files certified with Sysco trading partner team
- [ ] Hotel consolidation: verified with pilot hotel group (3 properties)

---

### **SPRINT 4 (Weeks 13-16): COST OPTIMIZATION & PROFITABILITY**
**Goal:** Waste reduction and dynamic pricing maximize margins

**Key deliverables:**
- Waste automation & spoilage prediction
  - Structured waste capture (mobile form + optional camera for visual, scale integration)
  - Spoilage prediction ML (shelf-life + historical waste patterns → risk score)
  - Auto-adjust par levels based on waste (reduce high-waste items)
  - Maestro committee integration (waste data feeds committee scoring)
  - Cost impact analysis (monthly waste trend + cost by category)
- Dynamic menu pricing engine
  - Auto-recommend menu prices based on ingredient costs + demand elasticity
  - Margin protection alerts (trigger when ingredient cost spikes)
  - POS integration (Toast/Square sync to update menu prices)
  - A/B testing UI (test price variations, measure lift)
  - Profitability tracking (margin % by menu item, by outlet)
- **SUPPLIER #2: US Foods**
  - EDI certification
  - Catalog & pricing feeds
  - Punchout setup
  - Pilot: 1-2 US Foods customers
- **ACCOUNTING #2: Xero**
  - OAuth2 integration
  - Bill export (Accounts Payable)
  - GL mappings (multi-currency support)
  - Reconciliation workflow

**Team assignments:**
- **Team A:** Dynamic pricing engine, POS integrations
- **Team B:** Waste automation, spoilage prediction, US Foods integration
- **Team C:** Waste capture mobile UI, Xero integration support

**Quality gates:**
- [ ] Waste capture: tested on real data (validation with 2-3 outlets)
- [ ] Spoilage model: backtested on 12 months historical data
- [ ] Dynamic pricing: A/B tested with 1 outlet, measured price sensitivity
- [ ] Xero: OAuth tested with real Xero sandbox, GL mappings validated

---

### **SPRINT 5 (Weeks 17-20): ADVANCED AUTOMATION & HARDWARE**
**Goal:** IoT/RFID pilot live; supplier marketplace MVP operational

**Key deliverables:**
- Supplier marketplace & RFQ workflow
  - Internal marketplace: aggregate demand across outlets
  - RFQ creation: group admin creates RFQ, distributed to multiple suppliers
  - Multi-supplier response collection: suppliers submit bids
  - Comparison matrix: side-by-side pricing/terms/delivery
  - Automated award logic (lowest cost, best terms, or group selection)
  - Contract auto-creation from awarded RFQ
- Real-time IoT/RFID pilot
  - UHF RFID reader integration (Bluetooth/WiFi readers)
  - Tag high-value SKUs (spirits, specialty items, equipment)
  - Spoilage detection (temp sensors, humidity)
  - Auto-adjust par levels (reduce high-spoilage items)
  - Intra-storage movement tracking (detect theft, improve inventory)
  - Pilot: 1 hotel, 1 warehouse for proof of concept
- **SUPPLIER #3: Gordon Food Service (GFS)**
  - EDI certification
  - API integration (GFS developer portal)
  - Catalog/pricing feeds
  - Punchout
  - Pilot: GFS customers
- **ACCOUNTING #3: NetSuite**
  - SuiteTalk REST authentication
  - Vendor bill export
  - GL posting (with proper account mapping)
  - Multi-subsidiary support (for large groups)
  - Intercompany allocations

**Team assignments:**
- **Team A:** Supplier marketplace RFQ logic
- **Team B:** GFS integration, API adoption, RFQ distribution
- **Team C:** RFID reader integration, hardware pilot setup, NetSuite mapping

**Quality gates:**
- [ ] RFQ: end-to-end workflow tested (creation → award → contract)
- [ ] RFID: pilot running (tags operational, reader syncing to backend)
- [ ] GFS: live trading partner certification, test data flows
- [ ] NetSuite: GL posting verified, multi-subsidiary test complete

---

### **SPRINT 6 (Weeks 21-24): SUPPLIER PARTNERSHIP & ADVANCED MATCHING**
**Goal:** Suppliers self-service; invoices auto-matched to POs

**Key deliverables:**
- Supplier portal (white-labeled, self-service)
  - Vendor catalog management (SKU list, pricing, availability)
  - Pricing updates (bulk upload, effective dates)
  - ASN submission (advance shipping notification)
  - Order status tracking (PO → ship → delivery)
  - Dispute resolution (quantity/price variance handling)
  - Performance metrics visibility (on-time %, quality ratings)
- Three-way match & invoice reconciliation
  - PO → ASN → Invoice auto-matching engine
  - Variance handling: quantity mismatches, price variances, date discrepancies
  - Exception management dashboard (flagged variances for review)
  - GL posting automation (once matched, post to GL)
  - Reconciliation reports (daily/weekly) for accounting
- **SUPPLIER #4: Shamrock Foods**
  - EDI setup, catalog/pricing feeds
  - Punchout via integrators
  - Regional pricing (Southwest focus)
  - Pilot
- **Forecasting production validation:**
  - Backtest on real historical data (accuracy metrics dashboard)
  - MAPE/RMSE calculations, sensitivity analysis
  - Real-world validation with pilot customers
  - Production rollout with monitoring

**Team assignments:**
- **Team A:** Forecasting accuracy testing & production deployment
- **Team B:** Three-way match engine, reconciliation logic, Shamrock integration
- **Team C:** Supplier portal UI, dispute resolution workflows

**Quality gates:**
- [ ] Supplier portal: tested with 2-3 real supplier accounts
- [ ] Three-way match: tested with 100+ mock invoices, accuracy > 95%
- [ ] Forecasting: live in production with monitoring dashboard
- [ ] Shamrock: trading partner certified, test flows validated

---

### **SPRINT 7 (Weeks 25-28): INTELLIGENCE & CONTRACTS**
**Goal:** Analytics reveal cost drivers; contracts auto-managed

**Key deliverables:**
- Advanced analytics & root-cause detection
  - Auto-identify why costs changed (supplier pricing change? volume spike? category mix?)
  - Supplier performance impact analysis (cost per supplier, quality metrics)
  - Anomaly root-cause detection (outlier purchase flagged, cause identified)
  - Prescriptive recommendations (consolidate with supplier X, negotiate volume discount)
  - What-if scenario builder (model impact of supplier change, cost increase)
- Supplier contract management
  - Contract versioning (track all contract iterations)
  - Pricing tier automation (volume thresholds, effective dates)
  - Volume discount tracking (accumulate spend, calculate rebate accrual)
  - Auto-renewal alerts (60/30/7 days before expiry)
  - Performance KPI tracking (on-time %, quality returns, pricing consistency)
  - Compliance monitoring (certifications, insurance, food safety)
- **SUPPLIER #5: Reinhart Foodservice**
  - EDI setup, catalog/pricing, punchout via integrators
  - Regional focus, pilot
- Yield database & recipe costing
  - Standardized yield tables (by food group: proteins, produce, dairy)
  - Waste adjustment integration (apply actual waste % to recipe costs)
  - Recipe cost updates (ingredient cost changes → menu item cost updated)
  - Food group templates (default yields, customizable per outlet)
  - Custom override support (special recipes, local variations)

**Team assignments:**
- **Team A:** Root-cause analytics, scenario planning, contract management
- **Team B:** Contract automation, rebate tracking, Reinhart integration
- **Team C:** Yield database, recipe costing UI, template management

**Quality gates:**
- [ ] Root-cause detection: tested on 50+ cost anomalies, >80% accuracy
- [ ] Contract mgmt: auto-renewal alerts tested, rebate accrual verified
- [ ] Yield database: validated against industry standards, 2-3 outlets tested
- [ ] Reinhart: certified, test flows live

---

### **SPRINT 8 (Weeks 29-32): COMMUNICATIONS & ADVANCED ANALYSIS**
**Goal:** Suppliers, outlets, and executives all informed; vendor selection data-driven

**Key deliverables:**
- SendGrid email & notification system
  - Transactional emails: PO confirmation, delivery alerts, price changes, exceptions
  - Notification preferences (per outlet, per role)
  - Multi-language support (common hotel languages: English, Spanish, Mandarin, etc.)
  - Email template library (customizable branding)
  - Delivery tracking (open rate, click-through)
- Advanced supplier scorecards
  - On-time delivery % (vs. promised date)
  - Quality ratings (based on returns, waste %, audit results)
  - Pricing consistency (variance from contract terms)
  - Responsiveness score (RFQ response time, support ticket resolution)
  - Visual supplier rankings (dashboard showing top/bottom performers)
  - Performance trend analysis (monthly trends, year-over-year)
  - Vendor evaluation matrix (score vs. cost, for RFQ decision-making)
- Scenario planning & what-if analysis
  - Model supplier changes: cost impact, delivery lead time impact
  - Volume simulations: "if we buy 20% more, what's the pricing tier?"
  - Cost simulations: "if beef costs +10%, what's the menu impact?"
  - Contract negotiation scenarios: "is net 45 worth 2% discount?"
  - ROI calculator: consolidation savings, forecasting accuracy value
- **SUPPLIER #6: Restaurant Depot (cash-and-carry)**
  - Invoice import via third-party connectors (Pipe17, EDI)
  - Cash-and-carry order tracking (in-store + online)
  - Accounting integration

**Team assignments:**
- **Team A:** Supplier scorecards, what-if analysis, ROI calculator
- **Team B:** Scenario planning logic, Restaurant Depot integration
- **Team C:** Email notifications UI, preference management, template editor

**Quality gates:**
- [ ] Email system: tested with 50+ test messages, deliverability > 99%
- [ ] Scorecards: populated with real data from 2-3 suppliers, visualizations validated
- [ ] Scenario planning: 5+ scenarios tested, math verified
- [ ] Restaurant Depot: connector live, sample data flowing

---

### **SPRINT 9 (Weeks 33-36): HARDWARE & SECURITY**
**Goal:** Mobile offline-first proven; security audit complete

**Key deliverables:**
- Offline-first mobile sync hardening
  - Conflict resolution (if same item edited offline on 2 devices)
  - Retry logic with exponential backoff
  - Data integrity checks (no corrupted syncs)
  - Network resilience (graceful handling of poor connections)
  - Test offline → online transitions (stress testing)
- Scale & weight sensor integration
  - Bulk item capture via Bluetooth/WiFi scales
  - Receive verification (expected weight vs. actual)
  - Waste measurement (weigh spoiled items before disposal)
  - IoT telemetry pipeline (weight data → inventory adjustments)
  - Pilot: 1 hotel warehouse, 1 receiving dock
- Production readiness & security audit
  - Penetration testing (external security firm)
  - Compliance audit: PCI-DSS (if payment processing), SOC2
  - GDPR review for multi-tenant (data isolation, privacy)
  - Rate limiting (prevent API abuse)
  - Encryption at rest (database, backups) & in transit (TLS)
  - Data retention policies (auto-delete old data per GDPR)

**Team assignments:**
- **Team A + B:** Security audit coordination, compliance review (1 dev each)
- **Team C:** Offline sync hardening, scale integration, hardware pilot

**Quality gates:**
- [ ] Offline sync: stress tested (100+ simultaneous conflicts, all resolved)
- [ ] Scale integration: pilot running (2 scales syncing to backend)
- [ ] Security audit: pen test report reviewed, all critical/high issues remediated
- [ ] Compliance: SOC2 Type II audit initiated (or attested), GDPR checklist signed off

---

### **SPRINT 10 (Weeks 37-40): ADVANCED DASHBOARDS & HOTEL FEATURES**
**Goal:** Executives see consolidated view; hotel operations optimized

**Key deliverables:**
- Multi-outlet analytics & consolidation dashboard
  - Organization-wide spend visibility (total, by category, by supplier)
  - Cross-outlet benchmarking (cost per outlet, efficiency metrics)
  - Supplier spend concentration (% of total spend with top 3 suppliers)
  - Variance analysis (actual vs. forecast, actual vs. budget)
  - Group purchasing ROI (consolidation savings, volume discounts realized)
- Mobile app enhancement for hotels
  - Hotel-specific modules (gaming supplies ordering, housekeeping request)
  - Staff role-based UI (different screens for chef, housekeeping mgr, etc.)
  - Multi-language support (staff often multi-lingual)
  - Offline compliance (staff can order/access data without WiFi)
  - Photo capture (for waste tracking, damage reporting)
- Exception management & alerts
  - Price variance alerts (if price > 5% of contract, flag for review)
  - Delivery delay alerts (order not received by promised date)
  - Quality issue alerts (high waste %, return rate spike)
  - Forecast miss alerts (actual consumption > P90 forecast)
  - Stockout risk alerts (reorder point breached)
  - Smart routing to responsible manager
- Production operations documentation
  - Runbooks: supplier onboarding, incident response, data backup/recovery
  - Training guides: for customers, sales team, support team
  - SLA definitions: response times, uptime targets
  - Support escalation procedures
  - Post-mortems template for incidents

**Team assignments:**
- **Team A:** Multi-outlet analytics, consolidation dashboard
- **Team B:** Exception management & alerts, routing logic
- **Team C:** Mobile hotel modules, multi-language support
- **Shared:** Documentation creation

**Quality gates:**
- [ ] Dashboard: tested with 3-5 large organizations, performance validated
- [ ] Mobile hotel features: tested with hotel staff (2+ properties)
- [ ] Alerts: tested with real data, accuracy > 95%, no false positives
- [ ] Documentation: reviewed by customer success & support teams

---

### **SPRINT 11 (Weeks 41-44): INTELLIGENCE & COMPLIANCE**
**Goal:** Procurement data becomes competitive advantage; regulatory compliance automated

**Key deliverables:**
- Advanced procurement intelligence
  - Supplier spend optimization: identify consolidation opportunities (split vendors → single vendor)
  - Category mix analysis: how do different outlets order? (identify best practices)
  - Regional sourcing strategy: compare costs by region, identify best regional suppliers
  - Cost benchmarking: compare against market rates, negotiate data
  - Seasonal trends: identify purchasing patterns, recommend inventory strategy
- Voice-activated ordering (nice-to-have, high-value for busy outlets)
  - Voice input for mobile ordering (reduce typos, faster input for staff)
  - Integration with existing ordering (voice → structured order)
  - Voice confirmation (repeat order back to user)
  - Multi-language support (kitchen staff, receiving staff speak different languages)
- Compliance & audit automation
  - Supplier audit scheduling (based on risk tier: low = annual, high = quarterly)
  - Compliance dashboard (all certifications, expiry dates visible)
  - Certification tracking & expiry alerts (GFSI, HACCP, liability insurance)
  - Recall management (auto-flag suppliers with recalls, notify affected outlets)
  - Audit report generation (auto-compile for food safety audits)
- Market intelligence & category trends
  - Commodity price tracking (subscribe to market indices: beef, dairy, produce, energy)
  - Cost inflation forecasting (predict category price changes 3-6 months out)
  - Sustainability trends (carbon tracking, local sourcing % by outlet)
  - Supply chain risk alerts (supplier bankruptcy, weather impacts, geopolitical risks)

**Team assignments:**
- **Team A:** Procurement intelligence, benchmarking, market intelligence
- **Team B:** Compliance & audit automation, recall management
- **Team C:** Voice ordering implementation, multi-language voice recognition

**Quality gates:**
- [ ] Procurement intelligence: dashboards populated with real data, 2+ outlets validated
- [ ] Voice ordering: tested with 10+ users, accuracy > 90%
- [ ] Compliance automation: audit scheduling tested, expiry alerts working
- [ ] Market intelligence: commodity feeds live, inflation forecast backtested

---

### **SPRINT 12 (Weeks 45-48): PRODUCTION LAUNCH & CUSTOMER SUCCESS**
**Goal:** Go-live with pilot customers; proven value, ready for market

**Key deliverables:**
- Full-featured supplier marketplace launch
  - Public/private marketplace (internal for group buying, external for peer discovery)
  - Rating system (suppliers rated by buyers on quality, delivery, service)
  - Deal aggregation (seasonal promotions, bulk discounts aggregated)
  - Seasonal promotions (holiday specials, category-specific offers)
  - API for suppliers (suppliers can list/update products, receive orders)
- Hotel/casino segment customization
  - White-label options (customize branding for large customers)
  - Multi-property POs (single PO for multiple properties, allocate to each)
  - Gaming/hospitality category defaults (pre-configured for new hotel customers)
  - Group consolidation workflows (workflows optimized for large chains)
  - Per-property invoicing vs. master billing options (legal structures supported)
- Production beta launch & pilot validation
  - Onboard 3-5 pilot customers (hotels/casinos with 25+ outlets)
  - Real-world validation (actual orders, actual suppliers, actual cost data)
  - Feedback loops (weekly check-ins, issue tracking)
  - Metric tracking: adoption rate (% of outlets using), cost savings %, forecasting accuracy, waste reduction
  - Issue resolution (rapid response to blockers)
- Go-live preparation & training
  - Sales enablement materials (pitch deck, ROI calculator, customer success stories)
  - Customer success playbooks (onboarding, ongoing support, upsell)
  - Support documentation (FAQs, troubleshooting, API docs for integrators)
  - Training videos (for customers, sales team, support)
  - Customer launch program (dedicated success manager, weekly check-ins first 90 days)
  - SLA definitions (uptime, support response time, data backup)
  - Support escalation procedures

**Team assignments:**
- **Team A (1 dev) + B (1 dev) + C (1 dev):** Pilot customer support, issue triage
- **All + product + customer success:** Go-live preparation, training creation

**Quality gates:**
- [ ] Marketplace: 2+ suppliers live, 1+ deal aggregated
- [ ] Hotel customization: tested with 1 hotel, white-label verified
- [ ] Pilot launch: 3+ hotels live (orders flowing, invoices processing)
- [ ] Training: sales team certified, support team trained, docs complete
- [ ] Metrics: tracked in dashboards, reporting ready for board

---

## MCDONALD'S MODEL IMPLEMENTATION DETAILS

### **How We're Implementing the Model**

#### **1. Approved Supplier List (ASL)**
- **Database:** `approved_suppliers` table with columns:
  - `id, organization_id, supplier_id, region, outlet_type (gaming|housekeeping|f&b|bar), categories, effective_date, end_date, status (active|inactive)`
- **Logic:** Ordering portal filters available suppliers by:
  - Outlet's location (region)
  - Outlet type (gaming, housekeeping, F&B outlet in hotel)
  - Category (e.g., "spirits only from approved liquor vendors")
- **Enforcement:** No PO can be created for non-ASL suppliers; exception handling workflow for urgent requests
- **Admin:** Organization admins manage ASL; can add regional variations

#### **2. Hub & Spoke Distribution**
- **Concept:** Organization aggregates orders, regional DCs consolidate shipments
- **Implementation:** 
  - `dc_assignments` table: maps outlet to DC
  - Ordering portal suggests optimal DC based on location
  - EDI/punchout connects to DC portal (not direct-to-supplier for major categories)
  - ASN receipt consolidates DC shipments → individual outlet receiving
- **Hotel example:** Las Vegas Marriott (20 properties) → 1 Nevada DC → Sysco, US Foods consolidated deliveries

#### **3. Franchisee/Outlet Ordering Independence**
- **Each outlet can order independently** (their own POs, their own inventory par levels)
- **OR consolidate for group purchasing** (group admin creates group PO, gets volume discount)
- **Options:**
  - **Model 1 (Independent):** Outlet A orders 100 cases beef, Outlet B orders 80 cases → 2 separate invoices
  - **Model 2 (Consolidated):** Group ordering: 180 cases across 2 outlets → 1 PO from group → distributor splits shipment → 2 invoices (split or master bill)
- **Database flags:** `outlet.allow_group_purchasing (yes|no)`, `organization.group_purchasing_policy (independent|consolidated|hybrid)`

#### **4. Regional Contracts & Pricing**
- **`supplier_contracts` table:**
  - `id, organization_id, supplier_id, region, outlet_type, volume_tiers, effective_date, rebate_rules, gl_code`
- **Volume tiers example:**
  - 0-10 cases: list price
  - 11-50 cases: -5% discount
  - 51+ cases: -10% discount
- **Rebate rules:** Supplier provides rebate if org buys >$10k/month → tracked in `rebate_accruals` table → distributed to outlets monthly

#### **5. Invoicing Models**
- **Per-Unit Invoicing (default):**
  - Outlet A gets invoice from Sysco directly (or via DC)
  - Outlet A pays Sysco (or organization pays, then allocates cost to Outlet A P&L)
  - Implementation: Outlet is "bill-to" on PO
  
- **Master Account (for large groups):**
  - Organization is "bill-to" on all POs
  - Distributor sends 1 consolidated invoice to organization
  - Organization allocates cost to outlet P&Ls
  - Accounting: post to GL, then distribute via `invoice_allocations` table
  - Example: Las Vegas Marriott receives 1 Sysco invoice for all 20 properties, allocates by outlet

- **Hybrid (recommended):**
  - Daily orders: per-unit invoicing (fast, simple)
  - Weekly/monthly group purchases: master billing (volume discount applied)
  - Implementation: flag on PO determines billing model

---

## SUPPLIER INTEGRATION ROADMAP

### **Priority Order (why this sequence)**

1. **SPRINT 3: Sysco** - Largest distributor, many hotels use it, EDI standardized
2. **SPRINT 4: US Foods** - #2 distributor, similar customers to Sysco
3. **SPRINT 5: GFS** - Strong in hospitality, has public API (faster integration)
4. **SPRINT 6: Shamrock** - Regional (Southwest), important for hotel chains there
5. **SPRINT 7: Reinhart** - Regional, strong in specific areas
6. **SPRINT 8: Restaurant Depot** - Cash-and-carry, different order flow

### **Integration Methods (in order of priority)**

| Method | Suppliers | Why | Timeline |
|--------|-----------|-----|----------|
| **EDI (850/810/856)** | All 6 | Universal, trusted, financial interchange | Started Sprint 1, live with each supplier in their sprint |
| **Punchout (cXML)** | Sysco, US Foods, GFS, Reinhart, Shamrock | Needed for large buyers (hotels), reduces PO errors | After EDI (1-2 weeks per supplier) |
| **Public REST API** | GFS (developer.gfsdeliver.com) | Faster development, modern UX | Sprint 5 alongside EDI |
| **Third-party connectors** | Restaurant Depot (via Pipe17) | Cash-and-carry doesn't natively support EDI | Sprint 8 |

### **Accounting Integrations (parallel to supplier work)**

| System | Sprint | Why | Complexity |
|--------|--------|-----|------------|
| **QuickBooks Online** | Sprint 2 | Most common for SMB hotels, OAuth simple | Medium |
| **Xero** | Sprint 4 | Growing in hospitality, multi-currency | Medium |
| **NetSuite** | Sprint 5 | Enterprise hotels (Marriott, Hilton), multi-subsidiary | High |

---

## HOTEL/CASINO SPECIFIC FEATURES

### **Outlet Type Categories**
```json
{
  "outlet_type": "hotel",
  "specializations": [
    "f_and_b",      // food & beverage (kitchen, restaurant, bar)
    "gaming",       // casino floor supplies (chips, cards, etc.)
    "housekeeping", // linens, cleaning, amenities
    "maintenance",  // HVAC, plumbing, electrical supplies
    "front_office", // office supplies, guest supplies
    "pool",         // pool maintenance, towels
    "spa"           // spa supplies, toiletries
  ],
  "par_levels_per_type": {
    "f_and_b": {...},      // different par for kitchen vs bar
    "gaming": {...},       // high-value, specialized
    "housekeeping": {...}  // consumables, linens
  }
}
```

### **Group Consolidation**
- **Multi-property POs:**
  - Group admin creates 1 PO for 5 properties
  - Item-level allocation: "100 cases beef → Property A (40), Property B (30), Property C (30)"
  - Distributor ships separately to each property
  - Invoice can be consolidated (1 bill to master account) or split (1 bill per property)

### **Per-Property Par Levels with Group Optimization**
- **Problem:** Each property has different par levels (Hyatt ≠ Holiday Inn)
- **Solution:**
  - Set par per outlet (Property A: 80 cases of beef, Property B: 120 cases)
  - Group dashboard: "If we consolidated purchases, we'd get 10% volume discount"
  - Group admin can override (consolidate to 1 Sysco order for all 3 properties)

### **Multi-Language Support**
- **Why:** Hotels employ multi-lingual staff (kitchen, housekeeping, etc.)
- **Implementation:** UI language selection, email notifications in staff's language

---

## SUCCESS METRICS & VALIDATION

### **Pilot Customer Targets**
- **3-5 hotel/casino groups, 25+ properties each**
- **Metrics tracked per customer:**

| Metric | Target | Timeline |
|--------|--------|----------|
| **Adoption rate** | 70%+ outlets actively ordering | By month 3 |
| **Cost savings** | 3-8% procurement cost reduction | By month 3 |
| **Forecast accuracy** | MAPE < 8% | By month 2 |
| **Order-to-delivery time** | 95% within SLA | Month 1 |
| **System uptime** | 99.5%+ | Always |
| **Waste reduction** | 2-5% waste decrease | By month 3 |
| **Supplier consolidation** | Avg 20% reduction in supplier count | By month 6 |

### **Production Readiness Checklist**
- [ ] All 47 sprint items complete and tested
- [ ] Security audit passed (pen test, GDPR, PCI-DSS)
- [ ] Load testing: 25+ outlets, 100+ concurrent users, < 500ms latency
- [ ] Disaster recovery: restore from backup < 1 hour
- [ ] Customer training: sales, support, 3 pilot customers all trained
- [ ] SLAs documented and agreed with customers
- [ ] Monitoring & alerting live (Sentry, health checks, metrics)
- [ ] Support escalation procedures in place

---

## RISK MITIGATION

### **Top Risks**
1. **EDI delays with suppliers** → Mitigate: Start EDI partner agreements in Sprint 1, have fallback to manual file upload
2. **Forecasting accuracy lower than expected** → Mitigate: Ensemble model + online learning, backtest extensively, lower expectations in pitch (under-promise)
3. **Data quality issues** → Mitigate: Data validation on ingestion, reconciliation dashboards, escalation workflows
4. **Customer expectations exceed scope** → Mitigate: Clear SOW, feature roadmap published, monthly check-ins
5. **Security vulnerabilities discovered late** → Mitigate: Pen test early (Sprint 9), not just at end

### **Mitigation Strategies**
- **Weekly sprint demos** with product & customer success (validate early)
- **Bi-weekly customer advisory board** (3-5 pilot customers) (get real feedback)
- **Monthly roadmap review** (adjust based on learnings)
- **Incident response playbook** (in place before launch)

---

## RESOURCE & BUDGET CONSIDERATIONS

### **Staffing**
- 6 developers (2 teams of 3)
- 1 data scientist (shared with Teams A & B)
- 1 EDI specialist (shared with Team B)
- 1 hardware engineer (shared with Team C)
- 1 QA lead (all teams)
- 1 product manager (roadmap, prioritization)
- 1 customer success lead (pilots, feedback)

### **Infrastructure**
- Supabase (multi-tenant, auto-scaling)
- Certified EDI gateway (TrueCommerce/Infoconn) ~ $5-10k setup + monthly fees
- RFID hardware (readers, tags) ~ $10-20k for pilot
- Scale integrations ~ $5-10k
- Hosting (AWS/other) ~ $10-20k/month for scale
- Security/compliance (pen test, SOC2 audit) ~ $20-30k

### **Total Estimate**
- Staffing: ~$2-3M (12 months, loaded cost)
- Tools/infrastructure: ~$200-300k
- **Total: ~$2.2-3.3M for production-ready system**

---

## GO-TO-MARKET STRATEGY

### **Sales Messaging (by phase)**

**Phase 1 (Months 1-3):** Prove forecasting & ordering work
- "Smarter purchasing: AI forecasts demand, auto-orders from approved suppliers, saves time & waste"

**Phase 2 (Months 4-8):** Add cost optimization
- "Cost control: waste reduction, dynamic pricing, supplier consolidation saves 3-8% procurement cost"

**Phase 3 (Months 9-12):** Full suite
- "Best-in-class: multi-property group purchasing, supplier marketplace, compliance automation - hotel groups' #1 choice"

### **Pricing Model (recommendation)**
- **Freemium:** Basic forecasting + ordering (won't work for hotels, focus on SMB)
- **Standard:** Full features, per-outlet/month ($500-1000/outlet/month depending on volume)
- **Enterprise:** White-label, custom integrations, dedicated success manager ($2-5k/month)
- **Marketplace take-rate:** 1-2% of savings realized (if offering RFQ aggregation)

---

## CONCLUSION

This 12-month roadmap delivers a **production-ready, hotel-focused, best-in-class procurement system** that:

✅ Incorporates McDonald's proven multi-unit model  
✅ Integrates all 5-7 major suppliers (EDI + punchout + APIs)  
✅ Supports hotels/casinos 25+ outlets with specialized features  
✅ Includes advanced ML forecasting, waste automation, dynamic pricing  
✅ Passes security & compliance audits  
✅ Proves ROI with pilot customers (3-8% cost savings)  
✅ Ready for market expansion with proven playbook  

**No items left behind. Every sprint delivers value. Go-live by month 12.**
