import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import TimeInput from "./TimeInput";
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
        "space-y-0.5 sm:space-y-1 p-0.5 sm:p-1 border border-border bg-background min-h-[3.5rem] sm:min-h-[4rem] w-full relative overflow-visible",
        "hover:bg-muted/20 transition-colors",
      )}
      style={{ isolation: "isolate" }}
    >
      {" "}
      <div
        className="grid grid-cols-[1fr_1fr] gap-0.5 sm:gap-1"
        style={{ minWidth: 0 }}
      >
        {" "}
        <TimeInput
          value={valueIn ?? ""}
          onChange={(val) =>
            onChange({
              in: val,
              out: valueOut ?? "",
              position: position ?? "",
              breakMin,
              tip,
            })
          }
          placeholder="IN"
          ariaLabel="Clock in"
        />{" "}
        <TimeInput
          value={valueOut ?? ""}
          onChange={(val) =>
            onChange({
              in: valueIn ?? "",
              out: val,
              position: position ?? "",
              breakMin,
              tip,
            })
          }
          placeholder="OUT"
          ariaLabel="Clock out"
        />{" "}
      </div>{" "}
      <div className="grid grid-cols-1 gap-0.5 items-center mt-0.5 sm:mt-1">
        {" "}
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
          placeholder="POS"
          className="!h-4 sm:!h-4 !py-0 !px-0.5 !text-[8px] sm:!text-[9px] text-center uppercase border border-border/30 focus:!border-primary focus:!ring-1 focus:!ring-primary/20 focus:!z-[100] relative rounded-none"
          style={{
            maxWidth: "100%",
            width: "100%",
            backgroundColor: "var(--background)",
            color: "var(--foreground) !important",
            WebkitTextFillColor: "var(--foreground) !important",
            caretColor: "var(--foreground)",
            overflow: "visible",
            textOverflow: "clip",
          }}
          onFocus={(e) => {
            e.target.style.color = "var(--foreground)";
            e.target.style.webkitTextFillColor = "var(--foreground)";
          }}
          onBlur={(e) => {
            e.target.style.color = "var(--foreground)";
            e.target.style.webkitTextFillColor = "var(--foreground)";
          }}
        />{" "}
        {leaveReq && (
          <div
            className={`col-span-2 text-center text-[7px] px-0.5 py-0.5 rounded font-medium leading-tight ${leaveReq.status === "approved" ? "bg-green-500/20 text-green-700 dark:text-green-400" : leaveReq.status === "pending" ? "bg-yellow-400/20 text-yellow-700 dark:text-yellow-400" : "bg-red-500/20 text-red-700 dark:text-red-400"}`}
          >
            {" "}
            {leaveReq.type.toUpperCase()} {leaveReq.hours}h{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
}
