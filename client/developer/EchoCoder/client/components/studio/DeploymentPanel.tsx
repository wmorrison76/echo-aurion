import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Rocket,
  Copy,
  ExternalLink,
  RotateCcw,
  Activity,
  Calendar,
  Clock,
} from "lucide-react";
import { DeploymentStatus } from "@/services/DeploymentService";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface DeploymentPanelProps {
  status?: DeploymentStatus;
  isDeploying?: boolean;
  onDeploy?: (platform: string) => void;
  onRollback?: () => void;
  onMonitor?: () => void;
}

export const DeploymentPanel: React.FC<DeploymentPanelProps> = ({
  status,
  isDeploying = false,
  onDeploy,
  onRollback,
  onMonitor,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("netlify");
  const [copiedUrl, setCopiedUrl] = useState(false);

  const platforms = [
    {
      id: "netlify",
      name: "Netlify",
      icon: "🚀",
      description: "Static site hosting",
    },
    {
      id: "vercel",
      name: "Vercel",
      icon: "▲",
      description: "Frontend deployment",
    },
    { id: "aws", name: "AWS", icon: "☁️", description: "Full-stack hosting" },
    { id: "azure", name: "Azure", icon: "Λ", description: "Microsoft cloud" },
    {
      id: "gcp",
      name: "Google Cloud",
      icon: "◎",
      description: "Google platform",
    },
    {
      id: "docker",
      name: "Docker",
      icon: "🐋",
      description: "Container deployment",
    },
  ];

  const getStatusColor = (deployStatus: string) => {
    switch (deployStatus) {
      case "deployed":
        return "text-green-400 bg-green-900/20 border-green-700";
      case "deploying":
        return "text-blue-400 bg-blue-900/20 border-blue-700";
      case "failed":
        return "text-red-400 bg-red-900/20 border-red-700";
      case "initializing":
        return "text-yellow-400 bg-yellow-900/20 border-yellow-700";
      default:
        return "text-slate-400 bg-slate-800 border-slate-700";
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  if (!status) {
    return (
      <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-900 to-slate-800">
        {/* Header */}
        <div className="border-b border-slate-700 p-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Rocket className="w-6 h-6 text-blue-400" />
            Deploy to Production
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Choose a platform and deploy your application
          </p>
        </div>

        {/* Platform Selection */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              Select Deployment Platform
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedPlatform === platform.id
                      ? "border-cyan-500 bg-cyan-900/20"
                      : "border-slate-600 bg-slate-800 hover:border-slate-500"
                  }`}
                >
                  <div className="text-2xl mb-2">{platform.icon}</div>
                  <p className="font-semibold text-white">{platform.name}</p>
                  <p className="text-xs text-slate-400">
                    {platform.description}
                  </p>
                </button>
              ))}
            </div>

            {/* Deploy Info */}
            <Card className="p-4 bg-slate-800 border-slate-700 mt-6">
              <h4 className="font-semibold text-white mb-2">
                Deployment Configuration
              </h4>
              <div className="space-y-2 text-sm text-slate-300">
                <p>
                  Platform:{" "}
                  <span className="font-mono text-cyan-400">
                    {selectedPlatform}
                  </span>
                </p>
                <p>
                  Environment:{" "}
                  <span className="font-mono text-cyan-400">production</span>
                </p>
                <p>
                  Status:{" "}
                  <span className="font-mono text-yellow-400">ready</span>
                </p>
              </div>
            </Card>

            {/* Deploy Button */}
            <Button
              size="lg"
              onClick={() => onDeploy?.(selectedPlatform)}
              disabled={isDeploying}
              className="w-full gap-2 mt-4"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  Deploy to {selectedPlatform}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-400" />
            Deployment Status
          </h2>
          <Badge className={`capitalize ${getStatusColor(status.status)}`}>
            {status.status}
          </Badge>
        </div>
        <p className="text-sm text-slate-400">
          {status.platform} • {status.environment}
        </p>
      </div>

      {/* Content */}
      <Tabs
        defaultValue="overview"
        className="flex-1 overflow-hidden flex flex-col"
      >
        <TabsList className="w-full justify-start border-b border-slate-700 bg-slate-900 rounded-none">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Status Summary */}
            <Card className={`p-6 border ${getStatusColor(status.status)}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Status</h3>
                {status.status === "deployed" && (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                )}
                {status.status === "deploying" && (
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                )}
                {status.status === "failed" && (
                  <AlertCircle className="w-6 h-6 text-red-400" />
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-300">
                      Progress
                    </span>
                    <span className="text-sm font-mono text-cyan-400">
                      {status.progress}%
                    </span>
                  </div>
                  <Progress
                    value={status.progress}
                    className="h-2 bg-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Start Time</p>
                    <p className="font-mono text-sm text-slate-300">
                      {status.startTime
                        ? new Date(status.startTime).toLocaleTimeString()
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Duration</p>
                    <p className="font-mono text-sm text-slate-300">
                      {status.startTime && status.endTime
                        ? `${((status.endTime - status.startTime) / 1000).toFixed(1)}s`
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Deployment URL */}
            {status.deploymentUrl && (
              <Card className="p-4 bg-slate-800 border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-white">Live URL</h4>
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={status.deploymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-cyan-400 hover:text-cyan-300 break-all text-sm font-mono"
                  >
                    {status.deploymentUrl}
                  </a>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(status.deploymentUrl!)}
                    className="gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedUrl ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </Card>
            )}

            {/* Error Message */}
            {status.error && (
              <Card className="p-4 bg-red-900/20 border-red-700">
                <h4 className="font-semibold text-red-400 mb-2">Error</h4>
                <p className="text-sm text-red-300">{status.error}</p>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {status.status === "deployed" && (
                <Button
                  onClick={onRollback}
                  variant="outline"
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Rollback
                </Button>
              )}

              {status.status === "deployed" && (
                <Button onClick={onMonitor} variant="outline" className="gap-2">
                  <Activity className="w-4 h-4" />
                  Monitor Health
                </Button>
              )}

              {status.status === "failed" && (
                <Button
                  onClick={() => onDeploy?.(status.platform)}
                  className="gap-2"
                >
                  <Rocket className="w-4 h-4" />
                  Retry Deployment
                </Button>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="flex-1 overflow-auto">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {status.logs.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No logs yet</p>
              ) : (
                status.logs.map((log, idx) => (
                  <div
                    key={idx}
                    className="font-mono text-xs p-2 bg-slate-800 rounded border border-slate-700 flex gap-2"
                  >
                    <span className="text-slate-500 min-w-[140px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`font-semibold min-w-[60px] ${
                        log.level === "error"
                          ? "text-red-400"
                          : log.level === "warning"
                            ? "text-yellow-400"
                            : log.level === "success"
                              ? "text-green-400"
                              : "text-blue-400"
                      }`}
                    >
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-slate-300 flex-1">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="health" className="flex-1 overflow-auto">
          <div className="p-6 text-center text-slate-400">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Health monitoring will appear here when deployed</p>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="flex-1 overflow-auto">
          <div className="p-6 space-y-4">
            <Card className="p-4 bg-slate-800 border-slate-700">
              <h4 className="font-semibold text-white mb-3">
                Deployment Details
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">ID:</span>
                  <span className="text-slate-300 font-mono">{status.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Platform:</span>
                  <span className="text-slate-300 capitalize">
                    {status.platform}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Environment:</span>
                  <span className="text-slate-300 capitalize">
                    {status.environment}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <Badge
                    className={`capitalize ${getStatusColor(status.status)}`}
                  >
                    {status.status}
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
