# Claude's Fresh-Packed Meal Platform — Verbatim Source Spec
**Archived:** Feb 2026 (iter192) · **Received from:** William
**Purpose:** Immutable reference. Do not edit. The upgrade plan at `/app/memory/FRESH_MEAL_UPGRADE_PLAN.md` derives from this file.

---

# LUCCCA Fresh-Packed Meal Platform — Emergent Build Specification

**Target:** Emergent AI coding platform
**Base:** LUCCCA Framework (TypeScript/React, panel system already built, Echo AI³ core in development)
**Goal:** Build the category-defining operating system for fresh-packed meal programs

This document is written to be consumed by Emergent as a deep contextual brief. It assumes the panel system, routing, auth, and baseline Echo AI³ integration are already in place. Focus is on domain logic, data model, module behavior, and the architectural revelations that make this platform uncatchable.

---

## Section 0: Revelations — What I Saw on the Second Pass

### Revelation 1: The Time Graph is the Missing Dimension
Every meal prep platform models *things* (customers, orders, recipes). Almost none model *time properly*. A fresh-packed meal business is a time machine — an order placed Monday becomes a PO Tuesday, a receipt Wednesday, a prep Thursday, a pack Friday, a delivery Saturday, a meal eaten Sunday, feedback Monday. Every entity has a temporal lifecycle, and failures almost always happen at the *transitions*.

**Build a first-class `TimelineEvent` primitive that every domain object emits.** One primitive, six huge capabilities: audit log (FSMA 204 nearly free), traceability graph, live activity feed, Echo anomaly-detection training data, cycle-time metrics, SLA enforcement layer.

### Revelation 2: The Recipe is a Graph, Not a List
A recipe is a directed acyclic graph of **RecipeNodes**, where each node can be a raw ingredient *or another recipe* (sub-recipe, sauce, marinade, spice blend). Yields, allergens, costs, and nutrition propagate up the graph automatically.

### Revelation 3: Channel is First-Class
Not `is_b2b: true`. Channel has its own pricing, label format, order cadence, SLA, invoicing terms, menu subset, compliance requirements. A customer *belongs to* one or more channels. Adding a hospital-EHR channel becomes configuration, not rebuild.

### Revelation 4: Pack is the Atomic Operational Unit
Operators don't think in orders — they think in packs. One physical container going to one destination with a specific pack date, expiry, lot composition, label, and temperature history. An order might contain 5 packs.

### Revelation 5: Echo Needs a "Permission Ladder," Not a Toggle
- Rung 0 — Observe
- Rung 1 — Suggest
- Rung 2 — Draft (one-click approve)
- Rung 3 — Execute with notification (1-hour reversible)
- Rung 4 — Autonomous within guardrails, reports in daily brief

Each capability has its own rung. Operators ratchet up as trust builds.

### Revelation 6: Benchmarking Needs "Glass Box" Explainability
Every benchmark value must include: peer set definition, sample size, time window, calculation method, and an actionable next step.

> Example:
> You: $4.12/lb · Peer median: $3.48/lb · Top quartile: $3.21/lb
> Peer set: 47 operators, 2K–8K meals/week, Mountain West, protein-forward menus. Sample: last 30 days.
> Recommendation: three vendors used by your peer top quartile that you don't currently buy from.

### Revelation 7: The Kitchen Clock — Unified Operational Tempo
Real kitchens run on a cadence: pull-ahead day, prep day, pack day, delivery day, recovery day. The software should *be aware of the week* and shift behavior accordingly — UI, Echo briefs, notifications, forecasting windows, staff scheduling.

Add a `KitchenCalendar` primitive where each operator defines their weekly rhythm. The entire platform respects it.

---

## Section 1: System Overview for Emergent

### Architectural Principles (Non-Negotiable)
1. One graph, many lenses. All entities live in a shared data model. Views are projections.
2. Every state change emits a TimelineEvent.
3. Recipes are graphs.
4. Channels are first-class.
5. Packs are atomic.
6. Echo has a permission ladder.
7. Benchmarks are glass-box.
8. The Kitchen Calendar drives tempo.
9. Intelligence is embedded, not appended. No separate "BI module."
10. Optimistic UI everywhere.

---

## Section 2: Core Data Model (TypeScript)

