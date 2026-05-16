import React, { useState, useEffect } from "react";
import { Users, Wifi, WifiOff } from "lucide-react";
import type { RemoteUserCursor } from "../../lib/collaboration-cursor-tracker";

interface CollaborationIndicatorProps {
  activeUsers: RemoteUserCursor[];
  isConnected: boolean;
  userCount: number;
}

export default function CollaborationIndicator({
  activeUsers,
  isConnected,
  userCount,
}: CollaborationIndicatorProps) {
  const [visibleCursors, setVisibleCursors] = useState<RemoteUserCursor[]>([]);

  useEffect(() => {
    setVisibleCursors(activeUsers.filter((u) => u.isActive));
  }, [activeUsers]);

  return (
    <>
      {/* Connection Status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          backgroundColor: isConnected ? "rgba(78, 205, 196, 0.1)" : "rgba(255, 107, 107, 0.1)",
          border: `1px solid ${isConnected ? "#4ECDC4" : "#ff6b6b"}`,
          borderRadius: "4px",
          fontSize: "11px",
          color: isConnected ? "#4ECDC4" : "#ff6b6b",
          fontWeight: "600",
        }}
      >
        {isConnected ? (
          <>
            <Wifi size={12} />
            Collaborative Mode On
          </>
        ) : (
          <>
            <WifiOff size={12} />
            Offline
          </>
        )}
      </div>

      {/* Active Users */}
      {visibleCursors.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 12px",
            backgroundColor: "#0b0f1a",
            border: "1px solid #333",
            borderRadius: "4px",
          }}
        >
          <Users size={12} color="#c8a97e" />
          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            {visibleCursors.slice(0, 3).map((user) => (
              <div
                key={user.userId}
                title={user.userName}
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  backgroundColor: user.color,
                  border: "2px solid #0a0a0a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#fff",
                }}
              >
                {user.userName.charAt(0).toUpperCase()}
              </div>
            ))}
            {visibleCursors.length > 3 && (
              <div
                style={{
                  fontSize: "11px",
                  color: "#666",
                  marginLeft: "4px",
                }}
              >
                +{visibleCursors.length - 3}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Remote Cursors Visualization */}
      <div style={{ position: "fixed", pointerEvents: "none", zIndex: 999 }}>
        {visibleCursors.map((user) => (
          <div
            key={user.userId}
            style={{
              position: "absolute",
              left: `${user.x}px`,
              top: `${user.y}px`,
              pointerEvents: "none",
              zIndex: 999,
            }}
          >
            {/* Cursor Pointer */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              style={{
                filter: `drop-shadow(0 0 2px ${user.color})`,
              }}
            >
              <path
                d="M0 0 L12 12 L8 18 L6 18 L8 12 L0 12 Z"
                fill={user.color}
              />
            </svg>

            {/* User Label */}
            <div
              style={{
                marginLeft: "12px",
                marginTop: "4px",
                backgroundColor: user.color,
                color: "#fff",
                padding: "2px 6px",
                borderRadius: "2px",
                fontSize: "10px",
                fontWeight: "600",
                whiteSpace: "nowrap",
              }}
            >
              {user.userName}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
