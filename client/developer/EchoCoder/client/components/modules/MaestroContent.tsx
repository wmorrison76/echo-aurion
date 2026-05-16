import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Clock, Users, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Station {
  id: string;
  name: string;
  type: string;
  chef: string;
  status: "ready" | "preparing" | "busy" | "maintenance";
  activeOrders: number;
  equipment: string[];
  safetyChecks: boolean;
  lastMaintenance: string;
}

interface KitchenTask {
  id: string;
  title: string;
  station: string;
  priority: "urgent" | "high" | "normal" | "low";
  status: "pending" | "in-progress" | "completed";
  timeEstimate: number;
  assignedTo: string;
}

const defaultStations: Station[] = [
  {
    id: "1",
    name: "Main Grill",
    type: "Hot Station",
    chef: "James Wilson",
    status: "busy",
    activeOrders: 8,
    equipment: ["Gas Grill", "Flat Top", "Broiler"],
    safetyChecks: true,
    lastMaintenance: "2025-01-10",
  },
  {
    id: "2",
    name: "Prep Station",
    type: "Cold Station",
    chef: "Lisa Chen",
    status: "preparing",
    activeOrders: 12,
    equipment: ["Cutting Board", "Knife Sharpener", "Slicer"],
    safetyChecks: true,
    lastMaintenance: "2025-01-12",
  },
  {
    id: "3",
    name: "Sauces & Sides",
    type: "Hot Station",
    chef: "Robert Lee",
    status: "ready",
    activeOrders: 5,
    equipment: ["Stock Pots", "Saucepans", "Immersion Blender"],
    safetyChecks: true,
    lastMaintenance: "2025-01-09",
  },
  {
    id: "4",
    name: "Plating",
    type: "Assembly",
    chef: "Maria Santos",
    status: "busy",
    activeOrders: 15,
    equipment: ["Plating Spoons", "Tweezers", "Squeeze Bottles"],
    safetyChecks: true,
    lastMaintenance: "2025-01-13",
  },
  {
    id: "5",
    name: "Pastry Lab",
    type: "Specialized",
    chef: "Anna Johnson",
    status: "preparing",
    activeOrders: 3,
    equipment: ["Oven", "Mixer", "Work Surface"],
    safetyChecks: true,
    lastMaintenance: "2025-01-11",
  },
];

const defaultTasks: KitchenTask[] = [
  {
    id: "1",
    title: "Calibrate oven temperature",
    station: "Main Grill",
    priority: "urgent",
    status: "pending",
    timeEstimate: 30,
    assignedTo: "James Wilson",
  },
  {
    id: "2",
    title: "Restock prep mise en place",
    station: "Prep Station",
    priority: "high",
    status: "in-progress",
    timeEstimate: 45,
    assignedTo: "Lisa Chen",
  },
  {
    id: "3",
    title: "Safety inspection - Fire extinguishers",
    station: "All Stations",
    priority: "high",
    status: "pending",
    timeEstimate: 60,
    assignedTo: "Chef Marco",
  },
  {
    id: "4",
    title: "Clean ventilation hood filters",
    station: "Main Grill",
    priority: "normal",
    status: "completed",
    timeEstimate: 90,
    assignedTo: "Robert Lee",
  },
];

export default function MaestroContent() {
  const [stations, setStations] = useState<Station[]>(defaultStations);
  const [tasks, setTasks] = useState<KitchenTask[]>(defaultTasks);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "ready" | "busy">(
    "all",
  );

  const filteredStations = stations.filter(
    (s) => filterStatus === "all" || s.status === filterStatus,
  );

  const getStatusColor = (status: string) => {
    const colors = {
      ready: "bg-green-500/20 text-green-700 dark:text-green-400",
      preparing: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
      busy: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
      maintenance: "bg-red-500/20 text-red-700 dark:text-red-400",
    };
    return colors[status as keyof typeof colors] || colors.ready;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: "bg-red-500/20 text-red-700 dark:text-red-400",
      high: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
      normal: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
      low: "bg-gray-500/20 text-gray-700 dark:text-gray-400",
    };
    return colors[priority as keyof typeof colors] || colors.normal;
  };

  const updateTaskStatus = (
    taskId: string,
    newStatus: KitchenTask["status"],
  ) => {
    setTasks(
      tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );
  };

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {/* Stations */}
      <div className="col-span-1 flex flex-col gap-4">
        <div className="flex gap-2">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("all")}
          >
            All
          </Button>
          <Button
            variant={filterStatus === "ready" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("ready")}
          >
            Ready
          </Button>
          <Button
            variant={filterStatus === "busy" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("busy")}
          >
            Active
          </Button>
        </div>

        <div className="overflow-y-auto space-y-2 flex-1">
          {filteredStations.map((station) => (
            <Card
              key={station.id}
              className={`cursor-pointer transition-colors ${
                selectedStation?.id === station.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
              onClick={() => setSelectedStation(station)}
            >
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold">{station.name}</p>
                    <Badge
                      className={getStatusColor(station.status)}
                      variant="secondary"
                    >
                      {station.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {station.type}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-3 w-3" />
                    <span>{station.chef}</span>
                    <Flame className="h-3 w-3 ml-2" />
                    <span>{station.activeOrders} orders</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Station Details & Tasks */}
      <div className="col-span-1 flex flex-col gap-4">
        {selectedStation ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{selectedStation.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Chef</p>
                    <p className="font-semibold">{selectedStation.chef}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(selectedStation.status)}>
                      {selectedStation.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Active Orders
                    </p>
                    <p className="text-2xl font-bold">
                      {selectedStation.activeOrders}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Last Maintenance
                    </p>
                    <p className="font-semibold text-sm">
                      {selectedStation.lastMaintenance}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="font-semibold text-sm mb-2">Equipment</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedStation.equipment.map((eq, idx) => (
                      <Badge key={idx} variant="outline">
                        {eq}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm">Safety checks: Passed</span>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="flex items-center justify-center h-1/3">
            <CardContent>
              <p className="text-muted-foreground">
                Select a station to view details
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tasks */}
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">Kitchen Tasks</CardTitle>
          </CardHeader>
          <CardContent className="overflow-y-auto flex-1">
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 bg-slate-50 dark:bg-slate-900 rounded border flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {task.station}
                      </p>
                    </div>
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="h-3 w-3" />
                    <span>{task.timeEstimate} min</span>
                    <span className="text-muted-foreground">
                      • {task.assignedTo}
                    </span>
                  </div>

                  <select
                    value={task.status}
                    onChange={(e) =>
                      updateTaskStatus(
                        task.id,
                        e.target.value as KitchenTask["status"],
                      )
                    }
                    className="text-xs border rounded px-2 py-1"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
