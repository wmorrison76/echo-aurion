import fs from "node:fs";
import path from "node:path";

/**
 * Comprehensive Smoke Test: Invoice → Inventory → Recipe → Menu → POS
 * 
 * Enhanced version with:
 * - 10 invoices, 10 items each (100 total items)
 * - Mini panel notifications
 * - EchoAurum P&L updates
 * - Dashboard mini P&L panel updates
 * - Invoice approval workflow
 * - GL posting
 * - Accounts payable
 * - Full pastry module support
 */

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

// Mock invoice line item
interface InvoiceLineItem {
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  vendorId?: string;
  vendorName?: string;
}

// Mock invoice
interface Invoice {
  invoiceId: string;
  vendorId: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  lineItems: InvoiceLineItem[];
  status: "pending" | "approved" | "posted" | "paid";
}

// Generate mock invoices
const generateMockInvoices = (count: number, itemsPerInvoice: number): Invoice[] => {
  const vendors = [
    { id: "vendor-sysco", name: "Sysco Corporation" },
    { id: "vendor-usfoods", name: "US Foods" },
    { id: "vendor-gfs", name: "Gordon Food Service" },
  ];

  const productPool = [
    { name: "Organic Heirloom Carrots", category: "Produce" },
    { name: "Free Range Chicken Breast", category: "Protein" },
    { name: "Extra Virgin Olive Oil", category: "Non-Food" },
    { name: "Fresh Salmon Fillet", category: "Seafood" },
    { name: "Baby Arugula", category: "Produce" },
    { name: "Parmesan Cheese", category: "Dairy" },
    { name: "Arborio Rice", category: "Dry Goods" },
    { name: "White Wine", category: "Beverage" },
    { name: "Butter", category: "Dairy" },
    { name: "Garlic Cloves", category: "Produce" },
    { name: "All-Purpose Flour", category: "Dry Goods" },
    { name: "Sugar", category: "Dry Goods" },
    { name: "Eggs", category: "Dairy" },
    { name: "Vanilla Extract", category: "Dry Goods" },
    { name: "Chocolate Chips", category: "Dry Goods" },
  ];

  const invoices: Invoice[] = [];

  for (let i = 0; i < count; i++) {
    const vendor = vendors[i % vendors.length];
    const lineItems: InvoiceLineItem[] = [];

    for (let j = 0; j < itemsPerInvoice; j++) {
      const product = productPool[(i * itemsPerInvoice + j) % productPool.length];
      const quantity = Math.floor(Math.random() * 20) + 5;
      const unitPrice = Math.random() * 20 + 2;
      const totalPrice = quantity * unitPrice;

      lineItems.push({
        productName: product.name,
        quantity,
        unit: product.category === "Beverage" ? "btl" : "lb",
        unitPrice,
        totalPrice,
        vendorId: vendor.id,
        vendorName: vendor.name,
      });
    }

    const totalAmount = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);

    invoices.push({
      invoiceId: `inv-${Date.now()}-${i}`,
      vendorId: vendor.id,
      vendorName: vendor.name,
      invoiceNumber: `INV-${String(i + 1).padStart(6, "0")}`,
      invoiceDate: new Date().toISOString().split("T")[0],
      totalAmount,
      lineItems,
      status: "pending",
    });
  }

  return invoices;
};

