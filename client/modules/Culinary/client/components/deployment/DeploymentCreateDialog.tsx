import { useState } from "react";
import { useRecipeDeployment } from "@/hooks/use-recipe-deployment";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DeploymentCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Mock outlets - in real app, this would come from API
const MOCK_OUTLETS = [
  { id: "outlet-1", name: "Downtown Location" },
  { id: "outlet-2", name: "Airport Terminal" },
  { id: "outlet-3", name: "Mall Food Court" },
  { id: "outlet-4", name: "Corporate Office" },
];

// Mock recipes - in real app, this would come from API
const MOCK_RECIPES = [
  { id: "recipe-1", name: "Classic Burger" },
  { id: "recipe-2", name: "Caesar Salad" },
  { id: "recipe-3", name: "Grilled Chicken" },
  { id: "recipe-4", name: "Pasta Carbonara" },
];

export default function DeploymentCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: DeploymentCreateDialogProps) {
  const [deploymentName, setDeploymentName] = useState("");
  const [description, setDescription] = useState("");
  const [deploymentType, setDeploymentType] = useState<
    "recipe_update" | "menu_rollout" | "procedure_update"
  >("recipe_update");
  const [priority, setPriority] = useState<
    "critical" | "high" | "normal" | "low"
  >("normal");
  const [selectedOutlets, setSelectedOutlets] = useState<string[]>([]);
  const [allOutlets, setAllOutlets] = useState(false);
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);
  const [requiresConfirmation, setRequiresConfirmation] = useState(true);
  const [scheduleDeployment, setScheduleDeployment] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [confirmationDeadline, setConfirmationDeadline] = useState("");
  const [loading, setLoading] = useState(false);

  const { createDeployment } = useRecipeDeployment();

  const handleOutletToggle = (outletId: string) => {
    setSelectedOutlets((prev) =>
      prev.includes(outletId)
        ? prev.filter((id) => id !== outletId)
        : [...prev, outletId],
    );
  };

  const handleRecipeToggle = (recipeId: string) => {
    setSelectedRecipes((prev) =>
      prev.includes(recipeId)
        ? prev.filter((id) => id !== recipeId)
        : [...prev, recipeId],
    );
  };

  const handleSubmit = async () => {
    if (!deploymentName.trim()) {
      alert("Deployment name is required");
      return;
    }

    if (!allOutlets && selectedOutlets.length === 0) {
      alert("Please select at least one outlet or enable 'All Outlets'");
      return;
    }

    if (selectedRecipes.length === 0) {
      alert("Please select at least one recipe");
      return;
    }

    setLoading(true);
    try {
      const packets = selectedRecipes.map((recipeId) => {
        const recipe = MOCK_RECIPES.find((r) => r.id === recipeId);
        return {
          recipe_id: recipeId,
          recipe_name: recipe?.name || "Unknown Recipe",
          packet_data: {
            id: recipeId,
            name: recipe?.name || "Unknown Recipe",
            version: Date.now(),
            updated_at: new Date().toISOString(),
          },
          changes_summary: {
            updated_fields: ["ingredients", "instructions", "cooking_time"],
          },
        };
      });

      const scheduledAt = scheduleDeployment
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : undefined;

      await createDeployment(
        deploymentName,
        description || undefined,
        allOutlets ? MOCK_OUTLETS.map((o) => o.id) : selectedOutlets,
        [],
        allOutlets,
        deploymentType,
        priority,
        packets,
        scheduledAt,
        confirmationDeadline
          ? new Date(confirmationDeadline).toISOString()
          : undefined,
        true,
        undefined,
      );

      // Reset form
      setDeploymentName("");
      setDescription("");
      setDeploymentType("recipe_update");
      setPriority("normal");
      setSelectedOutlets([]);
      setAllOutlets(false);
      setSelectedRecipes([]);
      setScheduleDeployment(false);
      setScheduledDate("");
      setScheduledTime("");
      setConfirmationDeadline("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Failed to create deployment:", error);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    deploymentName.trim() &&
    (allOutlets || selectedOutlets.length > 0) &&
    selectedRecipes.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Deployment</DialogTitle>
          <DialogDescription>
            Set up a new recipe deployment across your stores
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="outlets">Outlets</TabsTrigger>
            <TabsTrigger value="recipes">Recipes</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deployment-name">Deployment Name *</Label>
                <Input
                  id="deployment-name"
                  placeholder="e.g., Spring Menu Update 2024"
                  value={deploymentName}
                  onChange={(e) => setDeploymentName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what's being updated in this deployment"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="deployment-type">Deployment Type *</Label>
                  <Select
                    value={deploymentType}
                    onValueChange={(v: any) => setDeploymentType(v)}
                  >
                    <SelectTrigger id="deployment-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recipe_update">
                        Recipe Update
                      </SelectItem>
                      <SelectItem value="menu_rollout">Menu Rollout</SelectItem>
                      <SelectItem value="procedure_update">
                        Procedure Update
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={(v: any) => setPriority(v)}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="schedule"
                    checked={scheduleDeployment}
                    onCheckedChange={(checked) =>
                      setScheduleDeployment(checked as boolean)
                    }
                  />
                  <Label htmlFor="schedule" className="cursor-pointer">
                    Schedule Deployment
                  </Label>
                </div>

                {scheduleDeployment && (
                  <div className="grid gap-4 sm:grid-cols-2 pl-6">
                    <div className="space-y-2">
                      <Label htmlFor="scheduled-date">Date</Label>
                      <Input
                        id="scheduled-date"
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scheduled-time">Time</Label>
                      <Input
                        id="scheduled-time"
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="requires-confirmation"
                    checked={requiresConfirmation}
                    onCheckedChange={(checked) =>
                      setRequiresConfirmation(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="requires-confirmation"
                    className="cursor-pointer"
                  >
                    Require Store Confirmation
                  </Label>
                </div>

                {requiresConfirmation && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="confirmation-deadline">
                      Confirmation Deadline
                    </Label>
                    <Input
                      id="confirmation-deadline"
                      type="datetime-local"
                      value={confirmationDeadline}
                      onChange={(e) => setConfirmationDeadline(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="outlets" className="space-y-4">
            <div className="flex items-center gap-2 pb-4">
              <Checkbox
                id="all-outlets"
                checked={allOutlets}
                onCheckedChange={(checked) => {
                  setAllOutlets(checked as boolean);
                  if (!checked) setSelectedOutlets([]);
                }}
              />
              <Label
                htmlFor="all-outlets"
                className="cursor-pointer font-semibold"
              >
                Deploy to All Outlets
              </Label>
            </div>

            {!allOutlets && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Select outlets ({selectedOutlets.length} selected)
                </p>
                <div className="grid gap-2">
                  {MOCK_OUTLETS.map((outlet) => (
                    <div key={outlet.id} className="flex items-center gap-2">
                      <Checkbox
                        id={outlet.id}
                        checked={selectedOutlets.includes(outlet.id)}
                        onCheckedChange={() => handleOutletToggle(outlet.id)}
                      />
                      <Label
                        htmlFor={outlet.id}
                        className="cursor-pointer font-normal"
                      >
                        {outlet.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allOutlets && (
              <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                <CardContent className="pt-6">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    This deployment will be sent to all {MOCK_OUTLETS.length}{" "}
                    outlets
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="recipes" className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Select recipes ({selectedRecipes.length} selected)
              </p>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Only selected recipes will be included in this deployment
                </AlertDescription>
              </Alert>
            </div>

            <div className="grid gap-2">
              {MOCK_RECIPES.map((recipe) => (
                <div key={recipe.id} className="flex items-center gap-2">
                  <Checkbox
                    id={recipe.id}
                    checked={selectedRecipes.includes(recipe.id)}
                    onCheckedChange={() => handleRecipeToggle(recipe.id)}
                  />
                  <Label
                    htmlFor={recipe.id}
                    className="cursor-pointer font-normal"
                  >
                    {recipe.name}
                  </Label>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isFormValid || loading}>
            {loading ? "Creating..." : "Create Deployment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
