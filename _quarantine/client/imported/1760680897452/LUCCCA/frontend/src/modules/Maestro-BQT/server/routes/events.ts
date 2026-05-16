import { RequestHandler } from "express";
import { z } from "zod";

// Validation schemas
const EventSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  guestCount: z.number().min(1),
  serviceStyle: z.enum(['plated', 'buffet', 'family_style', 'cocktail']),
  venue: z.string(),
  status: z.enum(['planning', 'confirmed', 'in_progress', 'completed']),
  notes: z.string().optional()
});

const MenuItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['appetizer', 'main', 'dessert', 'beverage']),
  cost: z.number().min(0),
  ingredients: z.array(z.string()),
  allergens: z.array(z.string()),
  nutritionalInfo: z.object({
    calories: z.number().min(0),
    protein: z.number().min(0),
    carbs: z.number().min(0),
    fat: z.number().min(0)
  })
});

const TimelinePhaseSchema = z.object({
  id: z.string(),
  phase: z.string(),
  plannedAt: z.string().optional(),
  plannedDurationMin: z.number().optional(),
  actualAt: z.string().optional(),
  actualDurationMin: z.number().optional(),
  varianceMin: z.number().optional(),
  reason: z.enum([
    'kitchen_delay', 'bar_queue', 'late_vip', 'room_flip', 'vendor_late',
    'equipment_issue', 'weather', 'floor_congestion', 'plating_bottleneck',
    'speech_overrun', 'other'
  ]).optional(),
  notes: z.string().optional(),
  status: z.enum(['pending', 'active', 'completed', 'delayed'])
});

const TableSchema = z.object({
  id: z.string(),
  number: z.number().min(1),
  seats: z.number().min(1),
  x: z.number(),
  y: z.number(),
  shape: z.enum(['round', 'rectangle']),
  assigned: z.boolean().optional(),
  vipTable: z.boolean().optional()
});

const GuestSchema = z.object({
  id: z.string(),
  name: z.string(),
  dietaryRestrictions: z.array(z.string()),
  tableId: z.string().optional(),
  isVip: z.boolean()
});

// In-memory data store (in production, this would be a database)
let eventsData: any[] = [];
let currentEventId = 'ev-demo-001';

// Initialize with sample data
if (eventsData.length === 0) {
  eventsData.push({
    id: 'ev-demo-001',
    title: 'Morrison Wedding Reception',
    date: '2024-06-15T18:00:00Z',
    guestCount: 120,
    serviceStyle: 'plated',
    venue: 'Grand Ballroom',
    status: 'in_progress',
    notes: 'Outdoor ceremony backup plan required. VIP table needs premium wine selection.',
    menu: {
      appetizers: [
        {
          id: 'app-1',
          name: 'Shrimp Cocktail',
          category: 'appetizer',
          cost: 8.50,
          ingredients: ['Shrimp', 'Cocktail Sauce', 'Lemon'],
          allergens: ['Shellfish'],
          nutritionalInfo: { calories: 120, protein: 18, carbs: 6, fat: 2 }
        }
      ],
      mains: [
        {
          id: 'main-1',
          name: 'Beef Tenderloin',
          category: 'main',
          cost: 28.50,
          ingredients: ['Beef Tenderloin', 'Red Wine Reduction', 'Garlic', 'Herbs'],
          allergens: [],
          nutritionalInfo: { calories: 420, protein: 35, carbs: 4, fat: 28 }
        }
      ],
      desserts: [
        {
          id: 'dess-1',
          name: 'Chocolate Mousse',
          category: 'dessert',
          cost: 7.25,
          ingredients: ['Dark Chocolate', 'Cream', 'Eggs', 'Sugar'],
          allergens: ['Dairy', 'Eggs'],
          nutritionalInfo: { calories: 320, protein: 6, carbs: 28, fat: 22 }
        }
      ],
      beverages: []
    },
    timelinePlan: [
      {
        id: 'phase-1',
        phase: 'Guest Arrival & Cocktails',
        plannedAt: '2024-06-15T18:00:00Z',
        plannedDurationMin: 60,
        status: 'completed',
        actualAt: '2024-06-15T18:05:00Z',
        actualDurationMin: 65,
        varianceMin: 5,
        reason: 'late_vip'
      },
      {
        id: 'phase-2',
        phase: 'Cocktail Service',
        plannedAt: '2024-06-15T19:30:00Z',
        plannedDurationMin: 45,
        status: 'active',
        actualAt: '2024-06-15T19:35:00Z',
        varianceMin: 8,
        reason: 'bar_queue'
      }
    ],
    seating: {
      tables: [
        { id: 't-1', number: 1, seats: 8, x: 100, y: 100, shape: 'round', assigned: true, vipTable: true },
        { id: 't-2', number: 2, seats: 8, x: 250, y: 100, shape: 'round', assigned: true }
      ],
      layout: 'ballroom-standard',
      capacity: 150
    },
    guests: [
      { id: 'g-1', name: 'William Morrison', dietaryRestrictions: [], tableId: 't-1', isVip: true },
      { id: 'g-2', name: 'Sarah Morrison', dietaryRestrictions: ['Vegetarian'], tableId: 't-1', isVip: true }
    ],
    budget: {
      foodCost: 5580.00,
      laborCost: 1560.00,
      venueCost: 2400.00,
      totalRevenue: 12000.00,
      profitMargin: 0.205
    }
  });
}

