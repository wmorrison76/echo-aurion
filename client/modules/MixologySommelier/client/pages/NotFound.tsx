import React from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../components/ThemeProvider";
import { ArrowLeft } from "lucide-react";
export const NotFound: React.FC = () => {
  const { theme, isDark } = useTheme();
  return (
    <div
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.foreground,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      {" "}
      <div style={{ textAlign: "center" }}>
        {" "}
        <h1
          style={{
            fontSize: "6rem",
            fontWeight: "700",
            margin: "0 0 1rem 0",
            color: theme.colors.primary,
            textShadow: isDark ? `0 0 40px ${theme.colors.primary}60` : "none",
          }}
        >
          {" "}
          404{" "}
        </h1>{" "}
        <h2
          style={{
            fontSize: "2rem",
            fontWeight: "600",
            marginBottom: "1rem",
            color: theme.colors.foreground,
          }}
        >
          {" "}
          Page Not Found{" "}
        </h2>{" "}
        <p
          style={{
            color: theme.text.secondary,
            fontSize: "1.125rem",
            marginBottom: "2rem",
            maxWidth: "400px",
          }}
        >
          {" "}
          The page you're looking for doesn't exist. Let's get you back to
          exploring wines!{" "}
        </p>{" "}
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            backgroundColor: theme.colors.primary,
            color: theme.colors.background,
            padding: "0.75rem 2rem",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "600",
            fontSize: "1rem",
            boxShadow: isDark ? `0 0 20px ${theme.colors.primary}40` : "none",
            transition: "all 0.3s",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.transform = "translateY(-2px)";
            if (isDark) {
              el.style.boxShadow = `0 0 30px ${theme.colors.primary}60`;
            }
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.transform = "translateY(0)";
            if (isDark) {
              el.style.boxShadow = `0 0 20px ${theme.colors.primary}40`;
            }
          }}
        >
          {" "}
          <ArrowLeft size={18} /> Back Home{" "}
        </Link>{" "}
      </div>{" "}
    </div>
  );
};
export default NotFound;
