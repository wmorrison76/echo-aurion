import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  StandardizedLineItem,
  RecipeCostBreakdownRow,
  RecipeCostingResult,
} from "@shared/api";
const parseTimestamp = (value: string | null | undefined): number => {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};
const makeOptionKey = (item: StandardizedLineItem): string =>
  JSON.stringify([item.standardized.standardizedName, item.vendor]);
type RecipeRow = { optionKey: string; quantity: number };
type OptionEntry = { key: string; item: StandardizedLineItem };
export function RecipeCosting({
  catalog,
}: {
  catalog: StandardizedLineItem[];
}) {
  const [recipeName, setRecipeName] = useState("New Recipe");
  const [portions, setPortions] = useState(1);
  const [rows, setRows] = useState<RecipeRow[]>([]);
  const optionEntries: OptionEntry[] = useMemo(() => {
    const dedup = new Map<string, OptionEntry>();
    for (const item of catalog) {
      const key = makeOptionKey(item);
      const existing = dedup.get(key);
      if (!existing) {
        dedup.set(key, { key, item });
        continue;
      }
      const existingTs = parseTimestamp(existing.item.date);
      const candidateTs = parseTimestamp(item.date);
      if (candidateTs >= existingTs) {
        dedup.set(key, { key, item });
      }
    }
    return Array.from(dedup.values()).sort((a, b) => {
      const nameCompare = a.item.standardized.standardizedName.localeCompare(
        b.item.standardized.standardizedName,
      );
      if (nameCompare !== 0) return nameCompare;
      return a.item.vendor.localeCompare(b.item.vendor);
    });
  }, [catalog]);
  const optionMap = useMemo(() => {
    return new Map(optionEntries.map((entry) => [entry.key, entry.item]));
  }, [optionEntries]);
  useEffect(() => {
    setRows((previous) => {
      if (!optionEntries.length) {
        return previous.length ? [] : previous;
      }
      const fallbackKey = optionEntries[0].key;
      let changed = false;
      const updated = previous.map((row) => {
        if (optionMap.has(row.optionKey)) {
          return row;
        }
        changed = true;
        return { ...row, optionKey: fallbackKey };
      });
      return changed ? updated : previous;
    });
  }, [optionEntries, optionMap]);
  const addRow = () => {
    const defaultOption = optionEntries[0];
    if (!defaultOption) return;
    setRows((current) => [
      ...current,
      { optionKey: defaultOption.key, quantity: 1 },
    ]);
  };
  const updateRow = (index: number, patch: Partial<RecipeRow>) => {
    setRows((current) =>
      current.map((row, idx) => (idx === index ? { ...row, ...patch } : row)),
    );
  };
  const removeRow = (index: number) => {
    setRows((current) => current.filter((_, idx) => idx !== index));
  };
  const costing: RecipeCostingResult | null = useMemo(() => {
    if (!rows.length) return null;
    const breakdown: RecipeCostBreakdownRow[] = [];
    for (const row of rows) {
      const product = optionMap.get(row.optionKey);
      if (!product) continue;
      const unit = product.standardized.standardUnit || "oz";
      const costPer = product.costPerStandardUnit || 0;
      breakdown.push({
        productStandardName: product.standardized.standardizedName,
        quantity: row.quantity,
        unit,
        costPerUnit: costPer,
        extendedCost: costPer * row.quantity,
      });
    }
    if (!breakdown.length) return null;
    const total = breakdown.reduce((sum, entry) => sum + entry.extendedCost, 0);
    const perPortion = portions > 0 ? total / portions : total;
    return {
      recipeName,
      portions,
      rows: breakdown,
      totalRecipeCost: total,
      costPerPortion: perPortion,
    };
  }, [rows, optionMap, portions, recipeName]);
  return (
    <Card className="border-2">
      {" "}
      <CardHeader>
        {" "}
        <CardTitle>Recipe & Menu Costing</CardTitle>{" "}
        <CardDescription>
          {" "}
          Link ingredients to standardized costs. Updates in real-time from
          invoices.{" "}
        </CardDescription>{" "}
      </CardHeader>{" "}
      <CardContent>
        {" "}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {" "}
          <div>
            {" "}
            <Label htmlFor="recipe-name">Name</Label>{" "}
            <Input
              id="recipe-name"
              value={recipeName}
              onChange={(event) => setRecipeName(event.target.value)}
            />{" "}
          </div>{" "}
          <div>
            {" "}
            <Label htmlFor="recipe-portions">Portions</Label>{" "}
            <Input
              id="recipe-portions"
              type="number"
              min={1}
              value={portions}
              onChange={(event) =>
                setPortions(Math.max(1, Number(event.target.value) || 1))
              }
            />{" "}
          </div>{" "}
          <div className="self-end">
            {" "}
            <Button
              className="w-full"
              onClick={addRow}
              disabled={!optionEntries.length}
            >
              {" "}
              Add Ingredient{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
        <div className="mt-4 rounded-lg border">
          {" "}
          <Table>
            {" "}
            <TableHeader>
              {" "}
              <TableRow>
                {" "}
                <TableHead>Ingredient</TableHead>{" "}
                <TableHead className="w-[20ch]">Vendor</TableHead>{" "}
                <TableHead className="w-[14ch]">Qty</TableHead>{" "}
                <TableHead className="w-[10ch]">Unit</TableHead>{" "}
                <TableHead className="w-[16ch] text-right">Cost/Unit</TableHead>{" "}
                <TableHead className="w-[16ch] text-right">Extended</TableHead>{" "}
                <TableHead className="w-[8ch]" />{" "}
              </TableRow>{" "}
            </TableHeader>{" "}
            <TableBody>
              {" "}
              {rows.map((row, index) => {
                const product = optionMap.get(row.optionKey);
                return (
                  <TableRow key={`${row.optionKey}-${index}`}>
                    {" "}
                    <TableCell>
                      {" "}
                      <select
                        className="w-full rounded-md border bg-background p-2"
                        value={row.optionKey}
                        onChange={(event) =>
                          updateRow(index, { optionKey: event.target.value })
                        }
                      >
                        {" "}
                        {optionEntries.map((entry) => (
                          <option key={entry.key} value={entry.key}>
                            {" "}
                            {entry.item.standardized.standardizedName} •{" "}
                            {entry.item.vendor}{" "}
                          </option>
                        ))}{" "}
                      </select>{" "}
                    </TableCell>{" "}
                    <TableCell className="text-sm text-muted-foreground">
                      {" "}
                      {product?.vendor ?? "—"}{" "}
                    </TableCell>{" "}
                    <TableCell>
                      {" "}
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.quantity}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          updateRow(index, {
                            quantity: Number.isFinite(nextValue)
                              ? nextValue
                              : 0,
                          });
                        }}
                      />{" "}
                    </TableCell>{" "}
                    <TableCell className="text-sm text-muted-foreground">
                      {" "}
                      {product?.standardized.standardUnit ?? "oz"}{" "}
                    </TableCell>{" "}
                    <TableCell className="text-right tabular-nums">
                      {" "}
                      $
                      {((product?.costPerStandardUnit || 0) as number).toFixed(
                        4,
                      )}{" "}
                    </TableCell>{" "}
                    <TableCell className="text-right tabular-nums">
                      {" "}
                      $
                      {(
                        ((product?.costPerStandardUnit || 0) as number) *
                        row.quantity
                      ).toFixed(4)}{" "}
                    </TableCell>{" "}
                    <TableCell className="text-right">
                      {" "}
                      <Button variant="ghost" onClick={() => removeRow(index)}>
                        {" "}
                        Remove{" "}
                      </Button>{" "}
                    </TableCell>{" "}
                  </TableRow>
                );
              })}{" "}
              {!rows.length && (
                <TableRow>
                  {" "}
                  <TableCell
                    colSpan={7}
                    className="text-center text-sm text-muted-foreground"
                  >
                    {" "}
                    {optionEntries.length
                      ? "Add ingredients to start costing your recipe."
                      : "No standardized cost data available for this outlet yet."}{" "}
                  </TableCell>{" "}
                </TableRow>
              )}{" "}
            </TableBody>{" "}
          </Table>{" "}
        </div>{" "}
        {costing && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {" "}
            <Stat
              label="Total Recipe Cost"
              value={`$${costing.totalRecipeCost.toFixed(2)}`}
            />{" "}
            <Stat
              label="Cost per Portion"
              value={`$${costing.costPerPortion.toFixed(2)}`}
            />{" "}
            <Stat label="Ingredients" value={`${costing.rows.length}`} />{" "}
          </div>
        )}{" "}
      </CardContent>{" "}
    </Card>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4">
      {" "}
      <div className="text-xs text-muted-foreground">{label}</div>{" "}
      <div className="text-xl font-semibold">{value}</div>{" "}
    </div>
  );
}
