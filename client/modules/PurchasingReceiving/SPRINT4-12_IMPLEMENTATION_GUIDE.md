# Sprint 4-12 Complete Implementation Guide
## Echo Ops v2.0: Comprehensive Procurement & Supply Chain System

This guide provides a complete roadmap for building out Sprints 4-12. Each sprint includes specific backend services, database migrations, API routes, and frontend components.

---

## SPRINT 4: Waste Automation, Dynamic Pricing, Xero, US Foods

### Backend Services to Create

#### 1. `server/lib/waste-automation-engine.ts`
- **Purpose:** Automated waste capture, spoilage prediction, par level adjustments
- **Key Methods:**
  - `captureWasteEvent(organizationId, outletId, itemId, quantity, category, notes)`
  - `predictSpoilageRisk(itemId, outletId, shelfLifeDays, temperature)`
  - `autoAdjustParLevels(organizationId, outletId)` - reduce par for high-waste items
  - `analyzeWasteCosts(organizationId, outletId, periodDays)`
- **Features:**
  - Mobile form capture with camera support
  - ML-based spoilage prediction (shelf-life + historical patterns → risk score)
  - Auto-par adjustment (if waste % > threshold, reduce par)
  - Monthly cost impact analysis
  - Integration with Maestro committee scoring

#### 2. `server/lib/dynamic-pricing-engine.ts`
- **Purpose:** Menu price optimization based on ingredient costs and demand
- **Key Methods:**
  - `recommendMenuPrices(organizationId, outletId, menuItems)`
  - `detectCostSpikes(category, threshold)` - margin protection alerts
  - `runABTest(menuItemId, controlPrice, testPrice, duration)`
  - `trackProfitability(organizationId, outletId)` by menu item
- **Features:**
  - Auto-recommend menu prices based on ingredient costs + demand elasticity
  - Margin protection alerts (trigger when ingredient cost spikes > 5%)
  - POS integration (Toast/Square sync for price updates)
  - A/B testing UI (test price variations, measure lift)
  - Profitability tracking (margin % by item, by outlet)

#### 3. `server/lib/xero-integration.ts`
- **Purpose:** OAuth2 integration with Xero accounting
- **Key Methods:**
  - `getXeroAuthToken(code, state)` - OAuth callback handler
  - `exportBill(invoiceId, xeroOrgId)` - send invoice to AP
  - `mapGLCodes(invoiceLineItems, xeroChartOfAccounts)` - auto GL mapping
  - `reconcilePayment(invoiceId, paymentAmount)` - mark as paid
- **Features:**
  - OAuth2 authentication
  - Bill export (Accounts Payable)
  - GL account auto-mapping (multi-currency support)
  - Reconciliation workflow
  - Webhook for payment confirmation

#### 4. `server/lib/us-foods-connector.ts`
- **Purpose:** US Foods EDI integration (similar structure to Sysco)
- **Key Methods:** Same as `sysco-edi-connector.ts` but for US Foods API/EDI format
- **Supplier #2 Integration:** EDI certification, catalog feeds, punchout, pilot support

### Database Migrations

#### File: `migrations/046_sprint4_waste_pricing_accounting.sql`
- Tables:
  - `waste_logs` (item_id, category, quantity, reason, cost, timestamp)
  - `waste_analytics` (org-level spoilage prediction, trends, cost impact)
  - `menu_prices` (menu_item_id, price, cost, margin, updated_at)
  - `price_ab_tests` (test_id, menu_item, variant prices, duration, lift %)
  - `xero_integrations` (org_id, tenant_id, access_token, refresh_token)
  - `accounting_reconciliations` (invoice_id, payment_status, xero_bill_id)

### API Routes: `server/routes/sprint4-waste-pricing.ts`

**Waste Management Endpoints:**
- `POST /waste/capture` - Record waste event
- `GET /waste/analytics/:organizationId` - Waste trends and costs
- `POST /waste/predict-spoilage` - Get spoilage risk for items
- `POST /waste/adjust-par` - Auto-adjust par levels based on waste

