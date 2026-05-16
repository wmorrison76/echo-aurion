import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowRight,
  Banknote,
  Brain,
  Database,
  Filter,
  Gauge,
  GitBranch,
  Lightbulb,
  Lock,
  Zap,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
export function ArchitecturePanel() {
  const [selectedSystem, setSelectedSystem] = useState<
    "aurum" | "stratus" | null
  >(null);
  return (
    <div className="space-y-6">
      {" "}
      <div className="rounded-3xl border border-border/40 bg-surface/90 p-8 shadow-[0_35px_90px_-45px_rgba(8,12,22,0.65)]">
        {" "}
        <header className="mb-6">
          {" "}
          <span className="inline-flex items-center gap-2 rounded-full border border-aurum-300/40 bg-aurum-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-aurum-200">
            {" "}
            Phase XIII{" "}
          </span>{" "}
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
            {" "}
            LUCCCA Financial Singularity{" "}
          </h2>{" "}
          <p className="mt-3 max-w-4xl text-lg text-muted-foreground">
            {" "}
            EchoAurum (financial core) ↔ EchoStratus (predictive atmosphere) ↔
            AI³ Orchestration{" "}
          </p>{" "}
        </header>{" "}
        <div className="mt-8 grid gap-6">
          {" "}
          <DualCoreVisualization
            selectedSystem={selectedSystem}
            onSelect={setSelectedSystem}
          />{" "}
          <ClosedLoopCycle /> <GuardianEcosystem /> <DataFlowArchitecture />{" "}
          <SystemHealthStatus />{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
function DualCoreVisualization({
  selectedSystem,
  onSelect,
}: {
  selectedSystem: "aurum" | "stratus" | null;
  onSelect: (system: "aurum" | "stratus" | null) => void;
}) {
  return (
    <section className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
      {" "}
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-aurum-200">
        {" "}
        Dual-Core Architecture{" "}
      </p>{" "}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {" "}
        {/* EchoAurum Core */}{" "}
        <button
          onClick={() => onSelect(selectedSystem === "aurum" ? null : "aurum")}
          className={cn(
            "group rounded-2xl border-2 p-6 transition",
            selectedSystem === "aurum"
              ? "border-aurum-400/60 bg-aurum-500/15"
              : "border-border/40 bg-surface-variant/60 hover:border-aurum-300/40",
          )}
        >
          {" "}
          <div className="flex items-start justify-between gap-4">
            {" "}
            <div className="text-left">
              {" "}
              <div className="flex items-center gap-3">
                {" "}
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-aurum-400/40 bg-aurum-500/20">
                  {" "}
                  <Banknote className="h-6 w-6 text-aurum-300" />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-aurum-200">
                    {" "}
                    Anchor Layer{" "}
                  </p>{" "}
                  <h3 className="mt-1 text-2xl font-bold text-foreground">
                    {" "}
                    EchoAurum{" "}
                  </h3>{" "}
                </div>{" "}
              </div>{" "}
              <p className="mt-4 text-sm text-muted-foreground">
                {" "}
                Financial Intelligence Core{" "}
              </p>{" "}
              <div className="mt-4 space-y-2 text-left text-[0.7rem] text-muted-foreground/80">
                {" "}
                <p>✓ Deterministic accounting</p> <p>✓ Real-time GL & AP/AR</p>{" "}
                <p>✓ Journal entries & payments</p>{" "}
                <p>✓ Compliance & audit trails</p>{" "}
              </div>{" "}
            </div>{" "}
            <Activity className="h-5 w-5 text-aurum-300 transition group-hover:scale-110" />{" "}
          </div>{" "}
        </button>{" "}
        {/* EchoStratus Atmosphere */}{" "}
        <button
          onClick={() =>
            onSelect(selectedSystem === "stratus" ? null : "stratus")
          }
          className={cn(
            "group rounded-2xl border-2 p-6 transition",
            selectedSystem === "stratus"
              ? "border-sky-400/60 bg-sky-500/15"
              : "border-border/40 bg-surface-variant/60 hover:border-sky-300/40",
          )}
        >
          {" "}
          <div className="flex items-start justify-between gap-4">
            {" "}
            <div className="text-left">
              {" "}
              <div className="flex items-center gap-3">
                {" "}
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-sky-400/40 bg-sky-500/20">
                  {" "}
                  <Brain className="h-6 w-6 text-sky-300" />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-200">
                    {" "}
                    Atmosphere Layer{" "}
                  </p>{" "}
                  <h3 className="mt-1 text-2xl font-bold text-foreground">
                    {" "}
                    EchoStratus{" "}
                  </h3>{" "}
                </div>{" "}
              </div>{" "}
              <p className="mt-4 text-sm text-muted-foreground">
                {" "}
                Predictive & Optimization Brain{" "}
              </p>{" "}
              <div className="mt-4 space-y-2 text-left text-[0.7rem] text-muted-foreground/80">
                {" "}
                <p>✓ Probabilistic forecasting</p>{" "}
                <p>✓ Scenario modeling & what-if</p>{" "}
                <p>✓ Anomaly & drift detection</p>{" "}
                <p>✓ Auto-optimization signals</p>{" "}
              </div>{" "}
            </div>{" "}
            <Lightbulb className="h-5 w-5 text-sky-300 transition group-hover:scale-110" />{" "}
          </div>{" "}
        </button>{" "}
      </div>{" "}
      {selectedSystem && (
        <div className="mt-6 rounded-xl border border-border/40 bg-surface/60 p-4">
          {" "}
          <SystemDetails system={selectedSystem} />{" "}
        </div>
      )}{" "}
    </section>
  );
}
function SystemDetails({ system }: { system: "aurum" | "stratus" }) {
  if (system === "aurum") {
    return (
      <div className="space-y-4">
        {" "}
        <div>
          {" "}
          <p className="font-semibold text-aurum-200">
            {" "}
            Data Sources (Real-time Intake){" "}
          </p>{" "}
          <div className="mt-2 flex flex-wrap gap-2">
            {" "}
            {[
              "Operational Ledger",
              "Invoice Queue",
              "Payment Streams",
              "GL Postings",
            ].map((source) => (
              <span
                key={source}
                className="rounded-full border border-aurum-400/30 bg-aurum-500/10 px-3 py-1 text-[0.7rem] text-aurum-200"
              >
                {" "}
                {source}{" "}
              </span>
            ))}{" "}
          </div>{" "}
        </div>{" "}
        <div>
          {" "}
          <p className="font-semibold text-aurum-200">
            Guardian Oversight
          </p>{" "}
          <div className="mt-2 flex flex-wrap gap-2">
            {" "}
            {[
              "Argus (Compliance)",
              "Zelda (Auto-Heal)",
              "Odin (Rollback)",
              "Phoenix (Defense)",
            ].map((guardian) => (
              <span
                key={guardian}
                className="rounded-full border border-aurum-400/30 bg-aurum-500/10 px-3 py-1 text-[0.7rem] text-aurum-200"
              >
                {" "}
                {guardian}{" "}
              </span>
            ))}{" "}
          </div>{" "}
        </div>{" "}
        <div>
          {" "}
          <p className="font-semibold text-aurum-200">Key Outputs</p>{" "}
          <p className="mt-2 text-sm text-muted-foreground">
            {" "}
            Balance sheets, ledgers, invoices, cash flow statements, audit
            trails, tax exports, variance reports{" "}
          </p>{" "}
        </div>{" "}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {" "}
      <div>
        {" "}
        <p className="font-semibold text-sky-200">Input Data Sources</p>{" "}
        <div className="mt-2 flex flex-wrap gap-2">
          {" "}
          {[
            "EchoAurum Ledger",
            "POS Data",
            "Operational Metrics",
            "Historical Trends",
          ].map((source) => (
            <span
              key={source}
              className="rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-[0.7rem] text-sky-200"
            >
              {" "}
              {source}{" "}
            </span>
          ))}{" "}
        </div>{" "}
      </div>{" "}
      <div>
        {" "}
        <p className="font-semibold text-sky-200">Guardian Oversight</p>{" "}
        <div className="mt-2 flex flex-wrap gap-2">
          {" "}
          {[
            "Argus (Model Validity)",
            "Phoenix (Drift Detection)",
            "EchoDeepState (Learning)",
          ].map((guardian) => (
            <span
              key={guardian}
              className="rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-[0.7rem] text-sky-200"
            >
              {" "}
              {guardian}{" "}
            </span>
          ))}{" "}
        </div>{" "}
      </div>{" "}
      <div>
        {" "}
        <p className="font-semibold text-sky-200">Key Outputs</p>{" "}
        <p className="mt-2 text-sm text-muted-foreground">
          {" "}
          Predictive reports, what-if simulations, 30/60/90-day forecasts,
          confidence graphs, auto-optimizations, AI alerts{" "}
        </p>{" "}
      </div>{" "}
    </div>
  );
}
function ClosedLoopCycle() {
  const stages = [
    { name: "Real", icon: "📊", desc: "Actual transactions recorded in GL" },
    { name: "Analyze", icon: "🔍", desc: "EchoAurum verifies & categorizes" },
    { name: "Predict", icon: "🔮", desc: "EchoStratus forecasts next move" },
    { name: "Adjust", icon: "⚙️", desc: "Operations adapt to signals" },
    { name: "Record", icon: "📝", desc: "New actuals loop back to GL" },
  ];
  return (
    <section className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
      {" "}
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-aurum-200">
        {" "}
        Closed-Loop Intelligence Cycle{" "}
      </p>{" "}
      <div className="mt-6 flex overflow-x-auto gap-4 pb-4">
        {" "}
        {stages.map((stage, index) => (
          <div key={stage.name} className="flex min-w-max items-center gap-3">
            {" "}
            <div className="flex flex-col items-center gap-2">
              {" "}
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-aurum-400/40 bg-aurum-500/10 text-2xl transition hover:border-aurum-400/60">
                {" "}
                {stage.icon}{" "}
              </div>{" "}
              <p className="text-sm font-semibold text-foreground">
                {" "}
                {stage.name}{" "}
              </p>{" "}
              <p className="max-w-[120px] text-center text-[0.65rem] text-muted-foreground/80">
                {" "}
                {stage.desc}{" "}
              </p>{" "}
            </div>{" "}
            {index < stages.length - 1 && (
              <div className="flex flex-col items-center gap-2">
                {" "}
                <ArrowRight className="h-5 w-5 text-aurum-300/60" />{" "}
                <span className="text-[0.6rem] text-muted-foreground/50">
                  {" "}
                  ~seconds{" "}
                </span>{" "}
              </div>
            )}{" "}
          </div>
        ))}{" "}
        <div className="flex items-center gap-3">
          {" "}
          <ArrowRight className="h-5 w-5 text-aurum-300/60" />{" "}
        </div>{" "}
      </div>{" "}
      <p className="mt-4 text-sm text-muted-foreground">
        {" "}
        Real-time data flows through Synapse Mesh (Kafka) with{""}{" "}
        <span className="font-semibold text-aurum-200">sub-second latency</span>{" "}
        , enabling self-healing financial operations.{" "}
      </p>{" "}
    </section>
  );
}
function GuardianEcosystem() {
  const guardians = [
    {
      name: "Argus",
      role: "Data Compliance Guardian",
      focus: "Both",
      icon: Filter,
      color: "text-emerald-300",
      tasks: [
        "Validate data integrity",
        "Ensure GL balance",
        "Monitor forecast accuracy",
      ],
    },
    {
      name: "Zelda",
      role: "Auto-Heal Guardian",
      focus: "Aurum",
      icon: Zap,
      color: "text-aurum-300",
      tasks: [
        "Detect discrepancies",
        "Auto-correct errors",
        "Reconcile accounts",
      ],
    },
    {
      name: "Phoenix",
      role: "Emergency Defense",
      focus: "Both",
      icon: AlertCircle,
      color: "text-red-300",
      tasks: ["Monitor thresholds", "Escalate anomalies", "Trigger safeguards"],
    },
    {
      name: "Odin",
      role: "Rollback Guardian",
      focus: "Aurum",
      icon: GitBranch,
      color: "text-purple-300",
      tasks: [
        "Audit trail tracking",
        "Point-in-time restore",
        "Change history",
      ],
    },
  ];
  return (
    <section className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
      {" "}
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-aurum-200">
        {" "}
        Guardian AI Ecosystem{" "}
      </p>{" "}
      <p className="mt-2 text-sm text-muted-foreground">
        {" "}
        Four specialized agents protect and optimize financial integrity across
        both systems.{" "}
      </p>{" "}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {" "}
        {guardians.map((guardian) => {
          const Icon = guardian.icon;
          return (
            <div
              key={guardian.name}
              className="rounded-xl border border-border/40 bg-surface/60 p-4"
            >
              {" "}
              <div className="flex items-center gap-2">
                {" "}
                <Icon className={cn("h-5 w-5", guardian.color)} />{" "}
                <div>
                  {" "}
                  <p className="text-sm font-bold text-foreground">
                    {" "}
                    {guardian.name}{" "}
                  </p>{" "}
                  <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground/70">
                    {" "}
                    {guardian.role}{" "}
                  </p>{" "}
                </div>{" "}
              </div>{" "}
              <div className="mt-3 space-y-1">
                {" "}
                {guardian.tasks.map((task) => (
                  <p
                    key={task}
                    className="text-[0.7rem] text-muted-foreground/80"
                  >
                    {" "}
                    • {task}{" "}
                  </p>
                ))}{" "}
              </div>{" "}
              <span
                className={cn(
                  "mt-3 inline-block rounded-full px-2 py-1 text-[0.6rem] font-semibold uppercase",
                  guardian.focus === "Both"
                    ? "border border-aurum-400/30 bg-aurum-500/10 text-aurum-200"
                    : "border border-border/30 bg-surface-variant/60 text-muted-foreground/70",
                )}
              >
                {" "}
                {guardian.focus}{" "}
              </span>{" "}
            </div>
          );
        })}{" "}
      </div>{" "}
    </section>
  );
}
function DataFlowArchitecture() {
  const connections = [
    {
      from: "EchoAurum",
      to: "EchoStratus",
      protocol: "Kafka (aurum.ledger.v1)",
      latency: "<100ms",
      type: "Ledger events",
    },
    {
      from: "EchoStratus",
      to: "EchoAurum",
      protocol: "GraphQL (forecast.update.v1)",
      latency: "<500ms",
      type: "Forecast signals & adjustments",
    },
    {
      from: "EchoAI³",
      to: "Guardian Console",
      protocol: "REST + WebSocket",
      latency: "Real-time",
      type: "Compliance & alert routing",
    },
  ];
  return (
    <section className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
      {" "}
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-aurum-200">
        {" "}
        Synapse Mesh Data Flows{" "}
      </p>{" "}
      <div className="mt-6 space-y-3">
        {" "}
        {connections.map((conn, index) => (
          <div
            key={index}
            className="flex items-center gap-4 rounded-xl border border-border/40 bg-surface/60 p-3"
          >
            {" "}
            <div className="flex flex-col items-center gap-2 text-center text-sm font-semibold">
              {" "}
              <span className="text-foreground">{conn.from}</span>{" "}
              <ArrowRight className="h-4 w-4 text-aurum-300" />{" "}
              <span className="text-foreground">{conn.to}</span>{" "}
            </div>{" "}
            <div className="flex-1">
              {" "}
              <p className="text-sm text-muted-foreground">{conn.type}</p>{" "}
              <p className="text-[0.65rem] text-muted-foreground/70">
                {" "}
                {conn.protocol}{" "}
              </p>{" "}
            </div>{" "}
            <div className="rounded-lg border border-aurum-400/30 bg-aurum-500/10 px-3 py-1 text-center text-[0.7rem] font-semibold text-aurum-200">
              {" "}
              {conn.latency}{" "}
            </div>{" "}
          </div>
        ))}{" "}
      </div>{" "}
    </section>
  );
}
function SystemHealthStatus() {
  const systemHealth = [
    {
      name: "EchoAurum",
      status: "healthy",
      uptime: "99.98%",
      icon: Banknote,
      color: "text-aurum-300",
    },
    {
      name: "EchoStratus",
      status: "healthy",
      uptime: "99.95%",
      icon: Brain,
      color: "text-sky-300",
    },
    {
      name: "EchoAI³",
      status: "healthy",
      uptime: "99.99%",
      icon: Gauge,
      color: "text-purple-300",
    },
    {
      name: "Synapse Mesh",
      status: "healthy",
      uptime: "100%",
      icon: Zap,
      color: "text-emerald-300",
    },
  ];
  return (
    <section className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
      {" "}
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-aurum-200">
        {" "}
        System Health Status{" "}
      </p>{" "}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {" "}
        {systemHealth.map((system) => {
          const Icon = system.icon;
          return (
            <div
              key={system.name}
              className="rounded-xl border border-border/40 bg-surface/60 p-4"
            >
              {" "}
              <div className="flex items-center gap-2">
                {" "}
                <Icon className={cn("h-5 w-5", system.color)} />{" "}
                <p className="text-sm font-semibold text-foreground">
                  {" "}
                  {system.name}{" "}
                </p>{" "}
              </div>{" "}
              <div className="mt-3">
                {" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />{" "}
                  <span className="text-[0.7rem] font-semibold uppercase text-emerald-200">
                    {" "}
                    {system.status}{" "}
                  </span>{" "}
                </div>{" "}
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {" "}
                  {system.uptime}{" "}
                </p>{" "}
              </div>{" "}
            </div>
          );
        })}{" "}
      </div>{" "}
      <div className="mt-6 rounded-xl border border-border/40 bg-surface/60 p-4">
        {" "}
        <p className="text-sm font-semibold text-foreground">
          {" "}
          Financial Singularity Status{" "}
        </p>{" "}
        <p className="mt-2 text-sm text-muted-foreground">
          {" "}
          All systems operational. Synapse Mesh connectivity:{""}{" "}
          <span className="font-semibold text-emerald-300">optimal</span>.
          Guardian AI oversight:{""}{" "}
          <span className="font-semibold text-emerald-300">active</span>.
          Self-healing protocols:{""}{" "}
          <span className="font-semibold text-emerald-300">engaged</span>.{" "}
        </p>{" "}
      </div>{" "}
    </section>
  );
}
