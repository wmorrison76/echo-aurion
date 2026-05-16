import React, { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { Menu, Sun, Moon, Clock3, Settings as Cog } from "lucide-react";

import dashboardIcon from "../assets/analytics.png";
import kitchenIcon   from "../assets/culinary_library.png";
import pastryIcon    from "../assets/baking-&-Pastry.png";
import mixologyIcon  from "../assets/mixology.png";
import inventoryIcon from "../assets/food_inventory.png";
import LUCCCA_ECHO   from "../assets/LUCCCA_ECHO.png";
import crmIcon       from "../assets/CRM.png";
import scheduleIcon  from "../assets/schedule.png";
import supportIcon   from "../assets/help-desk.png";
import settingsIcon  from "../assets/settings.png";
import chefNetIcon   from "../assets/ChefNet.png";
import maestroBQT    from "../assets/MaestroBQT.png";

const EVENT_STUDIO_URL =
  (import.meta?.env?.VITE_EVENT_STUDIO_URL) || "http://localhost:8080";

function openEventStudioWindow() {
  try { window.open(EVENT_STUDIO_URL, "_blank", "noopener,noreferrer"); }
  catch (e) { console.error("[Sidebar] Event Studio window failed:", e); }
}

export default function Sidebar({
  isOpen: pOpen,
  toggleSidebar: pToggle,
  isDarkMode: pDark,
  toggleDarkMode: pToggleDark
}) {
  const [localOpen, setLocalOpen]  = useState(true);
  const [localDark, setLocalDark]  = useState(() => document.documentElement.classList.contains("dark"));

  const isOpen        = pOpen   ?? localOpen;
  const toggleSidebar = pToggle ?? (() => setLocalOpen(v => !v));
  const isDarkMode    = pDark   ?? localDark;
  const toggleDarkMode = pToggleDark ?? (() => {
    const next = !localDark;
    setLocalDark(next);
    document.documentElement.classList.toggle("dark", next);
    // persist via the same bus App listens to
    window.dispatchEvent(new CustomEvent("lu:settings:apply", { detail: { flags: { dark: next } } }));
  });

  // collapsed/expanded width
  const W_COLLAPSED = 62, W_EXPANDED = 214;
  const widthPx = isOpen ? `${W_EXPANDED}px` : `${W_COLLAPSED}px`;

  useEffect(() => {
    document.body.classList.toggle("sb-collapsed", !isOpen);
  }, [isOpen]);

  // open a Board panel by id
  const openPanel = (id, detail = {}) => {
    if (!id) return;
    try { window.dispatchEvent(new CustomEvent("open-panel", { detail: { id, ...detail } })); }
    catch (err) { console.error("[Sidebar] open-panel failed:", err); }
  };

  // left column – panel buttons (no route change)
  const panelModules = useMemo(() => [
    { label: "DASHBOARD",         icon: dashboardIcon, panelId: "dashboard" },
    { label: "ECHO EVENT STUDIO", icon: LUCCCA_ECHO,   panelId: "eventstudio" }, // external
    { label: "MAESTRO BQT",       icon: maestroBQT,    panelId: "maestrobqt" },
    { label: "CULINARY",          icon: kitchenIcon,   panelId: "culinary" },
    { label: "BAKING & PASTRY",   icon: pastryIcon,    panelId: "pastry" },
    { label: "MIXOLOGY",          icon: mixologyIcon,  panelId: "mixology" },
    { label: "SCHEDULES",         icon: scheduleIcon,  panelId: "scheduling" },
  ], []);

  // examples that DO change the URL
  const routeModules = useMemo(() => [
    { path: "/inventory",   label: "INVENTORY",   icon: inventoryIcon },
    { path: "/purchasing",  label: "PURCHASING",  icon: inventoryIcon },
    { path: "/crm",         label: "CRM",         icon: crmIcon },
  ], []);

  const bottomRoutes = useMemo(() => [
    { path: "/chefnet",  label: "CHEFNET",  icon: chefNetIcon },
    { path: "/support",  label: "SUPPORT",  icon: supportIcon },
  ], []);

  const itemClasses = (active = false) => [
    isOpen ? "grid grid-cols-[44px_1fr]" : "grid grid-cols-[44px_0fr]",
    "items-center rounded-xl px-0 py-2",
    "bg-transparent border-0 ring-0 shadow-none",
    "hover:bg-white/5 dark:hover:bg-cyan-400/10",
    active ? "bg-white/6 dark:bg-cyan-500/10" : "",
    "[box-shadow:none] [filter:none] transition-colors duration-150 w-full text-left"
  ].join(" ");

  const Label = ({ children }) => (
    <span className={[
      "text-[13px] uppercase whitespace-nowrap overflow-hidden text-ellipsis min-w-0",
      isOpen ? "opacity-100 pr-1" : "opacity-0 pointer-events-none",
      "transition-opacity duration-150",
    ].join(" ")}>{children}</span>
  );

  return (
    <aside
      aria-label="App sidebar"
      data-collapsed={!isOpen}
      className="fixed top-0 left-0 h-screen z-[200000] transition-[width] duration-300 will-change-[width] pointer-events-none"
      style={{ width: widthPx, minWidth: widthPx, flexBasis: widthPx }}
    >
      <div className={[
        "relative pointer-events-auto h-full flex flex-col backdrop-blur-xl border-r",
        isDarkMode ? "sb-shell-dark text-cyan-50 border-cyan-400/30"
                   : "sb-shell-light text-slate-900 border-black/10",
      ].join(" ")}>
        {isDarkMode && (
          <span aria-hidden className="absolute top-0 right-[-1px] bottom-0 w-[2px] pointer-events-none"
                style={{ background: "linear-gradient(180deg, transparent, rgba(22,224,255,0.95), transparent)",
                         filter: "drop-shadow(0 0 8px rgba(22,224,255,.55))" }} />
        )}

        {/* Toggle puck */}
        <div className="relative px-2 pt-2 pb-1">
          <div className="absolute top-2 -right-[12px] z-[10000]">
            <button
              onClick={toggleSidebar}
              className="rounded-full p-[6px] shadow-none border bg-white/90 text-cyan-700 border-cyan-400 dark:bg-slate-900/90 dark:text-cyan-300 hover:scale-110 active:scale-95 transition"
              aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
              style={{ boxShadow: "none" }}
            >
              <Menu size={16} />
            </button>
          </div>

          {isOpen && (
            <div className="mt-2 leading-tight tracking-wide select-none text-center">
              <div className="text-[20px] font-extrabold text-cyan-400 uppercase">COMPANY LOGO<br/>GOES HERE</div>
              <div className="text-xs opacity-70">Outlet Name</div>
            </div>
          )}
        </div>

        {/* Core panel list */}
        <nav className={["px-2 pt-1 space-y-1 no-scrollbar", isOpen ? "overflow-y-auto flex-1" : "overflow-hidden flex-1"].join(" ")} style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}>
          {panelModules.map(({ label, icon, panelId }) => (
            <button
              key={panelId}
              type="button"
              onClick={() => panelId === "eventstudio" ? openEventStudioWindow() : openPanel(panelId)}
              title={label}
              aria-label={label}
              data-panel-id={panelId}
              className={itemClasses(false)}
              style={{ boxShadow: "none", filter: "none" }}
            >
              <img src={icon} alt="" className="justify-self-center w-[44px] h-[44px] object-contain aspect-square" />
              <Label>{label}</Label>
            </button>
          ))}

          {/* Route-based modules */}
          {routeModules.map(({ path, label, icon }) => (
            <NavLink key={path} to={path} title={label} aria-label={label} className={({ isActive }) => itemClasses(isActive)}>
              <img src={icon} alt="" className="justify-self-center w-[44px] h-[44px] object-contain aspect-square" />
              <Label>{label}</Label>
            </NavLink>
          ))}

          {/* Recent (opens a small panel via Board) */}
          <button
            type="button"
            onClick={() => openPanel("recent", { allowDuplicate: true, title: "Recent" })}
            className={itemClasses(false)}
            title="Recent"
            aria-label="Recent"
          >
            <Clock3 className="justify-self-center w-[44px] h-[44px]" />
            <Label>RECENT</Label>
          </button>
        </nav>

        {/* Bottom section */}
        <div className="px-2 pb-3 pt-1">
          <hr className={`border-t ${isDarkMode ? "border-cyan-500/25" : "border-black/10"} mb-2`} />
          <div className="space-y-1">
            {bottomRoutes.map(({ path, label, icon }) => (
              <NavLink key={path} to={path} title={label} aria-label={label} className={({ isActive }) => itemClasses(isActive)}>
                <img src={icon} alt="" className="justify-self-center w-[44px] h-[44px] object-contain aspect-square" />
                <Label>{label}</Label>
              </NavLink>
            ))}

            {/* Settings opens the SettingsSuite panel directly */}
            <button
              type="button"
              onClick={() => openPanel("settings")}
              className={itemClasses(false)}
              title="Settings"
              aria-label="Settings"
            >
              <img src={settingsIcon} alt="" className="justify-self-center w-[44px] h-[44px] object-contain aspect-square" />
              <Label>SETTINGS</Label>
            </button>
          </div>

          {/* Theme toggle */}
          <div className={`mt-2 flex ${isOpen ? "justify-end pr-1" : "justify-center"}`}>
            <button
              onClick={toggleDarkMode}
              className={[
                "rounded-full border transition h-10 w-10 grid place-items-center shadow-none",
                isDarkMode
                  ? "bg-slate-900/85 text-cyan-300 border-cyan-400/60"
                  : "bg-white/90 text-cyan-700 border-cyan-500/50 hover:bg-white",
              ].join(" ")}
              style={{ boxShadow: "none" }}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