**Dynamic Pricing Endpoints:**
- `POST /pricing/recommendations` - Get recommended menu prices
- `GET /pricing/profitability/:organizationId` - Margin by item/outlet
- `POST /pricing/ab-test/start` - Begin A/B test
- `GET /pricing/ab-test/:testId/results` - Test results and lift

**Xero Integration Endpoints:**
- `GET /xero/auth-url` - Get OAuth URL for user
- `POST /xero/callback` - Handle OAuth redirect
- `POST /xero/export-bill` - Send invoice to Xero
- `POST /xero/reconcile-payment` - Mark payment reconciled

### Frontend Components

#### `client/pages/WasteManagementDashboard.tsx`
- Real-time waste capture form (with camera)
- Spoilage risk heatmap by item/outlet
- Waste cost analysis (monthly trends, category breakdown)
- Par level adjustment recommendations

#### `client/pages/DynamicPricingDashboard.tsx`
- Menu price recommendations by item
- Profitability breakdown (price vs. ingredient cost)
- A/B test manager (start/monitor/results)
- Cost spike alerts and margin protection

---

## SPRINT 5: RFQ Marketplace, RFID/IoT, GFS API, NetSuite

### Backend Services

#### 1. `server/lib/rfq-marketplace-engine.ts`
- **Purpose:** RFQ creation, distribution, response collection, award logic
- **Key Methods:**
  - `createRFQ(organizationId, items, targetSuppliers, deadline)`
  - `distributeRFQToSuppliers(rfqId, supplierList)`
  - `collectResponses(rfqId)` - track supplier responses
  - `evaluateResponses(rfqId, criteria)` - scoring and ranking
  - `awardContract(rfqId, selectedSupplier)` - create contract from award
- **Features:**
  - Internal marketplace for group buying
  - Multi-supplier response collection
  - Comparison matrix (pricing, terms, delivery)
  - Automated award logic or manual selection
  - Auto-contract creation from awarded RFQ

#### 2. `server/lib/rfid-iot-service.ts`
- **Purpose:** RFID reader integration, IoT sensor data, spoilage detection
- **Key Methods:**
  - `registerRFIDTag(organizationId, outletId, itemId, tagId)`
  - `readRFIDEvent(tagId, location, timestamp)` - track movement
  - `processSensorData(sensorId, temperature, humidity)` - detect spoilage
  - `detectTheft(outletId, highValueItems)` - alert on unauthorized movement
  - `autoAdjustParLevels(outletId)` - reduce par for spoiled items
- **Features:**
  - UHF RFID reader integration (Bluetooth/WiFi)
  - Tag high-value SKUs (spirits, specialty items)
  - Temperature/humidity sensors for spoilage detection
  - Intra-storage movement tracking
  - Theft detection and alerts
  - Auto-par adjustment based on spoilage

#### 3. `server/lib/gfs-api-connector.ts`
- **Purpose:** Gordon Food Service REST API integration
- **Key Methods:**
  - `searchGFSCatalog(keyword, category)`
  - `getGFSPricing(itemCode, quantity)`
  - `submitPOtoGFS(poData)` - via REST API
  - `receiveASNfromGFS(asnData)` - webhook handler
- **Features:**
  - REST API integration (faster than EDI)
  - Catalog search and pricing lookup
  - PO submission and ASN receipt
  - Punchout support
  - Pilot integration

#### 4. `server/lib/netsuite-integration.ts`
- **Purpose:** NetSuite ERP integration for enterprise hotels
- **Key Methods:**
  - `getNetSuiteAuthToken()`
  - `exportVendorBill(invoiceId, subsidiaryId)` - REST/SuiteTalk
  - `postGLEntry(amount, glAccount, subsidiary)` - GL posting
  - `allocateIntercompanyCharges(parentOrg, childOrgs)` - multi-subsidiary
  - `trackMultipleSubsidiaries(organizationId)` - support large groups
- **Features:**
  - SuiteTalk REST authentication
  - Vendor bill export
  - GL posting with proper account mapping
  - Multi-subsidiary support (for large hotel groups)
  - Intercompany allocations

### Database Migrations