// Event CRUD operations
export const getAllEvents: RequestHandler = (req, res) => {
  res.json({ events: eventsData });
};

export const getEvent: RequestHandler = (req, res) => {
  const { eventId } = req.params;
  const event = eventsData.find(e => e.id === eventId);
  
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  res.json({ event });
};

export const createEvent: RequestHandler = (req, res) => {
  try {
    const eventData = EventSchema.parse(req.body);
    
    // Check if event already exists
    if (eventsData.find(e => e.id === eventData.id)) {
      return res.status(400).json({ error: 'Event already exists' });
    }
    
    const newEvent = {
      ...eventData,
      menu: { appetizers: [], mains: [], desserts: [], beverages: [] },
      timelinePlan: [],
      seating: { tables: [], layout: 'default', capacity: 0 },
      guests: [],
      budget: { foodCost: 0, laborCost: 0, venueCost: 0, totalRevenue: 0, profitMargin: 0 }
    };
    
    eventsData.push(newEvent);
    res.status(201).json({ event: newEvent });
  } catch (error) {
    res.status(400).json({ error: 'Invalid event data', details: error });
  }
};

export const updateEvent: RequestHandler = (req, res) => {
  const { eventId } = req.params;
  const eventIndex = eventsData.findIndex(e => e.id === eventId);
  
  if (eventIndex === -1) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  try {
    const updates = req.body;
    eventsData[eventIndex] = { ...eventsData[eventIndex], ...updates };
    res.json({ event: eventsData[eventIndex] });
  } catch (error) {
    res.status(400).json({ error: 'Invalid update data', details: error });
  }
};

export const deleteEvent: RequestHandler = (req, res) => {
  const { eventId } = req.params;
  const eventIndex = eventsData.findIndex(e => e.id === eventId);
  
  if (eventIndex === -1) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  eventsData.splice(eventIndex, 1);
  res.json({ message: 'Event deleted successfully' });
};

// Menu item operations
export const addMenuItem: RequestHandler = (req, res) => {
  const { eventId } = req.params;
  const { category } = req.query;
  const event = eventsData.find(e => e.id === eventId);
  
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  if (!category || !['appetizers', 'mains', 'desserts', 'beverages'].includes(category as string)) {
    return res.status(400).json({ error: 'Invalid or missing category' });
  }
  
  try {
    const menuItem = MenuItemSchema.parse(req.body);
    
    if (!event.menu[category as string]) {
      event.menu[category as string] = [];
    }
    
    event.menu[category as string].push(menuItem);
    res.status(201).json({ menuItem, event });
  } catch (error) {
    res.status(400).json({ error: 'Invalid menu item data', details: error });
  }
};

export const updateMenuItem: RequestHandler = (req, res) => {
  const { eventId, itemId } = req.params;
  const { category } = req.query;
  const event = eventsData.find(e => e.id === eventId);
  
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  if (!category || !event.menu[category as string]) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  
  const itemIndex = event.menu[category as string].findIndex((item: any) => item.id === itemId);
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Menu item not found' });
  }
  
  try {
    const updates = req.body;
    event.menu[category as string][itemIndex] = { 
      ...event.menu[category as string][itemIndex], 
      ...updates 
    };
    res.json({ menuItem: event.menu[category as string][itemIndex], event });
  } catch (error) {
    res.status(400).json({ error: 'Invalid update data', details: error });
  }
};

export const deleteMenuItem: RequestHandler = (req, res) => {
  const { eventId, itemId } = req.params;
  const { category } = req.query;
  const event = eventsData.find(e => e.id === eventId);
  
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  if (!category || !event.menu[category as string]) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  
  const itemIndex = event.menu[category as string].findIndex((item: any) => item.id === itemId);
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Menu item not found' });
  }
  
  event.menu[category as string].splice(itemIndex, 1);
  res.json({ message: 'Menu item deleted successfully', event });
};

