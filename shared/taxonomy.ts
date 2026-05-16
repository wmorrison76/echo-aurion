/**
 * Purchasing Module Taxonomy
 * Enums and constants for categories, units, and classifications
 */

/**
 * Product categories for organizing inventory
 */
export enum ProductCategory {
  PRODUCE = "produce",
  MEAT = "meat",
  SEAFOOD = "seafood",
  DAIRY = "dairy",
  PANTRY = "pantry",
  BEVERAGES = "beverages",
  FROZEN = "frozen",
  DRY_GOODS = "dry_goods",
  SPICES = "spices",
  OILS_VINEGARS = "oils_vinegars",
  CONDIMENTS = "condiments",
  BAKING = "baking",
  PAPER_SUPPLIES = "paper_supplies",
  CLEANING_SUPPLIES = "cleaning_supplies",
  KITCHEN_EQUIPMENT = "kitchen_equipment",
  SMALLWARES = "smallwares",
  OTHER = "other",
}

/**
 * Product families (subcategories)
 */
export enum ProductFamily {
  // Produce
  FRESH_VEGETABLES = "fresh_vegetables",
  FRESH_FRUITS = "fresh_fruits",
  HERBS = "herbs",
  SPECIALTY_PRODUCE = "specialty_produce",

  // Meat
  BEEF = "beef",
  PORK = "pork",
  POULTRY = "poultry",
  LAMB = "lamb",
  GAME = "game",

  // Seafood
  FISH_FILLETS = "fish_fillets",
  SHELLFISH = "shellfish",
  PREPARED_SEAFOOD = "prepared_seafood",

  // Dairy
  MILK = "milk",
  CHEESE = "cheese",
  YOGURT = "yogurt",
  BUTTER = "butter",
  CREAM = "cream",

  // Pantry
  GRAINS = "grains",
  PASTA = "pasta",
  RICE = "rice",
  BEANS = "beans",
  NUTS = "nuts",
  SEEDS = "seeds",

  // Beverages
  COFFEE = "coffee",
  TEA = "tea",
  JUICE = "juice",
  SOFT_DRINKS = "soft_drinks",
  ALCOHOL = "alcohol",
  WATER = "water",

  // Other
  OTHER = "other",
}

/**
 * Units of measure for inventory
 */
export enum UnitOfMeasure {
  // Weight
  GRAM = "g",
  KILOGRAM = "kg",
  OUNCE = "oz",
  POUND = "lb",

  // Volume
  MILLILITER = "ml",
  LITER = "l",
  FLUID_OUNCE = "fl oz",
  GALLON = "gal",
  PINT = "pt",
  QUART = "qt",
  CUP = "cup",
  TABLESPOON = "tbsp",
  TEASPOON = "tsp",

  // Count
  EACH = "each",
  DOZEN = "doz",
  CASE = "case",
  UNIT = "unit",
  PIECE = "piece",

  // Other
  BUNCH = "bunch",
  CLOVE = "clove",
  PINCH = "pinch",
  SHEET = "sheet",
  BOX = "box",
  PACK = "pack",
  COUNT = "count",
}

/**
 * Invoice status transitions
 */
export enum InvoiceStatus {
  PENDING = "pending",
  RECEIVED = "received",
  MATCHED = "matched",
  PAID = "paid",
  DISPUTED = "disputed",
  ARCHIVED = "archived",
}

/**
 * PO status transitions
 */
export enum PurchaseOrderStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  CONFIRMED = "confirmed",
  RECEIVED = "received",
  PARTIAL = "partial",
  CANCELLED = "cancelled",
}

/**
 * Receipt status
 */
export enum ReceiptStatus {
  PENDING = "pending",
  PARTIAL = "partial",
  COMPLETE = "complete",
  DISCREPANCY = "discrepancy",
}

/**
 * Condition of received items
 */
export enum ReceivedItemCondition {
  GOOD = "good",
  DAMAGED = "damaged",
  MISSING = "missing",
  EXPIRED = "expired",
  WRONG_ITEM = "wrong_item",
  SHORT = "short",
  EXCESS = "excess",
}

/**
 * Three-way match status (PO, Receipt, Invoice)
 */
export enum ThreeWayMatchStatus {
  PENDING = "pending",
  MATCHED = "matched",
  UNMATCHED = "unmatched",
  PARTIAL = "partial",
  DISCREPANCY = "discrepancy",
}

/**
 * Discount types
 */
