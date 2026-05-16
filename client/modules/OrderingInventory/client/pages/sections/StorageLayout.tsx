import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout } from "lucide-react";
import StorageBlueprint from "../../components/storage/StorageBlueprint";
import StorageWalkthrough3D from "../../components/storage/StorageWalkthrough3D";
import { Store } from "@/modules/PurchasingReceiving/client/lib/store";
import { StorageDesigner } from "@/modules/PurchasingReceiving/client/components/inventory/StorageDesigner";

export default function StorageLayout() {
  const [outlets, setOutlets] = useState(() => Store.listOutlets());
  const [selectedOutlet, setSelectedOutlet] = useState<string>("");

  useEffect(() => {
    const next = Store.listOutlets();
    setOutlets(next);
    if (next.length && !selectedOutlet) {
      setSelectedOutlet(next[0].id);
    }
  }, [selectedOutlet]);

  const outletOptions = useMemo(
    () => outlets.map((outlet) => ({ value: outlet.id, label: outlet.name })),
    [outlets],
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Layout className="w-6 h-6 text-primary" />
            Storage Layout
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Map rooms, racks, and bins with 2D + 3D spatial context.
          </p>
        </div>
        <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select Outlet" />
          </SelectTrigger>
          <SelectContent>
            {outletOptions.map((outlet) => (
              <SelectItem key={outlet.value} value={outlet.value}>
                {outlet.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedOutlet ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layout className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              Select an outlet to view and configure storage layout.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="designer" className="space-y-4">
          <TabsList>
            <TabsTrigger value="designer">Designer</TabsTrigger>
            <TabsTrigger value="blueprint">2D Blueprint</TabsTrigger>
            <TabsTrigger value="walkthrough">3D Walkthrough</TabsTrigger>
          </TabsList>

          <TabsContent value="designer">
            <Card>
              <CardHeader>
                <CardTitle>Storage designer</CardTitle>
                <CardDescription>
                  Define areas, racks, and bins with product assignments.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StorageDesigner />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blueprint">
            <Card>
              <CardHeader>
                <CardTitle>2D blueprint + measurement tools</CardTitle>
                <CardDescription>
                  Drag areas and racks, annotate measurements, and print bin
                  labels.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StorageBlueprint outletId={selectedOutlet} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="walkthrough">
            <Card>
              <CardHeader>
                <CardTitle>3D walkthrough</CardTitle>
                <CardDescription>
                  Navigate storage rooms and inspect rack placement in 3D.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StorageWalkthrough3D outletId={selectedOutlet} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
