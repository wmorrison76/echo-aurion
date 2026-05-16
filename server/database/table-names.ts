/**
 * Database Table Names
 * Centralized table name mapping for type safety
 */

/**
 * Map TypeScript type to database table name
 */
export const TABLE_NAMES = {
  // Inventory
  InventoryItem: 'inventory_items',
  InventoryLocation: 'inventory_locations',
  InventoryCategory: 'inventory_categories',
  InventoryTransaction: 'inventory_transactions',
  InventoryCount: 'inventory_counts',
  
  // Recipe
  Recipe: 'recipes',
  RecipeIngredient: 'recipe_ingredients',
  RecipeStep: 'recipe_steps',
  RecipeCategory: 'recipe_categories',
  RecipeNutrition: 'recipe_nutrition',
  RecipeVersion: 'recipe_versions',
  RecipePhoto: 'recipe_photos',
  RecipeCost: 'recipe_costs',
  
  // BEO/Events
  BEO: 'beos',
  EventRoom: 'event_rooms',
  Room: 'rooms',
  Equipment: 'equipment',
  EventEquipment: 'event_equipment',
  EventMenu: 'event_menus',
  EventStaff: 'event_staff',
  EventInvoice: 'event_invoices',
  EventPayment: 'event_payments',
  
  // Purchasing
  Supplier: 'suppliers',
  PurchaseOrder: 'purchase_orders',
  PurchaseOrderItem: 'purchase_order_items',
  ReceivingRecord: 'receiving_records',
  SupplierInvoice: 'supplier_invoices',
  SupplierPriceList: 'supplier_price_lists',
  
  // Labor/HR
  Employee: 'employees',
  Position: 'positions',
  Shift: 'shifts',
  TimeClockEntry: 'time_clock_entries',
  TimeOffRequest: 'time_off_requests',
  EmployeeAvailability: 'employee_availability',
  PayrollPeriod: 'payroll_periods',
  PayrollEntry: 'payroll_entries',
  
  // CRM
  Prospect: 'prospects',
  Client: 'clients',
  Activity: 'activities',
  Proposal: 'proposals',
  EmailCampaign: 'email_campaigns',
  ClientSegment: 'client_segments',
  Review: 'reviews',
  Referral: 'referrals',
  
  // Forecasting
  ForecastModel: 'forecast_models',
  RevenueForecast: 'revenue_forecasts',
  DemandForecast: 'demand_forecasts',
  LaborForecast: 'labor_forecasts',
  SeasonalityPattern: 'seasonality_patterns',
  ExternalFactor: 'external_factors',
  
  // Financial
  GLAccount: 'gl_accounts',
  JournalEntry: 'journal_entries',
  JournalEntryLine: 'journal_entry_lines',
  Budget: 'budgets',
  BudgetLine: 'budget_lines',
  Transaction: 'transactions',
  BankAccount: 'bank_accounts',
  BankTransaction: 'bank_transactions',
  
  // Calendar
  CalendarEvent: 'calendar_events',
  RoomAvailability: 'room_availability',
  Resource: 'resources',
  ResourceBooking: 'resource_bookings',
  BlackoutDate: 'blackout_dates'
} as const;

export type TableNameKey = keyof typeof TABLE_NAMES;
export type TableNameValue = (typeof TABLE_NAMES)[TableNameKey];

/**
 * Get table name for a type
 */
export function getTableName(typeName: TableNameKey): TableNameValue {
  return TABLE_NAMES[typeName];
}

/**
 * Convert camelCase to snake_case for column names
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Convert snake_case to camelCase for object properties
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert object keys from camelCase to snake_case
 */
export function objectToSnakeCase(obj: Record<string, any>): Record<string, any> {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    acc[toSnakeCase(key)] = value;
    return acc;
  }, {} as Record<string, any>);
}

/**
 * Convert object keys from snake_case to camelCase
 */
export function objectToCamelCase(obj: Record<string, any>): Record<string, any> {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    acc[toCamelCase(key)] = value;
    return acc;
  }, {} as Record<string, any>);
}

