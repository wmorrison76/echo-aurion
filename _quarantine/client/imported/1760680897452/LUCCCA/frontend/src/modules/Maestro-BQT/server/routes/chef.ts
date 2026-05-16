/**
 * Maestro Banquets - Chef Operations API Routes
 * 
 * RESTful API endpoints for chef workflow management including:
 * - Echo Event Studio calendar synchronization
 * - Recipe CRUD operations and scaling calculations
 * - Purchase order generation and vendor management
 * - Prep scheduling with staff assignments and cart management
 * - Equipment pull list generation and tracking
 * - Delivery scheduling and vendor coordination
 * - Performance metrics and analytics tracking
 */

import { RequestHandler } from "express";
import { z } from "zod";

// Validation schemas
const EchoEventStudioEventSchema = z.object({
  id: z.string(),
  crmId: z.string(),
  title: z.string(),
  eventType: z.enum(['wedding', 'corporate', 'birthday', 'anniversary', 'holiday', 'other']),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  timezone: z.string(),
  guestCount: z.number().min(1),
  confirmedCount: z.number().optional(),
  serviceStyle: z.enum(['plated', 'family_style', 'buffet', 'cocktail', 'stations']),
  courseCount: z.number().min(1),
  venueId: z.string().optional(),
  venueName: z.string(),
  roomName: z.string().optional(),
  setupStyle: z.enum(['banquet', 'classroom', 'theater', 'cocktail', 'buffet', 'custom']),
  clientId: z.string(),
  clientName: z.string(),
  clientContact: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    preferredContact: z.enum(['email', 'phone', 'text'])
  }),
  coordinatorId: z.string().optional(),
  coordinatorName: z.string().optional(),
  dietaryRestrictions: z.array(z.string()),
  allergenConcerns: z.array(z.string()),
  accessibilityNeeds: z.array(z.string()),
  specialRequests: z.array(z.string()),
  budgetTotal: z.number().optional(),
  budgetFood: z.number().optional(),
  budgetBeverage: z.number().optional(),
  budgetService: z.number().optional(),
  contractStatus: z.enum(['draft', 'pending', 'signed', 'cancelled']),
  lastSyncFromCRM: z.string(),
  crmLastModified: z.string(),
  syncStatus: z.enum(['synced', 'pending', 'error', 'conflict']),
  syncErrors: z.array(z.string()).optional()
});

const RecipeIngredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number().min(0),
  unit: z.string(),
  productId: z.string().optional(),
  vendor: z.string().optional(),
  cost: z.number().min(0),
  quality: z.string(),
  brand: z.string().optional(),
  specifications: z.string().optional(),
  storageType: z.enum(['dry', 'refrigerated', 'frozen', 'ambient']),
  shelfLife: z.number().min(0),
  yieldPercentage: z.number().min(0).max(100),
  wastePercentage: z.number().min(0).max(100),
  substitutes: z.array(z.string()),
  allergenInfo: z.array(z.string()),
  prepNotes: z.string().optional(),
  optional: z.boolean()
});

const RecipeStepSchema = z.object({
  stepNumber: z.number().min(1),
  instruction: z.string(),
  duration: z.number().optional(),
  temperature: z.number().optional(),
  equipment: z.array(z.string()).optional(),
  skillRequired: z.enum(['basic', 'intermediate', 'advanced']),
  criticalPoint: z.boolean(),
  notes: z.string().optional()
});

const RecipeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.enum(['appetizer', 'soup', 'salad', 'main', 'side', 'dessert', 'sauce', 'garnish']),
  cuisine: z.string(),
  baseServings: z.number().min(1),
  servingSize: z.string(),
  totalYield: z.number().min(0),
  yieldUnit: z.string(),
  ingredients: z.array(RecipeIngredientSchema),
  instructions: z.array(RecipeStepSchema),
  prepTime: z.number().min(0),
  cookTime: z.number().min(0),
  plateTime: z.number().min(0),
  totalTime: z.number().min(0),
  equipmentRequired: z.array(z.string()),
  skillLevel: z.enum(['basic', 'intermediate', 'advanced', 'expert']),
  staffRequired: z.number().min(1),
  holdTime: z.number().min(0),
  reheatingInstructions: z.string().optional(),
  temperatureRequirement: z.enum(['hot', 'cold', 'room_temp']),
  allergens: z.array(z.string()),
  nutritionalInfo: z.object({
    calories: z.number().min(0),
    protein: z.number().min(0),
    carbs: z.number().min(0),
    fat: z.number().min(0),
    sodium: z.number().min(0),
    fiber: z.number().min(0)
  }).optional(),
  costPerServing: z.number().min(0),
  lastCostUpdate: z.string(),
  costVariance: z.number(),
  version: z.string(),
  createdBy: z.string(),
  lastModifiedBy: z.string(),
  lastModified: z.string(),
  approved: z.boolean(),
  approvedBy: z.string().optional(),
  approvedDate: z.string().optional()
});

const PurchaseOrderItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  description: z.string().optional(),
  quantityNeeded: z.number().min(0),
  quantityOrdered: z.number().min(0),
  quantityReceived: z.number().optional(),
  unit: z.string(),
  packSize: z.number().min(1),
  packsNeeded: z.number().min(0),
  packsOrdered: z.number().min(0),
  unitCost: z.number().min(0),
  packCost: z.number().min(0),
  totalCost: z.number().min(0),
  quality: z.string(),
  brand: z.string().optional(),
  specifications: z.string().optional(),
  acceptSubstitutes: z.boolean(),
  substituteProducts: z.array(z.string()).optional(),
  receivedAt: z.string().optional(),
  receivedBy: z.string().optional(),
  qualityAcceptable: z.boolean().optional(),
  notes: z.string().optional()
});

const PurchaseOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  type: z.enum(['requisition', 'vendor_order']),
  eventId: z.string(),
  eventName: z.string(),
  deliveryDate: z.string(),
  deliveryTime: z.string().optional(),
  vendorId: z.string().optional(),
  vendorName: z.string().optional(),
  vendorContact: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string()
  }).optional(),
  items: z.array(PurchaseOrderItemSchema),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  delivery: z.number().min(0),
  total: z.number().min(0),
  status: z.enum(['draft', 'pending', 'sent', 'confirmed', 'delivered', 'cancelled']),
  createdBy: z.string(),
  createdAt: z.string(),
  sentAt: z.string().optional(),
  confirmedAt: z.string().optional(),
  deliveredAt: z.string().optional(),
  deliveryInstructions: z.string().optional(),
  specialRequests: z.string().optional(),
  onTimeDelivery: z.boolean().optional(),
  qualityRating: z.number().min(1).max(5).optional(),
  accuracyRating: z.number().min(1).max(5).optional(),
  issues: z.array(z.string()).optional()
});

const PrepTaskSchema = z.object({
  id: z.string(),
  recipeId: z.string(),
  recipeName: z.string(),
  description: z.string(),
  baseQuantity: z.number().min(0),
  scaledQuantity: z.number().min(0),
  unit: z.string(),
  guestCount: z.number().min(1),
  bufferPercentage: z.number().min(0).max(50),
  estimatedTime: z.number().min(0),
  actualTime: z.number().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  assignedTo: z.string().optional(),
  skillRequired: z.enum(['basic', 'intermediate', 'advanced', 'expert']),
  prerequisiteTasks: z.array(z.string()),
  canParallel: z.boolean(),
  equipmentNeeded: z.array(z.string()),
  workstationRequired: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'on_hold', 'cancelled']),
  qualityCheck: z.boolean(),
  qualityRating: z.number().min(1).max(5).optional(),
  cartNumber: z.string(),
  labelingRequired: z.boolean(),
  storageType: z.enum(['refrigerated', 'frozen', 'hot_hold', 'room_temp']),
  storageLocation: z.string(),
  notes: z.string().optional(),
  issues: z.array(z.string()).optional(),
  completedBy: z.string().optional()
});

const PrepScheduleSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  eventName: z.string(),
  prepDate: z.string(),
  shiftType: z.enum(['morning', 'afternoon', 'evening', 'overnight']),
  tasks: z.array(PrepTaskSchema),
  staffRequired: z.number().min(1),
  skillLevelRequired: z.enum(['basic', 'intermediate', 'advanced', 'expert']),
  startTime: z.string(),
  endTime: z.string(),
  totalDuration: z.number().min(0),
  equipmentNeeded: z.array(z.string()),
  spaceRequired: z.array(z.string()),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'delayed', 'cancelled']),
  progressPercentage: z.number().min(0).max(100),
  completedTasks: z.array(z.string()),
  estimatedTime: z.number().min(0),
  actualTime: z.number().optional(),
  efficiency: z.number().min(0).max(200),
  qualityScore: z.number().min(1).max(5).optional(),
  notes: z.string().optional()
});

// In-memory data stores (in production, these would be database collections)
let echoEventsData: any[] = [];
let recipesData: any[] = [];
let purchaseOrdersData: any[] = [];
let vendorsData: any[] = [];
let prepSchedulesData: any[] = [];
let equipmentPullListsData: any[] = [];
let deliverySchedulesData: any[] = [];
let performanceMetricsData: any[] = [];

// Initialize with sample data
if (recipesData.length === 0) {
  recipesData = [
    {
      id: 'recipe-001',
      name: 'Pan-Seared Atlantic Salmon',
      description: 'Fresh Atlantic salmon with lemon herb butter',
      category: 'main',
      cuisine: 'american',
      baseServings: 10,
      servingSize: '6 oz',
      totalYield: 3.75,
      yieldUnit: 'lbs',
      ingredients: [
        {
          id: 'ing-001',
          name: 'Atlantic Salmon Fillet',
          quantity: 4,
          unit: 'lbs',
          cost: 18.50,
          quality: 'premium',
          storageType: 'refrigerated',
          shelfLife: 3,
          yieldPercentage: 95,
          wastePercentage: 5,
          substitutes: ['Pacific Salmon'],
          allergenInfo: ['fish'],
          optional: false
        }
      ],
      instructions: [
        {
          stepNumber: 1,
          instruction: 'Remove salmon from refrigeration 30 minutes before cooking',
          duration: 30,
          skillRequired: 'basic',
          criticalPoint: false
        }
      ],
      prepTime: 15,
      cookTime: 12,
      plateTime: 3,
      totalTime: 30,
      equipmentRequired: ['saute_pan', 'fish_spatula'],
      skillLevel: 'intermediate',
      staffRequired: 1,
      holdTime: 5,
      temperatureRequirement: 'hot',
      allergens: ['fish'],
      costPerServing: 22.50,
      lastCostUpdate: new Date().toISOString(),
      costVariance: 0,
      version: '1.0',
      createdBy: 'chef-001',
      lastModifiedBy: 'chef-001',
      lastModified: new Date().toISOString(),
      approved: true,
      approvedBy: 'exec-chef-001',
      approvedDate: new Date().toISOString()
    }
  ];
}

// Echo Event Studio operations
export const syncWithEchoStudio: RequestHandler = async (req, res) => {
  const { eventId } = req.params;
  
  try {
    // Mock sync operation - in production this would call Echo Event Studio API
    console.log(`Syncing event ${eventId} with Echo Event Studio`);
    
    // Simulate API response
    const syncResult = {
      eventId,
      lastSync: new Date().toISOString(),
      status: 'synced',
      recordsUpdated: 1,
      conflicts: []
    };
    
    res.json({ syncResult });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync with Echo Event Studio', details: error });
  }
};

export const getEchoEvents: RequestHandler = (req, res) => {
  const { startDate, endDate, status } = req.query;
  
  let filteredEvents = echoEventsData;
  
  if (startDate || endDate) {
    filteredEvents = filteredEvents.filter(event => {
      const eventDate = new Date(event.date);
      if (startDate && eventDate < new Date(startDate as string)) return false;
      if (endDate && eventDate > new Date(endDate as string)) return false;
      return true;
    });
  }
  
  if (status) {
    filteredEvents = filteredEvents.filter(event => event.contractStatus === status);
  }
  
  res.json({ events: filteredEvents });
};

export const createEchoEvent: RequestHandler = (req, res) => {
  try {
    const eventData = EchoEventStudioEventSchema.parse(req.body);
    
    if (echoEventsData.find(e => e.id === eventData.id)) {
      return res.status(400).json({ error: 'Event already exists' });
    }
    
    echoEventsData.push(eventData);
    res.status(201).json({ event: eventData });
  } catch (error) {
    res.status(400).json({ error: 'Invalid event data', details: error });
  }
};

