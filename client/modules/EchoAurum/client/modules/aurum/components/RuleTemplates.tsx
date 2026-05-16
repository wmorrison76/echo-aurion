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
export interface RuleTemplate {
  id: string;
  template_name: string;
  template_description: string;
  rule_type: string;
  conditions_template: any[];
  actions_template: any[];
  usage_count: number;
  is_system_template: boolean;
}
export function RuleTemplates() {
  const [templates, setTemplates] = useState<RuleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<RuleTemplate | null>(
    null,
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  useEffect(() => {
    loadTemplates();
  }, []);
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/aurum/rule-templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleCreateFromTemplate = (template: RuleTemplate) => {
    setSelectedTemplate(template);
    setIsCreateDialogOpen(true);
  };
  const handleSaveFromTemplate = () => {
    setIsCreateDialogOpen(false);
    setSelectedTemplate(null);
    loadTemplates();
  };
  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Loading templates...
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {" "}
      <p className="text-sm text-muted-foreground mb-4">
        {" "}
        Use one of these pre-built templates to quickly create a rule that
        matches your business process.{" "}
      </p>{" "}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {" "}
        {templates.map((template) => (
          <Card
            key={template.id}
            className="p-5 hover:shadow-md transition-shadow"
          >
            {" "}
            <div className="flex justify-between items-start mb-3">
              {" "}
              <div>
                {" "}
                <h3 className="font-semibold text-base">
                  {template.template_name}
                </h3>{" "}
                <Badge className="mt-1" variant="secondary">
                  {template.rule_type}
                </Badge>{" "}
              </div>{" "}
            </div>{" "}
            <p className="text-sm text-muted-foreground mb-4">
              {template.template_description}
            </p>{" "}
            <div className="text-xs text-muted-foreground mb-4">
              {" "}
              Used {template.usage_count}{" "}
              {template.usage_count === 1 ? "time" : "times"}{" "}
            </div>{" "}
            <Dialog
              open={isCreateDialogOpen && selectedTemplate?.id === template.id}
              onOpenChange={setIsCreateDialogOpen}
            >
              {" "}
              <DialogTrigger asChild>
                {" "}
                <Button
                  className="w-full bg-primary hover:opacity-90"
                  onClick={() => handleCreateFromTemplate(template)}
                >
                  {" "}
                  Use This Template{" "}
                </Button>{" "}
              </DialogTrigger>{" "}
              {selectedTemplate && selectedTemplate.id === template.id && (
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  {" "}
                  <DialogHeader>
                    {" "}
                    <DialogTitle>
                      Create Rule from"{template.template_name}"
                    </DialogTitle>{" "}
                  </DialogHeader>{" "}
                  <RuleEditorDialog
                    rule={{
                      rule_name: `My ${template.template_name}`,
                      rule_description: template.template_description,
                      rule_type: template.rule_type,
                      conditions: template.conditions_template,
                      actions: template.actions_template,
                    }}
                    onSave={handleSaveFromTemplate}
                    onCancel={() => setIsCreateDialogOpen(false)}
                  />{" "}
                </DialogContent>
              )}{" "}
            </Dialog>{" "}
          </Card>
        ))}{" "}
      </div>{" "}
      {templates.length === 0 && (
        <Card className="p-8 text-center">
          {" "}
          <p className="text-muted-foreground">
            No templates available. Create a rule from scratch or check back
            later.
          </p>{" "}
        </Card>
      )}{" "}
    </div>
  );
}
