import React from "react";
import { Loader2 } from "lucide-react";

export function TurtleLoader({
  message = "Loading",
  note,
  small = false,
}: {
  message?: string;
  note?: string;
  small?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center">
      <Loader2
        className={`animate-spin ${small ? "h-5 w-5" : "h-7 w-7"} text-primary`}
      />
      <div>
        <div className={`${small ? "text-sm" : "text-base"} font-medium`}>
          {message}
        </div>
        {note ? (
          <div className="text-xs text-muted-foreground mt-1">{note}</div>
        ) : null}
      </div>
    </div>
  );
}
