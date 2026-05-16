/** * Staff Schedule Overlay * Shows which staff are scheduled and their availability * Integrates with Schedule module */ import React, {
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";
import { Users, AlertCircle } from "lucide-react";
interface StaffMember {
  id: string;
  name: string;
  role: "chef" | "sous-chef" | "line-cook" | "pastry" | "server";
  scheduled: boolean;
  hoursAvailable: number;
}
interface StaffScheduleOverlayProps {
  date: Date;
  expectedCovers: number;
  onStaffingUpdate?: (staffing: StaffMember[]) => void;
}
export const StaffScheduleOverlay: React.FC<StaffScheduleOverlayProps> = ({
  date,
  expectedCovers,
  onStaffingUpdate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([
    {
      id: "1",
      name: "Chef Jean",
      role: "chef",
      scheduled: true,
      hoursAvailable: 8,
    },
    {
      id: "2",
      name: "Marcus",
      role: "line-cook",
      scheduled: true,
      hoursAvailable: 8,
    },
    {
      id: "3",
      name: "Sarah",
      role: "pastry",
      scheduled: false,
      hoursAvailable: 0,
    },
  ]);
  const staffingRatio =
    expectedCovers > 0
      ? staff.filter((s) => s.scheduled).length / Math.ceil(expectedCovers / 10)
      : 0;
  const handleStaffing = (staffMember: StaffMember) => {
    const updated = staff.map((s) =>
      s.id === staffMember.id ? { ...s, scheduled: !s.scheduled } : s,
    );
    setStaff(updated);
    onStaffingUpdate?.(updated);
  };
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className={cn(
          "gap-2 rounded-lg",
          staffingRatio < 0.7
            ? "border-red-400/30 text-red-600"
            : "border-blue-400/30 text-primary",
          "dark:text-blue-400",
        )}
      >
        {" "}
        <Users size={16} /> Staff ({staff.filter((s) => s.scheduled).length}
        ){" "}
      </Button>
    );
  }
  return (
    <div
      className={cn(
        "absolute top-32 left-20 bg-background dark:bg-slate-800",
        "border border-slate-200 dark:border-border rounded-lg",
        "shadow-2xl p-6 z-50 max-w-sm w-96 max-h-96 overflow-y-auto",
      )}
    >
      {" "}
      <div className="flex items-center justify-between mb-4">
        {" "}
        <h3 className="text-lg font-semibold text-foreground dark:text-white">
          {" "}
          Schedule: {date.toLocaleDateString()}{" "}
        </h3>{" "}
        <Button
          onClick={() => setIsOpen(false)}
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
        >
          {" "}
          ✕{" "}
        </Button>{" "}
      </div>{" "}
      <div
        className={cn(
          "p-3 rounded mb-4 border",
          staffingRatio < 0.7
            ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
            : "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
        )}
      >
        {" "}
        <p
          className={cn(
            "text-sm font-medium",
            staffingRatio < 0.7
              ? "text-red-700 dark:text-red-400"
              : "text-green-700 dark:text-green-400",
          )}
        >
          {" "}
          Expected: {expectedCovers} covers{" "}
        </p>{" "}
        <p
          className={cn(
            "text-xs",
            staffingRatio < 0.7
              ? "text-red-600 dark:text-red-300"
              : "text-green-600 dark:text-green-300",
          )}
        >
          {" "}
          Scheduled: {staff.filter((s) => s.scheduled).length} staff (
          {Math.round(staffingRatio * 100)}% ideal){" "}
        </p>{" "}
      </div>{" "}
      <div className="space-y-2">
        {" "}
        {staff.map((member) => (
          <button
            key={member.id}
            onClick={() => handleStaffing(member)}
            className={cn(
              "w-full p-2 rounded border text-left transition-colors",
              member.scheduled
                ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-primary"
                : "bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600",
            )}
          >
            {" "}
            <div className="flex justify-between items-center">
              {" "}
              <div>
                {" "}
                <p
                  className={cn(
                    "text-sm font-medium",
                    member.scheduled
                      ? "text-blue-900 dark:text-blue-100"
                      : "text-foreground",
                  )}
                >
                  {" "}
                  {member.name}{" "}
                </p>{" "}
                <p
                  className={cn(
                    "text-xs",
                    member.scheduled
                      ? "text-blue-700 dark:text-blue-400"
                      : "text-muted-foreground",
                  )}
                >
                  {" "}
                  {member.role}{" "}
                </p>{" "}
              </div>{" "}
              <input
                type="checkbox"
                checked={member.scheduled}
                onChange={() => {}}
                className="w-4 h-4"
              />{" "}
            </div>{" "}
          </button>
        ))}{" "}
      </div>{" "}
      {staffingRatio < 0.7 && (
        <div className="mt-4 p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
          {" "}
          <p className="font-medium">⚠️ Understaffed</p>{" "}
          <p>Consider reducing covers or bringing in additional staff</p>{" "}
        </div>
      )}{" "}
    </div>
  );
};
export default StaffScheduleOverlay;
