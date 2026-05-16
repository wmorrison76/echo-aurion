/**
 * Section Planner Panel - Captain & Sections Workflow
 * 
 * Comprehensive section planning interface for assigning tables to captains,
 * managing table shapes and positioning, and configuring floor add-ons that
 * affect capacity and service flow.
 */

import React, { useState, useCallback } from 'react';
import { useCaptainStore } from '../../stores/captainStore';
import { PanelShell } from '../../builder/maestro-banquets.builder-seed';
import type { Captain, CaptainTable, FloorAddon, TableShape, FloorAddonType } from '../../types';

interface TableFormData {
  number: number;
  label: string;
  shape: TableShape;
  maxCapacity: number;
  currentCapacity: number;
  x: number;
  y: number;
  section?: string;
  accessibilityFriendly: boolean;
  viewQuality: 'excellent' | 'good' | 'fair' | 'poor';
  noiseLevel: 'quiet' | 'moderate' | 'loud';
}

interface AddonFormData {
  type: FloorAddonType;
  label: string;
  description: string;
  x: number;
  y: number;
  width: number;
  length: number;
  capacityImpact: number;
  flowImpact: 'blocks_aisle' | 'creates_bottleneck' | 'improves_flow' | 'neutral';
  setupTime: number;
  teardownTime: number;
  staffRequired: number;
  powerRequired: boolean;
  audioRequired: boolean;
}

const TableCard: React.FC<{
  table: CaptainTable;
  captains: Captain[];
  onAssign: (tableId: string, captainId: string) => void;
  onEdit: (table: CaptainTable) => void;
  onDelete: (tableId: string) => void;
}> = ({ table, captains, onAssign, onEdit, onDelete }) => {
  const assignedCaptain = captains.find(c => c.id === table.captainId);
  const occupancyRate = (table.currentCapacity / table.maxCapacity) * 100;
  
  const shapeIcons = {
    round: '⭕',
    square: '⬜',
    rectangle: '▭',
    head: '👑',
    king: '♛'
  };

  const statusColors = {
    not_started: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-yellow-100 text-yellow-800',
    complete: 'bg-green-100 text-green-800',
    needs_attention: 'bg-red-100 text-red-800'
  };

  const complexityColors = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-red-600'
  };

  return (
    <div className="glass-panel p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{shapeIcons[table.shape]}</span>
          <div>
            <h4 className="font-semibold text-primary flex items-center gap-2">
              {table.label}
              <span className={`text-xs px-2 py-1 rounded-full ${statusColors[table.setupStatus]}`}>
                {table.setupStatus.replace('_', ' ')}
              </span>
            </h4>
            <div className="text-sm text-muted">
              Section {table.section || '—'} • {table.shape} • {table.currentCapacity}/{table.maxCapacity} seats
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(table)}
            className="p-1 hover:bg-accent hover:text-white rounded transition-colors"
            title="Edit table"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(table.id)}
            className="p-1 hover:bg-err hover:text-white rounded transition-colors"
            title="Delete table"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="text-center">
          <div className="text-muted">Occupancy</div>
          <div className={`font-semibold ${occupancyRate > 90 ? 'text-warn' : 'text-ok'}`}>
            {occupancyRate.toFixed(0)}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-muted">Complexity</div>
          <div className={`font-semibold ${complexityColors[table.complexity]}`}>
            {table.complexity}
          </div>
        </div>
        <div className="text-center">
          <div className="text-muted">Kitchen Proximity</div>
          <div className="font-semibold text-primary">{table.proximityToKitchen}/10</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Assigned Captain:</span>
          <select
            value={table.captainId || ''}
            onChange={(e) => onAssign(table.id, e.target.value)}
            className="text-sm p-1 border border-default rounded bg-panel text-primary focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="">Unassigned</option>
            {captains.map(captain => (
              <option key={captain.id} value={captain.id}>
                {captain.name} ({captain.tableIds.length}/{captain.maxTables})
              </option>
            ))}
          </select>
        </div>
        
        {assignedCaptain && (
          <div className="text-xs text-muted">
            Load: {Math.round((assignedCaptain.tableIds.length / assignedCaptain.maxTables) * 100)}% • 
            Rating: {assignedCaptain.guestSatisfactionScore}/100
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1 text-xs">
        {table.accessibilityFriendly && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">♿ Accessible</span>
        )}
        <span className={`px-2 py-1 rounded-full ${
          table.viewQuality === 'excellent' ? 'bg-green-100 text-green-800' :
          table.viewQuality === 'good' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          👁️ {table.viewQuality}
        </span>
        <span className={`px-2 py-1 rounded-full ${
          table.noiseLevel === 'quiet' ? 'bg-green-100 text-green-800' :
          table.noiseLevel === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          🔊 {table.noiseLevel}
        </span>
      </div>
    </div>
  );
};

const AddonCard: React.FC<{
  addon: FloorAddon;
  onEdit: (addon: FloorAddon) => void;
  onDelete: (addonId: string) => void;
}> = ({ addon, onEdit, onDelete }) => {
  const typeIcons = {
    dance_floor: '💃',
    photo_booth: '📸',
    dj_booth: '🎧',
    stage: '🎭',
    bar: '🍹',
    buffet_station: '🍽️',
    other: '📦'
  };

  const flowImpactColors = {
    blocks_aisle: 'text-red-600',
    creates_bottleneck: 'text-orange-600',
    improves_flow: 'text-green-600',
    neutral: 'text-gray-600'
  };

  return (
    <div className="glass-panel p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{typeIcons[addon.type]}</span>
          <div>
            <h4 className="font-semibold text-primary">{addon.label}</h4>
            <div className="text-sm text-muted">{addon.description}</div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(addon)}
            className="p-1 hover:bg-accent hover:text-white rounded transition-colors"
            title="Edit addon"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(addon.id)}
            className="p-1 hover:bg-err hover:text-white rounded transition-colors"
            title="Delete addon"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-muted">Size</div>
          <div className="font-medium text-primary">{addon.width}×{addon.length}</div>
        </div>
        <div>
          <div className="text-muted">Capacity Impact</div>
          <div className={`font-medium ${addon.capacityImpact < 0 ? 'text-err' : addon.capacityImpact > 0 ? 'text-ok' : 'text-muted'}`}>
            {addon.capacityImpact > 0 ? '+' : ''}{addon.capacityImpact}
          </div>
        </div>
        <div>
          <div className="text-muted">Flow Impact</div>
          <div className={`font-medium ${flowImpactColors[addon.flowImpact]}`}>
            {addon.flowImpact.replace('_', ' ')}
          </div>
        </div>
        <div>
          <div className="text-muted">Staff Required</div>
          <div className="font-medium text-primary">{addon.staffRequired}</div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <span className="text-muted">Setup: {addon.setupTime}min</span>
        <span className="text-muted">Teardown: {addon.teardownTime}min</span>
        {addon.powerRequired && <span className="text-yellow-600">⚡ Power</span>}
        {addon.audioRequired && <span className="text-blue-600">🔊 Audio</span>}
      </div>
    </div>
  );
};

