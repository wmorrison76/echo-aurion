/**
 * BEO Builder Component
 * Professional, TripleSeat-quality BEO creation interface
 * Industry standard for Prospect → Food on Plate workflow
 */

import React from "react";
import { VendorSkuAutocomplete } from "@/components/site/VendorSkuAutocomplete";
import { Trash2, DollarSign as DollarSignIcon } from "lucide-react";
import {
  Plus,
  Save,
  Eye,
  Download,
  Settings,
  FileText,
  Users,
  Calendar,
  ChefHat,
  DollarSign,
  Truck,
  FileCheck,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GenesisBEO } from "../../types/genesis-integration";

interface BEOBuilderProps {
  beoId?: string;
  eventId?: string;
  onSave?: (beo: GenesisBEO) => void;
  onPreview?: (beo: GenesisBEO) => void;
  onGenerateDocument?: (type: "internal" | "guest") => void;
}

export function BEOBuilder({
  beoId,
  eventId,
  onSave,
  onPreview,
  onGenerateDocument,
}: BEOBuilderProps) {
  const [activeTab, setActiveTab] = React.useState("overview");
  const [beoStatus, setBeoStatus] = React.useState<
    "draft" | "tentative" | "definite" | "executing" | "closed"
  >("draft");
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

  // Auto-save indicator
  React.useEffect(() => {
    if (hasUnsavedChanges) {
      const timer = setTimeout(() => {
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasUnsavedChanges]);

  const getStatusColor = (status: typeof beoStatus) => {
    switch (status) {
      case "draft":
        return "bg-gray-500/10 text-gray-700 border-gray-500/30";
      case "tentative":
        return "bg-amber-500/10 text-amber-700 border-amber-500/30";
      case "definite":
        return "bg-blue-500/10 text-blue-700 border-blue-500/30";
      case "executing":
        return "bg-green-500/10 text-green-700 border-green-500/30";
      case "closed":
        return "bg-slate-500/10 text-slate-700 border-slate-500/30";
    }
  };

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header - Professional Toolbar */}
      <div className="border-b border-border/20 bg-background/95 backdrop-blur-sm sticky top-0 z-20">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-6 h-6 text-primary" />
                  BEO Builder
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <Badge
                    className={cn("font-medium", getStatusColor(beoStatus))}
                  >
                    {beoStatus.charAt(0).toUpperCase() + beoStatus.slice(1)}
                  </Badge>
                  {beoId && (
                    <span className="text-sm text-foreground/60">
                      BEO #{beoId}
                    </span>
                  )}
                  {lastSaved && (
                    <div className="flex items-center gap-1.5 text-xs text-foreground/50">
                      <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                      Saved {lastSaved.toLocaleTimeString()}
                    </div>
                  )}
                  {hasUnsavedChanges && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600">
                      <Clock className="w-3.5 h-3.5" />
                      Unsaved changes
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPreview?.({} as GenesisBEO)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onGenerateDocument?.("internal")}
              >
                <Download className="w-4 h-4 mr-2" />
                Internal BEO
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onGenerateDocument?.("guest")}
              >
                <Download className="w-4 h-4 mr-2" />
                Guest Proposal
              </Button>
              <Button variant="default" size="sm" onClick={() => {}}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>

          {/* Tab Navigation */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="w-full justify-start bg-transparent border-b border-border/20 rounded-none h-auto p-0 gap-1">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
              >
                <FileText className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="functions"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Functions / Moments
              </TabsTrigger>
              <TabsTrigger
                value="menu"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
              >
                <ChefHat className="w-4 h-4 mr-2" />
                Menu + Recipes
              </TabsTrigger>
              <TabsTrigger
                value="costs"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Costs
              </TabsTrigger>
              <TabsTrigger
                value="production"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
              >
                <ChefHat className="w-4 h-4 mr-2" />
                Production
              </TabsTrigger>
              <TabsTrigger
                value="orders"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
              >
                <Truck className="w-4 h-4 mr-2" />
                Orders
              </TabsTrigger>
              <TabsTrigger
                value="docs"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
              >
                <FileCheck className="w-4 h-4 mr-2" />
                Documents
              </TabsTrigger>
              <TabsTrigger
                value="changes"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Change Feed
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="overview" className="mt-0 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Event Info */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Event Information</CardTitle>
                    <CardDescription>
                      Basic event details and client information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="event-name">Event Name</Label>
                        <Input
                          id="event-name"
                          placeholder="Corporate Gala 2024"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="event-date">Event Date</Label>
                        <Input id="event-date" type="date" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="client-name">Client Name</Label>
                        <Input
                          id="client-name"
                          placeholder="Acme Corporation"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="guest-count">Guest Count</Label>
                        <Input
                          id="guest-count"
                          type="number"
                          placeholder="250"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-description">
                        Event Description
                      </Label>
                      <Textarea
                        id="event-description"
                        placeholder="Annual corporate celebration..."
                        rows={4}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>BEO Details</CardTitle>
                    <CardDescription>
                      Banquet Event Order specifics
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="beo-status">Status</Label>
                        <Select
                          value={beoStatus}
                          onValueChange={(v: any) => setBeoStatus(v)}
                        >
                          <SelectTrigger id="beo-status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="tentative">Tentative</SelectItem>
                            <SelectItem value="definite">Definite</SelectItem>
                            <SelectItem value="executing">Executing</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="venue">Venue</Label>
                        <Input id="venue" placeholder="Grand Ballroom" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Metrics & Quick Actions */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div>
                        <p className="text-xs text-foreground/60">
                          Total Guests
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          250
                        </p>
                      </div>
                      <Users className="w-8 h-8 text-blue-600 opacity-50" />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div>
                        <p className="text-xs text-foreground/60">
                          Projected Revenue
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          $45,000
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-green-600 opacity-50" />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div>
                        <p className="text-xs text-foreground/60">
                          Projected Cost
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          $18,000
                        </p>
                      </div>
                      <ChefHat className="w-8 h-8 text-amber-600 opacity-50" />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <div>
                        <p className="text-xs text-foreground/60">Margin</p>
                        <p className="text-2xl font-bold text-foreground">
                          60%
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-purple-600 opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Function
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      size="sm"
                    >
                      <ChefHat className="w-4 h-4 mr-2" />
                      Add Menu Item
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      size="sm"
                    >
                      <Truck className="w-4 h-4 mr-2" />
                      Generate Orders
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      size="sm"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Customize Layout
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="functions" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Functions / Service Moments</CardTitle>
                <CardDescription>
                  Organize service into functions and moments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/60">
                  Configure functions and moments in BEO Operations.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="menu" className="mt-0">
            <MenuRecipesTab />
          </TabsContent>

          <TabsContent value="costs" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
                <CardDescription>View detailed cost analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/60">
                  View cost analysis in BEO Operations.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="production" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Production Planning</CardTitle>
                <CardDescription>
                  Production timeline and kitchen assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/60">
                  Configure production in BEO Operations.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Purchase Orders</CardTitle>
                <CardDescription>
                  Generated orders and requisitions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/60">
                  View orders in BEO Operations.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="docs" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Document Generation</CardTitle>
                <CardDescription>
                  Generate Internal BEO, Guest Proposal, and kitchen sheets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onGenerateDocument?.("internal")}
                >
                  <FileCheck className="w-4 h-4 mr-2" />
                  Generate Internal BEO
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onGenerateDocument?.("guest")}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Guest Proposal
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="changes" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Change Feed</CardTitle>
                <CardDescription>
                  Track all changes and their impact
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/60">
                  View changes in Change Feed panel.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default BEOBuilder;

// ── iter262 · Menu + Recipes tab with VendorSkuAutocomplete wire-up ────
// Matches the Pastry & Culinary recipe builder pattern so banquet menus
// flow their ingredient costs from the same vendor SKU store.
interface BeoLineItem {
  id: string;
  course: string;
  item: string;
  qty: string;
  unit: string;
  cost: number;
  vendor?: string;
  item_code?: string;
}

const BLANK_ROW = (): BeoLineItem => ({
  id: `row-${Math.random().toString(36).slice(2, 8)}`,
  course: "Main", item: "", qty: "1", unit: "ea", cost: 0,
});

const COURSES = ["Passed Canapé", "Amuse", "App", "Salad", "Main", "Side", "Dessert", "Late Night"];

function MenuRecipesTab() {
  const [rows, setRows] = React.useState<BeoLineItem[]>([BLANK_ROW()]);
  const [focus, setFocus] = React.useState<string | null>(null);

  const update = (id: string, patch: Partial<BeoLineItem>) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  const remove = (id: string) => setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  const add = () => setRows(prev => [...prev, BLANK_ROW()]);

  const totalCost = rows.reduce((s, r) => s + (r.cost || 0) * (parseFloat(r.qty) || 0), 0);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Menu + Recipes</CardTitle>
          <CardDescription>Type an ingredient — vendor SKU suggestions populate the row (qty · unit · cost · vendor)</CardDescription>
        </div>
        <div className="flex items-center gap-2 text-xs text-foreground/60">
          <DollarSignIcon className="w-3.5 h-3.5" />
          Est. food cost: <span className="font-mono font-semibold text-amber-400">${totalCost.toFixed(2)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2" data-testid="beo-menu-recipes-tab">
        <div className="grid grid-cols-[90px_1fr_60px_60px_80px_100px_30px] gap-2 text-[10px] font-mono uppercase tracking-widest text-foreground/50 px-2 pb-1 border-b">
          <span>Course</span><span>Item</span><span>Qty</span><span>Unit</span>
          <span className="text-right">Cost</span><span>Vendor</span><span />
        </div>
        {rows.map(r => (
          <div key={r.id}
            className="grid grid-cols-[90px_1fr_60px_60px_80px_100px_30px] gap-2 items-center"
            data-testid={`beo-row-${r.id}`}>
            <select value={r.course}
              onChange={e => update(r.id, { course: e.target.value })}
              className="h-8 text-xs rounded border border-white/10 bg-transparent px-2">
              {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="relative">
              <input
                type="text" value={r.item}
                placeholder="e.g. wild mushroom risotto"
                onChange={e => update(r.id, { item: e.target.value })}
                onFocus={() => setFocus(r.id)}
                onBlur={() => setTimeout(() => setFocus(f => f === r.id ? null : f), 200)}
                className="h-8 text-xs rounded border border-white/10 bg-transparent px-2 w-full"
                data-testid={`beo-item-input-${r.id}`}
              />
              {focus === r.id && (
                <VendorSkuAutocomplete
                  query={r.item}
                  visible
                  onPick={(sku) => update(r.id, {
                    item: sku.name, unit: sku.unit || r.unit,
                    cost: sku.price || 0,
                    vendor: sku.vendor_name, item_code: sku.sku_id,
                  })}
                  testidPrefix={`beo-sku-${r.id}`}
                />
              )}
            </div>
            <input type="text" value={r.qty}
              onChange={e => update(r.id, { qty: e.target.value })}
              className="h-8 text-xs rounded border border-white/10 bg-transparent px-2"/>
            <input type="text" value={r.unit}
              onChange={e => update(r.id, { unit: e.target.value })}
              className="h-8 text-xs rounded border border-white/10 bg-transparent px-2"/>
            <div className="text-right font-mono text-xs text-amber-400">
              ${r.cost.toFixed(2)}
            </div>
            <div className="text-xs text-foreground/60 truncate" title={r.vendor}>
              {r.vendor || "—"}
            </div>
            <button
              onClick={() => remove(r.id)}
              className="text-rose-400 hover:text-rose-300"
              data-testid={`beo-row-remove-${r.id}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button onClick={add}
          className="mt-2 text-xs font-mono uppercase tracking-widest text-amber-400 hover:text-amber-300"
          data-testid="beo-add-row">
          + Add menu line
        </button>
      </CardContent>
    </Card>
  );
}