#### File: `migrations/047_sprint5_rfq_rfid_netsuite.sql`
- Tables:
  - `rfq_requests, rfq_responses, rfq_awards`
  - `rfid_tags (tag_id, item_id, location, active)`
  - `iot_sensor_readings (sensor_id, temp, humidity, timestamp)`
  - `theft_alerts (item_id, alert_type, timestamp, resolved)`
  - `netsuite_integrations (org_id, account_id, access_token, subsidiary_id)`
  - `intercompany_allocations (parent_org, child_org, amount, period)`

### Frontend Components

#### `client/pages/RFQMarketplaceHub.tsx`
- RFQ creation form (items, suppliers, terms)
- Response tracker (supplier responses, pricing comparison)
- Award workflow (select winner, confirm contract)

#### `client/pages/RFIDDashboard.tsx`
- RFID tag management (register, activate, track)
- Real-time item location tracking
- Spoilage detection alerts
- Theft alerts

---

## SPRINT 6: Supplier Portal, Three-Way Matching, Shamrock Foods

### Backend Services

#### 1. `server/lib/supplier-portal-service.ts`
- **Purpose:** White-labeled supplier self-service portal
- **Key Methods:**
  - `createSupplierAccount(supplierId, vendorName)`
  - `manageCatalog(supplierId, skuList, pricing)` - bulk upload
  - `submitASN(supplierId, asnNumber, items)` - advance notice
  - `trackOrderStatus(poNumber)` - suppliers see PO→ship→delivery
  - `submitDispute(invoiceId, reason)` - handle variances
  - `viewPerformanceMetrics(supplierId)` - on-time %, quality scores
- **Features:**
  - Vendor catalog management (SKU list, pricing, availability)
  - Pricing updates (bulk upload, effective dates)
  - ASN submission (advance shipping notification)
  - Order status tracking (PO → ship → delivery)
  - Dispute resolution (quantity/price variance handling)
  - Performance metrics visibility (on-time %, quality ratings)

#### 2. `server/lib/three-way-match-reconciliation.ts`
- **Purpose:** Complete PO → ASN → Invoice auto-matching with GL posting
- **Key Methods:**
  - `autoMatchTriple(poId, asnId, invoiceId)` - attempt match
  - `handleVariance(matchId, varianceType, resolution)` - handle mismatches
  - `postToGL(invoiceId)` - auto GL posting on full match
  - `generateReconciliationReport(organizationId, period)` - daily/weekly reports
- **Features:**
  - PO → ASN → Invoice auto-matching engine
  - Variance handling (quantity, price, date discrepancies)
  - Exception management dashboard
  - GL posting automation (once matched)
  - Reconciliation reports (daily/weekly)

#### 3. `server/lib/shamrock-connector.ts`
- **Purpose:** Shamrock Foods EDI integration
- **Features:** Same as US Foods/Sysco (EDI setup, catalog, pricing, punchout, regional focus)

### Database Migrations

#### File: `migrations/048_sprint6_supplier_portal_matching.sql`
- Tables:
  - `supplier_catalogs (supplier_id, sku, description, price, availability)`
  - `supplier_performance (supplier_id, on_time_pct, quality_score, created_at)`
  - `supplier_disputes (invoice_id, quantity_variance, price_variance, status)`
  - `reconciliation_logs (period, matched_count, variance_count, gl_posted)`

### Frontend Components

#### `client/pages/SupplierPortal.tsx` (White-labeled)
- Vendor catalog upload
- Pricing management
- ASN submission form
- Order status tracking
- Dispute resolution

#### `client/pages/ThreeWayMatchDashboard.tsx`
- Match status overview
- Variance handling workflow
- Reconciliation reports

---

## SPRINT 7: Contract Management, Yield Database, Reinhart

### Backend Services

#### 1. `server/lib/contract-management-service.ts`
- **Purpose:** Supplier contract lifecycle management
- **Key Methods:**
  - `createContract(supplierId, terms, pricing, startDate, endDate)`
  - `trackVolumeThresholds(contractId, currentSpend)` - activate discounts
  - `accumulateRebates(contractId, monthlySpend)` - accrue rebates
  - `generateRenewalAlerts(daysUntilExpiry)` - 60/30/7 day alerts
  - `trackPerformanceKPIs(supplierId)` - on-time %, quality, pricing consistency
  - `monitorCompliance(supplierId)` - certifications, insurance, food safety