```typescript
interface TimelineEvent {
  id: string;
  type: EventType; // 'order.placed' | 'lot.received' | 'batch.started' | 'pack.sealed' | ...
  timestamp: Date;
  actor: { type: 'user' | 'system' | 'echo'; id: string; name: string };
  location?: GeoPoint;
  entityRefs: EntityRef[];
  payload: Record<string, unknown>;
  tenantId: string;
}

interface RecipeNode {
  id: string;
  type: 'ingredient' | 'sub_recipe';
  name: string;
  ingredientId?: string;
  quantity?: Quantity;
  subRecipeId?: string;
  scaleFactor?: number;
  computedNutrition?: NutritionProfile;
  computedAllergens?: AllergenProfile;
  computedCost?: Money;
  computedYield?: number;
}

interface Recipe {
  id: string; name: string; version: number;
  versionHistory: RecipeVersion[];
  rootNode: RecipeNode;
  yield: { qty: number; unit: string };
  actualYield?: { qty: number; unit: string; updatedAt: Date };
  prepSpec: ProductionSpec; packSpec: PackSpec;
  shelfLife: { days: number; openedDays?: number };
  tags: string[]; publishedToChannels: string[];
  status: 'draft' | 'active' | 'retired';
}

interface Channel {
  id: string;
  type: 'b2c_subscription' | 'b2c_alacarte' | 'b2b_corporate' | 'b2b_gym' |
        'clinical' | 'retail' | 'grocery_wholesale' | 'concierge_medicine';
  name: string;
  labelFormat: LabelFormatConfig;
  pricingRules: PricingRule[];
  orderCadence: CadenceConfig;
  sla: ServiceLevelAgreement;
  invoicingTerms?: InvoicingTerms;
  menuSubset?: string[];
  complianceRequirements: ComplianceRequirement[];
  fulfillmentDefaults: FulfillmentConfig;
}

interface Pack {
  id: string; orderId: string; channelId: string;
  customerId: string; recipeId: string; recipeVersion: number;
  portionSize: 'small' | 'medium' | 'large' | number;
  packDate: Date; expiryDate: Date;
  lotComposition: LotRef[];
  labelId: string;
  temperatureHistory: TempReading[];
  status: 'planned' | 'in_production' | 'cooling' | 'packed' |
          'staged' | 'out_for_delivery' | 'delivered' | 'consumed' | 'issue';
  weight?: number; scannedAt?: Date; batchId: string;
  fulfillmentId?: string;
}

interface Order {
  id: string; customerId: string; channelId: string;
  placedAt: Date; deliveryDate: Date; status: OrderStatus;
  packs: Pack[];
  subtotal: Money; fees: Money; tax: Money; total: Money;
  personalizationContext?: PersonalizationSnapshot;
}

interface Customer {
  id: string; name: string;
  channels: string[];
  profile: {
    goals?: NutritionGoals;
    restrictions: DietaryRestriction[];
    allergens: Allergen[];
    dislikes: string[]; preferences: string[];
    kitchen?: { hasMicrowave: boolean; hasOven: boolean };
  };
  healthContext?: {
    conditions: MedicalCondition[];
    prescribingProvider?: string;
    dietitianId?: string;
    mealPrescriptionId?: string;
  };
  b2bContext?: {
    accountId: string; department?: string; deliveryLocation?: string;
  };
  subscription?: SubscriptionState;
  ltv: Money;
  churnRisk?: number;
  lifecycleStage: 'prospect' | 'new' | 'active' | 'at_risk' | 'dormant' | 'churned' | 'won_back';
}

interface Account {
  id: string; name: string;
  type: 'corporate' | 'gym_chain' | 'hospital' | 'retailer' | 'clinic';
  customers: string[]; contracts: Contract[];
  deliveryLocations: DeliveryLocation[];
  invoicing: InvoicingConfig;
}

interface Ingredient {
  id: string; name: string; category: string; unit: string;
  currentLots: Lot[]; approvedVendors: VendorRef[];
  nutritionPer100g: NutritionProfile;
  allergens: Allergen[];
  shelfLife: { raw: number; prepped?: number };
  par?: Quantity;
  theoreticalYield: number;
  actualYieldRolling?: number;
}

interface Lot {
  id: string; ingredientId: string; vendorId: string; poId: string;
  receivedAt: Date; receivedBy: string; receivedTemp?: number;
  quantityReceived: Quantity; quantityRemaining: Quantity;
  expiryDate: Date; supplierLotNumber?: string;
  certifications?: string[];
  status: 'active' | 'consumed' | 'expired' | 'recalled' | 'quarantined';
  consumptionTrace: ConsumptionEvent[];
}

interface ProductionBatch {
  id: string; recipeId: string; recipeVersion: number;
  plannedQty: number; actualQty?: number;
  stationAssignments: StationAssignment[];
  startedAt?: Date; completedAt?: Date;
  lotsConsumed: LotConsumption[];
  yieldActual?: number;
  waste?: { qty: number; reason: string };
  ccpLogs: CCPLog[];
  assignedTo: string[];
  status: 'planned' | 'in_progress' | 'cooling' | 'complete' | 'held' | 'failed';
  collisionWarnings?: CollisionWarning[];
}

interface Fulfillment {
  id: string;
  type: 'home_delivery' | 'pickup' | 'partner_drop' | 'retail_placement' | '3pl_shipment';
  packs: string[];
  driverId?: string; routeId?: string;
  scheduledFor: Date;
  deliveryWindow: { start: Date; end: Date };
  address?: Address;
  cooler?: CoolerAssignment;
  tempReadings: TempReading[];
  pod?: ProofOfDelivery;
  status: FulfillmentStatus;
}

interface KitchenCalendar {
  id: string; tenantId: string;
  weekPattern: {
    monday: DayType; // 'prep' | 'pack' | 'deliver' | 'rest' | 'receive' | 'hybrid'
    tuesday: DayType; /* ... */
  };
  cutoffs: { [deliveryDay: string]: { daysBefore: number; time: string } };
  productionWindows: ProductionWindow[];
  shifts: ShiftTemplate[];
}

interface Label {
  id: string; packId: string;
  recipeId: string; recipeVersion: number;
  format: LabelFormat; channelId: string;
  content: {
    productName: string;
    ingredientStatement: string; // FDA-ordered, descending weight
    nutritionFacts: NutritionPanel;
    allergenStatement: string;
    netWeight: string; lotCode: string;
    packDate: Date; expiryDate: Date;
    manufacturer: ManufacturerInfo;
    instructions?: string;
    regulatoryMarks?: string[];
  };
  regenerateOnRecipeChange: boolean;
  printedAt?: Date;
}

type Allergen = 'milk' | 'eggs' | 'fish' | 'shellfish' | 'tree_nuts' |
                'peanuts' | 'wheat' | 'soybeans' | 'sesame';
```

