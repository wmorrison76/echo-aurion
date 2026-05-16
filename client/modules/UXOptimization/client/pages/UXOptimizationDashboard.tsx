import React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Zap,
  Keyboard,
  Settings,
  TrendingDown,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";

interface UXOptimizationPanelProps {
  onClose?: () => void;
  onMinimize?: () => void;
}

interface FlowStep {
  id: string;
  action: string;
  currentMethod: string;
  optimizedMethod?: string;
  canBatch: boolean;
  canShortcut: boolean;
}

interface UserFlow {
  id: string;
  name: string;
  description: string;
  currentClicks: number;
  optimizedClicks: number;
  steps: FlowStep[];
  status: "analyzed" | "optimized" | "implemented";
  savings: number;
}

interface BatchOperation {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  shortcut?: string;
  category: string;
}

interface KeyboardShortcut {
  id: string;
  action: string;
  shortcut: string;
  category: string;
  enabled: boolean;
}

function generateMockFlows(): UserFlow[] {
  return [
    {
      id: "flow-1",
      name: "Create BEO from CRM",
      description: "Create a new BEO from an existing CRM client",
      currentClicks: 12,
      optimizedClicks: 4,
      status: "optimized",
      savings: 67,
      steps: [
        {
          id: "step-1",
          action: "Navigate to CRM",
          currentMethod: "Click CRM menu → Search client",
          optimizedMethod: "Quick search from anywhere (Cmd+K)",
          canBatch: false,
          canShortcut: true,
        },
        {
          id: "step-2",
          action: "Select client",
          currentMethod: "Click client name",
          optimizedMethod: "Enter to select (keyboard)",
          canBatch: false,
          canShortcut: true,
        },
        {
          id: "step-3",
          action: "Create BEO",
          currentMethod: "Click Create BEO → Fill form → Save",
          optimizedMethod: "Cmd+B (pre-fills from client)",
          canBatch: false,
          canShortcut: true,
        },
      ],
    },
    {
      id: "flow-2",
      name: "Approve Multiple Orders",
      description: "Approve multiple purchase orders at once",
      currentClicks: 8,
      optimizedClicks: 3,
      status: "implemented",
      savings: 63,
      steps: [
        {
          id: "step-1",
          action: "Select orders",
          currentMethod: "Click each order checkbox",
          optimizedMethod: "Select all → Batch approve",
          canBatch: true,
          canShortcut: false,
        },
        {
          id: "step-2",
          action: "Approve",
          currentMethod: "Click approve on each",
          optimizedMethod: "Batch approve button",
          canBatch: true,
          canShortcut: false,
        },
      ],
    },
    {
      id: "flow-3",
      name: "Add Menu Items to BEO",
      description: "Add multiple menu items to a BEO",
      currentClicks: 15,
      optimizedClicks: 5,
      status: "analyzed",
      savings: 67,
      steps: [
        {
          id: "step-1",
          action: "Open menu",
          currentMethod: "Navigate to menu → Select category",
          optimizedMethod: "Quick menu search (Cmd+M)",
          canBatch: false,
          canShortcut: true,
        },
        {
          id: "step-2",
          action: "Add items",
          currentMethod: "Click each item → Add to BEO",
          optimizedMethod: "Multi-select → Batch add",
          canBatch: true,
          canShortcut: false,
        },
      ],
    },
  ];
}

function generateMockBatchOps(): BatchOperation[] {
  return [
    {
      id: "batch-1",
      name: "Batch Approve Orders",
      description: "Approve multiple purchase orders at once",
      enabled: true,
      category: "Purchasing",
    },
    {
      id: "batch-2",
      name: "Batch Update Menu Items",
      description: "Update prices or availability for multiple items",
      enabled: true,
      category: "Menu",
    },
    {
      id: "batch-3",
      name: "Batch Schedule Staff",
      description: "Assign multiple staff to shifts at once",
      enabled: false,
      category: "Scheduling",
    },
    {
      id: "batch-4",
      name: "Batch Export Reports",
      description: "Export multiple reports in one action",
      enabled: true,
      category: "Reports",
    },
  ];
}

