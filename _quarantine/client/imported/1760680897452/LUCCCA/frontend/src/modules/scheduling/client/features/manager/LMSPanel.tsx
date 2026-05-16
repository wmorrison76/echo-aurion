import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getComplianceConfig,
  saveComplianceConfig,
  evaluateCompliance,
} from "@/lib/compliance";
import { EmployeeRow } from "@/lib/schedule";
import {
  loadStandards,
  saveStandards,
  StandardRule,
  loadPresets,
  savePresets,
} from "@/lib/standards";

export interface StationRange {
  name: string;
  min: number;
  max: number;
}

const KEY = "shiftflow:lms:stations";
const HRS_KEY = "shiftflow:hours";

export default function LMSPanel({ employees }: { employees?: EmployeeRow[] }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"stations" | "standards" | "hours" | "compliance">("standards");
  
  const [stations, setStations] = useState<StationRange[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  });
  
  const [hours, setHours] = useState<
    Record<string, { open: string; close: string }>
  >(() => {
    try {
      return JSON.parse(localStorage.getItem(HRS_KEY) || "{}");
    } catch {
      return {};
    }
  });
  
  const [cfg, setCfg] = useState(getComplianceConfig());
  
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(stations));
    } catch {}
  }, [stations]);
  
  useEffect(() => {
    try {
      localStorage.setItem(HRS_KEY, JSON.stringify(hours));
    } catch {}
  }, [hours]);

  const outlet =
    typeof window !== "undefined"
      ? localStorage.getItem("shiftflow:outlet") || "Main"
      : "Main";
      
  const [dept, setDept] = useState<string>(
    () => localStorage.getItem("shiftflow:lms:dept") || "BOH"
  );
  
  useEffect(() => {
    try {
      localStorage.setItem("shiftflow:lms:dept", dept);
    } catch {}
  }, [dept]);

  const [presets, setPresets] = useState<string[]>(() => loadPresets(dept));
  useEffect(() => {
    setPresets(loadPresets(dept));
  }, [dept]);

  const [std, setStd] = useState<Record<string, StandardRule[]>>(() =>
    loadStandards(outlet, dept)
  );
  
  useEffect(() => {
    saveStandards(std, outlet, dept);
  }, [std, outlet, dept]);

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [step, setStep] = useState<number>(() =>
    Number(localStorage.getItem(`shiftflow:lms:step:${outlet}:${dept}`) || 50)
  );
  const [maxTo, setMaxTo] = useState<number>(() =>
    Number(localStorage.getItem(`shiftflow:lms:max:${outlet}:${dept}`) || 650)
  );
  
  useEffect(() => {
    localStorage.setItem(`shiftflow:lms:step:${outlet}:${dept}`, String(step));
  }, [step, outlet, dept]);
  
  useEffect(() => {
    localStorage.setItem(`shiftflow:lms:max:${outlet}:${dept}`, String(maxTo));
  }, [maxTo, outlet, dept]);

  const preview = useMemo(
    () => (employees ? evaluateCompliance("", employees, cfg) : null),
    [employees, cfg]
  );

  useEffect(() => {
    const fn = () => setOpen(true);
    window.addEventListener("shiftflow:open-lms" as any, fn as any);
    return () =>
      window.removeEventListener("shiftflow:open-lms" as any, fn as any);
  }, []);

  function addPreset(name: string) {
    const list = Array.from(
      new Set([...(presets || []), name].filter(Boolean))
    );
    setPresets(list);
    savePresets(dept, list);
  }

  function removePreset(name: string) {
    const list = (presets || []).filter((p) => p !== name);
    setPresets(list);
    savePresets(dept, list);
  }

  function moveRight() {
    if (!selectedLeft) return;
    setStd((prev) => ({ ...prev, [selectedLeft]: prev[selectedLeft] || [] }));
  }

  function removeSelected(pos: string) {
    setStd((prev) => {
      const n = { ...prev };
      delete n[pos];
      return n;
    });
  }

  function ranges() {
    const arr: { low: number; high: number }[] = [];
    let low = 0;
    while (low <= maxTo) {
      const high = low === 0 ? step : low + step - 1;
      arr.push({ low, high });
      low = high + 1;
    }
    return arr;
  }

  const add = () =>
    setStations((s) => [...s, { name: "New Station", min: 0, max: 75 }]);

  const exportConfig = () => {
    const config = {
      outlet,
      department: dept,
      stations,
      standards: std,
      hours,
      compliance: cfg,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lms-${outlet.replace(/\s+/g, "_")}-${dept}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev: any) => {
        try {
          const config = JSON.parse(ev.target.result);
          setStations(config.stations || []);
          setStd(config.standards || {});
          setHours(config.hours || {});
          setCfg(config.compliance || {});
          alert("Configuration imported successfully");
        } catch (err) {
          alert("Failed to import configuration");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const tabs = [
    { id: "standards", label: "Labor Standards" },
    { id: "stations", label: "Stations" },
    { id: "hours", label: "Hours of Operation" },
    { id: "compliance", label: "Compliance" },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          LMS Control Panel
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[96vw] max-w-[1600px] h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>LMS & Standards Management</DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Stations Tab */}
        {activeTab === "stations" && (
          <section className="grid gap-4">
            <div>
              <h3 className="font-semibold mb-3">Service Stations by Covers</h3>
              <div className="grid gap-2">
                {stations.map((st, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted/30 p-3 rounded">
                    <input
                      className="border rounded px-2 py-1 flex-1"
                      value={st.name}
                      onChange={(e) => {
                        const ns = [...stations];
                        ns[i] = { ...st, name: e.target.value };
                        setStations(ns);
                      }}
                      placeholder="Station name"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-24"
                        value={st.min}
                        onChange={(e) => {
                          const ns = [...stations];
                          ns[i] = { ...st, min: Number(e.target.value) };
                          setStations(ns);
                        }}
                        placeholder="Min covers"
                      />
                      <span>-</span>
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-24"
                        value={st.max}
                        onChange={(e) => {
                          const ns = [...stations];
                          ns[i] = { ...st, max: Number(e.target.value) };
                          setStations(ns);
                        }}
                        placeholder="Max covers"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setStations(stations.filter((_, idx) => idx !== i))}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={add}>
                  + Add Station
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setStations([])}>
                  Clear All
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Standards Tab */}
        {activeTab === "standards" && (
          <section className="grid gap-4">
            <div>
              <h3 className="font-semibold mb-3">Labor Standards (3-Panel Editor)</h3>
              <div className="grid grid-cols-3 gap-3">
                {/* Left Panel: Positions */}
                <div className="border rounded p-3">
                  <div className="font-medium mb-2 text-sm">Positions • {dept}</div>
                  <select
                    className="border rounded px-2 py-1 w-full mb-2 text-sm"
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                  >
                    {["BANQUETS", "FOH", "BOH", "STEWARDS"].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-muted-foreground mb-2">Outlet: {outlet}</div>
                  <div className="grid gap-1 max-h-48 overflow-auto mb-2">
                    {(presets || []).map((p) => (
                      <button
                        key={p}
                        className={`text-left border rounded px-2 py-1 text-sm transition-colors ${
                          selectedLeft === p
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedLeft(p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      id="new-pos"
                      className="border rounded px-2 py-1 flex-1 text-sm"
                      placeholder="Add position"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const el = document.getElementById("new-pos") as HTMLInputElement;
                        if (el.value) {
                          addPreset(el.value);
                          el.value = "";
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  {selectedLeft && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full mt-2"
                      onClick={() => {
                        removePreset(selectedLeft);
                        setSelectedLeft(null);
                      }}
                    >
                      Remove {selectedLeft}
                    </Button>
                  )}
                </div>

                {/* Middle Panel: Selected */}
                <div className="border rounded p-3">
                  <div className="font-medium mb-2 text-sm">Standards for {dept}</div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Select positions to define cover requirements.
                  </div>
                  <Button
                    size="sm"
                    className="w-full mb-2"
                    onClick={moveRight}
                    disabled={!selectedLeft}
                  >
                    Add {selectedLeft || "Position"} →
                  </Button>
                  <div className="grid gap-1 max-h-48 overflow-auto">
                    {Object.keys(std).length === 0 ? (
                      <div className="text-xs text-muted-foreground">None yet</div>
                    ) : (
                      Object.keys(std).map((pos) => (
                        <div
                          key={pos}
                          className="flex items-center justify-between border rounded px-2 py-1 text-sm bg-muted/30"
                        >
                          <div>{pos}</div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeSelected(pos)}
                          >
                            ✕
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right Panel: Cover Ranges */}
                <div className="border rounded p-3">
                  <div className="font-medium mb-2 text-sm">Cover Ranges</div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-xs">
                      Step
                      <input
                        type="number"
                        className="border rounded px-2 py-1 ml-1 w-16 text-sm"
                        value={step}
                        onChange={(e) => setStep(Math.max(1, Number(e.target.value) || 50))}
                      />
                    </label>
                    <label className="text-xs">
                      Max
                      <input
                        type="number"
                        className="border rounded px-2 py-1 ml-1 w-20 text-sm"
                        value={maxTo}
                        onChange={(e) => setMaxTo(Math.max(step, Number(e.target.value) || 650))}
                      />
                    </label>
                  </div>
                  <div className="overflow-auto max-h-48">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          <th className="text-left p-1">Position</th>
                          {ranges().map((r, i) => (
                            <th key={i} className="p-1 text-center whitespace-nowrap text-[10px]">
                              {i === 0 ? `0-${step}` : `${r.low}-${r.high}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(std).map((pos) => (
                          <tr key={pos}>
                            <td className="p-1 text-left">{pos}</td>
                            {ranges().map((r, i) => {
                              const rules = std[pos] || [];
                              const rule = rules.find((x) => x.low === r.low && x.high === r.high) || {
                                low: r.low,
                                high: r.high,
                                count: 0,
                              };
                              return (
                                <td key={i} className="p-1 text-center">
                                  <input
                                    type="number"
                                    className="w-12 border rounded px-1 py-0.5 text-center text-xs"
                                    defaultValue={rule.count}
                                    onBlur={(e) => {
                                      const val = Number(e.target.value || 0);
                                      setStd((prev) => {
                                        const next = { ...prev };
                                        const arr = Array.from(next[pos] || []);
                                        const j = arr.findIndex(
                                          (x) => x.low === r.low && x.high === r.high
                                        );
                                        if (j >= 0) arr[j] = { ...arr[j], count: val };
                                        else arr.push({ low: r.low, high: r.high, count: val });
                                        next[pos] = arr;
                                        return next;
                                      });
                                    }}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Hours of Operation Tab */}
        {activeTab === "hours" && (
          <section className="grid gap-4">
            <h3 className="font-semibold">Hours of Operation</h3>
            <div className="grid grid-cols-2 gap-3">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="flex items-center gap-2 bg-muted/30 p-3 rounded">
                  <div className="font-medium w-12">{d}</div>
                  <input
                    type="time"
                    className="border rounded px-2 py-1"
                    value={hours[d]?.open || ""}
                    onChange={(e) =>
                      setHours((prev) => ({
                        ...prev,
                        [d]: { ...(prev[d] || {}), open: e.target.value },
                      }))
                    }
                  />
                  <span>-</span>
                  <input
                    type="time"
                    className="border rounded px-2 py-1"
                    value={hours[d]?.close || ""}
                    onChange={(e) =>
                      setHours((prev) => ({
                        ...prev,
                        [d]: { ...(prev[d] || {}), close: e.target.value },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Compliance Tab */}
        {activeTab === "compliance" && (
          <section className="grid gap-4">
            <h3 className="font-semibold">Compliance Standards</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-1">
                <span className="text-sm font-medium">Predictive Notice (days)</span>
                <input
                  type="number"
                  className="border rounded px-3 py-2"
                  value={cfg.predictiveNoticeDays}
                  onChange={(e) =>
                    setCfg({ ...cfg, predictiveNoticeDays: Number(e.target.value) })
                  }
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium">Rest Period (hours)</span>
                <input
                  type="number"
                  className="border rounded px-3 py-2"
                  value={cfg.restPeriodHours}
                  onChange={(e) =>
                    setCfg({ ...cfg, restPeriodHours: Number(e.target.value) })
                  }
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium">Max Consecutive Days</span>
                <input
                  type="number"
                  className="border rounded px-3 py-2"
                  value={cfg.maxConsecutiveDays}
                  onChange={(e) =>
                    setCfg({ ...cfg, maxConsecutiveDays: Number(e.target.value) })
                  }
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium">Weekly OT Threshold</span>
                <input
                  type="number"
                  className="border rounded px-3 py-2"
                  value={cfg.overtimeThreshold}
                  onChange={(e) =>
                    setCfg({ ...cfg, overtimeThreshold: Number(e.target.value) })
                  }
                />
              </label>
            </div>

            {preview && (
              <div className="bg-muted/30 rounded p-4">
                <div className="font-medium mb-2">Compliance Preview</div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Compliance Issues</div>
                    <div className={`text-lg font-semibold ${preview.issues.length === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {preview.issues.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">OT Hours</div>
                    <div className="text-lg font-semibold">{preview.overtimeHours.toFixed(1)}h</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Predictability Pay Hours</div>
                    <div className="text-lg font-semibold">{preview.predictabilityPayHours.toFixed(1)}h</div>
                  </div>
                </div>
                {preview.issues.length > 0 && (
                  <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-700">
                    <ul className="list-disc pl-4 space-y-1">
                      {preview.issues.slice(0, 5).map((issue, i) => (
                        <li key={i}>{issue.message}</li>
                      ))}
                      {preview.issues.length > 5 && (
                        <li>... and {preview.issues.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  saveComplianceConfig(cfg);
                  alert("Compliance standards saved");
                }}
              >
                Save Standards
              </Button>
              <Button variant="secondary" onClick={exportConfig}>
                Export Config
              </Button>
              <Button variant="secondary" onClick={importConfig}>
                Import Config
              </Button>
            </div>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
