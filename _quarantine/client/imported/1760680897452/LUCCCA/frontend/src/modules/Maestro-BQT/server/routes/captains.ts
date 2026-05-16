/**
 * Maestro Banquets - Captain Operations API Routes
 * 
 * RESTful API endpoints for captain workflow management including:
 * - Captain CRUD operations and assignment management
 * - Table configuration and seating management
 * - Floor addon coordination and capacity impact
 * - Firing sequence optimization and management
 * - Course fire tracking and kitchen coordination
 * - Live pacing events and performance analytics
 * - Demographic pattern learning and insights
 */

import { RequestHandler } from "express";
import { z } from "zod";

// Validation schemas
const CaptainSchema = z.object({
  id: z.string(),
  name: z.string(),
  employeeId: z.string().optional(),
  level: z.enum(['junior', 'senior', 'lead', 'master']),
  specialties: z.array(z.string()),
  tableIds: z.array(z.string()),
  firingSequence: z.array(z.string()),
  maxTables: z.number().min(1).max(20),
  currentLoad: z.number().min(0).max(100),
  averageServiceTime: z.number().min(0),
  accuracyRating: z.number().min(0).max(100),
  guestSatisfactionScore: z.number().min(0).max(100),
  reliabilityScore: z.number().min(0).max(100),
  shiftPreference: z.enum(['morning', 'afternoon', 'evening', 'any']),
  availableDates: z.array(z.string()),
  unavailableDates: z.array(z.string()),
  languagesSpoken: z.array(z.string()),
  certifications: z.array(z.string()),
  preferredDevice: z.enum(['ipad', 'handheld', 'phone']),
  notificationPreferences: z.object({
    kitchenAlerts: z.boolean(),
    guestRequests: z.boolean(),
    managementMessages: z.boolean(),
    urgentOnly: z.boolean()
  })
});

const SeatSchema = z.object({
  seatNo: z.number().min(1),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  allergens: z.array(z.string()),
  dietaryRestrictions: z.array(z.string()),
  mealChoice: z.enum(['beef', 'fish', 'chicken', 'pork', 'veg', 'vegan', 'kosher', 'halal', 'custom']).optional(),
  drinkPreference: z.string().optional(),
  specialNotes: z.string().optional(),
  accessibilityNeeds: z.string().optional(),
  vipStatus: z.enum(['standard', 'vip', 'celebrity', 'vendor']).optional(),
  relationshipToHost: z.string().optional(),
  ageGroup: z.enum(['child', 'teen', 'adult', 'senior']).optional(),
  plusOne: z.boolean().optional(),
  rsvpStatus: z.enum(['confirmed', 'pending', 'declined', 'no_response']),
  arrivalTime: z.string().optional()
});

const CaptainTableSchema = z.object({
  id: z.string(),
  number: z.number().min(1),
  label: z.string(),
  shape: z.enum(['round', 'square', 'rectangle', 'head', 'king']),
  seats: z.array(SeatSchema),
  maxCapacity: z.number().min(1),
  currentCapacity: z.number().min(1),
  captainId: z.string().optional(),
  section: z.string().optional(),
  x: z.number(),
  y: z.number(),
  rotation: z.number().optional(),
  plannedCourseOrder: z.array(z.enum(['amuse', 'starter', 'soup', 'salad', 'mid', 'main', 'cheese', 'dessert', 'coffee', 'custom'])).optional(),
  firingPriority: z.number().min(1),
  specialInstructions: z.string().optional(),
  setupStatus: z.enum(['not_started', 'in_progress', 'complete', 'needs_attention']),
  serviceStatus: z.enum(['waiting', 'active', 'clearing', 'reset', 'done']),
  averageServiceTime: z.number().optional(),
  lastServiceTime: z.number().optional(),
  complexity: z.enum(['low', 'medium', 'high']),
  accessibilityFriendly: z.boolean(),
  proximityToKitchen: z.number().min(1).max(10),
  proximityToBar: z.number().min(1).max(10),
  viewQuality: z.enum(['excellent', 'good', 'fair', 'poor']),
  noiseLevel: z.enum(['quiet', 'moderate', 'loud'])
});

const FloorAddonSchema = z.object({
  id: z.string(),
  type: z.enum(['dance_floor', 'photo_booth', 'dj_booth', 'stage', 'bar', 'buffet_station', 'other']),
  label: z.string(),
  description: z.string().optional(),
  x: z.number(),
  y: z.number(),
  width: z.number().min(0),
  length: z.number().min(0),
  capacityImpact: z.number(),
  flowImpact: z.enum(['blocks_aisle', 'creates_bottleneck', 'improves_flow', 'neutral']),
  setupTime: z.number().min(0),
  teardownTime: z.number().min(0),
  staffRequired: z.number().min(0),
  powerRequired: z.boolean(),
  audioRequired: z.boolean()
});

