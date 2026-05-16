import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChefHat, Factory, Users, Sparkles, ChevronDown } from "lucide-react";
import {
  type RecipeTrack,
  useRecipeTrack,
  getTrackDescription,
} from "@/hooks/use-recipe-track";

interface TrackSelectorProps {
  chefId: string;
  onTrackChange?: (track: RecipeTrack) => void;
}

export function TrackSelector({ chefId, onTrackChange }: TrackSelectorProps) {
  const {
    track,
    showAdvanced,
    collaborators,
    isLoading,
    switchTrack,
    toggleAdvanced,
    addCollaborator,
    removeCollaborator,
  } = useRecipeTrack(chefId);

  const [showCollaborators, setShowCollaborators] = useState(false);
  const [newCollaborator, setNewCollaborator] = useState("");

  const handleTrackChange = (newTrack: string) => {
    const selectedTrack = newTrack as RecipeTrack;
    switchTrack(selectedTrack);
    onTrackChange?.(selectedTrack);
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Track Selection */}
      <div>
        <label className="text-xs font-semibold text-foreground dark:text-[#c8a97e] mb-2 block">
          R&D Track
        </label>
        <Select value={track} onValueChange={handleTrackChange}>
          <SelectTrigger className="w-full h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fine-dining">
              <div className="flex items-center gap-2">
                <ChefHat className="h-4 w-4 text-[#c8a97e]" />
                Fine Dining
              </div>
            </SelectItem>
            {showAdvanced && (
              <SelectItem value="manufacturing">
                <div className="flex items-center gap-2">
                  <Factory className="h-4 w-4 text-amber-500" />
                  Manufacturing
                </div>
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Track Badge */}
      <div className="flex items-center justify-between gap-2">
        <Badge
          variant="outline"
          className={`text-xs py-1 ${
            track === "fine-dining"
              ? "bg-white/80 dark:bg-[#c8a97e]/15 text-[#b8976c] dark:text-[#c8a97e] border-[#c8a97e] dark:border-[#c8a97e]/30"
              : "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40"
          }`}
        >
          {track === "fine-dining" ? (
            <>
              <Sparkles className="h-3 w-3 mr-1" />
              Premium
            </>
          ) : (
            <>
              <Factory className="h-3 w-3 mr-1" />
              Industrial
            </>
          )}
        </Badge>

        {/* Advanced Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleAdvanced}
          className="h-8 px-2 text-xs gap-1"
        >
          <ChevronDown
            className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
          />
          {showAdvanced ? "Less" : "More"}
        </Button>
      </div>

      {/* Track Description */}
      <p className="text-xs text-muted-foreground dark:text-slate-400 leading-tight">
        {getTrackDescription(track)}
      </p>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="space-y-3 pt-2 border-t border-accent/20 dark:border-[#c8a97e]/15">
          {/* Collaborators */}
          <div>
            <div className="flex items-center gap-1 mb-2">
              <Users className="h-3 w-3 text-[#c8a97e]" />
              <h3 className="text-xs font-semibold text-foreground dark:text-white">
                Team ({collaborators.length})
              </h3>
            </div>

            {collaborators.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {collaborators.slice(0, 2).map((collaboratorId) => (
                  <Badge
                    key={collaboratorId}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:opacity-75"
                    onClick={() => removeCollaborator(collaboratorId)}
                  >
                    {collaboratorId.slice(0, 8)}...
                    <span className="ml-1">×</span>
                  </Badge>
                ))}
                {collaborators.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{collaborators.length - 2}
                  </Badge>
                )}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCollaborators(!showCollaborators)}
              className="w-full h-8 text-xs"
            >
              {showCollaborators ? "Done" : "Add Chef"}
            </Button>

            {showCollaborators && (
              <div className="flex gap-1 mt-2">
                <input
                  type="text"
                  placeholder="Email"
                  value={newCollaborator}
                  onChange={(e) => setNewCollaborator(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs rounded border border-accent/20 dark:border-[#c8a97e]/15 bg-background dark:bg-slate-950"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newCollaborator.trim()) {
                      addCollaborator(newCollaborator.trim());
                      setNewCollaborator("");
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => {
                    if (newCollaborator.trim()) {
                      addCollaborator(newCollaborator.trim());
                      setNewCollaborator("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            )}
          </div>

          {/* Manufacturing Learning Tip */}
          {track === "manufacturing" && (
            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                💡 Learn precision techniques from fine dining innovations
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
