import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DayKey, EmployeeRow } from "@/lib/schedule";
import { loadStandards, requiredFor } from "@/lib/standards";

function dayKeys(weekStartISO: string) {
  const keys: DayKey[] = [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
  ] as any;
  return keys.map((k, i) => {
    const d = new Date(weekStartISO);
    d.setDate(d.getDate() + i);
    return {
      key: k,
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
    };
  });
}

export default function ScheduleChecker({
  employees,
  weekStartISO,
}: {
  employees: EmployeeRow[];
  weekStartISO: string;
}) {
  const headers = useMemo(() => dayKeys(weekStartISO), [weekStartISO]);
  const outlet =
    typeof window !== "undefined"
      ? localStorage.getItem("shiftflow:outlet") || "Main"
      : "Main";
  const dept =
    typeof window !== "undefined"
      ? localStorage.getItem("shiftflow:lms:dept") || "BOH"
      : "BOH";
  const std = loadStandards(outlet, dept);
  const positions = Object.keys(std);
  const forecast = useMemo(() => {
    try {
      const s = localStorage.getItem(`shiftflow:forecast:${weekStartISO}`);
      return s ? JSON.parse(s) : {};
    } catch {
      return {};
    }
  }, [weekStartISO]);
  const coversFor = (k: DayKey) => {
    const f = (forecast as any)[k] || {};
    const a = Number(f.breakfast || 0) || 0;
    const b = Number(f.lunch || 0) || 0;
    return a + b;
  };
  const schedCount = (pos: string, k: DayKey) =>
    employees.reduce(
      (n, e) =>
        n +
        (((e.shifts as any)[k]?.position || "").toLowerCase() ===
        pos.toLowerCase()
          ? 1
          : 0),
      0,
    );

  return (
    <div className="overflow-auto max-h-[70vh]">
      <div className="text-sm text-muted-foreground mb-2">
        Compares scheduled headcount per position with required counts derived
        from labor standards and daily covers.
      </div>
      <Table className="text-[12px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">Position</TableHead>
            {headers.map((h) => (
              <TableHead key={h.key} className="text-center">
                {h.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((pos) => (
            <TableRow key={pos}>
              <TableCell className="font-medium">{pos}</TableCell>
              {headers.map((h) => {
                const cov = coversFor(h.key);
                const need = requiredFor(pos, cov, std);
                const have = schedCount(pos, h.key);
                const diff = have - need;
                const cls =
                  diff < 0
                    ? "bg-red-500/20"
                    : diff > 0
                      ? "bg-yellow-500/20"
                      : "bg-green-500/20";
                return (
                  <TableCell key={h.key} className={`text-center ${cls}`}>
                    {have}/{need}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-2 text-xs text-muted-foreground">
        Legend: red=need more, yellow=too many, green=meets. Based on
        breakfast+lunch covers.
      </div>
    </div>
  );
}
