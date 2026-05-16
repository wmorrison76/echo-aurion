import React, { useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { useIsMobile } from "../../hooks/use-responsive";
interface ResponsiveToolbarProps {
  title: string;
  onMenuAction?: (action: string) => void;
  children?: React.ReactNode;
}
export default function ResponsiveToolbar({
  title,
  onMenuAction,
  children,
}: ResponsiveToolbarProps) {
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  if (!isMobile) {
    return <>{children}</>;
  }
  return (
    <div
      style={{
        backgroundColor: "#0a0a0a",
        borderBottom: "1px solid #333",
        padding: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
      }}
    >
      {" "}
      <h1
        style={{
          color: "#c8a97e",
          fontSize: "14px",
          fontWeight: "bold",
          margin: 0,
        }}
      >
        {" "}
        {title}{" "}
      </h1>{" "}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        style={{
          background: "none",
          border: "none",
          color: "#c8a97e",
          cursor: "pointer",
          padding: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {" "}
        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}{" "}
      </button>{" "}
      {isMenuOpen && (
        <div
          style={{
            position: "absolute",
            top: "44px",
            right: "0",
            left: "0",
            backgroundColor: "#0b0f1a",
            borderBottom: "1px solid #333",
            maxHeight: "300px",
            overflowY: "auto",
            zIndex: 100,
          }}
        >
          {" "}
          {children}{" "}
        </div>
      )}{" "}
    </div>
  );
}
export function ResponsivePanel({
  title,
  children,
  isOpen: controlledIsOpen,
  onToggle,
}: {
  title: string;
  children: React.ReactNode;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const handleToggle = () => {
    if (onToggle) {
      onToggle(!isOpen);
    } else {
      setInternalIsOpen(!isOpen);
    }
  };
  if (!isMobile) {
    return <>{children}</>;
  }
  return (
    <div
      style={{
        backgroundColor: "#0b0f1a",
        border: "1px solid #333",
        borderRadius: "4px",
        overflow: "hidden",
        marginBottom: "8px",
      }}
    >
      {" "}
      <button
        onClick={handleToggle}
        style={{
          width: "100%",
          padding: "12px",
          backgroundColor: "#0f0f0f",
          color: "#c8a97e",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "12px",
          fontWeight: "bold",
        }}
      >
        {" "}
        {title}{" "}
        <ChevronDown
          size={16}
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />{" "}
      </button>{" "}
      {isOpen && (
        <div style={{ padding: "12px", borderTop: "1px solid #333" }}>
          {" "}
          {children}{" "}
        </div>
      )}{" "}
    </div>
  );
}
