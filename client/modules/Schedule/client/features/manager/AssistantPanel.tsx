import React from "react";
import { useEchoAI } from "../../hooks/useEchoAI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  Copy,
  Loader,
  PanelLeft,
  Printer,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  findReportMatch,
  REPORT_DESTINATION_LABELS,
  REPORT_STATUS_LABELS,
  type ReportDestination,
  type ScheduleReportItem,
} from "../../components/reports/ReportCatalog";

type EchoWorkspace = {
  title: string;
  summary: string;
  detail: string;
  mode: "report" | "answer";
  destination?: ReportDestination;
  status?: ScheduleReportItem["status"];
  sourceNeeds: string[];
  query: string;
};

function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function workspaceBars(workspace: EchoWorkspace | null) {
  if (!workspace) {
    return [
      { label: "Actionability", value: 0 },
      { label: "Source data needed", value: 0 },
      { label: "Ready to run", value: 0 },
    ];
  }

  const statusValue = workspace.status === "ready" ? 92 : workspace.status === "partial" ? 66 : 34;
  const sourceValue = workspace.sourceNeeds.length ? Math.min(90, 28 + workspace.sourceNeeds.length * 18) : 18;
  const readyValue = workspace.mode === "report" ? statusValue : 72;

  return [
    { label: "Actionability", value: workspace.mode === "report" ? statusValue : 76 },
    { label: "Source data needed", value: sourceValue },
    { label: "Ready to run", value: readyValue },
  ];
}

