import * as React from "react";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AlertCircle, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type WasteCategory = "prep" | "overproduction" | "spoilage" | "plate";

type WasteRecord = {
  id: string;
  ingredient: string;
  category: WasteCategory;
  quantity: number;
  unit: string;
  cost: number;
  reason?: string;
  createdAt: string;
};

const CATEGORY_META: Record<WasteCategory, { label: string; color: string; badge: "secondary" | "outline" | "destructive" }> = {
  prep: { label: "Prep", color: "#f97316", badge: "secondary" },
  overproduction: { label: "Overproduction", color: "#eab308", badge: "outline" },
  spoilage: { label: "Spoilage", color: "#ef4444", badge: "destructive" },
  plate: { label: "Plate", color: "#8b5cf6", badge: "outline" },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function safeNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function WasteTrackingWorkspace() {
  const [records, setRecords] = React.useState<WasteRecord[]>(() => [
    {
      id: "waste-001",
      ingredient: "Egg whites",
      category: "prep",
      quantity: 0.5,
      unit: "qt",
      cost: 6.25,
      reason: "Over-whipped for meringue",
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "waste-002",
      ingredient: "Fresh berries",
      category: "spoilage",
      quantity: 2,
      unit: "pt",
      cost: 18.0,
      reason: "Expired",
      createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    },
  ]);

  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({
    ingredient: "",
    category: "prep" as WasteCategory,
    quantity: 0,
    unit: "oz",
    cost: 0,
    reason: "",
  });

  const totals = React.useMemo(() => {
    const byCategory = new Map<WasteCategory, number>();
    (Object.keys(CATEGORY_META) as WasteCategory[]).forEach((c) => byCategory.set(c, 0));

    for (const r of records) {
      byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + r.cost);
    }

    const totalCost = Array.from(byCategory.values()).reduce((acc, n) => acc + n, 0);
    const chart = Array.from(byCategory.entries())
      .map(([category, cost]) => ({
        category,
        label: CATEGORY_META[category].label,
        cost,
      }))
      .filter((x) => x.cost > 0);

    return { byCategory, totalCost, chart };
  }, [records]);

  const submit = React.useCallback(() => {
    if (!draft.ingredient.trim()) return;
    if (!draft.quantity || draft.quantity <= 0) return;

    setRecords((prev) => [
      {
        id: newId("waste"),
        ingredient: draft.ingredient.trim(),
        category: draft.category,
        quantity: draft.quantity,
        unit: draft.unit,
        cost: draft.cost,
        reason: draft.reason.trim() || undefined,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    setDraft({ ingredient: "", category: "prep", quantity: 0, unit: "oz", cost: 0, reason: "" });
    setOpen(false);
  }, [draft]);

  return (
    <div className="space-y-4">
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Waste tracking</CardTitle>
            <CardDescription>
              Log waste events and visualize cost by category. (Client-only summary)
            </CardDescription>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New record
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>New waste record</DialogTitle>
                <DialogDescription>Capture what was wasted and why.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm sm:col-span-2">
                  <span className="text-muted-foreground">Ingredient</span>
                  <Input
                    value={draft.ingredient}
                    onChange={(e) => setDraft((p) => ({ ...p, ingredient: e.target.value }))}
                    placeholder="e.g., Cream"
                  />
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">Category</span>
                  <Select
                    value={draft.category}
                    onValueChange={(v) => setDraft((p) => ({ ...p, category: v as WasteCategory }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CATEGORY_META) as WasteCategory[]).map((c) => (
                        <SelectItem key={c} value={c}>
                          {CATEGORY_META[c].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">Cost</span>
                  <Input
                    inputMode="decimal"
                    value={draft.cost ? String(draft.cost) : ""}
                    onChange={(e) => setDraft((p) => ({ ...p, cost: safeNumber(e.target.value) }))}
                    placeholder="0"
                  />
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">Quantity</span>
                  <Input
                    inputMode="decimal"
                    value={draft.quantity ? String(draft.quantity) : ""}
                    onChange={(e) => setDraft((p) => ({ ...p, quantity: safeNumber(e.target.value) }))}
                    placeholder="0"
                  />
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">Unit</span>
                  <Input
                    value={draft.unit}
                    onChange={(e) => setDraft((p) => ({ ...p, unit: e.target.value }))}
                    placeholder="oz"
                  />
                </label>

                <label className="grid gap-1 text-sm sm:col-span-2">
                  <span className="text-muted-foreground">Reason (optional)</span>
                  <Textarea
                    rows={3}
                    value={draft.reason}
                    onChange={(e) => setDraft((p) => ({ ...p, reason: e.target.value }))}
                  />
                </label>
              </div>

              <DialogFooter>
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={submit} disabled={!draft.ingredient.trim() || draft.quantity <= 0}>
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Total waste cost</div>
              <div className="text-2xl font-semibold">{formatCurrency(totals.totalCost)}</div>
              <div className="mt-2 text-xs text-muted-foreground">
                Categories shown in chart are based on the records in this panel.
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="mb-2 text-sm font-medium">Waste cost distribution</div>
              <div className="h-[220px]">
                {totals.chart.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    No waste cost records yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                      <Pie data={totals.chart} dataKey="cost" nameKey="label" innerRadius={55} outerRadius={85}>
                        {totals.chart.map((entry) => (
                          <Cell key={entry.category} fill={CATEGORY_META[entry.category as WasteCategory].color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <div>{r.ingredient}</div>
                      {r.reason ? (
                        <div className="text-xs text-muted-foreground line-clamp-1">{r.reason}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={CATEGORY_META[r.category].badge}>{CATEGORY_META[r.category].label}</Badge>
                    </TableCell>
                    <TableCell>
                      {r.quantity} {r.unit}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(r.cost)}</TableCell>
                    <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
