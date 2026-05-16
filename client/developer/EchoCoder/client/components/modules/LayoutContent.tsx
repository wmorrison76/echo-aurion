import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit2,
  Trash2,
  Grid2x2,
  Users,
  MapPin,
  BarChart3,
} from "lucide-react";

interface Table {
  id: string;
  number: number;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "cleaning";
  x: number;
  y: number;
  groupName?: string;
  checkInTime?: string;
}

interface Section {
  id: string;
  name: string;
  capacity: number;
  tables: number;
}

const defaultTables: Table[] = [
  { id: "1", number: 1, capacity: 2, status: "available", x: 50, y: 50 },
  {
    id: "2",
    number: 2,
    capacity: 2,
    status: "occupied",
    x: 150,
    y: 50,
    groupName: "Johnson",
    checkInTime: "6:30 PM",
  },
  { id: "3", number: 3, capacity: 4, status: "available", x: 250, y: 50 },
  { id: "4", number: 4, capacity: 4, status: "reserved", x: 350, y: 50 },
  {
    id: "5",
    number: 5,
    capacity: 6,
    status: "occupied",
    x: 50,
    y: 150,
    groupName: "Smith",
    checkInTime: "6:45 PM",
  },
  { id: "6", number: 6, capacity: 6, status: "available", x: 150, y: 150 },
  { id: "7", number: 7, capacity: 8, status: "cleaning", x: 250, y: 150 },
  {
    id: "8",
    number: 8,
    capacity: 8,
    status: "occupied",
    x: 350,
    y: 150,
    groupName: "Williams",
    checkInTime: "7:00 PM",
  },
  { id: "9", number: 9, capacity: 4, status: "available", x: 50, y: 250 },
  { id: "10", number: 10, capacity: 4, status: "reserved", x: 150, y: 250 },
];

const sections: Section[] = [
  { id: "1", name: "Main Dining", capacity: 40, tables: 8 },
  { id: "2", name: "Bar Area", capacity: 20, tables: 4 },
  { id: "3", name: "Patio", capacity: 30, tables: 5 },
];

