/**
 * Captain Console Panel - Live Service Management
 * 
 * Real-time captain interface for kitchen call sheets, fire management,
 * allergen quick-lookup, and live pacing coordination. Handles counts,
 * special edits, and automatic allergen flagging during service.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useCaptainStore } from '../../stores/captainStore';
import { PanelShell } from '../../builder/maestro-banquets.builder-seed';
import { DemographicTracker } from './DemographicTracker';
import type {
  Captain,
  CaptainTable,
  DishMeta,
  CourseFire,
  MealChoice,
  CourseCode,
  PacingStatus
} from '../../types';

interface CallSheetEntry {
  tableId: string;
  tableName: string;
  guestCount: number;
  counts: Record<MealChoice, number>;
  specialRequests: string[];
  allergenAlerts: string[];
  complexity: 'low' | 'medium' | 'high';
  estimatedTime: number;
  firedAt?: string;
  status: 'pending' | 'fired' | 'cooking' | 'ready' | 'picked_up' | 'served' | 'cancelled';
}

interface AllergenAlert {
  tableId: string;
  seatNo: number;
  guestName: string;
  allergens: string[];
  dish: string;
  severity: 'low' | 'medium' | 'high';
  alternative?: string;
}

const FireButton: React.FC<{
  table: CaptainTable;
  currentCourse: CourseCode;
  onFire: (tableId: string) => void;
  disabled: boolean;
  status?: 'pending' | 'fired' | 'cooking' | 'ready' | 'picked_up' | 'served' | 'cancelled';
}> = ({ table, currentCourse, onFire, disabled, status = 'pending' }) => {
  const buttonColors: Record<string, string> = {
    pending: 'bg-accent hover:bg-accent/90 text-white',
    fired: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    cooking: 'bg-orange-500 hover:bg-orange-600 text-white',
    ready: 'bg-green-500 hover:bg-green-600 text-white',
    picked_up: 'bg-gray-500 text-white cursor-not-allowed',
    served: 'bg-gray-500 text-white cursor-not-allowed',
    cancelled: 'bg-red-500 hover:bg-red-600 text-white'
  };

  const statusIcons: Record<string, string> = {
    pending: '🔥',
    fired: '⏳',
    cooking: '👨‍🍳',
    ready: '✅',
    picked_up: '📦',
    served: '✅',
    cancelled: '❌'
  };

  const statusLabels: Record<string, string> = {
    pending: 'Fire',
    fired: 'Fired',
    cooking: 'Cooking',
    ready: 'Ready',
    picked_up: 'Picked Up',
    served: 'Served',
    cancelled: 'Cancelled'
  };

  return (
    <button
      onClick={() => status === 'pending' && onFire(table.id)}
      disabled={disabled || status === 'picked_up'}
      className={`px-4 py-3 rounded-lg font-medium transition-colors min-w-[120px] ${buttonColors[status]}`}
    >
      <div className="flex items-center justify-center gap-2">
        <span>{statusIcons[status]}</span>
        <span>{statusLabels[status]} {table.label}</span>
      </div>
      {status === 'ready' && (
        <div className="text-xs opacity-75 mt-1">
          Tap to mark picked up
        </div>
      )}
    </button>
  );
};

const CallSheetCard: React.FC<{
  entry: CallSheetEntry;
  onEdit: (entry: CallSheetEntry) => void;
  onMarkReady: (tableId: string) => void;
  onPickedUp: (tableId: string) => void;
}> = ({ entry, onEdit, onMarkReady, onPickedUp }) => {
  const totalCount = Object.values(entry.counts).reduce((sum, count) => sum + count, 0);
  const nonZeroCounts = Object.entries(entry.counts).filter(([_, count]) => count > 0);
  
  const statusColors = {
    pending: 'border-l-gray-400',
    fired: 'border-l-yellow-500',
    cooking: 'border-l-orange-500',
    ready: 'border-l-green-500',
    picked_up: 'border-l-gray-500'
  };

  const complexityColors = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-red-600'
  };

  return (
    <div className={`glass-panel p-4 border-l-4 ${statusColors[entry.status]}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-primary flex items-center gap-2">
            {entry.tableName}
            <span className={`text-sm ${complexityColors[entry.complexity]}`}>
              ({entry.complexity})
            </span>
            {entry.allergenAlerts.length > 0 && (
              <span className="text-err" title="Allergen alerts">⚠️</span>
            )}
          </h4>
          <div className="text-sm text-muted">
            {totalCount} covers • Est. {entry.estimatedTime}min
            {entry.firedAt && (
              <span className="ml-2">
                Fired: {new Date(entry.firedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(entry)}
            className="p-1 hover:bg-accent hover:text-white rounded transition-colors"
            title="Edit order"
          >
            ✏️
          </button>
          
          {entry.status === 'cooking' && (
            <button
              onClick={() => onMarkReady(entry.tableId)}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
            >
              Mark Ready
            </button>
          )}
          
          {entry.status === 'ready' && (
            <button
              onClick={() => onPickedUp(entry.tableId)}
              className="px-3 py-1 bg-accent text-white rounded text-sm hover:bg-accent/90 transition-colors"
            >
              Picked Up
            </button>
          )}
        </div>
      </div>

      {/* Counts Display */}
      <div className="mb-3">
        <div className="text-sm font-medium text-primary mb-2">Order Counts:</div>
        <div className="flex flex-wrap gap-2">
          {nonZeroCounts.map(([choice, count]) => (
            <span 
              key={choice}
              className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-sm font-medium"
            >
              {choice}: {count}
            </span>
          ))}
        </div>
      </div>

      {/* Special Requests */}
      {entry.specialRequests.length > 0 && (
        <div className="mb-3">
          <div className="text-sm font-medium text-primary mb-2">Special Requests:</div>
          <div className="space-y-1">
            {entry.specialRequests.map((request, index) => (
              <div key={index} className="text-sm text-muted bg-yellow-50 p-2 rounded">
                {request}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Allergen Alerts */}
      {entry.allergenAlerts.length > 0 && (
        <div className="mb-3">
          <div className="text-sm font-medium text-err mb-2">⚠️ Allergen Alerts:</div>
          <div className="space-y-1">
            {entry.allergenAlerts.map((alert, index) => (
              <div key={index} className="text-sm text-err bg-red-50 p-2 rounded border border-red-200">
                {alert}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const QuickAllergenLookup: React.FC<{
  dishes: DishMeta[];
  isOpen: boolean;
  onClose: () => void;
}> = ({ dishes, isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAllergen, setSelectedAllergen] = useState<string>('');

  const allAllergens = Array.from(new Set(dishes.flatMap(d => d.allergens))).sort();
  
  const filteredDishes = dishes.filter(dish => {
    const matchesSearch = dish.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dish.ingredients.some(ing => ing.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesAllergen = !selectedAllergen || dish.allergens.includes(selectedAllergen);
    return matchesSearch && matchesAllergen;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel-elevated p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-primary">Allergen Quick Lookup</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted/10 rounded transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-4 mb-4">
          <input
            type="text"
            placeholder="Search dishes or ingredients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 p-3 border border-default rounded-lg bg-panel text-primary focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          <select
            value={selectedAllergen}
            onChange={(e) => setSelectedAllergen(e.target.value)}
            className="p-3 border border-default rounded-lg bg-panel text-primary focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="">All Allergens</option>
            {allAllergens.map(allergen => (
              <option key={allergen} value={allergen}>{allergen}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {filteredDishes.length === 0 ? (
            <div className="text-center py-8 text-muted">
              No dishes match your search criteria
            </div>
          ) : (
            filteredDishes.map(dish => (
              <div key={dish.id} className="glass-panel p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-primary">{dish.label}</h4>
                  <span className="text-sm text-muted">{dish.category}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-primary mb-1">Allergens:</div>
                    <div className="flex flex-wrap gap-1">
                      {dish.allergens.length === 0 ? (
                        <span className="text-ok">None</span>
                      ) : (
                        dish.allergens.map(allergen => (
                          <span 
                            key={allergen}
                            className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs"
                          >
                            {allergen}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium text-primary mb-1">Key Ingredients:</div>
                    <div className="text-muted">
                      {dish.ingredients.slice(0, 4).join(', ')}
                      {dish.ingredients.length > 4 && '...'}
                    </div>
                  </div>
                </div>

                {Object.keys(dish.substitutions.allergenFree).length > 0 && (
                  <div className="mt-3 p-2 bg-ok/10 border border-ok/20 rounded">
                    <div className="font-medium text-ok text-sm mb-1">Available Substitutes:</div>
                    <div className="text-xs text-muted">
                      {Object.entries(dish.substitutions.allergenFree)
                        .map(([allergen, substitute]) => `${allergen} → ${substitute}`)
                        .join(', ')}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export const CaptainConsolePanel: React.FC<{
  eventId?: string;
  captainId?: string;
}> = ({ eventId, captainId }) => {
  const {
    captains,
    tables,
    dishes,
    courseFires,
    currentCourse,
    currentCaptain,
    fireTable,
    updateCourseFire,
    updateTablePacing
  } = useCaptainStore();

  const [selectedCaptain, setSelectedCaptain] = useState<Captain | null>(
    captainId ? captains.find(c => c.id === captainId) || null : currentCaptain
  );
  const [showAllergenLookup, setShowAllergenLookup] = useState(false);
  const [showDemographics, setShowDemographics] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Get captain's tables and firing sequence
  const captainTables = tables.filter(t => t.captainId === selectedCaptain?.id);
  const firingSequence = selectedCaptain?.firingSequence || captainTables.map(t => t.id);
  
  // Get current course fires for this captain
  const currentCourseFires = courseFires.filter(
    fire => fire.captainId === selectedCaptain?.id && fire.course === currentCourse
  );

  // Generate call sheet entries
  const callSheetEntries = useMemo((): CallSheetEntry[] => {
    return firingSequence.map(tableId => {
      const table = tables.find(t => t.id === tableId);
      const fire = currentCourseFires.find(f => f.tableId === tableId);
      
      if (!table) return null;

      // Calculate meal counts from seat assignments
      const counts: Record<MealChoice, number> = {
        beef: 0, fish: 0, chicken: 0, pork: 0, veg: 0, vegan: 0, 
        kosher: 0, halal: 0, custom: 0
      };
      
      table.seats.forEach(seat => {
        if (seat.mealChoice && counts.hasOwnProperty(seat.mealChoice)) {
          counts[seat.mealChoice]++;
        }
      });

      // Generate special requests from seat notes
      const specialRequests: string[] = [];
      table.seats.forEach(seat => {
        if (seat.specialNotes) {
          specialRequests.push(`Seat ${seat.seatNo}: ${seat.specialNotes}`);
        }
      });

      // Generate allergen alerts
      const allergenAlerts: string[] = [];
      table.seats.forEach(seat => {
        if (seat.allergens && seat.allergens.length > 0) {
          allergenAlerts.push(
            `Seat ${seat.seatNo} (${seat.name || 'Guest'}): ${seat.allergens.join(', ')}`
          );
        }
      });

      // Estimate cooking time based on complexity and counts
      const totalCovers = Object.values(counts).reduce((sum, count) => sum + count, 0);
      const baseTime = 12; // base minutes per table
      const coverTime = totalCovers * 1.5; // additional time per cover
      const complexityMultiplier = table.complexity === 'high' ? 1.3 : table.complexity === 'medium' ? 1.1 : 1.0;
      
      return {
        tableId: table.id,
        tableName: table.label,
        guestCount: table.currentCapacity,
        counts,
        specialRequests,
        allergenAlerts,
        complexity: table.complexity,
        estimatedTime: Math.round((baseTime + coverTime) * complexityMultiplier),
        firedAt: fire?.firedAt,
        status: fire?.status || 'pending'
      };
    }).filter(Boolean) as CallSheetEntry[];
  }, [firingSequence, tables, currentCourseFires]);

  // Handle firing a table
  const handleFireTable = (tableId: string) => {
    const entry = callSheetEntries.find(e => e.tableId === tableId);
    if (!entry || !selectedCaptain) return;

    fireTable(tableId, selectedCaptain.id, entry.counts, entry.specialRequests);
    
    // Update table pacing
    updateTablePacing(tableId, 'firing');
  };

  // Handle marking table as ready
  const handleMarkReady = (tableId: string) => {
    const fire = currentCourseFires.find(f => f.tableId === tableId);
    if (fire) {
      updateCourseFire(fire.id, {
        status: 'ready',
        actualReadyAt: new Date().toISOString()
      });
    }
  };

  // Handle marking table as picked up
  const handlePickedUp = (tableId: string) => {
    const fire = currentCourseFires.find(f => f.tableId === tableId);
    if (fire) {
      updateCourseFire(fire.id, {
        status: 'picked_up',
        pickedUpAt: new Date().toISOString()
      });
      updateTablePacing(tableId, 'picking_up');
    }
  };

  const toolbarRight = (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setShowAllergenLookup(true)}
        className="px-3 py-1.5 bg-panel border border-default rounded-lg text-sm font-medium hover:bg-muted/10 transition-colors"
      >
        🔍 Allergen Lookup
      </button>

      <button
        onClick={() => setShowDemographics(!showDemographics)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          showDemographics
            ? 'bg-accent text-white hover:bg-accent/90'
            : 'bg-panel border border-default hover:bg-muted/10'
        }`}
      >
        📊 Demographics
      </button>

      <select
        value={selectedCaptain?.id || ''}
        onChange={(e) => {
          const captain = captains.find(c => c.id === e.target.value);
          setSelectedCaptain(captain || null);
        }}
        className="p-2 bg-panel border border-default rounded-lg text-primary text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
      >
        <option value="">Select Captain</option>
        {captains.map(captain => (
          <option key={captain.id} value={captain.id}>
            {captain.name}
          </option>
        ))}
      </select>

      <div className="text-sm text-muted">
        Course: <span className="font-medium text-primary">{currentCourse}</span>
      </div>
    </div>
  );

  if (!selectedCaptain) {
    return (
      <PanelShell title="Captain Console" toolbarRight={toolbarRight}>
        <div className="glass-panel p-8 text-center">
          <div className="text-muted mb-4">Please select a captain to view their console</div>
        </div>
      </PanelShell>
    );
  }

  if (captainTables.length === 0) {
    return (
      <PanelShell title={`Captain Console — ${selectedCaptain.name}`} toolbarRight={toolbarRight}>
        <div className="glass-panel p-8 text-center">
          <div className="text-muted">No tables assigned to this captain</div>
        </div>
      </PanelShell>
    );
  }

  const pendingTables = callSheetEntries.filter(e => e.status === 'pending').length;
  const firedTables = callSheetEntries.filter(e => e.status === 'fired' || e.status === 'cooking').length;
  const readyTables = callSheetEntries.filter(e => e.status === 'ready').length;
  const completeTables = callSheetEntries.filter(e => e.status === 'picked_up').length;

  return (
    <>
      <PanelShell title={`Captain Console — ${selectedCaptain.name}`} toolbarRight={toolbarRight}>
        <div className="space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-4 text-center">
              <div className="text-sm text-muted">Pending</div>
              <div className="text-2xl font-bold text-primary">{pendingTables}</div>
            </div>
            <div className="glass-panel p-4 text-center">
              <div className="text-sm text-muted">Cooking</div>
              <div className="text-2xl font-bold text-warn">{firedTables}</div>
            </div>
            <div className="glass-panel p-4 text-center">
              <div className="text-sm text-muted">Ready</div>
              <div className="text-2xl font-bold text-ok">{readyTables}</div>
            </div>
            <div className="glass-panel p-4 text-center">
              <div className="text-sm text-muted">Complete</div>
              <div className="text-2xl font-bold text-accent">{completeTables}</div>
            </div>
          </div>

          {/* Quick Fire Buttons */}
          <div className="glass-panel p-4">
            <h3 className="font-semibold text-accent mb-4">Quick Fire Controls</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {firingSequence.map(tableId => {
                const table = tables.find(t => t.id === tableId);
                const fire = currentCourseFires.find(f => f.tableId === tableId);
                
                if (!table) return null;

                return (
                  <FireButton
                    key={tableId}
                    table={table}
                    currentCourse={currentCourse}
                    onFire={handleFireTable}
                    disabled={false}
                    status={fire?.status || 'pending'}
                  />
                );
              })}
            </div>
          </div>

          {/* Call Sheet */}
          <div className="space-y-4">
            <h3 className="font-semibold text-accent">Kitchen Call Sheet</h3>
            {callSheetEntries.length === 0 ? (
              <div className="glass-panel p-8 text-center">
                <div className="text-muted">No tables in firing sequence</div>
              </div>
            ) : (
              <div className="space-y-3">
                {callSheetEntries.map(entry => (
                  <CallSheetCard
                    key={entry.tableId}
                    entry={entry}
                    onEdit={() => undefined}
                    onMarkReady={handleMarkReady}
                    onPickedUp={handlePickedUp}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Live Demographic Tracking */}
          {showDemographics && (
            <DemographicTracker
              eventId={eventId}
              captainId={selectedCaptain?.id}
              className="mb-6"
            />
          )}

          {/* Performance Notes */}
          <div className="glass-panel p-4">
            <h4 className="font-semibold text-accent mb-3">Service Notes</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted">•</span>
                <span className="text-primary">
                  Tap table buttons to fire orders to kitchen with auto-generated counts
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted">•</span>
                <span className="text-primary">
                  System auto-flags allergen risks based on guest profiles and dish ingredients
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted">•</span>
                <span className="text-primary">
                  When picking up orders, tap "Picked Up" to update timeline and trigger next course
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted">•</span>
                <span className="text-primary">
                  Use Allergen Lookup for quick ingredient and substitution information
                </span>
              </div>
              {showDemographics && (
                <div className="flex items-center gap-2">
                  <span className="text-accent">•</span>
                  <span className="text-primary">
                    Demographics panel shows live guest behavior patterns and service optimization insights
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </PanelShell>

      {/* Allergen Lookup Modal */}
      <QuickAllergenLookup
        dishes={dishes}
        isOpen={showAllergenLookup}
        onClose={() => setShowAllergenLookup(false)}
      />
    </>
  );
};

export default CaptainConsolePanel;