// Recipe operations
export const getAllRecipes: RequestHandler = (req, res) => {
  const { category, cuisine, skillLevel } = req.query;
  
  let filteredRecipes = recipesData;
  
  if (category) {
    filteredRecipes = filteredRecipes.filter(recipe => recipe.category === category);
  }
  
  if (cuisine) {
    filteredRecipes = filteredRecipes.filter(recipe => recipe.cuisine === cuisine);
  }
  
  if (skillLevel) {
    filteredRecipes = filteredRecipes.filter(recipe => recipe.skillLevel === skillLevel);
  }
  
  res.json({ recipes: filteredRecipes });
};

export const getRecipe: RequestHandler = (req, res) => {
  const { recipeId } = req.params;
  const recipe = recipesData.find(r => r.id === recipeId);
  
  if (!recipe) {
    return res.status(404).json({ error: 'Recipe not found' });
  }
  
  res.json({ recipe });
};

export const createRecipe: RequestHandler = (req, res) => {
  try {
    const recipeData = RecipeSchema.parse(req.body);
    
    if (recipesData.find(r => r.id === recipeData.id)) {
      return res.status(400).json({ error: 'Recipe already exists' });
    }
    
    recipesData.push(recipeData);
    res.status(201).json({ recipe: recipeData });
  } catch (error) {
    res.status(400).json({ error: 'Invalid recipe data', details: error });
  }
};

export const updateRecipe: RequestHandler = (req, res) => {
  const { recipeId } = req.params;
  const recipeIndex = recipesData.findIndex(r => r.id === recipeId);
  
  if (recipeIndex === -1) {
    return res.status(404).json({ error: 'Recipe not found' });
  }
  
  try {
    const updates = req.body;
    recipesData[recipeIndex] = { ...recipesData[recipeIndex], ...updates };
    res.json({ recipe: recipesData[recipeIndex] });
  } catch (error) {
    res.status(400).json({ error: 'Invalid update data', details: error });
  }
};

export const scaleRecipe: RequestHandler = (req, res) => {
  const { recipeId } = req.params;
  const { servings, bufferPercent = 4 } = req.body;
  
  const recipe = recipesData.find(r => r.id === recipeId);
  
  if (!recipe) {
    return res.status(404).json({ error: 'Recipe not found' });
  }
  
  if (!servings || servings <= 0) {
    return res.status(400).json({ error: 'Invalid serving count' });
  }
  
  const finalServings = Math.ceil(servings * (1 + bufferPercent / 100));
  const scaleFactor = finalServings / recipe.baseServings;
  
  const scaledRecipe = {
    ...recipe,
    baseServings: servings,
    finalServings,
    scaleFactor,
    bufferPercent,
    totalYield: recipe.totalYield * scaleFactor,
    ingredients: recipe.ingredients.map((ingredient: any) => ({
      ...ingredient,
      quantity: ingredient.quantity * scaleFactor
    })),
    totalCost: recipe.costPerServing * finalServings
  };
  
  res.json({ scaledRecipe });
};

// Purchase order operations
export const getAllPurchaseOrders: RequestHandler = (req, res) => {
  const { eventId, vendorId, status } = req.query;
  
  let filteredOrders = purchaseOrdersData;
  
  if (eventId) {
    filteredOrders = filteredOrders.filter(order => order.eventId === eventId);
  }
  
  if (vendorId) {
    filteredOrders = filteredOrders.filter(order => order.vendorId === vendorId);
  }
  
  if (status) {
    filteredOrders = filteredOrders.filter(order => order.status === status);
  }
  
  res.json({ purchaseOrders: filteredOrders });
};

export const createPurchaseOrder: RequestHandler = (req, res) => {
  try {
    const orderData = PurchaseOrderSchema.parse(req.body);
    
    if (purchaseOrdersData.find(o => o.id === orderData.id)) {
      return res.status(400).json({ error: 'Purchase order already exists' });
    }
    
    purchaseOrdersData.push(orderData);
    res.status(201).json({ purchaseOrder: orderData });
  } catch (error) {
    res.status(400).json({ error: 'Invalid purchase order data', details: error });
  }
};

