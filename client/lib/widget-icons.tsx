import React from "react";

// Branded icon components
export const GmailIcon = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeMap = {
    sm: "w-3 h-3",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <div className={`flex items-center justify-center ${sizeMap[size]}`}>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M2 6c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6z"
          fill="#EA4335"
        />
        <path
          d="M2 6l8 6 8-6"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export const OutlookIcon = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeMap = {
    sm: "w-3 h-3",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <div className={`flex items-center justify-center ${sizeMap[size]}`}>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="20" height="20" rx="3" fill="#0078D4" />
        <path d="M8 7h2v10H8zm6 0h2v10h-2z" fill="white" />
        <circle cx="12" cy="12" r="1.5" fill="white" />
      </svg>
    </div>
  );
};

export const TeamsIcon = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeMap = {
    sm: "w-3 h-3",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <div className={`flex items-center justify-center ${sizeMap[size]}`}>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="20" height="20" rx="2" fill="#6264A7" />
        <g fill="white">
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="16" cy="8" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="8" cy="16" r="1.5" />
          <circle cx="16" cy="16" r="1.5" />
        </g>
      </svg>
    </div>
  );
};

// Helper to render widget icon (branded or emoji)
export const renderWidgetIcon = (
  widgetId: string,
  fallbackIcon: string,
  size?: "sm" | "md" | "lg"
) => {
  if (widgetId === "integration-gmail") return <GmailIcon size={size || "md"} />;
  if (widgetId === "integration-outlook")
    return <OutlookIcon size={size || "md"} />;
  if (widgetId === "integration-teams") return <TeamsIcon size={size || "md"} />;
  return <span className="text-lg">{fallbackIcon}</span>;
};

// Hook for widget icon rendering
export const useWidgetIcon = (widgetId: string, fallbackIcon: string) => {
  return renderWidgetIcon(widgetId, fallbackIcon);
};
