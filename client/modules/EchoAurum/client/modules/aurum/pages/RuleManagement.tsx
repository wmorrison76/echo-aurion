import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ActiveRulesList } from "./components/ActiveRulesList";
import { RuleTemplates } from "./components/RuleTemplates";
import { AIGeneratedRules } from "./components/AIGeneratedRules";
import { RuleEditorDialog } from "./components/RuleEditorDialog";
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
export function RuleManagement() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [activeTab, setActiveTab] = useState("active");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    loadRules();
  }, [activeTab]);
  const loadRules = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/aurum/rules");
      if (response.ok) {
        const data = await response.json();
        setRules(data);
      }
    } catch (error) {
      console.error("Error loading rules:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleRuleSaved = () => {
    loadRules();
    setIsCreateDialogOpen(false);
  };
  return (
    <div className="rule-management-page p-6">
      {" "}
      <div className="mb-8">
        {" "}
        <h1 className="text-3xl font-bold mb-2">Automation Rules</h1>{" "}
        <p className="text-muted-foreground">
          Create and manage custom rules to automate your GL, AP, and reporting
          workflows.
        </p>{" "}
      </div>{" "}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {" "}
        <TabsList className="grid w-full grid-cols-3 mb-6">
          {" "}
          <TabsTrigger value="active">Active Rules</TabsTrigger>{" "}
          <TabsTrigger value="templates">Templates</TabsTrigger>{" "}
          <TabsTrigger value="ai_generated">AI Suggestions</TabsTrigger>{" "}
        </TabsList>{" "}
        <TabsContent value="active" className="space-y-4">
          {" "}
          <div className="flex justify-between items-center mb-4">
            {" "}
            <h2 className="text-xl font-semibold">Your Rules</h2>{" "}
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              {" "}
              <DialogTrigger asChild>
                {" "}
                <Button className="bg-primary hover:opacity-90">
                  {" "}
                  + Create New Rule{" "}
                </Button>{" "}
              </DialogTrigger>{" "}
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                {" "}
                <DialogHeader>
                  {" "}
                  <DialogTitle>Create New Rule</DialogTitle>{" "}
                </DialogHeader>{" "}
                <RuleEditorDialog
                  onSave={handleRuleSaved}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />{" "}
              </DialogContent>{" "}
            </Dialog>{" "}
          </div>{" "}
          <ActiveRulesList
            rules={rules}
            loading={loading}
            onRulesChanged={loadRules}
          />{" "}
        </TabsContent>{" "}
        <TabsContent value="templates" className="space-y-4">
          {" "}
          <RuleTemplates />{" "}
        </TabsContent>{" "}
        <TabsContent value="ai_generated" className="space-y-4">
          {" "}
          <AIGeneratedRules onAccepted={loadRules} />{" "}
        </TabsContent>{" "}
      </Tabs>{" "}
    </div>
  );
}
export default RuleManagement;
