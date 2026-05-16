import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Lightbulb, Wand2 } from "lucide-react";
export interface AssistantSuggestion {
  id: string;
  title: string;
  description: string;
  action?: () => void;
}
export default function AssistantPanel({
  objects,
  onAction,
}: {
  objects: { type: string }[];
  onAction: (key: string) => void;
}) {
  const suggestions = useMemo<AssistantSuggestion[]>(() => {
    const arr: AssistantSuggestion[] = [];
    const hasFloor = objects.some((o) => o.type === "floor");
    if (!hasFloor) {
      arr.push({
        id: "import-floor",
        title: "Import a floor plan",
        description:
          "Start with a real floor or PDF export for accurate scaling.",
      });
    }
    if (objects.length < 3) {
      arr.push({
        id: "add-seed",
        title: "Populate scene",
        description: "Add a few primitives to explore controls and layout.",
      });
    }
    arr.push({
      id: "toggle-grid",
      title: "Toggle grid",
      description: "Switch the ground grid to preview a clean render.",
    });
    return arr;
  }, [objects]);
  return (
    <div>
      {" "}
      <div className="flex items-center gap-2 text-sm font-semibold">
        {" "}
        <Lightbulb className="h-4 w-4" /> Smart Suggestions{" "}
      </div>{" "}
      <Separator className="my-2" />{" "}
      <div className="space-y-2">
        {" "}
        {suggestions.map((s) => (
          <div
            key={s.id}
            className="rounded-lg border border-border/60 p-3 bg-background/70"
          >
            {" "}
            <div className="text-sm font-medium">{s.title}</div>{" "}
            <div className="text-xs text-muted-foreground mb-2">
              {s.description}
            </div>{" "}
            <Button size="sm" variant="outline" onClick={() => onAction(s.id)}>
              {" "}
              <Wand2 className="h-4 w-4 mr-1" /> Apply{" "}
            </Button>{" "}
          </div>
        ))}{" "}
      </div>{" "}
    </div>
  );
}
