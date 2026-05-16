/**
 * Firing Order Panel - Captain Workflow Management
 * 
 * Interface for captains to define non-sequential table firing orders
 * to optimize service flow and efficiency. Includes timing analysis,
 * bottleneck identification, and performance optimization suggestions.
 */

import React, { useState, useMemo } from 'react';
import { useCaptainStore } from '../../stores/captainStore';
import { PanelShell } from '../../builder/maestro-banquets.builder-seed';
import type { Captain, CaptainTable, CoursePlan } from '../../types';

interface FireOrder {
  tableId: string;
  position: number;
  estimatedTime: number; // Minutes from service start
  complexity: 'low' | 'medium' | 'high';
  dependencies: string[]; // Table IDs that should fire before this one
}

interface OptimizationSuggestion {
  type: 'efficiency' | 'bottleneck' | 'timing' | 'grouping';
  severity: 'low' | 'medium' | 'high';
  description: string;
  tableIds: string[];
  suggestedAction: string;
  impactMinutes?: number;
}

const TableFireCard: React.FC<{
  table: CaptainTable;
  position: number;
  totalTables: number;
  estimatedTime: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isOptimal: boolean;
  suggestions: OptimizationSuggestion[];
}> = ({
  table,
  position,
  totalTables,
  estimatedTime,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  isOptimal,
  suggestions
}) => {
  const shapeIcons = {
    round: '⭕',
    square: '⬜',
    rectangle: '▭',
    head: '👑',
    king: '♛'
  };

  const complexityColors = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-red-600'
  };

  const hasIssues = suggestions.some(s => s.tableIds.includes(table.id));
  const criticalIssues = suggestions.filter(s => s.tableIds.includes(table.id) && s.severity === 'high');

  return (
    <div className={`glass-panel p-4 transition-all duration-200 ${
      hasIssues ? 'border-l-4 border-warn' : isOptimal ? 'border-l-4 border-ok' : ''
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/20 text-accent font-bold text-sm">
            {position}
          </div>
          <span className="text-xl">{shapeIcons[table.shape]}</span>
          <div>
            <h4 className="font-semibold text-primary flex items-center gap-2">
              {table.label}
              {criticalIssues.length > 0 && <span className="text-err">⚠️</span>}
            </h4>
            <div className="text-sm text-muted">
              {table.currentCapacity} seats • 
              Section {table.section} • 
              <span className={complexityColors[table.complexity]}>{table.complexity} complexity</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right text-sm">
            <div className="text-muted">Est. Time</div>
            <div className="font-semibold text-primary">
              {Math.floor(estimatedTime / 60)}:{(estimatedTime % 60).toString().padStart(2, '0')}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <button
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className={`p-1 text-sm rounded transition-colors ${
                canMoveUp
                  ? 'hover:bg-accent hover:text-white text-primary'
                  : 'text-muted cursor-not-allowed'
              }`}
              title="Move up in firing order"
            >
              ↑
            </button>
            <button
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className={`p-1 text-sm rounded transition-colors ${
                canMoveDown
                  ? 'hover:bg-accent hover:text-white text-primary'
                  : 'text-muted cursor-not-allowed'
              }`}
              title="Move down in firing order"
            >
              ↓
            </button>
          </div>
        </div>
      </div>

      {/* Table Details */}
      <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-muted">Kitchen Distance:</span>
          <span className="ml-1 font-medium text-primary">{table.proximityToKitchen}/10</span>
        </div>
        <div>
          <span className="text-muted">View Quality:</span>
          <span className="ml-1 font-medium text-primary">{table.viewQuality}</span>
        </div>
        <div>
          <span className="text-muted">Noise Level:</span>
          <span className="ml-1 font-medium text-primary">{table.noiseLevel}</span>
        </div>
      </div>

      {/* Accessibility & Special Requirements */}
      <div className="mt-2 flex flex-wrap gap-1">
        {table.accessibilityFriendly && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">♿ Accessible</span>
        )}
        {table.seats.some(s => s.allergens && s.allergens.length > 0) && (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">⚠️ Allergens</span>
        )}
        {table.seats.some(s => s.vipStatus && s.vipStatus !== 'standard') && (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">👑 VIP</span>
        )}
      </div>

      {/* Issues and Suggestions */}
      {hasIssues && (
        <div className="mt-3 space-y-1">
          {suggestions
            .filter(s => s.tableIds.includes(table.id))
            .map((suggestion, index) => (
              <div key={index} className={`text-xs p-2 rounded ${
                suggestion.severity === 'high' ? 'bg-red-50 text-red-700' :
                suggestion.severity === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                'bg-blue-50 text-blue-700'
              }`}>
                <strong>{suggestion.type}:</strong> {suggestion.description}
                {suggestion.impactMinutes && (
                  <span className="ml-1">({suggestion.impactMinutes}min impact)</span>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

const OptimizationPanel: React.FC<{
  suggestions: OptimizationSuggestion[];
  onApplySuggestion: (suggestion: OptimizationSuggestion) => void;
}> = ({ suggestions, onApplySuggestion }) => {
  const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.type]) acc[suggestion.type] = [];
    acc[suggestion.type].push(suggestion);
    return acc;
  }, {} as Record<string, OptimizationSuggestion[]>);

  const severityColors = {
    low: 'border-l-blue-400 bg-blue-50',
    medium: 'border-l-yellow-400 bg-yellow-50', 
    high: 'border-l-red-400 bg-red-50'
  };

  const typeIcons = {
    efficiency: '⚡',
    bottleneck: '🚧',
    timing: '⏰',
    grouping: '🔗'
  };

  if (suggestions.length === 0) {
    return (
      <div className="glass-panel p-6 text-center">
        <div className="text-ok text-xl mb-2">✅</div>
        <div className="font-semibold text-primary">Firing Order Optimized</div>
        <div className="text-sm text-muted">No optimization suggestions at this time</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-accent">Optimization Suggestions</h4>
      
      {Object.entries(groupedSuggestions).map(([type, typeSuggestions]) => (
        <div key={type} className="space-y-2">
          <h5 className="font-medium text-primary flex items-center gap-2">
            <span>{typeIcons[type as keyof typeof typeIcons]}</span>
            {type.charAt(0).toUpperCase() + type.slice(1)} Issues
          </h5>
          
          {typeSuggestions.map((suggestion, index) => (
            <div key={index} className={`border-l-4 p-3 rounded-r ${severityColors[suggestion.severity]}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{suggestion.description}</div>
                  <div className="text-sm text-gray-600 mt-1">{suggestion.suggestedAction}</div>
                  {suggestion.impactMinutes && (
                    <div className="text-xs text-gray-500 mt-1">
                      Potential time savings: {suggestion.impactMinutes} minutes
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onApplySuggestion(suggestion)}
                  className="ml-3 px-3 py-1 bg-accent text-white text-xs rounded hover:bg-accent/90 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const FiringOrderPanel: React.FC<{
  eventId?: string;
  captainId?: string;
}> = ({ eventId, captainId }) => {
  const {
    captains,
    tables,
    coursePlans,
    currentCaptain,
    updateFiringSequence
  } = useCaptainStore();

  const [selectedCaptain, setSelectedCaptain] = useState<Captain | null>(
    captainId ? captains.find(c => c.id === captainId) || null : currentCaptain
  );

  // Get captain's tables and current firing sequence
  const captainTables = tables.filter(t => t.captainId === selectedCaptain?.id);
  const firingSequence = selectedCaptain?.firingSequence || captainTables.map(t => t.id);

  // Calculate optimization suggestions
  const optimizationSuggestions = useMemo((): OptimizationSuggestion[] => {
    if (!selectedCaptain || captainTables.length === 0) return [];

    const suggestions: OptimizationSuggestion[] = [];

    // Check for proximity-based efficiency issues
    for (let i = 0; i < firingSequence.length - 1; i++) {
      const currentTable = tables.find(t => t.id === firingSequence[i]);
      const nextTable = tables.find(t => t.id === firingSequence[i + 1]);
      
      if (currentTable && nextTable) {
        const distanceDiff = Math.abs(currentTable.proximityToKitchen - nextTable.proximityToKitchen);
        if (distanceDiff > 3) {
          suggestions.push({
            type: 'efficiency',
            severity: 'medium',
            description: `Large distance jump between ${currentTable.label} and ${nextTable.label}`,
            tableIds: [currentTable.id, nextTable.id],
            suggestedAction: 'Consider grouping tables by proximity to kitchen',
            impactMinutes: distanceDiff * 2
          });
        }
      }
    }

    // Check for complexity clustering
    const highComplexityTables = captainTables.filter(t => t.complexity === 'high');
    if (highComplexityTables.length > 1) {
      const positions = highComplexityTables.map(t => firingSequence.indexOf(t.id));
      const isConsecutive = positions.every((pos, i) => i === 0 || pos === positions[i - 1] + 1);
      
      if (isConsecutive) {
        suggestions.push({
          type: 'bottleneck',
          severity: 'high',
          description: 'Multiple high-complexity tables firing consecutively may create bottleneck',
          tableIds: highComplexityTables.map(t => t.id),
          suggestedAction: 'Distribute complex tables throughout sequence',
          impactMinutes: 15
        });
      }
    }

    // Check for VIP table timing
    const vipTables = captainTables.filter(t => 
      t.seats.some(s => s.vipStatus && s.vipStatus !== 'standard')
    );
    
    vipTables.forEach(table => {
      const position = firingSequence.indexOf(table.id);
      if (position > firingSequence.length / 2) {
        suggestions.push({
          type: 'timing',
          severity: 'medium',
          description: `VIP table ${table.label} scheduled late in sequence`,
          tableIds: [table.id],
          suggestedAction: 'Consider moving VIP tables earlier in firing order',
          impactMinutes: 5
        });
      }
    });

    // Check for accessibility grouping
    const accessibleTables = captainTables.filter(t => t.accessibilityFriendly);
    if (accessibleTables.length > 1) {
      const accessiblePositions = accessibleTables.map(t => firingSequence.indexOf(t.id));
      const spread = Math.max(...accessiblePositions) - Math.min(...accessiblePositions);
      
      if (spread > accessibleTables.length * 2) {
        suggestions.push({
          type: 'grouping',
          severity: 'low',
          description: 'Accessible tables are spread throughout sequence',
          tableIds: accessibleTables.map(t => t.id),
          suggestedAction: 'Group accessible tables for efficient service',
          impactMinutes: 3
        });
      }
    }

    return suggestions.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }, [selectedCaptain, captainTables, firingSequence, tables]);

  const moveTable = (tableId: string, direction: 'up' | 'down') => {
    if (!selectedCaptain) return;

    const sequence = [...firingSequence];
    const currentIndex = sequence.indexOf(tableId);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= sequence.length) return;
    
    [sequence[currentIndex], sequence[newIndex]] = [sequence[newIndex], sequence[currentIndex]];
    
    updateFiringSequence(selectedCaptain.id, sequence);
  };

  const applyOptimizationSuggestion = (suggestion: OptimizationSuggestion) => {
    if (!selectedCaptain) return;

    // Simple implementation - move suggested tables to optimal positions
    let newSequence = [...firingSequence];

    switch (suggestion.type) {
      case 'timing':
        // Move VIP tables earlier
        suggestion.tableIds.forEach(tableId => {
          const currentIndex = newSequence.indexOf(tableId);
          if (currentIndex > 0) {
            newSequence.splice(currentIndex, 1);
            newSequence.splice(Math.floor(newSequence.length / 3), 0, tableId);
          }
        });
        break;
        
      case 'efficiency':
        // Sort by proximity to kitchen
        const tablesData = suggestion.tableIds.map(id => ({
          id,
          proximity: tables.find(t => t.id === id)?.proximityToKitchen || 5
        }));
        tablesData.sort((a, b) => b.proximity - a.proximity);
        
        // Remove and re-insert in sorted order
        suggestion.tableIds.forEach(id => {
          const index = newSequence.indexOf(id);
          if (index !== -1) newSequence.splice(index, 1);
        });
        
        tablesData.forEach(({ id }, index) => {
          newSequence.splice(index, 0, id);
        });
        break;
        
      case 'bottleneck':
        // Distribute complex tables
        const complexTables = suggestion.tableIds;
        complexTables.forEach(id => {
          const index = newSequence.indexOf(id);
          if (index !== -1) newSequence.splice(index, 1);
        });
        
        const spacing = Math.floor(newSequence.length / complexTables.length);
        complexTables.forEach((id, index) => {
          newSequence.splice(index * spacing, 0, id);
        });
        break;
        
      case 'grouping':
        // Group related tables together
        suggestion.tableIds.forEach(id => {
          const index = newSequence.indexOf(id);
          if (index !== -1) newSequence.splice(index, 1);
        });
        
        newSequence.splice(0, 0, ...suggestion.tableIds);
        break;
    }

    updateFiringSequence(selectedCaptain.id, newSequence);
  };

  const calculateEstimatedTime = (position: number): number => {
    // Base service time + position delay + complexity factor
    const baseServiceTime = 15; // minutes per table
    const positionDelay = position * 3; // 3 minutes between fires
    return baseServiceTime + positionDelay;
  };

  const toolbarRight = (
    <div className="flex items-center gap-3">
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
            {captain.name} ({captain.tableIds.length} tables)
          </option>
        ))}
      </select>
    </div>
  );

  if (!selectedCaptain) {
    return (
      <PanelShell title="Firing Order Management" toolbarRight={toolbarRight}>
        <div className="glass-panel p-8 text-center">
          <div className="text-muted mb-4">Please select a captain to manage their firing order</div>
        </div>
      </PanelShell>
    );
  }

  if (captainTables.length === 0) {
    return (
      <PanelShell title={`Firing Order — ${selectedCaptain.name}`} toolbarRight={toolbarRight}>
        <div className="glass-panel p-8 text-center">
          <div className="text-muted">No tables assigned to this captain</div>
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell title={`Firing Order — ${selectedCaptain.name}`} toolbarRight={toolbarRight}>
      <div className="space-y-6">
        {/* Captain Performance Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4 text-center">
            <div className="text-sm text-muted">Tables Assigned</div>
            <div className="text-2xl font-bold text-primary">{captainTables.length}</div>
          </div>
          <div className="glass-panel p-4 text-center">
            <div className="text-sm text-muted">Avg Service Time</div>
            <div className="text-2xl font-bold text-accent">{selectedCaptain.averageServiceTime}min</div>
          </div>
          <div className="glass-panel p-4 text-center">
            <div className="text-sm text-muted">Guest Satisfaction</div>
            <div className="text-2xl font-bold text-ok">{selectedCaptain.guestSatisfactionScore}/100</div>
          </div>
          <div className="glass-panel p-4 text-center">
            <div className="text-sm text-muted">Issues Found</div>
            <div className={`text-2xl font-bold ${
              optimizationSuggestions.length === 0 ? 'text-ok' :
              optimizationSuggestions.some(s => s.severity === 'high') ? 'text-err' : 'text-warn'
            }`}>
              {optimizationSuggestions.length}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Firing Sequence */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-accent">Firing Sequence</h3>
              <div className="text-sm text-muted">
                {coursePlans.map(course => 
                  `${course.label}: ${course.targetDurationMin}±${course.toleranceMin}min`
                ).join(' • ')}
              </div>
            </div>
            
            <div className="space-y-3">
              {firingSequence.map((tableId, index) => {
                const table = tables.find(t => t.id === tableId);
                if (!table) return null;

                return (
                  <TableFireCard
                    key={tableId}
                    table={table}
                    position={index + 1}
                    totalTables={firingSequence.length}
                    estimatedTime={calculateEstimatedTime(index)}
                    onMoveUp={() => moveTable(tableId, 'up')}
                    onMoveDown={() => moveTable(tableId, 'down')}
                    canMoveUp={index > 0}
                    canMoveDown={index < firingSequence.length - 1}
                    isOptimal={optimizationSuggestions.every(s => !s.tableIds.includes(tableId))}
                    suggestions={optimizationSuggestions}
                  />
                );
              })}
            </div>
          </div>

          {/* Optimization Suggestions */}
          <div>
            <OptimizationPanel
              suggestions={optimizationSuggestions}
              onApplySuggestion={applyOptimizationSuggestion}
            />
          </div>
        </div>

        {/* Course Timeline Preview */}
        <div className="glass-panel p-4">
          <h4 className="font-semibold text-accent mb-3">Service Timeline Preview</h4>
          <div className="space-y-2">
            {coursePlans.map((course, courseIndex) => {
              const courseStart = courseIndex * 45; // 45 minutes between courses
              
              return (
                <div key={course.code} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-primary">
                    {course.label}
                  </div>
                  <div className="flex-1 relative h-6 bg-gray-100 rounded">
                    <div
                      className="absolute h-full bg-accent/30 rounded"
                      style={{
                        left: '0%',
                        width: `${(course.targetDurationMin / 90) * 100}%`
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                      {course.targetDurationMin}min window
                    </div>
                  </div>
                  <div className="text-sm text-muted">
                    {Math.floor((courseStart + course.targetDurationMin) / 60)}:
                    {((courseStart + course.targetDurationMin) % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PanelShell>
  );
};