export const updatePurchaseOrder: RequestHandler = (req, res) => {
  const { orderId } = req.params;
  const orderIndex = purchaseOrdersData.findIndex(o => o.id === orderId);
  
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Purchase order not found' });
  }
  
  try {
    const updates = req.body;
    purchaseOrdersData[orderIndex] = { ...purchaseOrdersData[orderIndex], ...updates };
    res.json({ purchaseOrder: purchaseOrdersData[orderIndex] });
  } catch (error) {
    res.status(400).json({ error: 'Invalid update data', details: error });
  }
};

export const submitPurchaseOrder: RequestHandler = (req, res) => {
  const { orderId } = req.params;
  const orderIndex = purchaseOrdersData.findIndex(o => o.id === orderId);
  
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Purchase order not found' });
  }
  
  purchaseOrdersData[orderIndex].status = 'sent';
  purchaseOrdersData[orderIndex].sentAt = new Date().toISOString();
  
  res.json({ purchaseOrder: purchaseOrdersData[orderIndex] });
};

// Prep scheduling operations
export const getAllPrepSchedules: RequestHandler = (req, res) => {
  const { eventId, prepDate, status } = req.query;
  
  let filteredSchedules = prepSchedulesData;
  
  if (eventId) {
    filteredSchedules = filteredSchedules.filter(schedule => schedule.eventId === eventId);
  }
  
  if (prepDate) {
    filteredSchedules = filteredSchedules.filter(schedule => schedule.prepDate === prepDate);
  }
  
  if (status) {
    filteredSchedules = filteredSchedules.filter(schedule => schedule.status === status);
  }
  
  res.json({ prepSchedules: filteredSchedules });
};

export const createPrepSchedule: RequestHandler = (req, res) => {
  try {
    const scheduleData = PrepScheduleSchema.parse(req.body);
    
    if (prepSchedulesData.find(s => s.id === scheduleData.id)) {
      return res.status(400).json({ error: 'Prep schedule already exists' });
    }
    
    prepSchedulesData.push(scheduleData);
    res.status(201).json({ prepSchedule: scheduleData });
  } catch (error) {
    res.status(400).json({ error: 'Invalid prep schedule data', details: error });
  }
};

export const updatePrepSchedule: RequestHandler = (req, res) => {
  const { scheduleId } = req.params;
  const scheduleIndex = prepSchedulesData.findIndex(s => s.id === scheduleId);
  
  if (scheduleIndex === -1) {
    return res.status(404).json({ error: 'Prep schedule not found' });
  }
  
  try {
    const updates = req.body;
    prepSchedulesData[scheduleIndex] = { ...prepSchedulesData[scheduleIndex], ...updates };
    res.json({ prepSchedule: prepSchedulesData[scheduleIndex] });
  } catch (error) {
    res.status(400).json({ error: 'Invalid update data', details: error });
  }
};

export const completeTask: RequestHandler = (req, res) => {
  const { scheduleId, taskId } = req.params;
  const { completedBy, qualityRating, notes } = req.body;
  
  const scheduleIndex = prepSchedulesData.findIndex(s => s.id === scheduleId);
  
  if (scheduleIndex === -1) {
    return res.status(404).json({ error: 'Prep schedule not found' });
  }
  
  const schedule = prepSchedulesData[scheduleIndex];
  const taskIndex = schedule.tasks.findIndex((task: any) => task.id === taskId);
  
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  schedule.tasks[taskIndex].status = 'completed';
  schedule.tasks[taskIndex].endTime = new Date().toISOString();
  schedule.tasks[taskIndex].completedBy = completedBy;
  
  if (qualityRating) {
    schedule.tasks[taskIndex].qualityRating = qualityRating;
  }
  
  if (notes) {
    schedule.tasks[taskIndex].notes = notes;
  }
  
  // Update schedule progress
  const completedTasks = schedule.tasks.filter((task: any) => task.status === 'completed');
  schedule.progressPercentage = Math.round((completedTasks.length / schedule.tasks.length) * 100);
  
  if (schedule.progressPercentage === 100) {
    schedule.status = 'completed';
  }
  
  res.json({ task: schedule.tasks[taskIndex], schedule });
};