function generateMockShortcuts(): KeyboardShortcut[] {
  return [
    {
      id: "shortcut-1",
      action: "Quick Search",
      shortcut: "Cmd+K",
      category: "Navigation",
      enabled: true,
    },
    {
      id: "shortcut-2",
      action: "Create BEO",
      shortcut: "Cmd+B",
      category: "BEO",
      enabled: true,
    },
    {
      id: "shortcut-3",
      action: "Open Menu",
      shortcut: "Cmd+M",
      category: "Menu",
      enabled: true,
    },
    {
      id: "shortcut-4",
      action: "Save",
      shortcut: "Cmd+S",
      category: "General",
      enabled: true,
    },
    {
      id: "shortcut-5",
      action: "Close Panel",
      shortcut: "Esc",
      category: "Navigation",
      enabled: true,
    },
    {
      id: "shortcut-6",
      action: "New Event",
      shortcut: "Cmd+N",
      category: "Events",
      enabled: false,
    },
  ];
}

export default function UXOptimizationDashboard(
  _props: UXOptimizationPanelProps,
) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState<
    "flows" | "batch" | "shortcuts" | "analytics"
  >("flows");
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);

  const [flows, setFlows] = React.useState<UserFlow[]>([]);
  const [batchOps, setBatchOps] = React.useState<BatchOperation[]>([]);
  const [shortcuts, setShortcuts] = React.useState<KeyboardShortcut[]>([]);

  const loadData = React.useCallback(() => {
    setFlows(generateMockFlows());
    setBatchOps(generateMockBatchOps());
    setShortcuts(generateMockShortcuts());
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAnalyzeFlow = React.useCallback(
    async (flowId: string) => {
      setIsAnalyzing(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setFlows((prev) =>
        prev.map((flow) =>
          flow.id === flowId ? { ...flow, status: "analyzed" } : flow,
        ),
      );
      toast({
        title: "Flow analyzed",
        description: "Optimization suggestions generated",
      });
      setIsAnalyzing(false);
    },
    [toast],
  );

  const handleOptimizeFlow = React.useCallback(
    async (flowId: string) => {
      setFlows((prev) =>
        prev.map((flow) =>
          flow.id === flowId ? { ...flow, status: "optimized" } : flow,
        ),
      );
      toast({
        title: "Flow optimized",
        description: "Optimizations have been applied",
      });
    },
    [toast],
  );

  const handleToggleBatchOp = React.useCallback(
    (id: string) => {
      setBatchOps((prev) =>
        prev.map((op) => (op.id === id ? { ...op, enabled: !op.enabled } : op)),
      );
      toast({
        title: "Batch operation updated",
        description: "Settings have been saved",
      });
    },
    [toast],
  );

  const handleToggleShortcut = React.useCallback(
    (id: string) => {
      setShortcuts((prev) =>
        prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
      );
      toast({
        title: "Shortcut updated",
        description: "Keyboard shortcut settings saved",
      });
    },
    [toast],
  );

  const totalSavings = React.useMemo(() => {
    if (flows.length === 0) return 0;
    return flows.reduce((sum, flow) => sum + flow.savings, 0) / flows.length;
  }, [flows]);

  const enabledBatchOps = React.useMemo(
    () => batchOps.filter((op) => op.enabled).length,
    [batchOps],
  );
  const enabledShortcuts = React.useMemo(
    () => shortcuts.filter((s) => s.enabled).length,
    [shortcuts],
  );

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="border-b border-border/30 p-4 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              UX Optimization
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Minimize clicks, enable batch operations, and configure shortcuts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={async () => {
                setIsAnalyzing(true);
                await new Promise((resolve) => setTimeout(resolve, 900));
                setIsAnalyzing(false);
                toast({
                  title: "Analysis complete",
                  description: "Flows refreshed",
                });
              }}
            >
              <Zap className="h-4 w-4 mr-2" /> Analyze All
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Avg. Click Savings
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {totalSavings.toFixed(0)}%
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Batch Operations
                  </p>
                  <p className="text-2xl font-bold">
                    {enabledBatchOps} / {batchOps.length}
                  </p>
                </div>
                <Settings className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Keyboard Shortcuts
                  </p>
                  <p className="text-2xl font-bold">
                    {enabledShortcuts} / {shortcuts.length}
                  </p>
                </div>
                <Keyboard className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Optimized Flows
                  </p>
                  <p className="text-2xl font-bold">
                    {
                      flows.filter(
                        (f) =>
                          f.status === "optimized" ||
                          f.status === "implemented",
                      ).length
                    }{" "}
                    / {flows.length}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="h-full flex flex-col"
        >
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="flows">User Flows</TabsTrigger>
            <TabsTrigger value="batch">Batch Operations</TabsTrigger>
            <TabsTrigger value="shortcuts">Keyboard Shortcuts</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="flows" className="flex-1 overflow-auto p-4">
            <div className="space-y-4">
              {flows.map((flow) => (
                <Card key={flow.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{flow.name}</CardTitle>
                        <CardDescription>{flow.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            flow.status === "implemented"
                              ? "default"
                              : flow.status === "optimized"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {flow.status}
                        </Badge>
                        {flow.status !== "optimized" &&
                        flow.status !== "implemented" ? (
                          <Button
                            size="sm"
                            onClick={() => handleAnalyzeFlow(flow.id)}
                            disabled={isAnalyzing}
                          >
                            <Zap className="h-4 w-4 mr-2" /> Analyze
                          </Button>
                        ) : null}
                        {flow.status === "analyzed" ? (
                          <Button
                            size="sm"
                            onClick={() => handleOptimizeFlow(flow.id)}
                          >
                            <Zap className="h-4 w-4 mr-2" /> Optimize
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Current Clicks
                        </p>
                        <p className="text-2xl font-bold">
                          {flow.currentClicks}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Optimized Clicks
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {flow.optimizedClicks}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Savings
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {flow.savings}%
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {flow.steps.map((step) => (
                        <div key={step.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{step.action}</span>
                            <div className="flex items-center gap-2">
                              {step.canBatch ? (
                                <Badge variant="outline" className="text-xs">
                                  Batchable
                                </Badge>
                              ) : null}
                              {step.canShortcut ? (
                                <Badge variant="outline" className="text-xs">
                                  Shortcut
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          <div className="text-sm space-y-1">
                            <div className="text-muted-foreground">
                              <span className="font-medium">Current:</span>{" "}
                              {step.currentMethod}
                            </div>
                            {step.optimizedMethod ? (
                              <div className="text-green-600">
                                <span className="font-medium">Optimized:</span>{" "}
                                {step.optimizedMethod}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="batch" className="flex-1 overflow-auto p-4">
            <Card>
              <CardHeader>
                <CardTitle>Batch Operations</CardTitle>
                <CardDescription>
                  Enable batch operations to perform actions on multiple items
                  at once
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {batchOps.map((op) => (
                    <div
                      key={op.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{op.name}</h3>
                          <Badge variant="outline">{op.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {op.description}
                        </p>
                      </div>
                      <Switch
                        checked={op.enabled}
                        onCheckedChange={() => handleToggleBatchOp(op.id)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shortcuts" className="flex-1 overflow-auto p-4">
            <Card>
              <CardHeader>
                <CardTitle>Keyboard Shortcuts</CardTitle>
                <CardDescription>
                  Configure keyboard shortcuts for quick actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Shortcut</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shortcuts.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {s.action}
                        </TableCell>
                        <TableCell>
                          <code className="px-2 py-1 bg-muted rounded text-sm">
                            {s.shortcut}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{s.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={s.enabled}
                            onCheckedChange={() => handleToggleShortcut(s.id)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="flex-1 overflow-auto p-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Click Reduction</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {flows.map((flow) => (
                      <div key={flow.id}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            {flow.name}
                          </span>
                          <span className="text-sm text-green-600">
                            {flow.savings}% reduction
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${flow.savings}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Optimization Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Analyzed</span>
                      <Badge variant="outline">
                        {flows.filter((f) => f.status === "analyzed").length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Optimized</span>
                      <Badge variant="secondary">
                        {flows.filter((f) => f.status === "optimized").length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Implemented</span>
                      <Badge variant="default">
                        {flows.filter((f) => f.status === "implemented").length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
