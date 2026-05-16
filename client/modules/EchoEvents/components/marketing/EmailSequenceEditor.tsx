import React, { useState, useCallback } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
interface SequenceStep {
  id: string;
  emailTemplate: string;
  delayDays: number;
  delayHours: number;
  subject: string;
  content: string;
}
interface EmailSequenceEditorProps {
  onSequenceCreate?: (sequence: SequenceData) => void;
  isLoading?: boolean;
}
interface SequenceData {
  name: string;
  triggerEvent: string;
  steps: SequenceStep[];
}
export const EmailSequenceEditor: React.FC<EmailSequenceEditorProps> = ({
  onSequenceCreate,
  isLoading = false,
}) => {
  const [sequenceName, setSequenceName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("event_completed");
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const triggerEventOptions = [
    { value: "event_completed", label: "Event Completed" },
    { value: "attendee_registered", label: "Attendee Registered" },
    { value: "feedback_received", label: "Feedback Received" },
    { value: "purchase_made", label: "Purchase Made" },
  ];
  const generateStepId = useCallback(() => {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);
  const addStep = useCallback(() => {
    const newStep: SequenceStep = {
      id: generateStepId(),
      emailTemplate: "",
      delayDays: 0,
      delayHours: 0,
      subject: "",
      content: "",
    };
    setSteps([...steps, newStep]);
  }, [steps, generateStepId]);
  const removeStep = useCallback(
    (stepId: string) => {
      setSteps(steps.filter((s) => s.id !== stepId));
    },
    [steps],
  );
  const updateStep = useCallback(
    (stepId: string, updates: Partial<SequenceStep>) => {
      setSteps(steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s)));
    },
    [steps],
  );
  const moveStep = useCallback(
    (stepId: string, direction: "up" | "down") => {
      const index = steps.findIndex((s) => s.id === stepId);
      if (
        (direction === "up" && index === 0) ||
        (direction === "down" && index === steps.length - 1)
      ) {
        return;
      }
      const newSteps = [...steps];
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      [newSteps[index], newSteps[swapIndex]] = [
        newSteps[swapIndex],
        newSteps[index],
      ];
      setSteps(newSteps);
    },
    [steps],
  );
  const handleCreateSequence = useCallback(() => {
    if (!sequenceName || !triggerEvent || steps.length === 0) {
      alert(
        "Please fill in sequence name, select trigger, and add at least one step",
      );
      return;
    }
    for (const step of steps) {
      if (!step.subject || !step.content) {
        alert("All steps must have a subject and content");
        return;
      }
    }
    const sequenceData: SequenceData = {
      name: sequenceName,
      triggerEvent,
      steps,
    };
    onSequenceCreate?.(sequenceData);
  }, [sequenceName, triggerEvent, steps, onSequenceCreate]);
  return (
    <div className="space-y-4 p-6 bg-surface rounded-lg">
      {" "}
      {/* Sequence Header */}{" "}
      <Card className="p-4">
        {" "}
        <div className="grid grid-cols-2 gap-4">
          {" "}
          <div>
            {" "}
            <label className="text-xs font-medium">Sequence Name *</label>{" "}
            <Input
              value={sequenceName}
              onChange={(e) => setSequenceName(e.target.value)}
              placeholder="e.g., Post-Event Follow-up"
              className="mt-1"
            />{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="text-xs font-medium">Trigger Event *</label>{" "}
            <select
              value={triggerEvent}
              onChange={(e) => setTriggerEvent(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded text-sm"
            >
              {" "}
              {triggerEventOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {" "}
                  {opt.label}{" "}
                </option>
              ))}{" "}
            </select>{" "}
          </div>{" "}
        </div>{" "}
      </Card>{" "}
      {/* Steps Timeline */}{" "}
      <div className="space-y-3">
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <h3 className="font-semibold text-sm">
            {" "}
            Email Steps ({steps.length}){" "}
          </h3>{" "}
          <Button
            size="sm"
            onClick={addStep}
            className="flex items-center gap-1"
          >
            {" "}
            <Plus size={14} /> Add Step{" "}
          </Button>{" "}
        </div>{" "}
        {steps.length === 0 ? (
          <Card className="p-8 text-center text-gray-400">
            {" "}
            <p className="text-sm">
              {" "}
              No steps added yet. Click"Add Step" to begin.{" "}
            </p>{" "}
          </Card>
        ) : (
          <div className="relative">
            {" "}
            {/* Timeline line */}{" "}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300"></div>{" "}
            {steps.map((step, index) => (
              <div key={step.id} className="relative pl-16 pb-4">
                {" "}
                {/* Timeline dot */}{" "}
                <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-primary border-4 border-white"></div>{" "}
                <Card className="p-4">
                  {" "}
                  <div className="flex justify-between items-start mb-3">
                    {" "}
                    <div className="font-semibold text-sm">
                      {" "}
                      Step {index + 1}{" "}
                    </div>{" "}
                    <div className="flex gap-1">
                      {" "}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveStep(step.id, "up")}
                        disabled={index === 0}
                      >
                        {" "}
                        <ChevronUp size={14} />{" "}
                      </Button>{" "}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveStep(step.id, "down")}
                        disabled={index === steps.length - 1}
                      >
                        {" "}
                        <ChevronDown size={14} />{" "}
                      </Button>{" "}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(step.id)}
                      >
                        {" "}
                        <Trash2 size={14} className="text-red-500" />{" "}
                      </Button>{" "}
                    </div>{" "}
                  </div>{" "}
                  {expandedStepId === step.id ? (
                    <div className="space-y-3">
                      {" "}
                      <div className="grid grid-cols-2 gap-3">
                        {" "}
                        <div>
                          {" "}
                          <label className="text-xs font-medium">
                            {" "}
                            Days to Wait{" "}
                          </label>{" "}
                          <Input
                            type="number"
                            min="0"
                            max="365"
                            value={step.delayDays}
                            onChange={(e) =>
                              updateStep(step.id, {
                                delayDays: parseInt(e.target.value) || 0,
                              })
                            }
                            className="mt-1"
                          />{" "}
                        </div>{" "}
                        <div>
                          {" "}
                          <label className="text-xs font-medium">
                            {" "}
                            Hours to Wait{" "}
                          </label>{" "}
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            value={step.delayHours}
                            onChange={(e) =>
                              updateStep(step.id, {
                                delayHours: parseInt(e.target.value) || 0,
                              })
                            }
                            className="mt-1"
                          />{" "}
                        </div>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <label className="text-xs font-medium">
                          Subject *
                        </label>{" "}
                        <Input
                          value={step.subject}
                          onChange={(e) =>
                            updateStep(step.id, { subject: e.target.value })
                          }
                          placeholder="Email subject"
                          className="mt-1"
                        />{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <label className="text-xs font-medium">
                          Content *
                        </label>{" "}
                        <textarea
                          value={step.content}
                          onChange={(e) =>
                            updateStep(step.id, { content: e.target.value })
                          }
                          placeholder="Email content"
                          className="mt-1 w-full h-20 p-2 border rounded text-xs"
                        />{" "}
                      </div>{" "}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedStepId(null)}
                      >
                        {" "}
                        Collapse{" "}
                      </Button>{" "}
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer p-2 hover:bg-surface rounded"
                      onClick={() => setExpandedStepId(step.id)}
                    >
                      {" "}
                      <div className="text-xs font-medium text-muted-foreground">
                        {" "}
                        {step.delayDays}d {step.delayHours}h delay{" "}
                      </div>{" "}
                      <div className="text-sm text-foreground truncate mt-1">
                        {" "}
                        {step.subject || "(no subject)"}{" "}
                      </div>{" "}
                    </div>
                  )}{" "}
                </Card>{" "}
              </div>
            ))}{" "}
          </div>
        )}{" "}
      </div>{" "}
      {/* Action Buttons */}{" "}
      <div className="flex gap-2">
        {" "}
        <Button
          onClick={handleCreateSequence}
          disabled={isLoading}
          className="flex-1"
        >
          {" "}
          {isLoading ? "Creating..." : "Create Sequence"}{" "}
        </Button>{" "}
      </div>{" "}
    </div>
  );
};