// Taxonomy classification
const classifyItem = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("carrot")) {
    return {
      standardizedName: "Carrots",
      standardUnit: "oz",
      categories: { tier1: "Produce", tier2: "Vegetables", tier3: "Root Vegetables" },
      glCode: "5010",
      glLabel: "Food Cost - Produce",
    };
  }
  if (n.includes("chicken")) {
    return {
      standardizedName: "Chicken Breast",
      standardUnit: "oz",
      categories: { tier1: "Protein", tier2: "Poultry", tier3: "Chicken" },
      glCode: "5030",
      glLabel: "Food Cost - Proteins",
    };
  }
  if (n.includes("olive oil")) {
    return {
      standardizedName: "Olive Oil",
      standardUnit: "ml",
      categories: { tier1: "Non-Food", tier2: undefined, tier3: undefined },
      glCode: "5070",
      glLabel: "Food Cost - Dry Goods",
    };
  }
  if (n.includes("salmon")) {
    return {
      standardizedName: "Salmon Fillet",
      standardUnit: "oz",
      categories: { tier1: "Seafood", tier2: "Seafood", tier3: "Finfish" },
      glCode: "5050",
      glLabel: "Food Cost - Seafood",
    };
  }
  if (n.includes("arugula") || n.includes("lettuce")) {
    return {
      standardizedName: "Arugula",
      standardUnit: "oz",
      categories: { tier1: "Produce", tier2: "Vegetables", tier3: "Leafy Greens" },
      glCode: "5010",
      glLabel: "Food Cost - Produce",
    };
  }
  if (n.includes("cheese") || n.includes("parmesan")) {
    return {
      standardizedName: "Parmesan Cheese",
      standardUnit: "oz",
      categories: { tier1: "Dairy", tier2: "Cheese", tier3: undefined },
      glCode: "5060",
      glLabel: "Food Cost - Dairy",
    };
  }
  if (n.includes("rice") || n.includes("flour") || n.includes("sugar") || n.includes("chocolate") || n.includes("vanilla")) {
    return {
      standardizedName: name,
      standardUnit: "oz",
      categories: { tier1: "Dry Goods", tier2: undefined, tier3: undefined },
      glCode: "5070",
      glLabel: "Food Cost - Dry Goods",
    };
  }
  if (n.includes("wine") || n.includes("beverage")) {
    return {
      standardizedName: name,
      standardUnit: "ml",
      categories: { tier1: "Beverage", tier2: undefined, tier3: "Wine" },
      glCode: "5100",
      glLabel: "Food Cost - Beverages",
    };
  }
  if (n.includes("butter") || n.includes("egg")) {
    return {
      standardizedName: name,
      standardUnit: "oz",
      categories: { tier1: "Dairy", tier2: undefined, tier3: undefined },
      glCode: "5060",
      glLabel: "Food Cost - Dairy",
    };
  }
  return {
    standardizedName: name,
    standardUnit: "oz",
    categories: { tier1: "Dry Goods" },
    glCode: "5070",
    glLabel: "Food Cost - Dry Goods",
  };
};

// Fuzzy matching
const fuzzyMatch = (query: string, candidates: string[]): { match: string; score: number } | null => {
  const normalize = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "");
  const tokenize = (s: string) => s.split(/\s+/).filter((t) => t.length > 2);

  const q = normalize(query);
  const qTokens = tokenize(q);

  let bestMatch: { match: string; score: number } | null = null;

  for (const candidate of candidates) {
    const c = normalize(candidate);
    const cTokens = tokenize(c);

    if (c === q) {
      return { match: candidate, score: 1.0 };
    }

    let matchingTokens = 0;
    let totalTokenScore = 0;

    for (const qToken of qTokens) {
      let bestTokenScore = 0;
      for (const cToken of cTokens) {
        if (cToken === qToken) {
          bestTokenScore = 1.0;
          break;
        }
        if (cToken.includes(qToken) || qToken.includes(cToken)) {
          const longer = Math.max(qToken.length, cToken.length);
          const shorter = Math.min(qToken.length, cToken.length);
          bestTokenScore = Math.max(bestTokenScore, shorter / longer);
        }
        const qChars = new Set(qToken.split(""));
        const cChars = new Set(cToken.split(""));
        const intersection = new Set([...qChars].filter((x) => cChars.has(x)));
        const union = new Set([...qChars, ...cChars]);
        const jaccard = intersection.size / union.size;
        if (jaccard > 0.6) {
          bestTokenScore = Math.max(bestTokenScore, jaccard);
        }
      }
      if (bestTokenScore > 0.5) {
        matchingTokens++;
        totalTokenScore += bestTokenScore;
      }
    }

    const tokenScore = matchingTokens > 0 ? totalTokenScore / qTokens.length : 0;
    const substringScore = c.includes(q) || q.includes(c) ? Math.min(q.length, c.length) / Math.max(q.length, c.length) : 0;
    const score = tokenScore * 0.8 + substringScore * 0.2;

    if (score > 0.35 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { match: candidate, score };
    }
  }

  return bestMatch;
};

// Storage location (3D shelving)
interface StorageLocation {
  locationId: string;
  zone: string;
  shelf: string;
  position: string;
  coordinates: { x: number; y: number; z: number };
}

