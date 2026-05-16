/**
 * Module Diagnostics Panel
 * Visual interface for viewing module load diagnostics
 */

import React, { useEffect, useState } from "react";
import { moduleLoadDiagnostics } from "@/lib/module-load-diagnostics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, RefreshCw, Trash2, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ModuleDiagnosticsPanel() {
  const [stats, setStats] = useState(moduleLoadDiagnostics.getStats());
  const [recentErrors, setRecentErrors] = useState(moduleLoadDiagnostics.getRecentErrors(20));
  const { toast } = useToast();

  const refresh = () => {
    setStats(moduleLoadDiagnostics.getStats());
    setRecentErrors(moduleLoadDiagnostics.getRecentErrors(20));
  };

  useEffect(() => {
    // Refresh every 2 seconds
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, []);

  const copyReport = () => {
    const report = moduleLoadDiagnostics.generateReport();
    navigator.clipboard.writeText(report);
    toast({
      title: "Report copied",
      description: "Diagnostic report copied to clipboard",
    });
  };

  const clearDiagnostics = () => {
    moduleLoadDiagnostics.clear();
    refresh();
    toast({
      title: "Diagnostics cleared",
      description: "All diagnostic data has been cleared",
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Module Load Diagnostics</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of module loading performance and errors
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={copyReport} variant="outline" size="sm">
            <Copy className="h-4 w-4 mr-2" />
            Copy Report
          </Button>
          <Button onClick={clearDiagnostics} variant="outline" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Attempts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAttempts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Successful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failure Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.failureRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Errors by Module */}
      {Object.keys(stats.errorsByModule).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Errors by Module</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.errorsByModule)
                .sort(([, a], [, b]) => b - a)
                .map(([module, count]) => (
                  <div
                    key={module}
                    className="flex items-center justify-between p-2 rounded bg-muted/50"
                  >
                    <span className="font-mono text-sm">{module}</span>
                    <Badge variant="destructive">{count} error(s)</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Errors</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {recentErrors.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>No errors recorded</p>
                <p className="text-sm mt-2">All modules are loading successfully</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentErrors.map((error, idx) => (
                  <Card key={idx} className="border-red-200 dark:border-red-800">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-mono">
                          {error.moduleKey}
                        </CardTitle>
                        <Badge variant="destructive">Error</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(error.timestamp).toLocaleString()}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold mb-1">Error Message:</p>
                        <p className="text-sm font-mono bg-muted p-2 rounded break-all">
                          {error.errorMessage}
                        </p>
                      </div>

                      {error.importPath && (
                        <div>
                          <p className="text-sm font-semibold mb-1">Import Path:</p>
                          <p className="text-sm font-mono bg-muted p-2 rounded break-all">
                            {error.importPath}
                          </p>
                        </div>
                      )}

                      {error.stack && (
                        <details>
                          <summary className="text-sm font-semibold cursor-pointer hover:text-foreground">
                            Stack Trace
                          </summary>
                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40 whitespace-pre-wrap font-mono">
                            {error.stack}
                          </pre>
                        </details>
                      )}

                      {error.context && Object.keys(error.context).length > 0 && (
                        <details>
                          <summary className="text-sm font-semibold cursor-pointer hover:text-foreground">
                            Context
                          </summary>
                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40 whitespace-pre-wrap">
                            {JSON.stringify(error.context, null, 2)}
                          </pre>
                        </details>
                      )}

                      <Button
                        onClick={() => {
                          console.group(`🔴 Module Error: ${error.moduleKey}`);
                          console.error("Full Error Object:", error);
                          console.error("Error:", error.error);
                          console.error("Stack:", error.stack);
                          console.error("Context:", error.context);
                          console.groupEnd();
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        View in Console
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