- **Features:**
  - Contract versioning (track all iterations)
  - Pricing tier automation (volume thresholds, effective dates)
  - Volume discount tracking (accumulate spend, calculate rebate accrual)
  - Auto-renewal alerts (60/30/7 days before expiry)
  - Performance KPI tracking
  - Compliance monitoring (certifications, insurance, expiry dates)

#### 2. `server/lib/yield-database.ts`
- **Purpose:** Recipe costing with standardized yield tables
- **Key Methods:**
  - `getYieldTable(foodGroup)` - get standard yields (proteins, produce, dairy)
  - `applyWasteAdjustment(yieldPercent, actualWastePercent)` - refine yields
  - `calculateRecipeCost(ingredients, yields, wasteAdjustments)`
  - `updateRecipeCostFromIngredientPrice(ingredientId, newPrice)` - cascade updates
  - `createFoodGroupTemplate(category)` - default yields, customizable
  - `overrideYieldForRecipe(recipeId, customYield)` - special recipes
- **Features:**
  - Standardized yield tables by food group
  - Waste adjustment integration (apply actual waste % to recipe costs)
  - Recipe cost updates (ingredient cost changes → menu item cost updated)
  - Food group templates (default yields, customizable per outlet)
  - Custom override support (special recipes, local variations)

#### 3. `server/lib/reinhart-connector.ts`
- **Purpose:** Reinhart Foodservice EDI integration (regional focus)

### Database Migrations

#### File: `migrations/049_sprint7_contracts_yields.sql`
- Tables:
  - `supplier_contracts (org_id, supplier_id, terms, volume_tiers, rebate_rules)`
  - `contract_history (contract_id, old_version, new_version, change_date)`
  - `contract_performance_kpis (supplier_id, on_time_pct, quality_returns, pricing_variance)`
  - `yield_tables (food_group, default_yield, customizable)`
  - `recipe_costs (recipe_id, ingredient_list, calculated_cost, waste_adjusted)`
  - `compliance_tracker (supplier_id, certification_type, expiry_date, status)`

---

## SPRINT 8: SendGrid, Supplier Scorecards, Restaurant Depot

### Backend Services

#### 1. `server/lib/sendgrid-notification-service.ts`
- **Purpose:** Transactional emails and notifications
- **Key Methods:**
  - `sendPOConfirmation(poNumber, vendorEmail)`
  - `sendDeliveryAlert(deliveryDate, outletEmail)`
  - `sendPriceChangeNotification(supplierName, priceChanges)`
  - `sendExceptionAlert(exceptionType, recipients)`
  - `setNotificationPreferences(userId, channels, frequency)` - opt-in/out
  - `generateEmailTemplate(templateName, variables)` - customize branding
  - `trackEmailDelivery(messageId)` - open rate, click-through
- **Features:**
  - Transactional emails (PO, delivery alerts, price changes, exceptions)
  - Notification preferences (per outlet, per role)
  - Multi-language support (English, Spanish, Mandarin, etc.)
  - Email template library (customizable branding)
  - Delivery tracking (open rate, click-through)

#### 2. `server/lib/supplier-scorecard-engine.ts`
- **Purpose:** Comprehensive supplier performance evaluation
- **Key Methods:**
  - `calculateOnTimeDeliveryScore(supplierId, periodDays)` - vs. promised date
  - `calculateQualityScore(supplierId)` - returns, waste %, audit results
  - `calculatePricingConsistencyScore(supplierId)` - variance from contract
  - `calculateResponsiveness(supplierId)` - RFQ response time, support tickets
  - `generateSupplierRankings(organizationId)` - top/bottom performers
  - `trendAnalysis(supplierId, months)` - monthly trends, year-over-year
  - `buildVendorEvaluationMatrix(supplierId)` - score vs. cost for RFQ decisions
