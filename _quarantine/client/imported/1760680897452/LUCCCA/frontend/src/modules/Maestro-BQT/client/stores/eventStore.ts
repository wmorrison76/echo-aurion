import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type ReasonCode =
  | 'kitchen_delay' | 'bar_queue' | 'late_vip' | 'room_flip' | 'vendor_late'
  | 'equipment_issue' | 'weather' | 'floor_congestion' | 'plating_bottleneck'
  | 'speech_overrun' | 'other';

export interface TimelinePhase {
  id: string;
  phase: string;
  plannedAt?: string;
  plannedDurationMin?: number;
  actualAt?: string;
  actualDurationMin?: number;
  varianceMin?: number;
  reason?: ReasonCode;
  notes?: string;
  status: 'pending' | 'active' | 'completed' | 'delayed';
}

export interface MenuItem {
  id: string;
  name: string;
  category: 'appetizer' | 'main' | 'dessert' | 'beverage';
  cost: number;
  ingredients: string[];
  allergens: string[];
  nutritionalInfo: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface Table {
  id: string;
  number: number;
  seats: number;
  x: number;
  y: number;
  shape: 'round' | 'rectangle';
  assigned?: boolean;
  vipTable?: boolean;
}

export interface Guest {
  id: string;
  name: string;
  dietaryRestrictions: string[];
  tableId?: string;
  isVip: boolean;
}

export interface BanquetEvent {
  id: string;
  title: string;
  date: string;
  guestCount: number;
  serviceStyle: 'plated' | 'buffet' | 'family_style' | 'cocktail';
  venue: string;
  timelinePlan: TimelinePhase[];
  timelineActual: TimelinePhase[];
  menu: {
    appetizers: MenuItem[];
    mains: MenuItem[];
    desserts: MenuItem[];
    beverages: MenuItem[];
  };
  seating: {
    tables: Table[];
    layout: string; // room layout identifier
    capacity: number;
  };
  budget: {
    foodCost: number;
    laborCost: number;
    venueCost: number;
    totalRevenue: number;
    profitMargin: number;
  };
  guests: Guest[];
  notes: string;
  status: 'planning' | 'confirmed' | 'in_progress' | 'completed';
}

export interface EventState {
  currentEvent: BanquetEvent | null;
  events: BanquetEvent[];
  selectedPanels: string[];
  theme: 'light' | 'dark';
  
  // Actions
  setCurrentEvent: (event: BanquetEvent) => void;
  updateEvent: (eventId: string, updates: Partial<BanquetEvent>) => void;
  addEvent: (event: BanquetEvent) => void;
  
  // Timeline actions
  updateTimelinePhase: (phaseId: string, updates: Partial<TimelinePhase>) => void;
  logActualTime: (phaseId: string, actualTime: string, reason?: ReasonCode, notes?: string) => void;
  
  // Menu actions
  addMenuItem: (category: keyof BanquetEvent['menu'], item: MenuItem) => void;
  removeMenuItem: (category: keyof BanquetEvent['menu'], itemId: string) => void;
  updateMenuItem: (category: keyof BanquetEvent['menu'], itemId: string, updates: Partial<MenuItem>) => void;
  
  // Seating actions
  updateTable: (tableId: string, updates: Partial<Table>) => void;
  assignGuest: (guestId: string, tableId: string) => void;
  
