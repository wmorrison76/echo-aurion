import React, { useCallback, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FloatingPanelWrapper } from "@/components/floating-panels/FloatingPanelWrapper";
import { DeviceManagementPanel } from "@/components/hardware/DeviceManagementPanel";
import { SensorMonitoringPanel } from "@/components/hardware/SensorMonitoringPanel";
import { IoTAlertManagementPanel } from "@/components/hardware/IoTAlertManagementPanel";
import { RFIDTagManagementPanel } from "@/components/hardware/RFIDTagManagementPanel";
import { ScannerPanel } from "@/components/hardware/ScannerPanel";
import type { PanelInitConfig, DataChangeEvent } from "@shared/types/panel";
interface HardwarePageProps extends Partial<PanelInitConfig> {
  defaultTab?: "devices" | "sensors" | "alerts" | "rfid" | "scanner";
}
export default function Hardware({
  defaultTab = "devices",
  organizationId,
  outletId,
  panelId = "hardware-main",
  onDataChange,
  onClose,
  onMinimize,
  onError,
  emit,
  className,
}: HardwarePageProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const handleDataChange = useCallback(
    (
      changeType: string,
      data: Record<string, any>,
      operation: "create" | "update" | "delete",
    ) => {
      const event: DataChangeEvent = {
        type: "dataChange",
        source: "hardware",
        panelId,
        timestamp: new Date(),
        payload: { changeType, data, operation },
      };
      if (emit) {
        emit("dataChange", event);
      }
      if (onDataChange) {
        onDataChange(event);
      }
    },
    [panelId, emit, onDataChange],
  );
  const handleError = useCallback(
    (errorMsg: string) => {
      setError(errorMsg);
      if (onError) {
        onError(new Error(errorMsg));
      }
    },
    [onError],
  );
  const handleMinimize = useCallback(() => {
    setIsMinimized(!isMinimized);
    if (onMinimize) {
      onMinimize(!isMinimized);
    }
  }, [isMinimized, onMinimize]);
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);
  const panelConfig = {
    panelId,
    title: "Hardware & IoT Management",
    organizationId,
    outletId,
    canMinimize: true,
    canClose: true,
  };
  return (
    <AppLayout>
      {" "}
      <FloatingPanelWrapper
        config={panelConfig}
        module="hardware"
        isMinimized={isMinimized}
        error={error}
        isLoading={isLoading}
        wrapperClassName={className}
        contentHeight="calc(100vh - 200px)"
      >
        {" "}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {" "}
          <TabsList className="grid w-full grid-cols-5">
            {" "}
            <TabsTrigger value="devices">Devices</TabsTrigger>{" "}
            <TabsTrigger value="sensors">Sensors</TabsTrigger>{" "}
            <TabsTrigger value="alerts">Alerts</TabsTrigger>{" "}
            <TabsTrigger value="rfid">RFID Tags</TabsTrigger>{" "}
            <TabsTrigger value="scanner">Scanner</TabsTrigger>{" "}
          </TabsList>{" "}
          <TabsContent value="devices" className="space-y-4">
            {" "}
            <DeviceManagementPanel
              organizationId={organizationId}
              outletId={outletId}
              onDataChange={handleDataChange}
              onError={handleError}
            />{" "}
          </TabsContent>{" "}
          <TabsContent value="sensors" className="space-y-4">
            {" "}
            <SensorMonitoringPanel
              organizationId={organizationId}
              outletId={outletId}
              onDataChange={handleDataChange}
              onError={handleError}
            />{" "}
          </TabsContent>{" "}
          <TabsContent value="alerts" className="space-y-4">
            {" "}
            <IoTAlertManagementPanel
              organizationId={organizationId}
              outletId={outletId}
              onDataChange={handleDataChange}
              onError={handleError}
            />{" "}
          </TabsContent>{" "}
          <TabsContent value="rfid" className="space-y-4">
            {" "}
            <RFIDTagManagementPanel
              organizationId={organizationId}
              outletId={outletId}
              onDataChange={handleDataChange}
              onError={handleError}
            />{" "}
          </TabsContent>{" "}
          <TabsContent value="scanner" className="space-y-4">
            {" "}
            <ScannerPanel
              organizationId={organizationId}
              outletId={outletId}
              onDataChange={handleDataChange}
              onError={handleError}
            />{" "}
          </TabsContent>{" "}
        </Tabs>{" "}
      </FloatingPanelWrapper>{" "}
    </AppLayout>
  );
}
