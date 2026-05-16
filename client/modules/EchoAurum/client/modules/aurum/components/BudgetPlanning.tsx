import React, { useMemo, useState } from "react";
import {
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  Percent,
  Calendar,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
interface BudgetLine {
  id: string;
  accountCode: string;
  accountName: string;
  amount: number;
  ytdActual: number;
  variance: number;
  variancePercent: number;
  status: "on-track" | "warning" | "over-budget";
}
interface Budget {
  id: string;
  name: string;
  year: number;
  period: "annual" | "quarterly" | "monthly";
  status: "draft" | "approved" | "active" | "closed";
  totalBudget: number;
  totalActual: number;
  lines: BudgetLine[];
  createdAt: string;
  approvedAt?: string;
  owner: string;
}
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};
const getVariancePercent = (budget: number, actual: number) => {
  if (budget === 0) return 0;
  return ((actual - budget) / budget) * 100;
};
const getStatusColor = (status: string) => {
  switch (status) {
    case "on-track":
      return "bg-green-50 border-green-200 text-green-900";
    case "warning":
      return "bg-amber-50 border-amber-200 text-amber-900";
    case "over-budget":
      return "bg-red-50 border-red-200 text-red-900";
    default:
      return "bg-surface border-gray-200 text-gray-900";
  }
};
export function BudgetPlanning() {
  const [budgets] = useState<Budget[]>([
    {
      id: "bud_2024_annual",
      name: "2024 Annual Budget",
      year: 2024,
      period: "annual",
      status: "active",
      totalBudget: 5000000,
      totalActual: 1250000,
      lines: [
        {
          id: "line_1",
          accountCode: "4100",
          accountName: "Food & Beverage",
          amount: 2000000,
          ytdActual: 520000,
          variance: 20000,
          variancePercent: 1,
          status: "on-track",
        },
        {
          id: "line_2",
          accountCode: "5100",
          accountName: "Labor Expense",
          amount: 1500000,
          ytdActual: 410000,
          variance: -15000,
          variancePercent: -1,
          status: "on-track",
        },
        {
          id: "line_3",
          accountCode: "5200",
          accountName: "Utilities",
          amount: 400000,
          ytdActual: 125000,
          variance: 10000,
          variancePercent: 2.5,
          status: "warning",
        },
        {
          id: "line_4",
          accountCode: "5300",
          accountName: "Maintenance & Repairs",
          amount: 300000,
          ytdActual: 85000,
          variance: -8000,
          variancePercent: -2.6,
          status: "on-track",
        },
        {
          id: "line_5",
          accountCode: "5400",
          accountName: "Marketing",
          amount: 200000,
          ytdActual: 110000,
          variance: 15000,
          variancePercent: 7.5,
          status: "over-budget",
        },
      ],
      createdAt: "2023-10-15",
      approvedAt: "2023-11-20",
      owner: "Finance Manager",
    },
  ]);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(
    budgets[0],
  );
  const [showNew, setShowNew] = useState(false);
  const [newBudget, setNewBudget] = useState({
    name: "",
    year: new Date().getFullYear(),
  });
  const [editingLine, setEditingLine] = useState<BudgetLine | null>(null);
  const statistics = useMemo(() => {
    if (!selectedBudget) return null;
    const onTrack = selectedBudget.lines.filter(
      (l) => l.status === "on-track",
    ).length;
    const warning = selectedBudget.lines.filter(
      (l) => l.status === "warning",
    ).length;
    const overBudget = selectedBudget.lines.filter(
      (l) => l.status === "over-budget",
    ).length;
    return {
      onTrack,
      warning,
      overBudget,
      avgVariance:
        selectedBudget.lines.reduce((sum, l) => sum + l.variancePercent, 0) /
        selectedBudget.lines.length,
    };
  }, [selectedBudget]);
  const budgetUtilization = useMemo(() => {
    if (!selectedBudget) return 0;
    return (selectedBudget.totalActual / selectedBudget.totalBudget) * 100;
  }, [selectedBudget]);
  return (
    <div className="space-y-6">
      {" "}
      {/* Header */}{" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h2 className="text-2xl font-bold text-foreground">
            {" "}
            Budget Planning{" "}
          </h2>{" "}
          <p className="text-sm text-muted-foreground mt-1">
            {" "}
            Create, manage, and monitor budgets with real-time variance
            tracking{" "}
          </p>{" "}
        </div>{" "}
        <Button
          onClick={() => setShowNew(!showNew)}
          className="gap-2 bg-aurum-600 hover:bg-aurum-700"
        >
          {" "}
          <Plus className="w-4 h-4" /> New Budget{" "}
        </Button>{" "}
      </div>{" "}
      {/* Budget Selection */}{" "}
      <div className="bg-surface rounded-lg border border-border p-4">
        {" "}
        <h3 className="font-semibold text-foreground mb-3">
          Select Budget
        </h3>{" "}
        <div className="flex gap-2 flex-wrap">
          {" "}
          {budgets.map((budget) => (
            <button
              key={budget.id}
              onClick={() => setSelectedBudget(budget)}
              className={cn(
                "px-4 py-2 rounded-lg border-2 font-medium transition-colors",
                selectedBudget?.id === budget.id
                  ? "border-aurum-600 bg-aurum-50 text-aurum-900"
                  : "border-border hover:border-border/80 text-foreground",
              )}
            >
              {" "}
              {budget.name} ({budget.year}){" "}
            </button>
          ))}{" "}
        </div>{" "}
      </div>{" "}
      {selectedBudget && (
        <>
          {" "}
          {/* Budget Summary */}{" "}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {" "}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              {" "}
              <div className="text-sm font-medium text-blue-900 mb-1">
                {" "}
                Total Budget{" "}
              </div>{" "}
              <div className="text-2xl font-bold text-blue-900">
                {" "}
                {formatCurrency(selectedBudget.totalBudget)}{" "}
              </div>{" "}
            </div>{" "}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              {" "}
              <div className="text-sm font-medium text-purple-900 mb-1">
                {" "}
                YTD Actual{" "}
              </div>{" "}
              <div className="text-2xl font-bold text-purple-900">
                {" "}
                {formatCurrency(selectedBudget.totalActual)}{" "}
              </div>{" "}
            </div>{" "}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              {" "}
              <div className="text-sm font-medium text-green-900 mb-1">
                {" "}
                Budget Utilization{" "}
              </div>{" "}
              <div className="text-2xl font-bold text-green-900">
                {" "}
                {budgetUtilization.toFixed(1)}%{" "}
              </div>{" "}
              <div className="h-2 bg-green-200 rounded-full mt-2 overflow-hidden">
                {" "}
                <div
                  className="h-full bg-green-600"
                  style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                ></div>{" "}
              </div>{" "}
            </div>{" "}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              {" "}
              <div className="text-sm font-medium text-orange-900 mb-1">
                {" "}
                Avg Variance{" "}
              </div>{" "}
              <div className="text-2xl font-bold text-orange-900">
                {" "}
                {statistics?.avgVariance.toFixed(1)}%{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          {/* Line Items Status */}{" "}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {" "}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              {" "}
              <div className="text-sm font-medium text-green-900 mb-1">
                {" "}
                On Track{" "}
              </div>{" "}
              <div className="text-2xl font-bold text-green-900">
                {" "}
                {statistics?.onTrack}{" "}
              </div>{" "}
            </div>{" "}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              {" "}
              <div className="text-sm font-medium text-amber-900 mb-1">
                {" "}
                Warning{" "}
              </div>{" "}
              <div className="text-2xl font-bold text-amber-900">
                {" "}
                {statistics?.warning}{" "}
              </div>{" "}
            </div>{" "}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              {" "}
              <div className="text-sm font-medium text-red-900 mb-1">
                {" "}
                Over Budget{" "}
              </div>{" "}
              <div className="text-2xl font-bold text-red-900">
                {" "}
                {statistics?.overBudget}{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          {/* Budget Lines */}{" "}
          <div className="bg-surface rounded-lg border border-border overflow-hidden">
            {" "}
            <div className="overflow-x-auto">
              {" "}
              <table className="w-full text-sm">
                {" "}
                <thead className="bg-muted/50 border-b border-border">
                  {" "}
                  <tr>
                    {" "}
                    <th className="px-4 py-3 text-left font-semibold">
                      {" "}
                      Account{" "}
                    </th>{" "}
                    <th className="px-4 py-3 text-right font-semibold">
                      {" "}
                      Budget{" "}
                    </th>{" "}
                    <th className="px-4 py-3 text-right font-semibold">
                      {" "}
                      YTD Actual{" "}
                    </th>{" "}
                    <th className="px-4 py-3 text-right font-semibold">
                      {" "}
                      Variance{" "}
                    </th>{" "}
                    <th className="px-4 py-3 text-center font-semibold">
                      {" "}
                      Status{" "}
                    </th>{" "}
                    <th className="px-4 py-3 text-center font-semibold">
                      {" "}
                      Actions{" "}
                    </th>{" "}
                  </tr>{" "}
                </thead>{" "}
                <tbody>
                  {" "}
                  {selectedBudget.lines.map((line) => (
                    <tr
                      key={line.id}
                      className="border-b border-border hover:bg-muted/50"
                    >
                      {" "}
                      <td className="px-4 py-3">
                        {" "}
                        <div>
                          {" "}
                          <p className="font-medium text-foreground">
                            {" "}
                            {line.accountName}{" "}
                          </p>{" "}
                          <p className="text-xs text-muted-foreground">
                            {" "}
                            {line.accountCode}{" "}
                          </p>{" "}
                        </div>{" "}
                      </td>{" "}
                      <td className="px-4 py-3 text-right font-semibold">
                        {" "}
                        {formatCurrency(line.amount)}{" "}
                      </td>{" "}
                      <td className="px-4 py-3 text-right">
                        {" "}
                        {formatCurrency(line.ytdActual)}{" "}
                      </td>{" "}
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-semibold",
                          line.variance < 0 ? "text-green-600" : "text-red-600",
                        )}
                      >
                        {" "}
                        {line.variance < 0 ? "" : "+"}{" "}
                        {formatCurrency(line.variance)} ({" "}
                        {line.variancePercent.toFixed(1)}%){" "}
                      </td>{" "}
                      <td className="px-4 py-3 text-center">
                        {" "}
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                            line.status === "on-track"
                              ? "bg-green-100 text-green-800"
                              : line.status === "warning"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800",
                          )}
                        >
                          {" "}
                          {line.status === "on-track" && (
                            <CheckCircle2 className="w-3 h-3" />
                          )}{" "}
                          {line.status === "warning" && (
                            <AlertCircle className="w-3 h-3" />
                          )}{" "}
                          {line.status === "over-budget" && (
                            <AlertCircle className="w-3 h-3" />
                          )}{" "}
                          {line.status
                            .replace("-", "")
                            .charAt(0)
                            .toUpperCase() +
                            line.status.replace("-", "").slice(1)}{" "}
                        </span>{" "}
                      </td>{" "}
                      <td className="px-4 py-3 text-center">
                        {" "}
                        <Button
                          onClick={() => setEditingLine(line)}
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                        >
                          {" "}
                          <Edit2 className="w-3 h-3" />{" "}
                        </Button>{" "}
                      </td>{" "}
                    </tr>
                  ))}{" "}
                </tbody>{" "}
              </table>{" "}
            </div>{" "}
          </div>{" "}
          {/* Budget Info */}{" "}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            {" "}
            <div className="flex items-start gap-3">
              {" "}
              <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />{" "}
              <div className="text-sm text-blue-900">
                {" "}
                <p className="font-semibold">
                  {" "}
                  Budget Status: {selectedBudget.status.toUpperCase()}{" "}
                </p>{" "}
                <p className="mt-1">
                  {" "}
                  Created:{""}{" "}
                  {new Date(selectedBudget.createdAt).toLocaleDateString()}{" "}
                </p>{" "}
                {selectedBudget.approvedAt && (
                  <p>
                    {" "}
                    Approved:{""}{" "}
                    {new Date(
                      selectedBudget.approvedAt,
                    ).toLocaleDateString()}{" "}
                  </p>
                )}{" "}
                <p>Owner: {selectedBudget.owner}</p>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </>
      )}{" "}
      {/* Edit Line Modal (simplified) */}{" "}
      {editingLine && (
        <div className="bg-surface rounded-lg border border-border p-6 space-y-4">
          {" "}
          <div className="flex items-center justify-between">
            {" "}
            <h3 className="font-semibold text-foreground">
              {" "}
              Edit {editingLine.accountName}{" "}
            </h3>{" "}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingLine(null)}
            >
              {" "}
              ✕{" "}
            </Button>{" "}
          </div>{" "}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {" "}
            <div className="space-y-2">
              {" "}
              <label className="text-sm font-medium text-foreground">
                {" "}
                Budgeted Amount{" "}
              </label>{" "}
              <Input
                type="number"
                defaultValue={editingLine.amount}
                className="h-9"
              />{" "}
            </div>{" "}
            <div className="space-y-2">
              {" "}
              <label className="text-sm font-medium text-foreground">
                {" "}
                YTD Actual{" "}
              </label>{" "}
              <Input
                type="number"
                defaultValue={editingLine.ytdActual}
                className="h-9"
              />{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex gap-3">
            {" "}
            <Button className="gap-2">Save Changes</Button>{" "}
            <Button variant="outline" onClick={() => setEditingLine(null)}>
              {" "}
              Cancel{" "}
            </Button>{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
}
