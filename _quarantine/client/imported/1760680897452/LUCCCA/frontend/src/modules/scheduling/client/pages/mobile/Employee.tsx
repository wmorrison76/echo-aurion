import { useEffect, useMemo, useState } from "react";
import {
  DAYS,
  EmployeeRow,
  ScheduleState,
  loadSchedule,
  startOfWeekISO,
  weeklyHours,
} from "@/lib/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postNotify, uploadFile } from "@/lib/notify";
import { AlertCircle, Clock, CheckCircle2, DollarSign, Bell } from "lucide-react";

interface Prefs {
  positions: string[];
  availability: string;
  extraHours: boolean;
}

const PREF_KEY = "shiftflow:emp:prefs";
const PROFILE_KEY = "shiftflow:emp:profile";

export default function EmployeeMobile() {
  const [weekISO, setWeekISO] = useState(startOfWeekISO());
  const [state, setState] = useState<ScheduleState | null>(null);
  const [empId, setEmpId] = useState<string>("");
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try {
      return JSON.parse(
        localStorage.getItem(PREF_KEY) ||
          '{"positions":[],"availability":"","extraHours":false}'
      );
    } catch {
      return { positions: [], availability: "", extraHours: false };
    }
  });
  const [address, setAddress] = useState<string>(
    () => localStorage.getItem(PROFILE_KEY) || ""
  );
  const [activeTab, setActiveTab] = useState<
    "schedule" | "prefs" | "timeoff" | "profile"
  >("schedule");

  useEffect(() => {
    setState(loadSchedule());
  }, [weekISO]);

  const me = useMemo(
    () => state?.employees.find((e) => e.id === empId) || null,
    [state, empId]
  );

  const scheduleMetrics = useMemo(() => {
    if (!me) return { totalHours: 0, isOvertime: false, earnings: 0 };
    const hours = weeklyHours(me);
    const rate = me.rate || 20;
    const otThreshold = 40;
    const regHours = Math.min(hours, otThreshold);
    const otHours = Math.max(0, hours - otThreshold);
    const earnings = regHours * rate + otHours * rate * 1.5;
    return { totalHours: hours, isOvertime: hours > otThreshold, earnings };
  }, [me]);

  const changeWeek = (delta: number) => {
    const d = new Date(weekISO);
    d.setDate(d.getDate() + delta * 7);
    setWeekISO(d.toISOString().slice(0, 10));
  };

  const submitOTAck = async () => {
    if (!me) return;
    await postNotify({
      type: "ot.ack",
      actor: me.name,
      message: `OT acknowledged for ${me.name}`,
      data: { weekISO, hours: scheduleMetrics.totalHours },
    });
    alert("Managers notified of acknowledgment");
  };

  const submitPTO = async (kind: string) => {
    const file = (document.getElementById("pto-file") as HTMLInputElement)
      .files?.[0];
    let upload: any = undefined;
    if (file) {
      try {
        upload = await uploadFile(file);
      } catch {
        /* ignore */
      }
    }
    await postNotify({
      type: "pto.request",
      actor: me?.name,
      message: `${kind} request for week of ${weekISO}`,
      data: { weekISO, upload },
    });
    alert("Request submitted for approval");
  };

  const savePrefs = () => {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    alert("Preferences saved");
  };

  const saveAddress = () => {
    localStorage.setItem(PROFILE_KEY, address);
    alert("Address saved");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background/70 backdrop-blur">
        <div className="p-3 flex items-center justify-between">
          <div>
            <div className="font-semibold">Employee App</div>
            <div className="text-xs text-muted-foreground">{me?.name || "Select profile"}</div>
          </div>
          <a href="/" className="underline text-xs text-primary">
            Desktop
          </a>
        </div>
      </div>

      <div className="p-3 space-y-4">
        {/* Profile Selection */}
        {!empId && (
          <div className="border rounded-lg p-4 bg-muted/30">
            <label className="text-sm font-medium">Select Your Profile</label>
            <select
              className="w-full border rounded px-2 py-2 mt-2 text-sm"
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
            >
              <option value="">Choose your name…</option>
              {state?.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {me && (
          <>
            {/* Week Navigation */}
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-3">
              <Button size="sm" variant="outline" onClick={() => changeWeek(-1)}>
                ← Prev
              </Button>
              <div className="flex-1 text-center text-sm font-medium">{weekISO}</div>
              <Button size="sm" variant="outline" onClick={() => changeWeek(1)}>
                Next →
              </Button>
            </div>

            {/* Schedule Summary Card */}
            <div className="border rounded-lg p-4 bg-gradient-to-br from-primary/10 to-primary/5">
              <h3 className="font-semibold mb-3">This Week's Summary</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {scheduleMetrics.totalHours.toFixed(1)}h
                  </div>
                  <div className="text-xs text-muted-foreground">Total Hours</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${scheduleMetrics.isOvertime ? "text-orange-600" : "text-green-600"}`}>
                    {scheduleMetrics.isOvertime ? "OT" : "Regular"}
                  </div>
                  <div className="text-xs text-muted-foreground">Status</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ${scheduleMetrics.earnings.toFixed(0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Est. Earnings</div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b bg-muted/30 rounded-lg overflow-hidden">
              {(["schedule", "prefs", "timeoff", "profile"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 px-2 text-xs font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {tab === "schedule" && "📅 Schedule"}
                  {tab === "prefs" && "⚙️ Prefs"}
                  {tab === "timeoff" && "🏖️ Time Off"}
                  {tab === "profile" && "👤 Profile"}
                </button>
              ))}
            </div>

            {/* Schedule Tab */}
            {activeTab === "schedule" && (
              <div className="space-y-3">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 p-3 font-semibold text-sm">My Schedule</div>
                  <div className="divide-y">
                    {DAYS.map((d) => {
                      const shift = me.shifts[d];
                      const hasShift = shift && (shift.in || shift.out || shift.value);
                      return (
                        <div key={d} className="p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{d}</span>
                            {hasShift ? (
                              <span className="text-sm font-mono bg-primary/10 px-2 py-1 rounded">
                                {shift.in || shift.value?.split("-")[0] || "—"} -{" "}
                                {shift.out || shift.value?.split("-")[1] || "—"}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Day Off</span>
                            )}
                          </div>
                          {shift.position && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Position: {shift.position}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {scheduleMetrics.isOvertime && (
                  <div className="border border-orange-200 rounded-lg p-3 bg-orange-50">
                    <div className="flex gap-2 items-start">
                      <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-sm text-orange-900">Overtime Notice</div>
                        <div className="text-xs text-orange-800 mt-1">
                          You're scheduled for {scheduleMetrics.totalHours.toFixed(1)} hours this week.
                          Please acknowledge.
                        </div>
                        <Button size="sm" className="mt-2 w-full" onClick={submitOTAck}>
                          Acknowledge
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === "prefs" && (
              <div className="space-y-3">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-sm">Job Preferences</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium">Positions (comma-separated)</label>
                      <Input
                        className="mt-1"
                        placeholder="e.g. Server, Host, Bartender"
                        value={prefs.positions.join(", ")}
                        onChange={(e) =>
                          setPrefs({
                            ...prefs,
                            positions: e.target.value
                              .split(/,\s*/)
                              .filter(Boolean),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Availability</label>
                      <Input
                        className="mt-1"
                        placeholder="e.g. Weekends only, Evenings"
                        value={prefs.availability}
                        onChange={(e) =>
                          setPrefs({ ...prefs, availability: e.target.value })
                        }
                      />
                    </div>
                    <label className="text-xs inline-flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        checked={prefs.extraHours}
                        onChange={(e) =>
                          setPrefs({
                            ...prefs,
                            extraHours: e.target.checked,
                          })
                        }
                      />
                      Open to extra hours / overtime
                    </label>
                  </div>
                  <Button onClick={savePrefs} className="w-full mt-3">
                    Save Preferences
                  </Button>
                </div>
              </div>
            )}

            {/* Time Off Tab */}
            {activeTab === "timeoff" && (
              <div className="space-y-3">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-sm">Request Time Off</h3>
                  <div className="space-y-2">
                    <input id="pto-file" type="file" className="text-xs" />
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => submitPTO("PTO")}
                      >
                        📅 PTO
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => submitPTO("Sick")}
                      >
                        🤒 Sick
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => submitPTO("Personal")}
                      >
                        💼 Personal
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => submitPTO("Bereavement")}
                      >
                        🙏 Bereavement
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Your manager will review your request
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-sm">Missed Punch</h3>
                  <Input
                    placeholder="Explain what happened"
                    id="missed-reason"
                    className="mb-2"
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={async () => {
                      const reason = (
                        document.getElementById(
                          "missed-reason"
                        ) as HTMLInputElement
                      ).value;
                      await postNotify({
                        type: "punch.edit",
                        actor: me?.name,
                        message: "Missed punch edit request",
                        data: { weekISO, reason },
                      });
                      alert("Submitted for manager approval");
                    }}
                  >
                    Submit for Approval
                  </Button>
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-3">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-sm">Personal Information</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium">Name</label>
                      <Input disabled value={me.name} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Role</label>
                      <Input disabled value={me.role || "—"} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Hourly Rate</label>
                      <Input
                        disabled
                        value={`$${me.rate || 20}/hr`}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-sm">Mailing Address</h3>
                  <textarea
                    className="w-full border rounded px-2 py-2 text-sm"
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, City, State ZIP"
                  />
                  <Button onClick={saveAddress} className="w-full mt-2">
                    Save Address
                  </Button>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Approvals
                  </h3>
                  <label className="text-xs inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      onChange={async (e) => {
                        await postNotify({
                          type: "pay.approve",
                          actor: me?.name,
                          message: e.target.checked
                            ? "Approved payroll"
                            : "Unapproved payroll",
                          data: { weekISO },
                        });
                      }}
                    />
                    Approve this week's pay
                  </label>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
