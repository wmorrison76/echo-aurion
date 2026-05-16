import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { MobileCountSession } from "../components/inventory/MobileCountSession";
import { BarcodeScanner } from "../components/inventory/BarcodeScanner";
import { InventoryTransferManager } from "../components/inventory/InventoryTransferManager";
import { ParLevelAlerts } from "../components/inventory/ParLevelAlerts";
import { AlertCircle, Smartphone, Package, ArrowRightLeft } from "lucide-react";

interface Outlet {
  id: string;
  name: string;
}

export default function MobileInventoryOperations() {
  const [organizationId] = useState<string>("");
  const [outletId, setOutletId] = useState<string>("");
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeOutlets = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/inventory?limit=100");
        if (response.ok) {
          const data = await response.json();
          setOutlets(data.data || []);
          if (data.data && data.data.length > 0) {
            setOutletId(data.data[0].id);
          }
        }
      } catch (err) {
        setError("Failed to load outlets");
      } finally {
        setLoading(false);
      }
    };

    initializeOutlets();
  }, []);

  const handleCreateCountSession = async () => {
    try {
      const response = await fetch("/api/mobile-inventory/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          outletId,
        }),
      });
      if (response.ok) {
        const session = await response.json();
        setSessionId(session.id);
      } else {
        setError("Failed to create count session");
      }
    } catch (err) {
      setError("Error creating session");
    }
  };

  const handleCountSessionComplete = () => {
    setSessionId("");
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (loading) {
    return (
      <main id="main-content" className="flex-1 overflow-auto">
        <div className="p-6 text-center">
          <p>Loading mobile inventory operations...</p>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="flex-1 overflow-auto">
      <div className="p-6 space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Smartphone className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Mobile Inventory Operations</h1>
          </div>
          <p className="text-muted-foreground">
            Offline-first inventory management with real-time synchronization
          </p>
        </div>

        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-4 text-sm underline hover:no-underline"
              >
                Dismiss
              </button>
            </AlertDescription>
          </Alert>
        )}

        <Card className="p-4">
          <label className="block text-sm font-medium mb-2">
            Select Outlet
          </label>
          <select
            value={outletId}
            onChange={(e) => setOutletId(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}
              </option>
            ))}
          </select>
        </Card>

        <Tabs defaultValue="count" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="count">Count</TabsTrigger>
            <TabsTrigger value="scan">Scan</TabsTrigger>
            <TabsTrigger value="transfer">Transfers</TabsTrigger>
            <TabsTrigger value="alerts">Par Levels</TabsTrigger>
          </TabsList>

          <TabsContent value="count" className="space-y-4">
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-blue-900">
                  Physical Inventory Count
                </h2>
              </div>
              <p className="text-sm text-blue-800">
                Perform offline inventory counts with real-time synchronization
              </p>
            </Card>
            {!sessionId ? (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Start a new count session to begin recording inventory
                </p>
                <button
                  onClick={handleCreateCountSession}
                  className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition"
                >
                  Start Count Session
                </button>
              </div>
            ) : (
              <MobileCountSession
                sessionId={sessionId}
                organizationId={organizationId}
                outletId={outletId}
                onSessionComplete={handleCountSessionComplete}
                onError={handleError}
              />
            )}
          </TabsContent>

          <TabsContent value="scan" className="space-y-4">
            {sessionId ? (
              <BarcodeScanner
                sessionId={sessionId}
                organizationId={organizationId}
                outletId={outletId}
                onError={handleError}
              />
            ) : (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground mb-4">
                  Create a count session first to use the barcode scanner
                </p>
                <button
                  onClick={handleCreateCountSession}
                  className="inline-block px-4 py-2 bg-primary text-white rounded hover:opacity-90 transition"
                >
                  Start Count Session
                </button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="transfer" className="space-y-4">
            <Card className="p-4 bg-purple-50 border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRightLeft className="w-5 h-5 text-purple-600" />
                <h2 className="font-semibold text-purple-900">
                  Inventory Transfers
                </h2>
              </div>
              <p className="text-sm text-purple-800">
                Create and manage transfers between outlets
              </p>
            </Card>
            <InventoryTransferManager
              organizationId={organizationId}
              outlets={outlets}
              onError={handleError}
            />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <ParLevelAlerts
              organizationId={organizationId}
              outletId={outletId}
              onError={handleError}
            />
          </TabsContent>
        </Tabs>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Features</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4">
              <div className="text-2xl mb-2">📱</div>
              <p className="text-sm font-medium">Offline First</p>
              <p className="text-xs text-muted-foreground">
                Work without connection
              </p>
            </div>
            <div className="text-center p-4">
              <div className="text-2xl mb-2">📊</div>
              <p className="text-sm font-medium">Real-time Sync</p>
              <p className="text-xs text-muted-foreground">
                Auto-sync when online
              </p>
            </div>
            <div className="text-center p-4">
              <div className="text-2xl mb-2">🔍</div>
              <p className="text-sm font-medium">Barcode Scan</p>
              <p className="text-xs text-muted-foreground">Quick item lookup</p>
            </div>
            <div className="text-center p-4">
              <div className="text-2xl mb-2">📦</div>
              <p className="text-sm font-medium">Transfers</p>
              <p className="text-xs text-muted-foreground">
                Move stock between outlets
              </p>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
