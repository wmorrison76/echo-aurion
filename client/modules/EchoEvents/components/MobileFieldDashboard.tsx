import React from "react";
/** * Mobile Field Dashboard * Optimized for salespeople touring venues with clients * Provides instant access to critical info, quick actions, and proposal generation */ import {
  useState,
  useEffect,
} from "react";
import {
  MapPin,
  Phone,
  Globe,
  MapPinIcon,
  TrendingUp,
  Lock,
  FileText,
  Calculator,
  Navigation,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
interface VenueQuickInfo {
  venueId: string;
  venueName: string;
  address: string;
  phone: string;
  website?: string;
  maxCapacity: number;
  availableRooms: { name: string; capacity: number }[];
  basePrice: number;
  currency: string;
}
interface FieldContext {
  clientName: string;
  proposalStage:
    | "initial"
    | "toured"
    | "proposal-sent"
    | "negotiating"
    | "booked";
  estimatedGuests: number;
  estimatedBudget: number;
  dietaryRestrictions?: string[];
  notes: string;
}
export default function MobileFieldDashboard() {
  const [venueInfo] = useState<VenueQuickInfo>({
    venueId: "1",
    venueName: "Grand Ballroom",
    address: "123 Event Ave, City, ST 12345",
    phone: "(555) 123-4567",
    website: "www.grandevent.com",
    maxCapacity: 500,
    availableRooms: [
      { name: "Main Hall", capacity: 300 },
      { name: "Terrace", capacity: 150 },
      { name: "Private Dining", capacity: 50 },
    ],
    basePrice: 100,
    currency: "USD",
  });
  const [fieldContext, setFieldContext] = useState<FieldContext>({
    clientName: "Johnson Wedding",
    proposalStage: "toured",
    estimatedGuests: 150,
    estimatedBudget: 25000,
    dietaryRestrictions: ["vegetarian", "vegan"],
    notes: "Client interested in garden ceremony",
  });
  const [activeTab, setActiveTab] = useState<
    "overview" | "proposal" | "notes" | "nearby"
  >("overview");
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20">
      {" "}
      {/* Header */}{" "}
      <div className="sticky top-0 z-40 bg-background border-b border-border/30 p-4">
        {" "}
        <h1 className="text-xl font-bold text-foreground">
          {venueInfo.venueName}
        </h1>{" "}
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          {" "}
          <MapPin className="h-3 w-3" /> {fieldContext.clientName}{" "}
        </p>{" "}
      </div>{" "}
      {/* Main Content */}{" "}
      <div className="space-y-4 p-4">
        {" "}
        {/* Venue Quick Stats */}{" "}
        <VenueStatsCard venue={venueInfo} fieldContext={fieldContext} />{" "}
        {/* Action Buttons */}{" "}
        <div className="grid grid-cols-2 gap-3">
          {" "}
          <QuickActionButton
            icon={<FileText className="h-5 w-5" />}
            label="Quick Proposal"
            onClick={() => setActiveTab("proposal")}
            variant="primary"
          />{" "}
          <QuickActionButton
            icon={<Phone className="h-5 w-5" />}
            label="Call Venue"
            onClick={() => (window.location.href = `tel:${venueInfo.phone}`)}
            variant="secondary"
          />{" "}
          <QuickActionButton
            icon={<Calculator className="h-5 w-5" />}
            label="Price Check"
            onClick={() => setActiveTab("proposal")}
            variant="secondary"
          />{" "}
          <QuickActionButton
            icon={<Navigation className="h-5 w-5" />}
            label="Directions"
            onClick={() =>
              (window.location.href = `https://maps.google.com/?q=${venueInfo.address}`)
            }
            variant="secondary"
          />{" "}
        </div>{" "}
        {/* Tab Content */}{" "}
        {activeTab === "overview" && (
          <OverviewTab venue={venueInfo} context={fieldContext} />
        )}{" "}
        {activeTab === "proposal" && (
          <ProposalTab context={fieldContext} venue={venueInfo} />
        )}{" "}
        {activeTab === "notes" && (
          <NotesTab context={fieldContext} setContext={setFieldContext} />
        )}{" "}
        {/* Navigation Tabs */}{" "}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border/30 flex gap-0">
          {" "}
          {(["overview", "proposal", "notes"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium text-center capitalize transition-colors ${activeTab === tab ? "border-t-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {" "}
              {tab === "proposal" ? "Estimate" : tab}{" "}
            </button>
          ))}{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
} /** * Venue Stats Card */
function VenueStatsCard({
  venue,
  fieldContext,
}: {
  venue: VenueQuickInfo;
  fieldContext: FieldContext;
}) {
  const pricePerGuest =
    fieldContext.estimatedBudget / fieldContext.estimatedGuests;
  return (
    <Card className="glass-panel border-0">
      {" "}
      <CardContent className="p-4 space-y-3">
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div>
            {" "}
            <p className="text-xs text-muted-foreground">Max Capacity</p>{" "}
            <p className="text-lg font-bold">{venue.maxCapacity}</p>{" "}
          </div>{" "}
          <div>
            {" "}
            <p className="text-xs text-muted-foreground">Your Guests</p>{" "}
            <p className="text-lg font-bold text-primary">
              {fieldContext.estimatedGuests}
            </p>{" "}
          </div>{" "}
          <div>
            {" "}
            <p className="text-xs text-muted-foreground">Price/Guest</p>{" "}
            <p className="text-lg font-bold text-green-600">
              ${pricePerGuest.toFixed(0)}
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <Progress
          value={(fieldContext.estimatedGuests / venue.maxCapacity) * 100}
          className="h-2"
        />{" "}
        <p className="text-xs text-muted-foreground">
          {" "}
          {Math.round((fieldContext.estimatedGuests / venue.maxCapacity) * 100)}
          % capacity{" "}
        </p>{" "}
      </CardContent>{" "}
    </Card>
  );
} /** * Quick Action Button */
function QuickActionButton({
  icon,
  label,
  onClick,
  variant = "secondary",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-4 rounded-lg transition-all active:scale-95",
        variant === "primary"
          ? "bg-primary text-white hover:bg-primary/90"
          : "bg-background border border-border/50 text-foreground hover:bg-accent",
      )}
    >
      {" "}
      {icon} <span className="text-xs font-medium">{label}</span>{" "}
    </button>
  );
} /** * Overview Tab */
function OverviewTab({
  venue,
  context,
}: {
  venue: VenueQuickInfo;
  context: FieldContext;
}) {
  return (
    <div className="space-y-3">
      {" "}
      {/* Venue Contact */}{" "}
      <Card className="glass-panel border-0">
        {" "}
        <CardHeader className="pb-2">
          {" "}
          <CardTitle className="text-sm">Contact</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-2">
          {" "}
          <a
            href={`tel:${venue.phone}`}
            className="flex items-center gap-3 p-2 rounded hover:bg-accent"
          >
            {" "}
            <Phone className="h-4 w-4 text-blue-500" />{" "}
            <span className="text-sm font-mono">{venue.phone}</span>{" "}
          </a>{" "}
          {venue.website && (
            <a
              href={venue.website}
              target="_blank"
              className="flex items-center gap-3 p-2 rounded hover:bg-accent"
            >
              {" "}
              <Globe className="h-4 w-4 text-green-500" />{" "}
              <span className="text-sm">{venue.website}</span>{" "}
            </a>
          )}{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Available Rooms */}{" "}
      <Card className="glass-panel border-0">
        {" "}
        <CardHeader className="pb-2">
          {" "}
          <CardTitle className="text-sm">Available Rooms</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-2">
          {" "}
          {venue.availableRooms.map((room) => (
            <div
              key={room.name}
              className="p-2 rounded border border-border/30 flex justify-between items-center"
            >
              {" "}
              <span className="text-sm font-medium">{room.name}</span>{" "}
              <Badge variant="outline" className="text-xs">
                {" "}
                {room.capacity} ppl{" "}
              </Badge>{" "}
            </div>
          ))}{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Proposal Stage */}{" "}
      <Card className="glass-panel border-0 bg-blue-50 border-l-4 border-l-blue-500">
        {" "}
        <CardContent className="p-4">
          {" "}
          <p className="text-xs text-muted-foreground mb-2">
            PROPOSAL STAGE
          </p>{" "}
          <p className="font-semibold capitalize">
            {context.proposalStage.replace("-", " ")}
          </p>{" "}
          <div className="mt-3 flex gap-2">
            {" "}
            <Badge variant="outline" className="text-xs">
              {" "}
              {context.estimatedGuests} guests{" "}
            </Badge>{" "}
            <Badge className="text-xs bg-green-500">
              ${context.estimatedBudget.toLocaleString()}
            </Badge>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
    </div>
  );
} /** * Proposal Tab */
function ProposalTab({
  context,
  venue,
}: {
  context: FieldContext;
  venue: VenueQuickInfo;
}) {
  const perPersonCost = context.estimatedBudget / context.estimatedGuests;
  const venueRevenue = perPersonCost * context.estimatedGuests;
  const profitMargin = (venueRevenue - venueRevenue * 0.4) / venueRevenue;
  return (
    <div className="space-y-3">
      {" "}
      <Card className="glass-panel border-0">
        {" "}
        <CardHeader className="pb-2">
          {" "}
          <CardTitle className="text-sm">Quick Estimate</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-3">
          {" "}
          <div className="grid grid-cols-2 gap-2">
            {" "}
            <div className="p-2 rounded bg-slate-50">
              {" "}
              <p className="text-xs text-muted-foreground">Guests</p>{" "}
              <p className="text-lg font-bold">
                {context.estimatedGuests}
              </p>{" "}
            </div>{" "}
            <div className="p-2 rounded bg-slate-50">
              {" "}
              <p className="text-xs text-muted-foreground">Total Budget</p>{" "}
              <p className="text-lg font-bold">
                ${context.estimatedBudget}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <div className="border-t border-border/30 pt-3 space-y-2">
            {" "}
            <div className="flex justify-between">
              {" "}
              <span className="text-sm">Per Person</span>{" "}
              <span className="font-semibold">
                ${perPersonCost.toFixed(0)}
              </span>{" "}
            </div>{" "}
            <div className="flex justify-between">
              {" "}
              <span className="text-sm">Estimated Margin</span>{" "}
              <span className="font-semibold text-green-600">
                {(profitMargin * 100).toFixed(0)}%
              </span>{" "}
            </div>{" "}
            <div className="flex justify-between">
              {" "}
              <span className="text-sm">Profit</span>{" "}
              <span className="font-semibold text-green-600">
                {" "}
                ${(venueRevenue * profitMargin).toLocaleString()}{" "}
              </span>{" "}
            </div>{" "}
          </div>{" "}
          <Button className="w-full mt-3 gap-2">
            {" "}
            <FileText className="h-4 w-4" /> Generate Proposal{" "}
          </Button>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Menu Suggestions */}{" "}
      <Card className="glass-panel border-0">
        {" "}
        <CardHeader className="pb-2">
          {" "}
          <CardTitle className="text-sm">Menu Options</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-2">
          {" "}
          {[
            { name: "Classic", price: 75 },
            { name: "Premium", price: 95 },
            { name: "Deluxe", price: 125 },
          ].map((menu) => (
            <button
              key={menu.name}
              className="w-full p-3 rounded border border-border/30 hover:bg-accent transition-colors text-left"
            >
              {" "}
              <div className="flex justify-between items-center">
                {" "}
                <span className="font-medium text-sm">{menu.name}</span>{" "}
                <span className="font-semibold">${menu.price}</span>{" "}
              </div>{" "}
              <p className="text-xs text-muted-foreground mt-1">
                {" "}
                Total: $
                {(menu.price * context.estimatedGuests).toLocaleString()}{" "}
              </p>{" "}
            </button>
          ))}{" "}
        </CardContent>{" "}
      </Card>{" "}
    </div>
  );
} /** * Notes Tab */
function NotesTab({
  context,
  setContext,
}: {
  context: FieldContext;
  setContext: (ctx: FieldContext) => void;
}) {
  return (
    <div className="space-y-3">
      {" "}
      <Card className="glass-panel border-0">
        {" "}
        <CardHeader className="pb-2">
          {" "}
          <CardTitle className="text-sm">Tour Notes</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <textarea
            value={context.notes}
            onChange={(e) => setContext({ ...context, notes: e.target.value })}
            placeholder="Add notes about the client..."
            className="w-full p-2 border border-border/30 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            rows={4}
          />{" "}
        </CardContent>{" "}
      </Card>{" "}
      <Card className="glass-panel border-0">
        {" "}
        <CardHeader className="pb-2">
          {" "}
          <CardTitle className="text-sm">Dietary Restrictions</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-2">
          {" "}
          {["Vegetarian", "Vegan", "Gluten-Free", "Kosher", "Halal"].map(
            (diet) => (
              <label
                key={diet}
                className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer"
              >
                {" "}
                <input
                  type="checkbox"
                  checked={
                    context.dietaryRestrictions?.includes(diet.toLowerCase()) ||
                    false
                  }
                  onChange={(e) => {
                    const updated = e.target.checked
                      ? [
                          ...(context.dietaryRestrictions || []),
                          diet.toLowerCase(),
                        ]
                      : (context.dietaryRestrictions || []).filter(
                          (d) => d !== diet.toLowerCase(),
                        );
                    setContext({ ...context, dietaryRestrictions: updated });
                  }}
                  className="rounded"
                />{" "}
                <span className="text-sm">{diet}</span>{" "}
              </label>
            ),
          )}{" "}
        </CardContent>{" "}
      </Card>{" "}
      <Button className="w-full gap-2">
        {" "}
        <Lock className="h-4 w-4" /> Save & Lock{" "}
      </Button>{" "}
    </div>
  );
}
function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
