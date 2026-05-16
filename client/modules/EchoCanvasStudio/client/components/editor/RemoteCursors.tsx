import React, { useState, useEffect } from "react";
import { RemoteUserCursor } from "../../lib/collaboration";
interface RemoteCursorsProps {
  remoteCursors: Map<string, RemoteUserCursor>;
}
export default function RemoteCursors({ remoteCursors }: RemoteCursorsProps) {
  const [cursors, setCursors] = useState<RemoteUserCursor[]>([]);
  useEffect(() => {
    setCursors(Array.from(remoteCursors.values()));
  }, [remoteCursors]);
  return (
    <>
      {" "}
      {cursors.map((cursor) => (
        <div
          key={cursor.userId}
          style={{
            position: "fixed",
            left: `${cursor.cursorX}px`,
            top: `${cursor.cursorY}px`,
            pointerEvents: "none",
            zIndex: 10000,
          }}
        >
          {" "}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill={cursor.userColor}
            style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.5))" }}
          >
            {" "}
            <path d="M0,0 L8,12 L6,18 L12,14 L18,24 L24,0 Z" />{" "}
          </svg>{" "}
          <div
            style={{
              position: "absolute",
              top: "24px",
              left: "8px",
              background: cursor.userColor,
              color: "white",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: "bold",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            {" "}
            {cursor.userName}{" "}
          </div>{" "}
        </div>
      ))}{" "}
    </>
  );
}