const CourseFireSchema = z.object({
  id: z.string(),
  tableId: z.string(),
  course: z.enum(['amuse', 'starter', 'soup', 'salad', 'mid', 'main', 'cheese', 'dessert', 'coffee', 'custom']),
  captainId: z.string(),
  counts: z.record(z.number()),
  specialRequests: z.array(z.string()),
  allergenAlerts: z.array(z.string()),
  firedAt: z.string(),
  estimatedReadyAt: z.string().optional(),
  actualReadyAt: z.string().optional(),
  pickedUpAt: z.string().optional(),
  servedAt: z.string().optional(),
  status: z.enum(['fired', 'cooking', 'ready', 'picked_up', 'served', 'cancelled']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  qualityCheck: z.boolean(),
  temperatureGood: z.boolean(),
  presentationGood: z.boolean(),
  kitchenTime: z.number().optional(),
  serviceTime: z.number().optional(),
  totalTime: z.number().optional()
});

const PacingEventSchema = z.object({
  id: z.string(),
  tableId: z.string(),
  course: z.enum(['amuse', 'starter', 'soup', 'salad', 'mid', 'main', 'cheese', 'dessert', 'coffee', 'custom']),
  captainId: z.string(),
  status: z.enum(['pending', 'firing', 'clearing', 'picking_up', 'landed', 'done']),
  timestamp: z.string(),
  guestCount: z.number().min(0),
  complexity: z.enum(['low', 'medium', 'high']),
  specialCircumstances: z.string().optional(),
  efficiencyScore: z.number().min(0).max(100).optional(),
  guestSatisfaction: z.number().min(0).max(100).optional(),
  teamCoordination: z.number().min(0).max(100).optional()
});

// In-memory data stores (in production, these would be database collections)
let captainsData: any[] = [];
let tablesData: any[] = [];
let floorAddonsData: any[] = [];
let courseFiresData: any[] = [];
let pacingEventsData: any[] = [];
let sectionsData: any[] = [];

// Initialize with sample data
if (captainsData.length === 0) {
  captainsData = [
    {
      id: 'cap-001',
      name: 'Captain Amanda Rodriguez',
      employeeId: 'EMP-001',
      level: 'senior',
      specialties: ['fine_dining', 'vip_service'],
      tableIds: ['t-001', 't-002', 't-003', 't-004'],
      firingSequence: ['t-003', 't-001', 't-004', 't-002'],
      maxTables: 6,
      currentLoad: 67,
      averageServiceTime: 18,
      accuracyRating: 95,
      guestSatisfactionScore: 92,
      reliabilityScore: 98,
      shiftPreference: 'evening',
      availableDates: [],
      unavailableDates: [],
      languagesSpoken: ['English', 'Spanish'],
      certifications: ['wine_service', 'allergen_aware'],
      preferredDevice: 'ipad',
      notificationPreferences: {
        kitchenAlerts: true,
        guestRequests: true,
        managementMessages: true,
        urgentOnly: false
      }
    },
    {
      id: 'cap-002',
      name: 'Captain Marcus Chen',
      employeeId: 'EMP-002',
      level: 'lead',
      specialties: ['high_volume', 'training'],
      tableIds: ['t-005', 't-006', 't-007', 't-008'],
      firingSequence: ['t-006', 't-008', 't-005', 't-007'],
      maxTables: 8,
      currentLoad: 50,
      averageServiceTime: 16,
      accuracyRating: 97,
      guestSatisfactionScore: 89,
      reliabilityScore: 96,
      shiftPreference: 'any',
      availableDates: [],
      unavailableDates: [],
      languagesSpoken: ['English', 'Mandarin'],
      certifications: ['wine_service', 'allergen_aware', 'trainer'],
      preferredDevice: 'handheld',
      notificationPreferences: {
        kitchenAlerts: true,
        guestRequests: true,
        managementMessages: true,
        urgentOnly: false
      }
    }
  ];

  tablesData = [
    {
      id: 't-001',
      number: 1,
      label: 'Table 1',
      shape: 'round',
      seats: Array.from({ length: 8 }, (_, i) => ({
        seatNo: i + 1,
        allergens: [],
        dietaryRestrictions: [],
        rsvpStatus: 'confirmed'
      })),
      maxCapacity: 10,
      currentCapacity: 8,
      captainId: 'cap-001',
      section: 'A',
      x: 100,
      y: 100,
      firingPriority: 1,
      setupStatus: 'complete',
      serviceStatus: 'waiting',
      complexity: 'low',
      accessibilityFriendly: true,
      proximityToKitchen: 7,
      proximityToBar: 5,
      viewQuality: 'excellent',
      noiseLevel: 'moderate'
    }
  ];

  floorAddonsData = [
    {
      id: 'addon-001',
      type: 'dance_floor',
      label: 'Main Dance Floor',
      description: '20x20 hardwood dance floor',
      x: 300,
      y: 300,
      width: 20,
      length: 20,
      capacityImpact: -16,
      flowImpact: 'neutral',
      setupTime: 45,
      teardownTime: 30,
      staffRequired: 2,
      powerRequired: false,
      audioRequired: true
    }
  ];
}

// Captain CRUD operations
export const getAllCaptains: RequestHandler = (req, res) => {
  const { eventId } = req.query;
  
  let filteredCaptains = captainsData;
  
  // If eventId is provided, filter captains assigned to that event
  if (eventId) {
    // This would typically involve checking event assignments in the database
    filteredCaptains = captainsData.filter(captain => 
      captain.tableIds && captain.tableIds.length > 0
    );
  }
  
  res.json({ captains: filteredCaptains });
};

export const getCaptain: RequestHandler = (req, res) => {
  const { captainId } = req.params;
  const captain = captainsData.find(c => c.id === captainId);
  
  if (!captain) {
    return res.status(404).json({ error: 'Captain not found' });
  }
  
  res.json({ captain });
};

export const createCaptain: RequestHandler = (req, res) => {
  try {
    const captainData = CaptainSchema.parse(req.body);
    
    if (captainsData.find(c => c.id === captainData.id)) {
      return res.status(400).json({ error: 'Captain already exists' });
    }
    
    captainsData.push(captainData);
    res.status(201).json({ captain: captainData });
  } catch (error) {
    res.status(400).json({ error: 'Invalid captain data', details: error });
  }
};

export const updateCaptain: RequestHandler = (req, res) => {
  const { captainId } = req.params;
  const captainIndex = captainsData.findIndex(c => c.id === captainId);
  
  if (captainIndex === -1) {
    return res.status(404).json({ error: 'Captain not found' });
  }
  
  try {
    const updates = req.body;
    captainsData[captainIndex] = { ...captainsData[captainIndex], ...updates };
    res.json({ captain: captainsData[captainIndex] });
  } catch (error) {
    res.status(400).json({ error: 'Invalid update data', details: error });
  }
};

export const deleteCaptain: RequestHandler = (req, res) => {
  const { captainId } = req.params;
  const captainIndex = captainsData.findIndex(c => c.id === captainId);
  
  if (captainIndex === -1) {
    return res.status(404).json({ error: 'Captain not found' });
  }
  
  captainsData.splice(captainIndex, 1);
  res.json({ message: 'Captain deleted successfully' });
};

// Table management operations
export const getAllTables: RequestHandler = (req, res) => {
  const { eventId, captainId, section } = req.query;
  
  let filteredTables = tablesData;
  
  if (captainId) {
    filteredTables = filteredTables.filter(table => table.captainId === captainId);
  }
  
  if (section) {
    filteredTables = filteredTables.filter(table => table.section === section);
  }
  
  res.json({ tables: filteredTables });
};

export const getTable: RequestHandler = (req, res) => {
  const { tableId } = req.params;
  const table = tablesData.find(t => t.id === tableId);
  
  if (!table) {
    return res.status(404).json({ error: 'Table not found' });
  }
  
  res.json({ table });
};

export const createTable: RequestHandler = (req, res) => {
  try {
    const tableData = CaptainTableSchema.parse(req.body);
    
    if (tablesData.find(t => t.id === tableData.id)) {
      return res.status(400).json({ error: 'Table already exists' });
    }
    
    tablesData.push(tableData);
    res.status(201).json({ table: tableData });
  } catch (error) {
    res.status(400).json({ error: 'Invalid table data', details: error });
  }
};

export const updateTable: RequestHandler = (req, res) => {
  const { tableId } = req.params;
  const tableIndex = tablesData.findIndex(t => t.id === tableId);
  
  if (tableIndex === -1) {
    return res.status(404).json({ error: 'Table not found' });
  }
  
  try {
    const updates = req.body;
    tablesData[tableIndex] = { ...tablesData[tableIndex], ...updates };
    res.json({ table: tablesData[tableIndex] });
  } catch (error) {
    res.status(400).json({ error: 'Invalid update data', details: error });
  }
};

export const deleteTable: RequestHandler = (req, res) => {
  const { tableId } = req.params;
  const tableIndex = tablesData.findIndex(t => t.id === tableId);
  
  if (tableIndex === -1) {
    return res.status(404).json({ error: 'Table not found' });
  }
  
  tablesData.splice(tableIndex, 1);
  res.json({ message: 'Table deleted successfully' });
};

// Table assignment operations
export const assignTableToCaptain: RequestHandler = (req, res) => {
  const { tableId, captainId } = req.params;
  
  const tableIndex = tablesData.findIndex(t => t.id === tableId);
  const captainIndex = captainsData.findIndex(c => c.id === captainId);
  
  if (tableIndex === -1) {
    return res.status(404).json({ error: 'Table not found' });
  }
  
  if (captainIndex === -1) {
    return res.status(404).json({ error: 'Captain not found' });
  }
  
  // Update table assignment
  tablesData[tableIndex].captainId = captainId;
  
  // Update captain's table list
  if (!captainsData[captainIndex].tableIds.includes(tableId)) {
    captainsData[captainIndex].tableIds.push(tableId);
  }
  
  // Remove from other captains
  captainsData.forEach((captain, index) => {
    if (index !== captainIndex) {
      captain.tableIds = captain.tableIds.filter((id: string) => id !== tableId);
    }
  });
  
  res.json({ 
    table: tablesData[tableIndex], 
    captain: captainsData[captainIndex] 
  });
};

export const updateSeatAssignment: RequestHandler = (req, res) => {
  const { tableId, seatNo } = req.params;
  const seatUpdates = req.body;
  
  const tableIndex = tablesData.findIndex(t => t.id === tableId);
  
  if (tableIndex === -1) {
    return res.status(404).json({ error: 'Table not found' });
  }
  
  const table = tablesData[tableIndex];
  const seatIndex = table.seats.findIndex((seat: any) => seat.seatNo === parseInt(seatNo));
  
  if (seatIndex === -1) {
    return res.status(404).json({ error: 'Seat not found' });
  }
  
  table.seats[seatIndex] = { ...table.seats[seatIndex], ...seatUpdates };
  
  res.json({ table, seat: table.seats[seatIndex] });
};

// Floor addon operations
export const getAllFloorAddons: RequestHandler = (req, res) => {
  const { eventId } = req.query;
  res.json({ addons: floorAddonsData });
};

export const createFloorAddon: RequestHandler = (req, res) => {
  try {
    const addonData = FloorAddonSchema.parse(req.body);
    
    if (floorAddonsData.find(a => a.id === addonData.id)) {
      return res.status(400).json({ error: 'Floor addon already exists' });
    }
    
    floorAddonsData.push(addonData);
    res.status(201).json({ addon: addonData });
  } catch (error) {
    res.status(400).json({ error: 'Invalid addon data', details: error });
  }
};

export const updateFloorAddon: RequestHandler = (req, res) => {
  const { addonId } = req.params;
  const addonIndex = floorAddonsData.findIndex(a => a.id === addonId);
  
  if (addonIndex === -1) {
    return res.status(404).json({ error: 'Floor addon not found' });
  }
  
  try {
    const updates = req.body;
    floorAddonsData[addonIndex] = { ...floorAddonsData[addonIndex], ...updates };
    res.json({ addon: floorAddonsData[addonIndex] });
  } catch (error) {
    res.status(400).json({ error: 'Invalid update data', details: error });
  }
};

export const deleteFloorAddon: RequestHandler = (req, res) => {
  const { addonId } = req.params;
  const addonIndex = floorAddonsData.findIndex(a => a.id === addonId);
  
  if (addonIndex === -1) {
    return res.status(404).json({ error: 'Floor addon not found' });
  }
  
  floorAddonsData.splice(addonIndex, 1);
  res.json({ message: 'Floor addon deleted successfully' });
};

// Firing sequence management
export const updateFiringSequence: RequestHandler = (req, res) => {
  const { captainId } = req.params;
  const { sequence } = req.body;
  
  const captainIndex = captainsData.findIndex(c => c.id === captainId);
  
  if (captainIndex === -1) {
    return res.status(404).json({ error: 'Captain not found' });
  }
  
  if (!Array.isArray(sequence)) {
    return res.status(400).json({ error: 'Sequence must be an array of table IDs' });
  }
  
  captainsData[captainIndex].firingSequence = sequence;
  
  res.json({ captain: captainsData[captainIndex] });
};

// Course fire management
export const fireTable: RequestHandler = (req, res) => {
  try {
    const courseFireData = CourseFireSchema.parse(req.body);
    
    courseFiresData.push(courseFireData);
    res.status(201).json({ courseFire: courseFireData });
  } catch (error) {
    res.status(400).json({ error: 'Invalid course fire data', details: error });
  }
};

export const getCourseFires: RequestHandler = (req, res) => {
  const { eventId, captainId, course, status } = req.query;
  
  let filteredFires = courseFiresData;
  
  if (captainId) {
    filteredFires = filteredFires.filter(fire => fire.captainId === captainId);
  }
  
  if (course) {
    filteredFires = filteredFires.filter(fire => fire.course === course);
  }
  
  if (status) {
    filteredFires = filteredFires.filter(fire => fire.status === status);
  }
  
  res.json({ courseFires: filteredFires });
};

export const updateCourseFire: RequestHandler = (req, res) => {
  const { fireId } = req.params;
  const fireIndex = courseFiresData.findIndex(f => f.id === fireId);
  
  if (fireIndex === -1) {
    return res.status(404).json({ error: 'Course fire not found' });
  }
  
  try {
    const updates = req.body;
    courseFiresData[fireIndex] = { ...courseFiresData[fireIndex], ...updates };
    res.json({ courseFire: courseFiresData[fireIndex] });
  } catch (error) {
    res.status(400).json({ error: 'Invalid update data', details: error });
  }
};

// Pacing event tracking
export const recordPacingEvent: RequestHandler = (req, res) => {
  try {
    const pacingEventData = PacingEventSchema.parse(req.body);
    
    pacingEventsData.push(pacingEventData);
    res.status(201).json({ pacingEvent: pacingEventData });
  } catch (error) {
    res.status(400).json({ error: 'Invalid pacing event data', details: error });
  }
};

export const getPacingEvents: RequestHandler = (req, res) => {
  const { eventId, captainId, tableId, course } = req.query;
  const { limit = 100 } = req.query;
  
  let filteredEvents = pacingEventsData;
  
  if (captainId) {
    filteredEvents = filteredEvents.filter(event => event.captainId === captainId);
  }
  
  if (tableId) {
    filteredEvents = filteredEvents.filter(event => event.tableId === tableId);
  }
  
  if (course) {
    filteredEvents = filteredEvents.filter(event => event.course === course);
  }
  
  // Sort by timestamp (most recent first) and limit results
  filteredEvents = filteredEvents
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, parseInt(limit as string));
  
  res.json({ pacingEvents: filteredEvents });
};