function WorkspaceCard({ workspace }: { workspace: EchoWorkspace }) {
  const bars = workspaceBars(workspace);

  return (
    <div className="space-y-4 rounded-3xl border bg-gradient-to-br from-muted/25 to-background p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <PanelLeft className="h-3.5 w-3.5" />
            Echo workspace
          </div>
          <h4 className="text-base font-semibold">{workspace.title}</h4>
          <p className="text-sm text-muted-foreground">{workspace.summary}</p>
        </div>
        <span className="rounded-full border px-3 py-1 text-[11px] font-medium text-muted-foreground">
          {workspace.mode === "report" && workspace.status
            ? REPORT_STATUS_LABELS[workspace.status]
            : "Echo response"}
        </span>
      </div>

      <div className="rounded-2xl border bg-background/80 p-3 text-sm text-muted-foreground">
        {workspace.detail}
      </div>

      {workspace.destination ? (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border px-3 py-1 text-muted-foreground">
            Destination: {REPORT_DESTINATION_LABELS[workspace.destination]}
          </span>
          <span className="rounded-full border px-3 py-1 text-muted-foreground">
            Query: {workspace.query}
          </span>
        </div>
      ) : null}

      {workspace.sourceNeeds.length ? (
        <div className="rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-50/90">
          <div className="font-medium text-amber-100">Source data needed</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {workspace.sourceNeeds.map((need) => (
              <li key={need}>{need}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-3">
        {bars.map((bar) => (
          <ProgressBar key={bar.label} label={bar.label} value={bar.value} />
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  text,
}: {
  role: "user" | "assistant";
  text: string;
}) {
  return (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-5 ${role === "user" ? "bg-primary text-primary-foreground" : "border bg-background text-foreground"}`}
      >
        {text}
      </div>
    </div>
  );
}

export default function AssistantPanel({
  employees,
}: {
  employees: Array<{ id: string; name: string; role?: string; shifts?: Record<string, unknown> }>;
}) {
  const { ask, loading, error, clear } = useEchoAI();
  const [isOpen, setIsOpen] = React.useState(false);
  const [prompt, setPrompt] = React.useState("");
  const [history, setHistory] = React.useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [workspace, setWorkspace] = React.useState<EchoWorkspace | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const employeeCount = employees.length;
  const signalSummary = React.useMemo(() => {
    const overtimeRisk = employees.filter((employee) => {
      const shifts = employee.shifts ? Object.values(employee.shifts) : [];
      return shifts.some(Boolean);
    }).length;

    return [
      { label: "Employees on file", value: employeeCount },
      { label: "Employees with shifts", value: overtimeRisk },
    ];
  }, [employeeCount, employees]);

  const copyWorkspace = async () => {
    if (!workspace) return;
    const text = [
      workspace.title,
      workspace.summary,
      workspace.detail,
      workspace.destination ? `Destination: ${REPORT_DESTINATION_LABELS[workspace.destination]}` : null,
      workspace.sourceNeeds.length ? `Source needs: ${workspace.sourceNeeds.join("; ")}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore clipboard failures
    }
  };

  const printWorkspace = () => {
    window.print();
  };

  const openSchedule = () => {
    window.dispatchEvent(new CustomEvent("shiftflow:open-schedule"));
  };

  const openReports = (query: string) => {
    window.dispatchEvent(
      new CustomEvent("shiftflow:open-reports", {
        detail: { query },
      }),
    );
  };

  const sendToWhiteboard = () => {
    if (!workspace) return;
    window.dispatchEvent(
      new CustomEvent("shiftflow:echo:whiteboard", {
        detail: workspace,
      }),
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim() || loading) return;

    const userMessage = prompt.trim();
    setPrompt("");
    setHistory((prev) => [...prev, { role: "user", text: userMessage }]);

    const reportMatch = findReportMatch(userMessage);
    if (reportMatch) {
      const nextWorkspace: EchoWorkspace = {
        title: reportMatch.title,
        summary: `${reportMatch.title} is routed to ${REPORT_DESTINATION_LABELS[reportMatch.destination]}.`,
        detail:
          reportMatch.status === "planned"
            ? "This report is modeled for implementation. Keep it in the build queue until the missing source data exists."
            : reportMatch.notes,
        mode: "report",
        destination: reportMatch.destination,
        status: reportMatch.status,
        sourceNeeds: reportMatch.sourceNeeds ?? [],
        query: userMessage,
      };

      setWorkspace(nextWorkspace);
      setHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Opening the schedule and routing to ${reportMatch.title}.`,
        },
      ]);
      openSchedule();
      openReports(userMessage);
      return;
    }

    const result = await ask(userMessage);
    if (result) {
      setHistory((prev) => [...prev, { role: "assistant", text: result.text }]);
      setWorkspace({
        title: "Echo response",
        summary: "AI response ready for review.",
        detail: result.text,
        mode: "answer",
        sourceNeeds: [],
        query: userMessage,
      });
    }
  };

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, workspace]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
        title="Open Echo workspace"
      >
        <Sparkles className="h-6 w-6" />
      </button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 flex h-[min(84vh,44rem)] w-[min(calc(100vw-2rem),58rem)] flex-col overflow-hidden border-border/60 bg-background/95 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            Echo workspace
          </div>
          <p className="text-xs text-muted-foreground">
            Chat, route reports, and stage outputs in one canvas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={printWorkspace} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button variant="ghost" size="sm" onClick={sendToWhiteboard} className="gap-2">
            <ArrowRight className="h-4 w-4" />
            Whiteboard
          </Button>
          <button
            onClick={() => {
              setIsOpen(false);
              clear();
              setHistory([]);
              setWorkspace(null);
            }}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close Echo workspace"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <div className="grid gap-2 sm:grid-cols-2">
            {signalSummary.map((signal) => (
              <div key={signal.label} className="rounded-2xl border bg-muted/20 px-3 py-2 text-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {signal.label}
                </div>
                <div className="font-semibold">{signal.value}</div>
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-auto rounded-3xl border p-4">
            {workspace ? (
              <WorkspaceCard workspace={workspace} />
            ) : (
              <div className="flex h-full min-h-[260px] items-center justify-center rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Ask Echo to open a report, analyze labor, or stage a schedule output.
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={openSchedule}>
              Open schedule
            </Button>
            <Button variant="outline" onClick={() => openReports(prompt || workspace?.query || "") }>
              Open reports
            </Button>
            <Button variant="outline" onClick={copyWorkspace} disabled={!workspace} className="gap-2">
              <Copy className="h-4 w-4" />
              Copy canvas
            </Button>
            <Button variant="outline" onClick={() => setWorkspace(null)}>
              Clear canvas
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-3xl border bg-background/80">
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-auto p-4">
            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                Try: “run an approaching overtime report”, “open shifts”, or “labor vs contribution”.
              </div>
            ) : (
              history.map((message, index) => <MessageBubble key={index} role={message.role} text={message.text} />)
            )}
            {loading ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border bg-background px-3 py-2 text-sm">
                  <Loader className="h-4 w-4 animate-spin" />
                  Thinking…
                </div>
              </div>
            ) : null}
            {error ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="border-t p-3">
            <div className="flex gap-2">
              <Input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ask Echo..."
                disabled={loading}
                className="text-sm"
              />
              <Button type="submit" size="icon" disabled={loading || !prompt.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Card>
  );
}
