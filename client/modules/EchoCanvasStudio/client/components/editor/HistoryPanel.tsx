import React from "react";
import { RotateCcw, RotateCw, Trash2 } from "lucide-react";
export interface HistoryEntry {
  id: string;
  action: string;
  timestamp: number;
  thumbnail?: string;
  canvasData?: Uint8ClampedArray;
}
interface HistoryPanelProps {
  history: HistoryEntry[];
  currentIndex: number;
  onUndo: () => void;
  onRedo: () => void;
  onGotoState: (index: number) => void;
  onClearHistory: () => void;
}
export default function HistoryPanel({
  history,
  currentIndex,
  onUndo,
  onRedo,
  onGotoState,
  onClearHistory,
}: HistoryPanelProps) {
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };
  const formatAction = (action: string) => {
    return action
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#0a0a0a",
        borderRadius: "8px",
        border: "1px solid #333",
        overflow: "hidden",
      }}
    >
      {" "}
      {/* Header */}{" "}
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid #333",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {" "}
        <h3
          style={{
            color: "#c8a97e",
            fontSize: "12px",
            fontWeight: "bold",
            margin: 0,
          }}
        >
          {" "}
          History{" "}
        </h3>{" "}
        <button
          onClick={onClearHistory}
          title="Clear history"
          style={{
            background: "none",
            border: "none",
            color: "#666",
            cursor: "pointer",
            padding: "0",
            fontSize: "12px",
          }}
        >
          {" "}
          <Trash2 size={14} />{" "}
        </button>{" "}
      </div>{" "}
      {/* Undo/Redo Buttons */}{" "}
      <div
        style={{
          display: "flex",
          gap: "8px",
          padding: "8px 12px",
          borderBottom: "1px solid #333",
        }}
      >
        {" "}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
          style={{
            flex: 1,
            padding: "6px",
            backgroundColor: canUndo
              ? "rgba(0, 240, 255, 0.1)"
              : "rgba(0, 240, 255, 0.05)",
            border: "1px solid #333",
            color: canUndo ? "#c8a97e" : "#555",
            borderRadius: "3px",
            cursor: canUndo ? "pointer" : "not-allowed",
            fontSize: "11px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            transition: "all 0.2s",
          }}
        >
          {" "}
          <RotateCcw size={12} /> Undo{" "}
        </button>{" "}
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
          style={{
            flex: 1,
            padding: "6px",
            backgroundColor: canRedo
              ? "rgba(0, 240, 255, 0.1)"
              : "rgba(0, 240, 255, 0.05)",
            border: "1px solid #333",
            color: canRedo ? "#c8a97e" : "#555",
            borderRadius: "3px",
            cursor: canRedo ? "pointer" : "not-allowed",
            fontSize: "11px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            transition: "all 0.2s",
          }}
        >
          {" "}
          Redo <RotateCw size={12} />{" "}
        </button>{" "}
      </div>{" "}
      {/* History List */}{" "}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {" "}
        {history.length === 0 ? (
          <div
            style={{
              padding: "24px 12px",
              color: "#666",
              fontSize: "11px",
              textAlign: "center",
            }}
          >
            {" "}
            No history yet. Start editing to build history.{" "}
          </div>
        ) : (
          <div style={{ padding: "4px" }}>
            {" "}
            {history.map((entry, index) => {
              const isCurrentState = index === currentIndex;
              const isFutureState = index > currentIndex;
              return (
                <button
                  key={entry.id}
                  onClick={() => onGotoState(index)}
                  title={`${formatAction(entry.action)} at ${formatTime(entry.timestamp)}`}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    backgroundColor: isCurrentState
                      ? "rgba(0, 240, 255, 0.15)"
                      : isFutureState
                        ? "rgba(100, 100, 100, 0.1)"
                        : "transparent",
                    border: isCurrentState
                      ? "1px solid #c8a97e"
                      : "1px solid transparent",
                    borderLeft: isCurrentState
                      ? "3px solid #c8a97e"
                      : "3px solid transparent",
                    color: isFutureState ? "#555" : "#c8a97e",
                    cursor: "pointer",
                    fontSize: "10px",
                    textAlign: "left",
                    transition: "all 0.2s",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "2px",
                    borderRadius: "2px",
                  }}
                >
                  {" "}
                  <div>
                    {" "}
                    <div style={{ fontWeight: "bold", marginBottom: "2px" }}>
                      {" "}
                      {formatAction(entry.action)}{" "}
                    </div>{" "}
                    <div style={{ fontSize: "9px", color: "#666" }}>
                      {" "}
                      {formatTime(entry.timestamp)}{" "}
                    </div>{" "}
                  </div>{" "}
                  {isCurrentState && (
                    <span style={{ fontSize: "12px", fontWeight: "bold" }}>
                      {" "}
                      ●{" "}
                    </span>
                  )}{" "}
                </button>
              );
            })}{" "}
          </div>
        )}{" "}
      </div>{" "}
      {/* Stats */}{" "}
      <div
        style={{
          padding: "8px 12px",
          borderTop: "1px solid #333",
          fontSize: "9px",
          color: "#666",
          textAlign: "center",
        }}
      >
        {" "}
        {history.length > 0 && (
          <div>
            {" "}
            State {currentIndex + 1} of {history.length}{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
}
