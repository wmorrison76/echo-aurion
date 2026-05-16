import React, { useState } from "react";
import { DollarSign, Settings } from "lucide-react";

interface PricingConfig {
  basePerServing: number;
  decorationRate: number;
  tierComplexity: number;
  deliveryFee: number;
  enableBEO: boolean;
  enableREO: boolean;
  showPricing: boolean;
}

interface PricingAdjustmentPanelProps {
  currentPricing: PricingConfig;
  onPricingChange: (config: PricingConfig) => void;
  onClose?: () => void;
}

export default function PricingAdjustmentPanel({
  currentPricing,
  onPricingChange,
  onClose,
}: PricingAdjustmentPanelProps) {
  const [pricing, setPricing] = useState<PricingConfig>(currentPricing);

  const handleChange = <K extends keyof PricingConfig>(
    key: K,
    value: PricingConfig[K],
  ) => {
    setPricing({ ...pricing, [key]: value });
  };

  const handleApply = () => {
    onPricingChange(pricing);
    onClose?.();
  };

  const estimatedPrice = (
    pricing.basePerServing * 20 +
    pricing.decorationRate * 5 +
    pricing.tierComplexity +
    (pricing.enableBEO ? 0 : pricing.deliveryFee)
  ).toFixed(2);

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "#1a1a1a",
        border: "1px solid #444",
        borderRadius: "8px",
        maxWidth: "400px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <DollarSign size={18} style={{ color: "#00f0ff" }} />
        <h3
          style={{
            color: "#00f0ff",
            fontSize: "16px",
            fontWeight: "600",
            margin: 0,
          }}
        >
          Pricing Settings
        </h3>
      </div>

      {/* Pricing Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Base Per Serving */}
        <div>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "4px",
              color: "#666",
              fontSize: "12px",
            }}
          >
            <span>Base Price Per Serving</span>
            <span style={{ color: "#00f0ff" }}>
              ${pricing.basePerServing.toFixed(2)}
            </span>
          </label>
          <input
            type="range"
            min="1"
            max="20"
            step="0.5"
            value={pricing.basePerServing}
            onChange={(e) =>
              handleChange("basePerServing", parseFloat(e.target.value))
            }
            style={{ width: "100%", cursor: "pointer" }}
          />
        </div>

        {/* Decoration Rate */}
        <div>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "4px",
              color: "#666",
              fontSize: "12px",
            }}
          >
            <span>Decoration Rate (per decoration)</span>
            <span style={{ color: "#00f0ff" }}>
              ${pricing.decorationRate.toFixed(2)}
            </span>
          </label>
          <input
            type="range"
            min="5"
            max="50"
            step="1"
            value={pricing.decorationRate}
            onChange={(e) =>
              handleChange("decorationRate", parseFloat(e.target.value))
            }
            style={{ width: "100%", cursor: "pointer" }}
          />
        </div>

        {/* Tier Complexity */}
        <div>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "4px",
              color: "#666",
              fontSize: "12px",
            }}
          >
            <span>Tier Complexity Charge</span>
            <span style={{ color: "#00f0ff" }}>
              ${pricing.tierComplexity.toFixed(2)}
            </span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={pricing.tierComplexity}
            onChange={(e) =>
              handleChange("tierComplexity", parseFloat(e.target.value))
            }
            style={{ width: "100%", cursor: "pointer" }}
          />
        </div>

        {/* Delivery Fee */}
        <div>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "4px",
              color: "#666",
              fontSize: "12px",
            }}
          >
            <span>Delivery Fee (if applicable)</span>
            <span style={{ color: "#00f0ff" }}>
              ${pricing.deliveryFee.toFixed(2)}
            </span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={pricing.deliveryFee}
            onChange={(e) =>
              handleChange("deliveryFee", parseFloat(e.target.value))
            }
            style={{ width: "100%", cursor: "pointer" }}
          />
        </div>
      </div>

      {/* Toggles */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            backgroundColor: "rgba(0, 240, 255, 0.05)",
            border: "1px solid #333",
            borderRadius: "4px",
          }}
        >
          <label style={{ color: "#666", fontSize: "12px" }}>
            BEO/REO Pricing
          </label>
          <button
            onClick={() => handleChange("enableBEO", !pricing.enableBEO)}
            style={{
              width: "40px",
              height: "22px",
              backgroundColor: pricing.enableBEO ? "#00f0ff" : "#333",
              border: "none",
              borderRadius: "11px",
              cursor: "pointer",
              position: "relative",
              transition: "all 0.2s",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "18px",
                height: "18px",
                backgroundColor: "#1a1a1a",
                borderRadius: "50%",
                top: "2px",
                left: pricing.enableBEO ? "20px" : "2px",
                transition: "left 0.2s",
              }}
            />
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            backgroundColor: "rgba(0, 240, 255, 0.05)",
            border: "1px solid #333",
            borderRadius: "4px",
          }}
        >
          <label style={{ color: "#666", fontSize: "12px" }}>REO Pricing</label>
          <button
            onClick={() => handleChange("enableREO", !pricing.enableREO)}
            style={{
              width: "40px",
              height: "22px",
              backgroundColor: pricing.enableREO ? "#00f0ff" : "#333",
              border: "none",
              borderRadius: "11px",
              cursor: "pointer",
              position: "relative",
              transition: "all 0.2s",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "18px",
                height: "18px",
                backgroundColor: "#1a1a1a",
                borderRadius: "50%",
                top: "2px",
                left: pricing.enableREO ? "20px" : "2px",
                transition: "left 0.2s",
              }}
            />
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            backgroundColor: "rgba(0, 240, 255, 0.05)",
            border: "1px solid #333",
            borderRadius: "4px",
          }}
        >
          <label style={{ color: "#666", fontSize: "12px" }}>
            Show Pricing to Client
          </label>
          <button
            onClick={() => handleChange("showPricing", !pricing.showPricing)}
            style={{
              width: "40px",
              height: "22px",
              backgroundColor: pricing.showPricing ? "#00f0ff" : "#333",
              border: "none",
              borderRadius: "11px",
              cursor: "pointer",
              position: "relative",
              transition: "all 0.2s",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "18px",
                height: "18px",
                backgroundColor: "#1a1a1a",
                borderRadius: "50%",
                top: "2px",
                left: pricing.showPricing ? "20px" : "2px",
                transition: "left 0.2s",
              }}
            />
          </button>
        </div>
      </div>

      {/* Estimated Price */}
      <div
        style={{
          padding: "12px",
          backgroundColor: "rgba(0, 240, 255, 0.1)",
          border: "1px solid #00f0ff",
          borderRadius: "4px",
          color: "#00f0ff",
          fontSize: "12px",
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        Estimated Base Price: ${estimatedPrice}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px" }}>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "8px",
              backgroundColor: "transparent",
              border: "1px solid #444",
              color: "#666",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "#00f0ff";
              (e.currentTarget as HTMLButtonElement).style.color = "#00f0ff";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#444";
              (e.currentTarget as HTMLButtonElement).style.color = "#666";
            }}
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleApply}
          style={{
            flex: 1,
            padding: "8px",
            backgroundColor: "rgba(0, 240, 255, 0.2)",
            border: "1px solid #00f0ff",
            color: "#00f0ff",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "600",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "rgba(0, 240, 255, 0.3)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "rgba(0, 240, 255, 0.2)";
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
