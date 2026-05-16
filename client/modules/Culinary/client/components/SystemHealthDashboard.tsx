import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Play,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ServiceStatus {
  status: "operational" | "warning" | "error";
  message: string;
  model?: string;
  indexName?: string;
}

interface HealthStatus {
  healthy: boolean;
  timestamp: string;
  services: {
    echo: ServiceStatus;
    openai: ServiceStatus;
    pinecone: ServiceStatus;
  };
}

interface SystemHealthDashboardProps {
  onStartTraining?: () => void;
  className?: string;
}

export function SystemHealthDashboard({
  onStartTraining,
  className,
}: SystemHealthDashboardProps) {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/health/status");
      const data = (await response.json()) as HealthStatus;
      setHealth(data);
    } catch (err: any) {
      setError(err.message || "Failed to check system health");
      console.error("Health check error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: "operational" | "warning" | "error") => {
    switch (status) {
      case "operational":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusColor = (status: "operational" | "warning" | "error") => {
    switch (status) {
      case "operational":
        return "bg-green-50 border-green-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "error":
        return "bg-red-50 border-red-200";
    }
  };

  const getStatusBadge = (status: "operational" | "warning" | "error") => {
    switch (status) {
      case "operational":
        return <Badge className="bg-green-600">Operational</Badge>;
      case "warning":
        return <Badge className="bg-yellow-600">Warning</Badge>;
      case "error":
        return <Badge className="bg-red-600">Error</Badge>;
    }
  };

  if (error && !health) {
    return (
      <div className={className}>
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Failed to check system health: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Status</h2>
          <p className="text-sm text-gray-600 mt-1">
            {health
              ? `Last updated: ${new Date(health.timestamp).toLocaleTimeString()}`
              : "Checking..."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={checkHealth}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      {health && (
        <Card
          className={`p-4 ${
            health.healthy
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {health.healthy ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600" />
              )}
              <div>
                <h3
                  className={`font-semibold ${health.healthy ? "text-green-900" : "text-red-900"}`}
                >
                  {health.healthy
                    ? "All Systems Operational"
                    : "System Issues Detected"}
                </h3>
                <p
                  className={`text-sm mt-1 ${health.healthy ? "text-green-700" : "text-red-700"}`}
                >
                  {health.healthy
                    ? "Echo is ready to start training with OpenAI"
                    : "Some services are not available. Check details below."}
                </p>
              </div>
            </div>
            {health.healthy && (
              <Button
                onClick={onStartTraining}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                <Play className="w-4 h-4" />
                Start Training
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Service Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {health && (
          <>
            {/* Echo Status */}
            <Card
              className={`p-4 border-2 ${getStatusColor(health.services.echo.status)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(health.services.echo.status)}
                  <h3 className="font-semibold text-gray-900">Echo AI</h3>
                </div>
                {getStatusBadge(health.services.echo.status)}
              </div>
              <p className="text-sm text-gray-700">
                {health.services.echo.message}
              </p>
              <div className="mt-3 text-xs text-gray-600 space-y-1">
                <p>
                  <strong>Core Engine:</strong> Operational
                </p>
                <p>
                  <strong>Training API:</strong> Ready
                </p>
              </div>
            </Card>

            {/* OpenAI Status */}
            <Card
              className={`p-4 border-2 ${getStatusColor(health.services.openai.status)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(health.services.openai.status)}
                  <h3 className="font-semibold text-gray-900">OpenAI API</h3>
                </div>
                {getStatusBadge(health.services.openai.status)}
              </div>
              <p className="text-sm text-gray-700">
                {health.services.openai.message}
              </p>
              <div className="mt-3 text-xs text-gray-600 space-y-1">
                <p>
                  <strong>Model:</strong>{" "}
                  {health.services.openai.model || "N/A"}
                </p>
                <p>
                  <strong>API Key:</strong>{" "}
                  {health.services.openai.status === "operational"
                    ? "Valid"
                    : "Invalid"}
                </p>
              </div>
            </Card>

            {/* Pinecone Status */}
            <Card
              className={`p-4 border-2 ${getStatusColor(health.services.pinecone.status)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(health.services.pinecone.status)}
                  <h3 className="font-semibold text-gray-900">Pinecone</h3>
                </div>
                {getStatusBadge(health.services.pinecone.status)}
              </div>
              <p className="text-sm text-gray-700">
                {health.services.pinecone.message}
              </p>
              <div className="mt-3 text-xs text-gray-600 space-y-1">
                <p>
                  <strong>Index:</strong>{" "}
                  {health.services.pinecone.indexName ||
                    "Not found (will be created)"}
                </p>
                <p>
                  <strong>API Key:</strong>{" "}
                  {health.services.pinecone.status === "operational"
                    ? "Valid"
                    : health.services.pinecone.status === "warning"
                      ? "Configured"
                      : "Invalid"}
                </p>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* What You Can Do */}
      {health && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">What You Can Do</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            {health.healthy ? (
              <>
                <li>✓ Start collaborative training dialogues with Echo</li>
                <li>✓ Echo will ask OpenAI to learn new knowledge</li>
                <li>
                  ✓ Learned knowledge will be stored in Pinecone for future
                  queries
                </li>
                <li>✓ Monitor training progress and knowledge acquisition</li>
              </>
            ) : (
              <>
                <li>
                  • Ensure all API keys are configured in environment variables
                </li>
                <li>
                  • Check that OPENAI_API_KEY is valid and has API credits
                </li>
                <li>
                  • Verify PINECONE_API_KEY is correct and account is active
                </li>
                <li>
                  • Once all services are operational, training will be
                  available
                </li>
              </>
            )}
          </ul>
        </Card>
      )}

      {loading && !health && (
        <Card className="p-8 text-center">
          <div className="animate-spin inline-block mb-3">
            <RefreshCw className="w-8 h-8 text-indigo-600" />
          </div>
          <p className="text-gray-600">Checking system health...</p>
        </Card>
      )}
    </div>
  );
}
