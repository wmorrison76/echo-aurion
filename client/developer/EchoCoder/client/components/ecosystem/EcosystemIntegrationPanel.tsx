/**
 * Ecosystem Integration Panel
 * Visual interface for ecosystem status, monitoring, and module discovery
 */

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  getAllModules,
  getModuleStatistics,
  bootstrapEcosystem,
  getEcosystemStatus,
  checkEcosystemHealth,
  getZoraMonitor,
  getEchoAICognition,
  resetEcosystem,
  exportEcosystemSnapshot,
} from "@/ecosystem";
import { AlertTriangle, CheckCircle2, Package, Zap } from "lucide-react";

export function EcosystemIntegrationPanel() {
  const [bootstrapped, setBootstrapped] = useState(false);
  const [modules, setModules] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEcosystemStatus();
  }, []);

  const loadEcosystemStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load basic status
      const h = checkEcosystemHealth();
      setHealth(h);

      const s = getEcosystemStatus();
      setStatus(s);

      // Only load modules if ecosystem is healthy
      if (h.healthy) {
        const m = getAllModules();
        setModules(m);

        const st = getModuleStatistics();
        setStats(st);

        setBootstrapped(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleBootstrap = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await bootstrapEcosystem({
        builderIO: { enabled: true },
        zora: { enabled: true },
        echoAI: { enabled: true },
        verbose: false,
      });

      if (result.success) {
        setBootstrapped(true);
        await loadEcosystemStatus();
      } else {
        setError(result.errors.join("; "));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (confirm("Reset ecosystem to defaults? This cannot be undone.")) {
      resetEcosystem();
      setBootstrapped(false);
      setModules([]);
      setStats(null);
      setHealth(null);
      setStatus(null);
    }
  };

  const handleExportSnapshot = () => {
    const snapshot = exportEcosystemSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ecosystem-snapshot-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCheckHealth = async () => {
    try {
      const zora = getZoraMonitor();
      await zora.performIntegrityCheck();

      const echo = getEchoAICognition();
      const echoStats = echo.getStatistics();

      alert(
        `System Health Check Complete\n\nZora: Active\nEchoAI: ${echoStats.totalModules} modules indexed`,
      );
    } catch (err) {
      alert(`Health check failed: ${err}`);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            LUCCCA Ecosystem Integration
          </CardTitle>
          <CardDescription>
            Monitor Builder.io modules, Zora protection, and EchoAI cognition
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Alerts */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {health && !health.healthy && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-semibold">System Status: Degraded</p>
                  {health.issues.map((issue: string) => (
                    <p key={issue} className="text-sm">
                      ⚠️ {issue}
                    </p>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {bootstrapped && health?.healthy && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ✅ Ecosystem fully initialized and operational
              </AlertDescription>
            </Alert>
          )}

          {/* Bootstrap Button */}
          {!bootstrapped && (
            <Button
              onClick={handleBootstrap}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? "Initializing..." : "Initialize Ecosystem"}
            </Button>
          )}

          {/* Module Statistics */}
          {stats && (
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-slate-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{stats.total}</p>
                    <p className="text-sm text-slate-600 mt-1">Total Modules</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{stats.core}</p>
                    <p className="text-sm text-blue-600 mt-1">Core Modules</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{stats.builderIO}</p>
                    <p className="text-sm text-purple-600 mt-1">Builder.io</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{stats.generated}</p>
                    <p className="text-sm text-green-600 mt-1">Generated</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* System Status */}
          {status && (
            <div className="space-y-3">
              <p className="font-semibold text-sm">System Components:</p>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <span className="text-sm">Builder.io Integration</span>
                  <Badge
                    variant={status.builder.loaded ? "default" : "outline"}
                  >
                    {status.builder.loaded ? "Loaded" : "Not Loaded"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <span className="text-sm">Zora Monitoring</span>
                  <Badge
                    variant={status.zora.monitoring ? "default" : "outline"}
                  >
                    {status.zora.monitoring ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <span className="text-sm">EchoAI Cognition</span>
                  <Badge
                    variant={status.echoAI.indexed ? "default" : "outline"}
                  >
                    {status.echoAI.indexed ? "Ready" : "Pending"}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Module List */}
          {modules.length > 0 && (
            <div className="space-y-2">
              <p className="font-semibold text-sm">Available Modules:</p>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {modules.slice(0, 8).map((m) => (
                  <div key={m.id} className="p-2 bg-slate-50 rounded text-xs">
                    <p className="font-medium">
                      {m.icon} {m.name}
                    </p>
                    <p className="text-slate-500">{m.route}</p>
                  </div>
                ))}
                {modules.length > 8 && (
                  <div className="p-2 bg-slate-100 rounded text-xs flex items-center justify-center">
                    +{modules.length - 8} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckHealth}
              className="flex-1"
            >
              Check Health
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSnapshot}
              className="flex-1"
            >
              Export Snapshot
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReset}
              className="flex-1"
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
