import React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight, Check } from "lucide-react";

import {
  BeoMenuPicker,
  type SelectedMenuItem,
  type MenuItem,
} from "./BeoMenuPicker";
import { BeoAiSuggestions } from "./BeoAiSuggestions";
import { MenuUpload } from "./MenuUpload";
import { BqtSetupPanel, type BqtSetup } from "./BqtSetupPanel";
import {
  BeoTimelineBuilder,
  defaultTimeline,
  type TimelineEntry,
} from "./BeoTimelineBuilder";
import { BeoLayoutIntegrationStep } from "./BeoLayoutIntegrationStep";
import { BeoDocumentPack } from "./BeoDocumentPack";

import { osBus } from "@/lib/os-bus";
import { upsertBeo } from "@/lib/beo-store";
import type { BEODocument } from "@/../shared/types/beo";

type Step = "menu" | "setup" | "timeline" | "layout" | "review";

interface BeoGenerationFlowProps {
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
  onBeoGenerated?: (beoData: any) => void;
}

function getOrgIdForRequest(): string {
  if (typeof window === "undefined") return "default";
  const orgRaw = localStorage.getItem("auth_org");
  if (orgRaw) {
    try {
      const parsed = JSON.parse(orgRaw);
      const id = String(parsed?.id || "").trim();
      if (id) return id;
    } catch {
      // ignore
    }
  }
  return "default";
}

function buildIso(date: string, hhmm: string): string {
  const base = String(date || new Date().toISOString().slice(0, 10));
  const t = /^\d{2}:\d{2}$/.test(hhmm) ? hhmm : "17:00";
  return `${base}T${t}:00`;
}