// Analytics and performance tracking
export const getCaptainPerformance: RequestHandler = (req, res) => {
  const { captainId } = req.params;
  const { startDate, endDate } = req.query;
  
  const captain = captainsData.find(c => c.id === captainId);
  
  if (!captain) {
    return res.status(404).json({ error: 'Captain not found' });
  }
  
  // Calculate performance metrics based on pacing events and course fires
  const captainPacingEvents = pacingEventsData.filter(event => event.captainId === captainId);
  const captainCourseFires = courseFiresData.filter(fire => fire.captainId === captainId);
  
  const performance = {
    captain,
    totalTables: captain.tableIds.length,
    totalFires: captainCourseFires.length,
    averageServiceTime: captain.averageServiceTime,
    accuracyRating: captain.accuracyRating,
    guestSatisfactionScore: captain.guestSatisfactionScore,
    reliabilityScore: captain.reliabilityScore,
    recentPacingEvents: captainPacingEvents.slice(0, 10),
    recentCourseFires: captainCourseFires.slice(0, 10)
  };
  
  res.json({ performance });
};

export const getEventCoordination: RequestHandler = (req, res) => {
  const { eventId } = req.params;
  
  // Mock event coordination data
  const coordination = {
    eventId,
    currentCourse: 'main',
    nextCourse: 'dessert',
    serviceStartTime: new Date().toISOString(),
    currentCourseStartTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    tablesActive: tablesData.filter(t => t.serviceStatus === 'active').length,
    tablesWaiting: tablesData.filter(t => t.serviceStatus === 'waiting').length,
    tablesComplete: tablesData.filter(t => t.serviceStatus === 'done').length,
    overallPace: 'on_time',
    varianceMinutes: 2,
    bottlenecks: [],
    activeAlerts: [],
    communicationLog: []
  };
  
  res.json({ coordination });
};

export default getAllCaptains;
