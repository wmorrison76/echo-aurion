// src/components/ui/calendar.tsx
import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

export function Calendar(props: React.ComponentProps<typeof DayPicker>) {
  return (
    <div className="p-2 rounded-md border bg-card text-card-foreground">
      <DayPicker {...props} />
    </div>
  );
}
