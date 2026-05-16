import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Moon, Sun, Grape, Settings as SettingsIcon } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

interface NavItem {
  path: string;
  labelKey: string;
  defaultLabel: string;
}

export const Navigation: React.FC = () => {
  const { t } = useI18n();
  const location = useLocation();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const detectTheme = () => {
      const html = document.documentElement;
      const storedTheme = localStorage.getItem("theme");
      const hasDark =
        html.classList.contains("dark") ||
        html.style.colorScheme === "dark" ||
        storedTheme === "dark" ||
        (!storedTheme &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      setIsDark(hasDark);
    };

    detectTheme();

    const observer = new MutationObserver(detectTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    const handleStorageChange = () => detectTheme();
    window.addEventListener("storage", handleStorageChange);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);

    if (newTheme) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
      localStorage.setItem("theme", "light");
    }

    window.dispatchEvent(
      new CustomEvent("theme-change", {
        detail: newTheme ? "dark" : "light",
      }),
    );
  };

  const navItems: NavItem[] = [
    { path: "/", labelKey: "nav.home", defaultLabel: "Home" },
    { path: "/catalog", labelKey: "nav.catalog", defaultLabel: "Catalog" },
    {
      path: "/menu-sommelier",
      labelKey: "nav.menu_wine",
      defaultLabel: "Menu & Wine",
    },
    {
      path: "/recommendations",
      labelKey: "nav.recommendations",
      defaultLabel: "Recommendations",
    },
    {
      path: "/inventory",
      labelKey: "nav.inventory",
      defaultLabel: "Inventory",
    },
    { path: "/pos-dashboard", labelKey: "nav.pos", defaultLabel: "POS" },
    { path: "/purchase-orders", labelKey: "nav.orders", defaultLabel: "Orders" },
    { path: "/costing-report", labelKey: "nav.costing", defaultLabel: "Costing" },
    { path: "/cellar-monitoring", labelKey: "nav.cellar", defaultLabel: "Cellar" },
    { path: "/analytics", labelKey: "nav.analytics", defaultLabel: "Analytics" },
    {
      path: "/advanced-analytics",
      labelKey: "nav.forecasts",
      defaultLabel: "Forecasts",
    },
    { path: "/wine-archive", labelKey: "nav.archive", defaultLabel: "Archive" },
    { path: "/training", labelKey: "nav.training", defaultLabel: "Training" },
    { path: "/tasting-notes", labelKey: "nav.notes", defaultLabel: "Notes" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="luccca-theme glass border-b border-border/50 px-8 py-4 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center gap-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-xl font-semibold text-accent dark:drop-shadow-[0_0_10px_rgba(0,209,255,0.5)]"
        >
          <Grape className="w-6 h-6" />
          {t("SommelierAI") || "SommelierAI"}
        </Link>

        <div className="flex gap-6 items-center overflow-x-auto whitespace-nowrap">
          {navItems.slice(0, 6).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "text-sm font-medium transition-colors",
                isActive(item.path)
                  ? "text-accent border-b-2 border-accent pb-1 dark:drop-shadow-[0_0_10px_rgba(0,209,255,0.5)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(item.labelKey) || item.defaultLabel}
            </Link>
          ))}
        </div>

        <div className="flex gap-4 items-center">
          <Link
            to="/settings"
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center border transition-all",
              isActive("/settings")
                ? "bg-accent border-transparent text-background"
                : "border-border hover:bg-muted/50",
            )}
          >
            <SettingsIcon className="w-5 h-5" />
          </Link>
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-accent text-background hover:bg-accent/90 hover:scale-110 transition-all shadow-lg"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </nav>
  );
};
