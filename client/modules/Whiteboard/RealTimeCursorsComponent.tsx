import React from "react";
import { ParticipantInfo } from "./types";
import { cn } from "@/lib/glass";

interface RealTimeCursorsComponentProps {
  participants: ParticipantInfo[];
  currentUserId: string;
  viewportX: number;
  viewportY: number;
  zoomLevel: number;
  canvasWidth: number;
  canvasHeight: number;
}

export const RealTimeCursorsComponent: React.FC<
  RealTimeCursorsComponentProps
> = ({
  participants,
  currentUserId,
  viewportX,
  viewportY,
  zoomLevel,
  canvasWidth,
  canvasHeight,
}) => {
  return (
    <>
      {participants
        .filter(
          (p) =>
            p.userId !== currentUserId && p.isActive && p.cursorX && p.cursorY,
        )
        .map((participant) => {
          if (
            participant.cursorX === undefined ||
            participant.cursorY === undefined
          ) {
            return null;
          }

          const screenX = participant.cursorX * zoomLevel + viewportX;
          const screenY = participant.cursorY * zoomLevel + viewportY;

          // Only show if within visible canvas
          if (
            screenX < 0 ||
            screenX > canvasWidth ||
            screenY < 0 ||
            screenY > canvasHeight
          ) {
            return null;
          }

          return (
            <div
              key={participant.userId}
              className="absolute pointer-events-none"
              style={{
                left: `${screenX}px`,
                top: `${screenY}px`,
                zIndex: 40,
              }}
            >
              {/* Cursor pointer */}
              <div
                className="w-4 h-6 absolute"
                style={{
                  clipPath:
                    "polygon(0 0, 100% 40%, 60% 60%, 40% 100%, 20% 80%, 50% 50%)",
                  backgroundColor: participant.color,
                  filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))",
                }}
              />

              {/* Name label */}
              <div
                className="absolute left-5 top-1 bg-surface text-white text-xs font-medium px-2 py-1 rounded whitespace-nowrap pointer-events-none"
                style={{
                  borderLeft: `3px solid ${participant.color}`,
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                }}
              >
                {participant.userName}
              </div>

              {/* Status indicator */}
              {participant.selectedTool && (
                <div
                  className="absolute left-5 top-8 text-xs text-slate-400 pointer-events-none"
                  style={{
                    whiteSpace: "nowrap",
                  }}
                >
                  {participant.selectedTool === "select"
                    ? "viewing"
                    : "editing"}
                </div>
              )}
            </div>
          );
        })}
    </>
  );
};