---

## Section 3: Module-by-Module Build Spec (condensed)

**3.1 Culinary Intelligence** — Recipe authoring + versioning + nutrition/allergen/cost source of truth. Graph-based sub-recipe composition, FDA 21 CFR 101 ingredient statements, menu engineering quadrant.

**3.2 Demand & Forecast (Prophet)** — SKU × channel × zone × week resolution. Nightly full run + hourly incremental. Confidence intervals shown explicitly.

**3.3 Procurement & Receiving** — Echo-drafted POs from forecast, multi-vendor intelligence, mobile scan-receiving with temp capture + photo damage + accept/reject/sub. Landed cost reconciliation.

**3.4 Inventory & Traceability** — Live lot-level grid, FEFO/FIFO consumption, full forward+backward trace <2 s, expiry-countdown dashboard, mock recall tool.

**3.5 Production & Kitchen Floor** — Command (desktop): Gantt by station with collision warnings. Floor (tablet): station queue, step-by-step execution, voice CCP logging, scale + label printer integration, offline-capable.

**3.6 Labeling & Compliance** — Auto-regenerated FDA-compliant labels, HACCP authoring with CCP library, compliance dashboard with audit-readiness score, retail spec-sheet export (Whole Foods, Sprouts, Kroger, UNFI).

**3.7 Customer & Channel** — Unified customer graph, channel config surface, personalization engine (goals × menu), churn risk via Guardian AI, B2B account hierarchy, pause/skip/swap flows.

**3.8 Fulfillment & Cold Chain** — VRP route optimizer, BLE cooler temp telemetry, reusable container QR tracking, 3PL handoff for out-of-zone. Driver mobile with 2-tap POD.

