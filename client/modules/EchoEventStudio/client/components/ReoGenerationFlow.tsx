import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Check } from "lucide-react";
import { MenuUpload } from "./MenuUpload";
import {
  BeoMenuPicker,
  type MenuItem,
  type SelectedMenuItem,
} from "./BeoMenuPicker";
import {
  BeoTimelineBuilder,
  defaultTimeline,
  type TimelineEntry,
} from "./BeoTimelineBuilder";
import { osBus } from "@/lib/os-bus";
import { upsertReo, createReoNumber } from "@/lib/reo-store";
import type { BEODocument } from "@/../shared/types/beo";

type Step = "menu" | "timeline" | "review";

const DAYPART_TEMPLATES = [
  { id: "breakfast", label: "Breakfast Service", start: "08:00", end: "10:00" },
  { id: "lunch", label: "Lunch Service", start: "12:00", end: "14:00" },
  { id: "dinner", label: "Dinner Service", start: "18:00", end: "21:00" },
  { id: "private", label: "Private Dining", start: "19:00", end: "22:00" },
];

function buildIso(date: string, hhmm: string): string {
  const base = String(date || new Date().toISOString().slice(0, 10));
  const t = /^\d{2}:\d{2}$/.test(hhmm) ? hhmm : "18:00";
  return `${base}T${t}:00`;
}

