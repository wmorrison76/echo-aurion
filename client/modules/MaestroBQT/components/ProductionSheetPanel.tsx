import React from "react";
import type { ProductionSheet } from "@/../shared/types/production";
import { osBus } from "@/lib/os-bus";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

interface ProductionSheetPanelProps {
  sheets?: ProductionSheet[];
  eventId?: string | null;
  beoId?: string | null;
}

export default function ProductionSheetPanel({
  sheets: externalSheets,
  eventId,
  beoId,
}: ProductionSheetPanelProps) {
  const [busSheets, setBusSheets] = React.useState<ProductionSheet[]>([]);
  const [activeStation, setActiveStation] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsubscribe = osBus.on("production:generated", (payload) => {
      const incomingSheets = payload.sheets || [];
      setBusSheets(incomingSheets);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const filteredSheets = React.useMemo(() => {
    const base = externalSheets?.length ? externalSheets : busSheets;
    if (!base.length) return [];
    return base.filter((sheet) => {
      if (eventId && sheet.eventId !== eventId) return false;
      if (beoId && sheet.beoId !== beoId) return false;
      return true;
    });
  }, [externalSheets, busSheets, eventId, beoId]);

  React.useEffect(() => {
    if (!filteredSheets.length) return;
    const station = filteredSheets[0].station;
    setActiveStation((prev) => prev ?? station);
  }, [filteredSheets]);

  if (!filteredSheets.length) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-8 w-8 text-slate-400" />
          <p className="text-sm text-slate-500">
            No production sheets generated yet.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Generate a BEO to create production sheets.
          </p>
        </div>
      </div>
    );
  }

  const stations = Array.from(
    new Set(filteredSheets.map((s) => s.station)),
  ).sort();
  const activeSheet = filteredSheets.find((s) => s.station === activeStation);

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border/30 p-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            Production Sheets
          </h2>
          <p className="text-xs text-foreground/60">
            Station-specific prep lists from banquet orders
          </p>
        </div>
      </div>

      {/* Tabs and Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs
          value={activeStation || stations[0]}
          onValueChange={setActiveStation}
          className="h-full flex flex-col"
        >
          <TabsList className="h-auto w-full justify-start rounded-none border-b border-border/30 bg-transparent p-0">
            {stations.map((station) => (
              <TabsTrigger
                key={station}
                value={station}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                {station}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Sheet Content */}
          {activeSheet && (
            <TabsContent
              value={activeSheet.station}
              className="flex-1 overflow-auto border-0 p-4"
            >
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="px-0 pt-0 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {activeSheet.station} Kitchen
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {activeSheet.eventTitle}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">Rev {activeSheet.revision}</Badge>
                  </div>
                  <div className="text-xs text-foreground/60 mt-3">
                    <span>{activeSheet.outletName}</span>
                    {activeSheet.eventDate && (
                      <>
                        <span className="mx-2">•</span>
                        <span>
                          {new Date(activeSheet.eventDate).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="px-0">
                  {activeSheet.items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/30 text-left text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                            <th className="pb-3 pr-4">Item</th>
                            <th className="pb-3 pr-4 text-right w-20">
                              Quantity
                            </th>
                            <th className="pb-3 pr-4 text-right w-24">Unit</th>
                            <th className="pb-3 pr-4 text-right w-32">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeSheet.items.map((item, idx) => (
                            <tr
                              key={item.itemId}
                              className="border-b border-border/10 hover:bg-muted/30 transition-colors"
                            >
                              <td className="py-3 pr-4 font-medium text-foreground">
                                {item.itemName}
                              </td>
                              <td className="py-3 pr-4 text-right text-foreground">
                                {item.quantity}
                              </td>
                              <td className="py-3 pr-4 text-right text-foreground/70 text-xs">
                                {item.unit}
                              </td>
                              <td className="py-3 pr-4 text-right text-foreground/50 text-xs">
                                {item.notes || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-foreground/60">
                      No items for this station.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