**3.9 Staff & Operations** — Forecast-driven schedule, SOP library station-linked, throughput metrics via scan timestamps, accountability trace complaint→pack→shift→staff.

---

## Section 4: Echo AI³ Integration

### Capability / Rung defaults
| Capability | Default |
|---|---|
| Morning brief generation | 4 |
| Anomaly detection | 4 |
| PO drafting | 2 |
| PO execution (under threshold) | 1 → 3 |
| Forecast adjustment | 3 |
| Customer retention offers | 1 |
| Staff scheduling | 2 |
| Menu recommendations | 1 |
| Vendor switching | 1 |
| Label regeneration | 3 |
| Price adjustments | 0 |
| Recipe modifications | 0 |

### Morning Brief (5:30 AM default, ≤ 7 items, prioritized)
1. Critical (blocks today's production)
2. Financial (unusual cost, margin warnings)
3. Customer (at-risk, complaints, opportunities)
4. Operational (yield variance, staff gaps, equipment)
5. Strategic (weekly trends, benchmark shifts)

Each item: one-line summary + one-paragraph context + 1–3 one-click actions.

### NL Interface examples
- "What did we waste Tuesday and why?"
- "Which customers are at churn risk this month?"
- "Draft next week's PO based on the Mediterranean menu."
- "Show me the five worst-performing recipes by margin."

Responses always include: answer + data + confidence + 1–3 follow-up actions.

---

## Section 5: Network Intelligence

Opt-in per data category. No customer PII. Every benchmark surfaced with peer-set size/geo/volume, sample n, time window, calc method, and actionable recommendation.

---

## Section 6: UX Surfaces

- **Command** (desktop): Home = "The Brief", pillar rail, Echo orb, universal status bar, command palette (⌘K)
- **Floor** (kitchen tablet): dark UI, large touch targets, voice-enabled, offline-capable
- **Route** (driver mobile): next-stop-card-dominant, 2-tap POD
- **Taste** (customer app + web): personalized menu, goal dashboard, inventory-aware ordering, 1-tap pause/skip/swap, delivery tracking with temp confirmation

---

## Section 7: Implementation Sequencing

### Phase 1 (M0–6): The Production Loop
Recipe graph → Forecast → Procurement → Inventory → Production → Pack → Label → Fulfillment. TimelineEvent live everywhere. Kitchen Calendar. Floor MVP. Echo morning brief (rung 2–3).

### Phase 2 (M6–12): Customer & Channel Depth
Customer app. Subscriptions. B2B hierarchy. First corporate + gym templates. Personalization. Driver app. Echo NL query (rung 2 customer comms).

### Phase 3 (M12–18): Network Intelligence & Scale
Benchmarking w/ glass-box. Clinical channel. Open REST + GraphQL. Skills/extensions framework. Multi-location. Enterprise (SSO, advanced RBAC, audit export).

---

## Section 8: 10 Non-Negotiable Quality Bars

1. Every state change emits TimelineEvent. No exceptions.
2. Every recipe change propagates through the graph. No stale data.
3. Every benchmark is explainable.
4. Every Echo action reversible (rung ≤ 3) and auditable.
5. Every label passes FDA 21 CFR 101 validation before print.
6. Mock recall returns forward+backward trace in < 5 s.
7. Floor surface works offline, syncs on reconnect.
8. Every customer interaction logs to Timeline.
9. All sensitive operations require audit trail.
10. Perf budget: panel <200ms, paginate >200 rows, cross-entity query <2s.

---

## Section 9: What NOT to Build (Yet)

Skip Phase 1–2: multi-currency / i18n, advanced menu engineering sims, white-label customer apps per operator, skills marketplace, native mobile app for operators (responsive web first), deep accounting integrations (QB/Xero basic only), packaging/consumable inventory forecasting.

---

## Section 10: Final Direction

Build the category-defining OS for a $15B+ industry served today only by point tools. Every module must feel native to a hospitality operator. Every surface two generations ahead. Every piece of intelligence trustworthy, explainable, operator-first — never a black box.

Unfair advantage = unified data graph + 35-year hospitality sensibility + Echo AI³ as ambient operating partner + network intelligence compounding per operator.
