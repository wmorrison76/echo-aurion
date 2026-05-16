import React, { useState } from "react";
import { Users } from "lucide-react";
import { RemoteUserPresence } from "../../lib/collaboration";
interface PresenceIndicatorProps {
  onlineUsers: RemoteUserPresence[];
  isOnline: boolean;
}
export default function PresenceIndicator({
  onlineUsers,
  isOnline,
}: PresenceIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        background: "#0a0a0a",
        border: `1px solid ${isOnline ? "#c8a97e" : "#ff6b6b"}`,
        borderRadius: "8px",
        padding: "12px 16px",
        color: "#c8a97e",
        fontSize: "12px",
        fontWeight: "bold",
        zIndex: 1000,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        cursor: "pointer",
        backdropFilter: "blur(10px)",
      }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {" "}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {" "}
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: isOnline ? "#c8a97e" : "#ff6b6b",
            animation: isOnline ? "pulse 2s infinite" : "none",
          }}
        />{" "}
        <Users size={14} /> <span>{onlineUsers.length} online</span>{" "}
      </div>{" "}
      {isExpanded && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            background: "#0b0f1a",
            border: "1px solid #333",
            borderRadius: "8px",
            marginTop: "8px",
            minWidth: "200px",
            color: "#ccc",
            zIndex: 1001,
          }}
        >
          {" "}
          {onlineUsers.length > 0 ? (
            <div style={{ padding: "8px" }}>
              {" "}
              {onlineUsers.map((user) => (
                <div
                  key={user.userId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px",
                    borderBottom: "1px solid #333",
                  }}
                >
                  {" "}
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: user.userColor,
                    }}
                  />{" "}
                  <span style={{ fontSize: "11px" }}>{user.userName}</span>{" "}
                </div>
              ))}{" "}
            </div>
          ) : (
            <div style={{ padding: "12px", color: "#666" }}>
              {" "}
              No one else is editing{" "}
            </div>
          )}{" "}
        </div>
      )}{" "}
      <style>{` @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } } `}</style>{" "}
    </div>
  );
}