const TableForm: React.FC<{
  table?: CaptainTable;
  onSave: (tableData: TableFormData) => void;
  onCancel: () => void;
}> = ({ table, onSave, onCancel }) => {
  const [formData, setFormData] = useState<TableFormData>({
    number: table?.number || 1,
    label: table?.label || '',
    shape: table?.shape || 'round',
    maxCapacity: table?.maxCapacity || 8,
    currentCapacity: table?.currentCapacity || 8,
    x: table?.x || 100,
    y: table?.y || 100,
    section: table?.section || '',
    accessibilityFriendly: table?.accessibilityFriendly || false,
    viewQuality: table?.viewQuality || 'good',
    noiseLevel: table?.noiseLevel || 'moderate'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel-elevated p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-primary mb-6">
          {table ? 'Edit' : 'Add'} Table
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Table Number *
              </label>
              <input
                type="number"
                min="1"
                value={formData.number}
                onChange={(e) => setFormData(prev => ({ ...prev, number: parseInt(e.target.value) }))}
                className="w-full p-3 border border-default rounded-lg bg-panel text-primary focus:ring-2 focus:ring-accent focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Label *
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Table 1"
                className="w-full p-3 border border-default rounded-lg bg-panel text-primary focus:ring-2 focus:ring-accent focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Shape
              </label>
              <select
                value={formData.shape}
                onChange={(e) => setFormData(prev => ({ ...prev, shape: e.target.value as TableShape }))}
                className="w-full p-3 border border-default rounded-lg bg-panel text-primary focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                <option value="round">Round</option>
                <option value="square">Square</option>
                <option value="rectangle">Rectangle</option>
                <option value="head">Head Table</option>
                <option value="king">King Table</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Section
              </label>
              <input
                type="text"
                value={formData.section}
                onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value }))}
                placeholder="A, B, VIP, etc."
                className="w-full p-3 border border-default rounded-lg bg-panel text-primary focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Maximum Capacity
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.maxCapacity}
                onChange={(e) => setFormData(prev => ({ ...prev, maxCapacity: parseInt(e.target.value) }))}
                className="w-full p-3 border border-default rounded-lg bg-panel text-primary focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Current Setup
              </label>
              <input
                type="number"
                min="1"
                max={formData.maxCapacity}
                value={formData.currentCapacity}
                onChange={(e) => setFormData(prev => ({ ...prev, currentCapacity: parseInt(e.target.value) }))}
                className="w-full p-3 border border-default rounded-lg bg-panel text-primary focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                View Quality
              </label>
              <select
                value={formData.viewQuality}
                onChange={(e) => setFormData(prev => ({ ...prev, viewQuality: e.target.value as any }))}
                className="w-full p-3 border border-default rounded-lg bg-panel text-primary focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Noise Level
              </label>
              <select
                value={formData.noiseLevel}
                onChange={(e) => setFormData(prev => ({ ...prev, noiseLevel: e.target.value as any }))}
                className="w-full p-3 border border-default rounded-lg bg-panel text-primary focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                <option value="quiet">Quiet</option>
                <option value="moderate">Moderate</option>
                <option value="loud">Loud</option>
              </select>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.accessibilityFriendly}
                onChange={(e) => setFormData(prev => ({ ...prev, accessibilityFriendly: e.target.checked }))}
                className="rounded border-default text-accent focus:ring-accent"
              />
              <span className="text-sm text-primary">Accessibility Friendly</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-accent text-white py-3 px-6 rounded-lg font-medium hover:bg-accent/90 transition-colors"
            >
              {table ? 'Update' : 'Add'} Table
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-panel border border-default text-primary py-3 px-6 rounded-lg font-medium hover:bg-muted/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const SectionPlannerPanel: React.FC<{
  eventId?: string;
}> = ({ eventId }) => {
  const {
    captains,
    tables,
    floorAddons,
    addTable,
    updateTable,
    removeTable,
    assignTableToCaptain,
    addFloorAddon,
    updateFloorAddon,
    removeFloorAddon
  } = useCaptainStore();

  const [showTableForm, setShowTableForm] = useState(false);
  const [editingTable, setEditingTable] = useState<CaptainTable | null>(null);
  const [showAddonForm, setShowAddonForm] = useState(false);
  const [editingAddon, setEditingAddon] = useState<FloorAddon | null>(null);

  // Calculate summary stats
  const totalTables = tables.length;
  const assignedTables = tables.filter(t => t.captainId).length;
  const totalCapacity = tables.reduce((sum, t) => sum + t.currentCapacity, 0);
  const capacityReduction = floorAddons.reduce((sum, a) => sum + Math.abs(Math.min(0, a.capacityImpact)), 0);

  const handleSaveTable = useCallback((tableData: TableFormData) => {
    if (editingTable) {
      updateTable(editingTable.id, {
        ...tableData,
        firingPriority: editingTable.firingPriority,
        setupStatus: editingTable.setupStatus,
        serviceStatus: editingTable.serviceStatus,
        complexity: editingTable.complexity,
        proximityToKitchen: editingTable.proximityToKitchen,
        proximityToBar: editingTable.proximityToBar,
        seats: editingTable.seats
      });
    } else {
      const newTable: CaptainTable = {
        id: `t-${Date.now()}`,
        ...tableData,
        seats: Array.from({ length: tableData.currentCapacity }, (_, i) => ({
          seatNo: i + 1,
          allergens: [],
          dietaryRestrictions: [],
          rsvpStatus: 'confirmed'
        })),
        firingPriority: totalTables + 1,
        setupStatus: 'not_started',
        serviceStatus: 'waiting',
        complexity: 'low',
        proximityToKitchen: 5,
        proximityToBar: 5
      };
      addTable(newTable);
    }
    setShowTableForm(false);
    setEditingTable(null);
  }, [editingTable, totalTables, updateTable, addTable]);

  const handleDeleteTable = useCallback((tableId: string) => {
    if (confirm('Are you sure you want to delete this table?')) {
      removeTable(tableId);
    }
  }, [removeTable]);

  const handleDeleteAddon = useCallback((addonId: string) => {
    if (confirm('Are you sure you want to delete this floor addon?')) {
      removeFloorAddon(addonId);
    }
  }, [removeFloorAddon]);

  const toolbarRight = (
    <div className="flex gap-2">
      <button
        onClick={() => setShowTableForm(true)}
        className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
      >
        + Add Table
      </button>
      <button
        onClick={() => setShowAddonForm(true)}
        className="px-3 py-1.5 bg-panel border border-default rounded-lg text-sm font-medium hover:bg-muted/10 transition-colors"
      >
        + Add Floor Addon
      </button>
    </div>
  );

  return (
    <>
      <PanelShell title="Captain Sections & Layout" toolbarRight={toolbarRight}>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-4 text-center">
              <div className="text-sm text-muted">Total Tables</div>
              <div className="text-2xl font-bold text-primary">{totalTables}</div>
            </div>
            <div className="glass-panel p-4 text-center">
              <div className="text-sm text-muted">Assigned</div>
              <div className="text-2xl font-bold text-accent">{assignedTables}</div>
              <div className="text-xs text-muted">{((assignedTables / totalTables) * 100).toFixed(0)}%</div>
            </div>
            <div className="glass-panel p-4 text-center">
              <div className="text-sm text-muted">Total Capacity</div>
              <div className="text-2xl font-bold text-ok">{totalCapacity}</div>
            </div>
            <div className="glass-panel p-4 text-center">
              <div className="text-sm text-muted">Capacity Lost</div>
              <div className="text-2xl font-bold text-err">-{capacityReduction}</div>
              <div className="text-xs text-muted">to floor addons</div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Tables Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-accent">Tables</h3>
              {tables.length === 0 ? (
                <div className="glass-panel p-8 text-center">
                  <div className="text-muted">No tables added yet</div>
                  <button
                    onClick={() => setShowTableForm(true)}
                    className="mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
                  >
                    Add Your First Table
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {tables.map(table => (
                    <TableCard
                      key={table.id}
                      table={table}
                      captains={captains}
                      onAssign={assignTableToCaptain}
                      onEdit={(table) => {
                        setEditingTable(table);
                        setShowTableForm(true);
                      }}
                      onDelete={handleDeleteTable}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Floor Addons Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-accent">Floor Add-ons</h3>
              {floorAddons.length === 0 ? (
                <div className="glass-panel p-8 text-center">
                  <div className="text-muted">No floor add-ons configured</div>
                  <div className="text-xs text-muted mt-2">
                    Add dance floors, photo booths, DJ setups, etc.
                  </div>
                  <button
                    onClick={() => setShowAddonForm(true)}
                    className="mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
                  >
                    Add Floor Addon
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {floorAddons.map(addon => (
                    <AddonCard
                      key={addon.id}
                      addon={addon}
                      onEdit={(addon) => {
                        setEditingAddon(addon);
                        setShowAddonForm(true);
                      }}
                      onDelete={handleDeleteAddon}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Captain Load Summary */}
          <div className="glass-panel p-4">
            <h4 className="font-semibold text-accent mb-3">Captain Workload Distribution</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {captains.map(captain => {
                const load = (captain.tableIds.length / captain.maxTables) * 100;
                const loadColor = load > 90 ? 'text-err' : load > 70 ? 'text-warn' : 'text-ok';
                
                return (
                  <div key={captain.id} className="flex justify-between items-center p-3 bg-panel rounded-lg border border-default">
                    <div>
                      <div className="font-medium text-primary">{captain.name}</div>
                      <div className="text-xs text-muted">{captain.level} • {captain.specialties.join(', ')}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${loadColor}`}>{load.toFixed(0)}%</div>
                      <div className="text-xs text-muted">{captain.tableIds.length}/{captain.maxTables}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </PanelShell>

      {/* Table Form Modal */}
      {showTableForm && (
        <TableForm
          table={editingTable || undefined}
          onSave={handleSaveTable}
          onCancel={() => {
            setShowTableForm(false);
            setEditingTable(null);
          }}
        />
      )}
    </>
  );
};

export default SectionPlannerPanel;
