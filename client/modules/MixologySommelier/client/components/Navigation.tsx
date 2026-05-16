import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../components/ThemeProvider";
import { Moon, Sun, Grape, Settings as SettingsIcon } from "lucide-react";

interface NavigationProps {
  /** When provided, use state-based nav (panel mode) instead of router Link. */
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

const navItems = [
  { path: "/", label: "Home" },
  { path: "/catalog", label: "Catalog" },
  { path: "/menu-sommelier", label: "Menu & Wine" },
  { path: "/recommendations", label: "Recommendations" },
  { path: "/inventory", label: "Inventory" },
  { path: "/pos-dashboard", label: "POS" },
  { path: "/purchase-orders", label: "Orders" },
  { path: "/costing-report", label: "Costing" },
  { path: "/cellar-monitoring", label: "Cellar" },
  { path: "/analytics", label: "Analytics" },
  { path: "/advanced-analytics", label: "Forecasts" },
  { path: "/wine-archive", label: "Archive" },
  { path: "/training", label: "Training" },
  { path: "/tasting-notes", label: "Notes" },
];

const navLinkStyle = (
  active: boolean,
  theme: { colors: Record<string, string>; glow?: { primary?: string } },
  isDark: boolean,
) => ({
  textDecoration: "none" as const,
  color: active ? theme.colors.primary : theme.text.secondary,
  fontWeight: active ? "600" : "400",
  borderBottom: active ? `2px solid ${theme.colors.primary}` : "none",
  paddingBottom: "0.25rem",
  transition: "all 0.2s",
  textShadow: isDark && active ? `0 0 10px ${theme.glow?.primary}` : "none",
});

export const Navigation: React.FC<NavigationProps> = ({
  currentPath,
  onNavigate,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const isPanelMode = onNavigate != null && currentPath != null;
  const isActive = (path: string) =>
    isPanelMode ? currentPath === path : location.pathname === path;

  const logo = (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: "1.5rem",
        fontWeight: 600,
        color: theme.colors.primary,
        textShadow: isDark ? `0 0 10px ${theme.glow?.primary}` : "none",
      }}
    >
      <Grape size={24} /> SommelierAI
    </span>
  );

  return (
    <nav
      style={{
        backgroundColor: theme.colors.card,
        borderBottom: `1px solid ${theme.colors.border}`,
        padding: "1rem 2rem",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: isDark
          ? `0 0 20px ${theme.glow?.primary || "transparent"}`
          : "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {isPanelMode ? (
          <button
            type="button"
            onClick={() => onNavigate("/")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {logo}
          </button>
        ) : (
          <Link to="/" style={{ textDecoration: "none" }}>
            {logo}
          </Link>
        )}
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          {navItems.map((item) =>
            isPanelMode ? (
              <button
                key={item.path}
                type="button"
                onClick={() => onNavigate(item.path)}
                style={{
                  ...navLinkStyle(isActive(item.path), theme, isDark),
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  font: "inherit",
                }}
              >
                {item.label}
              </button>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                style={navLinkStyle(isActive(item.path), theme, isDark)}
              >
                {item.label}
              </Link>
            ),
          )}
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {isPanelMode ? (
            <button
              type="button"
              onClick={() => onNavigate("/settings")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: isActive("/settings")
                  ? `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`
                  : "transparent",
                border: `2px solid ${isActive("/settings") ? "transparent" : theme.colors.border}`,
                cursor: "pointer",
                color: isActive("/settings")
                  ? theme.colors.background
                  : theme.colors.text,
                transition: "all 0.3s",
              }}
            >
              <SettingsIcon size={20} />
            </button>
          ) : (
            <Link
              to="/settings"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: isActive("/settings")
                  ? `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`
                  : "transparent",
                border: `2px solid ${isActive("/settings") ? "transparent" : theme.colors.border}`,
                cursor: "pointer",
                color: isActive("/settings")
                  ? theme.colors.background
                  : theme.colors.text,
                transition: "all 0.3s",
                textDecoration: "none",
              }}
            >
              <SettingsIcon size={20} />
            </Link>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
              border: "none",
              borderRadius: "50%",
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: theme.colors.background,
              boxShadow: isDark
                ? `0 0 15px ${theme.glow?.primary}`
                : "0 2px 8px rgba(0,0,0,0.1)",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform =
                "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform =
                "scale(1)";
            }}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    </nav>
  );
};