export function BeoGenerationFlow({
  event,
  isOpen,
  onClose,
  onBeoGenerated,
}: BeoGenerationFlowProps) {
  const [currentStep, setCurrentStep] = React.useState<Step>("menu");
  const [availableMenuItems, setAvailableMenuItems] = React.useState<
    MenuItem[]
  >([]);
  const [selectedMenuItems, setSelectedMenuItems] = React.useState<
    SelectedMenuItem[]
  >([]);
  const [bqtSetup, setBqtSetup] = React.useState<BqtSetup>({
    tables: [],
    chairs: [],
    buffets: [],
    serviceEquipment: [],
  });
  const [timeline, setTimeline] = React.useState<TimelineEntry[]>(() =>
    defaultTimeline({
      startIso: buildIso(event.date, "17:00"),
      endIso: buildIso(event.date, "21:00"),
    }),
  );
  const [layoutId, setLayoutId] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generatedBeoId, setGeneratedBeoId] = React.useState<string | null>(
    null,
  );

  const stepTitles: Record<Step, string> = {
    menu: "Select Menu",
    setup: "Setup Requirements",
    timeline: "Event Timeline",
    layout: "Layout & Seating",
    review: "Review & Generate",
  };
  const stepDescriptions: Record<Step, string> = {
    menu: "Choose items from your menu or upload a new one",
    setup: "Configure tables, chairs, and equipment",
    timeline: "Build guest arrive → guest leave timeline (FOH/BOH milestones)",
    layout: "Design seating, buffet setup, and zones in EchoLayout",
    review: "Review your BEO and generate the order",
  };

  const steps: Step[] = ["menu", "setup", "timeline", "layout", "review"];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleUploadMenu = (items: MenuItem[]) => setAvailableMenuItems(items);

  const handleApplySuggestion = (items: SelectedMenuItem[]) => {
    setSelectedMenuItems(items);
    setCurrentStep("setup");
  };

  const handleGenerateBEO = async () => {
    if (selectedMenuItems.length === 0) {
      alert("Please select at least one menu item");
      return;
    }

    setIsGenerating(true);
    try {
      const beoPayload = {
        eventId: event.id,
        eventTypeCode: event.eventTypeCode,
        contentData: {
          eventName: event.title,
          guestCount: event.guestCount,
          date: event.date,
          venue: event.venue,
          menuItems: selectedMenuItems.map((item) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            price: item.price,
            quantity: event.guestCount,
            totalPrice: item.price * event.guestCount,
          })),
          setupRequirements: bqtSetup,
          totalMenuCost: selectedMenuItems.reduce(
            (sum, item) => sum + item.price * event.guestCount,
            0,
          ),
          timeline,
          layoutId,
        },
        departmentId: "events",
        createdByUserId: "current-user",
      };

      const response = await fetch("/api/beo/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Org-ID": getOrgIdForRequest(),
        },
        body: JSON.stringify(beoPayload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create BEO");

      const created: BEODocument | null = data?.data ?? null;
      if (created?.beoId) {
        const startIso =
          created.start ?? buildIso(event.date, timeline?.[0]?.time || "17:00");
        const endIso =
          created.end ??
          buildIso(
            event.date,
            timeline?.[timeline.length - 1]?.time || "21:00",
          );
        const enriched: BEODocument = {
          ...created,
          room: created.room ?? event.venue,
          outletId: created.outletId ?? event.outletId,
          outletName: created.outletName ?? event.outletName,
          start: startIso,
          end: endIso,
          exp: created.exp ?? event.guestCount,
          gtd: created.gtd ?? event.guestCount,
          set: created.set ?? event.guestCount,
          approvalStatus: created.approvalStatus ?? "pending",
          timeline: timeline.map((t) => ({
            time: t.time,
            label: t.label,
            department: t.department,
            notes: t.notes,
          })),
        };

        upsertBeo(enriched);
        osBus.emit("beo:created", {
          beoId: enriched.beoId,
          eventId: enriched.eventId,
          source: "EchoEventStudio",
        });
        setGeneratedBeoId(enriched.beoId);
      }

      if (onBeoGenerated) onBeoGenerated(data.data);

      setTimeout(() => {
        onClose();
        setCurrentStep("menu");
        setSelectedMenuItems([]);
        setAvailableMenuItems([]);
      }, 800);
    } catch (error) {
      console.error("Error generating BEO:", error);
      alert("Failed to generate BEO. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={() => {
        onClose();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Generate Banquet Event Order (BEO)</DialogTitle>
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
                  className={`text-xs ml-2 ${
                    index <= currentStepIndex
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }`}
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
          {generatedBeoId ? (
            <div className="mb-4">
              <BeoDocumentPack beoId={generatedBeoId} layoutId={layoutId} />
            </div>
          ) : null}
          {currentStep === "menu" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{stepTitles.menu}</h3>
                <p className="text-sm text-muted-foreground">
                  {stepDescriptions.menu}
                </p>
              </div>
              <div className="flex gap-2">
                <MenuUpload onMenuItemsLoaded={handleUploadMenu} />
              </div>
              {availableMenuItems.length > 0 ? (
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
                  onNext={() => {
                    if (selectedMenuItems.length > 0) setCurrentStep("setup");
                  }}
                />
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">
                      Upload a menu or manually add items to get started
                    </p>
                  </CardContent>
                </Card>
              )}
              {availableMenuItems.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <BeoAiSuggestions
                    eventDetails={{
                      title: event.title,
                      guestCount: event.guestCount,
                      date: event.date,
                      eventType: event.eventType,
                    }}
                    onApplySuggestion={handleApplySuggestion}
                  />
                </div>
              )}
            </div>
          )}

          {currentStep === "setup" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{stepTitles.setup}</h3>
                <p className="text-sm text-muted-foreground">
                  {stepDescriptions.setup}
                </p>
              </div>
              <BqtSetupPanel
                guestCount={event.guestCount}
                serviceStyle="plated"
                onSetupChange={setBqtSetup}
                onNext={() => setCurrentStep("timeline")}
              />
            </div>
          )}

          {currentStep === "timeline" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{stepTitles.timeline}</h3>
                <p className="text-sm text-muted-foreground">
                  {stepDescriptions.timeline}
                </p>
              </div>
              <BeoTimelineBuilder
                startIso={buildIso(event.date, "17:00")}
                endIso={buildIso(event.date, "21:00")}
                value={timeline}
                onChange={setTimeline}
              />
            </div>
          )}

          {currentStep === "layout" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{stepTitles.layout}</h3>
                <p className="text-sm text-muted-foreground">
                  {stepDescriptions.layout}
                </p>
              </div>
              <BeoLayoutIntegrationStep
                eventId={event.id}
                venueName={event.venue}
                selectedLayoutId={layoutId}
                onSelectLayoutId={setLayoutId}
              />
            </div>
          )}

          {currentStep === "review" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{stepTitles.review}</h3>
                <p className="text-sm text-muted-foreground">
                  {stepDescriptions.review}
                </p>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">BEO Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Event</p>
                      <p className="font-semibold">{event.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-semibold">{event.date}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Guests</p>
                      <p className="font-semibold">{event.guestCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Venue</p>
                      <p className="font-semibold">{event.venue}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold mb-2">Timeline</p>
                    <div className="space-y-1">
                      {timeline.slice(0, 8).map((t, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between text-sm p-2 bg-muted rounded"
                        >
                          <span className="text-foreground/80">{t.time}</span>
                          <span className="font-medium text-foreground">
                            {t.label}
                          </span>
                        </div>
                      ))}
                      {timeline.length > 8 ? (
                        <div className="text-xs text-muted-foreground">
                          +{timeline.length - 8} more
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold mb-2">Menu Items</p>
                    <div className="space-y-1">
                      {selectedMenuItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between text-sm p-2 bg-muted rounded"
                        >
                          <span>{item.name}</span>
                          <span className="font-medium">
                            ${(item.price * event.guestCount).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between text-base font-bold">
                      <span>Total Menu Cost:</span>
                      <span className="text-cyan-600">
                        $
                        {selectedMenuItems
                          .reduce(
                            (sum, item) => sum + item.price * event.guestCount,
                            0,
                          )
                          .toFixed(2)}
                      </span>
                    </div>
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
                onClick={() => {
                  const prevIndex = currentStepIndex - 1;
                  setCurrentStep(steps[prevIndex]);
                }}
              >
                Back
              </Button>
            )}
            {currentStep === "review" ? (
              <Button
                onClick={handleGenerateBEO}
                disabled={isGenerating || selectedMenuItems.length === 0}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                {isGenerating ? "Generating..." : "Generate BEO"}
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
                  const nextIndex = currentStepIndex + 1;
                  setCurrentStep(steps[nextIndex]);
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
