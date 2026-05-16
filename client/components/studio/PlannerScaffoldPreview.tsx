import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PlannerScaffold } from "@/lib/planner-scaffold";
import type { PlannerStage } from "@/components/studio/PlannerStageTracker";

function formatCount(label: string, value: number) {
  return new Intl.NumberFormat().format(value) + label;
}

type PlannerScaffoldPreviewProps = {
  stage: PlannerStage;
  scaffold: PlannerScaffold | null;
  onIntegrate: () => void;
  integrating?: boolean;
};

export default function PlannerScaffoldPreview({
  stage,
  scaffold,
  onIntegrate,
  integrating = false,
}: PlannerScaffoldPreviewProps) {
  const files = scaffold?.files ?? [];
  const disabled = files.length === 0 || integrating;
  const buttonLabel =
    stage === "ready" ? "Reapply scaffold" : "Integrate scaffold";

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle>Scaffold preview</CardTitle>
        <CardDescription>
          Review the generated files before committing them to the repository.
          Each file is staged relative to the project root shown below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {scaffold ? (
          <>
            <div className="rounded-md border border-dashed border-border/60 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
              Project root:{" "}
              <code className="font-mono text-foreground">
                {scaffold.projectRoot}
              </code>
            </div>
            <div className="grid gap-3">
              {files.map((file) => {
                const isEntry = file.path === scaffold.entryPath;
                const charCount = formatCount(
                  " characters",
                  file.contents.length,
                );
                return (
                  <details
                    key={file.path}
                    className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm shadow-sm"
                  >
                    <summary className="flex cursor-pointer flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs text-foreground">
                          {file.path}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {file.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isEntry ? (
                          <Badge variant="default">Entry</Badge>
                        ) : null}
                        <span className="text-[11px] text-muted-foreground">
                          {charCount}
                        </span>
                      </div>
                    </summary>
                    <pre className="mt-3 max-h-64 overflow-auto rounded border bg-muted/15 p-3 text-[11px] leading-relaxed">
                      {file.contents}
                    </pre>
                  </details>
                );
              })}
            </div>
            <div className="flex justify-end">
              <Button
                onClick={onIntegrate}
                disabled={disabled}
                className="shadow-neon"
              >
                {integrating ? "Applying…" : buttonLabel}
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-md border border-dashed border-border/60 bg-muted/10 px-3 py-6 text-sm text-muted-foreground">
            Compile the planner script to generate a scaffold preview. The panel
            will outline every file before any write occurs.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
