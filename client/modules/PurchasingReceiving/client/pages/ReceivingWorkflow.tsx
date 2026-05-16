import React, { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { RoleGuard } from "@/context/AuthContext";
import { useMultiOutlet } from "@/context/MultiOutletContext";
import { useAuth } from "@/context/AuthContext";
import {
  DeliverySchedulePanel,
  ItemCheckinForm,
  HACCPCheckForm,
  ReceivingDiscrepanciesPanel,
} from "@/components/receiving";
import { TurtleLoader } from "@/components/TurtleLoader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useVendors } from "@/hooks/useVendors";
import {
  useShipments,
  useDeliverySchedules,
  useReceivingSummary,
} from "@/hooks/useReceiving";
import { Truck, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { logger } from "@/lib/logger"; // Lazy load heavy components
const ReceivingPanel = lazy(() =>
  import("@modules/PurchRec/components/ReceivingPanel").then((mod) => ({
    default: mod.ReceivingPanel,
  })),
);
export default function ReceivingWorkflow() {
  const { organization, currentOutlet } = useMultiOutlet();
  const { user } = useAuth();
  const { vendors } = useVendors();
  const [activeTab, setActiveTab] = useState("schedule");
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(
    null,
  );
  const [checkinStatus, setCheckinStatus] = useState<Record<string, boolean>>(
    {},
  ); // Fetch data const { schedules, loading: schedulesLoading } = useDeliverySchedules( organization?.id ||"" ); const { shipments, loading: shipmentsLoading } = useShipments( organization?.id ||"","arrived" ); if (!organization || !currentOutlet || !user) { return ( <AppLayout> <div className="flex justify-center items-center h-96"> <p className="text-gray-300">Organization not found</p> </div> </AppLayout> ); } const activeShipment = selectedShipmentId ? shipments.find((s) => s.id === selectedShipmentId) : null; const todayDeliveries = schedules.filter((s) => { const date = new Date(s.scheduled_date); const today = new Date(); return ( date.toDateString() === today.toDateString() && ["in_transit","arrived","unloading","completed"].includes(s.status) ); }); const pendingCheckins = Object.values(checkinStatus).filter( (v) => !v ).length; return ( <AppLayout title="Receiving & Delivery Workflow"> <main id="main-content" className="space-y-6"> {/* Page Header */} <div> <h1 className="text-3xl font-bold">Receiving & Delivery Workflow</h1> <p className="text-gray-300 mt-2"> Manage deliveries, verify HACCP standards, and check items for {currentOutlet.name} </p> </div> {/* Key Metrics */} <div className="grid grid-cols-1 md:grid-cols-4 gap-3"> <Card> <CardHeader className="pb-2"> <CardTitle className="text-sm font-medium text-gray-400"> Today's Deliveries </CardTitle> </CardHeader> <CardContent> <div className="text-3xl font-bold">{todayDeliveries.length}</div> <p className="text-xs text-muted-foreground mt-1"> {todayDeliveries.filter((d) => d.status ==="in_transit").length} in transit </p> </CardContent> </Card> <Card> <CardHeader className="pb-2"> <CardTitle className="text-sm font-medium text-gray-400"> Pending Check-Ins </CardTitle> </CardHeader> <CardContent> <div className="text-3xl font-bold text-amber-600">{pendingCheckins}</div> <p className="text-xs text-muted-foreground mt-1">Outlets awaiting confirmation</p> </CardContent> </Card> <Card> <CardHeader className="pb-2"> <CardTitle className="text-sm font-medium text-gray-400"> HACCP Passed </CardTitle> </CardHeader> <CardContent> <div className="text-3xl font-bold text-green-600"> {shipments.filter((s) => s.status ==="unloading").length} </div> <p className="text-xs text-muted-foreground mt-1">Ready for check-in</p> </CardContent> </Card> <Card> <CardHeader className="pb-2"> <CardTitle className="text-sm font-medium text-gray-400"> This Week </CardTitle> </CardHeader> <CardContent> <div className="text-3xl font-bold">{schedules.length}</div> <p className="text-xs text-muted-foreground mt-1">Scheduled deliveries</p> </CardContent> </Card> </div> {/* Main Workflow Tabs */} <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full"> <TabsList className="grid w-full grid-cols-5"> <TabsTrigger value="schedule"> 📅 Schedule </TabsTrigger> <TabsTrigger value="shipping"> 🚚 Shipping </TabsTrigger> <TabsTrigger value="haccp"> ✓ HACCP </TabsTrigger> <TabsTrigger value="checkin"> 📦 Check-In </TabsTrigger> <TabsTrigger value="discrepancies"> ⚠️ Issues </TabsTrigger> </TabsList> {/* Schedule Tab */} <TabsContent value="schedule" className="space-y-4"> <DeliverySchedulePanel organizationId={organization.id} vendors={vendors} /> </TabsContent> {/* Shipping Tab */} <TabsContent value="shipping" className="space-y-4"> <Card> <CardHeader> <CardTitle>Active Shipments</CardTitle> <CardDescription> Trucks in transit and ready for receiving </CardDescription> </CardHeader> <CardContent> {shipmentsLoading ? ( <TurtleLoader /> ) : shipments.length === 0 ? ( <Alert> <AlertDescription> No active shipments. Check schedule for upcoming deliveries. </AlertDescription> </Alert> ) : ( <div className="space-y-2"> {shipments.map((shipment) => ( <div key={shipment.id} className={`p-4 border rounded-lg cursor-pointer transition-colors ${ selectedShipmentId === shipment.id ?"bg-blue-50 border-primary" :"hover:bg-surface" }`} onClick={() => setSelectedShipmentId(shipment.id)} > <div className="flex items-center justify-between"> <div className="flex items-center gap-3"> <Truck className="h-5 w-5 text-gray-400" /> <div> <p className="font-medium"> Truck {shipment.truck_number ||"TBD"} </p> <p className="text-sm text-muted-foreground"> Driver: {shipment.driver_name ||"Unknown"} </p> </div> </div> <Badge variant="outline"> {shipment.status.replace(/_/g,"")} </Badge> </div> </div> ))} </div> )} </CardContent> </Card> </TabsContent> {/* HACCP Tab */} <TabsContent value="haccp" className="space-y-4"> {activeShipment ? ( <HACCPCheckForm shipmentId={activeShipment.id} organizationId={organization.id} currentUserId={user.id} onCheckComplete={(passed) => { logger.info( `HACCP check ${passed ?"passed" :"failed"} for shipment` ); if (passed) { setActiveTab("checkin"); } }} /> ) : ( <Alert> <AlertDescription> Select a shipment from the Shipping tab to perform HACCP checks. </AlertDescription> </Alert> )} </TabsContent> {/* Check-In Tab */} <TabsContent value="checkin" className="space-y-4"> {activeShipment ? ( <div className="space-y-4"> <Alert className="bg-blue-50 border-blue-200"> <AlertDescription className="text-blue-800"> Checking in items for: <strong>{currentOutlet.name}</strong> </AlertDescription> </Alert> <Card> <CardHeader> <CardTitle>Item Check-In</CardTitle> <CardDescription> Scan barcodes or manually enter items. Shorts and damage will be automatically tracked. </CardDescription> </CardHeader> <CardContent> <ItemCheckinForm shipmentId={activeShipment.id} outletId={currentOutlet.id} organizationId={organization.id} currentUserId={user.id} onItemsCheckedIn={(count) => { logger.info(`${count} items checked in`); setCheckinStatus((prev) => ({ ...prev, [currentOutlet.id]: true, })); }} /> </CardContent> </Card> </div> ) : ( <Alert> <AlertDescription> Select a shipment that has passed HACCP checks to begin item check-in. </AlertDescription> </Alert> )} </TabsContent> {/* Discrepancies Tab */} <TabsContent value="discrepancies" className="space-y-4"> <ReceivingDiscrepanciesPanel organizationId={organization.id} currentUserId={user.id} /> </TabsContent> </Tabs> {/* Advanced Receiving Panel (Lazy Loaded) */} <Suspense fallback={<TurtleLoader />}> <ReceivingPanel /> </Suspense> </main> </AppLayout> );
}
