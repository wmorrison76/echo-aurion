import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import type { InvoiceLineItemRaw } from "@shared/api";
interface LowConfidenceItem {
  lineNumber: number;
  rawText: string;
  productName?: string;
  quantity?: number;
  unit?: string;
  totalCost?: number;
  confidence: number;
  flags: string[];
}
interface LowConfidenceOverlayProps {
  items: LowConfidenceItem[];
  threshold?: number; // confidence below this (default 95) onItemCorrected?: (lineNumber: number, correctedData: Partial<LowConfidenceItem>) => void;
}
const flagLabels: Record<string, string> = {
  quantity_missing: "Quantity not detected",
  unit_missing: "Unit not detected",
  product_missing: "Product name unclear",
  price_missing: "Price not found",
};
export function LowConfidenceOverlay({
  items,
  threshold = 95,
  onItemCorrected,
}: LowConfidenceOverlayProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [corrections, setCorrections] = useState<
    Map<number, Partial<LowConfidenceItem>>
  >(new Map());
  const lowConfidenceItems = items.filter(
    (item) => item.confidence < threshold,
  );
  if (lowConfidenceItems.length === 0) {
    return null;
  }
  const toggleExpanded = (lineNumber: number) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(lineNumber)) {
      newSet.delete(lineNumber);
    } else {
      newSet.add(lineNumber);
    }
    setExpandedItems(newSet);
  };
  const handleCorrectionSubmit = (lineNumber: number) => {
    const correction = corrections.get(lineNumber);
    if (correction && onItemCorrected) {
      onItemCorrected(lineNumber, correction);
      const newCorrections = new Map(corrections);
      newCorrections.delete(lineNumber);
      setCorrections(newCorrections);
    }
  };
  return (
    <Card className="border border-yellow-500/20 bg-yellow-500/5">
      {" "}
      <CardHeader className="pb-3">
        {" "}
        <div className="flex items-start gap-3">
          {" "}
          <AlertTriangle className="mt-1 h-5 w-5 flex-shrink-0 text-yellow-500" />{" "}
          <div className="flex-1">
            {" "}
            <CardTitle className="flex items-center gap-2 text-base text-yellow-100">
              {" "}
              {lowConfidenceItems.length} Low-Confidence Item
              {lowConfidenceItems.length !== 1 ? "s" : ""} Need Review{" "}
            </CardTitle>{" "}
            <CardDescription className="text-yellow-200/70">
              {" "}
              Below 95% confidence threshold. The system learned these patterns
              but needs your verification.{" "}
            </CardDescription>{" "}
          </div>{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-3">
        {" "}
        {lowConfidenceItems.map((item) => {
          const isExpanded = expandedItems.has(item.lineNumber);
          const hasCorrection = corrections.has(item.lineNumber);
          return (
            <div
              key={item.lineNumber}
              className="rounded border border-yellow-500/30 bg-surface p-3"
            >
              {" "}
              {/* Summary Row */}{" "}
              <button
                onClick={() => toggleExpanded(item.lineNumber)}
                className="flex w-full items-start justify-between gap-2 text-left"
              >
                {" "}
                <div className="flex-1 min-w-0">
                  {" "}
                  <div className="flex items-center gap-2">
                    {" "}
                    <span className="font-mono text-xs text-slate-400">
                      Line {item.lineNumber}
                    </span>{" "}
                    <Badge variant="secondary" className="text-xs">
                      {" "}
                      {item.confidence}% confidence{" "}
                    </Badge>{" "}
                  </div>{" "}
                  <p className="mt-1 line-clamp-2 text-sm text-slate-300">
                    {item.rawText}
                  </p>{" "}
                </div>{" "}
                <div className="flex flex-col items-end gap-2">
                  {" "}
                  {item.flags.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {" "}
                      {item.flags.length} issue
                      {item.flags.length !== 1 ? "s" : ""}{" "}
                    </Badge>
                  )}{" "}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}{" "}
                </div>{" "}
              </button>{" "}
              {/* Expanded Details */}{" "}
              {isExpanded && (
                <div className="mt-3 space-y-3 border-t border-yellow-500/20 pt-3">
                  {" "}
                  {/* Issues List */}{" "}
                  {item.flags.length > 0 && (
                    <div>
                      {" "}
                      <p className="mb-2 text-xs font-medium text-yellow-300">
                        Issues detected:
                      </p>{" "}
                      <ul className="space-y-1">
                        {" "}
                        {item.flags.map((flag) => (
                          <li key={flag} className="text-xs text-yellow-200/70">
                            {" "}
                            • {flagLabels[flag] || flag}{" "}
                          </li>
                        ))}{" "}
                      </ul>{" "}
                    </div>
                  )}{" "}
                  {/* Current Values */}{" "}
                  <div>
                    {" "}
                    <p className="mb-2 text-xs font-medium text-slate-300">
                      Extracted values:
                    </p>{" "}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {" "}
                      <div>
                        {" "}
                        <span className="text-muted-foreground">
                          Product:
                        </span>{" "}
                        <p className="font-mono text-slate-300">
                          {" "}
                          {item.productName || (
                            <span className="text-red-400">Missing</span>
                          )}{" "}
                        </p>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <span className="text-muted-foreground">Qty:</span>{" "}
                        <p className="font-mono text-slate-300">
                          {" "}
                          {item.quantity ? (
                            `${item.quantity} ${item.unit || ""}`
                          ) : (
                            <span className="text-red-400">Missing</span>
                          )}{" "}
                        </p>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <span className="text-muted-foreground">
                          Price:
                        </span>{" "}
                        <p className="font-mono text-slate-300">
                          {" "}
                          {item.totalCost ? (
                            `$${item.totalCost.toFixed(2)}`
                          ) : (
                            <span className="text-red-400">Missing</span>
                          )}{" "}
                        </p>{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                  {/* Correction Form */}{" "}
                  <div>
                    {" "}
                    <p className="mb-2 text-xs font-medium text-cyan-300">
                      Verify or correct:
                    </p>{" "}
                    <div className="space-y-2">
                      {" "}
                      <input
                        type="text"
                        placeholder="Product name"
                        defaultValue={item.productName || ""}
                        onChange={(e) => {
                          const correction =
                            corrections.get(item.lineNumber) || {};
                          setCorrections(
                            new Map(corrections).set(item.lineNumber, {
                              ...correction,
                              productName: e.target.value,
                            }),
                          );
                        }}
                        className="w-full rounded border border-border bg-surface px-2 py-1 text-xs text-slate-100 placeholder-slate-500"
                      />{" "}
                      <div className="grid grid-cols-2 gap-2">
                        {" "}
                        <input
                          type="number"
                          placeholder="Qty"
                          defaultValue={item.quantity || ""}
                          onChange={(e) => {
                            const correction =
                              corrections.get(item.lineNumber) || {};
                            setCorrections(
                              new Map(corrections).set(item.lineNumber, {
                                ...correction,
                                quantity: e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              }),
                            );
                          }}
                          className="rounded border border-border bg-surface px-2 py-1 text-xs text-slate-100 placeholder-slate-500"
                        />{" "}
                        <input
                          type="text"
                          placeholder="Unit"
                          defaultValue={item.unit || ""}
                          onChange={(e) => {
                            const correction =
                              corrections.get(item.lineNumber) || {};
                            setCorrections(
                              new Map(corrections).set(item.lineNumber, {
                                ...correction,
                                unit: e.target.value,
                              }),
                            );
                          }}
                          className="rounded border border-border bg-surface px-2 py-1 text-xs text-slate-100 placeholder-slate-500"
                        />{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                  {/* Action Buttons */}{" "}
                  <div className="flex gap-2 pt-2">
                    {" "}
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleCorrectionSubmit(item.lineNumber)}
                      disabled={!hasCorrection}
                      className="flex-1"
                    >
                      {" "}
                      Verify{" "}
                    </Button>{" "}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleExpanded(item.lineNumber)}
                    >
                      {" "}
                      Close{" "}
                    </Button>{" "}
                  </div>{" "}
                </div>
              )}{" "}
            </div>
          );
        })}{" "}
      </CardContent>{" "}
    </Card>
  );
}
