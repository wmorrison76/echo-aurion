import { useMemo, useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmployeeRow } from "@/lib/schedule";
import { loadSettings, saveSettings } from "./settings";
import {
  EmployeeProfile,
  getAdminPassword,
  getProfile,
  listProfiles,
  pushScheduleToPhone,
  setAdminPassword,
  upsertProfile,
} from "@/lib/employees";

export default function SettingsGear({
  employees,
  onAdd,
}: {
  employees: EmployeeRow[];
  onAdd: (name: string, role?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const s = useMemo(() => loadSettings(), [open]);
  const [time24, setTime24] = useState(s.timeFormat24h);
  const [startDay, setStartDay] = useState<number>(s.startDay);
  const profiles = listProfiles(employees);
  const [selId, setSelId] = useState<string>(profiles[0]?.id || "");
  const [p, setP] = useState<EmployeeProfile | null>(
    selId
      ? getProfile(selId, {
          id: selId,
          name: profiles.find((x) => x.id === selId)?.name || "",
        })
      : null,
  );
  const [adminEntered, setAdminEntered] = useState(false);
  const [adminTry, setAdminTry] = useState("");

  const applyAdmin = () => {
    const saved = getAdminPassword();
    if (!saved) {
      setAdminPassword(adminTry);
      setAdminEntered(true);
    } else setAdminEntered(saved === adminTry);
  };

  const onSave = () => {
    const next = { ...s, timeFormat24h: time24, startDay: startDay as any };
    saveSettings(next);
    if (p) upsertProfile(p);
    try {
      window.dispatchEvent(
        new CustomEvent("shiftflow:settings-updated", { detail: next }),
      );
    } catch {}
    setOpen(false);
  };

  const select = (id: string) => {
    setSelId(id);
    const base = employees.find((e) => e.id === id);
    setP(getProfile(id, { id, name: base?.name || "" }));
  };

  const addNew = () => {
    const nm = prompt("Employee name?")?.trim();
    if (!nm) return;
    const role = prompt("Role? (optional)")?.trim() || undefined;
    onAdd(nm, role);
    setTimeout(
      () =>
        setSelId((prev) => {
          const latest = listProfiles([
            ...employees,
            {
              id: (employees as any)[0]?.id || "",
              name: nm,
              role,
              shifts: {} as any,
            } as EmployeeRow,
          ])[0];
          return prev;
        }),
      0,
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Settings & Employees</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <section className="space-y-2">
            <div className="font-medium">Time Format</div>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={time24}
                onChange={(e) => setTime24(e.target.checked)}
              />{" "}
              24-hour
            </label>
            <div className="text-xs text-muted-foreground">
              Uncheck for 12-hour format
            </div>
          </section>

          <section className="space-y-2">
            <div className="font-medium">Week starts on</div>
            <select
              className="border rounded-md px-2 py-1 bg-transparent"
              value={startDay}
              onChange={(e) => setStartDay(Number(e.target.value))}
            >
              <option value={0}>Sunday</option>
              <option value={1}>Monday</option>
              <option value={2}>Tuesday</option>
              <option value={3}>Wednesday</option>
              <option value={4}>Thursday</option>
              <option value={5}>Friday</option>
              <option value={6}>Saturday</option>
            </select>
            <div className="text-xs text-muted-foreground">
              Click “This week” after saving to jump to the new week layout.
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">Employee</div>
              <Button variant="outline" size="sm" onClick={addNew}>
                Add employee
              </Button>
            </div>
            <select
              className="border rounded-md px-2 py-1 bg-transparent"
              value={selId}
              onChange={(e) => select(e.target.value)}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            {p && (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={p.employeeCode || ""}
                  onChange={(e) => setP({ ...p, employeeCode: e.target.value })}
                  placeholder="Emp ID"
                />
                <Input
                  type="date"
                  value={p.hireDate || ""}
                  onChange={(e) => setP({ ...p, hireDate: e.target.value })}
                />
                <Input
                  value={p.deptCode || ""}
                  onChange={(e) => setP({ ...p, deptCode: e.target.value })}
                  placeholder="Dept"
                />
                <Input
                  value={p.certifications || ""}
                  onChange={(e) =>
                    setP({ ...p, certifications: e.target.value })
                  }
                  placeholder="Certs"
                />
                <Input
                  value={p.preferredSchedule || ""}
                  onChange={(e) =>
                    setP({ ...p, preferredSchedule: e.target.value })
                  }
                  placeholder="Pref schedule"
                />
                <Input
                  type="number"
                  value={p.payRate ?? ""}
                  onChange={(e) =>
                    setP({ ...p, payRate: Number(e.target.value || 0) })
                  }
                  placeholder="Pay $/h"
                />
                <Input
                  value={p.email || ""}
                  onChange={(e) => setP({ ...p, email: e.target.value })}
                  placeholder="Email"
                />
                <select
                  value={p.pronoun || "they"}
                  onChange={(e) =>
                    setP({ ...p, pronoun: e.target.value as any })
                  }
                  className="border rounded-md px-2 py-1 bg-transparent"
                >
                  <option value="he">he</option>
                  <option value="she">she</option>
                  <option value="they">they</option>
                </select>
                {!adminEntered ? (
                  <div className="col-span-2 grid grid-cols-[1fr_auto] gap-2">
                    <Input
                      type="password"
                      value={adminTry}
                      onChange={(e) => setAdminTry(e.target.value)}
                      placeholder="Admin password to view phone/address"
                    />
                    <Button size="sm" onClick={applyAdmin}>
                      Unlock
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      value={p.phone || ""}
                      onChange={(e) => setP({ ...p, phone: e.target.value })}
                      placeholder="Phone"
                    />
                    <Input
                      value={p.address || ""}
                      onChange={(e) => setP({ ...p, address: e.target.value })}
                      placeholder="Address"
                      className="col-span-1"
                    />
                  </>
                )}
                <div className="col-span-2 flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (p) {
                        pushScheduleToPhone(p);
                      }
                    }}
                  >
                    Push schedule
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (p) {
                        upsertProfile(p);
                      }
                    }}
                  >
                    Save employee
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={onSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
