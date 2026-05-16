import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BanquetMenuManager from "../components/BanquetMenuManager";
import EchoAIOrchestrator from "../components/EchoAIOrchestrator";
import MultiEventCoordinator from "../components/MultiEventCoordinator";
import BanquetPrepListGenerator from "../components/BanquetPrepListGenerator";
import BanquetOrderCombiner from "../components/BanquetOrderCombiner";
import BanquetStaffScheduler from "../components/BanquetStaffScheduler";
import AITransparencyDashboard from "../components/AITransparencyDashboard";
import BanquetOperationsDashboard from "../components/BanquetOperationsDashboard";
interface MaestroBanquetsDashboardProps {
  onClose?: () => void;
  onMinimize?: () => void;
}
export default function MaestroBanquetsDashboard({
  onClose,
  onMinimize,
}: MaestroBanquetsDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  return (
    <div className="h-full w-full flex flex-col bg-background">
      {" "}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="h-full flex flex-col"
      >
        {" "}
        <TabsList className="mx-4 mt-4">
          {" "}
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>{" "}
          <TabsTrigger value="menu">Menu Manager</TabsTrigger>{" "}
          <TabsTrigger value="orchestrator">EchoAI^3</TabsTrigger>{" "}
          <TabsTrigger value="coordinator">Multi-Event</TabsTrigger>{" "}
          <TabsTrigger value="prep">Prep Lists</TabsTrigger>{" "}
          <TabsTrigger value="orders">Orders</TabsTrigger>{" "}
          <TabsTrigger value="staff">Staff</TabsTrigger>{" "}
          <TabsTrigger value="transparency">AI Transparency</TabsTrigger>{" "}
        </TabsList>{" "}
        <TabsContent value="dashboard" className="flex-1 overflow-auto">
          {" "}
          <BanquetOperationsDashboard />{" "}
        </TabsContent>{" "}
        <TabsContent value="menu" className="flex-1 overflow-auto">
          {" "}
          <BanquetMenuManager />{" "}
        </TabsContent>{" "}
        <TabsContent value="orchestrator" className="flex-1 overflow-auto">
          {" "}
          <EchoAIOrchestrator />{" "}
        </TabsContent>{" "}
        <TabsContent value="coordinator" className="flex-1 overflow-auto">
          {" "}
          <MultiEventCoordinator />{" "}
        </TabsContent>{" "}
        <TabsContent value="prep" className="flex-1 overflow-auto">
          {" "}
          <BanquetPrepListGenerator />{" "}
        </TabsContent>{" "}
        <TabsContent value="orders" className="flex-1 overflow-auto">
          {" "}
          <BanquetOrderCombiner />{" "}
        </TabsContent>{" "}
        <TabsContent value="staff" className="flex-1 overflow-auto">
          {" "}
          <BanquetStaffScheduler />{" "}
        </TabsContent>{" "}
        <TabsContent value="transparency" className="flex-1 overflow-auto">
          {" "}
          <AITransparencyDashboard />{" "}
        </TabsContent>{" "}
      </Tabs>{" "}
    </div>
  );
}
