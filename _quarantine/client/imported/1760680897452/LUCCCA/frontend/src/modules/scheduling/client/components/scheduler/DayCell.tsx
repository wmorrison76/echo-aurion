import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { LeaveRequest } from "@/lib/leave";

interface Props {
  valueIn: string;
  valueOut: string;
  position: string;
  breakMin: number;
  tip: number;
  leaveReq?: LeaveRequest | null;
  onChange: (next: {
    in: string;
    out: string;
    position: string;
    breakMin: number;
    tip: number;
  }) => void;
}

export default function DayCell({
  valueIn,
  valueOut,
  position,
  breakMin,
  tip,
  leaveReq,
  onChange,
}: Props) {
  return (
    <div
      className={cn(
        "space-y-0.5 p-0 rounded-md neon-cell border border-border bg-background/40",
      )}
    >
      <div className="grid grid-cols-[1fr_1fr] gap-1">
        <Input
          value={valueIn ?? ""}
          onChange={(e) =>
            onChange({
              in: e.target.value,
              out: valueOut ?? "",
              position: position ?? "",
              breakMin,
              tip,
            })
          }
          placeholder="IN"
          className="h-6 text-[11px] bg-transparent text-foreground placeholder:text-foreground/60 min-w-[5.75rem] w-[5.75rem] text-center px-0"
          aria-label="Clock in"
        />
        <Input
          value={valueOut ?? ""}
          onChange={(e) =>
            onChange({
              in: valueIn ?? "",
              out: e.target.value,
              position: position ?? "",
              breakMin,
              tip,
            })
          }
          placeholder="OUT"
          className="h-6 text-[11px] bg-transparent text-foreground placeholder:text-foreground/60 min-w-[5.75rem] w-[5.75rem] text-center px-0"
          aria-label="Clock out"
        />
      </div>
      <div className="grid grid-cols-2 gap-1 items-center">
        <Input
          aria-label="position"
          value={position ?? ""}
          onChange={(e) =>
            onChange({
              in: valueIn ?? "",
              out: valueOut ?? "",
              position: e.target.value,
              breakMin,
              tip,
            })
          }
          placeholder="POSITION"
          className="col-span-2 h-6 text-[11px] bg-transparent text-foreground placeholder:text-foreground/60 text-center uppercase px-0"
        />
        {leaveReq && (
          <div
            className={`col-span-2 text-center text-[10px] px-1 py-0.5 rounded font-medium ${leaveReq.status === "approved" ? "bg-green-500/30 text-green-900" : leaveReq.status === "pending" ? "bg-yellow-400/30 text-yellow-900" : "bg-red-500/30 text-red-900"}`}
          >
            {leaveReq.type.toUpperCase()} {leaveReq.hours}h • {leaveReq.status}
          </div>
        )}
      </div>
    </div>
  );
}
