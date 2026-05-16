import React from "react";
/** * Step 1: Outlet & Space Selection * Choose venue outlet and event space with capacity review */ import { useState } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Building2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils"; // Mock data - replace with actual API calls
const MOCK_OUTLETS = [
  {
    id: "outlet_1",
    name: "Downtown Hotel",
    code: "DT-HOTEL",
    city: "San Francisco",
  },
  {
    id: "outlet_2",
    name: "Waterfront Venue",
    code: "WF-VENUE",
    city: "San Francisco",
  },
];
const MOCK_SPACES = {
  outlet_1: [
    {
      id: "space_1",
      name: "Grand Ballroom",
      maxCapacity: 500,
      minCapacity: 50,
    },
    { id: "space_2", name: "Board Room", maxCapacity: 50, minCapacity: 10 },
  ],
  outlet_2: [
    { id: "space_3", name: "Marina Hall", maxCapacity: 300, minCapacity: 30 },
  ],
};
interface Outlet {
  id: string;
  name: string;
  code: string;
  city?: string;
}
interface Space {
  id: string;
  name: string;
  maxCapacity: number;
  minCapacity: number;
}
interface StepOutletAndSpaceProps {
  onNext: () => void;
}
export function StepOutletAndSpace({ onNext }: StepOutletAndSpaceProps) {
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [space, setSpace] = useState<Space | null>(null);
  const canProceed = outlet && space;
  const availableSpaces = outlet
    ? MOCK_SPACES[outlet.id as keyof typeof MOCK_SPACES] || []
    : [];
  return (
    <>
      {" "}
      <CardHeader>
        {" "}
        <CardTitle className="flex items-center gap-2">
          {" "}
          <Building2 className="h-5 w-5" /> Select Outlet & Space{" "}
        </CardTitle>{" "}
        <p className="text-sm text-muted-foreground mt-2">
          {" "}
          Choose the venue and event space for this event{" "}
        </p>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-6">
        {" "}
        {/* Outlet Selection */}{" "}
        <div>
          {" "}
          <label className="text-sm font-semibold mb-3 block">
            {" "}
            Outlet / Venue{" "}
          </label>{" "}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {" "}
            {MOCK_OUTLETS.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  setOutlet(o);
                  setSpace(null);
                }}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all text-left",
                  outlet?.id === o.id
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 dark:border-border hover:border-primary/50",
                )}
              >
                {" "}
                <div className="font-medium flex items-center gap-2">
                  {" "}
                  <Building2 className="h-4 w-4" /> {o.name}{" "}
                </div>{" "}
                <div className="text-xs text-muted-foreground mt-1">
                  {" "}
                  {o.code}{" "}
                </div>{" "}
                {o.city && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    {" "}
                    <MapPin className="h-3 w-3" /> {o.city}{" "}
                  </div>
                )}{" "}
              </button>
            ))}{" "}
          </div>{" "}
        </div>{" "}
        {/* Space Selection */}{" "}
        {outlet && (
          <div>
            {" "}
            <label className="text-sm font-semibold mb-3 block">
              {" "}
              Event Space{" "}
            </label>{" "}
            {availableSpaces.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {" "}
                {availableSpaces.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSpace(s)}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all text-left",
                      space?.id === s.id
                        ? "border-primary bg-primary/5"
                        : "border-slate-200 dark:border-border hover:border-primary/50",
                    )}
                  >
                    {" "}
                    <div className="font-medium">{s.name}</div>{" "}
                    <div className="text-xs text-muted-foreground mt-2">
                      {" "}
                      <p>
                        {" "}
                        Capacity:{""}{" "}
                        <Badge variant="secondary" className="ml-1">
                          {" "}
                          {s.minCapacity} - {s.maxCapacity} guests{" "}
                        </Badge>{" "}
                      </p>{" "}
                    </div>{" "}
                  </button>
                ))}{" "}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex gap-2">
                {" "}
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />{" "}
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  {" "}
                  No spaces available for this outlet{" "}
                </div>{" "}
              </div>
            )}{" "}
          </div>
        )}{" "}
        {/* Capacity Info */}{" "}
        {space && (
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            {" "}
            <p className="text-sm font-medium text-blue-900 dark:text-primary">
              {" "}
              {space.name} Capacity{" "}
            </p>{" "}
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              {" "}
              Minimum: {space.minCapacity} guests • Maximum: {space.maxCapacity}
              {""} guests{" "}
            </p>{" "}
          </div>
        )}{" "}
        {/* Action Buttons */}{" "}
        <div className="flex justify-end gap-3 pt-4 border-t">
          {" "}
          <Button
            disabled={!canProceed}
            onClick={onNext}
            size="lg"
            className="gap-2"
          >
            {" "}
            Continue →{" "}
          </Button>{" "}
        </div>{" "}
      </CardContent>{" "}
    </>
  );
}
