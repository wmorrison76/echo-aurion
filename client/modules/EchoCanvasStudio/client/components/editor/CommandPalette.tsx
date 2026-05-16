import React, { useState, useEffect, useRef } from "react";
import { X, Search } from "lucide-react";

interface Command {
  id: string;
  name: string;
  category: string;
  shortcut?: string;
  description?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

export default function CommandPalette({
  isOpen,
  onClose,
  commands,
}: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "80px",
        zIndex: 3000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "#0b0f1a",
          border: "1px solid #333",
          borderRadius: "8px",
          width: "90%",
          maxWidth: "600px",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.9)",
        }}
      >
        {/* Search Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 16px",
            borderBottom: "1px solid #333",
          }}
        >
          <Search size={16} style={{ color: "#666" }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search commands..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            style={{
              flex: 1,
              backgroundColor: "transparent",
              border: "none",
              color: "#c8a97e",
              fontSize: "14px",
              outline: "none",
            }}
          />
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#666",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Commands List */}
        <div
          style={{
            overflowY: "auto",
            maxHeight: "calc(70vh - 50px)",
            flex: 1,
          }}
        >
          {filteredCommands.length > 0 ? (
            <div>
              {filteredCommands.map((cmd, index) => (
                <div key={cmd.id}>
                  {index === 0 ||
                  filteredCommands[index - 1].category !== cmd.category ? (
                    <div
                      style={{
                        padding: "8px 16px",
                        color: "#666",
                        fontSize: "10px",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        backgroundColor: "#0a0a0a",
                        borderTop: index === 0 ? "none" : "1px solid #333",
                      }}
                    >
                      {cmd.category}
                    </div>
                  ) : null}

                  <button
                    onClick={() => {
                      cmd.action();
                      onClose();
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      backgroundColor:
                        selectedIndex === index
                          ? "rgba(0, 240, 255, 0.1)"
                          : "transparent",
                      border: "none",
                      borderBottom: "1px solid #222",
                      color: selectedIndex === index ? "#c8a97e" : "#ccc",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "500",
                          marginBottom: "2px",
                        }}
                      >
                        {cmd.name}
                      </div>
                      {cmd.description && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: selectedIndex === index ? "#aaa" : "#666",
                          }}
                        >
                          {cmd.description}
                        </div>
                      )}
                    </div>
                    {cmd.shortcut && (
                      <div
                        style={{
                          fontSize: "10px",
                          color: selectedIndex === index ? "#c8a97e" : "#666",
                          marginLeft: "8px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {cmd.shortcut}
                      </div>
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                color: "#666",
                fontSize: "12px",
              }}
            >
              No commands found
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid #333",
            fontSize: "10px",
            color: "#666",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>↑↓ to navigate • ENTER to execute • ESC to close</span>
          <span>{filteredCommands.length} command(s)</span>
        </div>
      </div>
    </div>
  );
}