export function ReoGenerationFlow({
  event,
  isOpen,
  onClose,
  onReoGenerated,
}: {
  event: {
    id: string;
    title: string;
    guestCount: number;
    date: string;
    venue: string;
    eventTypeCode: string;
    eventType: string;
    outletId?: string;
    outletName?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onReoGenerated?: (reoData: any) => void;
}) {
  const [currentStep, setCurrentStep] = React.useState<Step>("menu");
  const [availableMenuItems, setAvailableMenuItems] = React.useState<
    MenuItem[]
  >([]);
  const [selectedMenuItems, setSelectedMenuItems] = React.useState<
    SelectedMenuItem[]
  >([]);
  const [timeline, setTimeline] = React.useState<TimelineEntry[]>(() =>
    defaultTimeline({
      startIso: buildIso(event.date, "18:00"),
      endIso: buildIso(event.date, "21:00"),
    }),
  );
  const [serviceStyle, setServiceStyle] = React.useState("a_la_carte");
  const [daypartId, setDaypartId] = React.useState("dinner");
  const [isGenerating, setIsGenerating] = React.useState(false);

  const steps: Step[] = ["menu", "timeline", "review"];
  const stepTitles: Record<Step, string> = {
    menu: "Outlet Menu",
    timeline: "Service Timeline",
    review: "Review & Generate",
  };
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleUploadMenu = (items: MenuItem[]) => setAvailableMenuItems(items);

  const applyDaypart = (id: string) => {
    const preset = DAYPART_TEMPLATES.find((p) => p.id === id);
    if (!preset) return;
    setTimeline(
      defaultTimeline({
        startIso: buildIso(event.date, preset.start),
        endIso: buildIso(event.date, preset.end),
      }),
    );
  };

  const handleGenerate = async () => {
    if (selectedMenuItems.length === 0) {
      alert("Please select at least one menu item");
      return;
    }
    setIsGenerating(true);
    try {
      const now = new Date().toISOString();
      const startIso = buildIso(event.date, timeline?.[0]?.time || "18:00");
      const endIso = buildIso(
        event.date,
        timeline?.[timeline.length - 1]?.time || "21:00",
      );
      const doc: BEODocument = {
        beoId: `reo-${Date.now()}`,
        beoNumber: createReoNumber(),
        documentType: "Restaurant Event Order",
        status: "Draft",
        approvalStatus: "pending",
        eventId: event.id,
        outletId: event.outletId,
        outletName: event.outletName || event.venue,
        room: event.venue,
        revisionNumber: 1,
        createdAt: now,
        updatedAt: now,
        title: event.title,
        start: startIso,
        end: endIso,
        exp: event.guestCount,
        gtd: event.guestCount,
        set: event.guestCount,
        menu: {
          serviceStyle,
          includedItems: selectedMenuItems.map((item) => item.name),
          sections: [
            {
              sectionTitle: "Outlet Menu",
              items: selectedMenuItems.map((item) => ({
                itemName: item.name,
                dietaryFlags: item.dietary,
                recipeId: item.id,
              })),
            },
          ],
          perPersonPrice: selectedMenuItems.reduce(
            (sum, item) => sum + (item.price || 0),
            0,
          ),
          menuNotes: `REO template: ${daypartId}`,
        },
        timeline: timeline.map((t) => ({
          time: t.time,
          label: t.label,
          department: t.department,
          notes: t.notes,
        })),
      };

      upsertReo(doc);
      osBus.emit("beo:created", {
        beoId: doc.beoId,
        eventId: doc.eventId,
        source: "EchoEventStudio",
      });
      onReoGenerated?.(doc);
      setTimeout(() => {
        onClose();
        setCurrentStep("menu");
        setSelectedMenuItems([]);
        setAvailableMenuItems([]);
      }, 500);
    } catch (error) {
      console.error("Error generating REO:", error);
      alert("Failed to generate REO.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Generate Restaurant Event Order (REO)</DialogTitle>
          <DialogDescription>
            {event.title} • {event.guestCount} guests • {event.date}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 px-6">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                    index <= currentStepIndex
                      ? "bg-cyan-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index < currentStepIndex ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <p
                  className={`text-xs ml-2 ${index <= currentStepIndex ? "text-foreground font-medium" : "text-muted-foreground"}`}
                >
                  {stepTitles[step]}
                </p>
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 ${index < currentStepIndex ? "bg-cyan-500" : "bg-muted"}`}
                  />
                )}
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {currentStep === "menu" && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 flex flex-wrap gap-2 items-center">
                  <span className="text-sm font-medium">Template</span>
                  {DAYPART_TEMPLATES.map((t) => (
                    <Button
                      key={t.id}
                      size="sm"
                      variant={daypartId === t.id ? "default" : "outline"}
                      onClick={() => {
                        setDaypartId(t.id);
                        applyDaypart(t.id);
                      }}
                    >
                      {t.label}
                    </Button>
                  ))}
                </CardContent>
              </Card>
              <MenuUpload onMenuItemsLoaded={handleUploadMenu} />
              <BeoMenuPicker
                eventDetails={{
                  title: event.title,
                  guestCount: event.guestCount,
                  date: event.date,
                  eventType: event.eventType,
                }}
                outletId={event.outletId}
                availableMenuItems={availableMenuItems}
                selectedItems={selectedMenuItems}
                onSelectedItemsChange={setSelectedMenuItems}
              />
            </div>
          )}

          {currentStep === "timeline" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Service Style</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {["a_la_carte", "prix_fixe", "family_style", "buffet"].map(
                    (style) => (
                      <Button
                        key={style}
                        size="sm"
                        variant={serviceStyle === style ? "default" : "outline"}
                        onClick={() => setServiceStyle(style)}
                      >
                        {style.replace(/_/g, " ")}
                      </Button>
                    ),
                  )}
                </CardContent>
              </Card>
              <BeoTimelineBuilder
                startIso={buildIso(event.date, "18:00")}
                endIso={buildIso(event.date, "21:00")}
                value={timeline}
                onChange={setTimeline}
              />
            </div>
          )}

          {currentStep === "review" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">REO Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Outlet</span>
                    <span className="font-medium">
                      {event.outletName || event.venue}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Guests</span>
                    <span className="font-medium">{event.guestCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Items</span>
                    <span className="font-medium">
                      {selectedMenuItems.length}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Per Person</span>
                    <span>
                      $
                      {selectedMenuItems
                        .reduce((sum, item) => sum + (item.price || 0), 0)
                        .toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-between border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {currentStepIndex > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(steps[currentStepIndex - 1])}
              >
                Back
              </Button>
            )}
            {currentStep === "review" ? (
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                {isGenerating ? "Generating..." : "Generate REO"}
                {!isGenerating && <Check className="h-4 w-4" />}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  if (
                    currentStep === "menu" &&
                    selectedMenuItems.length === 0
                  ) {
                    alert("Please select at least one menu item");
                    return;
                  }
                  setCurrentStep(steps[currentStepIndex + 1]);
                }}
                className="bg-cyan-500 hover:bg-cyan-600 gap-2"
              >
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