export enum DiscountType {
  PERCENTAGE = "percentage",
  FIXED_AMOUNT = "fixed_amount",
  EARLY_PAYMENT = "early_payment",
  VOLUME = "volume",
  PROMOTIONAL = "promotional",
}

/**
 * Payment terms
 */
export enum PaymentTerms {
  IMMEDIATE = "immediate", // Cash
  NET_7 = "net_7",
  NET_14 = "net_14",
  NET_30 = "net_30",
  NET_60 = "net_60",
  NET_90 = "net_90",
  COD = "cod", // Cash on delivery
  PRE_PAYMENT = "pre_payment",
  CONSIGNMENT = "consignment",
}

/**
 * Ordering frequency
 */
export enum OrderingFrequency {
  DAILY = "daily",
  TWICE_WEEKLY = "twice_weekly",
  WEEKLY = "weekly",
  BIWEEKLY = "biweekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  AS_NEEDED = "as_needed",
}

/**
 * Supplier rating
 */
export enum SupplierRating {
  EXCELLENT = "excellent",
  GOOD = "good",
  FAIR = "fair",
  POOR = "poor",
  NOT_RATED = "not_rated",
}

/**
 * Invoice adjustment types
 */
export enum AdjustmentType {
  DISCOUNT = "discount",
  TAX = "tax",
  SHIPPING = "shipping",
  RESTOCKING = "restocking",
  SAMPLE = "sample",
  OTHER = "other",
}

/**
 * Receiving method
 */
export enum ReceivingMethod {
  MANUAL = "manual", // Manual count
  BARCODE = "barcode", // Barcode scanner
  RFID = "rfid", // RFID reader
  SCALE = "scale", // Weight-based
  INVOICE = "invoice", // Direct from invoice
  PUNCHOUT = "punchout", // From PunchOut system
}

/**
 * Currency codes
 */
export enum Currency {
  USD = "USD",
  EUR = "EUR",
  GBP = "GBP",
  CAD = "CAD",
  AUD = "AUD",
  JPY = "JPY",
  CHF = "CHF",
  CNY = "CNY",
}

/**
 * Common payment methods
 */
export enum PaymentMethod {
  CREDIT_CARD = "credit_card",
  ACH = "ach", // Automated Clearing House
  WIRE_TRANSFER = "wire_transfer",
  CHECK = "check",
  CASH = "cash",
  PURCHASE_ORDER = "purchase_order",
  OTHER = "other",
}

/**
 * Purchasing approval levels
 */
export enum ApprovalLevel {
  MANAGER = "manager",
  DIRECTOR = "director",
  CFO = "cfo",
  AUTO_APPROVE = "auto_approve", // Under threshold
}

/**
 * Vendor type
 */
export enum VendorType {
  DISTRIBUTOR = "distributor",
  MANUFACTURER = "manufacturer",
  LOCAL_SUPPLIER = "local_supplier",
  BROKER = "broker",
  IMPORTER = "importer",
  CO_PACKER = "co_packer",
  OTHER = "other",
}

/**
 * Incoterms for international shipping
 */
export enum Incoterm {
  EXW = "exw", // Ex Works
  FCA = "fca", // Free Carrier
  CPT = "cpt", // Carriage Paid To
  CIP = "cip", // Carriage and Insurance Paid
  DAP = "dap", // Delivered at Place
  DPU = "dpu", // Delivered at Place Unloaded
  DDP = "ddp", // Delivered Duty Paid
  FAS = "fas", // Free Alongside Ship
  FOB = "fob", // Free on Board
  CFR = "cfr", // Cost and Freight
  CIF = "cif", // Cost, Insurance, Freight
}

/**
 * GL (General Ledger) account types for mapping
 */
export enum GLAccountType {
  EXPENSE = "expense",
  ASSET = "asset",
  LIABILITY = "liability",
  REVENUE = "revenue",
  EQUITY = "equity",
}

/**
 * Product taxonomy interface
 */
export interface ProductTaxonomy {
  category: ProductCategory;
  family: ProductFamily;
  primary_uom: UnitOfMeasure;
  secondary_uom?: UnitOfMeasure;
  conversion_factor?: number; // To convert secondary to primary
}

/**
 * Supplier information interface
 */
export interface SupplierInfo {
  type: VendorType;
  rating: SupplierRating;
  payment_terms: PaymentTerms;
  incoterm?: Incoterm;
}

/**
 * Ordering parameters interface
 */
export interface OrderingParameters {
  minimum_order_qty: number;
  preferred_uom: UnitOfMeasure;
  ordering_frequency: OrderingFrequency;
  lead_time_days: number;
  approval_level: ApprovalLevel;
}
