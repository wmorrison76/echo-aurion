import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import type { EmployeeRow } from "@/lib/schedule";
import {
  getOnboarding,
  saveOnboarding,
  OnboardingData,
} from "@/lib/onboarding";

export default function EmployeeOnboarding({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employee: EmployeeRow;
}) {
  const [data, setData] = useState<OnboardingData>({});
  const [deptInput, setDeptInput] = useState("");
  useEffect(() => {
    if (open) {
      setData(getOnboarding(employee.id));
      setDeptInput("");
    }
  }, [open, employee.id]);
  const addDept = () => {
    const d = deptInput.trim();
    if (!d) return;
    const set = new Set([...(data.departments || []), d]);
    setData({ ...data, departments: Array.from(set) });
    setDeptInput("");
  };
  const removeDept = (d: string) =>
    setData({
      ...data,
      departments: (data.departments || []).filter((x) => x !== d),
    });

  const shares = data.shares || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Onboarding • {employee.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 text-sm">
          <label className="grid gap-1">
            Home Department
            <Input
              value={data.homeDept || ""}
              onChange={(e) => setData({ ...data, homeDept: e.target.value })}
              placeholder="e.g. FOH"
            />
          </label>
          <div className="grid gap-1">
            <div>Departments (multi)</div>
            <div className="flex gap-2">
              <Input
                value={deptInput}
                onChange={(e) => setDeptInput(e.target.value)}
                placeholder="Add department"
              />
              <Button onClick={addDept} type="button">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(data.departments || []).map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 border rounded px-2 py-0.5"
                >
                  {d}
                  <button
                    onClick={() => removeDept(d)}
                    aria-label={`remove ${d}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <label className="grid gap-1">
            Title
            <Input
              value={data.title || ""}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              placeholder="e.g. Server"
            />
          </label>
          <div className="grid gap-2">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!data.jobShare}
                onChange={(e) =>
                  setData({ ...data, jobShare: e.target.checked })
                }
              />
              Job Share
            </label>
            {data.jobShare && (
              <div className="grid gap-2">
                <div className="text-xs text-muted-foreground">
                  Allocate cost shares (0-100). Will normalize to 100%.
                </div>
                {(data.departments || []).map((d) => (
                  <label key={d} className="inline-flex items-center gap-2">
                    <span className="w-28">{d}</span>
                    <Input
                      type="number"
                      value={shares[d] ?? 0}
                      onChange={(e) =>
                        setData({
                          ...data,
                          shares: {
                            ...shares,
                            [d]: Number(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-24"
                    />
                    %
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const payload = {
                  employeeId: employee.id,
                  name: employee.name,
                  role: employee.role,
                  rate: employee.rate,
                  ...data,
                  generatedAt: new Date().toISOString(),
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `PAF-${employee.name.replace(/\s+/g, "_")}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download PAF
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  saveOnboarding(employee.id, data);
                  onOpenChange(false);
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
