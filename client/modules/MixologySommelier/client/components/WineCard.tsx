import React from "react";
import { Wine } from "@/lib/wines";
import { useTheme } from "../components/ThemeProvider";
import { Star, Heart } from "lucide-react";
interface WineCardProps {
  wine: Wine;
  onClick?: () => void;
}
export const WineCard: React.FC<WineCardProps> = ({ wine, onClick }) => {
  const { theme, isDark } = useTheme();
  const [liked, setLiked] = React.useState(false);
  const wineColor = theme.wine[wine.type];
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: theme.colors.card,
        border: `1px solid ${wineColor}`,
        borderRadius: "16px",
        padding: "1.75rem",
        cursor: "pointer",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: isDark
          ? `0 4px 16px rgba(0,0,0,0.3), 0 0 30px ${wineColor}20`
          : "0 2px 8px rgba(0,0,0,0.08)",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(-4px)";
        if (isDark) {
          el.style.boxShadow = `0 0 30px ${wineColor}60, 0 0 60px ${theme.glow?.primary}`;
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(0)";
        if (isDark) {
          el.style.boxShadow = `0 0 20px ${wineColor}40, 0 0 40px ${theme.glow?.primary || "transparent"}`;
        }
      }}
    >
      {" "}
      {/* Background glow effect for dark theme */}{" "}
      {isDark && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "100px",
            height: "100px",
            background: `radial-gradient(circle, ${wineColor}20, transparent)`,
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />
      )}{" "}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        {" "}
        <div>
          {" "}
          <h3
            style={{
              color: theme.colors.foreground,
              fontSize: "1.2rem",
              fontWeight: "700",
              margin: "0 0 0.375rem 0",
              letterSpacing: "-0.3px",
            }}
          >
            {" "}
            {wine.name}{" "}
          </h3>{" "}
          <p
            style={{
              color: theme.text.secondary,
              fontSize: "0.8rem",
              margin: "0",
              fontWeight: "500",
            }}
          >
            {" "}
            {wine.region} • {wine.vintage}{" "}
          </p>{" "}
        </div>{" "}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setLiked(!liked);
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: liked ? theme.colors.accent : theme.text.secondary,
            transition: "all 0.2s",
          }}
        >
          {" "}
          <Heart
            size={20}
            fill={liked ? "currentColor" : "none"}
            style={{
              filter:
                isDark && liked
                  ? `drop-shadow(0 0 8px ${theme.colors.accent}40)`
                  : "none",
            }}
          />{" "}
        </button>{" "}
      </div>{" "}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.25rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        {" "}
        <div style={{ fontSize: "2.5rem", opacity: 0.9 }}>
          {" "}
          {wine.image}{" "}
        </div>{" "}
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          {" "}
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={14}
              fill={
                i < Math.round(wine.rating / 2)
                  ? theme.colors.primary
                  : theme.colors.border
              }
              color={
                i < Math.round(wine.rating / 2)
                  ? theme.colors.primary
                  : theme.colors.border
              }
            />
          ))}{" "}
          <span
            style={{
              color: theme.colors.primary,
              fontWeight: "700",
              fontSize: "0.85rem",
              marginLeft: "0.375rem",
            }}
          >
            {" "}
            {wine.rating}{" "}
          </span>{" "}
        </div>{" "}
      </div>{" "}
      <p
        style={{
          color: theme.text.secondary,
          fontSize: "0.875rem",
          marginBottom: "1rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        {" "}
        {wine.description}{" "}
      </p>{" "}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          marginBottom: "1.25rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        {" "}
        {wine.grapeVarieties.map((grape) => (
          <span
            key={grape}
            style={{
              backgroundColor: `rgba(${parseInt(theme.colors.primary.slice(1, 3), 16)}, ${parseInt(theme.colors.primary.slice(3, 5), 16)}, ${parseInt(theme.colors.primary.slice(5, 7), 16)}, 0.12)`,
              color: theme.colors.primary,
              padding: "0.375rem 0.875rem",
              borderRadius: "8px",
              fontSize: "0.75rem",
              fontWeight: "600",
              transition: "all 0.2s",
            }}
          >
            {" "}
            {grape}{" "}
          </span>
        ))}{" "}
      </div>{" "}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: `1px solid ${theme.colors.border}`,
          paddingTop: "1.25rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        {" "}
        <span
          style={{
            color: theme.colors.foreground,
            fontWeight: "700",
            fontSize: "1.35rem",
          }}
        >
          {" "}
          ${wine.price}{" "}
        </span>{" "}
        <button
          style={{
            backgroundColor: theme.colors.primary,
            color: theme.colors.background,
            border: "none",
            padding: "0.625rem 1.25rem",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "0.85rem",
            boxShadow: isDark
              ? `0 4px 12px rgba(${parseInt(theme.colors.primary.slice(1, 3), 16)}, ${parseInt(theme.colors.primary.slice(3, 5), 16)}, ${parseInt(theme.colors.primary.slice(5, 7), 16)}, 0.3)`
              : "0 2px 6px rgba(0, 122, 255, 0.15)",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.transform = "translateY(-1px)";
            el.style.boxShadow = isDark
              ? `0 6px 20px rgba(${parseInt(theme.colors.primary.slice(1, 3), 16)}, ${parseInt(theme.colors.primary.slice(3, 5), 16)}, ${parseInt(theme.colors.primary.slice(5, 7), 16)}, 0.4)`
              : "0 4px 12px rgba(0, 122, 255, 0.25)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.transform = "translateY(0)";
            el.style.boxShadow = isDark
              ? `0 4px 12px rgba(${parseInt(theme.colors.primary.slice(1, 3), 16)}, ${parseInt(theme.colors.primary.slice(3, 5), 16)}, ${parseInt(theme.colors.primary.slice(5, 7), 16)}, 0.3)`
              : "0 2px 6px rgba(0, 122, 255, 0.15)";
          }}
        >
          {" "}
          View Details{" "}
        </button>{" "}
      </div>{" "}
    </div>
  );
};
