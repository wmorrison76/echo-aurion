import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Loader2, Power } from "lucide-react";
// Toast POS integration - currently unused
// import {
//   initializeToastConnection,
//   clearToastConfig,
//   type ToastConfig,
// } from "@/lib/toast-pos-integration";

interface ToastPOSSetupProps {
  onConnected?: (config: any) => void; // TODO: Define proper type when Toast POS integration is implemented
  onDisconnected?: () => void;
}

export const ToastPOSSetup: React.FC<ToastPOSSetupProps> = ({
  onConnected,
  onDisconnected,
}) => {
  const [step, setStep] = useState<"form" | "testing" | "connected">("form");
  const [restaurantId, setRestaurantId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [environment, setEnvironment] = useState<"production" | "staging">(
    "production",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // TODO: Re-enable when Toast POS integration is implemented
      // const config: ToastConfig = {
      //   restaurantId,
      //   apiKey,
      //   environment,
      // };

      // const success = await initializeToastConnection(config);

      // if (success) {
      //   setStep("connected");
      //   onConnected?.(config);
      // } else {
      //   setError(
      //     "Failed to connect to Toast POS. Please verify your credentials and try again.",
      //   );
      // }
      setError("Toast POS integration is not yet implemented");
    } catch (err) {
      setError(`Connection error: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    // TODO: Re-enable when Toast POS integration is implemented
    // clearToastConfig();
    setStep("form");
    setRestaurantId("");
    setApiKey("");
    setError(null);
    onDisconnected?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Power className="h-5 w-5" />
          Toast POS Integration
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === "form" && (
          <form onSubmit={handleConnect} className="space-y-4">
            <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                Get your API credentials from your Toast POS account under
                Settings → Developer API.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Restaurant ID</label>
              <input
                type="text"
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
                placeholder="Your Toast restaurant ID"
                className="w-full rounded border border-input px-3 py-2 text-sm"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Found in your Toast account settings
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Your Toast API key"
                className="w-full rounded border border-input px-3 py-2 text-sm"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Never share this key. It's encrypted and only stored in your
                session.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Environment</label>
              <select
                value={environment}
                onChange={(e) =>
                  setEnvironment(e.target.value as "production" | "staging")
                }
                className="w-full rounded border border-input px-3 py-2 text-sm"
                disabled={loading}
              >
                <option value="production">Production</option>
                <option value="staging">Staging/Testing</option>
              </select>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={!restaurantId || !apiKey || loading}
              className="w-full gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Connecting..." : "Connect to Toast POS"}
            </Button>
          </form>
        )}

        {step === "connected" && (
          <div className="space-y-4">
            <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Successfully connected to Toast POS! You can now sync menus and
                import orders.
              </AlertDescription>
            </Alert>

            <div className="p-4 rounded border space-y-2">
              <p className="text-sm font-semibold">Connected Account</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Restaurant ID</p>
                  <p className="font-mono">{restaurantId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Environment</p>
                  <p className="capitalize">{environment}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 space-y-2">
              <p className="text-sm font-semibold">Available Features</p>
              <ul className="space-y-1 text-sm text-blue-900 dark:text-blue-200">
                <li>✓ Sync your Echo Recipe Pro menus to Toast POS</li>
                <li>✓ Import real-time orders and sales data</li>
                <li>✓ Track food costs based on actual orders</li>
                <li>✓ Monitor menu performance</li>
                <li>✓ Real-time cost analysis</li>
              </ul>
            </div>

            <Button
              variant="destructive"
              onClick={handleDisconnect}
              className="w-full"
            >
              Disconnect from Toast POS
            </Button>
          </div>
        )}

        {/* Next Steps */}
        {step === "connected" && (
          <div className="border-t pt-6 space-y-3">
            <p className="text-sm font-semibold">Next Steps</p>
            <div className="space-y-2 text-sm">
              <p>
                1. Go to <strong>Menu Sync</strong> to push your recipes to
                Toast POS
              </p>
              <p>
                2. Enable <strong>Real-Time Order Sync</strong> to automatically
                import sales
              </p>
              <p>
                3. View <strong>Toast Sales Dashboard</strong> for cost analysis
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ToastPOSSetup;
