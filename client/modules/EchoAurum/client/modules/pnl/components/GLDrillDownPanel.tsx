import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  ChevronRight,
  LineChart,
  Loader2,
  Trees,
} from "lucide-react";
import type { ReactNode } from "react";
import type { GLDrillDownContext, GLTransaction } from "@shared/gl";
import { SessionRequiredNotice } from "@/modules/auth";
import { cn } from "@/lib/utils";
import { useGLDrillDown } from "../hooks/useGLDrillDown";
interface GLDrillDownPanelProps {
  accountCode: string | null;
  onBack: () => void;
}
export function GLDrillDownPanel({
  accountCode,
  onBack,
}: GLDrillDownPanelProps) {
  const { status, data, message } = useGLDrillDown(accountCode);
  if (!accountCode) {
    return null;
  }
  return (
    <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
      {" "}
      <header className="flex flex-wrap items-start justify-between gap-4">
        {" "}
        <div className="flex items-center gap-3">
          {" "}
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/40 transition hover:border-aurum-400/50 hover:bg-surface/60"
          >
            {" "}
            <ArrowLeft className="h-4 w-4" />{" "}
          </button>{" "}
          <div>
            {" "}
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
              {" "}
              GL Drill-Down{" "}
            </p>{" "}
            <h3 className="mt-1 text-lg font-semibold text-foreground">
              {" "}
              {accountCode}{" "}
            </h3>{" "}
          </div>{" "}
        </div>{" "}
        {status === "loading" ? (
          <Loader2 className="h-5 w-5 animate-spin text-aurum-300" />
        ) : (
          <LineChart className="h-5 w-5 text-aurum-300" />
        )}{" "}
      </header>{" "}
      {status === "error" ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {" "}
          <AlertTriangle className="mt-0.5 h-4 w-4" />{" "}
          <div>
            {" "}
            <p className="font-semibold">Unable to load GL drill-down</p>{" "}
            <p className="mt-1 text-xs text-red-200/80">{message}</p>{" "}
          </div>{" "}
        </div>
      ) : null}{" "}
      {status === "unauthenticated" ? (
        <SessionRequiredNotice
          description={message ?? "Authenticate to drill into GL codes."}
        />
      ) : null}{" "}
      {status === "ready" && data ? (
        <DrillDownContent data={data} />
      ) : null}{" "}
    </div>
  );
}
function DrillDownContent({ data }: { data: GLDrillDownContext }) {
  return (
    <div className="mt-6 space-y-6">
      {" "}
      <AccountHeader data={data} />{" "}
      <AncestorBreadcrumb ancestors={data.ancestors} />{" "}
      <BalanceSection data={data} />{" "}
      <TransactionHistory transactions={data.transactions} />{" "}
      {data.variances && data.variances.length > 0 ? (
        <VarianceSection variances={data.variances} />
      ) : null}{" "}
    </div>
  );
}
function AccountHeader({ data }: { data: GLDrillDownContext }) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
      {" "}
      <div className="flex items-start justify-between gap-3">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            {" "}
            {data.classification}{" "}
          </p>{" "}
          <p className="mt-2 text-xl font-semibold text-foreground">
            {" "}
            {data.accountName}{" "}
          </p>{" "}
          <p className="mt-1 text-sm text-muted-foreground/80">
            {" "}
            Account Code: {data.accountCode}{" "}
          </p>{" "}
        </div>{" "}
        <div className="text-right">
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            {" "}
            Balance{" "}
          </p>{" "}
          <p
            className={cn(
              "mt-2 text-2xl font-semibold",
              data.accountCode.startsWith("4") ||
                data.accountCode.startsWith("1")
                ? "text-emerald-300"
                : "text-red-300",
            )}
          >
            {" "}
            {formatCurrency(data.balance)}{" "}
          </p>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