export default function LayoutContent() {
  const [tables, setTables] = useState<Table[]>(defaultTables);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [scale, setScale] = useState(1);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      available: "bg-green-500/20 text-green-700 dark:text-green-400",
      occupied: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
      reserved: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
      cleaning: "bg-gray-500/20 text-gray-700 dark:text-gray-400",
    };
    return colors[status] || colors.available;
  };

  const getTableColor = (status: string) => {
    const colors: Record<string, string> = {
      available: "#10b981",
      occupied: "#f97316",
      reserved: "#3b82f6",
      cleaning: "#6b7280",
    };
    return colors[status] || "#10b981";
  };

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
  };

  const handleStatusChange = (tableId: string, newStatus: Table["status"]) => {
    setTables(
      tables.map((t) => (t.id === tableId ? { ...t, status: newStatus } : t)),
    );

    if (selectedTable?.id === tableId) {
      setSelectedTable({ ...selectedTable, status: newStatus });
    }
  };

  const occupiedCount = tables.filter((t) => t.status === "occupied").length;
  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
  const occupiedCapacity = tables
    .filter((t) => t.status === "occupied")
    .reduce((sum, t) => sum + t.capacity, 0);

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      {/* Seating Chart */}
      <div className="col-span-2 flex flex-col gap-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Occupied</p>
              <p className="text-2xl font-bold">{occupiedCount}</p>
              <p className="text-xs text-muted-foreground">
                of {tables.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Available</p>
              <p className="text-2xl font-bold">
                {tables.filter((t) => t.status === "available").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Capacity Used</p>
              <p className="text-2xl font-bold">
                {Math.round((occupiedCapacity / totalCapacity) * 100)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Guests</p>
              <p className="text-2xl font-bold">{occupiedCapacity}</p>
              <p className="text-xs text-muted-foreground">
                of {totalCapacity}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Seating Chart Canvas */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Grid2x2 className="h-4 w-4" />
              Venue Layout
            </CardTitle>
            <div className="flex gap-2 items-center">
              <label className="text-xs">Zoom:</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-24"
              />
              <span className="text-xs font-semibold">
                {Math.round(scale * 100)}%
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg border">
            <svg
              width={`${500 * scale}px`}
              height={`${400 * scale}px`}
              viewBox="0 0 500 400"
              className="min-w-full min-h-full"
            >
              {/* Background */}
              <rect width="500" height="400" fill="white" opacity="0.1" />

              {/* Grid */}
              <g stroke="#333" strokeWidth="1" opacity="0.1">
                {[...Array(10)].map((_, i) => (
                  <line
                    key={`v-${i}`}
                    x1={i * 50}
                    y1="0"
                    x2={i * 50}
                    y2="400"
                  />
                ))}
                {[...Array(8)].map((_, i) => (
                  <line
                    key={`h-${i}`}
                    x1="0"
                    y1={i * 50}
                    x2="500"
                    y2={i * 50}
                  />
                ))}
              </g>

              {/* Tables */}
              {tables.map((table) => (
                <g
                  key={table.id}
                  onClick={() => handleTableClick(table)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Table Circle */}
                  <circle
                    cx={table.x}
                    cy={table.y}
                    r={20}
                    fill={getTableColor(table.status)}
                    stroke={selectedTable?.id === table.id ? "#fff" : "#333"}
                    strokeWidth={selectedTable?.id === table.id ? 3 : 2}
                    opacity="0.8"
                  />

                  {/* Table Number */}
                  <text
                    x={table.x}
                    y={table.y}
                    textAnchor="middle"
                    dy="0.3em"
                    fill="white"
                    fontSize="14"
                    fontWeight="bold"
                  >
                    {table.number}
                  </text>

                  {/* Capacity Badge */}
                  <text
                    x={table.x}
                    y={table.y + 30}
                    textAnchor="middle"
                    fill="#666"
                    fontSize="10"
                    fontWeight="600"
                  >
                    {table.capacity} seats
                  </text>
                </g>
              ))}
            </svg>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: "#10b981" }}
            />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: "#f97316" }}
            />
            <span>Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: "#3b82f6" }}
            />
            <span>Reserved</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: "#6b7280" }}
            />
            <span>Cleaning</span>
          </div>
        </div>
      </div>

      {/* Details Panel */}
      <div className="col-span-1 flex flex-col gap-4">
        {/* Sections */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Sections
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sections.map((section) => (
              <div
                key={section.id}
                className="p-3 bg-slate-50 dark:bg-slate-900 rounded border"
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="font-semibold text-sm">{section.name}</p>
                  <Badge variant="outline">{section.tables} tables</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Capacity: {section.capacity}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Table Details */}
        {selectedTable ? (
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">
                Table {selectedTable.number}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <select
                  value={selectedTable.status}
                  onChange={(e) =>
                    handleStatusChange(
                      selectedTable.id,
                      e.target.value as Table["status"],
                    )
                  }
                  className="w-full border rounded px-2 py-2 text-sm font-semibold"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                  <option value="cleaning">Cleaning</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded border">
                  <p className="text-xs text-muted-foreground">Capacity</p>
                  <p className="text-2xl font-bold">{selectedTable.capacity}</p>
                  <p className="text-xs">seats</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded border">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-semibold">
                    ({selectedTable.x}, {selectedTable.y})
                  </p>
                </div>
              </div>

              {selectedTable.status === "occupied" &&
                selectedTable.groupName && (
                  <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded border border-orange-200 dark:border-orange-800">
                    <p className="text-xs text-muted-foreground mb-1">Guest</p>
                    <p className="font-semibold text-sm">
                      {selectedTable.groupName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Checked in: {selectedTable.checkInTime}
                    </p>
                  </div>
                )}

              {selectedTable.status === "reserved" && (
                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    This table is reserved for today
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 gap-2">
                  <Edit2 className="h-4 w-4" /> Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 gap-2"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex-1 flex items-center justify-center">
            <CardContent>
              <p className="text-muted-foreground text-center">
                Select a table to view details
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
