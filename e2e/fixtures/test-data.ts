/**
 * Smoke Test Fixtures
 * Reusable test data and fixtures for E2E tests
 */

export const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'admin123',
    role: 'Admin',
  },
  manager: {
    email: process.env.TEST_MANAGER_EMAIL || 'manager@test.com',
    password: process.env.TEST_MANAGER_PASSWORD || 'manager123',
    role: 'Manager',
  },
  chef: {
    email: process.env.TEST_CHEF_EMAIL || 'chef@test.com',
    password: process.env.TEST_CHEF_PASSWORD || 'chef123',
    role: 'Chef',
  },
};

export const TEST_VENUES = [
  {
    id: 'venue-main',
    name: 'Main Kitchen',
    type: 'Kitchen',
    capacity: 200,
  },
  {
    id: 'venue-secondary',
    name: 'Secondary Commissary',
    type: 'Commissary',
    capacity: 500,
  },
];

export const TEST_INVENTORY = {
  flour: {
    id: 'ing-001',
    name: 'All-Purpose Flour',
    unit: 'lb',
    quantity: 100,
    price: 0.50,
  },
  sugar: {
    id: 'ing-002',
    name: 'Granulated Sugar',
    unit: 'lb',
    quantity: 50,
    price: 0.60,
  },
  butter: {
    id: 'ing-003',
    name: 'Unsalted Butter',
    unit: 'lb',
    quantity: 25,
    price: 4.00,
  },
};

export const TEST_RECIPES = {
  basicCake: {
    id: 'recipe-001',
    name: 'Basic Vanilla Cake',
    servings: 12,
    cookTime: 45,
    ingredients: [
      { id: 'ing-001', quantity: 3, unit: 'lb' }, // flour
      { id: 'ing-002', quantity: 2, unit: 'lb' }, // sugar
      { id: 'ing-003', quantity: 1.5, unit: 'lb' }, // butter
    ],
  },
  soup: {
    id: 'recipe-002',
    name: 'Vegetable Soup',
    servings: 8,
    cookTime: 30,
    ingredients: [
      { id: 'ing-001', quantity: 0.5, unit: 'lb' },
    ],
  },
};

export const TEST_EVENTS = {
  wedding: {
    id: 'event-001',
    name: 'Test Wedding Event',
    type: 'Wedding',
    date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    guestCount: 150,
    venue: 'venue-main',
    menus: ['Menu A'],
  },
  corporate: {
    id: 'event-002',
    name: 'Test Corporate Event',
    type: 'Corporate',
    date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    guestCount: 200,
    venue: 'venue-main',
    menus: ['Menu B'],
  },
};

export const TEST_VENDORS = [
  {
    id: 'vendor-001',
    name: 'Fresh Foods Supplier',
    type: 'Food',
    contactEmail: 'sales@freshfoods.com',
    paymentTerms: 'Net 30',
  },
  {
    id: 'vendor-002',
    name: 'Equipment Provider',
    type: 'Equipment',
    contactEmail: 'sales@equipment.com',
    paymentTerms: 'Net 45',
  },
];

export const TEST_INVOICES = {
  basic: {
    invoiceNumber: 'INV-TEST-001',
    vendorId: 'vendor-001',
    amount: 2500.00,
    date: new Date().toISOString(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      { description: 'Flour 50 lb', quantity: 1, unitPrice: 25.00 },
      { description: 'Sugar 25 lb', quantity: 2, unitPrice: 30.00 },
    ],
  },
};

export const TEST_PROSPECTS = {
  wedding_couple: {
    id: 'prospect-001',
    name: 'John & Jane Doe',
    email: 'john@example.com',
    phone: '555-0123',
    eventType: 'Wedding',
    eventDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedGuests: 150,
  },
  corporate: {
    id: 'prospect-002',
    name: 'ABC Corporation',
    email: 'events@abc.com',
    phone: '555-0456',
    eventType: 'Corporate',
    eventDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedGuests: 300,
  },
};

export const API_ENDPOINTS = {
  // Auth
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  
  // BEO/Events
  createBEO: '/api/beo/create',
  getBEO: '/api/beo/:id',
  updateBEO: '/api/beo/:id',
  listBEOs: '/api/beo/list',
  
  // Inventory
  checkInventory: '/api/module-integration/maestro-inventory/check-inventory',
  updateInventory: '/api/inventory/update',
  getInventoryItems: '/api/inventory/items',
  
  // Purchasing
  createPO: '/api/purchasing/po/create',
  getPO: '/api/purchasing/po/:id',
  notifyReorder: '/api/module-integration/inventory-purchasing/notify-reorder',
  
  // Receiving
  receiveInventory: '/api/inventory/receipt',
  
  // Recipes
  createRecipe: '/api/culinary/recipe/create',
  getRecipe: '/api/culinary/recipe/:id',
  scaleRecipe: '/api/culinary/recipe/:id/scale',
  
  // Production
  createProductionTask: '/api/maestro/production-task/create',
  updateProductionTask: '/api/maestro/production-task/:id',
  
  // Invoices
  createInvoice: '/api/purchasing/invoice/create',
  updateInvoice: '/api/purchasing/invoice/:id',
  matchTriad: '/api/echo-aurum/triad-match',
  
  // CRM
  createProspect: '/api/crm/prospect/create',
  updateProspectStatus: '/api/crm/prospect/:id/status',
  
  // Events/Event Bus
  publishEvent: '/api/event-bus/publish',
  getEventLog: '/api/event-bus/logs',
};

export const EVENT_TYPES = {
  SHORTAGE_DETECTED: 'maestro:shortage_detected',
  PREP_PLAN_UPDATED: 'maestro:prep_plan_updated',
  INVOICE_RECEIVED: 'echo-aurum:invoice_received',
  BEO_CREATED: 'maestro:beo_created',
  EVENT_CREATED: 'maestro:event_created',
};

export default {
  TEST_USERS,
  TEST_VENUES,
  TEST_INVENTORY,
  TEST_RECIPES,
  TEST_EVENTS,
  TEST_VENDORS,
  TEST_INVOICES,
  TEST_PROSPECTS,
  API_ENDPOINTS,
  EVENT_TYPES,
};
