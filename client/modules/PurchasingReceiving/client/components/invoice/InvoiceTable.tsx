import React, { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  StandardizedLineItem,
  InvoiceExtractionResult,
  InvoiceLineItemRaw,
} from "@shared/api";
const convertToPounds = (item: StandardizedLineItem): number => {
  const total = item.quantityPurchaseUnit.totalStandardUnits || 0;
  const unit = item.standardized.standardUnit;
  if (!total) return 0;
  switch (unit) {
    case "oz":
      return total / 16;
    case "lb":
      return total;
    case "g":
      return total / 453.59237;
    default:
      return 0;
  }
};
const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
export function InvoiceTable({
  result,
  onEditRaw,
}: {
  result: InvoiceExtractionResult;
  onEditRaw: (index: number, patch: Partial<InvoiceLineItemRaw>) => void;
}) {
  const rows = useMemo(() => result.standardized, [result]);
  const summary = useMemo(() => {
    const standardized = result.standardized;
    const totalLineCost = standardized.reduce((sum, item, idx) => {
      const rawCost = result.rawItems[idx]?.totalCost;
      if (typeof rawCost === "number") return sum + rawCost;
      return sum + (item.totalCost ?? 0);
    }, 0);
    const subtotal =
      typeof result.header?.subtotal === "number"
        ? result.header.subtotal
        : totalLineCost;
    const tax = (result.header?.taxes || []).reduce(
      (sum, line) => sum + (line.amount ?? 0),
      0,
    );
    const total =
      typeof result.header?.total === "number"
        ? result.header.total
        : subtotal + tax;
    const totalWeightLb = standardized.reduce(
      (sum, item) => sum + convertToPounds(item),
      0,
    );
    return { totalLineCost, subtotal, tax, total, totalWeightLb };
  }, [result]);
  const showWeight = summary.totalWeightLb > 0.001;
  return (
    <div className="rounded-lg border">
      {" "}
      <Table>
        {" "}
        <TableHeader>
          {" "}
          <TableRow>
            {" "}
            <TableHead className="w-[3ch]">#</TableHead>{" "}
            <TableHead>Product</TableHead>{" "}
            <TableHead className="w-[12ch]">Qty</TableHead>{" "}
            <TableHead className="w-[12ch]">Unit</TableHead>{" "}
            <TableHead className="w-[16ch]">Pack</TableHead>{" "}
            <TableHead className="w-[12ch] text-right">Line Cost</TableHead>{" "}
            <TableHead className="w-[16ch] text-right">$/Std Unit</TableHead>{" "}
            <TableHead className="w-[16ch]">Category</TableHead>{" "}
            <TableHead className="w-[16ch]">Flags</TableHead>{" "}
          </TableRow>{" "}
        </TableHeader>{" "}
        <TableBody>
          {" "}
          {rows.map((r, i) => (
            <Row
              key={i}
              index={i}
              item={r}
              raw={result.rawItems[i]}
              onEditRaw={onEditRaw}
            />
          ))}{" "}
          {rows.length > 0 && (
            <>
              {" "}
              {showWeight && (
                <TableRow className="bg-muted/40 text-sm">
                  {" "}
                  <TableCell colSpan={5}></TableCell>{" "}
                  <TableCell colSpan={2} className="text-right font-medium">
                    Total Weight
                  </TableCell>{" "}
                  <TableCell colSpan={2} className="text-right font-medium">
                    {summary.totalWeightLb.toFixed(2)} lb
                  </TableCell>{" "}
                </TableRow>
              )}{" "}
              <TableRow className="bg-muted/30 text-sm">
                {" "}
                <TableCell colSpan={5}></TableCell>{" "}
                <TableCell colSpan={2} className="text-right font-medium">
                  Subtotal
                </TableCell>{" "}
                <TableCell colSpan={2} className="text-right font-medium">
                  {formatCurrency(summary.subtotal)}
                </TableCell>{" "}
              </TableRow>{" "}
              {summary.tax > 0 && (
                <TableRow className="bg-muted/20 text-sm">
                  {" "}
                  <TableCell colSpan={5}></TableCell>{" "}
                  <TableCell colSpan={2} className="text-right font-medium">
                    Tax
                  </TableCell>{" "}
                  <TableCell colSpan={2} className="text-right font-medium">
                    {formatCurrency(summary.tax)}
                  </TableCell>{" "}
                </TableRow>
              )}{" "}
              <TableRow className="bg-muted/40 text-sm">
                {" "}
                <TableCell colSpan={5}></TableCell>{" "}
                <TableCell colSpan={2} className="text-right font-semibold">
                  Invoice Total
                </TableCell>{" "}
                <TableCell colSpan={2} className="text-right font-semibold">
                  {formatCurrency(summary.total)}
                </TableCell>{" "}
              </TableRow>{" "}
            </>
          )}{" "}
          {rows.length === 0 && (
            <TableRow>
              {" "}
              <TableCell
                colSpan={9}
                className="text-center text-sm text-muted-foreground"
              >
                No line items detected yet.
              </TableCell>{" "}
            </TableRow>
          )}{" "}
        </TableBody>{" "}
      </Table>{" "}
    </div>
  );
}
function Row({
  index,
  item,
  raw,
  onEditRaw,
}: {
  index: number;
  item: StandardizedLineItem;
  raw: InvoiceLineItemRaw;
  onEditRaw: (index: number, patch: Partial<InvoiceLineItemRaw>) => void;
}) {
  return (
    <TableRow className={raw.confidence < 0.7 ? "bg-warning/5" : ""}>
      {" "}
      <TableCell>{index + 1}</TableCell>{" "}
      <TableCell>
        {" "}
        <Input
          value={raw.productName || ""}
          onChange={(e) => onEditRaw(index, { productName: e.target.value })}
        />{" "}
        <div className="mt-1 text-xs text-muted-foreground">
          Std: {item.standardized.standardizedName}
        </div>{" "}
      </TableCell>{" "}
      <TableCell>
        {" "}
        <Input
          value={raw.quantity ?? 0}
          type="number"
          onChange={(e) =>
            onEditRaw(index, { quantity: Number(e.target.value) })
          }
        />{" "}
      </TableCell>{" "}
      <TableCell>
        {" "}
        <Input
          value={raw.unit || ""}
          onChange={(e) => onEditRaw(index, { unit: e.target.value })}
        />{" "}
      </TableCell>{" "}
      <TableCell>
        {" "}
        <Input
          value={raw.packSize || ""}
          onChange={(e) => onEditRaw(index, { packSize: e.target.value })}
        />{" "}
      </TableCell>{" "}
      <TableCell className="text-right">
        {" "}
        <Input
          className="text-right"
          value={raw.totalCost ?? 0}
          type="number"
          step="0.01"
          onChange={(e) =>
            onEditRaw(index, { totalCost: Number(e.target.value) })
          }
        />{" "}
      </TableCell>{" "}
      <TableCell className="text-right tabular-nums">
        ${item.costPerStandardUnit.toFixed(4)}
      </TableCell>{" "}
      <TableCell className="text-xs">
        {" "}
        <div>{item.standardized.categories.tier1}</div>{" "}
        {item.standardized.categories.tier2 && (
          <div className="text-muted-foreground">
            {item.standardized.categories.tier2}
            {item.standardized.categories.tier3
              ? ` • ${item.standardized.categories.tier3}`
              : ""}
          </div>
        )}{" "}
      </TableCell>{" "}
      <TableCell className="space-x-1">
        {" "}
        {raw.flags?.map((f, idx) => (
          <Badge key={idx} variant="outline" className="uppercase">
            {f.replace(/_/g, "")}
          </Badge>
        ))}{" "}
        {raw.confidence < 0.7 && (
          <Badge variant="destructive">Low Confidence</Badge>
        )}{" "}
      </TableCell>{" "}
    </TableRow>
  );
}
