import React from "react";

interface EchoProLogoProps {
  size?: number;
  variant?: "light" | "dark" | "gradient";
  withText?: boolean;
}

export function EchoProLogo({
  size = 48,
  variant = "gradient",
  withText = false,
}: EchoProLogoProps) {
  const strokeWidth = size / 24;
  const padding = size / 8;
  const viewBoxSize = size + padding * 2;

  const getColor = (layer: number) => {
    switch (variant) {
      case "light":
        return `hsl(200, 100%, ${70 - layer * 10}%)`;
      case "dark":
        return `hsl(200, 100%, ${40 + layer * 10}%)`;
      case "gradient":
      default:
        // Gradient from cyan (#00D9FF) to blue (#3B82F6)
        const colors = ["#00D9FF", "#0EA5E9", "#3B82F6"];
        return colors[layer] || colors[colors.length - 1];
    }
  };

  const circleRadius = (size / 2 - padding) / 3;

  return (
    <div className="flex items-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        className="flex-shrink-0"
      >
        {/* Background */}
        <rect
          width={viewBoxSize}
          height={viewBoxSize}
          fill="transparent"
          rx={size / 8}
        />

        {/* Layer 3 - Outer circle (enterprise reach) */}
        <circle
          cx={viewBoxSize / 2}
          cy={viewBoxSize / 2}
          r={circleRadius * 3}
          fill="none"
          stroke={getColor(2)}
          strokeWidth={strokeWidth * 0.7}
          opacity={0.5}
        />

        {/* Layer 2 - Middle circle (scaling) */}
        <circle
          cx={viewBoxSize / 2}
          cy={viewBoxSize / 2}
          r={circleRadius * 2}
          fill="none"
          stroke={getColor(1)}
          strokeWidth={strokeWidth * 0.9}
          opacity={0.7}
        />

        {/* Layer 1 - Inner circle (core) */}
        <circle
          cx={viewBoxSize / 2}
          cy={viewBoxSize / 2}
          r={circleRadius}
          fill={getColor(0)}
          stroke={getColor(0)}
          strokeWidth={strokeWidth}
        />

        {/* Center dot for extra polish */}
        <circle
          cx={viewBoxSize / 2}
          cy={viewBoxSize / 2}
          r={circleRadius * 0.3}
          fill="white"
          opacity={0.8}
        />
      </svg>

      {/* Text variant */}
      {withText && (
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-sm bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Echo
          </span>
          <span className="text-xs text-slate-400">Coder Pro</span>
        </div>
      )}
    </div>
  );
}

// Export variations
export function EchoProLogoSmall() {
  return <EchoProLogo size={32} />;
}

export function EchoProLogoLarge() {
  return <EchoProLogo size={64} variant="gradient" withText={true} />;
}

export function EchoProLogoFavicon() {
  return <EchoProLogo size={16} variant="gradient" />;
}
