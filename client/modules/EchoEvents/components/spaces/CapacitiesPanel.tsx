import React from "react";

type SpaceLike = {
  id?: string;
  name?: string;
  capacity?: number;
  setup_time_minutes?: number;
  teardown_time_minutes?: number;
};

export const CapacitiesPanel: React.FC<{
  space: SpaceLike | null | undefined;
}> = ({ space }) => {
  if (!space) return null;

  const maxSeated = typeof space.capacity === "number" ? space.capacity : 200;
  const maxReception =
    typeof space.capacity === "number" ? Math.round(space.capacity * 1.6) : 350;

  const setupMinutes =
    typeof space.setup_time_minutes === "number"
      ? space.setup_time_minutes
      : 120;
  const teardownMinutes =
    typeof space.teardown_time_minutes === "number"
      ? space.teardown_time_minutes
      : 60;

  return (
    <div className="border rounded-lg p-3 text-xs bg-muted/30">
      <div className="font-medium mb-1">Capacity & Constraints</div>
      <div>Space: {space.name ?? space.id ?? "Unknown"}</div>
      <div>Max seated: {maxSeated}</div>
      <div>Max reception: {maxReception}</div>
      <div>
        Setup buffer: {Math.round(setupMinutes / 60)}h • Teardown buffer:{" "}
        {Math.round(teardownMinutes / 60)}h
      </div>
    </div>
  );
};