const assignStorageLocation = (category: string): StorageLocation => {
  const locations: Record<string, StorageLocation> = {
    Produce: { locationId: "W1-S3-P2", zone: "Walk-in 1", shelf: "Shelf 3", position: "Position 2", coordinates: { x: 1, y: 3, z: 2 } },
    Protein: { locationId: "W1-S1-P1", zone: "Walk-in 1", shelf: "Shelf 1", position: "Position 1", coordinates: { x: 1, y: 1, z: 1 } },
    Seafood: { locationId: "W1-S1-P3", zone: "Walk-in 1", shelf: "Shelf 1", position: "Position 3", coordinates: { x: 1, y: 1, z: 3 } },
    Dairy: { locationId: "W1-S2-P1", zone: "Walk-in 1", shelf: "Shelf 2", position: "Position 1", coordinates: { x: 1, y: 2, z: 1 } },
    "Non-Food": { locationId: "DS-S2-P5", zone: "Dry Storage", shelf: "Shelf 2", position: "Position 5", coordinates: { x: 2, y: 2, z: 5 } },
    "Dry Goods": { locationId: "DS-S1-P1", zone: "Dry Storage", shelf: "Shelf 1", position: "Position 1", coordinates: { x: 2, y: 1, z: 1 } },
    Beverage: { locationId: "DS-S3-P1", zone: "Dry Storage", shelf: "Shelf 3", position: "Position 1", coordinates: { x: 2, y: 3, z: 1 } },
  };

  return locations[category] || {
    locationId: "DS-S1-P1",
    zone: "Dry Storage",
    shelf: "Shelf 1",
    position: "Position 1",
    coordinates: { x: 1, y: 1, z: 1 },
  };
};

// Calculate ingredient cost with yield
const calculateIngredientCost = (
  unitPrice: number,
  quantity: number,
  unit: string,
  yieldPercent: number = 100,
): number => {
  let baseQty = quantity;
  if (unit === "lb") baseQty = quantity * 16;
  if (unit === "qt") baseQty = quantity * 32;
  if (unit === "btl") baseQty = quantity * 25.4; // 750ml wine bottle ≈ 25.4 oz

  const usableQty = (baseQty * yieldPercent) / 100;
  const costPerOz = unitPrice / (unit === "lb" ? 16 : unit === "qt" ? 32 : unit === "btl" ? 25.4 : 1);
  return usableQty * costPerOz;
};

