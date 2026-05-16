import React, { useState } from "react";
import { Calendar, Plus, Truck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDeliverySchedules } from "@/hooks/useReceiving";
import { logger } from "@/lib/logger";
import { formatDistanceToNow, parse } from "date-fns";
interface DeliverySchedulePanelProps {
  organizationId: string;
  vendors: Array<{ id: string; name: string }>;
}
export function DeliverySchedulePanel({
  organizationId,
  vendors,
}: DeliverySchedulePanelProps) {
  const { schedules, loading, refetch } = useDeliverySchedules(organizationId);
  const [showNewSchedule, setShowNewSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    vendor_id: "",
    scheduled_date: "",
    scheduled_time_start: "",
    scheduled_time_end: "",
    delivery_type: "standing_order",
    expected_items_count: 0,
    expected_value: 0,
    notes: "",
  });
  const handleCreateSchedule = async () => {
    if (!newSchedule.vendor_id || !newSchedule.scheduled_date) {
      alert("Please fill in required fields");
      return;
    }
    try {
      const res = await fetch("/api/receiving/delivery-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: organizationId,
          ...newSchedule,
        }),
      });
      if (!res.ok) throw new Error("Failed to create schedule");
      logger.info("Delivery schedule created successfully");
      setNewSchedule({
        vendor_id: "",
        scheduled_date: "",
        scheduled_time_start: "",
        scheduled_time_end: "",
        delivery_type: "standing_order",
        expected_items_count: 0,
        expected_value: 0,
        notes: "",
      });
      setShowNewSchedule(false);
      await refetch();
    } catch (error) {
      logger.error("Failed to create schedule:", error);
      alert("Failed to create schedule");
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in_transit":
        return "bg-amber-100 text-amber-800";
      case "arrived":
        return "bg-purple-100 text-purple-800";
      case "unloading":
        return "bg-cyan-100 text-cyan-800";
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-surface text-gray-800";
    }
  };
  return (
    <Card>
      {" "}
      <CardHeader>
        {" "}
        <div className="flex justify-between items-start">
          {" "}
          <div>
            {" "}
            <CardTitle>Delivery Schedules</CardTitle>{" "}
            <CardDescription>
              Upcoming deliveries from all vendors
            </CardDescription>{" "}
          </div>{" "}
          <Dialog open={showNewSchedule} onOpenChange={setShowNewSchedule}>
            {" "}
            <DialogTrigger asChild>
              {" "}
              <Button size="sm" className="gap-1">
                {" "}
                <Plus className="h-4 w-4" /> New Schedule{" "}
              </Button>{" "}
            </DialogTrigger>{" "}
            <DialogContent>
              {" "}
              <DialogHeader>
                {" "}
                <DialogTitle>Schedule New Delivery</DialogTitle>{" "}
                <DialogDescription>
                  {" "}
                  Create a new delivery schedule from a vendor{" "}
                </DialogDescription>{" "}
              </DialogHeader>{" "}
              <div className="space-y-4">
                {" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium">Vendor *</label>{" "}
                  <Select
                    value={newSchedule.vendor_id}
                    onValueChange={(val) =>
                      setNewSchedule({ ...newSchedule, vendor_id: val })
                    }
                  >
                    {" "}
                    <SelectTrigger>
                      {" "}
                      <SelectValue placeholder="Select vendor" />{" "}
                    </SelectTrigger>{" "}
                    <SelectContent>
                      {" "}
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {" "}
                          {v.name}{" "}
                        </SelectItem>
                      ))}{" "}
                    </SelectContent>{" "}
                  </Select>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium">
                    Scheduled Date *
                  </label>{" "}
                  <Input
                    type="date"
                    value={newSchedule.scheduled_date}
                    onChange={(e) =>
                      setNewSchedule({
                        ...newSchedule,
                        scheduled_date: e.target.value,
                      })
                    }
                  />{" "}
                </div>{" "}
                <div className="grid grid-cols-2 gap-2">
                  {" "}
                  <div>
                    {" "}
                    <label className="text-sm font-medium">
                      Start Time
                    </label>{" "}
                    <Input
                      type="time"
                      value={newSchedule.scheduled_time_start}
                      onChange={(e) =>
                        setNewSchedule({
                          ...newSchedule,
                          scheduled_time_start: e.target.value,
                        })
                      }
                    />{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <label className="text-sm font-medium">End Time</label>{" "}
                    <Input
                      type="time"
                      value={newSchedule.scheduled_time_end}
                      onChange={(e) =>
                        setNewSchedule({
                          ...newSchedule,
                          scheduled_time_end: e.target.value,
                        })
                      }
                    />{" "}
                  </div>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium">
                    Delivery Type
                  </label>{" "}
                  <Select
                    value={newSchedule.delivery_type}
                    onValueChange={(val: any) =>
                      setNewSchedule({ ...newSchedule, delivery_type: val })
                    }
                  >
                    {" "}
                    <SelectTrigger>
                      {" "}
                      <SelectValue />{" "}
                    </SelectTrigger>{" "}
                    <SelectContent>
                      {" "}
                      <SelectItem value="standing_order">
                        Standing Order
                      </SelectItem>{" "}
                      <SelectItem value="po_based">PO Based</SelectItem>{" "}
                      <SelectItem value="emergency">Emergency</SelectItem>{" "}
                      <SelectItem value="scheduled">Scheduled</SelectItem>{" "}
                    </SelectContent>{" "}
                  </Select>{" "}
                </div>{" "}
                <div className="grid grid-cols-2 gap-2">
                  {" "}
                  <div>
                    {" "}
                    <label className="text-sm font-medium">
                      Expected Items
                    </label>{" "}
                    <Input
                      type="number"
                      value={newSchedule.expected_items_count}
                      onChange={(e) =>
                        setNewSchedule({
                          ...newSchedule,
                          expected_items_count: parseInt(e.target.value) || 0,
                        })
                      }
                    />{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <label className="text-sm font-medium">
                      Expected Value
                    </label>{" "}
                    <Input
                      type="number"
                      step="0.01"
                      value={newSchedule.expected_value}
                      onChange={(e) =>
                        setNewSchedule({
                          ...newSchedule,
                          expected_value: parseFloat(e.target.value) || 0,
                        })
                      }
                    />{" "}
                  </div>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium">Notes</label>{" "}
                  <Input
                    placeholder="Special instructions..."
                    value={newSchedule.notes}
                    onChange={(e) =>
                      setNewSchedule({ ...newSchedule, notes: e.target.value })
                    }
                  />{" "}
                </div>{" "}
                <Button onClick={handleCreateSchedule} className="w-full">
                  {" "}
                  Create Schedule{" "}
                </Button>{" "}
              </div>{" "}
            </DialogContent>{" "}
          </Dialog>{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent>
        {" "}
        {loading ? (
          <div className="text-center py-4">Loading schedules...</div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            {" "}
            No schedules found{" "}
          </div>
        ) : (
          <div className="space-y-2">
            {" "}
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-surface"
              >
                {" "}
                <div className="flex items-center gap-3 flex-1">
                  {" "}
                  <Truck className="h-5 w-5 text-gray-400" />{" "}
                  <div className="flex-1">
                    {" "}
                    <p className="font-medium">
                      {" "}
                      {schedule.vendors?.name || "Unknown Vendor"}{" "}
                    </p>{" "}
                    <p className="text-sm text-muted-foreground">
                      {" "}
                      {new Date(
                        schedule.scheduled_date,
                      ).toLocaleDateString()}{" "}
                      at{""} {schedule.scheduled_time_start || "TBD"}{" "}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <Badge className={getStatusColor(schedule.status)}>
                    {" "}
                    {schedule.status.replace(/_/g, "")}{" "}
                  </Badge>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>
        )}{" "}
      </CardContent>{" "}
    </Card>
  );
}
