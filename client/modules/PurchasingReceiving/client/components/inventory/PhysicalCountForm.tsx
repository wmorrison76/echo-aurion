import React, { useCallback, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  Package,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
export interface InventoryItem {
  id: string;
  productCode: string;
  productName: string;
  systemQuantity: number;
  unitOfMeasure: string;
  unitCost: number;
  lastCountDate?: string;
}
export interface CountEntry {
  itemId: string;
  physicalQuantity: number;
  variance: number;
  variancePercent: number;
  hasDiscrepancy: boolean;
  notes?: string;
}
export interface PhysicalCount {
  id: string;
  outletId: string;
  countDate: string;
  countedBy: string;
  entries: CountEntry[];
  status: "in_progress" | "completed" | "reconciled";
  totalVariance: number;
  varianceValue: number;
}
interface PhysicalCountFormProps {
  items: InventoryItem[];
  outletId: string;
  outletName: string;
  onSubmit: (count: PhysicalCount) => Promise<void>;
  isLoading?: boolean;
}
export function PhysicalCountForm({
  items,
  outletId,
  outletName,
  onSubmit,
  isLoading = false,
}: PhysicalCountFormProps) {
  const [activeTab, setActiveTab] = useState<"count" | "variance" | "summary">(
    "count",
  );
  const [countedBy, setCountedBy] = useState("");
  const [countDate, setCountDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdjustments, setShowAdjustments] = useState(false);
  const entries: CountEntry[] = useMemo(() => {
    return items.map((item) => {
      const physicalQuantity =
        counts[item.id] !== undefined ? counts[item.id] : item.systemQuantity;
      const variance = physicalQuantity - item.systemQuantity;
      const variancePercent =
        item.systemQuantity > 0 ? (variance / item.systemQuantity) * 100 : 0;
      const hasDiscrepancy = Math.abs(variance) > 0;
      return {
        itemId: item.id,
        physicalQuantity,
        variance,
        variancePercent,
        hasDiscrepancy,
        notes: notes[item.id],
      };
    });
  }, [items, counts, notes]);
  const itemsWithVariance = useMemo(() => {
    return entries.filter((e) => e.hasDiscrepancy);
  }, [entries]);
  const varianceStats = useMemo(() => {
    const totalVariance = entries.reduce(
      (sum, e) => sum + Math.abs(e.variance),
      0,
    );
    const varianceValue = entries.reduce((sum, e) => {
      const item = items.find((i) => i.id === e.itemId);
      return sum + e.variance * (item?.unitCost || 0);
    }, 0);
    const overages = entries.filter((e) => e.variance > 0);
    const shortages = entries.filter((e) => e.variance < 0);
    return {
      totalItems: items.length,
      countedItems: Object.keys(counts).length,
      itemsWithVariance: itemsWithVariance.length,
      totalVariance,
      varianceValue,
      overages: overages.length,
      shortages: shortages.length,
      completionPercent: (Object.keys(counts).length / items.length) * 100,
    };
  }, [entries, items, counts, itemsWithVariance]);
  const handleCountChange = useCallback((itemId: string, value: number) => {
    setCounts((prev) => ({ ...prev, [itemId]: value }));
  }, []);
  const handleNoteChange = useCallback((itemId: string, value: string) => {
    setNotes((prev) => ({ ...prev, [itemId]: value }));
  }, []);
  const handleSubmit = useCallback(async () => {
    if (!countedBy.trim()) {
      alert("Enter counter name");
      return;
    }
    if (Object.keys(counts).length === 0) {
      alert("Count at least one item");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        id: `PC-${Date.now()}`,
        outletId,
        countDate,
        countedBy,
        entries,
        status: "completed",
        totalVariance: varianceStats.totalVariance,
        varianceValue: varianceStats.varianceValue,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    countedBy,
    counts,
    countDate,
    outletId,
    entries,
    varianceStats,
    onSubmit,
  ]);
  const uncountedItems = items.filter((item) => counts[item.id] === undefined);
  return (
    <div className="space-y-6">
      {" "}
      <Tabs
        value={activeTab}
        onValueChange={(v: any) => setActiveTab(v)}
        className="w-full"
      >
        {" "}
        <TabsList className="grid w-full grid-cols-3">
          {" "}
          <TabsTrigger value="count">
            {" "}
            Count Items ({Object.keys(counts).length} / {items.length}){" "}
          </TabsTrigger>{" "}
          <TabsTrigger value="variance">
            {" "}
            Variance ({itemsWithVariance.length} items){" "}
          </TabsTrigger>{" "}
          <TabsTrigger value="summary">Summary</TabsTrigger>{" "}
        </TabsList>{" "}
        {/* Count Tab */}{" "}
        <TabsContent value="count" className="space-y-4">
          {" "}
          <Card className="border-emerald-400/30 bg-card">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="flex items-center gap-2">
                {" "}
                <Package className="h-5 w-4" /> Physical Inventory Count -{" "}
                {outletName}{" "}
              </CardTitle>{" "}
              <CardDescription className="text-emerald-200/70">
                {" "}
                Enter physical quantities for each item{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-4">
              {" "}
              <div className="grid gap-3 md:grid-cols-2">
                {" "}
                <div>
                  {" "}
                  <label className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                    {" "}
                    Counter Name{" "}
                  </label>{" "}
                  <Input
                    value={countedBy}
                    onChange={(e) => setCountedBy(e.target.value)}
                    placeholder="Your name"
                    className="mt-1 border-emerald-400/20 bg-card"
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                    {" "}
                    Count Date{" "}
                  </label>{" "}
                  <Input
                    type="date"
                    value={countDate}
                    onChange={(e) => setCountDate(e.target.value)}
                    className="mt-1 border-emerald-400/20 bg-card"
                  />{" "}
                </div>{" "}
              </div>{" "}
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-3">
                {" "}
                <div className="flex items-center justify-between text-sm">
                  {" "}
                  <span className="text-emerald-200/70">Progress</span>{" "}
                  <span className="font-semibold text-emerald-100">
                    {" "}
                    {varianceStats.countedItems} / {varianceStats.totalItems} (
                    {varianceStats.completionPercent.toFixed(0)}%){" "}
                  </span>{" "}
                </div>{" "}
                <div className="mt-2 h-2 rounded-full bg-surface overflow-hidden">
                  {" "}
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                    style={{ width: `${varianceStats.completionPercent}%` }}
                  />{" "}
                </div>{" "}
              </div>{" "}
              {uncountedItems.length === 0 ? (
                <Alert className="border-emerald-400/50 bg-emerald-500/10">
                  {" "}
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />{" "}
                  <AlertDescription className="text-emerald-200">
                    {" "}
                    All items have been counted!{" "}
                  </AlertDescription>{" "}
                </Alert>
              ) : (
                <Alert className="border-yellow-400/40 bg-yellow-500/10 text-yellow-200">
                  {" "}
                  <AlertCircle className="h-4 w-4" />{" "}
                  <AlertDescription>
                    {" "}
                    {uncountedItems.length} items still need to be counted{" "}
                  </AlertDescription>{" "}
                </Alert>
              )}{" "}
              <div className="overflow-x-auto">
                {" "}
                <Table>
                  {" "}
                  <TableHeader>
                    {" "}
                    <TableRow className="border-emerald-400/20">
                      {" "}
                      <TableHead className="text-emerald-200/70">
                        Product
                      </TableHead>{" "}
                      <TableHead className="text-right text-emerald-200/70">
                        System Qty
                      </TableHead>{" "}
                      <TableHead className="text-right text-emerald-200/70">
                        Physical Qty
                      </TableHead>{" "}
                      <TableHead className="text-emerald-200/70">
                        Status
                      </TableHead>{" "}
                    </TableRow>{" "}
                  </TableHeader>{" "}
                  <TableBody>
                    {" "}
                    {items.map((item) => {
                      const counted = counts[item.id] !== undefined;
                      return (
                        <TableRow
                          key={item.id}
                          className="border-emerald-400/10"
                        >
                          {" "}
                          <TableCell className="text-emerald-100">
                            {" "}
                            <div className="font-semibold">
                              {item.productName}
                            </div>{" "}
                            <div className="text-xs text-emerald-200/60">
                              {item.productCode}
                            </div>{" "}
                          </TableCell>{" "}
                          <TableCell className="text-right font-mono text-emerald-100">
                            {" "}
                            {item.systemQuantity} {item.unitOfMeasure}{" "}
                          </TableCell>{" "}
                          <TableCell className="text-right">
                            {" "}
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={counts[item.id] ?? ""}
                              onChange={(e) =>
                                handleCountChange(
                                  item.id,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              placeholder="Count..."
                              className="w-24 border-emerald-400/20 bg-card text-right text-emerald-100"
                            />{" "}
                          </TableCell>{" "}
                          <TableCell>
                            {" "}
                            {counted ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-400 text-emerald-200"
                              >
                                {" "}
                                Counted{" "}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-yellow-400 text-yellow-200"
                              >
                                {" "}
                                Pending{" "}
                              </Badge>
                            )}{" "}
                          </TableCell>{" "}
                        </TableRow>
                      );
                    })}{" "}
                  </TableBody>{" "}
                </Table>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Variance Tab */}{" "}
        <TabsContent value="variance" className="space-y-4">
          {" "}
          <Card className="border-cyan-400/30 bg-card">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="flex items-center gap-2">
                {" "}
                <AlertCircle className="h-5 w-5" /> Inventory Variances{" "}
              </CardTitle>{" "}
              <CardDescription className="text-cyan-200/70">
                {" "}
                Items with discrepancies between system and physical count{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-4">
              {" "}
              {itemsWithVariance.length === 0 ? (
                <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-6 text-center text-emerald-200">
                  {" "}
                  No variances detected. Count matches system records.{" "}
                </div>
              ) : (
                <>
                  {" "}
                  <div className="grid gap-4 md:grid-cols-3">
                    {" "}
                    <Card className="border-red-400/30 bg-card">
                      {" "}
                      <CardHeader className="pb-3">
                        {" "}
                        <CardTitle className="text-sm text-red-200/70">
                          Shortages
                        </CardTitle>{" "}
                      </CardHeader>{" "}
                      <CardContent>
                        {" "}
                        <div className="text-2xl font-semibold text-red-100">
                          {" "}
                          {varianceStats.shortages}{" "}
                        </div>{" "}
                      </CardContent>{" "}
                    </Card>{" "}
                    <Card className="border-yellow-400/30 bg-card">
                      {" "}
                      <CardHeader className="pb-3">
                        {" "}
                        <CardTitle className="text-sm text-yellow-200/70">
                          Total Variance Qty
                        </CardTitle>{" "}
                      </CardHeader>{" "}
                      <CardContent>
                        {" "}
                        <div className="text-2xl font-semibold text-yellow-100">
                          {" "}
                          {varianceStats.totalVariance.toFixed(2)}{" "}
                        </div>{" "}
                      </CardContent>{" "}
                    </Card>{" "}
                    <Card className="border-orange-400/30 bg-card">
                      {" "}
                      <CardHeader className="pb-3">
                        {" "}
                        <CardTitle className="text-sm text-orange-200/70">
                          Variance Value
                        </CardTitle>{" "}
                      </CardHeader>{" "}
                      <CardContent>
                        {" "}
                        <div className="text-2xl font-semibold text-orange-100">
                          {" "}
                          ${varianceStats.varianceValue.toFixed(2)}{" "}
                        </div>{" "}
                      </CardContent>{" "}
                    </Card>{" "}
                  </div>{" "}
                  <div className="overflow-x-auto">
                    {" "}
                    <Table>
                      {" "}
                      <TableHeader>
                        {" "}
                        <TableRow className="border-cyan-400/20">
                          {" "}
                          <TableHead className="text-cyan-200/70">
                            Product
                          </TableHead>{" "}
                          <TableHead className="text-right text-cyan-200/70">
                            System Qty
                          </TableHead>{" "}
                          <TableHead className="text-right text-cyan-200/70">
                            Physical Qty
                          </TableHead>{" "}
                          <TableHead className="text-right text-cyan-200/70">
                            Variance
                          </TableHead>{" "}
                          <TableHead className="text-right text-cyan-200/70">
                            Value
                          </TableHead>{" "}
                          <TableHead className="text-cyan-200/70">
                            Notes
                          </TableHead>{" "}
                        </TableRow>{" "}
                      </TableHeader>{" "}
                      <TableBody>
                        {" "}
                        {itemsWithVariance.map((entry) => {
                          const item = items.find((i) => i.id === entry.itemId);
                          if (!item) return null;
                          const value = entry.variance * item.unitCost;
                          const isShortage = entry.variance < 0;
                          return (
                            <TableRow
                              key={entry.itemId}
                              className={`border-b ${isShortage ? "border-red-400/10 hover:bg-red-500/5" : "border-yellow-400/10 hover:bg-yellow-500/5"}`}
                            >
                              {" "}
                              <TableCell className="text-cyan-100">
                                {" "}
                                <div className="font-semibold">
                                  {item.productName}
                                </div>{" "}
                                <div className="text-xs text-cyan-200/60">
                                  {item.productCode}
                                </div>{" "}
                              </TableCell>{" "}
                              <TableCell className="text-right font-mono text-cyan-100">
                                {" "}
                                {item.systemQuantity}{" "}
                              </TableCell>{" "}
                              <TableCell className="text-right font-mono text-cyan-100">
                                {" "}
                                {entry.physicalQuantity}{" "}
                              </TableCell>{" "}
                              <TableCell className="text-right">
                                {" "}
                                <Badge
                                  className={
                                    isShortage
                                      ? "bg-red-500/20 text-red-100 border-red-400"
                                      : "bg-yellow-500/20 text-yellow-100 border-yellow-400"
                                  }
                                  variant="outline"
                                >
                                  {" "}
                                  {isShortage ? (
                                    <TrendingDown className="mr-1 h-3 w-3" />
                                  ) : (
                                    <TrendingUp className="mr-1 h-3 w-3" />
                                  )}{" "}
                                  {entry.variance > 0 ? "+" : ""}
                                  {entry.variance.toFixed(2)}{" "}
                                </Badge>{" "}
                              </TableCell>{" "}
                              <TableCell className="text-right font-mono text-cyan-100">
                                {" "}
                                ${value.toFixed(2)}{" "}
                              </TableCell>{" "}
                              <TableCell>
                                {" "}
                                <Input
                                  type="text"
                                  value={notes[item.id] || ""}
                                  onChange={(e) =>
                                    handleNoteChange(item.id, e.target.value)
                                  }
                                  placeholder="Reason..."
                                  className="w-32 border-cyan-400/20 bg-card text-xs"
                                />{" "}
                              </TableCell>{" "}
                            </TableRow>
                          );
                        })}{" "}
                      </TableBody>{" "}
                    </Table>{" "}
                  </div>{" "}
                </>
              )}{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Summary Tab */}{" "}
        <TabsContent value="summary" className="space-y-4">
          {" "}
          <Card className="border-emerald-400/30 bg-card">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Count Summary</CardTitle>{" "}
              <CardDescription className="text-emerald-200/70">
                {" "}
                Review before submitting for reconciliation{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-4">
              {" "}
              <div className="grid gap-4 md:grid-cols-2">
                {" "}
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-4 space-y-2">
                  {" "}
                  <div className="text-xs text-emerald-200/70">Outlet</div>{" "}
                  <div className="text-lg font-semibold text-emerald-100">
                    {outletName}
                  </div>{" "}
                </div>{" "}
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-4 space-y-2">
                  {" "}
                  <div className="text-xs text-emerald-200/70">
                    Count Date
                  </div>{" "}
                  <div className="text-lg font-semibold text-emerald-100">
                    {countDate}
                  </div>{" "}
                </div>{" "}
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-4 space-y-2">
                  {" "}
                  <div className="text-xs text-emerald-200/70">
                    Counted By
                  </div>{" "}
                  <div className="text-lg font-semibold text-emerald-100">
                    {countedBy || "—"}
                  </div>{" "}
                </div>{" "}
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-4 space-y-2">
                  {" "}
                  <div className="text-xs text-emerald-200/70">
                    Items Counted
                  </div>{" "}
                  <div className="text-lg font-semibold text-emerald-100">
                    {" "}
                    {varianceStats.countedItems} /{" "}
                    {varianceStats.totalItems}{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
              <div className="grid gap-4 md:grid-cols-3">
                {" "}
                <Card className="border-cyan-400/30 bg-card">
                  {" "}
                  <CardHeader className="pb-3">
                    {" "}
                    <CardTitle className="text-sm">
                      Items with Variance
                    </CardTitle>{" "}
                  </CardHeader>{" "}
                  <CardContent>
                    {" "}
                    <div className="text-2xl font-semibold text-cyan-100">
                      {" "}
                      {varianceStats.itemsWithVariance}{" "}
                    </div>{" "}
                  </CardContent>{" "}
                </Card>{" "}
                <Card className="border-red-400/30 bg-card">
                  {" "}
                  <CardHeader className="pb-3">
                    {" "}
                    <CardTitle className="text-sm">Shortages</CardTitle>{" "}
                  </CardHeader>{" "}
                  <CardContent>
                    {" "}
                    <div className="text-2xl font-semibold text-red-100">
                      {" "}
                      {varianceStats.shortages}{" "}
                    </div>{" "}
                  </CardContent>{" "}
                </Card>{" "}
                <Card className="border-orange-400/30 bg-card">
                  {" "}
                  <CardHeader className="pb-3">
                    {" "}
                    <CardTitle className="text-sm">Total Loss</CardTitle>{" "}
                  </CardHeader>{" "}
                  <CardContent>
                    {" "}
                    <div className="text-2xl font-semibold text-orange-100">
                      {" "}
                      ${Math.abs(varianceStats.varianceValue).toFixed(2)}{" "}
                    </div>{" "}
                  </CardContent>{" "}
                </Card>{" "}
              </div>{" "}
              <Button
                onClick={handleSubmit}
                disabled={
                  varianceStats.countedItems === 0 || !countedBy || isSubmitting
                }
                size="lg"
                className="w-full gap-2"
              >
                {" "}
                <CheckCircle2 className="h-4 w-4" />{" "}
                {isSubmitting
                  ? "Submitting..."
                  : "Submit Count for Reconciliation"}{" "}
              </Button>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
      </Tabs>{" "}
    </div>
  );
}
