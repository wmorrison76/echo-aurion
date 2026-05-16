import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Upload, FileSpreadsheet, Pencil } from "lucide-react";
import { GL_ACCOUNTS } from "@shared/gl-accounts";
import { MONTHS, type MonthKey } from "@shared/accounting-types";
import {
  accountAnnualTotal,
  buildPnL,
  comparePnL,
  exportBudgetToCSV,
  getInvoices,
  getOrCreateBudget,
  importInvoicesCSV,
  listAvailableBudgets,
  listYearsWithInvoices,
  saveBudget,
  saveInvoices,
  setAccountAllMonths,
} from "@/lib/budget-utils";
import { useToast } from "@/hooks/use-toast";
export default function BudgetPlanner() {
  const { toast } = useToast();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [compare1, setCompare1] = useState<number | undefined>();
  const [compare2, setCompare2] = useState<number | undefined>();
  const [filter, setFilter] = useState<string>("");
  const budget = useMemo(() => getOrCreateBudget(year), [year]);
  const availableYears = useMemo(
    () => listAvailableBudgets(),
    [year, budget.updatedAt],
  );
  const invoices = useMemo(() => getInvoices(year), [year]);
  const filteredAccounts = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return GL_ACCOUNTS;
    return GL_ACCOUNTS.filter(
      (a) =>
        a.code.includes(f) ||
        a.name.toLowerCase().includes(f) ||
        a.department.toLowerCase().includes(f) ||
        a.section.toLowerCase().includes(f),
    );
  }, [filter]);
  const pnlBase = useMemo(() => buildPnL(year), [year, budget.updatedAt]);
  const pnlCompare = useMemo(
    () => comparePnL(year, [compare1!, compare2!].filter(Boolean) as number[]),
    [year, compare1, compare2, budget.updatedAt],
  );
  const handleExport = () => {
    const csv = exportBudgetToCSV(year);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `budget-${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const handleImportInvoices = async (file: File) => {
    const text = await file.text();
    const rows = importInvoicesCSV(year, text);
    toast({ title: `Imported ${rows.length} invoices for ${year}` });
  };
  const updateAllMonths = (glCode: string, annual: number) => {
    const evenly = Math.round((annual / 12) * 100) / 100;
    const v: Partial<Record<MonthKey, number>> = {};
    for (const m of MONTHS) v[m] = evenly;
    setAccountAllMonths(year, glCode, v);
    toast({
      title: `${glCode} set evenly across months`,
      description: `$${evenly.toFixed(2)} per month`,
    });
  };
  const setMonthValue = (glCode: string, month: MonthKey, value: number) => {
    const b = getOrCreateBudget(year);
    const line = b.lines.find((l) => l.accountCode === glCode);
    if (!line) return;
    line.amounts[month] = value;
    saveBudget(b);
  };
  return (
    <Card className="glass-panel">
      {" "}
      <CardHeader className="flex flex-col gap-3">
        {" "}
        <div className="flex items-center justify-between gap-4">
          {" "}
          <CardTitle className="text-2xl">
            Fiscal Year Budget Planner
          </CardTitle>{" "}
          <div className="flex items-center gap-2">
            {" "}
            <Button variant="outline" size="sm" onClick={handleExport}>
              {" "}
              <Download className="h-4 w-4 mr-2" /> Export CSV{" "}
            </Button>{" "}
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              {" "}
              <Upload className="h-4 w-4" /> Import Invoices CSV{" "}
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) =>
                  e.target.files && handleImportInvoices(e.target.files[0])
                }
              />{" "}
            </label>{" "}
          </div>{" "}
        </div>{" "}
        <div className="flex flex-wrap items-center gap-3">
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <Label>Year</Label>{" "}
            <Select
              value={String(year)}
              onValueChange={(v) => setYear(parseInt(v))}
            >
              {" "}
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>{" "}
              <SelectContent>
                {" "}
                {Array.from({ length: 8 }).map((_, i) => {
                  const y = new Date().getFullYear() - 3 + i;
                  return (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  );
                })}{" "}
              </SelectContent>{" "}
            </Select>{" "}
          </div>{" "}
          <div className="flex items-center gap-2">
            {" "}
            <Label>Compare</Label>{" "}
            <Select
              value={compare1 ? String(compare1) : ""}
              onValueChange={(v) => setCompare1(v ? parseInt(v) : undefined)}
            >
              {" "}
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Year" />
              </SelectTrigger>{" "}
              <SelectContent>
                {" "}
                {availableYears
                  .filter((y) => y !== year)
                  .map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}{" "}
              </SelectContent>{" "}
            </Select>{" "}
            <Select
              value={compare2 ? String(compare2) : ""}
              onValueChange={(v) => setCompare2(v ? parseInt(v) : undefined)}
            >
              {" "}
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Year" />
              </SelectTrigger>{" "}
              <SelectContent>
                {" "}
                {availableYears
                  .filter((y) => y !== year)
                  .map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}{" "}
              </SelectContent>{" "}
            </Select>{" "}
          </div>{" "}
          <div className="ml-auto flex items-center gap-2">
            {" "}
            <Input
              placeholder="Search GL code, name, section..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-80"
            />{" "}
          </div>{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent>
        {" "}
        <Tabs defaultValue="budget">
          {" "}
          <TabsList className="grid grid-cols-5 gap-2">
            {" "}
            <TabsTrigger value="budget">Budget</TabsTrigger>{" "}
            <TabsTrigger value="pnl">P&L</TabsTrigger>{" "}
            <TabsTrigger value="invoices">Invoices</TabsTrigger>{" "}
            <TabsTrigger value="events">Events</TabsTrigger>{" "}
            <TabsTrigger value="coa">Chart of Accounts</TabsTrigger>{" "}
          </TabsList>{" "}
          <TabsContent value="budget" className="mt-6">
            {" "}
            <ScrollArea className="h-[60vh] pr-4">
              {" "}
              <Table>
                {" "}
                <TableHeader>
                  {" "}
                  <TableRow>
                    {" "}
                    <TableHead className="w-28">GL Code</TableHead>{" "}
                    <TableHead>Name</TableHead> <TableHead>Section</TableHead>{" "}
                    <TableHead>Department</TableHead>{" "}
                    {MONTHS.map((m) => (
                      <TableHead key={m} className="text-right uppercase">
                        {m}
                      </TableHead>
                    ))}{" "}
                    <TableHead className="text-right">Annual</TableHead>{" "}
                    <TableHead className="text-right">Actions</TableHead>{" "}
                  </TableRow>{" "}
                </TableHeader>{" "}
                <TableBody>
                  {" "}
                  {filteredAccounts.map((acc) => {
                    const line = budget.lines.find(
                      (l) => l.accountCode === acc.code,
                    )!;
                    const annual = accountAnnualTotal(line);
                    return (
                      <TableRow key={acc.code}>
                        {" "}
                        <TableCell>
                          <Badge variant="secondary">{acc.code}</Badge>
                        </TableCell>{" "}
                        <TableCell>{acc.name}</TableCell>{" "}
                        <TableCell>{acc.section}</TableCell>{" "}
                        <TableCell>{acc.department}</TableCell>{" "}
                        {MONTHS.map((m) => (
                          <TableCell key={m} className="text-right">
                            {" "}
                            <Input
                              inputMode="decimal"
                              className="w-24 text-right"
                              value={line.amounts[m] ?? 0}
                              onChange={(e) =>
                                setMonthValue(
                                  acc.code,
                                  m,
                                  parseFloat(e.target.value || "0"),
                                )
                              }
                            />{" "}
                          </TableCell>
                        ))}{" "}
                        <TableCell className="text-right font-medium">
                          ${annual.toLocaleString()}
                        </TableCell>{" "}
                        <TableCell className="text-right">
                          {" "}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateAllMonths(acc.code, annual)}
                          >
                            {" "}
                            <Pencil className="h-4 w-4 mr-1" /> Even Split{" "}
                          </Button>{" "}
                        </TableCell>{" "}
                      </TableRow>
                    );
                  })}{" "}
                </TableBody>{" "}
              </Table>{" "}
            </ScrollArea>{" "}
          </TabsContent>{" "}
          <TabsContent value="pnl" className="mt-6">
            {" "}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {" "}
              <Card>
                {" "}
                <CardHeader>
                  <CardTitle>{year} P&L Summary</CardTitle>
                </CardHeader>{" "}
                <CardContent>
                  {" "}
                  <Table>
                    {" "}
                    <TableBody>
                      {" "}
                      {pnlBase.rows.map((r) => (
                        <TableRow key={r.label}>
                          {" "}
                          <TableCell>{r.label}</TableCell>{" "}
                          <TableCell className="text-right">
                            ${r.amount.toLocaleString()}
                          </TableCell>{" "}
                        </TableRow>
                      ))}{" "}
                    </TableBody>{" "}
                  </Table>{" "}
                </CardContent>{" "}
              </Card>{" "}
              {pnlCompare.comparisons.map((c) => (
                <Card key={c.year}>
                  {" "}
                  <CardHeader>
                    <CardTitle>Compare {c.year}</CardTitle>
                  </CardHeader>{" "}
                  <CardContent>
                    {" "}
                    <div className="space-y-2">
                      {" "}
                      <div className="flex items-center justify-between">
                        {" "}
                        <span>NOI Variance</span>{" "}
                        <span
                          className={
                            c.variance >= 0 ? "text-green-600" : "text-red-600"
                          }
                        >
                          {" "}
                          ${c.variance.toLocaleString()} (
                          {(c.variancePct * 100).toFixed(1)}%){" "}
                        </span>{" "}
                      </div>{" "}
                    </div>{" "}
                  </CardContent>{" "}
                </Card>
              ))}{" "}
              <Card>
                {" "}
                <CardHeader>
                  <CardTitle>Data Coverage</CardTitle>
                </CardHeader>{" "}
                <CardContent>
                  {" "}
                  <div className="text-sm text-muted-foreground space-y-1">
                    {" "}
                    <div>Budgets stored: {availableYears.length}</div>{" "}
                    <div>
                      Invoices on file:{" "}
                      {listYearsWithInvoices().length > 0 ? "Yes" : "No"}
                    </div>{" "}
                  </div>{" "}
                </CardContent>{" "}
              </Card>{" "}
            </div>{" "}
          </TabsContent>{" "}
          <TabsContent value="invoices" className="mt-6">
            {" "}
            <Card>
              {" "}
              <CardHeader>
                <CardTitle>Invoices ({year})</CardTitle>
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="overflow-auto">
                  {" "}
                  <Table>
                    {" "}
                    <TableHeader>
                      {" "}
                      <TableRow>
                        {" "}
                        <TableHead>Date</TableHead>{" "}
                        <TableHead>Vendor</TableHead>{" "}
                        <TableHead>Description</TableHead>{" "}
                        <TableHead className="w-28">GL Code</TableHead>{" "}
                        <TableHead className="text-right">
                          Amount
                        </TableHead>{" "}
                      </TableRow>{" "}
                    </TableHeader>{" "}
                    <TableBody>
                      {" "}
                      {invoices.map((inv) => (
                        <TableRow key={inv.id}>
                          {" "}
                          <TableCell>{inv.date}</TableCell>{" "}
                          <TableCell>{inv.vendor}</TableCell>{" "}
                          <TableCell>{inv.description}</TableCell>{" "}
                          <TableCell>
                            <Badge variant="outline">{inv.glCode}</Badge>
                          </TableCell>{" "}
                          <TableCell className="text-right">
                            ${inv.amount.toLocaleString()}
                          </TableCell>{" "}
                        </TableRow>
                      ))}{" "}
                    </TableBody>{" "}
                  </Table>{" "}
                </div>{" "}
              </CardContent>{" "}
            </Card>{" "}
          </TabsContent>{" "}
          <TabsContent value="events" className="mt-6">
            {" "}
            <Card>
              {" "}
              <CardHeader>
                <CardTitle>Planned Events ({year})</CardTitle>
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <p className="text-sm text-muted-foreground">
                  {" "}
                  Add planned events and tie revenue/COGS to GL codes via the
                  Budget tab. Event planning data from other app modules is
                  reflected here through GL allocations.{" "}
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
          </TabsContent>{" "}
          <TabsContent value="coa" className="mt-6">
            {" "}
            <Accordion type="multiple">
              {" "}
              {[
                "Revenue",
                "Departmental",
                "Undistributed",
                "Non-Operating/Fixed",
                "Balance Sheet",
              ].map((group) => (
                <AccordionItem key={group} value={group}>
                  {" "}
                  <AccordionTrigger className="text-left">
                    {group}
                  </AccordionTrigger>{" "}
                  <AccordionContent>
                    {" "}
                    <ScrollArea className="h-80 pr-4">
                      {" "}
                      <Table>
                        {" "}
                        <TableHeader>
                          {" "}
                          <TableRow>
                            {" "}
                            <TableHead className="w-28">GL Code</TableHead>{" "}
                            <TableHead>Name</TableHead>{" "}
                            <TableHead>Department</TableHead>{" "}
                            <TableHead>Type</TableHead>{" "}
                            <TableHead>USALI</TableHead>{" "}
                            <TableHead>Scope</TableHead>{" "}
                          </TableRow>{" "}
                        </TableHeader>{" "}
                        <TableBody>
                          {" "}
                          {GL_ACCOUNTS.filter((a) => a.section === group).map(
                            (a) => (
                              <TableRow key={a.code}>
                                {" "}
                                <TableCell>
                                  <Badge variant="secondary">{a.code}</Badge>
                                </TableCell>{" "}
                                <TableCell>{a.name}</TableCell>{" "}
                                <TableCell>{a.department}</TableCell>{" "}
                                <TableCell>{a.type}</TableCell>{" "}
                                <TableCell>{a.usaliRef}</TableCell>{" "}
                                <TableCell>{a.scope}</TableCell>{" "}
                              </TableRow>
                            ),
                          )}{" "}
                        </TableBody>{" "}
                      </Table>{" "}
                    </ScrollArea>{" "}
                  </AccordionContent>{" "}
                </AccordionItem>
              ))}{" "}
            </Accordion>{" "}
          </TabsContent>{" "}
        </Tabs>{" "}
      </CardContent>{" "}
    </Card>
  );
}
