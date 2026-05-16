/**
 * Post-Event Evaluation Form
 *
 * Allows managers to evaluate staff effectiveness after each event
 * Data is encrypted and used to train EchoAI^3
 */

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Star,
  Shield,
  Lock,
  Save,
  Send,
  CheckCircle2,
  AlertTriangle,
  Brain,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/glass";

interface EvaluationFormData {
  employeeId: string;
  employeeName: string;
  role: string;
  performance: {
    punctuality: number;
    quality: number;
    teamwork: number;
    communication: number;
    problemSolving: number;
    guestInteraction?: number;
  };
  strengths: string[];
  areasForImprovement: string[];
  managerNotes: string;
  sensitiveData: {
    hoursWorked?: number;
    overtimeHours?: number;
    payRate?: number;
    tipsEarned?: number;
    bonuses?: number;
    deductions?: number;
  };
  eventContext: {
    difficulty: "easy" | "medium" | "hard" | "expert";
    workload: "light" | "moderate" | "heavy" | "extreme";
  };
}

interface PostEventEvaluationFormProps {
  eventId: string;
  beoId?: string;
  eventName: string;
  eventDate: string;
  staffAssignments: Array<{
    employeeId: string;
    employeeName: string;
    role: string;
    roleCode: string;
  }>;
  onComplete?: () => void;
}

