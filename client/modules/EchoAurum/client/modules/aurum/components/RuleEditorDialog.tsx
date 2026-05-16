import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
export interface Rule {
  id?: string;
  rule_name: string;
  rule_description: string;
  rule_type: string;
  conditions?: Condition[];
  actions?: Action[];
  approval_required?: boolean;
  is_paused?: boolean;
}
export interface Condition {
  field: string;
  operator: string;
  value: any;
}
export interface Action {
  type: string;
  data: Record<string, any>;
}
export interface RuleEditorDialogProps {
  rule?: Rule;
  onSave: (rule: Rule) => void;
  onCancel: () => void;
}
const RULE_TYPES = [
  { value: "gl_posting", label: "GL Posting" },
  { value: "ap_approval", label: "AP Approval" },
  { value: "cash_alert", label: "Cash Alert" },
  { value: "profitability", label: "Profitability" },
];
const FIELD_OPTIONS = {
  gl_posting: [
    { value: "amount", label: "Amount" },
    { value: "account_id", label: "Account" },
    { value: "description", label: "Description" },
    { value: "source", label: "Source System" },
    { value: "posting_date", label: "Posting Date" },
  ],
  ap_approval: [
    { value: "vendor_id", label: "Vendor" },
    { value: "amount", label: "Amount" },
    { value: "match_status", label: "Match Status" },
    { value: "invoice_date", label: "Invoice Date" },
  ],
  cash_alert: [
    { value: "projected_balance", label: "Projected Balance" },
    { value: "days_out", label: "Days Out" },
    { value: "balance_trend", label: "Balance Trend" },
  ],
  profitability: [
    { value: "labor_cost_pct", label: "Labor Cost %" },
    { value: "food_cost_pct", label: "Food Cost %" },
    { value: "revenue", label: "Revenue" },
  ],
};
const OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "contains", label: "Contains" },
  { value: "in_list", label: "In List" },
  { value: "matches_regex", label: "Matches Regex" },
];
const ACTION_TYPES = [
  { value: "auto_post", label: "Auto-Post Entry" },
  { value: "auto_approve", label: "Auto-Approve Invoice" },
  { value: "create_alert", label: "Create Alert" },
  { value: "send_email", label: "Send Email" },
  { value: "update_field", label: "Update Field" },
  { value: "escalate", label: "Escalate" },
];
export function RuleEditorDialog({
  rule: existingRule,
  onSave,
  onCancel,
}: RuleEditorDialogProps) {
  const [ruleName, setRuleName] = useState(existingRule?.rule_name || "");
  const [description, setDescription] = useState(
    existingRule?.rule_description || "",
  );
  const [ruleType, setRuleType] = useState(
    existingRule?.rule_type || "gl_posting",
  );
  const [conditions, setConditions] = useState<Condition[]>(
    existingRule?.conditions || [],
  );
  const [actions, setActions] = useState<Action[]>(existingRule?.actions || []);
  const [approvalRequired, setApprovalRequired] = useState(
    existingRule?.approval_required || false,
  );
  const [saving, setSaving] = useState(false);
  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      { field: "", operator: "equals", value: "" },
    ]);
  };
  const handleUpdateCondition = (
    index: number,
    field: keyof Condition,
    value: any,
  ) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };
  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };
  const handleAddAction = () => {
    setActions([...actions, { type: "auto_post", data: {} }]);
  };
  const handleUpdateAction = (
    index: number,
    field: keyof Action,
    value: any,
  ) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [field]: value };
    setActions(updated);
  };
  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };
  const handleSave = async () => {
    if (!ruleName.trim()) {
      alert("Please enter a rule name");
      return;
    }
    if (conditions.length === 0) {
      alert("Please add at least one condition");
      return;
    }
    if (actions.length === 0) {
      alert("Please add at least one action");
      return;
    }
    setSaving(true);
    try {
      const method = existingRule?.id ? "PUT" : "POST";
      const url = existingRule?.id
        ? `/api/aurum/rules/${existingRule.id}`
        : "/api/aurum/rules";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rule_name: ruleName,
          rule_description: description,
          rule_type: ruleType,
          conditions,
          actions,
          approval_required: approvalRequired,
        }),
      });
      if (response.ok) {
        onSave({
          id: existingRule?.id,
          rule_name: ruleName,
          rule_description: description,
          rule_type: ruleType,
          conditions,
          actions,
          approval_required: approvalRequired,
        });
      } else {
        alert("Error saving rule");
      }
    } catch (error) {
      console.error("Error saving rule:", error);
      alert("Error saving rule");
    } finally {
      setSaving(false);
    }
  };
  const currentFields =
    FIELD_OPTIONS[ruleType as keyof typeof FIELD_OPTIONS] || [];
  return (
    <div className="space-y-6">
      {" "}
      {/* Rule Details Section */}{" "}
      <div className="space-y-3">
        {" "}
        <h3 className="font-semibold text-base">Rule Details</h3>{" "}
        <div>
          {" "}
          <label className="text-sm font-medium">Rule Name *</label>{" "}
          <Input
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
            placeholder="e.g., Auto-Post Toast Revenue"
            className="mt-1"
          />{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="text-sm font-medium">Description</label>{" "}
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this rule do?"
            className="mt-1"
            rows={3}
          />{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="text-sm font-medium">Rule Type *</label>{" "}
          <Select value={ruleType} onValueChange={setRuleType}>
            {" "}
            <SelectTrigger className="mt-1">
              {" "}
              <SelectValue />{" "}
            </SelectTrigger>{" "}
            <SelectContent>
              {" "}
              {RULE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {" "}
                  {type.label}{" "}
                </SelectItem>
              ))}{" "}
            </SelectContent>{" "}
          </Select>{" "}
        </div>{" "}
        <div className="flex items-center gap-2">
          {" "}
          <Checkbox
            id="approval"
            checked={approvalRequired}
            onCheckedChange={(checked) =>
              setApprovalRequired(checked as boolean)
            }
          />{" "}
          <label
            htmlFor="approval"
            className="text-sm font-medium cursor-pointer"
          >
            {" "}
            Require Operator Approval Before Execution{" "}
          </label>{" "}
        </div>{" "}
      </div>{" "}
      {/* Conditions Section */}{" "}
      <div className="space-y-3">
        {" "}
        <div className="flex justify-between items-center">
          {" "}
          <h3 className="font-semibold text-base">
            Conditions (When to trigger)
          </h3>{" "}
          <Badge variant="outline">
            Rule triggers when ALL conditions are met
          </Badge>{" "}
        </div>{" "}
        {conditions.length === 0 ? (
          <Card className="p-4 text-center text-muted-foreground">
            {" "}
            No conditions yet. Click"Add Condition" to start.{" "}
          </Card>
        ) : (
          <div className="space-y-3">
            {" "}
            {conditions.map((condition, idx) => (
              <Card key={idx} className="p-3 space-y-2">
                {" "}
                <div className="grid grid-cols-3 gap-2">
                  {" "}
                  <div>
                    {" "}
                    <label className="text-xs font-medium">Field</label>{" "}
                    <Select
                      value={condition.field}
                      onValueChange={(val) =>
                        handleUpdateCondition(idx, "field", val)
                      }
                    >
                      {" "}
                      <SelectTrigger>
                        {" "}
                        <SelectValue />{" "}
                      </SelectTrigger>{" "}
                      <SelectContent>
                        {" "}
                        {currentFields.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {" "}
                            {field.label}{" "}
                          </SelectItem>
                        ))}{" "}
                      </SelectContent>{" "}
                    </Select>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <label className="text-xs font-medium">Operator</label>{" "}
                    <Select
                      value={condition.operator}
                      onValueChange={(val) =>
                        handleUpdateCondition(idx, "operator", val)
                      }
                    >
                      {" "}
                      <SelectTrigger>
                        {" "}
                        <SelectValue />{" "}
                      </SelectTrigger>{" "}
                      <SelectContent>
                        {" "}
                        {OPERATORS.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {" "}
                            {op.label}{" "}
                          </SelectItem>
                        ))}{" "}
                      </SelectContent>{" "}
                    </Select>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <label className="text-xs font-medium">Value</label>{" "}
                    <Input
                      value={condition.value}
                      onChange={(e) =>
                        handleUpdateCondition(idx, "value", e.target.value)
                      }
                      placeholder="Enter value"
                    />{" "}
                  </div>{" "}
                </div>{" "}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleRemoveCondition(idx)}
                >
                  {" "}
                  Remove Condition{" "}
                </Button>{" "}
              </Card>
            ))}{" "}
          </div>
        )}{" "}
        <Button
          variant="outline"
          onClick={handleAddCondition}
          className="w-full"
        >
          {" "}
          + Add Condition{" "}
        </Button>{" "}
      </div>{" "}
      {/* Actions Section */}{" "}
      <div className="space-y-3">
        {" "}
        <div className="flex justify-between items-center">
          {" "}
          <h3 className="font-semibold text-base">Actions (What to do)</h3>{" "}
          <Badge variant="outline">
            Rule performs ALL actions when triggered
          </Badge>{" "}
        </div>{" "}
        {actions.length === 0 ? (
          <Card className="p-4 text-center text-muted-foreground">
            {" "}
            No actions yet. Click"Add Action" to start.{" "}
          </Card>
        ) : (
          <div className="space-y-3">
            {" "}
            {actions.map((action, idx) => (
              <Card key={idx} className="p-3 space-y-2">
                {" "}
                <div>
                  {" "}
                  <label className="text-xs font-medium">
                    Action Type
                  </label>{" "}
                  <Select
                    value={action.type}
                    onValueChange={(val) =>
                      handleUpdateAction(idx, "type", val)
                    }
                  >
                    {" "}
                    <SelectTrigger>
                      {" "}
                      <SelectValue />{" "}
                    </SelectTrigger>{" "}
                    <SelectContent>
                      {" "}
                      {ACTION_TYPES.map((act) => (
                        <SelectItem key={act.value} value={act.value}>
                          {" "}
                          {act.label}{" "}
                        </SelectItem>
                      ))}{" "}
                    </SelectContent>{" "}
                  </Select>{" "}
                </div>{" "}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleRemoveAction(idx)}
                >
                  {" "}
                  Remove Action{" "}
                </Button>{" "}
              </Card>
            ))}{" "}
          </div>
        )}{" "}
        <Button variant="outline" onClick={handleAddAction} className="w-full">
          {" "}
          + Add Action{" "}
        </Button>{" "}
      </div>{" "}
      {/* Dialog Actions */}{" "}
      <div className="flex gap-2 pt-4 border-t">
        {" "}
        <Button
          primary
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-primary hover:opacity-90"
        >
          {" "}
          {saving
            ? "Saving..."
            : existingRule?.id
              ? "Update Rule"
              : "Create Rule"}{" "}
        </Button>{" "}
        <Button variant="outline" onClick={onCancel} className="flex-1">
          {" "}
          Cancel{" "}
        </Button>{" "}
      </div>{" "}
    </div>
  );
}
