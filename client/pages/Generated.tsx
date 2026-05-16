import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { automationTasksQueryKey, fetchAutomationTasks, type AutomationTask } from "@/lib/automation";
import { cn } from "@/lib/utils";

export default function GeneratedAutomationIndex() {
  const {
    data: tasks = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery<AutomationTask[], Error>({
    queryKey: automationTasksQueryKey,
    queryFn: ({ signal }) => fetchAutomationTasks({ signal }),
    staleTime: 30_000,
  });

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aTime = a.updatedAt || a.createdAt || "";
      const bTime = b.updatedAt || b.createdAt || "";
      return bTime.localeCompare(aTime);
    });
  }, [tasks]);

  const isRefreshing = isFetching && !isLoading;

  return (
    <main className="min-h-screen bg-background">
      <div className="container py-10 space-y-6">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">Automation Queue</h1>
              <p className="text-muted-foreground">
                Generated placeholder briefs for EchoCoder runs. Each entry links to a routed stub page for
                reviewing scope, assets, and status prior to execution.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="uppercase tracking-wide text-xs">
                {tasks.length} tasks
              </Badge>
              <Button
                type="button"
                variant="outline"
                onClick={() => refetch()}
                disabled={isRefreshing}
                className="min-w-[120px]"
              >
                {isRefreshing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Refreshing
                  </span>
                ) : (
                  "Refresh"
                )}
              </Button>
            </div>
          </div>
        </header>

        {isError ? (
          <Alert variant="destructive">
            <AlertTitle>Failed to load automation queue</AlertTitle>
            <AlertDescription>{error?.message ?? "An unexpected error occurred."}</AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Loading automation queue…
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Drop a task list into the automation runner to populate placeholder pages.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {sortedTasks.map((task) => (
              <Card key={task.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-lg font-semibold leading-tight">{task.title}</CardTitle>
                    <Badge variant={task.status === "completed" ? "default" : "secondary"}>{task.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {task.createdAt ? new Date(task.createdAt).toLocaleString() : "Pending timestamp"}
                  </p>
                </CardHeader>
                <CardContent className="flex-1 space-y-3 text-sm text-muted-foreground">
                  {task.description ? (
                    <p className="whitespace-pre-line leading-relaxed">{task.description}</p>
                  ) : (
                    <p>No description provided. Placeholder awaiting EchoCoder scaffolding.</p>
                  )}
                  <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                    Route: <span className="font-mono text-foreground">{task.route}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Link
                    to={task.route}
                    className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                  >
                    View placeholder
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
