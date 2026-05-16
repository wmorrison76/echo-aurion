import React from "react";
import { useMultiOutlet } from "@/context/MultiOutletContext";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WasteLogsPanel } from "@/components/waste/WasteLogsPanel";
import { WasteCostAnalysisPanel } from "@/components/waste/WasteCostAnalysisPanel";
import { WastePreventionPanel } from "@/components/waste/WastePreventionPanel";
import { DisposalTrackingPanel } from "@/components/waste/DisposalTrackingPanel";
export default function WasteTrackingPage() {
  const { organization, currentOutlet } = useMultiOutlet();
  if (!organization || !currentOutlet) {
    return (
      <AppLayout>
        {" "}
        <div className="flex justify-center items-center h-96">
          {" "}
          <p className="text-gray-300">Organization not found</p>{" "}
        </div>{" "}
      </AppLayout>
    );
  }
  return (
    <AppLayout title="Waste Tracking & Cost Optimization">
      {" "}
      <div className="space-y-6">
        {" "}
        {/* Page Header */}{" "}
        <div>
          {" "}
          <h1 className="text-3xl font-bold">
            {" "}
            Waste Tracking & Cost Optimization{" "}
          </h1>{" "}
          <p className="text-gray-300 dark:text-gray-300 mt-2">
            {" "}
            Track waste, analyze costs, monitor disposal, and implement
            prevention strategies{" "}
          </p>{" "}
        </div>{" "}
        {/* Tab Navigation */}{" "}
        <Tabs defaultValue="logs" className="w-full">
          {" "}
          <TabsList className="grid w-full grid-cols-4">
            {" "}
            <TabsTrigger value="logs">Waste Logs</TabsTrigger>{" "}
            <TabsTrigger value="analysis">Cost Analysis</TabsTrigger>{" "}
            <TabsTrigger value="prevention">Prevention & ROI</TabsTrigger>{" "}
            <TabsTrigger value="disposal">
              Disposal & Compliance
            </TabsTrigger>{" "}
          </TabsList>{" "}
          {/* Waste Logs Tab */}{" "}
          <TabsContent value="logs" className="space-y-4">
            {" "}
            <WasteLogsPanel
              organizationId={organization.id}
              outletId={currentOutlet.id}
            />{" "}
          </TabsContent>{" "}
          {/* Cost Analysis Tab */}{" "}
          <TabsContent value="analysis" className="space-y-4">
            {" "}
            <WasteCostAnalysisPanel
              organizationId={organization.id}
              outletId={currentOutlet.id}
            />{" "}
          </TabsContent>{" "}
          {/* Prevention & ROI Tab */}{" "}
          <TabsContent value="prevention" className="space-y-4">
            {" "}
            <WastePreventionPanel
              organizationId={organization.id}
              outletId={currentOutlet.id}
            />{" "}
          </TabsContent>{" "}
          {/* Disposal & Compliance Tab */}{" "}
          <TabsContent value="disposal" className="space-y-4">
            {" "}
            <DisposalTrackingPanel
              organizationId={organization.id}
              outletId={currentOutlet.id}
            />{" "}
          </TabsContent>{" "}
        </Tabs>{" "}
      </div>{" "}
    </AppLayout>
  );
}
