/**
 * Module Status Dashboard
 * Comprehensive visual dashboard showing all modules, their loading status,
 * success/failure tracking, timing, errors, and dependencies.
 * 
 * Access via: Open panel "module-status" or "module-diagnostics"
 */

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Download,
  Filter,
  Search,
  TrendingUp,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

interface ModuleStatus {
  key: string;
  label: string;
  status: "loading" | "success" | "error" | "unknown";
  loadTime?: number;
  error?: string;
  lastAttempt?: number;
  attemptCount: number;
  successCount: number;
  failureCount: number;
}

export function ModuleStatusDashboard() {
  const [modules, setModules] = useState<ModuleStatus[]>([]);
  const [filter, setFilter] = useState<string>("all"); // all, success, error, loading
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const { toast } = useToast();

  // Get all module keys from panel registry metadata
  const getAllModuleKeys = async (): Promise<string[]> => {
    if (typeof window === "undefined") return [];
    
    try {
      // Import panel registry to get metadata
      const panelRegistry = await import("@/lib/panel-registry");
      
      // Get keys from PANEL_METADATA (preferred - has all modules)
      if ((panelRegistry as any).PANEL_METADATA) {
        return Object.keys((panelRegistry as any).PANEL_METADATA);
      }
      
      // Fallback: Get keys from PANEL_REGISTRY
      if ((panelRegistry as any).PANEL_REGISTRY) {
        return Object.keys((panelRegistry as any).PANEL_REGISTRY);
      }
    } catch (e) {
      console.warn("Could not import panel registry:", e);
    }

    // Fallback: known module keys from PanelKey type
    return [
      "dashboard",
      "culinary",
      "pastry",
      "schedule",
      "inventory",
      "purchasing-receiving",
      "maestro",
      "maestro-bqt",
      "mixology_sommelier",
      "support",
      "events",
      "revenue",
      "costs",
      "guest",
      "supply",
      "qa",
      "analytics",
      "demand",
      "pricing",
      "staffing",
      "voice",
      "canvas",
      "ai-chef",
      "maintenance",
      "templates",
      "network",
      "benchmark",
      "zaro",
      "multi-property",
      "job-sharing",
      "pto",
      "mobile",
      "global-calendar",
      "engineering",
      "wine",
      "aurum",
      "layout",
      "whiteboard",
      "video",
      "studio",
      "notes",
      "chefnet",
    ];
  };

  // Load module status from diagnostics
  const loadModuleStatus = async () => {
    try {
      // Import diagnostics module
      const diagnosticsModule = await import("@/lib/module-load-diagnostics").catch(() => null);
      if (!diagnosticsModule?.moduleLoadDiagnostics) {
        console.warn("Module diagnostics not available");
        return;
      }

      const diagnostics = diagnosticsModule.moduleLoadDiagnostics;
      const stats = diagnostics.getStats();

      // Get all module keys (await the async function!)
      const moduleKeys = await getAllModuleKeys();

      // Build status for each module
      const moduleStatuses: ModuleStatus[] = moduleKeys.map((key) => {
        const moduleErrors = diagnostics.getErrorsForModule(key);
        const moduleAttempts = diagnostics.getAttemptsForModule(key);
        const successfulAttempts = moduleAttempts.filter((a) => a.status === "success");
        const failedAttempts = moduleAttempts.filter((a) => a.status === "error");
        const lastAttempt = moduleAttempts[moduleAttempts.length - 1];
        const latestError = moduleErrors[0];

        let status: ModuleStatus["status"] = "unknown";
        if (moduleAttempts.length === 0) {
          status = "unknown";
        } else if (lastAttempt?.status === "success") {
          status = "success";
        } else if (failedAttempts.length > 0) {
          status = "error";
        } else if (lastAttempt?.status === "loading") {
          status = "loading";
        }

        return {
          key,
          label: key.replace(/-/g, " ").replace(/_/g, " "),
          status,
          loadTime: lastAttempt?.duration || (latestError?.context?.duration as number | undefined),
          error: latestError?.errorMessage,
          lastAttempt: lastAttempt?.timestamp || latestError?.timestamp,
          attemptCount: moduleAttempts.length,
          successCount: successfulAttempts.length,
          failureCount: failedAttempts.length,
        };
      });

      setModules(moduleStatuses);
    } catch (error) {
      console.error("Failed to load module status:", error);
      toast({
        title: "Error",
        description: "Failed to load module status",
        variant: "destructive",
      });
    }
  };

  // Initial load
  useEffect(() => {
    loadModuleStatus();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadModuleStatus();
    }, 2000); // Refresh every 2 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Filter modules
  const filteredModules = modules.filter((module) => {
    // Filter by status
    if (filter !== "all" && module.status !== filter) {
      return false;
    }

    // Filter by search
    if (searchQuery && !module.key.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !module.label.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    return true;
  });

  // Statistics
  const stats = {
    total: modules.length,
    success: modules.filter((m) => m.status === "success").length,
    error: modules.filter((m) => m.status === "error").length,
    loading: modules.filter((m) => m.status === "loading").length,
    unknown: modules.filter((m) => m.status === "unknown").length,
  };

  const getStatusIcon = (status: ModuleStatus["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "loading":
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ModuleStatus["status"]) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500/20 text-green-600 dark:text-green-400">Success</Badge>;
      case "error":
        return <Badge className="bg-red-500/20 text-red-600 dark:text-red-400">Error</Badge>;
      case "loading":
        return <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400">Loading</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-6 space-y-4 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Module Status Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time tracking of all module loading status, errors, and performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Auto-refresh" : "Manual"}
          </Button>
          <Button variant="outline" size="sm" onClick={loadModuleStatus}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Modules</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.success}
            </div>
            <p className="text-xs text-muted-foreground">Successful</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.error}
            </div>
            <p className="text-xs text-muted-foreground">Errors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.loading}
            </div>
            <p className="text-xs text-muted-foreground">Loading</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {stats.unknown}
            </div>
            <p className="text-xs text-muted-foreground">Unknown</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                All
              </Button>
              <Button
                variant={filter === "success" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("success")}
              >
                Success
              </Button>
              <Button
                variant={filter === "error" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("error")}
              >
                Errors
              </Button>
              <Button
                variant={filter === "loading" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("loading")}
              >
                Loading
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module List */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>
            Modules ({filteredModules.length} of {modules.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {filteredModules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No modules found matching your criteria
                </div>
              ) : (
                filteredModules.map((module) => (
                  <Card key={module.key} className="border-border/50">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getStatusIcon(module.status)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">
                                {module.label}
                              </h3>
                              {getStatusBadge(module.status)}
                            </div>
                            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                              <span>
                                Attempts: {module.attemptCount} ({module.successCount} success,{" "}
                                {module.failureCount} failed)
                              </span>
                              {module.loadTime !== undefined && (
                                <span>Load time: {module.loadTime}ms</span>
                              )}
                              {module.lastAttempt && (
                                <span>
                                  Last: {new Date(module.lastAttempt).toLocaleTimeString()}
                                </span>
                              )}
                            </div>
                            {module.error && (
                              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-600 dark:text-red-400">
                                <strong>Error:</strong> {module.error}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default ModuleStatusDashboard;
