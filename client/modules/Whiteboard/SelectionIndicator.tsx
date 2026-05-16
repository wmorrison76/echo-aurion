import React, { useEffect, useState } from "react";
import PresenceTracker from "./PresenceTracker";
import { UserPresence } from "./types/CollaborationTypes";
import { cn } from "@/lib/glass";
interface SelectionBox {
  userId: string;
  userName: string;
  userColor: string;
  elementIds: string[];
}
interface SelectionIndicatorProps {
  presenceTracker: PresenceTracker | null;
  currentUserId: string;
  elementPositions: Map<
    string,
    { x: number; y: number; width: number; height: number }
  >;
  viewportX: number;
  viewportY: number;
  zoomLevel: number;
  className?: string;
}
export const SelectionIndicator: React.FC<SelectionIndicatorProps> = ({
  presenceTracker,
  currentUserId,
  elementPositions,
  viewportX,
  viewportY,
  zoomLevel,
  className,
}) => {
  const [selections, setSelections] = useState<SelectionBox[]>([]);
  useEffect(() => {
    if (!presenceTracker) return;
    const updateSelections = () => {
      const activeUsers = presenceTracker.getActiveUsers();
      const updatedSelections = activeUsers
        .filter(
          (user) =>
            user.userId !== currentUserId && user.selectedElementIds.length > 0,
        )
        .map((user) => ({
          userId: user.userId,
          userName: user.userName,
          userColor: user.userColor,
          elementIds: user.selectedElementIds,
        }));
      setSelections(updatedSelections);
    };
    updateSelections();
    const interval = setInterval(updateSelections, 500);
    return () => clearInterval(interval);
  }, [presenceTracker, currentUserId]);
  return (
    <div className={cn("pointer-events-none absolute inset-0", className)}>
      {" "}
      {selections.map((selection) =>
        selection.elementIds.map((elementId) => {
          const pos = elementPositions.get(elementId);
          if (!pos) return null;
          const screenX = (pos.x - viewportX) * zoomLevel;
          const screenY = (pos.y - viewportY) * zoomLevel;
          const screenWidth = pos.width * zoomLevel;
          const screenHeight = pos.height * zoomLevel;
          return (
            <div
              key={`${selection.userId}-${elementId}`}
              className="absolute border-2 pointer-events-none"
              style={{
                left: `${screenX}px`,
                top: `${screenY}px`,
                width: `${screenWidth}px`,
                height: `${screenHeight}px`,
                borderColor: selection.userColor,
                borderRadius: "4px",
                boxShadow: `0 0 4px ${selection.userColor}40`,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            >
              {" "}
              {/* Label for selection */}{" "}
              <div
                className="absolute -top-6 left-0 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap"
                style={{ backgroundColor: selection.userColor }}
              >
                {" "}
                {selection.userName} selected{" "}
              </div>{" "}
            </div>
          );
        }),
      )}{" "}
      <style>{` @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } } `}</style>{" "}
    </div>
  );
};
export default SelectionIndicator;
