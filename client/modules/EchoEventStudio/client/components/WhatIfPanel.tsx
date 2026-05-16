import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Item } from "@/pages/Planner";
interface Props {
  items: Item[];
  onApply: (deltaCocktail: number) => void;
}
export default function WhatIfPanel({ items, onApply }: Props) {
  const [delta, setDelta] = useState(0);
  const [avgCheck, setAvgCheck] = useState(45);
  const [turnsPerHour, setTurnsPerHour] = useState(1.2);
  const [hours, setHours] = useState(3);
  const seatsPerCocktail = 4;
  const baseSeats = useMemo(() => {
    let s = 0;
    for (const it of items) {
      if (it.type.startsWith("round") || it.type.startsWith("rect"))
        s += Math.max(0, it.seats || 0);
      if (it.type === "chair") s += 1;
    }
    return s;
  }, [items]);
  const deltaSeats = delta * seatsPerCocktail;
  const previewSeats = baseSeats + deltaSeats;
  const gross = avgCheck * turnsPerHour * hours * previewSeats;
  return (
    <div className="space-y-2">
      {" "}
      <h3 className="text-sm font-semibold">What-If: Cocktails</h3>{" "}
      <div className="text-xs text-muted-foreground">
        {" "}
        Adjust +/- cocktail tables. Preview seats and gross.{" "}
      </div>{" "}
      <input
        type="range"
        min={-20}
        max={20}
        step={1}
        value={delta}
        onChange={(e) => setDelta(Number(e.target.value))}
        className="w-full"
      />{" "}
      <div className="text-xs flex justify-between">
        {" "}
        <span>Δ Cocktail: {delta}</span> <span>Δ Seats: {deltaSeats}</span>{" "}
      </div>{" "}
      <div className="grid grid-cols-3 gap-2">
        {" "}
        <div>
          {" "}
          <label className="text-[10px] text-muted-foreground">
            Avg Check
          </label>{" "}
          <Input
            className="h-8"
            type="number"
            step="1"
            value={avgCheck}
            onChange={(e) => setAvgCheck(Number(e.target.value))}
          />{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="text-[10px] text-muted-foreground">
            Turns/hr
          </label>{" "}
          <Input
            className="h-8"
            type="number"
            step="0.1"
            value={turnsPerHour}
            onChange={(e) => setTurnsPerHour(Number(e.target.value))}
          />{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="text-[10px] text-muted-foreground">
            Hours
          </label>{" "}
          <Input
            className="h-8"
            type="number"
            step="0.5"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          />{" "}
        </div>{" "}
      </div>{" "}
      <div className="text-xs">
        {" "}
        Preview Seats: <span className="font-medium">{previewSeats}</span>{" "}
      </div>{" "}
      <div className="text-xs">
        {" "}
        Preview Gross:{" "}
        <span className="font-medium">${gross.toFixed(0)}</span>{" "}
      </div>{" "}
      <Button size="sm" onClick={() => onApply(delta)} disabled={delta === 0}>
        {" "}
        Apply{" "}
      </Button>{" "}
    </div>
  );
}
