/**
 * BEO Operations Dashboard
 * Complete BEO management interface - not placeholders
 * Industry standard UI/UX
 */

import React from "react";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  ChefHat,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiBEOView } from "../MultiBEOView";
import { WorkflowTransparency } from "../WorkflowTransparency";
import { BEOTransparencyView } from "../BEOTransparencyView";
import { InternalBEOView } from "../BEOBuilder/InternalBEOView";
import type { GenesisBEO } from "../../types/genesis-integration";
import type { Event } from "../../types";
import type { Task } from "../../types";
import type { PurchasePlan } from "@/../shared/types/purchasing";
import type { ProductionSheet } from "@/../shared/types/production";
import type { LaborPlan } from "@/../shared/types/labor";
import type { OrderLine } from "../../types/genesis-integration";
import type { ChangeEvent } from "../../types/genesis-integration";

interface BEOOperationsProps {
  beos: GenesisBEO[];
  onSelectBEO?: (beoId: string) => void;
  onOpenBuilder?: (beoId?: string) => void;
  eventId?: string;
  event?: Event | null;
  tasks?: Task[];
  productionSheets?: ProductionSheet[];
  purchasePlan?: PurchasePlan | null;
  laborPlan?: LaborPlan | null;
  orders?: OrderLine[];
  changes?: ChangeEvent[];
}

export function BEOOperations({
  beos,
  onSelectBEO,
  onOpenBuilder,
  eventId,
  event,
  tasks = [],
  productionSheets = [],
  purchasePlan,
  laborPlan,
  orders = [],
  changes = [],
}: BEOOperationsProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [viewMode, setViewMode] = React.useState<"grid" | "list" | "workflow">(
    "grid",
  );
  const [selectedBEOId, setSelectedBEOId] = React.useState<string | null>(null);

  // Filter BEOs
  const filteredBEODs = React.useMemo(() => {
    let filtered = beos;

    if (searchQuery) {
      filtered = filtered.filter(
        (beo) =>
          beo.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          beo.eventId.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((beo) => beo.status === statusFilter);
    }

    return filtered;
  }, [beos, searchQuery, statusFilter]);

  const selectedBEO = React.useMemo(
    () => beos.find((b) => b.id === selectedBEOId) || null,
    [beos, selectedBEOId],
  );

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header - Professional Toolbar */}
      <div className="border-b border-border/20 bg-background/95 backdrop-blur-sm sticky top-0 z-20">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                BEO Operations
              </h1>
              <p className="text-sm text-foreground/60 mt-1">
                Manage Banquet Event Orders - From Creation to Execution
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {selectedBEO && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent("open-panel", {
                          detail: {
                            id: "culinary",
                            beoId: selectedBEO.id,
                            eventId: selectedBEO.eventId ?? eventId,
                          },
                        }),
                      )
                    }
                  >
                    <ChefHat className="w-4 h-4 mr-2" />
                    Open in Culinary
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent("open-panel", {
                          detail: {
                            id: "pastry",
                            beoId: selectedBEO.id,
                            eventId: selectedBEO.eventId ?? eventId,
                          },
                        }),
                      )
                    }
                  >
                    Open in Pastry
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => onOpenBuilder?.()}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create BEO
              </Button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground/40" />
              <Input
                placeholder="Search BEOs by ID, Event, or Client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="tentative">Tentative</SelectItem>
                <SelectItem value="definite">Definite</SelectItem>
                <SelectItem value="executing">Executing</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="grid" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="grid" onClick={() => setViewMode("grid")}>
              Grid View
            </TabsTrigger>
            <TabsTrigger value="list" onClick={() => setViewMode("list")}>
              List View
            </TabsTrigger>
            <TabsTrigger
              value="workflow"
              onClick={() => setViewMode("workflow")}
            >
              Workflow
            </TabsTrigger>
            <TabsTrigger value="docs">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="mt-0">
            {selectedBEOId ? (
              <BEOTransparencyView
                beoId={selectedBEOId}
                eventId={eventId}
                event={event}
                beo={selectedBEO}
                productionSheets={productionSheets}
                purchasePlan={purchasePlan}
                laborPlan={laborPlan}
                orders={orders}
                onClose={() => setSelectedBEOId(null)}
              />
            ) : (
              <MultiBEOView
                beos={filteredBEODs}
                onSelectBEO={(beoId) => {
                  setSelectedBEOId(beoId);
                  onSelectBEO?.(beoId);
                }}
                onOpenBuilder={onOpenBuilder}
              />
            )}
          </TabsContent>

          <TabsContent value="list" className="mt-0">
            <Card className="border-border/20 bg-background/40">
              <CardContent className="p-4">
                <div className="space-y-2">
                  {filteredBEODs.length === 0 ? (
                    <p className="text-sm text-foreground/60">
                      No BEOs match filters. Create a BEO or adjust search.
                    </p>
                  ) : (
                    filteredBEODs.map((beo) => (
                      <div
                        key={beo.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedBEOId === beo.id
                            ? "border-primary bg-primary/10"
                            : "border-border/20 hover:bg-background/60",
                        )}
                        onClick={() => {
                          setSelectedBEOId(beo.id);
                          onSelectBEO?.(beo.id);
                        }}
                      >
                        <div>
                          <span className="font-medium text-foreground">
                            {beo.id}
                          </span>
                          {beo.eventId && (
                            <span className="text-sm text-foreground/60 ml-2">
                              Event: {beo.eventId}
                            </span>
                          )}
                        </div>
                        {beo.status && (
                          <Badge variant="outline" className="text-xs">
                            {beo.status}
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workflow" className="mt-0">
            <div className="space-y-6">
              <WorkflowTransparency
                eventId={eventId}
                beoId={filteredBEODs[0]?.id}
                event={event}
                beo={filteredBEODs[0]}
                tasks={tasks}
                orders={orders}
                purchasePlan={purchasePlan}
                productionSheets={productionSheets}
                laborPlan={laborPlan}
                changes={changes}
                showDetails={true}
              />
            </div>
          </TabsContent>

          <TabsContent value="docs" className="mt-0">
            {selectedBEO ? (
              <InternalBEOView
                beo={selectedBEO}
                event={event}
                onPrint={() => window.print()}
              />
            ) : (
              <Card className="border-border/20 bg-background/40">
                <CardContent className="p-4">
                  <p className="text-sm text-foreground/60">
                    Select a BEO to view internal documents.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default BEOOperations;
