import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  Download,
  Eye,
  Filter,
  Loader2,
  Radio,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useGLRealtimeUpdates, useGLOfflineCache } from "@/modules/aurum/hooks";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchWithLucccaSession } from "../../auth";
interface GLBalance {
  code: string;
  name: string;
  accountType: string;
  debitBalance: number;
  creditBalance: number;
  balance: number;
  lastUpdated: string;
  transactionCount: number;
  variance?: number;
}
interface GLDashboardState {
  balances: GLBalance[];
  loading: boolean;
  error: string | null;
  selectedAccount: GLBalance | null;
  searchTerm: string;
  filters: {
    accountType?: string;
    showZeroBalance: boolean;
    periodDate: string;
  };
}
export function GLDashboard() {
  const [state, setState] = useState<GLDashboardState>({
    balances: [],
    loading: true,
    error: null,
    selectedAccount: null,
    searchTerm: "",
    filters: {
      showZeroBalance: false,
      periodDate: new Date().toISOString().split("T")[0],
    },
  });
  const [isExporting, setIsExporting] = useState(false);
  const [entityId] = useState("default-entity"); // In a real app, this would come from auth context const offlineCache = useGLOfflineCache(); const realtimeUpdates = useGLRealtimeUpdates({ enabled: true, entityId, onBalanceUpdate: (event) => { // Update the specific account balance in the state if (event.accountCode) { setState((prev) => ({ ...prev, balances: prev.balances.map((balance) => balance.code === event.accountCode ? { ...balance, debitBalance: event.debitBalance ?? balance.debitBalance, creditBalance: event.creditBalance ?? balance.creditBalance, balance: event.balance ?? balance.balance, lastUpdated: event.timestamp, } : balance, ), })); } }, onTransactionPosted: (event) => { // Optionally show a notification for new transactions console.log("New transaction posted:", event); }, onConsolidationComplete: (event) => { // Refresh balances after consolidation fetchGLBalances(); }, }); useEffect(() => { fetchGLBalances(); }, [state.filters.periodDate]); const fetchGLBalances = useCallback(async () => { setState((prev) => ({ ...prev, loading: true, error: null })); try { const response = await fetchWithLucccaSession("/api/aurum/gl/trial-balance", { method:"GET", headers: {"Content-Type":"application/json", }, credentials:"include", }, ); if (!response.ok) { if (response.status === 401) { throw new Error("Authentication required"); } throw new Error("Failed to fetch GL balances"); } const data = await response.json(); const balances: GLBalance[] = (data.trialBalance || []).map( (row: any) => ({ code: row.account_code || row.code, name: row.account_name || row.name, accountType: row.account_type ||"Unknown", debitBalance: row.debits || 0, creditBalance: row.credits || 0, balance: (row.debits || 0) - (row.credits || 0), lastUpdated: new Date().toISOString(), transactionCount: row.transaction_count || 0, }), ); // Save to offline cache offlineCache.saveToCache(balances); setState((prev) => ({ ...prev, balances, loading: false, error: null, })); } catch (err) { // Attempt to load from offline cache if network fails const cachedBalances = offlineCache.loadFromCache(); if (cachedBalances && cachedBalances.length > 0) { const errorMessage = err instanceof Error ? err.message :"Unknown error occurred"; setState((prev) => ({ ...prev, balances: cachedBalances, loading: false, error: `Offline mode: ${errorMessage}`, })); } else { const errorMessage = err instanceof Error ? err.message :"Unknown error occurred"; setState((prev) => ({ ...prev, loading: false, error: errorMessage, })); } } }, [offlineCache]); const filteredBalances = state.balances.filter((balance) => { if ( state.filters.accountType && balance.accountType !== state.filters.accountType ) { return false; } if (!state.filters.showZeroBalance && balance.balance === 0) { return false; } if ( state.searchTerm && !balance.code.toLowerCase().includes(state.searchTerm.toLowerCase()) && !balance.name.toLowerCase().includes(state.searchTerm.toLowerCase()) ) { return false; } return true; }); const handleExport = async (format:"csv" |"excel" |"pdf") => { setIsExporting(true); try { const dataToExport = filteredBalances.map((balance) => ({ Code: balance.code, Name: balance.name, Type: balance.accountType,"Debit Balance": balance.debitBalance.toFixed(2),"Credit Balance": balance.creditBalance.toFixed(2),"Net Balance": balance.balance.toFixed(2), Transactions: balance.transactionCount,"Last Updated": balance.lastUpdated, })); if (format ==="csv") { exportToCSV(dataToExport); } else if (format ==="excel") { exportToExcel(dataToExport); } else if (format ==="pdf") { exportToPDF(dataToExport); } } finally { setIsExporting(false); } }; const exportToCSV = (data: any[]) => { if (data.length === 0) return; const headers = Object.keys(data[0]); const csv = [ headers.join(","), ...data.map((row) => headers .map((header) => { const value = row[header]; const stringValue = typeof value ==="string" ? value : String(value); return stringValue.includes(",") ? `"${stringValue}"` : stringValue; }) .join(","), ), ].join("\n"); const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" }); const link = document.createElement("a"); const url = URL.createObjectURL(blob); link.setAttribute("href", url); link.setAttribute("download", `gl_balances_${Date.now()}.csv`); link.style.visibility ="hidden"; document.body.appendChild(link); link.click(); document.body.removeChild(link); }; const exportToExcel = (data: any[]) => { // For Excel export, we'll create a simple HTML table format // In production, you'd use a library like xlsx const htmlTable = ` <table border="1"> <tr> ${Object.keys(data[0] || {}) .map((header) => `<th>${header}</th>`) .join("")} </tr> ${data .map( (row) => `<tr>${Object.values(row) .map((val) => `<td>${val}</td>`) .join("")}</tr>`, ) .join("")} </table> `; const blob = new Blob([htmlTable], { type:"application/vnd.ms-excel;charset=utf-8;", }); const link = document.createElement("a"); const url = URL.createObjectURL(blob); link.setAttribute("href", url); link.setAttribute("download", `gl_balances_${Date.now()}.xls`); link.style.visibility ="hidden"; document.body.appendChild(link); link.click(); document.body.removeChild(link); }; const exportToPDF = (data: any[]) => { // Simple PDF generation using HTML to PDF conversion // In production, use a library like jsPDF or html2pdf const htmlContent = ` <html> <head> <title>GL Balance Report</title> <style> body { font-family: Arial, sans-serif; margin: 20px; } h1 { color: #333; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #4CAF50; color: white; } tr:nth-child(even) { background-color: #f2f2f2; } .footer { margin-top: 20px; font-size: 12px; color: #666; } </style> </head> <body> <h1>GL Balance Report</h1> <p>Generated: ${new Date().toLocaleString()}</p> <table> <tr> ${Object.keys(data[0] || {}) .map((header) => `<th>${header}</th>`) .join("")} </tr> ${data .map( (row) => `<tr>${Object.values(row) .map((val) => `<td>${val}</td>`) .join("")}</tr>`, ) .join("")} </table> <div class="footer"> <p>This is a system-generated report. Please verify accuracy before use.</p> </div> </body> </html> `; const newWindow = window.open("","_blank"); if (newWindow) { newWindow.document.write(htmlContent); newWindow.document.close(); newWindow.print(); } }; const totalDebits = filteredBalances.reduce( (sum, bal) => sum + bal.debitBalance, 0, ); const totalCredits = filteredBalances.reduce( (sum, bal) => sum + bal.creditBalance, 0, ); return ( <div className="space-y-6 rounded-2xl border border-border/40 bg-surface-variant/60 p-6"> <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"> <div className="flex items-center gap-3"> <div> <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200"> GL Dashboard </p> <h2 className="mt-1 text-2xl font-semibold text-foreground"> Real-Time General Ledger </h2> </div> <div className={cn("flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", realtimeUpdates.isLive ?"bg-emerald-500/20 text-emerald-300" :"bg-amber-500/20 text-amber-300", )} > <Radio className={cn("h-2 w-2", realtimeUpdates.isLive ?"animate-pulse" :"", )} /> {realtimeUpdates.isLive ?"LIVE" :"OFFLINE"} </div> </div> <div className="flex flex-wrap gap-2"> <Button onClick={fetchGLBalances} disabled={state.loading} variant="outline" size="sm" className="w-full sm:w-auto" > {state.loading ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : ( <RefreshCw className="mr-2 h-4 w-4" /> )} Refresh </Button> <div className="relative w-full sm:w-auto"> <button className="group relative inline-flex h-9 items-center gap-2 rounded-lg border border-border/40 bg-surface/60 px-3 py-2 text-sm font-medium transition hover:border-aurum-400/50 hover:bg-surface/80" title="Export GL data" > <Download className="h-4 w-4" /> Export <div className="absolute right-0 top-full z-10 mt-1 hidden w-32 flex-col rounded-lg border border-border/40 bg-surface/90 shadow-lg group-hover:flex"> <button onClick={() => handleExport("csv")} disabled={isExporting} className="px-4 py-2 text-left text-xs hover:bg-surface-variant/60" > CSV </button> <button onClick={() => handleExport("excel")} disabled={isExporting} className="px-4 py-2 text-left text-xs hover:bg-surface-variant/60" > Excel </button> <button onClick={() => handleExport("pdf")} disabled={isExporting} className="px-4 py-2 text-left text-xs hover:bg-surface-variant/60" > PDF </button> </div> </button> </div> </div> </header> {state.error && ( <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"> <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /> <div> <p className="font-semibold">Error Loading GL Balances</p> <p className="mt-1 text-xs text-red-200/80">{state.error}</p> {state.error.includes("Authentication") && ( <SessionRequiredNotice /> )} </div> </div> )} <SummaryCards totalDebits={totalDebits} totalCredits={totalCredits} /> <SearchAndFilter searchTerm={state.searchTerm} onSearchChange={(term) => setState((prev) => ({ ...prev, searchTerm: term })) } filters={state.filters} onFiltersChange={(filters) => setState((prev) => ({ ...prev, filters })) } /> {state.loading ? ( <div className="flex justify-center py-12"> <Loader2 className="h-8 w-8 animate-spin text-aurum-300" /> </div> ) : ( <GLBalancesTable balances={filteredBalances} selectedAccount={state.selectedAccount} onSelectAccount={(account) => setState((prev) => ({ ...prev, selectedAccount: account })) } /> )} {state.selectedAccount && ( <DrillDownPanel account={state.selectedAccount} onClose={() => setState((prev) => ({ ...prev, selectedAccount: null })) } /> )} </div> );
}
function SummaryCards({
  totalDebits,
  totalCredits,
}: {
  totalDebits: number;
  totalCredits: number;
}) {
  const netBalance = totalDebits - totalCredits;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {" "}
      <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
        {" "}
        <div className="flex items-center gap-3 text-muted-foreground">
          {" "}
          <ArrowUp className="h-5 w-5 text-aurum-300" />{" "}
          <p className="text-xs font-semibold uppercase tracking-[0.25em]">
            {" "}
            Total Debits{" "}
          </p>{" "}
        </div>{" "}
        <p className="mt-3 text-2xl font-semibold text-foreground">
          {" "}
          {formatCurrency(totalDebits)}{" "}
        </p>{" "}
      </div>{" "}
      <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
        {" "}
        <div className="flex items-center gap-3 text-muted-foreground">
          {" "}
          <ArrowDown className="h-5 w-5 text-red-300" />{" "}
          <p className="text-xs font-semibold uppercase tracking-[0.25em]">
            {" "}
            Total Credits{" "}
          </p>{" "}
        </div>{" "}
        <p className="mt-3 text-2xl font-semibold text-foreground">
          {" "}
          {formatCurrency(totalCredits)}{" "}
        </p>{" "}
      </div>{" "}
      <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
        {" "}
        <div className="flex items-center gap-3 text-muted-foreground">
          {" "}
          <TrendingUp
            className={cn(
              "h-5 w-5",
              netBalance >= 0 ? "text-emerald-300" : "text-red-300",
            )}
          />{" "}
          <p className="text-xs font-semibold uppercase tracking-[0.25em]">
            {" "}
            Net Balance{" "}
          </p>{" "}
        </div>{" "}
        <p
          className={cn(
            "mt-3 text-2xl font-semibold",
            netBalance >= 0 ? "text-emerald-300" : "text-red-300",
          )}
        >
          {" "}
          {formatCurrency(netBalance)}{" "}
        </p>{" "}
      </div>{" "}
    </div>
  );
}
interface SearchAndFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filters: {
    accountType?: string;
    showZeroBalance: boolean;
    periodDate: string;
  };
  onFiltersChange: (filters: any) => void;
}
function SearchAndFilter({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
}: SearchAndFilterProps) {
  return (
    <div className="space-y-4 rounded-xl border border-border/40 bg-surface/60 p-4">
      {" "}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {" "}
        <div className="flex-1">
          {" "}
          <div className="relative">
            {" "}
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />{" "}
            <input
              type="text"
              placeholder="Search account code or name..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-lg border border-border/40 bg-surface/60 py-2 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground focus:border-aurum-300 focus:outline-none"
            />{" "}
          </div>{" "}
        </div>{" "}
        <div className="flex items-center gap-2">
          {" "}
          <Calendar className="h-4 w-4 text-muted-foreground" />{" "}
          <input
            type="date"
            value={filters.periodDate}
            onChange={(e) =>
              onFiltersChange({ ...filters, periodDate: e.target.value })
            }
            className="rounded-lg border border-border/40 bg-surface/60 px-3 py-2 text-sm focus:border-aurum-300 focus:outline-none"
          />{" "}
        </div>{" "}
        <label className="flex items-center gap-2 text-sm">
          {" "}
          <input
            type="checkbox"
            checked={filters.showZeroBalance}
            onChange={(e) =>
              onFiltersChange({ ...filters, showZeroBalance: e.target.checked })
            }
            className="rounded border-border/40"
          />{" "}
          <span className="text-muted-foreground">Show Zero Balances</span>{" "}
        </label>{" "}
      </div>{" "}
    </div>
  );
}
interface GLBalancesTableProps {
  balances: GLBalance[];
  selectedAccount: GLBalance | null;
  onSelectAccount: (account: GLBalance) => void;
}
function GLBalancesTable({
  balances,
  selectedAccount,
  onSelectAccount,
}: GLBalancesTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/40 bg-surface/60">
      {" "}
      <table className="w-full min-w-[800px] text-left text-xs text-muted-foreground">
        {" "}
        <thead className="border-b border-border/20 text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground/70">
          {" "}
          <tr>
            {" "}
            <th className="px-4 py-3 font-semibold">Code</th>{" "}
            <th className="px-4 py-3 font-semibold">Account Name</th>{" "}
            <th className="px-4 py-3 font-semibold">Type</th>{" "}
            <th className="px-4 py-3 text-right font-semibold">
              {" "}
              Debit Balance{" "}
            </th>{" "}
            <th className="px-4 py-3 text-right font-semibold">
              {" "}
              Credit Balance{" "}
            </th>{" "}
            <th className="px-4 py-3 text-right font-semibold">
              Net Balance
            </th>{" "}
            <th className="px-4 py-3 text-center font-semibold">Txns</th>{" "}
            <th className="px-4 py-3 font-semibold">Action</th>{" "}
          </tr>{" "}
        </thead>{" "}
        <tbody className="text-[0.7rem]">
          {" "}
          {balances.length === 0 ? (
            <tr>
              {" "}
              <td
                colSpan={8}
                className="px-4 py-8 text-center text-muted-foreground"
              >
                {" "}
                No GL accounts found matching your criteria{" "}
              </td>{" "}
            </tr>
          ) : (
            balances.map((balance) => (
              <tr
                key={balance.code}
                className={cn(
                  "border-t border-border/20 transition hover:bg-surface-variant/40",
                  selectedAccount?.code === balance.code
                    ? "bg-aurum-500/10"
                    : "",
                )}
              >
                {" "}
                <td className="px-4 py-3 font-semibold text-foreground">
                  {" "}
                  {balance.code}{" "}
                </td>{" "}
                <td className="px-4 py-3 text-foreground">{balance.name}</td>{" "}
                <td className="px-4 py-3 text-muted-foreground/80">
                  {" "}
                  {balance.accountType}{" "}
                </td>{" "}
                <td className="px-4 py-3 text-right text-aurum-300">
                  {" "}
                  {formatCurrency(balance.debitBalance)}{" "}
                </td>{" "}
                <td className="px-4 py-3 text-right text-red-300">
                  {" "}
                  {formatCurrency(balance.creditBalance)}{" "}
                </td>{" "}
                <td
                  className={cn(
                    "px-4 py-3 text-right font-semibold",
                    balance.balance >= 0 ? "text-emerald-300" : "text-red-300",
                  )}
                >
                  {" "}
                  {formatCurrency(balance.balance)}{" "}
                </td>{" "}
                <td className="px-4 py-3 text-center text-muted-foreground">
                  {" "}
                  {balance.transactionCount}{" "}
                </td>{" "}
                <td className="px-4 py-3">
                  {" "}
                  <button
                    onClick={() => onSelectAccount(balance)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 transition hover:border-aurum-400/50 hover:bg-surface/60"
                    title="View details"
                  >
                    {" "}
                    <Eye className="h-4 w-4" />{" "}
                  </button>{" "}
                </td>{" "}
              </tr>
            ))
          )}{" "}
        </tbody>{" "}
      </table>{" "}
    </div>
  );
}
interface DrillDownPanelProps {
  account: GLBalance;
  onClose: () => void;
}
function DrillDownPanel({ account, onClose }: DrillDownPanelProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchTransactions();
  }, [account.code]);
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetchWithLucccaSession(
        `/api/aurum/gl/drill-down?accountCode=${account.code}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        },
      );
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
      {" "}
      <div className="flex items-center justify-between gap-4">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-aurum-200">
            {" "}
            Drill-Down{" "}
          </p>{" "}
          <h3 className="mt-1 text-lg font-semibold text-foreground">
            {" "}
            {account.code} - {account.name}{" "}
          </h3>{" "}
        </div>{" "}
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/40 transition hover:bg-surface/60"
        >
          {" "}
          <X className="h-4 w-4" />{" "}
        </button>{" "}
      </div>{" "}
      {loading ? (
        <div className="mt-4 flex justify-center">
          {" "}
          <Loader2 className="h-6 w-6 animate-spin text-aurum-300" />{" "}
        </div>
      ) : (
        <div className="mt-4">
          {" "}
          <div className="overflow-x-auto">
            {" "}
            <table className="w-full min-w-[600px] text-left text-xs text-muted-foreground">
              {" "}
              <thead className="border-b border-border/20 text-[0.65rem] uppercase tracking-[0.25em]">
                {" "}
                <tr>
                  {" "}
                  <th className="px-4 py-2 font-semibold">Date</th>{" "}
                  <th className="px-4 py-2 font-semibold">Reference</th>{" "}
                  <th className="px-4 py-2 font-semibold">Description</th>{" "}
                  <th className="px-4 py-2 text-right font-semibold">Debit</th>{" "}
                  <th className="px-4 py-2 text-right font-semibold">
                    Credit
                  </th>{" "}
                </tr>{" "}
              </thead>{" "}
              <tbody>
                {" "}
                {transactions.length === 0 ? (
                  <tr>
                    {" "}
                    <td
                      colSpan={5}
                      className="px-4 py-4 text-center text-muted-foreground"
                    >
                      {" "}
                      No transactions found{" "}
                    </td>{" "}
                  </tr>
                ) : (
                  transactions.map((txn, idx) => (
                    <tr
                      key={idx}
                      className="border-t border-border/20 transition hover:bg-surface-variant/40"
                    >
                      {" "}
                      <td className="px-4 py-2 text-foreground">
                        {" "}
                        {new Date(
                          txn.date || txn.postedAt,
                        ).toLocaleDateString()}{" "}
                      </td>{" "}
                      <td className="px-4 py-2 text-foreground">
                        {" "}
                        {txn.reference || txn.referenceId || "—"}{" "}
                      </td>{" "}
                      <td className="px-4 py-2 text-muted-foreground/80">
                        {" "}
                        {txn.description || txn.memo || "—"}{" "}
                      </td>{" "}
                      <td className="px-4 py-2 text-right text-aurum-300">
                        {" "}
                        {txn.debit ? formatCurrency(txn.debit) : "—"}{" "}
                      </td>{" "}
                      <td className="px-4 py-2 text-right text-red-300">
                        {" "}
                        {txn.credit ? formatCurrency(txn.credit) : "—"}{" "}
                      </td>{" "}
                    </tr>
                  ))
                )}{" "}
              </tbody>{" "}
            </table>{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
}
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