  // UI actions
  togglePanel: (panelId: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

// Sample data
const sampleEvent: BanquetEvent = {
  id: 'ev-demo-001',
  title: 'Morrison Wedding Reception',
  date: '2024-06-15T18:00:00Z',
  guestCount: 120,
  serviceStyle: 'plated',
  venue: 'Grand Ballroom',
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
      phase: 'Ceremony & Processional',
      plannedAt: '2024-06-15T19:00:00Z',
      plannedDurationMin: 30,
      status: 'completed',
      actualAt: '2024-06-15T19:05:00Z',
      actualDurationMin: 35,
      varianceMin: 5
    },
    {
      id: 'phase-3',
      phase: 'Cocktail Service',
      plannedAt: '2024-06-15T19:30:00Z',
      plannedDurationMin: 45,
      status: 'active',
      actualAt: '2024-06-15T19:35:00Z',
      varianceMin: 8,
      reason: 'bar_queue'
    },
    {
      id: 'phase-4',
      phase: 'Dinner Service',
      plannedAt: '2024-06-15T20:15:00Z',
      plannedDurationMin: 90,
      status: 'pending'
    },
    {
      id: 'phase-5',
      phase: 'Speeches & Toasts',
      plannedAt: '2024-06-15T21:45:00Z',
      plannedDurationMin: 30,
      status: 'pending'
    },
    {
      id: 'phase-6',
      phase: 'Dancing & Reception',
      plannedAt: '2024-06-15T22:15:00Z',
      plannedDurationMin: 120,
      status: 'pending'
    }
  ],
  timelineActual: [],
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
      },
      {
        id: 'app-2', 
        name: 'Bruschetta Trio',
        category: 'appetizer',
        cost: 6.75,
        ingredients: ['Baguette', 'Tomatoes', 'Basil', 'Mozzarella'],
        allergens: ['Gluten', 'Dairy'],
        nutritionalInfo: { calories: 180, protein: 8, carbs: 24, fat: 6 }
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
      },
      {
        id: 'main-2',
        name: 'Pan-Seared Salmon',
        category: 'main', 
        cost: 24.00,
        ingredients: ['Atlantic Salmon', 'Lemon Butter', 'Asparagus'],
        allergens: ['Fish'],
        nutritionalInfo: { calories: 380, protein: 32, carbs: 6, fat: 24 }
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
    beverages: [
      {
        id: 'bev-1',
        name: 'House Wine Selection',
        category: 'beverage',
        cost: 12.00,
        ingredients: ['Wine'],
        allergens: ['Sulfites'],
        nutritionalInfo: { calories: 125, protein: 0, carbs: 4, fat: 0 }
      }
    ]
  },
  seating: {
    tables: [
      { id: 't-1', number: 1, seats: 8, x: 100, y: 100, shape: 'round', assigned: true, vipTable: true },
      { id: 't-2', number: 2, seats: 8, x: 250, y: 100, shape: 'round', assigned: true },
      { id: 't-3', number: 3, seats: 8, x: 400, y: 100, shape: 'round', assigned: true },
      { id: 't-4', number: 4, seats: 10, x: 100, y: 250, shape: 'rectangle', assigned: true },
      { id: 't-5', number: 5, seats: 10, x: 300, y: 250, shape: 'rectangle', assigned: true },
      { id: 't-6', number: 6, seats: 8, x: 500, y: 250, shape: 'round', assigned: false },
    ],
    layout: 'ballroom-standard',
    capacity: 150
  },
  budget: {
    foodCost: 5580.00,    // $45.50 per guest avg
    laborCost: 1560.00,   // $12.75 per guest
    venueCost: 2400.00,   // $20 per guest
    totalRevenue: 12000.00, // $100 per guest
    profitMargin: 0.205   // 20.5%
  },
  guests: [
    { id: 'g-1', name: 'William Morrison', dietaryRestrictions: [], tableId: 't-1', isVip: true },
    { id: 'g-2', name: 'Sarah Morrison', dietaryRestrictions: ['Vegetarian'], tableId: 't-1', isVip: true },
    // More guests would be here...
  ],
  notes: 'Outdoor ceremony backup plan required. VIP table needs premium wine selection.',
  status: 'in_progress'
};

