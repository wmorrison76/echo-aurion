import React, { useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  TrendingUp,
  TrendingDown,
  AlertOctagon,
} from "lucide-react";
import { PageLayout } from "../components/layout/PageLayout";
import { Button } from "../components/ui/button";
import { useToast } from "../hooks/use-toast";
import { cn } from "../lib/utils";
import { SessionRequiredNotice } from "../modules/auth";
import { useConsoleOverview } from "../modules/console";
export default function Dashboard() {
  const { status, data } = useConsoleOverview();
  const { toast } = useToast();
  if (status === "loading") {
    return (
      <PageLayout>
        {" "}
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          {" "}
          <div className="animate-pulse space-y-8">
            {" "}
            <div className="h-20 bg-surface-variant/30 rounded-lg" />{" "}
            <div className="grid gap-4 lg:grid-cols-4">
              {" "}
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-surface-variant/30 rounded-lg"
                />
              ))}{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </PageLayout>
    );
  }
  if (status === "unauthenticated") {
    return (
      <PageLayout>
        {" "}
        <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
          {" "}
          <SessionRequiredNotice description="Authenticate to access your financial dashboard." />{" "}
        </div>{" "}
      </PageLayout>
    );
  }
  if (status === "error" || !data) {
    return (
      <PageLayout>
        {" "}
        <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
          {" "}
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6">
            {" "}
            <p className="text-sm text-red-700 dark:text-red-200">
              {" "}
              Unable to load dashboard. Please try again.{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
      </PageLayout>
    );
  }
  return (
    <PageLayout>
      {" "}
      <div className="mr-auto ml-10 max-w-7xl overflow-hidden px-6 py-8 sm:px-10">
        {" "}
        <DashboardContent data={data} />{" "}
      </div>{" "}
    </PageLayout>
  );
}
function DashboardContent({ data }: { data: any }) {
  // Extract actionable alerts const alerts = useMemo(() => { const items: Array<{ type:"warning" |"error" |"success" |"info"; title: string; description: string; action?: { label: string; href: string }; }> = []; // Example alerts - would be driven by real data items.push({ type:"warning", title:"5 Invoices Awaiting Approval", description:"Oldest invoice waiting 2 days", action: { label:"Review Now", href:"/ap" }, }); items.push({ type:"info", title:"Bank Statement Pending", description:"January statement ready for reconciliation", action: { label:"Start Reconciliation", href:"/audit/reconciliation" }, }); return items; }, []); return ( <div className="space-y-8"> {/* Welcome Header */} <div className="space-y-2"> <h1 className="text-3xl font-bold text-foreground"> Financial Dashboard </h1> <p className="text-muted-foreground"> At-a-glance view of your financial position and immediate action items </p> </div> {/* Critical Alerts */} {alerts.length > 0 && ( <section className="space-y-3"> {alerts.map((alert, i) => ( <div key={i} className={cn("rounded-lg border p-4 flex items-start justify-between gap-4", alert.type ==="error" ?"border-red-500/30 bg-red-500/10" : alert.type ==="warning" ?"border-amber-500/30 bg-amber-500/10" : alert.type ==="success" ?"border-emerald-500/30 bg-emerald-500/10" :"border-blue-500/30 bg-primary/10", )} > <div className="flex items-start gap-3 flex-1"> {alert.type ==="error" && ( <AlertOctagon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" /> )} {alert.type ==="warning" && ( <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" /> )} {alert.type ==="success" && ( <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" /> )} {alert.type ==="info" && ( <Clock3 className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" /> )} <div> <p className="font-semibold text-foreground text-sm"> {alert.title} </p> <p className="text-xs text-muted-foreground mt-1"> {alert.description} </p> </div> </div> {alert.action && ( <Button variant="ghost" size="sm" asChild className="flex-shrink-0" > <a href={alert.action.href}>{alert.action.label}</a> </Button> )} </div> ))} </section> )} {/* Key Metrics */} <section className="space-y-4"> <h2 className="text-lg font-semibold text-foreground"> Financial Summary </h2> <div className="grid gap-4 lg:grid-cols-4"> {data.metrics.map((metric: any, i: number) => ( <MetricCard key={i} metric={metric} /> ))} </div> </section> {/* Quick Actions */} <section className="space-y-4"> <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2> <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4"> <QuickActionButton label="Post Journal Entry" icon="📝" href="/gl" description="Record GL transactions" /> <QuickActionButton label="Process Invoice" icon="💳" href="/ap" description="Add vendor invoice" /> <QuickActionButton label="Approve Batch" icon="✓" href="/console" description="Review pending approvals" /> <QuickActionButton label="Close Month" icon="🔒" href="/reports" description="Complete monthly close" /> </div> </section> {/* Work Items & Status */} <section className="space-y-4"> <h2 className="text-lg font-semibold text-foreground">Your Work</h2> <div className="grid gap-6 lg:grid-cols-2"> <WorkSection title="Approvals Pending" count={5} items={[ { label:"Invoices", count: 5, oldest:"2 days" }, { label:"Journal Entries", count: 3, oldest:"1 day" }, { label:"Expense Reports", count: 0 }, ]} actionHref="/ap" actionLabel="Review All" /> <WorkSection title="Month-End Status" count={3} items={[ { label:"GL Reconciled", done: true }, { label:"Approvals Clear", done: false }, { label:"Bank Reconciliation", done: false }, ]} actionHref="/reports" actionLabel="Close Month" /> </div> </section> {/* Recent Activity */} <section className="space-y-4"> <h2 className="text-lg font-semibold text-foreground"> Recent Activity </h2> <div className="rounded-lg border border-border/40 bg-surface/60 p-4 space-y-3"> <ActivityItem time="Jan 27, 2:15 PM" action="Sarah approved" detail="Invoice INV-2024-0501" /> <ActivityItem time="Jan 27, 1:30 PM" action="You posted" detail="Journal entry JE-0424" /> <ActivityItem time="Jan 27, 10:45 AM" action="Bank statement imported" detail="$47,200 received" /> <div className="pt-3 border-t border-border/40"> <Button variant="ghost" size="sm" className="text-xs"> See all activity → </Button> </div> </div> </section> </div> );
}
function MetricCard({ metric }: { metric: any }) {
  const isPositive = metric.change?.startsWith("+");
  return (
    <div className="rounded-lg border border-border/40 bg-surface/60 p-4 space-y-2">
      {" "}
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {" "}
        {metric.label}{" "}
      </p>{" "}
      <p className="text-2xl font-bold text-foreground">{metric.value}</p>{" "}
      <div className="flex items-center gap-2">
        {" "}
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-emerald-400" />
        ) : (
          <TrendingDown className="h-4 w-4 text-amber-400" />
        )}{" "}
        <span
          className={cn(
            "text-xs font-medium",
            isPositive ? "text-emerald-400" : "text-amber-400",
          )}
        >
          {" "}
          {metric.change}{" "}
        </span>{" "}
      </div>{" "}
    </div>
  );
}
function QuickActionButton({
  label,
  icon,
  href,
  description,
}: {
  label: string;
  icon: string;
  href: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="group rounded-lg border border-border/40 bg-surface/60 p-4 transition hover:border-aurum-400/40 hover:bg-surface-variant/60"
    >
      {" "}
      <div className="text-3xl mb-2">{icon}</div>{" "}
      <p className="font-semibold text-foreground text-sm group-hover:text-aurum-300 transition">
        {" "}
        {label}{" "}
      </p>{" "}
      <p className="text-xs text-muted-foreground mt-1">{description}</p>{" "}
    </a>
  );
}
function WorkSection({
  title,
  count,
  items,
  actionHref,
  actionLabel,
}: {
  title: string;
  count: number;
  items: Array<any>;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-surface/60 p-6 space-y-4">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <h3 className="font-semibold text-foreground">{title}</h3>{" "}
        {count > 0 && (
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-xs font-bold text-amber-300">
            {" "}
            {count}{" "}
          </span>
        )}{" "}
      </div>{" "}
      <ul className="space-y-2">
        {" "}
        {items.map((item, i) => (
          <li key={i} className="flex items-center justify-between text-sm">
            {" "}
            <span className="text-muted-foreground">{item.label}</span>{" "}
            {item.done !== undefined ? (
              item.done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              )
            ) : (
              <div className="flex items-center gap-2">
                {" "}
                <span className="font-semibold text-foreground">
                  {" "}
                  {item.count}{" "}
                </span>{" "}
                {item.oldest && (
                  <span className="text-xs text-muted-foreground">
                    {" "}
                    ({item.oldest}){" "}
                  </span>
                )}{" "}
              </div>
            )}{" "}
          </li>
        ))}{" "}
      </ul>{" "}
      <div className="pt-3 border-t border-border/40">
        {" "}
        <Button variant="ghost" size="sm" asChild>
          {" "}
          <a href={actionHref}>{actionLabel} →</a>{" "}
        </Button>{" "}
      </div>{" "}
    </div>
  );
}
function ActivityItem({
  time,
  action,
  detail,
}: {
  time: string;
  action: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-4 text-sm">
      {" "}
      <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
        {" "}
        {time}{" "}
      </span>{" "}
      <div className="flex-1">
        {" "}
        <p className="text-muted-foreground">
          {" "}
          <span className="font-semibold text-foreground">{action}</span>
          {""} {detail}{" "}
        </p>{" "}
      </div>{" "}
    </div>
  );
}
