import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { EmployeeRow, DAYS, DayKey } from "@/lib/schedule";
import { Calendar, AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface AttendanceRecord {
  empId: string;
  date: string;
  status: "present" | "absent" | "late" | "left-early" | "excused";
  clockIn?: string;
  clockOut?: string;
  notes?: string;
}

export default function AttendanceTracker({ employees, weekStartISO }: { employees: EmployeeRow[]; weekStartISO?: string }) {
  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("shiftflow:attendance") || "[]");
    } catch {
      return [];
    }
  });

  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(employees[0]?.id || null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const metrics = useMemo(() => {
    const empRecords = records.filter((r) => r.empId === selectedEmpId);
    const total = empRecords.length || 0;
    const present = empRecords.filter((r) => r.status === "present").length;
    const absent = empRecords.filter((r) => r.status === "absent").length;
    const late = empRecords.filter((r) => r.status === "late").length;
    const leftEarly = empRecords.filter((r) => r.status === "left-early").length;
    const excused = empRecords.filter((r) => r.status === "excused").length;

    const attendanceRate = total > 0 ? (present / total) * 100 : 100;
    const punctualityRate = total > 0 ? ((total - late - leftEarly) / total) * 100 : 100;

    return {
      total,
      present,
      absent,
      late,
      leftEarly,
      excused,
      attendanceRate,
      punctualityRate,
    };
  }, [records, selectedEmpId]);

  const selectedEmployee = employees.find((e) => e.id === selectedEmpId);
  const todayRecord = records.find(
    (r) => r.empId === selectedEmpId && r.date === selectedDate
  );

  const handleRecord = (status: string, clockIn?: string, clockOut?: string) => {
    const existing = records.findIndex(
      (r) => r.empId === selectedEmpId && r.date === selectedDate
    );

    const newRecord: AttendanceRecord = {
      empId: selectedEmpId!,
      date: selectedDate,
      status: status as any,
      clockIn,
      clockOut,
    };

    if (existing >= 0) {
      const updated = [...records];
      updated[existing] = newRecord;
      setRecords(updated);
    } else {
      setRecords([...records, newRecord]);
    }
  };

  const saveAttendance = () => {
    try {
      localStorage.setItem("shiftflow:attendance", JSON.stringify(records));
      alert("Attendance records saved");
    } catch {
      alert("Failed to save");
    }
  };

  const StatusButton = ({
    label,
    status,
    color,
    active,
  }: {
    label: string;
    status: string;
    color: string;
    active: boolean;
  }) => (
    <button
      onClick={() => handleRecord(status)}
      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
        active
          ? `bg-${color}-500 text-white`
          : `border border-input hover:bg-muted`
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Attendance Tracker</h2>
        <Button size="sm" onClick={saveAttendance}>
          Save Records
        </Button>
      </div>

      {/* Employee Selection & Date */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Employee</label>
          <select
            className="w-full border rounded px-2 py-2 text-sm"
            value={selectedEmpId || ""}
            onChange={(e) => setSelectedEmpId(e.target.value)}
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Date</label>
          <input
            type="date"
            className="w-full border rounded px-2 py-2 text-sm"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border rounded p-3 bg-green-50">
          <div className="text-xs text-green-700 font-medium">Attendance</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {metrics.attendanceRate.toFixed(0)}%
          </div>
          <div className="text-xs text-green-600 mt-1">{metrics.present} present</div>
        </div>
        <div className="border rounded p-3 bg-blue-50">
          <div className="text-xs text-blue-700 font-medium">Punctuality</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {metrics.punctualityRate.toFixed(0)}%
          </div>
          <div className="text-xs text-blue-600 mt-1">{metrics.late} late arrivals</div>
        </div>
        <div className="border rounded p-3 bg-red-50">
          <div className="text-xs text-red-700 font-medium">Absences</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{metrics.absent}</div>
          <div className="text-xs text-red-600 mt-1">unexcused</div>
        </div>
        <div className="border rounded p-3 bg-yellow-50">
          <div className="text-xs text-yellow-700 font-medium">Excused</div>
          <div className="text-2xl font-bold text-yellow-600 mt-1">{metrics.excused}</div>
          <div className="text-xs text-yellow-600 mt-1">excused absences</div>
        </div>
      </div>

      {/* Today's Record */}
      {selectedEmployee && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">
            {selectedEmployee.name} - {new Date(selectedDate).toLocaleDateString()}
          </h3>

          {/* Status Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            <StatusButton
              label="✓ Present"
              status="present"
              color="green"
              active={todayRecord?.status === "present"}
            />
            <StatusButton
              label="✗ Absent"
              status="absent"
              color="red"
              active={todayRecord?.status === "absent"}
            />
            <StatusButton
              label="⏰ Late"
              status="late"
              color="yellow"
              active={todayRecord?.status === "late"}
            />
            <StatusButton
              label="← Left Early"
              status="left-early"
              color="orange"
              active={todayRecord?.status === "left-early"}
            />
            <StatusButton
              label="✓ Excused"
              status="excused"
              color="purple"
              active={todayRecord?.status === "excused"}
            />
          </div>

          {/* Clock Times */}
          {(todayRecord?.status === "present" || todayRecord?.status === "late") && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-sm font-medium">Clock In</label>
                <input
                  type="time"
                  className="w-full border rounded px-2 py-2 text-sm"
                  value={todayRecord?.clockIn || ""}
                  onChange={(e) =>
                    handleRecord(todayRecord?.status || "present", e.target.value, todayRecord?.clockOut)
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Clock Out</label>
                <input
                  type="time"
                  className="w-full border rounded px-2 py-2 text-sm"
                  value={todayRecord?.clockOut || ""}
                  onChange={(e) =>
                    handleRecord(todayRecord?.status || "present", todayRecord?.clockIn, e.target.value)
                  }
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-sm font-medium">Notes</label>
            <textarea
              className="w-full border rounded px-2 py-2 text-sm"
              rows={2}
              placeholder="Add notes (optional)"
              value={todayRecord?.notes || ""}
              onChange={(e) => {
                const updated = records.map((r) =>
                  r.empId === selectedEmpId && r.date === selectedDate
                    ? { ...r, notes: e.target.value }
                    : r
                );
                setRecords(updated);
              }}
            />
          </div>
        </div>
      )}

      {/* Recent Records */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Recent Records</h3>
        <div className="space-y-2">
          {records
            .filter((r) => r.empId === selectedEmpId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10)
            .map((record, i) => (
              <div key={i} className="flex items-center justify-between p-2 border rounded text-sm">
                <div>
                  <div className="font-medium">{new Date(record.date).toLocaleDateString()}</div>
                  {record.clockIn && (
                    <div className="text-xs text-muted-foreground">
                      {record.clockIn} - {record.clockOut || "—"}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {record.status === "present" && (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  )}
                  {record.status === "absent" && (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                  {record.status === "late" && (
                    <Clock className="w-4 h-4 text-yellow-600" />
                  )}
                  <span className="text-xs font-medium capitalize">
                    {record.status.replace("-", " ")}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
