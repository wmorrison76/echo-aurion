import React, { useState, useRef, useCallback } from 'react';
import { useEventStore, Table, Guest } from '../../stores/eventStore';
import { PanelShell } from '../../builder/maestro-banquets.builder-seed';

interface DragState {
  isDragging: boolean;
  draggedTable: Table | null;
  offset: { x: number; y: number };
}

const TableComponent: React.FC<{
  table: Table;
  guests: Guest[];
  isSelected: boolean;
  onSelect: () => void;
  onDrag: (table: Table, newPosition: { x: number; y: number }) => void;
}> = ({ table, guests, isSelected, onSelect, onDrag }) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedTable: null,
    offset: { x: 0, y: 0 }
  });

  const tableRef = useRef<HTMLDivElement>(null);
  const assignedGuests = guests.filter(g => g.tableId === table.id);
  const remainingSeats = table.seats - assignedGuests.length;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!tableRef.current) return;

    const rect = tableRef.current.getBoundingClientRect();
    const offset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    setDragState({
      isDragging: true,
      draggedTable: table,
      offset
    });

    onSelect();
  }, [table, onSelect]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !tableRef.current?.parentElement) return;

    const containerRect = tableRef.current.parentElement.getBoundingClientRect();
    const newX = Math.max(0, Math.min(
      containerRect.width - 80,
      e.clientX - containerRect.left - dragState.offset.x
    ));
    const newY = Math.max(0, Math.min(
      containerRect.height - 80,
      e.clientY - containerRect.top - dragState.offset.y
    ));

    onDrag(table, { x: newX, y: newY });
  }, [dragState, table, onDrag]);

  const handleMouseUp = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedTable: null,
      offset: { x: 0, y: 0 }
    });
  }, []);

  React.useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  const tableStyle = {
    left: `${table.x}px`,
    top: `${table.y}px`,
    width: table.shape === 'round' ? '80px' : '120px',
    height: table.shape === 'round' ? '80px' : '60px'
  };

  return (
    <div
      ref={tableRef}
      className={`absolute cursor-move transition-all duration-200 ${
        isSelected ? 'z-10 scale-110' : 'z-0'
      } ${dragState.isDragging ? 'opacity-75' : 'opacity-100'}`}
      style={tableStyle}
      onMouseDown={handleMouseDown}
    >
      <div
        className={`w-full h-full rounded-lg border-2 flex flex-col items-center justify-center text-xs font-semibold transition-colors ${
          table.shape === 'round' ? 'rounded-full' : 'rounded-lg'
        } ${
          table.vipTable
            ? 'bg-yellow-100 border-yellow-400 text-yellow-800'
            : table.assigned
            ? 'bg-green-100 border-green-400 text-green-800'
            : 'bg-gray-100 border-gray-400 text-gray-600'
        } ${
          isSelected ? 'ring-2 ring-accent shadow-lg' : ''
        }`}
      >
        <div className="font-bold">T{table.number}</div>
        <div className="text-[10px]">
          {assignedGuests.length}/{table.seats}
        </div>
        {table.vipTable && <div className="text-[8px]">VIP</div>}
      </div>
      
      {/* Hover tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 hover:opacity-100 transition-opacity bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none">
        Table {table.number} • {table.seats} seats • {remainingSeats} available
        {assignedGuests.length > 0 && (
          <div className="text-[10px] mt-1">
            {assignedGuests.map(g => g.name).join(', ')}
          </div>
        )}
      </div>
    </div>
  );
};

const GuestList: React.FC<{
  guests: Guest[];
  tables: Table[];
  onAssignGuest: (guestId: string, tableId: string) => void;
}> = ({ guests, tables, onAssignGuest }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssigned, setFilterAssigned] = useState<'all' | 'assigned' | 'unassigned'>('all');

  const filteredGuests = guests.filter(guest => {
    const matchesSearch = guest.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filterAssigned === 'all' ||
      (filterAssigned === 'assigned' && guest.tableId) ||
      (filterAssigned === 'unassigned' && !guest.tableId);
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search guests..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 p-2 border border-default rounded-lg bg-panel text-primary text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
        />
        <select
          value={filterAssigned}
          onChange={(e) => setFilterAssigned(e.target.value as any)}
          className="p-2 border border-default rounded-lg bg-panel text-primary text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
        >
          <option value="all">All Guests</option>
          <option value="assigned">Assigned</option>
          <option value="unassigned">Unassigned</option>
        </select>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2">
        {filteredGuests.map((guest) => {
          const assignedTable = guest.tableId ? tables.find(t => t.id === guest.tableId) : null;
          
          return (
            <div
              key={guest.id}
              className={`glass-panel p-3 flex justify-between items-center ${
                guest.isVip ? 'border-l-4 border-yellow-400' : ''
              }`}
            >
              <div>
                <div className="font-medium text-primary flex items-center gap-2">
                  {guest.name}
                  {guest.isVip && <span className="text-yellow-500">👑</span>}
                </div>
                {guest.dietaryRestrictions.length > 0 && (
                  <div className="text-xs text-muted">
                    {guest.dietaryRestrictions.join(', ')}
                  </div>
                )}
                {assignedTable && (
                  <div className="text-xs text-accent">
                    Table {assignedTable.number}
                  </div>
                )}
              </div>
              
              <div className="flex gap-1">
                <select
                  value={guest.tableId || ''}
                  onChange={(e) => onAssignGuest(guest.id, e.target.value)}
                  className="text-xs p-1 border border-default rounded bg-panel text-primary focus:ring-1 focus:ring-accent"
                >
                  <option value="">Unassigned</option>
                  {tables.map((table) => {
                    const currentGuests = guests.filter(g => g.tableId === table.id).length;
                    const available = table.seats - currentGuests;
                    const canAssign = available > 0 || guest.tableId === table.id;
                    
                    return (
                      <option 
                        key={table.id} 
                        value={table.id}
                        disabled={!canAssign}
                      >
                        T{table.number} ({available} left)
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const SeatingPlannerPanel: React.FC<{
  eventId?: string;
  roomId?: string;
}> = ({ eventId, roomId }) => {
  const { currentEvent, updateTable, assignGuest } = useEventStore();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showGuestList, setShowGuestList] = useState(false);

  if (!currentEvent) {
    return (
      <PanelShell title="Seating Planner">
        <div className="text-center text-muted">No event selected</div>
      </PanelShell>
    );
  }

  const { tables } = currentEvent.seating;
  const { guests } = currentEvent;
  
  const assignedGuests = guests.filter(g => g.tableId).length;
  const totalCapacity = tables.reduce((sum, table) => sum + table.seats, 0);
  const utilizationRate = Math.round((assignedGuests / totalCapacity) * 100);

  const handleTableDrag = (table: Table, newPosition: { x: number; y: number }) => {
    updateTable(table.id, newPosition);
  };

  const addNewTable = () => {
    const newTableNumber = Math.max(...tables.map(t => t.number)) + 1;
    const newTable: Table = {
      id: `t-${Date.now()}`,
      number: newTableNumber,
      seats: 8,
      x: 50,
      y: 50,
      shape: 'round',
      assigned: false
    };
    
    // This would need to be added to the store
    // For now, we'll just show an alert
    alert('Add table functionality would be implemented here');
  };

  const toolbarRight = (
    <div className="flex gap-2">
      <button
        onClick={() => setShowGuestList(!showGuestList)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          showGuestList 
            ? 'bg-accent text-white' 
            : 'bg-panel border border-default text-primary hover:bg-muted/10'
        }`}
      >
        👥 Guests
      </button>
      <button
        onClick={addNewTable}
        className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
      >
        + Table
      </button>
    </div>
  );

  return (
    <PanelShell title="Seating Planner" toolbarRight={toolbarRight}>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-panel p-3 text-center">
            <div className="text-sm text-muted">Tables</div>
            <div className="text-xl font-bold text-primary">{tables.length}</div>
          </div>
          <div className="glass-panel p-3 text-center">
            <div className="text-sm text-muted">Capacity</div>
            <div className="text-xl font-bold text-primary">{totalCapacity}</div>
          </div>
          <div className="glass-panel p-3 text-center">
            <div className="text-sm text-muted">Assigned</div>
            <div className="text-xl font-bold text-accent">{assignedGuests}</div>
          </div>
          <div className="glass-panel p-3 text-center">
            <div className="text-sm text-muted">Utilization</div>
            <div className={`text-xl font-bold ${utilizationRate > 90 ? 'text-ok' : utilizationRate > 70 ? 'text-warn' : 'text-err'}`}>
              {utilizationRate}%
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Seating Layout */}
          <div className="flex-1">
            <h3 className="font-semibold text-accent mb-4">Room Layout</h3>
            <div 
              className="glass-panel relative bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-dashed border-blue-300"
              style={{ height: '400px', minHeight: '400px' }}
            >
              {/* Room boundaries indicator */}
              <div className="absolute inset-4 border border-blue-200 rounded-lg pointer-events-none">
                <div className="absolute top-2 left-2 text-xs text-blue-500">
                  {currentEvent.venue} - {currentEvent.seating.layout}
                </div>
              </div>

              {/* Tables */}
              {tables.map((table) => (
                <TableComponent
                  key={table.id}
                  table={table}
                  guests={guests}
                  isSelected={selectedTable === table.id}
                  onSelect={() => setSelectedTable(table.id)}
                  onDrag={handleTableDrag}
                />
              ))}

              {/* Instructions */}
              {tables.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-muted">
                    <div className="text-lg mb-2">No tables yet</div>
                    <div className="text-sm">Click "Add Table" to start planning</div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-4 flex items-center gap-4 text-sm text-muted">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded"></div>
                <span>Assigned</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-400 rounded"></div>
                <span>VIP Table</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-100 border-2 border-gray-400 rounded"></div>
                <span>Available</span>
              </div>
            </div>
          </div>

          {/* Guest List */}
          {showGuestList && (
            <div className="w-80">
              <h3 className="font-semibold text-accent mb-4">Guest Management</h3>
              <GuestList
                guests={guests}
                tables={tables}
                onAssignGuest={assignGuest}
              />
            </div>
          )}
        </div>
      </div>
    </PanelShell>
  );
};
