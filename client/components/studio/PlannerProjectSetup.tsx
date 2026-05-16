import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlannerStage } from "@/components/studio/PlannerStageTracker";

type PlannerProjectSetupProps = {
  stage: PlannerStage;
  projectName: string;
  projectSlug: string;
  projectRoot: string;
  onProjectNameChange: (value: string) => void;
  onProjectSlugChange: (value: string) => void;
  onSubmit: () => void;
  busy?: boolean;
};

export default function PlannerProjectSetup({
  stage,
  projectName,
  projectSlug,
  projectRoot,
  onProjectNameChange,
  onProjectSlugChange,
  onSubmit,
  busy = false,
}: PlannerProjectSetupProps) {
  const stageLabel = useMemo(() => {
    if (stage === "setup") return "Step 1 of 4";
    if (stage === "plan") return "Project ready for planning";
    if (stage === "scaffold") return "Scaffold awaiting integration";
    return "Scaffold applied";
  }, [stage]);

  const buttonLabel =
    stage === "setup" ? "Continue to planner" : "Update project details";
  const disableSubmit = busy || !projectName.trim();

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {stageLabel}
        </div>
        <CardTitle>Project identity</CardTitle>
        <CardDescription>
          Establish how LUCCCA should reference this workspace. The slug
          controls folder paths and manifest IDs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (disableSubmit) return;
            onSubmit();
          }}
        >
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
            <label className="space-y-1 text-sm font-medium text-foreground">
              <span>Project name</span>
              <Input
                value={projectName}
                onChange={(event) => onProjectNameChange(event.target.value)}
                placeholder="Hospitality Concierge Suite"
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground">
              <span>Project slug</span>
              <Input
                value={projectSlug}
                onChange={(event) => onProjectSlugChange(event.target.value)}
                placeholder="hospitality-concierge"
              />
            </label>
          </div>
          <p className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Files will be staged under{" "}
            <code className="font-mono text-foreground">{projectRoot}</code>
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button
              type="submit"
              disabled={disableSubmit}
              className="shadow-neon"
            >
              {buttonLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
