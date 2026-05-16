/**
 * Module Health Dashboard
 * Displays the health status of all modules in the system
 */

import { useEffect, useState } from "react";
import {
  getModuleHealth,
  ValidationResult,
  formatValidationResult,
} from "@/lib/module-validator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader,
} from "lucide-react";

export default function ModuleHealthDashboard() {
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Initial load
  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const result = await getModuleHealth();
      setValidationResult(result);
    } catch (error) {
      console.error("Failed to check module health:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshHealth = async () => {
    setRefreshing(true);
    try {
      const result = await getModuleHealth();
      setValidationResult(result);
    } catch (error) {
      console.error("Failed to refresh health:", error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader className="animate-spin" />
              Loading Module Health...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!validationResult) {
    return (
      <div className="space-y-4">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertCircle />
              Unable to Load Module Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800 mb-4">
              Failed to retrieve module health information. This could indicate
              a backend connectivity issue.
            </p>
            <Button onClick={refreshHealth} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { healthIcon, healthText, summary, recommendations } =
    formatValidationResult(validationResult);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800 border-green-300";
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "unhealthy":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="w-4 h-4" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4" />;
      case "unhealthy":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const isSystemHealthy = validationResult.systemHealth === "healthy";
  const borderColor = isSystemHealthy
    ? "border-green-300"
    : validationResult.systemHealth === "degraded"
      ? "border-yellow-300"
      : "border-red-300";
  const bgColor = isSystemHealthy
    ? "bg-green-50"
    : validationResult.systemHealth === "degraded"
      ? "bg-yellow-50"
      : "bg-red-50";

  return (
    <div className="space-y-6">
      {/* System Health Summary */}
      <Card className={`border-2 ${borderColor} ${bgColor}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{healthIcon}</span>
              <div>
                <CardTitle className="text-lg">{healthText}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{summary}</p>
              </div>
            </div>
            <Button
              onClick={refreshHealth}
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              {refreshing ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Issues and Warnings */}
      {validationResult.issues.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {validationResult.issues.map((issue, idx) => (
                <li
                  key={idx}
                  className="text-sm text-red-800 flex items-start gap-2"
                >
                  <span className="mt-1">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900 text-base">
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((rec, idx) => (
                <li
                  key={idx}
                  className="text-sm text-blue-800 flex items-start gap-2"
                >
                  <span className="mt-1">→</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Module Grid */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground">
          Module Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {validationResult.modules.map((module) => (
            <Card
              key={module.name}
              className={`border-2 ${getStatusColor(module.status).replace("text-", "border-").split(" ")[0]} cursor-pointer hover:shadow-md transition-shadow`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {getStatusIcon(module.status)}
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium text-sm">{module.name}</p>
                    <Badge className="mt-1" variant="secondary">
                      {module.status}
                    </Badge>
                  </div>
                  {module.loadTime && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {Math.round(module.loadTime)}ms
                      </p>
                    </div>
                  )}
                </div>
                {module.error && (
                  <p className="text-xs text-destructive mt-2">
                    {module.error}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Debug Info */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-xs text-muted-foreground">
            Debug Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs font-mono text-muted-foreground">
            <p>
              Backend Connected: {validationResult.backendConnected ? "✓" : "✗"}
            </p>
            <p>System Health: {validationResult.systemHealth}</p>
            <p>
              Last Checked:{" "}
              {new Date(validationResult.timestamp).toLocaleTimeString()}
            </p>
            <p>Total Modules: {validationResult.modules.length}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
