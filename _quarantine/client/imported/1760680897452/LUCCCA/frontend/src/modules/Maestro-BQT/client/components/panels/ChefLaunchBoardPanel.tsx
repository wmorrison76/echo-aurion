/**
 * Chef Launch Board Panel - Echo Event Studio Integration
 * 
 * Comprehensive chef workflow interface featuring Echo Event Studio calendar
 * integration, recipe scaling with buffer management, purchasing coordination,
 * prep scheduling with staff assignments, and equipment pull list generation.
 */

import React, { useState, useMemo } from 'react';
import { useChefStore } from '../../stores/captainStore';
import { useEventStore } from '../../stores/eventStore';
import { PanelShell } from '../../builder/maestro-banquets.builder-seed';
import type {
  EchoEventStudioEvent,
  Recipe,
  PurchaseOrder,
  PrepSchedule,
  EquipmentPullList,
  ChefPerformanceMetrics
} from '../../types/chef';

interface MenuScaling {
  recipeId: string;
  recipeName: string;
  baseServings: number;
  targetServings: number;
  bufferPercent: number;
  finalServings: number;
  scaleFactor: number;
  totalCost: number;
}

interface PurchaseAssumption {
  item: string;
  needed: number;
  unit: string;
  packSize: number;
  packsNeeded: number;
  reasoning: string;
  vendor: string;
  cost: number;
}

