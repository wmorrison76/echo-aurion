import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, ArrowLeft } from "lucide-react";
import { fetchWithLucccaSession } from "../../auth";
interface DrillDownItem {
  accountCode: string;
  accountName: string;
  amount: number;
  type: "parent" | "child" | "transaction";
  children?: DrillDownItem[];
}
interface USALIReportDrillDownProps {
  entityId: string;
  periodDate: string;
  reportType: string;
  initialAccount?: string;
}
export function USALIReportDrillDown({
  entityId,
  periodDate,
  reportType,
  initialAccount,
}: USALIReportDrillDownProps) {
  const [data, setData] = useState<DrillDownItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(
    new Set(),
  );
  const [breadcrumb, setBreadcrumb] = useState<string[]>([
    initialAccount || "root",
  ]);
  const fetchDrillDownData = async (accountCode?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        entityId,
        periodDate,
        reportType,
        ...(accountCode && { accountCode }),
      });
      const response = await fetchWithLucccaSession(
        `/api/aurum/reports/usali/drill-down?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch drill-down data");
      }
      const drillDownData: DrillDownItem[] = await response.json();
      setData(drillDownData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchDrillDownData(initialAccount);
  }, [entityId, periodDate, reportType, initialAccount]);
  const toggleAccount = (accountCode: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountCode)) {
      newExpanded.delete(accountCode);
    } else {
      newExpanded.add(accountCode);
    }
    setExpandedAccounts(newExpanded);
  };
  const handleDrillInto = (accountCode: string, accountName: string) => {
    setBreadcrumb([...breadcrumb, accountCode]);
    fetchDrillDownData(accountCode);
  };
  const handleBreadcrumbClick = (index: number) => {
    const newBreadcrumb = breadcrumb.slice(0, index + 1);
    setBreadcrumb(newBreadcrumb);
    const targetAccount = index === 0 ? undefined : breadcrumb[index];
    fetchDrillDownData(targetAccount);
  };
  const renderAccountTree = (items: DrillDownItem[], level = 0) => {
    return (
      <div className="space-y-1">
        {" "}
        {items.map((item) => (
          <div key={item.accountCode}>
            {" "}
            <div
              className="flex items-center gap-2 p-2 hover:bg-muted rounded-md cursor-pointer"
              style={{ paddingLeft: `${level * 20}px` }}
            >
              {" "}
              {item.children && item.children.length > 0 ? (
                <button
                  onClick={() => toggleAccount(item.accountCode)}
                  className="flex-shrink-0"
                >
                  {" "}
                  {expandedAccounts.has(item.accountCode) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}{" "}
                </button>
              ) : (
                <div className="w-4" />
              )}{" "}
              <div className="flex-1">
                {" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {" "}
                    {item.accountCode}{" "}
                  </code>{" "}
                  <span className="text-sm font-medium">
                    {" "}
                    {item.accountName}{" "}
                  </span>{" "}
                  <Badge variant="outline" className="text-xs">
                    {" "}
                    {item.type}{" "}
                  </Badge>{" "}
                </div>{" "}
              </div>{" "}
              <span className="text-sm font-semibold tabular-nums">
                {" "}
                ${(item.amount / 1000).toFixed(1)}K{" "}
              </span>{" "}
              {item.children && item.children.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDrillInto(item.accountCode, item.accountName);
                  }}
                >
                  {" "}
                  Drill In{" "}
                </Button>
              )}{" "}
            </div>{" "}
            {expandedAccounts.has(item.accountCode) &&
              item.children &&
              renderAccountTree(item.children, level + 1)}{" "}
          </div>
        ))}{" "}
      </div>
    );
  };
  return (
    <Card>
      {" "}
      <CardHeader>
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <CardTitle>GL Account Drill-Down</CardTitle>{" "}
          <Badge variant="secondary">Report: {reportType}</Badge>{" "}
        </div>{" "}
        {breadcrumb.length > 1 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
            {" "}
            {breadcrumb.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                {" "}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleBreadcrumbClick(index)}
                >
                  {" "}
                  {item === "root" ? "All Accounts" : item}{" "}
                </Button>{" "}
                {index < breadcrumb.length - 1 && (
                  <span className="text-muted-foreground">/</span>
                )}{" "}
              </div>
            ))}{" "}
          </div>
        )}{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-4">
        {" "}
        {loading && (
          <div className="flex items-center justify-center h-40">
            {" "}
            <div className="text-muted-foreground">
              {" "}
              Loading drill-down data...{" "}
            </div>{" "}
          </div>
        )}{" "}
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
            {" "}
            Error: {error}{" "}
          </div>
        )}{" "}
        {!loading && !error && data.length === 0 && (
          <div className="text-center py-8">
            {" "}
            <p className="text-muted-foreground">
              {" "}
              No data available for this drill-down{" "}
            </p>{" "}
          </div>
        )}{" "}
        {!loading && !error && data.length > 0 && (
          <div className="border rounded-lg p-4">{renderAccountTree(data)}</div>
        )}{" "}
      </CardContent>{" "}
    </Card>
  );
}
