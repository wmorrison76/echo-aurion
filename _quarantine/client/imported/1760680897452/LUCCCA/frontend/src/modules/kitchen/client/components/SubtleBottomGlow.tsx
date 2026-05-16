import React, { useEffect, useMemo, useState } from "react";

// A subtle bottom gradient that fades in on initial load and cross-fades on theme switch
// - Light mode: soft white gradient
// - Dark mode: soft black gradient
// - Both have the same size and are intentionally subtle
export default function SubtleBottomGlow() {
  type Theme = "light" | "dark";

  const getInitialTheme = (): Theme => {
    if (typeof window === "undefined") return "light";
    const saved = (localStorage.getItem("app.theme") as Theme | null) || undefined;
    if (saved) return saved;
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  };

  const [theme, setTheme] = useState<Theme>(getInitialTheme());
  const [lightOpacity, setLightOpacity] = useState(0);
  const [darkOpacity, setDarkOpacity] = useState(0);
  const [lightDuration, setLightDuration] = useState(700);
  const [darkDuration, setDarkDuration] = useState(700);

  // Initial mount: fade in current theme subtly
  useEffect(() => {
    const currentIsDark = document.documentElement.classList.contains("dark") || theme === "dark";
    if (currentIsDark) {
      setDarkOpacity(0);
      requestAnimationFrame(() => setDarkOpacity(1));
      setLightOpacity(0);
    } else {
      setLightOpacity(0);
      requestAnimationFrame(() => setLightOpacity(1));
      setDarkOpacity(0);
    }
    // Keep theme in sync if ThemeToggle applied before mount
    setTheme(currentIsDark ? "dark" : "light");
  }, []);

  // Listen for theme changes broadcast by ThemeToggle
  useEffect(() => {
    const onTheme = (e: any) => {
      const next: Theme = String(e?.detail?.theme || "light") === "dark" ? "dark" : "light";
      setTheme(next);
      // Slow fade out when switching to dark mode
      if (next === "dark") {
        setLightDuration(1200);
        setDarkDuration(700);
        setLightOpacity(0);
        setDarkOpacity(1);
      } else {
        // Normal cross-fade when returning to light
        setLightDuration(700);
        setDarkDuration(700);
        setDarkOpacity(0);
        setLightOpacity(1);
      }
    };
    window.addEventListener("theme:change", onTheme as any);
    return () => window.removeEventListener("theme:change", onTheme as any);
  }, []);

  const sharedClass = useMemo(
    () =>
      [
        "pointer-events-none",
        "fixed inset-x-0 bottom-0",
        // Same size in both modes; tweak height here to adjust subtly
        "h-28 md:h-36",
        // Smooth subtle transition
        "transition-opacity ease-out",
        // Stack above content but below modals/tooltips typically
        "z-20",
        // GPU hint for smoother fades
        "",
      ].join(" "),
    []
  );

  return (
    <>
      {/* Light mode subtle white glow */}
      <div
        aria-hidden
        className={[
          sharedClass,
          // gentle bottom-to-top white gradient
          "bg-gradient-to-t from-white/60 via-white/30 to-transparent",
          "dark:opacity-0",
        ].join(" ")}
        style={{ opacity: lightOpacity, transitionDuration: `${lightDuration}ms`, willChange: "opacity" }}
      />

      {/* Dark mode subtle black glow */}
      <div
        aria-hidden
        className={[
          sharedClass,
          // gentle bottom-to-top black gradient
          "bg-gradient-to-t from-black/50 via-black/25 to-transparent",
        ].join(" ")}
        style={{ opacity: darkOpacity, transitionDuration: `${darkDuration}ms`, willChange: "opacity" }}
      />
    </>
  );
}
