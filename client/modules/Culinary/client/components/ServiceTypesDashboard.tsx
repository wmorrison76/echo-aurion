import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, Calendar, Settings } from "lucide-react";
import { AutocompleteInput } from "@/components/AutocompleteInput";
import type { ServiceConcept, EventRequest, SeasonalMenu, DietaryRestriction } from "@/lib/service-types";

interface ServiceTypesDashboardProps {
  concepts?: ServiceConcept[];
  events?: EventRequest[];
  seasonalMenus?: SeasonalMenu[];
  onCreateEvent?: (event: Omit<EventRequest, "id" | "createdAt" | "totalCost" | "totalPrice" | "profit">) => void;
  onCreateConcept?: (concept: Omit<ServiceConcept, "id" | "createdAt">) => void;
}

const DIETARY_RESTRICTIONS: DietaryRestriction[] = [
  "vegetarian",
  "vegan",
  "gluten-free",
  "dairy-free",
  "nut-allergy",
  "shellfish-allergy",
  "kosher",
  "halal",
];

const SERVICE_TYPE_LABELS: Record<string, string> = {
  "dine-in": "Dine-In",
  "takeout": "Takeout",
  "delivery": "Delivery",
  "catering": "Catering",
  "banquet": "Banquet",
  "private-event": "Private Event",
};

export const ServiceTypesDashboard: React.FC<ServiceTypesDashboardProps> = ({
  concepts = [],
  events = [],
  seasonalMenus = [],
  onCreateEvent,
  onCreateConcept,
}) => {
  const [activeTab, setActiveTab] = useState<"concepts" | "events" | "seasonal">("concepts");
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [conceptDialogOpen, setConceptDialogOpen] = useState(false);

  // Event form state
  const [eventName, setEventName] = useState("");
  const [selectedConcept, setSelectedConcept] = useState<ServiceConcept | null>(null);
  const [eventDate, setEventDate] = useState("");
  const [partySize, setPartySize] = useState("");
  const [dietaryRestrictions, setDietaryRestrictions] = useState<Set<DietaryRestriction>>(new Set());

  const handleAddEvent = () => {
    if (!eventName || !selectedConcept || !eventDate || !partySize) {
      alert("Please fill in all required fields");
      return;
    }

    onCreateEvent?.({
      eventName,
      concept: selectedConcept,
      eventDate,
      eventTime: "19:00",
      serviceType: selectedConcept.serviceTypes[0],
      partySize: parseInt(partySize),
      guestList: [],
      menuSelections: [],
      status: "inquiry",
    });

    // Reset form
    setEventName("");
    setSelectedConcept(null);
    setEventDate("");
    setPartySize("");
    setDietaryRestrictions(new Set());
    setEventDialogOpen(false);
  };

  const toggleDietary = (restriction: DietaryRestriction) => {
    const updated = new Set(dietaryRestrictions);
    if (updated.has(restriction)) {
      updated.delete(restriction);
    } else {
      updated.add(restriction);
    }
    setDietaryRestrictions(updated);
  };

  const totalEventProfit = events.reduce((sum, e) => sum + e.profit, 0);
  const activeEventCount = events.filter((e) => e.status === "confirmed").length;

  return (
    <div className="w-full space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Active Concepts</div>
            <div className="text-3xl font-bold">{concepts.filter((c) => c.active).length}</div>
            <div className="text-xs text-muted-foreground mt-2">Service types</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Confirmed Events</div>
            <div className="text-3xl font-bold">{activeEventCount}</div>
            <div className="text-xs text-muted-foreground mt-2">Total guests: {events.reduce((sum, e) => sum + e.partySize, 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Event Profits</div>
            <div className="text-3xl font-bold text-green-600">${totalEventProfit.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-2">Expected revenue</div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("concepts")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "concepts"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="inline h-4 w-4 mr-2" />
          Service Concepts
        </button>
        <button
          onClick={() => setActiveTab("events")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "events"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="inline h-4 w-4 mr-2" />
          Events ({events.length})
        </button>
        <button
          onClick={() => setActiveTab("seasonal")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "seasonal"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="inline h-4 w-4 mr-2" />
          Seasonal Menus
        </button>
      </div>

      {/* Concepts Tab */}
      {activeTab === "concepts" && (
        <div className="space-y-4">
          {concepts.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground mb-4">No service concepts yet.</p>
                <Dialog open={conceptDialogOpen} onOpenChange={setConceptDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Service Concept
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Service Concept</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Service concepts define how you offer dining: à la carte, banquets, catering, etc.
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 rounded">
                        Start with default concepts and customize as needed.
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {concepts.map((concept) => (
                <Card key={concept.id} className={!concept.active ? "opacity-50" : ""}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      {concept.name}
                      <Badge variant={concept.active ? "default" : "secondary"}>
                        {concept.active ? "Active" : "Inactive"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {concept.description && (
                      <p className="text-sm text-muted-foreground">{concept.description}</p>
                    )}
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="font-semibold">Service Types</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {concept.serviceTypes.map((st) => (
                            <Badge key={st} variant="outline" className="text-xs">
                              {SERVICE_TYPE_LABELS[st]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div>
                          <p className="text-muted-foreground text-xs">Avg Check</p>
                          <p className="font-bold">${concept.averageCheck}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Markup</p>
                          <p className="font-bold">+{Math.round((concept.markupMultiplier - 1) * 100)}%</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Events Tab */}
      {activeTab === "events" && (
        <div className="space-y-4">
          <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Event Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>New Event Request</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Event Name *</label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Wedding, Corporate Dinner, etc."
                    className="w-full rounded border border-input px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Service Concept *</label>
                  <select
                    value={selectedConcept?.id || ""}
                    onChange={(e) => setSelectedConcept(concepts.find((c) => c.id === e.target.value) || null)}
                    className="w-full rounded border border-input px-3 py-2 text-sm"
                  >
                    <option value="">Select concept...</option>
                    {concepts.filter((c) => c.active).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (${c.averageCheck})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Date *</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full rounded border border-input px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Party Size *</label>
                    <input
                      type="number"
                      value={partySize}
                      onChange={(e) => setPartySize(e.target.value)}
                      placeholder="Number of guests"
                      className="w-full rounded border border-input px-3 py-2 text-sm"
                      min="1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Dietary Restrictions</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DIETARY_RESTRICTIONS.map((restriction) => (
                      <label key={restriction} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dietaryRestrictions.has(restriction)}
                          onChange={() => toggleDietary(restriction)}
                          className="h-4 w-4 rounded border-input"
                        />
                        <span className="text-sm">{restriction}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setEventDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleAddEvent} disabled={!eventName || !selectedConcept || !eventDate || !partySize} className="flex-1">
                    Create Event
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {events.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No events yet. Create your first event to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {events
                .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
                .map((event) => (
                  <Card key={event.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">{event.eventName}</p>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {event.eventDate}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {event.partySize} guests
                            </Badge>
                            <Badge
                              className="text-xs"
                              variant={event.status === "confirmed" ? "default" : "secondary"}
                            >
                              {event.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm text-muted-foreground">Expected Profit</p>
                          <p className="text-lg font-bold text-green-600">${event.profit.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Seasonal Menus Tab */}
      {activeTab === "seasonal" && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Seasonal menu management coming soon</p>
            <p className="text-sm mt-2">Create spring, summer, fall, and winter menus</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ServiceTypesDashboard;