function AncestorBreadcrumb({
  ancestors,
}: {
  ancestors: Array<{ code: string; name: string }>;
}) {
  if (ancestors.length === 0) {
    return null;
  }
  return (
    <div className="flex items-center gap-2 overflow-x-auto rounded-lg border border-border/40 bg-surface/60 px-4 py-3 text-sm">
      {" "}
      <Trees className="h-4 w-4 flex-shrink-0 text-aurum-300" />{" "}
      <div className="flex items-center gap-2">
        {" "}
        {ancestors.map((ancestor, index) => (
          <div key={ancestor.code} className="flex items-center gap-2">
            {" "}
            {index > 0 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            )}{" "}
            <span className="whitespace-nowrap rounded-full border border-border/30 bg-surface-variant/60 px-3 py-1 text-[0.7rem] font-semibold text-muted-foreground">
              {" "}
              {ancestor.code} · {ancestor.name}{" "}
            </span>{" "}
          </div>
        ))}{" "}
      </div>{" "}
    </div>
  );
}
function BalanceSection({ data }: { data: GLDrillDownContext }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {" "}
      <BalanceCard
        title="Debit Balance"
        value={formatCurrency(data.balance > 0 ? data.balance : 0)}
        icon={<Banknote className="h-5 w-5 text-aurum-300" />}
      />{" "}
      <BalanceCard
        title="Credit Balance"
        value={formatCurrency(data.balance < 0 ? Math.abs(data.balance) : 0)}
        icon={<Banknote className="h-5 w-5 text-red-300" />}
      />{" "}
      <BalanceCard
        title="Net Balance"
        value={formatCurrency(data.balance)}
        description={`${data.accountCode} transactions: ${data.accountCode}`}
        icon={<LineChart className="h-5 w-5 text-sky-300" />}
      />{" "}
    </div>
  );
}
function BalanceCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: ReactNode;
  description?: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
      {" "}
      <div className="flex items-center gap-3 text-muted-foreground">
        {" "}
        {icon}{" "}
        <p className="text-xs font-semibold uppercase tracking-[0.25em]">
          {" "}
          {title}{" "}
        </p>{" "}
      </div>{" "}
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>{" "}
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground/80">{description}</p>
      ) : null}{" "}
    </div>
  );
}
function TransactionHistory({
  transactions,
}: {
  transactions: GLTransaction[];
}) {
  return (
    <section className="rounded-xl border border-border/40 bg-surface/60 p-4">
      {" "}
      <header className="flex items-center justify-between gap-3">
        {" "}
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          {" "}
          Recent Transactions{" "}
        </p>{" "}
        <LineChart className="h-4 w-4 text-aurum-300" />{" "}
      </header>{" "}
      <div className="mt-4 overflow-x-auto">
        {" "}
        <table className="w-full min-w-[520px] table-fixed text-left text-xs text-muted-foreground">
          {" "}
          <thead className="text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground/70">
            {" "}
            <tr>
              {" "}
              <th className="pb-2 pr-4 font-semibold">Date</th>{" "}
              <th className="pb-2 pr-4 font-semibold">Type</th>{" "}
              <th className="pb-2 pr-4 font-semibold">Amount</th>{" "}
              <th className="pb-2 pr-4 font-semibold">Source</th>{" "}
              <th className="pb-2 pr-4 font-semibold">Memo</th>{" "}
            </tr>{" "}
          </thead>{" "}
          <tbody className="text-[0.7rem]">
            {" "}
            {transactions.slice(0, 15).map((txn, index) => (
              <tr key={index} className="border-t border-border/20">
                {" "}
                <td className="py-2 pr-4 text-foreground">
                  {" "}
                  {formatDate(txn.postedAt)}{" "}
                </td>{" "}
                <td className="py-2 pr-4">
                  {" "}
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-[0.65rem] font-semibold uppercase",
                      txn.transactionType === "debit"
                        ? "bg-aurum-500/20 text-aurum-200"
                        : "bg-red-500/20 text-red-200",
                    )}
                  >
                    {" "}
                    {txn.transactionType}{" "}
                  </span>{" "}
                </td>{" "}
                <td className="py-2 pr-4">{formatCurrency(txn.amount)}</td>{" "}
                <td className="py-2 pr-4 capitalize">{txn.source}</td>{" "}
                <td className="py-2 pr-4 text-muted-foreground/70">
                  {" "}
                  {txn.memo || "—"}{" "}
                </td>{" "}
              </tr>
            ))}{" "}
          </tbody>{" "}
        </table>{" "}
      </div>{" "}
      {transactions.length > 15 ? (
        <p className="mt-3 text-[0.7rem] text-muted-foreground/70">
          {" "}
          Showing 15 of {transactions.length} transactions{" "}
        </p>
      ) : null}{" "}
    </section>
  );
}
function VarianceSection({ variances }: { variances: any[] }) {
  if (variances.length === 0) {
    return null;
  }
  const variance = variances[0];
  return (
    <section className="rounded-xl border border-border/40 bg-surface/60 p-4">
      {" "}
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
        {" "}
        Budget Variance{" "}
      </p>{" "}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {" "}
        <div>
          {" "}
          <p className="text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground/70">
            {" "}
            Budgeted{" "}
          </p>{" "}
          <p className="mt-2 text-lg font-semibold text-foreground">
            {" "}
            {formatCurrency(variance.budgeted)}{" "}
          </p>{" "}
        </div>{" "}
        <div>
          {" "}
          <p className="text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground/70">
            {" "}
            Actual{" "}
          </p>{" "}
          <p className="mt-2 text-lg font-semibold text-foreground">
            {" "}
            {formatCurrency(variance.actual)}{" "}
          </p>{" "}
        </div>{" "}
        <div>
          {" "}
          <p className="text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground/70">
            {" "}
            Variance{" "}
          </p>{" "}
          <p
            className={cn(
              "mt-2 text-lg font-semibold",
              variance.variance > 0 ? "text-red-300" : "text-emerald-300",
            )}
          >
            {" "}
            {formatSignedCurrency(variance.variance)}{" "}
          </p>{" "}
        </div>{" "}
        <div>
          {" "}
          <p className="text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground/70">
            {" "}
            Trend{" "}
          </p>{" "}
          <p
            className={cn(
              "mt-2 text-lg font-semibold capitalize",
              variance.trend === "favorable"
                ? "text-emerald-300"
                : "text-red-300",
            )}
          >
            {" "}
            {variance.trend}{" "}
          </p>{" "}
        </div>{" "}
      </div>{" "}
    </section>
  );
}
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
function formatSignedCurrency(value: number) {
  const formatted = formatCurrency(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}
function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
