import React from "react";
/** * Operations Board * Real-time view of all active events and their operational status */ import {
  useState,
  useEffect,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Users,
  ChefHat,
  AlertCircle,
  Search,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OpsBoardEvent } from "@/shared/event-types"; // Mock data
const MOCK_EVENTS: OpsBoardEvent[] = [
  {
    id: "evt_001",
    name: "Johnson Wedding Reception",
    spaceName: "Grand Ballroom",
    startTime: "6:00 PM",
    endTime: "11:00 PM",
    headcount: 200,
    setupType: "Plated Dinner",
    notes: "Extra bar setup required",
    status: "active",
  },
  {
    id: "evt_002",
    name: "Corporate Gala",
    spaceName: "Marina Hall",
    startTime: "7:00 PM",
    endTime: "10:00 PM",
    headcount: 150,
    setupType: "Cocktail Reception",
    notes: "VIP guests - premium service",
    status: "active",
  },
  {
    id: "evt_003",
    name: "Product Launch",
    spaceName: "Board Room",
    startTime: "2:00 PM",
    endTime: "4:00 PM",
    headcount: 50,
    setupType: "Stations",
    notes: "",
    status: "active",
  },
  {
    id: "evt_004",
    name: "Anniversary Dinner",
    spaceName: "Private Dining",
    startTime: "8:00 PM",
    endTime: "10:30 PM",
    headcount: 20,
    setupType: "Plated Dinner",
    notes: "Special dessert surprise planned",
    status: "active",
  },
];
const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  completed: "bg-slate-100 text-slate-800 dark:bg-slate-700",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};
export function OpsBoard() {
  const [events, setEvents] = useState<OpsBoardEvent[]>(MOCK_EVENTS);
  const [filter, setFilter] = useState<"all" | "active" | "critical">("active");
  const [searchTerm, setSearchTerm] = useState("");
  const filteredEvents = events.filter((evt) => {
    if (filter === "critical") {
      return evt.notes?.toLowerCase().includes("critical");
    }
    if (filter !== "all" && evt.status !== filter) {
      return false;
    }
    return (
      evt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.spaceName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  return (
    <div className="space-y-4">
      {" "}
      {/* Header */}{" "}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {" "}
        <div>
          {" "}
          <h2 className="text-2xl font-bold">Operations Board</h2>{" "}
          <p className="text-sm text-muted-foreground mt-1">
            {" "}
            Real-time view of all active events{" "}
          </p>{" "}
        </div>{" "}
        <div className="flex gap-2">
          {" "}
          <Button
            variant={filter === "active" ? "default" : "outline"}
            onClick={() => setFilter("active")}
            size="sm"
          >
            {" "}
            Active Events{" "}
          </Button>{" "}
          <Button
            variant={filter === "critical" ? "default" : "outline"}
            onClick={() => setFilter("critical")}
            size="sm"
          >
            {" "}
            <AlertCircle className="h-4 w-4 mr-2" /> Critical{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
      {/* Search */}{" "}
      <div className="relative">
        {" "}
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />{" "}
        <input
          type="text"
          placeholder="Search events or spaces..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-border bg-background dark:bg-surface text-sm"
        />{" "}
      </div>{" "}
      {/* Events Grid */}{" "}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {" "}
          {filteredEvents.map((evt) => (
            <Card
              key={evt.id}
              className={cn(
                "hover:shadow-md transition-all cursor-pointer",
                evt.notes?.toLowerCase().includes("critical") &&
                  "border-red-300 dark:border-red-800",
              )}
            >
              {" "}
              <CardContent className="p-4">
                {" "}
                <div className="flex items-start justify-between gap-4">
                  {" "}
                  {/* Event Info */}{" "}
                  <div className="flex-1 min-w-0">
                    {" "}
                    <div className="flex items-center gap-2 mb-2">
                      {" "}
                      <h3 className="font-semibold truncate">
                        {evt.name}
                      </h3>{" "}
                      <Badge
                        className={STATUS_COLORS[evt.status] || ""}
                        variant="outline"
                      >
                        {" "}
                        {evt.status}{" "}
                      </Badge>{" "}
                      {evt.notes?.toLowerCase().includes("critical") && (
                        <Badge variant="destructive" className="ml-auto">
                          {" "}
                          <AlertCircle className="h-3 w-3 mr-1" /> Critical{" "}
                        </Badge>
                      )}{" "}
                    </div>{" "}
                    {/* Location & Time */}{" "}
                    <div className="text-xs text-muted-foreground space-y-1 mb-3">
                      {" "}
                      <div className="flex items-center gap-2">
                        {" "}
                        <span className="font-medium">Space:</span>{" "}
                        <span>{evt.spaceName}</span>{" "}
                      </div>{" "}
                      <div className="flex items-center gap-2">
                        {" "}
                        <Clock className="h-3.5 w-3.5" />{" "}
                        <span>
                          {" "}
                          {evt.startTime} - {evt.endTime}{" "}
                        </span>{" "}
                      </div>{" "}
                    </div>{" "}
                    {/* Details Row */}{" "}
                    <div className="flex flex-wrap gap-4 text-xs">
                      {" "}
                      <div className="flex items-center gap-1">
                        {" "}
                        <Users className="h-3.5 w-3.5 text-primary dark:text-blue-400" />{" "}
                        <span className="font-medium">{evt.headcount}</span>{" "}
                        <span className="text-muted-foreground">
                          guests
                        </span>{" "}
                      </div>{" "}
                      <div className="flex items-center gap-1">
                        {" "}
                        <ChefHat className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />{" "}
                        <span className="font-medium">
                          {evt.setupType}
                        </span>{" "}
                      </div>{" "}
                    </div>{" "}
                    {/* Notes */}{" "}
                    {evt.notes && (
                      <div className="mt-2 p-2 rounded-sm bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                        {" "}
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          {" "}
                          📝 {evt.notes}{" "}
                        </p>{" "}
                      </div>
                    )}{" "}
                  </div>{" "}
                  {/* Action Buttons — iter207b · contextual row actions */}{" "}
                  <div className="flex flex-col gap-1 ml-4">
                    {" "}
                    <Button
                      data-testid={`row-btn-schedule-${evt.id}`}
                      variant="outline"
                      size="sm"
                      className="w-32 text-xs"
                      onClick={() => window.dispatchEvent(new CustomEvent("echo:event:open-schedule", { detail: { id: evt.id, name: evt.name } }))}
                    >
                      {" "}Schedule{" "}
                    </Button>{" "}
                    <Button
                      data-testid={`row-btn-recipes-${evt.id}`}
                      variant="outline"
                      size="sm"
                      className="w-32 text-xs"
                      onClick={() => window.dispatchEvent(new CustomEvent("echo:event:open-recipes", { detail: { id: evt.id, name: evt.name } }))}
                    >
                      {" "}Recipes{" "}
                    </Button>{" "}
                    <Button
                      data-testid={`row-btn-maestro-${evt.id}`}
                      variant="outline"
                      size="sm"
                      className="w-32 text-xs"
                      onClick={() => window.dispatchEvent(new CustomEvent("echo:event:push-maestro", { detail: { id: evt.id, name: evt.name } }))}
                    >
                      {" "}Push→Maestro{" "}
                    </Button>{" "}
                    <Button
                      data-testid={`row-btn-viewer-${evt.id}`}
                      variant="outline"
                      size="sm"
                      className="w-32 text-xs"
                      onClick={() => window.dispatchEvent(new CustomEvent("echo:event:open-viewer", { detail: { id: evt.id, name: evt.name } }))}
                    >
                      {" "}Echo Viewer{" "}
                    </Button>{" "}
                    <Button
                      data-testid={`row-btn-aurum-${evt.id}`}
                      variant="ghost"
                      size="sm"
                      className="w-32 text-xs"
                      onClick={() => window.dispatchEvent(new CustomEvent("echo:event:open-aurum", { detail: { id: evt.id, name: evt.name } }))}
                    >
                      {" "}Aurum ledger{" "}
                    </Button>{" "}
                  </div>{" "}
                </div>{" "}
              </CardContent>{" "}
            </Card>
          ))}{" "}
        </div>
      ) : (
        <Card>
          {" "}
          <CardContent className="py-12 text-center">
            {" "}
            <p className="text-muted-foreground">No events found</p>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
      {/* Summary Footer */}{" "}
      {filteredEvents.length > 0 && (
        <Card className="bg-slate-50 dark:bg-surface">
          {" "}
          <CardContent className="p-4">
            {" "}
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              {" "}
              <div>
                {" "}
                <p className="font-bold text-lg">
                  {" "}
                  {filteredEvents.reduce(
                    (sum, evt) => sum + evt.headcount,
                    0,
                  )}{" "}
                </p>{" "}
                <p className="text-xs text-muted-foreground">
                  Total Guests
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <p className="font-bold text-lg">
                  {filteredEvents.length}
                </p>{" "}
                <p className="text-xs text-muted-foreground">
                  Active Events
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <p className="font-bold text-lg">
                  {" "}
                  {filteredEvents.filter((e) => e.notes).length}{" "}
                </p>{" "}
                <p className="text-xs text-muted-foreground">Notes</p>{" "}
              </div>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
    </div>
  );
}
export default OpsBoard;
