/**
 * BEO Store - Maestro Banquets
 * State management for Banquet Event Orders with GIO precision requirements
 * Enhanced with Echo CRM Events integration for seamless data synchronization
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { BEODocument, BEOTemplate, BEOValidation } from '../types/beo';
import type {
  EchoCRMEvent,
  SyncConfiguration,
  SyncStatus,
  DataConflict,
  SyncOperation
} from '../types/echo-integration';
import { echoIntegrationService } from '../services/echo-integration';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  room: string;
  guestCount: number;
  status: 'lead' | 'proposal' | 'pending' | 'confirmed' | 'in_prep' | 'execution' | 'closed';
  type: 'wedding' | 'corporate' | 'social' | 'holiday';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  beoId?: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  revenue?: number;
  notes?: string;

  // Echo CRM Events Integration
  echoCrmEventId?: string;
  salesRepId?: string;
  salesRepName?: string;
  clientName?: string;
  clientEmail?: string;
  contractStatus?: 'inquiry' | 'proposal_sent' | 'negotiating' | 'signed' | 'cancelled';
  lastSyncedAt?: string;
  syncStatus?: 'synced' | 'pending' | 'conflict' | 'error';
  syncConflicts?: DataConflict[];
  isFromEchoCrm?: boolean;
}

interface BEOStore {
  // State
  beos: Record<string, BEODocument>;
  events: CalendarEvent[];
  templates: BEOTemplate[];
  currentBEO: BEODocument | null;
  isLoading: boolean;
  error: string | null;
  computed: Record<string, import('../services/recipe-scaling').BEOComputation | undefined>;

  // Echo CRM Events Integration State
  echoIntegrationConfig: SyncConfiguration | null;
  syncStatus: SyncStatus | null;
  pendingConflicts: DataConflict[];
  lastSyncOperation: SyncOperation | null;
  isIntegrationEnabled: boolean;
  echoCrmEvents: EchoCRMEvent[];

  // BEO Actions
  createBEO: (eventId: string, template?: BEOTemplate) => Promise<BEODocument>;
  loadBEO: (beoId: string) => Promise<BEODocument | null>;
  saveBEO: (beo: BEODocument) => Promise<void>;
  deleteBEO: (beoId: string) => Promise<void>;
  validateBEO: (beo: BEODocument) => BEOValidation;
  acknowledgeBEO: (beoId: string, userId: string) => Promise<void>;
  recomputeBEO: (beoId: string) => void;

  // Event Actions
  loadEvents: () => Promise<void>;
  acknowledgeEvent: (eventId: string, userId: string) => Promise<void>;
  updateEventStatus: (eventId: string, status: CalendarEvent['status']) => Promise<void>;
  createEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<string>;
  updateEvent: (eventId: string, patch: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  moveEvent: (eventId: string, newDate: string) => Promise<void>;
  getBEODigestForDate: (date: string) => { total: number; events: CalendarEvent[] };

  // Template Actions
  loadTemplates: () => Promise<void>;
  createTemplate: (template: Omit<BEOTemplate, 'id'>) => Promise<BEOTemplate>;

  // Echo CRM Events Integration Actions
  initializeEchoIntegration: (config: SyncConfiguration) => Promise<void>;
  disconnectEchoIntegration: () => Promise<void>;
  syncWithEchoCrm: () => Promise<void>;
  loadEchoCrmEvents: (filters?: any) => Promise<void>;
  createBEOFromEchoCrmEvent: (echoCrmEventId: string) => Promise<BEODocument>;
  resolveConflict: (conflictId: string, resolution: 'echo_wins' | 'maestro_wins' | 'custom', customData?: any) => Promise<void>;
  refreshSyncStatus: () => Promise<void>;
  linkBEOToEchoCrmEvent: (beoId: string, echoCrmEventId: string) => Promise<void>;
  unlinkBEOFromEchoCrmEvent: (beoId: string) => Promise<void>;

  // Utility Actions
  setCurrentBEO: (beo: BEODocument | null) => void;
  clearError: () => void;
  addQuickEventForToday: (title?: string) => Promise<string>;

  // GIO Integration
  checkPrecisionCompliance: (beo: BEODocument) => {
    timingAccuracy: number;
    portionAccuracy: number;
    costAccuracy: number;
    prepCompleteness: number;
  };
}

// Sample data generators
const generateSampleEvents = (): CalendarEvent[] => [
  {
    id: 'ev-001',
    title: 'Smith Wedding Reception',
    date: '2024-07-26',
    time: '6:45 PM - 12:00 AM',
    room: 'Arrabelle Ballrooms',
    guestCount: 87,
    status: 'confirmed',
    type: 'wedding',
    priority: 'high',
    beoId: 'beo-001',
    acknowledged: true,
    revenue: 15000,
    acknowledgedAt: '2024-07-24T09:15:00Z',
    acknowledgedBy: 'Chef Johnson',

    // Echo CRM Events Integration
    echoCrmEventId: 'echo-crm-001',
    salesRepId: 'sales-001',
    salesRepName: 'Sarah Williams',
    clientName: 'John & Emily Smith',
    clientEmail: 'smithwedding@email.com',
    contractStatus: 'signed',
    lastSyncedAt: '2024-07-24T09:15:00Z',
    syncStatus: 'synced',
    isFromEchoCrm: true
  },
  {
    id: 'ev-002',
    title: 'Corporate Holiday Party',
    date: '2024-07-27',
    time: '7:00 PM - 11:00 PM',
    room: 'Grand Ballroom',
    guestCount: 150,
    status: 'pending',
    type: 'corporate',
    priority: 'medium',
    acknowledged: false,
    revenue: 22500,

    // Echo CRM Events Integration
    echoCrmEventId: 'echo-crm-002',
    salesRepId: 'sales-002',
    salesRepName: 'Michael Chen',
    clientName: 'TechCorp Industries',
    clientEmail: 'events@techcorp.com',
    contractStatus: 'negotiating',
    lastSyncedAt: '2024-07-26T14:30:00Z',
    syncStatus: 'pending',
    isFromEchoCrm: true
  },
  {
    id: 'ev-003',
    title: 'Anniversary Celebration',
    date: '2024-07-28',
    time: '6:00 PM - 10:00 PM',
    room: 'Garden Terrace',
    guestCount: 60,
    status: 'confirmed',
    type: 'social',
    priority: 'medium',
    beoId: 'beo-003',
    acknowledged: true,
    revenue: 8500,

    // Local event (not from Echo CRM)
    isFromEchoCrm: false
  },
  {
    id: 'ev-004',
    title: 'Johnson Retirement Dinner',
    date: '2024-07-29',
    time: '5:30 PM - 9:30 PM',
    room: 'Executive Dining',
    guestCount: 25,
    status: 'confirmed',
    type: 'corporate',
    priority: 'low',
    beoId: 'beo-004',
    acknowledged: false,
    revenue: 3200,

    // Echo CRM Events Integration
    echoCrmEventId: 'echo-crm-004',
    salesRepId: 'sales-001',
    salesRepName: 'Sarah Williams',
    clientName: 'Johnson & Associates',
    clientEmail: 'hr@johnsonlaw.com',
    contractStatus: 'signed',
    lastSyncedAt: '2024-07-28T11:45:00Z',
    syncStatus: 'synced',
    isFromEchoCrm: true
  }
];

const createSampleBEO = (eventId: string): BEODocument => ({
  id: `beo-${Date.now()}`,
  version: 1,
  status: 'draft',
  header: {
    account: '',
    postAs: '',
    eventName: '',
    eventDate: '',
    contact: '',
    onSite: '',
    cateringSrc: '',
    paymentType: '',
  },
  event: {
    date: '',
    time: '',
    room: '',
    function: '',
    setup: '',
    expected: 0,
    guaranteed: 0,
  },
  menu: {
    timeline: {
      guestSeating: '7pm- Guests begin taking their seats',
      serviceStart: '7:25pm- Emcee announces Bridal Party',
      buffetInstructions: 'Guests dine off buffet at their leisure (emcee to let guests to know to go to buffet when they would like)',
    },
    items: [],
    specialInstructions: [],
  },
  beverage: {
    room: '',
    barType: 'Premium',
    consumption: 'hosted',
    domesticBeer: [],
    importedBeer: [],
    wine: [],
    cocktails: [],
    nonAlcoholic: [],
  },
  setup: {
    room: '',
    layout: '',
    capacity: 0,
    tables: [],
    linens: { color: '', type: '' },
    centerpieces: '',
    audioVisual: [],
    lighting: '',
    specialRequests: [],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'current_user',
});

export const useBEOStore = create<BEOStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    beos: {},
    events: [],
    templates: [],
    currentBEO: null,
    isLoading: false,
    error: null,
    computed: {},

    // Echo CRM Events Integration State
    echoIntegrationConfig: null,
    syncStatus: null,
    pendingConflicts: [],
    lastSyncOperation: null,
    isIntegrationEnabled: false,
    echoCrmEvents: [],

    // BEO Actions
    createBEO: async (eventId: string, template?: BEOTemplate) => {
      set({ isLoading: true, error: null });
      
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const event = get().events.find(e => e.id === eventId);
        const beo = createSampleBEO(eventId);
        
        if (event) {
          beo.header.eventName = event.title;
          beo.header.eventDate = event.date;
          beo.event.date = event.date;
          beo.event.time = event.time;
          beo.event.room = event.room;
          beo.event.guaranteed = event.guestCount;
          beo.event.expected = event.guestCount;
          beo.beverage.room = event.room;
          beo.setup.room = event.room;
        }
        
        if (template) {
          beo.menu = { ...beo.menu, ...template.defaultMenu };
          beo.beverage = { ...beo.beverage, ...template.defaultBeverage };
          beo.setup = { ...beo.setup, ...template.defaultSetup };
        }

        set(state => ({
          beos: { ...state.beos, [beo.id]: beo },
          currentBEO: beo,
          isLoading: false
        }));

        try {
          const { scaleBEORecipes } = await import('../services/recipe-scaling');
          const comp = scaleBEORecipes(beo);
          set(state => ({ computed: { ...state.computed, [beo.id]: comp } }));
        } catch {}

        return beo;
      } catch (error) {
        set({ error: 'Failed to create BEO', isLoading: false });
        throw error;
      }
    },

    loadBEO: async (beoId: string) => {
      set({ isLoading: true, error: null });
      
      try {
        // Check if BEO is already loaded
        const existingBEO = get().beos[beoId];
        if (existingBEO) {
          set({ currentBEO: existingBEO, isLoading: false });
          return existingBEO;
        }
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For demo, create a sample BEO
        const beo = createSampleBEO('sample-event');
        beo.id = beoId;
        beo.status = 'confirmed';
        
        set(state => ({
          beos: { ...state.beos, [beo.id]: beo },
          currentBEO: beo,
          isLoading: false
        }));
        
        return beo;
      } catch (error) {
        set({ error: 'Failed to load BEO', isLoading: false });
        return null;
      }
    },

    saveBEO: async (beo: BEODocument) => {
      set({ isLoading: true, error: null });
      
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const updatedBEO = {
          ...beo,
          updatedAt: new Date().toISOString(),
          version: beo.version + 1
        };
        
        set(state => ({
          beos: { ...state.beos, [updatedBEO.id]: updatedBEO },
          currentBEO: updatedBEO,
          isLoading: false
        }));

        try {
          const { scaleBEORecipes } = await import('../services/recipe-scaling');
          const comp = scaleBEORecipes(updatedBEO);
          set(state => ({ computed: { ...state.computed, [updatedBEO.id]: comp } }));
        } catch {}

        // Trigger precision compliance check
        get().checkPrecisionCompliance(updatedBEO);
        
      } catch (error) {
        set({ error: 'Failed to save BEO', isLoading: false });
        throw error;
      }
    },

    deleteBEO: async (beoId: string) => {
      set({ isLoading: true, error: null });
      
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        set(state => {
          const { [beoId]: deleted, ...remainingBEOs } = state.beos;
          return {
            beos: remainingBEOs,
            currentBEO: state.currentBEO?.id === beoId ? null : state.currentBEO,
            isLoading: false
          };
        });
        
      } catch (error) {
        set({ error: 'Failed to delete BEO', isLoading: false });
        throw error;
      }
    },

    validateBEO: (beo: BEODocument): BEOValidation => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Required field validation
      if (!beo.header.eventName) errors.push('Event name is required');
      if (!beo.header.eventDate) errors.push('Event date is required');
      if (!beo.event.room) errors.push('Room is required');
      if (beo.event.guaranteed <= 0) errors.push('Guest count must be greater than 0');
      
      // GIO precision validation
      const timingAccuracy = get().checkPrecisionCompliance(beo).timingAccuracy;
      if (timingAccuracy < 0.95) {
        warnings.push('Timing accuracy below GIO standards');
      }
      
      // Calculate completeness
      const requiredFields = [
        beo.header.eventName,
        beo.header.eventDate,
        beo.event.room,
        beo.event.guaranteed > 0,
        beo.menu.items.length > 0
      ];
      const completeness = requiredFields.filter(Boolean).length / requiredFields.length;
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        completeness
      };
    },

    acknowledgeBEO: async (beoId: string, userId: string) => {
      try {
        const beo = get().beos[beoId];
        if (beo) {
          const updatedBEO = {
            ...beo,
            acknowledgedBy: userId,
            acknowledgedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          set(state => ({
            beos: { ...state.beos, [beoId]: updatedBEO }
          }));
        }
      } catch (error) {
        set({ error: 'Failed to acknowledge BEO' });
      }
    },

    // Event Actions
    loadEvents: async () => {
      set({ isLoading: true, error: null });
      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        let events = generateSampleEvents();
        try {
          const saved = localStorage.getItem('calendar:events');
          if (saved) events = JSON.parse(saved);
        } catch {}

        // Ensure Mock BEO# 876309 exists and is on the calendar
        const mockBeoId = 'beo-876309';
        const mockEventId = 'ev-876309';
        const today = new Date();
        const datePlus2 = new Date(today);
        datePlus2.setDate(today.getDate() + 2);
        const dateStr = `${datePlus2.getFullYear()}-${String(datePlus2.getMonth()+1).padStart(2,'0')}-${String(datePlus2.getDate()).padStart(2,'0')}`;
        const hasMock = events.some(e=> e.id===mockEventId) || events.some(e=> e.beoId===mockBeoId);

        if (!hasMock) {
          const mockEvent = {
            id: mockEventId,
            title: 'Corporate Gala — BEO 876309',
            date: dateStr,
            time: '6:30 PM - 10:30 PM',
            room: 'Grand Ballroom',
            guestCount: 180,
            status: 'confirmed' as const,
            type: 'corporate' as const,
            priority: 'high' as const,
            beoId: mockBeoId,
            acknowledged: true
          };
          events = [mockEvent as any, ...events];
        }

        set({ events, isLoading: false });

        // Seed mock BEO if missing
        const state = get();
        if (!state.beos[mockBeoId]) {
          const beo = createSampleBEO('seed-876309');
          beo.id = mockBeoId;
          beo.status = 'confirmed';
          beo.header.eventName = 'Corporate Gala — BEO 876309';
          beo.header.eventDate = dateStr;
          beo.event.date = dateStr;
          beo.event.time = '6:30 PM - 10:30 PM';
          beo.event.room = 'Grand Ballroom';
          beo.event.guaranteed = 180;
          beo.event.expected = 180;

          // Menu with proteins to drive Butcher + Production
          beo.menu.items = [
            {
              id: 'organic-greens-salad',
              name: 'Organic Greens Salad',
              category: 'salad',
              course: 2,
              quantity: 180,
              recipe: {
                id: 'recipe-salad-876309',
                name: 'Organic Greens Salad with Lemon Olive Oil',
                yield: 10,
                prepTimeMinutes: 45,
                cookTimeMinutes: 0,
                complexity: 2,
                prepDaysAdvance: 0,
                storageRequirements: ['refrigerated'],
                equipment: ['salad_spinner'],
                skillRequired: 2,
                ingredients: [
                  { id: 'ing-greens', name: 'Organic Mixed Greens', amount: 2, unit: 'lbs' },
                  { id: 'ing-tomato', name: 'Cherry Tomatoes', amount: 1, unit: 'lb' }
                ],
                steps: [ { id: 's1', order: 1, instruction: 'Wash and dry greens', timeMinutes: 15 } ]
              }
            },
            {
              id: 'beef-tenderloin',
              name: 'Beef Tenderloin',
              category: 'entree',
              course: 3,
              quantity: 180,
              recipe: {
                id: 'recipe-beef-876309',
                name: 'Roasted Beef Tenderloin',
                yield: 25,
                prepTimeMinutes: 120,
                cookTimeMinutes: 60,
                complexity: 4,
                prepDaysAdvance: 2,
                storageRequirements: ['refrigerated_proteins'],
                equipment: ['roasting_pan'],
                skillRequired: 4,
                ingredients: [
                  { id: 'prot-beef', name: 'Beef Tenderloin', amount: 30, unit: 'lbs', prepRequired: 'trim and portion' },
                  { id: 'ing-herb', name: 'Fresh Herbs', amount: 0.5, unit: 'lb' }
                ],
                steps: [ { id: 'b1', order: 1, instruction: 'Trim and season beef tenderloin', timeMinutes: 60 } ]
              }
            },
            {
              id: 'salmon-fillet',
              name: 'Citrus Salmon',
              category: 'entree',
              course: 3,
              quantity: 180,
              recipe: {
                id: 'recipe-salmon-876309',
                name: 'Citrus Roasted Salmon',
                yield: 25,
                prepTimeMinutes: 90,
                cookTimeMinutes: 45,
                complexity: 3,
                prepDaysAdvance: 2,
                storageRequirements: ['refrigerated_proteins'],
                equipment: ['sheet_pan'],
                skillRequired: 3,
                ingredients: [
                  { id: 'prot-salmon', name: 'Salmon Fillet', amount: 30, unit: 'lbs', prepRequired: 'portion and season' },
                  { id: 'ing-citrus', name: 'Citrus', amount: 10, unit: 'ea' }
                ],
                steps: [ { id: 'f1', order: 1, instruction: 'Portion salmon and season', timeMinutes: 45 } ]
              }
            }
          ];

          set(state => ({ beos: { ...state.beos, [beo.id]: beo } }));

          try {
            const { scaleBEORecipes } = await import('../services/recipe-scaling');
            const comp = scaleBEORecipes(beo);
            set(state => ({ computed: { ...state.computed, [beo.id]: comp } }));
          } catch {}
        }

        try { localStorage.setItem('calendar:events', JSON.stringify(get().events)); } catch {}
      } catch (error) {
        set({ error: 'Failed to load events', isLoading: false });
      }
    },

    acknowledgeEvent: async (eventId: string, userId: string) => {
      try {
        set(state => ({
          events: state.events.map(event =>
            event.id === eventId
              ? {
                  ...event,
                  acknowledged: true,
                  acknowledgedAt: new Date().toISOString(),
                  acknowledgedBy: userId
                }
              : event
          )
        }));
      } catch (error) {
        set({ error: 'Failed to acknowledge event' });
      }
    },

    updateEventStatus: async (eventId: string, status: CalendarEvent['status']) => {
      try {
        set(state => ({
          events: state.events.map(event =>
            event.id === eventId ? { ...event, status } : event
          )
        }));
        try { localStorage.setItem('calendar:events', JSON.stringify(get().events)); } catch {}
      } catch (error) {
        set({ error: 'Failed to update event status' });
      }
    },

    createEvent: async (event: Omit<CalendarEvent, 'id'>) => {
      const id = `ev-${Date.now()}`;
      set(state => ({ events: [{ id, ...event } as CalendarEvent, ...state.events] }));
      try { localStorage.setItem('calendar:events', JSON.stringify(get().events)); } catch {}
      return id;
    },

    updateEvent: async (eventId: string, patch: Partial<CalendarEvent>) => {
      set(state => ({ events: state.events.map(e => e.id === eventId ? { ...e, ...patch } : e) }));
      try { localStorage.setItem('calendar:events', JSON.stringify(get().events)); } catch {}
    },

    deleteEvent: async (eventId: string) => {
      set(state => ({ events: state.events.filter(e => e.id !== eventId) }));
      try { localStorage.setItem('calendar:events', JSON.stringify(get().events)); } catch {}
    },

    moveEvent: async (eventId: string, newDate: string) => {
      set(state => ({ events: state.events.map(e => e.id === eventId ? { ...e, date: newDate } : e) }));
      try { localStorage.setItem('calendar:events', JSON.stringify(get().events)); } catch {}
    },

    getBEODigestForDate: (date: string) => {
      const events = get().events.filter(e => e.date === date && !!e.beoId);
      return { total: events.length, events };
    },

    recomputeBEO: (beoId: string) => {
      const beo = get().beos[beoId];
      if (!beo) return;
      import('../services/recipe-scaling').then(({ scaleBEORecipes }) => {
        const comp = scaleBEORecipes(beo);
        set(state => ({ computed: { ...state.computed, [beoId]: comp } }));
      }).catch(() => {});
    },

    // Template Actions
    loadTemplates: async () => {
      set({ isLoading: true, error: null });
      
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const templates: BEOTemplate[] = [
          {
            id: 'template-wedding',
            name: 'Wedding Reception',
            category: 'wedding',
            description: 'Standard wedding reception template with ceremony and reception',
            defaultMenu: {
              timeline: {
                guestSeating: '7pm- Guests begin taking their seats',
                serviceStart: '7:25pm- Emcee announces Bridal Party'
              },
              items: [],
              specialInstructions: ['Bridal table service', 'Wedding cake cutting']
            },
            defaultBeverage: {
              room: '',
              barType: 'Premium',
              consumption: 'hosted'
            },
            defaultSetup: {
              room: '',
              layout: 'Round tables with head table',
              capacity: 150
            }
          }
        ];
        
        set({ templates, isLoading: false });
        
      } catch (error) {
        set({ error: 'Failed to load templates', isLoading: false });
      }
    },

    createTemplate: async (template: Omit<BEOTemplate, 'id'>) => {
      try {
        const newTemplate: BEOTemplate = {
          ...template,
          id: `template-${Date.now()}`
        };

        set(state => ({
          templates: [...state.templates, newTemplate]
        }));

        return newTemplate;
      } catch (error) {
        set({ error: 'Failed to create template' });
        throw error;
      }
    },

    // Echo CRM Events Integration Actions
    initializeEchoIntegration: async (config: SyncConfiguration) => {
      set({ isLoading: true, error: null });

      try {
        await echoIntegrationService.initialize(config);

        set({
          echoIntegrationConfig: config,
          isIntegrationEnabled: true,
          isLoading: false
        });

        // Initial sync
        await get().syncWithEchoCrm();

        console.log('Echo CRM Events integration initialized successfully');
      } catch (error) {
        set({
          error: 'Failed to initialize Echo CRM Events integration',
          isLoading: false
        });
        throw error;
      }
    },

    disconnectEchoIntegration: async () => {
      try {
        echoIntegrationService.destroy();

        set({
          echoIntegrationConfig: null,
          isIntegrationEnabled: false,
          syncStatus: null,
          pendingConflicts: [],
          echoCrmEvents: []
        });

        console.log('Echo CRM Events integration disconnected');
      } catch (error) {
        set({ error: 'Failed to disconnect Echo CRM Events integration' });
        throw error;
      }
    },

    syncWithEchoCrm: async () => {
      if (!get().isIntegrationEnabled) {
        throw new Error('Echo CRM Events integration not enabled');
      }

      set({ isLoading: true, error: null });

      try {
        const syncResult = await echoIntegrationService.triggerManualSync();

        set({
          lastSyncOperation: syncResult.operations[syncResult.operations.length - 1] || null,
          isLoading: false
        });

        // Refresh events after sync
        await get().loadEvents();

        // Update sync status
        await get().refreshSyncStatus();

        console.log('Sync with Echo CRM Events completed:', syncResult.summary);
      } catch (error) {
        set({
          error: 'Failed to sync with Echo CRM Events',
          isLoading: false
        });
        throw error;
      }
    },

    loadEchoCrmEvents: async (filters?: any) => {
      if (!get().isIntegrationEnabled) {
        return;
      }

      set({ isLoading: true, error: null });

      try {
        const response = await echoIntegrationService.fetchEchoCrmEvents(filters);

        if (response.success && response.data) {
          set({
            echoCrmEvents: response.data,
            isLoading: false
          });
        } else {
          throw new Error(response.error?.message || 'Failed to load Echo CRM events');
        }
      } catch (error) {
        set({
          error: 'Failed to load Echo CRM events',
          isLoading: false
        });
        throw error;
      }
    },

    createBEOFromEchoCrmEvent: async (echoCrmEventId: string) => {
      set({ isLoading: true, error: null });

      try {
        const echoCrmEvent = get().echoCrmEvents.find(e => e.crmEventId === echoCrmEventId);
        if (!echoCrmEvent) {
          throw new Error('Echo CRM Event not found');
        }

        // Create a new BEO based on the Echo CRM Event
        const beo = createSampleBEO(`echo-${echoCrmEventId}`);

        // Map Echo CRM Event data to BEO
        beo.header.eventName = echoCrmEvent.eventName;
        beo.header.eventDate = echoCrmEvent.eventDate;
        beo.header.contact = echoCrmEvent.clientName;
        beo.event.date = echoCrmEvent.eventDate;
        beo.event.time = echoCrmEvent.eventTime;
        beo.event.room = echoCrmEvent.room;
        beo.event.guaranteed = echoCrmEvent.guestCount.guaranteed;
        beo.event.expected = echoCrmEvent.guestCount.expected;

        // Add Echo CRM metadata
        (beo as any).echoCrmEventId = echoCrmEvent.crmEventId;
        (beo as any).salesRepId = echoCrmEvent.salesRepId;
        (beo as any).salesRepName = echoCrmEvent.salesRepName;
        (beo as any).clientName = echoCrmEvent.clientName;
        (beo as any).clientEmail = echoCrmEvent.clientEmail;

        set(state => ({
          beos: { ...state.beos, [beo.id]: beo },
          currentBEO: beo,
          isLoading: false
        }));

        // Update the corresponding calendar event to link to this BEO
        const events = get().events.map(event =>
          event.echoCrmEventId === echoCrmEventId
            ? { ...event, beoId: beo.id }
            : event
        );

        set({ events });

        return beo;
      } catch (error) {
        set({
          error: 'Failed to create BEO from Echo CRM Event',
          isLoading: false
        });
        throw error;
      }
    },

    resolveConflict: async (conflictId: string, resolution: 'echo_wins' | 'maestro_wins' | 'custom', customData?: any) => {
      try {
        await echoIntegrationService.resolveConflict(conflictId, resolution, customData);

        // Remove resolved conflict from pending conflicts
        set(state => ({
          pendingConflicts: state.pendingConflicts.filter(c => c.id !== conflictId)
        }));

        // Refresh events after conflict resolution
        await get().loadEvents();

        console.log('Conflict resolved:', conflictId, resolution);
      } catch (error) {
        set({ error: 'Failed to resolve conflict' });
        throw error;
      }
    },

    refreshSyncStatus: async () => {
      if (!get().isIntegrationEnabled) {
        return;
      }

      try {
        const syncStatus = await echoIntegrationService.getSyncStatus();
        set({ syncStatus });
      } catch (error) {
        console.error('Failed to refresh sync status:', error);
      }
    },

    linkBEOToEchoCrmEvent: async (beoId: string, echoCrmEventId: string) => {
      try {
        const beo = get().beos[beoId];
        if (!beo) {
          throw new Error('BEO not found');
        }

        // Add Echo CRM metadata to BEO
        const updatedBEO = {
          ...beo,
          echoCrmEventId,
          updatedAt: new Date().toISOString()
        } as BEODocument & { echoCrmEventId: string };

        set(state => ({
          beos: { ...state.beos, [beoId]: updatedBEO }
        }));

        // Update corresponding calendar event
        const events = get().events.map(event =>
          event.echoCrmEventId === echoCrmEventId
            ? { ...event, beoId }
            : event
        );

        set({ events });

        console.log('BEO linked to Echo CRM Event:', beoId, echoCrmEventId);
      } catch (error) {
        set({ error: 'Failed to link BEO to Echo CRM Event' });
        throw error;
      }
    },

    unlinkBEOFromEchoCrmEvent: async (beoId: string) => {
      try {
        const beo = get().beos[beoId];
        if (!beo) {
          throw new Error('BEO not found');
        }

        // Remove Echo CRM metadata from BEO
        const { echoCrmEventId, ...updatedBEO } = beo as any;

        set(state => ({
          beos: { ...state.beos, [beoId]: updatedBEO }
        }));

        // Update corresponding calendar event
        const events = get().events.map(event =>
          event.beoId === beoId
            ? { ...event, beoId: undefined }
            : event
        );

        set({ events });

        console.log('BEO unlinked from Echo CRM Event:', beoId);
      } catch (error) {
        set({ error: 'Failed to unlink BEO from Echo CRM Event' });
        throw error;
      }
    },

    // Utility Actions
    setCurrentBEO: (beo: BEODocument | null) => {
      set({ currentBEO: beo });
    },

    clearError: () => {
      set({ error: null });
    },

    addQuickEventForToday: async (title?: string) => {
      const id = `ev-${Date.now()}`;
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const newEvent: CalendarEvent = {
        id,
        title: title || 'New Event',
        date: dateStr,
        time: '6:00 PM - 9:00 PM',
        room: 'TBD',
        guestCount: 0,
        status: 'pending',
        type: 'social',
        priority: 'medium',
        acknowledged: false,
      } as any;
      set(state => ({ events: [newEvent, ...state.events] }));
      return id;
    },

    // GIO Integration
    checkPrecisionCompliance: (beo: BEODocument) => {
      // Implement GIO precision compliance checks
      const timingAccuracy = beo.event.time ? 0.99999 : 0.5; // .00005 precision
      const portionAccuracy = beo.event.guaranteed > 0 ? 0.96 : 0.0; // 4% buffer
      const costAccuracy = beo.pricing ? 0.999 : 0.8; // $0.01 precision
      
      let prepCompleteness = 0;
      if (beo.menu.items.length > 0) prepCompleteness += 0.3;
      if (beo.beverage.domesticBeer?.length || beo.beverage.wine?.length) prepCompleteness += 0.3;
      if (beo.setup.capacity && beo.setup.capacity > 0) prepCompleteness += 0.4;
      
      return {
        timingAccuracy,
        portionAccuracy,
        costAccuracy,
        prepCompleteness
      };
    }
  }))
);

// Subscribe to state changes for GIO notifications
useBEOStore.subscribe(
  (state) => state.events,
  (events) => {
    // Check for unacknowledged events over 3 hours old
    const now = new Date();
    const unacknowledged = events.filter(event => {
      if (event.acknowledged) return false;
      
      const eventCreated = new Date(event.date);
      const hoursDiff = (now.getTime() - eventCreated.getTime()) / (1000 * 60 * 60);
      return hoursDiff > 3;
    });
    
    if (unacknowledged.length > 0) {
      console.warn('GIO Alert: Events requiring chef acknowledgment:', unacknowledged);
      // Trigger notification system
    }
  }
);

export type { CalendarEvent };

export default useBEOStore;