// Timeline operations
export const updateTimelinePhase: RequestHandler = (req, res) => {
  const { eventId, phaseId } = req.params;
  const event = eventsData.find(e => e.id === eventId);
  
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  const phaseIndex = event.timelinePlan.findIndex((phase: any) => phase.id === phaseId);
  if (phaseIndex === -1) {
    return res.status(404).json({ error: 'Timeline phase not found' });
  }
  
  try {
    const updates = req.body;
    event.timelinePlan[phaseIndex] = { ...event.timelinePlan[phaseIndex], ...updates };
    res.json({ phase: event.timelinePlan[phaseIndex], event });
  } catch (error) {
    res.status(400).json({ error: 'Invalid update data', details: error });
  }
};

export const logActualTime: RequestHandler = (req, res) => {
  const { eventId, phaseId } = req.params;
  const { actualTime, reason, notes } = req.body;
  const event = eventsData.find(e => e.id === eventId);
  
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  const phaseIndex = event.timelinePlan.findIndex((phase: any) => phase.id === phaseId);
  if (phaseIndex === -1) {
    return res.status(404).json({ error: 'Timeline phase not found' });
  }
  
  const phase = event.timelinePlan[phaseIndex];
  const actualDate = new Date(actualTime);
  const plannedDate = new Date(phase.plannedAt || '');
  const varianceMin = Math.round((actualDate.getTime() - plannedDate.getTime()) / (1000 * 60));
  
  const updates = {
    actualAt: actualTime,
    varianceMin,
    status: 'active',
    ...(reason && { reason }),
    ...(notes && { notes })
  };
  
  event.timelinePlan[phaseIndex] = { ...phase, ...updates };
  res.json({ phase: event.timelinePlan[phaseIndex], event });
};

// Seating operations
export const updateTable: RequestHandler = (req, res) => {
  const { eventId, tableId } = req.params;
  const event = eventsData.find(e => e.id === eventId);
  
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  const tableIndex = event.seating.tables.findIndex((table: any) => table.id === tableId);
  if (tableIndex === -1) {
    return res.status(404).json({ error: 'Table not found' });
  }
  
  try {
    const updates = req.body;
    event.seating.tables[tableIndex] = { ...event.seating.tables[tableIndex], ...updates };
    res.json({ table: event.seating.tables[tableIndex], event });
  } catch (error) {
    res.status(400).json({ error: 'Invalid update data', details: error });
  }
};

export const assignGuest: RequestHandler = (req, res) => {
  const { eventId, guestId } = req.params;
  const { tableId } = req.body;
  const event = eventsData.find(e => e.id === eventId);
  
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  const guestIndex = event.guests.findIndex((guest: any) => guest.id === guestId);
  if (guestIndex === -1) {
    return res.status(404).json({ error: 'Guest not found' });
  }
  
  event.guests[guestIndex].tableId = tableId;
  res.json({ guest: event.guests[guestIndex], event });
};

// Analytics endpoint
export const getEventAnalytics: RequestHandler = (req, res) => {
  const { eventId } = req.params;
  const event = eventsData.find(e => e.id === eventId);
  
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  // Calculate analytics
  const menuCosts = Object.values(event.menu).flat().reduce((sum: number, item: any) => sum + (Number(item.cost) || 0), 0);
  const totalVariance = event.timelinePlan.reduce((sum: number, phase: any) => sum + (phase.varianceMin || 0), 0);
  const assignedGuests = event.guests.filter((guest: any) => guest.tableId).length;
  const totalCapacity = event.seating.tables.reduce((sum: number, table: any) => sum + table.seats, 0);
  
  const guestCountNum = Number(event.guestCount || 0);
  const safeGuestCount = Math.max(1, guestCountNum);
  const analytics = {
    menuCostPerGuest: Number(menuCosts) / Number(safeGuestCount),
    totalMenuCost: Number(menuCosts) * Number(guestCountNum),
    timelineVariance: Number(totalVariance),
    seatingUtilization: totalCapacity > 0 ? Number(assignedGuests) / Number(totalCapacity) : 0,
    profitProjection: Number(event.budget.totalRevenue || 0) - (Number(menuCosts) * Number(guestCountNum) + Number(event.budget.laborCost || 0) + Number(event.budget.venueCost || 0)),
    completedPhases: event.timelinePlan.filter((phase: any) => phase.status === 'completed').length,
    totalPhases: event.timelinePlan.length
  };
  
  res.json({ analytics });
};

export default getAllEvents;
