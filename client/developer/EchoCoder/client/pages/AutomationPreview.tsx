import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  automationTasksQueryKey,
  fetchAutomationTasks,
  type AutomationTask,
  type AutomationTaskStatus,
} from "@/lib/automation";
import { cn } from "@/lib/utils";

function formatDate(value?: string) {
  if (!value) return "Pending";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function getFriendlyStatus(status: AutomationTaskStatus) {
  switch (status) {
    case "placeholder":
      return "Awaiting EchoCoder run";
    case "running":
      return "In progress";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed – needs attention";
    default:
      return "Queued";
  }
}

export default function AutomationPreview() {
  const { slug } = useParams<{ slug: string }>();

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

  const task = useMemo(() => tasks.find((item) => item.slug === slug), [tasks, slug]);
  const isRefreshing = isFetching && !isLoading;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container flex min-h-[50vh] items-center justify-center">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading automation entry…
          </span>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container py-10 space-y-6">
          <Alert variant="destructive">
            <AlertTitle>Failed to load automation entry</AlertTitle>
            <AlertDescription>{error?.message ?? "An unexpected error occurred."}</AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => refetch()} disabled={isRefreshing}>
              {isRefreshing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Retrying…
                </span>
              ) : (
                "Retry"
              )}
            </Button>
            <Link to="/generated" className={buttonVariants({ variant: "secondary" })}>
              Back to automation queue
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!task) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container py-10 space-y-6">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Placeholder not found</h1>
            <p className="text-muted-foreground">
              No automation entry matched the requested slug. Refresh the automation queue and try again.
            </p>
          </header>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => refetch()} disabled={isRefreshing}>
              {isRefreshing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Refreshing…
                </span>
              ) : (
                "Refresh data"
              )}
            </Button>
            <Link to="/generated" className={buttonVariants({ variant: "secondary" })}>
              Back to automation queue
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const friendlyStatus = getFriendlyStatus(task.status);

  return (
    <main className="min-h-screen bg-background">
      <div className="container py-10 space-y-8">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{task.title}</h1>
            <Badge variant={task.status === "completed" ? "default" : "secondary"}>{friendlyStatus}</Badge>
          </div>
          <p className="text-muted-foreground">
            Routed placeholder for EchoCoder automation. Use this page to confirm input data, stakeholders, and
            downstream actions before executing the run.
          </p>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>
              Created: <span className="font-medium text-foreground">{formatDate(task.createdAt)}</span>
            </span>
            <span>
              Updated: <span className="font-medium text-foreground">{formatDate(task.updatedAt)}</span>
            </span>
            <span>
              Route: <span className="font-mono text-foreground">{task.route}</span>
            </span>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Scope outline</CardTitle>
              <CardDescription>
                Parsed from the submitted task list. Edit the automation file if you need to adjust the placeholder
                before running EchoCoder.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.description ? (
                <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-4 text-sm leading-relaxed text-foreground">
                  {task.description}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No description was provided in the original task card. Supply one before launching the automation run.
                </p>
              )}
              <Separator />
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">Execution checklist:</strong>
                </p>
                <ol className="list-decimal space-y-1 pl-5">
                  <li>Queue Task Cards 1–10 inside EchoCoder sequentially.</li>
                  <li>
                    After each card, run validation (
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">pnpm test</code>
                    {" + "}
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">pnpm typecheck</code>
                    ).
                  </li>
                  <li>Kick automated Netlify preview on success.</li>
                  <li>Record status updates back into this placeholder via the automation runner.</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card className="h-max">
            <CardHeader>
              <CardTitle>Next steps</CardTitle>
              <CardDescription>Automation pipeline guidance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">1. Prepare credentials</p>
                <p>Ensure LUCCCA JWT + Builder keys are loaded before execution.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">2. Launch automation runner</p>
                <p>
                  Use <code className="rounded bg-muted px-1.5 py-0.5 text-xs">pnpm automation:run</code> with this task list to seed EchoCoder.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">3. Monitor pipeline</p>
                <p>
                  Watch ZARO logs for retries. The automation route will return JSON status that can be polled for dashboards.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">4. Update status</p>
                <p>Trigger the automation runner again with the same slug to mark it completed when code is merged.</p>
              </div>
            </CardContent>
            <CardContent>
              <Link to="/generated" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                Back to automation queue
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