// Equipment and delivery operations
export const generateEquipmentPullList: RequestHandler = (req, res) => {
  const { eventId, guestCount, serviceStyle, courseCount } = req.body;
  
  // Mock equipment list generation based on event parameters
  const mockEquipmentList = {
    id: `epl-${Date.now()}`,
    eventId,
    eventName: `Event ${eventId}`,
    generatedFor: 'service',
    guestCount,
    serviceStyle,
    courseCount,
    items: [
      {
        id: 'eq-001',
        name: 'Chafing Dishes',
        description: 'Full-size chafing dishes with fuel',
        category: 'service_ware',
        quantityNeeded: Math.ceil(guestCount / 20),
        quantityAvailable: 10,
        quantityAllocated: Math.ceil(guestCount / 20),
        unit: 'pieces',
        condition: 'excellent',
        available: true,
        location: 'Equipment Storage A'
      }
    ],
    pullDate: new Date().toISOString().split('T')[0],
    setupDate: new Date().toISOString().split('T')[0],
    returnDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'pending',
    itemsAvailable: 1,
    itemsShort: 0,
    shortageItems: [],
    conditionCheck: false,
    damageReported: [],
    cleaningRequired: []
  };
  
  equipmentPullListsData.push(mockEquipmentList);
  res.status(201).json({ equipmentPullList: mockEquipmentList });
};

export const scheduleDelivery: RequestHandler = (req, res) => {
  const deliveryData = req.body;
  
  const newDelivery = {
    id: `del-${Date.now()}`,
    ...deliveryData,
    status: 'scheduled',
    inspectionRequired: true,
    temperatureCheck: true,
    onTime: false,
    accurate: false,
    qualityMet: false,
    issues: [],
    receipts: [],
    photos: [],
    signatures: []
  };
  
  deliverySchedulesData.push(newDelivery);
  res.status(201).json({ deliverySchedule: newDelivery });
};

// Performance analytics
export const getChefPerformanceMetrics: RequestHandler = (req, res) => {
  const { chefId, startDate, endDate } = req.params;
  
  // Mock performance metrics
  const metrics = {
    chefId,
    period: {
      start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: endDate || new Date().toISOString().split('T')[0]
    },
    orderAccuracy: 94.5,
    timingAccuracy: 89.2,
    costEfficiency: 102.3,
    wasteReduction: 15.7,
    vendorRelationshipScore: 4.2,
    negotiationSuccess: 78.5,
    onTimeDeliveryRate: 91.8,
    qualityConsistency: 4.4,
    staffEfficiency: 87.3,
    staffSatisfaction: 4.1,
    trainingEffectiveness: 85.6,
    staffRetention: 92.3,
    menuDevelopment: 3,
    processImprovements: 7,
    costSavingInitiatives: 12500,
    sustainabilityScore: 3.8,
    foodQualityRating: 4.3,
    serviceTimingRating: 4.1,
    specialDietaryHandling: 4.5,
    overallGuestExperience: 4.2
  };
  
  res.json({ metrics });
};

// Cost calculation and yield analysis
export const calculateMenuCosts: RequestHandler = (req, res) => {
  const { recipeIds, guestCount, bufferPercent = 4 } = req.body;
  
  if (!recipeIds || !Array.isArray(recipeIds)) {
    return res.status(400).json({ error: 'Recipe IDs array is required' });
  }
  
  const costBreakdown = recipeIds.map((recipeId: string) => {
    const recipe = recipesData.find(r => r.id === recipeId);
    if (!recipe) return null;
    
    const finalServings = Math.ceil(guestCount * (1 + bufferPercent / 100));
    const scaleFactor = finalServings / recipe.baseServings;
    const totalCost = recipe.costPerServing * finalServings;
    
    return {
      recipeId,
      recipeName: recipe.name,
      costPerServing: recipe.costPerServing,
      servings: finalServings,
      totalCost,
      scaleFactor
    };
  }).filter(Boolean);
  
  const totalMenuCost = costBreakdown.reduce((sum: number, item: any) => sum + item.totalCost, 0);
  const costPerGuest = totalMenuCost / guestCount;
  
  res.json({
    costBreakdown,
    totalMenuCost,
    costPerGuest,
    guestCount,
    bufferPercent
  });
};

export default syncWithEchoStudio;
