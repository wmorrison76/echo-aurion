import React from "react";
import { useMultiOutlet } from "@/context/MultiOutletContext";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IoTDeviceManagementPanel } from "@/components/hardware/IoTDeviceManagementPanel";
import { SensorMonitoringPanel } from "@/components/hardware/SensorMonitoringPanel";
import { IoTAlertManagementPanel } from "@/components/hardware/IoTAlertManagementPanel";
export default function IoTDashboardPage() {
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
    <AppLayout title="IoT & Real-Time Monitoring Dashboard">
      {" "}
      <div className="space-y-6">
        {" "}
        {/* Page Header */}{" "}
        <div>
          {" "}
          <h1 className="text-3xl font-bold">
            IoT & Real-Time Monitoring
          </h1>{" "}
          <p className="text-gray-300 dark:text-gray-300 mt-2">
            {" "}
            Monitor RFID devices, sensor readings, spoilage risks, and alerts in
            real-time{" "}
          </p>{" "}
        </div>{" "}
        {/* Tab Navigation */}{" "}
        <Tabs defaultValue="devices" className="w-full">
          {" "}
          <TabsList className="grid w-full grid-cols-3">
            {" "}
            <TabsTrigger value="devices">Devices & Health</TabsTrigger>{" "}
            <TabsTrigger value="sensors">Sensor Monitoring</TabsTrigger>{" "}
            <TabsTrigger value="alerts">Alerts & Rules</TabsTrigger>{" "}
          </TabsList>{" "}
          {/* Devices Tab */}{" "}
          <TabsContent value="devices" className="space-y-4">
            {" "}
            <IoTDeviceManagementPanel
              organizationId={organization.id}
              outletId={currentOutlet.id}
            />{" "}
          </TabsContent>{" "}
          {/* Sensors Tab */}{" "}
          <TabsContent value="sensors" className="space-y-4">
            {" "}
            <SensorMonitoringPanel
              organizationId={organization.id}
              outletId={currentOutlet.id}
            />{" "}
          </TabsContent>{" "}
          {/* Alerts Tab */}{" "}
          <TabsContent value="alerts" className="space-y-4">
            {" "}
            <IoTAlertManagementPanel
              organizationId={organization.id}
              outletId={currentOutlet.id}
            />{" "}
          </TabsContent>{" "}
        </Tabs>{" "}
      </div>{" "}
    </AppLayout>
  );
}
