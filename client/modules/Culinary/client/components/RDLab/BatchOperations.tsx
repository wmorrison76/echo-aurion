import { useState } from "react";
import { useRDLabStore } from "@/stores/rdLabStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Trash2, Tag, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function BatchOperations() {
  const {
    selectedExperimentIds,
    experiments,
    bulkSetStatus,
    bulkAddTag,
    clearExperimentSelection,
  } = useRDLabStore();

  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [newTag, setNewTag] = useState("");

  const selectedCount = selectedExperimentIds.size;
  const selectedExperiments = experiments.filter((e) =>
    selectedExperimentIds.has(e.id),
  );

  if (selectedCount === 0) {
    return null;
  }

  const handleBulkStatus = (
    status: "ideation" | "testing" | "ready" | "archived",
  ) => {
    bulkSetStatus(Array.from(selectedExperimentIds), status);
    toast.success(
      `Updated ${selectedCount} experiment${selectedCount !== 1 ? "s" : ""} to ${status}`,
    );
    setShowStatusMenu(false);
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    bulkAddTag(Array.from(selectedExperimentIds), newTag);
    toast.success(
      `Added tag "${newTag}" to ${selectedCount} experiment${selectedCount !== 1 ? "s" : ""}`,
    );
    setNewTag("");
  };

  return (
    <Card className="border-[#c8a97e]/50 bg-amber-50/50 dark:border-[#c8a97e]/50 dark:bg-neutral-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Batch Operations
        </CardTitle>
        <CardDescription>
          {selectedCount} experiment{selectedCount !== 1 ? "s" : ""} selected
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Selected List */}
        <div className="rounded-lg border border-white/20 bg-white/10 dark:border-[#c8a97e]/15 dark:bg-white/5 p-3 max-h-32 overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            Selected:
          </p>
          <div className="space-y-1">
            {selectedExperiments.map((exp) => (
              <p key={exp.id} className="text-xs text-foreground">
                • {exp.title}
              </p>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Status Button */}
          <div className="relative">
            <Button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              variant="outline"
              className="w-full justify-start"
              size="sm"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Change Status
            </Button>

            {showStatusMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 z-10 rounded-lg border bg-background shadow-lg space-y-1 p-1">
                {["ideation", "testing", "ready", "archived"].map((status) => (
                  <Button
                    key={status}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs capitalize"
                    onClick={() => handleBulkStatus(status as any)}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Add Tag */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddTag();
                }
              }}
              className="flex-1 px-2 py-1 text-xs border rounded-md bg-background"
            />
            <Button
              onClick={handleAddTag}
              disabled={!newTag.trim()}
              variant="outline"
              size="sm"
              className="px-2"
            >
              <Tag className="h-4 w-4" />
            </Button>
          </div>

          {/* Clear Selection */}
          <Button
            onClick={clearExperimentSelection}
            variant="ghost"
            size="sm"
            className="w-full gap-2 text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Clear Selection
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs border-t pt-3">
          <div className="space-y-1">
            <p className="text-muted-foreground">Specializations</p>
            <div className="flex flex-wrap gap-1">
              {[
                ...new Set(selectedExperiments.map((e) => e.specialization)),
              ].map((spec) => (
                <Badge key={spec} variant="secondary" className="text-xs">
                  {spec}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Statuses</p>
            <div className="flex flex-wrap gap-1">
              {[...new Set(selectedExperiments.map((e) => e.status))].map(
                (status) => (
                  <Badge
                    key={status}
                    variant="secondary"
                    className="text-xs capitalize"
                  >
                    {status}
                  </Badge>
                ),
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
