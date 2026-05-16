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
  createTrainingProgram,
  enrollTraining,
  fetchEmployees,
  fetchTrainingPrograms,
} from "./api";
import type { Employee, TrainingCategory, TrainingProgram } from "./types";
import { formatDate, formatPercent } from "./utils";
type NewProgramForm = {
  name: string;
  category: TrainingCategory;
  duration: number;
  completionRate: number;
  nextScheduled: string;
};
const DEFAULT_FORM: NewProgramForm = {
  name: "",
  category: "safety",
  duration: 60,
  completionRate: 0,
  nextScheduled: new Date().toISOString().split("T")[0],
};
export default function TrainingPage(props: { outletId?: string }) {
  const { outletId } = props;
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewProgramForm>(DEFAULT_FORM);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const eligibleEmployees = useMemo(() => {
    return outletId
      ? employees.filter((e) => e.outletId === outletId)
      : employees;
  }, [employees, outletId]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, e] = await Promise.all([
        fetchTrainingPrograms(),
        fetchEmployees(outletId),
      ]);
      setPrograms(Array.isArray(p) ? p : []);
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
        toast.error("Program name is required");
        return;
      }
      const res = await createTrainingProgram({
        name: form.name.trim(),
        category: form.category,
        duration: form.duration,
        enrollees: [],
        completionRate: form.completionRate,
        nextScheduled: new Date(form.nextScheduled).toISOString(),
      });
      toast.success(res.message || "Training program created");
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
    async (programId: string) => {
      if (!selectedEmployeeId) {
        toast.error("Select an employee to enroll");
        return;
      }
      setLoading(true);
      try {
        const res = await enrollTraining(programId, selectedEmployeeId);
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
          <div className="text-sm font-semibold">Training</div>{" "}
          <div className="text-xs text-muted-foreground">
            {" "}
            Programs, enrollment, certifications.{" "}
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
                <Plus className="h-4 w-4 mr-2" /> New program{" "}
              </Button>{" "}
            </DialogTrigger>{" "}
            <DialogContent>
              {" "}
              <DialogHeader>
                {" "}
                <DialogTitle>Create training program</DialogTitle>{" "}
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
                  <Label>Category</Label>{" "}
                  <Select
                    value={form.category}
                    onValueChange={(value) =>
                      setForm({ ...form, category: value as TrainingCategory })
                    }
                  >
                    {" "}
                    <SelectTrigger>
                      {" "}
                      <SelectValue placeholder="Select category" />{" "}
                    </SelectTrigger>{" "}
                    <SelectContent>
                      {" "}
                      <SelectItem value="safety">safety</SelectItem>{" "}
                      <SelectItem value="product">product</SelectItem>{" "}
                      <SelectItem value="customer-service">
                        {" "}
                        customer-service{" "}
                      </SelectItem>{" "}
                      <SelectItem value="leadership">
                        leadership
                      </SelectItem>{" "}
                    </SelectContent>{" "}
                  </Select>{" "}
                </div>{" "}
                <div className="grid grid-cols-2 gap-3">
                  {" "}
                  <div className="space-y-1">
                    {" "}
                    <Label>Duration (mins)</Label>{" "}
                    <Input
                      type="number"
                      value={String(form.duration)}
                      onChange={(e) =>
                        setForm({ ...form, duration: Number(e.target.value) })
                      }
                    />{" "}
                  </div>{" "}
                  <div className="space-y-1">
                    {" "}
                    <Label>Completion %</Label>{" "}
                    <Input
                      type="number"
                      value={String(form.completionRate)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          completionRate: Number(e.target.value),
                        })
                      }
                    />{" "}
                  </div>{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <Label>Next scheduled</Label>{" "}
                  <Input
                    type="date"
                    value={form.nextScheduled}
                    onChange={(e) =>
                      setForm({ ...form, nextScheduled: e.target.value })
                    }
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
                ? "Type employee ID (e.g., emp-002)"
                : "No employees loaded"
            }
          />{" "}
        </CardContent>{" "}
      </Card>{" "}
      <Card>
        {" "}
        <CardHeader className="pb-2">
          {" "}
          <CardTitle className="text-base">Programs</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent className="px-6 pb-6">
          {" "}
          <Table>
            {" "}
            <TableHeader>
              {" "}
              <TableRow>
                {" "}
                <TableHead>Program</TableHead> <TableHead>Category</TableHead>{" "}
                <TableHead>Schedule</TableHead>{" "}
                <TableHead>Completion</TableHead>{" "}
                <TableHead>Enrollees</TableHead>{" "}
                <TableHead className="text-right">Actions</TableHead>{" "}
              </TableRow>{" "}
            </TableHeader>{" "}
            <TableBody>
              {" "}
              {programs.map((p) => (
                <TableRow key={p.id}>
                  {" "}
                  <TableCell>
                    {" "}
                    <div className="font-medium">{p.name}</div>{" "}
                    <div className="text-xs text-muted-foreground">
                      {" "}
                      Duration: {p.duration} mins{" "}
                    </div>{" "}
                  </TableCell>{" "}
                  <TableCell>
                    {" "}
                    <Badge variant="outline">{p.category}</Badge>{" "}
                  </TableCell>{" "}
                  <TableCell className="text-xs text-muted-foreground">
                    {" "}
                    {formatDate(p.nextScheduled)}{" "}
                  </TableCell>{" "}
                  <TableCell>{formatPercent(p.completionRate)}</TableCell>{" "}
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
              {!loading && programs.length === 0 ? (
                <TableRow>
                  {" "}
                  <TableCell
                    colSpan={6}
                    className="text-sm text-muted-foreground"
                  >
                    {" "}
                    No programs yet.{" "}
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
