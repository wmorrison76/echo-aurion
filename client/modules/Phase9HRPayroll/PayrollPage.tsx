import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Cog, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PayrollApprovals from "./PayrollApprovals";
import {
  approvePayroll,
  createPayrollCycle,
  fetchPayrollCycles,
  processPayroll,
} from "./api";
import type { PayrollCycle } from "./types";
import { formatDate, formatMoney } from "./utils";
export default function PayrollPage(props: {
  outletId?: string;
  payrollRunId?: string;
}) {
  const { outletId, payrollRunId } = props;
  const [loading, setLoading] = useState(false);
  const [cycles, setCycles] = useState<PayrollCycle[]>([]);
  const [open, setOpen] = useState(false);
  const [periodStart, setPeriodStart] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [periodEnd, setPeriodEnd] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
  );
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPayrollCycles();
      setCycles(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const sortedCycles = useMemo(() => {
    return [...cycles].sort((a, b) => {
      const ad = new Date(a.periodEnd).getTime();
      const bd = new Date(b.periodEnd).getTime();
      return bd - ad;
    });
  }, [cycles]);
  const create = useCallback(async () => {
    setLoading(true);
    try {
      if (!periodStart || !periodEnd) {
        toast.error("Start and end date are required");
        return;
      }
      if (new Date(periodStart) > new Date(periodEnd)) {
        toast.error("Start date must be before end date");
        return;
      }
      const res = await createPayrollCycle(periodStart, periodEnd);
      toast.success(res.message || "Payroll cycle created");
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [load, periodEnd, periodStart]);
  const runProcess = useCallback(
    async (cycleId: string) => {
      setLoading(true);
      try {
        const res = await processPayroll(cycleId);
        toast.success(res.message || "Payroll processed");
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [load],
  );
  const runApprove = useCallback(
    async (cycleId: string) => {
      setLoading(true);
      try {
        const res = await approvePayroll(cycleId);
        toast.success(res.message || "Payroll approved");
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [load],
  );
  return (
    <div className="p-6 space-y-4">
      {" "}
      <div className="flex items-center justify-between gap-3">
        {" "}
        <div className="min-w-0">
          {" "}
          <div className="text-sm font-semibold">Payroll</div>{" "}
          <div className="text-xs text-muted-foreground">
            {" "}
            Create cycles, process payroll, and approve EchoAurum postings.{" "}
          </div>{" "}
        </div>{" "}
        <div className="flex items-center gap-2">
          {" "}
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {" "}
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />{" "}
            Refresh{" "}
          </Button>{" "}
          <Dialog open={open} onOpenChange={setOpen}>
            {" "}
            <DialogTrigger asChild>
              {" "}
              <Button size="sm">
                {" "}
                <Plus className="h-4 w-4 mr-2" /> New cycle{" "}
              </Button>{" "}
            </DialogTrigger>{" "}
            <DialogContent>
              {" "}
              <DialogHeader>
                {" "}
                <DialogTitle>Create payroll cycle</DialogTitle>{" "}
              </DialogHeader>{" "}
              <div className="grid grid-cols-1 gap-3">
                {" "}
                <div className="space-y-1">
                  {" "}
                  <Label>Period start</Label>{" "}
                  <Input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                  />{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <Label>Period end</Label>{" "}
                  <Input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                  />{" "}
                </div>{" "}
              </div>{" "}
              <DialogFooter>
                {" "}
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  {" "}
                  Cancel{" "}
                </Button>{" "}
                <Button onClick={create} disabled={loading}>
                  {" "}
                  Create{" "}
                </Button>{" "}
              </DialogFooter>{" "}
            </DialogContent>{" "}
          </Dialog>{" "}
        </div>{" "}
      </div>{" "}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {" "}
        <Card>
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-base">Payroll cycles</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent className="px-6 pb-6">
            {" "}
            <Table>
              {" "}
              <TableHeader>
                {" "}
                <TableRow>
                  {" "}
                  <TableHead>Cycle</TableHead> <TableHead>Status</TableHead>{" "}
                  <TableHead>Period</TableHead>{" "}
                  <TableHead className="text-right">Actions</TableHead>{" "}
                </TableRow>{" "}
              </TableHeader>{" "}
              <TableBody>
                {" "}
                {sortedCycles.map((c) => (
                  <TableRow key={c.id}>
                    {" "}
                    <TableCell>
                      {" "}
                      <div className="font-medium">{c.id}</div>{" "}
                      <div className="text-xs text-muted-foreground">
                        {" "}
                        Pay date: {formatDate(c.payDate)}{" "}
                      </div>{" "}
                    </TableCell>{" "}
                    <TableCell>
                      {" "}
                      <Badge variant="outline">{c.status}</Badge>{" "}
                      <div className="text-xs text-muted-foreground mt-1">
                        {" "}
                        Total: {formatMoney(c.totalPayroll)}{" "}
                      </div>{" "}
                    </TableCell>{" "}
                    <TableCell className="text-xs text-muted-foreground">
                      {" "}
                      {formatDate(c.periodStart)} –{" "}
                      {formatDate(c.periodEnd)}{" "}
                    </TableCell>{" "}
                    <TableCell className="text-right">
                      {" "}
                      <div className="flex items-center justify-end gap-2">
                        {" "}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          disabled={loading || c.status !== "draft"}
                          onClick={() => runProcess(c.id)}
                        >
                          {" "}
                          <Cog className="h-4 w-4 mr-1" /> Process{" "}
                        </Button>{" "}
                        <Button
                          size="sm"
                          className="h-8"
                          disabled={loading || c.status !== "processing"}
                          onClick={() => runApprove(c.id)}
                        >
                          {" "}
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Approve{" "}
                        </Button>{" "}
                      </div>{" "}
                    </TableCell>{" "}
                  </TableRow>
                ))}{" "}
                {!loading && sortedCycles.length === 0 ? (
                  <TableRow>
                    {" "}
                    <TableCell
                      colSpan={4}
                      className="text-sm text-muted-foreground"
                    >
                      {" "}
                      No cycles yet.{" "}
                    </TableCell>{" "}
                  </TableRow>
                ) : null}{" "}
              </TableBody>{" "}
            </Table>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <div className="space-y-3">
          {" "}
          <PayrollApprovals
            outletId={outletId}
            payrollRunId={payrollRunId}
          />{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
