import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { parseTimeRange, hoursForRange } from "@/lib/schedule";
import { useEffect, useMemo, useState } from "react";

interface Props {
  value: string;
  onChange: (next: { value: string; range: { start: number; end: number } | null }) => void;
  className?: string;
  placeholder?: string;
}

export default function TimeRangeInput({ value, onChange, className, placeholder }: Props) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  const range = useMemo(() => parseTimeRange(text), [text]);
  const valid = text.trim() === "" || !!range;
  const hours = useMemo(() => hoursForRange(range), [range]);

  return (
    <div className="relative">
      <Input
        value={text}
        onChange={(e) => {
          const t = e.target.value;
          setText(t);
          onChange({ value: t, range: parseTimeRange(t) });
        }}
        className={cn("h-9 pr-12 text-sm", !valid && "border-destructive/70 bg-destructive/5", className)}
        placeholder={placeholder ?? "9-5 or 9:30-17"}
      />
      <div className={cn("absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground", hours > 0 ? "opacity-100" : "opacity-60")}
        aria-label="hours">
        {hours > 0 ? hours.toFixed(2) + "h" : ""}
      </div>
    </div>
  );
}
