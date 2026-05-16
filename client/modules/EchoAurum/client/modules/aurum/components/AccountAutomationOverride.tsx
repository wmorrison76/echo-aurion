/** * Account Automation Override Component * Allows operators to set per-account automation levels (0-100%) * Override global automation settings for specific GL accounts */ import React, {
  useState,
} from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
interface GLAccount {
  id: string;
  code: string;
  name: string;
  accountType: "asset" | "liability" | "equity" | "revenue" | "expense";
}
interface AccountOverride {
  glAccountId: string;
  glAccountCode: string;
  glAccountName: string;
  featureName: string;
  overridePct: number;
  overrideMode: "auto" | "recommend" | "manual";
  reason: string;
}
interface AccountAutomationOverrideProps {
  glAccounts?: GLAccount[];
  existingOverrides?: AccountOverride[];
  onSaveOverride?: (override: AccountOverride) => void;
  onDeleteOverride?: (glAccountId: string, featureName: string) => void;
}
export function AccountAutomationOverride({
  glAccounts = [],
  existingOverrides = [],
  onSaveOverride,
  onDeleteOverride,
}: AccountAutomationOverrideProps) {
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(
    new Set(),
  );
  const [editingOverride, setEditingOverride] =
    useState<AccountOverride | null>(null);
  const featureOptions = [
    {
      value: "gl_auto_post",
      label: "GL Auto-Posting",
      description: "Automatic GL entry creation",
    },
    {
      value: "ap_approve",
      label: "AP Auto-Approval",
      description: "Automatic invoice approval",
    },
    {
      value: "bank_reconciliation",
      label: "Bank Reconciliation",
      description: "Automatic bank matching",
    },
  ];
  const modeOptions = [
    { value: "auto", label: "Auto", description: "Fully automated" },
    {
      value: "recommend",
      label: "Recommend",
      description: "Show recommendations",
    },
    { value: "manual", label: "Manual", description: "No automation" },
  ];
  const toggleExpanded = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };
  const getAccountOverrides = (accountId: string) => {
    return existingOverrides.filter((o) => o.glAccountId === accountId);
  };
  const accountTypeColors = {
    asset: "bg-blue-50",
    liability: "bg-purple-50",
    equity: "bg-green-50",
    revenue: "bg-emerald-50",
    expense: "bg-orange-50",
  };
  const accountTypeBadges = {
    asset: <Badge className="bg-primary">Asset</Badge>,
    liability: <Badge className="bg-purple-600">Liability</Badge>,
    equity: <Badge className="bg-green-600">Equity</Badge>,
    revenue: <Badge className="bg-emerald-600">Revenue</Badge>,
    expense: <Badge className="bg-orange-600">Expense</Badge>,
  };
  return (
    <div className="w-full space-y-4">
      {" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Per-Account Automation Overrides</CardTitle>{" "}
          <CardDescription>
            {" "}
            Override global automation settings for specific GL accounts. Set
            automation percentage and approval mode.{" "}
          </CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-4">
          {" "}
          {/* Account List */}{" "}
          <div className="space-y-2">
            {" "}
            {glAccounts.map((account) => {
              const isExpanded = expandedAccounts.has(account.id);
              const overrides = getAccountOverrides(account.id);
              return (
                <div
                  key={account.id}
                  className={`border rounded-lg overflow-hidden transition-colors ${accountTypeColors[account.accountType]}`}
                >
                  {" "}
                  {/* Account Header */}{" "}
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:opacity-80"
                    onClick={() => toggleExpanded(account.id)}
                  >
                    {" "}
                    <div className="flex items-center gap-3 flex-1">
                      {" "}
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}{" "}
                      <div>
                        {" "}
                        <h4 className="font-semibold">
                          {" "}
                          {account.code} - {account.name}{" "}
                        </h4>{" "}
                        <p className="text-sm text-muted-foreground">
                          {" "}
                          {overrides.length} override
                          {overrides.length !== 1 ? "s" : ""}{" "}
                        </p>{" "}
                      </div>{" "}
                    </div>{" "}
                    {accountTypeBadges[account.accountType]}{" "}
                  </div>{" "}
                  {/* Account Details */}{" "}
                  {isExpanded && (
                    <div className="border-t p-4 space-y-4 bg-background">
                      {" "}
                      {/* Existing Overrides */}{" "}
                      {overrides.length > 0 && (
                        <div className="space-y-3">
                          {" "}
                          <h5 className="font-semibold text-sm">
                            Current Overrides:
                          </h5>{" "}
                          {overrides.map((override) => (
                            <div
                              key={`${override.glAccountId}-${override.featureName}`}
                              className="border rounded p-3 bg-surface"
                            >
                              {" "}
                              <div className="flex items-start justify-between mb-2">
                                {" "}
                                <div>
                                  {" "}
                                  <p className="font-semibold text-sm">
                                    {" "}
                                    {
                                      featureOptions.find(
                                        (f) => f.value === override.featureName,
                                      )?.label
                                    }{" "}
                                  </p>{" "}
                                  <p className="text-xs text-muted-foreground">
                                    {" "}
                                    {override.overridePct}% -{" "}
                                    {
                                      modeOptions.find(
                                        (m) =>
                                          m.value === override.overrideMode,
                                      )?.label
                                    }{" "}
                                  </p>{" "}
                                </div>{" "}
                                <button
                                  onClick={() =>
                                    onDeleteOverride?.(
                                      override.glAccountId,
                                      override.featureName,
                                    )
                                  }
                                  className="text-red-600 hover:text-red-800"
                                >
                                  {" "}
                                  <Trash2 className="h-4 w-4" />{" "}
                                </button>{" "}
                              </div>{" "}
                              {override.reason && (
                                <p className="text-xs text-muted-foreground italic">
                                  {override.reason}
                                </p>
                              )}{" "}
                              {/* Automation Level Bar */}{" "}
                              <div className="mt-2">
                                {" "}
                                <div className="flex justify-between text-xs mb-1">
                                  {" "}
                                  <span>Automation Level:</span>{" "}
                                  <span className="font-semibold">
                                    {override.overridePct}%
                                  </span>{" "}
                                </div>{" "}
                                <div className="w-full bg-gray-300 rounded-full h-2">
                                  {" "}
                                  <div
                                    className={`h-2 rounded-full ${override.overridePct === 0 ? "bg-red-600" : override.overridePct < 50 ? "bg-yellow-600" : "bg-green-600"}`}
                                    style={{
                                      width: `${override.overridePct}%`,
                                    }}
                                  />{" "}
                                </div>{" "}
                              </div>{" "}
                            </div>
                          ))}{" "}
                        </div>
                      )}{" "}
                      {/* Add New Override Form */}{" "}
                      {editingOverride?.glAccountId === account.id ? (
                        <div className="border rounded p-4 space-y-3 bg-blue-50">
                          {" "}
                          <h5 className="font-semibold text-sm">
                            Add New Override
                          </h5>{" "}
                          <div>
                            {" "}
                            <Label htmlFor="feature" className="text-xs">
                              {" "}
                              Feature{" "}
                            </Label>{" "}
                            <select className="w-full border rounded px-3 py-2 text-sm mt-1">
                              {" "}
                              {featureOptions.map((f) => (
                                <option key={f.value} value={f.value}>
                                  {" "}
                                  {f.label}{" "}
                                </option>
                              ))}{" "}
                            </select>{" "}
                          </div>{" "}
                          <div>
                            {" "}
                            <Label className="text-xs mb-2 block">
                              Automation Level: {editingOverride.overridePct}%
                            </Label>{" "}
                            <Slider
                              min={0}
                              max={100}
                              step={10}
                              value={[editingOverride.overridePct]}
                              onValueChange={(val) =>
                                setEditingOverride({
                                  ...editingOverride,
                                  overridePct: val[0],
                                })
                              }
                              className="w-full"
                            />{" "}
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              {" "}
                              <span>Manual (0%)</span>{" "}
                              <span>Recommend (50%)</span>{" "}
                              <span>Auto (100%)</span>{" "}
                            </div>{" "}
                          </div>{" "}
                          <div>
                            {" "}
                            <Label htmlFor="reason" className="text-xs">
                              {" "}
                              Reason (optional){" "}
                            </Label>{" "}
                            <Input
                              id="reason"
                              placeholder="Why override the global setting?"
                              value={editingOverride.reason}
                              onChange={(e) =>
                                setEditingOverride({
                                  ...editingOverride,
                                  reason: e.target.value,
                                })
                              }
                              className="text-sm mt-1"
                            />{" "}
                          </div>{" "}
                          <div className="flex gap-2 justify-end">
                            {" "}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingOverride(null)}
                            >
                              {" "}
                              Cancel{" "}
                            </Button>{" "}
                            <Button
                              size="sm"
                              onClick={() => {
                                onSaveOverride?.(editingOverride);
                                setEditingOverride(null);
                              }}
                            >
                              {" "}
                              Save Override{" "}
                            </Button>{" "}
                          </div>{" "}
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            setEditingOverride({
                              glAccountId: account.id,
                              glAccountCode: account.code,
                              glAccountName: account.name,
                              featureName: "gl_auto_post",
                              overridePct: 50,
                              overrideMode: "recommend",
                              reason: "",
                            })
                          }
                          className="w-full border-2 border-dashed border-border rounded p-3 text-center text-sm text-muted-foreground hover:bg-surface hover:border-border flex items-center justify-center gap-2"
                        >
                          {" "}
                          <Plus className="h-4 w-4" /> Add Override for This
                          Account{" "}
                        </button>
                      )}{" "}
                    </div>
                  )}{" "}
                </div>
              );
            })}{" "}
          </div>{" "}
          {glAccounts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {" "}
              <p>
                No GL accounts available. Load your chart of accounts first.
              </p>{" "}
            </div>
          )}{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Info Box */}{" "}
      <Card className="bg-blue-50 border-blue-200">
        {" "}
        <CardContent className="pt-6">
          {" "}
          <h4 className="font-semibold text-sm mb-2">
            ℹ️ Account Overrides Guide
          </h4>{" "}
          <ul className="text-sm space-y-1 text-foreground">
            {" "}
            <li>
              {" "}
              <strong>0% (Manual):</strong> Operator manually reviews every
              transaction{" "}
            </li>{" "}
            <li>
              {" "}
              <strong>1-99% (Recommend):</strong> AI recommends actions;
              operator approves/rejects{" "}
            </li>{" "}
            <li>
              {" "}
              <strong>100% (Auto):</strong> AI automatically executes actions
              with no approval needed{" "}
            </li>{" "}
          </ul>{" "}
          <p className="text-xs text-muted-foreground mt-3">
            {" "}
            Common practice: Set 0% for sensitive accounts (cash, equity) and
            100% for routine accounts (revenue from integrations).{" "}
          </p>{" "}
        </CardContent>{" "}
      </Card>{" "}
    </div>
  );
}
export default AccountAutomationOverride;
