import { useState, useRef, useEffect } from "react";
import { Users, Clock, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/glass";
import { safeFetchJson } from "@/lib/safe-fetch";

interface StaffMember {
  id: string;
  name: string;
  role: string;
  status: "on-duty" | "break" | "off-duty";
  since: Date;
  image?: string;
}

const ROLE_EMOJI: Record<string, string> = {
  "Head Chef": "👨‍🍳",
  Manager: "👩‍💼",
  Server: "🧑‍🍳",
  "Pastry Chef": "👩‍🍳",
  Dishwasher: "👨‍💼",
};

export function StaffStatus() {
  const [isOpen, setIsOpen] = useState(false);
  const staffRef = useRef<HTMLDivElement>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchStaff = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await safeFetchJson<{
          staff?: { id: string; name: string; role: string; status: string; since: string }[];
        }>("/api/dashboard/staff-status", {}, { staff: [] } as any);
        if (cancelled) return;

        const staff = data?.staff ?? [];
        setStaffMembers(
          staff.map((s: { id: string; name: string; role: string; status: string; since: string }) => ({
            id: s.id,
            name: s.name,
            role: s.role,
            status: s.status as StaffMember["status"],
            since: new Date(s.since),
            image: ROLE_EMOJI[s.role] ?? "👤",
          }))
        );
      } catch {
        if (!cancelled) {
          setStaffMembers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStaff();
    const interval = setInterval(fetchStaff, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (staffRef.current && !staffRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const onDutyCount = staffMembers.filter((s) => s.status === "on-duty").length;
  const onBreakCount = staffMembers.filter((s) => s.status === "break").length;
  const offDutyCount = staffMembers.filter((s) => s.status === "off-duty").length;

  const getStatusColor = (status: StaffMember["status"]) => {
    switch (status) {
      case "on-duty":
        return "bg-green-500/20 text-green-600 border-green-500/30";
      case "break":
        return "bg-yellow-500/20 text-yellow-600 border-yellow-500/30";
      case "off-duty":
        return "bg-gray-500/20 text-gray-600 border-gray-500/30";
    }
  };

  const getStatusLabel = (status: StaffMember["status"]) => {
    switch (status) {
      case "on-duty":
        return "🟢 On Duty";
      case "break":
        return "🟡 On Break";
      case "off-duty":
        return "⚪ Off Duty";
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div ref={staffRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-7 w-7 rounded flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-primary/15 transition-colors flex-shrink-0"
        title="Staff Status"
      >
        <Users size={14} />
        <span className="absolute top-0.5 right-0.5 flex items-center justify-center w-3.5 h-3.5 bg-green-500 text-white text-[10px] font-bold rounded-full">
          {onDutyCount}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-80 bg-background/95 backdrop-blur-sm border border-border/30 rounded-lg shadow-xl z-50 max-h-96 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border/30">
            <h3 className="font-semibold text-foreground text-sm">
              Staff Status
            </h3>
            <div className="flex gap-4 mt-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-foreground/70">On Duty: {onDutyCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-foreground/70">On Break: {onBreakCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-500" />
                <span className="text-foreground/70">Off: {offDutyCount}</span>
              </div>
            </div>
          </div>

          {/* Staff List */}
          <div className="overflow-y-auto flex-1">
            {loading && (
              <div className="flex items-center justify-center py-8 text-foreground/60">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
            {error && (
              <div className="py-4 px-4 text-center text-sm text-destructive">{error}</div>
            )}
            {!loading && !error && (
            <div className="divide-y divide-border/30">
              {staffMembers.map((staff) => (
                <div
                  key={staff.id}
                  className="p-4 hover:bg-primary/10 transition-colors cursor-pointer"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("open-panel", { detail: { id: "schedule" } })
                    );
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="text-2xl flex-shrink-0">
                      {staff.image}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-foreground">
                        {staff.name}
                      </h4>
                      <p className="text-xs text-foreground/70">
                        {staff.role}
                      </p>

                      {/* Status and Time */}
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={cn(
                            "text-xs font-medium px-2 py-1 rounded border",
                            getStatusColor(staff.status)
                          )}
                        >
                          {getStatusLabel(staff.status)}
                        </span>
                        <span className="text-xs text-foreground/50 flex items-center gap-1">
                          <Clock size={12} />
                          {formatTime(staff.since)}
                        </span>
                      </div>
                    </div>

                    {/* Status Indicator */}
                    <div
                      className={cn(
                        "w-3 h-3 rounded-full flex-shrink-0 mt-1",
                        staff.status === "on-duty"
                          ? "bg-green-500"
                          : staff.status === "break"
                            ? "bg-yellow-500"
                            : "bg-gray-500"
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* Warning if understaffed */}
          {onDutyCount < 3 && (
            <div className="p-3 border-t border-border/30 bg-yellow-500/10 text-yellow-700 text-xs flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>Potentially understaffed for peak hours</span>
            </div>
          )}

          {/* Footer */}
          <div className="p-3 border-t border-border/30">
            <button
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("open-panel", { detail: { id: "schedule" } })
                );
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-foreground text-xs font-medium transition-colors"
            >
              View Full Schedule
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
