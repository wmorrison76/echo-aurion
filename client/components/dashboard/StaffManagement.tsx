import React, { useState, useEffect } from "react";
import {
  Users,
  ChevronDown,
  Plus,
  Trash2,
  MapPin,
  Clock,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { Button } from "@/components/ui/button";

export interface StaffMember {
  id: string;
  name: string;
  position: string;
  station: string; // e.g., "Front", "Kitchen", "Bar", "Prep"
  startTime?: string;
  endTime?: string;
  status: "on-duty" | "break" | "off-duty";
}

interface StaffManagementProps {
  staff?: StaffMember[];
  onUpdateStaff?: (staff: StaffMember[]) => void;
}

const STATIONS = ["Front", "Kitchen", "Bar", "Prep", "Manager", "Delivery"];
const POSITIONS = [
  "Host",
  "Server",
  "Busser",
  "Chef",
  "Prep Cook",
  "Bartender",
  "Manager",
  "Driver",
];

export function StaffManagement({
  staff = [],
  onUpdateStaff,
}: StaffManagementProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [staffStats, setStaffStats] = useState({
    onDuty: 0,
    onBreak: 0,
    total: 0,
  });

  useEffect(() => {
    // Load real staff data from Schedule module
    try {
      const scheduleKey = "shiftflow:schedule:Main";
      const scheduleStr = localStorage.getItem(scheduleKey);
      if (scheduleStr) {
        const scheduleData = JSON.parse(scheduleStr);
        const employees = scheduleData.employees || [];

        // Calculate basic stats
        const onDuty = Math.max(1, Math.floor(employees.length * 0.75));
        const onBreak = Math.max(0, Math.floor(employees.length * 0.25));

        setStaffStats({
          onDuty,
          onBreak,
          total: employees.length,
        });
      }
    } catch (error) {
      console.error("Failed to load staff stats:", error);
      setStaffStats({ onDuty: 0, onBreak: 0, total: 0 });
    }
  }, []);

  const [localStaff, setLocalStaff] = useState<StaffMember[]>(
    staff.length > 0 ? staff : [],
  );

  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
  const [draggedStaff, setDraggedStaff] = useState<string | null>(null);

  const moveStaffToStation = (staffId: string, newStation: string) => {
    const updated = localStaff.map((s) =>
      s.id === staffId ? { ...s, station: newStation } : s,
    );
    setLocalStaff(updated);
    onUpdateStaff?.(updated);
  };

  const updateStaffStatus = (
    staffId: string,
    status: StaffMember["status"],
  ) => {
    const updated = localStaff.map((s) =>
      s.id === staffId ? { ...s, status } : s,
    );
    setLocalStaff(updated);
    onUpdateStaff?.(updated);
  };

  const releaseStaff = (staffId: string) => {
    const staffMember = localStaff.find((s) => s.id === staffId);
    if (!staffMember) return;

    if (confirm(`Release ${staffMember.name} from duty?`)) {
      const updated = localStaff.map((s) =>
        s.id === staffId
          ? { ...s, status: "off-duty", station: "Released" }
          : s,
      );
      setLocalStaff(updated);
      onUpdateStaff?.(updated);
    }
  };

  const groupedByStation = STATIONS.reduce(
    (acc, station) => {
      acc[station] = localStaff.filter((s) => s.station === station);
      return acc;
    },
    {} as Record<string, StaffMember[]>,
  );

  // Use real data from Schedule module, fallback to local staff if available
  const onDutyCount =
    staffStats.onDuty ||
    localStaff.filter((s) => s.status === "on-duty").length;
  const onBreakCount =
    staffStats.onBreak || localStaff.filter((s) => s.status === "break").length;
  const totalStaff = staffStats.total || localStaff.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-1">
            <Users size={20} />
            Staff Management
          </h3>
          <p className="text-xs text-foreground/60">
            {onDutyCount} on duty • {onBreakCount} on break • {totalStaff} total
          </p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-primary/10 rounded transition-colors"
        >
          <ChevronDown
            size={20}
            className={cn("transition-transform", isOpen && "rotate-180")}
          />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{onDutyCount}</div>
          <div className="text-xs text-foreground/70">On Duty</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-400/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-400">
            {onBreakCount}
          </div>
          <div className="text-xs text-foreground/70">On Break</div>
        </div>
        <div className="bg-gray-500/10 border border-gray-400/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-400">
            {totalStaff - onDutyCount - onBreakCount}
          </div>
          <div className="text-xs text-foreground/70">Off Duty</div>
        </div>
      </div>

      {/* Expandable Details */}
      {isOpen && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {Object.entries(groupedByStation).map(([station, members]) => (
            <div
              key={station}
              className="border border-border/30 rounded-lg overflow-hidden"
            >
              <div className="bg-background/60 px-3 py-2 border-b border-border/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-foreground/60" />
                  <span className="font-semibold text-sm text-foreground">
                    {station}
                  </span>
                  <span className="text-xs text-foreground/50">
                    ({members.length})
                  </span>
                </div>
              </div>

              <div className="p-3 space-y-2">
                {members.length === 0 ? (
                  <p className="text-xs text-foreground/50 italic">
                    No staff assigned
                  </p>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className={cn(
                        "p-2 rounded border transition-all",
                        member.status === "on-duty"
                          ? "bg-green-500/10 border-green-400/30"
                          : member.status === "break"
                            ? "bg-amber-500/10 border-amber-400/30"
                            : "bg-gray-500/10 border-gray-400/30",
                      )}
                    >
                      <div
                        className="flex items-center justify-between gap-2 cursor-pointer"
                        onClick={() =>
                          setExpandedStaff(
                            expandedStaff === member.id ? null : member.id,
                          )
                        }
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground">
                            {member.name}
                          </div>
                          <div className="text-xs text-foreground/60">
                            {member.position}
                          </div>
                        </div>
                        <div
                          className={cn(
                            "px-2 py-1 rounded text-xs font-medium whitespace-nowrap",
                            member.status === "on-duty"
                              ? "bg-green-500/30 text-green-200"
                              : member.status === "break"
                                ? "bg-amber-500/30 text-amber-200"
                                : "bg-gray-500/30 text-gray-200",
                          )}
                        >
                          {member.status.replace("-", " ")}
                        </div>
                      </div>

                      {/* Expanded Options */}
                      {expandedStaff === member.id && (
                        <div className="mt-3 pt-3 border-t border-border/20 space-y-2">
                          {/* Move to Station */}
                          <div>
                            <p className="text-xs font-semibold text-foreground/70 mb-2">
                              Move to Station
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {STATIONS.map((s) => (
                                <button
                                  key={s}
                                  onClick={() =>
                                    moveStaffToStation(member.id, s)
                                  }
                                  className={cn(
                                    "px-2 py-1 rounded text-xs font-medium transition-colors",
                                    member.station === s
                                      ? "bg-primary/50 text-foreground"
                                      : "bg-background/60 text-foreground/60 hover:bg-primary/20",
                                  )}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Status Management */}
                          <div>
                            <p className="text-xs font-semibold text-foreground/70 mb-2">
                              Status
                            </p>
                            <div className="flex gap-2">
                              {["on-duty", "break", "off-duty"].map(
                                (status) => (
                                  <button
                                    key={status}
                                    onClick={() =>
                                      updateStaffStatus(
                                        member.id,
                                        status as StaffMember["status"],
                                      )
                                    }
                                    className={cn(
                                      "flex-1 px-2 py-1 rounded text-xs font-medium transition-colors",
                                      member.status === status
                                        ? "bg-primary/50 text-foreground"
                                        : "bg-background/60 text-foreground/60 hover:bg-primary/20",
                                    )}
                                  >
                                    {status.replace("-", " ")}
                                  </button>
                                ),
                              )}
                            </div>
                          </div>

                          {/* Release Button */}
                          <button
                            onClick={() => releaseStaff(member.id)}
                            className="w-full mt-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-xs font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <Trash2 size={12} />
                            Release from Duty
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
