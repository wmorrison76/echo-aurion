import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Settings, AlertCircle } from "lucide-react";
interface ApprovalRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  priority: number;
  enabled: boolean;
}
interface ApprovalRulesConfigurationProps {
  entityId: string;
}
const DEFAULT_RULES: ApprovalRule[] = [
  {
    id: "rule_auto_approve_small",
    name: "Auto-Approve Small Amounts",
    condition: "amount < 1000",
    action: "auto_approve",
    priority: 1,
    enabled: true,
  },
  {
    id: "rule_l1_standard",
    name: "Level 1 Approval - Standard",
    condition: "amount >= 1000 AND amount < 10000",
    action: "require_l1_approval",
    priority: 2,
    enabled: true,
  },
  {
    id: "rule_l2_large",
    name: "Level 2 Approval - Large",
    condition: "amount >= 10000 AND amount < 50000",
    action: "require_l2_approval",
    priority: 3,
    enabled: true,
  },
  {
    id: "rule_cfo_large",
    name: "CFO Approval - Executive",
    condition: "amount >= 50000",
    action: "require_cfo_approval",
    priority: 4,
    enabled: true,
  },
  {
    id: "rule_manual_adjustments",
    name: "Manual Adjustments - Two Approvers",
    condition: "accountCode = 5900 OR accountCode = 5901",
    action: "require_two_approvers",
    priority: 3,
    enabled: true,
  },
  {
    id: "rule_consolidation",
    name: "Consolidation Review",
    condition: "type = consolidation OR type = intercompany",
    action: "require_consolidation_review",
    priority: 4,
    enabled: true,
  },
];
export function ApprovalRulesConfiguration({
  entityId,
}: ApprovalRulesConfigurationProps) {
  const [rules, setRules] = useState<ApprovalRule[]>(DEFAULT_RULES);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const handleToggleRule = (ruleId: string) => {
    setSaving(true);
    setTimeout(() => {
      setRules(
        rules.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r)),
      );
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 300);
  };
  const handleChangePriority = (ruleId: string, newPriority: number) => {
    setSaving(true);
    setTimeout(() => {
      setRules(
        rules.map((r) =>
          r.id === ruleId ? { ...r, priority: newPriority } : r,
        ),
      );
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 300);
  };
  const actionColors: Record<string, string> = {
    auto_approve: "bg-green-100 text-green-800",
    require_l1_approval: "bg-blue-100 text-blue-800",
    require_l2_approval: "bg-orange-100 text-orange-800",
    require_cfo_approval: "bg-red-100 text-red-800",
    require_two_approvers: "bg-purple-100 text-purple-800",
    require_consolidation_review: "bg-indigo-100 text-indigo-800",
  };
  return (
    <Card>
      {" "}
      <CardHeader>
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <CardTitle className="flex items-center gap-2">
            {" "}
            <Settings className="h-5 w-5" /> Approval Rules Configuration{" "}
          </CardTitle>{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-4">
        {" "}
        {saveSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            {" "}
            <p className="text-sm text-green-800">
              Changes saved successfully
            </p>{" "}
          </div>
        )}{" "}
        <div className="space-y-3">
          {" "}
          {rules
            .sort((a, b) => a.priority - b.priority)
            .map((rule) => (
              <div
                key={rule.id}
                className="border rounded-lg p-4 space-y-3 hover:bg-muted/30 transition-colors"
              >
                {" "}
                <div className="flex items-start justify-between">
                  {" "}
                  <div className="flex-1">
                    {" "}
                    <h4 className="font-medium text-sm mb-2">
                      {rule.name}
                    </h4>{" "}
                    <code className="text-xs bg-muted px-2 py-1 rounded block mb-2 w-fit">
                      {" "}
                      {rule.condition}{" "}
                    </code>{" "}
                  </div>{" "}
                  <Badge
                    className={
                      actionColors[rule.action] || "bg-surface text-gray-800"
                    }
                  >
                    {" "}
                    {rule.action.replace(/_/g, "")}{" "}
                  </Badge>{" "}
                </div>{" "}
                <div className="flex items-center justify-between pt-2 border-t">
                  {" "}
                  <div className="flex items-center gap-4">
                    {" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <span className="text-xs text-muted-foreground">
                        {" "}
                        Priority:{" "}
                      </span>{" "}
                      <select
                        value={rule.priority}
                        onChange={(e) =>
                          handleChangePriority(
                            rule.id,
                            parseInt(e.target.value),
                          )
                        }
                        disabled={saving}
                        className="text-sm px-2 py-1 rounded border bg-background"
                      >
                        {" "}
                        {[1, 2, 3, 4, 5].map((p) => (
                          <option key={p} value={p}>
                            {" "}
                            {p}{" "}
                          </option>
                        ))}{" "}
                      </select>{" "}
                    </div>{" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <span className="text-xs text-muted-foreground">
                        {" "}
                        Status:{" "}
                      </span>{" "}
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => handleToggleRule(rule.id)}
                        disabled={saving}
                      />{" "}
                      <span className="text-xs font-medium">
                        {" "}
                        {rule.enabled ? "Enabled" : "Disabled"}{" "}
                      </span>{" "}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
              </div>
            ))}{" "}
        </div>{" "}
        <div className="bg-muted/30 p-4 rounded-lg space-y-2 text-sm">
          {" "}
          <div className="flex gap-2 items-start">
            {" "}
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />{" "}
            <div>
              {" "}
              <p className="font-medium">How Approval Rules Work</p>{" "}
              <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs mt-2">
                {" "}
                <li>
                  Rules are evaluated in priority order (lowest first)
                </li>{" "}
                <li>
                  {" "}
                  The first matching rule determines the approval workflow{" "}
                </li>{" "}
                <li>Disabled rules are skipped during evaluation</li>{" "}
                <li>Conditions support entry amount, account code, and type</li>{" "}
                <li>
                  {" "}
                  Guardian validation runs automatically for all
                  transactions{" "}
                </li>{" "}
              </ul>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