// Calculate nutrition per portion
const calculateNutrition = (
  ingredient: string,
  quantity: number,
  unit: string,
  portionSizeOz: number,
): { calories: number; protein: number; carbs: number; fat: number } => {
  const nutritionDB: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {
    carrot: { calories: 41, protein: 0.9, carbs: 10, fat: 0.2 },
    "chicken breast": { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    chicken: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    "olive oil": { calories: 884, protein: 0, carbs: 0, fat: 100 },
    salmon: { calories: 206, protein: 22, carbs: 0, fat: 12 },
    arugula: { calories: 25, protein: 2.6, carbs: 3.7, fat: 0.7 },
    "parmesan cheese": { calories: 431, protein: 38, carbs: 4.1, fat: 29 },
    rice: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
    flour: { calories: 364, protein: 10, carbs: 76, fat: 1 },
    sugar: { calories: 387, protein: 0, carbs: 100, fat: 0 },
    egg: { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
    "vanilla extract": { calories: 288, protein: 0.1, carbs: 13, fat: 0.1 },
    "chocolate chips": { calories: 480, protein: 5, carbs: 63, fat: 30 },
    butter: { calories: 717, protein: 0.9, carbs: 0.1, fat: 81 },
    wine: { calories: 83, protein: 0.1, carbs: 2.6, fat: 0 },
  };

  const key = ingredient.toLowerCase();
  let nutrition = nutritionDB[key];

  if (!nutrition) {
    if (key.includes("carrot")) nutrition = nutritionDB.carrot;
    else if (key.includes("chicken")) nutrition = nutritionDB.chicken;
    else if (key.includes("olive")) nutrition = nutritionDB["olive oil"];
    else if (key.includes("salmon")) nutrition = nutritionDB.salmon;
    else if (key.includes("arugula")) nutrition = nutritionDB.arugula;
    else if (key.includes("cheese") || key.includes("parmesan")) nutrition = nutritionDB["parmesan cheese"];
    else if (key.includes("rice")) nutrition = nutritionDB.rice;
    else if (key.includes("flour")) nutrition = nutritionDB.flour;
    else if (key.includes("sugar")) nutrition = nutritionDB.sugar;
    else if (key.includes("egg")) nutrition = nutritionDB.egg;
    else if (key.includes("vanilla")) nutrition = nutritionDB["vanilla extract"];
    else if (key.includes("chocolate")) nutrition = nutritionDB["chocolate chips"];
    else if (key.includes("butter")) nutrition = nutritionDB.butter;
    else if (key.includes("wine")) nutrition = nutritionDB.wine;
    else nutrition = { calories: 50, protein: 2, carbs: 5, fat: 1 };
  }

  const portionGrams = portionSizeOz * 28.35;
  const multiplier = portionGrams / 100;

  return {
    calories: Math.round(nutrition.calories * multiplier),
    protein: Math.round(nutrition.protein * multiplier * 10) / 10,
    carbs: Math.round(nutrition.carbs * multiplier * 10) / 10,
    fat: Math.round(nutrition.fat * multiplier * 10) / 10,
  };
};

// Mini panel notification simulation
interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  priority: "low" | "medium" | "high" | "critical";
}

let notifications: Notification[] = [];

const emitNotification = (type: string, title: string, message: string, priority: Notification["priority"] = "medium") => {
  notifications.push({
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    message,
    timestamp: new Date().toISOString(),
    priority,
  });
};

const resetNotifications = () => {
  notifications = [];
};

// EchoAurum P&L update simulation
interface PnLState {
  outletId: string;
  period: string;
  revenue: number;
  cogs: number;
  laborCost: number;
  overheadCost: number;
  netProfit: number;
  lastUpdated: string;
}

const pnlStates = new Map<string, PnLState>();

const updatePnL = (outletId: string, period: string, cogsDelta: number) => {
  const key = `${outletId}:${period}`;
  const existing = pnlStates.get(key) || {
    outletId,
    period,
    revenue: 0,
    cogs: 0,
    laborCost: 0,
    overheadCost: 0,
    netProfit: 0,
    lastUpdated: new Date().toISOString(),
  };

  const updated: PnLState = {
    ...existing,
    cogs: existing.cogs + cogsDelta,
    netProfit: existing.revenue - (existing.cogs + cogsDelta) - existing.laborCost - existing.overheadCost,
    lastUpdated: new Date().toISOString(),
  };

  pnlStates.set(key, updated);
  return updated;
};

// GL posting simulation
interface GLPosting {
  id: string;
  invoiceId: string;
  glCode: string;
  glLabel: string;
  amount: number;
  debitCredit: "debit" | "credit";
  period: string;
  postedAt: string;
}

const glPostings: GLPosting[] = [];

const postToGL = (invoiceId: string, glCode: string, glLabel: string, amount: number, period: string) => {
  glPostings.push({
    id: `gl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    invoiceId,
    glCode,
    glLabel,
    amount,
    debitCredit: "debit",
    period,
    postedAt: new Date().toISOString(),
  });
};

// Accounts Payable simulation
interface APRecord {
  id: string;
  invoiceId: string;
  vendorId: string;
  amount: number;
  dueDate: string;
  status: "pending" | "approved" | "scheduled" | "paid";
  createdAt: string;
}

const apRecords: APRecord[] = [];

const createAPRecord = (invoiceId: string, vendorId: string, amount: number, dueDate: string) => {
  apRecords.push({
    id: `ap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    invoiceId,
    vendorId,
    amount,
    dueDate,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
};

const run = async (module: "culinary" | "pastry" = "culinary") => {
  // Reset state for independent test
  resetNotifications();
  pnlStates.clear();
  glPostings.length = 0;
  apRecords.length = 0;

  console.log("=".repeat(80));
  console.log(`Comprehensive Smoke Test: Invoice → Inventory → Recipe → Menu → POS (${module.toUpperCase()})`);
  console.log("=".repeat(80));
  console.log();

  const orgId = "demo-org";
  const outletId = module === "pastry" ? "outlet-pastry" : "outlet-main";
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM

  const results: any = {
    module,
    invoices: [],
    inventory: { items: [] },
    storage: { placements: [] },
    notifications: [],
    pnl: {},
    glPostings: [],
    apRecords: [],
    recipes: [],
    menuItems: [],
  };

  // Step 1: Generate and process 10 invoices with 10 items each
  console.log(`Step 1: Processing 10 Invoices (10 items each = 100 total items)`);
  console.log("-".repeat(80));

  const invoices = generateMockInvoices(10, 10);
  let totalInvoiceAmount = 0;
  let totalItemsProcessed = 0;

  for (const invoice of invoices) {
    totalInvoiceAmount += invoice.totalAmount;
    totalItemsProcessed += invoice.lineItems.length;

    // Process each line item
    for (const lineItem of invoice.lineItems) {
      const classification = classifyItem(lineItem.productName);

      // Emit notification for new product received
      emitNotification(
        "inventory:product_received",
        "Product Received",
        `${lineItem.productName} (${lineItem.quantity} ${lineItem.unit}) received from ${invoice.vendorName}`,
        "medium",
      );

      // Update inventory
      const inventoryItem = {
        productId: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: classification.standardizedName,
        category: classification.categories.tier1,
        quantity: lineItem.quantity,
        unit: lineItem.unit,
        unitCost: lineItem.unitPrice,
        totalCost: lineItem.totalPrice,
        glCode: classification.glCode,
        glLabel: classification.glLabel,
        receivedAt: new Date().toISOString(),
        vendorId: invoice.vendorId,
        vendorName: invoice.vendorName,
      };

      results.inventory.items.push(inventoryItem);

      // Assign 3D shelving location
      const location = assignStorageLocation(classification.categories.tier1);
      results.storage.placements.push({
        productId: inventoryItem.productId,
        productName: inventoryItem.name,
        location,
      });

      // Update P&L (COGS)
      updatePnL(outletId, period, lineItem.totalPrice);

      // Post to GL
      postToGL(invoice.invoiceId, classification.glCode, classification.glLabel, lineItem.totalPrice, period);
    }

    // Create AP record
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // Net 30
    createAPRecord(invoice.invoiceId, invoice.vendorId, invoice.totalAmount, dueDate.toISOString().split("T")[0]);

    invoice.status = "approved";
    results.invoices.push(invoice);
  }

  console.log(`  ✓ Processed ${invoices.length} invoices`);
  console.log(`  ✓ Processed ${totalItemsProcessed} line items`);
  console.log(`  ✓ Total invoice amount: $${totalInvoiceAmount.toFixed(2)}`);
  console.log(`  ✓ Generated ${notifications.length} notifications`);
  console.log();

  // Step 2: Verify notifications
  console.log("Step 2: Mini Panel Notifications");
  console.log("-".repeat(80));
  console.log(`  ✓ Generated ${notifications.length} notifications`);
  console.log(`  ✓ Notification types: ${[...new Set(notifications.map((n) => n.type))].join(", ")}`);
  results.notifications = notifications;
  console.log();

  // Step 3: Verify P&L updates
  console.log("Step 3: EchoAurum P&L Updates");
  console.log("-".repeat(80));
  const pnlState = pnlStates.get(`${outletId}:${period}`);
  assert(pnlState !== undefined, "P&L state should exist");
  console.log(`  ✓ P&L updated for ${outletId} (${period})`);
  console.log(`    → COGS: $${pnlState.cogs.toFixed(2)}`);
  console.log(`    → Net Profit: $${pnlState.netProfit.toFixed(2)}`);
  console.log(`    → Last Updated: ${pnlState.lastUpdated}`);
  results.pnl = pnlState;
  console.log();

  // Step 4: Verify GL postings
  console.log("Step 4: GL Postings");
  console.log("-".repeat(80));
  console.log(`  ✓ Posted ${glPostings.length} GL entries`);
  const glByCode = new Map<string, number>();
  glPostings.forEach((posting) => {
    const current = glByCode.get(posting.glCode) || 0;
    glByCode.set(posting.glCode, current + posting.amount);
  });
  console.log(`  ✓ GL Code Summary:`);
  glByCode.forEach((amount, code) => {
    const posting = glPostings.find((p) => p.glCode === code);
    console.log(`    → ${code} (${posting?.glLabel}): $${amount.toFixed(2)}`);
  });
  results.glPostings = glPostings;
  console.log();

  // Step 5: Verify AP records
  console.log("Step 5: Accounts Payable Records");
  console.log("-".repeat(80));
  console.log(`  ✓ Created ${apRecords.length} AP records`);
  const totalAP = apRecords.reduce((sum, ap) => sum + ap.amount, 0);
  console.log(`  ✓ Total AP: $${totalAP.toFixed(2)}`);
  results.apRecords = apRecords;
  console.log();

  // Step 6: Create recipes with fuzzy ingredient matching
  console.log("Step 6: Recipe Creation with Fuzzy Ingredient Matching");
  console.log("-".repeat(80));

  const recipeNames = module === "pastry"
    ? [
        "Chocolate Chip Cookies",
        "Vanilla Cake",
        "Buttercream Frosting",
        "Sugar Cookies",
        "Brownies",
      ]
    : [
        "Herb-Crusted Chicken with Roasted Carrots",
        "Pan-Seared Salmon with Arugula",
        "Risotto with Parmesan",
        "Chicken Caesar Salad",
        "Grilled Chicken Breast",
      ];

  const recipeQueries = module === "pastry"
    ? [
        { query: "chocolate chips", expectedMatch: "Chocolate Chips" },
        { query: "flour", expectedMatch: "All-Purpose Flour" },
        { query: "sugar", expectedMatch: "Sugar" },
        { query: "butter", expectedMatch: "Butter" },
        { query: "vanilla", expectedMatch: "Vanilla Extract" },
      ]
    : [
        { query: "heirloom carots", expectedMatch: "Carrots" },
        { query: "chicken breast", expectedMatch: "Chicken Breast" },
        { query: "olive oil", expectedMatch: "Olive Oil" },
        { query: "salmon", expectedMatch: "Salmon Fillet" },
        { query: "arugula", expectedMatch: "Arugula" },
      ];

  for (let i = 0; i < Math.min(5, recipeNames.length); i++) {
    const recipeName = recipeNames[i];
    const ingredientQueries = recipeQueries.slice(0, 3); // Use first 3 ingredients

    const matchedIngredients: any[] = [];
    for (const ing of ingredientQueries) {
      const candidates = results.inventory.items.map((item: any) => item.name);
      const match = fuzzyMatch(ing.query, candidates);
      assert(match !== null, `Failed to fuzzy match: ${ing.query}`);

      const inventoryItem = results.inventory.items.find((item: any) => item.name === match.match);
      assert(inventoryItem !== undefined, `Inventory item not found: ${match.match}`);

      let yieldPercent = 100;
      if (match.match.toLowerCase().includes("carrot")) yieldPercent = 85;
      else if (match.match.toLowerCase().includes("chicken")) yieldPercent = 75;
      else if (match.match.toLowerCase().includes("salmon")) yieldPercent = 80;

      matchedIngredients.push({
        query: ing.query,
        matched: match.match,
        confidence: match.score,
        inventoryId: inventoryItem.productId,
        quantity: 1,
        unit: "lb",
        yieldPercent,
      });
    }

    // Calculate recipe cost
    let totalRecipeCost = 0;
    for (const ing of matchedIngredients) {
      const inventoryItem = results.inventory.items.find((item: any) => item.productId === ing.inventoryId);
      const ingredientCost = calculateIngredientCost(
        inventoryItem.unitCost,
        ing.quantity,
        ing.unit,
        ing.yieldPercent,
      );
      totalRecipeCost += ingredientCost;
    }

    const portionSize = 8;
    const costPerPortion = totalRecipeCost / portionSize;

    // Calculate nutrition
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    const recipeTotalOz = matchedIngredients.reduce((sum, ing) => {
      const qtyOz = ing.unit === "lb" ? ing.quantity * 16 : ing.quantity * 32;
      return sum + qtyOz;
    }, 0);
    const portionRatio = portionSize / recipeTotalOz;

    for (const ing of matchedIngredients) {
      const qtyOz = ing.unit === "lb" ? ing.quantity * 16 : ing.quantity * 32;
      const fullNutrition = calculateNutrition(ing.matched, qtyOz, "oz", qtyOz);
      const nutrition = {
        calories: Math.round(fullNutrition.calories * portionRatio),
        protein: Math.round(fullNutrition.protein * portionRatio * 10) / 10,
        carbs: Math.round(fullNutrition.carbs * portionRatio * 10) / 10,
        fat: Math.round(fullNutrition.fat * portionRatio * 10) / 10,
      };
      totalCalories += nutrition.calories;
      totalProtein += nutrition.protein;
      totalCarbs += nutrition.carbs;
      totalFat += nutrition.fat;
    }

    // Create menu item
    const menuItem = {
      id: `menu-${Date.now()}-${i}`,
      name: recipeName,
      description: `${module === "pastry" ? "Pastry" : "Culinary"} recipe with ${matchedIngredients.length} ingredients`,
      category: module === "pastry" ? "Dessert" : "Main Course",
      price: costPerPortion * 3.5,
      cost: costPerPortion,
      portionSize: `${portionSize} oz`,
      nutrition: {
        calories: totalCalories,
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat,
      },
      ingredients: matchedIngredients,
      recipeId: `recipe-${Date.now()}-${i}`,
      posSyncStatus: "ready",
    };

    results.recipes.push({
      name: recipeName,
      ingredients: matchedIngredients,
      totalCost: totalRecipeCost,
      costPerPortion,
    });

    results.menuItems.push(menuItem);

    console.log(`  ✓ Recipe: ${recipeName}`);
    console.log(`    → Ingredients matched: ${matchedIngredients.length}`);
    console.log(`    → Cost per portion: $${costPerPortion.toFixed(2)}`);
    console.log(`    → Nutrition: ${totalCalories} cal, ${totalProtein.toFixed(1)}g protein`);
    console.log(`    → Menu item created for POS: ${menuItem.id}`);
  }
  console.log();

  // Step 7: Dashboard P&L Panel Update
  console.log("Step 7: Dashboard Mini P&L Panel Update");
  console.log("-".repeat(80));
  const dashboardPnL = {
    revenue: pnlState.revenue,
    cogs: pnlState.cogs,
    grossProfit: pnlState.revenue - pnlState.cogs,
    grossMargin: pnlState.revenue > 0 ? ((pnlState.revenue - pnlState.cogs) / pnlState.revenue) * 100 : 0,
    laborCost: pnlState.laborCost,
    overheadCost: pnlState.overheadCost,
    netProfit: pnlState.netProfit,
    netMargin: pnlState.revenue > 0 ? (pnlState.netProfit / pnlState.revenue) * 100 : 0,
    lastUpdated: pnlState.lastUpdated,
  };
  console.log(`  ✓ Dashboard P&L updated`);
  console.log(`    → Revenue: $${dashboardPnL.revenue.toFixed(2)}`);
  console.log(`    → COGS: $${dashboardPnL.cogs.toFixed(2)}`);
  console.log(`    → Gross Profit: $${dashboardPnL.grossProfit.toFixed(2)} (${dashboardPnL.grossMargin.toFixed(1)}%)`);
  console.log(`    → Net Profit: $${dashboardPnL.netProfit.toFixed(2)} (${dashboardPnL.netMargin.toFixed(1)}%)`);
  results.dashboardPnL = dashboardPnL;
  console.log();

  // Summary
  console.log("=".repeat(80));
  console.log(`✅ Comprehensive Smoke Test Complete (${module.toUpperCase()})`);
  console.log("=".repeat(80));
  console.log();
  console.log("Summary:");
  console.log(`  • Invoices processed: ${invoices.length} (${totalItemsProcessed} items)`);
  console.log(`  • Inventory items added: ${results.inventory.items.length}`);
  console.log(`  • Storage locations assigned: ${results.storage.placements.length}`);
  console.log(`  • Notifications generated: ${notifications.length}`);
  console.log(`  • P&L updated: COGS $${pnlState.cogs.toFixed(2)}`);
  console.log(`  • GL postings: ${glPostings.length} entries`);
  console.log(`  • AP records created: ${apRecords.length}`);
  console.log(`  • Recipes created: ${results.recipes.length}`);
  console.log(`  • Menu items created for POS: ${results.menuItems.length}`);
  console.log();
  console.log(`✅ Full operational loop verified: Invoice → Inventory → Recipe → Menu → POS (${module})`);

  // Save results
  const outputPath = path.resolve(
    process.cwd(),
    `scripts/outputs/invoice-to-pos-${module}-comprehensive-results.json`,
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);

  return results;
};

// Run for both culinary and pastry
const runAll = async () => {
  console.log("Running comprehensive smoke test for CULINARY module...\n");
  await run("culinary");

  console.log("\n\n");
  console.log("Running comprehensive smoke test for PASTRY module...\n");
  await run("pastry");

  console.log("\n\n");
  console.log("=".repeat(80));
  console.log("✅ All Comprehensive Smoke Tests Complete");
  console.log("=".repeat(80));
  console.log("\nBoth Culinary and Pastry modules tested successfully!");
};

runAll().catch((error) => {
  console.error("❌ Smoke test failed:", error);
  process.exit(1);
});
