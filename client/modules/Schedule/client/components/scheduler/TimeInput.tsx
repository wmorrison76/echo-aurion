import React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

function formatTimeInput(input: string): string {
  const cleaned = input.replace(/[^\dapmAPM\s:]/g, "");
  const numbers = cleaned.replace(/[^\d]/g, "");
  if (!numbers) return "";

  const hasAM = /a/i.test(cleaned);
  const hasPM = /p/i.test(cleaned);
  let period: "AM" | "PM" | "" = hasPM ? "PM" : hasAM ? "AM" : "";

  let hoursStr = "";
  let minutesStr = "";

  if (numbers.length <= 2) {
    hoursStr = numbers;
  } else {
    hoursStr = numbers.slice(0, -2);
    minutesStr = numbers.slice(-2);
  }

  let hour = Number.parseInt(hoursStr || "0", 10);
  if (!Number.isFinite(hour)) hour = 0;

  if (hour === 0) hour = 12;
  if (hour > 12 && period === "") {
    /* 24-hour hint */
    if (hour >= 13 && hour <= 23) {
      hour -= 12;
      period = "PM";
    } else if (hour === 24) {
      hour = 12;
      period = "AM";
    }
  }

  let minutes = minutesStr ? Number.parseInt(minutesStr, 10) : NaN;
  if (!Number.isFinite(minutes)) minutes = NaN;
  const minutesOut = Number.isFinite(minutes)
    ? String(Math.max(0, Math.min(59, minutes))).padStart(2, "0")
    : "";

  let out = `${hour}`;
  if (minutesOut) out += `:${minutesOut}`;

  if (period) return `${out} ${period}`.trim();

  /* Always attach a default AM/PM */
  return `${out} ${hour === 12 ? "PM" : "AM"}`.trim();
}

export default function TimeInput({
  value,
  onChange,
  placeholder = "Time",
  className,
  ariaLabel,
}: TimeInputProps) {
  const [displayValue, setDisplayValue] = React.useState(value || "");
  const [isFocused, setIsFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isFocused) setDisplayValue(value || "");
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayValue(raw);
    onChange(formatTimeInput(raw));
  };

  const handleFocus = () => {
    setIsFocused(true);
    window.setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const formatted = displayValue.trim() ? formatTimeInput(displayValue) : "";
    setDisplayValue(formatted);
    onChange(formatted);
  };

  return (
    <Input
      ref={inputRef}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={cn(
        "!h-6 sm:!h-7 !py-0.5 sm:!py-1 !px-0.5 sm:!px-1 !text-[9px] sm:!text-[10px] w-full text-center border border-border/50 focus:!border-primary focus:!ring-1 focus:!ring-primary/20 relative",
        "rounded-none",
        isFocused && "!shadow-md !z-[100] !border-primary",
        className,
      )}
      style={{
        minWidth: "0",
        maxWidth: "100%",
        width: "100%",
        zIndex: isFocused ? 100 : ("auto" as any),
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        WebkitTextFillColor: "var(--foreground)",
        caretColor: "var(--foreground)",
        overflow: "visible",
        textOverflow: "clip",
        whiteSpace: "nowrap",
      }}
    />
  );
}
