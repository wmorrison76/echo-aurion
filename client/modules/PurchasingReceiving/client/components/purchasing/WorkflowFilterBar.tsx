import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
export type WorkflowKey = "po" | "vendor" | "inventory" | "directory";
export type WorkflowOption = {
  key: WorkflowKey;
  label: string;
  description: string;
};
export interface WorkflowFilterBarProps {
  workflow: WorkflowKey;
  workflows: WorkflowOption[];
  onWorkflowChange: (next: WorkflowKey) => void;
  selectedGL: string;
  selectedGLLabel: string;
  glOptions: { code: string; name: string }[];
  onGLChange: (value: string) => void;
  vendorOptions: string[];
  vendor: string;
  onVendorChange: (value: string) => void;
  outlet: string;
  onOutletChange: (value: string) => void;
  expected: string;
  onExpectedChange: (value: string) => void;
}
function formatEta(value: string) {
  if (!value) return "Set ETA";
  try {
    const parsed = parseISO(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return format(parsed, "MMM d");
  } catch {
    return value;
  }
}
export function WorkflowFilterBar({
  workflow,
  workflows,
  onWorkflowChange,
  selectedGL,
  selectedGLLabel,
  glOptions,
  onGLChange,
  vendorOptions,
  vendor,
  onVendorChange,
  outlet,
  onOutletChange,
  expected,
  onExpectedChange,
}: WorkflowFilterBarProps) {
  const activeWorkflow = workflows.find((option) => option.key === workflow);
  const summary = [
    {
      id: "category",
      label: "Category",
      value: selectedGLLabel || "All categories",
    },
    { id: "vendor", label: "Vendor", value: vendor || "Select vendor" },
    { id: "outlet", label: "Outlet", value: outlet || "Set outlet" },
    { id: "eta", label: "Eta", value: formatEta(expected) },
  ];
  return (
    <section className="rounded-2xl border border-slate-800/70 bg-card px-4 py-3 shadow-[0_18px_42px_-24px_rgba(45,160,240,0.45)]">
      {" "}
      <div className="flex flex-col gap-3">
        {" "}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {" "}
          <div className="flex flex-col gap-2">
            {" "}
            <div className="flex flex-wrap items-center gap-2">
              {" "}
              <span className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-400">
                {" "}
                Workflow{" "}
              </span>{" "}
              <div className="flex flex-wrap items-center gap-1 rounded-full border border-border bg-surface p-1">
                {" "}
                {workflows.map((option) => {
                  const isActive = option.key === workflow;
                  return (
                    <Button
                      key={option.key}
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onWorkflowChange(option.key)}
                      className={cn(
                        "rounded-full px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] transition",
                        isActive
                          ? "bg-gradient-to-r from-sky-500 via-indigo-500 to-blue-600 text-slate-950 shadow-[0_12px_32px_-20px_rgba(56,189,248,0.8)]"
                          : "text-slate-300 hover:bg-slate-800/80 hover:text-white",
                      )}
                    >
                      {" "}
                      {option.label}{" "}
                    </Button>
                  );
                })}{" "}
              </div>{" "}
            </div>{" "}
            {activeWorkflow ? (
              <p className="max-w-2xl text-xs text-slate-400">
                {" "}
                {activeWorkflow.description}{" "}
              </p>
            ) : null}{" "}
          </div>{" "}
          <div className="flex flex-wrap items-center gap-2">
            {" "}
            {summary.map((item) => (
              <Badge
                key={item.id}
                variant="outline"
                className="flex max-w-[12rem] items-center gap-2 overflow-hidden rounded-full border-border bg-surface px-3 py-1 text-[0.6rem] uppercase tracking-[0.28em] text-slate-300"
              >
                {" "}
                <span className="text-slate-400 dark:text-muted-foreground">
                  {" "}
                  {item.label}{" "}
                </span>{" "}
                <span className="min-w-0 truncate text-slate-100">
                  {" "}
                  {item.value}{" "}
                </span>{" "}
              </Badge>
            ))}{" "}
          </div>{" "}
        </div>{" "}
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          {" "}
          <label htmlFor="po-gl-filter" className="flex flex-col gap-1">
            {" "}
            <span className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">
              {" "}
              Category (Name + GL Code){" "}
            </span>{" "}
            <select
              id="po-gl-filter"
              value={selectedGL}
              onChange={(event) => onGLChange(event.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
            >
              {" "}
              <option value="all">All categories</option>{" "}
              {glOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {" "}
                  {option.name} ({option.code}){" "}
                </option>
              ))}{" "}
            </select>{" "}
          </label>{" "}
          <label htmlFor="po-vendor" className="flex flex-col gap-1">
            {" "}
            <span className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">
              {" "}
              Vendor{" "}
            </span>{" "}
            <select
              id="po-vendor"
              value={vendor}
              onChange={(event) => onVendorChange(event.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
            >
              {" "}
              {vendorOptions.map((name) => (
                <option key={name} value={name}>
                  {" "}
                  {name}{" "}
                </option>
              ))}{" "}
            </select>{" "}
          </label>{" "}
          <label htmlFor="po-outlet" className="flex flex-col gap-1">
            {" "}
            <span className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">
              {" "}
              Outlet{" "}
            </span>{" "}
            <Input
              id="po-outlet"
              value={outlet}
              onChange={(event) => onOutletChange(event.target.value)}
              className="h-9 rounded-lg border border-border bg-surface text-sm text-slate-100 focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500/40"
            />{" "}
          </label>{" "}
          <label htmlFor="po-expected" className="flex flex-col gap-1">
            {" "}
            <span className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">
              {" "}
              Expected{" "}
            </span>{" "}
            <Input
              id="po-expected"
              type="date"
              value={expected}
              onChange={(event) => onExpectedChange(event.target.value)}
              className="h-9 rounded-lg border border-border bg-surface text-sm text-slate-100 focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500/40"
            />{" "}
          </label>{" "}
        </div>{" "}
      </div>{" "}
    </section>
  );
}