- **Features:**
  - On-time delivery % (vs. promised date)
  - Quality ratings (based on returns, waste %, audit results)
  - Pricing consistency (variance from contract terms)
  - Responsiveness score (RFQ response time, support ticket resolution)
  - Visual supplier rankings
  - Performance trend analysis
  - Vendor evaluation matrix

#### 3. `server/lib/scenario-planning-engine.ts`
- **Purpose:** What-if analysis and forecasting
- **Key Methods:**
  - `modelSupplierChange(currentSupplier, newSupplier)` - cost/delivery impact
  - `simulateVolumeChange(percentage)` - "if we buy 20% more, what tier?"
  - `simulateCostInflation(category, percentage)` - "if beef +10%, menu impact?"
  - `evaluatePaymentTerms(netDays, discountPercent)` - "is net 45 worth 2%?"
  - `calculateROI(consolidationSavings, forecastingValue)` - consolidation ROI
- **Features:**
  - Model supplier changes (cost impact, delivery lead time impact)
  - Volume simulations (pricing tier optimization)
  - Cost simulations (ingredient inflation impact)
  - Contract negotiation scenarios
  - ROI calculator (consolidation savings, forecasting accuracy value)

#### 4. `server/lib/restaurant-depot-connector.ts`
- **Purpose:** Restaurant Depot cash-and-carry integration
- **Key Methods:** Invoice import via Pipe17/EDI, cash-and-carry order tracking

### Database Migrations

#### File: `migrations/050_sprint8_email_scorecards.sql`
- Tables:
  - `email_messages (template, recipient, subject, status, sent_at, opened_at)`
  - `notification_preferences (user_id, channel, frequency, opted_in)`
  - `supplier_scorecards (supplier_id, on_time_pct, quality_score, pricing_score, responsiveness)`
  - `supplier_trends (supplier_id, month, metric_value)`
  - `scenario_simulations (simulation_id, scenario_type, inputs, results)`

### Frontend Components

#### `client/pages/SupplierScorecard.tsx`
- On-time delivery % visual
- Quality ratings and trend
- Pricing consistency analysis
- Responsiveness metrics
- Vendor evaluation matrix

---

## SPRINT 9: Offline Sync Hardening, Scale Integration, Security Audit

### Backend Services

#### 1. `server/lib/offline-sync-manager.ts`
- **Purpose:** Conflict resolution and data integrity for offline-first mobile
- **Key Methods:**
  - `handleConflict(deviceA_version, deviceB_version)` - LWW or custom logic
  - `retryWithBackoff(failedSync, maxRetries)` - exponential backoff
  - `validateDataIntegrity(syncedData)` - no corrupted syncs
  - `monitorNetworkResilience(connectionQuality)` - graceful degradation
  - `stressTestSync(conflictCount)` - offline→online transition testing
- **Features:**
  - Conflict resolution (last-write-wins or custom)
  - Retry logic with exponential backoff
  - Data integrity checks
  - Network resilience (graceful handling of poor connections)
  - Offline→online transition stress testing

#### 2. `server/lib/scale-integration-service.ts`
- **Purpose:** Bulk weight capture via Bluetooth/WiFi scales
- **Key Methods:**
  - `registerScale(organizationId, outletId, scaleId, macAddress)`
  - `receiveWeightReading(scaleId, weight, timestamp)` - process weight data
  - `verifyReceivingWeight(poId, expectedWeight, actualWeight)` - variance alert
  - `measureWaste(itemId, wasteWeight)` - spoiled item disposal tracking
  - `syncWeightToInventory(itemId, weight)` - auto-adjust inventory
- **Features:**
  - Bluetooth/WiFi scale integration
  - Bulk item capture via weight
  - Receive verification (expected vs. actual)
  - Waste measurement (weigh spoiled items)
  - IoT telemetry pipeline
  - Pilot: 1 hotel warehouse, 1 receiving dock

#### 3. Security & Compliance Framework
- **Files to create:**
  - `server/lib/encryption-service.ts` - at rest & in transit
  - `server/lib/gdpr-compliance.ts` - data retention, privacy
  - `server/lib/rate-limiter.ts` - prevent API abuse
  - `server/middleware/tls-enforcement.ts` - force HTTPS
