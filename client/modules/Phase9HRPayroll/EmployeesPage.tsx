import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Search } from "lucide-react";
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
import { createEmployee, fetchEmployees } from "./api";
import type { Employee, EmploymentType, EmployeeStatus } from "./types";
import { formatDate, formatMoney } from "./utils";
type NewEmployeeForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  outletId: string;
  hireDate: string;
  employmentType: EmploymentType;
  salary: number;
  status: EmployeeStatus;
  certifications: string;
};
const DEFAULT_FORM: NewEmployeeForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  position: "",
  department: "",
  outletId: "outlet-1",
  hireDate: new Date().toISOString().split("T")[0],
  employmentType: "full-time",
  salary: 0,
  status: "active",
  certifications: "",
};
export default function EmployeesPage(props: { outletId?: string }) {
  const { outletId } = props;
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewEmployeeForm>(DEFAULT_FORM);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchEmployees(outletId);
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [outletId]);
  useEffect(() => {
    load();
  }, [load]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => {
      const hay =
        `${e.firstName} ${e.lastName} ${e.email} ${e.position} ${e.department} ${e.outletId}`.toLowerCase();
      return hay.includes(q);
    });
  }, [employees, query]);
  const submit = useCallback(async () => {
    setLoading(true);
    try {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        toast.error("First and last name are required");
        return;
      }
      if (!form.email.trim()) {
        toast.error("Email is required");
        return;
      }
      if (!form.outletId.trim()) {
        toast.error("Outlet ID is required");
        return;
      }
      const payload: Omit<Employee, "id"> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        position: form.position.trim() || "Employee",
        department: form.department.trim() || "General",
        outletId: form.outletId.trim(),
        hireDate: new Date(form.hireDate).toISOString(),
        employmentType: form.employmentType,
        salary: Number.isFinite(form.salary) ? form.salary : 0,
        status: form.status,
        manager: undefined,
        certifications: form.certifications
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const res = await createEmployee(payload);
      toast.success(res.message || "Employee created");
      setOpen(false);
      setForm(DEFAULT_FORM);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [form, load]);
  return (
    <div className="p-6 space-y-4">
      {" "}
      <div className="flex items-center justify-between gap-3">
        {" "}
        <div className="min-w-0">
          {" "}
          <div className="text-sm font-semibold">Employees</div>{" "}
          <div className="text-xs text-muted-foreground">
            {" "}
            {outletId ? `Filtered to outlet: ${outletId}` : "All outlets"}{" "}
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
                <Plus className="h-4 w-4 mr-2" /> New employee{" "}
              </Button>{" "}
            </DialogTrigger>{" "}
            <DialogContent>
              {" "}
              <DialogHeader>
                {" "}
                <DialogTitle>Create employee</DialogTitle>{" "}
              </DialogHeader>{" "}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {" "}
                <div className="space-y-1">
                  {" "}
                  <Label>First name</Label>{" "}
                  <Input
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                  />{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <Label>Last name</Label>{" "}
                  <Input
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                  />{" "}
                </div>{" "}
                <div className="space-y-1 sm:col-span-2">
                  {" "}
                  <Label>Email</Label>{" "}
                  <Input
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    inputMode="email"
                  />{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <Label>Phone</Label>{" "}
                  <Input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <Label>Outlet ID</Label>{" "}
                  <Input
                    value={form.outletId}
                    onChange={(e) =>
                      setForm({ ...form, outletId: e.target.value })
                    }
                  />{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <Label>Position</Label>{" "}
                  <Input
                    value={form.position}
                    onChange={(e) =>
                      setForm({ ...form, position: e.target.value })
                    }
                  />{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <Label>Department</Label>{" "}
                  <Input
                    value={form.department}
                    onChange={(e) =>
                      setForm({ ...form, department: e.target.value })
                    }
                  />{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <Label>Hire date</Label>{" "}
                  <Input
                    type="date"
                    value={form.hireDate}
                    onChange={(e) =>
                      setForm({ ...form, hireDate: e.target.value })
                    }
                  />{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <Label>Annual salary</Label>{" "}
                  <Input
                    type="number"
                    value={String(form.salary)}
                    onChange={(e) =>
                      setForm({ ...form, salary: Number(e.target.value) })
                    }
                  />{" "}
                </div>{" "}
                <div className="space-y-1 sm:col-span-2">
                  {" "}
                  <Label>Certifications (comma-separated)</Label>{" "}
                  <Input
                    value={form.certifications}
                    onChange={(e) =>
                      setForm({ ...form, certifications: e.target.value })
                    }
                    placeholder="ServSafe, TIPS"
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
          <CardTitle className="text-base">Directory</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent className="px-6 pb-6">
          {" "}
          <div className="flex items-center gap-2 mb-4">
            {" "}
            <Search className="h-4 w-4 text-muted-foreground" />{" "}
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, role, department, email…"
            />{" "}
          </div>{" "}
          <Table>
            {" "}
            <TableHeader>
              {" "}
              <TableRow>
                {" "}
                <TableHead>Name</TableHead> <TableHead>Role</TableHead>{" "}
                <TableHead>Outlet</TableHead> <TableHead>Status</TableHead>{" "}
                <TableHead className="text-right">Salary</TableHead>{" "}
              </TableRow>{" "}
            </TableHeader>{" "}
            <TableBody>
              {" "}
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  {" "}
                  <TableCell>
                    {" "}
                    <div className="font-medium">
                      {" "}
                      {e.firstName} {e.lastName}{" "}
                    </div>{" "}
                    <div className="text-xs text-muted-foreground">
                      {" "}
                      {e.email}{" "}
                    </div>{" "}
                  </TableCell>{" "}
                  <TableCell>
                    {" "}
                    <div className="text-sm">{e.position}</div>{" "}
                    <div className="text-xs text-muted-foreground">
                      {" "}
                      {e.department} • Hired {formatDate(e.hireDate)}{" "}
                    </div>{" "}
                  </TableCell>{" "}
                  <TableCell>
                    {" "}
                    <Badge variant="outline">{e.outletId}</Badge>{" "}
                  </TableCell>{" "}
                  <TableCell>
                    {" "}
                    <Badge
                      variant={e.status === "active" ? "default" : "secondary"}
                    >
                      {" "}
                      {e.status}{" "}
                    </Badge>{" "}
                    <div className="text-xs text-muted-foreground mt-1">
                      {" "}
                      {e.employmentType}{" "}
                    </div>{" "}
                  </TableCell>{" "}
                  <TableCell className="text-right">
                    {" "}
                    {formatMoney(e.salary)}{" "}
                  </TableCell>{" "}
                </TableRow>
              ))}{" "}
              {!loading && filtered.length === 0 ? (
                <TableRow>
                  {" "}
                  <TableCell
                    colSpan={5}
                    className="text-sm text-muted-foreground"
                  >
                    {" "}
                    No employees found.{" "}
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
