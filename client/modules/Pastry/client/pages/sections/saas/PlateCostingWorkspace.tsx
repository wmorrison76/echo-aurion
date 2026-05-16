import * as React from "react";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  foodCost: number;
  targetFoodCostPct: number;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function pct(value: number) {
  return `${Math.round(value)}%`;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function PlateCostingWorkspace() {
  const [query, setQuery] = React.useState("");

  const [items, setItems] = React.useState<MenuItem[]>(() => [
    {
      id: "menu-01",
      name: "Lemon Tart Slice",
      price: 12,
      foodCost: 3.1,
      targetFoodCostPct: 28,
    },
    {
      id: "menu-02",
      name: "Chocolate Mousse (jar)",
      price: 10,
      foodCost: 2.7,
      targetFoodCostPct: 30,
    },
    {
      id: "menu-03",
      name: "Banquet Mini Eclairs (12pc)",
      price: 48,
      foodCost: 15.5,
      targetFoodCostPct: 33,
    },
  ]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, query]);

  const rows = React.useMemo(() => {
    return filtered.map((i) => {
      const foodCostPct = i.price > 0 ? (i.foodCost / i.price) * 100 : 0;
      const margin = i.price - i.foodCost;
      const delta = foodCostPct - i.targetFoodCostPct;
      return {
        ...i,
        foodCostPct,
        margin,
        delta,
      };
    });
  }, [filtered]);

  const summary = React.useMemo(() => {
    if (rows.length === 0) return { avgFoodCostPct: 0, avgMargin: 0 };
    const avgFoodCostPct = rows.reduce((acc, r) => acc + r.foodCostPct, 0) / rows.length;
    const avgMargin = rows.reduce((acc, r) => acc + r.margin, 0) / rows.length;
    return { avgFoodCostPct, avgMargin };
  }, [rows]);

  const chartData = React.useMemo(() => {
    return rows.map((r) => ({
      name: r.name.length > 18 ? `${r.name.slice(0, 18)}…` : r.name,
      Actual: clamp(r.foodCostPct, 0, 100),
      Target: clamp(r.targetFoodCostPct, 0, 100),
    }));
  }, [rows]);

  return (
    <div className="space-y-4">
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Plate costing</CardTitle>
            <CardDescription>
              Quick view of food cost %, targets, and contribution margin for pastry menu items.
            </CardDescription>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setItems((prev) => [
                {
                  id: `menu-${Date.now()}`,
                  name: "New Item",
                  price: 0,
                  foodCost: 0,
                  targetFoodCostPct: 30,
                },
                ...prev,
              ]);
            }}
          >
            Add item
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Average food cost</div>
              <div className="text-xl font-semibold">{pct(summary.avgFoodCostPct)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Average margin</div>
              <div className="text-xl font-semibold">{formatCurrency(summary.avgMargin)}</div>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Input
              placeholder="Search items…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="md:max-w-[320px]"
            />
            <div className="text-xs text-muted-foreground">
              {rows.length} item{rows.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4" />
              Actual vs target food cost
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(value: any) => `${Number(value).toFixed(1)}%`} />
                  <Legend />
                  <Bar dataKey="Actual" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Target" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Food cost</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const onTarget = Math.abs(row.delta) <= 2;
                  const aboveTarget = row.delta > 2;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.foodCost)}</TableCell>
                      <TableCell className="text-right">{pct(row.foodCostPct)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.margin)}</TableCell>
                      <TableCell>
                        {onTarget ? (
                          <Badge variant="secondary">On target</Badge>
                        ) : aboveTarget ? (
                          <Badge variant="destructive" className="gap-1">
                            <TrendingDown className="h-3.5 w-3.5" />
                            High cost
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <TrendingUp className="h-3.5 w-3.5" />
                            Opportunity
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