- **Features:**
  - Penetration testing coordination (external security firm)
  - Compliance audit (PCI-DSS if payment processing, SOC2)
  - GDPR review for multi-tenant (data isolation, privacy)
  - Encryption at rest (database, backups) & in transit (TLS)
  - Data retention policies (auto-delete old data per GDPR)

---

## SPRINT 10: Multi-Outlet Analytics, Hotel Features, Exception Alerts

### Backend Services

#### 1. `server/lib/multi-outlet-analytics.ts`
- **Purpose:** Cross-outlet visibility and consolidation
- **Key Methods:**
  - `getOrganizationWideSpend(organizationId, category)` - total, by category, by supplier
  - `benchmarkOutlets(organizationId)` - cost per outlet, efficiency metrics
  - `analyzeSupplierConcentration(organizationId)` - % spend with top 3
  - `varianceAnalysis(actual, forecast, budget)` - variances
  - `calculateGroupPurchasingROI(organizationId)` - consolidation savings realized
- **Features:**
  - Org-wide spend visibility
  - Cross-outlet benchmarking
  - Supplier spend concentration analysis
  - Variance analysis (actual vs. forecast, actual vs. budget)
  - Group purchasing ROI calculation

#### 2. `server/lib/hotel-operations-service.ts`
- **Purpose:** Hotel/casino-specific features
- **Key Methods:**
  - `getHotelSpecificModules(outletType)` - gaming supplies, housekeeping
  - `setStaffRoleUI(userId, role)` - chef, housekeeping mgr, etc.
  - `enableMultiLanguageSupport(outletId, languages)` - staff languages
  - `allowOfflineOrdering(outletId)` - order without WiFi
  - `capturePhotoEvidence(outcomeType, photoBuffer)` - waste, damage
- **Features:**
  - Hotel-specific modules (gaming supplies, housekeeping requests)
  - Staff role-based UI (different screens per role)
  - Multi-language support
  - Offline compliance (staff can order without WiFi)
  - Photo capture (waste tracking, damage reporting)

#### 3. `server/lib/exception-alert-engine.ts`
- **Purpose:** Comprehensive exception detection and routing
- **Key Methods:**
  - `detectPriceVariance(invoiceAmount, poAmount, threshold)` - alerts if > 5%
  - `detectDeliveryDelay(promisedDate, actualDate)` - late deliveries
  - `detectQualityIssues(wastePercent, returnRate)` - quality spike
  - `detectForecastMiss(actual, p90Forecast)` - consumption > P90
  - `detectStockoutRisk(onHand, reorderPoint)` - low stock
  - `routeToResponsible(exceptionType)` - smart routing to manager
- **Features:**
  - Price variance alerts (>5% of contract)
  - Delivery delay alerts
  - Quality issue alerts (waste%, return rate spike)
  - Forecast miss alerts (actual > P90)
  - Stockout risk alerts
  - Smart routing to responsible manager

### Database Migrations

#### File: `migrations/051_sprint10_analytics_hotel_alerts.sql`
- Tables:
  - `organization_spend_summary (org_id, category, total, by_supplier)`
  - `outlet_benchmarks (outlet_id, cost_per_item, efficiency_score)`
  - `exception_alerts (type, severity, outlet_id, resolved_at)`
  - `hotel_configurations (outlet_id, module_type, enabled)`

---

## SPRINT 11: Procurement Intelligence, Voice Ordering, Compliance

### Backend Services

#### 1. `server/lib/procurement-intelligence.ts`
- **Purpose:** Advanced supplier optimization and insights
- **Key Methods:**
  - `identifyConsolidationOpportunities(organizationId)` - split→single vendor
  - `analyzeCategoryMix(organizationId)` - how outlets order, best practices
  - `regionalSourcingStrategy(organizationId)` - costs by region, best suppliers
  - `benchmarkAgainstMarket(category)` - compare to market rates, negotiate data
  - `analyzeSeasonalTrends(organizationId, itemId)` - purchasing patterns
- **Features:**
  - Supplier spend optimization
  - Category mix analysis
  - Regional sourcing strategy
  - Cost benchmarking against market
  - Seasonal trend analysis

