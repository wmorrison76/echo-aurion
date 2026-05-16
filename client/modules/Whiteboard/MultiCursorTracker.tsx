import React, { useEffect, useState } from "react";
import { ParticipantInfo } from "./types";
import { realtimeManager } from "@/lib/supabase";
import { cn } from "@/lib/glass";

interface CursorPosition {
  userId: string;
  userName: string;
  x: number;
  y: number;
  color: string;
  timestamp: number;
  isActive: boolean;
}

interface MultiCursorTrackerProps {
  sessionId: string;
  userId: string;
  participants: ParticipantInfo[];
  onCursorMove?: (x: number, y: number) => void;
  viewportX?: number;
  viewportY?: number;
  zoomLevel?: number;
}

export const MultiCursorTracker: React.FC<MultiCursorTrackerProps> = ({
  sessionId,
  userId,
  participants,
  onCursorMove,
  viewportX = 0,
  viewportY = 0,
  zoomLevel = 1,
}) => {
  const [remoteCursors, setRemoteCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [showOwnCursor, setShowOwnCursor] = useState(true);
  const [localCursorPos, setLocalCursorPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const unsubscribe = realtimeManager.subscribe(sessionId, "cursor", (payload: CursorPosition) => {
      if (payload.userId !== userId) {
        setRemoteCursors((prev) => {
          const updated = new Map(prev);
          updated.set(payload.userId, {
            ...payload,
            timestamp: Date.now(),
            isActive: true,
          });
          return updated;
        });
      }
    });

    return () => unsubscribe();
  }, [sessionId, userId]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const pos = { x: e.clientX, y: e.clientY };
      setLocalCursorPos(pos);
      onCursorMove?.(pos.x, pos.y);

      realtimeManager.sendEvent(sessionId, {
        type: "cursor",
        userId,
        sessionId,
        timestamp: Date.now(),
        data: {
          x: pos.x,
          y: pos.y,
          userName: participants.find((p) => p.userId === userId)?.userName || "User",
          color: participants.find((p) => p.userId === userId)?.color || "#3b82f6",
        },
      });
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [sessionId, userId, participants, onCursorMove]);

  useEffect(() => {
    const checkInactiveCursors = setInterval(() => {
      const now = Date.now();
      setRemoteCursors((prev) => {
        const updated = new Map(prev);
        updated.forEach((cursor, key) => {
          if (now - cursor.timestamp > 5000) {
            updated.delete(key);
          }
        });
        return updated;
      });
    }, 2000);

    return () => clearInterval(checkInactiveCursors);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {showOwnCursor && (
        <div
          className="absolute rounded-full bg-blue-500 opacity-70"
          style={{
            left: localCursorPos.x - viewportX / zoomLevel,
            top: localCursorPos.y - viewportY / zoomLevel,
            width: 8,
            height: 8,
            transform: "translate(-50%, -50%)",
          }}
        />
      )}
      {Array.from(remoteCursors.values()).map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute"
          style={{
            left: cursor.x - viewportX / zoomLevel,
            top: cursor.y - viewportY / zoomLevel,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className={cn("rounded-full w-3 h-3 shadow-lg")}
            style={{ backgroundColor: cursor.color }}
          />
          <div
            className="mt-1 rounded px-2 py-1 text-xs text-white shadow"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.userName}
          </div>
        </div>
      ))}
    </div>
  );
};

export function useCursorTracking(sessionId: string, userId: string) {
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
      realtimeManager.sendEvent(sessionId, {
        type: "cursor",
        userId,
        sessionId,
        timestamp: Date.now(),
        data: { x: e.clientX, y: e.clientY },
      });
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [sessionId, userId]);

  return cursorPos;
}

export default MultiCursorTracker;
