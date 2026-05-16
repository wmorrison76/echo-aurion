import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Download, Plus, BarChart3 } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";

interface MenuItemWithSales {
  id: string;
  name: string;
  quantity: number;
  cost: number;
  totalSales: number;
  components: string[];
}

interface InventoryLevel {
  id: string;
  name: string;
  onHand: number;
  par: number;
  unit: string;
  status: "critical" | "low" | "adequate" | "high";
}

interface ProductionTask {
  id: string;
  title: string;
  components: string[];
  quantity: number;
  dueTime: string;
  status: "pending" | "in-progress" | "completed";
  assignee?: string;
}

export interface ProductionMultiViewProps {
  selectedMenu?: MenuItemWithSales[];
  salesData?: { date: string; items: MenuItemWithSales[] }[];
  inventoryLevels?: InventoryLevel[];
  productionTasks?: ProductionTask[];
  onGenerateSheets?: (items: MenuItemWithSales[]) => void;
  onCreateOrder?: (items: MenuItemWithSales[]) => void;
}

const getInventoryStatus = (onHand: number, par: number) => {
  const ratio = onHand / par;
  if (ratio === 0) return "critical";
  if (ratio < 0.5) return "low";
  if (ratio < 1) return "adequate";
  return "high";
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "critical":
      return "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-300";
    case "low":
      return "bg-orange-100 text-orange-800 dark:bg-orange-950/30 dark:text-orange-300";
    case "adequate":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300";
    case "high":
      return "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-300";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getTaskStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-300";
    case "in-progress":
      return "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300";
    case "pending":
      return "bg-gray-100 text-gray-800 dark:bg-gray-950/30 dark:text-gray-300";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const ProductionMultiView: React.FC<ProductionMultiViewProps> = ({
  selectedMenu = [],
  salesData = [],
  inventoryLevels = [],
  productionTasks = [],
  onGenerateSheets,
  onCreateOrder,
}) => {
  const [viewMode, setViewMode] = useState<"split" | "tabs">("split");

  const totalMenuItems = useMemo(() => selectedMenu.reduce((sum, item) => sum + item.quantity, 0), [selectedMenu]);
  const totalMenuCost = useMemo(() => selectedMenu.reduce((sum, item) => sum + item.cost * item.quantity, 0), [selectedMenu]);
  const totalMenuRevenue = useMemo(() => selectedMenu.reduce((sum, item) => sum + item.totalSales, 0), [selectedMenu]);

  const criticalInventory = useMemo(
    () => inventoryLevels.filter((item) => item.status === "critical"),
    [inventoryLevels],
  );

  const completedTasks = useMemo(
    () => productionTasks.filter((task) => task.status === "completed").length,
    [productionTasks],
  );

  return (
    <div className="w-full space-y-4">
      {/* Header with KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Menu Items</div>
            <div className="text-2xl font-bold">{totalMenuItems}</div>
            <div className="text-xs text-muted-foreground mt-1">{selectedMenu.length} recipes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Cost</div>
            <div className="text-2xl font-bold">${totalMenuCost.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">per unit</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Revenue</div>
            <div className="text-2xl font-bold">${totalMenuRevenue.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">total sales</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Alerts</div>
            <div className="text-2xl font-bold text-red-600">{criticalInventory.length}</div>
            <div className="text-xs text-muted-foreground mt-1">critical inventory</div>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Selector */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === "split" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("split")}
        >
          Split View
        </Button>
        <Button variant={viewMode === "tabs" ? "default" : "outline"} size="sm" onClick={() => setViewMode("tabs")}>
          Tabbed View
        </Button>
      </div>

      {/* Split View Mode */}
      {viewMode === "split" && (
        <div className="grid grid-cols-3 gap-4">
          {/* Menu & Sales (Left) */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Menu Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {selectedMenu.length === 0 ? (
                <p className="text-sm text-muted-foreground">No menu items selected</p>
              ) : (
                selectedMenu.map((item) => (
                  <div key={item.id} className="flex items-start justify-between p-2 rounded hover:bg-muted/50">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} × ${item.cost.toFixed(2)}
                      </p>
                    </div>
                    <Badge variant="outline">{item.quantity}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Production Tasks (Center) */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-base">
                Production ({completedTasks}/{productionTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {productionTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks created</p>
              ) : (
                productionTasks.map((task) => (
                  <div key={task.id} className="flex items-start justify-between p-2 rounded hover:bg-muted/50">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Due: {task.dueTime}
                      </p>
                    </div>
                    <Badge className={getTaskStatusColor(task.status)}>{task.status}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Inventory (Right) */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Inventory Levels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {inventoryLevels.length === 0 ? (
                <p className="text-sm text-muted-foreground">No inventory data</p>
              ) : (
                inventoryLevels.map((item) => (
                  <div key={item.id} className="flex items-start justify-between p-2 rounded hover:bg-muted/50">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.onHand} / {item.par} {item.unit}
                      </p>
                    </div>
                    <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabbed View Mode */}
      {viewMode === "tabs" && (
        <Tabs defaultValue="menu" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>

          <TabsContent value="menu" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Menu Items & Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedMenu.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No menu items selected</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="px-3 py-2 text-left font-semibold">Item</th>
                              <th className="px-3 py-2 text-right font-semibold">Qty</th>
                              <th className="px-3 py-2 text-right font-semibold">Cost</th>
                              <th className="px-3 py-2 text-right font-semibold">Sales</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedMenu.map((item) => (
                              <tr key={item.id} className="border-b hover:bg-muted/50">
                                <td className="px-3 py-2">{item.name}</td>
                                <td className="px-3 py-2 text-right">{item.quantity}</td>
                                <td className="px-3 py-2 text-right">${(item.cost * item.quantity).toFixed(2)}</td>
                                <td className="px-3 py-2 text-right font-semibold">${item.totalSales.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="pt-4 border-t space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Total Cost:</span>
                          <span className="font-semibold">${totalMenuCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Revenue:</span>
                          <span className="font-semibold text-green-600">${totalMenuRevenue.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="production" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Production Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {productionTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No production tasks</p>
                  ) : (
                    productionTasks.map((task) => (
                      <div key={task.id} className="flex items-start justify-between p-3 rounded border hover:bg-muted/50">
                        <div className="flex-1">
                          <p className="font-medium">{task.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {task.components.join(", ")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Due: {task.dueTime}
                          </p>
                        </div>
                        <Badge className={getTaskStatusColor(task.status)}>{task.status}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {inventoryLevels.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No inventory data</p>
                  ) : (
                    inventoryLevels.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded border hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${Math.min((item.onHand / item.par) * 100, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.onHand} / {item.par} {item.unit}
                          </p>
                        </div>
                        <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <Button onClick={() => onGenerateSheets?.(selectedMenu)} className="gap-2">
          <Download className="h-4 w-4" />
          Generate Production Sheets
        </Button>
        <Button variant="outline" onClick={() => onCreateOrder?.(selectedMenu)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Purchase Order
        </Button>
      </div>
    </div>
  );
};

export default ProductionMultiView;
