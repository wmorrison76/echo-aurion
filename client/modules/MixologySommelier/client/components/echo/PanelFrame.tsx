import React, { useState } from "react";
import { X, Minimize2, Maximize2 } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
interface PanelFrameProps {
  title: string;
  icon?: string;
  onClose?: () => void;
  children: React.ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
  minimizable?: boolean;
  maximizable?: boolean;
  [key: string]: any;
} /** * PanelFrame - Wraps module content with consistent chrome (header, controls) * Used to give all module panels a unified look and behavior */
export const PanelFrame: React.FC<PanelFrameProps> = ({
  title,
  icon = "📦",
  onClose,
  children,
  defaultWidth = 800,
  defaultHeight = 600,
  minimizable = true,
  maximizable = true,
  ...props
}) => {
  const { theme, isDark } = useTheme();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem",
    backgroundColor: isDark
      ? "rgba(20, 20, 30, 0.8)"
      : "rgba(240, 240, 245, 0.8)",
    borderBottom: `1px solid ${theme.colors.border}`,
    backdropFilter: "blur(10px)",
  };
  const titleStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "1.125rem",
    fontWeight: "600",
    color: theme.colors.foreground,
  };
  const controlsStyle: React.CSSProperties = {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
  };
  const buttonStyle: React.CSSProperties = {
    padding: "0.5rem",
    background: "transparent",
    border: `1px solid ${theme.colors.border}`,
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
    color: theme.colors.foreground,
  };
  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflow: "auto",
    backgroundColor: theme.colors.background,
  };
  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: isMinimized ? "auto" : "100%",
    backgroundColor: theme.colors.card,
    borderRadius: "12px",
    border: `1px solid ${theme.colors.border}`,
    boxShadow: isDark
      ? `0 0 30px ${theme.glow?.primary || "transparent"}`
      : "0 4px 12px rgba(0,0,0,0.1)",
    overflow: "hidden",
  };
  return (
    <div style={containerStyle} {...props}>
      {" "}
      {/* Header */}{" "}
      <div style={headerStyle}>
        {" "}
        <div style={titleStyle}>
          {" "}
          <span>{icon}</span> <span>{title}</span>{" "}
        </div>{" "}
        <div style={controlsStyle}>
          {" "}
          {minimizable && (
            <button
              style={buttonStyle}
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? "Expand" : "Minimize"}
              onMouseOver={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.backgroundColor = isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.05)";
              }}
              onMouseOut={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.backgroundColor = "transparent";
              }}
            >
              {" "}
              <Minimize2 size={16} />{" "}
            </button>
          )}{" "}
          {maximizable && (
            <button
              style={buttonStyle}
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restore" : "Maximize"}
              onMouseOver={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.backgroundColor = isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.05)";
              }}
              onMouseOut={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.backgroundColor = "transparent";
              }}
            >
              {" "}
              <Maximize2 size={16} />{" "}
            </button>
          )}{" "}
          {onClose && (
            <button
              style={buttonStyle}
              onClick={onClose}
              title="Close"
              onMouseOver={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.backgroundColor = isDark
                  ? "rgba(255, 59, 48, 0.2)"
                  : "rgba(255, 59, 48, 0.1)";
              }}
              onMouseOut={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.backgroundColor = "transparent";
              }}
            >
              {" "}
              <X size={16} />{" "}
            </button>
          )}{" "}
        </div>{" "}
      </div>{" "}
      {/* Content */}{" "}
      {!isMinimized && <div style={contentStyle}>{children}</div>}{" "}
    </div>
  );
};
