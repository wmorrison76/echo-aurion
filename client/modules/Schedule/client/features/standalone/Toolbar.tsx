import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Settings,
  Users,
  Shield,
  Send,
  Copy,
} from "lucide-react";

import { appendAudit } from "../../lib/compliance";
import type { DayKey, EmployeeRow } from "../../lib/schedule";
import {
  createEmptyShifts,
  newEmployee,
  parseTimeRange,
} from "../../lib/schedule";
import { loadSettings, saveSettings, type ScheduleSettings } from "./settings";

interface Props {
  weekStartISO: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onPickDate: (iso: string) => void;
  employees: EmployeeRow[];
  onEmployeesChange: (next: EmployeeRow[]) => void;
  onOpenOnboarding?: () => void;
}

export default function Toolbar({
  weekStartISO,
  onPrev,
  onNext,
  onToday,
  onPickDate,
  employees,
  onEmployeesChange,
  onOpenOnboarding,
}: Props) {
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [personnelOpen, setPersonnelOpen] = React.useState(false);
  const [sendOpen, setSendOpen] = React.useState(false);
  const [copyOpen, setCopyOpen] = React.useState(false);
  const [managerCredsOpen, setManagerCredsOpen] = React.useState(false);

  const settings = React.useMemo(() => loadSettings(), [settingsOpen]);

  return (
    <div
      className="flex items-center gap-1 overflow-x-auto"
      onWheel={(e) => {
        if (Math.abs(e.deltaY) > 20) (e.deltaY > 0 ? onNext : onPrev)();
      }}
    >
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onPrev}
          aria-label="Prev week"
        >
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="sm" onClick={onToday}>
          <CalendarDays className="mr-1 h-4 w-4" />
          Today
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onNext}
          aria-label="Next week"
        >
          <ChevronRight />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              {weekStartISO}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0">
            <Calendar
              mode="single"
              selected={new Date(weekStartISO)}
              onSelect={(d) => d && onPickDate(d.toISOString().slice(0, 10))}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-1 ml-1">
        <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Copy className="mr-1 h-4 w-4" />
              Copy Week
            </Button>
          </DialogTrigger>
          <CopyWeekDialog
            weekStartISO={weekStartISO}
            employees={employees}
            onEmployeesChange={onEmployeesChange}
            onClose={() => setCopyOpen(false)}
          />
        </Dialog>

        <ImportDialog
          employees={employees}
          onEmployeesChange={onEmployeesChange}
        />

        <Dialog
          open={sendOpen}
          onOpenChange={(v) => {
            setSendOpen(v);
            if (v) {
              appendAudit(weekStartISO, {
                ts: Date.now(),
                type: "publish",
                meta: {},
              });
              localStorage.setItem(
                `shiftflow:publishedAt:${weekStartISO}`,
                String(Date.now()),
              );
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="hidden">
              <Send className="mr-1 h-4 w-4" />
              Publish
            </Button>
          </DialogTrigger>
          <SendDialog weekStartISO={weekStartISO} />
        </Dialog>

        <Dialog open={personnelOpen} onOpenChange={setPersonnelOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Users className="mr-1 h-4 w-4" />
              Personnel
            </Button>
          </DialogTrigger>
          <PersonnelDialog
            employees={employees}
            onEmployeesChange={onEmployeesChange}
          />
        </Dialog>

        <Dialog open={managerCredsOpen} onOpenChange={setManagerCredsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Shield className="mr-1 h-4 w-4" />
              Manager Login
            </Button>
          </DialogTrigger>
          <ManagerCredentialsDialog />
        </Dialog>

        {onOpenOnboarding ? (
          <Button variant="outline" size="sm" onClick={onOpenOnboarding}>
            Onboarding
          </Button>
        ) : null}

        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="mr-1 h-4 w-4" />
              Policies
            </Button>
          </DialogTrigger>
          <SettingsDialog settings={settings} onSave={saveSettings} />
        </Dialog>
      </div>
    </div>
  );
}

function SettingsDialog({
  settings,
  onSave,
}: {
  settings: ScheduleSettings;
  onSave: (s: ScheduleSettings) => void;
}) {
  const [s, setS] = React.useState(settings);
  const [saved, setSaved] = React.useState(false);

  const handleChange = (updates: Partial<ScheduleSettings>) => {
    const updated = { ...s, ...updates };
    setS(updated);
    onSave(updated);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Policies & Settings</DialogTitle>
        {saved ? <p className="text-xs text-green-600 mt-1">✓ Saved</p> : null}
      </DialogHeader>

      <div className="grid gap-4 max-h-[70vh] overflow-y-auto">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Labor Policies</h3>
          <label className="text-sm block">
            Overtime threshold (hours/week)
            <Input
              type="number"
              value={s.overtimeThreshold}
              onChange={(e) =>
                handleChange({ overtimeThreshold: Number(e.target.value) })
              }
              className="mt-1"
            />
          </label>
          <label className="text-sm block">
            Default hourly rate ($)
            <Input
              type="number"
              step="0.01"
              value={s.hourlyDefaultRate}
              onChange={(e) =>
                handleChange({ hourlyDefaultRate: Number(e.target.value) })
              }
              className="mt-1"
            />
          </label>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Budget & Sales</h3>
          <label className="text-sm block">
            Weekly budget ($)
            <Input
              type="number"
              value={s.weeklyBudget}
              onChange={(e) =>
                handleChange({ weeklyBudget: Number(e.target.value) })
              }
              className="mt-1"
            />
          </label>
          <label className="text-sm block">
            Weekly sales ($)
            <Input
              type="number"
              value={s.weeklySales}
              onChange={(e) =>
                handleChange({ weeklySales: Number(e.target.value) })
              }
              className="mt-1"
            />
          </label>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Payroll</h3>
          <label className="text-sm block">
            Pay period
            <select
              value={s.payPeriod}
              onChange={(e) =>
                handleChange({ payPeriod: e.target.value as any })
              }
              className="w-full h-9 rounded-md border bg-background px-2 text-sm mt-1"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="semi_monthly">Semi-monthly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <label className="text-sm block">
            Pay period anchor date
            <Input
              type="date"
              value={s.payPeriodAnchor}
              onChange={(e) =>
                handleChange({ payPeriodAnchor: e.target.value })
              }
              className="mt-1"
            />
          </label>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Display</h3>
          <label className="text-sm inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={s.timeFormat24h}
              onChange={(e) =>
                handleChange({ timeFormat24h: e.target.checked })
              }
            />
            Use 24-hour time format
          </label>
          <label className="text-sm block">
            Week starts on
            <select
              value={s.startDay}
              onChange={(e) =>
                handleChange({ startDay: Number(e.target.value) as any })
              }
              className="w-full h-9 rounded-md border bg-background px-2 text-sm mt-1"
            >
              <option value={0}>Sunday</option>
              <option value={1}>Monday</option>
              <option value={2}>Tuesday</option>
              <option value={3}>Wednesday</option>
              <option value={4}>Thursday</option>
              <option value={5}>Friday</option>
              <option value={6}>Saturday</option>
            </select>
          </label>
        </div>
      </div>
    </DialogContent>
  );
}

function PersonnelDialog({
  employees,
  onEmployeesChange,
}: {
  employees: EmployeeRow[];
  onEmployeesChange: (e: EmployeeRow[]) => void;
}) {
  const [list, setList] = React.useState(employees);
  const [quickAdd, setQuickAdd] = React.useState("");

  React.useEffect(() => setList(employees), [employees]);

  const update = (idx: number, patch: Partial<EmployeeRow>) => {
    const updated = list.map((e, i) => (i === idx ? { ...e, ...patch } : e));
    setList(updated);
    onEmployeesChange(updated);
  };

  const handleQuickAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && quickAdd.trim()) {
      const newEmp = newEmployee(quickAdd.trim());
      const updated = [...list, newEmp];
      setList(updated);
      onEmployeesChange(updated);
      setQuickAdd("");
    }
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Personnel Management</DialogTitle>
      </DialogHeader>
      <div className="mb-4">
        <Input
          placeholder="Quick add: Type name and press Enter"
          value={quickAdd}
          onChange={(e) => setQuickAdd(e.target.value)}
          onKeyDown={handleQuickAdd}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Press Enter to add employee
        </p>
      </div>

      <div className="grid gap-3 max-h-[60vh] overflow-y-auto">
        {list.map((e, i) => (
          <div
            key={e.id}
            className="grid grid-cols-12 gap-2 items-center p-2 border rounded-md hover:bg-muted/50"
          >
            <Input
              className="col-span-4"
              value={e.name}
              onChange={(ev) => update(i, { name: ev.target.value })}
              placeholder="Name"
            />
            <Input
              className="col-span-3"
              placeholder="Role"
              value={e.role ?? ""}
              onChange={(ev) => update(i, { role: ev.target.value })}
            />
            <Input
              className="col-span-2"
              type="number"
              placeholder="Rate"
              value={(e.rate ?? "") as any}
              onChange={(ev) => update(i, { rate: Number(ev.target.value) })}
            />
            <div className="col-span-2 text-xs text-muted-foreground">
              {typeof e.rate === "number"
                ? `$${e.rate.toFixed(2)}/h`
                : "No rate"}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const updated = list.filter((_, idx) => idx !== i);
                setList(updated);
                onEmployeesChange(updated);
              }}
            >
              Remove
            </Button>
          </div>
        ))}

        {list.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No employees yet.
          </div>
        ) : null}
      </div>
    </DialogContent>
  );
}

