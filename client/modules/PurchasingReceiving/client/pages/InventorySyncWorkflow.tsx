import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import {
  OutletInventoryPanel,
  ParLevelManager,
  AlertsPanel,
  TransfersPanel,
  InventorySnapshotPanel,
} from "@/components/inventory/sync-index";
import {
  Boxes,
  AlertTriangle,
  Settings,
  ArrowRightLeft,
  BarChart3,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { useMultiOutlet } from "@/context/MultiOutletContext";
import { Store } from "@/modules/PurchasingReceiving/client/lib/store";

export default function InventorySyncWorkflow() {
  const { currentOutlet, organization } = useMultiOutlet();
  const [activeTab, setActiveTab] = useState("inventory");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    Store.ensureOutletByName("Main Kitchen");
    Store.ensureOutletByName("Banquets");
    Store.ensureOutletByName("Production");
    Store.ensureOutletByName("Pastry");
    Store.ensureOutletByName("FOH");
    Store.ensureOutletByName("BOH");
    Store.ensureOutletByName("Commissary");
  }, []);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      setTimeout(() => {
        setRefreshing(false);
      }, 1000);
    } catch (error) {
      console.error("Error refreshing data:", error);
      setRefreshing(false);
    }
  };

  if (!currentOutlet || !organization) {
    return (
      <AppLayout title="Multi-Outlet Inventory Sync">
        <main id="main-content" className="space-y-6 p-6">
          <Card>
            <CardHeader>
              <CardTitle>No Outlet Selected</CardTitle>
              <CardDescription>
                Please select an outlet to view inventory data
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Multi-Outlet Inventory Sync">
      <main id="main-content" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Boxes className="w-4 h-4" /> Current Outlet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{currentOutlet.name}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {currentOutlet.short_code}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{organization.name}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {organization.outlets?.length || 0} outlets
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Sync Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-green-600">Active</div>
              <p className="text-xs text-muted-foreground mt-1">
                Real-time updates
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Last Updated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Now</div>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date().toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Inventory Management</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Real-time inventory tracking, par levels, alerts, and
                inter-outlet transfers
              </p>
            </div>
            <Button
              onClick={handleRefreshAll}
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh All"}
            </Button>
          </div>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="inventory" className="gap-2">
                <Boxes className="w-4 h-4" />
                <span className="hidden sm:inline">Inventory</span>
              </TabsTrigger>
              <TabsTrigger value="par-levels" className="gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Par Levels</span>
              </TabsTrigger>
              <TabsTrigger value="alerts" className="gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="hidden sm:inline">Alerts</span>
              </TabsTrigger>
              <TabsTrigger value="transfers" className="gap-2">
                <ArrowRightLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Transfers</span>
              </TabsTrigger>
              <TabsTrigger value="snapshots" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Snapshots</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="inventory" className="space-y-6">
              <OutletInventoryPanel outletId={currentOutlet.id} />
            </TabsContent>
            <TabsContent value="par-levels" className="space-y-6">
              <ParLevelManager outletId={currentOutlet.id} />
            </TabsContent>
            <TabsContent value="alerts" className="space-y-6">
              <AlertsPanel outletId={currentOutlet.id} />
            </TabsContent>
            <TabsContent value="transfers" className="space-y-6">
              <TransfersPanel
                organizationId={organization.id}
                currentOutletId={currentOutlet.id}
              />
            </TabsContent>
            <TabsContent value="snapshots" className="space-y-6">
              <InventorySnapshotPanel outletId={currentOutlet.id} />
            </TabsContent>
          </Tabs>
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">
              About Multi-Outlet Inventory Sync
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              <strong>Real-time Synchronization:</strong> All inventory changes
              are automatically synced across your organization in real-time.
            </p>
            <p>
              <strong>Par Level Management:</strong> Configure minimum, maximum,
              and reorder levels for each product at each outlet.
            </p>
            <p>
              <strong>Smart Alerts:</strong> Receive automatic alerts for stock
              shortages, overstocks, and inventory variances.
            </p>
            <p>
              <strong>Inter-Outlet Transfers:</strong> Easily transfer inventory
              between outlets with automatic tracking and reconciliation.
            </p>
            <p>
              <strong>Inventory Snapshots:</strong> Take manual snapshots for
              audit trails and historical variance analysis.
            </p>
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
}
