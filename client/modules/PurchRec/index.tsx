/**
 * Panel-aware wrapper for Purchasing & Receiving (PurchRec) module
 * Detects if running in panel context and prevents theme override
 * Handles cases where ThemeProvider might not be available
 */
import React, { Suspense, useEffect, useState, lazy } from "react";
import "./global.css";

const PurchRecModule = lazy(() => import("./PurchRecModule"));

function PurchasingReceivingModuleWrapper() {
  const [isMounted, setIsMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    // Set mounted flag
    setIsMounted(true);

    // Attempt to detect theme from parent context or document
    try {
      // Check if document has dark class (from next-themes or custom implementation)
      const isDark =
        document.documentElement.classList.contains("dark") ||
        document.documentElement.getAttribute("data-theme") === "dark";
      setTheme(isDark ? "dark" : "light");
    } catch (err) {
      console.debug(
        "[PurchRec] Theme detection failed, defaulting to dark:",
        err
      );
      setTheme("dark");
    }
  }, []);

  if (!isMounted) {
    return (
      <div className="p-8 text-center text-foreground">
        Loading Purchasing & Receiving...
      </div>
    );
  }

  // When loaded as a module (default export), it's in panel mode
  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-background text-foreground ${
        theme === "dark" ? "dark" : ""
      }`}
      style={
        {
          // Set sidebar offset to prevent hidden content in panel mode
          "--sidebar-offset": "0.35rem",
        } as React.CSSProperties
      }
    >
      <Suspense
        fallback={
          <div className="p-8 text-center text-foreground">
            Loading Purchasing & Receiving Module...
          </div>
        }
      >
        <PurchRecModule />
      </Suspense>
    </div>
  );
}

export default PurchasingReceivingModuleWrapper;
