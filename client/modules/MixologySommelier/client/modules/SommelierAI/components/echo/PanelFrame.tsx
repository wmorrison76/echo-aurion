import React, { useState } from "react";
import { X, Minimize2, Maximize2 } from "lucide-react";
import { useTheme } from "../ThemeProvider";

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
}

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
    backgroundColor: isDark ? "rgba(20, 20, 30, 0.8)" : "rgba(240, 240, 245, 0.8)",
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
    display: isMinimized ? "none" : "block",
  };

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: isMinimized ? "auto" : "100%",
    width: isMaximized ? "100%" : defaultWidth,
    maxHeight: isMaximized ? "100%" : defaultHeight,
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
      <div style={headerStyle}>
        <div style={titleStyle}>
          {icon && icon.startsWith("http") ? (
            <img
              src={icon}
              alt="Panel icon"
              style={{ width: "1.5rem", height: "1.5rem", objectFit: "contain" }}
            />
          ) : (
            <span>{icon}</span>
          )}
          <span>{title}</span>
        </div>
        <div style={controlsStyle}>
          {minimizable && (
            <button
              style={buttonStyle}
              onClick={() => setIsMinimized((prev) => !prev)}
              title={isMinimized ? "Expand" : "Minimize"}
            >
              <Minimize2 size={16} />
            </button>
          )}
          {maximizable && (
            <button
              style={buttonStyle}
              onClick={() => setIsMaximized((prev) => !prev)}
              title={isMaximized ? "Restore" : "Maximize"}
            >
              <Maximize2 size={16} />
            </button>
          )}
          {onClose && (
            <button style={buttonStyle} onClick={onClose} title="Close">
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      <div style={contentStyle}>{children}</div>
    </div>
  );
};
