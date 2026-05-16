import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";

interface ScheduleData {
  eventDate: string;
  eventTime: string;
  deliveryDate: string;
  deliveryTime: string;
  setupTime: string;
  prepStartDate: string;
}

interface DeliverySchedulerProps {
  eventDate?: string;
  tiersCount: number;
  complexity: "simple" | "intricate";
  onScheduleChange?: (schedule: ScheduleData) => void;
}

const PREP_TIME_LOOKUP: Record<string, Record<number, number>> = {
  simple: { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 }, // hours
  intricate: { 1: 4, 2: 6, 3: 8, 4: 10, 5: 12 },
};

const DELIVERY_LEAD_DAYS = 2;

export default function DeliveryScheduler({
  eventDate,
  tiersCount,
  complexity,
  onScheduleChange,
}: DeliverySchedulerProps) {
  const [schedule, setSchedule] = useState<ScheduleData>({
    eventDate: eventDate || "",
    eventTime: "18:00",
    deliveryDate: "",
    deliveryTime: "14:00",
    setupTime: "2",
    prepStartDate: "",
  });

  const prepHours = useMemo(() => {
    const tiers = Math.min(tiersCount, 5);
    return PREP_TIME_LOOKUP[complexity]?.[tiers] || 4;
  }, [tiersCount, complexity]);

  const calculateDates = (event: string) => {
    if (!event) return;

    const eventObj = new Date(event);

    // Delivery date: 1 day before event
    const deliveryObj = new Date(eventObj);
    deliveryObj.setDate(deliveryObj.getDate() - 1);

    // Prep start: subtract prep hours from delivery
    const prepObj = new Date(deliveryObj);
    prepObj.setHours(prepObj.getHours() - prepHours);

    const format = (d: Date) => d.toISOString().split("T")[0];

    setSchedule((prev) => ({
      ...prev,
      eventDate: event,
      deliveryDate: format(deliveryObj),
      prepStartDate: format(prepObj),
    }));
  };

  const handleChange = (key: keyof ScheduleData, value: string) => {
    const updated = { ...schedule, [key]: value };
    setSchedule(updated);
    onScheduleChange?.(updated);
  };

  const eventObj = schedule.eventDate ? new Date(schedule.eventDate) : null;
  const deliveryObj = schedule.deliveryDate ? new Date(schedule.deliveryDate) : null;
  const daysUntilEvent = eventObj
    ? Math.ceil((eventObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const isRushed = daysUntilEvent !== null && daysUntilEvent < DELIVERY_LEAD_DAYS;
  const isPastDeadline = daysUntilEvent !== null && daysUntilEvent <= 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Delivery & Prep Schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Event Date Input */}
        <div>
          <label className="text-sm font-semibold block mb-2">Event Date</label>
          <Input
            type="date"
            value={schedule.eventDate}
            onChange={(e) => calculateDates(e.target.value)}
          />
        </div>

        {/* Event Time */}
        <div>
          <label className="text-sm font-semibold block mb-2">Event Time</label>
          <Input
            type="time"
            value={schedule.eventTime}
            onChange={(e) => handleChange("eventTime", e.target.value)}
          />
        </div>

        {/* Delivery Schedule */}
        <div className="bg-blue-50 p-3 rounded space-y-2 text-sm">
          <h4 className="font-semibold text-blue-900">Delivery Schedule</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label>Delivery Date:</label>
              <span className="font-semibold">{schedule.deliveryDate || "-"}</span>
            </div>
            <div>
              <label className="block mb-1">Delivery Time</label>
              <Input
                type="time"
                value={schedule.deliveryTime}
                onChange={(e) => handleChange("deliveryTime", e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1">Setup Time (hours)</label>
              <Input
                type="number"
                min="0.5"
                step="0.5"
                value={schedule.setupTime}
                onChange={(e) => handleChange("setupTime", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Preparation Schedule */}
        <div className="bg-amber-50 p-3 rounded space-y-2 text-sm">
          <h4 className="font-semibold text-amber-900">Preparation Schedule</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label>Est. Prep Time:</label>
              <span className="font-semibold">{prepHours} hours</span>
            </div>
            <div className="flex justify-between items-center">
              <label>Prep Start Date:</label>
              <span className="font-semibold">{schedule.prepStartDate || "-"}</span>
            </div>
            <div className="text-xs text-amber-700 pt-2">
              Based on {tiersCount} tiers with {complexity} complexity
            </div>
          </div>
        </div>

        {/* Timeline & Warnings */}
        {daysUntilEvent !== null && (
          <div
            className={`p-3 rounded text-sm font-semibold ${
              isPastDeadline
                ? "bg-red-50 text-red-900 border border-red-200"
                : isRushed
                  ? "bg-orange-50 text-orange-900 border border-orange-200"
                  : "bg-green-50 text-green-900 border border-green-200"
            }`}
          >
            {isPastDeadline ? (
              <div>
                🚨 EVENT DATE HAS PASSED - Cannot accept order
              </div>
            ) : isRushed ? (
              <div>
                ⚠️ RUSH ORDER - {daysUntilEvent} days until event (minimum {DELIVERY_LEAD_DAYS}
                days recommended). $50 rush fee applies.
              </div>
            ) : (
              <div>
                ✓ Normal timeline - {daysUntilEvent} days until event
              </div>
            )}
          </div>
        )}

        {/* Checklist */}
        <div className="bg-muted p-3 rounded">
          <h4 className="font-semibold text-sm mb-2">Pre-Event Checklist</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span>Confirm final guest count 1 week before</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span>Review allergen profile with client</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span>Confirm venue address and access</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span>Verify refrigeration available at venue</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span>Coordinate setup time with venue</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span>Pack delivery box with all decorations</span>
            </div>
          </div>
        </div>

        {/* Export Schedule */}
        <Button className="w-full" variant="outline">
          Export Schedule as PDF
        </Button>
      </CardContent>
    </Card>
  );
}
