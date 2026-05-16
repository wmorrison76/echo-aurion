import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createBenefitPlan,
  enrollBenefit,
  fetchBenefitPlans,
  fetchEmployees,
} from "./api";
import type { BenefitPlan, BenefitPlanType, Employee } from "./types";
import { formatMoney } from "./utils";
type NewPlanForm = {
  name: string;
  type: BenefitPlanType;
  provider: string;
  coverage: string;
  employeeContribution: number;
  employerContribution: number;
};
const DEFAULT_FORM: NewPlanForm = {
  name: "",
  type: "health",
  provider: "",
  coverage: "",
  employeeContribution: 0,
  employerContribution: 0,
};
export default function BenefitsPage(props: { outletId?: string }) {
  const { outletId } = props;
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<BenefitPlan[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewPlanForm>(DEFAULT_FORM);
  const eligibleEmployees = useMemo(() => {
    return outletId
      ? employees.filter((e) => e.outletId === outletId)
      : employees;
  }, [employees, outletId]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, e] = await Promise.all([
        fetchBenefitPlans(),
        fetchEmployees(outletId),
      ]);
      setPlans(Array.isArray(p) ? p : []);
      setEmployees(Array.isArray(e) ? e : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [outletId]);
  useEffect(() => {
    load();
  }, [load]);
  const submit = useCallback(async () => {
    setLoading(true);
    try {
      if (!form.name.trim()) {
        toast.error("Plan name is required");
        return;
      }
      const res = await createBenefitPlan({
        name: form.name.trim(),
        type: form.type,
        provider: form.provider.trim() || "Provider",
        coverage: form.coverage.trim() || "Standard",
        employeeContribution: form.employeeContribution,
        employerContribution: form.employerContribution,
        enrollees: [],
      });
      toast.success(res.message || "Benefit plan created");
      setOpen(false);
      setForm(DEFAULT_FORM);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [form, load]);
  const enroll = useCallback(
    async (planId: string) => {
      if (!selectedEmployeeId) {
        toast.error("Select an employee to enroll");
        return;
      }
      setLoading(true);
      try {
        const res = await enrollBenefit(planId, selectedEmployeeId);
        toast.success(res.message || "Enrolled");
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [load, selectedEmployeeId],
  );
  return (
    <div className="p-6 space-y-4">
      {" "}
      <div className="flex items-center justify-between gap-3">
        {" "}
        <div className="min-w-0">
          {" "}
          <div className="text-sm font-semibold">Benefits</div>{" "}
          <div className="text-xs text-muted-foreground">
            {" "}
            Plans, costs, enrollment.{" "}
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
                <Plus className="h-4 w-4 mr-2" /> New plan{" "}
              </Button>{" "}
            </DialogTrigger>{" "}
            <DialogContent>
              {" "}
              <DialogHeader>
                {" "}
                <DialogTitle>Create benefit plan</DialogTitle>{" "}
              </DialogHeader>{" "}
              <div className="grid grid-cols-1 gap-3">
                {" "}
                <div className="space-y-1">
                  {" "}
                  <Label>Name</Label>{" "}
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <Label>Type</Label>{" "}
                  <Select
                    value={form.type}
                    onValueChange={(value) =>
                      setForm({ ...form, type: value as BenefitPlanType })
                    }
                  >
                    {" "}
                    <SelectTrigger>
                      {" "}
                      <SelectValue placeholder="Select type" />{" "}
                    </SelectTrigger>{" "}
                    <SelectContent>
                      {" "}
                      <SelectItem value="health">health</SelectItem>{" "}
                      <SelectItem value="dental">dental</SelectItem>{" "}
                      <SelectItem value="vision">vision</SelectItem>{" "}
                      <SelectItem value="retirement">retirement</SelectItem>{" "}
                      <SelectItem value="pto">pto</SelectItem>{" "}
                    </SelectContent>{" "}
                  </Select>{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <Label>Provider</Label>{" "}
                  <Input
                    value={form.provider}
                    onChange={(e) =>
                      setForm({ ...form, provider: e.target.value })
                    }
                  />{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <Label>Coverage</Label>{" "}
                  <Input
                    value={form.coverage}
                    onChange={(e) =>
                      setForm({ ...form, coverage: e.target.value })
                    }
                  />{" "}
                </div>{" "}
                <div className="grid grid-cols-2 gap-3">
                  {" "}
                  <div className="space-y-1">
                    {" "}
                    <Label>Employee $</Label>{" "}
                    <Input
                      type="number"
                      value={String(form.employeeContribution)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          employeeContribution: Number(e.target.value),
                        })
                      }
                    />{" "}
                  </div>{" "}
                  <div className="space-y-1">
                    {" "}
                    <Label>Employer $</Label>{" "}
                    <Input
                      type="number"
                      value={String(form.employerContribution)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          employerContribution: Number(e.target.value),
                        })
                      }
                    />{" "}
                  </div>{" "}
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
                <Button onClick={submit} disabled={loading}>
                  {" "}
                  Create{" "}
                </Button>{" "}
              </DialogFooter>{" "}
            </DialogContent>{" "}
          </Dialog>{" "}
        </div>{" "}
      </div>{" "}
      <Card>
        {" "}
        <CardHeader className="pb-2">
          {" "}
          <CardTitle className="text-base">Enrollment</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent className="px-6 pb-6">
          {" "}
          <div className="text-xs text-muted-foreground mb-2">
            {" "}
            Select employee (used by"Enroll" buttons):{" "}
          </div>{" "}
          <Input
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            placeholder={
              eligibleEmployees.length
                ? "Type employee ID (e.g., emp-001)"
                : "No employees loaded"
            }
          />{" "}
        </CardContent>{" "}
      </Card>{" "}
      <Card>
        {" "}
        <CardHeader className="pb-2">
          {" "}
          <CardTitle className="text-base">Plans</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent className="px-6 pb-6">
          {" "}
          <Table>
            {" "}
            <TableHeader>
              {" "}
              <TableRow>
                {" "}
                <TableHead>Plan</TableHead> <TableHead>Type</TableHead>{" "}
                <TableHead>Contributions</TableHead>{" "}
                <TableHead>Enrollees</TableHead>{" "}
                <TableHead className="text-right">Actions</TableHead>{" "}
              </TableRow>{" "}
            </TableHeader>{" "}
            <TableBody>
              {" "}
              {plans.map((p) => (
                <TableRow key={p.id}>
                  {" "}
                  <TableCell>
                    {" "}
                    <div className="font-medium">{p.name}</div>{" "}
                    <div className="text-xs text-muted-foreground">
                      {" "}
                      {p.provider} • {p.coverage}{" "}
                    </div>{" "}
                  </TableCell>{" "}
                  <TableCell>
                    {" "}
                    <Badge variant="outline">{p.type}</Badge>{" "}
                  </TableCell>{" "}
                  <TableCell className="text-xs text-muted-foreground">
                    {" "}
                    Employee: {formatMoney(p.employeeContribution)} / Employer:
                    {""} {formatMoney(p.employerContribution)}{" "}
                  </TableCell>{" "}
                  <TableCell>{p.enrollees.length}</TableCell>{" "}
                  <TableCell className="text-right">
                    {" "}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={loading}
                      onClick={() => enroll(p.id)}
                    >
                      {" "}
                      Enroll{" "}
                    </Button>{" "}
                  </TableCell>{" "}
                </TableRow>
              ))}{" "}
              {!loading && plans.length === 0 ? (
                <TableRow>
                  {" "}
                  <TableCell
                    colSpan={5}
                    className="text-sm text-muted-foreground"
                  >
                    {" "}
                    No plans yet.{" "}
                  </TableCell>{" "}
                </TableRow>
              ) : null}{" "}
            </TableBody>{" "}
          </Table>{" "}
        </CardContent>{" "}
      </Card>{" "}
    </div>
  );
}
