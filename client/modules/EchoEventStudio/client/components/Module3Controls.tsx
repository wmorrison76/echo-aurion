import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { initModulePack3 } from "@/lib/initModulePack3";
import { OutlinerPanel } from "@/panels/OutlinerPanel";
import { VariantsPanel } from "@/panels/VariantsPanel";
import { EventStudioPanel } from "@/panels/EventStudioPanel";
import { SnapBar, type SnapBarProps } from "@/components/SnapBar";
import { ScopeKPI } from "@/components/ScopeKPI";
import { useScopeKPIs } from "@/hooks/useScopeKPIs";
export interface Module3ControlsProps {
  session?: string;
  onSnapChange?: (settings: {
    grid: boolean;
    angle: boolean;
    object: boolean;
  }) => void;
}
export function Module3Controls({
  session = "P66_DiningRoom",
  onSnapChange,
}: Module3ControlsProps) {
  const [initialized, setInitialized] = useState(false);
  const kpis = useScopeKPIs(session);
  useEffect(() => {
    if (!initialized) {
      initModulePack3();
      setInitialized(true);
    }
  }, [initialized]);
  return (
    <Card className="w-full">
      {" "}
      <CardHeader className="py-3">
        {" "}
        <CardTitle className="text-sm">Module Pack 3 Controls</CardTitle>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-4">
        {" "}
        {/* Snap Bar */}{" "}
        <div className="space-y-2">
          {" "}
          <div className="text-xs font-semibold">Snapping</div>{" "}
          <SnapBar
            grid={true}
            angle={true}
            object={false}
            onChange={onSnapChange}
          />{" "}
        </div>{" "}
        {/* Tabs for different panels */}{" "}
        <Tabs defaultValue="outliner" className="w-full">
          {" "}
          <TabsList className="grid w-full grid-cols-3 h-8">
            {" "}
            <TabsTrigger value="outliner" className="text-xs">
              {" "}
              Outliner{" "}
            </TabsTrigger>{" "}
            <TabsTrigger value="variants" className="text-xs">
              {" "}
              Variants{" "}
            </TabsTrigger>{" "}
            <TabsTrigger value="events" className="text-xs">
              {" "}
              Events{" "}
            </TabsTrigger>{" "}
          </TabsList>{" "}
          <TabsContent value="outliner" className="mt-2">
            {" "}
            <OutlinerPanel />{" "}
          </TabsContent>{" "}
          <TabsContent value="variants" className="mt-2">
            {" "}
            <VariantsPanel />{" "}
          </TabsContent>{" "}
          <TabsContent value="events" className="mt-2">
            {" "}
            <EventStudioPanel session={session} />{" "}
          </TabsContent>{" "}
        </Tabs>{" "}
        {/* KPI Display */}{" "}
        {kpis && (
          <div className="pt-2 border-t">
            {" "}
            <ScopeKPI data={kpis} />{" "}
          </div>
        )}{" "}
        {/* Service Worker Status */}{" "}
        <div className="pt-2 border-t text-xs text-muted-foreground">
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <div className="w-2 h-2 rounded-full bg-green-500" /> Service
            Worker: {initialized ? "Ready" : "Initializing..."}{" "}
          </div>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