export function PostEventEvaluationForm({
  eventId,
  beoId,
  eventName,
  eventDate,
  staffAssignments,
  onComplete,
}: PostEventEvaluationFormProps) {
  const { toast } = useToast();
  const [evaluations, setEvaluations] = React.useState<
    Map<string, EvaluationFormData>
  >(new Map());
  const [activeEmployee, setActiveEmployee] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  // Initialize evaluations for all staff
  React.useEffect(() => {
    const initial = new Map<string, EvaluationFormData>();
    for (const assignment of staffAssignments) {
      initial.set(assignment.employeeId, {
        employeeId: assignment.employeeId,
        employeeName: assignment.employeeName,
        role: assignment.role,
        performance: {
          punctuality: 0,
          quality: 0,
          teamwork: 0,
          communication: 0,
          problemSolving: 0,
          guestInteraction:
            assignment.roleCode.includes("server") ||
            assignment.roleCode.includes("captain")
              ? 0
              : undefined,
        },
        strengths: [],
        areasForImprovement: [],
        managerNotes: "",
        sensitiveData: {},
        eventContext: {
          difficulty: "medium",
          workload: "moderate",
        },
      });
    }
    setEvaluations(initial);
    if (staffAssignments.length > 0) {
      setActiveEmployee(staffAssignments[0].employeeId);
    }
  }, [staffAssignments]);

  const updateEvaluation = (
    employeeId: string,
    updates: Partial<EvaluationFormData>,
  ) => {
    const existing = evaluations.get(employeeId);
    if (!existing) return;

    const updated = { ...existing, ...updates };
    if (updates.performance) {
      updated.performance = { ...existing.performance, ...updates.performance };
    }
    if (updates.sensitiveData) {
      updated.sensitiveData = {
        ...existing.sensitiveData,
        ...updates.sensitiveData,
      };
    }
    if (updates.eventContext) {
      updated.eventContext = {
        ...existing.eventContext,
        ...updates.eventContext,
      };
    }

    setEvaluations(new Map(evaluations.set(employeeId, updated)));
  };

  const calculateOverallRating = (
    performance: EvaluationFormData["performance"],
  ): number => {
    const scores = [
      performance.punctuality,
      performance.quality,
      performance.teamwork,
      performance.communication,
      performance.problemSolving,
      performance.guestInteraction,
    ].filter((s) => s > 0);

    return scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : 0;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save as draft
      for (const [employeeId, evaluation] of evaluations.entries()) {
        await fetch("/api/performance/evaluations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            beoId,
            employeeId,
            evaluation: {
              ...evaluation,
              performance: {
                ...evaluation.performance,
                overallRating: calculateOverallRating(evaluation.performance),
              },
            },
            status: "draft",
          }),
        });
      }

      toast({
        title: "Evaluations Saved",
        description: "All evaluations saved as draft",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save evaluations",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // Submit all evaluations
      for (const [employeeId, evaluation] of evaluations.entries()) {
        const response = await fetch("/api/performance/evaluations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            beoId,
            employeeId,
            evaluation: {
              ...evaluation,
              performance: {
                ...evaluation.performance,
                overallRating: calculateOverallRating(evaluation.performance),
              },
            },
            status: "submitted",
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to submit evaluation for ${evaluation.employeeName}`,
          );
        }
      }

      setSubmitted(true);
      toast({
        title: "Evaluations Submitted",
        description:
          "All evaluations have been submitted and will train EchoAI^3",
      });

      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit evaluations",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const currentEvaluation = activeEmployee
    ? evaluations.get(activeEmployee)
    : null;
  const completedCount = Array.from(evaluations.values()).filter(
    (e) => e.performance.punctuality > 0 && e.performance.quality > 0,
  ).length;

  return (
    <div className="w-full h-full overflow-y-auto p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-8 h-8 text-primary" />
            Post-Event Evaluation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Evaluate staff effectiveness for {eventName} on{" "}
            {format(new Date(eventDate), "PPP")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            <Lock className="w-3 h-3 mr-1" />
            Encrypted
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <Brain className="w-3 h-3 mr-1" />
            Trains AI
          </Badge>
        </div>
      </div>

      {submitted ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Evaluations Submitted
            </h2>
            <p className="text-muted-foreground mb-4">
              All evaluations have been encrypted and submitted. EchoAI^3 will
              use this data to improve future scheduling.
            </p>
            <Button onClick={onComplete}>Close</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Progress */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  Progress
                </span>
                <span className="text-sm text-muted-foreground">
                  {completedCount} / {staffAssignments.length} completed
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${(completedCount / staffAssignments.length) * 100}%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-4 gap-6">
            {/* Staff List */}
            <div className="col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Staff Members</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-1">
                    {staffAssignments.map((assignment) => {
                      const eval = evaluations.get(assignment.employeeId);
                      const isComplete =
                        eval &&
                        eval.performance.punctuality > 0 &&
                        eval.performance.quality > 0;
                      const isActive = activeEmployee === assignment.employeeId;

                      return (
                        <button
                          key={assignment.employeeId}
                          onClick={() =>
                            setActiveEmployee(assignment.employeeId)
                          }
                          className={cn(
                            "w-full text-left p-3 border-b border-border hover:bg-surface transition-colors",
                            isActive &&
                              "bg-primary/10 border-l-4 border-l-primary",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-foreground">
                                {assignment.employeeName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {assignment.role}
                              </p>
                            </div>
                            {isComplete && (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Evaluation Form */}
            <div className="col-span-3">
              {currentEvaluation ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{currentEvaluation.employeeName}</CardTitle>
                        <CardDescription>
                          {currentEvaluation.role}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star
                          className={cn(
                            "w-5 h-5",
                            calculateOverallRating(
                              currentEvaluation.performance,
                            ) >= 4
                              ? "text-yellow-500 fill-yellow-500"
                              : calculateOverallRating(
                                    currentEvaluation.performance,
                                  ) >= 3
                                ? "text-yellow-400"
                                : "text-muted-foreground",
                          )}
                        />
                        <span className="text-lg font-bold text-foreground">
                          {calculateOverallRating(
                            currentEvaluation.performance,
                          ).toFixed(1)}
                          /5
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="performance" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="performance">
                          Performance
                        </TabsTrigger>
                        <TabsTrigger value="feedback">Feedback</TabsTrigger>
                        <TabsTrigger value="sensitive">Payroll</TabsTrigger>
                        <TabsTrigger value="context">Context</TabsTrigger>
                      </TabsList>

                      <TabsContent
                        value="performance"
                        className="space-y-4 mt-4"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="punctuality">Punctuality</Label>
                            <Select
                              value={currentEvaluation.performance.punctuality.toString()}
                              onValueChange={(v) =>
                                updateEvaluation(currentEvaluation.employeeId, {
                                  performance: {
                                    ...currentEvaluation.performance,
                                    punctuality: parseInt(v),
                                  },
                                })
                              }
                            >
                              <SelectTrigger id="punctuality">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">Not Rated</SelectItem>
                                <SelectItem value="1">1 - Poor</SelectItem>
                                <SelectItem value="2">
                                  2 - Below Average
                                </SelectItem>
                                <SelectItem value="3">3 - Average</SelectItem>
                                <SelectItem value="4">4 - Good</SelectItem>
                                <SelectItem value="5">5 - Excellent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="quality">Quality of Work</Label>
                            <Select
                              value={currentEvaluation.performance.quality.toString()}
                              onValueChange={(v) =>
                                updateEvaluation(currentEvaluation.employeeId, {
                                  performance: {
                                    ...currentEvaluation.performance,
                                    quality: parseInt(v),
                                  },
                                })
                              }
                            >
                              <SelectTrigger id="quality">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">Not Rated</SelectItem>
                                <SelectItem value="1">1 - Poor</SelectItem>
                                <SelectItem value="2">
                                  2 - Below Average
                                </SelectItem>
                                <SelectItem value="3">3 - Average</SelectItem>
                                <SelectItem value="4">4 - Good</SelectItem>
                                <SelectItem value="5">5 - Excellent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="teamwork">Teamwork</Label>
                            <Select
                              value={currentEvaluation.performance.teamwork.toString()}
                              onValueChange={(v) =>
                                updateEvaluation(currentEvaluation.employeeId, {
                                  performance: {
                                    ...currentEvaluation.performance,
                                    teamwork: parseInt(v),
                                  },
                                })
                              }
                            >
                              <SelectTrigger id="teamwork">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">Not Rated</SelectItem>
                                <SelectItem value="1">1 - Poor</SelectItem>
                                <SelectItem value="2">
                                  2 - Below Average
                                </SelectItem>
                                <SelectItem value="3">3 - Average</SelectItem>
                                <SelectItem value="4">4 - Good</SelectItem>
                                <SelectItem value="5">5 - Excellent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="communication">Communication</Label>
                            <Select
                              value={currentEvaluation.performance.communication.toString()}
                              onValueChange={(v) =>
                                updateEvaluation(currentEvaluation.employeeId, {
                                  performance: {
                                    ...currentEvaluation.performance,
                                    communication: parseInt(v),
                                  },
                                })
                              }
                            >
                              <SelectTrigger id="communication">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">Not Rated</SelectItem>
                                <SelectItem value="1">1 - Poor</SelectItem>
                                <SelectItem value="2">
                                  2 - Below Average
                                </SelectItem>
                                <SelectItem value="3">3 - Average</SelectItem>
                                <SelectItem value="4">4 - Good</SelectItem>
                                <SelectItem value="5">5 - Excellent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="problemSolving">
                              Problem Solving
                            </Label>
                            <Select
                              value={currentEvaluation.performance.problemSolving.toString()}
                              onValueChange={(v) =>
                                updateEvaluation(currentEvaluation.employeeId, {
                                  performance: {
                                    ...currentEvaluation.performance,
                                    problemSolving: parseInt(v),
                                  },
                                })
                              }
                            >
                              <SelectTrigger id="problemSolving">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">Not Rated</SelectItem>
                                <SelectItem value="1">1 - Poor</SelectItem>
                                <SelectItem value="2">
                                  2 - Below Average
                                </SelectItem>
                                <SelectItem value="3">3 - Average</SelectItem>
                                <SelectItem value="4">4 - Good</SelectItem>
                                <SelectItem value="5">5 - Excellent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {currentEvaluation.performance.guestInteraction !==
                            undefined && (
                            <div className="space-y-2">
                              <Label htmlFor="guestInteraction">
                                Guest Interaction
                              </Label>
                              <Select
                                value={currentEvaluation.performance.guestInteraction.toString()}
                                onValueChange={(v) =>
                                  updateEvaluation(
                                    currentEvaluation.employeeId,
                                    {
                                      performance: {
                                        ...currentEvaluation.performance,
                                        guestInteraction: parseInt(v),
                                      },
                                    },
                                  )
                                }
                              >
                                <SelectTrigger id="guestInteraction">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">Not Rated</SelectItem>
                                  <SelectItem value="1">1 - Poor</SelectItem>
                                  <SelectItem value="2">
                                    2 - Below Average
                                  </SelectItem>
                                  <SelectItem value="3">3 - Average</SelectItem>
                                  <SelectItem value="4">4 - Good</SelectItem>
                                  <SelectItem value="5">
                                    5 - Excellent
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="feedback" className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="strengths">Strengths</Label>
                          <Textarea
                            id="strengths"
                            placeholder="Enter strengths (one per line)"
                            value={currentEvaluation.strengths.join("\n")}
                            onChange={(e) =>
                              updateEvaluation(currentEvaluation.employeeId, {
                                strengths: e.target.value
                                  .split("\n")
                                  .filter((s) => s.trim()),
                              })
                            }
                            rows={4}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="improvements">
                            Areas for Improvement
                          </Label>
                          <Textarea
                            id="improvements"
                            placeholder="Enter areas for improvement (one per line)"
                            value={currentEvaluation.areasForImprovement.join(
                              "\n",
                            )}
                            onChange={(e) =>
                              updateEvaluation(currentEvaluation.employeeId, {
                                areasForImprovement: e.target.value
                                  .split("\n")
                                  .filter((s) => s.trim()),
                              })
                            }
                            rows={4}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">
                            Manager Notes (Encrypted)
                          </Label>
                          <Textarea
                            id="notes"
                            placeholder="Additional notes about this employee's performance..."
                            value={currentEvaluation.managerNotes}
                            onChange={(e) =>
                              updateEvaluation(currentEvaluation.employeeId, {
                                managerNotes: e.target.value,
                              })
                            }
                            rows={6}
                          />
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            This field is encrypted and only accessible to
                            authorized personnel
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent value="sensitive" className="space-y-4 mt-4">
                        <Alert>
                          <Shield className="h-4 w-4" />
                          <AlertDescription>
                            All payroll information is encrypted and protected.
                            Only authorized managers and HR can access this
                            data.
                          </AlertDescription>
                        </Alert>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="hoursWorked">Hours Worked</Label>
                            <Input
                              id="hoursWorked"
                              type="number"
                              step="0.25"
                              value={
                                currentEvaluation.sensitiveData.hoursWorked ||
                                ""
                              }
                              onChange={(e) =>
                                updateEvaluation(currentEvaluation.employeeId, {
                                  sensitiveData: {
                                    ...currentEvaluation.sensitiveData,
                                    hoursWorked:
                                      parseFloat(e.target.value) || undefined,
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="overtimeHours">
                              Overtime Hours
                            </Label>
                            <Input
                              id="overtimeHours"
                              type="number"
                              step="0.25"
                              value={
                                currentEvaluation.sensitiveData.overtimeHours ||
                                ""
                              }
                              onChange={(e) =>
                                updateEvaluation(currentEvaluation.employeeId, {
                                  sensitiveData: {
                                    ...currentEvaluation.sensitiveData,
                                    overtimeHours:
                                      parseFloat(e.target.value) || undefined,
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="payRate">
                              Pay Rate (Encrypted)
                            </Label>
                            <Input
                              id="payRate"
                              type="number"
                              step="0.01"
                              value={
                                currentEvaluation.sensitiveData.payRate || ""
                              }
                              onChange={(e) =>
                                updateEvaluation(currentEvaluation.employeeId, {
                                  sensitiveData: {
                                    ...currentEvaluation.sensitiveData,
                                    payRate:
                                      parseFloat(e.target.value) || undefined,
                                  },
                                })
                              }
                            />
                          </div>
                          {currentEvaluation.role.includes("Server") && (
                            <div className="space-y-2">
                              <Label htmlFor="tipsEarned">
                                Tips Earned (Encrypted)
                              </Label>
                              <Input
                                id="tipsEarned"
                                type="number"
                                step="0.01"
                                value={
                                  currentEvaluation.sensitiveData.tipsEarned ||
                                  ""
                                }
                                onChange={(e) =>
                                  updateEvaluation(
                                    currentEvaluation.employeeId,
                                    {
                                      sensitiveData: {
                                        ...currentEvaluation.sensitiveData,
                                        tipsEarned:
                                          parseFloat(e.target.value) ||
                                          undefined,
                                      },
                                    },
                                  )
                                }
                              />
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label htmlFor="bonuses">Bonuses (Encrypted)</Label>
                            <Input
                              id="bonuses"
                              type="number"
                              step="0.01"
                              value={
                                currentEvaluation.sensitiveData.bonuses || ""
                              }
                              onChange={(e) =>
                                updateEvaluation(currentEvaluation.employeeId, {
                                  sensitiveData: {
                                    ...currentEvaluation.sensitiveData,
                                    bonuses:
                                      parseFloat(e.target.value) || undefined,
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="deductions">
                              Deductions (Encrypted)
                            </Label>
                            <Input
                              id="deductions"
                              type="number"
                              step="0.01"
                              value={
                                currentEvaluation.sensitiveData.deductions || ""
                              }
                              onChange={(e) =>
                                updateEvaluation(currentEvaluation.employeeId, {
                                  sensitiveData: {
                                    ...currentEvaluation.sensitiveData,
                                    deductions:
                                      parseFloat(e.target.value) || undefined,
                                  },
                                })
                              }
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="context" className="space-y-4 mt-4">
                        <Alert>
                          <Brain className="h-4 w-4" />
                          <AlertDescription>
                            This context helps EchoAI^3 learn when this employee
                            performs best
                          </AlertDescription>
                        </Alert>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="difficulty">Event Difficulty</Label>
                            <Select
                              value={currentEvaluation.eventContext.difficulty}
                              onValueChange={(v: any) =>
                                updateEvaluation(currentEvaluation.employeeId, {
                                  eventContext: {
                                    ...currentEvaluation.eventContext,
                                    difficulty: v,
                                  },
                                })
                              }
                            >
                              <SelectTrigger id="difficulty">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="easy">Easy</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="hard">Hard</SelectItem>
                                <SelectItem value="expert">Expert</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="workload">Workload</Label>
                            <Select
                              value={currentEvaluation.eventContext.workload}
                              onValueChange={(v: any) =>
                                updateEvaluation(currentEvaluation.employeeId, {
                                  eventContext: {
                                    ...currentEvaluation.eventContext,
                                    workload: v,
                                  },
                                })
                              }
                            >
                              <SelectTrigger id="workload">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="moderate">
                                  Moderate
                                </SelectItem>
                                <SelectItem value="heavy">Heavy</SelectItem>
                                <SelectItem value="extreme">Extreme</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Select a staff member to begin evaluation
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || completedCount < staffAssignments.length}
            >
              <Send className="w-4 h-4 mr-2" />
              Submit All Evaluations
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