#### 2. `server/lib/voice-ordering-service.ts`
- **Purpose:** Voice-activated ordering interface
- **Key Methods:**
  - `transcribeVoiceInput(audioBuffer)` - convert speech to text
  - `parseVoiceOrder(transcript)` - extract items, quantities
  - `confirmOrder(parsedOrder)` - repeat back to user
  - `integrateWithOrdering(confirmedOrder)` - create actual order
  - `enableMultiLanguage(language)` - kitchen staff languages
- **Features:**
  - Voice input for mobile ordering
  - Reduce typos, faster input for busy staff
  - Voice confirmation (repeat order back)
  - Multi-language support

#### 3. `server/lib/compliance-automation-service.ts`
- **Purpose:** Automated audit and compliance management
- **Key Methods:**
  - `scheduleSupplierAudit(supplierId, riskTier)` - annual/quarterly based on risk
  - `trackCertifications(supplierId, certType)` - expiry dates
  - `manageRecalls(supplierIdWithRecall)` - auto-flag, notify affected outlets
  - `generateAuditReport(outletId)` - auto-compile for food safety audits
- **Features:**
  - Supplier audit scheduling (risk-based frequency)
  - Compliance dashboard (all certifications visible)
  - Certification tracking & expiry alerts
  - Recall management (auto-flag, notify)
  - Audit report generation

#### 4. `server/lib/market-intelligence.ts`
- **Purpose:** External market data integration
- **Key Methods:**
  - `subscribeToMarketIndex(category)` - beef, dairy, produce, energy
  - `forecastCategoryInflation(category, months)` - predict price changes
  - `trackSustainability(outletId)` - carbon tracking, local sourcing %
  - `analyzeSupplyChainRisk(supplierId)` - bankruptcy, weather, geopolitical
- **Features:**
  - Commodity price tracking
  - Cost inflation forecasting
  - Sustainability trends
  - Supply chain risk alerts

---

## SPRINT 12: Marketplace Launch, White-Label, Customer Success

### Backend Services

#### 1. `server/lib/supplier-marketplace.ts`
- **Purpose:** Full-featured public/private marketplace
- **Key Methods:**
  - `listProductsOnMarketplace(supplierId, productList)` - public listing
  - `rateSupplier(supplierId, rating, review)` - buyer ratings
  - `aggregateDeals(dealType)` - seasonal promotions, bulk discounts
  - `enableAPIForSuppliers(supplierId)` - supplier API for self-service
- **Features:**
  - Public marketplace (peer discovery)
  - Private marketplace (internal group buying)
  - Rating system (quality, delivery, service)
  - Deal aggregation (seasonal, bulk discounts)
  - Supplier API (suppliers manage products, receive orders)

#### 2. `server/lib/white-label-customization.ts`
- **Purpose:** Customization for large enterprise customers
- **Key Methods:**
  - `customizeBranding(organizationId, logo, colors, domain)`
  - `supportMultiPropertyPOs(organizationId)` - single PO, allocate to multiple
  - `loadHospitalityDefaults(outletType)` - gaming, housekeeping, F&B
  - `enableGroupConsolidation(organizationId)` - workflows for large chains
  - `supportHybridInvoicing(organizationId)` - per-unit vs. master billing
- **Features:**
  - White-label options
  - Multi-property POs (allocate to each property)
  - Gaming/hospitality category defaults
  - Group consolidation workflows
  - Per-property invoicing vs. master billing options

#### 3. `server/lib/customer-success-service.ts`
- **Purpose:** Pilot customer support and metrics
- **Key Methods:**
  - `onboardPilotCustomer(customerId, properties)` - setup workflow
  - `trackAdoptionMetrics(customerId)` - % outlets using, cost savings %, accuracy, waste reduction
  - `issueTracking(customerId)` - rapid response to blockers
  - `weeklyCheckIn(customerId)` - automated feedback collection
- **Features:**
  - Onboard 3-5 pilot customers (hotels/casinos 25+ outlets)
  - Real-world validation (actual orders, suppliers, cost data)
  - Feedback loops (weekly check-ins, issue tracking)
  - Metric tracking dashboard
  - Issue resolution SLA

