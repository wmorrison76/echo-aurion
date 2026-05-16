/**
 * Maestro Banquets - Captain & Chef Store
 * 
 * Zustand store extension for captain workflow management, chef operations,
 * and Echo Event Studio integration. Handles real-time coordination between
 * captains, kitchen, and management systems.
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type {
  Captain,
  CaptainTable,
  FloorAddon,
  Section,
  CourseFire,
  PacingEvent,
  CoursePlan,
  DishMeta,
  EventCoordination,
  DemographicPattern,
  EchoEventStudioEvent,
  PurchaseOrder,
  PrepSchedule,
  EquipmentPullList,
  DeliverySchedule,
  Vendor,
  StaffAssignment,
  CartAssignment,
  ChefPerformanceMetrics,
  CourseCode,
  PacingStatus,
  MealChoice
} from '../types';
import type { Recipe } from '../types/chef';

interface CaptainState {
  // Captain Management
  captains: Captain[];
  currentCaptain: Captain | null;
  
  // Table and Layout Management
  tables: CaptainTable[];
  floorAddons: FloorAddon[];
  sections: Section[];
  
  // Course and Service Management
  coursePlans: CoursePlan[];
  currentCourse: CourseCode;
  courseFires: CourseFire[];
  pacingEvents: PacingEvent[];
  
  // Dish and Menu Information
  dishes: DishMeta[];
  
  // Real-time Coordination
  eventCoordination: EventCoordination | null;
  
  // Demographic Learning
  demographicPatterns: DemographicPattern[];
  
  // Captain Actions
  setCaptains: (captains: Captain[]) => void;
  setCurrentCaptain: (captain: Captain | null) => void;
  addCaptain: (captain: Captain) => void;
  updateCaptain: (captainId: string, updates: Partial<Captain>) => void;
  removeCaptain: (captainId: string) => void;
  
  // Table Management Actions
  setTables: (tables: CaptainTable[]) => void;
  addTable: (table: CaptainTable) => void;
  updateTable: (tableId: string, updates: Partial<CaptainTable>) => void;
  removeTable: (tableId: string) => void;
  assignTableToCaptain: (tableId: string, captainId: string) => void;
  updateTablePosition: (tableId: string, x: number, y: number) => void;
  updateSeatAssignment: (tableId: string, seatNo: number, seatUpdates: any) => void;
  
  // Floor Addon Management
  setFloorAddons: (addons: FloorAddon[]) => void;
  addFloorAddon: (addon: FloorAddon) => void;
  updateFloorAddon: (addonId: string, updates: Partial<FloorAddon>) => void;
  removeFloorAddon: (addonId: string) => void;
  
  // Section Management
  setSections: (sections: Section[]) => void;
  assignCaptainToSection: (sectionId: string, captainId: string) => void;
  
  // Firing Sequence Management
  updateFiringSequence: (captainId: string, sequence: string[]) => void;
  
  // Course Fire Management
  fireTable: (tableId: string, captainId: string, counts: Record<MealChoice, number>, edits?: string[]) => void;
  updateCourseFire: (fireId: string, updates: Partial<CourseFire>) => void;
  
  // Pacing Management
  recordPacingEvent: (event: Omit<PacingEvent, 'id'>) => void;
  updateTablePacing: (tableId: string, status: PacingStatus) => void;
  
  // Course Management
  setCurrentCourse: (course: CourseCode) => void;
  advanceCourse: () => void;
  
  // Real-time Coordination
  updateEventCoordination: (updates: Partial<EventCoordination>) => void;
  addAlert: (alert: any) => void;
  resolveAlert: (alertId: string) => void;
  
  // Analytics and Learning
  recordDemographicPattern: (pattern: DemographicPattern) => void;
  updateDemographicPattern: (patternId: string, updates: Partial<DemographicPattern>) => void;
}

interface ChefState {
  // Echo Event Studio Integration
  echoEvents: EchoEventStudioEvent[];
  currentEchoEvent: EchoEventStudioEvent | null;
  
  // Recipe Management
  recipes: Recipe[];
  
  // Purchasing and Vendor Management
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
  
  // Prep Scheduling
  prepSchedules: PrepSchedule[];
  staffAssignments: StaffAssignment[];
  cartAssignments: CartAssignment[];
  
  // Equipment Management
  equipmentPullLists: EquipmentPullList[];
  
  // Delivery Coordination
  deliverySchedules: DeliverySchedule[];
  
  // Performance Tracking
  performanceMetrics: ChefPerformanceMetrics[];
  
  // Chef Actions
  
  // Echo Event Studio Actions
  setEchoEvents: (events: EchoEventStudioEvent[]) => void;
  setCurrentEchoEvent: (event: EchoEventStudioEvent | null) => void;
  syncWithEchoStudio: (eventId: string) => Promise<void>;
  
  // Recipe Actions
  setRecipes: (recipes: Recipe[]) => void;
  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (recipeId: string, updates: Partial<Recipe>) => void;
  removeRecipe: (recipeId: string) => void;
  scaleRecipe: (recipeId: string, servings: number, bufferPercent?: number) => Recipe;
  
  // Purchase Order Actions
  setPurchaseOrders: (orders: PurchaseOrder[]) => void;
  createPurchaseOrder: (order: Omit<PurchaseOrder, 'id'>) => void;
  updatePurchaseOrder: (orderId: string, updates: Partial<PurchaseOrder>) => void;
  submitPurchaseOrder: (orderId: string) => void;
  
  // Vendor Actions
  setVendors: (vendors: Vendor[]) => void;
  addVendor: (vendor: Vendor) => void;
  updateVendor: (vendorId: string, updates: Partial<Vendor>) => void;
  
  // Prep Scheduling Actions
  setPrepSchedules: (schedules: PrepSchedule[]) => void;
  createPrepSchedule: (schedule: Omit<PrepSchedule, 'id'>) => void;
  updatePrepSchedule: (scheduleId: string, updates: Partial<PrepSchedule>) => void;
  assignStaffToTask: (taskId: string, staffId: string) => void;
  completeTask: (taskId: string, completedBy: string, qualityRating?: number) => void;
  
  // Equipment Actions
  setEquipmentPullLists: (lists: EquipmentPullList[]) => void;
  createEquipmentPullList: (list: Omit<EquipmentPullList, 'id'>) => void;
  updateEquipmentPullList: (listId: string, updates: Partial<EquipmentPullList>) => void;
  
  // Delivery Actions
  setDeliverySchedules: (schedules: DeliverySchedule[]) => void;
  scheduleDelivery: (schedule: Omit<DeliverySchedule, 'id'>) => void;
  confirmDelivery: (scheduleId: string, actualTime: string, quality: boolean) => void;
  
  // Performance Tracking
  updatePerformanceMetrics: (metrics: ChefPerformanceMetrics) => void;
}

// Sample data for development
const sampleCaptains: Captain[] = [
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

const sampleTables: CaptainTable[] = [
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
  },
  {
    id: 't-002',
    number: 2,
    label: 'Table 2',
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
    x: 250,
    y: 100,
    firingPriority: 4,
    setupStatus: 'complete',
    serviceStatus: 'waiting',
    complexity: 'low',
    accessibilityFriendly: true,
    proximityToKitchen: 6,
    proximityToBar: 6,
    viewQuality: 'good',
    noiseLevel: 'moderate'
  }
];

const sampleCoursePlans: CoursePlan[] = [
  {
    code: 'starter',
    label: 'First Course',
    description: 'Appetizer service',
    targetDurationMin: 20,
    serviceWindowMin: 10,
    toleranceMin: 3,
    staffRequired: 2,
    kitchenPrepTime: 15,
    platingSLA: 5,
    prerequisiteCourses: [],
    canOverlapWith: [],
    temperatureCritical: true,
    allergenRisk: 'medium',
    complexityLevel: 'moderate'
  },
  {
    code: 'main',
    label: 'Main Course',
    description: 'Entree service',
    targetDurationMin: 30,
    serviceWindowMin: 15,
    toleranceMin: 5,
    staffRequired: 3,
    kitchenPrepTime: 25,
    platingSLA: 8,
    prerequisiteCourses: ['starter'],
    canOverlapWith: [],
    temperatureCritical: true,
    allergenRisk: 'high',
    complexityLevel: 'complex'
  },
  {
    code: 'dessert',
    label: 'Dessert',
    description: 'Dessert service',
    targetDurationMin: 25,
    serviceWindowMin: 10,
    toleranceMin: 4,
    staffRequired: 2,
    kitchenPrepTime: 20,
    platingSLA: 6,
    prerequisiteCourses: ['main'],
    canOverlapWith: ['coffee'],
    temperatureCritical: false,
    allergenRisk: 'medium',
    complexityLevel: 'moderate'
  }
];

const sampleDishes: DishMeta[] = [
  {
    id: 'dish-001',
    label: 'Pan-Seared Salmon with Lemon Butter',
    shortName: 'Salmon',
    category: 'main',
    allergens: ['fish', 'dairy'],
    ingredients: ['Atlantic salmon', 'butter', 'lemon', 'herbs'],
    dietaryFlags: ['gluten_free'],
    prepTime: 15,
    cookTime: 12,
    plateTime: 3,
    holdTime: 8,
    temperatureRequirement: 'hot',
    garnishRequired: true,
    specialEquipment: ['salamander'],
    skillLevel: 'intermediate',
    substitutions: {
      allergenFree: { fish: 'dish-veg-001' },
      dietary: { vegetarian: 'dish-veg-001' }
    },
    costPerPortion: 24.50,
    yieldPercentage: 85,
    wastagePercentage: 5
  },
  {
    id: 'dish-002',
    label: 'Beef Tenderloin with Truffle Sauce',
    shortName: 'Beef',
    category: 'main',
    allergens: ['dairy'],
    ingredients: ['beef tenderloin', 'truffle oil', 'cream', 'shallots'],
    dietaryFlags: ['gluten_free'],
    prepTime: 20,
    cookTime: 15,
    plateTime: 4,
    holdTime: 6,
    temperatureRequirement: 'hot',
    garnishRequired: true,
    specialEquipment: ['grill'],
    skillLevel: 'advanced',
    substitutions: {
      allergenFree: { dairy: 'dish-001' },
      dietary: { vegetarian: 'dish-veg-001' }
    },
    costPerPortion: 32.75,
    yieldPercentage: 90,
    wastagePercentage: 3
  }
];

export const useCaptainStore = create<CaptainState>()(
  devtools(
    subscribeWithSelector(
      (set, get) => ({
        // Initial state
        captains: sampleCaptains,
        currentCaptain: sampleCaptains[0],
        tables: sampleTables,
        floorAddons: [],
        sections: [],
        coursePlans: sampleCoursePlans,
        currentCourse: 'starter',
        courseFires: [],
        pacingEvents: [],
        dishes: sampleDishes,
        eventCoordination: null,
        demographicPatterns: [],

        // Captain Management Actions
        setCaptains: (captains) => set({ captains }, false, 'setCaptains'),
        setCurrentCaptain: (captain) => set({ currentCaptain: captain }, false, 'setCurrentCaptain'),
        
        addCaptain: (captain) => set((state) => ({
          captains: [...state.captains, captain]
        }), false, 'addCaptain'),
        
        updateCaptain: (captainId, updates) => set((state) => ({
          captains: state.captains.map(captain =>
            captain.id === captainId ? { ...captain, ...updates } : captain
          ),
          currentCaptain: state.currentCaptain?.id === captainId
            ? { ...state.currentCaptain, ...updates }
            : state.currentCaptain
        }), false, 'updateCaptain'),
        
        removeCaptain: (captainId) => set((state) => ({
          captains: state.captains.filter(captain => captain.id !== captainId),
          currentCaptain: state.currentCaptain?.id === captainId ? null : state.currentCaptain
        }), false, 'removeCaptain'),

        // Table Management Actions
        setTables: (tables) => set({ tables }, false, 'setTables'),
        
        addTable: (table) => set((state) => ({
          tables: [...state.tables, table]
        }), false, 'addTable'),
        
        updateTable: (tableId, updates) => set((state) => ({
          tables: state.tables.map(table =>
            table.id === tableId ? { ...table, ...updates } : table
          )
        }), false, 'updateTable'),
        
        removeTable: (tableId) => set((state) => ({
          tables: state.tables.filter(table => table.id !== tableId)
        }), false, 'removeTable'),
        
        assignTableToCaptain: (tableId, captainId) => set((state) => ({
          tables: state.tables.map(table =>
            table.id === tableId ? { ...table, captainId } : table
          ),
          captains: state.captains.map(captain => {
            if (captain.id === captainId) {
              return {
                ...captain,
                tableIds: Array.from(new Set([...captain.tableIds, tableId]))
              };
            } else {
              return {
                ...captain,
                tableIds: captain.tableIds.filter(id => id !== tableId)
              };
            }
          })
        }), false, 'assignTableToCaptain'),
        
        updateTablePosition: (tableId, x, y) => set((state) => ({
          tables: state.tables.map(table =>
            table.id === tableId ? { ...table, x, y } : table
          )
        }), false, 'updateTablePosition'),
        
        updateSeatAssignment: (tableId, seatNo, seatUpdates) => set((state) => ({
          tables: state.tables.map(table =>
            table.id === tableId
              ? {
                  ...table,
                  seats: table.seats.map(seat =>
                    seat.seatNo === seatNo ? { ...seat, ...seatUpdates } : seat
                  )
                }
              : table
          )
        }), false, 'updateSeatAssignment'),

        // Floor Addon Management
        setFloorAddons: (addons) => set({ floorAddons: addons }, false, 'setFloorAddons'),
        
        addFloorAddon: (addon) => set((state) => ({
          floorAddons: [...state.floorAddons, addon]
        }), false, 'addFloorAddon'),
        
        updateFloorAddon: (addonId, updates) => set((state) => ({
          floorAddons: state.floorAddons.map(addon =>
            addon.id === addonId ? { ...addon, ...updates } : addon
          )
        }), false, 'updateFloorAddon'),
        
        removeFloorAddon: (addonId) => set((state) => ({
          floorAddons: state.floorAddons.filter(addon => addon.id !== addonId)
        }), false, 'removeFloorAddon'),

        // Section Management
        setSections: (sections) => set({ sections }, false, 'setSections'),
        
        assignCaptainToSection: (sectionId, captainId) => set((state) => ({
          sections: state.sections.map(section =>
            section.id === sectionId ? { ...section, captainId } : section
          )
        }), false, 'assignCaptainToSection'),

        // Firing Sequence Management
        updateFiringSequence: (captainId, sequence) => set((state) => ({
          captains: state.captains.map(captain =>
            captain.id === captainId ? { ...captain, firingSequence: sequence } : captain
          ),
          currentCaptain: state.currentCaptain?.id === captainId
            ? { ...state.currentCaptain, firingSequence: sequence }
            : state.currentCaptain
        }), false, 'updateFiringSequence'),

        // Course Fire Management
        fireTable: (tableId, captainId, counts, edits = []) => {
          const fire: CourseFire = {
            id: `fire-${Date.now()}`,
            tableId,
            captainId,
            course: get().currentCourse,
            counts,
            specialRequests: edits,
            allergenAlerts: [], // TODO: Auto-calculate from dish metadata
            firedAt: new Date().toISOString(),
            status: 'fired',
            priority: 'normal',
            qualityCheck: false,
            temperatureGood: false,
            presentationGood: false
          };
          
          set((state) => ({
            courseFires: [fire, ...state.courseFires]
          }), false, 'fireTable');
        },
        
        updateCourseFire: (fireId, updates) => set((state) => ({
          courseFires: state.courseFires.map(fire =>
            fire.id === fireId ? { ...fire, ...updates } : fire
          )
        }), false, 'updateCourseFire'),

        // Pacing Management
        recordPacingEvent: (event) => {
          const pacingEvent: PacingEvent = {
            ...event,
            id: `pace-${Date.now()}`
          };
          
          set((state) => ({
            pacingEvents: [pacingEvent, ...state.pacingEvents.slice(0, 99)] // Keep last 100
          }), false, 'recordPacingEvent');
        },
        
        updateTablePacing: (tableId, status) => {
          const event: Omit<PacingEvent, 'id'> = {
            tableId,
            course: get().currentCourse,
            captainId: get().tables.find(t => t.id === tableId)?.captainId || '',
            status,
            timestamp: new Date().toISOString(),
            guestCount: get().tables.find(t => t.id === tableId)?.currentCapacity || 0,
            complexity: get().tables.find(t => t.id === tableId)?.complexity || 'low'
          };

          get().recordPacingEvent(event);

          // Map pacing status to table service status
          const map: Record<PacingStatus, 'waiting' | 'active' | 'clearing' | 'reset' | 'done'> = {
            pending: 'waiting',
            firing: 'active',
            clearing: 'clearing',
            picking_up: 'active',
            landed: 'active',
            done: 'done'
          };
          get().updateTable(tableId, { serviceStatus: map[status] });
        },

        // Course Management
        setCurrentCourse: (course) => set({ currentCourse: course }, false, 'setCurrentCourse'),
        
        advanceCourse: () => {
          const { currentCourse, coursePlans } = get();
          const currentIndex = coursePlans.findIndex(plan => plan.code === currentCourse);
          const nextCourse = coursePlans[currentIndex + 1];
          
          if (nextCourse) {
            set({ currentCourse: nextCourse.code }, false, 'advanceCourse');
          }
        },

        // Real-time Coordination
        updateEventCoordination: (updates) => set((state) => ({
          eventCoordination: state.eventCoordination
            ? { ...state.eventCoordination, ...updates }
            : updates as EventCoordination
        }), false, 'updateEventCoordination'),
        
        addAlert: (alert) => set((state) => ({
          eventCoordination: state.eventCoordination
            ? {
                ...state.eventCoordination,
                activeAlerts: [...state.eventCoordination.activeAlerts, alert]
              }
            : null
        }), false, 'addAlert'),
        
        resolveAlert: (alertId) => set((state) => ({
          eventCoordination: state.eventCoordination
            ? {
                ...state.eventCoordination,
                activeAlerts: state.eventCoordination.activeAlerts.filter(alert => alert.id !== alertId)
              }
            : null
        }), false, 'resolveAlert'),

        // Analytics and Learning
        recordDemographicPattern: (pattern) => set((state) => ({
          demographicPatterns: [...state.demographicPatterns, pattern]
        }), false, 'recordDemographicPattern'),
        
        updateDemographicPattern: (patternId, updates) => set((state) => ({
          demographicPatterns: state.demographicPatterns.map(pattern =>
            pattern.id === patternId ? { ...pattern, ...updates } : pattern
          )
        }), false, 'updateDemographicPattern')
      })
    ),
    {
      name: 'maestro-captain-store'
    }
  )
);

export const useChefStore = create<ChefState>()(
  devtools(
    (set, get) => ({
      // Initial state
      echoEvents: [],
      currentEchoEvent: null,
      recipes: [],
      purchaseOrders: [],
      vendors: [],
      prepSchedules: [],
      staffAssignments: [],
      cartAssignments: [],
      equipmentPullLists: [],
      deliverySchedules: [],
      performanceMetrics: [],

      // Echo Event Studio Actions
      setEchoEvents: (events) => set({ echoEvents: events }, false, 'setEchoEvents'),
      setCurrentEchoEvent: (event) => set({ currentEchoEvent: event }, false, 'setCurrentEchoEvent'),
      
      syncWithEchoStudio: async (eventId) => {
        // TODO: Implement Echo Event Studio API integration
        console.log(`Syncing with Echo Event Studio for event ${eventId}`);
      },

      // Recipe Actions
      setRecipes: (recipes) => set({ recipes }, false, 'setRecipes'),
      
      addRecipe: (recipe) => set((state) => ({
        recipes: [...state.recipes, recipe]
      }), false, 'addRecipe'),
      
      updateRecipe: (recipeId, updates) => set((state) => ({
        recipes: state.recipes.map(recipe =>
          recipe.id === recipeId ? { ...recipe, ...updates } : recipe
        )
      }), false, 'updateRecipe'),
      
      removeRecipe: (recipeId) => set((state) => ({
        recipes: state.recipes.filter(recipe => recipe.id !== recipeId)
      }), false, 'removeRecipe'),
      
      scaleRecipe: (recipeId, servings, bufferPercent = 4) => {
        const recipe = get().recipes.find(r => r.id === recipeId);
        if (!recipe) throw new Error('Recipe not found');
        
        const scaleFactor = (servings * (1 + bufferPercent / 100)) / recipe.baseServings;
        
        const scaledRecipe: Recipe = {
          ...recipe,
          baseServings: servings,
          totalYield: recipe.totalYield * scaleFactor,
          ingredients: recipe.ingredients.map(ingredient => ({
            ...ingredient,
            quantity: ingredient.quantity * scaleFactor
          })),
          costPerServing: recipe.costPerServing // Cost per serving stays the same
        };
        
        return scaledRecipe;
      },

      // Purchase Order Actions
      setPurchaseOrders: (orders) => set({ purchaseOrders: orders }, false, 'setPurchaseOrders'),
      
      createPurchaseOrder: (order) => {
        const newOrder: PurchaseOrder = {
          ...order,
          id: `po-${Date.now()}`,
          orderNumber: `PO-${Date.now()}`,
          status: 'draft',
          createdAt: new Date().toISOString()
        };
        
        set((state) => ({
          purchaseOrders: [...state.purchaseOrders, newOrder]
        }), false, 'createPurchaseOrder');
      },
      
      updatePurchaseOrder: (orderId, updates) => set((state) => ({
        purchaseOrders: state.purchaseOrders.map(order =>
          order.id === orderId ? { ...order, ...updates } : order
        )
      }), false, 'updatePurchaseOrder'),
      
      submitPurchaseOrder: (orderId) => set((state) => ({
        purchaseOrders: state.purchaseOrders.map(order =>
          order.id === orderId
            ? { ...order, status: 'sent', sentAt: new Date().toISOString() }
            : order
        )
      }), false, 'submitPurchaseOrder'),

      // Vendor Actions
      setVendors: (vendors) => set({ vendors }, false, 'setVendors'),
      
      addVendor: (vendor) => set((state) => ({
        vendors: [...state.vendors, vendor]
      }), false, 'addVendor'),
      
      updateVendor: (vendorId, updates) => set((state) => ({
        vendors: state.vendors.map(vendor =>
          vendor.id === vendorId ? { ...vendor, ...updates } : vendor
        )
      }), false, 'updateVendor'),

      // Prep Scheduling Actions
      setPrepSchedules: (schedules) => set({ prepSchedules: schedules }, false, 'setPrepSchedules'),
      
      createPrepSchedule: (schedule) => {
        const newSchedule: PrepSchedule = {
          ...schedule,
          id: `prep-${Date.now()}`,
          status: 'scheduled',
          progressPercentage: 0,
          completedTasks: [],
          issues: []
        };
        
        set((state) => ({
          prepSchedules: [...state.prepSchedules, newSchedule]
        }), false, 'createPrepSchedule');
      },
      
      updatePrepSchedule: (scheduleId, updates) => set((state) => ({
        prepSchedules: state.prepSchedules.map(schedule =>
          schedule.id === scheduleId ? { ...schedule, ...updates } : schedule
        )
      }), false, 'updatePrepSchedule'),
      
      assignStaffToTask: (taskId, staffId) => {
        // TODO: Implement task assignment logic
        console.log(`Assigning task ${taskId} to staff ${staffId}`);
      },
      
      completeTask: (taskId, completedBy, qualityRating) => {
        // TODO: Implement task completion logic
        console.log(`Task ${taskId} completed by ${completedBy} with rating ${qualityRating}`);
      },

      // Equipment Actions
      setEquipmentPullLists: (lists) => set({ equipmentPullLists: lists }, false, 'setEquipmentPullLists'),
      
      createEquipmentPullList: (list) => {
        const newList: EquipmentPullList = {
          ...list,
          id: `epl-${Date.now()}`,
          status: 'pending',
          itemsAvailable: 0,
          itemsShort: 0,
          shortageItems: [],
          conditionCheck: false,
          damageReported: [],
          cleaningRequired: []
        };
        
        set((state) => ({
          equipmentPullLists: [...state.equipmentPullLists, newList]
        }), false, 'createEquipmentPullList');
      },
      
      updateEquipmentPullList: (listId, updates) => set((state) => ({
        equipmentPullLists: state.equipmentPullLists.map(list =>
          list.id === listId ? { ...list, ...updates } : list
        )
      }), false, 'updateEquipmentPullList'),

      // Delivery Actions
      setDeliverySchedules: (schedules) => set({ deliverySchedules: schedules }, false, 'setDeliverySchedules'),
      
      scheduleDelivery: (schedule) => {
        const newSchedule: DeliverySchedule = {
          ...schedule,
          id: `del-${Date.now()}`,
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
        
        set((state) => ({
          deliverySchedules: [...state.deliverySchedules, newSchedule]
        }), false, 'scheduleDelivery');
      },
      
      confirmDelivery: (scheduleId, actualTime, quality) => set((state) => ({
        deliverySchedules: state.deliverySchedules.map(schedule =>
          schedule.id === scheduleId
            ? {
                ...schedule,
                status: 'delivered',
                actualDeliveryTime: actualTime,
                qualityApproved: quality,
                qualityMet: quality
              }
            : schedule
        )
      }), false, 'confirmDelivery'),

      // Performance Tracking
      updatePerformanceMetrics: (metrics) => set((state) => ({
        performanceMetrics: state.performanceMetrics.some(m => m.chefId === metrics.chefId)
          ? state.performanceMetrics.map(m => m.chefId === metrics.chefId ? metrics : m)
          : [...state.performanceMetrics, metrics]
      }), false, 'updatePerformanceMetrics')
    }),
    {
      name: 'maestro-chef-store'
    }
  )
);

export default useCaptainStore;
