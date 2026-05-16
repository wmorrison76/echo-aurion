import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Check,
  AlertCircle,
  Loader2,
  Clock,
  Trash2,
  CheckCircle2,
  ChefHat,
  Zap,
} from "lucide-react";
import { format } from "date-fns";

interface PrepAssignment {
  id: string;
  prepTaskId: string;
  taskName: string;
  assignedToEmployeeId: string;
  assignedToEmployeeName?: string;
  dueDate: string;
  ingredients?: string[];
  instructions?: string;
  notes?: string;
  status: "assigned" | "in-progress" | "completed" | "cancelled";
  createdAt: string;
  completedAt?: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
}

export interface TabletPrepAssignmentsProps {
  deviceId: string;
  employees?: Employee[];
  onClose?: () => void;
}

const MOCK_EMPLOYEES: Employee[] = [
  { id: "emp001", name: "Chef John", role: "Head Chef" },
  { id: "emp002", name: "Sarah", role: "Sous Chef" },
  { id: "emp003", name: "Miguel", role: "Line Cook" },
  { id: "emp004", name: "Lisa", role: "Prep Cook" },
  { id: "emp005", name: "David", role: "Apprentice" },
];

export function TabletPrepAssignments({
  deviceId,
  employees = MOCK_EMPLOYEES,
  onClose,
}: TabletPrepAssignmentsProps) {
  const { toast } = useToast();

  const [assignments, setAssignments] = useState<PrepAssignment[]>([]);
  const [myAssignments, setMyAssignments] = useState<PrepAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"admin" | "my-tasks">("admin");
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentEmployeeId = localStorage.getItem("tablet:employeeId") || "";

  const [newAssignment, setNewAssignment] = useState({
    taskName: "",
    assignedToEmployeeId: "",
    dueDate: format(new Date(), "yyyy-MM-dd"),
    ingredients: "",
    instructions: "",
    notes: "",
  });

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = useCallback(async () => {
    try {
      setIsLoading(true);

      const allResponse = await fetch(
        `/api/tablet/prep/assigned?status=assigned`,
      );
      if (allResponse.ok) {
        const data = await allResponse.json();
        setAssignments(data.assignments || []);
      }

      if (currentEmployeeId) {
        const myResponse = await fetch(
          `/api/tablet/prep/assigned?employeeId=${currentEmployeeId}&status=assigned`,
        );
        if (myResponse.ok) {
          const data = await myResponse.json();
          setMyAssignments(data.assignments || []);
        }
      }
    } catch (error) {
      console.warn("Failed to load assignments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentEmployeeId]);

  const handleCreateAssignment = async () => {
    if (!newAssignment.taskName.trim() || !newAssignment.assignedToEmployeeId) {
      toast({
        title: "Validation",
        description: "Please enter task name and select an employee",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/tablet/prep/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          prepTaskId: `prep-${Date.now()}`,
          assignedToEmployeeId: newAssignment.assignedToEmployeeId,
          dueDate: newAssignment.dueDate,
          ingredients: newAssignment.ingredients
            .split("\n")
            .filter((i) => i.trim()),
          instructions: newAssignment.instructions,
          notes: newAssignment.notes,
        }),
      });

      if (!response.ok) throw new Error("Failed to create assignment");

      toast({
        title: "Assignment Created",
        description: `Prep work assigned to ${
          employees.find((e) => e.id === newAssignment.assignedToEmployeeId)
            ?.name || "staff member"
        }`,
      });

      setNewAssignment({
        taskName: "",
        assignedToEmployeeId: "",
        dueDate: format(new Date(), "yyyy-MM-dd"),
        ingredients: "",
        instructions: "",
        notes: "",
      });

      setShowCreateAssignment(false);
      await loadAssignments();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create assignment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAssignmentStatus = async (
    assignmentId: string,
    newStatus: string,
  ) => {
    try {
      const response = await fetch(`/api/tablet/prep/${assignmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update assignment");

      toast({
        title: "Success",
        description: `Assignment marked as ${newStatus}`,
      });

      await loadAssignments();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update assignment",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "assigned":
        return "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30";
      case "in-progress":
        return "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30";
      case "completed":
        return "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30";
      case "cancelled":
        return "bg-slate-100 dark:bg-slate-500/20 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-500/30";
      default:
        return "bg-slate-100 dark:bg-slate-500/20 text-slate-800 dark:text-slate-300";
    }
  };

  const getStatusBorder = (status: string) => {
    switch (status) {
      case "assigned":
        return "border-l-4 border-l-blue-500";
      case "in-progress":
        return "border-l-4 border-l-amber-500";
      case "completed":
        return "border-l-4 border-l-emerald-500";
      case "cancelled":
        return "border-l-4 border-l-slate-500";
      default:
        return "border-l-4 border-l-slate-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "assigned":
        return <Clock className="w-4 h-4" />;
      case "in-progress":
        return <Zap className="w-4 h-4" />;
      case "completed":
        return <CheckCircle2 className="w-4 h-4" />;
      case "cancelled":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const AssignmentCard = ({ assignment }: { assignment: PrepAssignment }) => (
    <Card
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg dark:hover:shadow-slate-900/50 transition-all ${getStatusBorder(assignment.status)}`}
    >
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50">
                {assignment.taskName}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {assignment.assignedToEmployeeName}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 flex-shrink-0 ${getStatusBadgeColor(assignment.status)}`}
            >
              {getStatusIcon(assignment.status)}
              <span className="capitalize">{assignment.status}</span>
            </span>
          </div>

          <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Due: {format(new Date(assignment.dueDate), "MMM d, yyyy")}
          </div>

          {assignment.ingredients && assignment.ingredients.length > 0 && (
            <div className="text-sm">
              <p className="font-semibold text-slate-900 dark:text-slate-50 mb-2">
                Ingredients:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                {assignment.ingredients.map((ing, idx) => (
                  <li key={idx}>{ing}</li>
                ))}
              </ul>
            </div>
          )}

          {assignment.instructions && (
            <div className="text-sm">
              <p className="font-semibold text-slate-900 dark:text-slate-50 mb-2">
                Instructions:
              </p>
              <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                {assignment.instructions}
              </p>
            </div>
          )}

          {assignment.notes && (
            <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700">
              <p className="font-semibold mb-1 text-slate-900 dark:text-slate-50">
                Notes:
              </p>
              <p>{assignment.notes}</p>
            </div>
          )}

          {assignment.status !== "completed" &&
            assignment.status !== "cancelled" && (
              <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                {assignment.status === "assigned" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleUpdateAssignmentStatus(assignment.id, "in-progress")
                    }
                    className="flex-1 text-xs dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Start Prep
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleUpdateAssignmentStatus(assignment.id, "completed")
                  }
                  className="flex-1 text-xs dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Mark Done
                </Button>
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <ChefHat className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="dark:text-slate-50">
                  Prep Work Assignments
                </CardTitle>
              </div>
              <CardDescription className="dark:text-slate-400">
                Manage prep work and assign tasks to kitchen staff
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowCreateAssignment(true)}
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Assign Prep Work
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800">
            <div className="flex gap-1 -mb-px">
              <button
                onClick={() => setActiveTab("admin")}
                className={`px-4 py-3 font-semibold text-sm border-b-2 transition ${
                  activeTab === "admin"
                    ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300"
                }`}
              >
                All Assignments ({assignments.length})
              </button>
              {currentEmployeeId && (
                <button
                  onClick={() => setActiveTab("my-tasks")}
                  className={`px-4 py-3 font-semibold text-sm border-b-2 transition ${
                    activeTab === "my-tasks"
                      ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300"
                  }`}
                >
                  My Tasks ({myAssignments.length})
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
            </div>
          ) : activeTab === "admin" ? (
            assignments.length === 0 ? (
              <Alert className="border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                <AlertCircle className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <AlertDescription className="text-slate-700 dark:text-slate-300">
                  No active prep assignments. Create new assignments to distribute prep work.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {assignments.map((assignment) => (
                  <AssignmentCard key={assignment.id} assignment={assignment} />
                ))}
              </div>
            )
          ) : myAssignments.length === 0 ? (
            <Alert className="border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
              <AlertCircle className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <AlertDescription className="text-slate-700 dark:text-slate-300">
                You have no active prep assignments. Check back for new tasks.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myAssignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showCreateAssignment}
        onOpenChange={setShowCreateAssignment}
      >
        <DialogContent className="sm:max-w-2xl dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-50">
              Assign Prep Work
            </DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Create a new prep work assignment for kitchen staff
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Task Name *
              </label>
              <Input
                placeholder="e.g., Chop vegetables, Marinate chicken"
                value={newAssignment.taskName}
                onChange={(e) =>
                  setNewAssignment({
                    ...newAssignment,
                    taskName: e.target.value,
                  })
                }
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Assign To *
              </label>
              <Select
                value={newAssignment.assignedToEmployeeId}
                onValueChange={(value) =>
                  setNewAssignment({
                    ...newAssignment,
                    assignedToEmployeeId: value,
                  })
                }
              >
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Due Date *
              </label>
              <Input
                type="date"
                value={newAssignment.dueDate}
                onChange={(e) =>
                  setNewAssignment({
                    ...newAssignment,
                    dueDate: e.target.value,
                  })
                }
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Ingredients (Optional)
              </label>
              <textarea
                placeholder="List ingredients (one per line)"
                value={newAssignment.ingredients}
                onChange={(e) =>
                  setNewAssignment({
                    ...newAssignment,
                    ingredients: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Instructions (Optional)
              </label>
              <textarea
                placeholder="Detailed prep instructions..."
                value={newAssignment.instructions}
                onChange={(e) =>
                  setNewAssignment({
                    ...newAssignment,
                    instructions: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                placeholder="Any additional notes or special requirements..."
                value={newAssignment.notes}
                onChange={(e) =>
                  setNewAssignment({ ...newAssignment, notes: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateAssignment(false)}
                className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateAssignment}
                disabled={isSubmitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Assignment
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
