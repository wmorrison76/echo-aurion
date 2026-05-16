import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAuth } from "@/contexts/AuthContext";

type CheckbookOutlet = {
  outletId: string;
  period: string;
  revenue: number;
  cogs: number;
  updatedAt?: string | null;
};

type BudgetMap = Record<string, number>;

const BUDGET_KEY = "checkbook:budgets";

function readBudgets(): BudgetMap {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(BUDGET_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeBudgets(next: BudgetMap) {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(next));
}

export default function Checkbook() {
  const { user } = useAuth();
  const [outlets, setOutlets] = useState<CheckbookOutlet[]>([]);
  const [budgets, setBudgets] = useState<BudgetMap>(() => readBudgets());
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const fetchCheckbook = async () => {
    if (!user?.org_id) return;
    setStatus("loading");
    try {
      const response = await fetch("/api/checkbook/realtime", {
        headers: { "x-org-id": user.org_id },
      });
      if (!response.ok) throw new Error("Failed to load checkbook");
      const data = await response.json();
      setOutlets(data.outlets || []);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    fetchCheckbook();
    const interval = setInterval(fetchCheckbook, 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.org_id]);

  const rows = useMemo(() => {
    return outlets.map((outlet) => {
      const budget = budgets[outlet.outletId] ?? 0;
      const variance = outlet.revenue - outlet.cogs;
      const marginPct = outlet.revenue ? (variance / outlet.revenue) * 100 : 0;
      return { ...outlet, budget, variance, marginPct };
    });
  }, [outlets, budgets]);

  return (
    <Card className="border-border bg-surface">
      <CardHeader>
        <CardTitle>Checkbook (Real-Time COGS vs Sales)</CardTitle>
      </CardHeader>
      <CardContent>
        {status === "error" && (
          <div className="text-sm text-red-400 mb-3">
            Unable to load checkbook data.
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-xs font-semibold text-slate-300">
                Outlet
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-300">
                Sales
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-300">
                COGS
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-300">
                Variance
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-300">
                Budget
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-300">
                Margin
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-300">
                Period
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const varianceColor =
                row.variance >= 0
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "bg-red-500/10 text-red-300";
              return (
                <TableRow key={row.outletId} className="border-border">
                  <TableCell className="text-xs">{row.outletId}</TableCell>
                  <TableCell className="text-xs">
                    ${row.revenue.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs">
                    ${row.cogs.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge className={varianceColor}>
                      ${row.variance.toFixed(2)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Input
                      type="number"
                      value={row.budget}
                      onChange={(event) => {
                        const next = {
                          ...budgets,
                          [row.outletId]: Number(event.target.value),
                        };
                        setBudgets(next);
                        writeBudgets(next);
                      }}
                      className="h-7 text-xs bg-slate-800 border-slate-600"
                    />
                  </TableCell>
                  <TableCell className="text-xs">
                    {row.marginPct.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-xs">{row.period}</TableCell>
                </TableRow>
              );
            })}
            {!rows.length && status !== "loading" && (
              <TableRow className="border-border">
                <TableCell
                  colSpan={7}
                  className="text-xs text-muted-foreground text-center"
                >
                  No checkbook data available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
