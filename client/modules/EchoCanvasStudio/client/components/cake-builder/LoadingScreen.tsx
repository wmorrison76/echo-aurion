import React, { useEffect, useState } from "react";

interface LoadingScreenProps {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export default function LoadingScreen({
  isLoading,
  message = "Rendering cake design...",
  progress = 0,
}: LoadingScreenProps) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setRotation((prev) => (prev + 4) % 360);
    }, 16);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
          padding: "40px",
          backgroundColor: "rgba(26, 26, 26, 0.95)",
          border: "1px solid #444",
          borderRadius: "12px",
          boxShadow: "0 16px 48px rgba(0, 240, 255, 0.1)",
        }}
      >
        {/* Animated cake icon */}
        <div
          style={{
            width: "60px",
            height: "60px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "40px",
            animation: "spin 2s linear infinite",
          }}
        >
          <span
            style={{
              display: "inline-block",
              transform: `rotate(${rotation}deg)`,
            }}
          >
            🍰
          </span>
        </div>

        {/* Loading text */}
        <div>
          <div
            style={{
              color: "#00f0ff",
              fontSize: "16px",
              fontWeight: "600",
              marginBottom: "8px",
              textAlign: "center",
            }}
          >
            {message}
          </div>
          <div
            style={{
              color: "#666",
              fontSize: "12px",
              textAlign: "center",
            }}
          >
            Please wait while we create your perfect cake...
          </div>
        </div>

        {/* Progress bar */}
        {progress > 0 && (
          <div
            style={{
              width: "200px",
              height: "4px",
              backgroundColor: "#333",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                backgroundColor: "#00f0ff",
                borderRadius: "2px",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        )}

        {/* Progress percentage */}
        {progress > 0 && (
          <div
            style={{
              color: "#00f0ff",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            {Math.round(progress)}%
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