export const useEventStore = create<EventState>()(
  devtools(
    (set, get) => ({
      currentEvent: sampleEvent,
      events: [sampleEvent],
      selectedPanels: ['BEOBuilder', 'SeatingPlanner', 'ExecutionConsole', 'FinancePnlCashflow'],
      theme: 'light',

      setCurrentEvent: (event) => set({ currentEvent: event }, false, 'setCurrentEvent'),

      updateEvent: (eventId, updates) => set((state) => ({
        events: state.events.map(event => 
          event.id === eventId ? { ...event, ...updates } : event
        ),
        currentEvent: state.currentEvent?.id === eventId 
          ? { ...state.currentEvent, ...updates }
          : state.currentEvent
      }), false, 'updateEvent'),

      addEvent: (event) => set((state) => ({
        events: [...state.events, event]
      }), false, 'addEvent'),

      updateTimelinePhase: (phaseId, updates) => set((state) => {
        if (!state.currentEvent) return state;
        
        const updatedPlan = state.currentEvent.timelinePlan.map(phase =>
          phase.id === phaseId ? { ...phase, ...updates } : phase
        );
        
        return {
          currentEvent: {
            ...state.currentEvent,
            timelinePlan: updatedPlan
          }
        };
      }, false, 'updateTimelinePhase'),

      logActualTime: (phaseId, actualTime, reason, notes) => set((state) => {
        if (!state.currentEvent) return state;

        const phase = state.currentEvent.timelinePlan.find(p => p.id === phaseId);
        if (!phase) return state;

        const actualDate = new Date(actualTime);
        const plannedDate = new Date(phase.plannedAt || '');
        const varianceMin = Math.round((actualDate.getTime() - plannedDate.getTime()) / (1000 * 60));

        const updates: Partial<TimelinePhase> = {
          actualAt: actualTime,
          varianceMin,
          status: 'active',
          ...(reason && { reason }),
          ...(notes && { notes })
        };

        get().updateTimelinePhase(phaseId, updates);
        return state;
      }, false, 'logActualTime'),

      addMenuItem: (category, item) => set((state) => {
        if (!state.currentEvent) return state;
        
        return {
          currentEvent: {
            ...state.currentEvent,
            menu: {
              ...state.currentEvent.menu,
              [category]: [...state.currentEvent.menu[category], item]
            }
          }
        };
      }, false, 'addMenuItem'),

      removeMenuItem: (category, itemId) => set((state) => {
        if (!state.currentEvent) return state;
        
        return {
          currentEvent: {
            ...state.currentEvent,
            menu: {
              ...state.currentEvent.menu,
              [category]: state.currentEvent.menu[category].filter(item => item.id !== itemId)
            }
          }
        };
      }, false, 'removeMenuItem'),

      updateMenuItem: (category, itemId, updates) => set((state) => {
        if (!state.currentEvent) return state;
        
        return {
          currentEvent: {
            ...state.currentEvent,
            menu: {
              ...state.currentEvent.menu,
              [category]: state.currentEvent.menu[category].map(item =>
                item.id === itemId ? { ...item, ...updates } : item
              )
            }
          }
        };
      }, false, 'updateMenuItem'),

      updateTable: (tableId, updates) => set((state) => {
        if (!state.currentEvent) return state;
        
        return {
          currentEvent: {
            ...state.currentEvent,
            seating: {
              ...state.currentEvent.seating,
              tables: state.currentEvent.seating.tables.map(table =>
                table.id === tableId ? { ...table, ...updates } : table
              )
            }
          }
        };
      }, false, 'updateTable'),

      assignGuest: (guestId, tableId) => set((state) => {
        if (!state.currentEvent) return state;
        
        return {
          currentEvent: {
            ...state.currentEvent,
            guests: state.currentEvent.guests.map(guest =>
              guest.id === guestId ? { ...guest, tableId } : guest
            )
          }
        };
      }, false, 'assignGuest'),

      togglePanel: (panelId) => set((state) => ({
        selectedPanels: state.selectedPanels.includes(panelId)
          ? state.selectedPanels.filter(id => id !== panelId)
          : [...state.selectedPanels, panelId]
      }), false, 'togglePanel'),

      setTheme: (theme) => set({ theme }, false, 'setTheme')
    }),
    {
      name: 'maestro-banquets-store'
    }
  )
);

export default useEventStore;