### Frontend Components (Major Dashboards)

#### `client/pages/SupplierMarketplace.tsx`
- Public marketplace browsing
- Supplier ratings and reviews
- Deal/promotion discovery
- Private group buying interface

#### `client/pages/CustomerSuccessPortal.tsx`
- Pilot customer dashboard
- Adoption metrics (usage, cost savings, accuracy)
- Issue tracker
- Feedback collection

#### `client/pages/WhiteLabelSettings.tsx`
- Branding customization (logo, colors, domain)
- Feature toggles (module enabling)
- Invoice option configuration
- Group structure management

---

## Database Migrations Summary (SPRINT 11-12)

#### File: `migrations/052_sprint11_intelligence_compliance.sql`
- Supplier intelligence tables
- Compliance tracking
- Market intelligence feeds
- Audit scheduling

#### File: `migrations/053_sprint12_marketplace_white_label.sql`
- Marketplace products and ratings
- White-label configuration
- Multi-property PO allocations
- Customer success metrics

---

## Implementation Priority & Timeline

### Phase 1 (Sprints 4-5): Core Operational Features
- Waste automation, dynamic pricing
- RFQ marketplace, RFID/IoT
- Time: 4-5 weeks

### Phase 2 (Sprints 6-7): Enterprise & Supplier Features
- Supplier portal, three-way matching
- Contract management, yield database
- Time: 4-5 weeks

### Phase 3 (Sprints 8-9): Intelligence & Security
- SendGrid, scorecards, scenario planning
- Security audit, offline sync, scales
- Time: 4-5 weeks

### Phase 4 (Sprints 10-12): Analytics & Launch
- Multi-outlet analytics, hotel features
- Procurement intelligence, voice ordering
- Marketplace, white-label, customer success
- Time: 4-5 weeks

---

## Key Integration Patterns

### EDI Integration (Suppliers 1-6)
1. Generate EDI 850 PO message
2. Transmit via EDI gateway (TrueCommerce, Infoconn)
3. Receive EDI 810 (invoice) webhook
4. Receive EDI 856 (ASN) webhook
5. Auto-match PO → ASN → Invoice
6. Post to GL on full match

### Accounting Integration (QB, Xero, NetSuite)
1. OAuth2 auth + token storage
2. Export invoice as bill
3. Auto-map GL codes
4. Mark as paid on reconciliation
5. Multi-currency/multi-subsidiary support

### Mobile Sync Pattern
1. User takes action offline (count, order)
2. App caches locally
3. Regains connection → sync
4. Detect conflicts (concurrent edits)
5. Resolve via LWW or custom logic
6. Retry with exponential backoff
7. Notify user of sync status

---

## Testing & QA Checkpoints

Each sprint should include:
- Unit tests for business logic
- Integration tests for supplier flows
- E2E tests for critical paths
- Load testing (scale to 25+ outlets)
- Security scanning (SAST/DAST)
- Accessibility tests (WCAG AA)
- Real supplier pilot validation

---

## Success Metrics (By Sprint 12)

- **Procurement:** 6 suppliers integrated, 1000+ SKUs catalogued
- **Automation:** 80%+ POs auto-created, 95%+ three-way match success
- **Forecasting:** MAPE < 10%, 3-5 pilot customers live
- **Waste Reduction:** 10-15% waste cost reduction realized
- **Cost Savings:** 5-10% procurement savings through consolidation
- **User Adoption:** 25+ outlet properties using system daily
- **Uptime:** 99.9% SLA achieved
- **Support:** <2 hour response time for critical issues

---

## Next Steps

1. **Start Sprint 4 immediately** - waste and dynamic pricing are highest ROI
2. **Parallel work on Sprints 5-6** - supplier integrations and marketplace
3. **Monthly milestone reviews** - adjust plan based on pilot customer feedback
4. **Production readiness gates** - security audit, performance testing, compliance
5. **Customer success program** - dedicated support for pilot customers

This guide provides a complete technical roadmap for Sprints 4-12. Each section can be implemented independently while maintaining integration points for the overall system.
