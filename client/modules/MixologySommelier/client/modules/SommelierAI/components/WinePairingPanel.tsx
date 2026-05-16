import React, { useState } from "react";
import { useTheme } from "./ThemeProvider";
import { Wine, X, Star, Wine as WineIcon } from "lucide-react";
interface PairingPanelProps {
  wine: any;
  dish: string;
  rationale?: string;
  onClose?: () => void;
  isOpen?: boolean;
}
export const WinePairingPanel: React.FC<PairingPanelProps> = ({
  wine,
  dish,
  rationale = "This wine's bright acidity and fruit-forward profile perfectly complements the richness of the dish, while the tannins provide structure and balance.",
  onClose,
  isOpen = true,
}) => {
  const { theme, isDark } = useTheme();
  const [quantity, setQuantity] = useState(1);
  if (!isOpen) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      {" "}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: theme.colors.card,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: "16px",
          padding: "2.5rem",
          maxWidth: "500px",
          width: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: isDark
            ? `0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(${parseInt(theme.colors.primary.slice(1, 3), 16)}, ${parseInt(theme.colors.primary.slice(3, 5), 16)}, ${parseInt(theme.colors.primary.slice(5, 7), 16)}, 0.1)`
            : "0 10px 40px rgba(0,0,0,0.15)",
        }}
      >
        {" "}
        {/* Close Button */}{" "}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1.5rem",
            right: "1.5rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: theme.text.secondary,
            padding: "0.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {" "}
          <X size={24} />{" "}
        </button>{" "}
        {/* Header Badge */}{" "}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "1.5rem",
          }}
        >
          {" "}
          <div
            style={{
              background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
              borderRadius: "10px",
              padding: "0.625rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {" "}
            <WineIcon
              size={20}
              style={{ color: theme.colors.background }}
            />{" "}
          </div>{" "}
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: "700",
              marginBottom: 0,
              color: theme.colors.foreground,
            }}
          >
            {" "}
            Perfect Pairing{" "}
          </h2>{" "}
        </div>{" "}
        {/* Wine Info */}{" "}
        <div
          style={{
            marginBottom: "2rem",
            paddingBottom: "2rem",
            borderBottom: `1px solid ${theme.colors.border}`,
          }}
        >
          {" "}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "1rem",
            }}
          >
            {" "}
            <div>
              {" "}
              <h3
                style={{
                  fontSize: "1.35rem",
                  fontWeight: "700",
                  color: theme.colors.foreground,
                  marginBottom: "0.375rem",
                }}
              >
                {" "}
                {wine.name}{" "}
              </h3>{" "}
              <p
                style={{
                  color: theme.text.secondary,
                  fontSize: "0.9rem",
                  margin: 0,
                }}
              >
                {" "}
                {wine.region} • {wine.vintage}{" "}
              </p>{" "}
            </div>{" "}
            <div style={{ fontSize: "2rem" }}>{wine.image}</div>{" "}
          </div>{" "}
          {/* Rating */}{" "}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1rem",
            }}
          >
            {" "}
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={18}
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
                fontSize: "0.9rem",
              }}
            >
              {" "}
              {wine.rating}/10{" "}
            </span>{" "}
          </div>{" "}
          {/* Type Badge */}{" "}
          <div
            style={{
              display: "inline-block",
              backgroundColor: `rgba(${parseInt(theme.colors.primary.slice(1, 3), 16)}, ${parseInt(theme.colors.primary.slice(3, 5), 16)}, ${parseInt(theme.colors.primary.slice(5, 7), 16)}, 0.15)`,
              color: theme.colors.primary,
              padding: "0.375rem 0.875rem",
              borderRadius: "8px",
              fontSize: "0.8rem",
              fontWeight: "600",
            }}
          >
            {" "}
            {wine.type.charAt(0).toUpperCase() + wine.type.slice(1)}{" "}
          </div>{" "}
        </div>{" "}
        {/* Pairing Rationale */}{" "}
        <div style={{ marginBottom: "2rem" }}>
          {" "}
          <h4
            style={{
              fontSize: "0.95rem",
              fontWeight: "600",
              color: theme.colors.foreground,
              marginBottom: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.3px",
            }}
          >
            {" "}
            Why This Pairing?{" "}
          </h4>{" "}
          <p
            style={{
              color: theme.text.secondary,
              fontSize: "0.9rem",
              lineHeight: "1.6",
              marginBottom: "1rem",
            }}
          >
            {" "}
            Pairs with <strong>{dish}</strong>{" "}
          </p>{" "}
          <p
            style={{
              color: theme.colors.foreground,
              fontSize: "0.95rem",
              lineHeight: "1.6",
            }}
          >
            {" "}
            {rationale}{" "}
          </p>{" "}
        </div>{" "}
        {/* Tasting Notes */}{" "}
        <div
          style={{
            marginBottom: "2rem",
            paddingBottom: "2rem",
            borderBottom: `1px solid ${theme.colors.border}`,
          }}
        >
          {" "}
          <h4
            style={{
              fontSize: "0.95rem",
              fontWeight: "600",
              color: theme.colors.foreground,
              marginBottom: "1rem",
              textTransform: "uppercase",
              letterSpacing: "0.3px",
            }}
          >
            {" "}
            Tasting Notes{" "}
          </h4>{" "}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            {" "}
            <div>
              {" "}
              <p
                style={{
                  color: theme.text.secondary,
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                }}
              >
                {" "}
                AROMAS{" "}
              </p>{" "}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {" "}
                {wine.aromas?.slice(0, 3).map((aroma: string) => (
                  <span
                    key={aroma}
                    style={{
                      backgroundColor: `rgba(${parseInt(theme.colors.secondary.slice(1, 3), 16)}, ${parseInt(theme.colors.secondary.slice(3, 5), 16)}, ${parseInt(theme.colors.secondary.slice(5, 7), 16)}, 0.15)`,
                      color: theme.colors.secondary,
                      padding: "0.375rem 0.75rem",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                    }}
                  >
                    {" "}
                    {aroma}{" "}
                  </span>
                ))}{" "}
              </div>{" "}
            </div>{" "}
            <div>
              {" "}
              <p
                style={{
                  color: theme.text.secondary,
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                }}
              >
                {" "}
                PROFILE{" "}
              </p>{" "}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {" "}
                {["Dry", "Balanced", "Crisp"].map((attr) => (
                  <span
                    key={attr}
                    style={{
                      backgroundColor: `rgba(${parseInt(theme.colors.accent.slice(1, 3), 16)}, ${parseInt(theme.colors.accent.slice(3, 5), 16)}, ${parseInt(theme.colors.accent.slice(5, 7), 16)}, 0.15)`,
                      color: theme.colors.accent,
                      padding: "0.375rem 0.75rem",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                    }}
                  >
                    {" "}
                    {attr}{" "}
                  </span>
                ))}{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        {/* Price & Actions */}{" "}
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {" "}
          <span
            style={{
              fontSize: "1.5rem",
              fontWeight: "700",
              color: theme.colors.foreground,
            }}
          >
            {" "}
            ${wine.price}{" "}
          </span>{" "}
          <div
            style={{
              flex: 1,
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            {" "}
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              style={{
                padding: "0.5rem 0.75rem",
                backgroundColor: theme.colors.muted,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: "6px",
                cursor: "pointer",
                color: theme.colors.foreground,
                fontWeight: "600",
              }}
            >
              {" "}
              −{" "}
            </button>{" "}
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, parseInt(e.target.value) || 1))
              }
              style={{
                width: "50px",
                padding: "0.5rem",
                backgroundColor: theme.colors.background,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: "6px",
                textAlign: "center",
                color: theme.colors.foreground,
              }}
            />{" "}
            <button
              onClick={() => setQuantity(quantity + 1)}
              style={{
                padding: "0.5rem 0.75rem",
                backgroundColor: theme.colors.muted,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: "6px",
                cursor: "pointer",
                color: theme.colors.foreground,
                fontWeight: "600",
              }}
            >
              {" "}
              +{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
        {/* Add to Order Button */}{" "}
        <button
          style={{
            width: "100%",
            padding: "1rem",
            backgroundColor: theme.colors.primary,
            color: theme.colors.background,
            border: "none",
            borderRadius: "10px",
            fontWeight: "700",
            fontSize: "0.95rem",
            cursor: "pointer",
            marginTop: "1.5rem",
            transition: "all 0.3s",
            boxShadow: isDark
              ? `0 4px 16px rgba(${parseInt(theme.colors.primary.slice(1, 3), 16)}, ${parseInt(theme.colors.primary.slice(3, 5), 16)}, ${parseInt(theme.colors.primary.slice(5, 7), 16)}, 0.4)`
              : "0 2px 8px rgba(0, 122, 255, 0.2)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform =
              "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform =
              "translateY(0)";
          }}
        >
          {" "}
          Add to Order ({quantity}){" "}
        </button>{" "}
      </div>{" "}
    </div>
  );
};
export default WinePairingPanel;
