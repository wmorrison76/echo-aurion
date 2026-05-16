import React from "react";
import { useOpsEvents } from "../../hooks/useOpsEvents";
export const OpsBoard: React.FC = () => {
  const { events } = useOpsEvents();
  return (
    <div className="border rounded-lg p-3 text-xs space-y-2">
      {" "}
      <h3 className="text-sm font-medium mb-1">Ops & Setup Board</h3>{" "}
      {events.map((evt) => (
        <div
          key={evt.id}
          className="flex justify-between items-start border-b last:border-0 pb-1 last:pb-0"
        >
          {" "}
          <div>
            {" "}
            <div className="font-medium text-xs">{evt.name}</div>{" "}
            <div className="text-[0.65rem] text-muted-foreground">
              {" "}
              {evt.spaceName} · {evt.startTime}{" "}
            </div>{" "}
          </div>{" "}
          <div className="text-right text-[0.65rem] text-muted-foreground space-y-0.5">
            {" "}
            <div>Headcount: {evt.headcount}</div>{" "}
            <div>Setup: {evt.setupType}</div>{" "}
            {evt.notes && <div>Notes: {evt.notes}</div>}{" "}
          </div>{" "}
        </div>
      ))}{" "}
      {events.length === 0 && (
        <p className="text-[0.65rem] text-muted-foreground">
          {" "}
          No events scheduled for today.{" "}
        </p>
      )}{" "}
    </div>
  );
};