const EchoEventCard: React.FC<{
  event: EchoEventStudioEvent;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ event, isSelected, onSelect }) => {
  const eventDate = new Date(event.date);
  const isToday = eventDate.toDateString() === new Date().toDateString();
  const isUpcoming = eventDate > new Date();
  
  const statusColors = {
    draft: 'bg-gray-100 text-gray-600',
    pending: 'bg-yellow-100 text-yellow-700',
    signed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700'
  };

  const syncStatusColors = {
    synced: 'text-ok',
    pending: 'text-warn',
    error: 'text-err',
    conflict: 'text-err'
  };

  return (
    <div 
      className={`glass-panel p-4 cursor-pointer transition-all duration-200 ${
        isSelected ? 'ring-2 ring-accent shadow-lg' : 'hover:shadow-md'
      } ${isToday ? 'border-l-4 border-accent' : ''}`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-primary flex items-center gap-2">
            {event.title}
            {isToday && <span className="text-accent">📅 Today</span>}
          </h4>
          <div className="text-sm text-muted">
            {eventDate.toLocaleDateString()} • {event.guestCount} guests • {event.serviceStyle}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs px-2 py-1 rounded-full ${statusColors[event.contractStatus]}`}>
            {event.contractStatus}
          </span>
          <span className={`text-xs ${syncStatusColors[event.syncStatus]}`}>
            {event.syncStatus}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted">Venue:</span>
          <span className="ml-1 text-primary">{event.venueName}</span>
        </div>
        <div>
          <span className="text-muted">Courses:</span>
          <span className="ml-1 text-primary">{event.courseCount}</span>
        </div>
      </div>

      {event.specialRequests.length > 0 && (
        <div className="mt-2 text-xs">
          <span className="text-muted">Special:</span>
          <span className="ml-1 text-primary">{event.specialRequests.slice(0, 2).join(', ')}</span>
          {event.specialRequests.length > 2 && '...'}
        </div>
      )}

      {event.allergenConcerns.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {event.allergenConcerns.slice(0, 3).map(allergen => (
            <span key={allergen} className="px-1 py-0.5 bg-red-100 text-red-700 rounded text-xs">
              {allergen}
            </span>
          ))}
          {event.allergenConcerns.length > 3 && (
            <span className="text-xs text-muted">+{event.allergenConcerns.length - 3} more</span>
          )}
        </div>
      )}
    </div>
  );
};

const MenuScalingSection: React.FC<{
  event: EchoEventStudioEvent;
  recipes: Recipe[];
  defaultBuffer: number;
  onBufferChange: (buffer: number) => void;
}> = ({ event, recipes, defaultBuffer, onBufferChange }) => {
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);
  
  const menuScaling = useMemo((): MenuScaling[] => {
    return selectedRecipes.map(recipeId => {
      const recipe = recipes.find(r => r.id === recipeId);
      if (!recipe) return null;

      const targetServings = event.guestCount;
      const finalServings = Math.ceil(targetServings * (1 + defaultBuffer / 100));
      const scaleFactor = finalServings / recipe.baseServings;
      const totalCost = recipe.costPerServing * finalServings;

      return {
        recipeId,
        recipeName: recipe.name,
        baseServings: recipe.baseServings,
        targetServings,
        bufferPercent: defaultBuffer,
        finalServings,
        scaleFactor,
        totalCost
      };
    }).filter(Boolean) as MenuScaling[];
  }, [selectedRecipes, recipes, event.guestCount, defaultBuffer]);

  const totalMenuCost = menuScaling.reduce((sum, item) => sum + item.totalCost, 0);
  const costPerGuest = totalMenuCost / event.guestCount;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-accent">Menu & Recipe Scaling</h3>
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted">Buffer %:</label>
          <input
            type="number"
            min="0"
            max="20"
            step="0.5"
            value={defaultBuffer}
            onChange={(e) => onBufferChange(parseFloat(e.target.value))}
            className="w-16 p-1 border border-default rounded text-center text-primary focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>
      </div>

      {/* Recipe Selection */}
      <div className="glass-panel p-4">
        <h4 className="font-medium text-primary mb-3">Select Menu Items</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {recipes.map(recipe => (
            <label key={recipe.id} className="flex items-center gap-3 p-2 hover:bg-panel rounded">
              <input
                type="checkbox"
                checked={selectedRecipes.includes(recipe.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedRecipes(prev => [...prev, recipe.id]);
                  } else {
                    setSelectedRecipes(prev => prev.filter(id => id !== recipe.id));
                  }
                }}
                className="rounded border-default text-accent focus:ring-accent"
              />
              <div className="flex-1">
                <div className="font-medium text-primary">{recipe.name}</div>
                <div className="text-xs text-muted">
                  {recipe.category} • ${recipe.costPerServing.toFixed(2)}/serving
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Scaling Results */}
      {menuScaling.length > 0 && (
        <div className="glass-panel p-4">
          <h4 className="font-medium text-primary mb-3">Scaled Quantities</h4>
          <div className="space-y-3">
            {menuScaling.map(item => (
              <div key={item.recipeId} className="flex justify-between items-center p-3 bg-panel rounded border border-default">
                <div>
                  <div className="font-medium text-primary">{item.recipeName}</div>
                  <div className="text-sm text-muted">
                    {item.baseServings} → {item.targetServings} → {item.finalServings} servings
                    (×{item.scaleFactor.toFixed(2)})
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-accent">${item.totalCost.toFixed(2)}</div>
                  <div className="text-xs text-muted">total cost</div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-default">
            <div className="flex justify-between items-center">
              <span className="font-medium text-primary">Total Menu Cost:</span>
              <div className="text-right">
                <div className="text-xl font-bold text-accent">${totalMenuCost.toFixed(2)}</div>
                <div className="text-sm text-muted">${costPerGuest.toFixed(2)} per guest</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PurchasingSection: React.FC<{
  menuScaling: MenuScaling[];
  onCreateOrder: () => void;
}> = ({ menuScaling, onCreateOrder }) => {
  const [showAssumptions, setShowAssumptions] = useState(false);

  // Generate purchase assumptions (simplified for demo)
  const purchaseAssumptions: PurchaseAssumption[] = useMemo(() => {
    const assumptions: PurchaseAssumption[] = [];
    
    menuScaling.forEach(menu => {
      // Mock assumptions based on recipe name
      if (menu.recipeName.toLowerCase().includes('beef')) {
        assumptions.push({
          item: 'Beef Tenderloin',
          needed: menu.finalServings * 0.5, // 8oz per serving
          unit: 'lbs',
          packSize: 20,
          packsNeeded: Math.ceil((menu.finalServings * 0.5) / 20),
          reasoning: `${menu.finalServings} servings × 8oz = ${(menu.finalServings * 0.5).toFixed(1)}lbs, rounded up to case size`,
          vendor: 'Premium Meats Co.',
          cost: Math.ceil((menu.finalServings * 0.5) / 20) * 340
        });
      }
      
      if (menu.recipeName.toLowerCase().includes('salmon')) {
        assumptions.push({
          item: 'Atlantic Salmon Fillets',
          needed: menu.finalServings * 0.375, // 6oz per serving
          unit: 'lbs',
          packSize: 15,
          packsNeeded: Math.ceil((menu.finalServings * 0.375) / 15),
          reasoning: `${menu.finalServings} servings × 6oz = ${(menu.finalServings * 0.375).toFixed(1)}lbs, rounded up to case size`,
          vendor: 'Ocean Fresh Seafood',
          cost: Math.ceil((menu.finalServings * 0.375) / 15) * 280
        });
      }
    });
    
    return assumptions;
  }, [menuScaling]);

  const totalPurchaseCost = purchaseAssumptions.reduce((sum, item) => sum + item.cost, 0);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-accent">Purchasing Integration</h3>
      
      <div className="glass-panel p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-primary">Order Generation</h4>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAssumptions(!showAssumptions)}
              className="px-3 py-2 bg-panel border border-default rounded-lg text-sm font-medium hover:bg-muted/10 transition-colors"
            >
              {showAssumptions ? 'Hide' : 'Load'} Assumptions
            </button>
            <button
              onClick={onCreateOrder}
              className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              Create Purchase Orders
            </button>
          </div>
        </div>

        <div className="text-sm text-muted mb-4">
          System generates two orders: (1) Requisition to storeroom/purchasing, (2) Vendor orders by preferred suppliers and pack sizes.
        </div>

        {showAssumptions && (
          <div className="space-y-3">
            <h5 className="font-medium text-primary">Purchase Assumptions</h5>
            {purchaseAssumptions.length === 0 ? (
              <div className="text-muted text-sm">No assumptions available. Select menu items to generate purchase requirements.</div>
            ) : (
              <div className="space-y-2">
                {purchaseAssumptions.map((assumption, index) => (
                  <div key={index} className="p-3 bg-panel rounded border border-default">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-primary">{assumption.item}</div>
                        <div className="text-xs text-muted">{assumption.vendor}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-accent">${assumption.cost}</div>
                        <div className="text-xs text-muted">{assumption.packsNeeded} cases</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted">
                      {assumption.reasoning}
                    </div>
                  </div>
                ))}
                
                <div className="pt-3 border-t border-default">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-primary">Total Purchase Cost:</span>
                    <span className="text-lg font-bold text-accent">${totalPurchaseCost.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const PrepSchedulingSection: React.FC<{
  event: EchoEventStudioEvent;
  onCreateSchedule: () => void;
}> = ({ event, onCreateSchedule }) => {
  const eventDate = new Date(event.date);
  const prepDate = new Date(eventDate);
  prepDate.setDate(prepDate.getDate() - 1); // Day before event

  const mockPrepTasks = [
    { item: 'Beef Tenderloin', quantity: event.guestCount, cart: 'A1', prep: 'Trim and portion', time: '45min' },
    { item: 'Salmon Fillets', quantity: Math.round(event.guestCount * 0.3), cart: 'A2', prep: 'Remove bones, portion', time: '30min' },
    { item: 'Vegetables', quantity: event.guestCount, cart: 'B1', prep: 'Wash, cut, blanch', time: '60min' },
    { item: 'Sauces', quantity: event.guestCount, cart: 'C1', prep: 'Prepare base sauces', time: '90min' }
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-accent">Prep Scheduling</h3>
      
      <div className="glass-panel p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-primary">Prep Timeline</h4>
          <button
            onClick={onCreateSchedule}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            Generate Schedule
          </button>
        </div>

        <div className="text-sm text-muted mb-4">
          Based on event timeline and staff roster. Considers days off, AM/PM preferences, and workload from other events.
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-medium text-primary">Prep Date:</span>
            <span className="text-primary">{prepDate.toLocaleDateString()}</span>
          </div>
          
          <div>
            <h5 className="font-medium text-primary mb-2">Prep Tasks for BEO #{event.id}</h5>
            <div className="space-y-2">
              {mockPrepTasks.map((task, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-panel rounded border border-default">
                  <div>
                    <div className="font-medium text-primary">{task.item}</div>
                    <div className="text-xs text-muted">{task.prep} • {task.quantity} portions</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-accent">Cart {task.cart}</div>
                    <div className="text-xs text-muted">{task.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EquipmentSection: React.FC<{
  event: EchoEventStudioEvent;
  onGeneratePullList: () => void;
}> = ({ event, onGeneratePullList }) => {
  const mockEquipment = [
    { category: 'Service Ware', items: ['Chafing dishes (6)', 'Serving spoons (24)', 'Warming trays (4)'] },
    { category: 'Table Setup', items: ['Round tables (12)', 'Chiavari chairs (96)', 'Linens - ivory (14)'] },
    { category: 'Kitchen', items: ['Mobile prep station', 'Speed racks (3)', 'Cambro containers (12)'] },
    { category: 'FOH', items: ['Portable bars (2)', 'Ice bins (4)', 'Water stations (3)'] }
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-accent">Equipment & FOH Coordination</h3>
      
      <div className="glass-panel p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-primary">Equipment Pull List</h4>
          <button
            onClick={onGeneratePullList}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            Generate Pull List
          </button>
        </div>

        <div className="text-sm text-muted mb-4">
          Auto-generates equipment needs for {event.guestCount} guests with {event.serviceStyle} service style. 
          Alerts Chef + FOH Event Manager about shortages.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockEquipment.map((category, index) => (
            <div key={index} className="p-3 bg-panel rounded border border-default">
              <h5 className="font-medium text-primary mb-2">{category.category}</h5>
              <ul className="space-y-1 text-sm">
                {category.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="text-muted">• {item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="text-sm font-medium text-yellow-800">⚠️ Potential Shortages</div>
          <div className="text-xs text-yellow-700 mt-1">
            System will flag shortages across departments after inventory check and alert relevant managers.
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChefLaunchBoardPanel: React.FC<{
  eventId?: string;
}> = ({ eventId }) => {
  const { 
    echoEvents, 
    currentEchoEvent,
    setCurrentEchoEvent,
    recipes,
    createPurchaseOrder,
    createPrepSchedule,
    createEquipmentPullList
  } = useChefStore();

  const [bufferPercent, setBufferPercent] = useState(4);
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);

  // Sample Echo events for demonstration
  const sampleEchoEvents: EchoEventStudioEvent[] = useMemo(() => [
    {
      id: 'echo-001',
      crmId: 'CRM-WED-001',
      title: 'Morrison Wedding Reception',
      eventType: 'wedding',
      date: new Date().toISOString().split('T')[0],
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      timezone: 'America/New_York',
      guestCount: 120,
      confirmedCount: 115,
      serviceStyle: 'plated',
      courseCount: 3,
      venueId: 'venue-001',
      venueName: 'Grand Ballroom',
      roomName: 'Main Hall',
      setupStyle: 'banquet',
      clientId: 'client-001',
      clientName: 'Morrison Family',
      clientContact: {
        name: 'William Morrison',
        email: 'william@example.com',
        phone: '(555) 123-4567',
        preferredContact: 'email'
      },
      coordinatorId: 'coord-001',
      coordinatorName: 'Sarah Johnson',
      dietaryRestrictions: ['vegetarian', 'gluten-free'],
      allergenConcerns: ['nuts', 'shellfish', 'dairy'],
      accessibilityNeeds: ['wheelchair_access'],
      specialRequests: ['late_arrival_accommodation', 'vendor_meal_required'],
      budgetTotal: 15000,
      budgetFood: 8000,
      budgetBeverage: 3000,
      budgetService: 4000,
      contractStatus: 'signed',
      lastSyncFromCRM: new Date().toISOString(),
      crmLastModified: new Date().toISOString(),
      syncStatus: 'synced'
    },
    {
      id: 'echo-002',
      crmId: 'CRM-CORP-002',
      title: 'TechCorp Annual Gala',
      eventType: 'corporate',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString(),
      timezone: 'America/New_York',
      guestCount: 200,
      serviceStyle: 'buffet',
      courseCount: 2,
      venueId: 'venue-002',
      venueName: 'Convention Center',
      setupStyle: 'cocktail',
      clientId: 'client-002',
      clientName: 'TechCorp Inc.',
      clientContact: {
        name: 'Jennifer Chen',
        email: 'jen.chen@techcorp.com',
        phone: '(555) 987-6543',
        preferredContact: 'phone'
      },
      dietaryRestrictions: ['vegan', 'kosher'],
      allergenConcerns: ['gluten'],
      accessibilityNeeds: [],
      specialRequests: ['dietary_station_required'],
      contractStatus: 'pending',
      lastSyncFromCRM: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      crmLastModified: new Date().toISOString(),
      syncStatus: 'pending'
    }
  ], []);

  const selectedEvent = currentEchoEvent || sampleEchoEvents[0];

  const handleCreatePurchaseOrder = () => {
    if (!selectedEvent) return;
    
    // Mock purchase order creation
    console.log('Creating purchase orders for event:', selectedEvent.title);
    alert('Purchase orders have been generated and sent to vendors!');
  };

  const handleCreatePrepSchedule = () => {
    if (!selectedEvent) return;
    
    // Mock prep schedule creation
    console.log('Creating prep schedule for event:', selectedEvent.title);
    alert('Prep schedule has been generated and assigned to kitchen staff!');
  };

  const handleGenerateEquipmentList = () => {
    if (!selectedEvent) return;
    
    // Mock equipment list generation
    console.log('Generating equipment pull list for event:', selectedEvent.title);
    alert('Equipment pull list has been generated and sent to FOH team!');
  };

  const menuScaling = useMemo(() => {
    return selectedRecipes.map(recipeId => {
      const recipe = recipes.find(r => r.id === recipeId);
      if (!recipe) return null;

      const targetServings = selectedEvent.guestCount;
      const finalServings = Math.ceil(targetServings * (1 + bufferPercent / 100));
      const scaleFactor = finalServings / recipe.baseServings;
      const totalCost = recipe.costPerServing * finalServings;

      return {
        recipeId,
        recipeName: recipe.name,
        baseServings: recipe.baseServings,
        targetServings,
        bufferPercent,
        finalServings,
        scaleFactor,
        totalCost
      };
    }).filter(Boolean) as any[];
  }, [selectedRecipes, recipes, selectedEvent.guestCount, bufferPercent]);

  const toolbarRight = (
    <div className="flex items-center gap-3">
      <a 
        href="#" 
        onClick={(e) => { e.preventDefault(); alert('Echo Event Studio calendar integration coming soon!'); }}
        className="text-sm text-accent hover:text-accent/80 transition-colors"
      >
        📅 Global Calendar
      </a>
      <div className="text-sm text-muted">
        Echo Event Studio
      </div>
    </div>
  );

  return (
    <PanelShell title="Chef Launch Board" toolbarRight={toolbarRight}>
      <div className="space-y-6">
        {/* Event Selection */}
        <div className="space-y-4">
          <h3 className="font-semibold text-accent">Echo Event Studio Calendar</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sampleEchoEvents.map(event => (
              <EchoEventCard
                key={event.id}
                event={event}
                isSelected={selectedEvent?.id === event.id}
                onSelect={() => setCurrentEchoEvent(event)}
              />
            ))}
          </div>
        </div>

        {selectedEvent && (
          <>
            {/* Event Summary */}
            <div className="glass-panel p-4">
              <h4 className="font-semibold text-accent mb-3">Event Overview</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted">Service Style:</span>
                  <span className="ml-1 font-medium text-primary">{selectedEvent.serviceStyle}</span>
                </div>
                <div>
                  <span className="text-muted">Guest Count:</span>
                  <span className="ml-1 font-medium text-primary">{selectedEvent.guestCount}</span>
                </div>
                <div>
                  <span className="text-muted">Courses:</span>
                  <span className="ml-1 font-medium text-primary">{selectedEvent.courseCount}</span>
                </div>
                <div>
                  <span className="text-muted">Date:</span>
                  <span className="ml-1 font-medium text-primary">
                    {new Date(selectedEvent.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              {selectedEvent.allergenConcerns.length > 0 && (
                <div className="mt-3 pt-3 border-t border-default">
                  <span className="text-sm font-medium text-err">Allergen Concerns:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedEvent.allergenConcerns.map(allergen => (
                      <span key={allergen} className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                        {allergen}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Menu & Recipe Scaling */}
            <MenuScalingSection
              event={selectedEvent}
              recipes={recipes}
              defaultBuffer={bufferPercent}
              onBufferChange={setBufferPercent}
            />

            {/* Purchasing Integration */}
            <PurchasingSection
              menuScaling={menuScaling}
              onCreateOrder={handleCreatePurchaseOrder}
            />

            {/* Prep Scheduling */}
            <PrepSchedulingSection
              event={selectedEvent}
              onCreateSchedule={handleCreatePrepSchedule}
            />

            {/* Equipment & FOH */}
            <EquipmentSection
              event={selectedEvent}
              onGeneratePullList={handleGenerateEquipmentList}
            />

            {/* Performance Summary */}
            <div className="glass-panel p-4">
              <h4 className="font-semibold text-accent mb-3">Chef Performance Dashboard</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-ok">94%</div>
                  <div className="text-muted">Order Accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">89%</div>
                  <div className="text-muted">On-Time Delivery</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-warn">-8%</div>
                  <div className="text-muted">Cost Variance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-ok">4.3/5</div>
                  <div className="text-muted">Guest Satisfaction</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PanelShell>
  );
};

export default ChefLaunchBoardPanel;
