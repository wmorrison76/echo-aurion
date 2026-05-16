import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RuleEditorDialog } from "./RuleEditorDialog";
export interface Rule {
  id: string;
  rule_name: string;
  rule_description: string;
  rule_type: string;
  is_active: boolean;
  is_paused: boolean;
  times_triggered: number;
  times_auto_executed: number;
  times_approved: number;
  times_rejected: number;
  approval_required: boolean;
  created_at: string;
}
export interface ActiveRulesListProps {
  rules: Rule[];
  loading: boolean;
  onRulesChanged: () => void;
}
export function ActiveRulesList({
  rules,
  loading,
  onRulesChanged,
}: ActiveRulesListProps) {
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const calculateSuccessRate = (rule: Rule): number => {
    const total = rule.times_auto_executed + rule.times_approved;
    if (total === 0) return 0;
    return Math.round((rule.times_auto_executed / total) * 100);
  };
  const handleTogglePause = async (rule: Rule) => {
    try {
      await fetch(`/api/aurum/rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_paused: !rule.is_paused,
          pause_reason: rule.is_paused
            ? null
            : `Paused on ${new Date().toLocaleDateString()}`,
        }),
      });
      onRulesChanged();
    } catch (error) {
      console.error("Error toggling rule pause:", error);
    }
  };
  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm("Are you sure you want to delete this rule?")) return;
    try {
      await fetch(`/api/aurum/rules/${ruleId}`, { method: "DELETE" });
      onRulesChanged();
    } catch (error) {
      console.error("Error deleting rule:", error);
    }
  };
  const handleCopyRule = async (rule: Rule) => {
    try {
      const response = await fetch(`/api/aurum/rules/${rule.id}/copy`, {
        method: "POST",
      });
      if (response.ok) {
        onRulesChanged();
      }
    } catch (error) {
      console.error("Error copying rule:", error);
    }
  };
  const handleEditSave = () => {
    setIsEditDialogOpen(false);
    setEditingRule(null);
    onRulesChanged();
  };
  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Loading rules...
      </div>
    );
  }
  if (rules.length === 0) {
    return (
      <Card className="p-8 text-center">
        {" "}
        <p className="text-muted-foreground mb-4">
          No rules created yet. Start by creating a rule or using a template.
        </p>{" "}
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {" "}
      {rules.map((rule) => (
        <Card key={rule.id} className="p-6">
          {" "}
          <div className="flex justify-between items-start mb-3">
            {" "}
            <div className="flex-1">
              {" "}
              <div className="flex items-center gap-3 mb-2">
                {" "}
                <h3 className="text-lg font-semibold">{rule.rule_name}</h3>{" "}
                <Badge
                  variant={
                    rule.is_paused
                      ? "destructive"
                      : rule.is_active
                        ? "default"
                        : "secondary"
                  }
                >
                  {" "}
                  {rule.is_paused
                    ? "Paused"
                    : rule.is_active
                      ? "Active"
                      : "Inactive"}{" "}
                </Badge>{" "}
              </div>{" "}
              <p className="text-sm text-muted-foreground mb-3">
                {rule.rule_description}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <div className="grid grid-cols-4 gap-4 mb-4 p-3 bg-surface rounded">
            {" "}
            <div>
              {" "}
              <p className="text-xs text-muted-foreground font-semibold">
                TRIGGERED
              </p>{" "}
              <p className="text-lg font-bold">{rule.times_triggered}</p>{" "}
            </div>{" "}
            <div>
              {" "}
              <p className="text-xs text-muted-foreground font-semibold">
                EXECUTED
              </p>{" "}
              <p className="text-lg font-bold">
                {rule.times_auto_executed}
              </p>{" "}
            </div>{" "}
            <div>
              {" "}
              <p className="text-xs text-muted-foreground font-semibold">
                APPROVED
              </p>{" "}
              <p className="text-lg font-bold">{rule.times_approved}</p>{" "}
            </div>{" "}
            <div>
              {" "}
              <p className="text-xs text-muted-foreground font-semibold">
                SUCCESS RATE
              </p>{" "}
              <p className="text-lg font-bold">
                {calculateSuccessRate(rule)}%
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex gap-2">
            {" "}
            <Dialog
              open={isEditDialogOpen && editingRule?.id === rule.id}
              onOpenChange={setIsEditDialogOpen}
            >
              {" "}
              <DialogTrigger asChild>
                {" "}
                <Button variant="outline" onClick={() => setEditingRule(rule)}>
                  {" "}
                  Edit{" "}
                </Button>{" "}
              </DialogTrigger>{" "}
              {editingRule && editingRule.id === rule.id && (
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  {" "}
                  <DialogHeader>
                    {" "}
                    <DialogTitle>Edit Rule</DialogTitle>{" "}
                  </DialogHeader>{" "}
                  <RuleEditorDialog
                    rule={editingRule}
                    onSave={handleEditSave}
                    onCancel={() => setIsEditDialogOpen(false)}
                  />{" "}
                </DialogContent>
              )}{" "}
            </Dialog>{" "}
            <Button variant="outline" onClick={() => handleCopyRule(rule)}>
              {" "}
              Copy{" "}
            </Button>{" "}
            <Button
              variant={rule.is_paused ? "default" : "secondary"}
              onClick={() => handleTogglePause(rule)}
            >
              {" "}
              {rule.is_paused ? "Unpause" : "Pause"}{" "}
            </Button>{" "}
            <Button
              variant="destructive"
              onClick={() => handleDeleteRule(rule.id)}
            >
              {" "}
              Delete{" "}
            </Button>{" "}
          </div>{" "}
        </Card>
      ))}{" "}
    </div>
  );
}
