import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RuleEditorDialog } from "./RuleEditorDialog";
export interface AIGeneratedRule {
  id: string;
  rule_id: string;
  rule_name: string;
  rule_description: string;
  rule_type: string;
  rule_reasoning: string;
  confidence_pct: number;
  suggested_at: string;
  conditions: any[];
  actions: any[];
  trigger_type: string;
}
export interface AIGeneratedRulesProps {
  onAccepted?: () => void;
}
export function AIGeneratedRules({ onAccepted }: AIGeneratedRulesProps) {
  const [rules, setRules] = useState<AIGeneratedRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<AIGeneratedRule | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  useEffect(() => {
    loadAISuggestions();
  }, []);
  const loadAISuggestions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/aurum/rules/ai-suggested");
      if (response.ok) {
        const data = await response.json();
        setRules(data);
      }
    } catch (error) {
      console.error("Error loading AI suggestions:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleAccept = async (aiRule: AIGeneratedRule) => {
    try {
      const response = await fetch(
        `/api/aurum/rules/ai-suggested/${aiRule.id}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Looks good, activating now" }),
        },
      );
      if (response.ok) {
        loadAISuggestions();
        onAccepted?.();
      }
    } catch (error) {
      console.error("Error accepting rule:", error);
    }
  };
  const handleReject = async (aiRule: AIGeneratedRule) => {
    try {
      const response = await fetch(
        `/api/aurum/rules/ai-suggested/${aiRule.id}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Not quite right for our process" }),
        },
      );
      if (response.ok) {
        loadAISuggestions();
      }
    } catch (error) {
      console.error("Error rejecting rule:", error);
    }
  };
  const handleEditAndAccept = () => {
    setIsEditDialogOpen(false);
    setEditingRule(null);
    loadAISuggestions();
    onAccepted?.();
  };
  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Loading AI suggestions...
      </div>
    );
  }
  if (rules.length === 0) {
    return (
      <Card className="p-8 text-center">
        {" "}
        <p className="text-muted-foreground mb-2">
          No AI suggestions yet.
        </p>{" "}
        <p className="text-sm text-muted-foreground">
          Echo AI³ will suggest rules based on your override patterns and usage.
        </p>{" "}
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {" "}
      <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
        {" "}
        <p className="text-sm text-blue-900">
          {" "}
          💡 <strong>Echo AI³ has learned your patterns.</strong> These are
          suggested rules based on your recent actions and overrides.{" "}
        </p>{" "}
      </div>{" "}
      {rules.map((aiRule) => (
        <Card key={aiRule.id} className="p-6">
          {" "}
          <div className="flex justify-between items-start mb-4">
            {" "}
            <div className="flex-1">
              {" "}
              <div className="flex items-center gap-3 mb-2">
                {" "}
                <h3 className="text-lg font-semibold">
                  {aiRule.rule_name}
                </h3>{" "}
                <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                  {" "}
                  🤖 AI Suggested{" "}
                </Badge>{" "}
              </div>{" "}
              <p className="text-sm text-muted-foreground">
                {aiRule.rule_description}
              </p>{" "}
            </div>{" "}
            <div className="text-right">
              {" "}
              <p className="text-xs text-muted-foreground font-semibold mb-1">
                CONFIDENCE
              </p>{" "}
              <p className="text-2xl font-bold text-purple-600">
                {aiRule.confidence_pct}%
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <div className="bg-surface rounded p-4 mb-4 text-sm text-foreground border-l-2 border-purple-400">
            {" "}
            <p className="font-semibold mb-2">
              Why Echo AI³ Created This Rule:
            </p>{" "}
            <p>{aiRule.rule_reasoning}</p>{" "}
          </div>{" "}
          <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-surface rounded">
            {" "}
            <div>
              {" "}
              <p className="text-xs text-muted-foreground font-semibold">
                TRIGGER TYPE
              </p>{" "}
              <p className="text-sm font-semibold capitalize">
                {aiRule.trigger_type.replace("_", " ")}
              </p>{" "}
            </div>{" "}
            <div>
              {" "}
              <p className="text-xs text-muted-foreground font-semibold">
                RULE TYPE
              </p>{" "}
              <p className="text-sm font-semibold capitalize">
                {aiRule.rule_type.replace("_", " ")}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex gap-2">
            {" "}
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => handleAccept(aiRule)}
            >
              {" "}
              ✅ Accept & Activate{" "}
            </Button>{" "}
            <Dialog
              open={isEditDialogOpen && editingRule?.id === aiRule.id}
              onOpenChange={setIsEditDialogOpen}
            >
              {" "}
              <DialogTrigger asChild>
                {" "}
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditingRule(aiRule)}
                >
                  {" "}
                  ✏️ Edit Before Accepting{" "}
                </Button>{" "}
              </DialogTrigger>{" "}
              {editingRule && editingRule.id === aiRule.id && (
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  {" "}
                  <DialogHeader>
                    {" "}
                    <DialogTitle>
                      Edit"{aiRule.rule_name}" Before Accepting
                    </DialogTitle>{" "}
                  </DialogHeader>{" "}
                  <RuleEditorDialog
                    rule={{
                      rule_name: aiRule.rule_name,
                      rule_description: aiRule.rule_description,
                      rule_type: aiRule.rule_type,
                      conditions: aiRule.conditions,
                      actions: aiRule.actions,
                    }}
                    onSave={handleEditAndAccept}
                    onCancel={() => setIsEditDialogOpen(false)}
                  />{" "}
                </DialogContent>
              )}{" "}
            </Dialog>{" "}
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => handleReject(aiRule)}
            >
              {" "}
              ❌ Reject{" "}
            </Button>{" "}
          </div>{" "}
        </Card>
      ))}{" "}
    </div>
  );
}
