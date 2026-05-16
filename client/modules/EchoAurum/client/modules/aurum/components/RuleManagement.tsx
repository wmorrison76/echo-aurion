import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchWithLucccaSession } from "../../auth";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Edit2,
  Trash2,
  Pause,
  Play,
  Settings,
  TrendingUp,
  Zap,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
interface Rule {
  id: string;
  rule_name: string;
  rule_description: string;
  rule_type: string;
  is_active: boolean;
  is_paused: boolean;
  approval_required: boolean;
  times_triggered: number;
  times_auto_executed: number;
  created_at: string;
}
interface RuleTemplate {
  id: string;
  template_name: string;
  template_description: string;
  rule_type: string;
  usage_count: number;
}
interface AIGeneratedRule {
  id: string;
  rule_id: string;
  rule_name: string;
  rule_reasoning: string;
  confidence_pct: number;
  success_rate: number;
  accepted_by_user_id?: string;
}
export function RuleManagement({ entityId }: { entityId: string }) {
  const [activeTab, setActiveTab] = useState("active");
  const [rules, setRules] = useState<Rule[]>([]);
  const [templates, setTemplates] = useState<RuleTemplate[]>([]);
  const [aiRules, setAIRules] = useState<AIGeneratedRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [templateToCreate, setTemplateToCreate] = useState<RuleTemplate | null>(
    null,
  );
  const [newRuleName, setNewRuleName] = useState("");
  useEffect(() => {
    loadRules();
  }, [entityId]);
  const loadRules = async () => {
    try {
      setLoading(true);
      const [rulesRes, templatesRes] = await Promise.all([
        fetchWithLucccaSession(`/api/rules/active?entityId=${entityId}`),
        fetchWithLucccaSession("/api/rules/templates"),
      ]);
      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setRules(rulesData.rules);
      }
      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData.templates);
      }
    } catch (err) {
      console.error("Failed to load rules:", err);
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteRule = async () => {
    if (!selectedRule) return;
    try {
      const res = await fetchWithLucccaSession(
        `/api/rules/${selectedRule.id}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        setRules(rules.filter((r) => r.id !== selectedRule.id));
        setShowDeleteDialog(false);
        setSelectedRule(null);
      }
    } catch (err) {
      console.error("Failed to delete rule:", err);
    }
  };
  const handleCreateRuleFromTemplate = async () => {
    if (!templateToCreate || !newRuleName) return;
    try {
      const res = await fetchWithLucccaSession(
        "/api/rules/create-from-template",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: templateToCreate.id,
            entityId,
            ruleName: newRuleName,
          }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        setRules([...rules, data.rule]);
        setShowCreateDialog(false);
        setNewRuleName("");
        setTemplateToCreate(null);
      }
    } catch (err) {
      console.error("Failed to create rule:", err);
    }
  };
  const handleTogglePause = async (rule: Rule) => {
    try {
      const endpoint = rule.is_paused ? "unpause" : "pause";
      const res = await fetchWithLucccaSession(
        `/api/rules/${rule.id}/${endpoint}`,
        { method: "POST" },
      );
      if (res.ok) {
        setRules(
          rules.map((r) =>
            r.id === rule.id ? { ...r, is_paused: !r.is_paused } : r,
          ),
        );
      }
    } catch (err) {
      console.error("Failed to toggle pause:", err);
    }
  };
  const successRate = (rule: Rule) => {
    return rule.times_triggered > 0
      ? ((rule.times_auto_executed / rule.times_triggered) * 100).toFixed(0)
      : 0;
  };
  return (
    <div className="space-y-6">
      {" "}
      {/* Header */}{" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h2 className="text-2xl font-bold">Automation Rules</h2>{" "}
          <p className="text-muted-foreground text-sm mt-1">
            {" "}
            Create and manage automation rules, templates, and AI-generated
            rules{" "}
          </p>{" "}
        </div>{" "}
        <Button onClick={() => setShowCreateDialog(true)}>
          {" "}
          <Plus size={16} className="mr-1" /> New Rule{" "}
        </Button>{" "}
      </div>{" "}
      {/* Tabs */}{" "}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {" "}
        <TabsList className="grid w-full grid-cols-3">
          {" "}
          <TabsTrigger value="active">
            {" "}
            Active Rules ({" "}
            {rules.filter((r) => r.is_active && !r.is_paused).length}){" "}
          </TabsTrigger>{" "}
          <TabsTrigger value="templates">
            {" "}
            Templates ({templates.length}){" "}
          </TabsTrigger>{" "}
          <TabsTrigger value="ai_generated">AI Suggested (0)</TabsTrigger>{" "}
        </TabsList>{" "}
        {/* Active Rules Tab */}{" "}
        <TabsContent value="active">
          {" "}
          <div className="space-y-4">
            {" "}
            {rules.length === 0 ? (
              <Card>
                {" "}
                <CardContent className="pt-6 text-center text-muted-foreground">
                  {" "}
                  <p>
                    {" "}
                    No active rules yet. Create your first rule to get
                    started.{" "}
                  </p>{" "}
                </CardContent>{" "}
              </Card>
            ) : (
              rules.map((rule) => (
                <Card
                  key={rule.id}
                  className={rule.is_paused ? "opacity-60 bg-surface" : ""}
                >
                  {" "}
                  <CardHeader>
                    {" "}
                    <div className="flex items-start justify-between">
                      {" "}
                      <div className="flex-1">
                        {" "}
                        <div className="flex items-center gap-2">
                          {" "}
                          <CardTitle className="text-lg">
                            {" "}
                            {rule.rule_name}{" "}
                          </CardTitle>{" "}
                          <Badge variant="outline">{rule.rule_type}</Badge>{" "}
                          {rule.is_paused && (
                            <Badge variant="secondary">Paused</Badge>
                          )}{" "}
                          {rule.approval_required && (
                            <Badge className="bg-yellow-100 text-yellow-900">
                              {" "}
                              Requires Approval{" "}
                            </Badge>
                          )}{" "}
                        </div>{" "}
                        <CardDescription className="mt-1">
                          {" "}
                          {rule.rule_description}{" "}
                        </CardDescription>{" "}
                      </div>{" "}
                    </div>{" "}
                  </CardHeader>{" "}
                  <CardContent>
                    {" "}
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      {" "}
                      <div>
                        {" "}
                        <div className="text-sm text-muted-foreground">
                          Triggered
                        </div>{" "}
                        <div className="text-2xl font-bold">
                          {" "}
                          {rule.times_triggered}{" "}
                        </div>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <div className="text-sm text-muted-foreground">
                          {" "}
                          Auto-Executed{" "}
                        </div>{" "}
                        <div className="text-2xl font-bold text-green-600">
                          {" "}
                          {rule.times_auto_executed}{" "}
                        </div>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <div className="text-sm text-muted-foreground">
                          {" "}
                          Success Rate{" "}
                        </div>{" "}
                        <div className="text-2xl font-bold text-primary">
                          {" "}
                          {successRate(rule)}%{" "}
                        </div>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <div className="text-sm text-muted-foreground">
                          Created
                        </div>{" "}
                        <div className="text-sm font-semibold">
                          {" "}
                          {new Date(rule.created_at).toLocaleDateString()}{" "}
                        </div>{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="flex gap-2">
                      {" "}
                      <Button variant="outline" size="sm">
                        {" "}
                        <Edit2 size={14} className="mr-1" /> Edit{" "}
                      </Button>{" "}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTogglePause(rule)}
                      >
                        {" "}
                        {rule.is_paused ? (
                          <>
                            {" "}
                            <Play size={14} className="mr-1" /> Unpause{" "}
                          </>
                        ) : (
                          <>
                            {" "}
                            <Pause size={14} className="mr-1" /> Pause{" "}
                          </>
                        )}{" "}
                      </Button>{" "}
                      <Button
                        variant="outline"
                        size="sm"
                        danger
                        onClick={() => {
                          setSelectedRule(rule);
                          setShowDeleteDialog(true);
                        }}
                      >
                        {" "}
                        <Trash2 size={14} className="mr-1" /> Delete{" "}
                      </Button>{" "}
                    </div>{" "}
                  </CardContent>{" "}
                </Card>
              ))
            )}{" "}
          </div>{" "}
        </TabsContent>{" "}
        {/* Templates Tab */}{" "}
        <TabsContent value="templates">
          {" "}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {" "}
            {templates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  setTemplateToCreate(template);
                  setShowCreateDialog(true);
                }}
              >
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle className="text-base">
                    {" "}
                    {template.template_name}{" "}
                  </CardTitle>{" "}
                  <CardDescription>
                    {" "}
                    {template.template_description}{" "}
                  </CardDescription>{" "}
                </CardHeader>{" "}
                <CardContent>
                  {" "}
                  <div className="flex items-center justify-between">
                    {" "}
                    <Badge variant="outline">{template.rule_type}</Badge>{" "}
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      Used {template.usage_count} times{" "}
                    </span>{" "}
                  </div>{" "}
                  <Button variant="outline" size="sm" className="w-full mt-4">
                    {" "}
                    <Plus size={14} className="mr-1" /> Create Rule{" "}
                  </Button>{" "}
                </CardContent>{" "}
              </Card>
            ))}{" "}
          </div>{" "}
        </TabsContent>{" "}
        {/* AI-Generated Rules Tab */}{" "}
        <TabsContent value="ai_generated">
          {" "}
          <Card>
            {" "}
            <CardContent className="pt-6 text-center text-muted-foreground">
              {" "}
              <AlertCircle
                size={32}
                className="mx-auto mb-2 text-gray-400"
              />{" "}
              <p>No AI-generated rules yet.</p>{" "}
              <p className="text-sm mt-2">
                {" "}
                Echo AI³ will suggest rules based on your override
                patterns.{" "}
              </p>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
      </Tabs>{" "}
      {/* Delete Confirmation Dialog */}{" "}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        {" "}
        <AlertDialogContent>
          {" "}
          <AlertDialogTitle>Delete Rule?</AlertDialogTitle>{" "}
          <AlertDialogDescription>
            {" "}
            Are you sure you want to delete"{selectedRule?.rule_name}"? This
            action cannot be undone.{" "}
          </AlertDialogDescription>{" "}
          <div className="flex gap-2 justify-end">
            {" "}
            <AlertDialogCancel>Cancel</AlertDialogCancel>{" "}
            <AlertDialogAction
              onClick={handleDeleteRule}
              className="bg-red-600 hover:bg-red-700"
            >
              {" "}
              Delete{" "}
            </AlertDialogAction>{" "}
          </div>{" "}
        </AlertDialogContent>{" "}
      </AlertDialog>{" "}
      {/* Create Rule Dialog */}{" "}
      {showCreateDialog && templateToCreate && (
        <Card className="fixed inset-4 z-50 max-w-2xl mx-auto my-auto">
          {" "}
          <CardHeader className="flex items-center justify-between">
            {" "}
            <div>
              {" "}
              <CardTitle>Create Rule from Template</CardTitle>{" "}
              <CardDescription>
                {" "}
                {templateToCreate.template_name}{" "}
              </CardDescription>{" "}
            </div>{" "}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCreateDialog(false);
                setTemplateToCreate(null);
              }}
            >
              {" "}
              ✕{" "}
            </Button>{" "}
          </CardHeader>{" "}
          <CardContent className="space-y-4">
            {" "}
            <div>
              {" "}
              <label className="text-sm font-semibold">Rule Name</label>{" "}
              <Input
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                placeholder="e.g., Auto-Approve Toast Invoices"
                className="mt-1"
              />{" "}
            </div>{" "}
            <p className="text-sm text-muted-foreground">
              {" "}
              {templateToCreate.template_description}{" "}
            </p>{" "}
            <div className="flex gap-2 justify-end pt-4">
              {" "}
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setTemplateToCreate(null);
                  setNewRuleName("");
                }}
              >
                {" "}
                Cancel{" "}
              </Button>{" "}
              <Button
                onClick={handleCreateRuleFromTemplate}
                disabled={!newRuleName}
              >
                {" "}
                Create Rule{" "}
              </Button>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
    </div>
  );
}
