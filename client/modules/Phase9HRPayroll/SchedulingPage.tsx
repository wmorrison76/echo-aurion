import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, UploadCloud } from "lucide-react";
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
import { createSchedule, fetchSchedules, publishSchedule } from "./api";
import type { Schedule } from "./types";
import { formatDate } from "./utils";
export default function SchedulingPage(props: { outletId?: string }) {
  const { outletId } = props;
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [open, setOpen] = useState(false);
  const [week, setWeek] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-W${m}${day}`;
  });
  const [newOutletId, setNewOutletId] = useState(outletId || "outlet-1");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSchedules();
      setSchedules(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const visible = useMemo(() => {
    return outletId
      ? schedules.filter((s) => s.outlets.some((o) => o.outletId === outletId))
      : schedules;
  }, [outletId, schedules]);
  const submit = useCallback(async () => {
    setLoading(true);
    try {
      if (!week.trim()) {
        toast.error("Week is required");
        return;
      }
      if (!newOutletId.trim()) {
        toast.error("Outlet ID is required");
        return;
      }
      const res = await createSchedule({
        week: week.trim(),
        status: "draft",
        outlets: [{ outletId: newOutletId.trim(), shifts: [] }],
      });
      toast.success(res.message || "Schedule created");
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [load, newOutletId, week]);
  const publish = useCallback(
    async (scheduleId: string) => {
      setLoading(true);
      try {
        const res = await publishSchedule(scheduleId);
        toast.success(res.message || "Schedule published");
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
          <div className="text-sm font-semibold">Scheduling</div>{" "}
          <div className="text-xs text-muted-foreground">
            {" "}
            Draft schedules and publish for teams.{" "}
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
                <Plus className="h-4 w-4 mr-2" /> New schedule{" "}
              </Button>{" "}
            </DialogTrigger>{" "}
            <DialogContent>
              {" "}
              <DialogHeader>
                {" "}
                <DialogTitle>Create schedule</DialogTitle>{" "}
              </DialogHeader>{" "}
              <div className="grid grid-cols-1 gap-3">
                {" "}
                <div className="space-y-1">
                  {" "}
                  <Label>Week key</Label>{" "}
                  <Input
                    value={week}
                    onChange={(e) => setWeek(e.target.value)}
                  />{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <Label>Outlet ID</Label>{" "}
                  <Input
                    value={newOutletId}
                    onChange={(e) => setNewOutletId(e.target.value)}
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
          <CardTitle className="text-base">Schedules</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent className="px-6 pb-6">
          {" "}
          <Table>
            {" "}
            <TableHeader>
              {" "}
              <TableRow>
                {" "}
                <TableHead>ID</TableHead> <TableHead>Week</TableHead>{" "}
                <TableHead>Status</TableHead> <TableHead>Published</TableHead>{" "}
                <TableHead className="text-right">Actions</TableHead>{" "}
              </TableRow>{" "}
            </TableHeader>{" "}
            <TableBody>
              {" "}
              {visible.map((s) => (
                <TableRow key={s.id}>
                  {" "}
                  <TableCell className="font-medium">{s.id}</TableCell>{" "}
                  <TableCell>{s.week}</TableCell>{" "}
                  <TableCell>
                    {" "}
                    <Badge variant="outline">{s.status}</Badge>{" "}
                  </TableCell>{" "}
                  <TableCell className="text-xs text-muted-foreground">
                    {" "}
                    {formatDate(s.publishedDate)}{" "}
                  </TableCell>{" "}
                  <TableCell className="text-right">
                    {" "}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={loading || s.status !== "draft"}
                      onClick={() => publish(s.id)}
                    >
                      {" "}
                      <UploadCloud className="h-4 w-4 mr-1" /> Publish{" "}
                    </Button>{" "}
                  </TableCell>{" "}
                </TableRow>
              ))}{" "}
              {!loading && visible.length === 0 ? (
                <TableRow>
                  {" "}
                  <TableCell
                    colSpan={5}
                    className="text-sm text-muted-foreground"
                  >
                    {" "}
                    No schedules.{" "}
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