function SendDialog({ weekStartISO }: { weekStartISO: string }) {
  const subject = `Schedule for week ${weekStartISO}`;
  const body = `Hi team,\n\nThe schedule for week ${weekStartISO} is ready.\nPlease check the portal for details.`;
  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Publish / Send</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">
        Open your email client with a prefilled message.
      </p>
      <a
        href={mailto}
        className="underline text-primary"
        target="_blank"
        rel="noreferrer"
      >
        Open email
      </a>
    </DialogContent>
  );
}

function CopyWeekDialog({
  weekStartISO,
  employees,
  onEmployeesChange,
  onClose,
}: {
  weekStartISO: string;
  employees: EmployeeRow[];
  onEmployeesChange: (e: EmployeeRow[]) => void;
  onClose: () => void;
}) {
  const [direction, setDirection] = React.useState<"prev" | "next">("prev");

  const copy = () => {
    const offset = direction === "prev" ? -7 : 7;
    const targetDate = new Date(weekStartISO);
    targetDate.setDate(targetDate.getDate() + offset);
    const targetWeekISO = targetDate.toISOString().slice(0, 10);

    const targetKey = `shiftflow:schedule:${targetWeekISO}`;
    const targetData = localStorage.getItem(targetKey);

    if (targetData) {
      try {
        const parsed = JSON.parse(targetData);
        if (parsed?.employees && Array.isArray(parsed.employees)) {
          const nameMap = new Map(
            employees.map((e) => [e.name.toLowerCase(), e] as const),
          );
          const copied = parsed.employees.map((sourceEmp: EmployeeRow) => {
            const existing = nameMap.get(sourceEmp.name.toLowerCase());
            return existing
              ? { ...existing, shifts: { ...sourceEmp.shifts } }
              : { ...sourceEmp, id: `emp-${Date.now()}-${Math.random()}` };
          });
          onEmployeesChange(copied);
          appendAudit(weekStartISO, {
            ts: Date.now(),
            type: "copy_week",
            meta: { from: targetWeekISO, direction },
          });
        }
      } catch {
        /* ignore */
      }
    } else {
      const cleared = employees.map((e) => ({
        ...e,
        shifts: createEmptyShifts(),
      }));
      onEmployeesChange(cleared);
    }

    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Copy Week</DialogTitle>
      </DialogHeader>
      <div className="text-sm mb-4">
        Copy shifts from another week into this week.
      </div>
      <div className="flex gap-3 py-2">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="dir"
            checked={direction === "prev"}
            onChange={() => setDirection("prev")}
          />
          <span>From Previous Week</span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="dir"
            checked={direction === "next"}
            onChange={() => setDirection("next")}
          />
          <span>From Next Week</span>
        </label>
      </div>
      <DialogFooter>
        <Button onClick={copy}>Copy Shifts</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ImportDialog({
  employees,
  onEmployeesChange,
}: {
  employees: EmployeeRow[];
  onEmployeesChange: (e: EmployeeRow[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const DAYS: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const apply = () => {
    const lines = text.trim().split(/\r?\n/);
    if (!lines.length) return;

    const header = lines.shift()!;
    const cols = header.split(/,|\t/).map((s) => s.trim());
    const idx: Record<string, number> = {};
    cols.forEach((c, i) => (idx[c.toLowerCase()] = i));

    const byName = new Map(
      employees.map((e) => [e.name.toLowerCase(), e] as const),
    );
    const next = [...employees];

    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(/,|\t/);
      const name = parts[idx["employee"]] || parts[0];
      if (!name) continue;

      let row = byName.get(name.toLowerCase());
      if (!row) {
        row = newEmployee(name);
        next.push(row);
        byName.set(name.toLowerCase(), row);
      }

      DAYS.forEach((d) => {
        const v = parts[idx[d.toLowerCase()] ?? -1] ?? "";
        if (!v) return;
        const r = parseTimeRange(v);
        (row as any).shifts[d] = {
          ...(row as any).shifts[d],
          value: v,
          range: r,
          in: v.split(/-|to/)[0],
          out: v.split(/-|to/)[1],
        };
      });
    }

    onEmployeesChange(next);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Import</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import CSV/TSV</DialogTitle>
        </DialogHeader>
        <div className="text-xs text-muted-foreground">
          Header: Employee, Mon, Tue, Wed, Thu, Fri, Sat, Sun (times
          “09:00-17:00”)
        </div>
        <textarea
          className="w-full h-40 border rounded-md p-2 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <DialogFooter>
          <Button onClick={apply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManagerCredentialsDialog() {
  const [email, setEmail] = React.useState(
    localStorage.getItem("shiftflow:manager-email") || "",
  );
  const [password, setPassword] = React.useState(
    localStorage.getItem("shiftflow:manager-password") || "",
  );
  const [saved, setSaved] = React.useState(false);

  const handleSave = () => {
    localStorage.setItem("shiftflow:manager-email", email);
    localStorage.setItem("shiftflow:manager-password", password);
    localStorage.removeItem("shiftflow:manager-authenticated");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Manager Login Credentials</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">
          Set manager credentials for accessing forecast-related features.
        </p>
        <label className="text-sm">
          Manager Email
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="manager@example.com"
          />
        </label>
        <label className="text-sm">
          Manager Password
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>
        {saved ? (
          <div className="text-sm text-emerald-600">Credentials saved</div>
        ) : null}
      </div>
      <DialogFooter>
        <Button onClick={handleSave}>Save Credentials</Button>
      </DialogFooter>
    </DialogContent>
  );
}
